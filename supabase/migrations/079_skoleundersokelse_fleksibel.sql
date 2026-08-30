-- 079_skoleundersokelse_fleksibel.sql
-- MODUL «Spørreundersøkelse til skolene» — datamodell-utvidelse over 077/078:
-- gjør spørsmålene FLEKSIBLE. Et spørsmålssett eies nå av en «undersøkelse»
-- (mal/variant), ikke lenger globalt. En runde kjører én undersøkelse. Det
-- eksisterende v1-settet blir «Standardundersøkelse (v1)» (er_mal=true), og man
-- kan lage nye undersøkelser ved å DYP-kopiere en mal.
--
-- IKKE editor-UI (det er 1b), IKKE utsending/skjema/resultater. Bevarer ALT som
-- virker i 077/078 — rører ikke svar-/mottaker-mekanikken utover å la en runde
-- peke på en undersøkelse.
--
-- IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent der mulig (IF NOT EXISTS + guardede
-- backfills + create-or-replace).
--
-- ── STEG 0-funn vi bygger på (verifisert i faktisk kode 30. aug 2026) ────────
-- * skoleus_sporsmal (077): id, rekkefolge, blokk(check rolle/effekt/drift/plattform/aapent),
--   type(check matrise/enkeltvalg/fritekst), sporsmaltekst, skala_min, skala_max,
--   tillat_ikke_aktuelt, betinget_vis(jsonb, ubrukt), opprettet_at + 2 check-constraints.
--   INGEN kobling til undersøkelse/runde i dag.
-- * skoleus_matriserad (077): id, sporsmal_id → skoleus_sporsmal(id) ON DELETE CASCADE,
--   rekkefolge, radtekst, tillat_ikke_aktuelt. Eierskap ARVES via sporsmal_id — ingen egen
--   FK mot undersøkelse trengs.
-- * v1 seedet i 077 i én do-blokk, guardet «if (select count(*) from skoleus_sporsmal)=0»:
--   11 spørsmål (rolle 1, effekt 1+5 rader, drift 5, plattform 1+7 rader, aapent 3),
--   12 matriserader. Ingen undersokelse_id.
-- * skoleus_runder (077): id, navn, status(utkast/aktiv/lukket), maalgruppe, opprettet_at,
--   lukket_at. Ingen undersøkelse-kobling.
-- * FK-er fra 078/077 som IKKE røres: skoleus_mottaker.runde_id → skoleus_runder(id)
--   ON DELETE CASCADE (078); skoleus_svar.runde_id → skoleus_runder(id) ON DELETE CASCADE
--   (077). Å legge en NY kolonne undersokelse_id på skoleus_runder rører ingen av disse.
-- * Neste ledige migrasjonsnr = 079 (siste på disk: 078). Bekreftet.
--
-- ── VIKTIG FRONTEND-KONSEKVENS (dokumentert, se leveransenotat) ──────────────
-- Denne migrasjonen gjør skoleus_runder.undersokelse_id NOT NULL («nye runder MÅ ha en
-- undersøkelse»). Del-B-adminflaten («Opprett runde», AdminSkoleundersokelse.jsx) setter
-- IKKE undersokelse_id i dag → den insert-en må oppdateres (velg/opprett undersøkelse) FØR
-- den virker etter at 079 er kjørt. Det er 1b-arbeid (editor-UI) og ligger UTENFOR dette
-- oppdraget. Ingenting i drift brytes nå (079 er ikke kjørt/pushet).

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Tabell skoleus_undersokelse — en «undersøkelse» (mal eller variant) eier et
--    spørsmålssett. RLS speiler 077 (ansatt/superadmin + service_role, anon revoked).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.skoleus_undersokelse (
  id           uuid primary key default gen_random_uuid(),
  navn         text not null,
  beskrivelse  text,
  er_mal       boolean not null default false,
  opprettet_at timestamptz not null default now(),
  opprettet_av uuid references public.profiles(id) on delete set null
);
comment on table public.skoleus_undersokelse is
  'En undersøkelse (mal eller variant). Eier et spørsmålssett (skoleus_sporsmal.undersokelse_id). En runde kjører én undersøkelse.';
comment on column public.skoleus_undersokelse.er_mal is
  'true = gjenbrukbar mal (f.eks. standardsettet). Kopier lager varianter med er_mal=false.';

alter table public.skoleus_undersokelse enable row level security;

drop policy if exists skoleus_undersokelse_ansatt on public.skoleus_undersokelse;
create policy skoleus_undersokelse_ansatt on public.skoleus_undersokelse
  for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

grant select, insert, update, delete on public.skoleus_undersokelse to authenticated, service_role;
revoke all on public.skoleus_undersokelse from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) «Standardundersøkelse (v1)» (er_mal=true) — eieren av dagens v1-sett.
--    Guardet på navn så den bare opprettes én gang (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.skoleus_undersokelse (navn, beskrivelse, er_mal)
select 'Standardundersøkelse (v1)',
       'Det låste v1-spørsmålssettet fra migrasjon 077. Brukes som mal for nye undersøkelser.',
       true
where not exists (
  select 1 from public.skoleus_undersokelse where navn = 'Standardundersøkelse (v1)'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Knytt spørsmål til undersøkelse: undersokelse_id på skoleus_sporsmal.
--    Rekkefølge: legg kolonnen (nullable) → backfill ALLE eierløse til standardmalen
--    → sett NOT NULL. Da blir INGEN spørsmål eierløse, og nye spørsmål MÅ ha eier.
--    ON DELETE CASCADE: en undersøkelse eier spørsmålene sine (samme eierskaps-cascade
--    som matriserad→sporsmal). Sletting av en undersøkelse i bruk hindres uansett av
--    runde-FK-en (punkt 4, NO ACTION), så et kjørt sett kan ikke slettes ved uhell.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.skoleus_sporsmal
  add column if not exists undersokelse_id uuid
  references public.skoleus_undersokelse(id) on delete cascade;

update public.skoleus_sporsmal
   set undersokelse_id = (
     select id from public.skoleus_undersokelse
      where navn = 'Standardundersøkelse (v1)' limit 1
   )
 where undersokelse_id is null;

alter table public.skoleus_sporsmal
  alter column undersokelse_id set not null;

create index if not exists skoleus_sporsmal_undersokelse_idx
  on public.skoleus_sporsmal (undersokelse_id, rekkefolge);

-- MERK: skoleus_matriserad trenger INGEN egen undersokelse_id — den arver eierskapet
-- via sporsmal_id → skoleus_sporsmal (ON DELETE CASCADE fra 077). Bekreftet i STEG 0.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Knytt runde til undersøkelse: undersokelse_id på skoleus_runder.
--    Samme rekkefølge (nullable → backfill → NOT NULL). Eksisterende runder (om noen)
--    settes til standardundersøkelsen; nye runder MÅ ha en undersøkelse.
--    Ingen ON DELETE (NO ACTION): en undersøkelse som er brukt av en runde kan ikke
--    slettes «bakveien» — det verner runde/svar/mottaker-dataene.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.skoleus_runder
  add column if not exists undersokelse_id uuid
  references public.skoleus_undersokelse(id);

update public.skoleus_runder
   set undersokelse_id = (
     select id from public.skoleus_undersokelse
      where navn = 'Standardundersøkelse (v1)' limit 1
   )
 where undersokelse_id is null;

alter table public.skoleus_runder
  alter column undersokelse_id set not null;

create index if not exists skoleus_runder_undersokelse_idx
  on public.skoleus_runder (undersokelse_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Kopier-funksjon: skoleus_kopier_undersokelse(p_kilde, p_navn) → ny undersøkelse-id.
--    «Lag ny undersøkelse fra mal»-motoren: lager en NY skoleus_undersokelse (er_mal=false)
--    og DYP-kopierer alle spørsmål + matriserader fra kilden — ny undersokelse_id, men
--    bevart rekkefolge/blokk/type/skala/tillat_ikke_aktuelt/betinget_vis. Matriserader
--    kobles til de NYE spørsmåls-id-ene. Returnerer den nye undersøkelse-id-en.
--    En «tom» undersøkelse lages ellers med en vanlig INSERT uten spørsmål (editoren i 1b).
--    SECURITY DEFINER; GRANT: authenticated + service_role, anon revoked.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.skoleus_kopier_undersokelse(p_kilde uuid, p_navn text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ny     uuid;
  r_sp     record;
  v_ny_sp  uuid;
begin
  if p_kilde is null then
    raise exception 'Mangler kilde-id';
  end if;
  if coalesce(btrim(p_navn), '') = '' then
    raise exception 'Mangler navn på den nye undersøkelsen';
  end if;
  if not exists (select 1 from public.skoleus_undersokelse where id = p_kilde) then
    raise exception 'Ukjent kilde-undersøkelse: %', p_kilde using errcode = 'P0002';
  end if;

  -- Ny undersøkelse (alltid variant, ikke mal). opprettet_av = den innloggede (NULL ved service_role).
  insert into public.skoleus_undersokelse (navn, beskrivelse, er_mal, opprettet_av)
  values (
    btrim(p_navn),
    (select beskrivelse from public.skoleus_undersokelse where id = p_kilde),
    false,
    auth.uid()
  )
  returning id into v_ny;

  -- Dyp-kopi: hvert spørsmål → nytt spørsmål under v_ny; deretter dets matriserader.
  for r_sp in
    select * from public.skoleus_sporsmal
     where undersokelse_id = p_kilde
     order by rekkefolge
  loop
    insert into public.skoleus_sporsmal
      (undersokelse_id, rekkefolge, blokk, type, sporsmaltekst,
       skala_min, skala_max, tillat_ikke_aktuelt, betinget_vis)
    values
      (v_ny, r_sp.rekkefolge, r_sp.blokk, r_sp.type, r_sp.sporsmaltekst,
       r_sp.skala_min, r_sp.skala_max, r_sp.tillat_ikke_aktuelt, r_sp.betinget_vis)
    returning id into v_ny_sp;

    insert into public.skoleus_matriserad
      (sporsmal_id, rekkefolge, radtekst, tillat_ikke_aktuelt)
    select v_ny_sp, mr.rekkefolge, mr.radtekst, mr.tillat_ikke_aktuelt
      from public.skoleus_matriserad mr
     where mr.sporsmal_id = r_sp.id
     order by mr.rekkefolge;
  end loop;

  return v_ny;
end;
$function$;

revoke all on function public.skoleus_kopier_undersokelse(uuid, text) from public;
grant execute on function public.skoleus_kopier_undersokelse(uuid, text) to authenticated, service_role;

commit;
