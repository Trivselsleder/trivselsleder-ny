-- =====================================================================
-- STEG 2: Flere mottakere per svar-rad i kursplanleggeren
-- Kjøres i Supabase SQL editor:
--   https://supabase.com/dashboard/project/zpirjbrcbeubwpmtncxx/sql/new
--
-- Rekkefølge:
--   1) Kjør STEG 1 og se på resultatet (alle skal vise 'uuid').
--   2) Kjør STEG 2 og STEG 3.
--   3) Kjør DEL E og lim resultatet tilbake til Claude.
-- =====================================================================


-- =====================================================================
-- STEG 1 — VERIFISERING (kjør først, se på resultatet)
-- Alle fire radene skal vise data_type = 'uuid'.
-- Hvis noe annet dukker opp: STOPP, og send resultatet til Claude før steg 2.
-- =====================================================================

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'kurs_skole'
  and column_name in ('id','skole_id','kurs_id','lenke_token')
order by column_name;


-- =====================================================================
-- STEG 2 — INNSTILLINGER (terskler som kan endres uten kode)
-- =====================================================================

begin;

create table if not exists public.innstillinger (
  nokkel        text primary key,
  verdi         text        not null,
  beskrivelse   text,
  oppdatert_at  timestamptz not null default now()
);

insert into public.innstillinger (nokkel, verdi, beskrivelse) values
  ('purring_dager', '5',  'Dager uten svar før purring sendes til Hovedkontakt TL (HTLA).'),
  ('trinn3_dager',  '10', 'Dager uten svar før invitasjonen også går til øvrige TL-ansvarlige (TLA).')
on conflict (nokkel) do nothing;

alter table public.innstillinger enable row level security;

drop policy if exists innstillinger_stab on public.innstillinger;
create policy innstillinger_stab on public.innstillinger
  for all to authenticated
  using      (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.rolle in ('superadmin','ansatt')))
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.rolle in ('superadmin','ansatt')));

grant select, insert, update, delete on public.innstillinger to authenticated;
-- anon får bevisst INGEN tilgang: svar-skjemaet trenger ikke tersklene.

commit;


-- =====================================================================
-- STEG 3 — MOTTAKER-TABELL, KLOKKE-KOLONNER, GENERATOR-FUNKSJON, BACKFILL
-- Alt i én transaksjon: skulle en datatype avvike, rulles hele blokken tilbake.
-- =====================================================================

begin;

-- 3a) Én rad per mottaker, alle peker på samme svar-rad (kurs_skole)
create table if not exists public.kurs_skole_mottaker (
  id             uuid        primary key default gen_random_uuid(),
  kurs_skole_id  uuid        not null references public.kurs_skole(id) on delete cascade,
  rolle          text        not null check (rolle in ('htla','tla')),
  navn           text,
  epost          text,
  lenke_token    uuid        not null unique default gen_random_uuid(),
  sendt_at       timestamptz,   -- når denne personen sist fikk e-post (audit)
  apnet_at       timestamptz,   -- når denne personen først åpnet lenken
  opprettet_at   timestamptz not null default now(),
  unique (kurs_skole_id, epost)
);

create index if not exists idx_ksm_kurs_skole on public.kurs_skole_mottaker (kurs_skole_id);
create index if not exists idx_ksm_token      on public.kurs_skole_mottaker (lenke_token);

alter table public.kurs_skole_mottaker enable row level security;

drop policy if exists ksm_stab on public.kurs_skole_mottaker;
create policy ksm_stab on public.kurs_skole_mottaker
  for all to authenticated
  using      (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.rolle in ('superadmin','ansatt')))
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.rolle in ('superadmin','ansatt')));

grant select, insert, update, delete on public.kurs_skole_mottaker to authenticated;
-- anon får bevisst INGEN direkte tilgang. Skjemaet når raden via en
-- SECURITY DEFINER-funksjon (neste runde), så tokens kan ikke ramses opp.

-- 3b) Klokke + status på svar-raden
alter table public.kurs_skole
  add column if not exists forste_utsending_at  timestamptz,
  add column if not exists purring_sendt_at      timestamptz,
  add column if not exists trinn3_sendt_at        timestamptz,
  add column if not exists svart_av_mottaker_id   uuid
      references public.kurs_skole_mottaker(id) on delete set null;

-- 3c) Generator: bygg mottaker-rader for én svar-rad (idempotent).
--     HTLA gjenbruker svar-radens eksisterende lenke_token, slik at
--     lenker som allerede er delt fortsatt virker. TLA hentes fra
--     skoler.tla_kontakter (JSONB) og får hver sin nye token.
create or replace function public.opprett_kurs_skole_mottakere(p_kurs_skole_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skole_id   uuid;
  v_ks_token   uuid;
  v_hktl_epost text;
  v_hktl_navn  text;
  v_kontakt    jsonb;
  v_epost      text;
  v_ny         integer := 0;
begin
  select ks.skole_id, ks.lenke_token
    into v_skole_id, v_ks_token
    from public.kurs_skole ks
   where ks.id = p_kurs_skole_id;

  if v_skole_id is null then
    raise exception 'Fant ingen svar-rad (kurs_skole) med id %', p_kurs_skole_id;
  end if;

  -- Hovedkontakt TL (HTLA)
  select coalesce(hktl_epost, htla_epost, rektor_epost), hktl_navn
    into v_hktl_epost, v_hktl_navn
    from public.skoler where id = v_skole_id;

  if v_hktl_epost is not null
     and not exists (select 1 from public.kurs_skole_mottaker m
                     where m.kurs_skole_id = p_kurs_skole_id and m.rolle = 'htla') then
    insert into public.kurs_skole_mottaker (kurs_skole_id, rolle, navn, epost, lenke_token)
    values (p_kurs_skole_id, 'htla', v_hktl_navn, v_hktl_epost,
            coalesce(v_ks_token, gen_random_uuid()));
    v_ny := v_ny + 1;
  end if;

  -- Øvrige TL-ansvarlige (TLA) fra skoler.tla_kontakter
  for v_kontakt in
    select value
      from jsonb_array_elements(
             coalesce((select tla_kontakter from public.skoler where id = v_skole_id),
                      '[]'::jsonb))
  loop
    v_epost := nullif(trim(v_kontakt->>'epost'), '');
    if v_epost is not null
       and not exists (select 1 from public.kurs_skole_mottaker m
                       where m.kurs_skole_id = p_kurs_skole_id
                         and lower(m.epost) = lower(v_epost)) then
      insert into public.kurs_skole_mottaker (kurs_skole_id, rolle, navn, epost)
      values (p_kurs_skole_id, 'tla', nullif(trim(v_kontakt->>'navn'), ''), v_epost);
      v_ny := v_ny + 1;
    end if;
  end loop;

  return v_ny;
end;
$$;

revoke all on function public.opprett_kurs_skole_mottakere(uuid) from public;
grant execute on function public.opprett_kurs_skole_mottakere(uuid) to authenticated;
-- anon skal ikke kunne generere mottakere.

-- 3d) Backfill: lag mottaker-rader for alle eksisterende svar-rader
select public.opprett_kurs_skole_mottakere(id) from public.kurs_skole;

commit;


-- =====================================================================
-- DEL E — LESING (endrer ingenting). Kjør, og lim resultatet til Claude.
-- Trengs for å skrive de to gjenstående funksjonene korrekt neste runde.
-- =====================================================================

-- Navn på de to fremmednøklene til kurs (vi skal alltid bruke kurs_skole_kurs_id_fkey):
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.kurs_skole'::regclass and contype = 'f';

-- Kolonner i kurs:
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'kurs'
order by ordinal_position;

-- Definisjonene av de to funksjonene som skal utvides:
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('hent_kurs_skole_via_token','lagre_skole_svar');
