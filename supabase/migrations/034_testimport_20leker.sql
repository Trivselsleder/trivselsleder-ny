-- 034_testimport_20leker.sql — PRØVEIMPORT (Steg 6). Idempotent (deterministiske uuid fra nid).
-- Kilde: Ramsalt game-nodes (26. juni-eksport, utviklingsdatasett). Kun testbasen.
-- Media-binærfiler er IKKE lastet opp; bilder ligger som pekere (storage_sti), video kommer senere.
begin;

-- rydd tidligere prøveimport for disse (idempotens)
delete from medier where ressurs_id='3820b754-2bc0-a877-c52f-0a1c45d313ed';
delete from ressurs_utstyr where ressurs_id='3820b754-2bc0-a877-c52f-0a1c45d313ed';
delete from ressurs_kategori where ressurs_id='3820b754-2bc0-a877-c52f-0a1c45d313ed';
delete from medier where ressurs_id='cd254c96-fb49-f760-4f78-ff8e2c64d820';
delete from ressurs_utstyr where ressurs_id='cd254c96-fb49-f760-4f78-ff8e2c64d820';
delete from ressurs_kategori where ressurs_id='cd254c96-fb49-f760-4f78-ff8e2c64d820';
delete from medier where ressurs_id='5f8535a6-fa03-988f-5503-d4710943a86a';
delete from ressurs_utstyr where ressurs_id='5f8535a6-fa03-988f-5503-d4710943a86a';
delete from ressurs_kategori where ressurs_id='5f8535a6-fa03-988f-5503-d4710943a86a';
delete from medier where ressurs_id='2157baa1-c37a-998e-32a0-4f5dcb66ed96';
delete from ressurs_utstyr where ressurs_id='2157baa1-c37a-998e-32a0-4f5dcb66ed96';
delete from ressurs_kategori where ressurs_id='2157baa1-c37a-998e-32a0-4f5dcb66ed96';
delete from medier where ressurs_id='cc8d560a-dab8-8611-7ce8-88a617cf797a';
delete from ressurs_utstyr where ressurs_id='cc8d560a-dab8-8611-7ce8-88a617cf797a';
delete from ressurs_kategori where ressurs_id='cc8d560a-dab8-8611-7ce8-88a617cf797a';
delete from medier where ressurs_id='492e7c53-f6ec-e9ce-d3be-80df76217709';
delete from ressurs_utstyr where ressurs_id='492e7c53-f6ec-e9ce-d3be-80df76217709';
delete from ressurs_kategori where ressurs_id='492e7c53-f6ec-e9ce-d3be-80df76217709';
delete from medier where ressurs_id='145b07af-f39a-bcd5-4fec-31957530834d';
delete from ressurs_utstyr where ressurs_id='145b07af-f39a-bcd5-4fec-31957530834d';
delete from ressurs_kategori where ressurs_id='145b07af-f39a-bcd5-4fec-31957530834d';
delete from medier where ressurs_id='b1a296a7-64aa-866c-c1a4-09ddd063a8d6';
delete from ressurs_utstyr where ressurs_id='b1a296a7-64aa-866c-c1a4-09ddd063a8d6';
delete from ressurs_kategori where ressurs_id='b1a296a7-64aa-866c-c1a4-09ddd063a8d6';
delete from medier where ressurs_id='42c10c61-65b6-5fab-4b00-5bb3f74ee644';
delete from ressurs_utstyr where ressurs_id='42c10c61-65b6-5fab-4b00-5bb3f74ee644';
delete from ressurs_kategori where ressurs_id='42c10c61-65b6-5fab-4b00-5bb3f74ee644';
delete from medier where ressurs_id='8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9';
delete from ressurs_utstyr where ressurs_id='8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9';
delete from ressurs_kategori where ressurs_id='8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9';
delete from medier where ressurs_id='2f99cf8c-321c-5af0-a74a-9efa8511dcc3';
delete from ressurs_utstyr where ressurs_id='2f99cf8c-321c-5af0-a74a-9efa8511dcc3';
delete from ressurs_kategori where ressurs_id='2f99cf8c-321c-5af0-a74a-9efa8511dcc3';
delete from medier where ressurs_id='edd54848-ae92-90fc-6335-20b8ff525b63';
delete from ressurs_utstyr where ressurs_id='edd54848-ae92-90fc-6335-20b8ff525b63';
delete from ressurs_kategori where ressurs_id='edd54848-ae92-90fc-6335-20b8ff525b63';
delete from medier where ressurs_id='86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c';
delete from ressurs_utstyr where ressurs_id='86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c';
delete from ressurs_kategori where ressurs_id='86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c';
delete from medier where ressurs_id='32a91df5-6788-1407-3414-6737d95a170f';
delete from ressurs_utstyr where ressurs_id='32a91df5-6788-1407-3414-6737d95a170f';
delete from ressurs_kategori where ressurs_id='32a91df5-6788-1407-3414-6737d95a170f';
delete from medier where ressurs_id='c8e533d3-7f44-4f97-1aa0-c64a7f8763c4';
delete from ressurs_utstyr where ressurs_id='c8e533d3-7f44-4f97-1aa0-c64a7f8763c4';
delete from ressurs_kategori where ressurs_id='c8e533d3-7f44-4f97-1aa0-c64a7f8763c4';
delete from medier where ressurs_id='acdd94fd-a32b-91a3-df56-10ceff172ffb';
delete from ressurs_utstyr where ressurs_id='acdd94fd-a32b-91a3-df56-10ceff172ffb';
delete from ressurs_kategori where ressurs_id='acdd94fd-a32b-91a3-df56-10ceff172ffb';
delete from medier where ressurs_id='e2d23ff9-d0f0-4b66-a622-7a173c4384f1';
delete from ressurs_utstyr where ressurs_id='e2d23ff9-d0f0-4b66-a622-7a173c4384f1';
delete from ressurs_kategori where ressurs_id='e2d23ff9-d0f0-4b66-a622-7a173c4384f1';
delete from medier where ressurs_id='9d980823-b374-0d9e-1c60-9bc878bc3255';
delete from ressurs_utstyr where ressurs_id='9d980823-b374-0d9e-1c60-9bc878bc3255';
delete from ressurs_kategori where ressurs_id='9d980823-b374-0d9e-1c60-9bc878bc3255';
delete from medier where ressurs_id='90a51fab-e4c2-df2d-1ef9-779f3d14de61';
delete from ressurs_utstyr where ressurs_id='90a51fab-e4c2-df2d-1ef9-779f3d14de61';
delete from ressurs_kategori where ressurs_id='90a51fab-e4c2-df2d-1ef9-779f3d14de61';
delete from medier where ressurs_id='57b36cb8-56cc-618d-8d08-e21406828091';
delete from ressurs_utstyr where ressurs_id='57b36cb8-56cc-618d-8d08-e21406828091';
delete from ressurs_kategori where ressurs_id='57b36cb8-56cc-618d-8d08-e21406828091';

-- nid 1422: Aktiviteter med fallskjerm
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('3820b754-2bc0-a877-c52f-0a1c45d313ed','lek',null,8,24,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('3820b754-2bc0-a877-c52f-0a1c45d313ed','nb',$lek$Aktiviteter med fallskjerm$lek$,$lek$Fallskjermen kan brukes til en rekke ulike aktiviteter og leker, og kan brukes til å aktivisere mange deltakere samtidig. Sørg for at alle deltakere får en plass rundt fallskjermen og test ut noen av alternativene under:

Oppvarming
- Lag små og store bølger.
- Hold godt fast i fallskjermen med strake armer, og len dere forsiktig bakover.
- Hold godt i fallskjermen med høyre hånd og løp rundt og rundt mot venstre.

Leker med fallskjerm og ball 
- Legg en ball oppi fallskjermen.
- Prøv å få ballen til å rulle i en sirkel på fallskjermen.
- Prøv å få ballen til å sprette opp i luften uten at den faller ut av fallskjermen.

Lek med plassbytte 
Alle starter på en tilfeldig plass rundt fallskjermen, og deltakerne skal forsøke å bytte plass med hverandre. Lederen av leken kan for eksempel be følgene deltakere om å bytte plass:

- Alle med langt hår
- Alle med blått på seg
- Alle de som holder i rød farge på fallskjermen$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Fallskjerm$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '3820b754-2bc0-a877-c52f-0a1c45d313ed', id from utstyr where navn=$lek$Fallskjerm$lek$ on conflict do nothing;
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('3820b754-2bc0-a877-c52f-0a1c45d313ed','bilde',$lek$public://fields/icon/web_image_fallskjerm_sveitserost_diameter_3_m_283577395.jpeg$lek$,$lek$web_image_fallskjerm_sveitserost_diameter_3_m_283577395.jpeg$lek$,0);

-- nid 2461: TP- Bowling
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('cd254c96-fb49-f760-4f78-ff8e2c64d820','lek',null,2,10,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('cd254c96-fb49-f760-4f78-ff8e2c64d820','nb',$lek$TP- Bowling$lek$,$lek$Sett opp bowlingkjeglene. Marker opp en strek hvor spillerne skal stå. Alle har tre forsøk hver til å velte alle kjeglene. Bytt på hvem som setter opp kjeglene etter hver spiller.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Jungelbowling$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'cd254c96-fb49-f760-4f78-ff8e2c64d820', id from utstyr where navn=$lek$Jungelbowling$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Bowlingsett$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'cd254c96-fb49-f760-4f78-ff8e2c64d820', id from utstyr where navn=$lek$Bowlingsett$lek$ on conflict do nothing;
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('cd254c96-fb49-f760-4f78-ff8e2c64d820','bilde',$lek$public://fields/image/game/bowling.jpg$lek$,$lek$bowling.jpg$lek$,0);
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('cd254c96-fb49-f760-4f78-ff8e2c64d820','bilde',$lek$public://fields/icon/bsus_bowling.jpg$lek$,$lek$bsus_bowling.jpg$lek$,1);

-- nid 2464: Slangesisten
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('5f8535a6-fa03-988f-5503-d4710943a86a','lek','begge',7,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('5f8535a6-fa03-988f-5503-d4710943a86a','nb',$lek$Slangesisten$lek$,$lek$En deltager har sisten og forsøker å ta de andre. Den første som blir tatt, henger seg på ved å holde i hånda. Sammen skal de igjen ta en tredje person. Det er bare de som er i endene av rekka som kan ta de andre. Den som er igjen til slutt, har vunnet.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('5f8535a6-fa03-988f-5503-d4710943a86a','bilde',$lek$public://fields/image/game/slangesisten_01_-_bh.jpg$lek$,$lek$slangesisten_01_-_bh.jpg$lek$,0);
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('5f8535a6-fa03-988f-5503-d4710943a86a','bilde',$lek$public://fields/icon/slangehale.png$lek$,$lek$slangehale.png$lek$,1);

-- nid 2698: Fisken i det røde hav
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('2157baa1-c37a-998e-32a0-4f5dcb66ed96','lek','begge',10,20,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('2157baa1-c37a-998e-32a0-4f5dcb66ed96','nb',$lek$Fisken i det røde hav$lek$,$lek$Lag en linje med 10-15 meters avstand fra veggen/en startstrek. De som er med på leken stiller seg inntil veggen/startstreken. En er fisken i det røde hav og starter på midten av banen, med ryggen til. De som står inntil veggen/startstreken roper: «Fisken i det røde hav; hvilken farge må vi ha for å komme over, selv om fisken sover?!» Fisken svarer f.eks «blå!». Hen snur seg. De andre skal så prøve å komme over på den andre siden uten at fisken tar dem. De som blir tatt er med på å være fisk. De som har blå klær, er frie og kan gå rett over.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Uten utstyr$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '2157baa1-c37a-998e-32a0-4f5dcb66ed96', id from utstyr where navn=$lek$Uten utstyr$lek$ on conflict do nothing;
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('2157baa1-c37a-998e-32a0-4f5dcb66ed96','bilde',$lek$public://fields/icon/skjermbilde_2020-06-09_kl._14.27.58.png$lek$,$lek$skjermbilde_2020-06-09_kl._14.27.58.png$lek$,0);

-- nid 2778: Bowling
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('cc8d560a-dab8-8611-7ce8-88a617cf797a','lek','begge',2,20,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('cc8d560a-dab8-8611-7ce8-88a617cf797a','nb',$lek$Bowling$lek$,$lek$Sett opp bowlingkjeglene i følgende rekkefølge, 1 kjegle fremst, så 2 kjegler bak, deretter 3 kjegler, og 4 helt bakerst. Merk opp en strek hvor spillerne skal stå. Alle har to forsøk hver til å velte alle kjeglene. Bytt på hvem som setter opp kjeglene etter hver spiller.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Bowlingsett$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'cc8d560a-dab8-8611-7ce8-88a617cf797a', id from utstyr where navn=$lek$Bowlingsett$lek$ on conflict do nothing;
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('cc8d560a-dab8-8611-7ce8-88a617cf797a','bilde',$lek$public://fields/icon/bowling_klubben.png$lek$,$lek$bowling_klubben.png$lek$,0);

-- nid 2871: Bjørnen sover
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('492e7c53-f6ec-e9ce-d3be-80df76217709','lek','begge',5,5,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('492e7c53-f6ec-e9ce-d3be-80df76217709','nb',$lek$Bjørnen sover$lek$,$lek$Alle leier hverandre i en ring og ett barn begynner som bjørn. Bjørnen ligger i midten av ringen med ansiktet ned og later som om den sover. De andre synger ”Bjørnen sover” mens de går rundt bjørnen. Når siste ordet synges, spretter bjørnen opp og forsøker å fange en av de andre. Den som blir fanget er bjørn i neste runde.

SangBjørnen sover, bjørnen sover, i sitt lune hi.

Den er ikke farlig, bare vi går varlig

Men vi kan jo, men vi kan jo, aldri være trygg!$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Uten utstyr$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '492e7c53-f6ec-e9ce-d3be-80df76217709', id from utstyr where navn=$lek$Uten utstyr$lek$ on conflict do nothing;
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('492e7c53-f6ec-e9ce-d3be-80df76217709','bilde',$lek$public://fields/icon/bjornen_sover.png$lek$,$lek$bjornen_sover.png$lek$,0);

-- nid 4040: Hilseball
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('145b07af-f39a-bcd5-4fec-31957530834d','lek','begge',4,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('145b07af-f39a-bcd5-4fec-31957530834d','nb',$lek$Hilseball$lek$,$lek$Alle elevene stiller seg opp i en stor sirkel med god avstand til hverandre. En elev starter med en ball i hånden og løper bort til en annen deltaker i sirkelen. Begge presenterer seg ved å si navnet sitt og bytter plass. Den eleven som får ballen, skal nå løpe videre til en ny elev for å hilse og bytte plass. Slik fortsetter det. Lederen av leken kan gi ut flere baller underveis for å øke tempo og aktivitet. Det er ikke lov til å gi to baller samtidig til en elev.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Freeballer (7 cm)$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '145b07af-f39a-bcd5-4fec-31957530834d', id from utstyr where navn=$lek$Freeballer (7 cm)$lek$ on conflict do nothing;
insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('145b07af-f39a-bcd5-4fec-31957530834d','bilde',$lek$public://fields/icon/web_image_freeball_-_velg_storrelse_lett_gummiball-554085406.png$lek$,$lek$web_image_freeball_-_velg_storrelse_lett_gummiball-554085406.png$lek$,0);

-- nid 1036: Moonball challenge
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('b1a296a7-64aa-866c-c1a4-09ddd063a8d6','lek','begge',1,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('b1a296a7-64aa-866c-c1a4-09ddd063a8d6','nb',$lek$Moonball challenge$lek$,$lek$Del alle deltagerne inn i par, og still parene opp ved siden av hverandre langs veggen. Hvert par skal ha en ball. Den fremste i paret skal starte med ballen og gjennomføre en øvelse med ballen (se beskrivelse lenger ned). Den første oppgaven er å kaste ballen mot veggen og ta den imot uten at ballen går i bakken. Dette skal gjøres syv ganger. Når deltageren er ferdig med oppgaven, eller har et mislykket forsøk, bytter deltagerne i paret plass. Dersom den første utfordringen ikke ble bestått, må dette prøves på nytt helt til én av deltagerne i paret har klart oppgaven. Neste deltager skal nå prøve på neste utfordring dersom den første utfordringen er bestått. 

Første par som klarer alle de syv utfordringene vinner.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Moonball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'b1a296a7-64aa-866c-c1a4-09ddd063a8d6', id from utstyr where navn=$lek$Moonball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Ball med sprett$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'b1a296a7-64aa-866c-c1a4-09ddd063a8d6', id from utstyr where navn=$lek$Ball med sprett$lek$ on conflict do nothing;

-- nid 1056: Crazyking
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('42c10c61-65b6-5fab-4b00-5bb3f74ee644','lek',null,6,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('42c10c61-65b6-5fab-4b00-5bb3f74ee644','nb',$lek$Crazyking$lek$,$lek$Marker en bane formet som et rektangel på ca. 2x4 meter. Lag en midtstrek på banen.

Deltagerne stiller seg opp i to rekker, en kø ved hver kortside. Den
som står først i den ene rekken starter med ballen. Ballen skal stusses
i bakken med hendene en gang på motstanderens side før deltageren først i køen på det andre laget kan ta ballen, og stusse den tilbake på samme måte. Når man har sendt ballen avgårde løper man over til den andre banehalvdelen og stiller seg i kø der. Hvis man kaster ballen slik at den stusser i bakken utenfor banen, eller hvis man ikke når ballen før den har stusset to ganger i bakken, får man en prikk. Når man har fått tre prikker ryker man ut.

Når det bare er to deltagere igjen, spilles det finale med en avgjørende runde der de to blir stående på hver sin banehalvdel til det kåres en vinner.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Fotball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '42c10c61-65b6-5fab-4b00-5bb3f74ee644', id from utstyr where navn=$lek$Fotball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Markeringstallerkener$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '42c10c61-65b6-5fab-4b00-5bb3f74ee644', id from utstyr where navn=$lek$Markeringstallerkener$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Volleyball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '42c10c61-65b6-5fab-4b00-5bb3f74ee644', id from utstyr where navn=$lek$Volleyball$lek$ on conflict do nothing;

-- nid 1226: Minuttball
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9','lek',null,null,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9','nb',$lek$Minuttball$lek$,$lek$Del inn i fire like store ruter. Like mange elever i hver rute. En elev er tidtaker. Spillet går ut på man ikke skal ha Kin-Ballen i sin rute når 1 minutt har gått. Det er også morsomt å variere tidene slik at deltakerne ikke vet når tidtaker sier stopp. Alle slag er lov, men ikke spark. Etter hvert kan man legge til flere ulike baller i spillet (Six-ball, tennisball osv.).$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Kin-Ball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where navn=$lek$Kin-Ball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Six-Ball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where navn=$lek$Six-Ball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Dragonskin skumball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where navn=$lek$Dragonskin skumball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Tennisballer$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where navn=$lek$Tennisballer$lek$ on conflict do nothing;

-- nid 1231: Kinesisk fotball
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('2f99cf8c-321c-5af0-a74a-9efa8511dcc3','lek','inne',8,20,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('2f99cf8c-321c-5af0-a74a-9efa8511dcc3','nb',$lek$Kinesisk fotball$lek$,$lek$Som i sittefotball; del i to lag og spill uten keeper. Banen kan være på ca. 6 x 12 meter. Man må sitte og forflytte seg som en edderkopp, dvs. Med armer og bein i bakken. Det blir mål som i fotball. Som mål kan man for eksempel bruke håndballmål eller kjegler.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Kin-Ball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '2f99cf8c-321c-5af0-a74a-9efa8511dcc3', id from utstyr where navn=$lek$Kin-Ball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Six-Ball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '2f99cf8c-321c-5af0-a74a-9efa8511dcc3', id from utstyr where navn=$lek$Six-Ball$lek$ on conflict do nothing;

-- nid 1232: Speedminton
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('edd54848-ae92-90fc-6335-20b8ff525b63','lek','begge',2,4,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('edd54848-ae92-90fc-6335-20b8ff525b63','nb',$lek$Speedminton$lek$,$lek$Aktivitet: Speedminton er en raskere utgave av badminton og kan spilles selv når det blåser litt. Marker to firkanter med 8-10 meters avstand. Hver firkant skal etter reglene være 5,5 meters kvadrat, men det viktigste i skolegården er at de er ca. like store. Målet er å få ballen til å lande i motstanderens rute. Morten og Tom spiller mot hverandre. De står i hver sin rute og Morten begynner å serve. Hvis ballen treffer bakken i ruten til Tom, er det poeng til Morten. Dersom ballen går i bakken hvor som helst ellers, er det poeng til Tom. Morten skal serve 3 ganger før det er Tom sin tur. Slik fortsetter det til en har vunnet. På forhånd blir dere enige om hvor mange poeng dere spiller til, eller dere kan spille på tid. 

Variant - lagspill: Spill to mot to, eller merk opp flere baner og bruk flere baller. Dette øker vanskelighetsgraden.

Variant – pasningsøvelse: Dere kan sentre til hverandre og se hvor lenge dere klarer å holde ballen i luften før den går i bakken.

Variant – blackminton: Speedminton i mørket. Dette kan gjøres utendørs om kvelden, eller ved at man skrur av lyset i gymsalen. For å se ballen setter man i en Speedlight, som lyser opp både ballen og racketen. Dersom du vil lese mer om blackminton, eller du ønsker utbytte av spillet som en sport i f.eks. kroppsøvingstimer, anbefaler vi å sette av litt tid til å lese mer om regler og se på videoene som ligger på www.speedminton.no$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Speedmintonsett$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'edd54848-ae92-90fc-6335-20b8ff525b63', id from utstyr where navn=$lek$Speedmintonsett$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Markeringstallerkener$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'edd54848-ae92-90fc-6335-20b8ff525b63', id from utstyr where navn=$lek$Markeringstallerkener$lek$ on conflict do nothing;

-- nid 1238: Bumball
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c','lek','begge',12,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c','nb',$lek$Bumball$lek$,$lek$Legg ut rockeringer som målsoner, på et området som er på ca 15 x 15 meter. Del inn i to lag og ta på blå og røde Bumballvester. Det skal alltid være én målsone mer enn det er spillere på hvert av lagene (er det to lag med 6 på hvert lag, legger dere ut 7 ringer). Alle står rundt omkring på området. Målet med leken er å treffe vesten til en på ditt lag, mens den står med ett eller to bein inn i en målsone.

En begynner med ballen, når denne kaster ballen til en medspiller må han/hun ta imot med borrelåsen på brystet, eller på rumpa, ikke med hendene. Dersom ballen går i bakken er det om å gjøre for alle spillerne å plukke opp ballen med rumpa. Når spilleren som har fått tak i ballen reiser seg opp, kan hvem som helst på laget ta ballen og kaste den videre til en annen på sitt lag. Det gjelder derfor å samarbeide med laget sitt når man plukker opp en ball på bakken. Det er ikke lov å løpe med ballen festet til vesten, med mindre du har fått en pasning.

Tar du imot på brystet når du har foten innenfor et av målområdene får laget 1 poeng. Tar du imot med rumpa når du står innenfor et av målområdene får laget 2 poeng.
Bli enige om hvor mange poeng dere går til, eller spill på tid. I Bumball kan det være lurt at dere har en dommer. Husk i så fall å rullere! Dommeren teller høyt for hver gang det blir poeng, for her kan poengene komme fort!$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Bumball sett$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c', id from utstyr where navn=$lek$Bumball sett$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Rockeringer$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c', id from utstyr where navn=$lek$Rockeringer$lek$ on conflict do nothing;

-- nid 1240: Dartspill
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('32a91df5-6788-1407-3414-6737d95a170f','lek',null,2,20,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('32a91df5-6788-1407-3414-6737d95a170f','nb',$lek$Dartspill$lek$,$lek$Dere kan bruke vanlig dartspill med piler, eller dart med magnetpiler. Hver spiller har tre kast. Den med høyest poengsum vinner. Man får to ganger summen som står på skiva hvis man treffer i det ytterste feltet, og tre ganger summen hvis man treffer i det lille feltet litt innenfor. Er man så dyktig at man klarer å treffe i midten (”bullseye”) får man 50 poeng. Avtal antall omganger, legg sammen og tell poeng.

Variant - X01: Spilles på omtrent samme måte som et vanlig dartspill, men hvor man må bli enige om å starte med en viss poengsum (301, 401, 501, 601 eller 1001). Målet er å komme nøyaktig til null. Etter hvert kast trekker man fra den poengsummen man fikk fra den man hadde fra før. Har du for eksempel 8 poeng igjen må du klare å treffe nøyaktig 8 poeng.

Variant - Klokken: Her er målet å treffe alle tallene på tavlen i rekkefølge (1-20). Hver spiller har tre kast hver runde. Man starter med å prøve og treffe 1. Dersom man treffer 1 skal man forsøke og kaste på to osv. Etter at man har kastet tre piler er det neste spiller sin tur.

Variant – Dartgolf: Målet er å fullføre alle hullene på færrest mulig kast. Alle skal kaste like mange ganger og man blir enige på forhånd om man skal spille 9 eller 18 hull. Den innerste sirkelen telles som ”hole in one”. Den ytterste sirkelen telles som to kast. De store feltene telles som tre kast. Bommer man på målet blir det fem kast. Man starter med å kaste på 1. Spilleren velger å kaste en, to eller tre piler. Det er uansett det siste kastet som telles. Når alle har kastet på 1, går man videre til 2 osv.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Dartsett$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '32a91df5-6788-1407-3414-6737d95a170f', id from utstyr where navn=$lek$Dartsett$lek$ on conflict do nothing;

-- nid 1244: Ballder
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('c8e533d3-7f44-4f97-1aa0-c64a7f8763c4','lek','begge',null,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('c8e533d3-7f44-4f97-1aa0-c64a7f8763c4','nb',$lek$Ballder$lek$,$lek$Sett sammen flere ballaktiviteter i en løype. Man skal forsøke å score mål på de forskjellige aktivitetene på færrest mulig forsøk og kortest mulig tid. Aktivitetene kan for eksempel være fotball, basket, håndball, basket og bandy. Én og én løper gjennom løypa, og første stasjon kan være å forsøke å skyte fotballen i mål. Man har tre forsøk på hver stasjon. Hvis man scorer på første stasjon, løper man videre til neste, hvor man skal kaste basketballen i kurven. Hvis man bommer på alle tre forsøkene, løper man allikevel videre til neste stasjon, men laget får en tilleggsstraff på 10 sekunder. Disse sekundene plusses på når man har passert mållinjen. Når førstemann er ferdig med løypa, starter nestemann. To av elevene må stå i mål, henholdsvis i fotball og håndball, men disse byttes ut når de selv skal i aksjon i løypa. En må ha stoppeklokke og ta tiden. Bytt på å være keepere og tidtaker.

Varianter: 

- Du kan også bruke plystreball, frisbee, og andre spill på stasjonene.

- La deltakerne starte på ulike steder på banen uten å ta tiden. Det er kun antall mål som avgjør hvem som vinner.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Fotball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Fotball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Basketball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Basketball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Basketkurv$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Basketkurv$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Innebandykøller$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Innebandykøller$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Innebandymål$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Innebandymål$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Håndball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Håndball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Håndballmål$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Håndballmål$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Dragonskin skumball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Dragonskin skumball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Stoppeklokke$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where navn=$lek$Stoppeklokke$lek$ on conflict do nothing;

-- nid 1248: Steinen bak ryggen
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('acdd94fd-a32b-91a3-df56-10ceff172ffb','lek',null,6,20,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('acdd94fd-a32b-91a3-df56-10ceff172ffb','nb',$lek$Steinen bak ryggen$lek$,$lek$Del først deltakerne inn i to lag. Lag så en lang strek med kritt. Det ene laget stiller seg til høyre og det andre laget til venstre for streken, cirka to meter unna. Det er viktig at alle deltakerne på hvert lag står skulder til skulder. Lagene skal også stå med ansiktene sine mot hverandre, slik at man ser hverandre inn i øynene. Det ene laget starter leken med å få en stein, som nå skal vandre fra hånd til hånd. Når motsatt lag roper "STOPP!", skal alle ta fram hendene sine og holde dem knyttet, slik at motstanderlaget kan gjette hvem som har steinen. Gjetter de rett, kan de ta et rotteskritt (fot foran fot) mot midtstreken. Gjetter de feil, blir de stående. Neste runde bytter man roller, slik at det laget som først skulle gjette nå får starte med steinen. Det laget som først når fram til streken, har vunnet.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Uten utstyr$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'acdd94fd-a32b-91a3-df56-10ceff172ffb', id from utstyr where navn=$lek$Uten utstyr$lek$ on conflict do nothing;

-- nid 1252: 50-leken
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('e2d23ff9-d0f0-4b66-a622-7a173c4384f1','lek','ute',null,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('e2d23ff9-d0f0-4b66-a622-7a173c4384f1','nb',$lek$50-leken$lek$,$lek$Nummerarkene henges opp rundt omkring i skogen. Bak på lappene kan det være festet ulike oppgaver. Det kan være ulike repetisjonsoppgaver fra hvilket som helst fag, eller praktiske, fysiske oppgaver. Oppgavene må ikke ta for lang tid å gjennomføre.

Del opp gruppen i lag på 3-5 personer. Før leken starter, blir lagene enige om en dyrelåt som skal være sitt lags lokkerop. Eks: Kjartan sitt lag imiterer griser: «nøff nøff!», Camilla sitt lag velger å være hunder: «Voff voff!», mens Håvard sitt lag er sauer: «bæ bæ!». En person, for eksempel trivselslederen, er dommer, og skal hele tiden stå på startplassen der terningene ligger. Trivselslederen har også fasiten med svarene på alle oppgavene.

Leken starter med at en fra hvert lag slår terningen. Lagene løper for å lete etter det tallet som terningen viste, og sprer seg for å lete mest mulig effektivt. Kjartans lag fikk terningkast 4, og Kjartan finner lappen med 4 på. Han kaller på gruppa si med lokkeropet: «Nøff nøff», og gruppa hans kommer stormende. De snur lappen, men det er ingen oppgave på baksiden. Laget løper samlet bort til dommeren, og roper «4ern var blank!», slår på nytt og får 3.

For hver gang summeres øynene på terningen, slik at laget nå skal lete etter 4 + 3 = 7. Håvard finner lappen med 7 hengende på et tre, imiterer sauer for å kalle på de
andre, snur lappen, og ser at det er en oppgave der. På lappen står det f. eks «Hvor mange ører og øyne har laget ditt til sammen?» Svaret blir: 8 ører + 8 øyne = 16 totalt. Laget til Håvard løper så tilbake til trivselslederen for å avgi svaret.

Er svaret rett, får laget et nytt kast. Terningen viser 5 og sauene skal lete etter lappen det står 12 på. Er svaret feil, kan regelen være at laget går ett tall videre, dvs at de skal lete etter lappen med 8. Første gruppe som kommer over 50 har vunnet!

Se "25-leken kropp og helse" i dokumentbanken eller ATLU for inspirasjon.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Nummerlapper fra 1-50 med oppgaver$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'e2d23ff9-d0f0-4b66-a622-7a173c4384f1', id from utstyr where navn=$lek$Nummerlapper fra 1-50 med oppgaver$lek$ on conflict do nothing;

-- nid 1263: Høy og lav
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('9d980823-b374-0d9e-1c60-9bc878bc3255','lek','ute',8,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('9d980823-b374-0d9e-1c60-9bc878bc3255','nb',$lek$Høy og lav$lek$,$lek$Aktivitet: «Aali waty» betyr høy lav på arabisk. Merk opp en firkantet bane og sett opp noe som er høyere enn bakkenivå - f.eks. en stein, huskestativ eller lignende, dette skal være frisonen. En person starter med å ha leken, og skal forsøke å ta de andre. Når deltagerne er i fare for å bli tatt, kan de bevege seg opp på frisonen og si «aali». Rekker de det, må den som jakter løpe videre for å fange noen andre. Dersom de ikke rekker det og den som har leken tar dem og sier «waty», er det deltageren som ble tatt som skal ta de andre neste runde.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Uten utstyr$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '9d980823-b374-0d9e-1c60-9bc878bc3255', id from utstyr where navn=$lek$Uten utstyr$lek$ on conflict do nothing;

-- nid 1264: Jamad, Haywan, Nabat
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('90a51fab-e4c2-df2d-1ef9-779f3d14de61','lek','ute',null,null,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('90a51fab-e4c2-df2d-1ef9-779f3d14de61','nb',$lek$Jamad, Haywan, Nabat$lek$,$lek$Aktivitet: Dette er en paradislek. Tegn et rektangel som deles opp i seks like store ruter. Bli også enige om hvor startstreken skal være. Inne i rutene står det f.eks. dyr, grønnsaker, hovedsteder, land, navn og frukt. Deltagerne står på startlinjen og skal prøve å få mest mulig poeng ved å klare å hinke alle rutene. Når deltagerne hinker fra en rute til den andre må de si et ord som hører til kategorien som er skrevet i ruten – for eksempel katt, agurk, Dublin, Danmark, Maya, eple. Hvis de klarer alle rutene får de 1 poeng og slipper første rute i neste omgang. Det er ikke lov å si det samme om igjen, du må hele tiden finne på noe nytt.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Kritt$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '90a51fab-e4c2-df2d-1ef9-779f3d14de61', id from utstyr where navn=$lek$Kritt$lek$ on conflict do nothing;

-- nid 1265: Ka pa kera
insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)
values ('57b36cb8-56cc-618d-8d08-e21406828091','lek','ute',3,3,'publisert')
on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();
insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)
values ('57b36cb8-56cc-618d-8d08-e21406828091','nb',$lek$Ka pa kera$lek$,$lek$Legg tre rockeringer med ca. fem meter avstand fra hverandre. De tre deltagerne står i hver sin rockering. Den som står i den midterste rockeringen skal ha bøtten/boksen, de to andre skal ha en skumball hver. Målet er at den i midten skal fylle opp bøtten eller boksen med snø, sand eller jord og samtidig unngå å bli truffet av de andre. Når leken begynner skal de som står på hver side telle høyt til 10. Når de kommer til 10 kan de kaste ballen i forsøk på å treffe den i midten. Dersom den i midten klarer å unngå å bli truffet kan han/hun fortsette å fylle bøtten. Klarer man å fylle opp uten å bli truffet, gis det ett poeng og den i midten kan fortsette neste runde. Hvis den som står i midten blir truffet før bøtten er full, må han/hun bytte plass med den som klarte å treffe.$lek$,'gjeldende')
on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, kronologi=excluded.kronologi, ferskhet='gjeldende';
insert into utstyr (navn) values ($lek$Dragonskin skumball$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '57b36cb8-56cc-618d-8d08-e21406828091', id from utstyr where navn=$lek$Dragonskin skumball$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Bøtte$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '57b36cb8-56cc-618d-8d08-e21406828091', id from utstyr where navn=$lek$Bøtte$lek$ on conflict do nothing;
insert into utstyr (navn) values ($lek$Rockeringer$lek$) on conflict (navn) do nothing;
insert into ressurs_utstyr (ressurs_id, utstyr_id) select '57b36cb8-56cc-618d-8d08-e21406828091', id from utstyr where navn=$lek$Rockeringer$lek$ on conflict do nothing;

commit;
