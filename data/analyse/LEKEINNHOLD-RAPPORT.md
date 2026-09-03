# Lekeinnhold — kartlegging av game-nodene i eksporten

**Dato:** 2. sep 2026 · **Kilde:** `trivselslederno_Full_Export_240826.zip` → `Content/game-nodes.json` (lest via zip-indeks, ingen full utpakking).
**Analyse, ingen endringer.** Alle prosenttall har absolutt antall ved siden av seg.

## Antall noder — avklaring av «868»
- Game-noder i eksporten: **882** (feltet `count` = 882).
- Publisert (status 1): **867** · Upublisert (status 0): **15**.
- Tidligere omtalt som «868 leker». Det matcher verken totalen (882) eller publisert-tallet (867) eksakt. Alle tall under er regnet over **hele settet på 882 noder**; status-splittet står her så ingenting skjules. De 15 upubliserte inkluderer bl.a. 4 «Test upublisert innhold».

## 1) Feltdekning (av 882 noder)

| Felt | Forklaring | Har verdi | Tom |
|---|---|---:|---:|
| `changed` | endret | 882 (100.0 %) | 0 |
| `created` | opprettet | 882 (100.0 %) | 0 |
| `language` | språk | 882 (100.0 %) | 0 |
| `nid` | node-ID | 882 (100.0 %) | 0 |
| `status` | publisert (1) / upublisert (0) | 882 (100.0 %) | 0 |
| `title` | tittel | 882 (100.0 %) | 0 |
| `type` | innholdstype (game) | 882 (100.0 %) | 0 |
| `url_alias` | URL-sti | 882 (100.0 %) | 0 |
| `vid` | revisjons-ID | 882 (100.0 %) | 0 |
| `field_school_type` | skoletype-koder | 879 (99.7 %) | 3 |
| `field_description` | beskrivelses-HTML | 877 (99.4 %) | 5 |
| `field_game_category` | aktivitetskategori (taksonomi) | 870 (98.6 %) | 12 |
| `field_lang` | språk-felt | 862 (97.7 %) | 20 |
| `field_game_equipment` | utstyr (taksonomi) | 777 (88.1 %) | 105 |
| `field_contains_video` | markør «inneholder video» | 491 (55.7 %) | 391 |
| `field_related_documents` | tilknyttede dokumenter | 49 (5.6 %) | 833 |
| `field_icon` | ikon-bilde | 36 (4.1 %) | 846 |
| `field_image` | hovedbilde | 5 (0.6 %) | 877 |

> Alle 18 felt finnes som nøkkel på alle noder; tabellen teller **ikke-tomme verdier**. Metadatafeltene (nid/title/status osv.) er alltid fylt. De reelle innholdsfeltene varierer — se særlig `field_school_type`, `field_game_equipment`, `field_related_documents`.

## 2) 8-punktsmalen — hvor mye struktur finnes egentlig?

Husmalen er *sted/antall/klassetrinn/utstyr i boks → forberedelse → inndeling → utgangsposisjon → målet → kronologi → regler → variasjoner*. Jeg lette etter fete etiketter (`<strong>`/`<b>`) for hvert punkt. **Virkeligheten avviker kraftig.**

**Boksfeltene (fet etikett):**

| Boksfelt | Antall leker med fet etikett |
|---|---:|
| Antall | 744 (84.4 %) |
| Sted | 199 (22.6 %) |
| Utstyr | 683 (77.4 %) |
| Klassetrinn | 0 (0.0 %) |

- **Klassetrinn finnes ALDRI som fet etikett (0 av 882).** Den påståtte boksen har altså aldri alle fire feltene. Fordeling av antall boksfelt per lek: 121 leker har 0 felt, 94 leker har 1 felt, 469 leker har 2 felt, 198 leker har 3 felt. **Ingen lek har alle 4.**
- Til sammenligning med tidligere påstander: Antall = **744** (påstått 768 — nær, men ikke eksakt med mitt kriterium), Sted = **199** (bekrefter den korrigerte «~199», ikke 761).

**Seksjonsmarkører i brødteksten (fet etikett):**

| Seksjon | Antall leker |
|---|---:|
| Laginndeling | 178 (20.2 %) |
| Hva går aktiviteten ut på (målet) | 119 (13.5 %) |
| Variant/Varianter | 256 (29.0 %) |
| Regler | 8 (0.9 %) |
| Tips | 39 (4.4 %) |
| Utføres (alene/par/gruppe) | 24 (2.7 %) |

- Seksjonene *forberedelse*, *utgangsposisjon* og *kronologi* finnes **ikke** som egne overskrifter i det hele tatt. *Regler* står som etikett i bare 8 leker. Brødteksten er i praksis fri løpende prosa.
- Leker helt uten noen markør (verken boks eller seksjon): **96** (10.9 %).

**Ærlig vurdering av maskinell splitting:**
- Full 8-punktssplitt: **≈ 0 %**. De fleste seksjonsoverskriftene finnes ikke, så teksten kan ikke deles maskinelt i de åtte delene.
- Delvis splitt (trekke ut *Antall*-verdien som delimiter): **744 leker (84.4 %)**. Dette er det eneste feltet som er pålitelig nok.
- *Utstyr* og *kategori* trenger vi ikke parse fra tekst — de ligger allerede som egne strukturerte felt (`field_game_equipment`, `field_game_category`).
- Leker med 3 boksfelt (Antall+Sted+Utstyr): **198** (22.4 %) — den mest strukturerte gruppen.

## 3) Taksonomi-bruk — aktivitetskategorier

- Nominelt vokabular (`game_category`): **52 termer** — *ikke* 100+. Påstanden om «100+ aktivitetstype-kategorier» stemmer ikke med dette vokabularet.
- Kategorier faktisk i bruk (≥1 lek): **51**. Med **0 leker**: **1**. Med **kun 1 lek**: **22**.
- Den «ekte» listen som betyr noe (brukt av ≥2 leker): **29** kategorier.
- Leker uten noen kategori: **12** (1.4 %).
- Mange «kategorier» er egentlig tidsserier/samlinger, ikke aktivitetstyper — f.eks. «Månedens leker 2025/2026», «Lekekurs høst 2026», «Digital kursmodul …». Se `kategoribruk.csv` for full liste med antall.

**Topp 15 kategorier i bruk:**

| Kategori | Antall leker |
|---|---:|
| Ballaktiviteter | 135 |
| Presisjon | 116 |
| Strategi | 91 |
| Utføres i gruppe | 77 |
| Sisten | 73 |
| Stafett | 61 |
| Reaksjon | 60 |
| Lek til musikk og rytme | 36 |
| Utføres parvis | 27 |
| Aktiviteter på snø | 23 |
| Minglestasjon | 23 |
| Orientering | 15 |
| Utføres alene | 14 |
| .Utfordringer | 14 |
| Lek i blinde | 12 |

## 4) Utstyr

- Unike utstyrsverdier i bruk: **215** (av 231 i vokabularet).
- Leker **uten utstyrsfelt** (tomt `field_game_equipment`): **105** (11.9 %).
- Leker som eksplisitt er merket med termen «Uten utstyr»: **159** (18.0 %). (Eneste «uten utstyr»-term i vokabularet: ['Uten utstyr'].)
- Til sammen «trenger ikke utstyr» (tomt felt + «Uten utstyr»-term): **264** leker — de to gruppene er atskilte (tomt felt vs. eksplisitt term).

**Topp 25 utstyr (full liste i `utstyrsbruk.csv`):**

| Utstyr | Antall leker |
|---|---:|
| Markeringstallerkener | 180 |
| Uten utstyr | 159 |
| Markeringskjegler | 98 |
| Dragonskin skumball | 94 |
| Rockeringer | 67 |
| Six-Ball | 43 |
| Erteposer | 40 |
| Lagbånd | 36 |
| Musikk | 33 |
| Kin-Ball | 32 |
| Fotball | 31 |
| Markeringsmatter | 30 |
| Frisbee | 28 |
| Markeringsvester | 27 |
| Kritt | 27 |
| Dodgebees | 21 |
| Innebandyballer | 20 |
| Basketball | 20 |
| Små rockeringer | 19 |
| Stoppeklokke | 17 |
| Blendebrille | 16 |
| Innebandykøller | 16 |
| Kortstokk | 15 |
| Terning | 14 |
| Håndball | 12 |

## 5) Trinn / skoletype

- **Klassetrinn per lek finnes IKKE som strukturert felt.** Det eneste trinn-/nivåfeltet er `field_school_type` med koder (flerverdi per lek). Trinn nevnes heller ikke som fet etikett i teksten (0 leker med «<strong>Klassetrinn/trinn»).
- Skoletype er angitt som **koder, ofte flere per lek**:

| Kode | Antall leker | Sannsynlig betydning |
|---|---:|---|
| B | 865 (98.1 %) | Barneskole |
| K | 852 (96.6 %) | usikker (mellomtrinn/kombinert?) |
| U | 666 (75.5 %) | Ungdomsskole |
| BH | 305 (34.6 %) | Barnehage |
| S | 48 (5.4 %) | usikker (SFO/videregående?) |

- Antall skoletyper per lek: 3 leker har 0, 14 leker har 1, 97 leker har 2, 547 leker har 3, 218 leker har 4, 3 leker har 5.
- Leker helt uten skoletype: **3**.
- **Kan ikke avgjøres sikkert:** kodene `K` og `S`. `B/BH/U` er standard (barne-/barnehage/ungdomsskole). `K` og `S` mangler forklaring i eksporten — trenger en kodeliste fra gammelt system for å tolkes trygt. (`school_year`-vokabularet knytter f.eks. «5. trinn» til skoletype `[B, K]`, men gir ingen entydig navn på `K`.)

## 6) Tekstlengde (avgjør listeytelse etter import)

- Median beskrivelseslengde (ren tekst, HTML strippet): **767 tegn**.
- Gjennomsnitt: **927 tegn**. Lengste: **15369 tegn** («Kortspill»).
- Total rå beskrivelses-HTML for alle 882 noder: **3.08 MB**.
- **Bekrefter ytelsesanslaget** (3–4 MB ved 868 leker): faktisk **3.08 MB** for 882 noder. En listespørring som henter full beskrivelse for alle vil altså laste ~3 MB — anslaget holder. Anbefaling for lista: ikke hent `field_description` i oversikts-spørringen, kun i detaljvisning.

## 7) Dubletter

- **Eksakt like titler:** 13 grupper. Ekte innholdsdubletter å rydde (ikke tellefeil):
  - ['Mastermind', 'Mastermind']
  - ['Fire lys', 'Fire lys']
  - ['Nattduellen', 'Nattduellen']
  - ['Minuttball', 'Minuttball']
  - ['Stein, saks, papir-runden', 'Stein, saks, papir-runden', 'Stein, saks, papir-runden']
  - ['Signalet', 'Signalet']
  - ['Crossboccia', 'Crossboccia']
  - ['Finn en feil', 'Finn en feil!']
  - ['Test upublisert innhold ', 'Test upublisert innhold ', 'Test upublisert innhold ', 'Test upublisert innhold ']
  - ['Alle mot alle', 'Alle mot alle']
  - ['Flyvende farger', 'Flyvende farger']
  - ['Boccia-bowling', 'Boccia-bowling']
  - ['Hoppeduellen', 'Hoppeduellen!']

- **Nær-dubletter (≥0,90 likhet):** 29 par. De aller fleste er legitime **serier**, ikke feil — f.eks. «TL-dans 1…15», «Digital kursmodul vinter 2021…2024», «Månedens leker 2025/2026». Disse skal beholdes hver for seg. Ekte kandidater å slå sammen er de eksakte over.
- Utvalg nær-par:
  - 0.966: «Digital kursmodul vinter 2021» ↔ «Digital kursmodul vinter 2022»
  - 0.966: «Digital kursmodul vinter 2021» ↔ «Digital kursmodul vinter 2023 »
  - 0.966: «Digital kursmodul vinter 2021» ↔ «Digital kursmodul vinter 2024»
  - 0.966: «Digital kursmodul vinter 2022» ↔ «Digital kursmodul vinter 2023 »
  - 0.966: «Digital kursmodul vinter 2022» ↔ «Digital kursmodul vinter 2024»
  - 0.966: «Digital kursmodul vinter 2023 » ↔ «Digital kursmodul vinter 2024»
  - 0.963: «Digital kursmodul høst 2021» ↔ «Digital kursmodul høst 2022»
  - 0.963: «Digital kursmodul høst 2021» ↔ «Digital kursmodul høst 2024»
  - 0.963: «Digital kursmodul høst 2022» ↔ «Digital kursmodul høst 2024»
  - 0.962: «Månedens utfordringer 2025» ↔ «Månedens utfordringer 2026»
  - 0.952: «Kursmodul vinter 2025» ↔ «.Kursmodul vinter 2026»
  - 0.952: «Månedens Move it 2025» ↔ «Månedens Move it 2026»

## 8) «Move It» — hvordan er de merket?

**Konklusjon: de påståtte «~126 Move It-lekene» finnes IKKE i game-nodene.** Jeg fant ingen markør som identifiserer 126 leker. Slik ligger det an:

- I `game_category`-vokabularet finnes tre Move It-relaterte termer: «Move It», «Månedens Move it 2025», «.Månedens Move it 2026».
- Blant de 882 game-nodene tagger disse til sammen **kun 4 noder**: «Move It» (tid 578) → 2 leker (Clap Trap, Rytmerebellen); «Månedens Move it 2025» → 1 node; «.Månedens Move it 2026» → 1 node. De to siste er selv samle-/landingsnoder.
- Move It nevnes i tittel på **2** game-noder og i beskrivelsen til **14**. Ingen av tallene er i nærheten av 126.
- **Hvor 126-tallet trolig hører hjemme:** i `Content/wheel-nodes.json` (hjul) har **66 noder** «Move It» i tittelen (78 nevner det). Move It ser altså ut til å være et **hjul-/periodeplan-konsept**, ikke en leke-kategori. Selv 66 er ikke 126 — tallet kan gjelde en annen telling (f.eks. på tvers av år, eller play_schedules som refererer Move It: 56 treff).
- **Kan ikke avgjøres her:** hva «~126 Move It» konkret teller. Det må avklares med Kjartan før etappe 5 — om Move It skal være et eget felt/markør på leker, må det **bygges nytt**, for det finnes ikke i game-dataene i dag.

## Vedleggsfiler
- `data/analyse/kategoribruk.csv` — alle kategorier (også de med 0/1 lek), med antall.
- `data/analyse/utstyrsbruk.csv` — alle utstyrsverdier med antall + leker uten utstyrsfelt.

## Hva jeg IKKE kunne avgjøre (oppsummert)
- Betydningen av skoletype-kodene `K` og `S` (mangler kodeliste).
- Hva «~126 Move It» teller (finnes ikke som markør på leker; hovedsakelig et hjul-konsept).
- Eksakt reproduksjon av det gamle «Antall 768»-tallet (mitt kriterium gir 744; avviket skyldes ulik markup-telling).
