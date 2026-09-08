-- ============================================================================
-- 102_slett_034_testdata.sql — REV 2 (rettet etter Fable-kontroll, funn B1 + B2)
-- ============================================================================
-- HVA: fjerner de 20 proevelekene migr 034 la inn (Ramsalt 26. juni-utviklingssett)
-- med alt avhengig innhold, FOER den ekte importen kjoerer. Grunnlag:
-- claude_034-TESTDATA-O-4sep.md + claude_KONTROLLFASIT-OG-KONTROLL-102-4sep.md (B1/B2).
--
-- HVORFOR FOER IMPORT: importen bruker SAMME deterministiske UUID som 034 (md5("game-<nid>")).
--   1) ressurs_innhold: importen skriver beskrivelse men nuller ikke 034s kronologi -> stoey.
--   2) medier: 034s bilde-pekere har TILFELDIG id; importen faar en ANNEN (saltet) id -> dubletter.
--   Sletter vi radene foerst, gjoer importen rene innsettinger.
--
-- NOEKKEL = de 20 deterministiske UUID-ene (temp-tabell _034_ids). IKKE 'kilde_nid IS NULL'
--   (den ville tatt 031s testleker ogsaa, et eget spoersmaal utenfor punkt O).
--
-- SYV EKSTRA RADER SOM SLETTES (utover 034s egne 20 ressurser + innhold/utstyr/medier):
--   favoritter 1, bruk_hendelse 5, periodeplan_rad 1 = 7 rader. De tilhoerer brukeren
--   3ea00759-4bf0-43f2-a79a-86ff5840618b = 'Test Bjoernehaugen' (kjartaneide+bjornehaugen@me.com,
--   skoleadmin) — Kjartans EGEN testkonto. Datoene er 2.-3. sep, midt i testarbeidet. De skal
--   slettes, men BEVISST og synlig (staar i FOER/ETTER), ikke stille via cascade.
--
-- RETTET I REV 2:
--   B1: det gamle 'medier-vernet' (slett kun der kilde_nid is null) var en ILLUSJON — delete
--       from ressurser kaskaderer og tar medier med kilde_nid satt likevel. Fjernet. Erstattet
--       med en EKTE sperre FOER foerste delete: stopp hvis noen av de 9 mediene har kilde_nid satt.
--   B2: ressurser har 20 barne-FK (18 cascade + 2 set null), ikke tre. FOER/ETTER viser naa ALLE
--       20 + ressurser. De 14 som skal vaere 0 er GATET (stopp hvis rader). De 6 som lovlig kan ha
--       rader (034s egne + testkontoen) telles og slettes, men gates IKKE paa eksakt tall —
--       bruk_hendelse kan vokse hvis noen aapner en leke foer kjoering.
--   periodeplan_rad (SET NULL): cascade ville nullet ressurs_id og etterlatt en rad som peker paa
--       INGENTING. En nullet peker er verre enn en fjernet rad, saa raden slettes EKSPLISITT.
--       Kjent rad: id 5c562728-94be-4553-ab6c-4a94981172dd (plan e512133b-...), samme testkonto.
--
-- BEHOLDT: kilde_nid-selvvernet paa ressurser, idempotens, forhaandsvisning m/rollback, EN transaksjon.
--
-- FORHAANDSVISNING (les FOER du committer): bytt 'commit;' nederst til 'rollback;', kjoer, les
--   FOER/ETTER, bytt tilbake til 'commit;' og kjoer paa nytt for aa utfoere slettingen.
-- IDEMPOTENT: etter fullfoert sletting er de 20 borte -> alle gates teller 0, alle delete treffer 0.
-- ============================================================================

begin;

-- (a) De 20 deterministiske UUID-ene fra migr 034.
create temp table _034_ids (id uuid primary key) on commit drop;
insert into _034_ids (id) values
  ('145b07af-f39a-bcd5-4fec-31957530834d'), ('2157baa1-c37a-998e-32a0-4f5dcb66ed96'),
  ('2f99cf8c-321c-5af0-a74a-9efa8511dcc3'), ('32a91df5-6788-1407-3414-6737d95a170f'),
  ('3820b754-2bc0-a877-c52f-0a1c45d313ed'), ('42c10c61-65b6-5fab-4b00-5bb3f74ee644'),
  ('492e7c53-f6ec-e9ce-d3be-80df76217709'), ('57b36cb8-56cc-618d-8d08-e21406828091'),
  ('5f8535a6-fa03-988f-5503-d4710943a86a'), ('86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c'),
  ('8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9'), ('90a51fab-e4c2-df2d-1ef9-779f3d14de61'),
  ('9d980823-b374-0d9e-1c60-9bc878bc3255'), ('acdd94fd-a32b-91a3-df56-10ceff172ffb'),
  ('b1a296a7-64aa-866c-c1a4-09ddd063a8d6'), ('c8e533d3-7f44-4f97-1aa0-c64a7f8763c4'),
  ('cc8d560a-dab8-8611-7ce8-88a617cf797a'), ('cd254c96-fb49-f760-4f78-ff8e2c64d820'),
  ('e2d23ff9-d0f0-4b66-a622-7a173c4384f1'), ('edd54848-ae92-90fc-6335-20b8ff525b63');

-- (b) SELVVERN 1 (beholdt): stopp hvis EKTE (importert) innhold har overtatt noen av de 20 id-ene.
do $$ declare n int;
begin
  select count(*) into n from ressurser r join _034_ids i on i.id=r.id where r.kilde_nid is not null;
  if n > 0 then
    raise exception 'STOPP 102 (selvvern): % av de 20 034-ressursene har kilde_nid satt (ekte importert data). Sletter ingenting.', n;
  end if;
end $$;

-- (c) SELVVERN 2 (B1, EKTE medier-sperre): stopp hvis noen av mediene paa de 20 har kilde_nid satt.
--     (Erstatter det gamle illusoriske filteret. Cascade ville ellers tatt dem stille.)
do $$ declare n int;
begin
  select count(*) into n from medier m where m.ressurs_id in (select id from _034_ids) and m.kilde_nid is not null;
  if n > 0 then
    raise exception 'STOPP 102 (B1): % medie(r) paa de 20 034-lekene har kilde_nid satt (ekte data). Sletter ingenting.', n;
  end if;
end $$;

-- (d) SELVVERN 3 (B2): stopp hvis noen av de 14 tabellene som skal vaere 0 har rader for de 20.
--     Da har noe endret seg siden maalingen 4. sep, og det skal ikke gaa stille.
--     (18 cascade + 2 set null = 20 barne-FK; de 6 i MAY telles/slettes, de 14 her gates.)
do $$ declare r record; msg text := '';
begin
  for r in
    select 'popularitet_snapshot' as t, count(*) as c from popularitet_snapshot where ressurs_id in (select id from _034_ids)
    union all select 'redaksjonell_ko' as t, count(*) as c from redaksjonell_ko where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_dokument' as t, count(*) as c from ressurs_dokument where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_egnet' as t, count(*) as c from ressurs_egnet where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_fag' as t, count(*) as c from ressurs_fag where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_kategori' as t, count(*) as c from ressurs_kategori where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_kompetansemaal' as t, count(*) as c from ressurs_kompetansemaal where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_kompetansemaal_forslag' as t, count(*) as c from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_sesong' as t, count(*) as c from ressurs_sesong where ressurs_id in (select id from _034_ids)
    union all select 'ressurs_trinn' as t, count(*) as c from ressurs_trinn where ressurs_id in (select id from _034_ids)
    union all select 'samling_ressurs' as t, count(*) as c from samling_ressurs where ressurs_id in (select id from _034_ids)
    union all select 'tl_hjul_lek' as t, count(*) as c from tl_hjul_lek where ressurs_id in (select id from _034_ids)
    union all select 'vurderinger' as t, count(*) as c from vurderinger where ressurs_id in (select id from _034_ids)
    union all select 'dokumenter' as t, count(*) as c from dokumenter where ressurs_id in (select id from _034_ids)
  loop
    if r.c > 0 then msg := msg || format(' %s=%s', r.t, r.c); end if;
  end loop;
  if msg <> '' then
    raise exception 'STOPP 102 (B2): tabell(er) som skulle vaere 0 har rader for de 20 lekene:%. Noe har endret seg siden maalingen 4. sep. Sletter ingenting.', msg;
  end if;
end $$;

-- (e) FOER-kvittering: ressurser + ALLE 20 barnetabeller (antall for de 20 id-ene).
--     Forventet prod 4. sep: ressurser 20, ressurs_innhold 20, ressurs_utstyr 35, medier 9,
--     favoritter 1, bruk_hendelse 5, periodeplan_rad 1, alt annet 0.
select 'FOER' as fase, 'ressurser' as tabell, count(*) as antall from ressurser where id in (select id from _034_ids)
union all select 'FOER','bruk_hendelse', count(*) from bruk_hendelse where ressurs_id in (select id from _034_ids)
union all select 'FOER','favoritter', count(*) from favoritter where ressurs_id in (select id from _034_ids)
union all select 'FOER','medier', count(*) from medier where ressurs_id in (select id from _034_ids)
union all select 'FOER','popularitet_snapshot', count(*) from popularitet_snapshot where ressurs_id in (select id from _034_ids)
union all select 'FOER','redaksjonell_ko', count(*) from redaksjonell_ko where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_dokument', count(*) from ressurs_dokument where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_egnet', count(*) from ressurs_egnet where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_fag', count(*) from ressurs_fag where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_innhold', count(*) from ressurs_innhold where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_kategori', count(*) from ressurs_kategori where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_kompetansemaal', count(*) from ressurs_kompetansemaal where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_kompetansemaal_forslag', count(*) from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_sesong', count(*) from ressurs_sesong where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_trinn', count(*) from ressurs_trinn where ressurs_id in (select id from _034_ids)
union all select 'FOER','ressurs_utstyr', count(*) from ressurs_utstyr where ressurs_id in (select id from _034_ids)
union all select 'FOER','samling_ressurs', count(*) from samling_ressurs where ressurs_id in (select id from _034_ids)
union all select 'FOER','tl_hjul_lek', count(*) from tl_hjul_lek where ressurs_id in (select id from _034_ids)
union all select 'FOER','vurderinger', count(*) from vurderinger where ressurs_id in (select id from _034_ids)
union all select 'FOER','dokumenter', count(*) from dokumenter where ressurs_id in (select id from _034_ids)
union all select 'FOER','periodeplan_rad', count(*) from periodeplan_rad where ressurs_id in (select id from _034_ids);

-- (f) SLETT. Foerst de 6 barnetabellene som lovlig kan ha rader (for aa telle dem eksplisitt),
--     inkl. periodeplan_rad (SET NULL) som slettes i stedet for aa bli nullet. Deretter forelder
--     (cascade rydder ev. rest — de 14 gatede er bevist 0 av selvvern 3).
delete from ressurs_innhold where ressurs_id in (select id from _034_ids);
delete from ressurs_utstyr  where ressurs_id in (select id from _034_ids);
delete from medier          where ressurs_id in (select id from _034_ids);  -- alle (B1-sperren garanterer 0 med kilde_nid)
delete from favoritter      where ressurs_id in (select id from _034_ids);
delete from bruk_hendelse   where ressurs_id in (select id from _034_ids);
delete from periodeplan_rad where ressurs_id in (select id from _034_ids);  -- eksplisitt: unngaar nullet peker (id 5c562728-...)
delete from ressurser       where id         in (select id from _034_ids);

-- (g) ETTER-kvittering: alle skal vaere 0.
select 'ETTER' as fase, 'ressurser' as tabell, count(*) as antall from ressurser where id in (select id from _034_ids)
union all select 'ETTER','bruk_hendelse', count(*) from bruk_hendelse where ressurs_id in (select id from _034_ids)
union all select 'ETTER','favoritter', count(*) from favoritter where ressurs_id in (select id from _034_ids)
union all select 'ETTER','medier', count(*) from medier where ressurs_id in (select id from _034_ids)
union all select 'ETTER','popularitet_snapshot', count(*) from popularitet_snapshot where ressurs_id in (select id from _034_ids)
union all select 'ETTER','redaksjonell_ko', count(*) from redaksjonell_ko where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_dokument', count(*) from ressurs_dokument where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_egnet', count(*) from ressurs_egnet where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_fag', count(*) from ressurs_fag where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_innhold', count(*) from ressurs_innhold where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_kategori', count(*) from ressurs_kategori where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_kompetansemaal', count(*) from ressurs_kompetansemaal where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_kompetansemaal_forslag', count(*) from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_sesong', count(*) from ressurs_sesong where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_trinn', count(*) from ressurs_trinn where ressurs_id in (select id from _034_ids)
union all select 'ETTER','ressurs_utstyr', count(*) from ressurs_utstyr where ressurs_id in (select id from _034_ids)
union all select 'ETTER','samling_ressurs', count(*) from samling_ressurs where ressurs_id in (select id from _034_ids)
union all select 'ETTER','tl_hjul_lek', count(*) from tl_hjul_lek where ressurs_id in (select id from _034_ids)
union all select 'ETTER','vurderinger', count(*) from vurderinger where ressurs_id in (select id from _034_ids)
union all select 'ETTER','dokumenter', count(*) from dokumenter where ressurs_id in (select id from _034_ids)
union all select 'ETTER','periodeplan_rad', count(*) from periodeplan_rad where ressurs_id in (select id from _034_ids);

commit;
