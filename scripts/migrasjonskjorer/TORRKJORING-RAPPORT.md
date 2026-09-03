# Tørrkjøring — migrasjonskjører

**Dato:** 2. sep 2026 · **Modus:** TØRRKJØRING (ingen database kontaktet).
Verktøy: `scripts/migrasjonskjorer/migrasjonskjorer.mjs`. `supabase db push` ikke brukt.

## Filoversikt
- Migrasjonsfiler funnet: **87** (mønster `NNN_navn.sql`)
- Hull i nummerrekken: **ingen**
- Avvikende filnavn: **ingen**
- Dupliserte numre: **ingen**
- Ikke-SQL-filer i mappa: **ingen**

## Flagg-sammendrag

| Flaggtype | Antall | Betydning |
|---|---:|---|
| LIVE-UUID | 148 | hardkodet UUID-literal fra live-data |
| SEEDING | 170 | topp-nivå `insert into` — kjøres ved migrering (test- eller referansedata) |
| INSERT-I-FUNKSJON | 37 | `insert into` inne i funksjonskropp — kjøretidslogikk, IKKE seeding |
| DROP-UTEN-IF-EXISTS | 0 | `drop` som forutsetter at objektet finnes |
| FORWARD-FUNKSJON | 0 | kall til funksjon definert i en senere fil |

## Alle filer med status

| # | Fil | Bytes | Setn. | Dok? | Flagg |
|---:|---|---:|---:|:---:|---|
| 001 | 001_initial_schema.sql | 2201 | 12 |  | — |
| 002 | 002_paameldinger.sql | 1089 | 3 |  | — |
| 003 | 003_skoler_utvidet.sql | 319 | 2 |  | — |
| 004 | 004_roller_utvidet.sql | 505 | 4 |  | — |
| 005 | 005_profiles_utvidet.sql | 171 | 1 |  | — |
| 006 | 006_roller_v2.sql | 783 | 7 |  | — |
| 007 | 007_rls_skoleadmin.sql | 1082 | 4 |  | — |
| 008 | 008_rls_ansatt.sql | 839 | 3 |  | — |
| 009 | 009_hubspot.sql | 155 | 1 |  | — |
| 010 | 010_skoler_kontaktinfo.sql | 477 | 1 |  | — |
| 011 | 011_skoler_kontakter.sql | 550 | 1 |  | — |
| 012 | 012_skoler_hubspot_id.sql | 143 | 1 |  | — |
| 013 | 013_tla_kontakter.sql | 391 | 2 |  | — |
| 014 | 014_rydd_tla_kolonner.sql | 347 | 1 |  | — |
| 015 | 015_brukslogg.sql | 1460 | 8 |  | — |
| 016 | 016_kulturkort_partnere.sql | 1532 | 8 |  | — |
| 017 | 017_kurs_skole_antall_kort.sql | 669 | 1 |  | — |
| 018 | 018_kulturkort_bestillinger.sql | 2241 | 8 |  | — |
| 019 | 019_live_schema.sql | 42954 | 164 | ⚠︎ JA | INSERT-I-FUNKSJON×5 |
| 020 | 020_sikkerhet_vakter.sql | 2725 | 5 |  | — |
| 021 | 021_hall_vertskap.sql | 29714 | 147 |  | — |
| 022 | 022_rettinger.sql | 2890 | 7 |  | INSERT-I-FUNKSJON×1 |
| 023 | 023_fase3_taksonomi.sql | 2421 | 11 |  | SEEDING×4 |
| 024 | 024_fase3_ressurser.sql | 2781 | 10 |  | — |
| 025 | 025_fase3_koblinger.sql | 2302 | 12 |  | — |
| 026 | 026_fase3_medier_dokumenter.sql | 1240 | 5 |  | — |
| 027 | 027_fase3_endringslogg.sql | 4257 | 26 |  | INSERT-I-FUNKSJON×1 |
| 028 | 028_fase3_bruk_rating.sql | 1944 | 8 |  | — |
| 029 | 029_fase3_samlinger.sql | 1173 | 6 |  | — |
| 030 | 030_fase3_rls.sql | 6221 | 45 |  | — |
| 031 | 031_fase3_testleker.sql | 10983 | 21 |  | SEEDING×20, INSERT-I-FUNKSJON×2 |
| 032 | 032_fase3_rls_fikser.sql | 4074 | 14 |  | INSERT-I-FUNKSJON×1 |
| 033 | 033_fase4_hjul_periodeplan.sql | 9170 | 43 |  | — |
| 034 | 034_testimport_20leker.sql | 46591 | 189 |  | LIVE-UUID×148, SEEDING×127 |
| 035 | 035_periodeplan_rutenett.sql | 6181 | 25 |  | — |
| 036 | 036_tl_hjul_oppsett.sql | 337 | 1 |  | — |
| 037 | 037_tl_hjul_fri_kategori.sql | 3377 | 20 |  | SEEDING×1 |
| 038 | 038_seed_egnet_nye.sql | 1579 | 1 |  | SEEDING×1 |
| 039 | 039_webinar_modul.sql | 16095 | 45 |  | INSERT-I-FUNKSJON×2, SEEDING×2 |
| 040 | 040_webinar_invitasjon.sql | 2234 | 10 |  | INSERT-I-FUNKSJON×1 |
| 041 | 041_trivselsundersokelsen_byggetrinn1.sql | 18643 | 49 |  | SEEDING×2, INSERT-I-FUNKSJON×1 |
| 042 | 042_skoler_rls_stramming.sql | 985 | 4 |  | — |
| 043 | 043_bruker_skole_rollemodell.sql | 1017 | 4 |  | — |
| 044 | 044_offentlige_skoler.sql | 1803 | 5 |  | — |
| 045 | 045_trivselsundersokelsen_skjerming.sql | 25919 | 39 |  | SEEDING×2, INSERT-I-FUNKSJON×3 |
| 046 | 046_trivselsundersokelsen_bakgrunnsvariabler.sql | 6273 | 8 |  | INSERT-I-FUNKSJON×1 |
| 047 | 047_evaluering_forbedring.sql | 3795 | 12 |  | — |
| 048 | 048_auto_purring.sql | 1158 | 6 |  | SEEDING×1 |
| 049 | 049_eval_purring.sql | 714 | 4 |  | SEEDING×1 |
| 050 | 050_onske_tekst.sql | 2362 | 7 |  | — |
| 051 | 051_flyttet_fra_kurs.sql | 489 | 3 |  | — |
| 052 | 052_kvittering.sql | 380 | 3 |  | — |
| 053 | 053_hent_kurs_skole_apen_onske.sql | 2192 | 5 |  | — |
| 054 | 054_svart_av_navn.sql | 2485 | 5 |  | — |
| 055 | 055_sendelogg.sql | 1988 | 5 |  | — |
| 056 | 056_nettverk_ansvarlig.sql | 2178 | 13 |  | — |
| 057 | 057_ra_varsel.sql | 588 | 3 |  | — |
| 058 | 058_drop_haller_pris.sql | 427 | 3 |  | — |
| 059 | 059_skole_notat.sql | 520 | 3 |  | — |
| 060 | 060_savnet_mal.sql | 2016 | 5 |  | SEEDING×2 |
| 061 | 061_flytt_nullstill_nye_stempler.sql | 2343 | 3 |  | — |
| 062 | 062_kalender_token.sql | 2115 | 8 |  | SEEDING×1 |
| 063 | 063_nyhetsbrev_broadcasts.sql | 6647 | 22 |  | — |
| 064 | 064_tu_grupper.sql | 5400 | 4 |  | — |
| 065 | 065_tu_htla_lesing_og_gruppenavn.sql | 4846 | 7 |  | — |
| 066 | 066_tu_kodesett.sql | 5941 | 3 |  | INSERT-I-FUNKSJON×1 |
| 067 | 067_tu_service_role_select.sql | 4684 | 3 |  | — |
| 068 | 068_tu_folgmed_htla_og_autolukk.sql | 12936 | 13 |  | INSERT-I-FUNKSJON×2 |
| 069 | 069_tu_lukk_runde_for_update.sql | 4832 | 3 |  | INSERT-I-FUNKSJON×1 |
| 070 | 070_tu_skjerming_1_2_2_3.sql | 18108 | 13 |  | SEEDING×1 |
| 071 | 071_tu_verdinivaa_kryssvern.sql | 15326 | 4 |  | — |
| 072 | 072_tu_kjonnsrad_subtraksjonsvern.sql | 44889 | 6 |  | — |
| 073 | 073_tu_kjonnsrad_radeskalering.sql | 32591 | 4 |  | — |
| 074 | 074_brukslogg_grant_og_tu_rapport.sql | 1443 | 3 |  | — |
| 075 | 075_htla_utestengt_kjonnsdelt_utgang.sql | 2591 | 1 |  | — |
| 076 | 076_skoler_oppstart_aar.sql | 1831 | 5 |  | — |
| 077 | 077_skoleundersokelse_datamodell.sql | 15284 | 37 |  | INSERT-I-FUNKSJON×7 |
| 078 | 078_skoleundersokelse_mottaker.sql | 12435 | 17 |  | INSERT-I-FUNKSJON×1 |
| 079 | 079_skoleundersokelse_fleksibel.sql | 11747 | 22 |  | SEEDING×1, INSERT-I-FUNKSJON×3 |
| 080 | 080_skoleundersokelse_maalgruppefilter.sql | 9132 | 7 |  | INSERT-I-FUNKSJON×1 |
| 081 | 081_skoleundersokelse_mottakerrolle.sql | 7318 | 8 |  | INSERT-I-FUNKSJON×1 |
| 082 | 082_skoleundersokelse_epostmal.sql | 2633 | 4 |  | SEEDING×2 |
| 083 | 083_skoleundersokelse_token_rpc.sql | 13069 | 10 |  | INSERT-I-FUNKSJON×1 |
| 084 | 084_skoleundersokelse_maalgruppe_fiks.sql | 8813 | 7 |  | INSERT-I-FUNKSJON×1 |
| 085 | 085_skoleundersokelse_purring_mal.sql | 2618 | 4 |  | SEEDING×2 |
| 086 | 086_skoleundersokelse_resultat_effekt.sql | 3860 | 6 |  | — |
| 087 | 087_skoleundersokelse_resultat_effekt_v2.sql | 3159 | 6 |  | — |

## Alle flagg med filnavn og linjenummer

### LIVE-UUID (148)

| Fil | Linje | Detalj |
|---|---:|---|
| 034_testimport_20leker.sql | 7 | delete from medier where ressurs_id='3820b754-2bc0-a877-c52f-0a1c45d313ed'; |
| 034_testimport_20leker.sql | 8 | delete from ressurs_utstyr where ressurs_id='3820b754-2bc0-a877-c52f-0a1c45d313ed'; |
| 034_testimport_20leker.sql | 9 | delete from ressurs_kategori where ressurs_id='3820b754-2bc0-a877-c52f-0a1c45d313ed'; |
| 034_testimport_20leker.sql | 10 | delete from medier where ressurs_id='cd254c96-fb49-f760-4f78-ff8e2c64d820'; |
| 034_testimport_20leker.sql | 11 | delete from ressurs_utstyr where ressurs_id='cd254c96-fb49-f760-4f78-ff8e2c64d820'; |
| 034_testimport_20leker.sql | 12 | delete from ressurs_kategori where ressurs_id='cd254c96-fb49-f760-4f78-ff8e2c64d820'; |
| 034_testimport_20leker.sql | 13 | delete from medier where ressurs_id='5f8535a6-fa03-988f-5503-d4710943a86a'; |
| 034_testimport_20leker.sql | 14 | delete from ressurs_utstyr where ressurs_id='5f8535a6-fa03-988f-5503-d4710943a86a'; |
| 034_testimport_20leker.sql | 15 | delete from ressurs_kategori where ressurs_id='5f8535a6-fa03-988f-5503-d4710943a86a'; |
| 034_testimport_20leker.sql | 16 | delete from medier where ressurs_id='2157baa1-c37a-998e-32a0-4f5dcb66ed96'; |
| 034_testimport_20leker.sql | 17 | delete from ressurs_utstyr where ressurs_id='2157baa1-c37a-998e-32a0-4f5dcb66ed96'; |
| 034_testimport_20leker.sql | 18 | delete from ressurs_kategori where ressurs_id='2157baa1-c37a-998e-32a0-4f5dcb66ed96'; |
| 034_testimport_20leker.sql | 19 | delete from medier where ressurs_id='cc8d560a-dab8-8611-7ce8-88a617cf797a'; |
| 034_testimport_20leker.sql | 20 | delete from ressurs_utstyr where ressurs_id='cc8d560a-dab8-8611-7ce8-88a617cf797a'; |
| 034_testimport_20leker.sql | 21 | delete from ressurs_kategori where ressurs_id='cc8d560a-dab8-8611-7ce8-88a617cf797a'; |
| 034_testimport_20leker.sql | 22 | delete from medier where ressurs_id='492e7c53-f6ec-e9ce-d3be-80df76217709'; |
| 034_testimport_20leker.sql | 23 | delete from ressurs_utstyr where ressurs_id='492e7c53-f6ec-e9ce-d3be-80df76217709'; |
| 034_testimport_20leker.sql | 24 | delete from ressurs_kategori where ressurs_id='492e7c53-f6ec-e9ce-d3be-80df76217709'; |
| 034_testimport_20leker.sql | 25 | delete from medier where ressurs_id='145b07af-f39a-bcd5-4fec-31957530834d'; |
| 034_testimport_20leker.sql | 26 | delete from ressurs_utstyr where ressurs_id='145b07af-f39a-bcd5-4fec-31957530834d'; |
| 034_testimport_20leker.sql | 27 | delete from ressurs_kategori where ressurs_id='145b07af-f39a-bcd5-4fec-31957530834d'; |
| 034_testimport_20leker.sql | 28 | delete from medier where ressurs_id='b1a296a7-64aa-866c-c1a4-09ddd063a8d6'; |
| 034_testimport_20leker.sql | 29 | delete from ressurs_utstyr where ressurs_id='b1a296a7-64aa-866c-c1a4-09ddd063a8d6'; |
| 034_testimport_20leker.sql | 30 | delete from ressurs_kategori where ressurs_id='b1a296a7-64aa-866c-c1a4-09ddd063a8d6'; |
| 034_testimport_20leker.sql | 31 | delete from medier where ressurs_id='42c10c61-65b6-5fab-4b00-5bb3f74ee644'; |
| 034_testimport_20leker.sql | 32 | delete from ressurs_utstyr where ressurs_id='42c10c61-65b6-5fab-4b00-5bb3f74ee644'; |
| 034_testimport_20leker.sql | 33 | delete from ressurs_kategori where ressurs_id='42c10c61-65b6-5fab-4b00-5bb3f74ee644'; |
| 034_testimport_20leker.sql | 34 | delete from medier where ressurs_id='8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9'; |
| 034_testimport_20leker.sql | 35 | delete from ressurs_utstyr where ressurs_id='8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9'; |
| 034_testimport_20leker.sql | 36 | delete from ressurs_kategori where ressurs_id='8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9'; |
| 034_testimport_20leker.sql | 37 | delete from medier where ressurs_id='2f99cf8c-321c-5af0-a74a-9efa8511dcc3'; |
| 034_testimport_20leker.sql | 38 | delete from ressurs_utstyr where ressurs_id='2f99cf8c-321c-5af0-a74a-9efa8511dcc3'; |
| 034_testimport_20leker.sql | 39 | delete from ressurs_kategori where ressurs_id='2f99cf8c-321c-5af0-a74a-9efa8511dcc3'; |
| 034_testimport_20leker.sql | 40 | delete from medier where ressurs_id='edd54848-ae92-90fc-6335-20b8ff525b63'; |
| 034_testimport_20leker.sql | 41 | delete from ressurs_utstyr where ressurs_id='edd54848-ae92-90fc-6335-20b8ff525b63'; |
| 034_testimport_20leker.sql | 42 | delete from ressurs_kategori where ressurs_id='edd54848-ae92-90fc-6335-20b8ff525b63'; |
| 034_testimport_20leker.sql | 43 | delete from medier where ressurs_id='86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c'; |
| 034_testimport_20leker.sql | 44 | delete from ressurs_utstyr where ressurs_id='86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c'; |
| 034_testimport_20leker.sql | 45 | delete from ressurs_kategori where ressurs_id='86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c'; |
| 034_testimport_20leker.sql | 46 | delete from medier where ressurs_id='32a91df5-6788-1407-3414-6737d95a170f'; |
| 034_testimport_20leker.sql | 47 | delete from ressurs_utstyr where ressurs_id='32a91df5-6788-1407-3414-6737d95a170f'; |
| 034_testimport_20leker.sql | 48 | delete from ressurs_kategori where ressurs_id='32a91df5-6788-1407-3414-6737d95a170f'; |
| 034_testimport_20leker.sql | 49 | delete from medier where ressurs_id='c8e533d3-7f44-4f97-1aa0-c64a7f8763c4'; |
| 034_testimport_20leker.sql | 50 | delete from ressurs_utstyr where ressurs_id='c8e533d3-7f44-4f97-1aa0-c64a7f8763c4'; |
| 034_testimport_20leker.sql | 51 | delete from ressurs_kategori where ressurs_id='c8e533d3-7f44-4f97-1aa0-c64a7f8763c4'; |
| 034_testimport_20leker.sql | 52 | delete from medier where ressurs_id='acdd94fd-a32b-91a3-df56-10ceff172ffb'; |
| 034_testimport_20leker.sql | 53 | delete from ressurs_utstyr where ressurs_id='acdd94fd-a32b-91a3-df56-10ceff172ffb'; |
| 034_testimport_20leker.sql | 54 | delete from ressurs_kategori where ressurs_id='acdd94fd-a32b-91a3-df56-10ceff172ffb'; |
| 034_testimport_20leker.sql | 55 | delete from medier where ressurs_id='e2d23ff9-d0f0-4b66-a622-7a173c4384f1'; |
| 034_testimport_20leker.sql | 56 | delete from ressurs_utstyr where ressurs_id='e2d23ff9-d0f0-4b66-a622-7a173c4384f1'; |
| 034_testimport_20leker.sql | 57 | delete from ressurs_kategori where ressurs_id='e2d23ff9-d0f0-4b66-a622-7a173c4384f1'; |
| 034_testimport_20leker.sql | 58 | delete from medier where ressurs_id='9d980823-b374-0d9e-1c60-9bc878bc3255'; |
| 034_testimport_20leker.sql | 59 | delete from ressurs_utstyr where ressurs_id='9d980823-b374-0d9e-1c60-9bc878bc3255'; |
| 034_testimport_20leker.sql | 60 | delete from ressurs_kategori where ressurs_id='9d980823-b374-0d9e-1c60-9bc878bc3255'; |
| 034_testimport_20leker.sql | 61 | delete from medier where ressurs_id='90a51fab-e4c2-df2d-1ef9-779f3d14de61'; |
| 034_testimport_20leker.sql | 62 | delete from ressurs_utstyr where ressurs_id='90a51fab-e4c2-df2d-1ef9-779f3d14de61'; |
| 034_testimport_20leker.sql | 63 | delete from ressurs_kategori where ressurs_id='90a51fab-e4c2-df2d-1ef9-779f3d14de61'; |
| 034_testimport_20leker.sql | 64 | delete from medier where ressurs_id='57b36cb8-56cc-618d-8d08-e21406828091'; |
| 034_testimport_20leker.sql | 65 | delete from ressurs_utstyr where ressurs_id='57b36cb8-56cc-618d-8d08-e21406828091'; |
| 034_testimport_20leker.sql | 66 | delete from ressurs_kategori where ressurs_id='57b36cb8-56cc-618d-8d08-e21406828091'; |
| 034_testimport_20leker.sql | 70 | values ('3820b754-2bc0-a877-c52f-0a1c45d313ed','lek',null,8,24,'publisert') |
| 034_testimport_20leker.sql | 73 | values ('3820b754-2bc0-a877-c52f-0a1c45d313ed','nb',$lek$Aktiviteter med fallskjerm$lek$,$lek$Fallskjermen kan brukes ti |
| 034_testimport_20leker.sql | 93 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '3820b754-2bc0-a877-c52f-0a1c45d313ed', id from utstyr where n |
| 034_testimport_20leker.sql | 94 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('3820b754-2bc0-a877-c52f-0a1c45 |
| 034_testimport_20leker.sql | 98 | values ('cd254c96-fb49-f760-4f78-ff8e2c64d820','lek',null,2,10,'publisert') |
| 034_testimport_20leker.sql | 101 | values ('cd254c96-fb49-f760-4f78-ff8e2c64d820','nb',$lek$TP- Bowling$lek$,$lek$Sett opp bowlingkjeglene. Marker opp en s |
| 034_testimport_20leker.sql | 104 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'cd254c96-fb49-f760-4f78-ff8e2c64d820', id from utstyr where n |
| 034_testimport_20leker.sql | 106 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'cd254c96-fb49-f760-4f78-ff8e2c64d820', id from utstyr where n |
| 034_testimport_20leker.sql | 107 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('cd254c96-fb49-f760-4f78-ff8e2c |
| 034_testimport_20leker.sql | 108 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('cd254c96-fb49-f760-4f78-ff8e2c |
| 034_testimport_20leker.sql | 112 | values ('5f8535a6-fa03-988f-5503-d4710943a86a','lek','begge',7,null,'publisert') |
| 034_testimport_20leker.sql | 115 | values ('5f8535a6-fa03-988f-5503-d4710943a86a','nb',$lek$Slangesisten$lek$,$lek$En deltager har sisten og forsøker å ta  |
| 034_testimport_20leker.sql | 117 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('5f8535a6-fa03-988f-5503-d47109 |
| 034_testimport_20leker.sql | 118 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('5f8535a6-fa03-988f-5503-d47109 |
| 034_testimport_20leker.sql | 122 | values ('2157baa1-c37a-998e-32a0-4f5dcb66ed96','lek','begge',10,20,'publisert') |
| 034_testimport_20leker.sql | 125 | values ('2157baa1-c37a-998e-32a0-4f5dcb66ed96','nb',$lek$Fisken i det røde hav$lek$,$lek$Lag en linje med 10-15 meters a |
| 034_testimport_20leker.sql | 128 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '2157baa1-c37a-998e-32a0-4f5dcb66ed96', id from utstyr where n |
| 034_testimport_20leker.sql | 129 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('2157baa1-c37a-998e-32a0-4f5dcb |
| 034_testimport_20leker.sql | 133 | values ('cc8d560a-dab8-8611-7ce8-88a617cf797a','lek','begge',2,20,'publisert') |
| 034_testimport_20leker.sql | 136 | values ('cc8d560a-dab8-8611-7ce8-88a617cf797a','nb',$lek$Bowling$lek$,$lek$Sett opp bowlingkjeglene i følgende rekkefølg |
| 034_testimport_20leker.sql | 139 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'cc8d560a-dab8-8611-7ce8-88a617cf797a', id from utstyr where n |
| 034_testimport_20leker.sql | 140 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('cc8d560a-dab8-8611-7ce8-88a617 |
| 034_testimport_20leker.sql | 144 | values ('492e7c53-f6ec-e9ce-d3be-80df76217709','lek','begge',5,5,'publisert') |
| 034_testimport_20leker.sql | 147 | values ('492e7c53-f6ec-e9ce-d3be-80df76217709','nb',$lek$Bjørnen sover$lek$,$lek$Alle leier hverandre i en ring og ett b |
| 034_testimport_20leker.sql | 156 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '492e7c53-f6ec-e9ce-d3be-80df76217709', id from utstyr where n |
| 034_testimport_20leker.sql | 157 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('492e7c53-f6ec-e9ce-d3be-80df76 |
| 034_testimport_20leker.sql | 161 | values ('145b07af-f39a-bcd5-4fec-31957530834d','lek','begge',4,null,'publisert') |
| 034_testimport_20leker.sql | 164 | values ('145b07af-f39a-bcd5-4fec-31957530834d','nb',$lek$Hilseball$lek$,$lek$Alle elevene stiller seg opp i en stor sirk |
| 034_testimport_20leker.sql | 167 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '145b07af-f39a-bcd5-4fec-31957530834d', id from utstyr where n |
| 034_testimport_20leker.sql | 168 | insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) values ('145b07af-f39a-bcd5-4fec-319575 |
| 034_testimport_20leker.sql | 172 | values ('b1a296a7-64aa-866c-c1a4-09ddd063a8d6','lek','begge',1,null,'publisert') |
| 034_testimport_20leker.sql | 175 | values ('b1a296a7-64aa-866c-c1a4-09ddd063a8d6','nb',$lek$Moonball challenge$lek$,$lek$Del alle deltagerne inn i par, og  |
| 034_testimport_20leker.sql | 180 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'b1a296a7-64aa-866c-c1a4-09ddd063a8d6', id from utstyr where n |
| 034_testimport_20leker.sql | 182 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'b1a296a7-64aa-866c-c1a4-09ddd063a8d6', id from utstyr where n |
| 034_testimport_20leker.sql | 186 | values ('42c10c61-65b6-5fab-4b00-5bb3f74ee644','lek',null,6,null,'publisert') |
| 034_testimport_20leker.sql | 189 | values ('42c10c61-65b6-5fab-4b00-5bb3f74ee644','nb',$lek$Crazyking$lek$,$lek$Marker en bane formet som et rektangel på  |
| 034_testimport_20leker.sql | 198 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '42c10c61-65b6-5fab-4b00-5bb3f74ee644', id from utstyr where n |
| 034_testimport_20leker.sql | 200 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '42c10c61-65b6-5fab-4b00-5bb3f74ee644', id from utstyr where n |
| 034_testimport_20leker.sql | 202 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '42c10c61-65b6-5fab-4b00-5bb3f74ee644', id from utstyr where n |
| 034_testimport_20leker.sql | 206 | values ('8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9','lek',null,null,null,'publisert') |
| 034_testimport_20leker.sql | 209 | values ('8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9','nb',$lek$Minuttball$lek$,$lek$Del inn i fire like store ruter. Like mang |
| 034_testimport_20leker.sql | 212 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where n |
| 034_testimport_20leker.sql | 214 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where n |
| 034_testimport_20leker.sql | 216 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where n |
| 034_testimport_20leker.sql | 218 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '8b1c0b15-ce26-56d5-d1e7-87c08f1f52b9', id from utstyr where n |
| 034_testimport_20leker.sql | 222 | values ('2f99cf8c-321c-5af0-a74a-9efa8511dcc3','lek','inne',8,20,'publisert') |
| 034_testimport_20leker.sql | 225 | values ('2f99cf8c-321c-5af0-a74a-9efa8511dcc3','nb',$lek$Kinesisk fotball$lek$,$lek$Som i sittefotball; del i to lag og  |
| 034_testimport_20leker.sql | 228 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '2f99cf8c-321c-5af0-a74a-9efa8511dcc3', id from utstyr where n |
| 034_testimport_20leker.sql | 230 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '2f99cf8c-321c-5af0-a74a-9efa8511dcc3', id from utstyr where n |
| 034_testimport_20leker.sql | 234 | values ('edd54848-ae92-90fc-6335-20b8ff525b63','lek','begge',2,4,'publisert') |
| 034_testimport_20leker.sql | 237 | values ('edd54848-ae92-90fc-6335-20b8ff525b63','nb',$lek$Speedminton$lek$,$lek$Aktivitet: Speedminton er en raskere utga |
| 034_testimport_20leker.sql | 246 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'edd54848-ae92-90fc-6335-20b8ff525b63', id from utstyr where n |
| 034_testimport_20leker.sql | 248 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'edd54848-ae92-90fc-6335-20b8ff525b63', id from utstyr where n |
| 034_testimport_20leker.sql | 252 | values ('86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c','lek','begge',12,null,'publisert') |
| 034_testimport_20leker.sql | 255 | values ('86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c','nb',$lek$Bumball$lek$,$lek$Legg ut rockeringer som målsoner, på et omr |
| 034_testimport_20leker.sql | 263 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c', id from utstyr where n |
| 034_testimport_20leker.sql | 265 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '86ebe3d4-3b73-d6f7-6a1d-2af42f4c506c', id from utstyr where n |
| 034_testimport_20leker.sql | 269 | values ('32a91df5-6788-1407-3414-6737d95a170f','lek',null,2,20,'publisert') |
| 034_testimport_20leker.sql | 272 | values ('32a91df5-6788-1407-3414-6737d95a170f','nb',$lek$Dartspill$lek$,$lek$Dere kan bruke vanlig dartspill med piler,  |
| 034_testimport_20leker.sql | 281 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '32a91df5-6788-1407-3414-6737d95a170f', id from utstyr where n |
| 034_testimport_20leker.sql | 285 | values ('c8e533d3-7f44-4f97-1aa0-c64a7f8763c4','lek','begge',null,null,'publisert') |
| 034_testimport_20leker.sql | 288 | values ('c8e533d3-7f44-4f97-1aa0-c64a7f8763c4','nb',$lek$Ballder$lek$,$lek$Sett sammen flere ballaktiviteter i en løype. |
| 034_testimport_20leker.sql | 297 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 299 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 301 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 303 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 305 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 307 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 309 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 311 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 313 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'c8e533d3-7f44-4f97-1aa0-c64a7f8763c4', id from utstyr where n |
| 034_testimport_20leker.sql | 317 | values ('acdd94fd-a32b-91a3-df56-10ceff172ffb','lek',null,6,20,'publisert') |
| 034_testimport_20leker.sql | 320 | values ('acdd94fd-a32b-91a3-df56-10ceff172ffb','nb',$lek$Steinen bak ryggen$lek$,$lek$Del først deltakerne inn i to lag. |
| 034_testimport_20leker.sql | 323 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'acdd94fd-a32b-91a3-df56-10ceff172ffb', id from utstyr where n |
| 034_testimport_20leker.sql | 327 | values ('e2d23ff9-d0f0-4b66-a622-7a173c4384f1','lek','ute',null,null,'publisert') |
| 034_testimport_20leker.sql | 330 | values ('e2d23ff9-d0f0-4b66-a622-7a173c4384f1','nb',$lek$50-leken$lek$,$lek$Nummerarkene henges opp rundt omkring i skog |
| 034_testimport_20leker.sql | 344 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select 'e2d23ff9-d0f0-4b66-a622-7a173c4384f1', id from utstyr where n |
| 034_testimport_20leker.sql | 348 | values ('9d980823-b374-0d9e-1c60-9bc878bc3255','lek','ute',8,null,'publisert') |
| 034_testimport_20leker.sql | 351 | values ('9d980823-b374-0d9e-1c60-9bc878bc3255','nb',$lek$Høy og lav$lek$,$lek$Aktivitet: «Aali waty» betyr høy lav på ar |
| 034_testimport_20leker.sql | 354 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '9d980823-b374-0d9e-1c60-9bc878bc3255', id from utstyr where n |
| 034_testimport_20leker.sql | 358 | values ('90a51fab-e4c2-df2d-1ef9-779f3d14de61','lek','ute',null,null,'publisert') |
| 034_testimport_20leker.sql | 361 | values ('90a51fab-e4c2-df2d-1ef9-779f3d14de61','nb',$lek$Jamad, Haywan, Nabat$lek$,$lek$Aktivitet: Dette er en paradisle |
| 034_testimport_20leker.sql | 364 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '90a51fab-e4c2-df2d-1ef9-779f3d14de61', id from utstyr where n |
| 034_testimport_20leker.sql | 368 | values ('57b36cb8-56cc-618d-8d08-e21406828091','lek','ute',3,3,'publisert') |
| 034_testimport_20leker.sql | 371 | values ('57b36cb8-56cc-618d-8d08-e21406828091','nb',$lek$Ka pa kera$lek$,$lek$Legg tre rockeringer med ca. fem meter avs |
| 034_testimport_20leker.sql | 374 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '57b36cb8-56cc-618d-8d08-e21406828091', id from utstyr where n |
| 034_testimport_20leker.sql | 376 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '57b36cb8-56cc-618d-8d08-e21406828091', id from utstyr where n |
| 034_testimport_20leker.sql | 378 | insert into ressurs_utstyr (ressurs_id, utstyr_id) select '57b36cb8-56cc-618d-8d08-e21406828091', id from utstyr where n |

### FORWARD-FUNKSJON (0)
_Ingen._

### DROP-UTEN-IF-EXISTS (0)
_Ingen._

### SEEDING (170)

| Fil | Antall insert | Linjer (utvalg) |
|---|---:|---|
| 023_fase3_taksonomi.sql | 4 | 54, 59, 63, 72 |
| 031_fase3_testleker.sql | 20 | 2, 3, 4, 40, 46, 72, 98, 110, 116, 122, 130, 140 … |
| 034_testimport_20leker.sql | 127 | 69, 72, 92, 93, 94, 97, 100, 103, 104, 105, 106, 107 … |
| 037_tl_hjul_fri_kategori.sql | 1 | 63 |
| 038_seed_egnet_nye.sql | 1 | 20 |
| 039_webinar_modul.sql | 2 | 293, 300 |
| 041_trivselsundersokelsen_byggetrinn1.sql | 2 | 77, 85 |
| 045_trivselsundersokelsen_skjerming.sql | 2 | 32, 62 |
| 048_auto_purring.sql | 1 | 24 |
| 049_eval_purring.sql | 1 | 14 |
| 060_savnet_mal.sql | 2 | 16, 22 |
| 062_kalender_token.sql | 1 | 23 |
| 070_tu_skjerming_1_2_2_3.sql | 1 | 53 |
| 079_skoleundersokelse_fleksibel.sql | 1 | 74 |
| 082_skoleundersokelse_epostmal.sql | 2 | 28, 34 |
| 085_skoleundersokelse_purring_mal.sql | 2 | 27, 33 |

### INSERT-I-FUNKSJON (37)

| Fil | Antall insert | Linjer (utvalg) |
|---|---:|---|
| 019_live_schema.sql | 5 | 509, 880, 992, 1052, 1064 |
| 022_rettinger.sql | 1 | 47 |
| 027_fase3_endringslogg.sql | 1 | 38 |
| 031_fase3_testleker.sql | 2 | 32, 34 |
| 032_fase3_rls_fikser.sql | 1 | 42 |
| 039_webinar_modul.sql | 2 | 110, 265 |
| 040_webinar_invitasjon.sql | 1 | 42 |
| 041_trivselsundersokelsen_byggetrinn1.sql | 1 | 243 |
| 045_trivselsundersokelsen_skjerming.sql | 3 | 378, 392, 420 |
| 046_trivselsundersokelsen_bakgrunnsvariabler.sql | 1 | 103 |
| 066_tu_kodesett.sql | 1 | 81 |
| 068_tu_folgmed_htla_og_autolukk.sql | 2 | 111, 149 |
| 069_tu_lukk_runde_for_update.sql | 1 | 65 |
| 077_skoleundersokelse_datamodell.sql | 7 | 175, 181, 187, 196, 206, 214, 225 |
| 078_skoleundersokelse_mottaker.sql | 1 | 184 |
| 079_skoleundersokelse_fleksibel.sql | 3 | 165, 180, 188 |
| 080_skoleundersokelse_maalgruppefilter.sql | 1 | 157 |
| 081_skoleundersokelse_mottakerrolle.sql | 1 | 137 |
| 083_skoleundersokelse_token_rpc.sql | 1 | 254 |
| 084_skoleundersokelse_maalgruppe_fiks.sql | 1 | 160 |

## Arkiv/dokumentasjonsfiler
- **019_live_schema.sql** — topp-kommentar tyder på introspeksjon/dokumentasjon.

## Vurdering — kan disse filene bygge en base fra bunnen?

**Kort svar:** Ingen strukturell blokkering funnet i statisk analyse, men det er ikke bevist før en faktisk kjøring mot KOPI-basen (andre halvdel av beviset). Dette verktøyet leser bare tekst; det utfører ikke SQL.

### Det som taler FOR at det går
- **Ingen hull** i nummerrekken (001–087), ingen dupliserte numre, ingen avvikende filnavn.
- **0 forward-referanser til funksjoner** — ingen fil kaller en funksjon som først defineres i en senere fil (77 funksjoner kartlagt; f.eks. `get_min_rolle` defineres i 007 før den brukes i 008+).
- **0 `drop` uten `if exists`** — ingen fil forutsetter at et objekt allerede finnes for å kunne slette det. Alle drops er idempotente.
- Ingen hardkodet **live prosjekt-ID** eller superadmin-UID i migrasjonene.

### 019_live_schema.sql — MÅ kjøres, i posisjon (ikke bare dokumentasjon)
Topp-kommentaren kaller den «komplett live-skjema … dokumentasjon», men det er **misvisende for gjenoppbygging**. Tabellene `kurs`, `kurs_skole`, `kursholdere`, `haller`, `evalueringer` (+ 22 RPC-er) opprettes **kun** i 019 — de finnes ikke i noen annen migrasjon. **22 senere filer** (020, 021, 022, 047–058, 060–062, 078, 082, 083, 085) refererer disse tabellene. Uten 019 vil bygget kollapse ved 020.
- **Min anbefaling:** 019 SKAL kjøres, og den skal kjøres **på sin plass** (etter 018, før 020). Den bruker `create table if not exists` gjennomgående, så den kolliderer ikke med tabeller som alt er opprettet tidligere (f.eks. `brukslogg` fra 015). Kjøremodus kjører den derfor som en helt vanlig fil i rekken — ingen særbehandling nødvendig.
- **Forbehold:** fordi 019 er en introspeksjons-dump, kan den avvike fra det migrasjonene 001–018 faktisk bygget (kolonner lagt til/endret senere). `if not exists` skjuler slike avvik i stedet for å feile. Bare en ekte kjøring avslører om skjemaet blir konsistent.

### Testdata og seeding — en beslutning for mennesket
- **034_testimport_20leker.sql** (127 topp-inserts) og **031_fase3_testleker.sql** (22) er rene **testdata**. 034 inneholder også **148 hardkodede UUID-literaler** (delete+insert av konkrete leke-rader). Dette er ikke produksjonsinnhold. I en øve-kopi er det ufarlig, men det bør være et bevisst valg om de skal være med — de blåser opp basen med testleker som senere må ryddes.
- De øvrige topp-insertene er stort sett **referanse-/konfigurasjonsdata** (taksonomi i 023, hjuloppsett, e-postmaler, TU-kodesett) som normalt SKAL med.
- **37 `insert into` ligger inne i funksjonskropper** (`INSERT-I-FUNKSJON`) — det er kjøretidslogikk (logging, purring, kvittering), **ikke** seeding. De skilles ut nettopp for at seeding-tallet skal bety noe.

### Hva denne analysen IKKE beviser (bevisst avgrensning)
- **Rekkefølge på tabeller/kolonner** er ikke sjekket (kun funksjoner). En fil kan referere en kolonne som først legges til senere — det fanges ikke her, kun ved kjøring.
- **FK-/dataintegritet** i seed-radene (f.eks. at 034 sine leker peker på kategorier som finnes) er ikke verifisert.
- **Innhold i funksjonskropper** (dynamisk SQL, avhengigheter) er ikke evaluert.

**Konklusjon:** Filsettet ser komplett og internt konsistent ut på de punktene et statisk verktøy kan sjekke, forutsatt at 019 kjøres i posisjon. Det gjenstående beviset — at 87 filer faktisk bygger en tom base grønt — krever kjøremodus mot en fersk KOPI-base. Verktøyet er klart for det; det er andre halvdel av oppdraget.
