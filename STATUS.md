# STATUS – trivselsleder-ny
Sist oppdatert: 5. juli 2026 (kveld)

## KURSPLANLEGGER-FIKSER (fra agenttest 2. juli) — 2 av 4 FERDIG OG BEVIST
- FIKS 1 FERDIG+BEVIST: org.nr-duplikat gir nå rød feilmelding i godkjenn-modal,
  aldri stille overskriving. Påmelding rulles tilbake til 'ny' ved kollisjon.
  (api/admin/godkjenn-paamelding.js + AdminPaameldinger.jsx, commits t.o.m. 4fdc197)
  Testet: Fjellheim mot Solbakken (samme org.nr) → rød boks, ingen skade.
- FIKS 2 FERDIG+BEVIST: godkjenning overfører nå ALLE felter fra påmelding til
  skolekort: elevtall, adresse, telefon, rektor (navn/epost/tlf), HTLA, og TLA→HKTL
  (Hovedkontakt TL = feltet purring/påminnelse/evaluering trenger).
  Testet: TEST Fiks2 (org 999888777) → alt fylt inkl. HKTL Tone Testtla.
- FIKS 3 BESLUTTET, IKKE BYGGET: nettverk ved godkjenning = "systemet foreslår,
  mennesket bestemmer": auto-foreslå nettverk fra skolens kommune, RA bekrefter/
  overstyrer (dropdown forhåndsvalgt). I TILLEGG: RA kan koble enkeltskole direkte
  til kurs som unntak. Begge bygges.
- FIKS 4 IKKE BYGGET: svar-skjema skal vise kontekst (kursnavn/dato/skolenavn).

## NESTE KODEØKT
1. Bygg fiks 3 (nettverksforslag i godkjenning + enkeltskole-til-kurs)
2. Bygg fiks 4 (kontekst i svar-skjema)
3. RETEST: kjør agent-testoppdraget på nytt (samme prompt, Dispatch+Chrome)
4. ETTER godkjent retest: SLETT alle testdata — 3 TEST-skoler (Solbakken/
   Fjellheim/Havblikk) + TEST Fiks2 (org 999888777) + testkurs + påmeldinger + svar
5. Deretter: presentere kursplanleggeren for ansatte/Marielle-pilot

## COWORK/FABLE-RAPPORTER (alle lest av Claude, essens i minnet)
- kursplanlegger-agenttest-2026.md (2. juli) — feilliste, 2 av 4 fikset
- fase3-ramsalt-dybde + inspirasjon + SAMMENDRAG (4. juli) — Fase 3-forarbeid.
  TO SPRIK å oppklare før import: (a) video: Fable fant 247/254 mp4 MANGLER
  men tidligere telling fant 439 filer/27GB — sjekk undermappe; (b) bildeoriginaler:
  103/105 wysiwyg-originaler mangler, kun derivater → spør Jon om original-arkiv.
- laerervikaren-kartlegging-2026.md (5. juli) — FREMTIDIG prosjekt (v29+, bakerst).
  Bemanning = levende kjerne (435k timer), bibliotek dødt siden 2022. D7 EOL =
  sikkerhetsrisiko (20k brukere m/ persondata). KAN bygges inn i TL på sikt, IKKE nå.
- omtaler-trivselsleder-2026.md (5. juli) — Evidence-råstoff: DNV GL 2017,
  Harvard, Ashoka, NRK-jurysitat 2015. Hjemmelekser: DNV GL-original,
  masteroppgave-referanse, les "De bryter løftene sine".
- PÅGÅR/KØ: aktive-brukere-eksport (laerervikaren + trivselsleder.no, 15.08.25–30.06.26,
  samlet Excel: fornavn/etternavn/epost/skole/kommune/fylke/kilde).

## HUSK
- v29 fremdriftsplan lages snart (v28 som mal): videoverts-funn, redaksjonelle
  rutiner, kursplanlegger-fikser, Lærervikaren (bakerst), omtaler/Evidence,
  internasjonal-rapportene. Statisk TOC verifiseres mot PDF.
- Chrome-utvidelsens "Allow all browser actions" ble slått PÅ for omtale-søket —
  SKRU AV igjen når eksport-oppdraget er ferdig.
- Test alltid: https://trivselsleder-ny.vercel.app
- Supabase SQL: https://supabase.com/dashboard/project/zpirjbrcbeubwpmtncxx/sql/new
