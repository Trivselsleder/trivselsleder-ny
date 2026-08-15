-- 039_webinar_modul.sql
-- Webinar-modulen (v1, alternativ B): tabeller + RLS/GRANT + offentlig RPC-lag.
-- Beslutninger 15. aug: intern=lukket/lav terskel, ekstern=åpen m/ e-postbekreftelse,
-- samle + sende. Opptak/referat-tabellene opprettes nå (schema komplett), men
-- opplasting/sletting/AI-referat bygges først etter lansering.
--
-- RLS-prinsipp (husregel): GRANT til anon + authenticated + service_role;
-- anonym tilgang KUN via SECURITY DEFINER-RPC, aldri rå tabelltilgang.

-- ── Hjelpere ────────────────────────────────────────────────────────────────
create or replace function public.er_ansatt()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rolle in ('ansatt', 'superadmin')
  );
$$;

create or replace function public.tilknyttet_skole(p_skole_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bruker_skole bs
    where bs.bruker_id = auth.uid() and bs.skole_id = p_skole_id and bs.aktiv = true
  );
$$;

-- ── Tabeller ────────────────────────────────────────────────────────────────
create table if not exists public.webinarer (
  id            uuid primary key default gen_random_uuid(),
  tittel        text not null,
  beskrivelse   text,
  tittel_sv     text,               -- flerspråk fra start (10.8), tom nå
  beskrivelse_sv text,
  type          text not null default 'nettverksmote'
                  check (type in ('nettverksmote','ra_webinar','intro_ekstern','opplaering')),
  synlighet     text not null default 'intern'
                  check (synlighet in ('intern','offentlig')),
  starter_at    timestamptz not null,
  varighet_min  integer not null default 45,
  mote_lenke    text,               -- Teams/Zoom/Meet — vises ALDRI på åpen side
  vert_ra       uuid references public.profiles(id) on delete set null,
  nettverk_id   uuid,               -- nullable målretting av interne
  maks_antall   integer,            -- nullable kapasitet
  status        text not null default 'utkast'
                  check (status in ('utkast','publisert','gjennomfort','avlyst')),
  land          text not null default 'NO',   -- multi-tenant (10.8)
  opprettet_av  uuid references public.profiles(id) on delete set null,
  opprettet_at  timestamptz not null default now(),
  endret_at     timestamptz not null default now()
);
create index if not exists webinarer_publisert_idx
  on public.webinarer (synlighet, status, starter_at);

create table if not exists public.webinar_pameldinger (
  id            uuid primary key default gen_random_uuid(),
  webinar_id    uuid not null references public.webinarer(id) on delete cascade,
  skole_id      uuid references public.skoler(id) on delete set null,
  navn          text not null,
  rolle         text,
  epost         text not null,
  kilde         text not null default 'offentlig'
                  check (kilde in ('min_side','offentlig','invitasjon','nyhetsbrev')),
  lenke_token   uuid not null default gen_random_uuid(),
  bekreftet_at  timestamptz,
  paminnelse_24t_sendt_at timestamptz,
  paminnelse_1t_sendt_at  timestamptz,
  nyhetsbrev_samtykke boolean not null default false,
  samtykke_at   timestamptz,
  avmeldt_at    timestamptz,
  opprettet_at  timestamptz not null default now()
);
-- Dublettvern per webinar (uttrykks-unik indeks — kan ikke stå som table-constraint).
-- on conflict (webinar_id, lower(epost)) matcher denne indeksen.
create unique index if not exists webinar_pameldinger_dublett_idx
  on public.webinar_pameldinger (webinar_id, lower(epost));
create index if not exists webinar_pameldinger_webinar_idx
  on public.webinar_pameldinger (webinar_id);
create index if not exists webinar_pameldinger_skole_idx
  on public.webinar_pameldinger (skole_id);

create table if not exists public.webinar_opptak (
  id            uuid primary key default gen_random_uuid(),
  webinar_id    uuid not null references public.webinarer(id) on delete cascade,
  bunny_video_id text,
  thumbnail_url text,
  varighet_sek  integer,
  publisert_at  timestamptz not null default now(),
  utloper_at    timestamptz,                 -- publisert_at + innstilling 'webinar_opptak_dager'
  slettet_at    timestamptz,
  har_persondata boolean not null default true  -- false = forhåndsinnspilt klipp/avatar, utløper aldri
);
create index if not exists webinar_opptak_webinar_idx
  on public.webinar_opptak (webinar_id);

create table if not exists public.webinar_referater (
  id            uuid primary key references public.webinarer(id) on delete cascade,
  innhold_md    text,
  status        text not null default 'ai_utkast'
                  check (status in ('ai_utkast','godkjent')),
  godkjent_av   uuid references public.profiles(id) on delete set null,
  godkjent_at   timestamptz,
  opprettet_at  timestamptz not null default now(),
  endret_at     timestamptz not null default now()
);

-- ── Innstillinger (default-nøkler; ignorer hvis tabellen ikke finnes) ────────
do $$
begin
  if to_regclass('public.innstillinger') is not null then
    insert into public.innstillinger (nokkel, verdi) values
      ('webinar_opptak_dager', '7'),
      ('webinar_paminnelse_timer', '24'),
      ('webinar_nyhetsbrev_maaneder', 'mai,november')
    on conflict (nokkel) do nothing;
  end if;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.webinarer          enable row level security;
alter table public.webinar_pameldinger enable row level security;
alter table public.webinar_opptak      enable row level security;
alter table public.webinar_referater   enable row level security;

-- webinarer: innloggede leser publiserte (intern + offentlig). Anonyme får IKKE
-- rå tilgang — kun via RPC hent_offentlige_webinarer(). Skriving: ansatt/superadmin.
drop policy if exists webinarer_les_innlogget on public.webinarer;
create policy webinarer_les_innlogget on public.webinarer
  for select to authenticated using (status = 'publisert' or er_ansatt());

drop policy if exists webinarer_skriv_ansatt on public.webinarer;
create policy webinarer_skriv_ansatt on public.webinarer
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

-- pameldinger: skolen ser egne rader; ansatte ser alt. Innsetting går via RPC
-- (SECURITY DEFINER) — ingen direkte insert-policy for vanlige brukere.
-- E-post skal ALDRI kunne leses av anon (ingen anon-policy = ingen tilgang).
drop policy if exists pameld_les on public.webinar_pameldinger;
create policy pameld_les on public.webinar_pameldinger
  for select to authenticated
  using (er_ansatt() or (skole_id is not null and tilknyttet_skole(skole_id)));

drop policy if exists pameld_skriv_ansatt on public.webinar_pameldinger;
create policy pameld_skriv_ansatt on public.webinar_pameldinger
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

-- opptak: innloggede ser ikke-utløpte/ikke-slettede (avspilling går uansett via
-- eget signert endepunkt senere). Skriving: ansatt.
drop policy if exists opptak_les on public.webinar_opptak;
create policy opptak_les on public.webinar_opptak
  for select to authenticated
  using (slettet_at is null and (utloper_at is null or utloper_at > now()));

drop policy if exists opptak_skriv_ansatt on public.webinar_opptak;
create policy opptak_skriv_ansatt on public.webinar_opptak
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

-- referater: innloggede leser kun godkjente; ansatte ser/skriver alt.
drop policy if exists referat_les on public.webinar_referater;
create policy referat_les on public.webinar_referater
  for select to authenticated using (status = 'godkjent' or er_ansatt());

drop policy if exists referat_skriv_ansatt on public.webinar_referater;
create policy referat_skriv_ansatt on public.webinar_referater
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

-- ── GRANTs ──────────────────────────────────────────────────────────────────
-- webinarer: KOLONNENIVÅ-select for innloggede — mote_lenke holdes utenfor, så en
-- skolebruker ikke kan hente møtelenken via rå REST. Lenken sendes på e-post
-- (håndteres server-side med service_role/RPC). Skriving gates uansett av RLS (er_ansatt).
revoke select on public.webinarer from authenticated;
grant select (id, tittel, beskrivelse, tittel_sv, beskrivelse_sv, type, synlighet,
  starter_at, varighet_min, vert_ra, nettverk_id, maks_antall, status, land,
  opprettet_av, opprettet_at, endret_at) on public.webinarer to authenticated;
grant insert, update, delete on public.webinarer to authenticated;

grant select, insert, update, delete on public.webinar_pameldinger,
  public.webinar_opptak, public.webinar_referater to authenticated;
grant select, insert, update, delete on public.webinarer, public.webinar_pameldinger,
  public.webinar_opptak, public.webinar_referater to service_role;

-- ── Offentlig RPC-lag (anon slipper til KUN her) ────────────────────────────
-- Kommende OFFENTLIGE webinarer for forsiden. Eksponerer ALDRI mote_lenke.
create or replace function public.hent_offentlige_webinarer()
returns table (
  id uuid, tittel text, beskrivelse text, type text,
  starter_at timestamptz, varighet_min integer,
  vert_navn text, maks_antall integer, antall_pameldte bigint
)
language sql stable security definer set search_path = public as $$
  select w.id, w.tittel, w.beskrivelse, w.type,
         w.starter_at, w.varighet_min,
         p.navn as vert_navn, w.maks_antall,
         (select count(*) from public.webinar_pameldinger pm
            where pm.webinar_id = w.id and pm.avmeldt_at is null) as antall_pameldte
  from public.webinarer w
  left join public.profiles p on p.id = w.vert_ra
  where w.synlighet = 'offentlig'
    and w.status = 'publisert'
    and w.starter_at > now()
  order by w.starter_at asc;
$$;

-- Påmelding. Offentlige webinarer: åpen (anon ok). Interne: kun innlogget som er
-- tilknyttet skolen (eller ansatt). Møtelenke returneres ALDRI herfra — den sendes
-- på e-post. Idempotent på (webinar_id, epost): gjentatt påmelding er ikke feil.
create or replace function public.meld_paa_webinar(
  p_webinar_id uuid,
  p_navn text,
  p_epost text,
  p_rolle text default null,
  p_skole_id uuid default null,
  p_nyhetsbrev_samtykke boolean default false
)
returns table (status text, pamelding_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  w public.webinarer;
  v_navn text := nullif(btrim(p_navn), '');
  v_epost text := lower(nullif(btrim(p_epost), ''));
  v_kilde text;
  v_id uuid;
begin
  if v_navn is null or v_epost is null then
    raise exception 'Navn og e-post er påkrevd.' using errcode = 'check_violation';
  end if;
  if v_epost !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Ugyldig e-postadresse.' using errcode = 'check_violation';
  end if;

  select * into w from public.webinarer
    where webinarer.id = p_webinar_id and webinarer.status = 'publisert';  -- kvalifisert: kolliderer ellers med OUT-kolonnen «status»
  if not found then
    raise exception 'Fant ikke webinaret, eller det er ikke publisert.' using errcode = 'no_data_found';
  end if;
  if now() > w.starter_at + make_interval(mins => coalesce(w.varighet_min, 45)) then
    raise exception 'Webinaret er allerede avsluttet.' using errcode = 'no_data_found';
  end if;

  if w.synlighet = 'offentlig' then
    v_kilde := 'offentlig';
    p_skole_id := null;   -- åpen påmelding fester ALDRI raden til en skole (hindrer injeksjon i andres liste)
  else
    -- Interne er lukket: krever innlogget bruker tilknyttet skolen (eller ansatt).
    if auth.uid() is null then
      raise exception 'Interne webinarer krever innlogging.' using errcode = 'insufficient_privilege';
    end if;
    if not (public.er_ansatt() or (p_skole_id is not null and public.tilknyttet_skole(p_skole_id))) then
      raise exception 'Du har ikke tilgang til å melde deg på dette webinaret.' using errcode = 'insufficient_privilege';
    end if;
    v_kilde := 'min_side';
  end if;

  -- Kapasitet (valgfri)
  if w.maks_antall is not null then
    -- Teller aktive plasser. En som allerede har en AKTIV plass slipper forbi
    -- (idempotent re-påmelding); avmeldte teller som ny plass og møter taket.
    if (select count(*) from public.webinar_pameldinger pm
          where pm.webinar_id = w.id and pm.avmeldt_at is null) >= w.maks_antall
       and not exists (select 1 from public.webinar_pameldinger pm
          where pm.webinar_id = w.id and lower(pm.epost) = v_epost and pm.avmeldt_at is null) then
      return query select 'fullt'::text, null::uuid; return;
    end if;
  end if;

  insert into public.webinar_pameldinger
    (webinar_id, skole_id, navn, rolle, epost, kilde, nyhetsbrev_samtykke, samtykke_at)
  values
    (w.id, p_skole_id, v_navn, nullif(btrim(p_rolle), ''), v_epost, v_kilde,
     coalesce(p_nyhetsbrev_samtykke, false),
     case when coalesce(p_nyhetsbrev_samtykke, false) then now() else null end)
  on conflict (webinar_id, lower(epost)) do update
     set avmeldt_at = null,                     -- re-påmelding etter avmelding gjenåpner raden
         navn = excluded.navn,
         rolle = excluded.rolle,
         -- samtykke trekkes aldri tilbake her; nytt ja logges med tidspunkt
         samtykke_at = case
           when excluded.nyhetsbrev_samtykke and webinar_pameldinger.samtykke_at is null then now()
           else webinar_pameldinger.samtykke_at end,
         nyhetsbrev_samtykke = webinar_pameldinger.nyhetsbrev_samtykke or excluded.nyhetsbrev_samtykke
  returning id into v_id;

  return query select 'ok'::text, v_id;
end;
$$;

grant execute on function public.hent_offentlige_webinarer() to anon, authenticated;
grant execute on function public.meld_paa_webinar(uuid, text, text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.er_ansatt() to authenticated;
grant execute on function public.tilknyttet_skole(uuid) to authenticated;

-- ── Demo-seed (så flatene viser noe før admin-CRUD finnes) ──────────────────
-- Ett offentlig intro-webinar + ett internt nettverksmøte, begge publisert.
insert into public.webinarer (tittel, beskrivelse, type, synlighet, starter_at, varighet_min, mote_lenke, status)
select 'Bli kjent med Trivselsleder — gratis intro',
       'Et kort, uforpliktende webinar for skoler som vurderer programmet. Vi viser hva trivselslederne gjør i praksis, hvordan dere kommer i gang, og svarer på spørsmål.',
       'intro_ekstern', 'offentlig', now() + interval '7 days', 40,
       'https://meet.example.com/intro', 'publisert'
where not exists (select 1 from public.webinarer where synlighet = 'offentlig' and type = 'intro_ekstern');

insert into public.webinarer (tittel, beskrivelse, type, synlighet, starter_at, varighet_min, mote_lenke, status)
select 'Nettverksmøte: aktiviteter for vinterhalvåret',
       'Del erfaringer med andre skoler og få nye leker til uteområdet når det er kaldt og mørkt. Vi går også gjennom periodeplan-verktøyet.',
       'nettverksmote', 'intern', now() + interval '3 days', 45,
       'https://meet.example.com/nettverk', 'publisert'
where not exists (select 1 from public.webinarer where synlighet = 'intern' and type = 'nettverksmote');
