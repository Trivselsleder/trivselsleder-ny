-- 061: FIKS (fable-kontroll 19. aug) – flytt_skole_til_kurs nullstiller også de
-- NYE stemplene som kom i 047–060. KJØRES LIVE i Supabase 19. aug 2026 (arkiv).
--
-- Funn: flytt_skole_til_kurs (022) nullstiller svar + de GAMLE stemplene, men ikke
-- kvittering_sendt_at (052), eval_purring_sendt_at (049), ra_varslet_at (057),
-- auto_purring_sist_at (048), onske_tekst (050) eller savnet_sendt_at (060). En
-- flyttet skole ville da på det NYE kurset: aldri få kvittering, aldri få
-- evaluerings-påminnelse, aldri utløse RA-varsel, og få forsinket auto-purring.
--
-- Beslutning (Kjartan er utilgjengelig; velger «rent nytt kurs»): også
-- auto_purring_skjermet (skjermingen var kursspesifikk) og savnet_sendt_at
-- nullstilles, så skolen starter helt rent. CREATE OR REPLACE beholder GRANT
-- (samme signatur). ALT annet er identisk med 022-versjonen.

begin;

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
    paaminnelse_sendt_at = null, evaluering_sendt_at = null,
    -- NYE felt fra 047–060 — må også nullstilles så det nye kurset starter rent:
    onske_tekst = null, kvittering_sendt_at = null, eval_purring_sendt_at = null,
    ra_varslet_at = null, auto_purring_sist_at = null, auto_purring_skjermet = false,
    savnet_sendt_at = null
  where id = p_id;
end;
$function$;

commit;
