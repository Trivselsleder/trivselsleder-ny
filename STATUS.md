# STATUS – trivselsleder-ny
Sist oppdatert: 6. juli 2026 (formiddag)

## KURSPLANLEGGER-FIKSER (fra agenttest 2. juli) — 3 av 4 FERDIG OG BEVIST
- FIKS 1 FERDIG+BEVIST: org.nr-duplikat gir rød feilmelding i godkjenn-modal,
  aldri stille overskriving. Påmelding rulles tilbake til 'ny' ved kollisjon.
  (api/admin/godkjenn-paamelding.js + AdminPaameldinger.jsx, t.o.m. commit 4fdc197)
- FIKS 2 FERDIG+BEVIST: godkjenning overfører ALLE felter fra påmelding til
  skolekort (elevtall, adresse, telefon, rektor, HTLA, TLA→HKTL).
- FIKS 3 FERDIG+BEVIST (6. juli): nettverk ved godkjenning = "systemet foreslår,
  mennesket bestemmer". Bevist end-to-end, alle tre scenarier:
  * Kommune-treff: Bergen → "Testnettverk Bergen" foreslått, bekreftet, lagret.
  * Fallback: kommune → fylke → fritekst "nytt nettverk" (Tromsø = ingen treff).
  * Unntaksvei: koble enkeltskole direkte til kurs, bekreftet i kurs_skole-tabell.
  * Kursdato + klokkeslett vises korrekt i dropdown (24.07.2026 kl. 09:00).
  Filer: api/admin/godkjenn-paamelding.js (returnerer nettverksforslag),
  api/admin/sett-nettverk.js (NY), api/admin/koble-skole-kurs.js (NY),
  AdminPaameldinger.jsx (NettverkOgKursBlokk). Siste commit: a966e18.
  SQL-funksjon: foresla_nettverk(ny_kommunenavn, ny_fylke) — kommune→fylke→tom.
- FIKS 4 IKKE BYGGET: svar-skjema skal vise kontekst (kursnavn/dato/skolenavn).

## FIKS 3 — FIRE UNDERLIGGENDE TING VI LØSTE UNDERVEIS (viktig lærdom)
1. Kopiering via heredoc tapte en '<a'-tag i AdminPaameldinger.jsx → alltid
   verifiser fil etter store innliminger (vite build fanger syntaksfeil).
2. service_role manglet SELECT på 'kurs'-tabellen (permission denied). Fikset:
   GRANT SELECT ON kurs TO service_role + RLS-policy "Service role har full tilgang".
3. service_role manglet SELECT+INSERT på 'kurs_skole'. Samme fiks:
   GRANT SELECT, INSERT ON kurs_skole TO service_role + service_role-RLS-policy.
   LÆRDOM: nye tabseller kan mangle service_role-grants. Sjekk med
   has_table_privilege('service_role','<tabell>','SELECT') ved permission denied.
4. Datamodell: kurs har SKILT 'dato' (date) og 'start_tid'/'slutt_tid' (time).
   Vi viste feil kolonne (start_tid) først → "Invalid Date". Nå: dato + kl. HH:MM.

## NESTE KODEØKT
1. Bygg FIKS 4 (kontekst i svar-skjema: kursnavn/dato/skolenavn)
2. RETEST: kjør agent-testoppdraget på nytt (samme prompt, Dispatch+Chrome)
3. ETTER godkjent retest: SLETT alle testdata (se liste under)
4. Deretter: presentere kursplanleggeren for ansatte/Marielle-pilot

## TESTDATA SOM SKAL SLETTES (etter godkjent retest)
- TEST-skoler fra agenttest: Solbakken, Fjellheim, Havblikk
- TEST Fiks2 skole (org 999888777)
- FIKS 3-testskoler (opprettet 6. juli): FiksNettverk (999111222),
  FiksKurs (999333444), FiksKurs2 (999555666), FiksKurs3 (999777888),
  FiksKurs4 (999999111), FiksKurs5 (999222333)
- Testkurs "TEST Lekekurs Kjartan-test" + alle kurs_skole-koblinger til testskoler
- Alle tilhørende påmeldinger, invitasjoner (profiles), bruker_skole-rader
- NB: rydd i riktig rekkefølge pga FK: kurs_skole → bruker_skole → skoler →
  paameldinger → (evt. profiles for kjartan+... testadresser)

## COWORK/FABLE-RAPPORTER (alle lest av Claude, essens i minnet)
- kursplanlegger-agenttest-2026.md (2. juli) — feilliste, nå 3 av 4 fikset
- fase3-ramsalt-dybde + inspirasjon + SAMMENDRAG (4. juli). TO SPRIK å oppklare
  før import: (a) video 247/254 mp4 vs 439 filer/27GB — sjekk undermappe;
  (b) 103/105 bildeoriginaler mangler, kun derivater → spør Jon om original-arkiv.
- laerervikaren-kartlegging-2026.md (5. juli) — FREMTIDIG (v29+, bakerst).
- omtaler-trivselsleder-2026.md (5. juli) — Evidence-råstoff. Hjemmelekser:
  DNV GL-original, masteroppgave-ref, les "De bryter løftene sine".
- PÅGÅR/KØ: aktive-brukere-eksport (laerervikaren + trivselsleder.no).

## HUSK
- v29 fremdriftsplan lages snart (v28 som mal): videoverts-funn, redaksjonelle
  rutiner, kursplanlegger-fikser, Lærervikaren (bakerst), omtaler/Evidence.
  Statisk TOC verifiseres mot PDF.
- Chrome-utvidelsens "Allow all browser actions" — SKRU AV når eksport er ferdig.
- Test alltid: https://trivselsleder-ny.vercel.app
- Supabase SQL: https://supabase.com/dashboard/project/zpirjbrcbeubwpmtncxx/sql/new
