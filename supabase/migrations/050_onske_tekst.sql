-- 050: B4a (høring) – ønske-fritekstfelt når skolen er «åpen for annet kurs».
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret).
--
-- Ny kolonne kurs_skole.onske_tekst + lagre_skole_svar utvidet med p_onske_tekst
-- (husregel 6: begge gamle signaturer slettes, ny opprettes, GRANT på nytt).
-- Bakoverkompatibelt: den utplasserte frontenden kaller med navngitte argumenter
-- og utelater p_onske_tekst/p_pa_vegne_av (defaults), så den virker uendret.

begin;

alter table public.kurs_skole add column if not exists onske_tekst text;

drop function if exists public.lagre_skole_svar(text, boolean, integer, boolean, text, text, text);
drop function if exists public.lagre_skole_svar(text, boolean, integer, boolean, text, text, text, boolean, boolean);

create function public.lagre_skole_svar(
  token text,
  p_kommer boolean,
  p_antall_tl integer,
  p_er_vertskap boolean,
  p_arsak_ikke_komme text,
  p_arsak_ikke_vertskap text,
  p_kommentar text,
  p_apen_for_annet_kurs boolean,
  p_onske_tekst text default null,
  p_pa_vegne_av boolean default false
) returns void
language plpgsql security definer set search_path to 'public'
as $function$
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
      onske_tekst = case when p_kommer = false and p_apen_for_annet_kurs then p_onske_tekst else null end,
      svart = true,
      svart_dato = now(),
      svart_av_mottaker_id = coalesce(v_mottaker_id, svart_av_mottaker_id),
      svar_registrert_av = case when p_pa_vegne_av then auth.uid() end,
      svar_registrert_at = case when p_pa_vegne_av then now() end
  where id = v_ks_id;
end;
$function$;

grant execute on function public.lagre_skole_svar(text, boolean, integer, boolean, text, text, text, boolean, text, boolean)
  to anon, authenticated, service_role;

commit;
