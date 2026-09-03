# Importregel for lenkesamlingene — ferdig regel før importskriptet bygges

**Dato:** 2. september 2026 · **Type:** ren spesifikasjon og analyse. Ingen import, ingen database, ingen git.
**Skrevet til:** `data/analyse/SAMLINGER-IMPORTREGEL.md`
**Beslutning som ligger til grunn (Kjartan, i dag):** vei (b) er valgt. De 21 lenkesamlingene importeres som **ekte samlinger**, ikke som leker. Innledningstekstene bevares. De 402 koblingene lages maskinelt. De ~34 ureine lenkene flagges til køen.

**Lest først:** `data/analyse/LENKESAMLINGER.md`, `data/analyse/lenkesamlinger-lenker.csv` (436 lenker), `claude_ETAPPE5-SPESIFIKASJON-v3-2sep.md`, og migrasjonsfilene 023, 025, 026, **029** (samlinger-modellen), 032, 037, 038, 089. Alle påstander om kolonner har migrasjonsnummer ved seg. Alt er lest i filene — ingenting gjettet. Én ting kan ikke leses av filene alene (manuelle endringer i Supabase-konsollen); den er samlet i én bekreftelsesspørring nederst.

---

## Kort til Kjartan (les denne, hopp over resten om du vil)

Det gode: **navnet og innledningsteksten har allerede et hjem** i basen (`samling_innhold`, laget i migrasjon 029), én rad per språk. Ingen ny tabell trengs for teksten. Modellen for samlinger + koblinger til leker finnes fra før. Så vei (b) står på ferdig grunnmur.

Det som mangler, og som må lages før importen kjøres:

1. **Samle-videoen har ikke noe hjem.** Videobordet i basen (`medier`) henger bare på leker, ikke på samlinger. Vi må gi samlinger sitt eget videofelt. (Liten migrasjon.)
2. **Måneds- og seksjonsinndelingen har ikke noe hjem.** «Månedens leker» er delt i Januar/Februar/…, og «Tipsliste til SFO/AKS» har underoverskrifter. Koblingsbordet har bare en rekkefølge, ikke en gruppe. Vi legger til én kolonne. (Liten migrasjon.)
3. **Den viktigste: en samling dukker IKKE automatisk opp på Min side.** De tolv boksene på Min side («SFO/AKS», «FYSAK» osv.) henter ikke samlinger i det hele tatt — de gjør et tekstsøk som filtrerer **leker** på «egnet for». Det betyr: for at boksene skal bli fulle ved lansering, må importen i tillegg merke hver lek i en samling med riktig «egnet for»-verdi. Det krever ingen frontend-endring. Den rikere visningen (der selve samlingen med innledningstekst og video vises) er en senere frontend-jobb, ikke noe som blokkerer lansering.

Og én ting du må ta stilling til: **to av de 21 samlingene — «Månedens Move it 2025» og «Månedens Move it 2026» — er i en ANNEN plan (ETAPPE5 punkt 11) satt opp til å bli importert som *leker* (utkast), ikke som samlinger.** De kan ikke bli begge deler. Se FLAGG 1 nederst. Min anbefaling: de blir samlinger (det er det de er).

---

## 1) Hvor bor navn og innledningstekst?

**Svar: begge deler har allerede et hjem. Ingen modellutvidelse trengs for teksten.**

Migrasjon **029** (`029_fase3_samlinger.sql`) lager tre tabeller. Den midterste er svaret:

```
samling_innhold (
  samling_id  uuid  → samlinger(id) on delete cascade,
  sprak       text  not null default 'nb',
  tittel      text,
  beskrivelse text,
  primary key (samling_id, sprak)
)
```

- **Navnet** bor i `samling_innhold.tittel` — altså IKKE på `samlinger` selv (den har ingen navnekolonne, det stemmer). Navnet er per språk, akkurat som lekenes titler bor i `ressurs_innhold.tittel` (migr 024).
- **Innledningsteksten** (485–693 tegn) bor i `samling_innhold.beskrivelse`. Feltet er `text`, uten lengdegrense — det rommer tekstene med god margin.
- **Per språk automatisk:** primærnøkkelen er `(samling_id, sprak)`. En norsk samling får sin tittel og innledning på `nb`-raden; en fremtidig svensk oversettelse får sin egen rad. Samme mekanikk som `ressurs_innhold`.

Testdataene i migrasjon **031** bekrefter at feltene brukes akkurat slik: `insert into samling_innhold (samling_id, sprak, tittel, beskrivelse) select id, 'nb', 'Vinterleker', 'Leker som passer når snøen kommer.' …`.

**Konklusjon:** intet hull her. Importen skriver samlingens navn til `tittel` og innledningsteksten til `beskrivelse`, på `nb`-raden. Innholdet i innledningsteksten renses på samme måte som lekenes beskrivelse (ETAPPE5 punkt 0): tillatt HTML beholdes (avsnitt, lister, fet/kursiv, lenker, overskrift nivå 3), resten strippes. Døde Drupal-media-tokener fjernes fra teksten (samle-videoen håndteres separat, se punkt 5).

---

## 2) Hvilken «type» skal de ha?

**Bekreftet i modellen (migr 029):** `samlinger.type text not null default 'redaksjonell'`. **Det finnes INGEN CHECK-constraint på kolonnen** — jeg søkte gjennom alle migrasjonsfilene; den eneste verdien som faktisk er satt inn i dag er `'redaksjonell'` (testdataene i migr 031). Feltet er altså fri tekst i praksis.

Fordi det ikke finnes en CHECK, kan importen sette hvilken som helst typeverdi uten en modellendring. Spørsmålet er hva som er nyttig.

**Anbefaling:** gi de 21 en `type` som skiller de fire slagene fra hverandre, så frontend og redaktør kan behandle dem ulikt senere (de ER strukturelt ulike — se punkt 3). Foreslått vokabular:

| `type` | Hvilke samlinger | Antall |
|---|---|---:|
| `tipsliste` | SFO/AKS, TL-Mester, favorittleker, sosial kompetanse, 100+, de tre KRØ-listene, FYSAK, «Tipslister» | 10 |
| `kursmodul` | Lekekurs høst 2026, vinter 2026, høst 2025 (upub), «Leke- og aktivitetskurs» | 4 |
| `manedens` | Månedens leker 2025/2026, Månedens Move it 2025/2026, Månedens utfordringer 2025/2026 | 6 |
| `julekalender` | Julekalender 2025 – alle luker med video | 1 |

`'redaksjonell'` beholdes som default for samlinger som ansatte lager for hånd senere.

**Om CHECK:** jeg anbefaler å **ikke** låse `type` med en CHECK i denne runden. Grunnen: en CHECK må da også inneholde `'redaksjonell'` (ellers knekker testdataene og fremtidige manuelle samlinger), og typelisten er fortsatt fersk — Kjartan/Marielle kan finne på å slå sammen «kursmodul» og «tipsliste» etter lansering. Fri tekst nå, CHECK senere når vokabularet har satt seg, er billigere enn å endre en CHECK to ganger. Ønsker man likevel et vern med én gang, legges CHECK-en i samme migrasjon som de andre samlings­endringene (094, se punkt 8) med alle fem verdiene: `check (type in ('redaksjonell','tipsliste','kursmodul','manedens','julekalender'))`.

---

## 3) Månedsstrukturen — hvordan bevares den?

**Funn (LENKESAMLINGER §5):** «Månedens»-samlingene har en måned-for-måned-inndeling (Januar: … Februar: …). Og det er ikke bare månedene — «Tipsliste til SFO/AKS» har **underoverskrifter som grupperer lenkene** (§5). Begge er samme behov: en gruppe-etikett over en del av lenkene i én samling.

**Modellen i dag (migr 029):**
```
samling_ressurs (
  samling_id  uuid,
  ressurs_id  uuid,
  rekkefolge  smallint not null default 0,
  primary key (samling_id, ressurs_id)
)
```
Den har `rekkefolge` (flat sortering), men **ingen kolonne for hvilken gruppe/seksjon en lek hører til.**

**Anbefaling: én samling per «Månedens X 20XX», med en ny seksjons-kolonne — IKKE én samling per måned.**

Hvorfor ikke én samling per måned:
- Innledningsteksten er skrevet for hele året (én tekst per «Månedens leker 2026»). Splittes den i tolv, må teksten enten dupliseres eller mistes.
- Samle-videoen (der den finnes) er én for hele samlingen.
- Tolv samlinger × flere år × tre serier = ~70 samlinger i stedet for 6. Det blåser opp listen uten gevinst.

I stedet: legg til **`samling_ressurs.seksjon text` (nullable)** i migrasjon 094 (se punkt 8). Importen fyller den med «Januar», «Februar», … for måneds­samlingene, og med underoverskriften («Ballaktiviteter», «Rolige leker» osv.) for tipslistene. Er lenken ikke i noen gruppe, står `seksjon` tom og lenken vises som en flat post. `rekkefolge` bevarer rekkefølgen innenfor hver seksjon.

Dette er én kolonne som løser **både** månedene og underoverskriftene med samme mekanisme — derfor anbefalt fremfor en egen måneds­tabell.

---

## 4) Kategori-koblingen — den avgjørende

Dette er det viktigste funnet, og det endrer hvordan importen må gjøres. Jeg deler svaret i tre: hva modellen sier i dag, hva frontend faktisk gjør, og hva som må til.

### 4a) Kan en samling ha en kategori i modellen i dag?

**Nei.** Kategori-kobling finnes bare for ressurser:
- `ressurs_kategori (ressurs_id, kategori_id)` → `kategorier` (migr 025)
- `ressurs_egnet (ressurs_id, egnet_id)` → `egnet_kategori` (migr 025)

Begge koblingsbordene peker på `ressurser`. **`samlinger` har ingen kobling til hverken `kategorier` eller `egnet_kategori`.** En samling kan altså ikke, slik modellen står, ha en kategori.

### 4b) Hvordan henter de tolv inngangene innholdet sitt — egentlig?

Jeg leste `src/components/SkoleHjem.jsx` og `src/lib/leker.js`. Dette er nøkkelen, og det er ikke slik man skulle tro:

**De tolv boksene henter IKKE samlinger. De gjør et tekstsøk som filtrerer LEKER på «egnet for».**

Konkret: hver boks kaller `run('...')` → funksjonen `parseQ()` gjør teksten om til et filter `f.egnet = 'SFO/AKS'` (eller 'FYSAK', 'TL-Mester', …) → dette sendes til søke-RPC-en `sok_leker` som parameter `p_egnet`. RPC-en (migr 089) filtrerer på `egnet_kategori` via `ressurs_egnet` (linje 118–119: `join egnet_kategori ek on ek.id = re.egnet_id`).

Så: et klikk på «SFO/AKS» viser de **lekene** som er merket med `egnet_kategori`-verdien «SFO/AKS». Ordet «samling» finnes ikke i `SkoleHjem.jsx` eller `leker.js` i det hele tatt — samlinger spørres aldri av Min side.

Verdiene de tolv boksene ber om (fra `parseQ`): SFO/AKS, Kroppsøving, Move It, Aktivitetsdager, Friminutt, Aktiv læring, FYSAK, Bli kjent / klassemiljø, Sosial kompetanse, TL-Mester, Leker for 100+ elever — og Barnehage (som går på `trinn`, ikke egnet).

**To hull i `egnet_kategori` som allerede finnes (uavhengig av denne jobben, men de blokkerer boksene):**
- `egnet_kategori` er sådd i migr 023 med åtte verdier, og migr 038 legger til fire til (Sosial kompetanse, TL-Mester, Leker for 100+ elever, Barnehage). **MEN migr 038s egen topptekst sier «UTKAST til gjennomgang … Kjøres i Supabase SQL-editor» — den er ikke sikkert kjørt live.** Om den ikke er kjørt, gir de fire boksene 0 treff. (Bekreftes i spørringen nederst.)
- **«Move It» finnes ikke som `egnet_kategori`.** Migr 023 sådde «Aktive pauser»; ingen migrasjon har lagt til «Move It». Men `parseQ` ber om `egnet = 'Move It'`. Så Move It-boksen gir 0 treff i dag. Dette henger sammen med ETAPPE5 punkt 11 («Aktive pauser» → «Move It» overalt): `egnet_kategori`-raden «Aktive pauser» må gis navnet «Move It».

Og et poeng verdt å merke: migr 038 sier selv, i klartekst, at «Sosial kompetanse», «TL-Mester» og «Leker for 100+ elever» **«er egentlig Tipslister (kuraterte samlinger)»**, og foreslår som alternativ modell «legg dem i kategorier (samlinger)». Beslutning (b) er nettopp det svaret 038 etterlyste: de blir samlinger. Men frontend behandler dem fortsatt som egnet-verdier — derfor må vi gjøre begge deler (se 4c).

### 4c) Hva må til for at læreren finner samlingen når hun klikker «SFO/AKS»?

Det finnes to veier, og jeg anbefaler å gjøre den ene nå (lansering) og den andre senere (rikere visning).

**Vei A — for lansering, uten frontend-endring: importen merker hver lek i samlingen med riktig `egnet_kategori`.**

Når «Tipsliste til SFO/AKS» importeres, får hver av dens 73 leker en rad i `ressurs_egnet` mot `egnet_kategori` «SFO/AKS». Da fyller den eksisterende boksen + RPC-en seg av seg selv — boksen var jo bygget for å filtrere leker på egnet. Ingen frontend-endring, ingen ny spørring. Dette er det som gjør de fire (trolig flere) tomme boksene fulle ved lansering.

Hvilke samlinger mappes til hvilken boks (der samlingen svarer til en Min side-inngang):

| Samling | Merk medlemslekene med `egnet_kategori` |
|---|---|
| Tipsliste til SFO/AKS | SFO/AKS |
| Tipsliste TL-Mester | TL-Mester |
| Tipsliste sosial kompetanse | Sosial kompetanse |
| Tipsliste leker for 100+ elever | Leker for 100+ elever |
| Tipsliste til FYSAK | FYSAK |
| Tipsliste til KRØ (×3) | Kroppsøving |
| Månedens Move it 2025/2026 | Move It |

Samlingene som IKKE svarer til en fast boks (Favoritter, Julekalender, Lekekurs høst/vinter, Månedens leker, Månedens utfordringer, «Tipslister») merkes **ikke** med egnet — de bevares som samlinger og surfacet rikt senere (vei B). Favoritter er dessuten en egen funksjon på Min side («Mine ting»), ikke en egnet-boks.

**Vei B — senere, rikere visning (KAN VENTE, ikke blokkerende): frontend henter og viser selve samlingen.**

For at boksen skal vise samlingen *som samling* (med innledningstekst, seksjoner og video), må frontend kunne slå opp «hvilken samling hører til boksen SFO/AKS». Siden `samlinger` ikke har en kategori, er den enkleste broen en **stabil nøkkel** på samlingen: `samlinger.noekkel text` (nullable, unik), som importen setter til f.eks. `'sfo-aks'`, `'tl-mester'`, `'moveit-2026'`. Frontend-boksen slår opp samlingen på nøkkelen og rendrer den. Dette krever en liten kolonne (096, kan vente) **og** en frontend-jobb (Etappe 6+). Det haster ikke til lansering fordi vei A allerede fyller boksene.

Jeg anbefaler **ikke** en egen `samling_egnet`-koblingstabell nå — de tolv inngangene er et fast, lite sett, og en enkel nøkkel er nok. En koblingstabell kan legges til senere hvis en samling skal ligge under flere innganger.

**Oppsummert svar på Q4:** Kategori er i dag kun for ressurser; en samling kan ikke ha kategori. De tolv boksene henter leker filtrert på `egnet_kategori`, ikke samlinger. For at samlingene skal fylle boksene ved lansering, må importen merke medlemslekene med riktig `egnet_kategori` (vei A) — det er en importregel, ikke en modellendring, utover at `egnet_kategori` må ha de nødvendige verdiene («Move It», og de fire fra 038 hvis 038 ikke er kjørt). Å vise selve samlingen i boksen er en senere frontend-jobb (vei B) som trenger en nøkkel-kolonne.

---

## 5) Samle-videoen — har modellen plass til den?

**Nei — dette er et hull som må inn i en migrasjon.**

**Bekreftet i modellen (migr 026):**
```
medier (
  id            uuid,
  ressurs_id    uuid  not null  references ressurser(id) on delete cascade,
  type          text  not null check (type in ('bilde','video','pdf')),
  bunny_video_id text,
  storage_sti   text,
  original_filnavn text,
  alt_tekst     text,
  rekkefolge    smallint not null default 0
)
```

`ressurs_id` er **NOT NULL** og peker på `ressurser`. Media kan altså bare henge på en lek, ikke på en samling. Samle-videoen (LENKESAMLINGER §5: «Vi har samlet alle i en video … nederst på denne siden») har ikke noe sted å bo.

**Anbefaling: ny koblingstabell `samling_medie` (i migrasjon 095, samme runde som de andre medie-endringene).** Speiler `samling_ressurs`:

```
samling_medie (
  samling_id     uuid  not null references samlinger(id) on delete cascade,
  type           text  not null check (type in ('bilde','video')),
  bunny_video_id text,
  storage_sti    text,
  alt_tekst      text,
  rekkefolge     smallint not null default 0,
  primary key (samling_id, rekkefolge)
)
```

Hvorfor egen tabell fremfor å gjøre `medier.ressurs_id` nullable:
- Å gjøre `ressurs_id` nullable + legge til `samling_id` + en «nøyaktig én av dem»-CHECK ville røre `medier`s NOT NULL, indeksen `idx_medier_ressurs`, og RLS-politikken på `medier` — en større endring med større kontrollflate, midt i den tabellen importen fyller tyngst.
- En egen liten tabell er additiv og forstyrrer ingenting. Den følger nøyaktig mønsteret `samling_ressurs`/`samling_dokument` (ETAPPE5 punkt 6), så modellen forblir konsekvent: samlinger kurerer ved referanse.

**Importregel for samle-videoen:** de 4 `.mp4`-lenkene som i dag ligger som «ureine» lenker (se punkt 6) ER samle-videoene. De skal IKKE bli `samling_ressurs`-koblinger. De blir `samling_medie`-rader, type `video`, med `bunny_video_id` når filen er lastet til Bunny (samme vei som lekevideoene, ETAPPE5 punkt 9). Er filen bare en `/file/…mp4`-peker og ennå ikke på Bunny, lages raden med `storage_sti` + kø-rad `samling_video_ulastet` så noen laster den opp. Alt-tekst mangler: sett samlingens tittel som midlertidig fallback + kø `manglende_alttekst` (samme regel som ETAPPE5 punkt 8).

---

## 6) De 34 ureine lenkene — per gruppe

Grunntallet (LENKESAMLINGER §3): av 436 lenker peker **402 (92,2 %)** rett på en publisert lek/aktiv-læring-node vi importerer → disse blir maskinelle `samling_ressurs`-koblinger. De resterende 34 deler seg i tre hovedgrupper, og to av dem må finunderdeles. For hver: hva importen skal gjøre.

### Gruppe 1 — 5 lenker peker på upublisert innhold
To leker finnes, men er avpublisert: nid 2718 «Alle sammen ut av huset» (1 lenke) og nid 13661 «Stein, saks, papir-runden» (4 lenker).

**Anbefaling: lag `samling_ressurs`-koblingen til den importerte (men avpubliserte) leken + kø-rad `lenke_upublisert`.** Leken importeres uansett (med `status='utkast'`/avpublisert), så koblingen kan lages. RLS/status skjuler leken for lærere inntil den publiseres — altså vises ingen død lenke ved lansering, og koblingen **selvheler** om leken publiseres senere. Kø-raden lar en redaktør velge: publisér leken eller fjern lenken. Ikke gjett.

### Gruppe 2 — 21 lenker «finnes ikke» (alias bommer)
Denne må deles i fire (LENKESAMLINGER §4):

- **6 gjenvinnes med tittel-oppslag** (lenketeksten er lekens navn; 0 tvetydige): «High five»→10582, «Spagaten»→10584, «Popcorn»→17073, «Kjegleduellen»→13657, «Alle mot alle»→13659, m.fl. → **disse er egentlig rene.** Importregel: når alias bommer, prøv tittel-oppslag mot lekenes titler; ett entydig treff → lag `samling_ressurs`-koblingen. Ingen kø.
- **4 uten tittel-treff:** «Klokka», «Kari og Knut: Siste par ut!», «21 fot», «25-leken: Kropp og helse». → **Kø-rad `lenke_ulost`**, med lenketekst + href bevart i kø-radens `beskrivelse`. Ingen kobling. En person sjekker (leken kan være omdøpt eller fjernet).
- **6 TL-dans-sider** (href `/tl-dans`): peker på en ekte side som ikke er en lek. → **Bevar som ren tekst/lenke i innledningsteksten**, ingen `samling_ressurs`-kobling (det bordet er for ressurser), ingen kø — dette er ikke en feil, bare en lenke til en annen intern side. Importen lar URL-en stå i den rensede innledningsteksten.
- **1 mailto** (`mailto:marielle@…`): kontakt-lenke. → **Bevar som ren tekst i innledningsteksten** (eller ignorer om innledningen ikke rommer den). Ingen kobling, ingen kø.

(4 `.mp4` samle-videoer hører formelt til «finnes ikke»-tellingen i CSV-en, men behandles i punkt 5 som `samling_medie`, ikke her.)

### Gruppe 3 — 8 eksterne lenker
- **6 Instagram** (`instagram.com/trivselsleder_tl/`): ekte ekstern profil. → **Bevar som ren tekst/lenke i innledningsteksten.** Ingen kobling, ingen kø.
- **2 ødelagte** (`http://Piloten`, `http://Ballongdansen` — mangler domene): → **Ignorer + kø-rad `lenke_odelagt`** med originalteksten bevart, så en redaktør kan finne hva det skulle peke på.

### Oppsummert regel per gruppe

| Gruppe | Antall | Importhandling |
|---|---:|---|
| Publisert lek/atlu | 402 | `samling_ressurs`-kobling (maskinelt) |
| Gjenvunnet ved tittel | 6 | `samling_ressurs`-kobling (etter tittel-oppslag) |
| Upublisert lek | 5 | Kobling til utkast-lek + kø `lenke_upublisert` (selvheler) |
| Uten tittel-treff | 4 | Kø `lenke_ulost`, tekst bevart, ingen kobling |
| TL-dans-side | 6 | Bevar som lenke i innledningsteksten |
| mailto | 1 | Bevar i innledningsteksten (evt. ignorer) |
| Samle-video `.mp4` | 4 | `samling_medie` (punkt 5), ikke her |
| Instagram | 6 | Bevar som lenke i innledningsteksten |
| Ødelagt ekstern | 2 | Ignorer + kø `lenke_odelagt` |

Nye kø-typer denne jobben trenger, i tillegg til ETAPPE5 punkt 10-listen: `lenke_upublisert`, `lenke_ulost`, `lenke_odelagt`, `samling_video_ulastet`. De legges til CHECK-lista på `redaksjonell_ko` (migr 093 — se punkt 8).

---

## 7) Regelen ferdig — steg for steg slik importskriptet skal gjøre det

Dette er rekkefølgen importskriptet (Etappe 6) skal følge for lenkesamlingene. Forutsetter at lekene/aktiv-læring allerede er importert (samling_ressurs peker på dem), og at migrasjonene i punkt 8 er kjørt.

**For hver av de 21 lenkesamlingene:**

1. **Opprett samlingen.** Én rad i `samlinger`: `type` fra vokabularet i punkt 2 (`tipsliste`/`kursmodul`/`manedens`/`julekalender`), `synlig = true` (den upubliserte «Kursmodul høst 2025» nid 17734 → `synlig = false`), `rekkefolge` etter ønsket visningsorden. Sett provenans: `kilde_nid` = samlingens Drupal-nid, `kilde_tid`/`import_kjoring_id` (punkt 8). Sett `noekkel` der samlingen svarer til en Min side-boks (punkt 4c, vei B).

2. **Skriv navn + innledningstekst.** Én rad i `samling_innhold`: `sprak='nb'`, `tittel` = samlingens tittel, `beskrivelse` = renset innledningstekst (tillatt HTML beholdt; media-tokener fjernet; de eksterne/TL-dans/mailto-lenkene fra punkt 6 bevart som ren lenke i teksten).

3. **Les lenkene i samlingen** (fra `field_description.safe_value`, alt kartlagt i `lenkesamlinger-lenker.csv`). For hver lenke, i rekkefølge:
   - Slå opp målet på `url_alias` (eksakt). Treffer det en publisert lek/atlu vi importerer → **lag `samling_ressurs`-rad** (`samling_id`, `ressurs_id`, `rekkefolge` = lenkens plass, `seksjon` = måned/underoverskrift der den finnes).
   - Bommer aliaset → prøv tittel-oppslag. Ett entydig treff → `samling_ressurs`-rad som over.
   - Ellers → følg gruppetabellen i punkt 6 (kø-rad eller bevar i tekst). **Lag ingen kobling til noe som ikke er en importert ressurs.**

4. **Samle-video:** finnes en `.mp4`/media-token som samle-video → **`samling_medie`-rad** (type `video`, `bunny_video_id` når lastet, ellers `storage_sti` + kø `samling_video_ulastet`). Alt-tekst = samlingens tittel som fallback + kø `manglende_alttekst`.

5. **Merk medlemslekene med `egnet_kategori`** (vei A, punkt 4c) der samlingen svarer til en Min side-boks: for hver `ressurs_id` i samlingen, `insert into ressurs_egnet` mot riktig `egnet_kategori` (SFO/AKS, TL-Mester, Sosial kompetanse, Leker for 100+ elever, FYSAK, Kroppsøving, Move It). `on conflict do nothing` (en lek kan ligge i flere samlinger og allerede ha merket).

6. **Seksjonsrekkefølge:** for måneds- og tipsliste-samlinger, sett `samling_ressurs.seksjon` + `rekkefolge` slik at Januar…Desember / underoverskriftene bevarer rekkefølgen.

**Hardregel (ETAPPE5):** én feilkobling stopper og ruller tilbake hele kjøringen (via `import_kjoring_id`). Alt som ikke lar seg koble trygt går til køen — ingenting gjettes inn i `samling_ressurs`.

**To landingsnoder som IKKE er lenkesamlinger** (LENKESAMLINGER §1): nid 12415 «Julekalender … juletre til å henge på veggen» (1 lenke, utskriftsark) og nid 18937 «Månedens leker» (0 lenker, tom). Disse blir ikke samlinger. Følg ETAPPE5 punkt 11s landingsnode-regel (utkast + kø `landingsnode`) om de i det hele tatt importeres.

---

## 8) Hva må inn i en migrasjon? (samlet)

Alt jeg fant som mangler i modellen, med hvilken 090–095-runde det hører hjemme i. Alle additive. Ingenting av dette står i ETAPPE5 v3 fra før — det er tilleggene lenkesamlingene krever.

| # | Hva | Tabell | Migrasjon | Blokkerer? |
|---|---|---|---|---|
| A | **Provenans på samlinger:** `kilde_nid text`, `kilde_tid integer`, `import_kjoring_id uuid → import_kjoring(id)`. Samlinger er importerte noder, akkurat som ressurser/dokumenter/medier — men ETAPPE5 punkt 4 glemte `samlinger`. | `samlinger` (ALTER) | **091** (import-infra) | JA — uten dette kan ikke en kjøring rulles tilbake eller gjenkjennes ved re-import |
| B | **Seksjon på koblingen:** `seksjon text` (nullable). Bærer måned («Januar») og underoverskrift. | `samling_ressurs` (ALTER) | **094** (struktur) | JA — importen skriver den ved innlegg |
| C | **`egnet_kategori`-verdier:** gi «Aktive pauser» navnet **«Move It»** (ETAPPE5 punkt 11); sikre at «Sosial kompetanse», «TL-Mester», «Leker for 100+ elever» finnes (migr 038 er UTKAST — kjør verdiene inn ordentlig her hvis 038 ikke er live). | `egnet_kategori` (UPDATE/INSERT) | **094** (taksonomi) | JA — ellers gir Min side-boksene 0 treff selv med merkede leker |
| D | **Samle-video-hjem:** ny tabell `samling_medie` (punkt 5). | ny `samling_medie` | **095** (medier) | JA om samle-video skal med i importen |
| E | **Nye kø-typer:** `lenke_upublisert`, `lenke_ulost`, `lenke_odelagt`, `samling_video_ulastet` inn i CHECK-lista. | `redaksjonell_ko` (CHECK) | **093** (kø) | JA — importen skriver dit mens den kjører |
| F | **Type-vokabular (valgfritt vern):** CHECK på `samlinger.type` med de fem verdiene. | `samlinger` (CHECK) | **094** | NEI — anbefalt utsatt (punkt 2) |
| G | **Surfacing-nøkkel (vei B):** `noekkel text` unik, nullable, for at frontend senere kan hente samlingen bak en boks. | `samlinger` (ALTER) | **096** (kan vente) | NEI — lansering bruker vei A |

**Kort:** de blokkerende er A (091), B og C (094), D (095), E (093). F og G kan vente. Ingen ny tabell er stor; `samling_medie` speiler et mønster som allerede finnes.

Merk at dette **føyer seg inn i** ETAPPE5s eksisterende 090–095-plan uten å endre rekkefølgen: provenansen legger seg til 091s import-infra, seksjon/egnet/type til 094s struktur-/taksonomirunde, samle-video til 095s medie-runde, kø-typene til 093. Den som skriver SQL-en kan velge å samle alle de rene samlings­endringene (B, D, F, G) i én tydelig merket blokk for kontrollørens skyld — det er et kontroll-valg, ikke et modell-valg.

---

## Én bekreftelsesspørring FØR importskriptet skrives (kun lesing)

Migrasjonsfilene er lest, men manuelle endringer i Supabase-konsollen fanges ikke av filene (samme forbehold som ETAPPE5). Kjør denne i **SUPABASE SQL-editor** og lim resultatet inn i neste økt:

```sql
-- 1) Samlingsmodellen: bekreft kolonner (forvent: samlinger uten kilde_nid/kilde_tid/noekkel;
--    samling_ressurs uten seksjon; ingen samling_medie-tabell)
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_name in ('samlinger','samling_innhold','samling_ressurs','samling_medie')
order by table_name, ordinal_position;

-- 2) Finnes en CHECK på samlinger.type i dag?
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.samlinger'::regclass and contype = 'c';

-- 3) egnet_kategori: er migr 038 kjørt, og finnes «Move It»?
select navn, rekkefolge from egnet_kategori order by rekkefolge;
```

**Forventet:** `samlinger` har `type/synlig/rekkefolge` men verken `kilde_*` eller `noekkel`; `samling_ressurs` mangler `seksjon`; `samling_medie` finnes ikke; ingen CHECK på `type`; `egnet_kategori` har enten 8 rader (038 ikke kjørt) eller 12 (038 kjørt), og **«Move It» mangler uansett**. Avviker noe — stopp og si fra før migrasjonene skrives.

---

## FLAGG — motsigelser mot annet i grunnlaget (ikke rettet her, lagt frem for beslutning)

Etter husregelen: ser jeg et tall eller en påstand som motsier noe annet, retter jeg det ikke selv — jeg flagger det.

**FLAGG 1 — «Månedens Move it 2025/2026» er i TO planer med motstridende skjebne.**
LENKESAMLINGER §1 lister nid 16212 «Månedens Move it 2025» (13 lenker) og nid 18886 «Månedens Move it 2026» (12 lenker) blant de 21 lenkesamlingene → under beslutning (b) blir de **samlinger**. Men ETAPPE5 v3 **punkt 11** sier ordrett: «De to samle-/landingsnodene («Månedens Move it 2025/2026», M3) … importeres som leker, men med `status='utkast'` og kø-rad `landingsnode`», og setter generalprøve-fasiten til «126 aktiviteter + 2 landingsnoder». **De kan ikke bli begge deler** — enten er de utkast-leker (ETAPPE5 punkt 11) eller samlinger (denne jobben). Blir de begge, dobbeltimporteres de. **Anbefaling:** de blir samlinger — de har 12–13 håndplukkede lenker + innledningstekst, som er selve definisjonen på en samling; en tom/utkast-lek ville kaste bort kurateringen. Konsekvens: ETAPPE5 punkt 11 bør oppdateres slik at disse to ikke lenger telles som landingsnode-leker, og generalprøve-tallet justeres. Kjartan/neste økt må bekrefte.

**FLAGG 2 — «Tipslister» (nid 19697) er en samling av samlinger.**
Denne (9 lenker) peker trolig på de andre tipslistene, ikke på leker. Om lenkene går til andre lenkesamlinger (game-noder som nå blir `samlinger`), kan de ikke bli `samling_ressurs`-rader — det bordet peker på `ressurser`, ikke på `samlinger`. Dette er ikke undersøkt lenke-for-lenke i grunnlaget. **Beslutning trengs:** enten en «samling av samlinger»-kobling (ny liten tabell `samling_samling`), eller behandle «Tipslister» som en ren innholdsside utenfor importen. Ikke løst her fordi datagrunnlaget ikke sier hva de 9 peker på.

**FLAGG 3 — 402 vs. 408.** Hovedtallet er 402 rene alias-treff; tittel-oppslag henter 6 til = 408. Importregelen i punkt 6/7 bruker begge (alias først, tittel som andrelinje), så 408 er tallet som faktisk kobles. Nevnt så ingen leser «402» som at 6 gikk tapt.

**FLAGG 4 — `egnet_kategori` «SFO/AKS» finnes to steder konseptuelt.** Boksen filtrerer på `egnet_kategori` «SFO/AKS», mens samlingen i Drupal lå i `kategorier` «SFO/AKS» (tid 1115). Det er to ulike taksonomier med samme navn. Importen bruker `egnet_kategori`-veien (vei A) fordi det er den frontend faktisk spør på — `kategorier`-raden «SFO/AKS» er ikke det boksen leser. Nevnt så ingen kobler medlemslekene til feil tabell.

---

*Skrevet i Cowork, 2. sep 2026. Ren spesifikasjon — ingen import, database eller git. Alle kolonnepåstander har migrasjonsnummer; det ene som ikke kan leses av filene (manuelle konsoll-endringer) er samlet i bekreftelsesspørringen. Neste steg: kjør bekreftelsesspørringen, avklar FLAGG 1 og 2, så kan importskriptet for lenkesamlingene bygges riktig.*
