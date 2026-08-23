-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 065: HTLA-LESETILGANG + CASE-INSENSITIVT
--                         GRUPPENAVN I UNIK-INDEKSEN
-- Trivselsleder-ny · 23. aug 2026 · Retter funn 1 + funn 2 fra uavhengig
-- fable-kontroll (KONTROLL-fable-TU-steg4-del1-23aug.md).
--
-- BESLUTNING (Kjartan 23. aug, etter kontrollen): HTLA SKAL kunne SE
-- rundelisten (hvilke runder som går), men ALDRI selve svarene, og skal
-- fortsatt IKKE kunne opprette, lukke eller endre runder.
--
-- FUNN 1 → egen SELECT-policy på tu_runder for htla:
--   * Ny hjelpefunksjon tu_er_htla_paa_skole(p_skole): true når innlogget
--     bruker har AKTIV bruker_skole-kobling (aktiv = true) med
--     tl_rolle = 'htla' på akkurat denne skolen. (Aktiv-sjekken er bevisst
--     med her — jf. funn 3, som ellers IKKE røres i denne migrasjonen.)
--   * KUN en ny SELECT-policy. INSERT/UPDATE-policyene fra migr 041 røres
--     IKKE — opprett/endre er fortsatt kun superadmin/skoleadmin
--     (tu_har_tilgang_skole, bevist av kontrollen R1–R4).
--   * tu_svar og tu_koder røres IKKE: ingen policyer, ingen GRANT — de er
--     fortsatt helt stengt for authenticated (kontrollen R6b/R6c). HTLA får
--     altså listen/metadata, aldri svar-innhold.
--
-- FUNN 2 → «6A» og «6a» skal være SAMME gruppe:
--   * tu_runder_unik_gruppe bygges om til lower(btrim(gruppe_navn)).
--     btrim + coalesce-logikken beholdes ellers uendret.
--   * Trygt nå: 0 runder i basen (bekreftet av kontrollen) → ingen
--     eksisterende rader kan kollidere ved ombygging.
--
-- FUNN 3 (bruker_skole.aktiv i tu_har_tilgang_skole, arv fra migr 041):
--   IKKE rørt her — hører til den samlede RLS-gjennomgangen på go-live-lista.
--
-- FORUTSETNING: migr 041–046 + 064 er kjørt live.
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent (create or replace / drop if exists).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) FUNN 1 — lesetilgang for HTLA på egen, aktiv skolekobling
-- ---------------------------------------------------------------------------
-- Ren lesevariant av tilgangssjekken. SECURITY DEFINER + search_path='' +
-- fullkvalifiserte tabellnavn (husregel fra 041/FIX E). auth.uid() er
-- skjemakvalifisert og trygg under tom search_path.
create or replace function public.tu_er_htla_paa_skole(p_skole uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.bruker_skole bs
    where bs.bruker_id = auth.uid()
      and bs.skole_id  = p_skole
      and bs.aktiv     = true          -- kun AKTIV kobling (jf. funn 3-kravet for NY policy)
      and bs.tl_rolle  = 'htla');
$$;

-- B4-mønsteret fra 041: funksjoner får EXECUTE til PUBLIC som default → strammes.
-- authenticated trenger EXECUTE fordi policy-uttrykket evalueres som kalleren.
revoke execute on function public.tu_er_htla_paa_skole(uuid) from public, anon;
grant  execute on function public.tu_er_htla_paa_skole(uuid) to authenticated;

-- KUN SELECT. Policyer OR-es: skoleadmin/superadmin slipper inn via
-- tu_runder_egen_skole_sel (041) som før; denne åpner lesing for htla.
drop policy if exists tu_runder_htla_les on public.tu_runder;
create policy tu_runder_htla_les on public.tu_runder
  for select to authenticated
  using (public.tu_er_htla_paa_skole(skole_id));

-- MERK: ingen endring på tu_runder_egen_skole_ins / _upd (opprett/endre er
-- fortsatt kun superadmin/skoleadmin), og INGENTING gjøres med tu_svar/
-- tu_koder (fortsatt null policyer + null grants for authenticated).

-- ---------------------------------------------------------------------------
-- 2) FUNN 2 — case-insensitiv gruppe-unikhet
--    «6A», «6a» og « 6a » regnes nå som samme gruppe per
--    (skole, trinn, skoleår, semester). NULL-gruppe («hele trinnet») uendret.
-- ---------------------------------------------------------------------------
drop index if exists public.tu_runder_unik_gruppe;
create unique index if not exists tu_runder_unik_gruppe
  on public.tu_runder (skole_id, trinn, coalesce(lower(btrim(gruppe_navn)),''), skoleaar, coalesce(semester,''));

-- ============================================================================
-- SLUTT MIGRASJON 065.
-- MERK (senere steg): tellingen «X av Y har svart» per gruppe (steg 4.4)
-- går via tu_folg_med, som fortsatt autoriserer via tu_har_tilgang_skole
-- (kun superadmin/skoleadmin). Skal HTLA se live-tellingen i 4.4, må
-- tu_folg_med utvides med tu_er_htla_paa_skole-klausul DA — egen beslutning.
-- ============================================================================
