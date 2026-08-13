# Dokumentvurdering — mappa «Min nettside»


## NYTT 6. august

| Fil | Hva | Hvor |
|---|---|---|
| `FREMDRIFTSPLAN-v33.md` / `.pdf` | **Gjeldende fremdriftsplan.** 61 sider, 60 seksjoner (0–59). Erstatter v32. | prosjektmappa + «Min nettside» som `Fremdriftsplan_Trivselsleder_v33.pdf` |
| `BESLUTNINGER-til-v33.md` | Fasiten: alle sju beslutninger 6. august med kildesitat og plassering. Brukt som grunnlag for begge kontrollrundene. | prosjektmappa |
| `FUNN-v8-v30.md` / `Funn_v8-v30_hva_falt_ut.pdf` | Gjennomgangen av v8–v30: hva falt ut mellom versjonene. | prosjektmappa + «Min nettside» |
| `FREMDRIFTSPLAN-v32.md` / `.pdf` | Forrige versjon. Beholdes som referanse. | prosjektmappa |

**Merk:** v33 er bygget på v32 med alle 59 seksjoner videreført ordrett.
Endringene står som merkede blokker (**LAGT TILBAKE**, **NYTT**,
**SPESIFISERT**, **STRØKET**) der de hører hjemme, ikke som omskriving.
Full endringslogg i v33 §0.1, kontrollhistorikk i §58.3.


Vurdert 5. august 2026. Kilde: `/Users/kjartaneide/Desktop/Min nettside`
(på Macen; nås fra Cowork som `/sessions/.../mnt/Min nettside`).

Fremdriftsplaner (v8–v31), de tre gamle kursplanlegger-PDF-ene og
`Ramsalt-eksport/` er holdt utenfor etter avtale.

Presisert 5. august: de tre kursplanlegger-PDF-ene ble senere lest likevel —
de er hele grunnlaget for `HVA-FORSVANT.md`. De 22 fremdriftsplanene i `Gml/`
(v8–v30) er fortsatt ulest. Rettelistas tidslinje sporer driften gjennom dem
uten at hver enkelt er åpnet. Det er en bevisst avgrensning, ikke en
forglemmelse — men den bør stå skrevet, ellers ser oversikten mer komplett ut
enn den er.

Sidetall i sitatene er PDF-sider talt fra 1, ikke trykte sidetall.

---

## SAMMENDRAG PER KATEGORI

| Kategori | Antall |
|---|---|
| KRITISK | 6 |
| NYTTIG | 14 |
| HISTORISK | 8 |
| KAN ARKIVERES | 5 |
| **Sum vurderte** | **33** |

Pluss én ikke-bestilt mappe som viste seg viktig: `Gml/GJENNOMGÅ FRA ANSATTE `
(5 docx) — se eget punkt under KRITISK.

---

# KRITISK — må leses før videre arbeid

## 1. `Gml/CRM ny hjemmeside_flatten.pdf`
**Hva:** Internt arbeidsnotat 17. juni 2026 som argumenterer for at den nye
siden allerede er halvveis et CRM, og at HubSpot (~150 000 kr/år) kan kuttes.
Inneholder Eivinds egen bruksbeskrivelse og en modul-for-modul-plan for hva
som skal flyttes. Dette er «den egne spesifikasjonen» konsept v2 viser til.

**Dato / utdatert:** 17. juni 2026. Ikke utdatert — retningen er bekreftet av
`08B-2-hubspot-kommunikasjon.md.pdf` (23. juni), som er den tekniske
verifiseringen av påstandene her.

**Hører til:** salg/strategi + CRM-sporet (delvis Fase 5/6).

**KRAV — sitert ordrett:**
- s.2: «Notater/kommentarer etter samtaler med skoler → **Et notatfelt per skole
  – enkelt å bygge**» (innsats: Lav)
- s.2: «Lagring av sendte e-poster på kundekortet → **E-post sendt fra ny side
  lagres automatisk på skolekortet**» (Lav–middels)
- s.2: «Lagring av kontrakter på kundekortet → **DealBuilder sender kontrakten
  rett til ny side i stedet for HubSpot**» (Middels)
- s.2: «Salgs-/deal-delen (Eivind) → **Kan bygges inn og knyttes til
  potensielle skoler (ligger allerede der)**» (Middels)
- s.3: «På sikt lager vi et eget ledelsesdashboard til oss to – **kontraktsverdi,
  geografi, vekst, churn** – skreddersydd til våre egne tall.»
- s.3: «I stedet kobler vi på et rimelig, dedikert
  e-postmarkedsføringsverktøy som gjør nettopp sporing og statistikk, og lar
  det snakke med den nye siden.»
- s.3: «Det blir egentlig ikke to sider, men **én side med en språk-switch**.»

**Status i dag:** notatfelt per skole, e-postlogg på skolekortet, DealBuilder-
mottak og deal/pipeline står ikke i rettelista og er ikke nevnt i noen
statusoppdatering jeg har sett. Ledelsesdashboardet er delvis bygget (churn-
kortet, 19. juni) men uten kontraktsverdi/vekst/land — `status_kommando (1).txt`
sier selv at det «krever HubSpot-data inn i basen. Egen senere økt.»

---

## 2. `Gml/trivselsleder_prosjektplan.pdf`
**Hva:** Den aller første planen, 3. juni 2026. Seks sider. Beskriver hele
løsningen før kursplanleggeren i det hele tatt fantes som begrep — sidestruktur,
ressursbibliotek-datamodell, integrasjoner, kurspåmelding, GDPR-krav fra
databehandleravtalen med Ullensaker kommune, og AI-fase 2.

**Dato / utdatert:** 3. juni 2026. Delvis utdatert på teknisk stack (Railway/
Hetzner som backend, `test.trivselsleder.no` som testmiljø — begge erstattet).
Innholdskravene er derimot ikke utdatert, bare glemt.

**Hører til:** Fase 3 ressursbibliotek, kursplanlegger, GDPR/lansering.

**KRAV SOM SENERE FORSVANT — sitert ordrett:**
- s.3, kap. 6 Kurspåmelding: «**«Foreløpig påmelding» – oppgi elever senere**»
  — dette er nøyaktig «vet ikke ennå»-problemet som rettelista (blokk E) kaller
  «billigste retten på hele listen». Kravet er altså to måneder eldre enn antatt.
- s.3, kap. 6: «**«Min påmelding» – skolen ser og endrer egen påmelding**» —
  finnes ikke. I dag er token-lenken engangs; skolen har ingen side å komme
  tilbake til. Henger tett sammen med A5 kursinformasjonssiden.
- s.3, kap. 6: «**Automatisk bekreftelsesmail med kurshefte**» — kurshefte som
  vedlegg/lenke er ikke nevnt i noen senere plan.
- s.3, kap. 6: «**Oppfølgingsmail dagen etter kurset (settes opp én gang)**» —
  dagens evaluering sendes manuelt via mailto.
- s.3, kap. 5: «**Questback | Embed undersøkelser i innlogget portal**» —
  Questback skulle beholdes for trivselsmålinger og bygges *inn* i portalen.
  Senere planer sier at Questback skal kuttes (Fase 7 Trivselsundersøkelsen).
  Beslutningen om overgangen står ikke skrevet noe sted.
- s.3, kap. 7 GDPR: «**Kryptering av data ved lagring (mangler i dag – må inn i
  ny løsning)**» — står ikke i noen sjekkliste for lansering.
- s.3, kap. 7: «**Sletting av brukere ved oppsigelse (automatisert)**» — ikke
  bygget, ikke i rettelista.
- s.3, kap. 7: «**Ny databehandleravtale må opprettes som lister korrekte
  underleverandører (Vercel, Supabase, Vimeo)**» — ikke gjort så vidt jeg ser.
- s.2, kap. 4: filteret «**Målform | Bokmål, Nynorsk, Engelsk**» og
  «**Favoritt-funksjon**» på hver ressurs. Målform er et reelt datakrav for
  Fase 3 (den gamle siden har målform på alle tre ressursbanker).
- s.2, kap. 3, admin: «**Se statistikk over bruk**» — samme krav som Edalio-
  rapporten kaller «hendelseslogging fra første deploy».

---

## 3. `kursplanlegger-retest-2026.md.pdf`
**Hva:** Rapport fra agenttest 6. juli 2026 — andre runde, etter at fire feil fra
første test var rettet. Full ende-til-ende-test av kursplanleggeren på
testmiljøet. Åtte avvik (A–H) med prioritering.

**Dato / utdatert:** 6. juli 2026. **STORT SETT UTDATERT — rettet
5. august.** Alle fire funnene som denne filen først meldte som «ÅPEN» er
lukket i koden. Se tabellen under.

**Hører til:** kursplanlegger.

**STATUS PÅ FUNNENE (mot RETTELISTE-kursplanlegger.md av 4. august):**

> **RETTET 5. AUGUST.** Første utgave av denne filen meldte A, B, C og D som
> åpne, fordi de ikke sto i rettelista. Det var å slutte fra «står ikke i en
> liste» til «er ikke gjort» — samme feilslutning som denne mappa ellers
> handler om. Alle fire er kontrollert i koden og alle fire er lukket.
> Rettelista hadde rett i å ikke føre dem opp.

| Funn | Beskrivelse | Status kontrollert i koden 5. aug |
|---|---|---|
| A | Avvist påmelding er blindgate — duplikatsjekk treffer skolens egen registeroppføring | **LUKKET.** `api/admin/godkjenn-paamelding.js:150–158`: finnes det en INAKTIV skole med samme org.nr, oppdateres og reaktiveres den raden i stedet for å blokkere. En feilaktig avvisning kan altså angres. |
| B | Unntakskobling skole→kurs finnes kun i godkjenningsøyeblikket | **LUKKET.** `src/pages/AdminKursplanlegger.jsx:338–357`: eget unntakssøk med 300 ms debounce over ALLE aktive skoler, uansett nettverk. |
| C | Påminnelse sendes også til skoler som svarte NEI | **LUKKET.** `api/kurs/send-oppfolging.js:286`: `svartJa = row.svart === true && row.kommer === true`, og linje 302 avviser alt annet med «skolen har ikke svart JA». |
| D | Purring/påminnelse/evaluering krever HTLA-e-post; ingen fallback til rektor | **LUKKET.** `sql/steg2-flere-mottakere.sql:135`: `coalesce(hktl_epost, htla_epost, rektor_epost)`. |
| E | Hall-søket filtrerer tregt/misvisende | Delvis: rettelista har «Hall-søk matcher bare navn, ikke sted/by» (fra agenttest 2) — men rendering-buggen er en annen sak |
| F | Datakvalitet i hallregisteret (feilimporterte rader) | Kjent siden 18. juni (`Gml/status_kommando.pdf`), fortsatt åpen |
| G | «RA (auto)» forblir tom | I rettelista: «RA auto-fylles ikke — venter på stor dataimport» |
| H | «Send påmelding»-klikk nr. 1 registrerte seg ikke | Ikke i rettelista |

**Lærdommen står igjen, selv om funnet falt.** Første utgave her kalte det
«hovedfunnet i hele gjennomgangen» at A–D ikke sto i rettelista. De var
allerede rettet. Det som faktisk mangler er ikke arbeidet, men **sporet**:
ingen skrev noe sted at de fire ble lukket, så en leser i august måtte gjette.
Retterunder trenger sin egen kvittering, akkurat som «ferdig» trenger en kilde.

Ordrett fra s.2, feil A: «Duplikatsjekken treffer altså skolens egen
registeroppføring, så **en feilaktig avvisning kan ikke angres**.» — dette
gjelder ikke lenger.

Ordrett fra s.3, feil D: «HTLA er valgfritt i påmeldingsskjemaet, så **dette vil
gjelde mange skoler**. Vurder fallback til rektor-e-post, eller gjør HTLA
påkrevd.» — fallback til rektor er valgt og bygget.

Rapporten foreslår også (s.4, pkt. 3.3) en konkret liten forbedring som ikke
står noe sted: «Tips: legg til en «Kopier lenke»-knapp også i
evalueringstabellen, slik som i «Send lenker».»

**Merk om testdataene:** rapporten lister fire testskoler, ett nettverk, ett kurs
og fire svar fra 6. juli som skal ryddes. Rettelistas blokk C nevner bare
«15 «(agenttest)»-skoler». Testdataene fra 6. juli (navn «TEST Solbakken /
Fjellheim / Fjellheim 2 / Havblikk (Kjartan-test)») er trolig fortsatt i basen.

---

## 4. `Hallregister_utkast_2.xlsx`
**Hva:** Kildefila for de 161 hallene som ble importert 18. juni. Hentet fra
Nettverksoversikten 16.06.2026. Ett ark med data (161 rader), ett med statistikk.

**Dato / utdatert:** 16. juni 2026. Ikke utdatert som kilde — men den
importerte versjonen i basen har færre kolonner enn kilden.

**Hører til:** kursplanlegger (hallregister) + dataimport.

**SVAR PÅ SPØRSMÅLET OM ADRESSE OG PRIS: NEI, ingen av delene.**
Kolonnene i kildefila er:

```
RA | Fylke | Kommune | Nettverk / kurs | Hovedhall | Alternative haller |
Vanlig vertskap | Kontaktperson (navn/rolle) | E-post | Telefon |
Status / merknad (RA) | Originaltekst kontakt (backup)
```

Det finnes altså **verken adresse eller pris** i kilden. Konsept v1 (15. juni)
krevde begge — men kildefila som ble laget dagen etter hadde dem ikke, og
importen 18. juni kunne derfor ikke ha dem. Kravet falt ikke bare ut av
*planen*; det fantes aldri data å fylle det med. Å bygge feltene betyr å samle
inn ny informasjon på 161 haller, ikke bare legge til to kolonner.

**TO KOLONNER SOM FANTES I KILDEN, MEN IKKE BLE IMPORTERT:**
- **`Vanlig vertskap` — 141 av 161 rader utfylt (88 %).** Det bygde
  hallregisteret har navn, kommune, fylke, nettverk, kontaktperson, e-post,
  telefon, merknad. Vertskapskolonnen er ikke med. Dette er direkte relevant
  for A3 i rettelista: RA skal huke av vertskap manuelt per kurs, mens svaret
  allerede finnes for 141 nettverk. Kunne vært forhåndsutfylt.
- **`Alternative haller` — 65 av 161 rader utfylt (40 %).** Ikke importert.
  Relevant når vertskapet sier nei og kurset står uten hall (A3).

Statistikkarket bekrefter datahullene som gjør purring vanskelig:
161 nettverk/haller, 140 med kontaktperson, **106 med e-post**, 104 med telefon.
Fordelt per RA: Marielle 40, Julie 34, Kari 29, Eivind 29, Ylva 27.
Kolonnen `Status / merknad (RA)` er **helt tom** — den var ment å fylles ut av
RA-ene og ble aldri brukt.

---

## 5. `Dispatch_Claude_Code_for_ny_trivselsleder_no.pdf`
**Hva:** Arbeidsinstruks for hvordan Claude Code skal brukes med subagenter på
dette prosjektet. Åtte sider: agent-team, faste prompts, arbeidsflyt per
funksjon, teststrategi, sikkerhetssjekkliste, anbefalt rekkefølge.

**Dato / utdatert:** 29. juni 2026. **Ikke utdatert — dette er den eneste
skrevne arbeidsinstruksen for hvordan bygging skal foregå, og den gjelder
fortsatt.** Deler av den er i praksis ikke fulgt.

**Hører til:** annet (arbeidsmetode) — men berører alle spor.

**INSTRUKSER SOM FORTSATT GJELDER — sitert ordrett:**
- s.6, kap. 10 «Arbeidsflyt i Claude Code»: «**1. Beskriv funksjonen og ønsket
  sluttresultat. 2. Be Claude bruke Dispatch til analyse, risiko og forslag.
  3. Godkjenn retning og avgrensning. 4. Be Claude lage implementeringsplan med
  filendringer. 5. La Claude kode én avgrenset del. 6. Kjør testagent og
  sikkerhetsagent. 7. Rett feil. 8. Be dokumentasjonsagent oppdatere README/
  beslutningslogg. 9. Gå videre til neste del.**»
- s.5, kap. 7: «**Ikke la samme agent som bygger funksjonen være eneste
  sikkerhetskontrollør.**»
- s.7, kap. 12: «**Ikke hopp over sikkerhetsagenten når skoledata, roller eller
  e-post er involvert.**» — verdt å merke seg mot blokk D i rettelista, der tre
  reelle sikkerhetshull står åpne (hardkodet passord i Git, `hent_evalueringer_
  admin` uten avsendersjekk, anon med skriverett på `kurs_skole_mottaker`).
- s.5, kap. 7, sikkerhetsagentens sjekkliste: «**At bekreftelseslenker ikke kan
  misbrukes eller gjette seg frem til andre skolers data.**» og «**At
  e-postutsendelser ikke lekker andre skolers informasjon.**»
- s.4, kap. 5, foreslått metadatamodell for leker — **relevant for Fase 3 og
  ikke gjenfunnet i noen fremdriftsplan**: «Alderstrinn: 1-4, 5-7, 8-10, SFO/AKS.
  **Aktivitetsnivå: rolig, middels, høy aktivitet.** Område: inne, ute, gymsal,
  skolegård. Utstyr: uten utstyr, ball, kjegler, hoppetau osv. **Formål:
  inkludering, samarbeid, puls, trygghet, konfliktforebygging.** **Tid: 5 min,
  10 min, 20 min, hel økt.** **Tilgjengelighet: enkel, middels, avansert.**
  Språk: norsk, svensk, islandsk, engelsk senere.»
  (Aktivitetsnivå, formål, tid og tilgjengelighet finnes ikke i den gamle
  Drupal-modellen og er ikke nevnt i prosjektplanens filterliste.)
- s.5, kap. 9, testflyt som ikke er dekket av noen agenttest:
  «**Migrert innhold har ikke brutte lenker eller manglende bilder.**»

---

## 6. `Gml/GJENNOMGÅ FRA ANSATTE ` (mappe, 5 docx) — IKKE BESTILT, MEN VIKTIG
Mappa lå under `Gml/` og var ikke på lista. Den inneholder ansattes egne
arbeidsdokumenter fra 25.–29. juli 2026. To av dem er kravdokumenter for
Fase 3 ressursbibliotek:

### `Slik skal leker beskrives.docx` (16 KB, 25. juli)
En intern skrivestandard i åtte punkter for hvordan alle leker skal beskrives.
**Dette er i praksis innholdsmodellen for Fase 3, skrevet av fagfolk, og den
står ikke i noen fremdriftsplan.** Ordrett:

> «1. Skriv opp **hvilket sted den egner seg til å lekes, antall personer man
> bør være, klassetrinn og utstyr man trenger**. Dette vil plasseres for seg
> selv, i en boks e.l.
> 2. Skriv hva du eventuelt trenger å gjøre av **forberedelse** […] Vær så
> detaljert at det blir en oppskrift som et barn klarer å følge. Tenk kokebok!
> 3. Skriv hvordan elevene eventuelt skal **deles inn** […]
> 4. Skriv hva slags **utgangsposisjon** man skal ha for leken […]
> 5. Skriv opp **(for)målet med leken** […]
> 6. Skriv opp leken **kronologisk** […]
> 7. Skriv inn eventuelle **regler** […]
> 8. Skriv inn eventuelle **variasjoner eller kuriositeter** […]»

Og en terminologibeslutning som må inn i i18n-filene:
> «Kjartan, Vegard og Karoline har landet på at man skal bruke **barn eller
> person** (eventuelt spillere, dersom det er bedre), **ikke elev**.»

Merk sammenfallet: dette er nesten ord for ord samme mal som Edalio-rapporten
anbefaler å arve (s.8, pkt. 3: «Sted / utstyr / antall deltakere / slik gjør vi
det / regler og sikkerhet / varier for nivå og tempo / oppsummering»). To
uavhengige kilder peker på samme innholdsmodell. Den bør låses før import.

### `RA-rollen.docx` (59 KB, 29. juli)
Formell arbeidsinstruks for RA/PA-rollen, 14 oppgavetyper med tidspunkt.
Systemrelevante krav som ikke er dekket:
- «Følge opp skolenes henvendelser på mail/tlf/chat — **Loggføres i HubSpot**»
  (kontinuerlig) — dette er nøyaktig aktivitetsstrømmen CRM-notatet vil flytte.
- «Oppstart med nye skoler — **Tlf etter 6 mnd med rektor. Dette settes opp i
  kalender.**» — et halvårlig oppfølgingspunkt per ny skole som ingenting i
  systemet minner om i dag.
- «Aktiv, sagt opp - skoler — Ringe å følge opp/snu […] **Være oppdatert på
  hvilke kampanjer vi da tilbyr om de snur.**» — knytter seg direkte til
  churn-modulen, som i dag bare flagger og ikke foreslår tiltak.
- «Møte med rektor/ledelse […] **før målet er møter for alle skoler en gang per
  3. år**» — en oppfølgingssyklus som ville krevd en «sist kontaktet»-dato
  per skole.

De tre øvrige (`Lagring av dokumenter og grafikk.docx`, `Nytt materiale og
endringer på nettsiden.docx`, begge 2,4 MB med bilder, og `Rutiner for lagring
av dokumenter og grafikk.docx`) er interne rutiner. Verdt å lese før Fase 3
fordi de forklarer hvor grafikk og videoer faktisk ligger i dag (Dropbox-
fellesmapper, «Grafikk NY - under oppdatering») og hvilke bilder som er klarert
til bruk. Sitat fra rutinene: «**Alt materiale som lagres i Dropbox skal være
godkjent til bruk hos oss.**» og «På sikt bør vi ha en **felles grafikkmappe
for både Norge og Sverige**.»

---

# NYTTIG — inneholder krav eller data vi bør kjenne

## 7. `CLAUDE.md`
Prosjektkontekst for Claude: stack, brandfarger, IDer, faste regler, lærdommer.
16. juni 2026. Delvis utdatert — den er eldre enn versjonen som ligger som
prosjektkunnskap i claude.ai, og den nevner ikke Resend-e-postmotoren,
trappetrinnsmodellen eller nødbremsen (`motor_aktiv`). Fem faste regler
gjelder fortsatt uendret, bl.a.: «**WCAG 2.1 AA er lovpålagt for skolesektoren
— bygges inn fra start, ikke etterpå**» og «**Systemet foreslår, mennesket
bestemmer**». Kategori: NYTTIG (bør synkroniseres med prosjektversjonen, ikke
arkiveres).

## 8. `08B-2-hubspot-kommunikasjon.md.pdf`
23. juni 2026. Ren observasjonskartlegging av HubSpot-portalen (145220138) —
det tekniske grunnlaget under CRM-notatet. Tall vi trenger å kjenne: 84
markedsførings-e-poster, 7 503 av 30 000 sendt i måneden, 45 dynamiske lister,
17 workflows (14 aktive), 7 sekvenser som knapt brukes, Gmail koblet for 9
brukere, Aircall og DealBuilder tilkoblet. Utdatert? Nei.
Hører til: salg/CRM. **Krav-lignende innhold (s.5):** for å erstatte
nyhetsbrevdelen må ny side bygge «**maler/editor, mottakervalg fra segmenter,
åpne-/klikkstatistikk, avmeldingshåndtering**». Avmeldingshåndtering er et
lovkrav (markedsføringsloven) og er ikke nevnt i noen fremdriftsplan jeg har
sett. Verdt å sjekke mot Resend-oppsettet.
Rapporten identifiserer også fem workflows som må reimplementeres:
«Land sync (NO/SE-landsetting), Set marketing contact, New Lead outbound (setter
GDPR-rettsgrunnlag), Når en kontakt klikker på en kobling i e-posten, Copy
kurspåmelding til skole».

## 9. `edalio-kartlegging-2026_1_flatten.pdf`
1. august 2026. Grundig gjennomgang av Edalio.no (som Trivselsleder selv har
eierinteresse i) med tanke på hva som kan gjenbrukes i Fase 3. Elleve sider.
Ikke utdatert — den ferskeste faglige inputen i hele mappa.
Hører til: Fase 3 ressursbibliotek.
**Ti konkrete anbefalinger for «NÅ» (s.8), rangert etter verdi/kostnad.** De
fem øverste er reelle krav til Fase 3 som ikke står i noen fremdriftsplan:
> «1. **Fasettert bibliotek med levende tellere.** Kategori / tema / trinn /
> varighet i venstrekolonne, tellere som oppdaterer hverandre, tomme fasetter
> gråes ut, **filtertilstand i URL**.
> 2. **Fulltekstsøk fra dag én.** Postgres FTS + pg_trgm på tittel, ingress,
> brødtekst og nøkkelord. […] **Søk-som-du-skriver med debounce, ikke
> Enter-krav.**
> 3. **Aktivitetsmalen fra «Aktiv læring» som vår innholdsmodell.**
> 4. **Strukturert instruktørnotat per aktivitet.**
> 5. **Tomtreff-tilstanden som konverteringspunkt.** «Ingen treff for X —
> mangler du dette? Foreslå det» […]
> 6. **Metadata med flertrinns-tagging.** At én aktivitet kan være «1.–4. trinn»
> og ikke tvinges inn i ett trinn. **Dette må inn i datamodellen nå, ikke
> senere.**
> […] 10. **Hendelseslogging fra første deploy.** Hvilken ressurs ble åpnet, av
> hvem, når, hvor lenge. Uten dette gjentar vi Edalios feil og står i januar
> uten grunnlag.»

Rapporten har også et sikkerhetsvarsel som er verdt å lese som en advarsel om
vårt eget admin-panel (s.7): «**Vær varsom med å eksponere internt arbeid i
produktet.** «Produktrom» ligger på /admin i samme app som lærerne bruker, og
inneholder frister, bugbeskrivelser, tabellnavn og vurderinger av testbrukere.
Det er praktisk, men det er **én rollesjekk unna en lekkasje**.»

Og sju åpne spørsmål til Kjartan (s.9–10) som fortsatt er ubesvarte, bl.a.
«Skal Edalio og trivselsleder.no leve videre som to produkter, eller er tanken
at Edalio på sikt smelter inn i Trivselsleder? **Svaret endrer om vi skal
kopiere mønstre eller dele kodebase og database.** […] og da bør det avgjøres
**før vi låser datamodellen i høst**.»

## 10. `svensk-side-struktur.md.pdf`
29. juni 2026. Kartlegging av trivselledare.se sin Drupal-struktur, gjort som
innlogget admin. Konkluderer med at NO og SE er samme kodebase med ulik
taksonomi. Ikke utdatert.
Hører til: Sverige/utland + Fase 3.
**Krav som følger av funnene:**
- Trinnmapping: «Norsk = trinn (1.–10.). Svensk = **4 faste band: Förskola /
  Åk F-3 / Åk 4-6 / Åk 7-9**, lagret som fast listefelt (`field_school_type`),
  ikke taksonomi […] Felles plattform må mappe norske trinn mot svenske band».
- Læreplan: «Norsk LK20 «kompetansemål» […] vs svensk Lgr22 «centralt
  innehåll» […] **Ulik måltype, ulik formulering, ulik aldersinndeling.**»
- «**Fag kan ikke mappes 1:1.**»
- Opprydding før import: ««Ämnen» (topic)-vokabularet er en blanding av norske
  og svenske fag […] **må ryddes/separeres per språk i en felles plattform.**»
- «Plats, antal deltagare, material og förberedelser ligger som **fri tekst
  inni beskrivelsen**, ikke som egne felt.» — dvs. migreringen må parse fritekst
  for å fylle den strukturerte modellen fra pkt. 6 over. Dette er en reell
  arbeidsmengde som ikke er estimert noe sted.

## 11. `Cowork-oppdrag-D-Videoverts_1_flatten.pdf`
29. juni 2026. Oppdragsbeskrivelse for å velge videoverts på nytt etter Vimeos
2026-prisendring. **Åpent oppdrag — jeg fant ingen leveranse
(`videoverts-2026.md`) i mappa, så beslutningen ser ut til å stå ubesvart.**
Hører til: Fase 3 ressursbibliotek (video).
Nøkkeltall å ta med: «~26 GB ren aktivitetsvideo — ca. 178 leke-videoer + 74
«Move it» + 22 «Aktiv læring»», realistisk volum «mellom ~26 GB og ~60–80 GB,
ikke 248 GB». Hovedinnsikt s.3: «**For Trivselsleder er BÅNDBREDDE […] ikke
LAGRING […] sannsynligvis den begrensende og kostnadsdrivende faktoren.**»
Merk at CLAUDE.md fortsatt lister «Video: Vimeo Pro» som valgt stack — det er
i strid med dette dokumentet.

## 12. `Trivselsleder-i-barnehagen-programforslag.pdf`
Juli 2026, 20 sider. Komplett programforslag for barnehagemarkedet med to
leveransemodeller. Ikke utdatert.
Hører til: salg/strategi — men **kapittel 9 er en kravspesifikasjon til
nettsiden**, formulert eksplisitt for å limes inn i byggeprosjektet
(«Anbefalt arkitektur, formulert så den kan limes rett inn i det prosjektet»).
**KRAV, s.16, sitert ordrett:**
> «Produktside **/barnehage** med tydelig verdiløfte, prisene åpent publisert
> […] demovideo og «prøv gratis i 30 dager».
> **Stripe Checkout** for kortkjøp […] årlig abonnement (Stripe Billing,
> subscription med årlig interval), med introduksjonspris første år som Stripe
> coupon. **Vipps bør legges til som betalingsmetode**.
> **Faktura må støttes fra dag én**: kommunale barnehager […] krever
> **EHF-faktura**. […] Ikke la EHF-kravet forsinke lanseringen av kortflyten —
> men ha et «be om faktura»-spor synlig.
> Kontomodell: **én organisasjonskonto per barnehage (styrer er admin), med
> ubegrensede personlige innlogginger for ansatte** […] **Kjedekontoer med
> samlefakturering og sentralt dashboard**.
> Provisjonering via **Stripe webhooks**: betalt abonnement → konto aktiveres →
> onboarding-e-postserie starter → månedspakker låses opp etter årshjulet.
> **Churn-varsling til dere når en barnehage ikke har logget inn på 30 dager.**
> **MVA**: kursvirksomhet er ofte unntatt mva, mens digital plattformtilgang
> normalt er avgiftspliktig […]»
> «Vurder **PWA (installerbar nettapp) fremfor egen app i første omgang**».

Tidslinjen (s.17) sier «Fase 1 Utvikling — **Høst 2026** — […] digital plattform
+ Stripe i nytt nettsideprosjekt». Det er nå. Stripe er i fremdriftsplanen først
i Fase 8 (internasjonal skalering). Her er det en reell rekkefølgekonflikt som
noen må ta stilling til.

## 13. `Trivselsleder_Strategi_2026_2028_Mer_enn_et_friminutt.pdf`
Juli 2026, konfidensielt styredokument. Strategisk rammeverk 2026–2028:
rekruttering, churn, nettverksmøter, rektordialog, barnehage, organisering,
KPI-er og styrevedtak. Ikke utdatert.
Hører til: salg/strategi. Ingen tekniske krav, men gir begrunnelsen for
churn-modulen, ledelsesdashboardet og barnehagesatsingen. Bør leses av den som
skal prioritere Fase 5/6.

## 14. `Verdivurdering_Trivselsleder_flatten.pdf`
23. juni 2026. Estimat på hva plattformen ville kostet hos et norsk IT-byrå:
6 000–9 500 timer, 8–16 mill. kr, ferdig del i dag ≈ 3–5 mill. kr.
Hører til: salg/strategi (verdi ved salg av selskapet).
**Indirekte nyttig som fasit:** timetabellen på s.4 er den mest komplette
listen over hva plattformen faktisk skal inneholde, alle ti faser, på én side.
Nyttig som kryssjekk mot fremdriftsplanen. Merk at «Kursplanlegger (5 steg,
hall/kursholder, **kortutdeling**)» er priset inn med 450–650 timer — samme
kortutdeling som i dag bare finnes som en 150-linjers prototype (rettet
5. august; den forrige teksten her sa «bevist ikke bygget», som var feil).

## 15. `trivselsleder_kartleggingsrapport_flatten.pdf`
3. juni 2026. Cowork-skanning av den gamle Drupal-siden: fullt sidekart,
ressursbanker med antall, filtre, dokumentbank, admin-panel.
Hører til: Fase 3 ressursbibliotek + dataimport.
**Fasit på volumet som skal migreres:** «Aktiviteter / Leker ~700 (178 med
video) — Barnehage 248 · Barnetrinn 709 · Ungdomstrinn 571», «Move it ~123
(74 med video)», «Aktiv læring ~250–300 (Matematikk 81, Norsk 65, Engelsk 44)»,
«Dokumentbank ~370 PDF/DOCX», «Avtaler ~800 kulturkort-partnere».
Filterakser fra gammel side som må gjenskapes: «Kategori · Type (trinn) ·
Utstyr · Målform» og for ATLU «Fag · Klassetrinn 1.–10. · Video · Målform».
Nevner også to eksterne tjenester som lever videre og må håndteres i ny
meny: tlsport.no (nettbutikk) og laerervikaren.no, samt Tawk.to-chatwidgeten
og /trivselspatruljen (barnehagesiden).

## 16. `omtaler-trivselsleder-2026.md.pdf`
5. juli 2026. ~30 offentlige omtaler av Trivselsprogrammet med kildelenker og
korte sitater, sortert i gode/kritiske. Laget for en «Evidence»-side.
Hører til: annet (innhold til forsiden/salgssider).
Ikke et krav, men **klart innhold til en side som ikke finnes i planen ennå**.
Rapporten peker selv på hva som mangler: Udirs kunnskapsoversikt «påpeker
manglende ekstern evaluering». Verdt å kjenne før man skriver effekt-påstander
på ny forside.

## 17. `Leker_fra_hele_verden_Trivselsleder.pdf`
1. august 2026. Idéhefte: 40 tradisjonsleker fra de ti største
innvandrergruppene i Norge, ferdig beskrevet til bruk.
Hører til: Fase 3 ressursbibliotek (innhold).
Ferskt, ubrukt innhold som ikke ligger i noen ressursbank ennå. Merk at
beskrivelsene her følger en annen mal enn `Slik skal leker beskrives.docx`
— bør normaliseres før import. Heftet inneholder også en konkret idé for
skolegården som kan bli en ressurstype: «Shax-brett, gebeta-groper og
hajla-ruter kan males permanent på asfalt eller benker».

## 18. `rektorbase_2026-06-09.xlsx` og `Trivselsleder-AI/rektorbase_med_rektorer_v7.xlsx`
9.–11. juni 2026. Grunnlagsdata for rektoragenten. Basen har 2 456 norske
skoler med orgnr, NSR-ID, adresse, kommune, fylke, skoletype.
v7 er resultatet etter agentkjøring: **alle 2 456 rader har rektornavn og
e-post**, med konfidens fordelt som høy 1 085 + hoy 273, middels 580, lav 199,
**feil 314**, ingen treff 4.
Hører til: dataimport.
De 314 «feil» og 199 «lav» (21 % til sammen) må gjennom manuell kontroll før
noe sendes ut. Dette er ikke notert som en oppgave noe sted.

## 19. `Trivselsleder-AI/skolesjef_norge_v5_2026-06-11.xlsx` + `skolesjef_agent_v5.py`
11. juni 2026. Skolesjef/kommunalsjef oppvekst for norske kommuner: 357
kommuner, 337 med navn funnet (94 %). Skriptet er agenten som produserte den.
Hører til: dataimport / salg.

## 20. `skolesjef_sverige_2026-06-11.xlsx` (finnes i to eksemplarer: rot og Trivselsleder-AI/)
11. juni 2026. Svensk motstykke: **276 kommuner, kun 29 med navn (11 %).**
Agenten lyktes dårlig i Sverige. `skolesjef_sverige_repair.py` (140 linjer) er
et reparasjonsforsøk som filtrerer bort de 21 største kommunene som falske
treff. Resultatet er fortsatt tynt.
Hører til: Sverige/utland + dataimport. **Nyttig å vite: den svenske
beslutningstakerbasen er i praksis ikke laget.**

## 21. `export_schools_94307_11062026.xls`
11. juni 2026. Rå eksport fra trivselledare.se: **378 svenske skoler** med
kolonnene Namn, County, Municipality, Number of pupils, School type, School
administrator (+e-post og telefon), Status, Organization number.
Hører til: Sverige/utland + dataimport.
Dette er kildefila bak `Rektoravvik_Sverige`. Merk at «School type» bruker
nettopp de fire svenske bandene fra strukturkartleggingen («Åk F-3, Åk 4-6,
Åk 7-9»), og at organisasjonsnummer mangler på flere rader — relevant for
duplikatsjekken (retest-feil A — som er lukket i koden, men der org.nr
fortsatt er nøkkelen, og et manglende org.nr derfor fortsatt kan gi rot).

---

# HISTORISK — forklarer hvorfor noe er som det er

## 22. `Test hele kursplanlegger.docx`
6. juli 2026. **Dette er ikke en testrapport, det er selve oppdragsteksten** som
ble gitt til testagenten — seks steg, sikkerhetsrammer og rapportkrav.
Resultatet ligger i `kursplanlegger-retest-2026.md.pdf` (pkt. 3 over).
Verdien i dag: den er en ferdig mal for neste agenttest. Rammene er
gjenbrukbare ordrett: «Du opererer KUN på https://trivselsleder-ny.vercel.app.
Du skal ALDRI besøke, logge inn på eller endre noe på trivselsleder.no […]
Du skal IKKE kjøre SQL mot Supabase. Trenger du testdata, opprett dem KUN via
nettsidens egne skjemaer.»
Merk at oppdraget selv **ikke ba om noe som ikke er bygget** — det tester bare
den eksisterende flyten. Det bekrefter rettelistas egen konklusjon:
«Agenttestene fanget ingenting av dette. De tester at det som finnes virker,
ikke at noe mangler.»

## 23. `Gml/status_kommando.pdf` (18. juni) og `status_kommando (1).txt` (19. juni)
To øyeblikksbilder av STATUS.md, én dag fra hverandre. Filene i rot og i `Gml/`
er **bit-identiske** (`.txt`-versjonene) — samme fil lagret to steder.
Historisk verdi: her ser man statusdriften rettelista beskriver. 18. juni-
versjonen sier allerede «Kursplanlegger, alle 7 moduler (Send lenker,
Metaoversikt, Melding-håndtert, Flytteforespørsel, **Kortutdeling**, **Kopier
kursplan**, Purring/påminnelse). Pushet til GitHub.» — **Dette er det
tidligste skriftlige sporet av feilpåstanden**, fem dager før fremdriftsplan
v23 som rettelista peker på.

Presisert 5. august: nyansen er verdt å ha med. Kortutdeling-prototypen ble
faktisk pushet 18. juni, samme dag som denne statuslinjen. Linjen var altså
ikke oppdiktet — den var en prototype omtalt som en modul. Det er slik
statusdrift begynner: ikke med en løgn, men med et ord som er litt for
sterkt, og som ingen justerer ned senere. Kopier-kursplan har derimot aldri
hatt mer enn `kopier_kurs`, som dupliserer ÉN kursrad uten skoler.
19. juni-versjonen dokumenterer også et sikkerhetsvarsel som fortsatt er åpent:
«RLS-sjekk: minst én av skoler/kurs mangler RLS (kom varsel ved
testdata-innsetting). Egen sikkerhetsgjennomgang anbefales.»

## 24. `Rektoravvik_Sverige_v2_2026-06-11_flatten.pdf`
11. juni 2026. Avviksrapport: rektornavn på trivselledare.se vs Skolverket.
69 aktive skoler med sikker navnematch og ulikt rektornavn, 87 med lignende
navn, 9 ikke funnet. Til manuell kontroll.
Historisk fordi den er 14 måneder... nei, to måneder gammel og
rektorutskiftinger skjer løpende — men listen er ikke behandlet, så den er
fortsatt brukbar som arbeidsliste. Grensetilfelle HISTORISK/NYTTIG.
Hører til: Sverige/utland + dataimport.

## 25. `kulturkort_agent_v1.py` og `kulturkort_potensiell_agent.py`
15. juni 2026. To Python-agenter: v1 finner nettside/e-post for eksisterende
kulturkort-partnere som mangler kontaktinfo; «potensiell» søker opp nye
partnere per kommune per type (Kino, Bowling, Museum, Svømmehall, Skitrekk,
Fotball, Golf, Håndball, Klatring, Trampolinepark).
Historisk som kode — men se sikkerhetsvarselet nederst.
Hører til: kulturkort.

## 26. `kulturkort_mangler_2026-06-15.json`
15. juni 2026. **176 eksisterende partnere** der agenten fant nettside og
e-post, med konfidensgrad. Ikke importert så vidt jeg kan se.
Hører til: kulturkort.

## 27. `kulturkort_potensielle_2026-06-15.json`
15. juni 2026. **900 potensielle nye kulturkort-partnere** med navn, kommune,
type, e-post, konfidens. Dette er en ferdig salgsliste som ligger ubrukt.
Hører til: kulturkort.

## 28. `kommune_typer.json`
15. juni 2026. Oppslagstabell: hvilke partnertyper som allerede finnes per
kommune (f.eks. «Alta: Skitrekk, Fotball, Kino, Museum, Bowling, Håndball»).
Ren mellomfil for agenten over. Historisk.

## 29. `Ramsalt-eksport/` (ikke åpnet, kun kartlagt)
Drupal 7-eksporten fra Ramsalt, mottatt 26.–29. juni 2026. Struktur:
- `Content/` — ni JSON-filer, én per innholdstype: `game-nodes.json` (7,4 MB),
  `atlu-nodes.json` (3,6 MB), `advantages-nodes.json` (3,6 MB, kulturkort),
  `wheel-nodes.json` (4,0 MB), `document-nodes.json` (955 KB),
  `page-nodes.json` (299 KB), `quote-nodes.json` (3 KB),
  `facebook_post-nodes.json` (18 KB), og **`play_schedule-nodes.json` på
  33 MB** — den klart største, altså skolenes egne periodeplaner.
- `Vocabularies/` — tolv taksonomifiler, bl.a. `game_category`,
  `game_equipment`, `learning_objectives`, `topic`, `atlu_topic`,
  `type_document`, `region`, `semester`, `place`, `school_year`, `tags`,
  `advantage_type`. Merk at både `place` og `school_year` er med — de to som
  svensk-kartleggingen kaller ubrukt/legacy.
- `Files/public/` — **2 481 filer** (~1,5 GB), PDF-er fra 2017 og framover.
  `Files/private/protected-files/` med 12 undermapper.
- **`_speedtest.bin` på 209 MB** — en ren testfil uten innhold. Kan slettes;
  den utgjør 12 % av eksportens totale størrelse.

Ikke utdatert (dette ER migreringsgrunnlaget), men holdt utenfor denne
gjennomgangen. Kategori: NYTTIG i praksis, listet her fordi den ikke er lest.

---

# KAN ARKIVERES

## 30. `rektorbase_med_rektorer_2026-06-09.xlsx`
9. juni 2026, 20 rader. En prøvekjøring av rektoragenten med bare 20 skoler,
alle med konfidens «Lav» og flagg «Ja». Erstattet fullstendig av v7 (2 456
rader). Ingen verdi framover.

## 31. `Gml/status_kommando (1).txt`
Bit-identisk kopi av fila i rotmappa. Duplikat.

## 32. `Trivselsleder-AI/skolesjef_sverige_2026-06-11.xlsx`
Duplikat av samme fil i rotmappa (13 728 vs 14 141 byte — samme innhold, ulik
lagring). Behold én.

## 33. `Ramsalt-eksport/_speedtest.bin`
209 MB testfil uten innhold. Slett.

## Tilleggsnotat til nr. 28 — `kommune_typer.json`
(Rettet 5. august: dette sto som «nr. 34» og så ut som et 34. dokument. Det er
ikke et eget dokument, det er en ettertanke om nr. 28. Summen på 33 vurderte
filer var altså riktig; nummereringen var det ikke.)

Grensetilfelle — listet som HISTORISK over, men i praksis en mellomfil som kan
regenereres fra `kulturkort-partnere.json` når som helst.

---

# TVERRGÅENDE FUNN

## SIKKERHET — hardkodede nøkler i klartekst (HASTER)
Fire skript i mappa har **samme SerpAPI-nøkkel og samme Anthropic API-nøkkel
hardkodet i klartekst på linje 4–7**:

- `kulturkort_agent_v1.py`
- `kulturkort_potensiell_agent.py`
- `Trivselsleder-AI/skolesjef_agent_v5.py`
- `Trivselsleder-AI/skolesjef_sverige_repair.py`

```
SERP_API_KEY  = "ad060e84dd...fae0e"
ANTHROPIC_KEY = "sk-ant-api03-mVnUg1cSzv_...-knZT7AAA"
```

Nøklene ligger på skrivebordet i en mappe som synkroniseres. CLAUDE.md har
allerede regelen «API-nøkler i terminal: bruk python3 -c med input(), én nøkkel
om gangen» — den er brutt her. **Begge nøklene bør roteres**, og skriptene bør
lese fra miljøvariabler. Sjekk samtidig om noen av disse filene noen gang er
committet til Git (samme problem som `scripts/seed-testbruker.sql` i blokk D i
rettelista).

## MØNSTER: ferdig arbeid som ikke er tatt i bruk
Seks datasett ligger ferdig produsert og ubrukt:
- 900 potensielle kulturkort-partnere (15. juni)
- 176 partnere med gjenfunnet kontaktinfo (15. juni)
- 2 456 rektorer med e-post (11. juni)
- 337 norske skolesjefer (11. juni)
- 156 svenske rektoravvik til kontroll (11. juni)
- 141 «vanlig vertskap»-oppføringer i hallregisteret (16. juni)

Alle er fra samme uke i juni, alle er laget for å importeres, ingen av dem er
importert. Det er ikke et krav som falt ut av planen, men et arbeidsresultat
som falt ut av planen — verdt å behandle som én oppgave.

## MØNSTER: to uavhengige kilder som sier det samme om Fase 3
`Slik skal leker beskrives.docx` (fagansatte, 25. juli) og
`edalio-kartlegging` (1. august) beskriver nesten identisk innholdsmodell for
aktiviteter, uten å kjenne til hverandre. Når to uavhengige kilder lander på
samme struktur, er det sannsynligvis riktig struktur. Den bør låses i
datamodellen før Ramsalt-importen kjøres, ikke etterpå.
