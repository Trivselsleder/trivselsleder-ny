# Kan vi koble bilde og video til lek? — diagnose

**Kort svar: JA. Koblingen finnes allerede i eksporten, og den virker for ALLE leker — ikke
bare de 20 testlekene.** Det forrige funnet («101 uløselige bilder») var en **feillesing av
feltvariant**: jeg leste `field_description[0].value` (rå-token-varianten), mens den oppløste
markeringen med filstier ligger i `field_description[0].safe_value`. Når man leser riktig
variant, løser **alt** seg opp: 104 av 104 bilder og 269 av 269 videoer finnes i arkivet.
Vi trenger **ingenting fra Jon** for å gjøre koblingen (med ett lite unntak, se §6).

**Kilde:** `game/document/atlu-nodes.json` + zip-indeks (72 724 stier). Ingen utpakking av
binærfiler (vakt: avbryter hvis ikke forventede stier). Ingen endringer, ingen git.
**Dato:** 2026-09-02. Fasit-tallene er talt mot zip-indeksen og en størrelsestabell fra `unzip -l`.

---

## Hovedfunn (tallene)

Hver lek med innbakt media har en `[[{…"fid":N…}]]`-token i `value` OG en tilsvarende
`<div id="file-N">…src=".../sites/default/files/…">` i **`safe_value`**:

| | Leker | Fil-referanser | Original i arkivet | Mangler | Sum størrelse |
|---|---:|---:|---:|---:|---:|
| **Bilde (innbakt)** | 95 | 104 | **104 (100 %)** | 0 | **51,4 MB** |
| **Video (innbakt, lokal mp4)** | 269 | 269 | **269 (100 %)** | 0 | **16 488 MB (16,1 GB)** |
| **YouTube (ekstern)** | 5 | 6 | — (eksterne ID-er) | — | 0 (ligger på YouTube) |
| **field_image (strukturert)** | 5 | 5 | 3 | **2** | — |

- **340 leker har `<div id="file-…">` i `safe_value`. Tokens uten en tilhørende file-div: 0.**
  Det finnes altså ingen uløselige tokener.
- De **eneste** manglende game-mediafilene i hele eksporten er **2 `field_image`-originaler**
  (`lokomotivet_01_-_bh.jpg`, `tagball.jpg`) — de ligger ikke i arkivet i det hele tatt, heller
  ikke som derivat. Ironisk nok er det nettopp det «strukturerte» feltet vi trodde var trygt.

---

## 1) Virker august-regelen fortsatt? JA — og den var aldri spesiell for de 20

August-regelen: «fid → fil: hver fil ligger i `<div id="file-<fid>">` i safe-value; kutt alt
før `/sites/default/files/`».

- Regelen stemmer eksakt, men markeringen ligger i **`safe_value`**, ikke i `value`.
  Eksempel (nid 1037 «Ostejakten»): token `"fid":"4846"` i `value` → `<div id="file-4846">`
  i `safe_value` → `src=".../sites/default/files/styles/wysiwyg_full_width/public/wysiwyg-media/ostejaktasset_17.jpg"`.
  Fjern `styles/<stil>/public/` → `wysiwyg-media/ostejaktasset_17.jpg` → finnes i arkivet.
- **Kontroll på 20 tilfeldige ANDRE leker (ikke testlekene): 20 av 20 hadde file-div i
  safe_value og løste seg opp.** Mønsteret er universelt.
- **De 20 migr-034-testlekene var faktisk et DÅRLIG utvalg for media:** bare 5 av 20 hadde
  media i det hele tatt (3 file-div + 2 `field_image`); 13 hadde ingen (nid 1036 finnes ikke
  engang i august-eksporten — migr 034 brukte 26.-juni-settet). Migr 034 sier det selv:
  «Media-binærfiler er IKKE lastet opp; bilder ligger som pekere (storage_sti), video kommer
  senere.» Token-medieoppløsningen ble altså **aldri kjørt** i august — troen på at
  «bildesaken var lukket» hvilte på `field_image`-pekere (5 leker) + en antagelse om at resten
  var nedlastingsfeil. Den antagelsen var feil i begge retninger: token-media var alltid
  oppløsbart, og de eneste ekte hullene er 2 `field_image`-filer.

---

## 2) Hva finnes av oppslagsmuligheter i eksporten?

Utover `Content/` (9 node-JSON) og `Vocabularies/` (12 term-JSON) finnes **kun**:
- `export_metadata.txt` — lister BARE node/term-eksportene («Exported 882 game node(s) to …»).
  **Sier ingenting om binærfiler**, ingen fid-referanser.
- `Files/` — hele det rå fil-treet (72 724 stier), inkl. `Files/public/wysiwyg-media/` (der
  nesten all innbakt lek-media ligger).
- 3 `.csv`-filer i `Files/public/` er **import-maler** (`tl-contacts-import-example.csv` osv.),
  ikke et filregister.

**Det finnes INGEN `file_managed`, `file_usage`, media-manifest eller SQL-dump.** Men — og
dette er poenget — vi trenger dem ikke, fordi `safe_value` allerede inneholder fid→sti.

---

## 3) Kan filnavnet utledes på annen måte?

Ja, som ekstra bekreftelse (men unødvendig, siden safe_value gir eksakt sti):
- Filene ligger i `Files/public/wysiwyg-media/` med **gjenkjennelige navn** som ofte inneholder
  lekens navn: `06_-_bil_og_garasje_1080p_5mbps_nor_0.mp4` (nid 1040 «Bil og garasje»),
  `ostejaktasset_17.jpg` (nid 1037 «Ostejakten»).
- Men navnene er ikke 100 % deterministiske (nummer-suffikser, `_0`, `asset_17`, språkkoder),
  så navn-matching alene ville gitt feil. **Safe_value-stien er den sikre kilden; filnavnet er
  bare en trivelig bekreftelse.**

---

## 4) Samme problem for video? NEI — video løser seg like godt

- Video ligger som samme type media-token, og oppløses via samme `<div id="file-N">` i
  `safe_value`. Eksempel nid 1040: `"fid":"19359"` →
  `src=".../sites/default/files/wysiwyg-media/06_-_bil_og_garasje_1080p_5mbps_nor_0.mp4"`
  (direkte sti, ikke derivat).
- **269 leker → 269 unike lokale mp4-filer, alle 269 finnes i arkivet, til sammen 16,1 GB.**
- I tillegg **5 leker med YouTube-embed** (6 unike video-ID-er, f.eks. `0cF7VeZAEwk`) —
  eksterne, ingen lokal fil; importeres som YouTube-ID.
- Konteksten til «466 videofiler»: eksporten har **932 videofiler totalt** (alle innholdstyper
  + varianter). Leker bruker **269 unike** av dem. Bunny-planen for LEK-video er altså 269
  filer / 16,1 GB, ikke 466. (De øvrige videofilene hører til andre innholdstyper.)

---

## 5) Dokumentene og atlu — annen (og også fungerende) mekanisme

Dokumenter kobles på **node-nivå med strukturerte felt**, ikke via innbakt HTML:
- `document`-noder: **alle 542** har `field_document_files` (strukturert, med `uri` +
  `filename` + `filesize`) → filen er direkte oppslagbar. Dette er derfor en HELT annen og
  «renere» mekanisme enn game-media.
- Lek/aktivitet→dokument-koblingen bruk­er `field_related_documents` (node-referanse,
  `target_id`), som er grunnen til at 32/33 tilleggsmaterialer koblet maskinelt. `atlu` har
  `field_related_documents` på 137/289.

**Kan noe av dette brukes for bildene?** Ikke direkte — bildene er ikke egne noder, men
innbakt media. Men det er greit: game-media har sin egen fungerende mekanisme (safe_value
file-div). Konklusjonen er at **alle tre innholdstyper er oppslagbare**, bare via ulike felt:
dokument = `field_document_files`, dokument↔lek = `field_related_documents`, game-media =
`safe_value` file-div.

---

## 6) Hva må vi be Jon om?

**For selve koblingen: ingenting.** fid→fil ligger i `field_description.safe_value`, og alle
104 bilder + 269 videoer finnes i `Files/`. Importen kan bygges på eksporten alene.

Det eneste som mangler binært er **2 `field_image`-originaler**:
`lokomotivet_01_-_bh.jpg` (nid 1363) og `tagball.jpg` (nid 1374) — de finnes ikke i arkivet.

Presist formulert til Jon (Drupal-termer), i prioritert rekkefølge:
1. **De 2 konkrete filene** over, hvis de fortsatt finnes på serveren
   (`sites/default/files/fields/image/game/lokomotivet_01_-_bh.jpg` og `.../tagball.jpg`).
2. **(Valgfritt, som sikkerhetsnett/kryssjekk — ikke nødvendig for koblingen):** en dump av
   **`file_managed`** (kolonnene `fid, uri, filename, filesize, filemime`) og **`file_usage`**
   (`fid, type, id` = entitet som bruker filen). Med disse kan vi (a) verifisere at hver
   `safe_value`-fid peker på riktig fil, (b) fange evt. leker der `safe_value` er utdatert, og
   (c) få en kanonisk fid→sti uten å parse HTML. Men igjen: dette er *bekreftelse*, ikke en
   forutsetning.

Vi trenger IKKE en ny full-eksport, og vi trenger IKKE media-entitets-tabellene for å komme i
gang — token-media er allerede løsbart.

---

## Metode og forbehold

- fid→sti hentet ved å parse `<div id="file-N">`-blokker i `safe_value`, trekke ut
  `/sites/default/files/…`-URL-en, fjerne `styles/<stil>/public/`, og slå opp mot zip-indeksen.
- Størrelser summert fra `unzip -l` (36 339 filoppføringer); videosum 16,1 GB gjelder de 269
  unike lek-mp4-ene.
- Bilde/video/YouTube skilt på file-div-innholdet (`<img>` / `.mp4`+`<video>` /
  `file-video-youtube`+`iframe`). YouTube har ingen lokal fil (ekstern ID).
- Ingen antagelser: «alt finnes» er talt mot arkivet; de 2 manglende er bekreftet fraværende
  (ingen treff i indeksen, heller ikke derivat).
