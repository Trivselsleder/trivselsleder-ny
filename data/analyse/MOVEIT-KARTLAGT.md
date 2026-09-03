# Move It — kartlagt (rettelse av tidligere funn)

**Dato:** 2. sep 2026 · **Kilde:** `trivselslederno_Full_Export_240826.zip`, lest via zip-indeks (ingen full utpakking). Skrevet til `data/analyse/`.

## Rettelse
Et tidligere funn konkluderte med at «Move It hovedsakelig er et hjul-konsept — kun 4 noder har Move It-kategori, 2 ekte leker». **Det var feil.** Feilen var at den analysen kun tekst-søkte etter kategorinavn som *inneholder* «move it». Det fanget bare «Move It», «Månedens Move it 2025/2026» — og bommet på barne­kategoriene «Kropp og hjerne», «Utføres alene/parvis/gruppe», som **ikke** har «move» i navnet, men som ligger **under** «Move It» i taksonomien. Der bor 124 av de 128.

**Fasit: 128 Move It-aktiviteter**, alle publisert.

## 1) Hvor bor de?
- Alle ni bekreftede titler («100 om dagen!», «21», «7 min workout», «ABC-123», «Aktivitetssirkel», «Atomer og molekyler», «Atomleken», «Hodepine», «Først på kortet») ligger i **`Content/game-nodes.json`**.
- **Nodetype: `game`** — samme type som vanlige leker. Move It er altså IKKE en egen nodetype; de er en delmengde av de 882 game-nodene. («Atomleken» finnes også som et atlu-opplegg med samme navn, men Move It-aktiviteten er en game-node.)

## 2) Hvilket felt skiller dem fra vanlige leker?
- **`field_game_category`** — og bare det. En game-node er en Move It hvis den har en kategori som er **«Move It» (tid 578) eller et barn av «Move It»**.
- Barna (fra `game_category`-vokabularet, forelder = «Move It»): «Kropp og hjerne» (1141), «Utføres alene» (1175), «Utføres parvis» (1176), «Utføres i gruppe» (1177), «Månedens Move it 2025» (1134), «.Månedens Move it 2026» (1185).
- Ingen andre felt skiller dem (samme felt­sett som alle game-noder: `changed`, `created`, `field_contains_video`, `field_description`, `field_game_category`, `field_game_equipment`, `field_icon`, `field_image`, `field_lang`, `field_related_documents`, `field_school_type`, `language`, `nid`, `status`, `title`, `type`, `url_alias`, `vid`). Det er utelukkende kategori-hierarkiet.
- **Antall noder med markøren: 128.**

## 3) Egen type?
Nei — de er game-noder (se punkt 1–2), så feltsammenligning mot leker er ikke relevant: feltene er identiske. Forskjellen ligger kun i kategori.

## 4) Det faktiske antallet
- **128 Move It-aktiviteter.** Publisert: **128**, upublisert: **0**.
- Antatt «~126» — faktisk **128**. Antakelsen stemte godt; det gamle funnet (2–4) var feil.

## 5) Underkategoriene

| Underkategori (barn av «Move It») | Antall aktiviteter |
|---|---:|
| Utføres i gruppe | 77 (60.2 %) |
| Utføres parvis | 27 (21.1 %) |
| Utføres alene | 14 (10.9 %) |
| Kropp og hjerne | 6 (4.7 %) |
| Move It | 2 (1.6 %) |
| Månedens Move it 2025 | 1 (0.8 %) |
| .Månedens Move it 2026 | 1 (0.8 %) |

- Summen er 128 — dvs. **ingen aktivitet ligger i to Move It-underkategorier samtidig** (overlapp: 0).
- **Nytt undernivå vi ikke hadde sett i skjermbildene: «Utføres parvis» (27 aktiviteter).** Skjermbildene viste «Utføres alene» og «Utføres i gruppe», men ikke «parvis».
- De seks barna + «Move It» selv er alle nivåene som finnes under «Move It». «Møndens Move it 2025/2026» har kun 1 aktivitet hver (trolig samle-/landingsnoder).

## 6) Video
- Move It med video-flagg (`field_contains_video`=1): **77** (60.2 %).
- Move It med video innebygd i beskrivelses-HTML (media-token/iframe/video): **82** (64.1 %).
- **Samme mekanisme som lekene:** både et `field_contains_video`-flagg og selve videoen innebygd i `field_description` (Drupal media-token `[[{...}]]` eller iframe). Til sammenligning har 196 av de vanlige lekene video-flagget. Flagg og embed er ikke helt sammenfallende (noen har embed uten flagg og omvendt), så bruk embed som fasit ved import.

## 7) «TL-mester»
- **Ikke et eget felt.** Det finnes ingen TL-mester-kolonne på nodene.
- Det finnes en lite brukt **kategori** «TL-Mester» (tid 1136, under «* Tipslister») — brukt av **1** game-node totalt (0 Move It).
- Ellers står «TL-mester» som **fri tekst i beskrivelsen** («Aktiviteten fungerer bra som en øvelse i TL-mester») — i **46** game-noder totalt, hvorav **2** Move It.
- **Mulige verdier:** ingen strukturerte/opptellbare verdier — det er prosa i teksten pluss en nesten ubrukt kategori. Meta-boks-etiketten «TL-mester» i skjermbildet er altså rendret fra beskrivelses­teksten, ikke fra et felt.

## 8) Utstyr og Antall
- **Samme felt som lekene** — ingen egne Move It-felt.
- Utstyr: **98** av 128 (76.6 %) har verdi i `field_game_equipment`. Av disse er **22** (17.2 %) reelt utstyr (resten er termen «Uten utstyr»).
- Antall: **96** av 128 (75.0 %) har «Antall»-etiketten (`<strong>Antall:</strong>`) i beskrivelsen — samme mønster som lekene.
- Skoletype-fordeling på Move It: B=128, K=124, U=81, BH=55, S=21.

## 9) Sammenheng med hjul
- Hjul-noder med «Move It» i tittelen: **64** (tidligere kjøring sa 66 med et løsere søkemønster; eksakt «move it»-treff gir 64).
- Av disse **peker 58** på Move It-aktiviteter: hjulets `field_wheel_segments` inneholder oppføringer på formen `Tittel:nid`, og **382 av 423** segmenter refererer nid-er som er Move It-game-noder.
- **54** av hjulene har `field_wheel_school` — de er **skole­spesifikke, ferdiglagde hjul** bygget AV Move It-aktivitetene.
- **Konklusjon:** selve aktivitetene bor i de 128 game-nodene. Hjulene er ferdig sammensatte samlinger (per skole/trinn) som *peker på* aktivitetene. Dropper vi hjul-import, mister vi de ferdige, skolespesifikke hjulene — men **ikke** Move It-aktivitetene selv. Aktivitetene er trygge som game-noder.

## Leveranse
- `data/analyse/moveit-liste.csv` — én rad per Move It (128 rader): tittel, nodetype, Move It-underkategorier, alle kategorier, video-flagg, video-embed, Antall-markør, utstyr, TL-mester, publisert.
- `data/analyse/MOVEIT-KARTLAGT.md` — denne rapporten.

## Slik lette jeg
1. Slo opp de 9 titlene i alle `Content/*.json` → alle 9 i `game-nodes.json`.
2. Leste kategoriene på de 9 → alle pekte på barn av «Move It».
3. Bygde Move It-settet = kategori 578 + alle barn av 578 fra `game_category`-vokabularet.
4. Krysssjekket hjul via `field_wheel_segments` (nid-referanser).