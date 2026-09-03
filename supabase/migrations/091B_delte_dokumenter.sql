-- 091B_delte_dokumenter.sql
-- ============================================================================
-- ETAPPE 5 (FASE 3): DELTE DOKUMENTER (idé B — data + constraint)
-- ============================================================================
-- HVA: gjør `ressurs_dokument` til ENESTE sannhet for koblingen lek↔dokument.
--      (1) ny koblingstabell `ressurs_dokument` (mange-til-mange);
--      (2) DATA-STEG: flytt hver eksisterende `dokumenter.ressurs_id`-kobling
--          over som en `ressurs_dokument`-rad, deretter nullstill `ressurs_id`;
--      (3) CONSTRAINT: `dokumenter.ressurs_id` FK endres fra ON DELETE CASCADE
--          til ON DELETE SET NULL — så et gjenglemt cascade aldri kan rive et
--          delt dokument vekk fra de andre lekene.
--
-- RISIKOKLASSE: ANNEN enn 091. 091 la til tomme kolonner (kunne ikke ødelegge
--      noe). 091B FLYTTER DATA og ENDRER en FK-regel. Derfor: hvert steg er
--      etterprøvbart, og data-steget teller det det gjør (kvittering + guard
--      som ruller ALT tilbake ved avvik).
--
-- KILDE (fasit): claude_091-SPESIFIKASJON-2sep.md, seksjonen
--      «091B (anbefalt egen fil) — delte dokumenter (idé B, data + constraint)».
--
-- FORSJEKK (lest i basen i dag):
--   * `dokumenter` (migr 026): `ressurs_id uuid references ressurser(id) ON DELETE
--     CASCADE` (inline, auto-navn dokumenter_ressurs_id_fkey). ressurs_id er
--     nullable. Ingen senere migrasjon har endret FK-en (091 la kun til kolonner).
--   * Mønster `ressurs_*` (025/030): komposit-PK, begge FK on delete cascade,
--     indeks på «den andre» kolonnen; RLS p_les = fase3_ressurs_synlig(ressurs_id),
--     p_skriv = fase3_intern(); GRANT to authenticated, service_role.
--   * TESTDATA (migr 031) — TALLKORREKSJON fra kontrolløren bekreftet: kun ETT
--     testdokument har ressurs_id («Tallkort til utskrift»); «Turneringsskjema» er
--     frittstående. Forventet kvittering i dag = 1 (leses ut av basen, ikke hardkodet).
--
-- EGENSKAPER: ÉN transaksjon · additive deler idempotente (if not exists /
--      drop+create policy / on conflict do nothing / dynamisk FK-bytte) · data-steget
--      er selv-idempotent (etter kjøring finnes ingen ressurs_id igjen å flytte).
-- MØNSTER: følger 090/091 som formmal.
-- NB: kontrollrunde (uavhengig verifikasjon) skrives IKKE her — den er kontrollørens
--      (regel 4). Kvitteringsblokken under er data-stegets EGEN telling (oppdragets
--      krav «data-steget skal telle det det gjør»), ikke en kontrollrunde.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) NY KOBLINGSTABELL: ressurs_dokument  (ENESTE sannhet lek↔dokument)
-- ----------------------------------------------------------------------------
-- Speiler ressurs_* (025) og samling_ressurs (029): komposit-PK, begge FK cascade,
-- indeks på dokument_id («hvilke leker bruker dette dokumentet»).
create table if not exists ressurs_dokument (
  ressurs_id  uuid     not null references ressurser(id)  on delete cascade,
  dokument_id uuid     not null references dokumenter(id) on delete cascade,
  rekkefolge  smallint,
  primary key (ressurs_id, dokument_id)
);
create index if not exists idx_ressurs_dokument_dokument on ressurs_dokument (dokument_id);

-- Rettigheter + RLS (samme form som de øvrige ressurs_*-koblingene i migr 030).
grant select, insert, update, delete on ressurs_dokument to authenticated, service_role;

alter table ressurs_dokument enable row level security;

drop policy if exists p_les on ressurs_dokument;
create policy p_les on ressurs_dokument
  for select to authenticated
  using (fase3_ressurs_synlig(ressurs_id));

drop policy if exists p_skriv on ressurs_dokument;
create policy p_skriv on ressurs_dokument
  for all to authenticated
  using (fase3_intern())
  with check (fase3_intern());

-- ----------------------------------------------------------------------------
-- 2) DATA-STEG: flytt eksisterende koblinger, så nullstill. Med kvittering + guard.
-- ----------------------------------------------------------------------------
-- Rekkefølge (ingen kobling skal tapes):
--   a) tell dokumenter med ressurs_id FØR;
--   b) FLYTT: én ressurs_dokument-rad per (ressurs_id, dokument_id);
--   c) NULLSTILL alle dokumenter.ressurs_id;
--   d) KVITTERING (RAISE NOTICE viser begge tallene) + GUARD som ruller tilbake
--      hele transaksjonen dersom noe ikke ble flyttet.
-- Selv-idempotent: etter kjøring er alle ressurs_id NULL, så en ny kjøring
-- flytter 0 rader (guard 0=0), og INSERT er dessuten on conflict do nothing.
do $$
declare
  v_foer    integer;
  v_flyttet integer;
  v_etter   integer;
  v_rest    integer;
begin
  select count(*) into v_foer from dokumenter where ressurs_id is not null;

  insert into ressurs_dokument (ressurs_id, dokument_id, rekkefolge)
  select ressurs_id, id, null
  from dokumenter
  where ressurs_id is not null
  on conflict (ressurs_id, dokument_id) do nothing;
  get diagnostics v_flyttet = row_count;

  -- NULLSTILL bare det som FAKTISK ble flyttet (matcher en ressurs_dokument-rad).
  -- En rad som fikk ressurs_id fra en SAMTIDIG okt ETTER FLYTT-en har ingen slik
  -- match og nulles derfor IKKE -- koblingen bevares (retting C1, kontroll 3. sep).
  update dokumenter d set ressurs_id = null
  from ressurs_dokument rd
  where rd.dokument_id = d.id and rd.ressurs_id = d.ressurs_id;

  select count(*) into v_etter from ressurs_dokument;
  select count(*) into v_rest  from dokumenter where ressurs_id is not null;

  raise notice '091B KVITTERING: dokumenter med ressurs_id FOER = %, flyttet = %, ressurs_dokument-rader ETTER = %, dokumenter med ressurs_id igjen = %',
    v_foer, v_flyttet, v_etter, v_rest;

  if v_flyttet <> v_foer then
    raise exception '091B STOPP: flyttet (%) er ulik antall dokumenter med ressurs_id foer (%). Ingen kobling skal tapes -- alt rulles tilbake.',
      v_flyttet, v_foer;
  end if;

  -- Tredje guard (C1): etter nullstilling skal INGEN dokumenter ha ressurs_id igjen.
  -- Har en samtidig okt lagt inn en kobling i vinduet, staar den igjen her (> 0),
  -- og hele transaksjonen rulles tilbake -- da bevares den samtidige koblingen.
  if v_rest <> 0 then
    raise exception '091B STOPP: % dokument(er) har fortsatt ressurs_id etter nullstilling (samtidig skriver?). Alt rulles tilbake.',
      v_rest;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) CONSTRAINT: dokumenter.ressurs_id  ON DELETE CASCADE -> ON DELETE SET NULL
-- ----------------------------------------------------------------------------
-- Slett den eksisterende (auto-navngitte) FK-en dynamisk, uansett navn, og legg
-- den tilbake med set null. Idempotent: ved ny kjøring finnes set null-FK-en,
-- den slettes og legges tilbake identisk.
do $$
declare
  v_cname text;
begin
  select con.conname into v_cname
  from pg_constraint con
  where con.conrelid = 'public.dokumenter'::regclass
    and con.contype  = 'f'
    and con.confrelid = 'public.ressurser'::regclass
    and con.conkey = array[(
      select a.attnum from pg_attribute a
      where a.attrelid = 'public.dokumenter'::regclass
        and a.attname = 'ressurs_id'
        and not a.attisdropped
    )];
  if v_cname is not null then
    execute format('alter table public.dokumenter drop constraint %I', v_cname);
  end if;
end $$;

alter table dokumenter
  add constraint dokumenter_ressurs_id_fkey
  foreign key (ressurs_id) references ressurser(id) on delete set null;

commit;

-- ----------------------------------------------------------------------------
-- KVITTERING (retting C3, kontroll 3. sep): returner tallene som en SYNLIG rad.
-- RAISE NOTICE vises ikke alltid i Supabase-editoren; denne SELECT-en gjor det.
-- Forvent i dag: rd_rader = 1, dok_med_ressurs_id = 0.
-- ----------------------------------------------------------------------------
select (select count(*) from ressurs_dokument)                       as rd_rader,
       (select count(*) from dokumenter where ressurs_id is not null) as dok_med_ressurs_id;
