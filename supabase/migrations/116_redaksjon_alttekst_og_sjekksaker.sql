-- ============================================================================
-- 116_redaksjon_alttekst_og_sjekksaker.sql — redaksjonskø-rettinger + alt-tekst
-- ============================================================================
-- KILDE (fasit):
--   * DEL A (sjekk-saker): claude_KO-SJEKK-OG-TLDANS-10sep.md + Kjartans beslutning 11. sep.
--   * DEL B (alt-tekst):   _kontroll-import/alttekst-101/alttekst.csv (102 rader) +
--     claude_ALTTEKST-FORSLAG-10sep.md, godkjent av Kjartan 11. sep.
--
-- KOLONNER JEG BYGGER PÅ (kilde-migrasjon i parentes):
--   medier(id, ressurs_id, type, storage_sti, original_filnavn, alt_tekst, rekkefolge) (026)
--     + kilde_nid, import_kjoring_id (091) + er_original, opphav_medie_id, alt_tekst_kilde (095;
--       CHECK: alt_tekst_kilde in ('menneske','fallback')).
--   ressurser(id, kilde_nid, status) (024 + 091).  ressurs_egnet(ressurs_id, egnet_id) (025).
--   egnet_kategori(id, navn) (023, seed «SFO/AKS»).
--   samlinger(id, kilde_nid) (029 + 091).  samling_ressurs(samling_id, ressurs_id, rekkefolge, seksjon) (029).
--   dokumenter(id) (026).  dokument_sprak(dokument_id, sprak; CHECK sprak in ('nb','nn')) (103).
--   redaksjonell_ko(id, type, ressurs_id, dokument_id, medie_id, samling_id, beskrivelse,
--     status, lost_at, lost_av) (093).  medie_id har ON DELETE CASCADE (093).
--
-- MØNSTER: samme som 113 (append-medlemskap sist + vei-A egnet) og 114 (lukk kø:
--   status='lost', lost_at=now(), lost_av=Kjartans superadmin-UID).
--
-- POSISJON I SAMLING: importens samlingpass.mjs teller IKKE opp rekkefolge for en
--   uløst lenke (linje 104: raise-i-kø + `continue` UTEN rekk++), og kø-raden lagrer
--   ingen posisjon. Uløste lenkers plass er derfor IKKE lagret → alle tre leker
--   legges SIST i samlingen (rekkefolge = max+1), jf. oppdraget.
--
-- HVA (én transaksjon):
--   A. Fire sjekk-saker: A1 Klokka/Klokken (nid 13632) → samlingen til kø 3f5ce338;
--      A2 Siste paret ut (nid 1452) → samlingen til kø 035e2022; A3 «21» (nid 3939) →
--      samlingen til kø 46d87f83; A4 Kurshefte 2025 høst (dok b72389ec…) → dokument_sprak nb.
--      Alle fire kø-rader lukkes. A1/A2 (SFO/AKS-samlingen) får vei-A egnet «SFO/AKS».
--   B. Alt-tekst for importbildene: 99 fallback-bilder får ferdig renset alt-tekst +
--      alt_tekst_kilde='menneske'. To korrupte/dublett medier-rader slettes (Catch the
--      ball korrupt fil; Storm i klasserommet dublett). manglende_alttekst-kø lukkes.
--
-- URØRT (sperre): kun importbilder med alt_tekst_kilde='fallback' røres. Blindekast og
--   de 12 bildene lastet opp 10. sep (storage_sti med /redaksjon/, kilde='menneske') er
--   fredet — momentsnapshot tas før og verifiseres uendret etter.
--
-- SPERRER: allerede-kjørt (korrupt 3217-rad borte); alle forutsetninger finnes; hver
--   alt-tekst-nøkkel treffer nøyaktig 1 fallback-rad; 17128 har 2 rader før / 1 etter;
--   korrupt 3217 borte etter; menneske-bilder uendret; 99 nå 'menneske'; medlemskap,
--   dokument_sprak og kø-lukking som forventet.
--
-- TILBAKERULLING (etter commit, hvis nødvendig): se claude_LEVERANSE-116 (skisse).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Alt-tekst-forslagene (99), FERDIG RENSET (Foto:/Illustrasjon: fjernet fra
-- starten; Diagram:/Skjermbilde: beholdt). Generert fra alttekst.csv, lesbart her.
-- ----------------------------------------------------------------------------
create temp table tmp_alttekst (nid text, filnavn text, alttekst text) on commit drop;
insert into tmp_alttekst (nid, filnavn, alttekst) values
    ('1037','ostejaktasset_17.jpg','Diagram: Skisse av en bane på 20×10 meter med erteposer i én ende, fem røde ringer midt på banen og startområder for to lag i andre enden.'),
    ('1039','fengselsdirektorenasset_19.png','Diagram: Skisse av et 5×5 meter stort «fengsel» merket med kjegler, med fem meter til startstreken.'),
    ('1044','starwarsasset_11.asset_13.png','Diagram: Skisse av en 15×15 meter bane med kjegler i hjørnene, der hvert lag har en «Yoda»-ring og en «Darth Vader»-markør på hver sin side.'),
    ('1045','blink_liten_baneasset_25.png','Diagram: Skisse av en kort slalåmløype med kjegler frem til en blink med poengsoner, og en egen strafferunde ved bom.'),
    ('1045','blinkasset_24.png','Diagram: Skisse av en lang, buktende slalåmløype med kjegler som ender ved en blink med poengsoner, med egen strafferunde ved bom.'),
    ('1046','battle_royaeasset_21.png','Diagram: Skisse av en stor sirkel med fire kjegleområder i hjørnene, tre grønne baller og én oransje ball midt i sirkelen.'),
    ('1047','pizzasisten_01_-_bv.tif_.jpg','Barn i vinterklær går i snøen oppover en bakke, ett barn med gul refleksvest fremst i bildet.'),
    ('1053','stein_skas_papit-battle_v2.png','Diagram: Skisse av en bane med fargede ringer satt opp i sikksakk-mønster mellom startområder for lag 1 og lag 2.'),
    ('1055','stikkball_med_hinder.png','Diagram: Skisse av en bane med kjegler i hjørnene og tre markerte hindre — to rektangler og en sirkel — midt på banen.'),
    ('1056','crazykingasset_15.png','Diagram: Skisse av en 10×6 meter bane delt i to felt, med fire lilla prikker på venstre side og fire oransje prikker på høyre side, pluss én prikk midt i hvert felt.'),
    ('1057','spring_for_livetasset_12.png','Diagram: Skisse av en 15×10 meter bane med blå kjegler langs begge langsider, to oransje ringer ved kortsidene og en klynge røde og gule kjegler midt på banen.'),
    ('1058','skiss.yoshijpg.jpg','Fugleperspektiv av en gressbane med spilleflate avmerket med blå og oransje kjegler i to speilvendte mønstre.'),
    ('1060','prison.png','Ikon av en nøkkelknippe med tre nøkler.'),
    ('1060','skjermbilde_2018-07-04_kl._14.23.30.png','En gruppe i oransje t-skjorter står samlet på en sandstrand med røde kjegler utplassert.'),
    ('1061','kremmerhusetasset_15.png','Diagram: Skisse av en 20×10 meter bane med to samlinger hvite baller på hver side, en rød og en blå kurv øverst og en gul kurv midt på banen.'),
    ('1064','dsc_5598.jpg','En gruppe ungdommer utendørs holder knyttet hånd i været og spiller stein-saks-papir mot hverandre.'),
    ('1065','dropball.png','Diagram: Skisse av en 10×20 meter bane med to 3×3 meter store felt markert i hvert sitt hjørne.'),
    ('1067','skytterne.png','Diagram: Skisse av en 10×10 meter bane med kjegler i hjørnene og en rekke kjegler på rad ned midten.'),
    ('1068','tl-veien_fasit_1.jpg','Diagram: Fasit-rutenett for «TL-veien» med TL-logoer plassert i bestemte ruter som viser riktig vei gjennom rutenettet, fra lag 2 øverst til lag 1 nederst.'),
    ('1069','skattejakt.png','Diagram: Skisse av en 10×20 meter bane med «skattekammer» fylt med fargede baller i to hjørner og tomme «fengsel»-ringer i de to andre, med en rekke kjegler ned midten.'),
    ('1070','skjermbilde_2017-01-02_kl._16.20.33.png','Skann av et bingobrett med 24 illustrasjoner av barn i ulike aktiviteter, i to identiske rutenett under hverandre.'),
    ('1075','yeti.png','Diagram: Skisse av en 8×10 meter bane med fargede ballklynger («Yetiens hule») øverst, to oransje «Monsterball»-baller midt på banen og fargede ringer nederst merket «Lag 1-5».'),
    ('1080','fjelltaka.png','Diagram: Skisse av en bane med en rekke nummererte kjegler øverst (fra 1 til 10 og tilbake til 1) og 25 meter ned til startstreken.'),
    ('1083','basse_01_-_bh.jpg','Barn hopper mellom hvite ringer malt på asfalten utenfor en skolebygning, noen med oransje refleksvest.'),
    ('1084','hugga_sagga.png','Diagram: Skisse av en 15×8 meter bane med kjegler i hjørnene, en klynge løpende figurer på venstre side og én figur alene på høyre side.'),
    ('1087','gutter_vs_jenter_kjott_og_blodsam_8249.jpg','Barn i vinterklær strekker seg for å ta hverandre i hendene på en kunstgressbane med rødt løpefelt i bakgrunnen.'),
    ('1091','ladder_golf.png','Diagram: Skisse av to ladder golf-stativer merket «Lag 1» og «Lag 2», med tre meter til hver sin blå kurv og en felles grønn kurv nederst.'),
    ('1094','24829225_10155560091023283_1463577071_n.jpg','Flere gule rockeringer flettet sammen til en kule-lignende struktur på gressplen.'),
    ('1094','rockringshuset.jpg','Fugleperspektiv av en gressbane avmerket med oransje prikker langs kantene og fargede ringer i blått, grønt og rødt spredt utover.'),
    ('1096','istock-177370171.jpg','Tre trinn av trespillet «Tårnet i Hanoi», der runde skiver flyttes mellom tre pinner.'),
    ('1098','fotballkubb.png','Diagram: Skisse av en 10×5 meter bane med gule kjegler langs begge langsider og en fotball plassert midt på banen.'),
    ('1099','skjermbilde_2019-07-24_kl._09.18.37.png','Diagram: Skisse med tre grupper figurer i ulike farger som løper i sløyfer rundt en oransje ball i midten, vist med piler.'),
    ('1102','istock-638989218.jpg','Fem barn står tett sammen utendørs med armene rundt hverandre og ler.'),
    ('1104','magic_box_01_-_bh.jpg.jpg','Barn spiller innebandy utendørs på gress, med gule køller og en oransje-blå ball.'),
    ('1106','istock-524020214.jpg','Stilisert ikon av en flaske med bevegelsesstriper rundt, i retrostil.'),
    ('1108','warball_0.jpg','Diagram: Skisse av en 16×8 meter bane med grønne baller i hjørnene, gule kjegler spredt utover og en klynge fargede baller midt på banen.'),
    ('1110','tl-battle.jpg','To dodgeball-vester, én mørkeblå og én limegrønn, med rød blink midt på og baller festet i lommer.'),
    ('1111','monsterpinball.png','Diagram: Skisse av en bane med gule figurer langs kanten, blå figurer inne på banen og en oransje «Monsterball» med pil som viser kast mot en blå spiller.'),
    ('1117','skjermbilde_2019-07-22_kl._11.23.24.png','Diagram: Skisse med to rekker figurer som står vendt mot hverandre, fargede firkanter spredt mellom dem og kjegler som markerer en linje midt på banen.'),
    ('1118','skjermbilde_2019-07-22_kl._11.20.32.png','Åtte fargede baller samlet i midten, med en oransje ring i hvert hjørne.'),
    ('1119','skjermbilde_2019-07-22_kl._11.16.47.png','Fire felt delt av et grønt kors, hver med to tegnede barn i lek.'),
    ('1125','ninja.jpg','Seks tegnede ninja-figurer i ulike kampstillinger på rad.'),
    ('1127','rockball.png','Diagram: Skisse med fire kolonner av tre fargede ringer over en startlinje, og fargede kjegler spredt utover nedenfor.'),
    ('1128','rush_hourasset_26-100.jpg','Diagram: Skisse av en 20×10 meter bane med en kolonne av ni figurer langs venstre kant og start markert til høyre.'),
    ('1131','frisbeekastasset_26-100.jpg','Diagram: Skisse av en 15×5 meter bane med to rader poengringer merket 4p, 3p og 2p, og start til høyre.'),
    ('1133','skjermbilde_2019-07-22_kl._10.36.27.png','Firkant med en fargeflekk med diagonale striper i hvert hjørne — blå, rød og grønn.'),
    ('1136','bumballasset_25.png','Diagram: Skisse av en 20×10 meter bane med en blå ring på venstre side og en rød ring på høyre side.'),
    ('1142','pirateneasset_14_0.png','Diagram: Skisse av en 20×20 meter bane med kjegler langs kantene og en bøtte med tilhørende ring i hvert av de fire hjørnene, i gult, blått, grønt og rødt.'),
    ('1143','skjermbilde_2019-07-22_kl._10.42.34.png','Diagram: Skisse med tre streker — en rad gule ringer ved strek 2 og en rad grønne og oransje ringer ved strek 1, med tilhørende fargesymboler nederst.'),
    ('1144','skjermbilde_2018-07-06_kl._08.27.06.png','Rundt nettspill (spikeball) med tre grønne baller, bæreveske og pumpe.'),
    ('1145','flaggkampen_med_dodgeball.png','Diagram: Skisse av en 16×10 meter bane med flagg og fangehull i hvert sitt hjørne, grønne baller spredt på hver side og en rekke gule kjegler ned midtlinjen.'),
    ('1147','dragonbattle.png','Diagram: Skisse av en 16×10 meter bane med fargede sekker i hvert hjørne, oransje og rosa ringer midt på hver side, grønne baller spredt utover og en rekke gule kjegler ned midtlinjen.'),
    ('1151','skjermbilde_2019-07-22_kl._11.03.06_0.png','Diagram: Skisse av en sirkel med ti punkter merket lag 1 til lag 4, og en liten rød blink i midten.'),
    ('1154','skjermbilde_2019-06-27_kl._14.11.01.png','Diagram: Skisse av en bane delt i en rød og en blå halvdel, med spillere som prikker og piler merket «inn» og «ut» på sidene, og «kongen» øverst og nederst.'),
    ('1521','skjermbilde_2019-08-16_kl._12.02.56.png','Tegnede barn i ulike nasjonaldrakter øverst, og seks barn med ulik hudfarge som holder hverandre i hendene under teksten «Vi er forskjellige».'),
    ('1524','0.8_trivsels_blomst.jpg','Rutenett med tolv fargerike blomster, der midtblomsten har TP-logo og teksten «Trivsel».'),
    ('1683','mini-nord_og_sorasset_20.png','Diagram: Bane delt i «Nord» og «Sør», hver med fire nummererte oransje sirkler i to rekker, og to blå baller i midten.'),
    ('1686','returballasset_19.png','Diagram: Bane på 6×3 meter med kjegler i midten, lyseblå markører langs venstre kant og røde markører langs høyre kant.'),
    ('1688','pirates_of_the_caribbean_bane.jpg','Luftfoto av gressbane avgrenset med gule/orange prikkmarkører, med to klynger av fargede markører på banen.'),
    ('1689','bevegelsesbingoasset_19.png','Diagram: Bane med hvite markører midt på hver side og en klynge gule kjegler samlet i midten.'),
    ('1690','streetkingasset_19.png','Diagram: Bane delt i fire felt (Konge, Bonde, Dame, Knekt) rundt et skravert midtfelt, med piler som viser rotasjon og kø.'),
    ('2844','flyvern.psd_.jpg','Diagram: Paradis-bane (hopperute) nummerert fra 1 til 9 med enkelt- og dobbeltfelt.'),
    ('2847','konkurranseparadis_01_-_bh.jpg','Barn ute ved en skolebygning, en voksen i oransje vest løper, med oppmerking på bakken og et barn som hopper.'),
    ('3199','flyvende_fargerasset_18.png','Diagram: Bane på 10×8 meter med en fargekjegle i hvert hjørne (blå, rød, gul, grønn).'),
    ('3203','web_image_ftb-002g_1_954174114.jpeg','Fire fargede strikk (rød, grønn, gul, blå) festet til et sort belte med spenne, merket med tall 1–4.'),
    ('3204','10_sekundesistenasset_20.png','Diagram: Bane på 10×10 meter med åtte blå prikker spredt inne i feltet og fem oransje prikker på rekke utenfor.'),
    ('3205','six-ball_battle_01_-_bh.jpg','Barn på gressbane kaster en oransje ball i luften, med en blå ball liggende bakerst og kjegler markert på bakken.'),
    ('3205','ogo_sport.jpg','Barn i oransje vest holder en pigget ball i munnen og gir tommel opp, med blå ringer i bakgrunnen.'),
    ('3205','speedstacking.jpg','Oransje stables-kopper (Speed Stacks) satt opp i pyramider på en matte, med tidtaker og bag ved siden av.'),
    ('3206','disc-boccia_uten_bocciaasset_19.png','Diagram: Bane på 10×10 meter med et mål i midten og fire lag (rød, gul, grønn, blå) plassert rundt hvert sitt hjørne.'),
    ('3217','catch_the_ballasset_21_0.png','Diagram: Bane på 8×4 meter med én oransje spiller øverst og seks blå spillere på rekke nedover.'),
    ('3219','web_image_crossbocciar_familypack_pro_race_arrows_1396111-1853338911.jpeg','Tolv myke ballsekker i ulike mønstre og farger, samt en liten hvit markørball merket «Cross Boccia».'),
    ('3220','wrekingballasset_20.png','Diagram: Sirkel på 8 meter i diameter med åtte blå spillere rundt kanten, en stor ball i midten og fire oransje spillere inni.'),
    ('3930','skjermbilde_2020-05-11_kl._10.17.40.png','Skjermbilde: Tabell «Dag 1» med kortstokkøvelser: kløver=knebøy, spar=hoppe over hverandre, ruter=mageøvelse, hjerter=spensthopp.'),
    ('3930','skjermbilde_2020-05-11_kl._10.19.25.png','Skjermbilde: Tabell «Dag 2» med kortstokkøvelser: kløver=pushups, spar=rygg-til-rygg-knebøy, ruter=planke, hjerter=trappeløp.'),
    ('3932','skjermbilde_2020-05-11_kl._11.12.59.png','Skjermbilde: Liste med seks øvelser i en aktivitetssirkel: kneløft, burpees, planken, push ups, tåhev og hoppende utfall.'),
    ('3934','skjermbilde_2020-05-11_kl._11.40.31.png','Skjermbilde: Liste med tolv bevegelsesoppgaver hvor barna skal bevege seg som ulike dyr, som frosk, hest, fisk, bjørn og ørn.'),
    ('7378','stinkdyret.jpg','Luftfoto av gressbane med oransje markører langs kantene og røde prikker og sirkler markert midt på banen.'),
    ('7380','jumbo.jpg','Barn utendørs sender en rød ball over hodet mens de står i ring, med fargede kopper/bøtter plassert rundt på gresset.'),
    ('7381','dice-25637_1280.png','To røde terninger med hvite prikker, ett terningkast med tallene 5 og 6 synlig.'),
    ('7382','konmemory_klippt.jpg','Luftfoto av gressbane med røde prikker spredt uregelmessig på venstre side og tre røde sirkler markert til høyre.'),
    ('7383','perfekt_pass_2.jpg','Tre barn på en gressplen kaster og tar imot en ball, med oransje kjegler utplassert på bakken og boligblokker i bakgrunnen.'),
    ('7384','gagaboll_1.jpg','Barn og en voksen står rundt et lavt nettgjerde (gaga-bane) på en gressplen, klare til å spille.'),
    ('7385','toss2.jpg','Barn utendørs kaster en rød ball ved hjelp av fargede tøystykker de holder i, med boligblokker i bakgrunnen.'),
    ('7387','ja_eller_nej_plan.jpg','Gressplen med mange fargede kjegler (gule, oransje, blå, hvite) plassert i rader, boligblokker i bakgrunnen.'),
    ('7391','stampet_gar.jpg','En gruppe barn og en voksen i oransje vest står samlet i en ring på en gressplen.'),
    ('7392','snabba_kortet_2.jpg','Barn kneler rundt en gymnastikkbenk med spillkort lagt ut på rekke, i en gymsal.'),
    ('10810','kanjam_0.jpeg','Spillet KanJam med to sorte spillbøtter, en gul frisbee og produktesken merket «KanJam».'),
    ('10811','skjermbilde_2023-03-17_kl._15.50.13_0.png','Fargede flagg festet mellom kjegler danner en sekskantet bane på gulvet, med en rosa ball i midten.'),
    ('10812','cornhole.jpeg','To trebrett med hull (cornhole) og fargede sandsekker, fire blå og fire røde.'),
    ('10813','femball.png','Diagram: Bane delt i «Utelag» og «Innelag», med gule kjegler langs kantene og fem ulike baller markert på innelagets side.'),
    ('10814','frihetsgudinnan.jpg','Frihetsgudinnen sett nedenfra mot blå himmel, med fakkel hevet i den ene hånden.'),
    ('10815','ulv_med_bakgrunn.png','Tegnet grå ulv med blå øyne, stående på bakbena mot en turkis bakgrunn.'),
    ('10815','rev.jpg','Tegnet oransje rev med hvit buk og stort smil, sittende med hevet hode.'),
    ('12415','forside_lite.png','Adventskalender formet som et juletre med 24 nummererte julepynt-felter og et ekorn med nisselue nederst.'),
    ('16227','ertepose_1.jpg','Blå erteposen merket «Klubben» med en liten logo av en hoppende figur.'),
    ('17073','istockphoto-1087878984-612x612.jpg','Rød-hvit stripete popcornboks full av popcorn, med noen popcorn strødd rundt bunnen.'),
    ('17076','kakerlakk.jpg','Tegnet kakerlakk i oransje og brunt med store øyne og smilende ansikt.'),
    ('17128','virvelvind.jpg','Tegnet gråblå virvelvind med et smilende ansikt og skjevt hevet øyenbryn.');

-- Momentbilde av ALLE 'menneske'-medier (Blindekast + de 12 redaksjon-bildene m.fl.)
-- for urørt-sperren etter migrasjonen.
create temp table tmp_menneske_snapshot on commit drop as
  select id, alt_tekst from medier where alt_tekst_kilde = 'menneske';

-- ----------------------------------------------------------------------------
-- SPERRER FØR
-- ----------------------------------------------------------------------------
do $$
declare
  n int;
  v_15468 uuid; v_jul uuid;
begin
  -- 0) ALLEREDE KJØRT / uventet: den korrupte 3217-raden finnes (blir slettet under).
  select count(*) into n from medier m
    join ressurser r on r.id = m.ressurs_id and r.kilde_nid = '3217'
   where right(m.storage_sti, length('/catch_the_ballasset_21.png')) = '/catch_the_ballasset_21.png';
  if n <> 1 then
    raise exception 'STOPP 116 (FØR-0): fant % rad(er) for catch_the_ballasset_21.png på nid 3217, forventet 1 — enten er 116 allerede kjørt (korrupt rad slettet), eller filnavnformen i storage_sti er en annen enn antatt.', n;
  end if;

  -- 1) Storm i klasserommet (17128): nøyaktig 2 medier-rader FØR.
  select count(*) into n from medier m join ressurser r on r.id = m.ressurs_id and r.kilde_nid = '17128';
  if n <> 2 then raise exception 'STOPP 116: 17128 har % medier-rader, forventet nøyaktig 2 før.', n; end if;

  -- 2) De fire sjekk-sak-kø-radene finnes og er åpne (status ny).
  select count(*) into n from redaksjonell_ko
   where id in ('3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4','035e2022-cd2a-b7db-2e06-3ff2cc61fd8c',
                '46d87f83-490f-d757-83db-0d7f58048daf','6d5be6e5-95dd-b728-cd5e-03aa2382bdeb')
     and status = 'ny';
  if n <> 4 then raise exception 'STOPP 116: forventet 4 åpne sjekk-sak-kø-rader, fant %.', n; end if;

  -- 3) Mål-lekene for A1-A3 finnes (via kilde_nid).
  select count(*) into n from (values ('13632'),('1452'),('3939')) v(nid)
    where not exists (select 1 from ressurser r where r.kilde_nid = v.nid);
  if n <> 0 then raise exception 'STOPP 116: % mål-lek(er) for sjekk-sak A1-A3 mangler.', n; end if;

  -- 4) Dokumentet for A4 finnes.
  if not exists (select 1 from dokumenter where id = 'b72389ec-7eef-37a3-b248-2538760a830b') then
    raise exception 'STOPP 116: dokument b72389ec… (Kurshefte 2025 høst) mangler.';
  end if;

  -- 5) egnet_kategori «SFO/AKS» finnes (vei A for A1/A2).
  if not exists (select 1 from egnet_kategori where navn = 'SFO/AKS') then
    raise exception 'STOPP 116: egnet_kategori «SFO/AKS» mangler.';
  end if;

  -- 6) Hver av de 99 alt-tekst-nøklene treffer NØYAKTIG 1 fallback-medier-rad
  --    (lekens kilde_nid + filnavn som suffiks i storage_sti). Fanger både
  --    «traff ingen» og «traff flere».
  select count(*) into n from tmp_alttekst f
   where (select count(*) from medier m
            join ressurser r on r.id = m.ressurs_id and r.kilde_nid = f.nid
           where right(m.storage_sti, length(f.filnavn) + 1) = '/' || f.filnavn
             and m.alt_tekst_kilde = 'fallback') <> 1;
  if n <> 0 then raise exception 'STOPP 116: % alt-tekst-nøkkel/nøkler traff ikke nøyaktig 1 fallback-medier-rad.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- B1. SLETT to medier-rader (korrupt + dublett). manglende_alttekst-kø for disse
--     fjernes automatisk via medie_id ON DELETE CASCADE (093).
-- ----------------------------------------------------------------------------
-- Catch the ball: korrupt eksportfil (behold lekens andre bilde _0.png).
delete from medier m using ressurser r
 where m.ressurs_id = r.id and r.kilde_nid = '3217'
   and right(m.storage_sti, length('/catch_the_ballasset_21.png')) = '/catch_the_ballasset_21.png';
-- Storm i klasserommet: to byte-like bilder — behold 17128_virvelvind.jpg, slett dubletten.
delete from medier m using ressurser r
 where m.ressurs_id = r.id and r.kilde_nid = '17128'
   and right(m.storage_sti, length('/virvelvind_0.jpg')) = '/virvelvind_0.jpg';

-- ----------------------------------------------------------------------------
-- B2. SETT alt-tekst (99) + alt_tekst_kilde='menneske'. Kun fallback-rader røres.
-- ----------------------------------------------------------------------------
update medier m
   set alt_tekst = f.alttekst,
       alt_tekst_kilde = 'menneske'
  from tmp_alttekst f
  join ressurser r on r.kilde_nid = f.nid
 where m.ressurs_id = r.id
   and right(m.storage_sti, length(f.filnavn) + 1) = '/' || f.filnavn
   and m.alt_tekst_kilde = 'fallback';

-- ----------------------------------------------------------------------------
-- B3. LUKK manglende_alttekst-kø for de 99 nettopp oppdaterte bildene + Blindekast
--     (nid 1079) om den står åpen. status='lost', lost_av = Kjartans superadmin-UID.
-- ----------------------------------------------------------------------------
update redaksjonell_ko rk
   set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
 where rk.type = 'manglende_alttekst' and rk.status = 'ny'
   and rk.medie_id in (
     select m.id from tmp_alttekst f
       join ressurser r on r.kilde_nid = f.nid
       join medier m on m.ressurs_id = r.id and right(m.storage_sti, length(f.filnavn) + 1) = '/' || f.filnavn
   );
update redaksjonell_ko rk
   set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
 where rk.type = 'manglende_alttekst' and rk.status = 'ny'
   and rk.medie_id in (
     select m.id from medier m join ressurser r on r.id = m.ressurs_id where r.kilde_nid = '1079'
   );

-- ----------------------------------------------------------------------------
-- A1. Klokka/Klokken (nid 13632) → samlingen til kø 3f5ce338 (append sist). Lukk kø.
-- ----------------------------------------------------------------------------
insert into samling_ressurs(samling_id, ressurs_id, rekkefolge, seksjon)
select rk.samling_id, r.id,
       (select coalesce(max(sr.rekkefolge), -1) + 1 from samling_ressurs sr where sr.samling_id = rk.samling_id),
       null
from redaksjonell_ko rk
join ressurser r on r.kilde_nid = '13632'
where rk.id = '3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4'
on conflict (samling_id, ressurs_id) do nothing;
-- vei A: SFO/AKS-samling → merk leken med egnet «SFO/AKS».
insert into ressurs_egnet(ressurs_id, egnet_id)
select r.id, e.id from ressurser r cross join egnet_kategori e
where r.kilde_nid = '13632' and e.navn = 'SFO/AKS'
on conflict (ressurs_id, egnet_id) do nothing;
update redaksjonell_ko set status='lost', lost_at=now(), lost_av='9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where id = '3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4' and status = 'ny';

-- ----------------------------------------------------------------------------
-- A2. Siste paret ut (nid 1452) → samlingen til kø 035e2022 (append sist). Lukk kø.
-- ----------------------------------------------------------------------------
insert into samling_ressurs(samling_id, ressurs_id, rekkefolge, seksjon)
select rk.samling_id, r.id,
       (select coalesce(max(sr.rekkefolge), -1) + 1 from samling_ressurs sr where sr.samling_id = rk.samling_id),
       null
from redaksjonell_ko rk
join ressurser r on r.kilde_nid = '1452'
where rk.id = '035e2022-cd2a-b7db-2e06-3ff2cc61fd8c'
on conflict (samling_id, ressurs_id) do nothing;
insert into ressurs_egnet(ressurs_id, egnet_id)
select r.id, e.id from ressurser r cross join egnet_kategori e
where r.kilde_nid = '1452' and e.navn = 'SFO/AKS'
on conflict (ressurs_id, egnet_id) do nothing;
update redaksjonell_ko set status='lost', lost_at=now(), lost_av='9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where id = '035e2022-cd2a-b7db-2e06-3ff2cc61fd8c' and status = 'ny';

-- ----------------------------------------------------------------------------
-- A3. «21» (nid 3939) → samlingen til kø 46d87f83 (append sist). Lukk kø.
--     Julekalender-samlingen har ingen egnet_kategori → ingen vei-A (som 113 for 16212).
-- ----------------------------------------------------------------------------
insert into samling_ressurs(samling_id, ressurs_id, rekkefolge, seksjon)
select rk.samling_id, r.id,
       (select coalesce(max(sr.rekkefolge), -1) + 1 from samling_ressurs sr where sr.samling_id = rk.samling_id),
       null
from redaksjonell_ko rk
join ressurser r on r.kilde_nid = '3939'
where rk.id = '46d87f83-490f-d757-83db-0d7f58048daf'
on conflict (samling_id, ressurs_id) do nothing;
update redaksjonell_ko set status='lost', lost_at=now(), lost_av='9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where id = '46d87f83-490f-d757-83db-0d7f58048daf' and status = 'ny';

-- ----------------------------------------------------------------------------
-- A4. Kurshefte 2025 høst (dok b72389ec…): sett språk nb (feiltagging «en»). Lukk kø.
-- ----------------------------------------------------------------------------
insert into dokument_sprak(dokument_id, sprak)
values ('b72389ec-7eef-37a3-b248-2538760a830b', 'nb')
on conflict (dokument_id, sprak) do nothing;
update redaksjonell_ko set status='lost', lost_at=now(), lost_av='9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where id = '6d5be6e5-95dd-b728-cd5e-03aa2382bdeb' and status = 'ny';

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  -- Sletting: 17128 har nøyaktig 1 rad igjen; korrupt 3217-rad borte.
  select count(*) into n from medier m join ressurser r on r.id = m.ressurs_id and r.kilde_nid = '17128';
  if n <> 1 then raise exception 'STOPP 116 (etter): 17128 har % medier-rader, forventet 1.', n; end if;
  if exists (select 1 from medier m join ressurser r on r.id = m.ressurs_id and r.kilde_nid = '3217'
              where right(m.storage_sti, length('/catch_the_ballasset_21.png')) = '/catch_the_ballasset_21.png') then
    raise exception 'STOPP 116 (etter): korrupt 3217-rad finnes fortsatt.';
  end if;

  -- Urørt: hvert 'menneske'-bilde fra momentbildet finnes uendret.
  select count(*) into n from tmp_menneske_snapshot s
    where not exists (select 1 from medier m
                      where m.id = s.id
                        and m.alt_tekst is not distinct from s.alt_tekst
                        and m.alt_tekst_kilde = 'menneske');
  if n <> 0 then raise exception 'STOPP 116 (etter): % fredet menneske-bilde ble endret/slettet.', n; end if;

  -- Alle 99 nøkler er nå 'menneske' med riktig tekst.
  select count(*) into n from tmp_alttekst f
   where not exists (select 1 from medier m
       join ressurser r on r.id = m.ressurs_id and r.kilde_nid = f.nid
      where right(m.storage_sti, length(f.filnavn) + 1) = '/' || f.filnavn
        and m.alt_tekst_kilde = 'menneske' and m.alt_tekst = f.alttekst);
  if n <> 0 then raise exception 'STOPP 116 (etter): % alt-tekst ble ikke satt riktig.', n; end if;

  -- A1-A3: de tre lekene er medlem av sine samlinger.
  select count(*) into n from (values
      ('3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4','13632'),
      ('035e2022-cd2a-b7db-2e06-3ff2cc61fd8c','1452'),
      ('46d87f83-490f-d757-83db-0d7f58048daf','3939')) v(ko_id, l_nid)
    where not exists (
      select 1 from redaksjonell_ko rk
      join samling_ressurs sr on sr.samling_id = rk.samling_id
      join ressurser r on r.id = sr.ressurs_id and r.kilde_nid = v.l_nid
      where rk.id = v.ko_id::uuid);
  if n <> 0 then raise exception 'STOPP 116 (etter): % sjekk-sak-lek(er) ble ikke medlem av samlingen.', n; end if;

  -- A4: dokument_sprak nb finnes.
  if not exists (select 1 from dokument_sprak where dokument_id = 'b72389ec-7eef-37a3-b248-2538760a830b' and sprak = 'nb') then
    raise exception 'STOPP 116 (etter): dokument_sprak nb ble ikke satt for Kurshefte 2025 høst.';
  end if;

  -- De fire sjekk-sak-kø-radene er lukket.
  select count(*) into n from redaksjonell_ko
   where id in ('3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4','035e2022-cd2a-b7db-2e06-3ff2cc61fd8c',
                '46d87f83-490f-d757-83db-0d7f58048daf','6d5be6e5-95dd-b728-cd5e-03aa2382bdeb')
     and status = 'lost';
  if n <> 4 then raise exception 'STOPP 116 (etter): forventet 4 lukkede sjekk-sak-kø-rader, fant %.', n; end if;

  -- Ingen manglende_alttekst-kø står åpen for de 99 oppdaterte bildene.
  select count(*) into n from redaksjonell_ko rk
   where rk.type = 'manglende_alttekst' and rk.status = 'ny'
     and rk.medie_id in (
       select m.id from tmp_alttekst f
         join ressurser r on r.kilde_nid = f.nid
         join medier m on m.ressurs_id = r.id and right(m.storage_sti, length(f.filnavn) + 1) = '/' || f.filnavn);
  if n <> 0 then raise exception 'STOPP 116 (etter): % manglende_alttekst-kø står fortsatt åpen for oppdaterte bilder.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les etter kjøring).
-- ----------------------------------------------------------------------------
select
  (select count(*) from redaksjonell_ko sr_ko
     where sr_ko.id in ('3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4','035e2022-cd2a-b7db-2e06-3ff2cc61fd8c',
                        '46d87f83-490f-d757-83db-0d7f58048daf') and sr_ko.status='lost')          as sjekksak_lenker_lukket,
  (select string_agg(l_nid || '→sam' || substr(s.kilde_nid,1,6), ', ' order by l_nid) from (values
        ('3f5ce338-1ab8-7cbd-6660-c7c9b0fc36e4','13632'),
        ('035e2022-cd2a-b7db-2e06-3ff2cc61fd8c','1452'),
        ('46d87f83-490f-d757-83db-0d7f58048daf','3939')) v(ko_id,l_nid)
      join redaksjonell_ko rk on rk.id = v.ko_id::uuid
      join samlinger s on s.id = rk.samling_id)                                                    as samlingsmedlemskap,
  (select count(*) from dokument_sprak where dokument_id='b72389ec-7eef-37a3-b248-2538760a830b' and sprak='nb') as kurshefte_nb,
  (select count(*) from medier where alt_tekst_kilde='menneske' and alt_tekst in (select alttekst from tmp_alttekst)) as medier_oppdatert,
  (select count(*) from ressurs_egnet re join ressurser r on r.id=re.ressurs_id join egnet_kategori e on e.id=re.egnet_id
     where r.kilde_nid in ('13632','1452') and e.navn='SFO/AKS')                                   as egnet_sfoaks_lagt_til,
  (select string_agg(type||':'||c, ', ' order by type) from (
      select type, count(*) c from redaksjonell_ko
      where status='lost' and lost_av='9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
        and lost_at = now() group by type) t)                                                      as ko_lukket_per_type,
  (select count(*) from redaksjonell_ko where type='manglende_alttekst' and status='ny')           as manglende_alttekst_apne_igjen,
  (select count(*) from medier where alt_tekst_kilde='fallback')                                    as importbilder_fallback_igjen;

commit;
