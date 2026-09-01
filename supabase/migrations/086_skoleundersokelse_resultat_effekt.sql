-- 086_skoleundersokelse_resultat_effekt.sql
-- MODUL «Spørreundersøkelse til skolene» — DEL F, trinn 2A: AGGREGERINGS-RPC for
-- effekt-matrisen. Returnerer snitt PER RAD på tvers av ALLE skoler som har svart i
-- en runde. Grunnlaget for resultatkortet på ledelsessiden (trinn 2B).
--
-- IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent (DROP + CREATE). Rører KUN en ny funksjon.
--
-- ── FORSJEKK-FELLEN (bevisst unngått) ────────────────────────────────────────
-- Aggregerer mot RUNDENS undersokelse_id — IKKE alle effekt-spørsmål globalt. Det
-- finnes flere undersøkelser (standard v1 + kopier), hver med sin egen effekt-matrise
-- og egne matriserad-id-er. Vi henter effekt-matrisens spørsmål (blokk='effekt',
-- type='matrise') som tilhører skoleus_runder.undersokelse_id, og dens rader derfra.
--
-- ── TILGANG ──────────────────────────────────────────────────────────────────
-- SECURITY DEFINER + SET search_path='' (alt public-kvalifisert). GRANT execute til
-- authenticated + service_role; REVOKE fra public/anon (ingen anonym tilgang).
-- Caller-vakt (husregel: DEFINER som utleverer data MÅ ha caller-sjekk): kun
-- ansatte/superadmin får data. Ledelsessiden er åpen for ALLE ansatte inkl. RA
-- (beslutning 1. sep) — ingen av/på-skjuling. NULL-rolle (service_role/backend uten
-- JWT) slippes gjennom bevisst; anon kan uansett ikke kalle (ingen grant).
--
-- ── AGGREGERING ──────────────────────────────────────────────────────────────
-- Per matriserad: snitt av verdi_tall på tvers av alle svar i runden. Kun ekte
-- tall-svar teller (verdi_tall IS NOT NULL og ikke_aktuelt=false); tekst/ikke-aktuelt
-- hoppes over. LEFT JOIN → rader uten svar vises med snitt=NULL, antall_svar=0
-- (forsvinner ikke). snitt rundes til 1 desimal (skala av 6). Sortert på rekkefolge.

begin;

drop function if exists public.skoleus_resultat_effekt(uuid);
create function public.skoleus_resultat_effekt(p_runde uuid)
returns table(
  matriserad_id uuid,
  rekkefolge    integer,
  radtekst      text,
  snitt         numeric,
  antall_svar   integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_rolle text := public.get_min_rolle();
begin
  -- Caller-vakt: en innlogget bruker som IKKE er ansatt/superadmin nektes.
  -- NULL-rolle = service_role/backend uten JWT (ingen anon-grant) → slippes gjennom.
  if v_rolle is not null and v_rolle not in ('ansatt', 'superadmin') then
    raise exception 'Ikke tilgang.' using errcode = '42501';
  end if;

  return query
    select
      mr.id                                   as matriserad_id,
      mr.rekkefolge,
      mr.radtekst,
      round(avg(sv.verdi_tall)::numeric, 1)   as snitt,
      count(sv.verdi_tall)::integer           as antall_svar
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
    group by mr.id, mr.rekkefolge, mr.radtekst
    order by mr.rekkefolge;
end;
$function$;

revoke all on function public.skoleus_resultat_effekt(uuid) from public;
grant execute on function public.skoleus_resultat_effekt(uuid) to authenticated, service_role;

commit;
