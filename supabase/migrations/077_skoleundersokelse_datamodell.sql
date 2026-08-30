-- 077_skoleundersokelse_datamodell.sql
-- MODUL «Spørreundersøkelse til skolene» — byggetrinn 1: datamodell + seed av det
-- låste v1-spørsmålssettet. IDENTIFISERT (per skole), IKKE anonym — dette er en
-- HELT annen mekanikk enn Trivselsundersøkelsen (tu_*), som er anonym.
--
-- Grunnlag: forsjekk/gate 30. aug 2026. Skinnene speiles fra kurs-evalueringen
-- (RLS via get_min_rolle(), token-innsending via SECURITY DEFINER i byggetrinn 2).
-- oppstartsår er KUTTET fra undersøkelsen — hentes fra skoler.oppstart_aar (migr 076).
--
-- IKKE KJØRT ENNÅ. Nye tabeller med prefiks skoleus_. Rører ALDRI kurs-eval-,
-- TU- eller Resend-tabeller. Idempotent (IF NOT EXISTS + guardet seed).
--
-- Byggetrinn 2 (senere, IKKE her): selve utsendingen kobles til Resend/eval-skinnene
-- (skoleus-mottaker + token), token-baserte innsendings-/oppslagsfunksjoner, UI,
-- resultater/dashbord. mottaker_id i skoleus_svar får FK til mottaker-tabellen da.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabell 1: skoleus_runder — én utsendt undersøkelsesrunde
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.skoleus_runder (
  id           uuid primary key default gen_random_uuid(),
  navn         text not null,
  status       text not null default 'utkast'
                 check (status in ('utkast','aktiv','lukket')),
  maalgruppe   text,                       -- skoletype-filter for mottakere; NULL = alle skoletyper
  opprettet_at timestamptz not null default now(),
  lukket_at    timestamptz
);
comment on table public.skoleus_runder is
  'Én utsendt runde av skoleundersøkelsen (identifisert per skole). Utsendingen kobles i byggetrinn 2.';
comment on column public.skoleus_runder.maalgruppe is
  'Skoletype-filter for hvilke skoler som skal få runden (matcher skoler.type). NULL = alle.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabell 2: skoleus_sporsmal — REDIGERBAR spørsmålsdefinisjon (global, ikke pr. runde)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.skoleus_sporsmal (
  id                 uuid primary key default gen_random_uuid(),
  rekkefolge         integer not null default 0,
  blokk              text not null
                       check (blokk in ('rolle','effekt','drift','plattform','aapent')),
  type               text not null
                       check (type in ('matrise','enkeltvalg','fritekst')),
  sporsmaltekst      text not null,
  skala_min          integer,             -- NULL for fritekst
  skala_max          integer,             -- NULL for fritekst
  tillat_ikke_aktuelt boolean not null default false,
  betinget_vis       jsonb,               -- LEGGES INN men UBRUKT i v1 (ingen hoppelogikk ennå)
  opprettet_at       timestamptz not null default now(),
  -- skala må gi mening når den finnes:
  constraint skoleus_sporsmal_skala_check
    check (skala_min is null or skala_max is null or skala_min <= skala_max),
  -- fritekst har ingen skala; matrise/enkeltvalg skal ha skala:
  constraint skoleus_sporsmal_type_skala_check
    check (
      (type = 'fritekst' and skala_min is null and skala_max is null)
      or (type in ('matrise','enkeltvalg') and skala_min is not null and skala_max is not null)
    )
);
comment on table public.skoleus_sporsmal is
  'Redigerbar spørsmålsdefinisjon for skoleundersøkelsen. Global (deles av alle runder).';
comment on column public.skoleus_sporsmal.betinget_vis is
  'Reservert for betinget visning/hoppelogikk. LEGGES INN i v1 men står UBRUKT (ingen hopp).';
create index if not exists skoleus_sporsmal_blokk_rekkefolge_idx
  on public.skoleus_sporsmal (blokk, rekkefolge);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabell 3: skoleus_matriserad — rader under et matrise-spørsmål
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.skoleus_matriserad (
  id                 uuid primary key default gen_random_uuid(),
  sporsmal_id        uuid not null references public.skoleus_sporsmal(id) on delete cascade,
  rekkefolge         integer not null default 0,
  radtekst           text not null,
  tillat_ikke_aktuelt boolean not null default false
);
comment on table public.skoleus_matriserad is
  'Rader i et matrise-spørsmål. Skalaen ligger på forelderen (skoleus_sporsmal).';
create index if not exists skoleus_matriserad_sporsmal_idx
  on public.skoleus_matriserad (sporsmal_id, rekkefolge);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabell 4: skoleus_svar — IDENTIFISERTE svar per skole
-- ─────────────────────────────────────────────────────────────────────────────
-- Identitetsmodell speiler kurs-eval: hvem som svarte spores via mottaker_id
-- (token-mottaker, tabell kommer i byggetrinn 2 — FK legges til da) og/eller
-- bruker_id (innlogget bruker / registrert på vegne, som svar_registrert_av i eval).
create table if not exists public.skoleus_svar (
  id            uuid primary key default gen_random_uuid(),
  runde_id      uuid not null references public.skoleus_runder(id)   on delete cascade,
  skole_id      uuid not null references public.skoler(id)           on delete cascade,
  mottaker_id   uuid,                       -- token-mottaker (byggetrinn 2; FK legges til da)
  bruker_id     uuid references public.profiles(id) on delete set null,  -- innlogget/på vegne
  sporsmal_id   uuid not null references public.skoleus_sporsmal(id) on delete cascade,
  matriserad_id uuid references public.skoleus_matriserad(id)        on delete cascade,  -- kun matrise
  verdi_tall    integer,                    -- skala-svar
  verdi_tekst   text,                       -- fritekst-svar
  ikke_aktuelt  boolean not null default false,
  tidspunkt     timestamptz not null default now(),
  -- Nøyaktig ÉN svarform: enten ikke_aktuelt, eller tall, eller tekst.
  constraint skoleus_svar_form_check
    check (
      (ikke_aktuelt and verdi_tall is null and verdi_tekst is null)
      or (not ikke_aktuelt and num_nonnulls(verdi_tall, verdi_tekst) = 1)
    )
);
comment on table public.skoleus_svar is
  'Identifiserte svar per skole (IKKE anonymt). Innsending skjer token-basert i byggetrinn 2.';
create index if not exists skoleus_svar_runde_skole_idx
  on public.skoleus_svar (runde_id, skole_id);
create index if not exists skoleus_svar_sporsmal_idx
  on public.skoleus_svar (sporsmal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — speiler kurs-eval: kun ansatte/superadmin på rå tabeller (dashbord senere).
-- Anon har INGEN tilgang; token-innsending (byggetrinn 2) går via SECURITY DEFINER.
-- service_role forbigår RLS, men får eksplisitt GRANT som i 063-mønsteret.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.skoleus_runder     enable row level security;
alter table public.skoleus_sporsmal   enable row level security;
alter table public.skoleus_matriserad enable row level security;
alter table public.skoleus_svar       enable row level security;

drop policy if exists skoleus_runder_ansatt on public.skoleus_runder;
create policy skoleus_runder_ansatt on public.skoleus_runder
  for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

drop policy if exists skoleus_sporsmal_ansatt on public.skoleus_sporsmal;
create policy skoleus_sporsmal_ansatt on public.skoleus_sporsmal
  for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

drop policy if exists skoleus_matriserad_ansatt on public.skoleus_matriserad;
create policy skoleus_matriserad_ansatt on public.skoleus_matriserad
  for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

drop policy if exists skoleus_svar_ansatt on public.skoleus_svar;
create policy skoleus_svar_ansatt on public.skoleus_svar
  for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANT-vakter (husregel 5): authenticated + service_role; anon REVOKED på alt rått.
-- ─────────────────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.skoleus_runder     to authenticated, service_role;
grant select, insert, update, delete on public.skoleus_sporsmal   to authenticated, service_role;
grant select, insert, update, delete on public.skoleus_matriserad to authenticated, service_role;
grant select, insert, update, delete on public.skoleus_svar       to authenticated, service_role;

revoke all on public.skoleus_runder     from anon;
revoke all on public.skoleus_sporsmal   from anon;
revoke all on public.skoleus_matriserad from anon;
revoke all on public.skoleus_svar       from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — det låste v1-spørsmålssettet (redigerbart etterpå).
-- Guardet: seedes kun hvis tabellen er tom (idempotent — ingen dobbel seed).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_eff_id uuid;
  v_plf_id uuid;
begin
  if (select count(*) from public.skoleus_sporsmal) = 0 then

    -- BLOKK «rolle» — enkeltvalg 1–6, tillat_ikke_aktuelt=TRUE
    insert into public.skoleus_sporsmal
      (rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt)
    values
      (1, 'rolle', 'enkeltvalg', 'Jeg trives i rollen som TL-ansvarlig', 1, 6, true);

    -- BLOKK «effekt» — matrise 1–6 (forelder + 5 rader)
    insert into public.skoleus_sporsmal
      (rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt)
    values
      (2, 'effekt', 'matrise', 'Jeg opplever at Trivselsprogrammet bidrar til …', 1, 6, false)
    returning id into v_eff_id;

    insert into public.skoleus_matriserad (sporsmal_id, rekkefolge, radtekst, tillat_ikke_aktuelt)
    values
      (v_eff_id, 1, 'mange er i aktivitet i storefriminuttet',            false),
      (v_eff_id, 2, 'lavere konfliktnivå mellom elever',                  false),
      (v_eff_id, 3, 'å redusere mobbingen på skolen',                     false),
      (v_eff_id, 4, 'færre elever går alene i friminuttene',              false),
      (v_eff_id, 5, 'elever lettere bygger gode vennskapsrelasjoner',     false);

    -- BLOKK «drift» — enkeltvalg
    insert into public.skoleus_sporsmal
      (rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt)
    values
      (3, 'drift', 'enkeltvalg', 'Hvor mange dager i uka er det trivselsaktiviteter i storefri?', 1, 5, false),
      (4, 'drift', 'enkeltvalg', 'Planleggingsmøtene fungerer godt',                               1, 6, false),
      (5, 'drift', 'enkeltvalg', 'Antall planleggingsmøter per måned',                             0, 4, false),
      (6, 'drift', 'enkeltvalg', 'Nominasjonsprosessen fungerer godt',                             1, 6, false),
      (7, 'drift', 'enkeltvalg', 'Trivselsprogrammet er godt forankret hos personalet',            1, 6, false);

    -- BLOKK «plattform» — matrise 1–6 (forelder + 7 rader), hver rad tillat_ikke_aktuelt=TRUE
    insert into public.skoleus_sporsmal
      (rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt)
    values
      (8, 'plattform', 'matrise',
       'Hvor godt fungerer disse delene av plattformen slik dere bruker dem på skolen? (Velg «ikke aktuelt» for det dere ikke har tatt i bruk.)',
       1, 6, false)
    returning id into v_plf_id;

    insert into public.skoleus_matriserad (sporsmal_id, rekkefolge, radtekst, tillat_ikke_aktuelt)
    values
      (v_plf_id, 1, 'Kursplanleggeren',                  true),
      (v_plf_id, 2, 'Trivselsundersøkelsen',             true),
      (v_plf_id, 3, 'Ressursbibliotek/aktivitetsbank',   true),
      (v_plf_id, 4, 'TL-hjul/periodeplan',               true),
      (v_plf_id, 5, 'Feide-innlogging',                  true),
      (v_plf_id, 6, 'Nettstedet totalt',                 true),
      (v_plf_id, 7, 'Kultur-/aktivitetskort',            true);

    -- BLOKK «aapent»
    insert into public.skoleus_sporsmal
      (rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt)
    values
      (9,  'aapent', 'enkeltvalg', 'Programmet fungerer totalt sett godt på min skole', 1, 6, false),
      (10, 'aapent', 'fritekst',   'Hva blir viktig fremover?',                          null, null, false),
      (11, 'aapent', 'fritekst',   'Gladsaker / gode uttalelser',                        null, null, false);

  end if;
end $$;

commit;
