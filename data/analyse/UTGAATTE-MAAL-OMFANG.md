# Omfang: utgåtte kompetansemål i aktiv læring-oppleggene

**Dato:** 2. sep 2026 · **Ren telling** — ingen endringer, ingen kobling, ingen forslag.
**Kilder:** `data/udir/kobling-forslag.csv` (302 klassifiserte merkelapper), `Content/atlu-nodes.json` (289 opplegg) og `Vocabularies/learning_objectives-terms.json` i eksport-zip (lest via indeks, ikke utpakket).

**Koblingsmetode:** CSV-rad *i* svarer eksakt til vokabular-term *i* (verifisert: 0 avvik i rekkefølge), så hver merkelapp er knyttet til sin `tid` via indeks — entydig selv med 17 dublett-navn. Opplegg peker på mål via `field_atlu_objective.target_id` → `tid`. Alle 951 målreferanser i oppleggene peker inn i de 302 (0 utenfor). Fag hentes fra `field_atlu_topic` (forelder-navn), trinn fra `field_school_year`.

## Oppsummert svar
- **62 unike opplegg** har minst ett utgått (LK06-)mål.
- Av disse mister **25** all reell læreplankobling hvis de utgåtte fjernes (har verken sikkert gyldig A-mål eller nær B-mål) — 2 av dem har *bare* utgåtte mål.
- **9** klarer seg (har også et sikkert gyldig mål), **28** kan trolig reddes med menneskeøye (har et nært B-mål).
- Problemet er nesten utelukkende **Matematikk** (61 av 62).

## 1) Har oppleggene kompetansemål i det hele tatt?
- Atlu-opplegg totalt: **289** (publisert: 280, upublisert: 9).
- Med **minst ett** kompetansemål: **261** (90.3 %).
- **Uten noe** kompetansemål: **28** (9.7 %).

## 2) Hver av de 65 D-merkelappene — hvor mange opplegg bruker den?
- D-merkelapper i bruk (≥1 opplegg): **46** av 65.
- D-merkelapper brukt av **0 opplegg** (kan strykes uten videre): **19** av 65.

**Alle D-merkelapper i bruk, sortert synkende:**

| Antall opplegg | Utgått merkelapp |
|---:|---|
| 11 | Utvikle og kommunisere strategiar for hovudrekning i utrekningar. |
| 10 | utforske og forklare sammenhenger mellom addisjon og subtraksjon og bruke det i hoderegning og problemløsing |
| 8 | utforske tall, mengder og telling i lek, natur, billedkunst, musikk og barnelitteratur, representere tallene på ulike måter og oversette mellom de ulike representasjonene |
| 6 | Beskrive, forklare og presentere strukturar og utviklingar i geometriske mønster og i talmønster. |
| 6 | utforske og forklare sammenhenger mellom de fire regneartene og bruke sammenhengene hensiktsmessig i utregninger |
| 4 | Eksperimentere med multiplikasjon og divisjon i kvardagssituasjonar. |
| 3 | Bruke samansette rekneuttrykk til å beskrive og utføre utrekningar. |
| 3 | Bruke ulike måleiningar for lengd og masse i praktiske situasjonar og grunngi valet av måleining. |
| 3 | Utforske mål for areal og volum i praktiske situasjonar og representere dei på ulike måtar. |
| 3 | Utforske den kommutative og den assosiative eigenskapen ved addisjon og bruke dette i hovudrekning. |
| 3 | Utforske og forklare sammenhenger mellom addisjon og subtraksjon og bruke det i hoderegning og problemløsing. |
| 2 | Beskrive og generalisere mønster med eigne ord og algebraisk. |
| 2 | Utforske multiplikasjon ved teljing. |
| 2 | Måle og samanlikne storleikar som gjeld lengd og areal, ved hjelp av ikkje-standardiserte og standardiserte måleiningar, beskrive korleis og samtale om resultata. |
| 2 | Bruke variablar og formlar til å uttrykkje samanhengar i praktiske situasjonar. |
| 2 | Beskrive likskap og ulikskap i samanlikning av storleikar, mengder, uttrykk og tal og bruke likskaps- og ulikskapsteikn. |
| 2 | Beskrive posisjonssystemet ved hjelp av ulike representasjonar. |
| 2 | Utforske likevekt og balanse i praktiske situasjonar, representere dette på ulike måtar og omsetje mellom dei ulike representasjonane. |
| 2 | utforske og forklare sammenhenger mellom de fire regneartene og bruke sammenhengene hensiktsmessig i utregninger |
| 2 | utforske den kommutative og den assosiative egenskapen ved addisjon og bruke dette i hoderegning |
| 1 | Utforske algebraiske reknereglar. |
| 1 | Bruke potensar og kvadratrøter i utforsking og problemløysing og argumentere for framgangsmåtar og resultat. |
| 1 | Modellere situasjonar knytte til reelle datasett, presentere resultata og argumentere for at modellane er gyldige. |
| 1 | Utvikle og bruke formålstenlege strategiar for subtraksjon i praktiske situasjonar. |
| 1 | Utforske og forklare samanhengar mellom brøkar, desimaltal og prosent og bruke det i hovudrekning. |
| 1 | Utforske og beskrive symmetri i mønster og utføre kongruensavbildingar med og utan koordinatsystem. |
| 1 | Bruke ikkje-standardiserte måleiningar for areal og volum i praktiske situasjonar og grunngi valet av måleining. |
| 1 | Formulere og løyse problem frå sin eigen kvardag som har med desimaltal, brøk og prosent å gjere og forklare eigne tenkjemåtar. |
| 1 | Aktiviteten dekker flere kompetansemål knyttet til ulike tema. |
| 1 | utforske og bruke hensiktsmessige sentralmål i egne og andres statistiske undersøkelser |
| 1 | utforske den kommutative og den assosiative egenskapen ved addisjon og bruke dette i hoderegning |
| 1 | representere brøker på ulike måter og oversette mellom de ulike representasjonene |
| 1 | utforske og forklare sammenhenger mellom de fire regneartene og bruke sammenhengene hensiktsmessig i utregninger |
| 1 | bruke tallinje i regning med positive og negative tall |
| 1 | Forklare korleis ein kan beskrive tid ved hjelp av klokke og kalender. |
| 1 | Løyse likningar og ulikskapar gjennom logiske resonnement og forklare kva det vil seie at eit tal er ei løysing på ei likning. |
| 1 | Utvikle og bruke hensiktsmessige strategier for subtraksjon i praktiske situasjoner. |
| 1 | Utforske og forklare samanhengar mellom dei fire rekneartane og bruke samanhengane formålstenleg i utrekningar. |
| 1 | Utforske og forklare sammenhenger mellom de fire regneartene og bruke sammenhengene hensiktsmessig i utregninger. |
| 1 | Her jobbes det med kjerneelementet - Utforsking og problemløsing: |
| 1 | "Utforsking i matematikk handler om at elevene leter etter mønstre, finner sammenhenger og diskuterer seg fram til en felles forståelse." (Udir) Denne aktiviteten gir god øvelse i dette. |
| 1 | løse ligninger og ulikheter gjennom logiske resonnementer og forklare hva det vil si at et tall er en løsning på en ligning |
| 1 | utforske og forklare sammenhenger mellom addisjon og subtraksjon og bruke det i hoderegning og problemløsing |
| 1 | Måle og sammenligne størrelser som gjelder lengde og areal, ved hjelp av ikke-standardiserte og standardiserte måleenheter, beskrive hvordan og samtale om resultatene. |
| 1 | Bruke ulike måleenheter for lengde og masse i praktiske situasjoner og begrunne valget av måleenhet. |
| 1 | Bruke ikke-standardiserte måleenheter for areal og volum i praktiske situasjoner og begrunne valget av måleenhet. |

**De 19 ubrukte D-merkelappene (0 opplegg — strykbare):**

- Beskrive og bruke plassverdisystemet for desimaltal, rekne med positive og negative heile tal, desimaltal, brøkar og prosent og plassere dei ulike storleikane på tallina.
- Beskrive ordklasser og deres funksjon.
- Bruke tallinje i rekning med positive og negative tal
- Finne og diskutere sentralmål og spreiingsmål i reelle datasett
- Finne samnemnar (bm.: fellesnevner) og utføre addisjon, subtraksjon og multiplikasjon av brøkar.
- Gje døme på ulike kulturelle symbol og gjere greie for kva vi meiner med omgrepa identitet og kultur.
- Kjenne att, eksperimentere med, beskrive og vidareføre strukturar i talmønster.
- Praktisere kildesortering og diskutere hvorfor kildesortering er viktig.
- Samhandle med andre gjennom lek, dramatisering, samtale og diskusjon.
- Telje til 100, dele opp og byggje mengder opp til 10, setje saman og dele opp tiargrupper opp til 100 og dele tosifra tal i tiarar og einarar.
- Utføre grunnleggende setningsanalyse og vise hvordan tekster er bygd opp ved hjelp av begreper fra gramatikk og tekstkunnskap.
- Utvikle og bruke varierte metodar for multiplikasjon og divisjon, bruke dei i praktiske situasjonar og bruke den vesle multiplikasjonstabellen i hovudrekning og i oppgåveløysing
- Utvikle og bruke varierte metodar for multiplikasjon og divisjon, bruke dei i praktiske situasjonar og bruke den vesle multiplikasjonstabellen i hovudrekning og i oppgåveløysing
- Utvikle, bruke og samtale om ulike reknemetodar for addisjon og subtraksjon av fleirsifra tal både i hovudet og på papiret
- Utvikle, bruke og samtale om ulike reknemetodar for addisjon og subtraksjon av fleirsifra tal både i hovudet og på papiret
- Vise forståelse for sammenhengen mellom språklyd og bokstav og mellom talespråk og skriftspråk
- bruke sammensatte regneuttrykk til å beskrive og utføre utregninger
- formulere og løse problemer fra sin egen hverdag som har med desimaltall, brøk og prosent å gjøre, og forklare egne tenkemåter
- utforske og forklare sammenhenger mellom de fire regneartene og bruke sammenhengene hensiktsmessig i utregninger

## 3) HOVEDTALLET — unike opplegg med minst ett utgått mål

**62 unike opplegg** (21.5 % av alle 289, 23.8 % av de med mål) har minst ett utgått mål. Nedbryting:

| Gruppe | Antall | Betydning |
|---|---:|---|
| Har også ≥1 sikkert gyldig mål (A) | 9 | Klarer seg — beholder ekte kobling |
| Ingen A, men ≥1 nært mål (B) | 28 | Kan trolig reddes med menneskeøye |
| Ingen A/B — kun utgått + C-overskrift | 23 | Mister reell kobling (bare «Etter X. trinn» igjen) |
| KUN utgåtte mål (bare D) | 2 | Mister ALT |
| **Sum** | **62** | |

- **Mister all reell læreplankobling** (verken A eller B igjen): **25** opplegg (23 har kun en trinn-overskrift igjen, 2 står helt uten).
- Merk: C-merkelappene er overskrifter som «Etter 4. trinn:», ikke ekte mål. Derfor teller de ikke som gyldig kobling her, selv om de teknisk er «ikke-D».

## 4) Bunke B (26 nære) og C (37 overskrifter) — hvor mange opplegg berøres?
- **B:** 53 opplegg har minst ett B-mål. B-merkelapper i bruk: 24 av 26 (ubrukt: 2).
- **C:** 254 opplegg har minst ett C-mål. C-merkelapper i bruk: 32 av 37 (ubrukt: 5).
- C berører nesten alt (254 av 289) fordi overskrifter som «Etter X. trinn:» er tagget på svært mange opplegg som om de var mål. Det er en opprydding i seg selv, men ikke et «utgått mål»-problem.

## 5) Fordeling per fag og trinn (for de 62 oppleggene med utgått mål)

**Fag** (et opplegg kan ha flere; 12 har mer enn ett, 0 mangler fag):

| Fag | Antall opplegg |
|---|---:|
| Matematikk | 61 |
| Aball 1 | 12 |
| Naturfag | 1 |

- Problemet er **samlet i Matematikk** (61 av 62), ikke spredt. «Aball 1» er et tverrfaglig program-tag som overlapper med matematikk-oppleggene.

**Trinn** (et opplegg kan spenne over flere):

| Trinn | Antall opplegg |
|---|---:|
| 2. trinn | 34 |
| 3. trinn | 31 |
| 4. trinn | 22 |
| 1. trinn | 19 |
| 8. trinn | 17 |
| 5. trinn | 14 |
| 6. trinn | 13 |
| 7. trinn | 10 |
| 9. trinn | 9 |
| 10. trinn | 3 |

- Spredt over hele grunnskolen, med tyngde på 1.–5. trinn.

## 6) Stikkprøve — 10 tilfeldige opplegg med utgått mål
*(seed=42 for reproduserbarhet. For at et menneske skal kunne vurdere om koblingen var meningsfull i utgangspunktet.)*

**Tiervenn stafett** (nid 7373, status 1) — fag: Aball 1, Matematikk; trinn: 1. trinn, 2. trinn
  - utgått mål: «Beskrive posisjonssystemet ved hjelp av ulike representasjonar.»
**Geometriske figurer i nærområdet** (nid 1019, status 1) — fag: Matematikk; trinn: 8. trinn, 9. trinn
  - utgått mål: «Beskrive, forklare og presentere strukturar og utviklingar i geometriske mønster og i talmønster.»
**Brøkbingo** (nid 1012, status 1) — fag: Matematikk; trinn: 8. trinn
  - utgått mål: «Utvikle og kommunisere strategiar for hovudrekning i utrekningar.»
**Bærtur med sortering** (nid 7406, status 1) — fag: Aball 1, Matematikk; trinn: 2. trinn, 3. trinn
  - utgått mål: «utforske og forklare sammenhenger mellom addisjon og subtraksjon og bruke det i hoderegning og problemløsing»
**Matteleken** (nid 1491, status 1) — fag: Matematikk; trinn: 3. trinn, 7. trinn
  - utgått mål: «Utvikle og bruke formålstenlege strategiar for subtraksjon i praktiske situasjonar.»
  - utgått mål: «Bruke samansette rekneuttrykk til å beskrive og utføre utrekningar.»
**Høyeste sum** (nid 1487, status 1) — fag: Matematikk; trinn: 1. trinn, 2. trinn, 3. trinn, 4. trinn
  - utgått mål: «Utforske multiplikasjon ved teljing.»
**Form en fasit** (nid 1486, status 1) — fag: Matematikk; trinn: 1. trinn, 2. trinn, 3. trinn, 4. trinn
  - utgått mål: «utforske og forklare sammenhenger mellom addisjon og subtraksjon og bruke det i hoderegning og problemløsing»
**Mr. Matematisk robotic ** (nid 1020, status 1) — fag: Matematikk; trinn: 8. trinn
  - utgått mål: «Utvikle og kommunisere strategiar for hovudrekning i utrekningar.»
**Plukk summen - Nattduellen (de fire regneartene)** (nid 14326, status 1) — fag: Matematikk; trinn: 2. trinn, 3. trinn, 4. trinn, 5. trinn
  - utgått mål: «utforske den kommutative og den assosiative egenskapen ved addisjon og bruke dette i hoderegning»
  - utgått mål: «Utforske og forklare sammenhenger mellom addisjon og subtraksjon og bruke det i hoderegning og problemløsing.»
  - utgått mål: «Utforske og forklare sammenhenger mellom de fire regneartene og bruke sammenhengene hensiktsmessig i utregninger.»
**Magiske figurer (ungdomsskole)** (nid 1018, status 1) — fag: Matematikk; trinn: 8. trinn, 9. trinn
  - utgått mål: «Utvikle og kommunisere strategiar for hovudrekning i utrekningar.»
  - utgått mål: «Beskrive, forklare og presentere strukturar og utviklingar i geometriske mønster og i talmønster.»

> Vurdering: stikkprøven viser ekte matematikk-opplegg koblet til reelle mål fra LK06. Koblingen var meningsfull — målene er ikke feil, de er *erstattet* i Fagfornyelsen 2020. Jobben er altså å finne LK20-erstatteren, ikke å bygge kobling fra bunnen.

## Leveranse
- `data/analyse/UTGAATTE-MAAL-OMFANG.md` — denne rapporten.
- `data/analyse/utgaatte-maal-per-opplegg.csv` — ett rad per opplegg med ≥1 utgått mål (nid, tittel, fag, trinn, antall mål per bunke, om det kun har utgåtte, og de utgåtte målene ordrett).

## Forbehold
- «Gyldig» = bunke A (bekreftet LK20-treff). B er *ikke* talt som gyldig fordi den ennå ikke er verifisert av et menneske — derfor står de 28 B-oppleggene som «kan reddes», ikke «klarer seg».
- Tellingen er over alle 289 opplegg (inkl. 9 upubliserte). Status står i CSV-en så de kan filtreres bort ved behov.