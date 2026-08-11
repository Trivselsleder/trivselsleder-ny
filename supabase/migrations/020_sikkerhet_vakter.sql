-- 020: Sikkerhetsvakter før pilot (kjørt i Supabase 11. aug 2026)
-- Lukker: SECURITY DEFINER-funksjoner uten caller-sjekk + vid mottaker-policy.
--
-- LÆRDOM: hent_evalueringer_admin ble først skrevet om til plpgsql med RAISE,
-- men det ga "structure of query does not match function result type" (sql og
-- plpgsql har ulik strenghet på returtyper). Løst ved å beholde LANGUAGE sql
-- og legge vakten inn som et WHERE-filter (ikke-ansatt får tom liste, ingen
-- lekkasje). Bevist live 11. aug: ansatt 200/4 rader, anon 200/0 rader.

-- sett_kort_status: kun ansatt/superadmin + valider status (bevist live)
create or replace function public.sett_kort_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if get_min_rolle() not in ('ansatt','superadmin') then
    raise exception 'Ikke tilgang: kun ansatt kan sette kortstatus';
  end if;
  if p_status not in ('Ikke behandlet','Fakturer','Gratis','Ikke ønsket') then
    raise exception 'Ugyldig kortstatus: %', p_status;
  end if;
  update kurs_skole set kort_status = p_status where id = p_id;
end;
$$;

-- hent_evalueringer_admin: vakt som WHERE-filter, beholder LANGUAGE sql
create or replace function public.hent_evalueringer_admin()
returns table(evaluering_id uuid, kurs_navn text, kurs_dato date, skole_navn text,
  vurd_gjennomforing integer, vurd_info integer, vurd_aktiviteter integer,
  gullkorn text, kjopsinteresse text, svart_tidspunkt timestamptz,
  valgt_pakke_id uuid, valgt_pakke_navn text, valgt_pakke_pris numeric)
language sql security definer set search_path to 'public'
as $$
  select e.id, k.navn, k.dato, s.navn,
         e.vurd_gjennomforing, e.vurd_info, e.vurd_aktiviteter,
         e.gullkorn, e.kjopsinteresse, e.svart_tidspunkt,
         e.valgt_pakke_id, e.valgt_pakke_navn, e.valgt_pakke_pris
  from evalueringer e
  join kurs_skole ks on e.kurs_skole_id = ks.id
  join kurs k on ks.kurs_id = k.id
  left join skoler s on ks.skole_id = s.id
  where e.svart_tidspunkt is not null
    and get_min_rolle() in ('ansatt','superadmin')
  order by e.svart_tidspunkt desc;
$$;

-- Stram mottaker-policy: kun ansatt/superadmin (lærerflyt går via token-funksjoner)
drop policy if exists mottaker_ansatt_alt on public.kurs_skole_mottaker;
create policy mottaker_ansatt_alt on public.kurs_skole_mottaker
  as permissive for all to authenticated
  using (get_min_rolle() in ('ansatt','superadmin'))
  with check (get_min_rolle() in ('ansatt','superadmin'));

-- CHECK på kort_status (bevist live)
alter table kurs_skole
  add constraint kurs_skole_kort_status_check
  check (kort_status is null or kort_status in ('Ikke behandlet','Fakturer','Gratis','Ikke ønsket'));
