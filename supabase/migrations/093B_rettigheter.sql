-- ============================================================================
-- 093B_rettigheter.sql — RETTIGHETS-MIGRASJON (GRANT/REVOKE paa tabellnivaa)
-- Generert 3. sep 2026 fra prod-avlesning (Fable: _kontroll-017-019/prod/
-- prod_skjema_resten.csv, kategori 'grant' — 225 rader, 78 tabeller x 3 roller).
-- Denne filen er en GJENOPPBYGGINGS-OPPSKRIFT, ikke en historisk logg.
-- ============================================================================
--
-- BAKGRUNN (prod-diff A1): Supabase gir automatisk anon/authenticated/service_role
-- FULL tilgang (alle 7 tabell-privilegier) til hver ny tabell via 'alter default
-- privileges'. I prod er dette STRAMMET FOR HAAND paa ~70 tabeller, men INGEN
-- migrasjonsfil gjoer det (grep 'revoke' i 001-093 gir bare endringslogg/032 og
-- webinarer/039). En ren gjenoppbygging ville derfor gitt en base som er MER AAPEN
-- enn prod - bl.a. anon SELECT paa epost_logg og evalueringer.
--
-- HVA DEN GJOER: setter EKSAKT prods rettighetsbilde for alle 78 tabeller. For hver
-- tabell: 'revoke all ... from anon, authenticated, service_role', deretter 'grant
-- <noeyaktig prod-sett>' tilbake per rolle. Roller som i prod har NULL privilegier
-- (anon paa innstillinger, nyhetsbrev_*, skoleus_*) faar bevisst ingen grant tilbake.
--
-- NO-OP MOT PROD: revoke + grant-tilbake-det-samme ender i samme tilstand prod alt
-- har. Trygt mot prod (ingen netto endring); ved gjenoppbygging overstyrer det
-- Supabase-standarden til prod-tilstand.
--
-- ETT BEVISST AVVIK (lagt til 3. sep 2026): paameldinger. anon-tilgangen fjernes her
-- selv om prod fortsatt har den (Kjartans beslutning - intern tabell). Naar 093B kjores
-- mot prod, STRAMMER den derfor paameldinger for anon; alt ANNET er no-op mot prod. Se
-- paameldinger-blokken. (skoler forblir bevisst offentlig lesbar.)
--
-- PLASSERING: 093B - etter 093 (da finnes ALLE 78 tabellene; nyeste er redaksjonell_ko
-- fra 093) og FOER de ennaa-uskrevne 094+. Kjoereren sorterer nummer, saa suffiks
-- ('' < 'B'): 093 < 093B < 094, samme moenster som 091B. Framtidige tabell-migrasjoner
-- setter selv sine grants; denne dekker 001-093-bildet.
--
-- MERK: service_role forbigaar normalt RLS, saa stramming der er EKTE vern; anon/
-- authenticated-strammingen er forsvar i dybden bak RLS.
-- ============================================================================

begin;

-- bruk_hendelse
revoke all on table public.bruk_hendelse from anon, authenticated, service_role;
grant references, trigger, truncate on table public.bruk_hendelse to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.bruk_hendelse to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.bruk_hendelse to service_role;

-- bruker_skole
revoke all on table public.bruker_skole from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.bruker_skole to anon;
grant select, references, trigger, truncate on table public.bruker_skole to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.bruker_skole to service_role;

-- brukslogg
revoke all on table public.brukslogg from anon, authenticated, service_role;
grant references, trigger, truncate on table public.brukslogg to anon;
grant insert, references, trigger, truncate on table public.brukslogg to authenticated;
grant references, trigger, truncate on table public.brukslogg to service_role;

-- churn_signalord
revoke all on table public.churn_signalord from anon, authenticated, service_role;
grant references, trigger, truncate on table public.churn_signalord to anon;
grant references, trigger, truncate on table public.churn_signalord to authenticated;
grant references, trigger, truncate on table public.churn_signalord to service_role;

-- dokument_fag
revoke all on table public.dokument_fag from anon, authenticated, service_role;
grant references, trigger, truncate on table public.dokument_fag to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.dokument_fag to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.dokument_fag to service_role;

-- dokumenter
revoke all on table public.dokumenter from anon, authenticated, service_role;
grant references, trigger, truncate on table public.dokumenter to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.dokumenter to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.dokumenter to service_role;

-- egnet_kategori
revoke all on table public.egnet_kategori from anon, authenticated, service_role;
grant references, trigger, truncate on table public.egnet_kategori to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.egnet_kategori to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.egnet_kategori to service_role;

-- endringslogg
revoke all on table public.endringslogg from anon, authenticated, service_role;
grant references, trigger, truncate on table public.endringslogg to anon;
grant select, references, trigger, truncate on table public.endringslogg to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.endringslogg to service_role;

-- epost_logg
revoke all on table public.epost_logg from anon, authenticated, service_role;
grant references, trigger, truncate on table public.epost_logg to anon;
grant references, trigger, truncate on table public.epost_logg to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.epost_logg to service_role;

-- eval_pakker
revoke all on table public.eval_pakker from anon, authenticated, service_role;
grant references, trigger, truncate on table public.eval_pakker to anon;
grant references, trigger, truncate on table public.eval_pakker to authenticated;
grant references, trigger, truncate on table public.eval_pakker to service_role;

-- eval_semester
revoke all on table public.eval_semester from anon, authenticated, service_role;
grant references, trigger, truncate on table public.eval_semester to anon;
grant references, trigger, truncate on table public.eval_semester to authenticated;
grant references, trigger, truncate on table public.eval_semester to service_role;

-- eval_sporsmal
revoke all on table public.eval_sporsmal from anon, authenticated, service_role;
grant references, trigger, truncate on table public.eval_sporsmal to anon;
grant references, trigger, truncate on table public.eval_sporsmal to authenticated;
grant references, trigger, truncate on table public.eval_sporsmal to service_role;

-- evalueringer
revoke all on table public.evalueringer from anon, authenticated, service_role;
grant references, trigger, truncate on table public.evalueringer to anon;
grant references, trigger, truncate on table public.evalueringer to authenticated;
grant select, update, references, trigger, truncate on table public.evalueringer to service_role;

-- fag
revoke all on table public.fag from anon, authenticated, service_role;
grant references, trigger, truncate on table public.fag to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.fag to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.fag to service_role;

-- favoritter
revoke all on table public.favoritter from anon, authenticated, service_role;
grant references, trigger, truncate on table public.favoritter to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.favoritter to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.favoritter to service_role;

-- haller
revoke all on table public.haller from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.haller to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.haller to authenticated;
grant select, references, trigger, truncate on table public.haller to service_role;

-- import_kjoring
revoke all on table public.import_kjoring from anon, authenticated, service_role;
grant references, trigger, truncate on table public.import_kjoring to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.import_kjoring to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.import_kjoring to service_role;

-- innstillinger   -- (ingen grant tilbake til: anon)
revoke all on table public.innstillinger from anon, authenticated, service_role;
grant select, insert, update, references, trigger, truncate on table public.innstillinger to authenticated;
grant select, insert, update, references, trigger, truncate on table public.innstillinger to service_role;

-- kategorier
revoke all on table public.kategorier from anon, authenticated, service_role;
grant references, trigger, truncate on table public.kategorier to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kategorier to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.kategorier to service_role;

-- kompetansemaal
revoke all on table public.kompetansemaal from anon, authenticated, service_role;
grant references, trigger, truncate on table public.kompetansemaal to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kompetansemaal to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.kompetansemaal to service_role;

-- kompetansemaal_trinn
revoke all on table public.kompetansemaal_trinn from anon, authenticated, service_role;
grant references, trigger, truncate on table public.kompetansemaal_trinn to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kompetansemaal_trinn to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.kompetansemaal_trinn to service_role;

-- kulturkort_bestillinger
revoke all on table public.kulturkort_bestillinger from anon, authenticated, service_role;
grant references, trigger, truncate on table public.kulturkort_bestillinger to anon;
grant select, update, references, trigger, truncate on table public.kulturkort_bestillinger to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.kulturkort_bestillinger to service_role;

-- kulturkort_partnere
revoke all on table public.kulturkort_partnere from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.kulturkort_partnere to anon;
grant select, references, trigger, truncate on table public.kulturkort_partnere to authenticated;
grant references, trigger, truncate on table public.kulturkort_partnere to service_role;

-- kurs
revoke all on table public.kurs from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.kurs to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kurs to authenticated;
grant select, references, trigger, truncate on table public.kurs to service_role;

-- kurs_skole
revoke all on table public.kurs_skole from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.kurs_skole to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kurs_skole to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.kurs_skole to service_role;

-- kurs_skole_mottaker
revoke all on table public.kurs_skole_mottaker from anon, authenticated, service_role;
grant select, update, references, trigger, truncate on table public.kurs_skole_mottaker to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kurs_skole_mottaker to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.kurs_skole_mottaker to service_role;

-- kursholdere
revoke all on table public.kursholdere from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.kursholdere to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.kursholdere to authenticated;
grant references, trigger, truncate on table public.kursholdere to service_role;

-- medier
revoke all on table public.medier from anon, authenticated, service_role;
grant references, trigger, truncate on table public.medier to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.medier to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.medier to service_role;

-- nettverk_ansvarlig
revoke all on table public.nettverk_ansvarlig from anon, authenticated, service_role;
grant references, trigger, truncate on table public.nettverk_ansvarlig to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.nettverk_ansvarlig to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.nettverk_ansvarlig to service_role;

-- nyhetsbrev_mottakere   -- (ingen grant tilbake til: anon)
revoke all on table public.nyhetsbrev_mottakere from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.nyhetsbrev_mottakere to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.nyhetsbrev_mottakere to service_role;

-- nyhetsbrev_utsendinger   -- (ingen grant tilbake til: anon)
revoke all on table public.nyhetsbrev_utsendinger from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.nyhetsbrev_utsendinger to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.nyhetsbrev_utsendinger to service_role;

-- paameldinger
-- ============================================================================
-- BEVISST AVVIK FRA PROD (den ENESTE i denne fila - alt annet speiler prod 1:1).
-- Kjartans beslutning 3. sep 2026: paameldinger er INTERN (navn + kontaktinfo fra
-- folk som har meldt interesse) og skal KUN vaere synlig for ansatte. Prod har i dag
-- anon = ALT (Supabase-standard, aldri strammet). Her fjernes anon-tilgangen: 'revoke
-- all ... from anon' UTEN grant tilbake. authenticated/service_role beholdes som i
-- prod; RLS-policyen "Ansatt administrerer paameldinger" gjoer resten. (skoler forblir
-- offentlig lesbar - se den blokken - fordi naboskoler/media skal se medlemsskoler.)
-- ============================================================================
revoke all on table public.paameldinger from anon, authenticated, service_role;
-- (ingen grant tilbake til anon - se avviksmerknaden over)
grant select, insert, update, delete, references, trigger, truncate on table public.paameldinger to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.paameldinger to service_role;

-- periodeplan
revoke all on table public.periodeplan from anon, authenticated, service_role;
grant references, trigger, truncate on table public.periodeplan to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.periodeplan to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.periodeplan to service_role;

-- periodeplan_rad
revoke all on table public.periodeplan_rad from anon, authenticated, service_role;
grant references, trigger, truncate on table public.periodeplan_rad to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.periodeplan_rad to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.periodeplan_rad to service_role;

-- popularitet_snapshot
revoke all on table public.popularitet_snapshot from anon, authenticated, service_role;
grant references, trigger, truncate on table public.popularitet_snapshot to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.popularitet_snapshot to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.popularitet_snapshot to service_role;

-- profiles
revoke all on table public.profiles from anon, authenticated, service_role;
grant references, trigger, truncate on table public.profiles to anon;
grant select, update, references, trigger, truncate on table public.profiles to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.profiles to service_role;

-- redaksjonell_ko
revoke all on table public.redaksjonell_ko from anon, authenticated, service_role;
grant references, trigger, truncate on table public.redaksjonell_ko to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.redaksjonell_ko to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.redaksjonell_ko to service_role;

-- ressurs_dokument
revoke all on table public.ressurs_dokument from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_dokument to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_dokument to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_dokument to service_role;

-- ressurs_egnet
revoke all on table public.ressurs_egnet from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_egnet to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_egnet to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_egnet to service_role;

-- ressurs_fag
revoke all on table public.ressurs_fag from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_fag to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_fag to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_fag to service_role;

-- ressurs_innhold
revoke all on table public.ressurs_innhold from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_innhold to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_innhold to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_innhold to service_role;

-- ressurs_kategori
revoke all on table public.ressurs_kategori from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_kategori to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_kategori to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_kategori to service_role;

-- ressurs_kompetansemaal
revoke all on table public.ressurs_kompetansemaal from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_kompetansemaal to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_kompetansemaal to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_kompetansemaal to service_role;

-- ressurs_kompetansemaal_forslag
revoke all on table public.ressurs_kompetansemaal_forslag from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_kompetansemaal_forslag to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_kompetansemaal_forslag to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_kompetansemaal_forslag to service_role;

-- ressurs_sesong
revoke all on table public.ressurs_sesong from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_sesong to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_sesong to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_sesong to service_role;

-- ressurs_trinn
revoke all on table public.ressurs_trinn from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_trinn to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_trinn to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_trinn to service_role;

-- ressurs_trinn_innhold
revoke all on table public.ressurs_trinn_innhold from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_trinn_innhold to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_trinn_innhold to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_trinn_innhold to service_role;

-- ressurs_utstyr
revoke all on table public.ressurs_utstyr from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurs_utstyr to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_utstyr to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurs_utstyr to service_role;

-- ressurser
revoke all on table public.ressurser from anon, authenticated, service_role;
grant references, trigger, truncate on table public.ressurser to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurser to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.ressurser to service_role;

-- samling_innhold
revoke all on table public.samling_innhold from anon, authenticated, service_role;
grant references, trigger, truncate on table public.samling_innhold to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.samling_innhold to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.samling_innhold to service_role;

-- samling_ressurs
revoke all on table public.samling_ressurs from anon, authenticated, service_role;
grant references, trigger, truncate on table public.samling_ressurs to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.samling_ressurs to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.samling_ressurs to service_role;

-- samlinger
revoke all on table public.samlinger from anon, authenticated, service_role;
grant references, trigger, truncate on table public.samlinger to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.samlinger to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.samlinger to service_role;

-- sesong
revoke all on table public.sesong from anon, authenticated, service_role;
grant references, trigger, truncate on table public.sesong to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.sesong to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.sesong to service_role;

-- skoler
revoke all on table public.skoler from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoler to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.skoler to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoler to service_role;

-- skoleus_matriserad   -- (ingen grant tilbake til: anon)
revoke all on table public.skoleus_matriserad from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_matriserad to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_matriserad to service_role;

-- skoleus_mottaker   -- (ingen grant tilbake til: anon)
revoke all on table public.skoleus_mottaker from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_mottaker to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_mottaker to service_role;

-- skoleus_runder   -- (ingen grant tilbake til: anon)
revoke all on table public.skoleus_runder from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_runder to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_runder to service_role;

-- skoleus_sporsmal   -- (ingen grant tilbake til: anon)
revoke all on table public.skoleus_sporsmal from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_sporsmal to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_sporsmal to service_role;

-- skoleus_svar   -- (ingen grant tilbake til: anon)
revoke all on table public.skoleus_svar from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_svar to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_svar to service_role;

-- skoleus_undersokelse   -- (ingen grant tilbake til: anon)
revoke all on table public.skoleus_undersokelse from anon, authenticated, service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_undersokelse to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.skoleus_undersokelse to service_role;

-- tl_deltaker
revoke all on table public.tl_deltaker from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tl_deltaker to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_deltaker to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_deltaker to service_role;

-- tl_hjul
revoke all on table public.tl_hjul from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tl_hjul to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_hjul to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_hjul to service_role;

-- tl_hjul_kategori
revoke all on table public.tl_hjul_kategori from anon, authenticated, service_role;
grant select, references, trigger, truncate on table public.tl_hjul_kategori to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_hjul_kategori to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_hjul_kategori to service_role;

-- tl_hjul_lek
revoke all on table public.tl_hjul_lek from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tl_hjul_lek to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_hjul_lek to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.tl_hjul_lek to service_role;

-- trinn
revoke all on table public.trinn from anon, authenticated, service_role;
grant references, trigger, truncate on table public.trinn to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.trinn to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.trinn to service_role;

-- tu_arkiv
revoke all on table public.tu_arkiv from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tu_arkiv to anon;
grant references, trigger, truncate on table public.tu_arkiv to authenticated;
grant references, trigger, truncate on table public.tu_arkiv to service_role;

-- tu_innstillinger
revoke all on table public.tu_innstillinger from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tu_innstillinger to anon;
grant references, trigger, truncate on table public.tu_innstillinger to authenticated;
grant references, trigger, truncate on table public.tu_innstillinger to service_role;

-- tu_koder
revoke all on table public.tu_koder from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tu_koder to anon;
grant references, trigger, truncate on table public.tu_koder to authenticated;
grant select, references, trigger, truncate on table public.tu_koder to service_role;

-- tu_runder
revoke all on table public.tu_runder from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tu_runder to anon;
grant select, insert, update, references, trigger, truncate on table public.tu_runder to authenticated;
grant select, references, trigger, truncate on table public.tu_runder to service_role;

-- tu_sporsmal
revoke all on table public.tu_sporsmal from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tu_sporsmal to anon;
grant select, references, trigger, truncate on table public.tu_sporsmal to authenticated;
grant select, references, trigger, truncate on table public.tu_sporsmal to service_role;

-- tu_svar
revoke all on table public.tu_svar from anon, authenticated, service_role;
grant references, trigger, truncate on table public.tu_svar to anon;
grant references, trigger, truncate on table public.tu_svar to authenticated;
grant references, trigger, truncate on table public.tu_svar to service_role;

-- utstyr
revoke all on table public.utstyr from anon, authenticated, service_role;
grant references, trigger, truncate on table public.utstyr to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.utstyr to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.utstyr to service_role;

-- vurderinger
revoke all on table public.vurderinger from anon, authenticated, service_role;
grant references, trigger, truncate on table public.vurderinger to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.vurderinger to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.vurderinger to service_role;

-- webinar_invitasjon
revoke all on table public.webinar_invitasjon from anon, authenticated, service_role;
grant references, trigger, truncate on table public.webinar_invitasjon to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_invitasjon to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_invitasjon to service_role;

-- webinar_opptak
revoke all on table public.webinar_opptak from anon, authenticated, service_role;
grant references, trigger, truncate on table public.webinar_opptak to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_opptak to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_opptak to service_role;

-- webinar_pameldinger
revoke all on table public.webinar_pameldinger from anon, authenticated, service_role;
grant references, trigger, truncate on table public.webinar_pameldinger to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_pameldinger to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_pameldinger to service_role;

-- webinar_referater
revoke all on table public.webinar_referater from anon, authenticated, service_role;
grant references, trigger, truncate on table public.webinar_referater to anon;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_referater to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.webinar_referater to service_role;

-- webinarer
revoke all on table public.webinarer from anon, authenticated, service_role;
grant references, trigger, truncate on table public.webinarer to anon;
grant insert, update, delete, references, trigger, truncate on table public.webinarer to authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.webinarer to service_role;

commit;
