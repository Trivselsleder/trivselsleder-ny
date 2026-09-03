# Dokumentene i eksporten — kartlegging

**Kilde:** `trivselslederno_Full_Export_240826.zip` (35 GB, 72 724 filer). Kun zip-indeksen
og de strukturerte JSON-eksportene (`Content/`, `Vocabularies/`) ble lest — arkivet ble
IKKE pakket ut. 15 enkeltfiler (4 PDF + 11 PPTX) ble hentet målrettet for tekstmåling og
slettet etterpå. Ingen endringer i repoet, ingen `src/`, ingen git.
**Analysedato:** 2026-09-02. **Antall document-noder:** 542 (bekreftet mot `export_metadata.txt`).

Alle prosenttall er oppgitt med absolutt antall ved siden av. Grunnlaget er 542 dokumenter
der ikke annet er nevnt. Leveranse-CSV-ene (`dokumenttyper.csv`, `dokumentliste.csv`) har
de fullstendige listene.

---

## 1) Dokumenttyper — taksonomien

**Feltet som klassifiserer document-noder er `field_type_document`**, som peker på
vokabularet **`type_document`** (vid 3). Vokabularet har **51 termer**, og er **hierarkisk**
(termer har foreldre). Et dokument kan ha **flere** typer samtidig:

- **0 dokumenter (0 %)** står uten type — alle 542 er klassifisert.
- **164 av 542 (30,3 %)** har mer enn én type. Snitt 1,38 typer per dokument.
- **50 av 51 termer** er i bruk. Den **eneste ubrukte** er `916 Takk for innsatsen`
  (barn av «Drift av TL»).

Skjermbildene stemmer i all hovedsak. Alle de nevnte typene finnes (Diplom og attester,
Informasjon, Invitasjoner, Nominasjon/søknad/advarsel, Presentasjoner, Søknader om tilskudd,
Tips og plakater, TL-logo, Lek og aktivitet, Pratekort, Trivselspatruljen, Turneringer og
TL-Mester, Aktiv læring, Ungdomsskole). **Presiseringer / det vi ikke hadde sett fra før:**

- «Diplom og attester», «Presentasjoner», «Søknader om tilskudd», «Tips og plakater»,
  «TL-logo», «Nominasjon, søknad og advarsel», «Invitasjoner», «Informasjon» er alle
  **undertyper av «Drift av TL»** — ikke frittstående toppnivåer.
- Flere navn finnes **to ganger** med ulik forelder — viktig for en kontrollert liste:
  - **«Tilleggsmateriale til leker»**: tid **910** (under Lek og aktivitet) *og* tid **924**
    (under Trivselspatruljen).
  - **«Informasjon»**: tid 902 (under Aktiv læring), tid 905 (under Drift av TL), tid 918
    (under Trivselspatruljen).
  - **«Kurshefter»**: tid 900 (Aktiv læring), 906 (Lek og aktivitet), 909 (Trivselspatruljen).
  - **«Manualer»**: tid 903 (Aktiv læring), 907 (Lek og aktivitet).
- Typer vi ikke hadde på lista fra skjermbildene: **Verdisamlinger** (Trivselspatruljen),
  **Julekalender**, **Move-it**, **Lek med tema**, **Ukeplaner med lek**, **Velkommen 1.
  klasse!**, **Lekeplakater/A4-beskrivelser** (alle under Lek og aktivitet); **Drift av TP**,
  **Kurshefter** (Trivselspatruljen); **Valgfag → Fysisk aktivitet og helse / Innsats for
  andre**, **Lederutdanning** (under Ungdomsskole); **Seminar**; **Aball**, **Kurshefter**,
  **Informasjon** (Aktiv læring); **Periodeplan / Tips / Plakater** (under Tips og plakater);
  **Elevpresentasjoner / Oppstartsmøte med trivselsledere** (under Presentasjoner);
  **Nominasjon / Søknad / Advarsel** (under Nominasjon, søknad og advarsel);
  **Informasjon om kulturkort**, **Informasjon til foresatte**, **Takk for innsatsen** (ubrukt).

**Full liste med antall: se `dokumenttyper.csv`.** De mest brukte termene:

| Antall | Andel | tid | Type | Forelder |
|---:|---|---|---|---|
| 280 | 51,7 % | 2 | Aktiv læring | (toppnivå) |
| 54 | 10,0 % | 901 | Drift av TL | (toppnivå) |
| 34 | 6,3 % | 906 | Kurshefter | Lek og aktivitet |
| 27 | 5,0 % | 910 | Tilleggsmateriale til leker | Lek og aktivitet |
| 27 | 5,0 % | 912 | Tips og plakater | Drift av TL |
| 25 | 4,6 % | 908 | Lekeplakater/A4-beskrivelser | Lek og aktivitet |
| 21 | 3,9 % | 904 | Trivselspatruljen | (toppnivå) |
| 18 | 3,3 % | 1239 | Plakater | Tips og plakater |
| 17 | 3,1 % | 37 | Valgfag | Ungdomsskole |
| 17 | 3,1 % | 38 | Turneringer og TL-Mester | (toppnivå) |

**Rollup per toppnivå-gren** (dokumenter med minst én type i grenen; summen > 542 fordi
dokumenter kan ha typer i flere grener):

| Toppnivå | Dokumenter |
|---|---:|
| Aktiv læring | 280 (51,7 %) |
| Lek og aktivitet | 111 (20,5 %) |
| Drift av TL | 92 (17,0 %) |
| Trivselspatruljen | 27 (5,0 %) |
| Ungdomsskole | 20 (3,7 %) |
| Turneringer og TL-Mester | 17 (3,1 %) |
| Seminar | 2 (0,4 %) |
| Pratekort | 2 (0,4 %) |

**Skoletype** ligger i et eget felt `field_school_type` (verdiliste, ikke eget vokabular i
eksporten), flervalg. Fordeling (sum > 542 fordi flervalg): **K = 409 (75,5 %)**,
**B = 400 (73,8 %)**, **U = 307 (56,6 %)**, **BH = 42 (7,7 %)**, **S = 19 (3,5 %)**,
uten verdi = 2 (0,4 %). Kodene er råverdier fra feltet (B/U/K/BH/S); eksporten inneholder
ingen ordliste som forklarer dem, så betydningen er ikke bekreftet her.

---

## 2) Språk

Språk er **ikke** en type-merkelapp — det ligger i et eget felt **`field_lang`** (flervalg),
med tre verdier i bruk: **`nb` (bokmål), `nn` (nynorsk), `en` (engelsk)**.

Per språk (et dokument kan ha flere; **107 av 542 (19,7 %)** har mer enn ett):
- **Bokmål `nb`: 491 av 542 (90,6 %)**
- **Nynorsk `nn`: 125 av 542 (23,1 %)**
- **Engelsk `en`: 90 av 542 (16,6 %)**
- **Uten språkmerke: 6 av 542 (1,1 %)**

Rene kombinasjoner (hvert dokument talt én gang):

| Kombinasjon | Antall | Andel |
|---|---:|---|
| kun bokmål | 384 | 70,8 % |
| engelsk+bokmål+nynorsk | 63 | 11,6 % |
| bokmål+nynorsk | 36 | 6,6 % |
| kun nynorsk | 26 | 4,8 % |
| kun engelsk | 19 | 3,5 % |
| engelsk+bokmål | 8 | 1,5 % |
| uten språk | 6 | 1,1 % |

(Node-feltet `language` er sekundært: 469 `nb`, 73 uten — men `field_lang` er den redaksjonelle merkelappen.)

---

## 3) Tilleggsmateriale til leker

Ja, dette er en **Type-merkelapp**, og den finnes i **to varianter**:
`910 Tilleggsmateriale til leker` (under Lek og aktivitet) og `924` (under Trivselspatruljen).

- Med tid **910**: 27 dokumenter. Med tid **924**: 6 dokumenter.
- **Til sammen 33 av 542 (6,1 %)** dokumenter er merket tilleggsmateriale (ingen overlapp).

**Kan vi maskinelt se hvilken lek dokumentet hører til? JA — for 32 av 33 (97,0 %).**
Koblingen ligger **eksplisitt i dataene**: game-noder og atlu-noder har feltet
**`field_related_documents`** som peker (via `target_id` = dokumentets nid) på dokumentene.
Ved å snu den koblingen får vi lek → dokument automatisk:

- **32 av 33 (97,0 %)** tilleggsmateriale-dokumenter er referert fra nøyaktig en lek/aktivitet
  (games som «Spion vs General», «TL-veien», «Toget går», «Påskejakt», «Bevegelsesbingo»,
  m.fl.; to er knyttet til atlu-aktiviteter «Plukk summen» og «Rubiks matte»).
- **1 av 33 (3,0 %)** — «Moonball Challenge, utfordringer» — har **ingen** innkommende
  `field_related_documents`-lenke, og må kobles manuelt (eller leken er slettet).

**Konklusjon:** lek↔dokument-koblingen kan importeres automatisk fra `field_related_documents`
(totalt 87 referanser fra games + 318 fra atlu). Den trenger ikke utledes fra tittel.
Full liste (tittel → lek) står i `dokumentliste.csv`, kolonnene `tilleggsmateriale` og `hvilken_lek`.

---

## 4) Drift av TL (tid 901)

**54 av 542 (10,0 %)** dokumenter er merket **`901 Drift av TL`** direkte. (Regner man hele
grenen under Drift av TL — inkludert undertyper som Presentasjoner, Tips og plakater,
Nominasjon/søknad/advarsel, Søknader om tilskudd, TL-logo, Diplom og attester — er det
**92 av 542 (17,0 %)**.)

Dette er håndbokstoffet AI-hjelperen skal svare rektor fra. De 54 titlene med `901` direkte:

1. Programbeskrivelse, ungdomsskole
2. Programbeskrivelse, barneskole
3. Informasjonsskriv foresatte, ungdomsskole
4. Informasjonsskriv personalet, ungdomsskole
5. Invitasjon til aktivitetskurs, ungdomsskole
6. Invitasjon til aktivitetskurs, ungdomsskole nynorsk
7. Periodeplan, ungdomsskole
8. Søknad TL
9. Søknad TL med TL-styre
10. Nominasjonslapp - nynorsk
11. FAU diplom
12. Oversikt over antall TL-verv
13. Takk for innsatsen-dag
14. Informasjonsskriv personalet, barneskole
15. Periodeplan, barneskole
16. Invitasjon til lekekurs, nynorsk
17. Invitasjon til lekekurs
18. Informasjon om TL
19. Fordeler med å være en TL-skole
20. Elevpresentasjon 1.-3. trinn - nynorsk
21. Elevpresentasjon 1.-3. trinn
22. Elevpresentasjon 4.-7. trinn
23. Elevpresentasjon 8.-10. trinn
24. Oppstartsmøte, ungdomsskole
25. Information to parents, primary school
26. Information about the program
27. Nomination form - English
28. Elevpresentasjon 4.-7.trinn/Student presentation 4.-7. grade
29. Tips til laginndeling
30. Elevpresentasjon 4.-7. trinn - nynorsk
31. Elevpresentasjon 8.-10. trinn - nynorsk
32. Oppstartsmøte ungdomsskole, nynorsk
33. Søknad TL med TL-styre, nynorsk
34. Hvordan lykkes som TL-skole?
35. Tips til de eldste elevene
36. Søknad TL (nynorsk)
37. Søknad TL, barneskole (nynorsk)
38. Søknad TL, barneskole
39. Søknad TL/Application TL - English
40. .TL-plakat om programmets ressurser
41. Søknad om tilskudd - til FAU
42. Søknad om tilskudd - til FAU (nynorsk)
43. Søknad om tilskudd - til bedrifter, stiftelser o.l
44. Informasjonsskriv foresatte, barneskole
45. Informasjonsskriv foresatte, barneskole (nynorsk)
46. TL sine snakkeboblar med rørslesutfordringar
47. Elevpresentasjon 1.-3. trinn/Student presentation 1.-3. grade
48. Nominasjonslapp
49. Diplom TL, engelsk (interaktiv)
50. Nominasjon av trivselsledere - informasjon
51. Tips til foreldremøter
52. Information about the Culture Card
53. Diplom TL (interaktiv)
54. Tips til TL-møter

---

## 5) Programbeskrivelsen

Programbeskrivelsen er **et dokument (document-node), ikke en side (page-node)** — den finnes
faktisk i **fire varianter**, alle med **lesbart tekstlag** (ekte tekst, ikke bare skannede
bilder — bekreftet ved å inflatere PDF-innholdsstrømmene og telle tekstoperatorer BT/Tj):

| nid | Tittel | Fil | Sider | Lesbar tekst |
|---|---|---|---:|---|
| 22 | Programbeskrivelse, barneskole | `programbeskrivelse_2023.pdf` (16,8 MB) | 36 | ~15 700 ord, ekte tekstlag (1 484 BT-tekstobjekter) |
| 21 | Programbeskrivelse, ungdomsskole | `programbeskrivelse_ungdomsskole_skjerm_0.pdf` (25 MB) | 36 | ~10 600 ord, ekte tekstlag |
| 1528 | TP Programbeskrivelse (Trivselspatruljen) | `ny_programbeskrivelse_tp.pdf` (19 MB) | 20 | tekstlag til stede (728 BT), men glyffene ligger fragmentert — maskinlesbar, men trenger rensing |
| 931 | Information about the program (engelsk) | `infoskriv_tl_engelsk_h24_0.pdf` (0,8 MB) | 2 | ~378 ord engelsk |

**Kjartan har rett:** de to store (barneskole/ungdomsskole) inneholder mye driftsråd.
Innholdsfortegnelsen viser bl.a. «Velkommen til Trivselsprogrammet», «Informasjon om
Trivselsprogrammet», «Fordeler med å være en trivselsskole», **«Hvordan drifte
Trivselsprogrammet»** — altså håndbokstoff. Tekstlaget er hentbart, så AI-hjelperen kan lese
det (barneskole-varianten er reneste kilde; PDF-ene er bilde-tunge, så en tekstrensing/OCR-fri
ekstraksjon bør verifiseres per dokument før bruk).

---

## 6) PowerPoint (11 pptx)

Alle 11 er hentet og målt (tekst i `ppt/slides/*.xml`). **Alle inneholder ekte, lesbar tekst**
— de er ikke rene grafikk-presentasjoner. De store filstørrelsene skyldes innebygde bilder,
ikke fravær av tekst. To familier: **Elevpresentasjoner** (til bruk i klassen) og
**Oppstartsmøte** (nettopp presentasjonen for nyvalgte trivselsledere).

| nid | Tittel | Fil (MB) | Lysbilder | Tekst (ord) |
|---|---|---:|---:|---:|
| 87 | Elevpresentasjon 1.-3. trinn | 9,6 | 10 | 267 |
| 86 | Elevpresentasjon 1.-3. trinn - nynorsk | 9,6 | 10 | 283 |
| 15687 | Elevpresentasjon 1.-3. trinn / engelsk | 9,6 | 10 | 318 |
| 89 | Elevpresentasjon 4.-7. trinn | 23,9 | 16 | 570 |
| 6157 | Elevpresentasjon 4.-7. trinn - nynorsk | 23,9 | 16 | 602 |
| 937 | Elevpresentasjon 4.-7. trinn / engelsk | 23,8 | 16 | 700 |
| 91 | Elevpresentasjon 8.-10. trinn | 17,2 | 16 | 368 |
| 6158 | Elevpresentasjon 8.-10. trinn - nynorsk | 14,8 | 15 | 395 |
| 90 | Oppstartsmøte, barneskole | 6,2 | 12 | 460 |
| 92 | Oppstartsmøte, ungdomsskole | 2,9 | 14 | 360 |
| 6160 | Oppstartsmøte ungdomsskole, nynorsk | 3,1 | 15 | 435 |

**Presentasjonen for nyvalgte trivselsledere** er «Oppstartsmøte»-familien (nid 90 barneskole,
92 ungdomsskole, 6160 nynorsk) — de handler om lederrollen, tips til aktiviteter/arrangement,
og hvordan stille opp en lek. Elevpresentasjonene forklarer hva Trivselsprogrammet er.

---

## 7) De 6 bilde-dokumentene og 2 «andre»

Alle 542 dokumenter har nøyaktig **én** fil. Filtypene (per fil): 512 pdf, 11 pptx, 8 docx,
**6 bilder** (4 jpeg + 2 png), 3 xlsx, **2 «andre»** (1 postscript/EPS + 1 mp4).

**De 6 bildene** — alle er logo-/merkevaremateriell, unntatt ett:

| nid | Tittel | Fil | Type |
|---|---|---|---|
| 1004 | Trivselsleder logo PNG | `trivselsleder_tl_logo_svart_kopi.png` | png |
| 1005 | Trivselsleder logo JPG | `trivselsleder_tl_logo_svart.jpg` | jpg |
| 1006 | TL-logo JPG | `facebook_profilbilde.jpg` | jpg |
| 16387 | TL logo med slagord JPG | `trivselsleder_2023_med_slagord.jpg` | jpg |
| 16388 | TL logo med slagord PNG | `trivselsleder_2023_med_slagord.png` | png |
| 1520 | Verdisamling FORSKJELLIGHET såpebobler | `sapebobler_ferdig.jpg` | jpg |

**De 2 «andre»:**

| nid | Tittel | Fil | Type |
|---|---|---|---|
| 1003 | TL-logo EPS | `tl-logo_colour_rgb.eps` | application/postscript (EPS-logo, vektorformat) |
| 20097 | Nominasjonsvideo | `nominasjonsvideo.mp4` | video/mp4 (277 MB — det store enkeltdokumentet) |

Fem av de seks bildene og EPS-en er altså **TL-logoer** (typen «TL-logo», tid 1230). Det ene
avviket er et såpeboble-bilde knyttet til en verdisamling, og «andre»-kategorien er logo-EPS
pluss én nominasjonsvideo.

---

## Metode og forbehold

- Antall og fordelinger er talt direkte fra `Content/document-nodes.json` (542 noder),
  `Vocabularies/type_document-terms.json` (51 termer) og krysskoblet mot
  `game-nodes.json` + `atlu-nodes.json` for lek-tilhørighet.
- Prosent er av 542 der ikke annet er nevnt; multi-verdi-felt (type, språk, skoletype) gir
  summer > 542, og det er markert.
- PDF-/PPTX-tekstmål er gjort på de faktiske filene (målrettet uthenting, deretter slettet).
  PDF-tekstlaget ble bekreftet ved å inflatere innholdsstrømmene og telle BT/Tj-operatorer;
  ordtallene for de bilde-tunge PDF-ene er omtrentlige.
- Ingenting er gjettet: der en betydning ikke kunne bekreftes fra eksporten (skoletype-kodene
  B/U/K/BH/S), er det sagt eksplisitt.
- Leveranse-CSV-er: `dokumenttyper.csv` (alle 51 typer med antall) og `dokumentliste.csv`
  (alle 542: tittel, type, filtype, språk, tilleggsmateriale-flagg, hvilken lek hvis kjent).
