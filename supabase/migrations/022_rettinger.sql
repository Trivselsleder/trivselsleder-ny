-- 022: rettinger etter uavhengig loop-test 11. aug 2026

-- Funn 1: slette et kurs skal kaskadere skolekoblingene (som igjen kaskaderer
-- mottakere + evalueringer via eksisterende FK-er), og nulle onsket_kurs_id-
-- pekere fra andre rader. Da virker en enkel "delete from kurs" uten rå FK-feil.
alter table kurs_skole drop constraint kurs_skole_kurs_id_fkey;
alter table kurs_skole add constraint kurs_skole_kurs_id_fkey
  foreign key (kurs_id) references kurs(id) on delete cascade;
alter table kurs_skole drop constraint kurs_skole_onsket_kurs_id_fkey;
alter table kurs_skole add constraint kurs_skole_onsket_kurs_id_fkey
  foreign key (onsket_kurs_id) references kurs(id) on delete set null;

-- Funn 2: flytt_skole_til_kurs skal NEKTE hvis skolen alt står på målkurset
-- (Valg A) — ellers oppstår en dublett.
create or replace function public.flytt_skole_til_kurs(p_id uuid, p_nytt_kurs_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_skole uuid;
begin
  if coalesce(get_min_rolle(), '') not in ('superadmin','ansatt') then
    raise exception 'Bare ansatte kan flytte skoler mellom kurs.' using errcode = '42501';
  end if;
  select skole_id into v_skole from kurs_skole where id = p_id;
  if exists (
    select 1 from kurs_skole
    where skole_id = v_skole and kurs_id = p_nytt_kurs_id and id <> p_id
  ) then
    raise exception 'Skolen står allerede på det kurset.' using errcode = '23505';
  end if;
  update kurs_skole set
    kurs_id = p_nytt_kurs_id, svart = false, kommer = null, antall_tl = null,
    arsak_ikke_komme = null, er_vertskap = false, vertskap_bekreftet = null,
    arsak_ikke_vertskap = null, kommentar = null, apen_for_annet_kurs = false,
    onsket_kurs_id = null, melding_handtert = false, svart_dato = null,
    forste_utsending_at = null, purring_sendt_at = null, trinn3_sendt_at = null,
    paaminnelse_sendt_at = null, evaluering_sendt_at = null
  where id = p_id;
end;
$function$;

-- Funn 3: kopier_kurs skal ta med oppmøtetidene (oppmote_vertskap/oppmote_ovrige).
create or replace function public.kopier_kurs(p_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare ny_id uuid;
begin
  insert into kurs (
    nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong,
    oppmote_vertskap, oppmote_ovrige,
    status, maks_antall, merknad, kursholder_id, backup_kursholder_id, uke, dag, navn)
  select
    nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong,
    oppmote_vertskap, oppmote_ovrige,
    'planlagt', maks_antall, merknad, kursholder_id, backup_kursholder_id, uke, dag, navn || ' (kopi)'
  from kurs where id = p_id
  returning id into ny_id;
  return ny_id;
end;
$function$;

-- Kontroll: antall haller (avklarer 146 vs 161), og at funksjonene finnes.
select (select count(*) from haller) as antall_haller;
