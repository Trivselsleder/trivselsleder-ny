# STATUS — trivselsleder-ny

## 11. august 2026 — HALL (8.5): vertskap importert + foreslås i kursplanleggeren

Rammen (Kjartans presisering): vise RA-ene (Ylva/Marielle) hele flyten — ikke «pilot».
Husregel: systemet foreslår, RA bestemmer/overstyrer.

**Fase 1 — data inn (SQL, kjørt direkte i Kjartans Supabase av Claude via nettleser,
uten passord):** migrasjon 021 la til kolonnene `vanlig_vertskap` + `alternative_haller`
på `haller` og fylte fra Hallregister_utkast_2.xlsx. Resultat: 137 vertskap, 63 alternative
(av 141/65 — ~4 nettverk hadde navn i basen som ikke var 100 % likt regnearket, mangler bare
et forslag → RA fyller manuelt). Idempotent, transaksjon, WHERE på nettverk+navn.

**Fase 2 — kode:**
- (a/b) AdminHaller: viser «Vanlig vertskap»-kolonne i lista, vertskap + alternative haller
  i redigeringsskjemaet, og spøkelsesfeltene adresse/pris fjernet fra skjemaet (kolonnene
  står tomme igjen i basen — kan droppes senere). PUSHET av Kjartan (med 021).
- (c) AdminKursplanlegger: hall-lasting henter nå vanlig_vertskap+alternative_haller, og
  KursSkjema viser et hint rett under hall-velgeren når RA velger hall («💡 Vanlig vertskap
  her: …»). RA setter fortsatt faktisk vertskap per skole i svar-oversikten. **LIGGER KLAR
  I REPOET — må pushes** (se STATUS-topp/chat for kommando). Syntaks OK + uavhengig kontroll
  ren (ingen CRITICAL/MAJOR).

Merk: adresse/pris-kolonnene finnes fortsatt tomme i `haller` (fjernet kun fra skjemaet).
Kan droppes med `alter table haller drop column adresse, drop column pris;` når vi vil.

Huskelappen: gjenstår **siste-rydding (8.8)** — loop-test, demo-video, slett testinnhold,
motor_aktiv på til slutt.

---

## 11. august 2026 (forts.) — Admin-spinner + evalueringssida koblet inn

To observasjoner fra sikkerhets-røyktesten rettet og bevist live i Kjartans nettleser:

- **Admin-landingssida hang på spinner.** Årsak: `await` av supabase-kall direkte inne
  i `onAuthStateChange` (kjent Supabase-felle — låser auth-klienten ved oppstart, så
  `laster` ble hengende). Fikset i `AuthContext.jsx`: deferret profil-hentingen ut av
  lytteren med `setTimeout(0)`. `/admin` laster nå menyen umiddelbart.
- **AdminEvaluering.jsx var ikke rutet.** Koblet inn: rute `/admin/evalueringer` i App.jsx
  + menypunkt «Evalueringer» (⭐) i Admin.jsx. Sida åpner og laster (hent_evalueringer_admin
  gir 200/4, bevist). Pushet av Kjartan.

LÆRDOM: aldri `await` et supabase-kall direkte inne i `onAuthStateChange` — defer med
`setTimeout(0)`, ellers kan auth-klienten låse seg og gi hengende spinner ved oppstart.

Huskelappen: gjenstår **hall (8.5)** + **siste-rydding (8.8)**.

---

## 11. august 2026 — SIKKERHETSRUNDE FØR PILOT (kap. 9) FERDIG OG BEVIST

Migrasjon 020 (SQL i Supabase) + kode-herding, uavhengig kontrollert og røyktestet live.

- sett_kort_status + hent_evalueringer_admin: caller-vakt (get_min_rolle in ansatt/
  superadmin). CHECK på kort_status. mottaker-policy strammet til ansatt/superadmin.
- Admin-endepunkter (godkjenn-paamelding, opprett-skole, inviter-bruker): innlogging FØR
  kropp-validering; godkjenn/opprett bruker krevAnsatt; inviter fikk aktiv-sjekk.
  Commits 1813999 + 297d706.
- API-nøkler (SerpAPI + Anthropic) rotert av Kjartan; seed-testbruker-passord byttet.
- Røyktest (Claude-i-Chrome, Kjartans egen økt): «Ikke ønsket» lagret + lest tilbake OK;
  hent_evalueringer_admin ansatt 200/4 rader, anon 200/0 rader (hullet lukket og bevist).
- REGRESJON fanget av testen: plpgsql-omskriving av hent_evalueringer_admin ga «structure
  of query does not match function result type». Rettet: beholdt LANGUAGE sql + WHERE-vakt
  (ikke-ansatt får tom liste). Lærdom i 020-header. Gjenstår: pushe rettet 020-doc-fil.

Observasjoner for senere (IKKE sikkerhet): (1) /admin-landingssida ble stående å spinne —
verdt å se på. (2) AdminEvaluering.jsx er ikke rutet i App.jsx (kaller hent_evalueringer_
admin, men har ingen meny/rute) — må kobles inn når evalueringsoversikten skal brukes.

Gjenstår på huskelappen: hall (8.5) + siste-rydding (8.8).

---

## 10. august 2026 (kveld) — FREMDRIFTSPLAN v36 BYGGET, AJOUR-SJEKKET, KONTROLLERT

Gikk gjennom hele v35 (55 sider) og kontrollerte at alt frem til kap. 7 er
ajour mot ekte kode (git-logg + filer på Mac + prosjektdokumenter). Bygget v36
i samme v31-mal (pandoc/xelatex, Liberation Sans, oransje overskrifter, samme
topp/bunntekst). 50 sider.

- Pilotarbeidet 10. aug flyttet til **Vedlegg D** (nyeste øverst): N1/N2/N4/N7,
  samlet kulturkortliste (Trinn 1+2), migrasjonsgapet (019 + 005/006 kjørt),
  _vakt-403-fiksen + aktiv-sperren.
- Del 2 oppdatert til gjeldende sannhet: 8.2/8.4/8.6 «bygges nå» -> levert med
  pekere til Vedlegg D; 8.1 antall_kort-merknad omskrevet; 8.5 hall merket
  «satt på vent» (eneste gjenstående pilot-punkt utover sjekklista); 8.8 to
  punkter huket av; kap. 9 fikk sett_kort_status + profiles-fiks; 12.2 fikk
  fremgangsnote; kap. 5.1 datert 10. aug; Vedlegg A endringslogg v35->v36.
- Ingenting slettet — alt ferdig er FLYTTET, ikke fjernet (regel 5).

**Uavhengig kontroll** (den som bygger kontrollerer ikke alene): ingen
CRITICAL/MAJOR. Alle commit-hasher ekte, ingen over-claiming (hall/RLS/019-
gjenoppbygging korrekt merket åpent). Tre MINOR rettet: utdatert 12.2-brødtekst
(001-016), «9.1 lukket» -> «sikkerhetshullet lukket», gjenopprettet delkrav i
8.6 (skoler uten oppgitt antall). Levert PDF + DOCX + md i repoet.

Gjenstår før pilot: hall-import + rydd adresse/pris (8.5), RLS-restene (kap. 9),
loop-test + opprydding før drift (8.8). Klar for kap. 7–14 (ny produksjon).

---

## 10. august 2026 (kveld) — KULTURKORT SAMLET + SIKKERHET + MIGRASJONSGAP LUKKET

Lang, svært produktiv økt. Alt live og bevist.

### Kulturkort — ekte lagring + samlet liste (N3 omdefinert)
- ✅ **Trinn 1** (commits `9422111`, `ff72efb`, `c917e75`): postbestillinger
  lagres nå i DB (ny tabell `kulturkort_bestillinger` + RLS + GRANTs, kjørt via
  SQL-editoren). `send-bestilling.js` skriver til DB i tillegg til e-post;
  `AdminBestillinger` leser fra DB; død localStorage fjernet. Var dårligere enn
  gamle trivselsleder.no før dette. **LÆRDOM:** en ny tabell trenger GRANT
  (authenticated + service_role), ikke bare RLS — ellers «permission denied».
- ✅ **Trinn 2** (commit `1f5148f`): én samlet side `/admin/kortoversikt`
  («Kulturkort — kort og bestillinger») med kurs-kort + bestillinger, Kilde-
  filter (lilla Kurs / gul Bestilling), full redigering for begge, beløp per
  kilde (kurs uten porto, bestilling inkl. porto), prisinnstillinger flyttet hit.
  De to gamle menypunktene erstattet av ett; gamle ruter beholdt. Kontroll-agent
  fant 2 feil, begge rettet. Bevist live (begge kilder, filter, statusendring).

### Sikkerhet
- ✅ **`_vakt.js` aktiv-sperre gjeninnført** (commit `9522688`) — server-side
  «deaktiver ansatt» virker igjen nå som `aktiv` finnes. Bevist: ansatte får 200.
- ✅ **profiles-skjemadrift LØST** — migrasjon 005 (epost+aktiv) og 006 (rolle-
  constraint skoleadmin/skoleansatt/feide) var ALDRI kjørt på basen. Kjørt via
  SQL-editoren. Blokkerte all onboarding (inviter/godkjenn/opprett/Feide).
  «Beslektet, IKKE rettet»-punktet fra N1-notatet under er dermed FIKSET.

### Migrasjonsgap kartlagt + LUKKET
- ✅ Systematisk sammenligning filer vs base: retning A (skrevet-men-aldri-kjørt)
  ren etter 005/006; retning B stort gap (5 tabeller + 22 RPC-er kun i basen).
- ✅ **`019_live_schema.sql`** (commit `87359c6`): hele live-skjemaet eksportert
  — 1109 linjer, 19 tabeller, 29 funksjoner, 37 policyer, 53 constraints. Gjort
  uten Docker/pg_dump/DB-passord via en midlertidig introspeksjons-funksjon i
  basen (slettet etterpå). Nå kan et testmiljø bygges fra bunnen.

### Rest til neste økt
- RLS-gjennomgang (kap. 9): rotere 4 API-nøkler, kaller-sjekk på
  `hent_evalueringer_admin` + `sett_kort_status` (SECURITY DEFINER),
  seed-testbruker-passord, `anon` på `kurs_skole_mottaker`.
- Detaljer i prosjektet: `DESIGN-samlet-kortliste.md`, `MIGRASJONSGAP-kartlagt.md`.

Byggeliste: N1 ✅ N2 ✅ N3 (samlet liste) ✅ N4 ✅ N7 ✅. Klar for kap. 7–14.

---

## 10. august 2026 — N1 KORTFRYSING FERDIG OG VERIFISERT LIVE

- ✅ **Lagre + fryse kort-tall** (commit `b4c39f7`). Nytt endepunkt
  `api/kurs/frys-kortantall.js` + daglig Vercel-cron (`0 5 * * *`). Kort-tallet
  (TL+10 %) er levende til kursdagen, så låses `antall_kort` automatisk.
  Idempotent. Manuell overstyring + tilbakestilling per rad. Frontend viser
  🔒 frosset / «beregnes» levende. Totaler + faktureringssum bruker effektivt
  tall. Migrasjonsfil 017 dokumenterer kolonnen (fantes alt i basen). Ingen SQL.
- ✅ **Bevist live** i Kjartans nettleser: tørrkjøring (2 aktuelle), ekte
  frysing (15→17, 8→9), idempotens (0), overstyring 12, reset null, −3 avvist,
  UI endre/↺. Kontroll-agent fant + rettet én feil (manglende rollback ved
  lagringsfeil → skjerm/faktureringssum kunne vise et tall basen ikke lagret).
- 🔒 **SIKKERHETSFUNN + rettet** (commit `17997a4`): `_vakt.js` slo opp
  `profiles.aktiv` som IKKE finnes → ALLE innloggede ansatte fikk 403 på hvert
  `_vakt`-endepunkt (skjult siden 5. aug fordi cron bruker CRON_SECRET; 5.-aug-
  testen sjekket bare 401 for uinnlogget). Rettet til å velge bare `rolle`.
  - ⚠️ Beslektet, IKKE rettet: `inviter-bruker` / `godkjenn-paamelding` /
    `opprett-skole` / `feide` upserter `epost`+`aktiv` til `profiles` som ikke
    har de kolonnene — feiler trolig. Eget punkt til sikkerhets-restlista.

Byggeliste: N2 ✅ N4 ✅ N7 ✅ N1 ✅. Neste: N3 (slå sammen bestillinger +
kortutdeling), hall (adresse/pris + import).

---

## 10. august 2026 — PILOT: tre gevinster levert ✅

- ✅ **«Ikke ønsket» som fjerde kortstatus** (commit `b5123bc`, testet live).
- ✅ **Filterrad i kursoversikten** (commit `b8f1d5e`): søk (kursnavn/hallnavn),
  nedtrekk for RA og nettverk, teller «Viser X av Y», og CSV-eksport av
  filtrerte rader (BOM+semikolon, norsk Excel). Klient-side, ingen
  databaseendring. Kun `AdminKursplanlegger.jsx` endret. **TESTET OG VERIFISERT 10. aug** — Cowork kjørte testen direkte i
  Kjartans innloggede nettleser (Claude-in-Chrome): søk på kursnavn OG hallnavn
  filtrerer riktig, teller oppdateres, RA-nedtrekket filtrerer riktig. Eksporten
  bekreftet i koden: BOM + semikolon + UTF-8, eksporterer de FILTRERTE radene,
  samme mønster som AdminSkoler/AdminEvaluering. N4 LUKKET.
  - To bevisste valg beholdt: «Ingen kurs matcher»-linje ved tomt filter, og
    «Uke»-kolonnen faller tilbake på å regne uke fra dato hvis feltet mangler.
- ✅ **Sesong-felt i kursplanleggeren** (commit `92ef748`, pushet +
  deployet): nedtrekk «Vår/Høst + år» (Vår 2025 → Høst 2028, generert rundt
  inneværende år) i kursskjemaet + matchende «Alle sesonger»-filter i
  kurslista (var bevisst utsatt i designet til feltet kunne fylles).
  Kolonnen `sesong` bekreftet å FINNES i basen (REST 200 for `select=sesong`,
  400 for en tulle-kolonne) — ingen databaseendring. Kun
  `AdminKursplanlegger.jsx` endret. **TESTET OG VERIFISERT 10. aug** i
  Kjartans innloggede nettleser: satte «Høst 2026» på TEST-kurset → skrevet
  til DB → filter-nedtrekket plukket det opp → «Viser 1 av 4 kurs». Format
  valgt av Kjartan (nedtrekk framfor fritekst, for like verdier). N7 LUKKET.
- Push går nå friksjonsfritt (token i nøkkelringen).

Neste pilot-steg (fra `PILOT-kartlagt-mot-kode.md`): kortantall-frysing (N1,
den store kortutdelings-jobben), sammenslåing av bestillinger + kortutdeling
til to faner (N3), hallimport (adresse/pris-kolonner + Vanlig vertskap +
Alternative haller). N2/N4/N7 er nå FERDIG.
Til neste planrevisjon: merk N2/N4/N7 som FERDIG og flytt til Vedlegg D (regel 5).

---

## 10. august 2026 — FREMDRIFTSPLAN v35 BYGGET

`FREMDRIFTSPLAN-v35.md` + `.pdf` i prosjektmappa,
`Fremdriftsplan_Trivselsleder_v35.pdf` i «Min nettside». 55 sider, v31-formen.
**v34 beholdes som arkiv.** v35 = v34 med beslutninger til og med 9. august
foldet inn. Detaljer i `claude/FREMDRIFTSPLAN-v35-sammendrag.md`.

Hva som er nytt i v35:
- Fire av fem tall skrevet inn konsekvent (868 leker, 537 dok, 1 792 hjul,
  10 426 planer). Femte (kulturkortpartnere) gjenstår — Supabase.
- Kap. 6: tre lukkede beslutninger fjernet (påminnelse, flytt-knapp, Inaktiv);
  12 åpne igjen (var 15).
- Kap. 9: 9.1-hullet fullført → flyttet til NY **Vedlegg D «Ferdig og levert»**;
  kap. 9 viser nå bare det som gjenstår (nøkkelrotering, hent_evalueringer_admin,
  seed-passord, RLS-gjennomgang).
- Kap. 8: verifisert-notat mot ekte kode (10. aug).
- Ny regel 5: ferdige punkter flyttes til Vedlegg D.

MERK: uavhengig kontrollrunde av v35 er IKKE kjørt (fil-staging til container
var sperret pga. utgått innlogging). Selvsjekk gjort: kapittel 0–24 uten hull,
alle fire vedlegg, tall konsekvente, ingen gamle tall i brødtekst. Kjør en
uavhengig kontroll neste gang staging virker.

---

## Pilot kartlagt mot ekte kode (10. august) — `claude/PILOT-kartlagt-mot-kode.md`

Verifisert: kortstatus finnes allerede (3 valg, mangler «Ikke ønsket»),
adresse/pris-felt finnes i hall-skjemaet (mangler data + kolonner), RA-feltet
autofylles fra nettverket, `antall_kort` lagres ikke (den ekte
kortutdelings-jobben). Migrasjonsgapet bekreftet: `kort_status`/`sett_kort_status`
finnes bare i kjørende DB, ikke i migrasjonsfilene. Byggeliste i notatet.

Neste Claude Code-økt (huskelapp klar: `claude/huskelapp-pilot-smaa.md`):
to små, trygge frontend-gevinster — «Ikke ønsket»-status + vis adresse/pris
som kolonner. De større byggene (antall_kort-frysing, filterrad+eksport,
sesong, hallimport) tas sammen med Kjartan.

---

## 9. august 2026 — SIKKERHET FERDIG + RYDDERUNDE I KAP. 6

### Sikkerhet (kap. 9.1) — HELT FERDIG ✅
- ✅ Sikkerhetsrettingen pushet (commit `415e34b`) og LIVE. Endepunktet
  `api/kurs/hvem-star-for-tur` svarer nå 401/ikke autentisert i stedet for å
  gi ut kursdata. Bevist tett fra Cowork.
- ✅ CRON_SECRET satt i Vercel (Production, Sensitive) + Redeploy kjørt.
  Verdi i `claude/SIKKERHET-gjenstaar.md`.
- ✅ GitHub-tokenet fjernet fra `.git/config` OG slettet på github.com.
- ✅ Nytt classic-token (scope `repo`) laget og lagret i macOS-nøkkelringen.
  Fremtidige push-er går nå friksjonsfritt. MERK: `git push` må kjøres i et
  vanlig Terminal-vindu ved førstegangs-innlogging — interaktiv innlogging
  virker ikke inne i Claude Code («Device not configured»). Brukernavn ved
  push: `Trivselsleder`.

### Kapittel 6 (åpne beslutninger) — seks lukket
- ✅ **Fire av fem tall talt fra ekte Ramsalt-data** (26. juni-eksport):
  leker **868**, dokumenter **537**, TL-hjul **1 792**, periodeplaner
  **10 426**. Detaljer i `claude/TALL-avklart.md`. Femte tall
  (kulturkortpartnere 1 685 vs 714) gjenstår — ligger i Supabase, ikke talt.
- ✅ **Påminnelsen:** RA velger dagen selv, ingen automatisk tidsregel. Ubrukt
  nøkkel `paaminnelse_dager_for` strykes fra planen (ingen kode å endre).
- ✅ **«Flytt til annet kurs»:** skal bare vises for «Kommer ikke»-skoler —
  viste seg ALLEREDE riktig i koden (`SvarOversikt.jsx:293`, siden 18. juni).
- ✅ **«Inaktiv»-status fjernet:** avvis-flyten satte skoler til «Inaktiv»;
  Kjartan vil ikke ha den statusen. Rettet, pushet og LIVE (commit `11b0635`).
  Avvisning endrer ikke lenger skolens status. Offisielle statuser forblir
  seks. Detaljer i `claude/SMATING-avklart-9aug.md`.
- (Fra 7. august: Edalio + TL er to ULIKE produkter, ingen delt database; og
  fulltekstsøk fra dag én, meningssøk etterpå.)

Gjenstår i kap. 6: femte tall (Supabase), media-spriket (må til Jon),
Dropbox-master, Aktiv læring hentes hjem, og etter-lansering-punktene.

### NY FAST ARBEIDSREGEL (fra v35) — Kjartan skal slippe å lete manuelt
1. Ferdige punkter merkes TYDELIG som FERDIG (dato + «bevist»/«live»).
2. Ferdige punkter flyttes til et eget vedlegg bakerst («Ferdig og levert»),
   så Del 2 bare viser det som FAKTISK gjenstår.
3. Kap. 9.1 er første kandidat til å flyttes dit.
4. Ikke i strid med «aldri korte ned» — ingenting slettes, det flyttes.
Bygg IKKE v35 nå; dette er et notat til neste gang planen tas opp.

Alle prosjektnotater fra i dag ligger i claude.ai-prosjektet:
`SIKKERHET-gjenstaar.md`, `TALL-avklart.md`, `SMATING-avklart-9aug.md`,
`huskelapp-claude-code-smaating.md`.

---

## 7. august — FREMDRIFTSPLAN v34: OMSTRUKTURERT UTGAVE

`FREMDRIFTSPLAN-v34.md` + `.pdf` i prosjektmappa,
`Fremdriftsplan_Trivselsleder_v34.pdf` i «Min nettside». 53 sider, v31-formen.
**v33 beholdes uendret som arkiv** — v34 er samme innhold, ny struktur.

Bygget i aktiv sparring med Kjartan: tolv spørsmålsrunder, alle
plasseringsbeslutninger tatt av ham 7. august. Strukturen:

- **Del 1 Grunnlag (kap 1–6):** hva prosjektet er, regler, roller, alt som er
  FERDIG OG BEVIST samlet i kap 5, og hele lista over åpne beslutninger i
  kap 6.
- **Del 2 Veien til lansering (kap 7–14):** i arbeidsrekkefølge. Kap 8
  kursplanlegger-pilot, kap 9 sikkerhet, kap 10 hele innholdsgrunnmuren
  (Fase 3 + Edalio + Ramsalt + video/Bunny + vern — alt som før sto spredt i
  11–13 kapitler), kap 11 Fase 4, kap 12 dataimport + databasens oppskrift,
  kap 13 design/Evidence, kap 14 lansering.
- **Del 3 Etter lansering (kap 15–24):** prioritert — svensk side først.
  App, internasjonalisering, trivselsundersøkelsen, resten av churn-boardet,
  CRM, webinar, idébank, visjoner.
- **Del 4 Vedlegg:** A endringslogg, B historikk/lærdommer/arbeidsinstruks,
  C kunnskapsgrunnlag (alle kartleggingene fullt ut).

Nye prinsipper (besluttet 7. august): hvert tema står fullt ut ETT sted;
teksten sier det som er sant NÅ (ingen blokk-over-gammel-tekst); historikk i
vedlegg; kun én endringslogg (eldre ligger i v33).

Beslutninger tatt underveis: barnehage-kategorien følger innholdsflyttingen,
digitalt bhg-konsept venter; «Min påmelding»/bekreftelsesmail/oppfølgingsmail
→ etter lansering (kap 17); CRM-kravene → kap 19; rektorlisten kontrolleres
før første utsending; tre GDPR-lovkrav fra 3. juni inn i lanseringssjekklisten.

Uavhengig kontroll (sjuende runde på rad med funn): kontrolløren fant 14
fullstendighetsavvik, 11 referansefeil og 6 motsigelser i førsteutkastet —
alle rettet før utgivelse, inkludert gjeninnsetting av dybdekartleggingen
(vedlegg C.7), Ramsalt-tallene, frafallsvarsel-registreringen og
Edalio-byggekravene 4 og 5.

DU GJØR (uendret): CRON_SECRET, push av de 13 filene, endepunkt-sjekk,
GitHub-token, agenttest-bruker. Se kap 9.1 i v34.

---

## 6. august — FREMDRIFTSPLAN v33 ER FERDIG

`FREMDRIFTSPLAN-v33.md` + `.pdf` i prosjektmappa,
`Fremdriftsplan_Trivselsleder_v33.pdf` i «Min nettside».
**61 sider. Samme oppsett, farger og form som v31.**

HVA v33 ER: den fullstendige samleplanen. Alle 59 seksjoner fra v32 er
med ordrett — ingenting er kortet ned. Det som er endret står som
merkede blokker der det hører hjemme. Ny seksjon 59.

SJU BESLUTNINGER TATT 6. AUGUST, alle svar på krav som forsvant i juni
og juli og nå er hentet inn igjen:

1. **Tilgangsstyring på kursholderkalenderen** (9.9) — «deltakerliste,
   betaling, instruksjoner kun synlig for kursholder og admin». Sto fra
   v11 til v29, forsvant i v30. Personvernrelevant. Gjelder når modulen
   bygges, ikke nå.
2. **Den tekniske Fase 3-designen** (14.1) — juni-skissen tilbake
   ordrett, med oversettelse til vanlig norsk ved siden av. Ny 14.1b:
   hva Edalio lærte oss, flyttet inntil skissen den gjelder.
3. **Bruksanvisning og tilbakerulling** (23.4) — delt i to. Selve
   muligheten til å rulle tilbake er dekket (38.2 + 42); det som
   mangler er den skrevne oppskriften.
4. **Tripletex og kontraktfeltene** (6.3) — v17-teksten tilbake ordrett,
   alle tre kulepunktene. Feltnavnene startdato, årsbeløp,
   kontraktsperiode inn i tabellen.
5. **Kortutdelingen** (9.7) — hele flyten spesifisert. 15 TL → 17 kort,
   skolen ser aldri tallet, frysing ved midnatt på kursdagen. Camilla
   bestemmer fakturering. Spørsmålet «når fryses kortantallet» var
   stilt 15. juni og sto ubesvart i 49 dager.
6. **Oversikt i kursplanleggeren** (9.5 + 46.2) — «mine kurs» som
   standardvisning inn i bøtte 2, filterrad i bøtte 1. RA-feltet er
   fritekst og må ryddes først.
7. **Utviklingsmiljø etter lansering** (ny seksjon 59) — tre nivåer.
   Nivå 1 nå (gratis), nivå 2 som mål. Oppskriften på databasen er
   frist FØR den store dataimporten.

ETT PUNKT BEVISST STRØKET: kursbagger og utstyrsbestilling (49.2).
Håndteres i Tripletex/manuelt.

NY ARBEIDSREGEL (3.1): **planen skal kunne leses av den som eier den.**
Der planen sier noe teknisk, skal det stå en linje ved siden av på
vanlig norsk. Følger av CLAUDE.md: «Kjartan er IKKE utvikler.» Fjorten
slike linjer er lagt inn i v33.

TO KONTROLLRUNDER, 54 AVVIK FUNNET OG RETTET.
- **Runde 1: 30 avvik.** Det alvorligste: jeg kortet ned det ordrette
  v17-sitatet om Tripletex til en oppsummering — samme feiltype planen
  er bygget for å stoppe, samme dag jeg skjerpet regelen mot den.
  Dessuten seks kildebevis strøket, fire brutte kryssreferanser, sju
  motsigelser og fem uforklarte tekniske steder.
- **Runde 2: 24 nye avvik.** Sju av dem var innført av rettelsene i
  runde 1. Åtte var mekaniske skader fra v31→v32-konverteringen som
  ingen tidligere runde hadde sett: seks tabeller delt i to med gjentatt
  overskriftsrad, to setninger brutt av en tom linje, fjorten
  sammenskrevne ord. Alt er rettet.
- Dokumentert i v33 seksjon 58.3.

FEM TALL DER PLANEN ER UENIG MED SEG SELV står nå som åpent punkt i
seksjon 36 — 868 mot 869 leker, 628 mot 537 dokumenter, 1 790 mot
1 792 TL-hjul, 10 428 mot 10 426 periodeplaner, 1 685 mot 714
kulturkortpartnere. Ingen av dem er gjettet på. Én telling, én gang.

DU GJØR (uendret fra 5. august):
1. `CRON_SECRET` i Vercel (Production + Preview).
2. `npm run build`, så commit de 13 filene med den eksplisitte
   fillista i `SIKKERHET-5-august.md` — aldri `git add -A`.
3. Sjekk at endepunktet svarer «Ikke autentisert» etterpå.
4. Trekk tilbake GitHub-tokenet i `.git/config` og sett remote-URL på
   nytt.
5. Skaff innlogging til en `(agenttest)`-skolebruker, sjekk at
   `eivind_epost` ikke står tom, og lim inn `TESTOPPDRAG-v32.md`.

---

## Natt til 6. august — GJENNOMGANG AV v8-v30 FERDIG

Oppdraget: lese alle 22 fremdriftsplanene fra v8 til v30 og finne hva
som falt ut mellom versjonene. Resultat: `FUNN-v8-v30.md` og
`Funn_v8-v30_hva_falt_ut.pdf` (Min nettside). 6 sider, v31s oppsett.

TO VIPPEPUNKTER STÅR FOR NESTEN ALT TAP:
- **v20 (22. juni)** ble bygget om til «komplett samleplan». Den ble
  STØRRE enn v17 — og mistet likevel elleve krav for godt, deriblant
  kursinformasjonssiden, «når fryses kortantallet», bruksanvisning +
  tilbakerulling, Tripletex-integrasjonen og årsbeløp på skolekortet.
  **Et dokument kan tape mens det vokser.** Vi har lett feil sted.
- **v30 (10. juli)** sier den bare legger til ti punkter. Den er 24 %
  kortere enn v29. Der forsvant den tekniske Fase 3-designen
  (pgvector, innhold_biter, hybrid søk), selvbetjent onboarding med
  årsabonnement, bruksanvisningen — og et personvernkrav:
  «deltakerliste, betaling, instruksjoner kun synlig for kursholder
  og admin», som hadde stått i nitten versjoner.

PRESISERING TIL v32: kursinfo-kravet står ordrett i v15, v16 OG v17 —
ikke bare til v16. Det døde i v20, ikke med konsept v2 18. juni.

FEMTE KONTROLLRUNDE PÅ RAD FANT NOE. Første utkast av funnrapporten
påsto at «Ferdig» på kortutdeling oppsto i v20 (22. juni) og kalte det
en korreksjon av v32. Men v32 §56.3 hadde allerede riktig dato:
**18. juni**. Utkastet flyttet datoen fire dager SENERE og kalte det
å finne noe eldre — altså en tilbakerulling av en riktig rettelse.
Dessuten var hele avsnittet om v14→v15 feil: «Konsept vedtatt — én
inngang, to moduser» står i v15, v16 og helt til v31.

Dokumentet er skrevet om fra bunnen. Alle funn er nå bekreftet med
ordrett søk i samtlige 23 dokumenter, ikke med statistikk. Seksjon 6
i rapporten forklarer hva som var galt.

METODEADVARSEL som bør huskes: PDF-ene bytter bindestrektype midt i
serien (v14, v20, v21 bruker myk bindestrek U+00AD; v15–v17 og
v23–v31 bruker vanlig). Maskinell ordsammenligning gir da opptil 85 %
falske tap på nettopp de overgangene som ser mest dramatiske ut.

FEM SPØRSMÅL VENTER PÅ DEG i rapportens seksjon 5. Ni spørsmål fra
første utkast er strøket fordi premissene viste seg feil.

---

## Oppdatert 5. august 2026, kveld — v32 BYGGET OM TIL FULLSTENDIG PLAN

Kjartan spurte: «husker du at fremdriftsplanene skulle ligne på hverandre,
og ikke miste noe på veien? mener du plan 32 er i henhold til det kravet?»

Svaret var nei. v31 er 55 sider og 51 seksjoner. Førsteutkastet av v32 var
9 sider og 9 seksjoner. 41 av v31s seksjoner fantes bare som tall i en
liste, og fire — §1 Overordnet, §2 Teknisk stack, §3.2 Bærende prinsipper
og §4 Status — sto ikke engang der. v31 seksjon 0 sier ordrett: «Forrige
versjon er alltid malen for neste. Alt fra forrige versjon skal alltid med
videre — ingenting forsvinner ved en glipp.»

Det var samme mekanisme som ga oss juni-tapet, i dokumentet som var
skrevet for å avskaffe den. Fjerde gang på én dag.

RETTET: v32 er bygget om fra bunnen med v31 som mal.
- Alle 51 seksjoner og alle 149 underseksjoner er med, ordrett.
  Kontrollert maskinelt: 0 mangler.
- Korreksjonene står som 19 merkede blokker der de hører hjemme, ikke
  som en egen kortversjon.
- Sju nye seksjoner: 52 kursinformasjonssiden, 53 Tekster og maler,
  54 sporbarhet, 55 sikkerhet, 56 dokumentgjennomgang, 57 gjentakelsesvern,
  58 selvkritikk.
- Endringslogg v31 → v32 i 0.1, i samme form som v31 brukte.
- 41 sider, 133 000 tegn (v31: 121 000). Ingenting tapt, noe lagt til.

KONTROLLRUNDEN fant ti feil i den nye utgaven. Alle rettet: fire
tabellrader som falt ut i konverteringen, seks steder som fortsatt sa at
Resend Trinn B «gjenstår», to dobbeltføringer, ett utdatert linjenummer
og nummerering i 55/56 som kolliderte med 3.1/3.2.

MERK: linjenumre i api/kurs/send-oppfolging.js flyttet seg da
sikkerhetsvakten ble lagt inn. Riktig nå: :286 og :302 (var :278 og :294).
Alle dokumentene er oppdatert.

Kortversjonen er beholdt som FREMDRIFTSPLAN-v32-kortversjon-utgatt.md.
Ingenting forsvinner.

---

## Oppdatert 5. august 2026, ettermiddag — SIKKERHETSHULL FUNNET OG TETTET

Se SIKKERHET-5-august.md for hele saken. Kort:

**FIRE api/kurs-endepunkter sto uten tilgangssjekk.** Det er ikke en
mistanke — det er bevist. Et GET-kall mot
`/api/kurs/hvem-star-for-tur` uten innlogging returnerte skolenavn,
kursnavn, kursdato, kontaktpersonens navn og e-postadresse for hele
basen. Nødbremsen hjelper ikke: den stopper utsending, ikke lesing.

Årsaken: 4. august fikk `api/admin/*` en vakt etter agenttest 3.
`api/kurs/*` ble ikke tatt med i den runden. ProtectedRoute skjuler
bare knappene — den stopper ingen som skriver adressen rett inn.

RETTET I KODEN, IKKE PUSHET:
- Ny `api/_vakt.js` med `krevAnsatt`, `krevCronEllerAnsatt` og
  `trygtOrigin`. Ett sted, så mønsteret ikke går i utakt igjen.
- Vakt på hvem-star-for-tur, send-invitasjon, send-oppfolging,
  send-evaluering. Vakten kjører FØR kroppen valideres.
- Frontenden lagt om til adminFetch fire steder.
- varsle-eivind forblir åpen med vilje (token-styrt, kalles fra det
  åpne evalueringsskjemaet). Begrunnelsen står i koden.

KONTROLLRUNDEN FANT TO TIL:
- `glemt-passord.js` brukte `req.headers.origin` som mål for lenken i
  tilbakestillings-e-posten. Kontokapring i to steg. Rettet med
  `trygtOrigin` — også i inviter-bruker, godkjenn-paamelding og
  opprett-skole, som hadde samme linje.
- Vakten sjekket rolle, men ikke `aktiv`. En deaktivert ansatt med
  gyldig sesjon slapp gjennom API-et. Rettet.

DU GJØR, I DENNE REKKEFØLGEN (detaljer i SIKKERHET-5-august.md):
1. Sett `CRON_SECRET` i Vercel (Production + Preview).
2. `npm run build` på Macen.
3. Commit og push med filliste — ikke `git add -A`.
4. Åpne adressen på nytt og se at det står «Ikke autentisert».

Hullet står åpent til dette er rullet ut.

Egen sak: GitHub-tokenet ligger i klartekst i `.git/config`.

---

## Oppdatert 5. august 2026 — DOKUMENTØKT: v32, kildegjennomgang, retting

Nødbremsen står som den sto. Én commit ble laget denne morgenen —
`d5f1e29` kl. 08:27, sikkerhetsrettingen som hører til 4. august-arbeidet
(den er ført opp under commit-listen for 4. aug lenger nede, fordi det er
der den hører hjemme faglig). Etter den er verken kode eller database
rørt: resten av 5. august gikk til dokumentene.

Merk linjenumrene i dette dokumentet: de gjelder koden ETTER `d5f1e29`.
Den commiten skjøv `api/admin/godkjenn-paamelding.js` sytten linjer ned.

### DETTE BLE SKREVET
- **FREMDRIFTSPLAN-v32.md** (538 linjer). Fasiten for loop-testing,
  med v1-detaljnivået lagt tilbake der v31 kortet ned. Hver
  statuslinje peker på hvilket krav den gjelder, fra hvilket dokument.
- **HVA-FORSVANT.md** (331 linjer). Ordrett gjennomgang av konsept
  v1 → v2 → v3. 73 % av teksten forsvant på tre dager i juni; her står
  hva som gikk ut, med sitater og sidetall.
- **DOKUMENTOVERSIKT.md** (669 linjer). Alle 33 dokumentene i mappa
  «Min nettside» vurdert: kritisk / nyttig / historisk / kan arkiveres,
  med ordrette sitater fra det som er krav.
- **RETTINGER-5-august.md, SIKKERHET-5-august.md, TESTOPPDRAG-v32.md,
FUNN-v8-v30.md,
FREMDRIFTSPLAN-v32-kortversjon-utgatt.md** (106 linjer). Kort korreksjonsliste. Samme
  fil er lagt inn som prosjektkunnskap i claude.ai, fordi
  prosjektkopien av rettelista der er fra 4. august og fortsatt
  inneholder «null kodetreff»-feilen. Der de to er uenige, gjelder fila
  i mappa.

### DETTE ER DEN VIKTIGSTE HENDELSEN I ØKTEN
Første utkast til v32 ble kontrollert av en **annen agent** mot de
samme kildene. Kontrolløren felte **fem påstander**. Den groveste:
v32 påsto at kortutdelingen hadde «null kodetreff, ikke bygget».

Sannheten: `src/pages/AdminKortutdeling.jsx` er 150 linjer, bygget
18. juni i tre commits, rutet på /admin/kortutdeling og lenket fra
admin-menyen. Siden er i drift. Den merker seg selv «Prototype til
gjennomgang med Camilla — ikke ferdig løsning».

Påstanden var **arvet fra RETTELISTE.md uten å søke selv** — nøyaktig
den mekanismen v32 ble skrevet for å avskaffe. Kontrolløren brukte
under ti minutter.

Alle fem funnene ble etterprøvd i koden før de ble godtatt, v32 ble
skrevet helt om, og dokumentet har fått en egen seksjon 9 som
beskriver sitt eget fall.

### FEILEN BLE SPORET TILBAKE OG RETTET I KILDENE
Samme feilpåstand lå i fire filer. Alle er rettet, og hver retting er
merket med dato i teksten:

| Fil | Rettet |
|---|---|
| RETTELISTE.md | Blokk B: «bevist ikke bygget» → «prototype i drift, modulen ikke fullført», med commit-hasher. Tidslinjen har fått 18. juni inn. NESTE STEG oppdatert (A6 er gjort). |
| HVA-FORSVANT.md | §5 kortutdeling, §oppfølgingsflagg, maks_antall, mottaker-feltet, tre sidehenvisninger, ett ordantall. |
| DOKUMENTOVERSIKT.md | Retest-tabellen: alle fire funnene A–D er LUKKET i koden, ikke åpne. Verdivurderingen og status_kommando-punktet presisert. |
| TESTFASIT-blokkA.md | «Blokk B er IKKE bygget» → «IKKE FULLFØRT, prototype finnes». |

### RETTINGENE BLE OGSÅ KONTROLLERT
Regelen ble brukt på seg selv: en ny uavhengig agent kontrollerte de
fem rettede dokumentene mot koden og konsept-PDF-ene. Den fant seks nye
feil — blant annet at denne statusfilen påsto «ingen kode rørt
5. august» (commit d5f1e29 kl. 08:27 sier noe annet), et linjetall som
var utdatert i det øyeblikket det ble skrevet, og at HVA-FORSVANT
skrev «sju» over en liste med åtte poster. Alle seks er rettet.

Det er andre kontrollrunde på rad som finner noe. Det er ikke et tegn
på slurv — det er beviset for at rutinen virker. Regn med at runde tre
også finner noe.

**Den andre store rettingen:** DOKUMENTOVERSIKT meldte de fire
retest-funnene fra 6. juli (A, B, C, D) som ÅPNE, fordi de ikke sto i
rettelista. Alle fire er lukket i koden:

- A `api/admin/godkjenn-paamelding.js:150–158` — inaktiv skole
  reaktiveres, avvisning kan angres
- B `src/pages/AdminKursplanlegger.jsx:338–357` — unntakssøk over alle
  aktive skoler
- C `api/kurs/send-oppfolging.js:286` — påminnelse krever svart JA
- D `sql/steg2-flere-mottakere.sql:135` — `coalesce(hktl, htla, rektor)`

Det som mangler er ikke arbeidet, men **sporet**: ingen skrev noe sted
at de ble lukket. Retterunder trenger sin egen kvittering.

### DU GJØR — én ting venter på deg
`device_stage_files` er sperret med «untrusted_device». Det betyr at
jeg ikke kan lese PDF-er fra mappa di før du **logger inn på nytt i
Claude-appen på Macen**. Alt annet (lese og skrive filer i
trivselsleder-ny) virker som før.

---

## Oppdatert 4. august 2026 (kveld) — A5 + A6 FERDIG, TESTET MOT FASIT

### HELE A-BLOKKEN ER FERDIG OG BEVIST
A1 (flytteflyt), A2 (registrer svar på vegne), A3+A4 (vertskap +
oppmøtetider + vertskapsnotat), invitasjonen-ut-av-koden,
antall-feltet valgfritt, A5 kursinformasjonssiden og A6 «Tekster og
maler». Ingenting i blokk A står igjen.

### A5 KURSINFORMASJONSSIDEN — FERDIG OG BEVIST (commit 08975ae)
Ny side /kursinfo/:token. To lag, som konsept v1 beskrev:
- ØVERST kursspesifikke fakta (skole, kurs, dato, sted, oppmøte,
  vertskapsnotat) hentet fra basen — samme kilde som e-postene.
- UNDER én felles tekst for ALLE skoler, lagret som kursinfo_tekst
  i innstillinger. Pluss valgfritt kurs.kursinfo_tillegg
  («spesielt for dette kurset») når RA fyller det ut.

DATABASE: ny innstilling kursinfo_tekst, ny kolonne
kurs.kursinfo_tillegg, ny RPC hent_kursinfo_via_token
(SECURITY DEFINER, GRANT til anon). Den BEVISTE svar-RPC-en ble IKKE
rørt — søster-funksjon i stedet, så et bevist endepunkt ikke måtte
bygges om.

SIKKERHET: anon får ALDRI leserett på innstillinger-tabellen.
RPC-en leser kursinfo_tekst og epost_vertskap_notat på skolens vegne
og gir tilbake ferdig tekst. Teksten settes aldri inn som HTML — den
bygges som React-elementer, så en feilskrevet mal kan ikke bli et
sikkerhetshull.

INNGANGENE: svarer skolen JA sendes de til /kursinfo/:token?takk=1
(kvittering øverst på selve siden). Svarer de NEI får de den gamle
kvitteringen — siden har ingenting å gi dem. Påminnelsens knapp
peker nå på kursinfosiden, ikke svarskjemaet. Purring og trinn 3
peker fortsatt på skjemaet — de går til skoler som ikke har svart.

FORMATTERING som en ansatt kan bruke uten HTML:
  ## Overskrift          gir mellomtittel
  - punkt                gir punktliste
  tom linje              gir nytt avsnitt
  [tekst](/min-side)     gir lenke (skråstrek = intern, http = ekstern)

BEVIST I NETTLESER: samme kurs, to skoler. Trondheim 1 (vertskap)
viste Oppmøte 08:15 + vertskapsnotatet; Trondheim 4 (øvrig) viste
08:50 og ingen vertskapslinje. Begge med dato, sted (Alverhallen) og
hele teksten med overskrifter, punktlister og klikkbare lenker.
BEVIST MED EKTE E-POST: påminnelse til Trondheim 1 med knappen «Les
kursinformasjonen» som fører til /kursinfo/. Nødbremsen bekreftet PÅ
igjen etterpå.

### A6 «TEKSTER OG MALER» — FERDIG OG BEVIST (commit 19a4528)
Én admin-side der de ansatte redigerer alt systemet sender ut: de
seks e-postene (emne + tekst), kursinfoteksten, vertskapsnotatet,
avsenderadressene og de tre tidsinnstillingene. Under hvert felt står
plassholderne som virker akkurat der — de er ikke like fra mal til
mal.

Siden NEKTER tre ting: tom mal (en tom mal stopper all utsending),
trinn 3 før purringen, og nettadresse uten https:// eller med
skråstrek til slutt. Ukjente plassholdere blokkeres ikke, men advares
om, med «lagre likevel» som ett ekstra klikk.

Nødbremsen vises som en setning, uten knapp. motor_aktiv styres
bevisst i basen — den skal ikke kunne skrus av ved et uhell.

DATABASE: RLS slått på for innstillinger, policyer for
superadmin/ansatt (SELECT, UPDATE, INSERT), grant til authenticated
og service_role, anon revoket. FØR dette hadde INGEN skriverett på
tabellen — heller ikke serverrollen. Hullet ble oppdaget av
agenttesten, som ikke fikk tømt en mal for å teste sikkerhetsventilen.

BEVIST: tekst endret og lagret i produksjon.

«Vi jobber tungvint» er dermed løst — tekstene redigeres ikke lenger
i Supabase.

FUNN I PLANEN, IKKE I KODEN: STATUS ba om et felt for
paaminnelse_dager_for. Den nøkkelen brukes ingen steder i koden.
Påminnelsen har ingen tidsregel — RA velger dagen og trykker. Feltet
ble derfor IKKE bygget. Bestem: skal påminnelsen ha en tidsregel,
eller strykes nøkkelen fra planen? Anbefaling: stryk den.

### AGENTTEST 3 — ALLE 33 PUNKTER OK
Første test kjørt mot en FASIT (TESTFASIT-blokkA.md) i stedet for
fritt utforskende. Kjørt selvstendig av Claude Code med egen
basetilgang, uten å spørre om noe underveis.

Ingen funksjonelle avvik i blokk A. Nødbrems, dobbeltsendingsvern,
valgfritt antall, flytteflyt, vertskap, oppmøtetider og kursinfosiden
bevist EMPIRISK mot live — ikke bare lest i koden. Detaljer i
RAPPORT.md, oppsummering i RETTELISTE.md.

Første gang en test kan si «alt i fasiten er dekket» i stedet for
«det jeg så på, virket». Det er forskjellen fasiten gjør.

### SIKKERHET — LUKKET SAMME KVELD (commit d5f1e29)
Agenttesten fant ÉN åpen dør. Da den skulle lukkes, viste det seg at
alle fem api/admin-endepunktene sto åpne.

VAR GALT: endepunktene bruker service-nøkkelen og går utenom alle
sperrer, men ingen av dem sjekket hvem som ringte på. Uten innlogging
kunne hvem som helst på internett opprette skoler, godkjenne eller
avvise påmeldinger, endre nettverk, koble skoler til kurs — og SLETTE
en kurs_skole-rad med skolens svar og personlige lenke.
I tillegg: RPC-en flytt_skole_til_kurs hadde ingen sjekk i det hele
tatt. Det var den agenttesten fant.

INGEN SKADE: testmiljø med testdata. Men hullet ville fulgt med til
lansering.

RETTET, TO SPOR:
- SQL: rollesjekk inni flytt_skole_til_kurs + revoke execute fra
  public og anon. De atten feltene uendret.
- Kode: samme vakt i alle fem endepunktene (Bearer-token, getUser,
  rolle må være superadmin/ansatt). Ny src/lib/adminFetch.js legger på
  sesjonen automatisk; alle ni kallstedene i frontend går gjennom den,
  så headeren ikke kan glemmes ett sted senere.
  Mønsteret fantes fra før i api/auth/inviter-bruker.js — de fem hadde
  bare aldri fått det.

BEVIST I NETTLESER, ikke bare lest:
- Uten innlogging: 401 «Ikke autentisert» på admin-endepunktene, og
  401 «permission denied for function» på flytt_skole_til_kurs.
- Innlogget som superadmin: kursplanleggeren virker som før, vertskaps-
  avhukingen ga PATCH 200 begge veier, og RPC-en svarte 204.
  Testdata satt tilbake til utgangspunktet etterpå.

RESTPUNKT: de fire andre endepunktene validerer kroppen FØR de sjekker
innlogging, så et tomt kall gir 400 i stedet for 401. Ingen slipper
forbi — men rekkefølgen bør snus ved neste anledning.

### KØ ETTER DET (oppdatert 5. aug — v32 er gjort)
1. Full loop-test mot FREMDRIFTSPLAN-v32 som fasit. Agenttest 3 viste
   hva en fasit er verdt; nå dekker fasiten hele systemet, ikke bare
   blokk A.
2. Blokk B kortutdeling — RA-runde FØR bygging. Merk: det FINNES en
   prototype i drift. Spørsmålet er hva som skal til for å gjøre den
   ferdig, ikke om noe skal bygges fra bunnen.
3. RLS-gjennomgangen. Anbefalt i konsept v3 den 19. juni — 47 dager
   åpen. Agenttest 3 viste 4. august hvorfor den haster.
4. Flytteforespørsel: `onsket_kurs_id` finnes i basen, men i null
   linjer kode. Kravet står i v1, v2 OG v3 — det forsvant aldri fra
   dokumentene, det ble bare aldri bygget.
5. Kosmetisk: vertskapslisten i kursoversikten er for smal.
6. A1-funn: skal «Flytt til annet kurs» kun vises for «Kommer
   ikke»-skoler? Avklares med RA.

### BESLUTNINGER 4. aug
- «VET IKKE ENNÅ» FORKASTET som eget valg. Antall-feltet ble
  VALGFRITT i stedet — bygget og testet.
- ØNSKET KURS PARKERT. RA kan alt flytte skoler manuelt.
- A5-RETNING: ÉN felles tekst for ALLE skoler, redigerbar av de
  ansatte, med kursspesifikke fakta via token. BYGGET.
- A5 PER-KURS-FELT: tatt med (arkitektur c). Én kolonne, ett
  tekstfelt. Billig nå, dyrt å ettermontere.
- A5 ÅPEN UTEN TOKEN: nei. Kun med personlig lenke.
- A5 REDIGERING: mellomtilstanden i Supabase varte i under to timer
  — A6 kom samme kveld.

### COMMITS 4. AUG, ALLE PUSHET
f429d9e  Flytt skole: banner som minner om ny invitasjon
1c1e4f7  Se svar: RA registrerer/endrer svar på vegne av skolen
aa10d70  A3 del 1: RA peker ut vertskap + oppmøtetider på kurset
a4a577c  A3 del 2: oppmøtetid etter er_vertskap + nei-varsel
f04495c  A3 del 2: oppmøtetid i skolens svarskjema
ce05258  Invitasjon: emne/tekst fra innstillinger + klokkeslett
00b2686  Vertskapsnotatet fylles i påminnelse/invitasjon
1b54d7f  Svarskjema: antall trivselsledere er valgfritt
c388f86  Se svar: antall trivselsledere valgfritt i RA-skjemaet
08975ae  A5: kursinformasjonsside med felles tekst og kursspesifikk topp
19a4528  A6: Tekster og maler — RA redigerer e-poster og kursinfo selv
d5f1e29  Sikkerhet: alle fem admin-endepunkt krever nå innlogget ansatt

### ÅTTE LÆRDOMMER
1. Ny parameter med default ERSTATTER ikke en RPC — den lager en
   overload. Slett gammel signatur i samme transaksjon + GRANT.
2. Endret RETURNS TABLE = DROP + CREATE + GRANT, ellers tom side
   for anon.
3. Plan-mot-kode går BEGGE veier — vertskapsskjemaet sto ferdig
   mens listen sa det manglet, og paaminnelse_dager_for sto i
   planen uten å finnes i koden.
4. Endres MALENE i basen, må koden som fyller plassholderne endres
   I SAMME OPERASJON. MOTSATT REKKEFØLGE ER TRYGG:
   {kursinfolenke} ble lagt i koden FØR noen mal bruker den.
5. Number('') === 0 i JS: tomt tallfelt må mappes til null, ikke 0.
6. Skal et bevist endepunkt utvides for et NYTT formål, lag en
   søster-funksjon i stedet for å bygge om.
7. En test uten fasit er blind for hull. Agenttest 1 og 2 fant
   ingenting av det som manglet. Agenttest 3, mot fasit, dekket
   alt — og fant to autorisasjonshull på kjøpet.
8. DEN SOM BYGGER, KONTROLLERER IKKE ALENE. v32 arvet en feilpåstand
   fra RETTELISTE.md uten å søke i koden selv — i dokumentet som
   skulle avskaffe akkurat den vanen. En uavhengig kontrollør fant
   fem feil på under ti minutter. Regelen gjelder dokumenter like
   mye som kode: **ingen påstand videreføres uten ny kontroll mot
   kilden.**

### FAST RUTINE (gjelder alltid)
Før en modul erklæres ferdig: sammenlign fremdriftsplanen punkt for
punkt mot hva koden FAKTISK gjør — BEGGE veier. Ingenting er ferdig
uten bevis (ekte e-post / skjermbilde). Testing skjer alltid på
trivselsleder-ny.vercel.app, aldri trivselsleder.no.
Nødbremsen (motor_aktiv) står PÅ ('nei') mellom tester.

### MÅ RETTES I TEKSTEN FØR DRIFT
Avsnittet «Utstyrspakker» i kursinfo_tekst står med
plassholderteksten «Lenker til liten og stor lekekurspakke legges inn
her». Erstattes med Klubben-lenkene, eller slettes. Skrivemåte:
[Liten pakke](https://klubben.no/...). Kan nå gjøres i Tekster og
maler, uten SQL.
Sjekk også at kurs@trivselsleder.no fortsatt er i bruk — adressen kom
fra en QuestBack-tekst og kan være gammel.

### MÅ GJØRES FØR DRIFT
- [ ] eivind_epost tilbake til eivind@trivselsleder.no
- [ ] motor_aktiv til 'ja'
- [ ] Slett alt testinnhold: 15 «(agenttest)»-skoler, 3 nettverk,
      3 kurs, gamle testkurset 59070916..., 23 auth-brukere

### FØR DEN STORE DATAIMPORTEN
RLS-gjennomgang: seed-testbruker (bytt passord, i aktiv
bruk), hent_evalueringer_admin (SECURITY DEFINER uten sjekk), anon på
kurs_skole_mottaker.

### VED LANSERING
nettsted_url, konto-e-postenes faste domene, fotlenken.

### FILER SOM HOLDES UTENFOR COMMITS
STATUS.md, RETTELISTE.md, TESTFASIT-blokkA.md, RAPPORT.md, A6-KLAR.md,
FREMDRIFTSPLAN-v32.md, HVA-FORSVANT.md, DOKUMENTOVERSIKT.md,
RETTINGER-5-august.md

### NESTE HANDLING (5. aug)
Full loop-test mot FREMDRIFTSPLAN-v32 som fasit. **Oppdragsteksten er
skrevet, kontrollert og klar: `TESTOPPDRAG-v32.md`.** 36 punkter i tre
deler — del 1 er det som aldri er kjørt (v32 §2.2), del 2 er regresjon
på blokk A, del 3 er tilgang og sikkerhet. Fire forkontroller først.

Den har med to ting forrige oppdrag manglet: en liste over hva som
IKKE er bygget (så agenten ikke melder kjente hull som nye funn), og
et eget rapportpunkt for **påstander i v32 som viser seg feil**.

DEN BLE SELV FELT FØR DEN BLE SENDT. En kontrollør fant seks feil,
blant annet at oppdraget ba agenten bekrefte at hallregisteret manglet
adresse og pris — feltene finnes (`AdminHaller.jsx:311` og `:313`).
Den feilen hadde vandret fra RETTELISTE til v32 §3.1 til testoppdraget.
Tredje gang samme mekanisme. Alle tre dokumentene er rettet.

DU GJØR: skaff innlogging til en `(agenttest)`-skolebruker (punkt
34–36 kan ikke gjøres uten), sjekk at `eivind_epost` ikke står tom, og
lim så inn `TESTOPPDRAG-v32.md` til testagenten.

To ting bør avklares før eller sammen med den:
- Kortutdelingen: RA-runde før noe bygges videre på prototypen.
- RLS-gjennomgangen, som nå er det eldste åpne punktet i hele saken.

Og én ting fra deg: logg inn på nytt i Claude-appen, så PDF-lesing
virker igjen.
