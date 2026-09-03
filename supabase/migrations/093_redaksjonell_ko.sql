-- 093_redaksjonell_ko.sql
-- ============================================================================
-- ETAPPE 5 (FASE 3): REDAKSJONELL KØ — avvik importen finner, som et menneske rydder
-- ============================================================================
-- HVA: ny tabell `redaksjonell_ko`. Importen skriver én rad per avvik (status 'ny');
--      et menneske (ansvarlig) behandler og lukker den. 22 kø-typer i CHECK-lista.
--      Køen er for avvik som skal behandles ETT OG ETT — ikke en bremse på importen
--      (mengderegel: 800 «uten sted/utstyr» blir IKKE kø-rader).
--
-- KILDE (fasit): claude_ETAPPE5-SPESIFIKASJON-v3-2sep.md punkt 10
--      + claude_FORSJEKK-092-095-3sep.md seksjon 10 (Cowork A) og 11 (Cowork B).
--
-- FORSJEKK (bekreftet mot base 3. sep):
--   * `redaksjonell_ko` finnes IKKE (0 treff, også i live-dump 019) — ren CREATE.
--   * Alle FK-mål finnes: ressurser (024), dokumenter (026), medier (026),
--     kompetansemaal (023), import_kjoring (091), samlinger (029), profiles.
--
-- BESLUTNINGER innarbeidet (fra seksjon 11 + Kjartan 3. sep):
--   * `samling_id` LAGT TIL (11.1): tre kø-typer (lenke_ulost, lenke_odelagt,
--     samling_video_ulastet) har en SAMLING som subjekt, ikke lek/dokument/medie.
--   * ASCII for alle 22 (11.3): `lenke_uløst` -> `lenke_ulost`. Nøklene er maskin-
--     verdier importskriptet skriver byte-eksakt; skjelettets normHtml gjør tegn-
--     normalisering, så en ø i en enum-nøkkel er en unødvendig kilde til stopp.
--   * «minst én subjekt satt»-CHECK RELAKSERT (11.4, Kjartans beslutning): utvidet med
--     `samling_id`, OG unntatt `type in ('annet','filtype_uavklart')` — mp4-fila (§7f)
--     importeres ikke noe sted og har legitimt ingen peker; uten unntaket ville en helt
--     korrekt rad stoppet importen.
--   * `lenke_upublisert` (beslutning D) og `landingsnode` (beslutning C) kan nå være
--     SAMLING-forankret. Modellen HARDKODER ikke hvilken kolonne en type bruker — den
--     relakserte CHECK-en tillater ressurs_id ELLER samling_id (m.fl.) for enhver type.
--     Hvilken peker importskriptet setter per type er en import-regel (Etappe 6), ikke
--     en skjema-constraint. (De 2 tomme landingsnodene nid 12415/18937 kan bruke
--     ressurs_id om de importeres som utkast-leker.)
--
-- LIVSSYKLUS (spec-navn, IKKE behandlet_av/at): status ('ny','under_arbeid','lost',
--      'avvist') default 'ny'; ansvarlig; opprettet_at; lost_at; lost_av.
--
-- ON DELETE-VALG (spec taus utover import_kjoring_id — flagget for kontroll):
--   * subjekt-pekere ressurs_id/dokument_id/medie_id/samling_id: ON DELETE CASCADE —
--     en kø-rad om et slettet subjekt er meningsløs, og angre (delete node where
--     import_kjoring_id=X) må ikke blokkeres av en RESTRICT-peker. (Cascade unngår også
--     at ON DELETE SET NULL bryter «minst én satt»-CHECK-en på en enpeker-rad.)
--   * kompetansemaal_id: ON DELETE SET NULL — sekundær peker; å slette et mål skal ikke
--     rive en kø-rad som primært handler om en lek (maalrelaterte rader har ressurs_id).
--   * import_kjoring_id: ON DELETE RESTRICT (som 091/092) — kjøringsraden kan ikke
--     slettes mens kø-rader peker; angre sletter kø-radene eksplisitt først.
--   * ansvarlig/lost_av -> profiles(id): husets mønster (som opprettet_av/endret_av, 024)
--     — ingen on-delete-klausul.
--
-- EGENSKAPER: Additiv · Idempotent (if not exists / drop+create policy) · ÉN transaksjon.
-- MØNSTER: følger 090/091/092 som formmal (RLS/GRANT som huset i 030).
-- NB: kontrollrunde (uavhengig verifikasjon) skrives IKKE her — den er kontrollørens (regel 4).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- NY TABELL: redaksjonell_ko
-- ----------------------------------------------------------------------------
create table if not exists redaksjonell_ko (
  id                uuid        primary key default gen_random_uuid(),
  type              text        not null,

  -- Subjekt-pekere (alle nullable; se rk_minst_ett_subjekt under). CASCADE så en
  -- kø-rad forsvinner med subjektet og angre ikke blokkeres.
  ressurs_id        uuid        references ressurser(id)      on delete cascade,
  dokument_id       uuid        references dokumenter(id)     on delete cascade,
  medie_id          uuid        references medier(id)         on delete cascade,
  samling_id        uuid        references samlinger(id)      on delete cascade,
  -- Sekundær peker (målrelaterte typer): SET NULL, ikke cascade.
  kompetansemaal_id integer     references kompetansemaal(id) on delete set null,

  -- Provenans: kjøringsraden slettes ikke mens kø-rader peker (angre eksplisitt).
  import_kjoring_id uuid        references import_kjoring(id) on delete restrict,

  -- Fritekst: rå avvikstekst + forslag til handling.
  beskrivelse       text,
  forslag           text,

  -- Livssyklus.
  status            text        not null default 'ny',
  ansvarlig         uuid        references profiles(id),
  opprettet_at      timestamptz not null default now(),
  lost_at           timestamptz,
  lost_av           uuid        references profiles(id),

  -- CHECK: gyldig kø-type — 22 verdier, ren ASCII, med kilde per gruppe.
  constraint rk_type_gyldig check (type in (
    -- 11 fra ETAPPE5 punkt 10:
    'manglende_alttekst','usikker_maalkobling','ikke_et_maal','utgatt_fjernet',
    'manglende_maal','kun_skjermkvalitet','dokumenttype_uavklart','filtype_uavklart',
    'sted_uavklart','landingsnode','annet',
    -- 7 fra MODELLHULL B3:
    'antall_uavklart','utstyr_uenig','tom_tekst','skoletype_mangler','ekstern_video',
    'fil_mangler','kategori_uavklart',
    -- 4 fra SAMLINGER-IMPORTREGEL (ASCII: lenke_ulost):
    'lenke_upublisert','lenke_ulost','lenke_odelagt','samling_video_ulastet'
  )),

  -- CHECK: gyldig status.
  constraint rk_status_gyldig check (status in ('ny','under_arbeid','lost','avvist')),

  -- CHECK (relaksert): minst én subjekt-peker satt, ELLER en subjektløs-tillatt type.
  -- 'annet' (sekkebøtte) og 'filtype_uavklart' (mp4 som ikke importeres) kan stå uten peker.
  constraint rk_minst_ett_subjekt check (
    type in ('annet','filtype_uavklart')
    or ressurs_id  is not null
    or dokument_id is not null
    or medie_id    is not null
    or samling_id  is not null
  )
);

-- Indeks som spesifisert (arbeidsliste-visning: filtrer på status/type).
create index if not exists idx_redaksjonell_ko_status_type on redaksjonell_ko (status, type);
-- Indeks for angre (delete ... where import_kjoring_id = X), jf. 091/092-mønsteret.
create index if not exists idx_redaksjonell_ko_import_kjoring on redaksjonell_ko (import_kjoring_id);

-- ----------------------------------------------------------------------------
-- RETTIGHETER + RLS — intern kø (ikke for lærere). Mønster som fase3 i migr 030.
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on redaksjonell_ko to authenticated, service_role;

alter table redaksjonell_ko enable row level security;

drop policy if exists p_les on redaksjonell_ko;
create policy p_les on redaksjonell_ko
  for select to authenticated
  using (fase3_intern());

drop policy if exists p_skriv on redaksjonell_ko;
create policy p_skriv on redaksjonell_ko
  for all to authenticated
  using (fase3_intern())
  with check (fase3_intern());

commit;
