# BESLUTNINGER TIL FREMDRIFTSPLAN v33

Svar fra Kjartan på de fem spørsmålene i `FUNN-v8-v30.md` §5.
Hver beslutning skal inn i v33 med kilde og dato, og i endringsloggen v32 → v33.

**Fast regel, gjentatt 6. august:** planen skrives alltid i samme form og
layout som forrige versjon. Den kortes aldri ned. Ingenting fjernes uten at
det står i endringsloggen hva som ble fjernet og hvorfor.

---

## Spørsmål 1 — Tilgangsstyring på kursholderkalenderen

**BESLUTTET 6. august: alternativ 1 — behold regelen, skyv modulen.**

Kravet som ble borte i v30, og som skal tilbake i v33:

> «Kursholder logger inn og ser kun egne kurs **med all relevant info**.
> **Sensitiv info (deltakerliste, betaling, instruksjoner) kun synlig for
> kursholder og admin.** Valgfri Google Kalender-synk.»
> — ordrett fra v29 §9.8. Sto i planen fra v11 (11. juni) til v29 (5. juli).

**Slik skal det inn i v33:**

- Seksjon 9.9 «Kurskalender for kursholdere» beholdes som «mulig senere».
- Setningen om sensitiv info legges tilbake ordrett, med tillegget
  **«gjelder når modulen bygges»**.
- Modulen plasseres i **bøtte 3 — kan trygt komme ETTER lansering**
  (seksjon 46.3).
- Endringsloggen v32 → v33 skal si: «Tilgangsstyring på
  kursholderkalenderen lagt tilbake. Sto i v11–v29, forsvant i v30.»

**Begrunnelsen, kort:** mange kursholdere er eksterne (17 importert). De
trenger dato, hall, skolenavn, oppmøtetid og antall — ikke deltakerlister
med navn eller hva skolen betaler. Tilgangsstyring må ligge i datamodellen
fra start; den er dyr å ettermontere.

**Kontrollert 6. august:** ingen risiko i dag. Det finnes ingen rolle
`kursholder` i koden — rollene er superadmin, ansatt, skoleadmin,
skoleansatt og feide. De 17 eksterne kursholderne er rader i et register,
uten innlogging. Kravet gjelder utelukkende en modul som ennå ikke finnes.

---

## Spørsmål 2 — Den tekniske Fase 3-designen

**BESLUTTET 6. august: alternativ 1 — ta vare på skissen fra juni som
dokumentert grunnlag, og avgjør rekkefølgen før bygging.**

**I TILLEGG, etter forslag fra Kjartan:** Edalio-funnene som gjelder
oppbyggingen skal stå SAMMEN med juni-skissen, ikke 25 seksjoner unna.

Teksten som skal tilbake i v33 §14.1, ordrett fra v29:

> «Modus A — strukturert søk … Teknisk: tabell `ressurser` med filterfelt
> + rating → muliggjør «Månedens/Ukas lek» på forsiden.
> Modus B — Trivselsboten … Teknisk: tabell `innhold_biter` med pgvector
> (RAG — søk på mening), Edge Function, kildekort, hybrid søk.»

Og hele blokken «Kartleggingsfunn som styrer arkitekturen» med tallene:
Move it er 126 av 869 leker; aktiv læring trenger egen datamodell
(kompetansemål per trinn); fil + dokument + kobling må migreres i én
operasjon; lek, hjul og periodeplan skal henge sammen.

**Merknad som skal stå ved teksten:** «Skrevet 11.–15. juni 2026. Ikke
vurdert opp mot Edalio-kartleggingen av 1. august. Se 14.x.»

**Ny underseksjon i v33 §14:** «Hva Edalio lærte oss om oppbyggingen» —
henter de fire funnene fra seksjon 47.1 som må avgjøres FØR bygging, med
krysshenvisning. **Seksjon 47 beholdes uendret** — ingenting flyttes bort
derfra, det speiles.

**Nytt åpent punkt til seksjon 36:** avgjør rekkefølgen på ordsøk
(fulltekstsøk) og meningssøk før byggingen av Fase 3 starter.

**Fire valg som må tas før bygging** (fra 47.1, fordi de ligger i
datamodellen og er dyre å ettermontere):
1. Fulltekstsøk fra dag én (nr. 2 — Edalios største anger)
2. Instruktørnotat som eget felt, ikke fritekst (nr. 4)
3. Flertrinns-tagging i datamodellen med en gang (nr. 5)
4. Hendelseslogging fra første utrulling (nr. 9)

**Språkregel bekreftet 6. august:** der planen sier noe teknisk, skal det
stå en linje ved siden av på vanlig norsk om hva det betyr i praksis.
Følger av CLAUDE.md: «Kjartan er IKKE utvikler.» Skal inn som egen
arbeidsregel i v33 seksjon 3.

## Spørsmål 3 — Bruksanvisning og tilbakerulling

**BESLUTTET 6. august: alternativ 2 — legg tilbake, og flytt hverdagsarket
fram til «må til pilot».**

Teksten som skal tilbake, ordrett fra v29 §23.4 (sto i v8–v29):

> «Staging-miljø: teste endringer før de går live. **Bruksanvisning: endre
> innhold, teste på staging, rulle tilbake.**»

**Slik skal det inn i v33:**

- Kravet deles i to, fordi det er to ulike behov som var slått sammen:
  - **Hverdagsarket** — én side for de ansatte: slik endrer du en tekst,
    slik ser du resultatet før du sender, slik får du tilbake det som sto
    der før. **Til bøtte 1 — må til pilot.** Begrunnelse: «Tekster og
    maler» ble bygget 4. august, så de ansatte redigerer allerede i dag.
    Behovet er der nå, ikke ved lansering.
  - **Overleveringen** — seksjon 23.5 «Drift etter Kjartan» blir stående
    som den er. Den handler om hvem som overtar teknisk ansvar, ikke om
    tirsdag formiddag.
- **Tilbakerulling** hører til hverdagsarket. Ordet finnes ikke i v31 i
  det hele tatt — kontrollert i alle 55 sider.
- **Presiseres i v33 §23.4:** testsiden `trivselsleder-ny.vercel.app` ER
  staging-miljøet i dag. Det finnes ingen egen staging-oppsett i
  prosjektet. Planen skal si det som er, ikke love et miljø som ikke er
  satt opp.

Begrunnelsen, kort: prinsippet «uavhengig av én person» (seksjon 3) er
ikke sant uten et skrevet ark. Uten det er svaret på «hvordan endrer jeg
dette?» fortsatt «spør Kjartan».

---

## Spørsmål 3b — Utviklingsmiljø etter lansering (NY, kom fra Kjartan 6. august)

Kjartan spurte: må vi ikke fortsatt ha en test- eller utviklingsside etter
lansering, så en ny modul (trivselsundersøkelsen, Stripe-tjeneste) kan
bygges i ro og fred uavhengig av den live siden?

**Svar: ja. Skal inn som EGEN seksjon i v33 — «Utviklingsmiljø etter
lansering» — ikke som en linje inni lanseringskapittelet.**

Tre nivåer:

| Nivå | Hva | Når |
|---|---|---|
| 1 | Egen arbeidsgren i koden. Vercel gir hver gren sin egen adresse automatisk. Databasen deles fortsatt — duger til skjermbilder, ikke til noe som skriver data. | Kan tas i bruk ved behov. Ingen forberedelse, ingen kostnad. Prosjektet har i dag bare én gren (`main`). |
| 2 | **Egen testdatabase** — eget Supabase-prosjekt. Helt frikoblet fra ekte skoledata. Dette er målet. | Før første modul bygges ETTER lansering. Ikke før lansering. Koster ekstra per måned. |
| 3 | Kopi med anonymiserte data. Mest realistisk testing, mer arbeid, personvernhensyn. | Vurderes senere. |

**FORUTSETNING — eget punkt i v33, frist FØR DEN STORE DATAIMPORTEN:**
skriv ferdig oppskriften på databasen (`supabase/migrations`).

Funnet 6. august: mappa har seksten filer, 001–016, men den **stopper i
juni**. Ingen av kursplanleggerens tabeller står der — `kurs`,
`kurs_skole`, `kurs_skole_mottaker`, `innstillinger`, `haller`,
`kursholdere`, `evalueringer`. Av åtte RPC-er appen kaller, er to skrevet
ned. Resten finnes bare inne i Supabase.

Konsekvens: **databasen kan i dag ikke bygges opp igjen fra
prosjektfilene.** Dermed kan heller ingen testdatabase lages.

Presisering om hvorfor fristen er dataimporten og ikke lansering:
katastrofetilfellet er allerede dekket av Supabase Pro daglige backups
(v31 §42, «allerede på plass») — en slik sikkerhetskopi henter tilbake
både struktur og innhold. Oppskriften trengs til to andre ting: å lage
testdatabase nummer to, og å vise en ny person hvordan systemet er bygget
(prinsippet «uavhengig av én person»). Fristen er praktisk: nå inneholder
basen testdata, så oppskriften kan bevises ved å bygge en kopi og
sammenligne. Etter importen av 2 456 rektorer og ekte skolesvar er samme
øvelse tyngre og mer risikabel. Og oppskriften vokser for hver nye tabell.

## Spørsmål 4 — Tripletex og økonomi på skolekortet

**BESLUTTET 6. august: legg tilbake begge, som punkt etter lansering.
Tanken og detaljrikdommen i forslagene skal beholdes — ikke kortes ned til
en stikkordslinje.**

Teksten som skal tilbake, ordrett fra v17 §Fase 2b (Kontraktinfo sto fra
v9, 10. juni):

> «Fase 2b · Ledelsesdashboard og integrasjoner. Mål: økonomioversikt og
> automatisering — bygges etter lansering.
> ■ Kontraktinfo fra HubSpot på skolekort: **startdato, årsbeløp, periode**.
> ■ **Tripletex-integrasjon: ny skole opprettes automatisk som kunde via API.**
> ■ Ledelsesdashboard (Tommy/Kjartan): kontraktsverdi, geografi, churn, vekst.»

**Slik skal det inn i v33:**

- Tripletex-linjen inn i §6.3 ved siden av HubSpot-tvillingen, som **P3 —
  etter lansering**. I dag står HubSpot-halvparten («Ny skole godkjennes →
  opprettes automatisk som Company», P2) mens Tripletex-halvparten er
  borte. Det ser ut som en forglemmelse, ikke en beslutning.
- **De tre feltnavnene inn igjen:** startdato, årsbeløp, kontraktsperiode.
  v31 sier bare «kontraktinfo». Samme type tap som hallregisterets
  «adresse» og «pris».
- Tidspunktet endres ikke. Dette sto som «bygges etter lansering» allerede
  i juni og står som P3 i v31.

**Kontrollert 6. august:** ingenting av dette er bygget. Ingen
Tripletex-kobling i koden, ingen kontraktfelter på skolekortet.

### STRØKET 6. august — kursbagger og utstyrsbestilling

v31 §49.2 sa:

> «Kursbagger og utstyrsbestilling er en RA-oppgave som ikke er dekket noe
> sted i fremdriftsplanen. Det kan være bevisst (håndteres i
> Tripletex/manuelt), men det bør avklares.»

**Kjartans avgjørelse: strykes. Har ingenting med nettsiden å gjøre.**
Håndteres i Tripletex/manuelt. Punktet fjernes fra v33 og skal stå i
endringsloggen som bevisst strøket 6. august — ikke som noe som forsvant.

---

## Spørsmål 5b — Kortutdelingen, hele flyten (bekreftet av Kjartan 6. august)

Kjartan gjentok flyten for å sikre felles forståelse. Den stemmer ordrett
med konsept v1 §11, og er dermed spesifikasjonen. **Godkjent: «vi bygger
det slik.»**

**Flyten:**

1. Skolen svarer at de kommer med f.eks. **15 trivselsledere**.
2. Systemet beregner **antall TL + 10 %, rundet opp = 17 kort**.
   Kontrollert mot koden: `Math.ceil(15 × 1,1)` = 17
   (`AdminKortutdeling.jsx:13`).
3. **Skolen ser aldri tallet** — verken i svarskjemaet eller på
   kursinformasjonssiden. Det er en intern beskjed.
4. Tallet kan endre seg til **kursdagen**, da fryses det (spørsmål 5).
5. Camilla får raden i **sin egen liste under kulturkortbestillinger**.
6. **Camilla bestemmer**: fakturer / gratis / ikke ønsket. Systemet
   fakturerer aldri av seg selv. Husregelen «systemet foreslår, mennesket
   bestemmer» gjelder her.
7. Kursholder ser samme tall på kursdagen og deler ut.

**TRE TING PROTOTYPEN IKKE HAR, som følger av flyten over:**

**1. Plasseringen — to faner på ÉN side.** I dag er dette to atskilte
sider i admin-menyen: «Kulturkort-bestillinger» (`/admin/bestillinger`) og
«Kortutdeling (fra kurspåmelding)» (`/admin/kortutdeling`). Konsept v1 sa
to faner på samme side, som Camilla veksler mellom — slik Kjartan
beskriver det. Merk at menyteksten på bestillingssiden allerede sier «Se
bestillinger **og kortutdeling** fra skoler» (`Admin.jsx:42`). Meningen
var der; byggingen havnet et annet sted.

**2. Statusen «ikke ønsket» mangler.** Prototypen har tre:
`['Ikke behandlet', 'Fakturer', 'Gratis']` (`AdminKortutdeling.jsx:9`).
Konsept v1 hadde fire: fakturer / gratis / **ikke ønsket** / behandlet.
Kjartan bekrefter at noen skoler «faktisk ikke ønsker kort» — da må det
fjerde valget finnes. «Gratis» er noe annet.

**3. Kryssjekken mot forhåndsbestillinger.** Camillas eget hovedkrav fra
e-postene i juni: en skole som allerede har bestilt kort på hjemmesiden
skal ikke få kort to ganger. I dag må hun oppdage det ved å sammenligne to
lister manuelt. Systemet vet begge deler.

**Konsekvens:** kortutdelingen går fra «prototype i drift» til en
spesifisert modul. Skal inn i v33 §9.7 med hele flyten over, og ut av
listen over uavklarte punkter.

---

## EKSTRA — hva bør bygges NÅ for å gjøre ledelsesdashboardet lettere senere

Kjartan vil vente med dashboardet, men ba om beskjed hvis noe bør på plass
i forkant. **Svaret er ja, og det gjelder tre ting.** Alle er billige nå og
umulige å hente inn igjen senere.

Prinsippet: **et dashboard er bygget på historikk. Historikk kan ikke lages
i ettertid.** Registreres ikke en hendelse når den skjer, finnes tallet
aldri. Dette er nøyaktig Edalios punkt 9 i seksjon 47.1:
«HENDELSESLOGGING fra første deploy — Edalio utsatte dette og står nå uten
grunnlag for gratis/Pro-beslutninger.»

**1. Statushistorikk for skoler — det viktigste.**
I dag overskrives statusfeltet (`.update({ status: 'Inaktiv' })` i
`api/admin/avvis-paamelding.js:65`). Går en skole fra Aktiv til Oppsagt,
finnes bare den nye verdien. Datoen og den forrige tilstanden er borte.
Uten dette kan et dashboard aldri vise vekst eller frafall over tid — det
kan bare vise hvordan det ser ut i dag.
Løsning: én liten tabell som skriver en rad hver gang status endres
(skole, fra, til, dato, hvem).

**2. Churn-signalene lagres ikke.**
`hent_churn_oversikt` regner ut signalene fra dagens data hver gang siden
åpnes. Det finnes ingen historikk. Spørsmålet «hvor mange frafallsvarsler
hadde vi i september mot november?» kan aldri besvares for fortiden.
Løsning: lagre en rad når et signal utløses, ikke bare vis det.

**3. Bevar det som allerede logges.**
`brukslogg` og `epost_logg` finnes og er grunnmuren. De må ikke tømmes ved
opprydding før lansering — testdata kan slettes, men tabellene og rutinen
skal bestå. Merk at `brukslogg` kun logger innloggede brukere
(`useBrukslogg.js`: `if (!bruker?.id) return`), så skolers svar via
token-lenke havner ikke der.

**Det som IKKE haster:** selve dashboardet, utseendet, HubSpot-koblingen og
kontraktverdiene. Kontraktdata bor i HubSpot og kan hentes når som helst.
Det som er i fare, er data som bare finnes i deres egen base — og som
overskrives.

## Spørsmål 5 — Når fryses kortantallet

**BESLUTTET 6. august: kortantallet fryses på kursdagen.**

Dermed er det eldste åpne spørsmålet i materialet besvart. Det ble stilt
i konsept v1 §11 den 15. juni og gjentatt i fremdriftsplan v15, v16 og
v17 — **49 dager ubesvart.**

Spørsmålet lød:

> «Å avklare (Kjartan / Camilla): når skal kortantallet «fryses»? Hvis en
> skole justerer antallet sent, endrer tallet seg helt frem til kursdagen.
> Mulig løsning: lås tallet noen dager før kurset, eller vis «sist
> oppdatert».»

**Svar: kursdagen.**

**Konsekvens for byggingen — må stå i v33:**

I dag lagres ikke kortantallet i det hele tatt. `antall_kort` har **null
kodetreff** i `src/`, `api/` og `sql/` — tallet regnes ut på skjermen hver
gang siden åpnes (`AdminKortutdeling.jsx:13`,
`Math.ceil(antallTl * 1.1)`). Et tall som regnes ut på nytt hver gang kan
per definisjon ikke fryses.

Frysing krever derfor tre ting:
1. Kortantallet **lagres** som en verdi på kurs_skole-raden, ikke bare
   regnes ut.
2. Et tidsstempel for når det ble frosset.
3. En regel: etter frysetidspunktet endrer ikke tallet seg selv om skolen
   justerer antall trivselsledere.

**AVKLART 6. august:** frysing skjer **ved midnatt når kursdagen begynner
(00:00)**. Kjartan bekrefter at kortene ikke pakkes per skole på forhånd:
kursholder reiser med flere hundre kort og deler ut fortløpende på kursene
underveis. Det finnes derfor ingen pakkejobb som må ha tallet tidligere.
Lista er klar når kursholder våkner på kursdagen.

Merk at tallet er en intern beskjed. Skolen ser det aldri, verken i
skjemaet eller på kursinformasjonssiden (avklart 4. august). Frysing gir
derfor ingen kommunikasjonsutfordring mot skolene.


---

## SPØRSMÅL 6 — Oversikt i kursplanleggeren (reist av Kjartan 6. august)

Kjartan spurte om tre ting han ikke husket om var ivaretatt. **Kontrollert
i koden 6. august: ingen av dem er det.**

### Slik er det i dag

`AdminKursplanlegger.jsx:112` henter **alle** kurs:
`supabase.from('kurs').select('*').order('dato').range(0, 9999)` — ingen
begrensning på RA, sortert på dato, opptil 10 000 rader på én side.

| Spørsmål | Svar |
|---|---|
| Kan alle RA se og endre hverandres kurs? | **Ja.** Hver rad har Skoler · Se svar · Send lenker · Kopier · Rediger · **Slett** for alle innloggede ansatte. Ingen angreknapp. |
| Får RA rask oversikt over egne kurs? | **Nei.** Lista har en RA-kolonne (`:246`), men ingen filtrering, intet søk, ingen «mine kurs». |
| Blir lista uendelig lang? | **Ja.** Ingen sideinndeling, ingen sesongvalg, ingen eksport. ~150 kurs/år. Over tabellen står bare knappen «+ Nytt kurs». |

Full tilgang er i tråd med planen («alle ansatte kan endre ethvert kurs,
også på tvers av område»). Men planen har også RA-enes eget ønske om
**filter per område**, ført som uavklart punkt. Begge kan være riktige:
full tilgang, filtrert visning som standard.

**Nyttig detalj:** feltet `kurs.sesong` finnes allerede i datamodellen,
men har aldri fått en inntastingsrubrikk (`AdminKursplanlegger.jsx:31` er
eneste treff — kun i standardobjektet). Det står som «død kolonne» i
rettelista. Får sesongen en rubrikk, løses halve problemet: lista viser
inneværende sesong som standard.

### BESLUTTET 6. august: alle fire punktene inn i v33, i hver sin bøtte

| # | Tiltak | Bøtte |
|---|---|---|
| 1 | **Filterrad over kurslista** — nedtrekk for RA, sesong og nettverk, pluss søkefelt på kursnavn og hall. Krever at `sesong` får en rubrikk. | **Bøtte 1 — må til pilot** |
| 2 | **Eksport til regneark** fra kursoversikten. Lovet i konsept v1 §5 («CSV/Excel … ikke lenger kilden, bare en utskrift»), aldri bygget. | **Bøtte 1 — må til pilot** |
| 3 | **«Mine kurs» som standardvisning**, med bryter for «vis alle». Tas sammen med opprydding av RA-feltet: `ra` er i dag fritekst (`:637`), ikke en kobling til brukerkontoen — skrives navnet ulikt to steder, treffer ikke filteret. | **Bøtte 2 — må til lansering** |
| 4 | **Kalendervisning.** Planen har hele veien sagt «liste **eller kalender**» (konsept v1 §5). Kalenderen er aldri bygget. | **Bøtte 3 — kan komme etter lansering** |

---

## ALLE FEM SPØRSMÅL ER BESVART 6. AUGUST

Pluss to saker Kjartan reiste selv: utviklingsmiljø etter lansering
(spørsmål 3b) og oversikt i kursplanleggeren (spørsmål 6).

Neste steg: bygge **FREMDRIFTSPLAN v33** med v32 som mal.

Faste regler for v33, bekreftet av Kjartan 6. august:

1. **Samme form og layout som forrige versjon.** Forside, topptekst,
   bunntekst, oransje overskrifter, innholdsfortegnelse.
2. **Planen kortes aldri ned.** Alt fra v32 med videre, ordrett.
3. **Ingenting fjernes uten at det står i endringsloggen** hva som ble
   fjernet og hvorfor. Gjelder også kursbagger-punktet, som er strøket
   bevisst.
4. **Språkregel (fra CLAUDE.md):** der planen sier noe teknisk, skal det
   stå en linje ved siden av på vanlig norsk om hva det betyr i praksis.
   Eieren av planen skal kunne lese sin egen plan.
5. Endringslogg v32 → v33 øverst, i samme form som 0.1 i v31/v32.
