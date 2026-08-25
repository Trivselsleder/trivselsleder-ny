-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 068: 4.4 LIVE-STATUS FOR HTLA
--                         + 4.5 AUTO-LUKK-MOTOR (cron-trygg)
-- Trivselsleder-ny · 25. aug 2026 · TU steg 4.4 + 4.5
--
-- NB MIGRASJONSNUMMER: byggeplanen (21. aug) sa «066», men 066 (kodesett) og
-- 067 (service_role SELECT) ble bygget + kjørt live 24. aug. Neste ledige er
-- derfor 068 (bekreftet mot supabase/migrations/ + git-logg + STATUS.md 24. aug).
--
-- ───────────────────────────────────────────────────────────────────────────
-- HVA DENNE MIGRASJONEN GJØR
-- ───────────────────────────────────────────────────────────────────────────
-- 4.4  Utvider tu_folg_med(uuid) slik at en AKTIV HTLA på egen skole får se
--      «X av Y utdelte» per gruppe — nøyaktig samme aggregerte telling som
--      skoleadmin/superadmin allerede får. Ingen svar-innhold, aldri hvem som
--      svarte: funksjonen teller KUN rader i tu_koder (utdelt / brukt). HTLA
--      beholder «permission denied» på tu_svar OG tu_koders innhold — den nye
--      tilgangen går UTELUKKENDE via denne aggregerte RPC-en.
--
-- 4.5  Auto-lukk-motor. Selve lukkingen (arkivér → slett koder → re-stemple
--      svar for å kollapse xmin) ligger allerede i tu_lukk_runde (migr 045) og
--      er BEVIST å bryte tidsstempel-koblingen. Den kan imidlertid ikke kalles
--      av en cron, fordi den autoriserer via tu_har_tilgang_skole(auth.uid())
--      og en cron har ingen innlogget bruker. Derfor legges det til:
--        * tu_auto_lukk_forfalne(p_utfor boolean) — SECURITY DEFINER, ren
--          service-funksjon. Finner ALLE åpne runder der frist < i dag (Oslo)
--          og lukker dem ved å kalle tu_lukk_runde-LOGIKKEN direkte (inlinet,
--          uten per-bruker-autorisasjon). p_utfor=false = tørrkjøring (teller
--          bare, rører ingen data) → fail-closed-vennlig. Returnerer antall.
--        * Manuell tidlig-lukk beholder tu_lukk_runde (per-bruker-autorisert):
--          HTLA/skoleadmin lukker sin egen runde tidlig via den. HTLA får nå
--          også kalle den (aktiv-htla-klausul lagt til, som i 4.4). Skoleansatt
--          uten htla-rolle får fortsatt «Ingen tilgang».
--
--      «Oslo-tidsvakten» (hvilken KALENDERDAG det er i Norge) håndteres i
--      cron-endepunktet (api/tu/cron-auto-lukk.js) etter mønsteret fra
--      cron-tidssone-fiksen 21. aug — koden regner Oslo-tid, ikke UTC. DB-en
--      sammenligner frist (date) mot en dato serveren sender inn (p_idag_oslo),
--      så tidssonelogikken ligger ÉT sted (JS), ikke spres to steder.
--
-- FAIL-CLOSED: motoren rører ALDRI ekte data uten at kalleren eksplisitt ber
-- om utførelse (p_utfor=true). Cron-endepunktet sender p_utfor=true KUN når
-- motor_aktiv != 'nei' og torrkjoring=false — nøyaktig samme nødbrems som de
-- andre cron-jobbene.
--
-- HUSREGEL 6: tu_folg_med beholder UENDRET signatur (uuid) og RETURNS
-- (table(utdelt int, brukt int)) — kun kroppen (autorisasjonsklausulen) endres.
-- Da er «create or replace» korrekt og tilstrekkelig; ingen DROP/overload
-- oppstår. tu_lukk_runde likeså (kropp utvides, signatur/RETURNS urørt).
-- De to NYE funksjonene får DROP IF EXISTS + CREATE for å være trygt rekjørbare
-- med endret RETURNS under utvikling.
--
-- FORUTSETNING: migr 041–046 + 064–067 er kjørt live.
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent (create or replace / drop if exists; grants rekjørbare).
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- 4.4 — tu_folg_med: legg til AKTIV-HTLA i autorisasjonen
--       (samme mønster som tu_er_htla_paa_skole, migr 065). Skoleadmin/
--       superadmin uendret (tu_har_tilgang_skole). Ren telling — ingen svar.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.tu_folg_med(p_runde uuid)
returns table(utdelt int, brukt int)
language plpgsql stable security definer set search_path = '' as $$
declare v_skole uuid;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  -- skoleadmin/superadmin (uendret) ELLER aktiv htla på egen skole (4.4).
  if not (public.tu_har_tilgang_skole(v_skole)
          or public.tu_er_htla_paa_skole(v_skole)) then
    raise exception 'Ingen tilgang';
  end if;
  -- REN TELLING: kun antall koder (utdelt) og antall brukte. Aldri tu_svar.
  return query select count(*)::int, count(*) filter (where k.brukt)::int
               from public.tu_koder k where k.runde_id = p_runde;
end $$;

-- Grant uendret, men settes på nytt (idempotent, B4-mønster).
revoke execute on function public.tu_folg_med(uuid) from public, anon;
grant  execute on function public.tu_folg_med(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4.5a — tu_lukk_runde: la AKTIV HTLA lukke egen runde tidlig (manuell knapp).
--        Kroppen er ellers IDENTISK med migr 045 (arkivér → slett koder →
--        re-stemple svar). KUN autorisasjonslinja utvides med htla-klausulen.
--        Signatur (uuid) + RETURNS (void) uendret → create or replace, ingen DROP.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.tu_lukk_runde(p_runde uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_r public.tu_runder%rowtype; v_resultat jsonb; v_total int;
begin
  select * into v_r from public.tu_runder where id = p_runde;
  if v_r.id is null then raise exception 'Ukjent runde'; end if;
  -- skoleadmin/superadmin (som før) ELLER aktiv htla på egen skole (4.5).
  if not (public.tu_har_tilgang_skole(v_r.skole_id)
          or public.tu_er_htla_paa_skole(v_r.skole_id)) then
    raise exception 'Ingen tilgang';
  end if;

  -- (1) lukk
  update public.tu_runder set status='lukket', lukket_at = coalesce(lukket_at, now())
   where id = p_runde;

  -- (2) ARKIVER FØR SLETTING — ferdig skjermet utgang-1-resultat
  select count(*) into v_total from public.tu_svar where runde_id = p_runde;
  select jsonb_agg(to_jsonb(t)) into v_resultat
    from public.tu_skjermet_runde(p_runde) t;
  if not exists (select 1 from public.tu_arkiv a where a.runde_id = p_runde) then
    insert into public.tu_arkiv(runde_id, skole_id, trinn, skoleaar, semester,
                                land, sporsmalversjon, antall_totalt, resultat)
    values (p_runde, v_r.skole_id, v_r.trinn, v_r.skoleaar, v_r.semester,
            v_r.land, v_r.sporsmalversjon, v_total, coalesce(v_resultat, '[]'::jsonb));
  end if;

  -- (3) slett kodehasher (runden er lukket → kodene skal aldri virke igjen)
  delete from public.tu_koder where runde_id = p_runde;

  -- (4) re-stemple svar (felles xmin → bryter transaksjonstids-tråden)
  update public.tu_svar set svar = svar where runde_id = p_runde;
end $$;

revoke execute on function public.tu_lukk_runde(uuid) from public, anon;
grant  execute on function public.tu_lukk_runde(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4.5b — INTERN lukkelogikk uten per-bruker-autorisasjon.
--        Brukes KUN av auto-lukk-motoren (cron). Samme fire steg som
--        tu_lukk_runde, men UTEN tilgangssjekk (cron har ingen auth.uid()).
--        REVOKE fra alle klientroller — kun service_role og DEFINER-nøstede
--        kall når inn hit. Aldri eksponert til nettleser/elev/lærer.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.tu_lukk_runde_motor(p_runde uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_r public.tu_runder%rowtype; v_resultat jsonb; v_total int;
begin
  select * into v_r from public.tu_runder where id = p_runde for update;
  if v_r.id is null then raise exception 'Ukjent runde'; end if;
  if v_r.status = 'lukket' then return; end if;   -- idempotent: alt lukket → ingenting

  update public.tu_runder set status='lukket', lukket_at = coalesce(lukket_at, now())
   where id = p_runde;

  select count(*) into v_total from public.tu_svar where runde_id = p_runde;
  select jsonb_agg(to_jsonb(t)) into v_resultat
    from public.tu_skjermet_runde(p_runde) t;
  if not exists (select 1 from public.tu_arkiv a where a.runde_id = p_runde) then
    insert into public.tu_arkiv(runde_id, skole_id, trinn, skoleaar, semester,
                                land, sporsmalversjon, antall_totalt, resultat)
    values (p_runde, v_r.skole_id, v_r.trinn, v_r.skoleaar, v_r.semester,
            v_r.land, v_r.sporsmalversjon, v_total, coalesce(v_resultat, '[]'::jsonb));
  end if;

  delete from public.tu_koder where runde_id = p_runde;
  update public.tu_svar set svar = svar where runde_id = p_runde;  -- kollaps xmin
end $$;

revoke execute on function public.tu_lukk_runde_motor(uuid) from public, anon, authenticated;
grant  execute on function public.tu_lukk_runde_motor(uuid) to service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- 4.5c — AUTO-LUKK-MOTOREN. Finner alle ÅPNE runder der frist < p_idag_oslo
--        (kalenderdagen i Norge, sendt inn av cron-endepunktet), og lukker dem.
--        FAIL-CLOSED: p_utfor=false (standard) = tørrkjøring — teller kun, rører
--        INGEN data. Bare p_utfor=true lukker faktisk. Cron sender true KUN når
--        motor_aktiv!='nei' og torrkjoring=false (nødbrems, som øvrige cron).
--        Returnerer (kandidater = hvor mange forfalne, lukket = hvor mange
--        faktisk lukket denne kjøringen).
-- ───────────────────────────────────────────────────────────────────────────
drop function if exists public.tu_auto_lukk_forfalne(date, boolean);
create function public.tu_auto_lukk_forfalne(p_idag_oslo date, p_utfor boolean default false)
returns table(kandidater int, lukket int)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_kand int := 0; v_lukket int := 0;
begin
  -- Forfalne = åpne runder med satt frist STRENGT FØR dagens Oslo-dato.
  -- (frist = vinduets SISTE dag → runden er åpen t.o.m. frist, lukkes dagen etter.)
  for v_id in
    select r.id from public.tu_runder r
    where r.status = 'apen'
      and r.frist is not null
      and r.frist < p_idag_oslo
  loop
    v_kand := v_kand + 1;
    if p_utfor then
      perform public.tu_lukk_runde_motor(v_id);
      v_lukket := v_lukket + 1;
    end if;
  end loop;
  return query select v_kand, v_lukket;
end $$;

-- Kun service_role (cron går server-side med service-nøkkelen). REVOKE resten.
revoke execute on function public.tu_auto_lukk_forfalne(date, boolean) from public, anon, authenticated;
grant  execute on function public.tu_auto_lukk_forfalne(date, boolean) to service_role;

-- ============================================================================
-- SLUTT MIGRASJON 068.
-- MERK: tidssone (Oslo) avgjøres i api/tu/cron-auto-lukk.js (samme mønster som
-- cron-tidssone-fiksen 21. aug). DB-en tar imot dagens Oslo-dato som parameter.
-- ============================================================================
