-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 069: FOR UPDATE PÅ tu_lukk_runde
-- Trivselsleder-ny · 25. aug 2026 · lukker FUNN 1 fra fable-kontrollen av 4.4/4.5
--
-- NB MIGRASJONSNUMMER: 068 (tu_folg_med HTLA + auto-lukk-motor) er kjørt live
-- og committet (git 337c0ef). Neste ledige er derfor 069 (bekreftet mot
-- supabase/migrations/ + git-logg).
--
-- ───────────────────────────────────────────────────────────────────────────
-- HVA DENNE MIGRASJONEN GJØR (og hvorfor)
-- ───────────────────────────────────────────────────────────────────────────
-- Fable-kontrollen av TU steg 4.4/4.5 fant ETT lavt, arvet funn (funn 1, arvet
-- fra migr 045):
--
--   tu_lukk_runde henter runde-raden UTEN «for update», mens den interne
--   tu_lukk_runde_motor (068) henter DEN MED «for update». Konsekvens: sender
--   en elev inn svar i NØYAKTIG samme øyeblikk som HTLA/skoleadmin trykker
--   «Lukk runden tidlig», kan manuell lukking løpe forbi den pågående
--   innsendingen. Personvernet holder (xmin kollapser fortsatt), men svaret
--   telles/arkiveres ikke → arkivet blir ett for lite (bevist: arkiv 2 av 3).
--
-- RETTING (nøyaktig samme mønster som tu_lukk_runde_motor allerede bruker):
-- legg «for update» på den FØRSTE select-en av runde-raden i tu_lukk_runde.
-- Da tar lukkingen radlåsen først, og en samtidig elev-innsending (som holder
-- FK-lås tu_svar→tu_runder) tvinger lukkingen til å VENTE til eleven har
-- committet. Arkivet blir dermed komplett, og etternøleren re-stemples inn i
-- samme felles xmin.
--
-- INGENTING ANNET ENDRES: arkivering, kodesletting og xmin-re-stempling er
-- byte-identisk med 068-versjonen. Kun linje 1 i funksjonskroppen får «for update».
--
-- HUSREGEL 6: signatur (uuid) + RETURNS (void) er UENDRET → «create or replace»
-- er korrekt og tilstrekkelig; ingen DROP, ingen overload oppstår. SECURITY
-- DEFINER + set search_path='' beholdes. GRANT settes på nytt (idempotent,
-- B4-mønster): authenticated + service_role, IKKE anon/public.
--
-- FORUTSETNING: migr 041–046 + 064–068 er kjørt live.
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent (create or replace; grants rekjørbare).
-- ============================================================================

create or replace function public.tu_lukk_runde(p_runde uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_r public.tu_runder%rowtype; v_resultat jsonb; v_total int;
begin
  -- FUNN 1-RETTING: «for update» tar radlåsen først, slik at en samtidig
  -- elev-innsending tvinger lukkingen til å vente (som tu_lukk_runde_motor).
  select * into v_r from public.tu_runder where id = p_runde for update;
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

-- ============================================================================
-- SLUTT MIGRASJON 069.
-- ============================================================================
