# TESTOPPDRAG — full loop-test mot FREMDRIFTSPLAN-v32

Skrevet 5. august 2026. Kontrollert av en uavhengig agent samme dag, som
felte seks påstander. Denne utgaven er den rettede — se «Om dette
dokumentet» nederst.

Dette er oppdragsteksten som limes inn til testagenten. Fasiten er
`FREMDRIFTSPLAN-v32.md`; denne filen gjør fasiten om til punkter som kan
hukes av.

---

## RAMMER — gjelder hele oppdraget, og går foran alt annet

- Du opererer **KUN** på `https://trivselsleder-ny.vercel.app`.
- Du skal **ALDRI** besøke, logge inn på eller endre noe på
  `trivselsleder.no`.
- **Ingen direkte databasetilgang.** Ikke SQL i Supabase, og heller ikke
  curl eller fetch mot PostgREST med service-nøkkelen. Du skal se
  systemet slik en bruker ser det. Eneste unntak er punkt 31–32, som er
  eksplisitt beskrevet der.
- **Dette overstyrer `TESTFASIT-blokkA.md`.** Den fasiten pålegger
  agenten å bruke service-nøkkelen fra `.env.local` og å skru av
  nødbremsen når et punkt krever ekte e-post. **Begge deler gjelder
  ikke her.** Du henvises til TESTFASIT-blokkA kun for detaljer om hva
  blokk A skal gjøre, ikke for arbeidsmåte.
- Nødbremsen `motor_aktiv` står på `'nei'`. **Du skal ikke skru den av.**
- **VIKTIG: nødbremsen dekker bare `api/kurs/*`.** Påmeldingsskjemaet,
  godkjenning av påmelding, opprett skole, inviter bruker og
  glemt-passord sender **ekte e-post** uten noen brems. Påmelding
  oppretter i tillegg et **selskap i HubSpot**. Bruk disse med varsomhet,
  og alltid med `(agenttest)` i navnet.
- Enhver skole du oppretter skal ha `(agenttest)` i navnet og en
  e-postadresse på formen `kjartan+…@trivselsleder.no`. **Ingen ekte
  skole skal røres.**
- Rapporter det du **ser**, ikke det du **antar**. Hvert funn skal ha
  fil og linjenummer, skjermbilde, eller et kall med svar. Klarer du
  ikke å vise det, skriv «KAN IKKE BEKREFTES» i stedet for å gjette.
- Er du usikker på om noe er en feil eller en bevisst avgrensning: sjekk
  listen «KJENT OG BEVISST» nederst før du melder det.
- **Merk:** en cron-jobb kjører evalueringsutsendingen **hver time**
  (`vercel.json`). Ser du evalueringsrader endre seg av seg selv, er det
  den — ikke en feil.

---

## FØR DU BEGYNNER — fire forkontroller

**0a. Er sikkerhetsrettingen rullet ut?**
Åpne `https://trivselsleder-ny.vercel.app/api/kurs/hvem-star-for-tur`
i et vindu der du **ikke** er innlogget.
- `{"error":"Ikke autentisert."}` → rettingen er ute.
- En liste med skoler og e-postadresser → rettingen er **ikke** ute.
  Noter som **PUNKT 0, ÅPENT**. Det endrer punkt 29 — se der.

**0b. Er `eivind_epost` utfylt?**
Logg inn som superadmin, gå til Tekster og maler. Står feltet
`eivind_epost` tomt, **blokkerer det både punkt 16 og punkt 27**
(`AdminTekster.jsx:232` gjør tom adresse til en hard feil som stanser
all lagring på siden). Er den tom: noter det, og hopp over 16 og 27.

**0c. Sett opp testkurset før du begynner på del 1.**
Opprett ett kurs med **oppmøte vertskap** og **oppmøte øvrige** utfylt
med to ulike klokkeslett, og sjekk at vertskapsnotatet i Tekster og
maler ikke er tomt. Uten dette viser punkt 26 likt for begge skoler, og
du vil melde en feil som ikke finnes.

**0d. Har du fått innlogging til en skolebruker?**
Punkt 30–32 krever det, og du kan **ikke** lage en selv — se der.

---

## DEL 1 — DET SOM ALDRI ER KJØRT (v32 §2.2)

Dette er hovedsaken. Alle disse har stått som «Ferdig» siden 18. juni
uten at noen har sett dem virke.

### Opprett og endre kurs (Steg 1)
1. Opprett et nytt kurs med alle felt utfylt. Lagres det, og vises det i
   kursoversikten med riktige verdier?
2. Fyller skjemaet ut RA, uke, klokkeslett og kursnavn automatisk når du
   velger nettverk og hall? v2 kaller dette «Smart skjema:
   nettverk/hall-velger, auto-RA/uke/tid/navn».
3. `maks_antall`. Feltet **finnes** i kursskjemaet
   (`AdminKursplanlegger.jsx:711`) — det er ikke det som skal
   kontrolleres. Spørsmålet er: dukker verdien opp **noe annet sted**
   etterpå? Se i kursoversikten, på kurskortet og der skoler kobles til.
   v32 §1.3 påstår at den ikke gjør det, og at den ikke brukes til noen
   kapasitetssperre. Bekreft eller motbevis.
4. Rediger kurset. Består endringen etter at du laster siden på nytt?
5. Slett et kurs som har skoler koblet til seg. Hva skjer med
   `kurs_skole`-radene? Beskriv nøyaktig hva du ser.
6. Bruk knappen **«Kopier»** i kursoversikten (den heter ikke «Kopier
   kurs»). v32 §1.2 påstår at den dupliserer ÉN kursrad, med samme dato
   og uten skoler.
   - Dette **kan** du se: at det kommer én ny rad, at «Dato» er lik, og
     at kolonnen «Skoler» står på 0.
   - Dette kan du **ikke** se: om `sesong` følger med. Feltet har ingen
     inputrute og vises ingen steder i grensesnittet. Skriv «KAN IKKE
     BEKREFTES» på den delen — ikke gjett.

### Koble skoler (Steg 2)
7. Koble skoler fra et nettverk til kurset.
8. Bruk **unntakssøket**: finn en aktiv skole som IKKE hører til
   nettverket, og koble den til kurset. Dette er retest-funn B, som v32
   §2.3 påstår er lukket. Merk at søket krever minst 2 tegn, matcher kun
   navn (ikke kommune), og viser maks 20 treff — det er ikke feil.
9. Koble til flere skoler samtidig. Sjekk at ingen dublett oppstår.

### Hallregisteret
10. Søk, rediger, slett og masseslett i hallregisteret.
11. Åpne redigeringsskjemaet for en hall. Feltene **Adresse** og **Pris**
    skal finnes der (`AdminHaller.jsx:311` og `:313`). To spørsmål:
    - Er de **utfylt** for de importerte hallene, eller står de tomme?
      v32 §3.1 påstår at kildefila aldri hadde dem.
    - Vises de i **tabellista**, eller bare når man åpner en rad?
      Tabellen skal etter koden vise bare Navn, Kommune og Nettverk.
12. Velg en hall på et kurs. Hentes hallens opplysninger automatisk inn?

### Kursholderregisteret
13. Opprett, rediger og deaktiver en kursholder. Kobles kursholder og
    backup riktig på kurset?

### Evalueringsmodulen
14. Gå til Evaluering i admin og **velg et kurs i nedtrekkslista**. Det
    er selve valget som utløser `forbered_evalueringer` — det finnes
    ingen egen knapp. Bruk et kurs der en testskole har svart ja og
    kursdatoen har passert (datofeltet godtar datoer bakover i tid —
    sett den bakover med vilje).
15. Åpne evalueringsskjemaet via skolens lenke. Virker den betingede
    logikken (ulike spørsmål ut fra svar)?
16. Kryss av for kjøpsinteresse og send.
    **Vær forberedt på at du ikke ser noe:** skjemaet kaller
    `varsle-eivind` uten å vente på svaret (`EvalueringSkjema.jsx:163`),
    så både 409 og 500 er usynlige i grensesnittet. Åpne nettverksfanen.
    Er `eivind_epost` tom, får du **500** («Mangler eivind_epost»), ikke
    409 — den sjekken ligger før nødbremsen. Er den utfylt, skal du få
    **409** fra nødbremsen. Uansett skal **svaret være lagret** og
    kjøpsinteressen synlig i admin. Bekreft lagringen.
17. Åpne admin-oversikten over evalueringer. Virker CSV-eksporten?
18. Rediger et **evalueringsspørsmål** og en **pakke** i admin, og sjekk
    at endringen slår ut i skjemaet skolen ser. Dette er
    «evalueringsmodulen utover selve utsendingen», og er aldri kjørt.

### Ledelse-siden og churn
19. Åpne Ledelse-siden. Vises churn-signaler, og stemmer de med
    testdataene?
20. Legg til og slett et signalord. Slår endringen ut i oversikten?
21. Finn ut om siden viser **svarprosent på tvers av RA-ene** (v1 nevner
    «54–67 % per RA») og **status per region**.
    **Ikke forveksle** med det som faktisk står der: «Andel av svar %»
    (`AdminLedelse.jsx:108`) er andelen *flaggede* av alle svar, ikke
    responsrate. «Fordeling på nettverk» (`:120`) teller bare flaggede
    rader, og nettverk er ikke det samme som region. v32 §3.2 påstår at
    begge de etterspurte manglene er reelle. Bekreft eller motbevis.

### Datamodellen
22. v32 §2.5 påstår at disse **skrives, men vises aldri**:
    `kurs_skole.svart_dato` (RA ser ikke NÅR skolen svarte),
    `kurs_skole_mottaker.apnet_at`, `evalueringer.svart_tidspunkt`.
    Let etter dem i grensesnittet. Finner du dem, er v32 feil.

---

## DEL 2 — REGRESJON PÅ BLOKK A (v32 §2.1)

Stikkprøver. Full fasit finnes i `TESTFASIT-blokkA.md` — men husk at
arbeidsmåten der ikke gjelder, se Rammer.

23. Skolens svarskjema via token: betinget logikk (ja gir antall +
    kommentar, nei gir årsak + «åpen for annet kurs»).
24. Antall trivselsledere er **valgfritt** — tomt felt skal lagres som
    tomt, ikke som 0. Vises som «—».
25. RA registrerer svar på vegne av skolen. «Registrert av …» vises, og
    skolen faller ut av purrekøen.
26. Flytt en skole til et annet kurs.
    **Forutsetning:** knappen «Flytt til annet kurs» vises **kun** på
    skoler som har svart «Kommer ikke» (`SvarOversikt.jsx:293`). Sett
    svaret først. Bruk en skole som allerede har fått invitasjon, så du
    kan se at alle fem sendt-stempler nullstilles og banneret kommer.
27. Vertskap: RA huker av, oppmøtetid følger `er_vertskap`, nei-svar gir
    rødt varsel. Ta også med: fjern vertskapsflagget fra en skole som
    allerede har svart — svaret skal ikke endre seg av seg selv.
28. Kursinformasjonssiden `/kursinfo/:token`: to skoler på samme kurs —
    én vertskap, én øvrig — skal vise ulik oppmøtetid, og bare
    vertskapet skal se vertskapsnotatet. Krever forkontroll 0c.
    (Oppmøtetiden velges inne i RPC-en `hent_kursinfo_via_token`, som
    ikke ligger i repoet — du kan bare se resultatet, ikke koden.)
29. Tekster og maler: endre en tekst, lagre, og se at endringen slår ut
    i en tørrkjøring. Prøv å lagre en **tom** mal — skal nektes. Sjekk
    også at en tom mal ville **avbrutt utsendingen**, ikke bare
    lagringen.
30. Tørrkjøringssvaret: **ingen synlige `{plassholdere}`** skal stå
    igjen i teksten, og linjer med tom plassholder skal være helt borte.
    Dette er en av de tyngste reglene i systemet.
31. Nødbremsen skal svare 409 på **alle fire** sendeendepunkt.
32. Dobbeltsendingsvern. **Merk:** du får ikke fremprovosert dette på et
    nytt kurs — nødbremsen svarer 409 før noe stemples, og en tørrkjøring
    setter aldri `forste_utsending_at`. Bruk et **eksisterende** kurs der
    invitasjon allerede er sendt, og kjør en tørrkjøring. Da skal den si
    «allerede sendt».

---

## DEL 3 — TILGANG OG SIKKERHET

33. Uten innlogging, prøv disse. **Bruk riktig metode** — flere er
    POST-only og svarer 405, ikke 401, på et vanlig nettleserkall:

    | Endepunkt | Metode |
    |---|---|
    | `/api/admin/koble-skole-kurs` | GET eller POST |
    | `/api/admin/opprett-skole` | POST (tom kropp) |
    | `/api/admin/godkjenn-paamelding` | POST (tom kropp) |
    | `/api/admin/avvis-paamelding` | POST (tom kropp) |
    | `/api/admin/sett-nettverk` | POST (tom kropp) |
    | `/api/kurs/hvem-star-for-tur` | GET |
    | `/api/kurs/send-invitasjon` | POST (tom kropp) |
    | `/api/kurs/send-oppfolging` | POST (tom kropp) |
    | `/api/kurs/send-evaluering` | GET |

    Alle skal svare **401**.
    **Unntak hvis punkt 0a viste at rettingen ikke er rullet ut:** da
    gjelder kravet bare de fem `api/admin/*`-endepunktene. De fire
    `api/kurs/*` vil da svare 200, og det er selve funnet.
    Merk også at `send-evaluering` slipper gjennom et gyldig
    `Authorization: Bearer <CRON_SECRET>` — får du 200 med et slikt
    hode, er det riktig oppførsel.

34. **Krever innlogging til en skolebruker.** Du kan ikke lage en selv:
    det finnes ingen selvregistrering (`signUp` har null treff i `src/`),
    og invitasjonslenken sendes på e-post uten å bli returnert i
    API-svaret. **Er innlogging ikke oppgitt i oppdraget, hopp over
    34–36 og meld dem som IKKE TESTET.**
    Logg inn som skolebrukeren og prøv å åpne `/admin`,
    `/admin/kursplanlegger` og `/admin/ledelse`. Alle skal avvise.
35. Som samme skolebruker: kall `flytt_skole_til_kurs`. Skal nektes.
    Hullet ble lukket 4. august — bekreft at det holder.
    **Unntak fra regelen om direkte databasetilgang:** her SKAL du kalle
    RPC-en direkte med skolebrukerens egen innlogging og den offentlige
    anon-nøkkelen. Det er nøyaktig det en ondsinnet skolebruker ville
    gjort. Du skal fortsatt ikke bruke service-nøkkelen.
36. Samme framgangsmåte: prøv å lese `innstillinger`-tabellen som
    skolebruker. Skal nektes.

---

## KJENT OG BEVISST — IKKE MELD DISSE SOM NYE FUNN

Alt under er dokumentert og bevisst. Melder du dem som feil, drukner de
ekte funnene.

**Ikke bygget (v32 §2.4):**
- Kortutdelingens kryssjekk mot Kulturkort → Bestillinger. Siden
  `/admin/kortutdeling` finnes som **prototype** og merker seg selv
  «ikke ferdig løsning». Test den ikke — men meld heller ikke at den
  «mangler».
- Flytteforespørsel fra skolen. `onsket_kurs_id` finnes i basen og i
  null linjer kode. Skolen kan krysse av for «åpen for annet kurs», men
  ikke velge hvilket.
- Kopier kursplan i ekte forstand (hele planen, med skolekoblinger).
- Purring der RA velger målgruppe. I dag hukes skoler av enkeltvis.
- Eksport fra kursoversikt og svar. CSV finnes bare på skoleliste og
  evaluering.
- Overstyrbar mottaker per skole. Mottaker følger alltid kjeden
  hktl → htla → rektor fra skolekortet (`src/lib/mottaker.js`).
- Samlet oversikt over ubehandlede meldinger. Merkingen skjer
  automatisk per rad (`SvarOversikt.jsx:101-103`), men det finnes ingen
  filtrering eller opptelling på tvers av kurs.

**Kjente begrensninger i grensesnittet:**
- **«Flytt til annet kurs» vises kun for skoler som har svart «Kommer
  ikke»** (`SvarOversikt.jsx:293`). Om det er riktig er et åpent
  spørsmål til RA-ene, ikke en feil.
- Vertskapslisten i kursoversikten er for smal og gjør raden dobbelt så
  høy.
- **Hall-velgeren i kursskjemaet** matcher bare navn
  (`AdminKursplanlegger.jsx:673`). Søket **inne i hallregisteret**
  matcher navn, kommune og nettverk — det er ikke det samme, og det
  søket virker som det skal.
- En gjenlagt skole havner nederst i listen.
- Skoler som allerede har svart telles med i «send invitasjon»-tellingen.
- RA fylles ikke ut automatisk — venter på den store dataimporten.

**Kjente åpne sikkerhetspunkter (meld dem gjerne, men de er ikke nye):**
- `api/paamelding.js` og `api/send-bestilling.js` står åpne uten
  ratebegrensning.
- `hent_evalueringer_admin` er SECURITY DEFINER uten egen sjekk.
- `anon` har rettigheter på `kurs_skole_mottaker`.
- `scripts/seed-testbruker.sql:42` **og `scripts/seed-testbruker.js:29`
  og `:48`** har det samme passordet i klartekst.

**Døde kolonner (ikke meld):** `kurs.sesong`, `kurs.dag`,
`kurs.antall_skoler`, `skoler.kommunenr`, `evalueringer.semester_id`.
`kurs.status` skrives av basen ved kopiering og strippes av appen ved
lagring (`AdminKursplanlegger.jsx:160`).

---

## SLIK SKAL DU RAPPORTERE

Én rad per punkt, i denne formen:

```
PUNKT 6 — Kopier kurs
RESULTAT: BEKREFTET / MOTBEVIST / KAN IKKE BEKREFTES / IKKE TESTET
HVA JEG GJORDE: …
HVA JEG SÅ: …
BEVIS: skjermbilde / svar fra kallet / fil:linje
```

Til slutt, tre lister:

1. **NYE FUNN** — ting som ikke står i «KJENT OG BEVISST» over.
   Sorter etter alvorlighet. Hvert funn med bevis.
2. **PÅSTANDER I v32 SOM VISTE SEG FEIL** — v32 påstår en del ting om
   hva som finnes og ikke finnes. Fant du noe annet, er det like viktig
   som en bug. Dette er ikke en høflighetsfrase: v32 er allerede felt to
   ganger av kontrollører, og dette testoppdraget ble felt én gang før
   det ble sendt til deg.
3. **PUNKTER DU IKKE FIKK TESTET** — og hvorfor. Ikke la et hull se ut
   som en bestått test.

Til slutt: bekreft at `motor_aktiv` fortsatt står på `'nei'`, og list
opp alle testdata du har opprettet, så de kan ryddes.

---

## OM DETTE DOKUMENTET

Første utgave ble kontrollert av en uavhengig agent før den ble tatt i
bruk. Kontrolløren felte seks påstander:

| Påstod | Virkeligheten |
|---|---|
| Hallregisteret mangler feltene adresse og pris | Begge finnes: `AdminHaller.jsx:311` og `:313`. Det er DATAENE som mangler. Arvet fra RETTELISTE → v32 §3.1 → hit. |
| «v32 §1.3 påstår at `maks_antall` aldri vises» | v32 sier det motsatte — at feltet **vises** i kursskjemaet. Jeg siterte rettelista og skrev v32 på den. |
| Skolebruker kan opprettes via nettsidens skjemaer | Kan ikke. Ingen selvregistrering, og invitasjonslenken returneres aldri i API-svaret. |
| Alt som testes av utsending er tørrkjøring | Nødbremsen dekker bare `api/kurs/*`. Fem andre endepunkter sender ekte e-post. |
| Punkt 16 gir 409 fra nødbremsen | Gir 500 hvis `eivind_epost` er tom — den sjekken ligger først. Og svaret er usynlig i grensesnittet uansett. |
| «Alle skal svare 401» på ni endepunkter | Fire av dem er POST-only og svarer 405 på et nettleserkall. |

Den fant også en direkte motstrid mot `TESTFASIT-blokkA.md`, som
pålegger agenten det motsatte av rammene her.

Regelen er den samme som i v32 seksjon 9: **den som bygger, kontrollerer
ikke alene.** Tredje runde på rad der en kontrollør fant noe. Det er
ikke et tegn på slurv — det er beviset for at rutinen virker. Regn med
at fjerde runde også finner noe.
