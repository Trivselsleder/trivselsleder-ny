# Prøvekobling: våre kompetansemål mot Udirs LK20-fasit

**Dato:** 2. sep 2026 · **Status:** FORSLAG — ingenting er koblet eller endret.
Et menneske godkjenner lista før den tas i bruk. *Systemet foreslår, mennesket bestemmer.*

## Hva som ble sammenlignet
- **Våre termer:** 302 fra `Vocabularies/learning_objectives-terms.json`
  (vokabular `learning_objectives`, vid 9) i `trivselslederno_Full_Export_240826.zip`.
  Bokmål og nynorsk blandet, uten språkmerking.
- **Fasit:** 1410 offisielle LK20-mål (grunnskole) fra Udirs GREP-API,
  `data/udir/lk20-kompetansemaal.json`. Hvert mål har både bokmål (`nob`) og nynorsk (`nno`).
- **Metode:** (1) eksakt tekstmatch mot bokmål ELLER nynorsk → (2) normalisert match
  (små bokstaver, uten tegnsetting, kollapsede mellomrom) → (3) nær match (SequenceMatcher,
  terskel 0,75) — kun som **forslag** med skår. Faller en term utenfor, klassifiseres den —
  den tvinges aldri inn i en match.

## Resultat i tall

| Bunke | Betydning | Antall | Andel |
|---|---|---:|---:|
| **A — SIKKER MATCH** | eksakt eller normalisert treff | **174** | 57.6 % |
| **B — FORSLAG** | nær match, trenger menneskeøye | **26** | 8.6 % |
| **C — IKKE ET MÅL** | overskrift / etikett / tom | **37** | 12.3 % |
| **D — INGEN TREFF** | ser ut som mål, finnes ikke i LK20 (trolig gammel LK06) | **65** | 21.5 % |
| | **Sum** | **302** | 100 % |

## Dublettene — hovedpoenget

Grupperer vi bunke A på Udir-koden hver term traff, lander **27 av våre termer**
på **12 felles koder**. Det betyr 12 reelle kompetansemål som hos oss ligger
som 27 merkelapper — typisk bokmål + nynorsk av samme mål (noen steder også en
eksakt gjentakelse eller en variant med innledende bindestrek/punktum).

- **12 dublettgrupper** dekker **27 termer** → kan slås sammen til 12.
- Netto reduksjon her: **15 overflødige merkelapper** forsvinner.
- De øvrige 147 A-termene traff hver sin unike kode (ingen dublett).
- Unike Udir-koder truffet i bunke A totalt: **159**.

### Alle 12 dublettgrupper

**`KM14683`** (2 termer):
- Utforske ulike sider ved mangfald i Noreg og reflektere over menneska sine behov for å vere seg sjølve og for å høyre til i fellesskap.
- Utforske ulike sider ved mangfold i Norge og reflektere over menneskers behov for å være seg selv og for å høre til i fellesskap.

**`KM13252`** (2 termer):
- Lage og følgje reglar og trinnvise instruksjonar i leik og spel knytte til koordinatsystemet.
- Lage og følge regler og trinnvise instruksjoner i lek og spill knyttet til koordinatsystemet.

**`KM13360`** (3 termer):
- Følge regler for rettskriving, ordbøying og setningsstruktur.
- Følge regler for rettskriving, ordbøying og setningsstruktur.
- - følge regler for rettskriving, ordbøying og setningsstruktur

**`KM14607`** (2 termer):
- Bruke fagbegreper i arbeidet med religioner og livssyn.
- Bruke fagbegreper i arbeidet med religioner og livssyn.

**`KM13236`** (2 termer):
- Kjenne att og beskrive repeterande einingar i mønster og lage eigne mønster.
- Kjenne igjen og beskrive repeterende enheter i mønstre og lage egne mønstre.

**`KM14162`** (3 termer):
- Beskrive, fortelle og argumentere muntlig og skriftlig og bruke språket på kreative måter.
- Beskrive, fortelle og argumentere muntlig og skriftlig og bruke språket på kreative måter
- Beskrive, fortelle og argumentere muntlig og skriftlig og bruke språket på kreative måter.

**`KM13355`** (2 termer):
- Utforske og bruke uttalemønstre og ord og uttrykk i lek, sang og rollespill.
- - utforske og bruke uttalemønstre og ord og uttrykk i lek, sang og rollespill

**`KM14146`** (2 termer):
- Trekke bokstavlyder sammen til ord under lesing og skriving.
- Trekke bokstavlyder sammen til ord under lesing og skriving.

**`KM13268`** (3 termer):
- Utvikle og bruke ulike strategiar for rekning med positive tal og brøk og forklare tenkjemåtane sine.
- utvikle og bruke ulike strategier for regning med positive tall og brøk og forklare tenkemåtene sine
- Utvikle og bruke ulike strategier for regning med positive tall og brøk og forklare tenkemåtene sine.

**`KM13840`** (2 termer):
- Reflektere over hvordan teknologi kan løse utfordringer, skape muligheter og føre til nye dilemmaer
- Reflektere over hvordan teknologi kan løse utfordringer, skape muligheter og føre til nye dilemmaer.

**`KM14196`** (2 termer):
- Utforske språklig variasjon og mangfold i Norge og reflektere over holdninger til ulike språk og talespråkvarianter
- Utforske språklig variasjon og mangfold i Norge og reflektere over holdninger til ulike språk og talespråkvarianter.

**`KM14171`** (2 termer):
- Leke med språket og prøve ut ulike virkemidler og framstillingsmåter i muntlige og skriftlige tekster.
- Leke med språket og prøve ut ulike virkemidler og framstillingsmåter i muntlige og skriftlige tekster.

## 10 eksempler fra hver bunke

### A — SIKKER MATCH (eksakt/normalisert)
- `KM13841` — Utforske faseoverganger og kjemiske reaksjoner og beskrive hva som kjennetegner dem.
- `KM14695` — Beskrive sentrale hendingar som har ført fram til det demokratiet vi har i Noreg i dag og samanlikne korleis enkeltmenneske har høve til å påverke i ulike styresett.
- `KM14685` — Utforske korleis menneske i fortida livnærte seg, og samtale om korleis sentrale endringar i livsgrunnlag og teknologi har påverka og påverkar demografi, levekår og busetjingsmønster.
- `KM13832` — Samtale om hva fysisk og psykisk helse er, og drøfte hvordan livsstil og trivsel påvirker helse.
- `KM14683` — Utforske ulike sider ved mangfald i Noreg og reflektere over menneska sine behov for å vere seg sjølve og for å høyre til i fellesskap.
- `KM14694` — Reflektere over variasjonar i identitetar, seksuell orientering og kjønnsuttrykk, og eigne og andre sine grenser knytte til kjensler, kropp, kjønn og seksualitet og drøfte kva ein kan gjere om grenser blir brotne.
- `KM13233` — Plassere tal på tallinja og bruke tallinja i rekning og problemløysing.
- `KM13252` — Lage og følgje reglar og trinnvise instruksjonar i leik og spel knytte til koordinatsystemet.
- `KM13360` — Følge regler for rettskriving, ordbøying og setningsstruktur.
- `KM14587` — Sammenligne og presentere ulike årstider og høytider i kristendom og andre religions- og livssynstradisjoner, som kulturarv.

### B — FORSLAG (nær match, skår 0,75–0,86)
- skår **0.789** → `KM13268`
  - vår:  Utvikle og bruke formålstenlege strategiar i rekning med brøk, desimaltal og prosent og forklare tenkjemåtane sine.
  - Udir: utvikle og bruke ulike strategier for regning med positive tall og brøk og forklare tenkemåtene sine
- skår **0.835** → `KM13230`
  - vår:  eksperimentere med telling både forlengs og baklengs, velge ulike startpunkter og ulik differanse og beskrive mønstre i tellingene
  - Udir: telle både framlengs og baklengs, velge ulike startpunkter og ulik differanse og forklare mønstre i tellinger
- skår **0.802** → `KM13234`
  - vår:  Utforske addisjon og subtraksjon og bruke dette til å formulere og løse problemer fra lek og egen hverdag.
  - Udir: bruke addisjon og subtraksjon til å lage og løse problemer fra lek og hverdag
- skår **0.810** → `KM13228`
  - vår:  Ordne tall, mengder og former ut fra egenskaper, sammenligne dem og reflektere over om det kan gjøres på flere måter.
  - Udir: gruppere tall og mengder ut fra egenskaper og reflektere over om dette kan gjøres på flere måter
- skår **0.789** → `KM13262`
  - vår:  Utforske og beskrive strukturar og mønster i leik og spel.
  - Udir: beskrive og utforske strukturer og mønstre i lek og spill
- skår **0.800** → `KM13257`
  - vår:  Utforske, bruke og beskrive ulike divisjonsstrategiar.
  - Udir: bruke og forklare ulike divisjonsstrategier
- skår **0.780** → `KM13231`
  - vår:  Utforske og beskrive generelle eigenskapar ved partal og oddetal.
  - Udir: beskrive og utforske egenskaper ved partall og oddetall
- skår **0.848** → `KM13261`
  - vår:  Utforske, beskrive og samanlikne eigenskapar ved to- og tredimensjonale figurar ved å bruke vinklar, kantar og hjørne.
  - Udir: beskrive og utforske egenskaper ved to- og tredimensjonale figurer ved å bruke vinkler, kanter, hjørner og flater
- skår **0.854** → `KM13278`
  - vår:  beskrive egenskaper ved og minimumsdefinisjoner av to- og tredimensjonale figurer og forklare hvilke egenskaper figurene har felles, og hvilke egenskaper som skiller dem fra hverandre
  - Udir: beskrive og utforske egenskaper ved to- og tredimensjonale figurer og forklare hvilke egenskaper figurene har til felles, og hvilke egenskaper som skiller figurene fra hverandre
- skår **0.790** → `KM13269`
  - vår:  Formulere og løyse problem frå eigen kvardag som har med tid å gjere.
  - Udir: formulere og løse problemer som har med brøk å gjøre

### C — IKKE ET KOMPETANSEMÅL
- 'Etter 4. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 2. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 7. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 3. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 7. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 5. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 8. trinn'  *(grunn: trinn-overskrift)*
- 'Etter 9. trinn'  *(grunn: trinn-overskrift)*
- 'Etter 10. trinn:'  *(grunn: trinn-overskrift)*
- 'Etter 7.trinn:'  *(grunn: trinn-overskrift)*

### D — INGEN TREFF I LK20 (trolig gammel LK06-plan)
- Samhandle med andre gjennom lek, dramatisering, samtale og diskusjon. (beste skår 0.556)
- Telje til 100, dele opp og byggje mengder opp til 10, setje saman og dele opp tiargrupper opp til 100 og dele tosifra tal i tiarar og einarar. (beste skår 0.432)
- Utføre grunnleggende setningsanalyse og vise hvordan tekster er bygd opp ved hjelp av begreper fra gramatikk og tekstkunnskap. (beste skår 0.442)
- Vise forståelse for sammenhengen mellom språklyd og bokstav og mellom talespråk og skriftspråk (beste skår 0.610)
- Praktisere kildesortering og diskutere hvorfor kildesortering er viktig. (beste skår 0.490)
- Beskrive og bruke plassverdisystemet for desimaltal, rekne med positive og negative heile tal, desimaltal, brøkar og prosent og plassere dei ulike storleikane på tallina. (beste skår 0.519)
- Finne samnemnar (bm.: fellesnevner) og utføre addisjon, subtraksjon og multiplikasjon av brøkar. (beste skår 0.477)
- Kjenne att, eksperimentere med, beskrive og vidareføre strukturar i talmønster. (beste skår 0.568)
- Utvikle, bruke og samtale om ulike reknemetodar for addisjon og subtraksjon av fleirsifra tal både i hovudet og på papiret (beste skår 0.527)
- Utvikle og bruke varierte metodar for multiplikasjon og divisjon, bruke dei i praktiske situasjonar og bruke den vesle multiplikasjonstabellen i hovudrekning og i oppgåveløysing (beste skår 0.444)

## Ærlig vurdering av menneskejobben

**Kort:** ca. **103 avgjørelser** står igjen til et menneske; resten (147 rene
A-treff) kan aksepteres med stikkprøve.

- **Bunke A (174):** trygg bunn. Normaliseringen fanget bokmål↔nynorsk fordi Udir
  har begge språk, så en nynorsk-merkelapp traff Udirs nynorske tekst. Anbefaling:
  aksepter automatisk, ta en stikkprøve på 15–20. **Lav innsats.**
- **Dublettene (12 grupper / 27 termer):** rask ryddejobb. For hver gruppe
  velger man én kanonisk kobling og slår sammen. **12 beslutninger, ~30 min.**
- **Bunke B (26):** her trengs øyet. Skårene ligger 0,75–0,86 — samme mål med
  omskrevet verb («utforske» vs «bruke») eller små forskjeller. Hver må enten godkjennes
  mot foreslått kode eller flyttes til D. **26 vurderinger, ~1 time.**
- **Bunke C (37):** ingen jobb utover å slette/ignorere. Alle er «Etter X. trinn»-
  overskrifter (inkl. én feilstavet «Ettter»). Disse er strukturetiketter fra gammel side,
  ikke mål. **Kan forkastes samlet.**
- **Bunke D (65):** den tyngste posten. Disse ser ut som ekte mål men finnes ikke i
  dagens LK20 — nesten helt sikkert rester fra **LK06** (gammel læreplan). Beste nær-skår er
  ≤ 0,61, godt under B. Her må noen bestemme: forkastes (målet er utgått) eller kobles manuelt
  til nærmeste LK20-mål der det gir mening. **65 vurderinger, halvparten trolig ren
  forkasting — ~2 timer.**

**Samlet estimat:** en halv til én arbeidsdag for en fagperson, mest på bunke D. Gevinsten er
stor: 174 termer får en verifisert offisiell kode, 15 dubletter
forsvinner, og 102 ikke-LK20-etiketter blir luket ut i stedet for å dras
med videre.

## Filer
- `data/udir/kobling-forslag.csv` — én rad per av våre 302 termer (vår tekst, bunke, Udir-kode,
  Udir-URI, Udirs bokmål, Udirs nynorsk, likhetsskår, hvilke andre av våre termer den er
  duplikat av, samt grunn for C).
- `data/udir/KOBLING-RAPPORT.md` — denne rapporten.

*Ingen base- eller repo-endringer er gjort. Kun lesing + to resultatfiler skrevet.*
