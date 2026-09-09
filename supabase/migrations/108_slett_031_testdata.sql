-- ============================================================================
-- 108_slett_031_testdata.sql
-- ============================================================================
-- HVA: fjerner de 20 gjenstaaende testressursene fra migrasjon 031 (alle med
--   kilde_nid = null) med alt avhengig innhold, og i tillegg de tre selvstendige
--   031-objektene: 2 dokumenter («Turneringsskjema», «Tallkort til utskrift») og
--   1 samling («Vinterleker»). Grunnlag: claude_TESTDATA-031-SPESIFIKASJON-8sep.md
--   (REV 4), som er kontrollert i tre uavhengige runder mot prod.
--
-- IKKE IDEMPOTENT — KAN KUN KJOERES EN GANG. Sperre A krever NOEYAKTIG 20 ressurser;
--   en ny kjoering etter commit stopper i Sperre A (0 <> 20), og FOER-tallene som
--   Sperre C sammenligner mot er bare sanne foer foerste kjoering. Dette er villet
--   (jf. REV 3 — G2): migrasjonen skal IKKE bygges idempotent.
--
-- MAA KJOERES FOER INNHOLDSIMPORTEN. Sperre E hviler paa ABSOLUTTE totaler
--   (dokumenter=2, samlinger=1 osv.) som bare er sanne saa lenge prod ikke har
--   importert innhold ennaa. Kjoeres migrasjonen etter importen, stemmer de
--   absolutte tallene ikke lenger, og Sperre E stopper.
--
-- SUPABASE SQL-EDITOR GIR TO ADVARSLER ved kjoering: en om destruktiv operasjon
--   (sletting) og en om at temp-tabellen _031_ids opprettes uten RLS. Begge er
--   forventet og ufarlige. Riktig svar er «Run without RLS» — akkurat som ved
--   migrasjon 106.
--
-- NOEKKEL = de 20 faste UUID-ene (temp-tabell _031_ids), aldri et tittelsoek ved
--   kjoretid: fire ekte importerte leker deler tittel med testdata, saa et tittelsoek
--   etter import ville blandet dem sammen (spesifikasjonen punkt 2, REV 2 — F4).
--
-- FORHAANDSVISNING (les FOER du committer): bytt 'commit;' nederst til 'rollback;',
--   kjoer, les FOER/ETTER, bytt tilbake til 'commit;' og kjoer paa nytt for aa utfoere.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 6.2  Fast ID-liste: de 20 UUID-ene fra spesifikasjonen punkt 2, satt inn
--      eksplisitt. IKKE et tittelsoek ved kjoretid.
-- ----------------------------------------------------------------------------
create temp table _031_ids (id uuid primary key) on commit drop;
insert into _031_ids (id) values
  ('fde6f178-3bd3-49a8-8af9-63fc4c058201'),  -- Aktiv matte-butikk
  ('4e53d040-1281-459d-a202-98e0fa7370ad'),  -- Ballfangeren (med etterslep-mellomrom)
  ('3d3275ea-bb69-4111-abbe-c06f9621d649'),  -- Bli-kjent-sirkel
  ('4e752a9c-a6ce-4cb2-a699-076daa89de03'),  -- Boksen gaar
  ('b2bf5eaa-057c-4482-94cc-54d4f038c0a1'),  -- Erteposejakt
  ('b90f740f-f7d8-4332-95c5-748597e98f1b'),  -- Fruktsalat
  ('39dae76c-aa46-45dc-a782-c23a707ddc73'),  -- Haien kommer
  ('3974109d-99b1-4c2c-bc3a-212002794424'),  -- Hoppeslott-rebus
  ('7140eb11-c621-463f-ba13-f44ae17c0ed5'),  -- Kjeglestafett
  ('061176c1-a909-41cb-9409-aa184afdbe1b'),  -- Kongen befaler
  ('1071523d-f0fa-41b8-90ff-e5265a83c84c'),  -- Navnelek med ball
  ('770a3c4a-3a7d-4aa9-9f3e-f728b853fbbc'),  -- Roedt lys
  ('ba2a4328-a01c-4456-8b4b-184b997cdc58'),  -- Rolige pusteoevelser
  ('2c5f1de0-5f4c-4a44-bc64-c6e4432ce7ce'),  -- Sisten med frys
  ('51c05564-8442-4d4e-8633-f5ac19a6b2fc'),  -- Snoeborg-stafett
  ('2d2f3bcb-2110-4aba-bf7b-82d4a6c3ae51'),  -- Stafett med tallkort
  ('3cffbed6-dbd2-44e6-bf03-27112f0810bd'),  -- Stiv heks
  ('f5685f92-d61e-428d-9b06-5926809253a8'),  -- Tallinjehopp
  ('cb5cb2f0-b0fb-45cc-92ff-54ff4de8a9ad'),  -- Tampen brenner
  ('cc0976c0-ba6d-4b0b-9258-edd9cfc6f030');  -- Uteskole-natursti

-- ----------------------------------------------------------------------------
-- 6.3  SPERRER (A, B, C, D, E) — stopper migrasjonen hvis noe har endret seg
--      siden spesifikasjonen ble skrevet. En feilet sperre ruller tilbake alt.
-- ----------------------------------------------------------------------------

-- Sperre A — riktig antall: NOEYAKTIG 20. Migrasjonen er IKKE idempotent.
do $$ declare n int;
begin
  select count(*) into n from ressurser where id in (select id from _031_ids);
  if n <> 20 then
    raise exception 'STOPP 108 (Sperre A): antall av de 20 031-ressursene er % (forventet noeyaktig 20). Migrasjonen er IKKE idempotent og kan kun kjoeres EN gang. Sletter ingenting.', n;
  end if;
end $$;

-- Sperre B — ingen av de 20 har blitt «ekte»: kilde_nid / import_kjoring_id skal vaere null.
do $$ declare n int;
begin
  select count(*) into n from ressurser
    where id in (select id from _031_ids)
      and (kilde_nid is not null or import_kjoring_id is not null);
  if n > 0 then
    raise exception 'STOPP 108 (Sperre B): % av de 20 har kilde_nid eller import_kjoring_id satt (ekte importkobling). Sletter ingenting.', n;
  end if;
end $$;

-- Sperre C — full tabell-dekning over alle 22 barnetabeller + ressurser (23),
--   men med to ulike krav:
--     '='  = eksakt likhet med FOER-tallet (15 barnetabeller + ressurser selv).
--     '>=' = minst FOER-tallet (7 barnetabeller der ordinaer bruk lovlig kan legge
--            til rader mellom maaling og kjoering).
--   brukslogg har ressurs_id som text — ID-listen castes til text.
do $$ declare r record; msg text := '';
begin
  for r in
    -- eksakt-gruppen (15 barnetabeller + ressurser selv)
    select 'ressurser' as t,
           (select count(*) from ressurser where id in (select id from _031_ids)) as c, 20 as forventet, '=' as krav
    union all select 'ressurs_trinn',
           (select count(*) from ressurs_trinn where ressurs_id in (select id from _031_ids)), 107, '='
    union all select 'ressurs_egnet',
           (select count(*) from ressurs_egnet where ressurs_id in (select id from _031_ids)), 35, '='
    union all select 'ressurs_fag',
           (select count(*) from ressurs_fag where ressurs_id in (select id from _031_ids)), 4, '='
    union all select 'ressurs_sesong',
           (select count(*) from ressurs_sesong where ressurs_id in (select id from _031_ids)), 3, '='
    union all select 'ressurs_trinn_innhold',
           (select count(*) from ressurs_trinn_innhold where ressurs_id in (select id from _031_ids)), 2, '='
    union all select 'ressurs_kompetansemaal',
           (select count(*) from ressurs_kompetansemaal where ressurs_id in (select id from _031_ids)), 2, '='
    union all select 'vurderinger',
           (select count(*) from vurderinger where ressurs_id in (select id from _031_ids)), 2, '='
    union all select 'ressurs_dokument',
           (select count(*) from ressurs_dokument where ressurs_id in (select id from _031_ids)), 1, '='
    union all select 'samling_ressurs',
           (select count(*) from samling_ressurs where ressurs_id in (select id from _031_ids)), 1, '='
    union all select 'ressurs_kompetansemaal_forslag',
           (select count(*) from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _031_ids)), 0, '='
    union all select 'redaksjonell_ko',
           (select count(*) from redaksjonell_ko where ressurs_id in (select id from _031_ids)), 0, '='
    union all select 'ressurs_kategori',
           (select count(*) from ressurs_kategori where ressurs_id in (select id from _031_ids)), 0, '='
    union all select 'popularitet_snapshot',
           (select count(*) from popularitet_snapshot where ressurs_id in (select id from _031_ids)), 0, '='
    union all select 'brukslogg',
           (select count(*) from brukslogg where ressurs_id in (select id::text from _031_ids)), 0, '='
    union all select 'dokumenter',
           (select count(*) from dokumenter where ressurs_id in (select id from _031_ids)), 0, '='
    -- >=-gruppen (7 barnetabeller med legitim loepende bruk)
    union all select 'ressurs_innhold',
           (select count(*) from ressurs_innhold where ressurs_id in (select id from _031_ids)), 21, '>='
    union all select 'ressurs_utstyr',
           (select count(*) from ressurs_utstyr where ressurs_id in (select id from _031_ids)), 7, '>='
    union all select 'medier',
           (select count(*) from medier where ressurs_id in (select id from _031_ids)), 2, '>='
    union all select 'favoritter',
           (select count(*) from favoritter where ressurs_id in (select id from _031_ids)), 1, '>='
    union all select 'bruk_hendelse',
           (select count(*) from bruk_hendelse where ressurs_id in (select id from _031_ids)), 29, '>='
    union all select 'periodeplan_rad',
           (select count(*) from periodeplan_rad where ressurs_id in (select id from _031_ids)), 16, '>='
    union all select 'tl_hjul_lek',
           (select count(*) from tl_hjul_lek where ressurs_id in (select id from _031_ids)), 16, '>='
  loop
    if r.krav = '=' and r.c <> r.forventet then
      msg := msg || format(' %s=%s(forventet %s)', r.t, r.c, r.forventet);
    elsif r.krav = '>=' and r.c < r.forventet then
      msg := msg || format(' %s=%s(forventet >=%s)', r.t, r.c, r.forventet);
    end if;
  end loop;
  if msg <> '' then
    raise exception 'STOPP 108 (Sperre C): tabell-telling avviker fra spesifikasjonen:%. Noe har endret seg siden maalingen. Sletter ingenting.', msg;
  end if;
end $$;

-- Sperre D — brukslogg og dokumenter (for de 20) kan ha faatt rader, siden de har
--   ingen/annen beskyttelse enn kaskade. Lesbar dublett av Sperre C, rett foer sletting.
do $$ declare nb int; nd int;
begin
  select count(*) into nb from brukslogg where ressurs_id in (select id::text from _031_ids);
  select count(*) into nd from dokumenter where ressurs_id in (select id from _031_ids);
  if nb > 0 or nd > 0 then
    raise exception 'STOPP 108 (Sperre D): brukslogg=% dokumenter(ressurs_id)=% for de 20 (forventet 0/0). Disse har ingen/annen beskyttelse enn kaskade og maa haandteres eksplisitt. Sletter ingenting.', nb, nd;
  end if;
end $$;

-- Sperre E — de tre selvstendige 031-objektene finnes fortsatt, og ingen andre gjoer.
--   Ti ABSOLUTTE totaler (maalt i prod 9. sep) + to tellinger paa de faste ID-ene.
--   Beskytter mot at migrasjonen kjoeres etter at importen har lagt inn ekte
--   dokumenter og samlinger.
do $$ declare r record; msg text := '';
begin
  for r in
    select 'dokumenter (totalt)' as t, (select count(*) from dokumenter) as c, 2 as forventet
    union all select 'samlinger (totalt)', (select count(*) from samlinger), 1
    union all select 'samling_innhold (totalt)', (select count(*) from samling_innhold), 1
    union all select 'dokument_fag (totalt)', (select count(*) from dokument_fag), 1
    union all select 'dokument_dokumenttype (totalt)', (select count(*) from dokument_dokumenttype), 0
    union all select 'dokument_sprak (totalt)', (select count(*) from dokument_sprak), 0
    union all select 'samling_dokument (totalt)', (select count(*) from samling_dokument), 0
    union all select 'samling_medie (totalt)', (select count(*) from samling_medie), 0
    union all select 'redaksjonell_ko (dokument_id)', (select count(*) from redaksjonell_ko where dokument_id is not null), 0
    union all select 'redaksjonell_ko (samling_id)', (select count(*) from redaksjonell_ko where samling_id is not null), 0
    -- to tellinger paa de faste ID-ene (de ti totalene alene beviser ikke at det er
    -- nettopp DISSE tre objektene som finnes)
    union all select 'dokumenter (faste id)',
           (select count(*) from dokumenter
              where id in ('2accb4bb-b452-4e48-a2dd-e3278430e3f5', '90e3b407-5700-4add-88b2-8e05b49284b3')), 2
    union all select 'samlinger (fast id)',
           (select count(*) from samlinger where id = '192cc8d7-4f85-4f4b-992a-33ef855c9c28'), 1
  loop
    if r.c <> r.forventet then
      msg := msg || format(' %s=%s(forventet %s)', r.t, r.c, r.forventet);
    end if;
  end loop;
  if msg <> '' then
    raise exception 'STOPP 108 (Sperre E): absolutt telling avviker:%. Importen kan ha kjoert, eller de tre objektene finnes ikke som forventet. Sletter ingenting.', msg;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6.4  FOER-telling: 23 tabeller for de 20 ID-ene + 10 absolutte totaler (fra
--      Sperre E), slik at FOER- og ETTER-blokken er symmetriske.
--      dokumenter og redaksjonell_ko opptrer to ganger med ulik betydning —
--      radene er merket ulikt.
-- ----------------------------------------------------------------------------
select 'FOER' as fase, 'ressurser' as tabell, count(*) as antall from ressurser where id in (select id from _031_ids)
union all select 'FOER','bruk_hendelse', count(*) from bruk_hendelse where ressurs_id in (select id from _031_ids)
union all select 'FOER','favoritter', count(*) from favoritter where ressurs_id in (select id from _031_ids)
union all select 'FOER','medier', count(*) from medier where ressurs_id in (select id from _031_ids)
union all select 'FOER','periodeplan_rad', count(*) from periodeplan_rad where ressurs_id in (select id from _031_ids)
union all select 'FOER','popularitet_snapshot', count(*) from popularitet_snapshot where ressurs_id in (select id from _031_ids)
union all select 'FOER','redaksjonell_ko (for de 20)', count(*) from redaksjonell_ko where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_dokument', count(*) from ressurs_dokument where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_egnet', count(*) from ressurs_egnet where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_fag', count(*) from ressurs_fag where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_innhold', count(*) from ressurs_innhold where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_kategori', count(*) from ressurs_kategori where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_kompetansemaal', count(*) from ressurs_kompetansemaal where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_kompetansemaal_forslag', count(*) from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_sesong', count(*) from ressurs_sesong where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_trinn', count(*) from ressurs_trinn where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_trinn_innhold', count(*) from ressurs_trinn_innhold where ressurs_id in (select id from _031_ids)
union all select 'FOER','ressurs_utstyr', count(*) from ressurs_utstyr where ressurs_id in (select id from _031_ids)
union all select 'FOER','samling_ressurs', count(*) from samling_ressurs where ressurs_id in (select id from _031_ids)
union all select 'FOER','tl_hjul_lek', count(*) from tl_hjul_lek where ressurs_id in (select id from _031_ids)
union all select 'FOER','vurderinger', count(*) from vurderinger where ressurs_id in (select id from _031_ids)
union all select 'FOER','dokumenter (for de 20)', count(*) from dokumenter where ressurs_id in (select id from _031_ids)
union all select 'FOER','brukslogg', count(*) from brukslogg where ressurs_id in (select id::text from _031_ids)
-- 10 absolutte totaler (symmetriske med Sperre E og ETTER)
union all select 'FOER','dokumenter (totalt)', count(*) from dokumenter
union all select 'FOER','samlinger (totalt)', count(*) from samlinger
union all select 'FOER','samling_innhold (totalt)', count(*) from samling_innhold
union all select 'FOER','dokument_fag (totalt)', count(*) from dokument_fag
union all select 'FOER','dokument_dokumenttype (totalt)', count(*) from dokument_dokumenttype
union all select 'FOER','dokument_sprak (totalt)', count(*) from dokument_sprak
union all select 'FOER','samling_dokument (totalt)', count(*) from samling_dokument
union all select 'FOER','samling_medie (totalt)', count(*) from samling_medie
union all select 'FOER','redaksjonell_ko (dokument_id)', count(*) from redaksjonell_ko where dokument_id is not null
union all select 'FOER','redaksjonell_ko (samling_id)', count(*) from redaksjonell_ko where samling_id is not null;

-- ----------------------------------------------------------------------------
-- 6.5  Eksplisitte slettinger, i spesifikasjonens rekkefoelge (foer selve ressursen,
--      slik at ingenting kaskaderer blindt eller nulles).
-- ----------------------------------------------------------------------------
delete from bruk_hendelse         where ressurs_id in (select id from _031_ids);  -- 29 rader, ekte brukslogg fra testkontoene
delete from tl_hjul_lek           where ressurs_id in (select id from _031_ids);  -- 16 rader
delete from periodeplan_rad       where ressurs_id in (select id from _031_ids);  -- 16 rader; SET NULL -> slettes eksplisitt for aa unngaa foreldreloes rad
delete from ressurs_trinn_innhold where ressurs_id in (select id from _031_ids);  -- 2 rader; sammensatt FK CASCADE, tas som ekstra trygghet
delete from favoritter            where ressurs_id in (select id from _031_ids);  -- 1 rad

-- ----------------------------------------------------------------------------
-- 6.6  Slett de 20 ressursene. De resterende 15 barnetabellene rydder seg selv
--      via kaskade (de eksplisitte slettingene over har fjernet det som ikke
--      kaskaderer trygt).
-- ----------------------------------------------------------------------------
delete from ressurser where id in (select id from _031_ids);

-- ----------------------------------------------------------------------------
-- 6.6b  Rydding av de tre selvstendige 031-objektene, paa faste ID-er.
--       dokument_fag (1) og samling_innhold (1) foelger med via kaskade.
-- ----------------------------------------------------------------------------
delete from dokumenter where id in ('2accb4bb-b452-4e48-a2dd-e3278430e3f5',   -- «Turneringsskjema»
                                    '90e3b407-5700-4add-88b2-8e05b49284b3');  -- «Tallkort til utskrift»
delete from samlinger  where id = '192cc8d7-4f85-4f4b-992a-33ef855c9c28';      -- «Vinterleker»

-- ----------------------------------------------------------------------------
-- 6.7  ETTER-telling: samme 23 tabeller (alle 0 for de 20) + de 10 totalene
--      (alle 0 etter kjoering). Radene er merket som i FOER-blokken.
-- ----------------------------------------------------------------------------
select 'ETTER' as fase, 'ressurser' as tabell, count(*) as antall from ressurser where id in (select id from _031_ids)
union all select 'ETTER','bruk_hendelse', count(*) from bruk_hendelse where ressurs_id in (select id from _031_ids)
union all select 'ETTER','favoritter', count(*) from favoritter where ressurs_id in (select id from _031_ids)
union all select 'ETTER','medier', count(*) from medier where ressurs_id in (select id from _031_ids)
union all select 'ETTER','periodeplan_rad', count(*) from periodeplan_rad where ressurs_id in (select id from _031_ids)
union all select 'ETTER','popularitet_snapshot', count(*) from popularitet_snapshot where ressurs_id in (select id from _031_ids)
union all select 'ETTER','redaksjonell_ko (for de 20)', count(*) from redaksjonell_ko where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_dokument', count(*) from ressurs_dokument where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_egnet', count(*) from ressurs_egnet where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_fag', count(*) from ressurs_fag where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_innhold', count(*) from ressurs_innhold where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_kategori', count(*) from ressurs_kategori where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_kompetansemaal', count(*) from ressurs_kompetansemaal where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_kompetansemaal_forslag', count(*) from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_sesong', count(*) from ressurs_sesong where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_trinn', count(*) from ressurs_trinn where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_trinn_innhold', count(*) from ressurs_trinn_innhold where ressurs_id in (select id from _031_ids)
union all select 'ETTER','ressurs_utstyr', count(*) from ressurs_utstyr where ressurs_id in (select id from _031_ids)
union all select 'ETTER','samling_ressurs', count(*) from samling_ressurs where ressurs_id in (select id from _031_ids)
union all select 'ETTER','tl_hjul_lek', count(*) from tl_hjul_lek where ressurs_id in (select id from _031_ids)
union all select 'ETTER','vurderinger', count(*) from vurderinger where ressurs_id in (select id from _031_ids)
union all select 'ETTER','dokumenter (for de 20)', count(*) from dokumenter where ressurs_id in (select id from _031_ids)
union all select 'ETTER','brukslogg', count(*) from brukslogg where ressurs_id in (select id::text from _031_ids)
union all select 'ETTER','dokumenter (totalt)', count(*) from dokumenter
union all select 'ETTER','samlinger (totalt)', count(*) from samlinger
union all select 'ETTER','samling_innhold (totalt)', count(*) from samling_innhold
union all select 'ETTER','dokument_fag (totalt)', count(*) from dokument_fag
union all select 'ETTER','dokument_dokumenttype (totalt)', count(*) from dokument_dokumenttype
union all select 'ETTER','dokument_sprak (totalt)', count(*) from dokument_sprak
union all select 'ETTER','samling_dokument (totalt)', count(*) from samling_dokument
union all select 'ETTER','samling_medie (totalt)', count(*) from samling_medie
union all select 'ETTER','redaksjonell_ko (dokument_id)', count(*) from redaksjonell_ko where dokument_id is not null
union all select 'ETTER','redaksjonell_ko (samling_id)', count(*) from redaksjonell_ko where samling_id is not null;

-- ----------------------------------------------------------------------------
-- 6.8  Avsluttende sperre: stopp og rull tilbake hvis noen av de 23 tabellene
--      viser >0 for de 20 ID-ene, ELLER noen av de 10 totalene viser >0.
--      Ikke commit en migrasjon som ikke fullfoerte jobben sin.
-- ----------------------------------------------------------------------------
do $$ declare r record; msg text := '';
begin
  for r in
    select 'ressurser' as t, count(*) as c from ressurser where id in (select id from _031_ids)
    union all select 'bruk_hendelse', count(*) from bruk_hendelse where ressurs_id in (select id from _031_ids)
    union all select 'favoritter', count(*) from favoritter where ressurs_id in (select id from _031_ids)
    union all select 'medier', count(*) from medier where ressurs_id in (select id from _031_ids)
    union all select 'periodeplan_rad', count(*) from periodeplan_rad where ressurs_id in (select id from _031_ids)
    union all select 'popularitet_snapshot', count(*) from popularitet_snapshot where ressurs_id in (select id from _031_ids)
    union all select 'redaksjonell_ko (for de 20)', count(*) from redaksjonell_ko where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_dokument', count(*) from ressurs_dokument where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_egnet', count(*) from ressurs_egnet where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_fag', count(*) from ressurs_fag where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_innhold', count(*) from ressurs_innhold where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_kategori', count(*) from ressurs_kategori where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_kompetansemaal', count(*) from ressurs_kompetansemaal where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_kompetansemaal_forslag', count(*) from ressurs_kompetansemaal_forslag where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_sesong', count(*) from ressurs_sesong where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_trinn', count(*) from ressurs_trinn where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_trinn_innhold', count(*) from ressurs_trinn_innhold where ressurs_id in (select id from _031_ids)
    union all select 'ressurs_utstyr', count(*) from ressurs_utstyr where ressurs_id in (select id from _031_ids)
    union all select 'samling_ressurs', count(*) from samling_ressurs where ressurs_id in (select id from _031_ids)
    union all select 'tl_hjul_lek', count(*) from tl_hjul_lek where ressurs_id in (select id from _031_ids)
    union all select 'vurderinger', count(*) from vurderinger where ressurs_id in (select id from _031_ids)
    union all select 'dokumenter (for de 20)', count(*) from dokumenter where ressurs_id in (select id from _031_ids)
    union all select 'brukslogg', count(*) from brukslogg where ressurs_id in (select id::text from _031_ids)
    -- de 10 totalene skal naa vaere 0
    union all select 'dokumenter (totalt)', count(*) from dokumenter
    union all select 'samlinger (totalt)', count(*) from samlinger
    union all select 'samling_innhold (totalt)', count(*) from samling_innhold
    union all select 'dokument_fag (totalt)', count(*) from dokument_fag
    union all select 'dokument_dokumenttype (totalt)', count(*) from dokument_dokumenttype
    union all select 'dokument_sprak (totalt)', count(*) from dokument_sprak
    union all select 'samling_dokument (totalt)', count(*) from samling_dokument
    union all select 'samling_medie (totalt)', count(*) from samling_medie
    union all select 'redaksjonell_ko (dokument_id)', count(*) from redaksjonell_ko where dokument_id is not null
    union all select 'redaksjonell_ko (samling_id)', count(*) from redaksjonell_ko where samling_id is not null
  loop
    if r.c > 0 then msg := msg || format(' %s=%s', r.t, r.c); end if;
  end loop;
  if msg <> '' then
    raise exception 'STOPP 108 (avsluttende sperre): tabell(er) er ikke tomme etter sletting:%. Ruller tilbake.', msg;
  end if;
end $$;

commit;
