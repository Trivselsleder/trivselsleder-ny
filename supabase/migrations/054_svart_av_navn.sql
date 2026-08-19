-- 054: B8 (høring) – «[Navn] har allerede svart på vegne av [skole]»-visning.
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret).
--
-- hent_kurs_skole_via_token returnerer nå også svart_av_navn: navnet på den som
-- svarte (mottakeren som sendte inn via sin lenke, ELLER RA-en som registrerte
-- på vegne). Anon kan ikke lese kurs_skole_mottaker/profiles direkte (RLS), så
-- navnet MÅ komme via denne SECURITY DEFINER-funksjonen.
-- Husregel 6: drop + recreate + grant. JS-klienten leser på navn → bakoverkompatibelt.

begin;

drop function if exists public.hent_kurs_skole_via_token(text);

create function public.hent_kurs_skole_via_token(token text)
returns table(
  id uuid, kurs_id uuid, skole_id uuid, er_vertskap boolean, vertskap_bekreftet boolean,
  kommer boolean, arsak_ikke_komme text, arsak_ikke_vertskap text, antall_tl integer,
  antall_kort integer, kort_status text, kommentar text, onsket_kurs_id uuid,
  apen_for_annet_kurs boolean, onske_tekst text,
  svart boolean, svart_dato timestamp with time zone, svart_av_navn text,
  kurs_navn text, kurs_dato date, kurs_start_tid time without time zone,
  kurs_slutt_tid time without time zone, skole_navn text,
  kurs_oppmotetid time without time zone
)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  update kurs_skole_mottaker m
     set apnet_at = coalesce(m.apnet_at, now())
   where m.lenke_token::text = token;
  return query
  select
    ks.id, ks.kurs_id, ks.skole_id, ks.er_vertskap, ks.vertskap_bekreftet,
    ks.kommer, ks.arsak_ikke_komme, ks.arsak_ikke_vertskap, ks.antall_tl,
    ks.antall_kort, ks.kort_status, ks.kommentar, ks.onsket_kurs_id,
    ks.apen_for_annet_kurs, ks.onske_tekst,
    ks.svart, ks.svart_dato,
    coalesce(
      (select m2.navn from kurs_skole_mottaker m2 where m2.id = ks.svart_av_mottaker_id),
      (select pr.navn from profiles pr where pr.id = ks.svar_registrert_av)
    ),
    k.navn, k.dato, k.start_tid, k.slutt_tid, s.navn,
    case when ks.er_vertskap then k.oppmote_vertskap else k.oppmote_ovrige end
  from kurs_skole ks
  left join kurs k on k.id = ks.kurs_id
  left join skoler s on s.id = ks.skole_id
  where ks.lenke_token = token
     or ks.id = (select m.kurs_skole_id from kurs_skole_mottaker m
                 where m.lenke_token::text = token limit 1);
end;
$function$;

grant execute on function public.hent_kurs_skole_via_token(text) to anon, authenticated, service_role;

commit;
