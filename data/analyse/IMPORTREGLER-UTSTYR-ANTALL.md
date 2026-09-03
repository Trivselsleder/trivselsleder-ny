# Importregler for utstyr og antall

**Grunnlag:** `Content/game-nodes.json` (882 leker) + `Vocabularies/game_equipment-terms.json`
(231 termer, 215 i bruk). Kun disse to JSON-ene lest (7,5 MB); ingen utpakking av binærfiler
(vakt aktiv). Ren analyse — ingen import, ingen database, ingen git.
**Dato:** 2026-09-02. Alle regler har antall ved seg; usikre er merket **USIKKER**.

---

## 1) UTSTYR — den endelige importregelen

### De fire tilstandene (talt, summerer til 882)
| Tilstand | Leker | Betyr |
|---|---:|---|
| Tomt felt (ingen term) | **105** | ingen utstyrsinfo |
| KUN «Uten utstyr» (term 428) | **133** | eksplisitt merket utstyrsfri |
| «Uten utstyr» **+** ekte utstyr (selvmotsigende) | **26** | motstrid i dataene |
| Kun ekte utstyr | **618** | har utstyr |

- **«Uten utstyr»-termen (428) brukes på 159 leker** (133 aleine + 26 sammen med ekte utstyr).
- **De 159 og de 105 er ADSKILTE grupper** (ikke overlappende): 159 har termen, 105 har tomt
  felt. Til sammen **238 leker** skal ende opp som «ingen utstyr» i ny modell.
- De **26 selvmotsigende** har både «Uten utstyr» OG ekte utstyr — de HAR egentlig utstyr.

### Fella (som Fable fant)
I ny modell betyr «uten utstyr» **fravær av kobling** — filteret bruker `NOT EXISTS`. Hvis
importen lager en kobling til en term «Uten utstyr», får 159 leker en kobling som ikke skal
finnes, og da blir både avhuking (som ser etter fravær) og rullgardin (som lister termer) gale.

### IMPORTREGELEN (endelig)
> **U1 — Dropp term 428 ved import.** Når `field_game_equipment` leses, **hopp over
> target_id 428 («Uten utstyr»)**. Den blir aldri en kobling.
> - Leker med KUN 428 (**133**) → 0 utstyrskoblinger → «ingen utstyr» via `NOT EXISTS`. ✓
> - Leker med tomt felt (**105**) → 0 koblinger → samme resultat. ✓ (133 + 105 = **238** blir
>   korrekt «ingen utstyr».)
> - Leker med 428 + ekte utstyr (**26**) → 428 droppes, de ekte beholdes → «har utstyr». ✓
>   (Dette løser motstriden automatisk — riktig vei, siden de faktisk har utstyr.)
> - Leker med kun ekte utstyr (**618**) → importeres som i dag. ✓

**Filteret virker da begge veier:**
- **Avhuking «uten utstyr»** = `NOT EXISTS (kobling)` → treffer de 238.
- **Rullgardin** = liste over ekte utstyrstermer → «Uten utstyr» er ikke med (fordi den ikke
  importeres), så nedtrekket blir rent.

### Skal termen «Uten utstyr» slettes fra utstyr-tabellen?
**Anbefaling: JA — fjern/ikke opprett term 428 i den nye utstyrstabellen.** Den er en
kategori-feil i ny modell: «ingen utstyr» representeres av fravær, ikke av en egen term. Migr
034 opprettet den fordi gammel side hadde den — men gammel side trengte en synlig verdi;
ny side bruker `NOT EXISTS`. Å beholde den «for gammel sides skyld» gir nettopp den doble
feilen vi vil unngå.
*(Dette er IKKE i strid med vaske-husregelen «aldri slett» — den gjelder sammenslåing av
ekte utstyrsverdier. «Uten utstyr» er ikke en utstyrsverdi, men en fraværsmarkør.)*
Hvis noen absolutt vil bevare sporet: behold raden i en historikk-/mappingtabell, men **ikke**
som en valgbar/koblingsbar term i utstyrsvokabularet.

---

## 2) De 20 uenige (felt = «Uten utstyr», tekst lister utstyr)

Leker der det strukturerte feltet har KUN «Uten utstyr», men beskrivelsesteksten nevner utstyr:

| # | nid | Lek | Feltverdi | Tekstverdi (etter «Utstyr:») |
|---|---|---|---|---|
| 1 | 1165 | Amøbe | Uten utstyr | Eventuelt markeringsmatter/tallerkener til å lage lekeområde |
| 2 | 1249 | Speilheks | Uten utstyr | Bare dere selv |
| 3 | 1263 | Høy og lav | Uten utstyr | En stor stein, et huskestativ, eller noe høyere enn bakkenivå |
| 4 | 1272 | Nytur i hendi | Uten utstyr | Perler, steiner, terninger eller lignende |
| 5 | 1276 | Sterke og svake klapp | Uten utstyr | En gjenstand som skal gjemmes (blyant, stein …) |
| 6 | 1451 | Kappe land | Uten utstyr | Pinne, eller annet redskap til å merke opp i grusen |
| 7 | 1452 | Siste paret ut | Uten utstyr | Markeringsmatter/tallerkener |
| 8 | 1465 | Panter´n | Uten utstyr | Ulike gjenstander (binders, stein, viskelær), håndkle e.l. |
| 9 | 1476 | Tampen brenner | Uten utstyr | En gjenstand som skal være skatt |
| 10 | 2282 | Just dance | Uten utstyr | Projektor og Internett-tilgang |
| 11 | 2283 | Move and freeze | Uten utstyr | Projektor og Internett-tilgang |
| 12 | 2703 | Boksen går | Uten utstyr | En boks |
| 13 | 2716 | Snipp og snapp | Uten utstyr | Kinahatter/kjegler |
| 14 | 2728 | Haien kommer! | Uten utstyr | Kjegler/kritt til oppmerking |
| 15 | 2737 | Stokk eller stein | Uten utstyr | Markeringstallerkener, lagbånd |
| 16 | 2876 | Ta den ring og la den vandre | Uten utstyr | En ring eller en annen liten gjenstand |
| 17 | 2891 | Den sterkeste rår | Uten utstyr | Stubbe, benk eller lignende |
| 18 | 3888 | Først på steinen | Uten utstyr | Stein (eller noe annet som kan plukkes opp) |
| 19 | 3934 | Dyreparken | Uten utstyr | 2 terninger |
| 20 | 10133 | Slalåmstafetten | Uten utstyr | Markeringstallerkener (2 stk per lag) |

### Hvilken kilde skal vinne?
- **Det strukturerte feltet vinner for FILTERET** (importregel U1 gjør at disse 20 blir «ingen
  utstyr» — trygt og konsistent).
- **MEN teksten er mer sann** for de fleste: mange lister reelt utstyr (Just dance → projektor,
  Dyreparken → 2 terninger, Boksen går → en boks). For disse er FELTET feil.
- Regel: **U2 — de 20 kan ikke auto-rettes** (fritekst → kontrollert term er for upresist til
  å automatiseres trygt). Importér dem etter U1 (som «ingen utstyr»), men **flagg alle 20 for
  manuell gjennomgang**.
- **Hvor mange MÅ et menneske se på uansett: alle 20.** Av dem er minst **2–3 reelt utstyrsfrie**
  (nr. 2 «Bare dere selv»; nr. 3/5/9/16/18 beskriver «en gjenstand»/naturting og kan forsvares
  som «ingen fast utstyr»), mens resten (~14–15) trolig skal få en ekte utstyrskobling lagt til
  for hånd. Systemet foreslår «ingen utstyr»; mennesket bekrefter eller legger til.

*(De 26 selvmotsigende fra §1 er en annen gruppe — de løses automatisk av U1 og trenger ikke
manuell gjennomgang, siden de allerede har ekte utstyrstermer.)*

---

## 3) Utstyrsverdiene — vaskeforslag (215 unike i bruk)

Se **`utstyr-vaskeforslag.csv`** for hele lista et menneske kan godkjenne. Husregel fulgt:
**slå sammen, velg korteste/reneste, ALDRI slett — systemet foreslår, mennesket bestemmer.**

Funn: verdiene er stort sett rene (Title Case, ingen «ball/en ball/Ball»-kaos). De ekte
dublettene er få:

**Klare sammenslåinger (SIKKER) — 2 stk:**
- **Ertepose (3×) + Erteposer (40×)** → entall/flertall. Korteste = «Ertepose» (menneske
  bekrefter siden flertallsformen dominerer).
- **Dragonskin (1×) + Dragonskin skumball (94×)** → «Dragonskin» er en forkortelse → kanonisk
  «Dragonskin skumball».

**Varianter å GJENNOMGÅ (USIKKER — trolig behold separat) — 9 grupper:** størrelse-/modell-/
lengde-varianter som ikke bør slås sammen automatisk: Dragonskin skumball (små), Monsterball
500/1000, Markeringskjegler (+ nummererte / 7,5 cm), Ball med sprett (+ liten), Lange/Korte
skumrør, Speed Stacks/Speed stack jumbo, Freeballer/Freeballs, Små/vanlige rockeringer, Små
erteposer. For hver: menneske avgjør om skolene trenger å skille dem.

**Ikke-utstyr å GJENNOMGÅ — 4 stk:** «Test» (1×, søppel), «Dommer» (1×, en rolle, ikke utstyr),
«Tilleggsmateriale» (6×, en kategori), «Aball» (11×, tvetydig navn). Disse bør vurderes tatt
ut av utstyrsvokabularet — men **ikke slettet automatisk**.

**Ubrukte termer:** 16 av 231 termer brukes ikke av noen lek — de kan ryddes ved en egen
gjennomgang (ikke haster; påvirker ikke import).

---

## 4) ANTALL — R1–R7 ferdigstilt (med antall pr. regel)

Etiketten «Antall:» finnes i fire HTML-varianter; parseren normaliserer alle. **782 av 882
(88,7 %)** har en etikett; 100 mangler. Regelrekkefølgen kjøres ovenfra og ned; første treff
vinner.

| Regel | Hva den ser etter (for en ikke-utvikler) | Resultat | Treff |
|---|---|---|---:|
| **R1** | Står det to tall med bindestrek, «N-M» (også «N til M», «ca. N-M») | minimum = N, maksimum = M | **264** (29,9 %) |
| **R2** | Står det «N eller flere» (eller «mer»/«mange») | minimum = N, maksimum står tomt | **434** (49,2 %) |
| **R3** | Står det «N+» eller «N-» (åpen oppover) | minimum = N, maksimum står tomt | **3** |
| **R4** | Står det «minst N» / «minimum N» / «fra N» | minimum = N, maksimum står tomt | **3** |
| **R5** | Står det «N eller M» (f.eks. «2 eller 4») | minimum = minste, maksimum = største | **6** — **USIKKER** |
| **R6** | Står det «Mange» (evt. «N til mange») | maksimum tom, «ubegrenset»; min settes hvis et tall nevnes | **38** (4,3 %) |
| **R7** | Står det bare ett tall («12») | minimum = maksimum = tallet | **7** |
| — | Forbehandling før R1–R7: fjern «ca./anbefalt», parentes «(partall)», komma-klausuler og enhetsord «deltagere/stk» | (gjenvant ~30 verdier som ellers ble utolkbare) | — |
| per-enhet | «N per lag/gruppe/sett/spill/bane» — se §5 | ikke total → manuell | 22 |
| utolkbar | narrativ tekst | manuell | 5 |
| mangler | ingen etikett | manuell / la stå tomt | 100 |

**Sum: 882.** Maskinelt tolkbart (R1–R7): **755 av 882 (85,6 %).** Manuell kø: 127 (per-enhet
22 + utolkbar 5 + mangler 100).

### Hvorfor R5 er USIKKER, og hva som skal til for å avgjøre den
«N eller M» (6 leker, alltid «2 eller 4») er tvetydig: det kan bety **et intervall** (min 2,
maks 4) ELLER **enten-eller** (nøyaktig 2 eller nøyaktig 4 spillere, f.eks. par- eller
firemannsspill — ikke 3). R5 antar intervall, men det kan være feil for parspill.
**For å avgjøre:** en person leser beskrivelsen til de 6 lekene og ser om «3» gir mening. Er
alle parspill, bør regelen i stedet sette min = det minste og la maks stå tomt (eller lagre
begge lovlige verdier). 6 leker — raskt å avklare manuelt. Inntil da: **importér R5 som
intervall, men flagg de 6.**

---

## 5) De 22 «per-enhet»

Leker der antallet gjelder **per lag / per gruppe / per sett / per spill / per bane**, ikke
totalt (f.eks. «1-3 per sett», «5-6 spillere per lag + en dommer», «2-4 per spill»).

- **Mønster: ja, det er ett klart mønster** — alle inneholder «per/pr.» + en enhet
  (lag/gruppe/sett/spill/bane). De er maskinelt gjenkjennelige (og allerede skilt ut), men
  tallet kan **ikke** brukes som total lekstørrelse uten å vite antall lag/sett.
- **Anbefaling: R8 (fang, ikke tolk).** Kjenn igjen «per-enhet»-mønsteret automatisk og **la
  antall_min/antall_maks stå tomt** (ikke fyll inn per-enhet-tallet som total — det ville gitt
  feil filter). Behold råteksten i et notatfelt så informasjonen ikke går tapt.
- **22 er få nok til manuell behandling**, men de trenger det strengt tatt ikke haste med:
  fanges de av R8 (tomt total-antall + råtekst bevart), fungerer antall-filteret riktig (de
  faller utenfor min/maks-søk), og en person kan sette total ved en senere gjennomgang.
  Manuell innsats er valgfri, ikke blokkerende.

---

## Oppsummert manuell kø
- **Utstyr:** 20 uenige (§2) + 4 ikke-utstyr-termer + ~11 variant-grupper å bekrefte (§3).
- **Antall:** 100 uten etikett + 5 utolkbare + 6 R5-flagg + (valgfritt) 22 per-enhet.
- Alt annet importeres automatisk av U1 og R1–R7/R8.

## Metode
- Utstyr talt fra `field_game_equipment` (target_id) mot vokabularet; «Uten utstyr» = tid 428.
- «Utstyr:»/«Antall:» hentet fra `safe_value` (den oppløste varianten) med etikett-parser.
- Ingenting gjettet: motstridende/uklare tilfeller er merket USIKKER med begrunnelse, og lagt
  i manuell kø framfor å bli auto-tolket.
