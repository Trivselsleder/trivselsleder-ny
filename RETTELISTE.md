# RETTELISTE — kursplanleggeren

## TILLEGG 6. august — nye punkter fra v33-arbeidet

Disse kom ut av beslutningene 6. august og av de to kontrollrundene på
v33. De hører hjemme i kursplanleggeren og er ikke dekket lenger nede.

| # | Sak | Hva som må gjøres | Bøtte |
|---|---|---|---|
| N1 | Kortantallet lagres ikke | `antall_kort` har null kodetreff i `src/`, `api/` og `sql/`. Tallet regnes ut på skjermen hver gang. Frysing på kursdagen (v33 §9.7) kan ikke bygges før tallet faktisk lagres på kurs_skole-raden. | 1 — pilot |
| N2 | Ingen kortstatus | De fire statusene (Foreslått / Godkjent / Fakturert / Ikke ønsket) finnes ikke. Camilla kan i dag ikke registrere avgjørelsen sin. | 1 — pilot |
| N3 | Kortutdeling og bestillinger er to sider | Konsept v1 sa to faner på ÉN side. Menyteksten i `Admin.jsx:42` lover det allerede: «Se bestillinger og kortutdeling fra skoler». Fanen «Fra kurspåmelding» som står i v33 §1.1 er ønsket løsning, ikke bygget. | 1 — pilot |
| N4 | Ingen filterrad i kurslista | `AdminKursplanlegger.jsx:112` henter ALLE kurs sortert på dato, opptil 10 000 rader, uten filter, søk eller eksport. Trenger nedtrekk for RA, sesong og nettverk + søkefelt på kursnavn og hall. | 1 — pilot |
| N5 | RA-feltet er fritekst | `AdminKursplanlegger.jsx:637` — et navn skrevet inn for hånd, ikke koblet til brukerkontoen. RA-kolonnen vises i `:246`. «Mine kurs» kan ikke virke før dette er ryddet. | 2 — lansering |
| N6 | «Mine kurs» som standardvisning | Følger av N5. Med ~150 kurs i året blir lista uoversiktlig etter én sesong. | 2 — lansering |
| N7 | Sesongfeltet har ingen inntastingsboks | `kurs.sesong` er definert i datamodellen (`:31`) men kan ikke fylles ut noe sted. Uten den kan man ikke filtrere på sesong (N4). | 1 — pilot |
| N8 | Statushistorikk mangler | `api/admin/avvis-paamelding.js:65` setter `status: 'Inaktiv'` — raden overskrives, ingen historikk. Merk at «Inaktiv» ikke står i statuslista i v33 §6.4; enten er lista utdatert eller koden bruker et navn som ikke er avtalt. Må avklares. | 2 — lansering |
| N9 | Fem tall planen er uenig med seg selv om | 868/869 leker, 628/537 dokumenter, 1 790/1 792 TL-hjul, 10 428/10 426 periodeplaner, 1 685/714 kulturkortpartnere. Ingen kan bekreftes fra dokumentene alene. Én telling, én gang, så ett tall gjennom hele planen. Se v33 §36. | 1 — pilot |

**Kilde:** `FREMDRIFTSPLAN-v33.md` §9.5, §9.7, §36, §46.2 og
`BESLUTNINGER-til-v33.md`. Kontrollert i koden 6. august.

---

## Oppdatert 4. august 2026 · erstatter versjonen fra 3. august

Ett dokument. Alle funn samlet. Erstatter alle tidligere rettelister
og løse notater om kursplanleggeren.

### SLIK LESER DU DEN

Hvert punkt har to merkelapper:

KILDE — hvor kravet står skrevet
BEVIS — hva vi faktisk har kontrollert
  BEVIST IKKE BYGGET  = sjekket mot koden 4. aug, finnes ikke
  BEVIST BYGGET       = sjekket mot koden 4. aug, finnes
  IKKE SJEKKET        = antatt, ikke verifisert

Punkter uten BEVIS-merke er beslutninger eller opprydding, ikke funn.

---

## HVORFOR DETTE SKJEDDE — hele tidslinjen

15. juni  Konseptdokument v1. Ti sider. Full kravspesifikasjon:
          feltlister, skjermbilder, mekanikk, begrunnelser.
18. juni  Konseptdokument v2. Tre sider. Statustabellen sier
          allerede «alle byggesteg ferdige».
18. juni  Kortutdeling-prototypen bygges (tre commits) og
          merker seg selv «ikke ferdig løsning».
19. juni  Konseptdokument v3. Kortutdeling flyttet til
          «Avgrensning og videre» — dagen etter at prototypen kom.
23. juni  Fremdriftsplan v23 og v24. Kortutdeling og
          sesongkopiering står som «Ferdig» i modultabellen.
          Fra «avgrenset bort» til «ferdig» på fire dager.
23. jun–  Kapittel 9 kopieres ORDRETT gjennom v24, v26, v27, v29.
5. juli   Ingen leser det mot koden.
1. aug    v31 fortetter kapittelet. Parenteser, presiseringer og
          hele avsnitt forsvinner.

TRE MEKANISMER, IKKE ÉN:

1. KOMPRIMERING (15.–18. juni). Ti sider ble tre. Det som falt ut
   ble aldri notert som fjernet. Her forsvant kursinformasjonssiden,
   RA-registrering av svar, og detaljert purringslogikk.

2. STATUSDRIFT (18.–23. juni). Punkter flyttet fra «avgrensning»
   til «ferdige moduler» uten at kode ble skrevet. Trolig fordi et
   konseptdokument beskriver hva systemet SKAL være, og en
   statustabell beskriver hva det ER — og ingen sjekket forskjellen.

3. FRYSNING (23. juni–5. juli). Kapittelet var «ferdig», så ingen
   så på det igjen. Versjoneringsregelen «ingenting forsvinner»
   beskyttet feilene like trofast som innholdet.

Agenttestene fanget ingenting av dette. De tester at det som finnes
virker, ikke at noe mangler. Uten fasit er de blinde for hull.

### NY FAST RUTINE (utvidet 4. august)

- Sammenlign plan mot kode punkt for punkt før noe erklæres ferdig.
- Sammenligningen går BEGGE veier. Koden kan ha mer enn planen
  husket å be om — vertskapsskjemaet er bevis på det.
- Når et dokument kortes ned: noter hva som ble fjernet og hvorfor.
- En statuslinje kopieres aldri videre uten ny kontroll.

---

## BLOKK A — MÅ FØR YLVA SER SYSTEMET

### A1. Flytteflyten
STATUS: SQL rettet, kode bygget (f429d9e). TEST GJENSTÅR.

flytt_skole_til_kurs nullstilte 12 felter, men ikke
forste_utsending_at. Flyttet skole telte som invitert på nytt kurs
og ble hoppet over med «allerede sendt» — mens e-posten pekte på
gammel hall og dato. Nøyaktig problemet Marielle beskrev hos
QuestBack (Sem skole, Runarhallen → Hårkollhallen).

RETTET: nullstiller nå alle fem sendt-stempler + er_vertskap.
Banner etter flytting minner RA om å sende ny invitasjon.

TEST: flytt en testskole som ALLEREDE har fått invitasjon →
sjekk banner → åpne Send invitasjoner på nytt kurs → skal vise
«Ikke sendt». Bilde av stemplene før og etter i Supabase.

### A2. Registrer svar på vegne av skolen
KILDE: Konseptdokument v1, 15. juni, side 5.
BEVIS: BEVIST IKKE BYGGET.

Ordrett fra v1: «De som svarer per e-post i stedet, registrerer RA
med ett klikk, så de også faller ut av purrekøen.»

Kravet forsvant i konsept v2 tre dager senere. Marielle og Ylva ba
om det i august, hver for seg og uoppfordret — de ba altså om noe
som sto i den opprinnelige spesifikasjonen.

Marielle: «Noen er jo alltid håpløse og vil bare gi et svar til oss
per mail. Kan vi registrere slike svar selv?»
Ylva: «Før bare godtok vi da en manuell påmelding.»
Marielle: «Jeg gruer meg nesten til kursperioden.»

BYGG: RA åpner skolens rad og fyller ut det samme skolen ville
fylt ut. Registrer HVEM som førte det inn og NÅR, så man senere
ser hvorfor svaret ser annerledes ut. Skolen skal falle ut av
purrekøen på samme måte som ved selvbetjent svar.

### A3. Vertskap — MINDRE ENN VI TRODDE
KILDE: Konsept v1 side 2–3 og 9, fremdriftsplan 9.2 og 9.4.
BEVIS: skjemablokken BEVIST BYGGET. RA-enden BEVIST IKKE BYGGET.

VIKTIG KORREKSJON fra 3. august: forrige retteliste sa «kolonnene
finnes, ingenting er bygget». Det stemmer ikke.

BEVIST BYGGET: SvarSkjema.jsx har hele vertskapsblokken med
betinget logikk. Den vises kun når er_vertskap = true. Siden
flagget aldri settes, vises den aldri i praksis.

GJENSTÅR:
- RA må kunne peke ut vertskap. Avkryssing når skoler kobles til
  kurs. Flere skoler kan være vertskap sammen (sjelden, men skjer).
  AVKLART 4. aug (Kjartan): Senja er tilfellet der ALLE skolene på
  kurset er vertskap. Sjeldent, men muligheten må finnes. Ingen
  egen mekanikk trengs — RA huker av så mange skoler som skal
  være det. Oppmøtetiden ligger på kurset, så alle vertskap på
  samme kurs får samme tid.
- Nei-svar på vertskap må ROPE til RA — kurset står uten hall.
- Påminnelsen må minne vertskapet om rollen OG oppmøtetiden.
  Skolen sa ja i august, kurset er i september.

FRA QUESTBACK-DATA (79 svar høsten 2026): 18 skoler fikk
vertskapsspørsmålet. 13 ja, 3 nei, 2 svarte ikke. Nesten hver
sjette sier nei. Begrunnelser: for liten gymsal, kronglete
reisevei, foreldrepermisjon + «var vertskap i fjor òg».

### A4. Oppmøtetider — HØRER SAMMEN MED A3
KILDE: Konseptdokument v1, side 2, tabell kurs.
BEVIS: BEVIST IKKE BYGGET (kolonnene finnes ikke).

Ordrett fra v1: feltet «oppmøte vertskap / øvrige» med verdien
«08.50 / 09.50 — de to tidspunktene fra fylkesarkene».

ETT krav, TO klokkeslett. Forrige retteliste ba bare om
vertskap_oppmote — det er halve kravet.

Bekreftet ved å lese kopier_kurs i Supabase: kurstabellen har
nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong, status,
maks_antall, merknad, kursholder_id, backup_kursholder_id, uke,
dag, navn. Ingen vertskapskolonne. Ingen oppmøtetider.

BYGG: to nye kolonner på kurs. Vises i påminnelsen og på
kursinformasjonssiden (A5). Marielle: noen kurs har avvikende
tider — gjelder hele kurset, ikke bare vertskapet.

### A5. Kursinformasjonssiden — FERDIG OG BEVIST 4. aug (08975ae)
KILDE: Konseptdokument v1, 15. juni, side 3–4.
BEVIS: var BEVIST IKKE BYGGET. NÅ BYGGET OG BEVIST — se GJORT 4. AUGUST.

HELE BLOKK A ER DERMED LUKKET.

En hel modul som forsvant i komprimeringen 18. juni og aldri kom
tilbake. Ingen fremdriftsplan fra v16 til v31 nevner den.

Fra v1: når skolen trykker send, er det ikke slutten — det er
overgangen til «nå skal dere forberede dere». I stedet for at all
kursinfo ligger i en e-post som forsvinner i innboksen, sendes
skolen til en kursinformasjonsside på hjemmesiden.

TO LAG:
- Kursspesifikk topp, hentet automatisk: «Ditt kurs: torsdag
  27.08, Hegg skole, oppmøte 09.50, dere er vertskap.» Samme kilde
  som påminnelsen — alltid oppdatert hvis RA endrer noe.
- Fast evergreen-mal: program for dagen, nominasjon av
  trivselsledere, mål med kurset, vertskapsrolle, forberedelser,
  forventninger til voksne, foto/video-regler. Likt hver sesong,
  redigeres som én mal.

FIRE LENKER som gjør kursinfo til et nav:
- «Høstens leker er filmet» → ressursbiblioteket (Fase 3)
- «Programbeskrivelsen» → dokumentarkivet på Min side
- «Kulturkort deles ut på kursdagen» → kulturkort-modulen
- Utstyrspakker (liten/stor) → samme salgsspor som evalueringens
  kjøpsinteresse

MERK: de to første lenkene peker inn i Fase 3, som ikke er bygget.
Siden kan bygges nå med topp + mal + de to siste lenkene, og
utvides når ressursbiblioteket finnes.

Dette løser også A4 slik det opprinnelig var tenkt: oppmøtetiden
skulle stå her, ikke i invitasjonen.

---

## A6. «TEKSTER OG MALER»-SIDEN — FERDIG OG BEVIST (19a4528)

KILDE: ikke et gammelt krav. Oppdaget 4. aug da A5 ble bygget.
BEVIS: BEVIST IKKE BYGGET — null treff på en redigeringsside for
       innstillinger-tabellen i hele src/.

Sju e-poster og kursinfoteksten ligger nå som redigerbar tekst i
innstillinger. Men det finnes ingen side å redigere dem PÅ. Alt
skjer i Supabase SQL-editor. Vi har altså flyttet tekstene ut av
koden uten å gi noen andre enn Kjartan tilgang til dem.

KJARTAN 4. aug: «gjør ingenting at ikke redigering er på plass
enda, bare det ikke glemmes — at vi jobber tungvint, det har vi
ikke tid til.»

BYGG: én admin-side som leser og skriver innstillinger:
- de seks e-postene (emne + tekst)
- kursinfo_tekst
- epost_vertskap_notat
- avsender_navn / avsender_epost / svar_til_epost / nettsted_url
- purring_dager / trinn3_dager / paaminnelse_dager_for /
  evaluering_klokkeslett
Med liste over plassholderne som finnes i hver mal, og en
forklaring av formatteringen (## overskrift, - punkt,
[tekst](url) lenke).

IKKE motor_aktiv i grensesnittet. Nødbremsen styres bevisst i
basen — den skal ikke være en knapp noen kan komme borti.

MERK sikkerhetsventilen: mangler en e-postmal, AVBRYTES utsendingen.
En redigeringsside som lar noen lagre en tom mal, stanser dermed
all utsending. Tomme maler må avvises i skjemaet.

---

## BLOKK B — KORTUTDELING (egen sak, krever avklaring først)

KILDE: Konseptdokument v1, side 7–8. Fremdriftsplan v23–v31 9.7.
BEVIS: RETTET 5. AUGUST — den forrige teksten her sa «BEVIST
       IKKE BYGGET. Null kodetreff, null data». Det er feil, og
       feilen rakk å bli kopiert videre inn i første utkast til
       FREMDRIFTSPLAN-v32 før en kontrollør fanget den.

       Det som faktisk finnes:
       - src/pages/AdminKortutdeling.jsx, 150 linjer, bygget
         18. juni i tre commits (e45a129, 4b8fd71, 5cf24a7).
       - Rutet i App.jsx:121 (/admin/kortutdeling) og lenket
         fra admin-menyen (Admin.jsx:48). Siden er altså i drift.
       - Siden merker seg selv: «Prototype til gjennomgang med
         Camilla — ikke ferdig løsning.»
       - kort_status brukes 6 steder i koden, med RPC
         sett_kort_status. antall_kort har derimot NULL kodetreff
         — tallet regnes ut på skjermen hver gang, ikke lagret.
       - Datamengden i kolonnene er IKKE kontrollert på nytt
         5. august (ingen databasetilgang i den økten). Påstanden
         «null data» står derfor som ubekreftet, ikke som bevis.

       Riktig status er altså: PROTOTYPE I DRIFT, MODULEN IKKE
       FULLFØRT — ikke «ikke bygget».

Det mangler fortsatt mot v1-spesifikasjonen: Camillas to faner,
den fjerde statusen «ikke ønsket» (prototypen har Ikke behandlet /
Fakturer / Gratis), kursholderens visning på kursdagen — som er
selve tidsbesparelsen — håndteringen av skoler uten antall, og
avklaringen av når tallet fryses.

Står som «Ferdig» i modultabellen i v23, v24, v26, v27, v29 og
v31. Den påstanden er feil og har vært det siden 23. juni: det som
fantes 23. juni var en fem dager gammel prototype som selv sa den
ikke var ferdig, og det er ikke skrevet én linje kode på den siden.

### Slik konseptet beskriver den (v1, 15. juni)

Antall trivselsledere + 10 %, alltid rundet opp. 17 → 18,7 → 19.

Dukker opp hos Camilla på SAMME side som kulturkortbestillingene,
som en egen fane hun veksler til: «Fra kurspåmelding».

«Fanen er forslag, ikke ferdige bestillinger.» Camilla kan justere,
slette eller la stå hver rad. Hun setter status per skole:
fakturer / gratis / ikke ønsket / behandlet. Systemet beregner
antallet, men tar INGEN beslutning om fakturering.

Kursholder får antallet som info på kursdagen og deler ut. Ingen
telling, ingen spørsmål til hver skole — der ligger tidsbesparelsen.

Skoler som svarer nei eller ikke melder antall får ingen kort-rad.
Endrer skolen antall eller flyttes til annet kurs, oppdateres
kort-tallet automatisk fordi det henger på samme kurs_skole-rad.

### Camillas innvendinger (e-post juni 2026)

Fire av dem er allerede dekket av konseptet: opt-ut finnes som
«ikke ønsket», gratis finnes som egen status, endrede tall
oppdateres automatisk, og hun har full kontroll over hver rad.

To er IKKE dekket og må løses:

- FORHÅNDSBESTILLINGER. Skoler som allerede har bestilt kort på
  hjemmesiden skal ikke få kort på kurset. Camilla må i dag varsle
  både kursholder og bestiller manuelt. De to fanene ligger side om
  side, men snakker ikke sammen. Systemet vet begge deler.
- ÉN LISTE. Camilla: «Jeg er OK med forslaget så lenge jeg har
  1 liste å forholde meg til.» PRESISERT AV KJARTAN 4. aug: det
  hun ber om er at den nye kortboksen SNAKKER MED fanen hun
  allerede har under Kulturkort → Bestillinger. Altså samme
  krav som forhåndsbestillingene over — én kryssjekk, ikke to
  systemer. Dette er hele leveransen hun trenger.

### To beslutninger — BEGGE AVKLART 4. AUGUST

1. AVTALESPØRSMÅLET — AVKLART (Kjartan).
   «Variabel kostnad» betyr at beløpet varierer med antall
   trivselsledere, ikke at kortene er valgfrie. Kontrakten pålegger
   skolen å følge programmet, og kulturkort er en del av det.
   KONSEKVENS FOR BYGGINGEN: kortantallet beregnes for ALLE skoler
   som melder antall. Ingen opt-in.
   Beregningen er en INTERN beskjed — skolen ser den aldri, verken
   i skjemaet eller på kursinformasjonssiden.
   Om kursholder faktisk deler ut i tråd med tallet er en
   PRAKSIS, ikke en regel i koden. Camilla kan overstyre hver rad,
   og praksisen kan endres uten kodeendring.

2. KALENDEREN — PARKERT (Kjartan).
   Ikke viktig nå. Eventuell Google Kalender-kobling vurderes
   senere. Spørsmålet om dobbeltføring tas med RA-ene ved
   utrulling, ikke som byggeoppgave.

### Åpent fra konseptet selv (v1, side 8)

«Når skal kortantallet fryses? Hvis en skole justerer antallet
sent, endrer tallet seg helt frem til kursdagen. Mulig løsning:
lås tallet noen dager før kurset, eller vis sist oppdatert.»

Sto også i fremdriftsplan v16 som eget avklaringspunkt til
Kjartan/Camilla. Aldri besvart.

### Camillas eget forslag

«Tror det kan være lurt å høre med RA-ene ang. dette.» En billig
time som sparer en ombygging.

---

## BLOKK C — MÅ FØR FØRSTE EKTE UTSENDING

- [ ] eivind_epost tilbake til eivind@trivselsleder.no
      (står nå på kjartan+eivindtest@)
- [ ] motor_aktiv til 'ja'
- [ ] Slett alt testinnhold: 15 «(agenttest)»-skoler, 3 nettverk,
      3 kurs, gamle testkurset 59070916...

---

## BLOKK D — MÅ FØR LANSERING

### FUNN FRA GJENNOMGANGEN AV v8-v30 (natt til 6. august)

Hele gjennomgangen ligger i FUNN-v8-v30.md / .pdf. Kort:

TO VIPPEPUNKTER. v20 (22. juni) ble bygget om til «komplett
samleplan», ble STORRE enn v17 - og mistet likevel elleve krav for
godt. v30 (10. juli) sier den bare legger til ti punkter; den er
24 % kortere enn v29.

PRESISERING: kursinfo-kravet star ordrett i v15, v16 OG v17. Ikke
bare til v16, som HVA-FORSVANT og v32 sier. Det dode i v20.

NYE APNE PUNKTER som ikke sto noe sted fra for:
- [ ] Tilgangsstyring pa kursholderkalenderen: «deltakerliste,
      betaling, instruksjoner kun synlig for kursholder og admin»
      sto i v11-v29 og forsvant i v30. Personvernrelevant.
- [ ] Den tekniske Fase 3-designen (innhold_biter med pgvector,
      Edge Function, hybrid sok) sto i v13-v29, borte fra v30.
- [ ] Bruksanvisning + tilbakerulling som lanseringskrav: sto fra
      v8 til v29, borte fra v30. Staging-miljoet star fortsatt.
- [ ] Tripletex-integrasjon og arsbelop pa skolekortet: sto fra
      v9/v15 til v17, borte fra v20.
- [ ] Nar fryses kortantallet? Sto i v15, v16, v17 og konsept v1.
      49 dager ubesvart. Eldste apne spormal i materialet.
- [ ] v22 finnes ikke i mappa. Aldri skrevet, eller slettet?

METODEADVARSEL: forste utkast av funnrapporten ble felt av en
kontrollor. Maskinell begrepstelling gir falske tap fordi PDF-ene
bytter bindestrektype midt i serien (v14/v20/v21 bruker myk
bindestrek, resten vanlig). Bruk den som sokelys, aldri som maling.

### Sikkerhet

NYE PUNKTER 5. AUGUST — full gjennomgang, se SIKKERHET-5-august.md.
Fire api/kurs-endepunkter sto uten tilgangssjekk. BEVIST med et åpent
GET-kall som returnerte skolenavn, kontaktnavn og e-post for hele
basen. Rettet i koden, IKKE pushet ennå.

Disse ble IKKE rettet og står åpne:
- [ ] api/paamelding.js er helt åpen for skriving. Hvert kall lager en
      rad i paameldinger, et selskap i HubSpot og en e-post til post@.
      Ingen captcha, ingen ratebegrensning. Kan fylles med søppel.
- [ ] api/send-bestilling.js er et åpent e-postrelé: sender til en
      vilkårlig adresse fra noreply@trivselsleder.no. Domeneryktet.
- [ ] Supabase → Authentication → URL Configuration: kontroller at
      Redirect URLs IKKE har jokertegn. Koden er rettet uansett
      (trygtOrigin), men lista bør være stram.
- [ ] crypto.timingSafeEqual i krevCronEllerAnsatt i stedet for ===.
- [ ] varsle-eivind tørrkjøring returnerer ville_sendt_til, altså
      eivind_epost, til uinnlogget kaller med gyldig token. Lav.
- [ ] api/auth/feide/exchange.js: new URL(redirectUri) kaster på
      søppelinput → ubehandlet 500. Kosmetisk.
- [ ] scripts/seed-testbruker.sql har testbruker kjartaneide@me.com
      med HARDKODET PASSORD. Ligger sannsynligvis i klartekst i
      Git-historikken — det holder ikke å deaktivere brukeren.
- [ ] hent_evalueringer_admin er SECURITY DEFINER uten sjekk av
      hvem som spør. Alle med kall-tilgang får alle
      evalueringssvar, gullkorn og kjøpsinteresse.
- [ ] anon har lese+skriverett på kurs_skole_mottaker.
- [x] LUKKET 4. aug: flytt_skole_til_kurs hadde INGEN sjekk i det hele
      tatt — SECURITY DEFINER uten å spørre hvem som kaller. Funnet av
      agenttest 3 (en innlogget skoleadmin flyttet en skole, HTTP 204).
      Rettet: rollesjekk get_min_rolle() in ('superadmin','ansatt') inni
      funksjonen, pluss revoke execute fra public og anon.
      BEVIST I NETTLESER: anon får 401 «permission denied for function»,
      superadmin får 204. De atten feltene er uendret.
- [x] LUKKET 4. aug — STØRRE ENN TESTEN FANT: ALLE FEM api/admin-
      endepunktene sto uten autentisering, ikke bare det ene testen fant.
      Hvem som helst på internett kunne opprette skoler, godkjenne eller
      avvise påmeldinger, endre nettverk, koble skoler til kurs, og
      SLETTE en kurs_skole-rad med skolens svar og lenke.
      Rettet (commit d5f1e29): samme vakt i alle fem — Bearer-token,
      getUser, rolle må være superadmin eller ansatt. Ny src/lib/
      adminFetch.js legger på sesjonen automatisk, og alle ni
      kallstedene i frontend går gjennom den, så headeren ikke kan
      glemmes på ett sted senere.
      BEVIST I NETTLESER: kall uten innlogging gir 401 «Ikke
      autentisert», innlogget superadmin får 200 og vertskaps-
      avhukingen virker som før.
      MERK: de fire andre validerer kroppen FØR de sjekker innlogging,
      så et tomt kall gir 400 i stedet for 401. Ingen slipper forbi —
      men rekkefølgen bør snus ved neste anledning.
- [x] LUKKET 4. aug: ingen hadde skriverett på innstillinger — heller
      ikke service_role. Oppdaget da agenttesten prøvde å tømme en
      e-postmal og fikk 403. Løst av A6-SQL-en: RLS på, policyer for
      ansatt/superadmin, anon revoket.

### E-post
- [ ] De fire konto-e-postene bygger lenker med FAST domene, ikke
      nettsted_url. Glemt-passord sender til gamle trivselsleder.no.
- [ ] Fotlenken i alle e-poster peker på gamle trivselsleder.no.
- [ ] nettsted_url til trivselsleder.no ved lansering.

---

## BLOKK E — KAN VENTE

### Beskrevet i planen, bevist ikke bygget

- FLYTTEFORESPØRSEL, hele flyten. onsket_kurs_id skrives aldri.
  KILDE: konsept v1 side 4–5, med full mekanikk: systemet viser
  andre kurs i nærheten samme periode, skolen velger og sender
  forespørsel, RA ser den flagget på ØNSKET kurs med kapasitet mot
  maks_antall, og svarer ja (skolen flyttes automatisk), nei eller
  med en melding. I dag: skolen krysser av for at de er åpne for
  et annet kurs, og RA må ringe for å finne ut hvilket.
  DELVIS DEKKET: RA kan flytte manuelt, og apen_for_annet_kurs
  vises. Det som mangler er HVILKET kurs.

- KOPIER KURSPLAN TIL NY SESONG. Står som «Ferdig» siden 23. juni.
  Det som finnes er kopier_kurs — den dupliserer ÉN kursrad med
  samme dato, samme sesong, uten skoler. Konsept v1 beskriver noe
  helt annet: hele kursplanen kopieres vår→vår, høst→høst,
  strukturen følger med (ruter, nettverk, haller, vertskap, datoer
  forskjøvet til riktig uke), skoler som har sagt opp markeres for
  fjerning, nye skoler i samme kommune foreslås plassert
  geografisk, RA bekrefter eller overstyrer. Verdien ligger i
  skolekoblingene, ikke i kursraden.
  GODT NYTT: kopier_kurs tar ikke med kurs_skole-rader, så
  stempel-feilen fra A1 kan ikke oppstå her.

- KAPASITET MOT maks_antall. RETTET 5. AUGUST: feltet VISES — det er
  et vanlig inputfelt i kursskjemaet (AdminKursplanlegger.jsx:711).
  Det som mangler er bruken: ingen skjerm sammenligner det mot antall
  påmeldte, og det finnes ingen flytteforespørsel å vise det ved.

- «VET IKKE ENNÅ» PÅ ANTALL TRIVSELSLEDERE. UTDATERT — feltet ble
  gjort valgfritt 4. august (SvarSkjema.jsx:85 og SvarOversikt.jsx:159
  lagrer null når det står tomt). Teksten under er beholdt som
  historikk. Antall VAR et påkrevd tallfelt. v27 seksjon 12.5: læreren som skriver «vi vet ikke hvor
  mange vi blir» gjør det fordi skjemaet ikke har plass til
  usikkerhet. Billigste retten på hele listen.

- OVERSTYRBAR MOTTAKER PER SKOLE. Står i datamodellen i alle
  versjoner fra v16: «mottaker/e-post/mobil (overstyrbar)».
  Mottaker hentes alltid fra skolekortet. Ingen per-rad-override.

- TRAPPETRINN TRINN 4, «send til alle TL-ansvarlige nå».
  MERK: dette er IKKE et glemt krav. Trappetrinn-modellen finnes
  ikke i noen versjon før v31 (1. august) — ordet er søkt opp i
  alle 41 sider av v29 uten treff. Trinn 4 er en UFERDIG NY
  funksjon, tre uker gammel, ikke en forsvunnet gammel.
  Koden finnes allerede som trinn 3; den er bare låst bak
  tidagersregelen. Å bygge trinn 4 er å gi RA lov til å forbigå
  sperren bevisst. Beslutning som følger med: hvem kan overstyre,
  og skal det logges.

- TRAPPETRINN-VISNING PER SKOLE. Oppfølging-siden viser fire
  separate lister, ikke hvor hver skole står i trappen.
  Samme forbehold som over: nytt krav fra 1. august.

- EKSPORT FRA KURSPLANLEGGEREN. Konsept v1: «CSV/Excel for dem som
  fortsatt vil ha et regneark, men det er ikke lenger kilden —
  bare en utskrift.» Skoleliste og evaluering har CSV.
  Kursoversikt og svar har ingen eksport.

- AKTIV/INAKTIV PER HALL. Står som «mulig senere» i alle versjoner
  fra v23. Kursholdere har aktiv-felt, haller har det ikke.

- HALLREGISTERET — RETTET 5. AUGUST, denne sto feil.
  Konsept v1 §9 (side 7) lister hallnavn, kommune, ADRESSE,
  kontaktperson, e-post, telefon, PRIS. Konsept v2 strøk adresse og
  pris og la til fylke, nettverk og merknad.
  MEN: AdminHaller.jsx:311 og :313 har BÅDE Adresse og Pris i
  redigeringsskjemaet. Feltene ble bygget likevel. Den forrige
  teksten her sa at de manglet, og den feilen vandret videre inn i
  FREMDRIFTSPLAN-v32 §3.1 og TESTOPPDRAG-v32 før den ble fanget.
  Det som faktisk mangler:
  - [ ] DATA. Hallregister_utkast_2.xlsx har verken adresse eller
        pris, så de 161 radene har tomme felt. Må samles inn.
  - [ ] VISNING. Halltabellen viser bare Navn, Kommune og Nettverk
        (AdminHaller.jsx:152-156). Adresse og pris er usynlige uten
        å åpne raden.

- PURRING: RA VELGER MÅLGRUPPE. Konsept v1 side 5: RA skal kunne
  purre alle egne ubesvarte, ett bestemt kurs, eller ett område —
  og superadmin kjøre alle regioner i én felles purrerunde. I dag
  hukes skoler av enkeltvis. Fungerer, men skalerer dårlig når
  ~150 kurs i året skal håndteres.

- AUTOMATISK UTSENDING TIL POTENSIELLE SKOLER, mai og november.
  Retningen har snudd underveis: konsept v1 sier «Ikke nå — det
  hører til kulturkort-/salgssporet». Fremdriftsplan v23–v29 har
  den som 9.9 med «Hører hjemme i Fase 6». v31 strøk
  godkjenningskøen («ansatte godkjenner før utsending; logging i
  HubSpot») — uten den bryter funksjonen med husregelen om at
  systemet foreslår og mennesket bestemmer.

### Døde kolonner (rydd eller ta i bruk)
- kurs.sesong, kurs.dag, kurs.antall_skoler — ingen input, ingen
  visning, 0 rader med verdi
- kurs.status — databasen skriver 'planlagt' ved kopiering, appen
  stripper feltet ved lagring. Fylles av én kilde, avvises av en
  annen.
- skoler.kommunenr — dødt
- evalueringer.semester_id — dødt

### Skrives, men vises aldri
- kurs_skole.svart_dato — RA ser ikke NÅR skolen svarte
- kurs_skole_mottaker.apnet_at — åpningssporing finnes i dataene,
  ikke i grensesnittet
- evalueringer.svart_tidspunkt — samme

### Funksjoner uten inngang
- hent_evalueringer_eksport — dublett, kan slettes
- get_skoleansatte_for_meg — hører til Min side
- get_mine_skoler — aldri-koblet variant av get_mine_skole_ids
(get_min_rolle og get_mine_skole_ids har 0 app-kall, men brukes i
RLS-policyer — IKKE døde, kritiske.)

### Fra agenttest 2
- Hall-søk matcher bare navn, ikke sted/by
- Gjenlagt skole havner nederst i listen
- Skoler som alt har svart havner i «send invitasjon»-tellingen
- RA auto-fylles ikke — venter på stor dataimport

---

## UAVKLART — TRENGER SVAR FØR BYGGING

1. FELLES OPPLÆRING — AVKLART 4. aug (Kjartan). Senja er tilfellet
   der ALLE skolene på kurset er vertskap. Sjeldent, men
   muligheten må finnes. Ingen egen mekanikk trengs — RA huker av
   så mange skoler som skal være det. Se A3.
   A3 er dermed ikke lenger blokkert.

2. KALENDEREN — AVKLART 4. aug. Parkert. Se blokk B.

3. KULTURKORT OG AVTALEN — AVKLART 4. aug. Kort beregnes for alle,
   internt. Se blokk B.

4. NÅR FRYSES KORTANTALLET? Åpent siden 15. juni. Eneste
   gjenstående spørsmål i blokk B. Kan besvares når Camilla ser
   listen første gang — praksis, ikke arkitektur.

5. RA-TILGANG. Konsept v1 og alle fremdriftsplaner: «alle ansatte
   kan endre ethvert kurs, også på tvers av område».
   QuestBack-kravene fra RA-ene: filter per område, fordi det å se
   alle kurs oppleves som støy. Begge kan være riktige — full
   tilgang, filtrert visning som standard. Men planen sier i dag
   to ting samtidig.

6. kurs.sesong / dag / status: brukes eller slettes?

---

## BEVIST BYGGET — IKKE BYGG OM IGJEN

Kontrollert mot koden 4. august. Disse finnes og virker:

- Vertskapsblokken i svarskjemaet, med betinget logikk.
  Mangler bare at er_vertskap settes noe sted. (Se A3.)
- «Marker som håndtert» / «Angre» på melding fra skole
  (sett_melding_handtert i SvarOversikt.jsx).
- Påminnelsen gjengir skolens eget antall, hentet fra basen ved
  utsending. Konsept v1 krevde «alltid dagens tall» — det er
  oppfylt. Retter RA antallet dagen før kurset, går det nye tallet
  ut. Eneste sted der koden gjør mer enn planen husket å be om.
- Kobling kursholder + backup i kurs-skjemaet.
- Betinget logikk ellers: ja gir antall + kommentar, nei gir årsak
  + «åpen for annet kurs».

---

## HVA SOM ALLEREDE ER DEKKET (til Ylva-gjennomgangen)

Av ti ønsker i QuestBack-brevet er ni dekket eller overgått:
import av bakgrunnsdata (unødvendig — dataene bor i basen),
hall/dato per mottaker, purring kun til ubesvarte, nye
kontaktpersoner underveis, én samlet løsning, påminnelse,
evaluering automatisk, kjøpsinteresse med varsel.

Ylvas «QB utsendt»-kolonne — en manuell liste de fører i dag —
forsvinner helt. Verdt å nevne når hun ser systemet.

Trappetrinnet sto ikke i ønskelisten. Det kom fra Ylva selv.

---

## TIL FREMDRIFTSPLAN v32 — VIDEOPRODUKSJON (innspill fra Tage/Edalio)

Tage har testet en arbeidsflyt for videoproduksjon: Claude kjører
skjermopptak etter manus, klipp hentes fra Artlist via MCP, og en
norsk AI-stemme (norsk-ai-stemme.no) leser voice-over.

RELEVANS: instruksjonsvideoen for kursplanleggeren ble utsatt
(v31 seksjon 37) fordi agent-opptak ga ujevn rytme.

BESLUTNINGEN OM AI-VIDEO MÅ NYANSERES, IKKE OMGJØRES:
- v31 seksjon 31.1 fraråder AI-video. Begrunnelsen gjaldt GENERERT
  video av fysiske aktiviteter — barn som leker blir utroverdig.
  Det står ved lag.
- Skjermopptak av grensesnitt + AI-stemme er noe annet:
  skjermbildet er ekte, stemmen leser en tekst vi har skrevet.

MÅ AVKLARES: (1) test stemmen på vårt fagspråk først, (2) lisens
og eierskap over år, (3) passer flyten også til lekevideoer i
Fase 3?

---

## GJORT 4. AUGUST

### A1 — FERDIG OG BEVIST
Flyttet TEST Trondheim skole 2 fra Trondheim- til Arendal-kurset.
Banneret kom, skolen sto som «Ikke sendt» på det nye kurset, og
alle fem stempler + er_vertskap var nullstilt i basen.

NYTT FUNN under testen: «Flytt til annet kurs» vises KUN på skoler
som har svart «Kommer ikke». En skole som har sagt ja, eller som
ikke har svart, kan ikke flyttes i det hele tatt. Marielles
Sem skole-tilfelle handlet om hallbytte, ikke om et nei — så det
er uklart om begrensningen er bevisst. Må avklares.

Bekreftet med egne øyne samtidig: flyttedialogen viser ingen
kapasitet, og vet ikke hvilket kurs skolen selv ønsker seg.

### A2 — FERDIG OG BEVIST (commit 1c1e4f7)
RA kan nå registrere og endre svar på vegne av skolen, fra «Se
svar». Husets egen modal, samme betingede felter som skolens eget
skjema, vertskap bevart uendret når feltet er skjult.

DATABASE: lagre_skole_svar utvidet med p_pa_vegne_av boolean
default false. Den gamle 8-parameter-varianten SLETTET i samme
transaksjon, og grant execute gitt på nytt.

VIKTIG LÆRDOM: en ny parameter med standardverdi ERSTATTER ikke en
funksjon — den lager en overload. Med både 8- og 9-parameter-
varianten i basen ville et kall med åtte navngitte parametre blitt
tvetydig, og skolenes eget svarskjema ville sluttet å virke.
REGEL: utvider vi en RPC med ny parameter, slettes den gamle
signaturen i samme transaksjon, og GRANT settes på nytt.

DESIGNVALG SOM VISTE SEG RIKTIG: forslaget var å bruke auth.uid()
alene som signal på at en ansatt førte inn svaret. Det ble avvist
fordi skolenes kontaktpersoner HAR brukerkontoer. Under testen ble
skolens eget svar sendt fra en nettleser der superadmin var
innlogget — med auth.uid()-varianten ville det svaret blitt
feilstemplet som «Registrert av Kjartan Eide». Med den eksplisitte
parameteren forble kolonnene null, som de skal.

BEVIST I PRODUKSJON:
- Svar ført inn for TEST Trondheim skole 4: kommer=true,
  antall_tl=7, svart=true, svar_registrert_av satt.
- Purrekøen falt fra fire skoler til tre — skolen forsvant.
- «Registrert av Kjartan Eide 4.8.» vises på raden.
- Skolens egen lenke virker fortsatt: TEST Trondheim skole 3
  svarte selv, og begge kolonnene forble null.

### A3 + A4 VERTSKAP OG OPPMØTETIDER — FERDIG
Commits aa10d70, a4a577c, f04495c.

Del 1: nye kolonner kurs.oppmote_vertskap og kurs.oppmote_ovrige.
Tidsfelter i kursskjemaet. Avkryssing «Vertskap» per skole ved
kobling — flere skoler kan være vertskap samtidig. Vertskap synlig
i kursoversikt og «Se svar». SvarSkjema.jsx ble IKKE rørt;
vertskapsblokken våknet av seg selv da flagget ble satt.

Del 2: {oppmotetid} hentet kurs.start_tid — altså når kurset
BEGYNNER, ikke når skolene skal MØTE. Nå hentes oppmote_vertskap
eller oppmote_ovrige styrt av kurs_skole.er_vertskap. Er feltet
tomt, strippes hele «Oppmøte:»-linjen — ingen fallback til
start_tid, for da ville skolen møtt for sent.
Oppmøtetiden vises også i skolens svarskjema. Nei på vertskap gir
rødt varsel «⚠ Vertskap sa NEI — kurset kan stå uten hall» både i
kursoversikten og på skoleraden, med årsak.

VIKTIG KORREKSJON UNDERVEIS: forslaget var å skille vertskap fra
øvrige på MOTTAKERROLLEN (htla/tla). Det er feil — vertskap er en
egenskap ved skolen, og hver skole har en hovedkontakt. Ville gitt
alle hovedkontakter i landet vertskapstiden.

DATABASE: hent_kurs_skole_via_token slettet og opprettet på nytt
med feltet kurs_oppmotetid, i transaksjon, med grant til anon.
Valget vertskap/øvrig gjøres inne i RPC-en, så frontenden slipper
å kjenne regelen.

BEVIST I NETTLESER: tidene lagres og består, to skoler kan være
vertskap samtidig, vertskapsspørsmålet vises i skolens skjema,
skolen ser «Oppmøte: 08:15» med forklaring, nei-varselet dukker
opp i kursoversikten.

IKKE BEVIST: at påminnelses-E-POSTEN faktisk viser riktig
oppmøtetid. Tørrkjøring viser bare emne og lenke, ikke brødtekst.
Krever at nødbremsen skrus av og på igjen. FØRSTE PUNKT NESTE ØKT.

RESTPUNKT: vertskapslisten i kursoversikten ble flyttet fra
«Skoler»-kolonnen til under kursnavnet, men den kolonnen er like
smal. Raden er fortsatt dobbelt så høy som de andre. Kosmetisk.

### INVITASJONEN UT AV KODEN — FERDIG OG BEVIST (ce05258)
Fem av seks e-poster lå i innstillinger; invitasjonen lå i koden.
Nå ligger den i basen som epost_invitasjon_emne/-tekst, og RA kan
redigere den. Samme mønster som de fem andre: fyllPlassholdere +
tekstTilHtml + strip av linjer med tomme plassholdere.
Sikkerhetsventil: mangler malen i basen, AVBRYTER utsendingen —
ingen tom e-post, ingen fallback til hardkodet tekst.

TEKSTEN BLE UTVIDET samtidig: dato flyttet til faktablokk, og
{hall} + {oppmotetid} lagt til. Invitasjonen sier nå når og hvor
skolen skal møte — det gjorde den aldri før.

BEVIST MED EKTE E-POST 4. aug kl 15:21–15:25 (motor_aktiv ble
skrudd på og AV igjen):
- Invitasjon (Arendal): tekst fra basen, «Dato: 15. august 2026»,
  «Sted: Alcoahallen». Oppmøtelinjen BORTE fordi kurset ikke har
  oppmøtetider — strip-regelen virker i ekte e-post.
- Påminnelse til vertskapsskole (Trondheim 1): «Oppmøte: 08:15».
- Påminnelse til øvrig skole (Trondheim 4): «Oppmøte: 08:50» og
  «Dere har meldt på 7 trivselsledere» — tallet RA førte inn i A2.
  Samme kurs, to riktige tider, styrt av er_vertskap.
- Bonus: TEST Trondheim skole 2 (flyttet i A1) sto i
  invitasjonslisten som «ikke sendt» — A1-rettelsen bevist også i
  utsendingsflyten.

### VERTSKAPSNOTATET — SISTE REST AV A3, UNDER BYGGING
FUNNET AV KJARTAN ved å lese den ferdige e-posten: påminnelsen
viser vertskapets TID, men sier ikke at skolen ER vertskap.
Rettelisten krevde begge («minne om rollen OG oppmøtetiden»).
Beskjeden til Claude Code utelot rollen.

LØSNING: ny innstilling epost_vertskap_notat + plassholderen
{vertskapsnotat} i invitasjon og påminnelse (lagt inn i basen
4. aug kveld). Koden som fyller den bygges nå: er_vertskap gir
notatet, ellers tom streng — linjen forsvinner via strip.

VIKTIG MELLOMTILSTAND: malene har plassholderen, koden fyller den
ikke ennå. Sendes noe FØR fiksen er ute, står {vertskapsnotat} som
synlig tekst i e-posten. Nødbremsen er PÅ, så ingenting kan gå ut
— men fiksen må pushes og bevises før neste ekte utsending.

MERK også: Claude Code påsto at de to sendte påminnelsene
inneholdt plassholderen. Feil — de ble sendt FØR malene ble
endret, bekreftet med skjermbilder. Lærdom: ikke slutt fra dagens
tilstand til hva som ble sendt tidligere.

### Til opprydding (blokk C)
Auth-brukere: 23 kontoer i Supabase, de fleste
kjartan+fikskurs...@trivselsleder.no fra agenttestene. Slettes
sammen med testskolene.

---

## NESTE STEG

HELE BLOKK A ER FERDIG OG BEVIST (A1–A6). Oppdatert 5. august.

GJORT SIDEN FORRIGE OPPDATERING:
- A6 «Tekster og maler»-siden (commit 19a4528). De ansatte
  redigerer nå alle seks e-postene, kursinfoteksten,
  vertskapsnotatet, adressene og terskelverdiene selv.
  Bekreftet av Kjartan: «fikk endret og lagret».
- Tilgangssjekk på alle fem api/admin/*-endepunkter, og
  rollesjekk inne i flytt_skole_til_kurs. Begge funnene kom fra
  agenttest 3.
- FREMDRIFTSPLAN-v32.md skrevet — og deretter kontrollert av en
  annen agent, som felte fem påstander. Dokumentet er skrevet om.
  Se v32 §9.
- HVA-FORSVANT.md og DOKUMENTOVERSIKT.md skrevet.

DET SOM STÅR IGJEN:

1. Blokk B kortutdeling — RA-runde før bygging. Merk at det
   FINNES en prototype i drift (se Blokk B over); spørsmålet er
   hva som skal til for å gjøre den ferdig, ikke om noe skal
   bygges fra bunnen.
2. Full loop-test mot FREMDRIFTSPLAN-v32 som fasit. Oppdragsteksten
   ligger ferdig i TESTOPPDRAG-v32.md — 32 punkter, klar til å limes
   inn til testagenten.
3. RLS-gjennomgangen. Anbefalt i konsept v3 den 19. juni, fortsatt
   ikke gjort. Agenttest 3 viste 4. august hvorfor den haster.
4. Flytteforespørsel — onsket_kurs_id finnes i basen, men i null
   linjer kode. Kravet står i v1, v2 OG v3.


---

## GJORT 4. AUGUST, KVELD — A5 KURSINFORMASJONSSIDEN

Commit 08975ae. Ny side /kursinfo/:token med de to lagene konsept
v1 beskrev: kursspesifikke fakta øverst (samme kilde som e-postene),
én felles tekst under (kursinfo_tekst i innstillinger), pluss et
valgfritt kurs.kursinfo_tillegg per kurs.

DATABASE: ny innstilling kursinfo_tekst, ny kolonne
kurs.kursinfo_tillegg, ny RPC hent_kursinfo_via_token
(SECURITY DEFINER, GRANT til anon).

VIKTIG VALG: den beviste hent_kurs_skole_via_token ble IKKE rørt.
En søster-funksjon ble laget i stedet. Et endepunkt som allerede
er bevist i produksjon skal ikke bygges om for et nytt formål.

SIKKERHET: anon får aldri leserett på innstillinger. RPC-en leser
kursinfo_tekst og epost_vertskap_notat på skolens vegne. Teksten
settes aldri inn som HTML — den bygges som React-elementer.

INNGANGENE: JA-svar sender skolen til /kursinfo/:token?takk=1.
NEI-svar får den gamle kvitteringen. Påminnelsens knapp peker nå
på kursinfosiden («Les kursinformasjonen»), ikke svarskjemaet.
Purring og trinn 3 peker fortsatt på skjemaet — de går til skoler
som ikke har svart.

BEVIST: samme kurs, to skoler. Trondheim 1 (vertskap) viste
Oppmøte 08:15 + vertskapsnotatet; Trondheim 4 (øvrig) viste 08:50
og ingen vertskapslinje. Begge med dato, sted og hele teksten med
overskrifter, punktlister og klikkbare lenker. Ekte påminnelse
sendt med den nye knappen. Nødbremsen bekreftet PÅ igjen.

### KODEN GJØR MER ENN PLANEN BA OM — notert bevisst
1. Påminnelsens knapp flyttet fra svarskjema til kursinfo.
2. Nakne URL-er i e-postmalene blir klikkbare (lenkeggjor).
   Gjelder alle e-postene.
3. {kursinfolenke} finnes i alle malene, ingen bruker den ennå.
   Rekkefølgen er MOTSATT av lærdom 4 med vilje: koden støtter
   plassholderen før noen mal tar den i bruk, så den kan aldri
   stå synlig i en utsendt e-post.
4. Kvitteringen vises selv om RPC-en feiler, så en skole som
   nettopp har svart aldri tror svaret forsvant.

### RESTPUNKT I TEKSTEN
Avsnittet «Utstyrspakker» står med plassholderteksten «Lenker til
liten og stor lekekurspakke legges inn her». Klubben-lenkene er
ikke oppgitt. Må erstattes eller slettes før drift.
Sjekk også om kurs@trivselsleder.no fortsatt er i bruk — adressen
kom fra en QuestBack-tekst.

### IKKE BYGGET, MED VILJE
De to Fase 3-lenkene (filmede leker → ressursbiblioteket) finnes
ikke ennå. Teksten nevner at lekene filmes, uten lenke. Lenken
legges inn i teksten når biblioteket finnes — ingen kodeendring.


---

## AGENTTEST 3 — 4. AUGUST, KVELD (RAPPORT.md, 281 linjer)

Første test kjørt mot en FASIT (TESTFASIT-blokkA.md) i stedet for fritt
utforskende. Kjørt selvstendig av Claude Code med egen basetilgang, uten
å spørre om noe underveis.

RESULTAT: alle 33 punkter OK. Ingen funksjonelle avvik i blokk A.

BEVIST EMPIRISK MOT LIVE, ikke bare lest i koden:
- Nødbremsen nektet ekte utsending på alle FIRE endepunktene (409).
- Dobbeltsendingsvernet holdt for invitasjon, trinn 3 og påminnelse.
- Tomt antall-felt ble NULL i basen, ikke 0.
- Flytting nullstilte alle fem stempler + vertskap, og skolen sto som
  «Ikke sendt» på det nye kurset.
- A2.4, det fasiten er mest redd for: skolens EGET svar forble
  uregistrert selv med en ansatt innlogget i samme nettleser.
- 08:15 mot 08:50 på samme kurs, styrt av er_vertskap.
- Oppmøtelinjen forsvant uten fallback til start_tid.

TO AUTORISASJONSFUNN — se blokk D:
- NYTT: flytt_skole_til_kurs slipper inn en skoleadmin.
- KJENT: /api/admin/koble-skole-kurs har ingen autentisering.

IKKE BEVIST EMPIRISK: at en tom e-postmal avbryter utsendingen.
Testen fikk ikke tømt en mal fordi ingen hadde skriverett på
innstillinger. Det hullet er nå lukket av A6-SQL-en, så punktet kan
bevises for ekte neste gang.

FASITEN HOLDT. Én navnenyanse rettet i ettertid: fasiten skrev
«svar_registrert_dato», kolonnen heter `svar_registrert_at`.

VERDT Å MERKE SEG: dette er første gang en test har kunnet si
«alt i fasiten er dekket» i stedet for «det jeg så på, virket». Det er
forskjellen fasiten gjør, og grunnen til at fremdriftsplan v32 er verdt
tiden.
