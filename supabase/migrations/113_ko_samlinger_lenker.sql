-- ============================================================================
-- 113_ko_samlinger_lenker.sql — redaksjonskøen: samlinger og lenker
-- ============================================================================
-- KILDE (fasit): claude_KO-VURDERINGER-FORSLAG-10sep.md + Kjartans rettelser R1–R5
--   (10. sep). Alle verdier er utledet ved å kjøre importens EGEN logikk
--   (scripts/import/lib/{regler,uuid,samlingpass}.mjs) mot 240826-eksporten uten base;
--   tallene er verifisert mot lenkesamlinger-lenker.csv og game-nodes.json.
--
-- HVA (tre ting, én transaksjon):
--   1) Ny publisert lek «Stein, saks, papir-runden» (nid 13661, R2). Den ble aldri
--      importert fordi den var avpublisert; nå publiseres den. Bygget med importens
--      byggLek-regler (antall R2, kategori 388, utstyr 357, trinn BH+B+U+K, sprak nb).
--   2) Korrigerte samling→lek-lenker (forslag 1.1 + R1 + R2): 8 nye medlemskap +
--      «Alle mot alle» som ALLEREDE er medlem (kun kø lukkes, i 114). Hver nytt
--      medlem merkes med samlingens egnet_kategori (vei A, som samlingspass.mjs).
--   3) Ny redaksjonell samling «TL-dans» med de 16 publiserte TL-dans-lekene
--      (nid 1406–1420 + 9698), i nummerrekkefølge (forslag 1.2).
--
-- MATCHING: alltid på kilde_nid (aldri tittel). Nye rader får deterministiske id-er
--   (samme md5-skjema som importen: detUuid), så en senere kjøring ikke lager dubletter.
--
-- IKKE HER (rapportert i TIL CLAUDE, ikke bygget):
--   * SAMLING→SAMLING finnes IKKE i datamodellen (samling_ressurs.ressurs_id →
--     ressurser). De 6 «/tl-dans»-lenkene (samling 15468/19696/16072/16073/15510/16074)
--     kan derfor IKKE pekes til den nye TL-dans-samlingen. Deres lenke_ulost-rader
--     BLIR STÅENDE ÅPNE. Alternativ foreslås i TIL CLAUDE.
--   * Piloten (nid 1071) og Ballongdansen (nid 1385) i «Tipsliste sosial kompetanse»:
--     lenkene (http://Piloten / http://Ballongdansen) er EKSTERNE i importen (matcher
--     ikke trivselsleder.no) og gir INGEN kø-rad — de skippes stille. R1 retter dem til
--     lekene, så vi legger til medlemskapene her; det finnes ingen kø-rad å lukke.
--   * 4 samle-videoer (forslag 1.3): de 3 importerbare (nid 20030/18822/16190) er
--     ALLEREDE samling_medie og koblet til Bunny (status 4) av migr 110. Den 4. (host
--     2025, samling nid 17734) hører til en AVPUBLISERT lenkesamling (FLAG D) som aldri
--     ble importert → ingen samling_medie-rad → kan ikke kobles. 113 bygger derfor
--     INGEN samling_medie-rad. Rapportert.
--   * «Alle sammen ut av huset» (nid 2718): lenke_upublisert uten samling_ressurs →
--     «fjernes» = lukk kø-raden (gjøres i 114).
--   * Kø-lukking for de håndterte lenkene skjer samlet i 114.
--
-- SPERRER: «allerede kjørt»-stopp (TL-dans-samlingen finnes), alle berørte samlinger
--   og mål-leker finnes (via kilde_nid), kategori 388 / utstyr 357 finnes. ETTER-sperre
--   teller nye rader. Idempotent via on conflict; re-kjøring stopper på «allerede kjørt».
--
-- TILBAKERULLING (etter commit, hvis nødvendig):
--   begin;
--   delete from samling_ressurs where samling_id = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
--   delete from samling_innhold  where samling_id = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
--   delete from samlinger        where id         = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
--   -- Korrigerte medlemskap (append) + egnet + den nye leken må evt. fjernes manuelt
--   -- (se kilde_nid 13661 / de 8 samling_ressurs-radene lagt til her).
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SPERRER FØR (én do-blokk): allerede-kjørt + alle forutsetninger finnes.
-- ----------------------------------------------------------------------------
do $$
declare
  v_tldans uuid := '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
  n int;
begin
  if exists (select 1 from samlinger where id = v_tldans) then
    raise exception 'STOPP 113 (allerede kjørt): TL-dans-samlingen (%) finnes allerede. Ingenting endret.', v_tldans;
  end if;

  -- Alle berørte samlinger finnes (via kilde_nid).
  select count(*) into n from (values ('15468'),('15510'),('16212'),('19390'),('19389'),('19696'),('16072')) v(nid)
    where not exists (select 1 from samlinger s where s.kilde_nid = v.nid);
  if n <> 0 then raise exception 'STOPP 113: % berørte samling(er) mangler i basen (via kilde_nid).', n; end if;

  -- Alle mål-leker finnes (link-mål + 16 TL-dans-leker). 13661 lages under, så den er ikke med her.
  select count(*) into n from (values
      ('10582'),('10584'),('13657'),('17073'),('1071'),('1385'),
      ('1406'),('1407'),('1408'),('1409'),('1410'),('1411'),('1412'),('1413'),
      ('1414'),('1415'),('1416'),('1417'),('1418'),('1419'),('1420'),('9698')) v(nid)
    where not exists (select 1 from ressurser r where r.kilde_nid = v.nid);
  if n <> 0 then raise exception 'STOPP 113: % mål-lek(er) mangler i basen (via kilde_nid).', n; end if;

  if not exists (select 1 from kategorier where kilde_tid = 388) then raise exception 'STOPP 113: kategori kilde_tid 388 (Stein-saks-papir) mangler.'; end if;
  if not exists (select 1 from utstyr     where kilde_tid = 357) then raise exception 'STOPP 113: utstyr kilde_tid 357 (Markeringstallerkener) mangler.'; end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) NY LEK: «Stein, saks, papir-runden» (nid 13661, R2) — importens byggLek-resultat.
--    id = detUuid('game','13661'). status=publisert (var avpublisert i kilden).
--    Video finnes i eksporten (file-18085 mp4) — RAPPORTERES, lastes IKKE opp her.
-- ----------------------------------------------------------------------------
insert into ressurser(id, kilde_nid, import_kjoring_id, ressurstype, sted, antall_min, antall_maks, status)
values ('5e93cf13-4e9d-abc6-7f4e-109f00b75bd7', '13661', null, 'lek', null, 4, null, 'publisert')
on conflict (id) do nothing;

insert into ressurs_innhold(ressurs_id, sprak, tittel, beskrivelse, antall_raatekst, ferskhet)
values ('5e93cf13-4e9d-abc6-7f4e-109f00b75bd7', 'nb', 'Stein, saks, papir-runden',
$beskr$<p><b>Antall: </b>4 eller flere <br><b>Utstyr: </b>4-5 markeringstallerkener/kjegler </p>
<p>Sett opp 4-5 kjegler i et kvadrat/femkant (5-7 meter mellom hver). Alle deltakerne stiller seg ved den første kjeglen. Når aktiviteten starter snur man seg til naboen og utfordrer hen i stein, saks, papir. Vinneren løper med klokka og videre til neste kjegle og finner en ny utfordrer. Den som taper duellen, blir værende ved den kjeglen. Vinner man den siste duellen på kjegle 4/5 har man klart en runde og får ett poeng. Da kan man starte på en ny runde. </p>
<p><b>Varianter </b></p>
<ul>
<li>For å gjøre det vanskeligere kan man bestemme at den som taper i en duell må rygge tilbake til markeringstellerkenen/kjeglen (gjelder ikke ved start). </li>
<li>Om man ønsker flere stopp langs banen setter man bare opp flere markeringstallerkner/kjegler som deltakerne skal duellere ved. </li>
</ul>
<p>Tips til trivselslederne! <br>Det er ekstra morsomt om dere bygger en hinderløype som deltakerne må løpe gjennom for å komme seg til neste markeringstallerken/ kjegle. </p>
<p><b>Hopp-inn-vennlig: </b>Dersom aktiviteten er i gang er det bare å gå til den første markeringstallerkene/kjeglene og finne en deltaker som du kan gjøre «stein, saks, papir» med.</p>$beskr$,
  '4 eller flere', 'gjeldende')
on conflict (ressurs_id, sprak) do nothing;

insert into ressurs_kategori(ressurs_id, kategori_id)
  select '5e93cf13-4e9d-abc6-7f4e-109f00b75bd7', id from kategorier where kilde_tid = 388
on conflict (ressurs_id, kategori_id) do nothing;

insert into ressurs_utstyr(ressurs_id, utstyr_id)
  select '5e93cf13-4e9d-abc6-7f4e-109f00b75bd7', id from utstyr where kilde_tid = 357
on conflict (ressurs_id, utstyr_id) do nothing;

insert into ressurs_trinn(ressurs_id, trinn_id)
  select '5e93cf13-4e9d-abc6-7f4e-109f00b75bd7', id from trinn
   where land = 'NO' and kode in ('bhg','1','2','3','4','5','6','7','8','9','10')
on conflict (ressurs_id, trinn_id) do nothing;

-- ----------------------------------------------------------------------------
-- 2) KORRIGERTE LENKER → samling_ressurs (append sist per samling) + vei A egnet.
--    seksjon = null (importen setter aldri seksjon). rekkefolge = max i samlingen + rn
--    (append; eksakt original-posisjon lar seg ikke rekonstruere uten å renummerere
--    de andre radene — derfor legges de sist, jf. oppdraget).
--    «Alle mot alle» (13659) er IKKE med: den er allerede medlem av 15468 via en
--    virkende lenke (alle-mot-alle-0). Kun kø-raden lukkes (114).
-- ----------------------------------------------------------------------------
with korr(s_nid, l_nid, egnet_navn) as (values
    ('15468','10582','SFO/AKS'),               -- High five
    ('15468','13657','SFO/AKS'),               -- Kjegleduellen
    ('15468','10584','SFO/AKS'),               -- Spagaten
    ('15468','13661','SFO/AKS'),               -- Stein, saks, papir-runden (R2)
    ('15510','10584','FYSAK'),                 -- Spagaten
    ('16212','17073',null),                    -- Popcorn (Månedens Move it: ingen egnet)
    ('19390','1071','Sosial kompetanse'),      -- Piloten (R1)
    ('19390','1385','Sosial kompetanse'),      -- Ballongdansen (R1)
    ('19389','13661',null),                    -- SSP (Favoritter: ingen egnet)
    ('19696','13661','Leker for 100+ elever'), -- SSP
    ('16072','13661',null)                     -- SSP (KRØ: ingen egnet)
),
resolved as (
  select s.id as sid, r.id as rid, k.egnet_navn,
         row_number() over (partition by s.id order by k.l_nid) as rn
  from korr k
  join samlinger s on s.kilde_nid = k.s_nid
  join ressurser r on r.kilde_nid = k.l_nid
)
insert into samling_ressurs(samling_id, ressurs_id, rekkefolge, seksjon)
select rv.sid, rv.rid,
       (select coalesce(max(sr.rekkefolge), -1) from samling_ressurs sr where sr.samling_id = rv.sid) + rv.rn,
       null
from resolved rv
on conflict (samling_id, ressurs_id) do nothing;

-- vei A: hvert nytt medlem merkes med samlingens egnet_kategori (der samlingen har en).
insert into ressurs_egnet(ressurs_id, egnet_id)
select r.id, e.id
from (values
    ('15468','10582','SFO/AKS'),('15468','13657','SFO/AKS'),('15468','10584','SFO/AKS'),('15468','13661','SFO/AKS'),
    ('15510','10584','FYSAK'),
    ('19390','1071','Sosial kompetanse'),('19390','1385','Sosial kompetanse'),
    ('19696','13661','Leker for 100+ elever')) k(s_nid, l_nid, egnet_navn)
join ressurser r on r.kilde_nid = k.l_nid
join egnet_kategori e on lower(e.navn) = lower(k.egnet_navn)
on conflict (ressurs_id, egnet_id) do nothing;

-- ----------------------------------------------------------------------------
-- 3) NY SAMLING «TL-dans» + 16 medlemmer (nid 1406–1420, 9698 i nummerrekkefølge).
-- ----------------------------------------------------------------------------
insert into samlinger(id, type, synlig, rekkefolge, kilde_nid, kilde_tid, import_kjoring_id)
values ('8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea', 'redaksjonell', true, 0, null, null, null);

insert into samling_innhold(samling_id, sprak, tittel, beskrivelse)
values ('8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea', 'nb', 'TL-dans',
  'Samling av alle TL-dansene (TL-dans 1–15 og TL-dans 28).');

insert into samling_ressurs(samling_id, ressurs_id, rekkefolge, seksjon)
select '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea', r.id, x.rk, null
from (values
    ('1406',0),('1407',1),('1408',2),('1409',3),('1410',4),('1411',5),('1412',6),('1413',7),
    ('1414',8),('1415',9),('1416',10),('1417',11),('1418',12),('1419',13),('1420',14),('9698',15)) x(nid, rk)
join ressurser r on r.kilde_nid = x.nid;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER: nye rader stemmer.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  if not exists (select 1 from ressurser where kilde_nid = '13661' and status = 'publisert') then
    raise exception 'STOPP 113 (etter): Stein-saks-papir-leken (13661) ble ikke publisert.';
  end if;
  select count(*) into n from samling_ressurs where samling_id = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
  if n <> 16 then raise exception 'STOPP 113 (etter): TL-dans-samlingen har % medlemmer, forventet 16.', n; end if;
  -- de 11 korrigerte medlemskapene (13659 utelatt) skal alle finnes nå.
  select count(*) into n from (values
      ('15468','10582'),('15468','13657'),('15468','10584'),('15468','13661'),
      ('15510','10584'),('16212','17073'),('19390','1071'),('19390','1385'),
      ('19389','13661'),('19696','13661'),('16072','13661')) v(s_nid, l_nid)
    where not exists (
      select 1 from samling_ressurs sr
      join samlinger s on s.id = sr.samling_id and s.kilde_nid = v.s_nid
      join ressurser r on r.id = sr.ressurs_id and r.kilde_nid = v.l_nid);
  if n <> 0 then raise exception 'STOPP 113 (etter): % korrigert(e) lenke(r) ble ikke medlem.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les etter kjøring).
-- ----------------------------------------------------------------------------
select
  (select count(*) from ressurser where kilde_nid = '13661' and status = 'publisert')            as ssp_publisert,
  (select count(*) from samling_ressurs where samling_id = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea') as tldans_medlemmer,
  (select string_agg(x, ', ' order by x) from (
     select s.kilde_nid || '→' || r.kilde_nid as x
     from samling_ressurs sr
     join samlinger s on s.id = sr.samling_id
     join ressurser r on r.id = sr.ressurs_id
     where s.kilde_nid in ('15468','15510','16212','19390','19389','19696','16072')
       and r.kilde_nid in ('10582','13657','10584','13661','17073','1071','1385')
   ) t)                                                                                            as korrigerte_medlemskap;

commit;
