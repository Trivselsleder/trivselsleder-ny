# Metadata-prøvekjøring — alle 882 leker (game-noder)

**Kilde:** `trivselslederno_Full_Export_240826.zip`. Kun zip-indeksen + `Content/game-nodes.json`
og `Vocabularies/game_equipment-terms.json` ble lest (7,6 MB). Arkivet ble IKKE pakket ut —
en vakt avbryter uttrekk som ikke gir nøyaktig de forventede stiene (etter forrige runaway).
Ingen import, ingen database, ingen repo-endringer, ingen git.
**Dato:** 2026-09-02. **Noder:** 882 (867 publisert, 15 upublisert — bekreftet mot eksporten).

Alle prosenttall er av 882 der ikke annet er nevnt, med absolutt antall ved siden av.
Fullt per-lek-uttrekk: `metadata-parset.csv`.

---

## Kort fasit (hovedtallet først)

- **Netto 247 av 882 (28,0 %)** leker får minst ett avvik ved import.
- **Men 94 av disse (10,7 %)** har KUN avviket «bilde kan ikke slås opp» — det er ETT
  systemisk problem (se §4), ikke 94 manuelle rettinger.
- **Genuin per-lek-manuellkø: 153 av 882 (17,3 %)** når det systemiske bildeproblemet
  løses som én jobb.

---

## 1) ANTALL — full parsing av alle 882

**782 av 882 (88,7 %)** har en «Antall»-etikett vi finner; **100 (11,3 %)** har ingen.
NB: etiketten finnes i fire HTML-varianter (`<strong>Antall:</strong>V`, `<strong>Antall: V</strong>`,
`<b>Antall:</b>V`, og ren tekst `Antall: V`). Parseren normaliserer alle fire.

| Kategori | Antall | Andel | Tolkning |
|---|---:|---|---|
| Rent tallpar `N-M` | 264 | 29,9 % | min=N, maks=M |
| «N eller flere» | 437 | 49,5 % | min=N, maks=tom |
| «minst/minimum N» | 3 | 0,3 % | min=N, maks=tom |
| «N eller M» (f.eks «2 eller 4») | 6 | 0,7 % | min=min, maks=maks — **USIKKER** (kan bety «enten 2 eller 4», ikke et intervall) |
| Enkelttall `N` | 7 | 0,8 % | min=maks=N |
| «Mange» (uten tallgrense) | 38 | 4,3 % | ubegrenset; min der et tall er nevnt, ellers tom |
| «N per lag/gruppe/sett/spill/bane» | 22 | 2,5 % | **per-enhet, IKKE total** — må vurderes manuelt |
| Narrativ/utolkbar | 5 | 0,6 % | manuelt |
| Ingen etikett | 100 | 11,3 % | manuelt / la stå tomt |

**Rent maskinelt tolkbart til minst en minimumsverdi: 717 av 882 (81,3 %)** (de fem
øverste radene). Legger man «Mange» til som «ubegrenset» dekkes 755 (85,6 %).

### Foreslåtte regler (brukt i CSV-en)
- **R1** `N`〈bindestrek/en-dash/em-dash〉`M` → min=N, maks=M.
- **R2** `N eller flere|mer|mange` → min=N, maks=tom. *(oppdragets eksempelregel)*
- **R3** `N+` eller `N-` (åpen øvre) → min=N, maks=tom.
- **R4** `minst|minimum|fra|over N` → min=N, maks=tom.
- **R5** *(USIKKER)* `N eller M` → min=min(N,M), maks=maks(N,M). Kan feiltolke «enten/eller».
- **R6** `Mange` → maks=tom, «ubegrenset»-flagg; min settes hvis et tall er nevnt («N til mange»).
- **R7** *forbehandling:* fjern «ca./anbefalt», parentes-tillegg («(partall)», «(lurt å…)»),
  komma-klausuler og enhet-ord («deltagere/stk/elever/spillere») FØR R1–R6. Dette gjenvant
  ca. 30 verdier som ellers havnet i «utolkbar».
- **Ikke automatiser:** `… per lag/gruppe/sett/spill/bane` (22 stk) — tallet gjelder per enhet,
  ikke total lekstørrelse; semantikken må avgjøres av et menneske.

### De 5 gjenværende utolkbare (må ryddes for hånd)
`10-20 - består klassen av 30 elever vil vi anbefale to grupper.` · `8 + innbyttere` ·
`To og to el. en gruppe på 4-8` · `En og en eller to og to` · `En om gangen, men mange kan delta`.
(De 22 «per-enhet» og de 100 uten etikett kommer i tillegg — se avvikskøen.)

---

## 2) UTSTYR — strukturert felt vs. fritekst

Utstyr finnes **begge steder**:
- **Strukturert felt `field_game_equipment`** (referanser til vokabularet `game_equipment`,
  231 termer): **777 av 882 (88,1 %)** har verdi, **105 (11,9 %)** har tomt felt.
- **Fet «Utstyr:»-etikett i beskrivelsen:** 703 av 882 (79,7 %).

### «Uten utstyr» vs. tomt — de er IKKE det samme (filteret må skille)
- **«Uten utstyr»** finnes som egen term (tid **428**): **159 av 882 (18,0 %)** leker har den
  = *eksplisitt ingen utstyr*.
- **Tomt felt: 105 av 882 (11,9 %)** = *ukjent / ikke tagget*.
- Filteret «vis leker uten utstyr» skal treffe de 159, ikke de 105.

### Uenighet felt vs. tekst — en avvikskategori vi ikke hadde regnet med
- **20 av 882 (2,3 %)** leker: det strukturerte feltet sier **«Uten utstyr»**, men
  beskrivelsesteksten lister faktisk utstyr. (0 leker har motsatt retning.)
- Anbefaling: behandle det strukturerte feltet som fasit for filteret, men **de 20 må
  gjennomgås** — sannsynligvis er feltet feil (utstyr finnes).

---

## 3) VIDEO — full opptelling

- **Flagget `field_contains_video`:** 273 = «1», 218 = «0», og **391 (44,3 %) mangler flagget
  helt** — flagget er altså sparsomt og kan ikke stås alene på.
- **Video ligger i beskrivelses-HTML**, ikke som eget videofelt. To former: Drupal
  media-token `[[{…}]]` med `view_mode:"default"` (274 leker), og 7 leker med youtube/vimeo-lenke.
  *(At «default»-token = video er UTLEDET: disse tokenene mangler bildefeltene som
  «wysiwyg»-tokenene har, og de samsvarer med videoflagget i 266 av 274 tilfeller. Kan ikke
  100 % bekreftes uten fil-tabellen — se §4. Merket USIKKER.)*
- **Leker med video (flagg ELLER HTML): 283 av 882 (32,1 %).**
- **Flere videoer: 2 av 882.**
- **Uenighet flagg vs. HTML: 17 av 882 (1,9 %)** — 7 har flagg=1 uten media-token (trolig
  youtube-lenke), ~8 har media-token men flagg=0, resten kant-tilfeller. Disse bør avstemmes.

---

## 4) BILDER — ikke kartlagt før (og her ligger hovedfunnet)

- **Leker med bilde (noe signal): 114 av 882 (12,9 %).** Flere bilder: 10 leker.
- **Kilder:** strukturert felt `field_image` brukes på **bare 5 leker**. Resten er
  **Drupal media-token** (`view_mode:"wysiwyg"`, 104 tokens) og `<img>` i HTML (31 «ekte»
  src + 5 base64-innbakte).

### KRITISK: bildene (og videoene) kan stort sett IKKE slås opp fra eksporten
Media er bakt inn som **fid-token** i HTML-en (`[[{"fid":"19359", …}]]`) — kun en fil-ID,
ingen sti. Eksporten inneholder **ingen `file_managed`-tabell, ingen SQL-dump, intet
media-manifest** (bekreftet: `Content/` har bare node-JSON, `Vocabularies/` bare termer).
Uten fid→sti-koblingen kan en importer som bruker JSON-en alene **ikke** knytte en lek til
sin konkrete bilde-/videofil. Filene finnes i arkivet (`Files/public/wysiwyg-media/`,
3149 filer, hvorav ~460 video), men per-lek-koblingen mangler.

### Original vs. derivat (regelen: fjern `styles/<stil>/public/` fra stien)
Kun bilder med en faktisk STI kan sjekkes (de 5 `field_image` + de 31 `<img>`):

| har_original | Leker | Betydning |
|---|---:|---|
| `ja` (original i arkivet) | **4** | trykk-klart |
| `nei` (kun derivat, original mangler) | **9** | må merkes «kun skjermkvalitet» |
| `ukjent_token` (fid-token, ingen sti) | **101** | kan ikke avgjøres fra JSON — trenger fil-tabell |
| `na` (ingen bilde) | 768 | — |

- **Bekreftet original finnes: 4.** **Kun derivat (original borte): 9.**
  **Uløselig uten fil-tabell: 101.**
- **Samlet filstørrelse for de originalbildene vi KAN bekrefte: 13,0 MB** (i praksis
  `field_image`-filene). Det reelle lagringstallet for lekebilder kan **ikke** regnes ut fra
  JSON-en, fordi 101 lekers bilder er uløselige fid-tokener. *(Til planlegging: hele
  `Files/public/wysiwyg-media/` (bilder + video for HELE nettstedet, ikke bare leker) kan
  måles fra arkivet hvis dere vil ha et øvre tak — ikke gjort her, siden det ikke er per-lek.)*

**Konsekvens:** «hvor mange leker må merkes kun-skjermkvalitet» kan i dag bare besvares for de
13 sjekkbare (9 mangler original). For de 101 token-baserte må media først kobles opp — enten
ved å hente `file_managed` fra Drupal-basen, eller ved manuell re-lenking. **Dette er én
systemisk oppgave, ikke 101 enkeltrettinger.**

---

## 5) TITTEL OG BESKRIVELSE — er noe ødelagt?

- **Tom tittel: 0.**
- **Tom beskrivelse: 5 av 882 (0,6 %)** — disse har ingen brødtekst å importere (og dermed
  heller ingen antall/utstyr). Se `metadata-parset.csv` (avvikstype inneholder `d:tekst`).
- **Beskrivelse som bare er HTML uten tekst: 0.**
- **Tegnsettproblemer (ødelagte æ/ø/å, mojibake som `Ã¦`/`Ã¸`/`ï¿½`): 0.** Tegnsettet er rent
  UTF-8 gjennomgående.

---

## 6) DEN SAMLEDE AVVIKSKØEN

**Netto: 247 av 882 unike leker (28,0 %)** har minst ett avvik.
**Brutto per gruppe** (en lek kan være i flere):

| Gruppe | Leker | Andel | Innhold |
|---|---:|---|---|
| (a) antall | **127** | 14,4 % | 100 uten etikett + 22 «per-enhet» + 5 narrative |
| (b) uenig utstyr | **20** | 2,3 % | felt = «Uten utstyr», tekst lister utstyr |
| (c) bilde uten bekreftet original | **110** | 12,5 % | 9 kun-derivat + 101 uløselig fid-token |
| (d) ødelagt/tom tekst | **5** | 0,6 % | tom beskrivelse |
| (e) annet | 0 | — | — |
| **Brutto sum** | 262 | | |

Overlapp (fra CSV-ens `avvikstype`): `c:bilde` 100 · `a:antall` 113 · `b:utstyr` 19 ·
`a+c` 9 · `a+d` 5 · `b+c` 1.

### To lesninger av køen
- **Bredt (alt teller):** 247 leker (28,0 %) er flagget.
- **Realistisk per-lek-arbeid:** trekker man fra de **94** lekene som KUN har det systemiske
  token-bildeproblemet (løses som én jobb, ikke per lek), står det igjen **153 leker (17,3 %)**
  som trenger genuin manuell behandling: manglende/tvetydig antall, uenig utstyr, tom tekst,
  eller et bilde som er sjekkbart men mangler original.

### Hvem må fylle køen
- **Antall (127):** de ansatte/fagredaksjonen fyller inn deltakerantall — 100 mangler helt,
  22 er per-enhet-formuleringer, 5 er narrative. R1–R7 tar resten automatisk.
- **Utstyr (20):** gjennomgang av strukturert felt vs. tekst.
- **Bilder (110):** 9 trenger original-opplasting/«kun skjermkvalitet»-merking; **101 krever
  først at media kobles opp fra Drupal-basens `file_managed` (systemisk, blokkerer trykk-PDF).**
- **Tekst (5):** skriv beskrivelse for de fem tomme.

---

## Metode og forbehold

- Tall er talt direkte fra `game-nodes.json` (882 noder) og `game_equipment-terms.json`.
- «Antall»/«Utstyr» hentes ved å normalisere beskrivelses-HTML (fet-tagger fjernes,
  strukturelle tagger → linjeskift) og lese verdien etter etiketten fram til neste etikett/linjeskift.
- **USIKRE punkter er merket i teksten:** (R5) «N eller M», og (§3) at «default»-media-token = video.
- Original-eksistens er sjekket mot zip-indeksen (72 724 stier) ved å fjerne
  `styles/<stil>/public/` fra bildestien.
- Den største usikkerheten — 101 lekers fid-token-bilder og video-tokenene — skyldes at
  eksporten mangler `file_managed`; det er en egenskap ved eksporten, ikke en gjetning.
- Leveranse: `metadata-parset.csv` (én rad per lek, 882 rader).
