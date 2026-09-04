-- ============================================================================
-- Denne filen er ryddet 3. sep 2026 for å gjøre gjenoppbygging fra bunnen mulig.
-- Den avviker bevisst fra SQL-en som faktisk bygget produksjonsbasen. Filen er en
-- GJENOPPBYGGINGS-OPPSKRIFT, ikke en historisk logg.
-- ============================================================================

-- Migrasjon 019: offentlig skjema (schema "public") som fyller migrasjonsgapet.
-- SKAL KJØRES i rekkefølge ved gjenoppbygging av en tom base (etter 018, før 020).
-- Tabellene kurs, kurs_skole, kursholdere, haller og evalueringer + 22 RPC-er og
-- RLS-policyer opprettes KUN i denne fila; 22 senere filer (020, 021, 022, 047-058,
-- 060-062, 078, 082, 083, 085) bygger på dem. Uten 019 stopper gjenoppbyggingen ved 020.
-- Bruker gjennomgående «create table if not exists», så den kolliderer ikke med
-- tabeller som alt er opprettet i tidligere filer (f.eks. brukslogg fra 015).
-- MERK: skal IKKE kjøres mot den eksisterende live-basen — kun ved oppbygging av en
-- fersk/tom kopi-base. Skjemaet er avlest fra den kjørende basen 10. august 2026, så
-- det kan avvike noe fra det 001-018 bygget; «if not exists» skjuler slike avvik.


-- Tabell: bruker_skole
create table if not exists public.bruker_skole (
  id uuid not null default gen_random_uuid(),
  bruker_id uuid,
  skole_id uuid,
  rolle text not null,
  aktiv boolean default true
);

-- Tabell: brukslogg
create table if not exists public.brukslogg (
  id uuid not null default gen_random_uuid(),
  skole_id uuid,
  bruker_id uuid,
  hendelse_type text not null,
  ressurs_id text,
  ressurs_navn text,
  side text,
  tidspunkt timestamp with time zone not null default now()
);

-- Tabell: churn_signalord
create table if not exists public.churn_signalord (
  id uuid not null default gen_random_uuid(),
  ord text not null,
  aktiv boolean default true,
  created_at timestamp with time zone default now()
);

-- Tabell: epost_logg
create table if not exists public.epost_logg (
  id uuid not null default gen_random_uuid(),
  opprettet_at timestamp with time zone not null default now(),
  type text not null,
  mottaker_epost text,
  mottaker_navn text,
  kurs_skole_id uuid,
  kurs_skole_mottaker_id uuid,
  status text not null,
  resend_id text,
  feilmelding text
);

-- Tabell: eval_pakker
create table if not exists public.eval_pakker (
  id uuid not null default gen_random_uuid(),
  semester_id uuid not null,
  navn text not null,
  pris integer not null,
  beskrivelse text,
  bilde_url text,
  rekkefolge integer not null default 0,
  aktiv boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Tabell: eval_semester
create table if not exists public.eval_semester (
  id uuid not null default gen_random_uuid(),
  navn text not null,
  aktiv boolean not null default false,
  created_at timestamp with time zone not null default now()
);

-- Tabell: eval_sporsmal
create table if not exists public.eval_sporsmal (
  id uuid not null default gen_random_uuid(),
  semester_id uuid not null,
  felt text not null,
  sporsmal text not null,
  skala_lav text not null default 'svært dårlig'::text,
  skala_hoy text not null default 'svært bra'::text,
  rekkefolge integer not null default 0,
  type text not null default 'skala'::text,
  created_at timestamp with time zone not null default now()
);

-- Tabell: evalueringer
create table if not exists public.evalueringer (
  id uuid not null default gen_random_uuid(),
  kurs_skole_id uuid not null,
  token text not null default replace((gen_random_uuid())::text, '-'::text, ''::text),
  vurd_gjennomforing integer,
  vurd_info integer,
  vurd_aktiviteter integer,
  gullkorn text,
  kjopsinteresse text,
  svart_tidspunkt timestamp with time zone,
  sendt_tidspunkt timestamp with time zone,
  created_at timestamp with time zone default now(),
  semester_id uuid,
  valgt_pakke_id uuid,
  valgt_pakke_navn text,
  valgt_pakke_pris integer,
  eivind_varslet_at timestamp with time zone
);

-- Tabell: haller
create table if not exists public.haller (
  id uuid not null default gen_random_uuid(),
  navn text not null,
  adresse text,
  kommune text,
  fylke text,
  nettverk text,
  kontaktperson text,
  epost text,
  telefon text,
  pris text,
  merknad text,
  created_at timestamp with time zone default now()
);

-- Tabell: innstillinger
create table if not exists public.innstillinger (
  nokkel text not null,
  verdi text not null,
  beskrivelse text,
  oppdatert_at timestamp with time zone not null default now()
);

-- Tabell: kulturkort_bestillinger
create table if not exists public.kulturkort_bestillinger (
  id uuid not null default gen_random_uuid(),
  skolenavn text not null,
  antall_kort integer not null,
  kontaktperson text not null,
  epost text not null,
  gate text,
  postnummer text,
  poststed text,
  melding text,
  kortpris integer,
  porto integer,
  total integer,
  status text not null default 'Ny'::text,
  created_at timestamp with time zone default now()
);

-- Tabell: kulturkort_partnere
create table if not exists public.kulturkort_partnere (
  id integer not null,
  navn text not null,
  kommune text not null,
  fylke text not null,
  type text,
  epost text,
  nettside text,
  beskrivelse text,
  kategori text not null default 'aktiv'::text,
  published boolean generated always as (kategori = 'aktiv'::text) stored,
  innleggsdato text,
  oppdatert text,
  konfidens text,
  telefon text
);

-- RYDDET 3. sep 2026: konfidens og telefon ble lagt til kulturkort_partnere MANUELT i basen
-- (utenom migrasjoner). Migr 016 lager tabellen UTEN dem, og ved gjenoppbygging lager 016
-- tabellen mens create-en over hoppes over av «if not exists» -> kolonnene ville manglet
-- stille. Legges derfor til eksplisitt (idempotent) så gjenoppbygging matcher prod:
alter table kulturkort_partnere add column if not exists konfidens text;
alter table kulturkort_partnere add column if not exists telefon   text;

-- Tabell: kurs
create table if not exists public.kurs (
  id uuid not null default gen_random_uuid(),
  nettverk text,
  hall_id uuid,
  dato date,
  start_tid time without time zone,
  slutt_tid time without time zone,
  ra text,
  sesong text,
  status text default 'planlagt'::text,
  maks_antall integer,
  merknad text,
  created_at timestamp with time zone default now(),
  kursholder_id uuid,
  backup_kursholder_id uuid,
  antall_tl integer,
  antall_skoler integer,
  uke integer,
  dag text,
  navn text,
  oppmote_vertskap time without time zone,
  oppmote_ovrige time without time zone,
  kursinfo_tillegg text
);

-- Tabell: kurs_skole
create table if not exists public.kurs_skole (
  id uuid not null default gen_random_uuid(),
  kurs_id uuid,
  skole_id uuid,
  er_vertskap boolean default false,
  vertskap_bekreftet boolean,
  kommer boolean,
  arsak_ikke_komme text,
  arsak_ikke_vertskap text,
  antall_tl integer,
  antall_kort integer,
  kort_status text,
  kommentar text,
  onsket_kurs_id uuid,
  svart boolean default false,
  svart_dato timestamp with time zone,
  lenke_token text not null default replace((gen_random_uuid())::text, '-'::text, ''::text),
  created_at timestamp with time zone default now(),
  apen_for_annet_kurs boolean default false,
  melding_handtert boolean not null default false,
  svart_av_mottaker_id uuid,
  forste_utsending_at timestamp with time zone,
  purring_sendt_at timestamp with time zone,
  trinn3_sendt_at timestamp with time zone,
  paaminnelse_sendt_at timestamp with time zone,
  evaluering_sendt_at timestamp with time zone,
  svar_registrert_av uuid,
  svar_registrert_at timestamp with time zone
);

-- Tabell: kurs_skole_mottaker
create table if not exists public.kurs_skole_mottaker (
  id uuid not null default gen_random_uuid(),
  kurs_skole_id uuid not null,
  rolle text not null,
  navn text,
  epost text not null,
  lenke_token uuid not null default gen_random_uuid(),
  sendt_at timestamp with time zone,
  apnet_at timestamp with time zone,
  opprettet_at timestamp with time zone not null default now()
);

-- Tabell: kursholdere
create table if not exists public.kursholdere (
  id uuid not null default gen_random_uuid(),
  navn text not null,
  epost text,
  mobil text,
  type text default 'egen'::text,
  aktiv boolean default true,
  created_at timestamp with time zone default now(),
  merknad text
);

-- Tabell: paameldinger
create table if not exists public.paameldinger (
  id uuid not null default gen_random_uuid(),
  status text not null default 'påmeldt'::text,
  skolenavn text not null,
  type text not null,
  antall_elever integer,
  gateadresse text not null,
  postnummer text not null,
  poststed text not null,
  kommune text not null,
  fylke text not null,
  hjemmeside text,
  fakturaadresse text,
  organisasjonsnummer text not null,
  fakturareferanse text,
  kontortelefon text,
  rektor_navn text not null,
  rektor_epost text not null,
  rektor_telefon text,
  htla_navn text,
  htla_epost text,
  htla_telefon text,
  tla_navn text,
  tla_epost text,
  tla_telefon text,
  merknader text,
  created_at timestamp with time zone default now(),
  hubspot_company_id text
);

-- Tabell: profiles
create table if not exists public.profiles (
  id uuid not null,
  navn text,
  rolle text not null,
  created_at timestamp with time zone default now(),
  epost text,
  aktiv boolean not null default true
);

-- Tabell: skoler
create table if not exists public.skoler (
  id uuid not null default gen_random_uuid(),
  navn text not null,
  org_nr text,
  kommunenr text,
  kommunenavn text,
  fylke text,
  created_at timestamp with time zone default now(),
  type text,
  status text default 'Potensielle'::text,
  ansvarlig text,
  antall_elever integer,
  rektor_navn text,
  rektor_epost text,
  htla_navn text,
  htla_epost text,
  gateadresse text,
  postnummer text,
  poststed text,
  telefon text,
  nettverk text,
  rektor_telefon text,
  hktl_navn text,
  hktl_epost text,
  hktl_telefon text,
  hubspot_company_id text,
  tla_kontakter jsonb default '[]'::jsonb
);


-- Constraints
-- RYDDET 3. sep 2026: fjernet re-adds av PK/UNIQUE/FK/CHECK for bruker_skole og brukslogg.
-- Disse lages allerede av 001 (bruker_skole: PK, UNIQUE, FK-er) + 006 (rolle-CHECK) og 015
-- (brukslogg: PK, FK-er, hendelse-CHECK), med samme navn og definisjon. Å legge dem på nytt
-- ga «multiple primary keys / constraint already exists» ved gjenoppbygging. Sluttilstand
-- uendret (constraintene finnes fra 001/006/015).
alter table churn_signalord add constraint churn_signalord_pkey PRIMARY KEY (id);
alter table epost_logg add constraint epost_logg_pkey PRIMARY KEY (id);
alter table eval_pakker add constraint eval_pakker_pkey PRIMARY KEY (id);
alter table eval_semester add constraint eval_semester_pkey PRIMARY KEY (id);
alter table eval_sporsmal add constraint eval_sporsmal_pkey PRIMARY KEY (id);
alter table evalueringer add constraint evalueringer_token_key UNIQUE (token);
alter table evalueringer add constraint evalueringer_pkey PRIMARY KEY (id);
alter table haller add constraint haller_pkey PRIMARY KEY (id);
alter table innstillinger add constraint innstillinger_pkey PRIMARY KEY (nokkel);
-- RYDDET 3. sep 2026: fjernet re-adds av PK/CHECK for kulturkort_bestillinger og
-- kulturkort_partnere. Lages allerede av 018 (bestillinger: PK) og 016 (partnere: PK +
-- kategori-CHECK), med samme navn. Sluttilstand uendret.
alter table kurs add constraint kurs_pkey PRIMARY KEY (id);
alter table kurs_skole add constraint kurs_skole_lenke_token_key UNIQUE (lenke_token);
alter table kurs_skole add constraint kurs_skole_lenke_token_unique UNIQUE (lenke_token);
alter table kurs_skole add constraint kurs_skole_pkey PRIMARY KEY (id);
alter table kurs_skole_mottaker add constraint kurs_skole_mottaker_kurs_skole_id_epost_key UNIQUE (kurs_skole_id, epost);
alter table kurs_skole_mottaker add constraint kurs_skole_mottaker_pkey PRIMARY KEY (id);
alter table kurs_skole_mottaker add constraint kurs_skole_mottaker_rolle_check CHECK ((rolle = ANY (ARRAY['htla'::text, 'tla'::text])));
alter table kursholdere add constraint kursholdere_pkey PRIMARY KEY (id);
-- RYDDET 3. sep 2026: fjernet re-adds av PK/FK/UNIQUE/CHECK for paameldinger, profiles og
-- skoler (unntatt status-CHECK, se under). Lages allerede av 002 (paameldinger: PK + type-
-- CHECK), 001+006 (profiles: PK, FK->auth.users, rolle-CHECK) og 001 (skoler: PK, org_nr
-- UNIQUE). Sluttilstand uendret for disse.
--
-- MEN skoler_status_check har DRIFTET: migr 003 lager den med 6 verdier; prod (avlest i 019)
-- har 7 — verdien 'Inaktiv' ble lagt til MANUELT i basen, utenom migrasjoner (samme klasse
-- som konfidens/telefon). For at gjenoppbygging skal bli IDENTISK med prod byttes
-- 003-versjonen ut med 7-verdi-versjonen her (DROP + ADD, idempotent):
alter table skoler drop constraint if exists skoler_status_check;
alter table skoler add constraint skoler_status_check
  CHECK (status = ANY (ARRAY['Påmeldt'::text, 'Aktiv'::text, 'Aktiv sagt opp'::text, 'Pause'::text, 'Tidligere'::text, 'Potensielle'::text, 'Inaktiv'::text]));

-- Foreign keys (samlet her 3. sep 2026): ALLE FK-er er flyttet til slutten av constraint-
-- seksjonen, ETTER at alle PK/UNIQUE er lagt til over. pg_dump la dem alfabetisk, saa sju
-- FK-er kom FOER primaernoekkelen de refererer (f.eks. epost_logg -> kurs_skole_mottaker,
-- kurs -> kursholdere), noe som ga «there is no unique constraint matching given keys»
-- ved gjenoppbygging. Aa samle FK-ene her garanterer at referert PK/UNIQUE alltid finnes
-- foerst. Definisjonene (inkl. ON DELETE) er uendret; sluttilstand identisk med prod.
alter table epost_logg add constraint epost_logg_kurs_skole_mottaker_id_fkey FOREIGN KEY (kurs_skole_mottaker_id) REFERENCES kurs_skole_mottaker(id) ON DELETE SET NULL;
alter table epost_logg add constraint epost_logg_kurs_skole_id_fkey FOREIGN KEY (kurs_skole_id) REFERENCES kurs_skole(id) ON DELETE SET NULL;
alter table eval_pakker add constraint eval_pakker_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES eval_semester(id) ON DELETE CASCADE;
alter table eval_sporsmal add constraint eval_sporsmal_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES eval_semester(id) ON DELETE CASCADE;
alter table evalueringer add constraint evalueringer_valgt_pakke_id_fkey FOREIGN KEY (valgt_pakke_id) REFERENCES eval_pakker(id);
alter table evalueringer add constraint evalueringer_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES eval_semester(id);
alter table evalueringer add constraint evalueringer_kurs_skole_id_fkey FOREIGN KEY (kurs_skole_id) REFERENCES kurs_skole(id) ON DELETE CASCADE;
alter table kurs add constraint kurs_hall_id_fkey FOREIGN KEY (hall_id) REFERENCES haller(id);
alter table kurs add constraint kurs_backup_kursholder_id_fkey FOREIGN KEY (backup_kursholder_id) REFERENCES kursholdere(id);
alter table kurs add constraint kurs_kursholder_id_fkey FOREIGN KEY (kursholder_id) REFERENCES kursholdere(id);
alter table kurs_skole add constraint kurs_skole_kurs_id_fkey FOREIGN KEY (kurs_id) REFERENCES kurs(id);
alter table kurs_skole add constraint kurs_skole_svart_av_mottaker_id_fkey FOREIGN KEY (svart_av_mottaker_id) REFERENCES kurs_skole_mottaker(id);
alter table kurs_skole add constraint kurs_skole_onsket_kurs_id_fkey FOREIGN KEY (onsket_kurs_id) REFERENCES kurs(id);
alter table kurs_skole add constraint kurs_skole_svar_registrert_av_fkey FOREIGN KEY (svar_registrert_av) REFERENCES auth.users(id);
alter table kurs_skole add constraint kurs_skole_skole_id_fkey FOREIGN KEY (skole_id) REFERENCES skoler(id);
alter table kurs_skole_mottaker add constraint kurs_skole_mottaker_kurs_skole_id_fkey FOREIGN KEY (kurs_skole_id) REFERENCES kurs_skole(id) ON DELETE CASCADE;


-- Indexes
-- RYDDET 3. sep 2026: fjernet re-adds av tre brukslogg-indekser (bruker/hendelse/skole).
-- Lages allerede av 015, med samme navn. Sluttilstand uendret.
CREATE INDEX epost_logg_kurs_skole_idx ON public.epost_logg USING btree (kurs_skole_id);
CREATE INDEX epost_logg_tid_idx ON public.epost_logg USING btree (opprettet_at DESC);
CREATE INDEX idx_evalueringer_kurs_skole ON public.evalueringer USING btree (kurs_skole_id);
CREATE INDEX idx_evalueringer_token ON public.evalueringer USING btree (token);
-- RYDDET 3. sep 2026: fjernet re-adds av tre kulturkort_partnere-indekser (fylke/kategori/
-- kommune). Lages allerede av 016, med samme navn. Sluttilstand uendret.
CREATE INDEX idx_kurs_skole_lenke_token ON public.kurs_skole USING btree (lenke_token);
CREATE INDEX idx_mottaker_kurs_skole ON public.kurs_skole_mottaker USING btree (kurs_skole_id);
CREATE UNIQUE INDEX idx_mottaker_token ON public.kurs_skole_mottaker USING btree (lenke_token);


-- RLS + policies
alter table public.bruker_skole enable row level security;
alter table public.brukslogg enable row level security;
alter table public.haller enable row level security;
alter table public.innstillinger enable row level security;
alter table public.kulturkort_bestillinger enable row level security;
alter table public.kulturkort_partnere enable row level security;
alter table public.kurs enable row level security;
alter table public.kurs_skole enable row level security;
alter table public.kurs_skole_mottaker enable row level security;
alter table public.kursholdere enable row level security;
alter table public.paameldinger enable row level security;
alter table public.profiles enable row level security;
alter table public.skoler enable row level security;
-- prod-diff A2 (3. sep 2026): disse seks tabellene har RLS PAA i prod, men 019 slo den ikke
-- paa (bare 13 tabeller over). Uten dette + rettighets-migrasjonen 093B ville en gjenoppbygd
-- base gitt anon SELECT paa bl.a. epost_logg (e-post) og evalueringer. Prod har rls=true og
-- INGEN policyer paa disse (= laast for alle unntatt eier/service_role). Slaas paa her:
alter table public.churn_signalord enable row level security;
alter table public.epost_logg      enable row level security;
alter table public.eval_pakker     enable row level security;
alter table public.eval_semester   enable row level security;
alter table public.eval_sporsmal   enable row level security;
alter table public.evalueringer    enable row level security;
-- RYDDET 3. sep 2026: fjernet re-adds av policyer for bruker_skole. Lages allerede av 001
-- ("Bruker ser egne skoletilknytninger", "Superadmin administrerer bruker_skole") og 007
-- ("Skoleadmin ser ansatte paa sin skole"), med samme navn og predikat. Sluttilstand uendret.
-- RYDDET 3. sep 2026: fjernet re-adds av policyer for brukslogg. Lages allerede av 015, med
-- samme navn og predikat. Sluttilstand uendret.
create policy "Ansatte ser haller" on public.haller as permissive for select to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "Superadmin og ansatt administrerer haller" on public.haller as permissive for all to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "ansatte endrer innstillinger" on public.innstillinger as permissive for update to authenticated using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text]))) with check ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "ansatte leser innstillinger" on public.innstillinger as permissive for select to authenticated using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "ansatte oppretter innstillinger" on public.innstillinger as permissive for insert to authenticated with check ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy innstillinger_les on public.innstillinger as permissive for select to authenticated using (true);
-- RYDDET 3. sep 2026: fjernet re-adds av policyer for kulturkort_bestillinger. Lages allerede
-- av 018 (drop policy if exists + create), med samme navn og predikat. Sluttilstand uendret.
-- RYDDET 3. sep 2026: fjernet re-adds av policyer for kulturkort_partnere. Lages allerede av
-- 016, med samme navn og predikat. Sluttilstand uendret.
create policy "Ansatte ser kurs" on public.kurs as permissive for select to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "Service role har full tilgang til kurs" on public.kurs as permissive for all to service_role using (true) with check (true);
create policy "Superadmin og ansatt administrerer kurs" on public.kurs as permissive for all to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "Ansatte ser kurs_skole" on public.kurs_skole as permissive for select to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "Service role har full tilgang til kurs_skole" on public.kurs_skole as permissive for all to service_role using (true) with check (true);
create policy "Superadmin og ansatt administrerer kurs_skole" on public.kurs_skole as permissive for all to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy mottaker_ansatt_alt on public.kurs_skole_mottaker as permissive for all to authenticated using (true) with check (true);
create policy "Ansatte ser kursholdere" on public.kursholdere as permissive for select to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
create policy "Superadmin og ansatt administrerer kursholdere" on public.kursholdere as permissive for all to public using ((get_min_rolle() = ANY (ARRAY['superadmin'::text, 'ansatt'::text])));
-- RYDDET 3. sep 2026: fjernet re-adds av policyer for paameldinger. Lages allerede av 002
-- ("Superadmin administrerer paameldinger") og 008 ("Ansatt administrerer paameldinger"),
-- med samme navn og predikat. Sluttilstand uendret.
-- RYDDET 3. sep 2026 (KORRIGERT etter prod-diff A5): "Bruker ser sin profil" fjernet - den er
-- identisk med 001s versjon. MEN to profiles-policyer har DRIFTET: prod bruker 019-versjonene,
-- ikke 001/008-versjonene, saa de BEHOLDES her som drop+create (samme moenster som "Skoleadmin
-- ser ..."/get_skoleansatte_for_meg i C4):
--   * "Ansatt administrerer alle profiler": prod har KUN using(get_min_rolle()='ansatt'); 008 la paa with check.
--   * "Superadmin administrerer alle profiler": prod bruker get_min_rolle()='superadmin'; 001 bruker exists(...).
-- drop+create gjoer at prod-versjonen vinner ved gjenoppbygging; no-op mot prod.
create policy "Bruker kan oppdatere egen profil" on public.profiles as permissive for update to public using ((auth.uid() = id));
create policy "Bruker kan se egen profil" on public.profiles as permissive for select to public using ((auth.uid() = id));
drop policy if exists "Ansatt administrerer alle profiler" on public.profiles;
create policy "Ansatt administrerer alle profiler" on public.profiles as permissive for all to public using ((get_min_rolle() = 'ansatt'::text));
drop policy if exists "Superadmin administrerer alle profiler" on public.profiles;
create policy "Superadmin administrerer alle profiler" on public.profiles as permissive for all to public using ((get_min_rolle() = 'superadmin'::text));
-- (policyen "Skoleadmin ser profiler til skoleansatte" er FLYTTET ned til
--  Functions-seksjonen, rett under funksjonen get_skoleansatte_for_meg. Se C4-blokk.)
-- RYDDET 3. sep 2026: fjernet re-adds av policyer for skoler. Lages allerede av 001 ("Innloggede
-- ser skoler", "Superadmin administrerer skoler") og 008 ("Ansatt administrerer skoler"; 
-- "Innloggede ser skoler" finnes ogsaa i 008). Samme navn og predikat. Sluttilstand uendret.


-- Functions
CREATE OR REPLACE FUNCTION public.flytt_skole_til_kurs(p_id uuid, p_nytt_kurs_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Funksjonen er SECURITY DEFINER og går utenom RLS. Da MÅ den selv sjekke
  -- hvem som kaller. Uten dette kunne en innlogget skolebruker flytte hvilken
  -- som helst skole til hvilket som helst kurs. Funnet av agenttest 3, 4. aug.
  if coalesce(get_min_rolle(), '') not in ('superadmin', 'ansatt') then
    raise exception 'Bare ansatte kan flytte skoler mellom kurs.'
      using errcode = '42501';
  end if;

  UPDATE kurs_skole
  SET kurs_id = p_nytt_kurs_id,
      svart = false,
      kommer = null,
      antall_tl = null,
      arsak_ikke_komme = null,
      er_vertskap = false,
      vertskap_bekreftet = null,
      arsak_ikke_vertskap = null,
      kommentar = null,
      apen_for_annet_kurs = false,
      onsket_kurs_id = null,
      melding_handtert = false,
      svart_dato = null,
      forste_utsending_at = null,
      purring_sendt_at = null,
      trinn3_sendt_at = null,
      paaminnelse_sendt_at = null,
      evaluering_sendt_at = null
  WHERE id = p_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.forbered_evalueringer(p_kurs_id uuid)
 RETURNS TABLE(skole_navn text, hktl_epost text, token text, alt_svart boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Opprett evaluering-rad for skoler på kurset som ikke har en ennå
  INSERT INTO evalueringer (kurs_skole_id)
  SELECT ks.id
  FROM kurs_skole ks
  WHERE ks.kurs_id = p_kurs_id
    AND NOT EXISTS (
      SELECT 1 FROM evalueringer e WHERE e.kurs_skole_id = ks.id
    );

  -- Returner mottakerliste
  RETURN QUERY
  SELECT
    s.navn,
    s.hktl_epost,
    e.token,
    (e.svart_tidspunkt IS NOT NULL) AS alt_svart
  FROM kurs_skole ks
  JOIN evalueringer e ON e.kurs_skole_id = ks.id
  LEFT JOIN skoler s ON ks.skole_id = s.id
  WHERE ks.kurs_id = p_kurs_id
  ORDER BY s.navn;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.foresla_nettverk(ny_kommunenavn text, ny_fylke text)
 RETURNS TABLE(nettverk text, antall_skoler bigint, kilde text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  -- Steg 1: prøv kommune først
  RETURN QUERY
  SELECT s.nettverk, count(*)::bigint AS antall_skoler, 'kommune'::text AS kilde
  FROM skoler s
  WHERE s.nettverk IS NOT NULL
    AND s.kommunenavn = ny_kommunenavn
  GROUP BY s.nettverk
  ORDER BY antall_skoler DESC;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Steg 2: ingen treff i kommune, prøv fylke
  RETURN QUERY
  SELECT s.nettverk, count(*)::bigint AS antall_skoler, 'fylke'::text AS kilde
  FROM skoler s
  WHERE s.nettverk IS NOT NULL
    AND s.fylke = ny_fylke
  GROUP BY s.nettverk
  ORDER BY antall_skoler DESC;

  -- Steg 3: ingen treff i det hele tatt → tom tabell returneres naturlig, ingen egen håndtering nødvendig
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_min_rolle()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  min_rolle text;
BEGIN
  SELECT rolle INTO min_rolle
  FROM profiles
  WHERE id = auth.uid();
  RETURN min_rolle;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_mine_skole_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$ SELECT skole_id FROM bruker_skole WHERE bruker_id = auth.uid(); $function$
;

CREATE OR REPLACE FUNCTION public.get_mine_skoler()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT skole_id FROM bruker_skole WHERE bruker_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_skoleansatte_for_meg()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT bruker_id FROM bruker_skole
  WHERE skole_id IN (
    SELECT skole_id FROM bruker_skole WHERE bruker_id = auth.uid()
  );
END;
$function$
;

-- ------------------------------------------------------------------------
-- FLYTTET HIT 3. sep 2026 (C4): policyen «Skoleadmin ser profiler til skoleansatte» laa
-- opprinnelig i RLS-seksjonen ~150 linjer OVER, men bruker funksjonen get_skoleansatte_for_meg()
-- som defineres rett over her. Jeg flyttet POLICYEN ned (ikke funksjonen opp): funksjonen boer
-- staa sammen med de andre RPC-ene i Functions-seksjonen, ett policy-flytt er mindre inngrep enn
-- aa flytte funksjonsblokken, og funksjonen avhenger selv av get_mine_skole_ids-logikken lenger
-- oppe. I tillegg har policyen DRIFTET: migr 007 lager samme policy med subspoerringen skrevet
-- ut inline; prod (denne dumpen) bruker hjelpefunksjonen. drop + create gjoer at prod-versjonen
-- vinner, saa gjenoppbygd skjema blir IDENTISK med prod. No-op mot prod (dropper og gjenskaper
-- identisk policy).
drop policy if exists "Skoleadmin ser profiler til skoleansatte" on public.profiles;
create policy "Skoleadmin ser profiler til skoleansatte" on public.profiles as permissive for select to public using (((get_min_rolle() = 'skoleadmin'::text) AND (id IN ( SELECT get_skoleansatte_for_meg() AS get_skoleansatte_for_meg))));
-- ------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hent_aktive_pakker()
 RETURNS TABLE(id uuid, navn text, pris integer, beskrivelse text, bilde_url text, rekkefolge integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.navn, p.pris, p.beskrivelse, p.bilde_url, p.rekkefolge
  from eval_pakker p
  join eval_semester s on s.id = p.semester_id
  where s.aktiv = true and p.aktiv = true
  order by p.rekkefolge asc;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_aktive_sporsmal()
 RETURNS TABLE(id uuid, felt text, sporsmal text, skala_lav text, skala_hoy text, rekkefolge integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select q.id, q.felt, q.sporsmal, q.skala_lav, q.skala_hoy, q.rekkefolge
  from eval_sporsmal q
  join eval_semester s on s.id = q.semester_id
  where s.aktiv = true
  order by q.rekkefolge asc;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_aktivt_semester()
 RETURNS TABLE(id uuid, navn text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id, navn from eval_semester where aktiv = true limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_churn_oversikt()
 RETURNS TABLE(totalt_svar bigint, totalt_nei bigint, flagget_antall bigint, skole_navn text, nettverk text, arsak text, kurs_dato date, er_flagget boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH aktive_ord AS (
    SELECT lower(ord) AS ord FROM churn_signalord WHERE aktiv
  ),
  nei_svar AS (
    SELECT
      s.navn AS skole_navn,
      k.nettverk,
      ks.arsak_ikke_komme AS arsak,
      k.dato AS kurs_dato,
      EXISTS (
        SELECT 1 FROM aktive_ord ao
        WHERE ks.arsak_ikke_komme IS NOT NULL
          AND lower(ks.arsak_ikke_komme) LIKE '%' || ao.ord || '%'
      ) AS er_flagget
    FROM kurs_skole ks
    JOIN kurs k ON ks.kurs_id = k.id
    LEFT JOIN skoler s ON ks.skole_id = s.id
    WHERE ks.kommer = false
  )
  SELECT
    (SELECT count(*) FROM kurs_skole WHERE svart = true) AS totalt_svar,
    (SELECT count(*) FROM nei_svar) AS totalt_nei,
    (SELECT count(*) FROM nei_svar WHERE er_flagget) AS flagget_antall,
    ns.skole_navn,
    ns.nettverk,
    ns.arsak,
    ns.kurs_dato,
    ns.er_flagget
  FROM nei_svar ns
  ORDER BY ns.er_flagget DESC, ns.kurs_dato DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_churn_signalord()
 RETURNS TABLE(id uuid, ord text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id, ord from churn_signalord order by ord asc;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_evaluering_via_token(token text)
 RETURNS TABLE(evaluering_id uuid, svart boolean, kurs_navn text, kurs_dato date, skole_navn text, vurd_gjennomforing integer, vurd_info integer, vurd_aktiviteter integer, gullkorn text, kjopsinteresse text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id,
    (e.svart_tidspunkt IS NOT NULL) AS svart,
    k.navn,
    k.dato,
    s.navn,
    e.vurd_gjennomforing,
    e.vurd_info,
    e.vurd_aktiviteter,
    e.gullkorn,
    e.kjopsinteresse
  FROM evalueringer e
  JOIN kurs_skole ks ON e.kurs_skole_id = ks.id
  JOIN kurs k ON ks.kurs_id = k.id
  LEFT JOIN skoler s ON ks.skole_id = s.id
  WHERE e.token = hent_evaluering_via_token.token;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_evalueringer_admin()
 RETURNS TABLE(evaluering_id uuid, kurs_navn text, kurs_dato date, skole_navn text, vurd_gjennomforing integer, vurd_info integer, vurd_aktiviteter integer, gullkorn text, kjopsinteresse text, svart_tidspunkt timestamp with time zone, valgt_pakke_id uuid, valgt_pakke_navn text, valgt_pakke_pris numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id,
    k.navn,
    k.dato,
    s.navn,
    e.vurd_gjennomforing,
    e.vurd_info,
    e.vurd_aktiviteter,
    e.gullkorn,
    e.kjopsinteresse,
    e.svart_tidspunkt,
    e.valgt_pakke_id,
    e.valgt_pakke_navn,
    e.valgt_pakke_pris
  FROM evalueringer e
  JOIN kurs_skole ks ON e.kurs_skole_id = ks.id
  JOIN kurs k ON ks.kurs_id = k.id
  LEFT JOIN skoler s ON ks.skole_id = s.id
  WHERE e.svart_tidspunkt IS NOT NULL
  ORDER BY e.svart_tidspunkt DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_evalueringer_eksport()
 RETURNS TABLE(skole_navn text, kommune text, fylke text, nettverk text, kurs_navn text, kurs_dato date, kurs_uke integer, gjennomforing integer, info integer, aktiviteter integer, gullkorn text, kjopsinteresse text, valgt_pakke text, valgt_pakke_pris integer, svart_tidspunkt timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.navn,
    s.kommunenavn,
    s.fylke,
    s.nettverk,
    k.navn,
    k.dato,
    k.uke,
    e.vurd_gjennomforing,
    e.vurd_info,
    e.vurd_aktiviteter,
    e.gullkorn,
    e.kjopsinteresse,
    e.valgt_pakke_navn,
    e.valgt_pakke_pris,
    e.svart_tidspunkt
  FROM evalueringer e
  JOIN kurs_skole ks ON ks.id = e.kurs_skole_id
  JOIN skoler s ON s.id = ks.skole_id
  JOIN kurs k ON k.id = ks.kurs_id
  WHERE e.svart_tidspunkt IS NOT NULL
  ORDER BY k.dato DESC, s.navn;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_kurs_skole_via_token(token text)
 RETURNS TABLE(id uuid, kurs_id uuid, skole_id uuid, er_vertskap boolean, vertskap_bekreftet boolean, kommer boolean, arsak_ikke_komme text, arsak_ikke_vertskap text, antall_tl integer, antall_kort integer, kort_status text, kommentar text, onsket_kurs_id uuid, svart boolean, svart_dato timestamp with time zone, kurs_navn text, kurs_dato date, kurs_start_tid time without time zone, kurs_slutt_tid time without time zone, skole_navn text, kurs_oppmotetid time without time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update kurs_skole_mottaker m
     set apnet_at = coalesce(m.apnet_at, now())
   where m.lenke_token::text = token;
  return query
  select
    ks.id, ks.kurs_id, ks.skole_id, ks.er_vertskap, ks.vertskap_bekreftet,
    ks.kommer, ks.arsak_ikke_komme, ks.arsak_ikke_vertskap, ks.antall_tl,
    ks.antall_kort, ks.kort_status, ks.kommentar, ks.onsket_kurs_id,
    ks.svart, ks.svart_dato,
    k.navn, k.dato, k.start_tid, k.slutt_tid, s.navn,
    case when ks.er_vertskap then k.oppmote_vertskap else k.oppmote_ovrige end
  from kurs_skole ks
  left join kurs k on k.id = ks.kurs_id
  left join skoler s on s.id = ks.skole_id
  where ks.lenke_token = token
     or ks.id = (select m.kurs_skole_id from kurs_skole_mottaker m
                 where m.lenke_token::text = token limit 1);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_kursinfo_via_token(token text)
 RETURNS TABLE(skole_navn text, kurs_navn text, kurs_dato date, kurs_start_tid time without time zone, kurs_slutt_tid time without time zone, hall_navn text, er_vertskap boolean, kurs_oppmotetid time without time zone, vertskapsnotat text, kursinfo_tekst text, kursinfo_tillegg text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    s.navn,
    k.navn,
    k.dato,
    k.start_tid,
    k.slutt_tid,
    h.navn,
    ks.er_vertskap,
    case when ks.er_vertskap then k.oppmote_vertskap else k.oppmote_ovrige end,
    case when ks.er_vertskap
      then coalesce((select i.verdi from innstillinger i
                     where i.nokkel = 'epost_vertskap_notat'), '')
      else '' end,
    coalesce((select i.verdi from innstillinger i
              where i.nokkel = 'kursinfo_tekst'), ''),
    coalesce(k.kursinfo_tillegg, '')
  from kurs_skole ks
  left join kurs k on k.id = ks.kurs_id
  left join skoler s on s.id = ks.skole_id
  left join haller h on h.id = k.hall_id
  where ks.lenke_token = token
     or ks.id = (select m.kurs_skole_id from kurs_skole_mottaker m
                 where m.lenke_token::text = token limit 1);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.hent_pakker_admin()
 RETURNS TABLE(id uuid, navn text, pris integer, beskrivelse text, bilde_url text, semester_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select p.id, p.navn, p.pris, p.beskrivelse, p.bilde_url, p.semester_id
  from eval_pakker p
  join eval_semester s on s.id = p.semester_id
  where s.aktiv = true
  order by p.pris asc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.kopier_kurs(p_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ny_id uuid;
BEGIN
  INSERT INTO kurs (
    nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong,
    status, maks_antall, merknad, kursholder_id, backup_kursholder_id,
    uke, dag, navn
  )
  SELECT
    nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong,
    'planlagt', maks_antall, merknad, kursholder_id, backup_kursholder_id,
    uke, dag, navn || ' (kopi)'
  FROM kurs
  WHERE id = p_id
  RETURNING id INTO ny_id;

  RETURN ny_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.lagre_evaluering(token text, p_vurd_gjennomforing integer, p_vurd_info integer, p_vurd_aktiviteter integer, p_gullkorn text, p_kjopsinteresse text, p_valgt_pakke_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update evalueringer
  set vurd_gjennomforing = p_vurd_gjennomforing,
      vurd_info = p_vurd_info,
      vurd_aktiviteter = p_vurd_aktiviteter,
      gullkorn = p_gullkorn,
      kjopsinteresse = p_kjopsinteresse,
      valgt_pakke_id = p_valgt_pakke_id,
      valgt_pakke_navn = (select navn from eval_pakker where id = p_valgt_pakke_id),
      valgt_pakke_pris = (select pris from eval_pakker where id = p_valgt_pakke_id),
      svart_tidspunkt = now()
  where evalueringer.token = lagre_evaluering.token;
$function$
;

CREATE OR REPLACE FUNCTION public.lagre_skole_svar(token text, p_kommer boolean, p_antall_tl integer, p_er_vertskap boolean, p_arsak_ikke_komme text, p_arsak_ikke_vertskap text, p_kommentar text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_mottaker_id uuid;
  v_ks_id uuid;
begin
  select m.id, m.kurs_skole_id into v_mottaker_id, v_ks_id
    from kurs_skole_mottaker m where m.lenke_token::text = token limit 1;

  if v_ks_id is null then
    select ks.id into v_ks_id from kurs_skole ks where ks.lenke_token = token;
  end if;

  update kurs_skole
  set kommer = p_kommer,
      antall_tl = p_antall_tl,
      vertskap_bekreftet = p_er_vertskap,
      arsak_ikke_komme = p_arsak_ikke_komme,
      arsak_ikke_vertskap = p_arsak_ikke_vertskap,
      kommentar = p_kommentar,
      svart = true,
      svart_dato = now(),
      svart_av_mottaker_id = coalesce(v_mottaker_id, svart_av_mottaker_id)
  where id = v_ks_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.lagre_skole_svar(token text, p_kommer boolean, p_antall_tl integer, p_er_vertskap boolean, p_arsak_ikke_komme text, p_arsak_ikke_vertskap text, p_kommentar text, p_apen_for_annet_kurs boolean, p_pa_vegne_av boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_mottaker_id uuid;
  v_ks_id uuid;
begin
  select m.id, m.kurs_skole_id into v_mottaker_id, v_ks_id
    from kurs_skole_mottaker m where m.lenke_token::text = token limit 1;
  if v_ks_id is null then
    select ks.id into v_ks_id from kurs_skole ks where ks.lenke_token = token;
  end if;
  update kurs_skole
  set kommer = p_kommer,
      antall_tl = p_antall_tl,
      vertskap_bekreftet = p_er_vertskap,
      arsak_ikke_komme = p_arsak_ikke_komme,
      arsak_ikke_vertskap = p_arsak_ikke_vertskap,
      kommentar = p_kommentar,
      apen_for_annet_kurs = p_apen_for_annet_kurs,
      svart = true,
      svart_dato = now(),
      svart_av_mottaker_id = coalesce(v_mottaker_id, svart_av_mottaker_id),
      svar_registrert_av = case when p_pa_vegne_av then auth.uid() end,
      svar_registrert_at = case when p_pa_vegne_av then now() end
  where id = v_ks_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.legg_til_churn_signalord(nytt_ord text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ny_id uuid;
begin
  insert into churn_signalord (ord)
  values (lower(trim(nytt_ord)))
  returning id into ny_id;
  return ny_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.oppdater_pakke(p_id uuid, p_navn text, p_pris integer, p_beskrivelse text, p_bilde_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update eval_pakker
  set navn = p_navn,
      pris = p_pris,
      beskrivelse = p_beskrivelse,
      bilde_url = p_bilde_url
  where id = p_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.oppdater_sporsmal(p_id uuid, p_sporsmal text, p_skala_lav text, p_skala_hoy text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update eval_sporsmal
  set sporsmal = p_sporsmal,
      skala_lav = p_skala_lav,
      skala_hoy = p_skala_hoy
  where id = p_id;
$function$
;

CREATE OR REPLACE FUNCTION public.opprett_kurs_skole_mottakere(p_kurs_skole_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_skole_id uuid;
  v_epost text;
  v_navn text;
  v_kontakt jsonb;
  v_antall integer := 0;
begin
  select skole_id into v_skole_id from public.kurs_skole where id = p_kurs_skole_id;
  if v_skole_id is null then return 0; end if;

  select nullif(trim(hktl_epost), ''), nullif(trim(hktl_navn), '')
    into v_epost, v_navn
    from public.skoler where id = v_skole_id;

  if v_epost is not null then
    insert into public.kurs_skole_mottaker (kurs_skole_id, rolle, navn, epost)
    values (p_kurs_skole_id, 'htla', v_navn, v_epost)
    on conflict (kurs_skole_id, epost) do nothing;
    v_antall := v_antall + 1;
  end if;

  for v_kontakt in
    select value from jsonb_array_elements(
      coalesce((select tla_kontakter from public.skoler where id = v_skole_id), '[]'::jsonb))
  loop
    v_epost := nullif(trim(v_kontakt->>'epost'), '');
    if v_epost is not null then
      insert into public.kurs_skole_mottaker (kurs_skole_id, rolle, navn, epost)
      values (p_kurs_skole_id, 'tla', nullif(trim(v_kontakt->>'navn'), ''), v_epost)
      on conflict (kurs_skole_id, epost) do nothing;
      v_antall := v_antall + 1;
    end if;
  end loop;

  return v_antall;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sett_kort_status(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE kurs_skole SET kort_status = p_status WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sett_melding_handtert(p_id uuid, p_handtert boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE kurs_skole SET melding_handtert = p_handtert WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.slett_churn_signalord(slett_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  delete from churn_signalord where id = slett_id;
$function$
;

