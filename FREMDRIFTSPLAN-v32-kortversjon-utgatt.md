# FREMDRIFTSPLAN v32 — Trivselsleder AS

## 5. august 2026 · viderefører v31 av 1. august
## Rettet utgave — se seksjon 9

---

## 0. OM DETTE DOKUMENTET

### 0.1 Hva v32 er
v31 er lest i sin helhet, sammen med konseptdokument v1, v2 og v3, og 33
øvrige dokumenter i `Skrivebord/Min nettside`. Påstandene er kontrollert
mot koden slik den er 5. august 2026.

v32 **erstatter v31 for kursplanleggeren** (v31 seksjon 9–12) og legger
til et lag v31 ikke hadde: sporbarhet. Hvert punkt sier hvor kravet
kommer fra, hva koden gjør, og hvordan vi vet det.

For alt annet **viderefører** v32 v31 uendret. Seksjon 7 lister hva som
er videreført uten ny kontroll, så ingen tror det er verifisert.

### 0.2 Hvorfor sporbarhet ble nødvendig
4. august ble det oppdaget at kursinformasjonssiden — en hel modul —
hadde stått i konseptdokumentet 15. juni og forsvunnet tre dager senere,
uten at noen hadde notert det. Den ble bygget 4. august, 50 dager
forsinket.

5. august ble historien etterprøvd mot originaldokumentene. Den stemte.
Se `HVA-FORSVANT.md`.

### 0.3 De fire reglene v32 innfører

**1. Ingen statuslinje uten kilde.** «Ferdig» skal peke på hvilket krav,
fra hvilket dokument, med hvilken dato.

**2. Ingen nedkorting uten fjernet-liste.** Kortes et dokument ned,
følger en liste over hva som gikk ut. `HVA-FORSVANT.md` er den listen
for juni 2026.

**3. Bevis, ikke påstand.** Tre nivåer:

| Merke | Betyr |
|---|---|
| **BEVIST** | Sett virke i produksjon — ekte e-post, skjermbilde eller kjørt kall |
| **KODEVERIFISERT** | Lest i koden med fil og linjenummer, ikke kjørt |
| **PÅSTÅTT** | Står i et dokument, ikke kontrollert |

**4. Plan mot kode går begge veier.** Koden kan gjøre mer enn planen
husket. Førsteutkastet av dette dokumentet brøt den regelen fem ganger —
se seksjon 9.

---

## 1. KORREKSJONER TIL v31

v31 seksjon 9.3 og 9.5 inneholder statuspåstander som ikke stemmer.
De ble kopiert fra v23 (23. juni) gjennom v24, v26, v27, v29 og v31 uten
ny kontroll.

### 1.1 «Kortutdeling (TL + 10% → Camilla) — Ferdig»
**DELVIS FEIL — prototype finnes, modulen er ikke fullført.**

`src/pages/AdminKortutdeling.jsx` er 150 linjer og gjør beregningen
(`Math.ceil(antallTl * 1.1)`, linje 13), setter `kort_status` per skole
via RPC-en `sett_kort_status` (linje 39), og summerer fakturabeløp.
Ruten finnes i `App.jsx:121`, flisen i `Admin.jsx:48-51`.

Bygget i tre commits **18. juni 2026**: `e45a129`, `4b8fd71`, `5cf24a7`.
Siden merker seg selv, linje 70: *«Prototype til gjennomgang med Camilla
— ikke ferdig løsning.»*

Merk datoen. Prototypen ble skrevet **samme dag** som konseptdokumentet
ble kortet ned og `status_kommando` erklærte modulen ferdig. «Ferdig»
målte mot en prototype som selv sa den ikke var det.

**Det som faktisk gjenstår** er Camillas eneste reelle krav: kortboksen
må **snakke med** fanen under Kulturkort → Bestillinger, så skoler som
alt har forhåndsbestilt ikke får kort to ganger. Kryssjekken finnes
ikke.

Avklart 4. aug: kort beregnes for alle som melder antall, internt —
skolen ser det aldri. Åpent siden 15. juni: når fryses tallet?

**RETTET I RETTELISTE.md 5. august.** Den sa «null kodetreff, null
data» om denne modulen. Blokk B der er nå skrevet om til «prototype i
drift, modulen ikke fullført», med commit-hasher og rutingen i App.jsx.
Påstanden om at kolonnene er tomme står igjen som ubekreftet — den ble
ikke kontrollert mot databasen 5. august.

### 1.2 «Kopier kursplan til ny sesong — Ferdig»
**FEIL.** Det som finnes er RPC-en `kopier_kurs`: den dupliserer ÉN
kursrad, med samme dato, samme sesong, uten skoler.

Konsept v1 §6 beskrev noe annet: hele planen kopieres vår→vår og
høst→høst, strukturen følger med, skoler som har sagt opp markeres,
nye foreslås geografisk, RA bekrefter. **Verdien ligger i
skolekoblingene, ikke i kursraden** — og det er den delen som mangler.

*Kilde for hva `kopier_kurs` gjør: baseinspeksjon 4. august. Funksjonen
ligger ikke i `sql/` eller `supabase/migrations/` i repoet, så påstanden
kan ikke etterprøves fra koden alene. Bør legges inn som migrasjonsfil.*

### 1.3 «Flytteforespørsler med kapasitet synlig» (v31 §9.5)
**FEIL.** `onsket_kurs_id` skrives ingen steder — null treff i `src/`,
`api/` og `sql/`. Skolen krysser av for at de er åpne for et annet kurs,
men kan ikke si hvilket.

`maks_antall` **vises** i kursskjemaet (`AdminKursplanlegger.jsx:711`),
men brukes ikke som kapasitetsvisning ved flytteforespørsel — for det
finnes ingen flytteforespørsel å vise den ved.

### 1.4 «Oppfølgingsflagg på fritekst» (v31 §9.5)
**DELVIS BYGGET.** `SvarOversikt.jsx:101-103` har `harMelding()`, som
automatisk flagger hver rad med fritekst, årsak eller «åpen for annet
kurs», og viser «Ikke håndtert» (linje 325-341). Merkingen ER automatisk.

Det som mangler er å se dem samlet: ingen liste, filter eller telling på
tvers av kurs. RA må åpne hvert kurs for å oppdage at noen har spurt om
noe.

### 1.5 «Steg 4 — RA-admin: Ferdig»
**VAR FEIL fram til 4. august.** RA kunne verken registrere svar på vegne
av en skole eller endre et avgitt svar. Kravet sto i konsept v1 og
forsvant 18. juni. Marielle og Ylva ba om det i august — de ba om noe som
allerede var lovet. Nå bygget og bevist.

### 1.6 «Demo-innhold: 3 testskoler, 2 nettverk, 1 kurs» (v31 §9.8)
**FOR LITE.** Faktisk i basen: 15 «(agenttest)»-skoler, 3 nettverk,
3 kurs, det gamle testkurset `59070916…`, testskolene fra 6. juli-testen
og 23 auth-brukere. Opprydningslisten dekker under en femtedel.

---

## 2. KURSPLANLEGGEREN — STATUS MED SPORBARHET

Erstatter v31 seksjon 9.

### 2.1 Bevist i produksjon
Disse er sett virke — ekte e-post, skjermbilde eller kjørt kall. Alle er
dekket av `TESTFASIT-blokkA.md` og `RAPPORT.md` (agenttest 3, 4. august).

| Modul | Kilde | Bevis |
|---|---|---|
| Steg 3 Svar-skjema, betinget logikk | v1 §4 og §14 | Agenttest 3, punkt 3.2–3.3 |
| A1 Flytteflyt med nullstilling | Retteliste 3. aug | Agenttest 3, punkt 1.1–1.4 |
| A2 RA registrerer svar på vegne | v1 §4 (forsvant 18. juni) | Agenttest 3, punkt 2.1–2.5 |
| A3 Vertskap, RA peker ut | v1 §3 | Agenttest 3 + ekte e-post |
| A4 Oppmøtetider, to klokkeslett | v1 §3 («08.50 / 09.50») | Ekte e-post 4. aug, 08:15 vs 08:50 |
| A5 Kursinformasjonssiden | v1 §4 (forsvant 18. juni) | Nettleser + ekte e-post 4. aug |
| A6 Tekster og maler | Ny 4. aug | Endret og lagret i produksjon |
| Autorisasjon på fem admin-endepunkt | Ny 4. aug | 401 uten innlogging, 200 med |
| Seks e-postutsendinger (Trinn B) | v31 §12 | Ekte e-post 2.–4. aug |
| Nødbrems på alle fire endepunkt | v31 §3.1 | 409 på alle fire |
| Dobbeltsendingsvern | v1 §7 | «Allerede sendt» bevist |

**Agenttest 3, 4. august: alle 34 punkter i fasiten OK.**

### 2.2 Kodeverifisert, ikke kjørt
Lest i koden, ikke sett virke. Fasiten dekker dem ikke — den er
avgrenset til blokk A og e-postmaskineriet (`TESTFASIT-blokkA.md:274-276`).

Datamodell kurs / kurs_skole / haller · Steg 1 Opprett kurs · Steg 2
Koble skoler · Hallregister (161 haller) · Kursholderregister (17
eksterne) · Evalueringsmodulen utover selve utsendingen · Churn-varsel og
Ledelse-side.

Disse sto som «Ferdig» i v2 og v3 og er videreført siden. De virker
etter alt vi vet — men «alt vi vet» er nettopp det v32 forsøker å
erstatte med bevis.

### 2.3 De fire retest-funnene fra 6. juli — ALLE LUKKET
`kursplanlegger-retest-2026.md` har fire avvik som aldri har stått i
noen retteliste. Kontrollert mot koden 5. august: **alle fire er lukket.**

| Funn | Status |
|---|---|
| **A** — avvist påmelding er en blindgate | LUKKET. `api/admin/godkjenn-paamelding.js:149-158` reaktiverer en inaktiv skole med samme org.nr. `avvis-paamelding.js:43-47` sletter ingenting. UI viser «Godkjenn og aktiver skole» på avviste rader (`AdminPaameldinger.jsx:496`) |
| **B** — unntakskobling kun ved godkjenning | LUKKET. `AdminKursplanlegger.jsx:338-357` søker blant alle aktive skoler uavhengig av nettverk; `:402` kobler dem |
| **C** — påminnelse går til NEI-skoler | LUKKET. `send-oppfolging.js:278` `svartJa = svart && kommer`; `:294` avviser resten. Samme regel i `hvem-star-for-tur.js:184` og `:216` |
| **D** — ingen fallback når HTLA mangler | LUKKET. `sql/steg2-flere-mottakere.sql:135` `coalesce(hktl_epost, htla_epost, rektor_epost)`. `src/lib/mottaker.js` sier i sin egen header at den ble laget som svar på dette funnet |

At HTLA er valgfritt i påmeldingsskjemaet er fortsatt sant — men det får
ikke konsekvensen retesten fryktet.

### 2.4 Beskrevet, ikke bygget

**a) Kortutdelingens kryssjekk** mot Kulturkort → Bestillinger. Se 1.1.

**b) Flytteforespørsel, hele flyten.** Se 1.3.

**c) Kopier kursplan, ekte versjon.** Se 1.2.

**d) Purring — RA velger målgruppe.** v1 §5: alle egne ubesvarte, ett
kurs, eller ett område; superadmin alle regioner samlet. I dag hukes
skoler av enkeltvis. Fungerer på tre testkurs, skalerer dårlig mot ~150
kurs i året. Enas observasjon om at mandagsutsendelse +
tirsdagsoppfølging gir best respons forsvant med mekanikken.

**e) Eksport fra kursplanleggeren.** v1 §5, side 5. CSV finnes kun i
`AdminSkoler.jsx` og `AdminEvaluering.jsx`. Kursoversikt og svar har
ingen.

**f) Overstyrbar mottaker per skole.** Står i v1, v2 OG v3 — aldri
bygget. Mottaker hentes alltid fra skolekortet.

**g) Samlet oversikt over ubehandlede meldinger.** Se 1.4.

### 2.5 Datamodell-drift
v31 §9.2 lister `svar_status` som ett felt. Koden bruker separate boolske
felter (`svart`, `kommer`, `vertskap_bekreftet`). Ikke feil, men planen
og basen har ulikt språk. v32 bruker kodens navn.

**Døde kolonner:** `kurs.sesong`, `kurs.dag`, `kurs.antall_skoler`,
`skoler.kommunenr`, `evalueringer.semester_id`. Og `kurs.status`:
databasen skriver 'planlagt' ved kopiering, appen stripper feltet ved
lagring.

**Skrives, men vises aldri:** `kurs_skole.svart_dato` (RA ser ikke NÅR
skolen svarte), `kurs_skole_mottaker.apnet_at` (åpningssporing finnes i
dataene, ikke i grensesnittet), `evalueringer.svart_tidspunkt`.

**Fra agenttest 2, fortsatt åpent:** skoler som alt har svart havner i
«send invitasjon»-tellingen; hall-søk matcher navn, ikke sted; gjenlagt
skole havner nederst i listen.

---

## 3. NYE FUNN 5. AUGUST

Fra gjennomgangen av samtlige dokumenter i `Min nettside`. Full vurdering
i `DOKUMENTOVERSIKT.md`.

*Kildemerknad: punktene i denne seksjonen bygger på dokumenter og filer
som ligger utenfor kode-repoet. De kan ikke etterprøves med grep i
`trivselsleder-ny`, og er derfor KODEVERIFISERT-nivå på det som gjelder
kode, PÅSTÅTT på resten.*

### 3.1 Hallregisteret — to kolonner som fantes ble ikke importert

Konsept v1 §9 (side 7) krevde sju felt: hallnavn, kommune, **adresse**,
kontaktperson, e-post, telefon, **pris**. v2 erklærte registeret ferdig
med åtte felt: navn, kommune, fylke, nettverk, kontaktperson, e-post,
telefon, merknad. Fem er de samme; adresse og pris er borte, fylke,
nettverk og merknad kom til.

**RETTET 5. august, andre kontrollrunde.** Det som står over gjelder
DOKUMENTENE, og det er riktig. Men setningen som sto her — «å bygge
feltene betyr å samle inn ny informasjon på 161 haller» — var feil.

`src/pages/AdminHaller.jsx:311` og `:313`: **både Adresse og Pris finnes
i redigeringsskjemaet**, og i `TOM_HALL` (`:4-6`). Feltene ble bygget
likevel, enda v2 hadde strøket dem.

Det som faktisk mangler er to andre ting:
1. **Data.** `Hallregister_utkast_2.xlsx` har verken adresse eller pris,
   så de 161 importerte radene har tomme felt. Kildedataene fantes aldri.
2. **Visning.** Hall-tabellen viser bare Navn, Kommune og Nettverk
   (`AdminHaller.jsx:152-156`). Adresse og pris er usynlige med mindre
   man åpner en rad til redigering.

Oppgaven er altså innsamling og én kolonneendring — ikke å bygge felt.
Feilen var arvet fra `RETTELISTE.md` uten at `AdminHaller.jsx` ble åpnet.
Tredje gang samme mekanisme slår til i denne mappa. Se seksjon 9.

**To kolonner som FANTES ble ikke importert:**

- **«Vanlig vertskap» — utfylt på 141 av 161 rader.** A3 ble bygget slik
  at RA huker av vertskap manuelt, kurs for kurs. Svaret lå i kildefila.
- **«Alternative haller» — 65 rader.** Nyttig når vertskapet sier nei og
  kurset står uten hall.

**Anbefaling:** importer de to kolonnene før piloten. Filen ligger på
maskinen.

### 3.2 Ledelsens dashboard er halvbygget
v1 §8 lovet «svarprosent på tvers (i dag 54–67 % per RA), alle
churn-signaler samlet på ett sted, status per region». Churn-kortet
finnes. Svarprosent på tvers og status per region: ikke bygget.

### 3.3 Statusdriften er fem dager eldre enn antatt
Rettelisten peker på fremdriftsplan v23 (23. juni) som opphavet til
«Ferdig»-påstandene. `Gml/status_kommando.pdf` av **18. juni** sier
allerede at alle sju moduler er ferdige, inkludert Kortutdeling og Kopier
kursplan.

Samme dag som konseptdokumentet ble kortet fra ti til tre sider, og samme
dag som kortutdelings-prototypen ble skrevet. Nedkortingen,
ferdigmeldingen og prototypen skjedde innenfor timer.

### 3.4 Krav fra prosjektplanen 3. juni som aldri kom videre
`Gml/trivselsleder_prosjektplan.pdf` er det eldste dokumentet:

- «**«Foreløpig påmelding» – oppgi elever senere**» — dette er «vet ikke
  ennå»-kravet. **To måneder eldre** enn vi trodde, forkastet 4. august
  uten at noen visste at det hadde stått der siden juni.
- «**«Min påmelding» – skolen ser og endrer egen påmelding**»
- «**Automatisk bekreftelsesmail med kurshefte**»
- «**Oppfølgingsmail dagen etter kurset**»
- Tre GDPR-krav som ikke står i noen lanseringssjekkliste:
  «**Kryptering av data ved lagring (mangler i dag – må inn i ny
  løsning)**», «**Sletting av brukere ved oppsigelse (automatisert)**»,
  «**Ny databehandleravtale … som lister korrekte underleverandører
  (Vercel, Supabase, Vimeo)**»

De tre GDPR-punktene er lovkrav, ikke ønsker. De hører i bøtte 2.

### 3.5 Seks ferdige datasett ligger ubrukt
Ikke krav som falt ut — arbeidsresultater som falt ut. Alle fra samme uke
i juni: 900 potensielle kulturkort-partnere · 176 med gjenfunnet
kontaktinfo · 2 456 rektorer med e-post · 337 av 357 norske skolesjefer ·
156 svenske rektoravvik · 141 vertskapsoppføringer.

Rektorbasen har **21 % lav eller feil konfidens** (314 «feil» + 199
«lav»). Manuell kontroll før utsending står ikke som oppgave noe sted.
Den svenske skolesjefbasen er 29 av 276 kommuner — 11 %.

### 3.6 Innholdsmodellen for Fase 3 er bestemt to ganger
`Gml/GJENNOMGÅ FRA ANSATTE/Slik skal leker beskrives.docx` er en
åtte-punkts skrivestandard fra fagansatte, nesten identisk med det
Edalio-rapporten uavhengig anbefaler (v31 §47, mønster 3). To uavhengige
kilder, samme struktur. **Bør låses før Ramsalt-importen.**

`RA-rollen.docx` i samme mappe har krav som «tlf etter 6 mnd med rektor»
og «møter for alle skoler en gang per 3. år». Begge forutsetter en «sist
kontaktet»-dato som ikke finnes i datamodellen.

### 3.7 CRM-spesifikasjonen har seks krav uten hjem
`Gml/CRM ny hjemmeside_flatten.pdf` ble nevnt i konsept v2 som «egen
spesifikasjon». Den krever blant annet «**Et notatfelt per skole**»,
«**E-post sendt fra ny side lagres automatisk på skolekortet**» og
«**DealBuilder sender kontrakten rett til ny side i stedet for
HubSpot**». Ingen står i noen plan i dag.

Fra HubSpot-kartleggingen: nyhetsbrev krever
«**avmeldingshåndtering**». Lovkrav, står ingen steder.

### 3.8 Rekkefølgekonflikt: barnehage mot Stripe
`Trivselsleder-i-barnehagen-programforslag.pdf` har høst 2026 i sin
tidslinje og forutsetter «**Stripe Checkout**», «**EHF-faktura**» og
«**Kjedekontoer med samlefakturering**». Stripe ligger i **Fase 8**.
Enten flyttes barnehagelanseringen, eller så flyttes betalingsløsningen.

### 3.9 Videovalget står ubesvart
v31 §32 sier «BESLUTTET: Bunny.net Stream». `CLAUDE.md` i prosjektmappa
lister fortsatt «Vimeo Pro». Cowork-oppdrag D av 29. juni ba om å ta
valget på nytt; ingen leveranse er funnet.

### 3.10 Videoproduksjon — innspill adressert til v32
Fra `RETTELISTE.md`, seksjonen merket «TIL FREMDRIFTSPLAN v32». Den ble
utelatt i førsteutkastet; her er den.

Tage (Edalio) har testet en arbeidsflyt: Claude kjører skjermopptak etter
manus, klipp fra Artlist via MCP, norsk AI-stemme leser voice-over.
Relevant fordi instruksjonsvideoen ble utsatt (v31 §37) på grunn av ujevn
rytme i agent-opptak.

**Beslutningen om AI-video må nyanseres, ikke omgjøres.** v31 §31.1
fraråder AI-video — men begrunnelsen gjaldt *generert* video av fysiske
aktiviteter. Barn som leker blir utroverdig, og vi har ekte opptak fra
Ramsalt. Det står ved lag. Skjermopptak av grensesnitt med AI-stemme er
noe annet: skjermbildet er ekte, stemmen leser vår egen tekst.

Må avklares: (1) test stemmen på vårt fagspråk — «trivselsleder»,
«hovedkontakt TL», «lekekurs» — norske AI-stemmer sliter med sammensatte
ord; (2) lisens og eierskap over år; (3) passer flyten også til
lekevideoer i Fase 3?

---

## 4. SIKKERHET

### 4.1 Lukket 4. august
- **Fem admin-endepunkt sto uten autentisering.** Hvem som helst kunne
  opprette skoler, godkjenne påmeldinger, endre nettverk, koble skoler
  til kurs og slette en `kurs_skole`-rad med skolens svar. BEVIST lukket.
- **`flytt_skole_til_kurs` hadde ingen rollesjekk.** En innlogget
  skoleadmin kunne flytte skoler. BEVIST lukket.
- **Ingen hadde skriverett på `innstillinger`.** Lukket med RLS.

Agenttest 3 fant det første av disse. Det andre — `koble-skole-kurs` —
sto allerede i rettelisten blokk D. De tre øvrige ble funnet da det
første skulle lukkes.

### 4.2 HASTER — nytt funn 5. august
**Fire skript har API-nøkler hardkodet i klartekst:**
`kulturkort_agent_v1.py`, `kulturkort_potensiell_agent.py`,
`skolesjef_agent_v5.py`, `skolesjef_sverige_repair.py`. Samme SerpAPI- og
Anthropic-nøkkel går igjen.

**Roter begge nøklene.** Sjekk om filene har vært committet til Git.
*(Filene ligger i `Min nettside`, ikke i kode-repoet.)*

### 4.3 Åpent — før den store dataimporten
- `scripts/seed-testbruker.sql` har hardkodet passord, trolig i
  Git-historikken. Brukeren er i aktiv bruk — bytt passord.
- `hent_evalueringer_admin` er SECURITY DEFINER uten sjekk av hvem som
  spør.
- `anon` har lese- og skriverett på `kurs_skole_mottaker`.
- De fire andre admin-endepunktene validerer kroppen FØR de sjekker
  innlogging. Ingen slipper forbi, men rekkefølgen bør snus.

RLS-gjennomgangen ble anbefalt i konsept v3 den **19. juni**. Den er 47
dager gammel som åpent punkt.

### 4.4 E-post og domener før lansering
Fra rettelisten blokk D, utelatt i førsteutkastet:

- De fire konto-e-postene bygger lenker med **fast domene**, ikke
  `nettsted_url`. Glemt-passord sender brukeren til gamle
  trivselsleder.no.
- **Fotlenken i alle e-poster** peker på gamle trivselsleder.no.
- `nettsted_url` må settes til trivselsleder.no ved lansering.

### 4.5 Arbeidsregelen som ble brutt
`Dispatch_Claude_Code_for_ny_trivselsleder_no.pdf` er den eneste skrevne
arbeidsinstruksen prosjektet har: «**Ikke la samme agent som bygger
funksjonen være eneste sikkerhetskontrollør**».

De fem åpne endepunktene er hva som skjer når den regelen ikke følges.
Seksjon 9 er hva som skjer når den følges.

---

## 5. MÅ-TIL-PILOT, MÅ-TIL-LANSERING, KAN-KOMME-ETTER

Viderefører v31 §46.

### 5.1 Bøtte 1 — MÅ til pilot (medio august)
- ✅ Resend Trinn B ferdig — BEVIST 2.–4. august
- ✅ Blokk A komplett (A1–A6) — BEVIST 4. august
- ✅ De fire retest-funnene fra 6. juli — alle lukket, kontrollert 5. aug
- ⬜ **Roter de to API-nøklene** (4.2) — haster
- ⬜ **Importer «Vanlig vertskap» og «Alternative haller»** (3.1) —
  billig, sparer RA mye arbeid
- ⬜ Demo-manus og videoinnspilling (se 3.10)
- ⬜ Sletting av ALT testinnhold — den fullstendige listen (1.6)
- ⬜ `eivind_epost` tilbake, `motor_aktiv` til 'ja'
- ⬜ Utstyrspakke-lenkene inn i kursinfoteksten
- ⬜ Sjekk om `kurs@trivselsleder.no` fortsatt er i bruk

### 5.2 Bøtte 2 — MÅ til lansering (mål 1. oktober)
Uendret fra v31 §46.2, med fire tillegg:

- **De tre GDPR-kravene fra prosjektplanen** (3.4). Lovkrav.
- **Avmeldingshåndtering for nyhetsbrev** (3.7). Lovkrav.
- **Full RLS-gjennomgang** (4.3) — før dataimporten, ikke etter.
- **E-postenes domener og fotlenker** (4.4).

### 5.3 Bøtte 3 — kan komme etter lansering
Uendret fra v31 §46.3. Legg til: kortutdelingens kryssjekk (1.1) hvis
RA-runden viser at den kan vente, og de seks CRM-kravene (3.7).

### 5.4 Kritisk sti
Uendret: Fase 3-strukturen, design-fasen, og at importen er blokkert til
Jons august-eksport foreligger. **Ny konflikt:** barnehage mot Stripe
(3.8).

---

## 6. ÅPNE PUNKTER

Viderefører v31 §36. Nye eller endrede:

| Tema | Status |
|---|---|
| Kortutdeling — når fryses tallet? | ÅPENT siden 15. juni |
| Skal «Flytt til annet kurs» kun vises for «Kommer ikke»-skoler? | ÅPENT, funn 4. aug |
| Barnehage vs. Stripe-rekkefølge | **NYTT 5. aug** |
| Videovalg: Bunny.net eller Vimeo? | **NYTT 5. aug** |
| AI-stemme til instruksjonsvideo — tre avklaringer | **NYTT 5. aug** (3.10) |
| Skal `paaminnelse_dager_for` strykes? | **NYTT 4. aug** — nøkkelen brukes ingen steder |
| Rektorbasens 21 % lave konfidens | **NYTT 5. aug** |
| RA-tilgang: full eller filtrert? | ÅPENT — planen sier to ting samtidig |
| `kurs.sesong` / `dag` / `status` | ÅPENT |

---

## 7. VIDEREFØRT FRA v31 UTEN NY KONTROLL

Ærlighetsseksjonen. Følgende er **ikke** kontrollert mot koden, og status
er PÅSTÅTT:

Seksjon 5 (Fase 1), 6 (Fase 2 Innlogging og skoleregister),
7 (Rektor- og skolesjefagenten), 8 (Kulturkort-agenten), 13 (Brukslogg),
14 (Fase 3), 15 (Fase 4), 16 (Stor dataimport), 17 (Webinar), 18 (CRM),
19–22 (Fase 7–10), 23 (Fase 5 GDPR og lansering), 24 (Forside og design),
25–35, 37–45, 47–51.

**Gitt hvor mye som ikke stemte i seksjon 9, bør minst seksjon 6, 13 og
23 kontrolleres før lansering.** Seksjon 6 fordi skoleregisteret bærer
dataimporten; 13 fordi brukslogg er et GDPR-punkt; 23 fordi den ER
lanseringssjekklisten.

---

## 8. HVA SOM SKAL HINDRE GJENTAKELSE

1. **Fasit før test.** Agenttest 1 og 2 fant ingenting av det som
   manglet. Agenttest 3, mot `TESTFASIT-blokkA.md`, dekket alt og fant et
   sikkerhetshull på kjøpet. Fasiten utvides fra blokk A til hele
   systemet.

2. **Et ferdig-stempel skjuler mangler.** Hallregisteret mistet adresse
   og pris i samme setning som erklærte det ferdig.

3. **Krav som forsvinner, kommer tilbake som brukerønsker.** Marielle og
   Ylva ba i august om noe som sto i spesifikasjonen i juni.

4. **Den som bygger, kontrollerer ikke alene.**

5. **Arbeidsresultater teller ikke før de er tatt i bruk.** 141
   vertskapsoppføringer lå i en fil mens vi bygget en funksjon for å
   taste dem inn manuelt.

6. **En påstand om at noe ikke finnes, krever samme bevis som en påstand
   om at det finnes.** Se seksjon 9.

---

## 9. DETTE DOKUMENTET BLE SELV FELT AV SIN EGEN REGEL

Førsteutkastet av v32 ble skrevet 5. august og deretter motprøvd mot
koden av en uavhengig kontrollør, slik Dispatch-instruksen krever.
Kontrolløren fant fem feil — alle av samme type dokumentet er skrevet
for å avskaffe.

| Påstand i førsteutkastet | Virkeligheten |
|---|---|
| «Kortutdeling: null kodetreff, ikke bygget» | 150 linjer prototype fra 18. juni, i mappa jeg selv hadde listet opp |
| Retest-funn A: «KRITISK, ett feilklikk er permanent» | Lukket — re-godkjenning reaktiverer |
| Retest-funn B: «finnes ikke veien» | Lukket — unntakssøket søker alle aktive skoler |
| Retest-funn C: «må verifiseres» | Lukket — to grep ville avklart det |
| Retest-funn D: «ingen fallback til rektor-e-post» | Lukket — `coalesce(hktl, htla, rektor)` |

To av dem var på vei inn i «må gjøres før pilot».

Feilen var arvet: `RETTELISTE.md` sa «null kodetreff» om kortutdelingen,
og jeg videreførte det uten å søke selv. **Det er nøyaktig mekanismen fra
juni — en statuslinje kopiert videre uten ny kontroll.** At den slo til
igjen, i dokumentet som skulle avskaffe den, er den mest lærerike
enkeltobservasjonen i hele gjennomgangen.

Regelen som fanget den: *den som bygger, kontrollerer ikke alene*. Det
tok kontrolløren under ti minutter.

---

*Kilder: fremdriftsplan v31 (1. aug), konseptdokument v1/v2/v3 (15./18./19.
juni), prosjektplan (3. juni), status_kommando (18. juni), CRM-notat,
HubSpot-kartlegging, Edalio-kartlegging, barnehageforslaget,
retest-rapporten (6. juli), hallregister-utkastet, RETTELISTE.md,
STATUS.md, RAPPORT.md, TESTFASIT-blokkA.md og koden i trivselsleder-ny
per 5. august 2026. Motprøvd mot koden samme dag.*
