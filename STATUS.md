# STATUS – trivselsleder-ny
Sist oppdatert: 6. juli 2026 (etter feil A-fiks fra agent-retest)

## FEIL A FIKSET (agent-retest 6. juli): avvist påmelding er ikke lenger blindgate
- Rund livssyklus: godkjenn → avvis → godkjenn igjen fungerer. Commit fd387dc.
- NY api/admin/avvis-paamelding.js: setter status 'avvist'; KUN hvis påmeldingen
  var 'godkjent' settes skolen (samme org_nr, status 'Aktiv') til 'Inaktiv'.
  Ingenting slettes. Var påmeldingen 'ny': skoler-tabellen røres ikke.
- godkjenn-paamelding.js: duplikatsjekk skiller Aktiv (ekte duplikat → rød 409)
  fra Inaktiv (re-godkjenning → UPDATE eksisterende skolerad, alle felter, 'Aktiv',
  invitasjoner + nettverksforslag som vanlig). Rollback-fiks: 'godkjent' settes
  først ETTER at skoleoperasjonen lyktes — ingen hardkodet tilbakestilling til 'ny'.
- AdminPaameldinger.jsx: Avvis-knappen kaller endpointet og viser resultatboks
  (skole satt Inaktiv / register ikke berørt).
- OPPFØLGING (7cc0e99) etter feilet live-test: skole-UPDATE med filter på
  org_nr+status ble avvist av databasen og feilen SVELGET (console.error +
  ok:true → misvisende "fant ingen skole"). Rettet: SELECT skole på org_nr →
  UPDATE på id (bevist mønster fra sett-nettverk.js), DB-feil returneres nå
  som 500 med faktisk feilmelding i rød boks, og skolen deaktiveres FØR
  påmeldingen settes 'avvist' (ingen halvtilstand). Eksakt DB-årsak ikke
  bekreftet ennå — diagnose-SQL (constraints/policies/triggere på skoler)
  gitt til Kjartan.
- NB: påmelding org 999444555 ligger i halvtilstand fra feilet test
  (påmelding 'avvist', skole 'Aktiv') — bruk fersk påmelding ved retest.

## TESTPLAN FEIL A (på https://trivselsleder-ny.vercel.app)
Bruk en FERSK testpåmelding: godkjenn → avvis (sjekk at skolen blir Inaktiv) →
godkjenn igjen (sjekk at skolen reaktiveres, ikke blokkeres).
IKKE reparer "TEST Fjellheim" (korrupt fra retesten) — slettes i oppryddingen.

## KURSPLANLEGGER-FIKSER (fra agenttest 2. juli) — ALLE 4 FERDIG OG BEVIST
- FIKS 1 FERDIG+BEVIST: org.nr-duplikat gir rød feilmelding, aldri stille
  overskriving. Påmelding rulles tilbake til 'ny' ved kollisjon. (t.o.m. 4fdc197)
- FIKS 2 FERDIG+BEVIST: godkjenning overfører ALLE felter påmelding→skolekort
  (elevtall, adresse, telefon, rektor, HTLA, TLA→HKTL).
- FIKS 3 FERDIG+BEVIST (6. juli): nettverk ved godkjenning = "systemet foreslår,
  mennesket bestemmer". Bevist end-to-end:
  * Kommune-treff (Bergen), fylke-fallback, fritekst "nytt nettverk" (Tromsø).
  * Unntaksvei: koble enkeltskole direkte til kurs (bekreftet i kurs_skole).
  * Kursdato+klokkeslett vises i dropdown (dato-kolonne, ikke start_tid).
  Filer: godkjenn-paamelding.js (returnerer nettverksforslag), sett-nettverk.js
  (NY), koble-skole-kurs.js (NY), AdminPaameldinger.jsx. SQL: foresla_nettverk().
  Commit t.o.m. a966e18.
- FIKS 4 FERDIG+BEVIST (6. juli): svar-skjema viser nå kontekst-boks øverst
  (Skole / Kurs / Dato + klokkeslett), oransje venstrekant. Utvidet SQL-funksjon
  hent_kurs_skole_via_token med JOIN til kurs+skoler (kurs_navn, kurs_dato,
  kurs_start_tid, kurs_slutt_tid, skole_navn). Fil: SvarSkjema.jsx. Commit 060ee68.
  Testet på: /svar/2b451fd890fb4508b133cd2622fcab0b → "fredag 24. juli 2026 kl.09:00–13:00".

## FIKS 3+4 — UNDERLIGGENDE TING VI LØSTE (viktig lærdom)
1. Heredoc-innliming kan tape tegn (mistet '<a'-tag). Alltid verifiser fil +
   kjør 'npx vite build' før push — fanger syntaksfeil lokalt.
2. service_role manglet grants på nye tabeller (permission denied):
   - GRANT SELECT ON kurs TO service_role + RLS-policy for service_role.
   - GRANT SELECT, INSERT ON kurs_skole TO service_role + RLS-policy.
   Sjekk alltid: has_table_privilege('service_role','<tabell>','SELECT').
3. Datamodell: kurs har SKILT 'dato'(date) og 'start_tid'/'slutt_tid'(time).
   Bruk 'dato' for datovisning, aldri start_tid alene.
4. Kan ikke endre retur-type på funksjon med CREATE OR REPLACE →
   DROP FUNCTION først, så CREATE.

## NESTE STEG (denne økten / neste)
1. AGENT-RETEST: kjør agent-testoppdraget på nytt (samme prompt, Dispatch+Chrome)
   for å bekrefte hele flyten med alle 4 fikser på plass.
2. ETTER godkjent retest: SLETT alle testdata (liste under).
3. Deretter: presentere kursplanleggeren for ansatte/Marielle-pilot.

## TESTDATA SOM SKAL SLETTES (etter godkjent retest)
- Agenttest-skoler: Solbakken, Fjellheim, Havblikk
- TEST Fiks2 skole (org 999888777)
- FIKS 3/4-testskoler (6. juli): FiksNettverk (999111222), FiksKurs (999333444),
  FiksKurs2 (999555666), FiksKurs3 (999777888), FiksKurs4 (999999111),
  FiksKurs5 (999222333)
- Testkurs "TEST Lekekurs Kjartan-test" + alle kurs_skole-koblinger til testskoler
- Tilhørende påmeldinger, invitasjoner (profiles for kjartan+... adresser),
  bruker_skole-rader
- Slett i FK-rekkefølge: kurs_skole → bruker_skole → skoler → paameldinger →
  (evt. profiles). NB: sjekk grants/RLS også ved sletting via service_role.

## COWORK/FABLE-RAPPORTER (alle lest, essens i minnet)
- kursplanlegger-agenttest-2026.md (2. juli) — nå alle 4 fikset.
- fase3-ramsalt-dybde/inspirasjon/SAMMENDRAG (4. juli). TO SPRIK før import:
  (a) video 247/254 vs 439 filer/27GB — sjekk undermappe; (b) 103/105
  bildeoriginaler mangler → spør Jon om original-arkiv.
- laerervikaren-kartlegging (5. juli) — FREMTIDIG (v29+, bakerst).
- omtaler-trivselsleder (5. juli) — Evidence-råstoff. Hjemmelekser: DNV GL-original,
  masteroppgave-ref, les "De bryter løftene sine".
- KØ: aktive-brukere-eksport (laerervikaren + trivselsleder.no).

## HUSK
- v29 fremdriftsplan lages snart (v28 som mal). Statisk TOC verifiseres mot PDF.
- Chrome-utvidelsens "Allow all browser actions" — SKRU AV når eksport er ferdig.
- Test alltid: https://trivselsleder-ny.vercel.app
- Supabase SQL: https://supabase.com/dashboard/project/zpirjbrcbeubwpmtncxx/sql/new
