-- ============================================================================
-- 124_samling_innledninger_og_plasseringer.sql — fyll innledninger + plasseringer
-- ============================================================================
-- KILDE (fasit): v3-uttrekket i _kontroll-import/samlingstekster/v3/ (innledninger.json md5
--   4e8c66a4…, plassering.csv 65e22c23…), Fable-kontrollert 12. sep (BESTÅTT MED FUNN,
--   claude_KONTROLL-fable-samlingstekster-v3-12sep.md). Importen satte beskrivelse=null og
--   seksjon=null; tekstene er trukket ut på nytt og fylles her. Samlinger identifiseres på
--   kilde_nid (aldri tittel). Data er innebygd som VALUES (uttrekket kan ikke leses i editoren).
--
-- HVA (fire deler):
--   1) samling_innhold.beskrivelse (sprak='nb') = innledningen, for de 18 samlingene som har
--      tekst. 19390 (tom innledning) og 19697 (skjules) forblir NULL — settes IKKE til ''.
--   2) samling_ressurs_plassering (migr 119): 316 plasseringer (samling, lek, seksjon). 55 rader
--      med tom seksjon (39 TL-Mester 16291 + 16 fra 18822) og 12 fra 16190 er ALLEREDE filtrert
--      ut i uttrekket (316 = 383 − 67). TL-Mester vises som flat liste uten grupper (Kjartan).
--   3) samlinger.synlig=false på 19697 «Tipslister» (0 leker, innledning NULL — Kjartan).
--   4) 16 «gamle henvisninger» til gammel Drupal-layout legges i redaksjonell_ko som egne
--      saker (type 'annet', koblet til samlingen) — de rettes IKKE maskinelt (Kjartan/Fable).
--
-- HARDE SPERRER (raiser og navngir avvik, FØR skriving, i samme transaksjon):
--   0) idempotens: samling_ressurs_plassering skal være TOM (124 er første filler, 119 laget den tom).
--   1) uttrekket har nøyaktig 316 plasseringer, ingen med tom seksjon (119 har check btrim(seksjon)<>'').
--   2) prod-invariant: 368 samling_ressurs-par med kilde_nid (jf. Fable pkt 2 — IKKE 383). 16 TL-dans
--      (uten kilde_nid) telles ikke med.
--   3) alle samling-/lek-kilde_nid i uttrekket finnes i samlinger/ressurser.
--   4) alle 316 plassering-par finnes i samling_ressurs (FK i 119 håndhever, men tydelig feil er bedre).
--   5) join på kilde_nid gir nøyaktig 316 (fanger ikke-unik kilde_nid).
--   Hver skriving verifiserer sitt eget radantall (18/316/1/16) og raiser ved avvik.
--
-- KVITTERING: én rad, per gruppe. EGENSKAPER: ÉN transaksjon · commit som siste linje.
-- TILBAKERULLING (etter commit): delete from samling_ressurs_plassering; nullstill
--   samling_innhold.beskrivelse for de 18; samlinger.synlig=true på 19697; slett de 16 kø-sakene.
-- ============================================================================

begin;

-- Innebygd uttrekk (v3). Temp-tabeller slettes ved commit.
create temporary table _inn (kilde_nid text primary key, beskrivelse text) on commit drop;
insert into _inn (kilde_nid, beskrivelse) values
  ('15468', '<p>Her er en oversikt over aktiviteter/leker som kan passe godt på SFO/AKS, men også ellers som i friminutt, klassens time, kroppsøving, fysak, aktivitetsdager o.l. Noen av aktivitetene passer under flere av kategoriene nedenfor, og vil da stå flere steder.</p>
<p>Dere finner beskrivelse av en aktivitet ved å trykke på en aktivitet i listen under. Husk at beskrivelsene ofte inneholder en videoforklaring, som du finner ved å bla litt ned på siden.</p>'),
  ('15510', '<p>Her er en oversikt over aktiviteter/Move It som kan passe godt til FYSAK!</p>
<p>Dere finner beskrivelse av en aktivitet ved å trykke på en aktivitet i listen under. Hvor lang tid man har FYSAK kan variere fra skole til skole. I tabellen under ser dere ca hvor lang tid aktiviteten varer.</p>'),
  ('16072', '<p>Her er en oversikt over aktiviteter som kan passe godt til kroppsøving (KRØ) i 1-2. trinn!</p>
<p>Dere finner beskrivelse av en aktivitet ved å trykke på aktiviteten i listen under. I tabellen finner dere forslag og eksempler på aktiviteter/aktiv læring som passer godt til utvalgte kompetansemål.</p>'),
  ('16073', '<p>Her er en oversikt over aktiviteter som kan passe godt til kroppsøving (KRØ) i 3. og 4. trinn!</p>
<p>Dere finner beskrivelse av en aktivitet ved å trykke på aktiviteten i listen under. I tabellen finner dere forslag og eksempler på aktiviteter/aktiv læring som passer godt til utvalgte kompetansemål.</p>'),
  ('16074', '<p>Her er en oversikt over aktiviteter som kan passe godt til kroppsøving (KRØ) i 5., 6. og 7. trinn!</p>
<p>Dere finner beskrivelse av en aktivitet ved å trykke på aktiviteten i listen under. I tabellen finner dere forslag og eksempler på aktiviteter/aktiv læring som passer godt til utvalgte kompetansemål.</p>'),
  ('16190', '<p>Hei alle TL-skoler! :)</p>
<p>Her er en oversikt over alle lekene til denne kursmodulen. Vi har samlet alle i en video som dere finner litt lengre ned på denne siden. Dere kan også søke opp en og en lek under &quot;Aktiviteter&quot;.</p>
<p>Video av hver lek finner dere også ved å trykke på en lek i listen under. Til høyre på siden her finner dere i tillegg A4-beskrivelser av alle lekene med utstyrsliste. Vi anbefaler at dere skriver ut arkene, laminerer og legger i utstyrsboden. Vi gleder oss til å se dere på kurs! :)</p>'),
  ('16203', '<p>Bli inspirert og bruk lekene på hele skolen; i friminutt, turdager, SFO/AKS osv.</p>
<p>Klikk på leken og du kommer direkte til beskrivelse og video av lekene.</p>'),
  ('16212', '<p>Bli inspirert og bruk dem til korte og enkle bevegelsespauser i løpet av skoledagen!</p>
<p>Klikk på leken og du kommer direkte til beskrivelse og video av lekene.</p>'),
  ('16291', '<p>Nedenfor ser dere aktiviteter som kan passe til TL-Mester og/eller til kroppsøvingstimer, fysak eller klassens time på ungdomstrinnet eller mellomtrinnet. Til høyre på siden her, finner dere også litt mer informasjon om TL-Mester og tidligere kurshefter.</p>
<p>For flere dokumenter til bruk i TL-Mester, gå til <strong>Min side - Dokumenter - Innhold - Turneringer og TL-Mester.</strong></p>
<p>Når du trykker på en aktivitet i listen under, kommer du direkte til beskrivelsen som i noen tilfeller også inneholder en videoforklaring.</p>'),
  ('17721', '<p>Bruk månedens utfordring i klassen eller med trivselslederne. Sett gjerne opp månedens utfordring som en aktivitet i friminuttene.</p>
<p>Klikk på leken og du kommer direkte til beskrivelsen.</p>'),
  ('18372', '<p>Her er TLs julekalender!</p>
<p>Klikk på aktiviteten og ta del i dagens luke. Kalenderen er full av enkle Move it´s (bevegelsespauser) og noen utfordringer.</p>
<p>Tips! Det finnes også et juletre med alle aktivitetene som dere kan skrive ut og henge på veggen.</p>'),
  ('18822', '<p>Nedenfor er en oversikt over alle lekene til denne kursmodulen. Vi har samlet alle i en video som dere finner nederst på denne siden.</p>
<p>Video av hver lek finner dere ved å trykke på en lek i listen under. Dere kan også søke opp en og en lek under &quot;Aktiviteter&quot;.</p>
<p>Til høyre på siden her finner dere i tillegg kurshefte vinter 2026 og A4-beskrivelser av alle lekene med utstyrsliste. Vi anbefaler at dere skriver ut arkene, laminerer og legger i utstyrsboden.</p>
<p>Vi gleder oss til å se dere på kurs! :)</p>'),
  ('18884', '<p>Bruk månedens utfordring i klassen eller med trivselslederne. Sett gjerne opp månedens utfordring som en aktivitet i friminuttene.</p>
<p>Klikk på leken og du kommer direkte til beskrivelsen.</p>'),
  ('18885', '<p>Bli inspirert og bruk lekene på hele skolen; i friminutt, turdager, SFO/AKS osv.</p>
<p>Klikk på leken og du kommer direkte til beskrivelse og video av lekene.</p>'),
  ('18886', '<p>Bli inspirert og bruk dem til korte og enkle bevegelsespauser i løpet av skoledagen!</p>
<p>Klikk på leken og du kommer direkte til beskrivelse og video av lekene.</p>'),
  ('19389', '<p>Her finner dere favoritt aktiviteter fra medlemsskolene våre, sortert etter type lek:</p>'),
  ('19696', '<p><strong>Her finner dere aktiviteter som passer for store grupper med elever, gjerne 100+.</strong></p>
<p><strong>Har dere flere tips? Send dem gjerne til marielle@trivselsleder.no </strong></p>'),
  ('20030', '<p>Nedenfor er en oversikt over alle lekene til denne kursmodulen. Vi har samlet alle i en video som dere finner nederst på denne siden.</p>
<p>Video av hver lek finner dere ved å trykke på en lek i listen under. Dere kan også søke opp en og en lek under &quot;Aktiviteter&quot;, &quot;Move it&quot; og &quot;Aktiv læring&quot;. På lekekurs viser vi hovedsakelig frem aktiviteter.</p>
<p>Til høyre på siden her finner dere i tillegg kurshefte høst 2026 og A4-beskrivelser av alle lekene med utstyrsliste. Vi anbefaler at dere skriver ut arkene, laminerer og legger i utstyrsboden.</p>
<p>Vi gleder oss til å se dere på kurs! :)</p>
<p><strong>TL-dans høst 2026: </strong>Vi henter fram en gammel favoritt og danser TL-dans 18 høsten 2026.</p>');

create temporary table _plass (samling_nid text, lek_nid text, seksjon text, seksjon_rekkefolge smallint, rekkefolge smallint) on commit drop;
insert into _plass (samling_nid, lek_nid, seksjon, seksjon_rekkefolge, rekkefolge) values
  ('15468','13632','morgenen/inne',0,0),
  ('15468','1059','skolegården/gymsalen',1,0),
  ('15468','13659','på tur',2,0),
  ('15468','13656','morgenen/inne',0,1),
  ('15468','1053','skolegården/gymsalen',1,1),
  ('15468','1247','på tur',2,1),
  ('15468','8853','morgenen/inne',0,2),
  ('15468','1050','på tur',2,2),
  ('15468','1053','morgenen/inne',0,3),
  ('15468','6092','skolegården/gymsalen',1,2),
  ('15468','13623','på tur',2,3),
  ('15468','1247','skolegården/gymsalen',1,3),
  ('15468','1248','på tur',2,4),
  ('15468','8854','morgenen/inne',0,4),
  ('15468','13623','skolegården/gymsalen',1,4),
  ('15468','13632','på tur',2,5),
  ('15468','13635','morgenen/inne',0,5),
  ('15468','13625','skolegården/gymsalen',1,5),
  ('15468','1138','på tur',2,6),
  ('15468','1138','morgenen/inne',0,6),
  ('15468','13661','skolegården/gymsalen',1,6),
  ('15468','1064','på tur',2,7),
  ('15468','2468','morgenen/inne',0,7),
  ('15468','10131','skolegården/gymsalen',1,7),
  ('15468','3930','på tur',2,8),
  ('15468','2264','morgenen/inne',0,8),
  ('15468','10132','skolegården/gymsalen',1,8),
  ('15468','10129','på tur',2,9),
  ('15468','2277','morgenen/inne',0,9),
  ('15468','13631','skolegården/gymsalen',1,9),
  ('15468','2725','på tur',2,10),
  ('15468','1076','morgenen/inne',0,10),
  ('15468','13632','skolegården/gymsalen',1,10),
  ('15468','1076','på tur',2,11),
  ('15468','3935','morgenen/inne',0,11),
  ('15468','6093','skolegården/gymsalen',1,11),
  ('15468','2698','på tur',2,12),
  ('15468','4177','morgenen/inne',0,12),
  ('15468','8856','skolegården/gymsalen',1,12),
  ('15468','1353','på tur',2,13),
  ('15468','1064','morgenen/inne',0,13),
  ('15468','10123','skolegården/gymsalen',1,13),
  ('15468','1129','på tur',2,14),
  ('15468','10582','morgenen/inne',0,14),
  ('15468','1353','skolegården/gymsalen',1,14),
  ('15468','1060','på tur',2,15),
  ('15468','2274','morgenen/inne',0,15),
  ('15468','1093','skolegården/gymsalen',1,15),
  ('15468','1141','på tur',2,16),
  ('15468','8871','morgenen/inne',0,16),
  ('15468','1452','på tur',2,17),
  ('15468','13657','morgenen/inne',0,17),
  ('15468','13656','skolegården/gymsalen',1,16),
  ('15468','16213','på tur',2,18),
  ('15468','3930','morgenen/inne',0,18),
  ('15468','10127','skolegården/gymsalen',1,17),
  ('15468','16214','på tur',2,19),
  ('15468','10584','morgenen/inne',0,19),
  ('15468','10129','skolegården/gymsalen',1,18),
  ('15468','1054','på tur',2,20),
  ('15468','5136','morgenen/inne',0,20),
  ('15468','13649','skolegården/gymsalen',1,19),
  ('15468','3931','morgenen/inne',0,21),
  ('15468','1060','skolegården/gymsalen',1,20),
  ('15468','3937','morgenen/inne',0,22),
  ('15468','2724','skolegården/gymsalen',1,21),
  ('15468','1054','morgenen/inne',0,23),
  ('15468','1150','skolegården/gymsalen',1,22),
  ('15468','3940','morgenen/inne',0,24),
  ('15468','1054','skolegården/gymsalen',1,23),
  ('15510','10584','Ca 10-15 min',0,0),
  ('15510','10127','Ca 15-30 min',1,0),
  ('15510','6146','Ca 10-15 min',0,1),
  ('15510','10126','Ca 15-30 min',1,1),
  ('15510','6006','Ca 10-15 min',0,2),
  ('15510','1051','Ca 15-30 min',1,2),
  ('15510','1076','Ca 10-15 min',0,3),
  ('15510','8858','Ca 15-30 min',1,3),
  ('15510','13658','Ca 15-30 min',1,4),
  ('15510','1064','Ca 10-15 min',0,4),
  ('15510','10173','Ca 15-30 min',1,5),
  ('15510','3934','Ca 10-15 min',0,5),
  ('15510','1040','Ca 15-30 min',1,6),
  ('15510','1178','Ca 10-15 min',0,6),
  ('15510','1066','Ca 15-30 min',1,7),
  ('15510','1138','Ca 10-15 min',0,7),
  ('15510','1198','Ca 15-30 min',1,8),
  ('16072','1141','Utforske egen kroppslig bevegelse i lek og andre aktiviteter, alene og sammen med andre',0,0),
  ('16072','1388','Utforske egen kroppslig bevegelse i lek og andre aktiviteter, alene og sammen med andre',0,1),
  ('16072','1045','Utforske egen kroppslig bevegelse i lek og andre aktiviteter, alene og sammen med andre',0,2),
  ('16072','10173','Utforske og gjennomføre grunnleggende bevegelser som å krype, gå, løpe, hinke, satse, lande, vende og rulle i ulike miljøer ut fra egne forutsetninger',1,0),
  ('16072','13661','Utforske og gjennomføre grunnleggende bevegelser som å krype, gå, løpe, hinke, satse, lande, vende og rulle i ulike miljøer ut fra egne forutsetninger',1,1),
  ('16072','1050','Utforske og gjennomføre grunnleggende bevegelser som å krype, gå, løpe, hinke, satse, lande, vende og rulle i ulike miljøer ut fra egne forutsetninger',1,2),
  ('16072','1424','Utforske og gjennomføre grunnleggende bevegelser som å krype, gå, løpe, hinke, satse, lande, vende og rulle i ulike miljøer ut fra egne forutsetninger',1,3),
  ('16072','8858','Øve på å avlevere, ta imot og leke med ulike redskaper og balltyper',2,0),
  ('16072','10127','Øve på å avlevere, ta imot og leke med ulike redskaper og balltyper',2,1),
  ('16072','13630','Øve på å avlevere, ta imot og leke med ulike redskaper og balltyper',2,2),
  ('16072','10129','Leke og være med sammen med andre i aktivitet i varierte bevegelsesmiljøer',3,0),
  ('16072','13659','Leke og være med sammen med andre i aktivitet i varierte bevegelsesmiljøer',3,1),
  ('16072','10123','Leke og være med sammen med andre i aktivitet i varierte bevegelsesmiljøer',3,2),
  ('16072','6088','Forstå og praktisere enkle regler for samspill i ulike bevegelsesaktiviteter',4,0),
  ('16072','6091','Forstå og praktisere enkle regler for samspill i ulike bevegelsesaktiviteter',4,1),
  ('16072','8856','Forstå og praktisere enkle regler for samspill i ulike bevegelsesaktiviteter',4,2),
  ('16073','6093','Utforske og gjennomføre leker, idrettsaktiviteter, danser og andre bevegelsesaktiviteter',0,0),
  ('16073','1689','Utforske og gjennomføre leker, idrettsaktiviteter, danser og andre bevegelsesaktiviteter',0,1),
  ('16073','1388','Utforske og gjennomføre leker, idrettsaktiviteter, danser og andre bevegelsesaktiviteter',0,2),
  ('16073','10125','Bruke kroppen til å utforske aktiviteter og utvikle grunnleggende bevegelser',1,0),
  ('16073','8858','Bruke kroppen til å utforske aktiviteter og utvikle grunnleggende bevegelser',1,1),
  ('16073','1040','Bruke kroppen til å utforske aktiviteter og utvikle grunnleggende bevegelser',1,2),
  ('16073','10173','Bruke kroppen til å utforske aktiviteter og utvikle grunnleggende bevegelser',1,3),
  ('16073','1135','Øve på og bruke basisferdigheter som å føre, kaste, sprette, sparke og ta imot ball i ulike bevegelsesaktiviteter',2,0),
  ('16073','13630','Øve på og bruke basisferdigheter som å føre, kaste, sprette, sparke og ta imot ball i ulike bevegelsesaktiviteter',2,1),
  ('16073','13632','Øve på og bruke basisferdigheter som å føre, kaste, sprette, sparke og ta imot ball i ulike bevegelsesaktiviteter',2,2),
  ('16073','14738','Øve på og bruke basisferdigheter som å føre, kaste, sprette, sparke og ta imot ball i ulike bevegelsesaktiviteter',2,3),
  ('16073','13634','Forstå og bruke regler for samhandling i spill og bevegelsesaktiviteter',3,0),
  ('16073','8857','Forstå og bruke regler for samhandling i spill og bevegelsesaktiviteter',3,1),
  ('16073','13623','Forstå og bruke regler for samhandling i spill og bevegelsesaktiviteter',3,2),
  ('16073','1054','Forstå kroppslig ulikhet mellom seg selv og andre, og inkludere andre i ulike bevegelsesaktiviteter',4,0),
  ('16073','1431','Forstå kroppslig ulikhet mellom seg selv og andre, og inkludere andre i ulike bevegelsesaktiviteter',4,1),
  ('16074','8863','Utforske og gjennomføre lek og spill sammen med andre i ulike bevegelsesaktiviteter',0,0),
  ('16074','1198','Utforske og gjennomføre lek og spill sammen med andre i ulike bevegelsesaktiviteter',0,1),
  ('16074','2711','Øve på sammensatte bevegelser, alene og sammen med andre',1,0),
  ('16074','8866','Øve på sammensatte bevegelser, alene og sammen med andre',1,1),
  ('16074','3940','Øve på sammensatte bevegelser, alene og sammen med andre',1,2),
  ('16074','10173','Gjennomføre aktiviteter ut fra egne interesser og forutsetninger i dans, friluftsliv, idrettsaktiviteter og andre bevegelsesaktiviteter',2,0),
  ('16074','1093','Gjennomføre aktiviteter ut fra egne interesser og forutsetninger i dans, friluftsliv, idrettsaktiviteter og andre bevegelsesaktiviteter',2,1),
  ('16074','1184','Forstå og praktisere regler for aktivitet og spill og respektere resultatene',3,0),
  ('16074','1066','Forstå og praktisere regler for aktivitet og spill og respektere resultatene',3,1),
  ('16074','13658','Forstå og praktisere regler for aktivitet og spill og respektere resultatene',3,2),
  ('16074','13629','Forstå og praktisere regler for aktivitet og spill og respektere resultatene',3,3),
  ('16074','8853','Forstå ulikheter mellom seg selv og andre og delta i bevegelsesaktiviteter som kan være tilpasset ikke bare egne forutsetninger, men også andres',4,0),
  ('16074','13655','Forstå ulikheter mellom seg selv og andre og delta i bevegelsesaktiviteter som kan være tilpasset ikke bare egne forutsetninger, men også andres',4,1),
  ('16074','5138','Forstå ulikheter mellom seg selv og andre og delta i bevegelsesaktiviteter som kan være tilpasset ikke bare egne forutsetninger, men også andres',4,2),
  ('16074','1393','Forstå ulikheter mellom seg selv og andre og delta i bevegelsesaktiviteter som kan være tilpasset ikke bare egne forutsetninger, men også andres',4,3),
  ('16203','6093','Januar',0,0),
  ('16203','16213','Februar',1,0),
  ('16203','1058','Mars',2,0),
  ('16203','16214','April',3,0),
  ('16203','1311','Mai',4,0),
  ('16203','1150','Juni',5,0),
  ('16203','1100','Juli',6,0),
  ('16203','1181','August',7,0),
  ('16203','4497','September',8,0),
  ('16203','17729','Oktober',9,0),
  ('16203','1119','November',10,0),
  ('16203','17728','Desember',11,0),
  ('16212','2271','Januar',0,0),
  ('16212','9662','Februar',1,0),
  ('16212','16486','Mars',2,0),
  ('16212','16488','April',3,0),
  ('16212','16489','Mai',4,0),
  ('16212','1076','Juni',5,0),
  ('16212','2279','Juli',6,0),
  ('16212','17095','August',7,0),
  ('16212','17073','September',8,0),
  ('16212','17724','Oktober',9,0),
  ('16212','17128','November',10,0),
  ('16212','17725','Desember',11,0),
  ('17721','17726','August',7,0),
  ('17721','17383','September',8,0),
  ('17721','17386','Oktober',9,0),
  ('17721','17385','November',10,0),
  ('17721','17727','Desember',11,0),
  ('18372','16579','Luke 1',0,0),
  ('18372','9663','Luke 2',1,0),
  ('18372','18397','Luke 3',2,0),
  ('18372','18398','Luke 4',3,0),
  ('18372','18406','Luke 5',4,0),
  ('18372','16775','Luke 6',5,0),
  ('18372','18407','Luke 7',6,0),
  ('18372','17073','Luke 8',7,0),
  ('18372','18408','Luke 9',8,0),
  ('18372','18411','Luke 10',9,0),
  ('18372','18413','Luke 11',10,0),
  ('18372','15373','Luke 12',11,0),
  ('18372','17385','Luke 13',12,0),
  ('18372','3939','Luke 14',13,0),
  ('18372','18419','Luke 15',14,0),
  ('18372','18433','Luke 16',15,0),
  ('18372','18434','Luke 17',16,0),
  ('18372','1178','Luke 18',17,0),
  ('18372','18436','Luke 19',18,0),
  ('18372','18437','Luke 20',19,0),
  ('18372','18438','Luke 21',20,0),
  ('18372','18439','Luke 22',21,0),
  ('18372','9662','Luke 23',22,0),
  ('18372','17724','Luke 24',23,0),
  ('18884','18433','Januar',0,0),
  ('18884','18895','Februar',1,0),
  ('18884','18398','Mars',2,0),
  ('18884','17388','April',3,0),
  ('18884','18896','Mai',4,0),
  ('18884','18897','Juni',5,0),
  ('18884','18898','Juli',6,0),
  ('18884','20074','August',7,0),
  ('18884','20075','September',8,0),
  ('18885','1255','Januar',0,0),
  ('18885','1133','Februar',1,0),
  ('18885','18840','Mars',2,0),
  ('18885','18843','April',3,0),
  ('18885','1691','Mai',4,0),
  ('18885','1135','Juni',5,0),
  ('18885','3200','Juli',6,0),
  ('18885','20066','August',7,0),
  ('18885','20068','September',8,0),
  ('18885','20069','Oktober',9,0),
  ('18885','20071','November',10,0),
  ('18885','20070','Desember',11,0),
  ('18886','3939','Januar',0,0),
  ('18886','18406','Februar',1,0),
  ('18886','16775','Mars',2,0),
  ('18886','18408','April',3,0),
  ('18886','18434','Mai',4,0),
  ('18886','18439','Juni',5,0),
  ('18886','18438','Juli',6,0),
  ('18886','20076','August',7,0),
  ('18886','1248','September',8,0),
  ('18886','3888','November',10,0),
  ('18886','20077','Desember',11,0),
  ('19389','1242','Ballek',0,0),
  ('19389','13659','Sisten',1,0),
  ('19389','1184','Six-ball',2,0),
  ('19389','1093','Annet',3,0),
  ('19389','1118','Ballek',0,1),
  ('19389','17746','Sisten',1,1),
  ('19389','1100','Six-ball',2,1),
  ('19389','1060','Annet',3,1),
  ('19389','1119','Ballek',0,2),
  ('19389','1247','Sisten',1,2),
  ('19389','1353','Six-ball',2,2),
  ('19389','1058','Annet',3,2),
  ('19389','13658','Ballek',0,3),
  ('19389','16213','Sisten',1,3),
  ('19389','13662','Six-ball',2,3),
  ('19389','13661','Annet',3,3),
  ('19389','1146','Ballek',0,4),
  ('19389','1177','Sisten',1,4),
  ('19389','1059','Six-ball',2,4),
  ('19389','1069','Annet',3,4),
  ('19389','1221','Ballek',0,5),
  ('19389','13623','Sisten',1,5),
  ('19389','1075','Six-ball',2,5),
  ('19389','1094','Ballek',0,6),
  ('19389','1255','Six-ball',2,6),
  ('19389','8858','Ballek',0,7),
  ('19389','13632','Ballek',0,8),
  ('19389','10126','Ballek',0,9),
  ('19390','11593','Relasjon',0,0),
  ('19390','1071','Samarbeid',1,0),
  ('19390','1064','Samhold',2,0),
  ('19390','1054','Relasjon',0,1),
  ('19390','1394','Samarbeid',1,1),
  ('19390','3940','Samhold',2,1),
  ('19390','2876','Relasjon',0,2),
  ('19390','1385','Samarbeid',1,2),
  ('19390','2907','Samhold',2,2),
  ('19390','2911','Relasjon',0,3),
  ('19390','1461','Samarbeid',1,3),
  ('19390','1469','Samhold',2,3),
  ('19390','1465','Relasjon',0,4),
  ('19390','1096','Samarbeid',1,4),
  ('19390','10126','Samhold',2,4),
  ('19390','2912','Relasjon',0,5),
  ('19390','1685','Samarbeid',1,5),
  ('19390','2272','Samhold',2,5),
  ('19390','1141','Relasjon',0,6),
  ('19390','1356','Samarbeid',1,6),
  ('19390','2263','Samhold',2,6),
  ('19390','10582','Relasjon',0,7),
  ('19390','1260','Samarbeid',1,7),
  ('19390','2271','Samhold',2,7),
  ('19390','18438','Relasjon',0,8),
  ('19390','17073','Samarbeid',1,8),
  ('19390','18397','Samhold',2,8),
  ('19696','1135','Ballspill',0,0),
  ('19696','1353','Six-ball/ Kin-ball',1,0),
  ('19696','1048','Sisten/ Tikken',2,0),
  ('19696','1094','Ballspill',0,1),
  ('19696','1356','Six-ball/ Kin-ball',1,1),
  ('19696','13659','Sisten/ Tikken',2,1),
  ('19696','5132','Annet',3,0),
  ('19696','1119','Ballspill',0,2),
  ('19696','1051','Six-ball/ Kin-ball',1,2),
  ('19696','17746','Sisten/ Tikken',2,2),
  ('19696','1064','Annet',3,1),
  ('19696','10126','Ballspill',0,3),
  ('19696','1075','Six-ball/ Kin-ball',1,3),
  ('19696','2729','Sisten/ Tikken',2,3),
  ('19696','1688','Annet',3,2),
  ('19696','8858','Ballspill',0,4),
  ('19696','1114','Sisten/ Tikken',2,4),
  ('19696','13661','Annet',3,3),
  ('19696','1242','Ballspill',0,5),
  ('19696','20068','Sisten/ Tikken',2,5),
  ('19696','1693','Annet',3,4),
  ('19696','1348','Ballspill',0,6),
  ('19696','1093','Annet',3,5),
  ('19696','1226','Ballspill',0,7),
  ('19696','1165','Annet',3,6),
  ('19696','2762','Annet',3,7),
  ('20030','20063','Aktiviteter',0,0),
  ('20030','20064','Aktiviteter',0,1),
  ('20030','20065','Aktiviteter',0,2),
  ('20030','20066','Aktiviteter',0,3),
  ('20030','20067','Aktiviteter',0,4),
  ('20030','20068','Aktiviteter',0,5),
  ('20030','20069','Aktiviteter',0,6),
  ('20030','20070','Aktiviteter',0,7),
  ('20030','20071','Aktiviteter',0,8),
  ('20030','20072','Aktiviteter',0,9),
  ('20030','20073','Aktiviteter',0,10),
  ('20030','20074','Aktiviteter',0,11),
  ('20030','20075','Aktiviteter',0,12),
  ('20030','1248','Move it',1,0),
  ('20030','20076','Move it',1,1),
  ('20030','20077','Move it',1,2);

create temporary table _henv (samling_nid text, tekst text) on commit drop;
insert into _henv (samling_nid, tekst) values
  ('15468', 'Husk at beskrivelsene ofte inneholder en videoforklaring, som du finner ved å bla litt ned på siden.'),
  ('15510', 'I tabellen under ser dere ca hvor lang tid aktiviteten varer.'),
  ('16072', 'I tabellen finner dere forslag og eksempler på aktiviteter/aktiv læring som passer godt til utvalgte kompetansemål.'),
  ('16073', 'I tabellen finner dere forslag og eksempler på aktiviteter/aktiv læring som passer godt til utvalgte kompetansemål.'),
  ('16074', 'I tabellen finner dere forslag og eksempler på aktiviteter/aktiv læring som passer godt til utvalgte kompetansemål.'),
  ('16190', 'Vi har samlet alle i en video som dere finner litt lengre ned på denne siden.'),
  ('16190', 'Dere kan også søke opp en og en lek under &quot;Aktiviteter&quot;.'),
  ('16190', 'Til høyre på siden her finner dere i tillegg A4-beskrivelser av alle lekene med utstyrsliste.'),
  ('16291', 'Til høyre på siden her, finner dere også litt mer informasjon om TL-Mester og tidligere kurshefter.'),
  ('16291', 'For flere dokumenter til bruk i TL-Mester, gå til Min side - Dokumenter - Innhold - Turneringer og TL-Mester.'),
  ('18822', 'Vi har samlet alle i en video som dere finner nederst på denne siden.'),
  ('18822', 'Dere kan også søke opp en og en lek under &quot;Aktiviteter&quot;.'),
  ('18822', 'Til høyre på siden her finner dere i tillegg kurshefte vinter 2026 og A4-beskrivelser av alle lekene med utstyrsliste.'),
  ('20030', 'Vi har samlet alle i en video som dere finner nederst på denne siden.'),
  ('20030', 'Dere kan også søke opp en og en lek under &quot;Aktiviteter&quot;, &quot;Move it&quot; og &quot;Aktiv læring&quot;.'),
  ('20030', 'Til høyre på siden her finner dere i tillegg kurshefte høst 2026 og A4-beskrivelser av alle lekene med utstyrsliste.');

do $$
declare n int;
begin
  -- ---------- SPERRER (før skriving) ----------
  select count(*) into n from public.samling_ressurs_plassering;
  if n <> 0 then raise exception 'STOPP 124 (idempotens): samling_ressurs_plassering er ikke tom (% rader) — 124 er trolig alt kjørt.', n; end if;

  select count(*) into n from _inn;
  if n <> 18 then raise exception 'STOPP 124 (innledninger): uttrekket har % innledninger med tekst, forventet 18.', n; end if;

  select count(*) into n from _plass;
  if n <> 316 then raise exception 'STOPP 124 (plasseringer): uttrekket har % plasseringer, forventet 316.', n; end if;

  select count(*) into n from _plass where btrim(seksjon) = '';
  if n <> 0 then raise exception 'STOPP 124 (tom seksjon): % plassering(er) har tom seksjon (119-CHECK ville avvist).', n; end if;

  select count(*) into n from public.samling_ressurs sr join public.samlinger s on s.id = sr.samling_id where s.kilde_nid is not null;
  if n <> 368 then raise exception 'STOPP 124 (368-par): forventet 368 samling_ressurs-par med kilde_nid, fant %. Basen er ikke den forventede.', n; end if;

  select count(*) into n from (select distinct samling_nid from _plass) x where not exists (select 1 from public.samlinger s where s.kilde_nid = x.samling_nid);
  if n <> 0 then raise exception 'STOPP 124: % samling-kilde_nid i uttrekket finnes ikke i samlinger.', n; end if;

  select count(*) into n from (select distinct lek_nid from _plass) x where not exists (select 1 from public.ressurser r where r.kilde_nid = x.lek_nid);
  if n <> 0 then raise exception 'STOPP 124: % lek-kilde_nid i uttrekket finnes ikke i ressurser.', n; end if;

  select count(*) into n from _plass p
    join public.samlinger s on s.kilde_nid = p.samling_nid
    join public.ressurser r on r.kilde_nid = p.lek_nid
   where not exists (select 1 from public.samling_ressurs sr where sr.samling_id = s.id and sr.ressurs_id = r.id);
  if n <> 0 then raise exception 'STOPP 124 (membership): % plassering-par finnes ikke i samling_ressurs (FK 119 ville feilet).', n; end if;

  select count(*) into n from _plass p
    join public.samlinger s on s.kilde_nid = p.samling_nid
    join public.ressurser r on r.kilde_nid = p.lek_nid;
  if n <> 316 then raise exception 'STOPP 124 (mapping): join på kilde_nid ga % rader, forventet 316 (ikke-unik kilde_nid?).', n; end if;

  -- ---------- 1) INNLEDNINGER (nb) ----------
  update public.samling_innhold si
     set beskrivelse = i.beskrivelse
    from _inn i join public.samlinger s on s.kilde_nid = i.kilde_nid
   where si.samling_id = s.id and si.sprak = 'nb';
  get diagnostics n = row_count;
  if n <> 18 then raise exception 'STOPP 124 (innledninger): oppdaterte % nb-rader, forventet 18 (mangler samling_innhold nb-rad?).', n; end if;

  -- ---------- 2) PLASSERINGER ----------
  insert into public.samling_ressurs_plassering (samling_id, ressurs_id, seksjon, seksjon_rekkefolge, rekkefolge)
  select s.id, r.id, p.seksjon, p.seksjon_rekkefolge, p.rekkefolge
    from _plass p
    join public.samlinger s on s.kilde_nid = p.samling_nid
    join public.ressurser r on r.kilde_nid = p.lek_nid;
  get diagnostics n = row_count;
  if n <> 316 then raise exception 'STOPP 124 (plasseringer): satte inn % rader, forventet 316.', n; end if;

  -- ---------- 3) SKJUL 19697 ----------
  update public.samlinger set synlig = false where kilde_nid = '19697';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'STOPP 124 (19697): oppdaterte % rader, forventet 1.', n; end if;

  -- ---------- 4) GAMLE HENVISNINGER → redaksjonell_ko ----------
  insert into public.redaksjonell_ko (type, samling_id, beskrivelse, forslag)
  select 'annet', s.id,
         'Gammel layout-henvisning i samlingsinnledning (kilde_nid ' || h.samling_nid || '): «' || h.tekst || '»',
         'Vurder omformulering av innledningen — gammel Drupal-layout. Ikke fjernet maskinelt (beslutning 12. sep 2026, migr 124).'
    from _henv h join public.samlinger s on s.kilde_nid = h.samling_nid;
  get diagnostics n = row_count;
  if n <> 16 then raise exception 'STOPP 124 (henvisninger): satte inn % kø-saker, forventet 16.', n; end if;
end $$;

-- ---------- KVITTERING (én rad) ----------
select concat_ws(' · ',
  'innledninger fylt (nb, forventet 18): '
     || (select count(*) from public.samling_innhold si join public.samlinger s on s.id=si.samling_id
          where si.sprak='nb' and si.beskrivelse is not null and s.kilde_nid in ('15468','15510','16072','16073','16074','16190','16203','16212','16291','17721','18372','18822','18884','18885','18886','19389','19696','20030')),
  'plasseringer satt inn (forventet 316): ' || (select count(*) from public.samling_ressurs_plassering),
  '19390 beskrivelse NULL: ' || (select (si.beskrivelse is null)::text from public.samling_innhold si join public.samlinger s on s.id=si.samling_id where s.kilde_nid='19390' and si.sprak='nb'),
  '19697 synlig=false: ' || (select (not synlig)::text from public.samlinger where kilde_nid='19697'),
  'kø-saker gamle henvisninger (forventet 16): ' || (select count(*) from public.redaksjonell_ko where beskrivelse like 'Gammel layout-henvisning%')
) as kvittering;

commit;
