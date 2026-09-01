-- 087_skoleundersokelse_resultat_effekt_v2.sql
-- MODUL «Spørreundersøkelse til skolene» — DEL F: to etterstramminger på
-- aggregerings-RPC-en skoleus_resultat_effekt (fra 086).
--
-- FIKS 1 (sikkerhet): rollevakten i 086 slapp NULL-rolle gjennom
--   (if v_rolle is not null and v_rolle not in (...)). En innlogget bruker UTEN
--   profiles-rad (get_min_rolle() = NULL) fikk da data. Vi speiler husets faste
--   coalesce-mønster (019/022/055/061/062): coalesce(get_min_rolle(),'') not in
--   ('ansatt','superadmin') → NULL/anon/skoleadmin nektes; ansatt/superadmin slippes
--   gjennom. MERK: service_role/backend uten JWT gir også NULL-rolle og nektes nå av
--   vakten (som husets øvrige frontend-lese-RPC-er) — GRANT-en beholdes uansett, og
--   ingen backend-rute kaller denne funksjonen (kun frontend, som innlogget ansatt).
--
-- FIKS 2 (robusthet): returner skala_max (fra effekt-matrise-spørsmålets
--   skoleus_sporsmal.skala_max) sammen med de eksisterende kolonnene, så frontend
--   slipper å hardkode «av 6».
--
-- SIGNATUR-ENDRING (husregel 6 + endret RETURNS TABLE): DROP gammel signatur +
-- CREATE ny + GRANT + REVOKE — ALT i én transaksjon. SECURITY DEFINER, search_path=''
-- (alt public-kvalifisert). IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent (DROP IF EXISTS).

begin;

-- Endret RETURNS TABLE (ny kolonne skala_max) → må droppe gammel signatur først.
drop function if exists public.skoleus_resultat_effekt(uuid);

create function public.skoleus_resultat_effekt(p_runde uuid)
returns table(
  matriserad_id uuid,
  rekkefolge    integer,
  radtekst      text,
  snitt         numeric,
  antall_svar   integer,
  skala_max     integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  -- FIKS 1 — caller-vakt (husets coalesce-mønster): NULL-rolle (uten profiles-rad),
  -- anon og skoleadmin nektes; kun ansatt/superadmin slippes gjennom.
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ikke tilgang.' using errcode = '42501';
  end if;

  return query
    select
      mr.id                                   as matriserad_id,
      mr.rekkefolge,
      mr.radtekst,
      round(avg(sv.verdi_tall)::numeric, 1)   as snitt,
      count(sv.verdi_tall)::integer           as antall_svar,
      q.skala_max                             as skala_max   -- FIKS 2
    from public.skoleus_runder r
    join public.skoleus_sporsmal q
      on q.undersokelse_id = r.undersokelse_id
     and q.blokk = 'effekt'
     and q.type  = 'matrise'
    join public.skoleus_matriserad mr
      on mr.sporsmal_id = q.id
    left join public.skoleus_svar sv
      on sv.runde_id      = r.id
     and sv.sporsmal_id   = q.id
     and sv.matriserad_id = mr.id
     and sv.verdi_tall   is not null
     and sv.ikke_aktuelt  = false
    where r.id = p_runde
    group by mr.id, mr.rekkefolge, mr.radtekst, q.skala_max
    order by mr.rekkefolge;
end;
$function$;

revoke all on function public.skoleus_resultat_effekt(uuid) from public;
grant execute on function public.skoleus_resultat_effekt(uuid) to authenticated, service_role;

commit;
