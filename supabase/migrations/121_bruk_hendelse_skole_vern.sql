-- ============================================================================
-- 121_bruk_hendelse_skole_vern.sql — vern mot manipulasjon av bruk_hendelse
-- ============================================================================
-- KILDE (fasit): Fable-kontroll K2, funn C-2 (12. sep 2026). Fable målte som skolebruker:
--   en insert i public.bruk_hendelse med EN ANNEN skoles skole_id, bruker_id = null og
--   tidspunkt 20 dager tilbake ble GODTATT. Skole-uuid-er er offentlige (migr 044), så
--   fem slike inserts kunne styre «Månedens lek» (migr 120, som teller distinkte skoler).
--
-- SISTE migrasjon som definerte insert-policyen p_ins på bruk_hendelse: 030_fase3_rls.sql
--   (linje 95–96). Ingen migrasjon mellom 030 og i dag rører p_ins (verifisert: kun 030
--   har `policy p_ins on bruk_hendelse`). 030 hadde:
--     create policy p_ins on bruk_hendelse for insert to authenticated
--       with check (bruker_id = auth.uid() or bruker_id is null);
--   Vi beholder ALT i den uendret (for insert, to authenticated, bruker_id-klausulen) og
--   legger KUN til et skole-vern på skole_id.
--
-- NYTT with check: en innlogget bruker kan bare skrive rader for en skole vedkommende er
--   AKTIVT tilknyttet (public.bruker_skole der bruker_id = auth.uid() and aktiv). Rader uten
--   skole (skole_id is null) tillates fortsatt — det dekker INTERNE roller (superadmin/ansatt
--   stemples null, migr 120/stempling.js) og 'sok'-hendelser (stemples alltid null). Ingen
--   eksisterende skriving brytes: frontend (src/lib/leker.js) stempler skole_id KUN fra
--   brukerens egen aktive bruker_skole via skoleForStempling(), ellers null — begge lovlige
--   her. service_role og SECURITY DEFINER-funksjoner omgår RLS og påvirkes ikke.
--   bruker_skole ≠ bruk_hendelse, så ingen RLS-rekursjon; subspørringen filtrerer
--   bruker_id = auth.uid(), nøyaktig radene brukeren selv ser på bruker_skole (migr 001).
--
-- TIDSPUNKT-BEGRENSNING: VURDERT OG DROPPET. Fable-angrepet brukte tidspunkt 20 dager
--   tilbake, men skole-vernet over gjør at en angriper bare kan skrive for SIN EGEN skole —
--   det bidrar maks 1 distinkt skole og kan aldri alene krysse ≥5-terskelen i migr 120, og
--   månedsvalget fryses uansett. En tidsgrense ville ikke vært trygt beviselig: en fremtidig
--   import/etterfylling som stempler historiske tidspunkt (kjøres riktignok normalt som
--   postgres/service_role og omgår RLS, men ikke garantert) kunne blitt STILLE blokkert.
--   Jf. husregel: ikke behandle en sikkerhetssele som om den skal stoppe en angriper på lav
--   risikoprofil. Skole-vernet er det som faktisk lukker C-2.
--
-- SPERRER: idempotens FØR (p_ins allerede strammet ⇒ stopp rent) + forutsetning (p_ins
--   finnes) · verifisering ETTER (p_ins finnes med skole-vern) · kvittering på én rad før
--   commit.
-- EGENSKAPER: kun policy-erstatning · idempotent stopp ved re-kjøring · ÉN transaksjon.
--
-- TILBAKERULLING (etter commit): begin;
--   drop policy if exists p_ins on public.bruk_hendelse;
--   create policy p_ins on public.bruk_hendelse for insert to authenticated
--     with check (bruker_id = auth.uid() or bruker_id is null);
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SPERRER FØR: forutsetning + idempotens.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'bruk_hendelse' and policyname = 'p_ins'
  ) then
    raise exception 'STOPP 121 (forutsetning): insert-policy p_ins på public.bruk_hendelse finnes ikke (forventer migr 030).';
  end if;
  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'bruk_hendelse' and policyname = 'p_ins'
       and with_check like '%bruker_skole%'
  ) then
    raise exception 'STOPP 121 (allerede kjørt): p_ins på public.bruk_hendelse har allerede skole-vern (bruker_skole i with check).';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- ERSTATT p_ins (fra 030). Beholder alt uendret, legger KUN til skole-vernet.
-- ----------------------------------------------------------------------------
drop policy if exists p_ins on public.bruk_hendelse;
create policy p_ins on public.bruk_hendelse for insert to authenticated
  with check (
    (bruker_id = auth.uid() or bruker_id is null)
    and (
      skole_id is null
      or skole_id in (
        select bs.skole_id from public.bruker_skole bs
         where bs.bruker_id = auth.uid() and bs.aktiv
      )
    )
  );

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: p_ins finnes som insert-policy med skole-vernet.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'bruk_hendelse' and policyname = 'p_ins'
       and cmd = 'INSERT' and with_check like '%bruker_skole%'
  ) then
    raise exception 'STOPP 121 (etter): p_ins ble ikke satt med skole-vern.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'p_ins finnes: '     || exists(select 1 from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and cmd='INSERT'),
  'skole-vern aktivt: ' || exists(select 1 from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and with_check like '%bruker_skole%')
) as kvittering;

commit;
