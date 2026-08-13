# TESTFASIT — blokk A (kursplanleggeren)

## Skrevet 4. august 2026, etter at A1–A5 var ferdig og bevist

Dette er fasiten en full test skal måles mot. Den beskriver hva
systemet SKAL gjøre, ikke hva det gjør. Finner testen et avvik,
er det enten en feil i koden eller en feil i denne fasiten — og
begge deler skal rapporteres.

### HVORFOR DENNE FILEN FINNES
Agenttest 1 og 2 fant ingenting av det som manglet. De testet at
det som fantes virket. Kursinformasjonssiden var borte i to
måneder uten at en eneste test sa fra, fordi ingen test visste at
den skulle finnes. En test uten fasit er blind for hull.

### SLIK BRUKES DEN
- Test ALLTID på https://trivselsleder-ny.vercel.app
  ALDRI på trivselsleder.no.
- Nødbremsen (innstillinger.motor_aktiv) skal stå på 'nei' før og
  etter testen. Skrus den av for å bevise en e-post, skrus den PÅ
  igjen med en gang. Cron for evaluering går hver time.
- Hvert punkt har FORVENTET. Skriv OK, AVVIK eller IKKE TESTET.
  Ved AVVIK: hva du gjorde, hva du så, hva du forventet.
- Ikke rapporter noe fra «KJENT OG BEVISST» nederst som feil.

### DU SKAL JOBBE SELVSTENDIG — IKKE SPØR OM SQL
Du har full tilgang til basen selv. Nøklene ligger i .env.local i
denne mappa. Last dem inn én gang:

    set -a; source .env.local; set +a

LESE en tabell (eksempel — kurs_skole-raden for én skole):

    curl -s "$VITE_SUPABASE_URL/rest/v1/kurs_skole?id=eq.<uuid>&select=*" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

SKRIVE (eksempel — nødbremsen av og på):

    curl -s -X PATCH "$VITE_SUPABASE_URL/rest/v1/innstillinger?nokkel=eq.motor_aktiv" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"verdi":"nei"}'

KALLE en RPC (eksempel — kursinfo for en token):

    curl -s -X POST "$VITE_SUPABASE_URL/rest/v1/rpc/hent_kursinfo_via_token" \
      -H "apikey: $VITE_SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -d '{"token":"<token>"}'

Bruk ANON-nøkkelen når du tester noe en SKOLE skal kunne gjøre —
da tester du samtidig at rettighetene er riktige. Bruk
service-nøkkelen bare til å kontrollere hva som faktisk står i
basen.

### FIRE ABSOLUTTE REGLER
1. SEND ALDRI ekte e-post til en mottaker uten «test» eller
   «agenttest» i skolenavnet. Kontroller mottakeradressen FØR du
   skrur av nødbremsen. Alle lovlige testadresser er
   kjartan+...@trivselsleder.no.
2. Nødbremsen skal stå på 'nei' hele tiden, unntatt i de sekundene
   et punkt krever ekte e-post. Sett den tilbake i samme
   arbeidsøkt, ikke «til slutt». Cron for evaluering går hver time.
3. SLETT ALDRI rader. Du har en nøkkel som omgår alle sperrer.
   Trenger et punkt at noe nullstilles, sett feltet til null —
   ikke fjern raden.
4. IKKE push til git. Du tester, du retter ikke.

### NÅR DU STÅR FAST
Skriv det i RAPPORT.md og gå videre til neste punkt. Ikke stopp og
vent på svar. Et punkt du ikke fikk testet er informasjon, ikke en
blokkering.

---

## A1 — FLYTTE SKOLE TIL ET ANNET KURS

1.1 Flytt en skole som ALLEREDE har fått invitasjon, til et annet
    kurs.
    FORVENTET: et banner sier fra at skolen trenger ny invitasjon.
    Banneret har ikke lukkekryss — det er en oppgave, ikke en
    kvittering.

1.2 Åpne «Send invitasjoner» på det NYE kurset.
    FORVENTET: skolen står som «Ikke sendt».

1.3 Se på kurs_skole-raden i basen etter flyttingen.
    FORVENTET: alle fem sendt-stempler er null
    (forste_utsending_at, purring_sendt_at, trinn3_sendt_at,
    paaminnelse_sendt_at, evaluering_sendt_at), og er_vertskap er
    nullstilt.

1.4 Send invitasjon på nytt fra det nye kurset.
    FORVENTET: e-posten viser det NYE kursets dato og hall.

---

## A2 — RA REGISTRERER SVAR PÅ VEGNE AV SKOLEN

2.1 Åpne «Se svar», registrer et svar for en skole som ikke har
    svart.
    FORVENTET: samme felter som skolens eget skjema, og de samme
    betingede reglene (ja gir antall + kommentar, nei gir årsak +
    «åpen for annet kurs»).

2.2 Se på raden etterpå.
    FORVENTET: «Registrert av <navn> <dato>» vises.

2.3 Sjekk purrekøen (Oppfølging).
    FORVENTET: skolen er falt ut av listen over ubesvarte.

2.4 La en ANNEN skole svare selv, via sin egen lenke, fra en
    nettleser der en ansatt er innlogget.
    FORVENTET: svar_registrert_av og svar_registrert_at forblir
    NULL. Et skoleeget svar skal aldri stemples som RA-registrert
    bare fordi noen var innlogget i samme nettleser.

2.5 Endre et svar RA alt har registrert.
    FORVENTET: lar seg endre, stemplene oppdateres.

---

## A3 — VERTSKAP

3.1 Huk av vertskap på to skoler på SAMME kurs.
    FORVENTET: begge lagres som vertskap. Flere skoler kan være
    vertskap samtidig — i ytterste tilfelle alle skolene på
    kurset (Senja).

3.2 Åpne svarskjemaet til en vertskapsskole og svar «ja, vi
    kommer».
    FORVENTET: vertskapsspørsmålet vises.

3.3 Åpne svarskjemaet til en skole som IKKE er vertskap.
    FORVENTET: vertskapsspørsmålet vises IKKE.

3.4 Svar NEI på vertskapsspørsmålet.
    FORVENTET: rødt varsel «Vertskap sa NEI — kurset kan stå uten
    hall» BÅDE i kursoversikten og på skoleraden, med årsaken.

3.5 Fjern vertskapsflagget fra en skole som alt har svart.
    FORVENTET: vertskapssvaret skal ikke gå tapt eller endres av
    seg selv.

---

## A4 — OPPMØTETIDER

4.1 Sett oppmote_vertskap og oppmote_ovrige på et kurs.
    FORVENTET: begge lagres og består etter ny innlasting.

4.2 Åpne svarskjemaet for en vertskapsskole og en øvrig skole på
    samme kurs.
    FORVENTET: to FORSKJELLIGE oppmøtetider. Vertskapet ser også
    en forklaring på hvorfor de møter tidligere.

4.3 Tøm begge oppmøtefeltene på kurset.
    FORVENTET: hele «Oppmøte:»-linjen forsvinner — både i skjemaet
    og i e-postene. Den skal ALDRI falle tilbake på kursets
    start_tid; da ville skolen møtt for sent.

4.4 Send påminnelse til én vertskapsskole og én øvrig skole på
    samme kurs.
    FORVENTET: to forskjellige tider i de to e-postene, styrt av
    om SKOLEN er vertskap — ikke av mottakerrollen.

---

## A5 — KURSINFORMASJONSSIDEN

5.1 Åpne /kursinfo/<token> for en vertskapsskole.
    FORVENTET: øverst en oransje faktaboks med skole, kurs, dato
    med klokkeslett, sted, oppmøtetid og vertskapsnotatet. Under:
    hele den felles teksten med overskrifter, punktlister og
    klikkbare lenker.

5.2 Åpne /kursinfo/<token> for en øvrig skole på samme kurs.
    FORVENTET: annen oppmøtetid, og INGEN vertskapslinje.

5.3 Fjern hall fra kurset, eller tøm oppmøtetidene.
    FORVENTET: den aktuelle linjen forsvinner helt. Ingen «Sted: »
    uten verdi.

5.4 Skriv noe i «Spesielt for dette kurset» på kurset.
    FORVENTET: teksten vises i en egen rosa boks mellom faktaboksen
    og den felles teksten. Tømmes feltet, forsvinner boksen.

5.5 Svar «ja, vi kommer» i svarskjemaet.
    FORVENTET: skolen sendes rett til kursinformasjonssiden, med
    «Takk for svaret!» øverst.

5.6 Svar «nei, vi kommer ikke».
    FORVENTET: skolen får den vanlige kvitteringen og sendes IKKE
    til kursinfosiden.

5.7 Åpne /kursinfo/ med en oppdiktet eller halv token.
    FORVENTET: «Vi fant ikke kursinformasjonen deres.» Ingen
    kræsj, ingen hvit side.

5.8 Send påminnelse til en skole som har svart ja.
    FORVENTET: knappen i e-posten heter «Les kursinformasjonen» og
    peker på /kursinfo/, ikke /svar/.

5.9 Send purring eller trinn 3 til en skole som IKKE har svart.
    FORVENTET: knappen heter fortsatt «Åpne svarskjemaet» og peker
    på /svar/. En skole som ikke har svart skal til skjemaet.

5.10 Les hele teksten på siden.
     FORVENTET: ingen synlige {plassholdere}, ingen synlige
     ##-tegn, ingen synlige [firkantparenteser].

---

## PÅ TVERS — TING SOM SPENNER OVER FLERE PUNKTER

6.1 Antall trivselsledere: la feltet stå TOMT og svar ja.
    FORVENTET: svaret godtas. Feltet er merket «(valgfritt)».
    I basen skal antall_tl være NULL, ikke 0.

6.2 Nødbremsen: sett motor_aktiv = 'nei' og prøv ekte utsending på
    alle fire sende-endepunktene (invitasjon, oppfølging,
    evaluering, Eivind-varsel).
    FORVENTET: alle fire nekter. Tørrkjøring er fortsatt tillatt.

6.3 Dobbeltsending: send samme invitasjon to ganger.
    FORVENTET: andre kjøring hopper over med «allerede sendt».
    Samme for purring, trinn 3 og påminnelse.

6.4 Manglende e-postmal: tøm en mal i innstillinger og prøv å
    sende.
    FORVENTET: utsendingen AVBRYTES med en tydelig feilmelding.
    Aldri en tom e-post, aldri fallback til hardkodet tekst.

6.5 Alle seks e-postene: les brødteksten i en ekte e-post.
    FORVENTET: ingen synlige {plassholdere}. Linjer med tomme
    plassholdere skal være helt borte, ikke stå igjen halve.

6.6 Skolens egen lenke skal virke gjennom hele løpet — også etter
    at RA har registrert svar på vegne, og etter at skolen er
    flyttet til et annet kurs.

---

## KJENT OG BEVISST — IKKE RAPPORTER DETTE SOM FEIL

- Det finnes INGEN redigeringsside for innstillinger. Alle tekster
  redigeres i Supabase. Dette er A6, neste oppgave.
- Avsnittet «Utstyrspakker» i kursinfoteksten står med
  plassholderteksten «Lenker til liten og stor lekekurspakke
  legges inn her». Klubben-lenkene er ikke oppgitt ennå.
- Kursinfoteksten har ingen lenke til filmede leker.
  Ressursbiblioteket er Fase 3 og finnes ikke.
- Kursinfosiden er KUN tilgjengelig med token. Det er meningen.
- Kursinfosiden stempler ikke apnet_at. Det er meningen — det
  stemplet måler at skolen åpnet SVARSKJEMAET.
- {kursinfolenke} finnes i alle e-postmalene, men ingen mal bruker
  den. Det er meningen: koden støtter plassholderen før noen mal
  tar den i bruk.
- «Flytt til annet kurs» vises kun på skoler som har svart «Kommer
  ikke». KJENT FUNN, ikke avklart om det er bevisst.
- Vertskapslisten i kursoversikten er for smal og gjør raden
  dobbelt så høy. Kjent, kosmetisk.
- Hall-søket matcher navn, ikke sted. Kjent.
- En gjenlagt skole havner nederst i listen. Kjent, kosmetisk.
- RA fylles ikke ut automatisk. Venter på den store dataimporten.
- Blokk B (kortutdeling) er IKKE FULLFØRT, selv om gamle
  fremdriftsplaner sier «Ferdig». RETTET 5. august: det finnes en
  prototype fra 18. juni på /admin/kortutdeling som er lenket fra
  admin-menyen og merker seg selv «ikke ferdig løsning». Den er
  utenfor denne fasiten — test den ikke, men ikke meld den som
  «mangler side» heller.

---

## HVA SOM IKKE DEKKES AV DENNE FASITEN
Blokk B (kortutdeling), blokk E (flytteforespørsel, sesong-
kopiering, kapasitet, eksport, purring per målgruppe), Min side,
kulturkortmodulen og evalueringen utover selve utsendingen.
Fasiten dekker blokk A og maskineriet rundt de seks e-postene.

---

## SLIK RAPPORTERES FUNN
Skriv til RAPPORT.md i prosjektmappa, ikke i terminalen.
Per funn: punktnummer, hva du gjorde, hva du så, hva fasiten sier,
og om du mener feilen ligger i koden eller i fasiten.
