-- 078_skoleundersokelse_mottaker.sql
-- MODUL «Spørreundersøkelse til skolene» — byggetrinn 2, del A: MOTTAKER-FUNDAMENTET.
--
-- Speiler kursplanleggerens mottaker-/generator-mønster (kurs_skole_mottaker +
-- opprett_kurs_skole_mottakere, migr 019). Bygger KUN nye skoleus_-objekter og
-- fullfører FK-en på eksisterende skoleus_svar (fra 077). Rører ALDRI kurs-eval-,
-- TU- (tu_*) eller Resend- (nyhetsbrev_*) tabeller.
--
-- IKKE UI, IKKE utsending, IKKE svar-skjema — de kommer i del B/C/D.
-- IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent (IF NOT EXISTS + guardet ALTER).
--
-- ── STEG 0-funn vi speiler (verifisert i faktisk kode 30. aug 2026) ──────────
-- * kurs_skole_mottaker (019): id uuid pk, kurs_skole_id, rolle text (CHECK htla/tla),
--   navn text, epost text NOT NULL, lenke_token uuid NOT NULL default gen_random_uuid(),
--   sendt_at, apnet_at, opprettet_at NOT NULL default now(). UNIQUE(kurs_skole_id,epost),
--   UNIQUE(lenke_token) (idx_mottaker_token), idx på kurs_skole_id. RLS på.
-- * opprett_kurs_skole_mottakere(uuid) (019): SECURITY DEFINER. Henter hovedkontakt
--   fra skoler.hktl_epost/hktl_navn (KUN hktl — INGEN fallback i selve RPC-en), legger
--   htla-rad; deretter én tla-rad per tla_kontakter-jsonb. ON CONFLICT(kurs_skole_id,epost)
--   DO NOTHING. Ingen intern rollesjekk; ingen eksplisitt GRANT (default PUBLIC execute);
--   kalles av service_role fra send-invitasjon.js.
--   MERK (dokumentert avvik, ikke blokkerende): hktl→htla→rektor-fallbacken ligger IKKE i
--   RPC-en, men i src/lib/mottaker.js (finnMottaker) og brukes ved SENDING. Oppdraget ber
--   eksplisitt om fallbacken i skoleus-generatoren — vi bakes den derfor INN i RPC-en her
--   (en forbedring over kurs), med kilden lagret i mottaker.rolle (jf. kildeEtikett).
-- * skoler-felt (019, verifisert eksakt): type text (skoletype), hktl_navn, hktl_epost,
--   htla_navn, htla_epost, rektor_navn, rektor_epost, tla_kontakter jsonb. Alle finnes.
-- * skoleus_svar.mottaker_id uuid finnes (077) men UTEN FK. skoleus_runder.maalgruppe text
--   (skoletype-filter, NULL = alle) finnes (077).
-- * Neste ledige migrasjonsnr = 078 (076, 077 er siste). Bekreftet.
-- * PG 16.13 (077-kontroll) → NULLS NOT DISTINCT støttes (PG ≥ 15).

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Tabell skoleus_mottaker — speiler kurs_skole_mottaker
--    Én hovedkontakt per skole per runde (IKKE tla-vifte som kurs — undersøkelsen
--    går til skolens hovedkontakt). Token per rad, ugjettbar (uuid).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.skoleus_mottaker (
  id                uuid primary key default gen_random_uuid(),
  runde_id          uuid not null references public.skoleus_runder(id) on delete cascade,
  skole_id          uuid not null references public.skoler(id)         on delete cascade,
  rolle             text,                     -- fallback-kilde: 'hktl' | 'htla' | 'rektor' (jf. mottaker.js kildeEtikett)
  navn              text,
  epost             text,                     -- alltid satt av generatoren (skoler uten e-post hoppes over)
  lenke_token       uuid not null default gen_random_uuid(),
  sendt_at          timestamptz,
  apnet_at          timestamptz,
  svart_at          timestamptz,              -- speiler kurs_skole.svart (settes ved innsending i del D)
  purring_sendt_at  timestamptz,
  opprettet_at      timestamptz not null default now(),
  -- Én hovedkontakt per skole per runde → gir ON CONFLICT-mål for idempotent generering.
  constraint skoleus_mottaker_runde_skole_key unique (runde_id, skole_id),
  -- Token er nøkkelen i den personlige lenka → må være unik (som idx_mottaker_token i kurs).
  constraint skoleus_mottaker_token_key unique (lenke_token)
);
comment on table public.skoleus_mottaker is
  'Token-mottakere for skoleundersøkelsen (én hovedkontakt per skole per runde). Speiler kurs_skole_mottaker.';
comment on column public.skoleus_mottaker.rolle is
  'Fallback-kilde for adressen: hktl | htla | rektor (speiler kildeEtikett i src/lib/mottaker.js).';
comment on column public.skoleus_mottaker.lenke_token is
  'Hemmeligheten i den personlige svarlenka. Token-oppslag for anon skjer via SECURITY DEFINER i del D.';

create index if not exists skoleus_mottaker_runde_idx
  on public.skoleus_mottaker (runde_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Fullfør FK: skoleus_svar.mottaker_id → skoleus_mottaker(id)
--    Speiler kurs_skole.svart_av_mottaker_id → kurs_skole_mottaker(id): ingen ON DELETE
--    (NO ACTION), så et svar aldri kan referere en mottaker som er borte, men et innsendt
--    svar heller aldri slettes «bakveien». (Sletting av en runde tar begge via runde_id-cascade.)
--    Idempotent: legges kun hvis den ikke finnes.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skoleus_svar_mottaker_id_fkey'
  ) then
    alter table public.skoleus_svar
      add constraint skoleus_svar_mottaker_id_fkey
      foreign key (mottaker_id) references public.skoleus_mottaker(id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Unik nøkkel på skoleus_svar for upsert (Fables obs. 2 fra 077-kontrollen).
--    UNIQUE NULLS NOT DISTINCT (mottaker_id, sporsmal_id, matriserad_id):
--    - matrise-svar: (mottaker, spørsmål, rad) unikt.
--    - ikke-matrise-svar: matriserad_id = NULL → NULLS NOT DISTINCT gjør at (mottaker,
--      spørsmål, NULL) også er unikt, så et enkeltvalg/fritekst-svar ikke kan dubleres.
--    Krever PG ≥ 15; klyngen er 16.13 (077-kontroll). Idempotent.
--    MERK for Fable: nøkkelen forutsetter at token-innsending (del D) alltid setter
--    mottaker_id. «På vegne»-svar (kun bruker_id, mottaker_id = NULL) samles da under
--    én NULL-mottaker — håndteres i del D (utenfor dette oppdraget).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skoleus_svar_unik_svar'
  ) then
    alter table public.skoleus_svar
      add constraint skoleus_svar_unik_svar
      unique nulls not distinct (mottaker_id, sporsmal_id, matriserad_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS — speiler 077 (og kurs-eval): kun ansatte/superadmin på rå tabell.
--    Anon har INGEN tilgang (token-oppslag kommer via SECURITY DEFINER i del D).
--    service_role forbigår RLS, men får eksplisitt GRANT (063/077-mønster).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.skoleus_mottaker enable row level security;

drop policy if exists skoleus_mottaker_ansatt on public.skoleus_mottaker;
create policy skoleus_mottaker_ansatt on public.skoleus_mottaker
  for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

grant select, insert, update, delete on public.skoleus_mottaker to authenticated, service_role;
revoke all on public.skoleus_mottaker from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Generator-RPC skoleus_opprett_mottakere(p_runde) — speiler opprett_kurs_skole_mottakere.
--    * Finner skolene i målgruppen: maalgruppe IS NULL (alle) ELLER skoler.type = maalgruppe.
--    * Hovedkontakt med fallback hktl→htla→rektor (jf. src/lib/mottaker.js finnMottaker).
--      Skoler uten NOEN gyldig e-post hoppes over og telles.
--    * Én rad per skole, idempotent: ON CONFLICT (runde_id, skole_id) DO NOTHING → ny
--      generering dubler ikke. Ny lenke_token per rad (kolonne-default).
--    * SECURITY DEFINER. INGEN intern get_min_rolle-vakt (ville brutt service_role-kall,
--      slik send-invitasjon.js kaller kurs-generatoren). Beskyttes av GRANT: authenticated
--      + service_role, anon REVOKED (strammere enn kurs-RPC-en, som er PUBLIC-kjørbar).
--    Returnerer (opprettet, hoppet_over).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.skoleus_opprett_mottakere(p_runde uuid)
returns table(opprettet integer, hoppet_over integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_maalgruppe text;
  v_funnet     boolean;
  v_opprettet  integer := 0;
  v_hoppet     integer := 0;
  v_ins        integer;
  r            record;
  v_epost      text;
  v_navn       text;
  v_kilde      text;
begin
  -- Runden må finnes (henter samtidig skoletype-filteret).
  select true, sr.maalgruppe into v_funnet, v_maalgruppe
    from public.skoleus_runder sr where sr.id = p_runde;
  if v_funnet is null then
    raise exception 'Ukjent runde: %', p_runde using errcode = 'P0002';
  end if;

  -- Skolene i målgruppen. NULL maalgruppe = alle skoletyper.
  for r in
    select s.id, s.hktl_navn, s.hktl_epost, s.htla_navn, s.htla_epost, s.rektor_navn, s.rektor_epost
      from public.skoler s
     where v_maalgruppe is null or s.type = v_maalgruppe
  loop
    -- Fallback-kjede hktl → htla → rektor (speiler finnMottaker i src/lib/mottaker.js).
    if nullif(trim(r.hktl_epost), '') is not null then
      v_epost := trim(r.hktl_epost);  v_navn := nullif(trim(r.hktl_navn), '');   v_kilde := 'hktl';
    elsif nullif(trim(r.htla_epost), '') is not null then
      v_epost := trim(r.htla_epost);  v_navn := nullif(trim(r.htla_navn), '');   v_kilde := 'htla';
    elsif nullif(trim(r.rektor_epost), '') is not null then
      v_epost := trim(r.rektor_epost); v_navn := nullif(trim(r.rektor_navn), ''); v_kilde := 'rektor';
    else
      v_epost := null;
    end if;

    -- Skole uten noen gyldig e-post: hopp over (telles), lag ingen rad.
    if v_epost is null then
      v_hoppet := v_hoppet + 1;
      continue;
    end if;

    -- Idempotent innsetting. lenke_token settes av kolonne-default (ny uuid per rad).
    insert into public.skoleus_mottaker (runde_id, skole_id, rolle, navn, epost)
    values (p_runde, r.id, v_kilde, v_navn, v_epost)
    on conflict (runde_id, skole_id) do nothing;

    get diagnostics v_ins = row_count;   -- 0 ved konflikt (finnes fra før) → teller ikke dobbelt
    v_opprettet := v_opprettet + v_ins;
  end loop;

  return query select v_opprettet, v_hoppet;
end;
$function$;

-- GRANT-vakt: kun innlogget/tjener, aldri anon (anon-oppslag går via SECURITY DEFINER i del D).
revoke all on function public.skoleus_opprett_mottakere(uuid) from public;
grant execute on function public.skoleus_opprett_mottakere(uuid) to authenticated, service_role;

commit;
