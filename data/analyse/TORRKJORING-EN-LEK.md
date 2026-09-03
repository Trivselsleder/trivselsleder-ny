# Tørrkjøring: import av fem leker — hele veien fra Drupal-node til ferdig rad

**Tørrkjøring — ingen database, ingen import, ingen git, ingen repo-endring.** Kun lest:
`Content/game-nodes.json`, `atlu-nodes.json`, `document-nodes.json`, seks vokabular-JSON + zip-indeks
(17 MB, ingen binær-utpakking; vakt aktiv). **Dato:** 2026-09-02.

**Målskjema (kolonnenavn med migrasjonsnummer — lest, ikke gjettet):**
- `ressurser` (024): id, ressurstype, sted, antall_min, antall_maks, kan_ledes_av_elever, redaksjonell_rating, status, opprettet_av, opprettet_at, endret_av, endret_at
- `ressurs_innhold` (024): id, ressurs_id, sprak, tittel, forberedelse, inndeling, utgangsposisjon, formaal, kronologi, regler, variasjoner, instruktoernotat, sokevektor, ferskhet, oppdatert_at · UNIQUE(ressurs_id, sprak)
- `ressurs_kategori` / `ressurs_utstyr` / `ressurs_trinn` / `ressurs_fag` / `ressurs_kompetansemaal` / `ressurs_egnet` / `ressurs_sesong` (025): (ressurs_id, <lookup>_id)
- `medier` (026): id, ressurs_id, type ∈ {bilde,video,pdf}, bunny_video_id, storage_sti, original_filnavn, alt_tekst, rekkefolge
- `dokumenter` (026): id, tittel, type, storage_sti, status, ressurs_id, …
- Oppslag (023): `kategorier`(id,navn,forelder_id), `utstyr`(id,navn), `trinn`(id,land,kode,navn), `fag`(id,navn), `kompetansemaal`(id,kode,tekst,fag_id,trinn_id,ukoblet,erstattet_av), `egnet_kategori`, `sesong`

**Gjennomgående regel som må avklares (brukes av alle fem game-noder):**
> **Skoletype → trinn (USIKKER — interpretiv).** Drupal bruker `field_school_type` (B/U/K/BH/S);
> ny modell har bare `trinn` (årstrinn 1–10 + bhg). Foreslått: **BH→bhg, B→1–7, U→8–10, K→1–10,
> S→UKJENT**. Union per lek. Dette er en tolkning — «B/U/K» er skoleslag, ikke enkelttrinn — og
> koden **S** finnes uten forklaring i eksporten. Må bekreftes av menneske før import.

---

## LEK 1 — Strategiball (nid 1081) · enkel, alt på plass

### A) Rådata
```
nid 1081 | type game | status 1 | language nb | url_alias strategiball | vid 1085
created 1560842028 | changed 1560842028
field_contains_video: []
field_description.format: pdf_content  (value 840 tegn / safe_value 837)
  «<strong>Antall:</strong> 5-20 <strong>Utstyr:</strong> En liten ball (f.eks. dragonskin
   softball) og en kinahatt p/deltager <strong>Anbefales TL-mester</strong> … La deltagerne stå
   i en sirkel …»
field_game_category: [{tid 359 "Strategi"}]
field_game_equipment: [{target_id 357}, {target_id 376}]   → Markeringstallerkener, Dragonskin skumball
field_icon: []   field_image: []   field_related_documents: []
field_lang: [{value nb}]
field_school_type: [{value B},{value U},{value K}]
```
### B) Regel for regel
- **antall_min=5, antall_maks=20** — regel **R1** («N-M»), råtekst «5-20».
- **sted=null** — ingen «Sted:»-etikett (blant de ~683 uten). Riktig, jf. beslutning.
- **utstyr** — field-termer 357 (Markeringstallerkener) + 376 (Dragonskin skumball); ingen 428, ingenting droppes. *(Teksten nevner «liten ball» og «kinahatt» — feltet og teksten er ikke helt like, men ikke en 428-uenighet; feltet vinner, jf. regel U1.)*
- **kategori** — «Strategi» (tid 359, toppnivå) → `kategorier` etter navn.
- **trinn/skoletype** — B+U+K → union **1–10** (via skoletype-regelen over, USIKKER).
- **beskrivelse** — 837 tegn løpende tekst → **se hull D/E: ingen ren «beskrivelse»-kolonne**.
- **medier** — ingen.
### C) Ferdige rader
```
ressurser:        {id: R1, ressurstype 'lek', sted NULL, antall_min 5, antall_maks 20,
                   kan_ledes_av_elever false, redaksjonell_rating NULL, status 'publisert',
                   opprettet_av <import>, opprettet_at now(), endret_av <import>, endret_at now()}
ressurs_innhold:  {ressurs_id R1, sprak 'nb', tittel 'Strategiball', <løpende tekst → ETT felt?>,
                   ferskhet 'mangler'}
ressurs_kategori: (R1, kategori_id[Strategi])
ressurs_utstyr:   (R1, utstyr_id[Markeringstallerkener]), (R1, utstyr_id[Dragonskin skumball])
ressurs_trinn:    (R1, trinn_id[1])…(R1, trinn_id[10])          # 10 rader (USIKKER-mapping)
medier:           — ingen —
```
### D) Hva mangler / tomt
- `sted`, `kan_ledes_av_elever` (default false), `redaksjonell_rating` — tomme; **riktig** (ingen kilde).
- `ressurs_innhold`-tekstfeltene — se E-hull #1: teksten har ingen entydig kolonne.

---

## LEK 2 — Yoshi (nid 1058) · med bilde OG video

### A) Rådata (utdrag)
```
nid 1058 | game | status 1 | nb | url_alias yoshi | field_contains_video: [{value 1}]
field_description safe_value 3699 tegn: «Antall: 8-50 … Utstyr: Lagbånd … markeringsmatter/
  tallerkener … Forslag til laginndeling: Stein, saks, papir …» + to file-div-media
field_game_category: [{tid 359 "Strategi"}]
field_game_equipment: [{393},{357},{378}]  → Matter, Markeringstallerkener, Lagbånd
field_school_type: [{BH},{B},{U},{K}]   field_lang: [{nb}]   field_related_documents: []
safe_value file-div:
  fid 21264  IMG    src …/styles/…/public/wysiwyg-media/skiss.yoshijpg.jpg  (derivat-URL)
  fid 21263  VIDEO  src …/wysiwyg-media/yoshi_no.mp4
```
### B) Regel for regel
- **antall_min=8, antall_maks=50** — **R1**.
- **utstyr** — 393 Matter, 357 Markeringstallerkener, 378 Lagbånd (ingen 428).
- **kategori** — Strategi (359).  **trinn** — BH+B+U+K → **bhg + 1–10** (USIKKER).
- **medier (regel: safe_value file-div → storage_sti, fjern `styles/<stil>/public/`):**
  - **bilde**: URL var et **derivat** (`styles/…`), men originalen `wysiwyg-media/skiss.yoshijpg.jpg`
    **finnes** → lagres som original.
  - **video**: `wysiwyg-media/yoshi_no.mp4` **finnes** (direkte sti, ikke derivat).
- `field_contains_video`-flagget (1) **stemmer** med at det faktisk er video.
### C) Ferdige rader
```
ressurser:       {id R2, 'lek', sted NULL, antall_min 8, antall_maks 50, status 'publisert', …}
ressurs_innhold: {R2, 'nb', tittel 'Yoshi', …}
ressurs_kategori:(R2, [Strategi])
ressurs_utstyr:  (R2,[Matter]),(R2,[Markeringstallerkener]),(R2,[Lagbånd])
ressurs_trinn:   (R2,[bhg]),(R2,[1])…(R2,[10])     # 11 rader (USIKKER)
medier:          {R2, type 'bilde', storage_sti 'wysiwyg-media/skiss.yoshijpg.jpg',
                  original_filnavn 'skiss.yoshijpg.jpg', bunny_video_id NULL, alt_tekst NULL, rekkefolge 0}
                 {R2, type 'video', storage_sti 'wysiwyg-media/yoshi_no.mp4',
                  original_filnavn 'yoshi_no.mp4', bunny_video_id NULL(!), rekkefolge 1}
```
### D) Hva mangler / tomt
- **`bunny_video_id` er NULL** — videoen ligger som fil, men Bunny-ID finnes først ETTER opplasting
  til Bunny.net. **Hull:** importen kan ikke fylle den; enten last opp først og fyll ID, eller
  importér med `storage_sti` og etterfyll `bunny_video_id`. (Bevisst tofase — men må planlegges.)
- `alt_tekst` på bilde — ingen kilde i noden → NULL.

---

## LEK 3 — Amøbe (nid 1165) · en av de 20 «uenige»

### A) Rådata (utdrag)
```
nid 1165 | game | status 1 | nb | field_contains_video: [{value 1}]
field_description safe_value 2011: «Antall: 6 eller flere  Utstyr: Eventuelt markeringsmatter/
  tallerkener til å lage lekeområde  Hva går aktiviteten ut på? …» + ett video-file-div
field_game_category: [{tid 388 "Stein-saks-papir"}]
field_game_equipment: [{target_id 428}]     → «Uten utstyr»
field_icon: [{fid 6991, uri public://fields/icon/cute-vector-pink-floating-jellyfish-…jpeg,
              filesize 94374, image/jpeg}]     ← IKON-FELT, populert
field_related_documents: [{target_id 18056}]  → dokument «Amøbe - bilde av stadiene» / amobe.pdf
field_school_type: [{B},{U},{K}]   field_lang: [{nb}]
safe_value file-div: fid 22866 VIDEO  …/wysiwyg-media/amoba_no.mp4  (finnes)
```
### B) Regel for regel
- **antall_min=6, antall_maks=NULL** — regel **R2** («N eller flere»).
- **utstyr — UENIGHETEN:** feltet har KUN 428 «Uten utstyr»; **regel U1 dropper 428** → **0
  utstyrskoblinger** → «ingen utstyr» via NOT EXISTS. MEN teksten sier «Eventuelt
  markeringsmatter/tallerkener». → **flagges for manuell gjennomgang** (regel U2). Systemet
  importerer «ingen utstyr»; menneske bekrefter (her: «Eventuelt» → utstyrsfri er forsvarlig).
- **kategori** — «Stein-saks-papir» (tid 388).  **trinn** — B+U+K → 1–10 (USIKKER).
- **medier** — video `wysiwyg-media/amoba_no.mp4` (finnes). Flagg=1 stemmer.
- **tilleggsmateriale** — `field_related_documents` [18056] → dokument «Amøbe - bilde av stadiene»,
  fil `fields/file/documents/amobe.pdf` (finnes) → `dokumenter`-rad koblet til ressursen.
- **field_icon** — jellyfish-bilde (finnes på `fields/icon/…`). **Ingen kolonne for ikon i ny
  modell** → se E-hull #2.
### C) Ferdige rader
```
ressurser:        {id R3, 'lek', sted NULL, antall_min 6, antall_maks NULL, status 'publisert', …}
ressurs_innhold:  {R3, 'nb', tittel 'Amøbe', …}
ressurs_kategori: (R3, [Stein-saks-papir])
ressurs_utstyr:   — INGEN — (428 droppet)          ← flagg: manuell gjennomgang (uenig)
ressurs_trinn:    (R3,[1])…(R3,[10])                # USIKKER
medier:           {R3, type 'video', storage_sti 'wysiwyg-media/amoba_no.mp4',
                   original_filnavn 'amoba_no.mp4', bunny_video_id NULL, rekkefolge 0}
dokumenter:       {id D1, tittel 'Amøbe - bilde av stadiene', type 'pdf'?,
                   storage_sti 'fields/file/documents/amobe.pdf', status 'publisert', ressurs_id R3}
[field_icon jellyfish → INGEN RAD — ukjent håndtering]
```
### D) Hva mangler / tomt
- `ressurs_utstyr` tomt — **teknisk riktig** (U1), men **innholdsmessig et hull** (leken har trolig
  ikke utstyr, men det bør bekreftes). Én av de 20 som MÅ ses av et menneske.
- **field_icon havner ingen steder** — potensielt tap av et bilde. Hull (E #2).

---

## LEK 4 — Clap Trap (nid 20076) · Move It

### A) Rådata (utdrag)
```
nid 20076 | game | status 1 | nb | field_contains_video: [{value 1}]
field_description format pdf_content, safe_value 2018, Google-Docs-markup
  («<b id="docs-internal-guid-…">Utføres i par</b> … <b …>Antall: </b>3 eller flere …») —
  INGEN «Utstyr:»-etikett
field_game_category: [{tid 578 "Move It"}]
field_game_equipment: [{target_id 428}]   → «Uten utstyr»
field_school_type: [{B},{K}]   field_lang: [{nb}]   field_related_documents: []
safe_value file-div: fid 24935 VIDEO  …/wysiwyg-media/clap_trap_no.mp4 (finnes)
```
### B) Regel for regel
- **antall_min=3, antall_maks=NULL** — **R2**. («Utføres i par» er en Move It-undertekst, ikke antall.)
- **utstyr** — kun 428 → U1 dropper → ingen kobling. Teksten har ingen «Utstyr:» → **ingen
  uenighet** (ekte «ingen utstyr»).
- **kategori** — «Move It» (tid 578) → `kategorier` (finnes som seedet toppnivå «Move It», 023).
  **MERK skrivemåte:** Drupal «Move It» vs seed «Move It» — må matche case-insensitivt (liten hull).
- **trinn** — B+K → 1–10 (USIKKER).
- **medier** — video `wysiwyg-media/clap_trap_no.mp4` (finnes).
### C) Ferdige rader
```
ressurser:        {id R4, 'lek', sted NULL, antall_min 3, antall_maks NULL, status 'publisert', …}
ressurs_innhold:  {R4, 'nb', tittel 'Clap Trap', …}   ← beskrivelse har Google-Docs-støy (docs-internal-guid)
ressurs_kategori: (R4, [Move It])
ressurs_utstyr:   — ingen —
ressurs_trinn:    (R4,[1])…(R4,[10])                 # USIKKER
medier:           {R4, type 'video', storage_sti 'wysiwyg-media/clap_trap_no.mp4', bunny_video_id NULL, rekkefolge 0}
```
### D) Hva mangler / tomt
- **Beskrivelsen har Google-Docs-markup** (`id="docs-internal-guid-…"`, tomme `<div dir="ltr">`).
  Bør vaskes ved import (fjerne guid-attributter/tomme div-er) — ellers havner støy i tekstfeltet. Hull.
- `bunny_video_id` NULL (samme som Yoshi).

---

## LEK 5 — Algebra med terning (nid 1011) · atlu (aktiv læring) med utgått mål

### A) Rådata
```
nid 1011 | type atlu | status 1 | language nb | url_alias algebra-med-terning-0 | vid 1015
field_atlu_objective: [{target_id 810},{target_id 830}]
field_atlu_topic: [{tid 643 "Utforsking og problemløysing", parent tid 262 "Matematikk"}]
field_contains_video: [{value 0}]
field_description.format full_html, value 2611 / safe_value 2432:
  «Læringsmål: Kunne bytte ut bokstaver … Sted: Gymsal, skolegård … Utstyr: Ark med
   algebrauttrykk og en terning per gruppe …»
field_image: []
field_lang: [{value nb},{value nn}]       ← TOSPRÅKLIG
field_related_documents: [{target_id 715}]   → dokument «Algebra med terning» / oppgaver.pdf
field_school_type: [{U},{K}]
field_school_year: [{tid 258 "8. trinn"}]   ← EGET årstrinn-felt (games mangler dette)
```
Målene løst mot `learning_objectives` + `data/udir/kobling-forslag.csv`:
- **tid 810 «Etter 8. trinn»** → bunke **C**, c_grunn «trinn-overskrift» → **ikke et ekte mål**
  (en overskrift feiltagget som mål).
- **tid 830 «Utforske algebraiske reknereglar.»** → bunke **D (utgått)**, likhetsskår 0.583, ingen
  udir_kode/udir_uri (ingen LK20-erstatter funnet).

### B) Regel for regel
- **ressurstype = 'aktiv_laering'** (atlu).
- **antall_min=2, antall_maks=NULL** — **R2** («2 eller flere»). *(Utstyrsteksten sier «per gruppe»
  — ikke antall.)*
- **sted** — «Gymsal, skolegård …» → inne (gymsal) + ute (skolegård) → foreslått **'begge'**.
  **USIKKER:** fritekst→enum-mapping finnes ikke som regel (E-hull #4).
- **utstyr** — atlu har INGEN `field_game_equipment`; utstyr står bare som tekst. → **ingen
  utstyrskobling** (kan ikke auto-mappes fra fritekst). Hull.
- **kategori/fag** — `field_atlu_topic` parent «Matematikk» → **fag** «Matematikk» (`ressurs_fag`);
  child «Utforsking og problemløysing» → egen underkategori? **atlu bruker topic, ikke
  game_category** (E-hull #8).
- **trinn** — `field_school_year` [258 «8. trinn»] → **trinn kode '8'** (rent, årstrinn direkte —
  ingen skoletype-gjetting for atlu).
- **kompetansemål:** 810 er en trinn-overskrift (skal **droppes** — ingen regel finnes, E-hull #9);
  830 er **utgått** → `kompetansemaal`-rad med **ukoblet=true**, tekst bevart, kode/uri NULL,
  erstattet_av NULL. → **ressurs_kompetansemaal får 0 brukbare koblinger** (matcher tidligere funn:
  1011 «mister all reell læreplankobling»).
- **tospråklig** — field_lang nb+nn, men bare ÉN beskrivelse. Nynorsk-tekst finnes ikke separat →
  E-hull #7.
- **tilleggsmateriale** — doc 715 «Algebra med terning» / `fields/file/documents/oppgaver.pdf` (finnes).
### C) Ferdige rader
```
ressurser:        {id R5, ressurstype 'aktiv_laering', sted 'begge'(USIKKER), antall_min 2,
                   antall_maks NULL, status 'publisert', …}
ressurs_innhold:  {R5, 'nb', tittel 'Algebra med terning', formaal 'Kunne bytte ut bokstaver …'?,
                   …}   (+ evt. {R5,'nn', …} hvis nynorsk-tekst skaffes — mangler nå)
ressurs_fag:      (R5, fag_id[Matematikk])
ressurs_trinn:    (R5, trinn_id[8])
ressurs_kompetansemaal: — 0 rader — (810 overskrift droppet, 830 utgått/ukoblet)
                   [hvis utgåtte importeres: kompetansemaal{kode NULL, tekst 'Utforske algebraiske
                    reknereglar.', ukoblet true} + ressurs_kompetansemaal(R5, den) — POLICY-VALG]
dokumenter:       {id D2, tittel 'Algebra med terning', storage_sti
                   'fields/file/documents/oppgaver.pdf', status 'publisert', ressurs_id R5}
medier:           — ingen — (field_contains_video 0)
```
### D) Hva mangler / tomt
- **ressurs_kompetansemaal tomt** — begge målene ubrukelige (overskrift + utgått). Riktig at det
  blir tomt, men det ER hullet de 62 oppleggene representerer — policy trengs (importere utgåtte
  som `ukoblet`, eller la stå tomt?).
- **Nynorsk-innhold** — lovet av field_lang, men finnes ikke → bare `nb`-rad skrives.
- **utstyr** — reelt utstyr i teksten («terning», «ark») fanges ikke (atlu mangler strukturert felt).

---

## E) HVA VI IKKE HAR REGLER FOR (hovedfunnet — det som ellers dukker opp i generalprøven)

1. **Løpende beskrivelse har ingen kolonne.** `ressurs_innhold` (024) har åtte SEMANTISKE felt
   (forberedelse, inndeling, utgangsposisjon, formaal, kronologi, regler, variasjoner,
   instruktoernotat) — men **ingen ren «beskrivelse»/«brødtekst»**. Vi har besluttet å importere
   løpende tekst, men det finnes ikke ett felt å legge den i. **Må avgjøres:** hvilket felt får
   blobben (trolig `kronologi`), eller skal det legges til en `beskrivelse`-kolonne? Gjelder ALLE 882.
2. **field_icon** (game) — dekorativt ikon (Amøbe har jellyfish, fil finnes). Ingen ikon-kolonne
   i ny modell. Ignoreres, eller inn som `medier` type bilde? Ubestemt.
3. **Skoletype → trinn** (B/U/K/BH/**S**). Interpretiv mapping; **S er uforklart** i eksporten.
4. **sted fritekst → enum** (atlu: «Gymsal, skolegård …» → inne/ute/begge). Ingen mapping-regel.
5. **kan_ledes_av_elever** — ingen kildefelt. Default false, men TL-leker LEDES jo av elever
   (trivselsledere). Er default riktig, eller skal alle 'lek' være true? Ubestemt.
6. **redaksjonell_rating / ferskhet** — ingen kilde. `ferskhet` defaulter 'mangler', rating NULL.
7. **Tospråklig atlu (nb+nn) med bare én beskrivelse** — skal det lages to `ressurs_innhold`-rader?
   Nynorsk-teksten finnes ikke i eksporten.
8. **atlu-kategorisering (field_atlu_topic) vs game (field_game_category)** — ulike vokabular;
   hvordan mappe topic (Matematikk/Utforsking) til `kategorier` vs `fag`?
9. **Objective som er en trinn-overskrift** (810 «Etter 8. trinn», bunke C) — ikke et ekte mål,
   må filtreres bort. Ingen regel skiller overskrifter fra mål.
10. **created/changed/url_alias/vid** — bevares originale tidsstempler/slug? `opprettet_at`
    defaulter now(); ingen slug-kolonne på `ressurser`.
11. **Inline-etiketter i beskrivelsen** («Anbefales TL-mester», «Forslag til laginndeling»,
    «Hva går aktiviteten ut på?», «Utføres i par») — noen matcher semantiske felt (inndeling), men
    vi importerer løpende. Skal noen trekkes ut likevel? «Anbefales TL-mester» har ingen kolonne.
12. **field_contains_video-flagget lagres ikke** (utledes av `medier`). Uenigheter flagg-vs-faktisk
    (funnet: 17 leker) går tapt hvis vi bare stoler på file-div.
13. **status-mapping** Drupal 0/1 → enum {utkast,publisert,arkivert}. 1→publisert antatt;
    upublisert (15 leker) → 'utkast' eller 'arkivert'?
14. **Google-Docs-støy** i nyere beskrivelser (`id="docs-internal-guid-…"`, tomme div-er) — trenger
    vask ved import.
15. **utstyr «per enhet» i tekst** (atlu «en terning per gruppe») — samme per-enhet-problem som antall.

## D-oppsummering på tvers
| Lek | Tomme felt som er RIKTIG | Tomme felt som er HULL |
|---|---|---|
| Strategiball | sted, rating, kan_ledes | beskrivelse-kolonne (E1) |
| Yoshi | sted, alt_tekst | bunny_video_id (tofase), E1 |
| Amøbe | ressurs_utstyr (U1) | field_icon (E2), utstyr-uenighet (manuell) |
| Clap Trap | ressurs_utstyr, sted | Google-Docs-vask, bunny_video_id |
| Algebra (atlu) | medier | ressurs_kompetansemaal (policy), nynorsk, utstyr-fra-tekst |

---

## F) SKRIVEREKKEFØLGE (så fremmednøklene holder)

1. **`profiles`** — import-/systembruker må finnes (referert av `ressurser.opprettet_av`/`endret_av`, 024).
2. **Oppslagstabeller (023)** i denne rekkefølgen pga. interne FK-er:
   `fag`, `trinn`, `sesong`, `egnet_kategori`, `utstyr`, `kategorier` (selv-FK forelder_id: foreldre
   før barn), deretter **`kompetansemaal`** (FK → `fag`, `trinn`; selv-FK `erstattet_av`: erstatter
   før den erstattede).
3. **`ressurser`** (024) — FK → `profiles`.
4. **`ressurs_innhold`** (024) — FK → `ressurser` (trigger fyller `sokevektor`).
5. **Koblingstabeller (025)** — FK → `ressurser` + oppslag: `ressurs_kategori`, `ressurs_utstyr`,
   `ressurs_trinn`, `ressurs_fag`, `ressurs_kompetansemaal`, `ressurs_egnet`, `ressurs_sesong`.
6. **`ressurs_trinn_innhold`** (025) — FK → `ressurs_trinn` (må komme ETTER `ressurs_trinn`).
7. **`medier`** (026) — FK → `ressurser`.
8. **`dokumenter`** (026) — FK → `ressurser`; deretter **`dokument_fag`** (FK → `dokumenter` + `fag`).

*(Kort: bruker → oppslag → ressurser → innhold → koblinger → trinn_innhold → medier → dokumenter.)*

---

## Metode
- Alle feltverdier lest direkte fra nodene; media via `safe_value` file-div (styles-derivat strippet
  til original, verifisert mot zip-indeks). Målstatus fra `kobling-forslag.csv` (rad *i* = term *i*).
- Kolonnenavn sitert fra migrasjon 023–026. Ingenting gjettet: felt uten hjem er merket «UKJENT
  FELT»/E-hull med innhold vist, og alle usikre mappinger er merket **USIKKER**.
