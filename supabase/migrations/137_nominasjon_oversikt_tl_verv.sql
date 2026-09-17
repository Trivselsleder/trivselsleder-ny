-- ============================================================================
-- 137_nominasjon_oversikt_tl_verv.sql — legg «Oversikt over antall TL-verv» i nominasjon
-- ============================================================================
-- KILDE (fasit): claude_MINSIDE-RETTERUNDE2-17sep.md (Kjartans svar 17. sep — dokument
--   kilde_nid 71 «Oversikt over antall TL-verv» SKAL med på Nominasjon-kortet) + samling
--   nokkel 'nominasjon' opprettet av migr 136 med fire dokumenter (rekkefolge 0–3):
--     17740 informasjon (0), 15970 Nominasjonslapp bm (1), 57 nn (2), 933 en (3).
--
-- KOLONNER JEG BYGGER PÅ (kilde-migrasjon i parentes):
--   samlinger(id, nokkel[117])  ·  dokumenter(id, kilde_nid[091])  ·
--   samling_dokument(samling_id, dokument_id, rekkefolge)[101].
--
-- HVA (ÉN transaksjon, ingen skjemaendring — ren OMPL):
--   Koble dokument kilde_nid 71 til samlingen nokkel='nominasjon' i samling_dokument med
--   rekkefolge 4 (etter Nominasjonslapp-gruppa, jf. kortrekkefølgen informasjon →
--   Nominasjonslapp → Oversikt → TL-praten). Ingen andre rader røres.
--
-- SPERRER (raise FØR skriving, i samme transaksjon):
--   * FORUTSETNING: samling nokkel='nominasjon' finnes (136 kjørt), og dokument kilde_nid 71
--     finnes i dokumenter.
--   * ALLEREDE KJØRT: dokument 71 er IKKE allerede koblet til nominasjon → stopp rent ved
--     re-kjøring.
--   Skrivingen verifiserer sitt eget radantall (1) og raiser ved avvik.
--   ETTER: nominasjon har nå 5 dokument, og 71 er koblet nøyaktig én gang på rekkefolge 4.
-- KVITTERING: én rad. EGENSKAPER: idempotent stopp ved re-kjøring · ÉN transaksjon · commit til slutt.
-- TILBAKERULLING (etter commit): begin;
--   delete from samling_dokument
--    where samling_id = (select id from samlinger where nokkel='nominasjon')
--      and dokument_id = (select id from dokumenter where kilde_nid='71');
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SPERRER FØR (raise før enhver skriving).
-- ----------------------------------------------------------------------------
do $$
declare
  v_nom uuid;
  v_dok uuid;
  n int;
begin
  -- FORUTSETNING: nominasjon-samlingen finnes (136).
  select id into v_nom from public.samlinger where nokkel = 'nominasjon';
  if v_nom is null then
    raise exception 'STOPP 137 (forutsetning): samling nokkel=''nominasjon'' finnes ikke — kjør 136 først.';
  end if;

  -- FORUTSETNING: dokumentet finnes.
  select id into v_dok from public.dokumenter where kilde_nid = '71';
  if v_dok is null then
    raise exception 'STOPP 137 (forutsetning): dokument «Oversikt over antall TL-verv» (kilde_nid 71) finnes ikke.';
  end if;

  -- ALLEREDE KJØRT: 71 er ikke allerede koblet til nominasjon.
  select count(*) into n from public.samling_dokument
   where samling_id = v_nom and dokument_id = v_dok;
  if n <> 0 then
    raise exception 'STOPP 137 (allerede kjørt): dokument 71 er allerede koblet til nominasjon.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- SKRIV: koble 71 til nominasjon på rekkefolge 4.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  insert into public.samling_dokument (samling_id, dokument_id, rekkefolge)
  select (select id from public.samlinger where nokkel = 'nominasjon'),
         d.id, 4
    from public.dokumenter d
   where d.kilde_nid = '71';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'STOPP 137: koblet % dokument, forventet 1.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  -- 71 koblet nøyaktig én gang på rekkefolge 4.
  select count(*) into n from public.samling_dokument sd
    join public.samlinger s on s.id = sd.samling_id
    join public.dokumenter d on d.id = sd.dokument_id
   where s.nokkel = 'nominasjon' and d.kilde_nid = '71' and sd.rekkefolge = 4;
  if n <> 1 then raise exception 'STOPP 137 (etter): 71 koblet % ganger på rk 4, forventet 1.', n; end if;

  -- Nominasjon har nå 5 dokument totalt.
  select count(*) into n from public.samling_dokument sd
    join public.samlinger s on s.id = sd.samling_id
   where s.nokkel = 'nominasjon';
  if n <> 5 then raise exception 'STOPP 137 (etter): nominasjon har % dokument, forventet 5.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'nominasjon dok totalt (forventet 5): ' || (select count(*) from public.samling_dokument sd
     join public.samlinger s on s.id = sd.samling_id where s.nokkel = 'nominasjon'),
  '71 på rekkefolge: ' || (select sd.rekkefolge::text from public.samling_dokument sd
     join public.samlinger s on s.id = sd.samling_id
     join public.dokumenter d on d.id = sd.dokument_id
    where s.nokkel = 'nominasjon' and d.kilde_nid = '71')
) as kvittering;

commit;
