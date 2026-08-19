-- 047: A3 (høring) – del «Gullkorn» i to felt: gullkorn + forbedring.
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret).
-- Idempotent: drop function if exists + add column if not exists.

begin;

alter table public.evalueringer add column if not exists forbedring text;

-- lagre_evaluering: ny parameter p_forbedring (husregel 6: drop gammel signatur + recreate + grant)
drop function if exists public.lagre_evaluering(text, integer, integer, integer, text, text, uuid);
create function public.lagre_evaluering(
  token text,
  p_vurd_gjennomforing integer,
  p_vurd_info integer,
  p_vurd_aktiviteter integer,
  p_gullkorn text,
  p_forbedring text,
  p_kjopsinteresse text,
  p_valgt_pakke_id uuid default null::uuid
) returns void
language sql security definer set search_path to 'public'
as $function$
  update evalueringer
  set vurd_gjennomforing = p_vurd_gjennomforing,
      vurd_info = p_vurd_info,
      vurd_aktiviteter = p_vurd_aktiviteter,
      gullkorn = p_gullkorn,
      forbedring = p_forbedring,
      kjopsinteresse = p_kjopsinteresse,
      valgt_pakke_id = p_valgt_pakke_id,
      valgt_pakke_navn = (select navn from eval_pakker where id = p_valgt_pakke_id),
      valgt_pakke_pris = (select pris from eval_pakker where id = p_valgt_pakke_id),
      svart_tidspunkt = now()
  where evalueringer.token = lagre_evaluering.token;
$function$;
grant execute on function public.lagre_evaluering(text, integer, integer, integer, text, text, text, uuid) to anon, authenticated, service_role;

-- hent_evaluering_via_token: returner også forbedring (retur-signatur endres -> drop + recreate)
drop function if exists public.hent_evaluering_via_token(text);
create function public.hent_evaluering_via_token(token text)
returns table(evaluering_id uuid, svart boolean, kurs_navn text, kurs_dato date, skole_navn text, vurd_gjennomforing integer, vurd_info integer, vurd_aktiviteter integer, gullkorn text, forbedring text, kjopsinteresse text)
language sql security definer set search_path to 'public'
as $function$
  select e.id, (e.svart_tidspunkt is not null) as svart, k.navn, k.dato, s.navn,
         e.vurd_gjennomforing, e.vurd_info, e.vurd_aktiviteter, e.gullkorn, e.forbedring, e.kjopsinteresse
  from evalueringer e
  join kurs_skole ks on e.kurs_skole_id = ks.id
  join kurs k on ks.kurs_id = k.id
  left join skoler s on ks.skole_id = s.id
  where e.token = hent_evaluering_via_token.token;
$function$;
grant execute on function public.hent_evaluering_via_token(text) to anon, authenticated, service_role;

-- hent_evalueringer_admin: returner også forbedring (drop + recreate, behold eksisterende rettigheter).
-- MERK: PUBLIC-grant gjenskapt uendret (kjent sikkerhetspunkt – strammes i sikkerhetsrunden, kap. 9).
drop function if exists public.hent_evalueringer_admin();
create function public.hent_evalueringer_admin()
returns table(evaluering_id uuid, kurs_navn text, kurs_dato date, skole_navn text, vurd_gjennomforing integer, vurd_info integer, vurd_aktiviteter integer, gullkorn text, forbedring text, kjopsinteresse text, svart_tidspunkt timestamptz, valgt_pakke_id uuid, valgt_pakke_navn text, valgt_pakke_pris numeric)
language sql security definer set search_path to 'public'
as $function$
  select e.id, k.navn, k.dato, s.navn, e.vurd_gjennomforing, e.vurd_info, e.vurd_aktiviteter,
         e.gullkorn, e.forbedring, e.kjopsinteresse, e.svart_tidspunkt, e.valgt_pakke_id, e.valgt_pakke_navn, e.valgt_pakke_pris
  from evalueringer e
  join kurs_skole ks on e.kurs_skole_id = ks.id
  join kurs k on ks.kurs_id = k.id
  left join skoler s on ks.skole_id = s.id
  where e.svart_tidspunkt is not null
  order by e.svart_tidspunkt desc;
$function$;
grant execute on function public.hent_evalueringer_admin() to public;

commit;
