# Kan lenkesamlingene oversettes til ekte samlinger?

**Kort svar: JA — 402 av 436 lenker (92,2 %) peker maskinelt på en ekte, publisert lek eller
aktiv-læring-node vi importerer; med tittel-oppslag i tillegg når vi 408 (93,6 %).** De 21
«lenkesamlingene» lar seg derfor oversettes til ekte `samlinger` med koblinger til de nye
lekene. Anbefaling: **vei (b)** — se §7.

**Kilde:** `Content/{game,atlu,document}-nodes.json` + zip-indeks (17 MB, kun JSON-medlemmer via
vakt; ingen binær-utpakking). Ren analyse — ingen import, database eller git. **Dato:** 2026-09-02.
Alle prosenttall med absolutt antall. Full lenkeliste: `lenkesamlinger-lenker.csv` (436 rader).

---

## 1) Alle 21 lenkesamlinger

Identifisert som game-noder med samlingstittel (Tipsliste/Kursmodul/Månedens/Julekalender/
Tipslister) og ≥ 6 lenker. **20 publisert, 1 upublisert** (bekrefter Fable). Hver ligger i sin
EGEN kategori — samlingen er det eneste innholdet i kategorien (se §6).

| Lenker | nid | Status | Tittel | Kategori |
|---:|---|---|---|---|
| 73 | 15468 | pub | Tipsliste til SFO/AKS | SFO/AKS |
| 40 | 16291 | pub | Tipsliste TL-Mester | TL-Mester |
| 28 | 19389 | pub | Tipsliste favorittleker | Favoritter |
| 28 | 19696 | pub | Tipsliste leker for 100+ elever | Leker for 100+ elever |
| 27 | 19390 | pub | Tipsliste sosial kompetanse | Sosial kompetanse |
| 24 | 18372 | pub | Julekalender 2025 – alle luker med video | Julekalender |
| 19 | 16072 | pub | Tipsliste til KRØ 1. og 2. trinn | KRØ |
| 19 | 16073 | pub | Tipsliste til KRØ 3. og 4. trinn | KRØ |
| 19 | 20030 | pub | Kursmodul høst 2026 | Lekekurs høst 2026 |
| 18 | 15510 | pub | Tipsliste til FYSAK | Fysak |
| 18 | 16074 | pub | Tipsliste til KRØ 5., 6. og 7. trinn | KRØ |
| 18 | 18822 | pub | .Kursmodul vinter 2026 | Lekekurs vinter 2026 |
| 15 | 17734 | **UPUB** | Kursmodul høst 2025 | Lekekurs høst 2025 |
| 14 | 16190 | pub | Kursmodul vinter 2025 | . Leke- og aktivitetskurs |
| 13 | 16203 | pub | Månedens leker 2025 | Månedens leker 2025 |
| 13 | 16212 | pub | Månedens Move it 2025 | Månedens Move it 2025 |
| 13 | 18885 | pub | Månedens leker 2026 | Månedens leker 2026 |
| 12 | 18886 | pub | Månedens Move it 2026 | .Månedens Move it 2026 |
| 10 | 18884 | pub | Månedens utfordringer 2026 | Månedens utfordringer 2026 |
| 9 | 19697 | pub | Tipslister | * Tipslister |
| 6 | 17721 | pub | Månedens utfordringer 2025 | Månedens utfordringer 2025 |

*(To andre noder har samlingstittel men er IKKE lenkesamlinger: nid 12415 «Julekalender 2025 –
juletre til å henge på veggen» (1 lenke, et utskriftsark) og nid 18937 «Månedens leker» (0
lenker, tom landingsnode). Derfor 21, ikke 23.)*

---

## 2) Hvordan ser lenkene ut?

Nesten alle er **fulle adresser** på formen `https://trivselsleder.no/<url-alias>`, der alias-en
er mållekens `url_alias`. Ordrett fra HTML-en:

**Tipsliste til SFO/AKS (nid 15468):**
- `href="https://trivselsleder.no/klokka-klokken"` → tekst «Klokka/Klokken»
- `href="https://trivselsleder.no/alle-mot-alle-0"` → tekst «Alle mot alle»
- `href="https://trivselsleder.no/ringbattle"` → tekst «Ringbattle»

**Kursmodul høst 2026 (nid 20030):**
- `href="https://trivselsleder.no/minuttball-0"` → «Minuttball»
- `href="https://trivselsleder.no/flyvende-farger-0"` → «Flyvende farger»

**Månedens leker 2026 (nid 18885):**
- `href="https://trivselsleder.no/butterflynett"` → «Butterflynett»
- `href="https://trivselsleder.no/touchball"` → «Touchball»

**Fordeling over alle 436 lenker:**

| Format | Antall | Andel | Oppslag |
|---|---:|---|---|
| Full adresse (`https://trivselsleder.no/<alias>`) | 423 | 97,0 % | match på `url_alias` |
| Pen adresse (relativ, `/file/...` o.l.) | 5 | 1,1 % | filpekere, ikke lek |
| Ekstern (`instagram.com`, ødelagt `http://Piloten`) | 8 | 1,8 % | utenfor |
| **Node-lenker (`/node/1234`)** | **0** | 0 % | — |

Ingen `/node/1234`-lenker — alt er alias-baserte adresser, så oppslaget skjer mot `url_alias`,
ikke node-id direkte.

---

## 3) Hovedtallet: hvor mange lenker peker på noder som finnes?

**436 lenker totalt.** Oppløst mot eksporten (alias → node):

| Målet er … | Antall | Andel |
|---|---:|---|
| **En publisert game-node (lek vi importerer)** | **391** | 89,7 % |
| **En publisert atlu-node (aktiv læring)** | **11** | 2,5 % |
| **Sum: ekte, publisert innhold vi importerer** | **402** | **92,2 %** |
| Peker på document-node | 0 | 0 % |
| Peker på noe **upublisert** (2 leker, se under) | 5 | 1,1 % |
| Peker på noe som **ikke finnes** (alias bommer) | 21 | 4,8 % |
| Ekstern (Instagram ×6, 2 ødelagte) | 8 | 1,8 % |
| Lar seg ikke tolke | 0 | 0 % |

- **402 av 436 (92,2 %) peker rett på en publisert lek/opplegg vi importerer.** Det er
  hovedtallet: koblingen kan gjøres maskinelt.
- **5 upubliserte:** to leker (nid 2718 «Alle sammen ut av huset», nid 13661 «Stein, saks,
  papir-runden» ×4) finnes, men er avpublisert — lenker dit blir døde med mindre lekene
  publiseres.
- **21 «finnes ikke»** brytes ned i §4 (de fleste er enten TL-dans-sider, videofiler, eller
  alias som kan gjenvinnes med tittel-oppslag).

---

## 4) Pene adresser mot lekenavn — lar de seg matche?

De 402 traff via eksakt `url_alias`. For de 21 som bommet på alias, prøvde jeg **tittel-oppslag**
(lenketeksten er lekens navn), og delte i de fire gruppene under:

| Utfall (av de 21 alias-bomma) | Antall | Eksempel |
|---|---:|---|
| **Entydig tittel-treff** (gjenvunnet) | **6** | «High five»→nid 10582, «Spagaten»→10584, «Popcorn»→17073, «Kjegleduellen»→13657, «Alle mot alle»→13659 |
| Flere kandidater (tvetydig) | **0** | — |
| Ingen treff | **4** | «Klokka», «Kari og Knut: Siste par ut!», «21 fot», «25-leken: Kropp og helse» |
| **Ikke en lek i det hele tatt** | **11** | TL-dans-side (×6), videofiler `*.mp4` (×4), `mailto:marielle@…` (×1) |

**Konklusjon Q4:** tittel-oppslag er trygt (0 tvetydige) og henter inn 6 til → **408 av 436
(93,6 %)** lenker løses til en ekte publisert lek. De 11 «ikke-leker» er reelt andre ting
(TL-dans er en egen side, ikke en lek; `.mp4`-ene er samle-videoer; én e-postlenke), og de 4
uten treff må sjekkes manuelt (leken kan være omdøpt eller fjernet).

---

## 5) Er det mer enn lenker i dem?

**Ja.** Hver samling har egen innledningstekst (485–693 tegn) som ville gått tapt om vi bare tok
lenkene, og noen har media og struktur:

- **Tipsliste til SFO/AKS:** *«Her er en oversikt over aktiviteter/leker som kan passe godt på
  SFO/AKS, men også ellers som i friminutt, klassens time, kroppsøving, fysak, aktivitetsdager
  o.l. Noen av aktivitetene passer under flere av kategoriene nedenfor …»* — redaksjonell
  ramme + underoverskrifter som grupperer lenkene.
- **Kursmodul høst 2026:** *«Nedenfor er en oversikt over alle lekene til denne kursmodulen. Vi
  har samlet alle i en video som dere finner nederst på denne siden …»* — **+ 1 innebygd
  samle-video** (alle leker i én film).
- **Månedens utfordringer 2026:** *«Bruk månedens utfordring i klassen eller med
  trivselslederne …»* med en **måned-for-måned-struktur** (Januar: … Februar: …) — lenkene er
  organisert per måned, ikke bare en flat liste.

Så en ren lenke-høsting ville mistet: (1) innledningsteksten, (2) samle-videoer på enkelte, og
(3) den redaksjonelle grupperingen (per kategori/per måned).

---

## 6) De fire kategoriene — er de tomme uten samlingene?

**Bekreftet fullt ut (Fable):** når de 21 lenkesamlingene holdes utenfor, har de fire
kategoriene **null ekte leker**:

| Kategori (Min side-inngang) | Totalt i kategorien | **Ekte leker (u/samling, publisert)** |
|---|---:|---:|
| **SFO/AKS** (tid 1115) | 1 | **0** |
| **Fysak / FYSAK** (tid 1116) | 1 | **0** |
| **KRØ / kroppsøving** (tid 1122) | 3 | **0** (= de 3 KRØ-tipslistene) |
| **TL-Mester** (tid 1136) | 1 | **0** |

Dropper vi samlingene uten annet grep, blir alle fire boksene tomme.

**De øvrige inngangene:** eksporten inneholder ikke selve «Min side»-oppsettet (hvilke 12
kategorier som er innganger — det er frontend-konfig, ikke i zip-en), så jeg kan ikke liste alle
tolv med sikkerhet. Men jeg kan si hvilke kategorier som er **samling-avhengige** (0 ekte leker):
i tillegg til de fire over gjelder det **Favoritter, Sosial kompetanse, Leker for 100+ elever,
Månedens leker/Move It/utfordringer (2025 og 2026), Lekekurs (høst/vinter), Tipslister,
Julekalender** — til sammen **16 kategorier som kun finnes fordi en lenkesamling ligger der**.
Flere av disse (Favoritter, Sosial kompetanse, Leker for 100+) høres ut som sannsynlige Min
side-innganger, så **det kan være flere enn fire av de tolv som er samling-avhengige** — det bør
bekreftes mot Min side-konfigurasjonen. Til sammenligning er de vanlige lek-kategoriene fulle:
Reaksjon 59, Ballaktiviteter, Presisjon, Strategi, Sisten, Stafett osv. har rikelig med ekte leker.

---

## 7) Anbefaling

**Vei (b): importer dem som ekte `samlinger` med maskinelle koblinger til lekene.**

Hvorfor (b) og ikke (a) eller (c):

- Tallet som avgjør er §3: **92,2 % (402/436) av lenkene peker rett på en publisert lek vi
  importerer**, og med tittel-oppslag 93,6 %. Datamodellen finnes allerede (`samlinger` +
  `samling_ressurs`, migr 029) — en samling er nettopp «en kuratert liste med pekere til
  ressurser». Koblingen kan altså bygges maskinelt, og innledningsteksten (§5) legges i
  samlingens beskrivelse. De fire boksene på Min side fylles med ekte, levende lenker.

- **Hva som må ryddes manuelt (de ~7 %):** ca. 34 lenker — 5 upubliserte (publiser lekene eller
  fjern lenken), 4 uten tittel-treff, 6 TL-dans-sider (peker på en egen side, ikke en lek), 4
  samle-videoer (`.mp4` → hør hjemme som medie, ikke lenke), 6 Instagram + 2 ødelagte. Disse
  flagges til den redaksjonelle køen, ikke gjettes.

**Hva som går tapt ved hvert valg:**

- **(a) Ikke importer:** de fire (trolig flere) Min side-boksene blir tomme ved lansering, og vi
  mister den redaksjonelle kurateringen — kunnskapen om *hvilke* leker som passer til SFO/AKS,
  FYSAK, kroppsøvingstrinn og TL-Mester (402 håndplukkede koblinger). Den kunnskapen finnes ikke
  noe annet sted.
- **(b) Importer som samlinger (anbefalt):** ingenting av verdi går tapt hvis innledningsteksten
  og samle-videoene tas med. De ~34 ureine lenkene må gjennomgås én gang. Månedens-samlingenes
  måned-struktur bør bevares (rekkefølge/gruppering i `samling_ressurs.rekkefolge`).
- **(c) Importer som kladd (ansatte bygger manuelt):** kaster bort at 93 % kunne kobles
  automatisk. 400+ koblinger må gjenskapes for hånd i en travel importuke — stor risiko for at
  jobben ikke blir gjort, og at boksene står tomme likevel. Verre enn (b) uten noen gevinst.

**Kort til Kjartan:** Lenkesamlingene er ekte redaksjonelt arbeid — noen har håndplukket hvilke
leker som passer til SFO, til kroppsøving, til TL-Mester. Ni av ti av de lenkene peker på leker
vi uansett flytter over, så maskinen kan gjenskape listene automatisk. Gjør vi dem til ordentlige
«samlinger», beholder vi både de fire boksene på Min side, den håndplukkede kurateringen og
innledningstekstene — og sitter igjen med en liten haug (~34 lenker) som en person går gjennom
én gang. Å droppe dem tømmer fire bokser og kaster bort kurateringen; å importere dem som leker
gir døde lenker; å bygge alt på nytt for hånd er unødvendig når maskinen klarer 93 %.

---

## Metode
- Lenker hentet fra `field_description.safe_value`; mål løst ved `url_alias` (eksakt), deretter
  tittel-oppslag for de som bommet. «Finnes» = noden er i eksporten; «publisert» = `status=1`.
- De 21 er game-noder med samlingstittel + ≥ 6 lenker (20 pub + 1 upub, matcher Fable). De to
  grensetilfellene (utskriftsark, tom landingsnode) er holdt utenfor og forklart i §1.
- Ingenting gjettet: uløste lenker er talt og listet (§4), ikke antatt; 12-innganger-spørsmålet
  er besvart så langt eksporten rekker, med det som mangler tydelig merket (frontend-konfig).
