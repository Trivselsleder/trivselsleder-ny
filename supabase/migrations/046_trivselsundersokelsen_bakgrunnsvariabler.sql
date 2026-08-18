-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 046: BAKGRUNNSVARIABLER (trinn + kjønn)
-- Trivselsleder-ny · 18. aug 2026 · Model B · hovedbasen «bak lås»
--
-- BESLUTNING (Kjartan 18. aug, jurist konsultert): elevene skal krysse av for
-- TRINN og KJØNN før spørsmålene. Begge OBLIGATORISK. Kjønn = jente/gutt/annet
-- (samme kategorier som Udirs Elevundersøkelse).
--
-- PERSONVERN — hvordan dette holder anonymitetsdesignet (delplan 21.4):
--   * trinn + kjønn lagres som BAKGRUNNSVARIABLER på SELVE SVARET (tu_svar),
--     ALDRI koblet til kode/HMAC. tu_svar har fra før ingen kolonne mot tu_koder,
--     ingen elev-id og ingen tidsstempel — det er uendret. Bakgrunnsvariablene
--     arver denne isolasjonen.
--   * De legges i EGNE KOLONNER, ikke i svar-JSON-en, slik at aggregeringen som
--     pakker ut svar via jsonb_each_text(svar) fortsatt kun ser spørsmål 1–13.
--   * k-terskelen (migr 045) MÅ håndheves også på kjønnsdelte tall i rapporten
--     (steg 5). Denne migrasjonen legger KUN til feltene + validering; selve den
--     kjønnsdelte rapport-RPC-en bygges i steg 5 og skal skjerme per gruppe.
--     Homogene/små kjønnsceller behandles som øvrige celler (delplan 21.4/21.9.12).
--   * Fordi bakgrunnsvariabler kan gjøre en ellers trygg gruppe liten nok til
--     gjenkjenning (delplan 21.4, fable B3.4), skal kjønn inn i DPIA-en (21.7).
--
-- FORUTSETNING: migr 041 + 045 er kjørt live. Ingen ekte data finnes ennå, så
-- NOT NULL på nye kolonner er trygt (ingen eksisterende rader å migrere).
--
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent der mulig. Alle funksjoner: SECURITY DEFINER + SET search_path=''.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) STRUKTUR — to bakgrunnsvariabler på svaret
--    trinn: 5–10 (samme spenn som runden). kjønn: jente/gutt/annet (ASCII).
-- ---------------------------------------------------------------------------
alter table public.tu_svar
  add column if not exists trinn int,
  add column if not exists kjonn text;

-- CHECK-er (legges kun til hvis de ikke finnes — idempotent).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tu_svar_trinn_check') then
    alter table public.tu_svar
      add constraint tu_svar_trinn_check check (trinn between 5 and 10);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tu_svar_kjonn_check') then
    alter table public.tu_svar
      add constraint tu_svar_kjonn_check check (kjonn in ('jente','gutt','annet'));
  end if;
end $$;

-- Fordi ingen ekte rader finnes ennå, kan vi kreve NOT NULL med en gang.
-- (Skulle det mot formodning finnes testrader uten verdi, feiler dette og hele
--  transaksjonen rulles tilbake — da må testrader ryddes først.)
alter table public.tu_svar alter column trinn set not null;
alter table public.tu_svar alter column kjonn set not null;

-- ---------------------------------------------------------------------------
-- 2) tu_lever_svar — utvid med p_trinn + p_kjonn (OBLIGATORISK).
--    Husregel 6: ny parameter = DROP gammel signatur + CREATE + GRANT på nytt,
--    i samme transaksjon (ellers blir det en tvetydig overload).
--    Migr 045-signaturen er tu_lever_svar(text, jsonb) — den slettes her.
-- ---------------------------------------------------------------------------
drop function if exists public.tu_lever_svar(text, jsonb);

create or replace function public.tu_lever_svar(
  p_kode_hmac text, p_svar jsonb, p_trinn int, p_kjonn text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_runde uuid;
begin
  if jsonb_typeof(p_svar) <> 'object' or p_svar = '{}'::jsonb then
    raise exception 'Tomt eller ugyldig svar'; end if;

  -- Bakgrunnsvariabler er OBLIGATORISK og valideres FØR alt annet.
  if p_trinn is null or p_trinn < 5 or p_trinn > 10 then
    raise exception 'Ugyldig eller manglende trinn'; end if;
  if p_kjonn is null or p_kjonn not in ('jente','gutt','annet') then
    raise exception 'Ugyldig eller manglende kjonn'; end if;

  -- kun spørsmålsnummer 1–13 (bakgrunnsvariabler ligger IKKE i svar-JSON)
  if exists (select 1 from jsonb_each_text(p_svar) kv where kv.key !~ '^([1-9]|1[0-3])$') then
    raise exception 'Ugyldig svar'; end if;
  -- hver verdi må være heltall innenfor spørsmålets skala
  if exists (
    select 1 from jsonb_each_text(p_svar) kv
    left join public.tu_sporsmal sp
      on sp.nummer = (kv.key)::int and sp.versjon = 1 and sp.land = 'NO'
    where sp.id is null
       or kv.value !~ '^[0-9]+$'
       or (case when kv.value ~ '^[0-9]+$' then (kv.value)::int else -1 end) < 0
       or (case when kv.value ~ '^[0-9]+$' then (kv.value)::int else -1 end)
            > jsonb_array_length(sp.svarskala) - 1
  ) then raise exception 'Ugyldig svar'; end if;

  -- Reserver koden (merk brukt) på en åpen runde — atomisk.
  update public.tu_koder k set brukt = true
    from public.tu_runder r
   where k.kode_hmac = p_kode_hmac and k.brukt = false
     and r.id = k.runde_id and r.status = 'apen'
  returning k.runde_id into v_runde;
  if v_runde is null then raise exception 'Ugyldig eller brukt kode'; end if;

  -- Lagre svaret + bakgrunnsvariablene. INGEN kode-id, ingen tidsstempel.
  insert into public.tu_svar (runde_id, svar, trinn, kjonn)
  values (v_runde, p_svar, p_trinn, p_kjonn);
end $$;

-- GRANT: kun service_role (API-serveren), som migr 045.
revoke execute on function public.tu_lever_svar(text, jsonb, int, text) from public, anon, authenticated;
grant  execute on function public.tu_lever_svar(text, jsonb, int, text) to service_role;

-- ============================================================================
-- SLUTT MIGRASJON 046.
-- MERK (steg 5, IKKE i denne migrasjonen): kjønnsdelt rapport-RPC må håndheve
-- k-terskelen PER kjønnsgruppe (aldri vise tall under terskel), og skjerme
-- homogene/små kjønnsceller som øvrige celler. Kjønn inn i DPIA (delplan 21.7).
-- ============================================================================
