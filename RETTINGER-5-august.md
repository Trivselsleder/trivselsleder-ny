# RETTINGER 5. AUGUST 2026 — les denne før du stoler på de andre dokumentene

Dette er en kort, høyt prioritert korreksjonsliste. Den finnes fordi
flere dokumenter inneholdt påstander som var **arvet fra eldre
dokumenter uten å bli kontrollert mot koden**.

Samme fil er lagt inn som prosjektkunnskap i claude.ai
(`claude/RETTINGER-5-august.md`), fordi prosjektkopien av rettelista der
er et øyeblikksbilde fra 4. august og delvis foreldet. **Der
prosjektkopien og fila i denne mappa er uenige, gjelder fila her.**

---

## 1. KORTUTDELING ER IKKE «IKKE BYGGET»

**Gammel påstand (feil):** «BEVIST IKKE BYGGET. Null kodetreff, null data
på antall_kort og kort_status.»

**Riktig:** `src/pages/AdminKortutdeling.jsx` er **150 linjer**, bygget
**18. juni** i tre commits (`e45a129`, `4b8fd71`, `5cf24a7`). Den er
rutet på `/admin/kortutdeling` (App.jsx:121) og lenket fra admin-menyen
(Admin.jsx:48). **Siden er i drift.** Den merker seg selv:

> «Prototype til gjennomgang med Camilla — ikke ferdig løsning.»

Riktig status: **PROTOTYPE I DRIFT, MODULEN IKKE FULLFØRT.**

Det som finnes: beregningen (`Math.ceil(antallTl * 1.1)`), tabell over
skoler som kommer, fakturasum, tre statusvalg. `kort_status` brukes seks
steder i koden. `antall_kort` har derimot null kodetreff — tallet regnes
ut på skjermen, ikke lagret.

Det som mangler mot konsept v1: Camillas **to faner**, den fjerde
statusen «ikke ønsket», **kursholderens visning på kursdagen** (som er
selve tidsbesparelsen), håndtering av skoler uten antall, og avklaringen
av når tallet fryses.

Ubekreftet: om kolonnene faktisk er tomme i basen. Det ble ikke
kontrollert 5. august (ingen databasetilgang i den økten).

---

## 2. DE FIRE RETEST-FUNNENE FRA 6. JULI ER LUKKET, IKKE ÅPNE

Et tidligere dokument meldte A, B, C og D som åpne fordi de ikke sto i
rettelista. Det var å slutte fra «står ikke i en liste» til «er ikke
gjort». Alle fire er kontrollert i koden:

| Funn | Status | Bevis |
|---|---|---|
| A: avvist påmelding er blindgate | **LUKKET** | `api/admin/godkjenn-paamelding.js:150–158` — inaktiv skole med samme org.nr oppdateres og reaktiveres i stedet for å blokkere |
| B: unntakskobling kun ved godkjenning | **LUKKET** | `src/pages/AdminKursplanlegger.jsx:338–357` — eget unntakssøk over ALLE aktive skoler, uansett nettverk |
| C: påminnelse til NEI-skoler | **LUKKET** | `api/kurs/send-oppfolging.js:286` — `svartJa = svart === true && kommer === true`; linje 302 avviser resten |
| D: ingen fallback til rektor-e-post | **LUKKET** | `sql/steg2-flere-mottakere.sql:135` — `coalesce(hktl_epost, htla_epost, rektor_epost)` |

Det som mangler er ikke arbeidet, men **sporet**: ingen skrev noe sted at
de ble lukket. Retterunder trenger sin egen kvittering.

---

## 3. ANDRE RETTINGER (mindre, men de teller)

- **`maks_antall` sin hensikt forsvant ikke fra dokumentene.** Den står i
  v1 (side 4), v2 §4 og v3 §5. Den forsvant i **koden**. Feltet er et
  input i `AdminKursplanlegger.jsx:711` og sammenlignes aldri mot antall
  påmeldte. `onsket_kurs_id` har null treff i `src/` og `api/`.
- **Oppfølgingsflagg på fritekst finnes delvis.** `SvarOversikt.jsx:101`
  (`harMelding()`) merker rader automatisk og viser «Ikke håndtert» /
  «✓ Håndtert». Det som mangler er filtrering, opptelling og visning på
  tvers av kurs — RA må fortsatt bla for å finne dem.
- **«Mottaker overstyrbar per skole»** står i v1 (§2, §3, §4) og v2 (§2,
  §3), men **ikke i v3**. Aldri bygget.
- Tre sidehenvisninger i `HVA-FORSVANT.md` var feil og er rettet.

---

## 4. LÆRDOMMEN — DEN VIKTIGSTE I HELE PROSJEKTET

Feilen i punkt 1 sto i første utkast til `FREMDRIFTSPLAN-v32.md` — altså
i **dokumentet som ble skrevet for å avskaffe akkurat den vanen**.
Påstanden var kopiert fra `RETTELISTE.md` uten et eneste søk i koden, og
fila det gjaldt lå i en mappelisting jeg selv hadde kjørt timer i
forveien.

En uavhengig kontrollør fant fem feil på under ti minutter. En andre
kontrollrunde over rettingene fant seks til.

**REGEL: DEN SOM BYGGER, KONTROLLERER IKKE ALENE.**
Ingen påstand videreføres uten ny kontroll mot kilden — verken i kode
eller i dokumenter. En statuslinje uten kilde er ikke en status, den er
et rykte.

---

## 5. HVOR DOKUMENTENE LIGGER

Alle i `trivselsleder-ny` på skrivebordet:

| Fil | Hva |
|---|---|
| `FREMDRIFTSPLAN-v32.md` | Fasiten for loop-testing. Seksjon 9 beskriver dokumentets eget fall. |
| `HVA-FORSVANT.md` | Ordrett gjennomgang av konsept v1 → v2 → v3. Hva som forsvant i juni. |
| `DOKUMENTOVERSIKT.md` | Alle 33 dokumentene i «Min nettside» vurdert. |
| `RETTELISTE.md` | Full retteliste, oppdatert 5. aug. Nyere enn prosjektkopien. |
| `TESTFASIT-blokkA.md` | Fasit for blokk A-testing. |
| `STATUS.md` | Speilet i prosjektet som `claude/STATUS-kursplanlegger.md`. |
