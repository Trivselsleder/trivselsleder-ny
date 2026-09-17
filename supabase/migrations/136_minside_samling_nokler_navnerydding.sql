-- ============================================================================
-- 136_minside_samling_nokler_navnerydding.sql — nøkkel- og navnemigrasjon for Min side
-- ============================================================================
-- KILDE (fasit): claude_MINSIDE-BYGGEGRUNNLAG-14sep.md §2.2/§4 + claude_MINSIDE-GRUNNLAG-13sep.md
--   §1.3/§1.6, og MÅLT prod-uttrekk 17. sep 2026 (_kontroll-import/rigg/
--   resultat-samlinger-136-prod-17sep.md, 21 samlinger). Bygget PÅ det uttrekket, ikke antakelser.
--
-- KOLONNER JEG BYGGER PÅ (kilde-migrasjon i parentes):
--   samlinger(id, type, synlig, rekkefolge, nokkel[117], kilde_nid[091]) — nokkel unik der satt (117).
--   samling_innhold(samling_id, sprak, tittel) (029).
--   samling_ressurs(samling_id, ressurs_id, rekkefolge) (029).
--   samling_dokument(samling_id, dokument_id, rekkefolge) (101).
--   ressurser(id, kilde_nid[091]) · dokumenter(id, kilde_nid[091]).
--
-- HVA (fire deler, ÉN transaksjon, ingen skjemaendring — ren OMPL):
--   1) NAVNERYDDING: fjern ledende «.» / «. » fra ALLE samlingstitler (alle språk). Prod har
--      i dag ett funn: «.Kursmodul vinter 2026» (kilde_nid 18822). Vi matcher mønsteret ^\.\s*
--      generelt (grep hele tabellen) og verifiserer 0 igjen etterpå.
--   2) NØKLER på de 12 eksisterende samlingene (identifisert på kilde_nid — aldri tittel):
--        20030 → kursmodul-host-2026      (Kursmodul høst 2026)
--        18822 → kursmodul-vinter-2026    (Kursmodul vinter 2026)
--        16190 → kursmodul-vinter-2025    (Kursmodul vinter 2025)   [kursmodul ×3, §4.1-regelen]
--        19389 → tips-favorittleker
--        19696 → tips-100-elever
--        19390 → tips-sosial-kompetanse
--        15510 → tips-fysak
--        16072 → tips-kro-1-2             ┐ frontend grupperer de tre tips-kro-*
--        16073 → tips-kro-3-4             │ som ÉN «Kroppsøving» med tre undernivåer
--        16074 → tips-kro-5-7             ┘
--        15468 → tips-sfo-aks
--        16291 → tips-tl-mester           [ni tipslister, §4.2. 19697 «Tipslister» (skjult, 0 leker)
--                                          får INGEN nøkkel — det er den skjulte beholderen fra 124.]
--      Nøkkelnavnene er dem frontend faktisk leser: hentKursmodul() (SkoleHjem.jsx) prøver
--      kursmodul-host-2026/…/kursmodul-vinter-2026; Tipslister (src/lib/minside.js) filtrerer
--      like 'tips-%'.
--      MERK — 'manedens-lek' er BEVISST UTELATT: migr 126 (14. sep, Kjartans beslutning) fjernet
--      reserve-veien fra hent_manedens_lek() og strammet CHECK-en til kun 'automatisk'. Ingen kode
--      leser lenger nokkel='manedens-lek', så å sette den ville vært en DØD nøkkel. §4.5 i
--      byggegrunnlaget (14. sep) er utdatert på dette punktet — 126 er den nyere beslutningen.
--   3) OPPRETT samlingen «Laginndeling» (nokkel 'laginndeling'), som IKKE finnes i prod:
--        4 leker: Zig zag zug (2819), Stein saks papir (2820), Ryggprikking (2821),
--                 Først og sist (6086)  — koblet i samling_ressurs (identifisert på kilde_nid).
--        1 PDF:   «Tips til laginndeling» (dokument kilde_nid 4052) — i samling_dokument.
--   4) OPPRETT samlingen «Nominasjon og TL-praten» (nokkel 'nominasjon'), som IKKE finnes i prod.
--      UTEN video (§4.4, låst 14. sep): 4 dokumenter i samling_dokument:
--        informasjon (17740), Nominasjonslapp bm (15970), nn (57), en (933).
--
-- SPERRER (raise FØR skriving, i samme transaksjon):
--   * nokkel-kolonnen + unik indeks fra 117 finnes (forutsetning).
--   * alle 12 mappede kilde_nid finnes som samling (navngir de manglende).
--   * ALLEREDE KJØRT: ingen av de 12 har nokkel fra før, og ingen samling har nokkel
--     'laginndeling'/'nominasjon' ennå → stopp rent ved re-kjøring.
--   * de 4 laginndelings-lekene, 1 PDF, og de 4 nominasjonsdokumentene finnes (navngir avvik).
--   Hver skriving verifiserer sitt eget radantall (12 / 4 / 1 / 4) og raiser ved avvik.
-- KVITTERING: én rad. EGENSKAPER: idempotent stopp ved re-kjøring · ÉN transaksjon · commit til slutt.
-- TILBAKERULLING (etter commit): begin;
--   delete from samling_dokument where samling_id in (select id from samlinger where nokkel in ('laginndeling','nominasjon'));
--   delete from samling_ressurs  where samling_id in (select id from samlinger where nokkel = 'laginndeling');
--   delete from samling_innhold  where samling_id in (select id from samlinger where nokkel in ('laginndeling','nominasjon'));
--   delete from samlinger        where nokkel in ('laginndeling','nominasjon');
--   update samlinger set nokkel = null where nokkel like 'kursmodul-%' or nokkel like 'tips-%';
--   update samling_innhold set tittel = '.' || tittel where samling_id = (select id from samlinger where kilde_nid='18822') and sprak='nb';
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Mapping kilde_nid → nokkel for de 12 eksisterende samlingene (kun lesing her).
-- (manedens-lek bevisst utelatt — se hoved-kommentaren: 126 fjernet reserve-veien.)
-- ----------------------------------------------------------------------------
create temp table _nokkel_map (kilde_nid text primary key, nokkel text not null) on commit drop;
insert into _nokkel_map (kilde_nid, nokkel) values
  ('20030', 'kursmodul-host-2026'),
  ('18822', 'kursmodul-vinter-2026'),
  ('16190', 'kursmodul-vinter-2025'),
  ('19389', 'tips-favorittleker'),
  ('19696', 'tips-100-elever'),
  ('19390', 'tips-sosial-kompetanse'),
  ('15510', 'tips-fysak'),
  ('16072', 'tips-kro-1-2'),
  ('16073', 'tips-kro-3-4'),
  ('16074', 'tips-kro-5-7'),
  ('15468', 'tips-sfo-aks'),
  ('16291', 'tips-tl-mester');

-- ----------------------------------------------------------------------------
-- SPERRER FØR (raise før enhver skriving).
-- ----------------------------------------------------------------------------
do $$
declare
  n int;
  v_mangler text;
begin
  -- Forutsetning: nokkel-kolonnen + unik indeks fra 117.
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='samlinger' and column_name='nokkel') then
    raise exception 'STOPP 136 (forutsetning): samlinger.nokkel mangler — kjør 117 først.';
  end if;
  if not exists (select 1 from pg_indexes
                 where schemaname='public' and indexname='idx_samlinger_nokkel') then
    raise exception 'STOPP 136 (forutsetning): unik indeks idx_samlinger_nokkel mangler (117).';
  end if;

  -- Alle 12 mappede kilde_nid finnes som samling — navngi de manglende.
  select string_agg(m.kilde_nid, ', ' order by m.kilde_nid) into v_mangler
    from _nokkel_map m
   where not exists (select 1 from public.samlinger s where s.kilde_nid = m.kilde_nid);
  if v_mangler is not null then
    raise exception 'STOPP 136: samling(er) med kilde_nid % finnes ikke i prod — uttrekket stemmer ikke.', v_mangler;
  end if;

  -- ALLEREDE KJØRT (nøkler): ingen av de 12 har nokkel fra før.
  select count(*) into n from public.samlinger s
    join _nokkel_map m on m.kilde_nid = s.kilde_nid
   where s.nokkel is not null;
  if n <> 0 then
    raise exception 'STOPP 136 (allerede kjørt): % av de 12 samlingene har allerede en nøkkel.', n;
  end if;

  -- ALLEREDE KJØRT (nye samlinger): ingen laginndeling/nominasjon ennå.
  select count(*) into n from public.samlinger where nokkel in ('laginndeling','nominasjon');
  if n <> 0 then
    raise exception 'STOPP 136 (allerede kjørt): % samling(er) har allerede nokkel laginndeling/nominasjon.', n;
  end if;

  -- Laginndeling: de 4 lekene finnes (på kilde_nid).
  select string_agg(x.knid, ', ' order by x.knid) into v_mangler
    from (values ('2819'),('2820'),('2821'),('6086')) as x(knid)
   where not exists (select 1 from public.ressurser r where r.kilde_nid = x.knid);
  if v_mangler is not null then
    raise exception 'STOPP 136 (laginndeling): lek(er) med kilde_nid % finnes ikke i ressurser.', v_mangler;
  end if;

  -- Laginndeling: PDF-en finnes.
  if not exists (select 1 from public.dokumenter d where d.kilde_nid = '4052') then
    raise exception 'STOPP 136 (laginndeling): dokument «Tips til laginndeling» (kilde_nid 4052) finnes ikke.';
  end if;

  -- Nominasjon: de 4 dokumentene finnes (på kilde_nid).
  select string_agg(x.knid, ', ' order by x.knid) into v_mangler
    from (values ('17740'),('15970'),('57'),('933')) as x(knid)
   where not exists (select 1 from public.dokumenter d where d.kilde_nid = x.knid);
  if v_mangler is not null then
    raise exception 'STOPP 136 (nominasjon): dokument(er) med kilde_nid % finnes ikke i dokumenter.', v_mangler;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- DEL 1 (skriv): navnerydding — fjern ledende «.» / «. » fra alle samlingstitler.
-- ----------------------------------------------------------------------------
update public.samling_innhold
   set tittel = regexp_replace(tittel, '^\.\s*', '')
 where tittel ~ '^\.\s*';

-- ----------------------------------------------------------------------------
-- DEL 2 (skriv): sett nøkler på de 12 eksisterende samlingene.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  update public.samlinger s
     set nokkel = m.nokkel
    from _nokkel_map m
   where s.kilde_nid = m.kilde_nid;
  get diagnostics n = row_count;
  if n <> 12 then raise exception 'STOPP 136 (nøkler): satte % nøkler, forventet 12.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- DEL 3 + 4 (skriv): opprett laginndeling og nominasjon med innhold.
-- ----------------------------------------------------------------------------
do $$
declare
  v_lag uuid;
  v_nom uuid;
  n int;
begin
  -- ---- Laginndeling ----
  insert into public.samlinger (type, synlig, rekkefolge, nokkel)
       values ('redaksjonell', true, 0, 'laginndeling')
    returning id into v_lag;

  insert into public.samling_innhold (samling_id, sprak, tittel) values
    (v_lag, 'nb', 'Laginndeling'),
    (v_lag, 'sv', 'Lagindelning');

  insert into public.samling_ressurs (samling_id, ressurs_id, rekkefolge)
  select v_lag, r.id, x.rk
    from (values ('2819',0),('2820',1),('2821',2),('6086',3)) as x(knid, rk)
    join public.ressurser r on r.kilde_nid = x.knid;
  get diagnostics n = row_count;
  if n <> 4 then raise exception 'STOPP 136 (laginndeling): koblet % leker, forventet 4.', n; end if;

  insert into public.samling_dokument (samling_id, dokument_id, rekkefolge)
  select v_lag, d.id, 0 from public.dokumenter d where d.kilde_nid = '4052';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'STOPP 136 (laginndeling PDF): koblet % dokument, forventet 1.', n; end if;

  -- ---- Nominasjon og TL-praten (uten video, §4.4) ----
  insert into public.samlinger (type, synlig, rekkefolge, nokkel)
       values ('redaksjonell', true, 0, 'nominasjon')
    returning id into v_nom;

  insert into public.samling_innhold (samling_id, sprak, tittel) values
    (v_nom, 'nb', 'Nominasjon og TL-praten'),
    (v_nom, 'sv', 'Nominering och TL-pratet');

  insert into public.samling_dokument (samling_id, dokument_id, rekkefolge)
  select v_nom, d.id, x.rk
    from (values ('17740',0),('15970',1),('57',2),('933',3)) as x(knid, rk)
    join public.dokumenter d on d.kilde_nid = x.knid;
  get diagnostics n = row_count;
  if n <> 4 then raise exception 'STOPP 136 (nominasjon): koblet % dokument, forventet 4.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  -- Ingen ledende punktum-titler igjen.
  select count(*) into n from public.samling_innhold where tittel ~ '^\.\s*';
  if n <> 0 then raise exception 'STOPP 136 (etter): % titler har fortsatt ledende punktum.', n; end if;

  -- Alle 12 nøkler satt.
  select count(*) into n from public.samlinger s
    join _nokkel_map m on m.kilde_nid = s.kilde_nid
   where s.nokkel = m.nokkel;
  if n <> 12 then raise exception 'STOPP 136 (etter): % av 12 nøkler stemmer.', n; end if;

  -- Laginndeling komplett.
  if not exists (select 1 from public.samlinger where nokkel='laginndeling' and synlig) then
    raise exception 'STOPP 136 (etter): laginndeling-samlingen mangler eller er skjult.';
  end if;
  select count(*) into n from public.samling_ressurs sr
    join public.samlinger s on s.id = sr.samling_id where s.nokkel='laginndeling';
  if n <> 4 then raise exception 'STOPP 136 (etter): laginndeling har % leker, forventet 4.', n; end if;
  select count(*) into n from public.samling_dokument sd
    join public.samlinger s on s.id = sd.samling_id where s.nokkel='laginndeling';
  if n <> 1 then raise exception 'STOPP 136 (etter): laginndeling har % dokument, forventet 1.', n; end if;

  -- Nominasjon komplett.
  if not exists (select 1 from public.samlinger where nokkel='nominasjon' and synlig) then
    raise exception 'STOPP 136 (etter): nominasjon-samlingen mangler eller er skjult.';
  end if;
  select count(*) into n from public.samling_dokument sd
    join public.samlinger s on s.id = sd.samling_id where s.nokkel='nominasjon';
  if n <> 4 then raise exception 'STOPP 136 (etter): nominasjon har % dokument, forventet 4.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'nøkler satt (forventet 12): '   || (select count(*) from public.samlinger s join _nokkel_map m on m.kilde_nid=s.kilde_nid where s.nokkel=m.nokkel),
  'laginndeling leker: '           || (select count(*) from public.samling_ressurs sr join public.samlinger s on s.id=sr.samling_id where s.nokkel='laginndeling'),
  'laginndeling dok: '             || (select count(*) from public.samling_dokument sd join public.samlinger s on s.id=sd.samling_id where s.nokkel='laginndeling'),
  'nominasjon dok: '               || (select count(*) from public.samling_dokument sd join public.samlinger s on s.id=sd.samling_id where s.nokkel='nominasjon'),
  'ledende punktum igjen (0): '    || (select count(*) from public.samling_innhold where tittel ~ '^\.\s*')
) as kvittering;

commit;
