# STATUS – trivselsleder-ny
Sist oppdatert: 6. juli 2026 (feil C implementert, venter på live-test)

## FEIL C IMPLEMENTERT (agent-retest 6. juli): påminnelse kun til JA-skoler
Commit 95f4446. IKKE testet på live ennå.
- Påminnelse-fanen (AdminPurring.jsx, modus="paaminnelse") filtrerer nå på
  svart = true OG kommer = true. NEI-svar ekskluderes — også flytteønsker
  (de venter på et annet kurs). Purring-fanen (ikke svart) uendret.
- Tittel: "Påminnelse — har svart JA". Beskrivelse: "Skoler som har svart JA
  og kommer på kurs." Teller på Send-knappen følger filtrert liste.
- Kosmetisk (fra feil B-testen): Skoler-kolonnen i kurstabellen oppdateres
  når Skoler-modalen lukkes (hentAntall ved onLukk). hentAntall viser nå
  også databasefeil i rød feillinje i stedet for å tie.
- TESTPLAN: Påminnelse-fanen skal kun vise JA-skoler (bruk JA- og NEI-svaret
  fra feil B-testen). Legg til/fjern skole i Skoler-modalen → tallet i
  kurstabellen skal stemme straks modalen lukkes, uten sideoppfriskning.

## FEIL B IMPLEMENTERT (agent-retest 6. juli): unntakskobling + fjerning i Skoler-modalen
Commit 1795c39. IKKE testet på live ennå.
- Kursets Skoler-modal (SkoleKobling i AdminKursplanlegger.jsx) har fått
  søkefelt "Legg til annen skole (unntak)": søker alle skoler med status
  'Aktiv' uansett nettverk (min. 2 tegn, debounce, maks 20 treff). Inaktive
  vises ALDRI. Allerede koblede vises grået ut ("allerede koblet").
  Kobling via POST api/admin/koble-skole-kurs.js (eksisterende duplikatvern).
- Fjerning med vern: Fjern-knappen åpner alltid bekreftelsesdialog. Har
  skolen svart, gjengis svaret ("JA, 15 trivselsledere" / "NEI (årsak)")
  med advarsel om at svar + svar-lenke slettes. Sletting via NY DELETE-
  metode i koble-skole-kurs.js (service_role; GRANT DELETE kjørt av Kjartan).
- Feil svelges aldri: rød feilboks i modalen erstatter alert().
- Nettverksforslag-listen filtrerer nå også på status 'Aktiv' (før kunne
  inaktive skoler dukke opp som forslag).
- TESTPLAN: åpne Skoler-modal på testkurs → søk opp skole utenfor nettverket
  → legg til → sjekk kurs_skole. Fjern skole UTEN svar (enkel dialog) og
  MED svar (dialog må gjengi svaret; sjekk at rad+svar+lenke slettes).
  Fjern-vernet trenger et svar å vise — send inn svar via svar-lenken først.

## FEIL A FERDIG+BEVIST (agent-retest 6. juli): påmeldingens livssyklus er rund
Full syklus verifisert på live med TEST FeilA2 skole (org 999666777):
godkjenn → avvis (skole satt Inaktiv, tydelig melding) → re-godkjenn
(reaktivert uten duplikat-feil). Databasekontroll: skole 'Aktiv', påmelding
'godkjent', nøyaktig 1 skolerad (gjenbruk, ikke duplikat).
Commits: fd387dc + 7cc0e99.
- NY api/admin/avvis-paamelding.js: setter status 'avvist'; KUN hvis påmeldingen
  var 'godkjent' settes skolen (samme org_nr) til 'Inaktiv' — SELECT på org_nr,
  UPDATE på id, skolen deaktiveres FØR påmeldingen settes 'avvist' (ingen
  halvtilstand). Ingenting slettes. Var påmeldingen 'ny': skoler-tabellen røres
  ikke. DB-feil returneres som 500 med faktisk feilmelding (rød boks), aldri svelget.
- godkjenn-paamelding.js: duplikatsjekk skiller Aktiv (ekte duplikat → rød 409)
  fra Inaktiv (re-godkjenning → UPDATE eksisterende skolerad, alle felter, 'Aktiv',
  invitasjoner + nettverksforslag som vanlig). Rollback-fiks: 'godkjent' settes
  først ETTER at skoleoperasjonen lyktes — ingen hardkodet tilbakestilling til 'ny'.
- AdminPaameldinger.jsx: Avvis-knappen kaller endpointet og viser resultatboks.
- DEL AV LØSNINGEN — databaseendring: skoler_status_check-constrainten manglet
  verdien 'Inaktiv' (rotårsak til at første live-test feilet; feilen ble i
  tillegg svelget stille av gammel endpoint-kode). Kjartan utvidet constrainten
  med ALTER TABLE — alle seks gamle statusverdier beholdt + 'Inaktiv'.
  LÆRDOM: sjekk CHECK-constraints før koden skriver nye verdier til en kolonne,
  og svelg aldri databasefeil (returner dem synlig til brukeren).

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
- TEST FeilA (org 999444555) — ligger i halvtilstand fra feilet første test
  (påmelding 'avvist', skole 'Aktiv'). Ikke reparer, bare slett.
- TEST FeilA2 (org 999666777) — brukt til beviset for feil A-fiksen.
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
