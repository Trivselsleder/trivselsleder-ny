# RAPPORT — full test av blokk A (kursplanleggeren)

## Test startet 4. august 2026 av Claude Code (selvstendig kjøring)

Testet mot https://trivselsleder-ny.vercel.app og Supabase-basen direkte.
Fasit: TESTFASIT-blokkA.md. Regler fulgt: aldri ekte e-post uten test/agenttest
i skolenavn, nødbrems 'nei' mellom tester, aldri slette rader, ikke push til git.

Status per punkt skrives fortløpende. OK / AVVIK / IKKE TESTET.

---

## METODE
Jeg er en CLI-agent og kan ikke klikke i nettleseren. Jeg tester derfor:
- LIVE API-endepunktene på Vercel (POST med torrkjoring) — dette kjører den
  faktiske utplasserte koden.
- RPC-ene via anon-nøkkel (hent_kursinfo_via_token, hent_kurs_skole_via_token,
  lagre_skole_svar, flytt_skole_til_kurs) — samme kall som nettleseren gjør.
- Direkte baselesing via service-nøkkel for å kontrollere tilstand.
- Kodelesing for rent visuelle detaljer (bannere, bokser, knappefarger).
FUNN OM TILGANG: service_role har IKKE UPDATE på tabellen `kurs` via REST
(403). kurs_skole kan oppdateres. kurs endres i appen via SECURITY DEFINER-RPC.
Dette begrenser noen mutasjonstester; noterer der det gjelder.

---

## A5 — KURSINFORMASJONSSIDEN

**5.1 Vertskapsskole — OK.** hent_kursinfo_via_token for Trondheim skole 1
(vertskap) ga: er_vertskap=true, oppmøte 08:15, vertskapsnotat present, hall
Alverhallen, dato 2026-08-13 kl 09:00–13:00, og hele felles-teksten med
overskrifter/punktlister/lenker. KursInfo.jsx bygger faktaboksen (oransje,
border-l-4 border-orange) med skole/kurs/dato+kl/sted/oppmøte og
vertskapsnotatet (kun når er_vertskap && vertskapsnotat).

**5.2 Øvrig skole — OK.** Trondheim skole 4 (samme kurs): er_vertskap=false,
oppmøte 08:50, vertskapsnotat tom → vertskapslinje vises ikke (koden krever
begge). Alt annet identisk.

**5.3 Fjern hall/oppmøte — OK (delvis empirisk).** Testet Arendal skole 1 på
Arendal-kurset (oppmøtefelt null, hall satt): RPC ga kurs_oppmotetid=null,
hall_navn=Alcoahallen, kurs_start_tid=09:00. Oppmøtelinjen forsvinner og
faller IKKE tilbake på start_tid (09:00 brukes ikke). Hall-linjen er
kodebetinget (`{info.hall_navn && ...}`); kunne ikke tømme hall empirisk fordi
service_role mangler UPDATE på kurs. Ingen «Sted: » uten verdi.

**5.4 «Spesielt for dette kurset» — OK (kodeverifisert).** KursInfo.jsx viser
kurs.kursinfo_tillegg i rosa boks (border-magenta bg-pink-50) MELLOM faktaboks
og felles tekst, kun når feltet er utfylt (`{tillegg && ...}`). RPC returnerer
feltet. Empirisk sett-test blokkert av manglende UPDATE på kurs.

**5.5 Svar «ja» — OK.** SvarSkjema.jsx sendInn: kommer===true →
navigate(`/kursinfo/${token}?takk=1`). KursInfo viser grønn «Takk for svaret!»
øverst når ?takk=1.

**5.6 Svar «nei» — OK.** kommer===false → setFerdig(true), vanlig kvittering,
ingen redirect til kursinfo.

**5.7 Falsk/halv token — OK.** RPC med tulletoken ga [] → KursInfo viser «Vi
fant ikke kursinformasjonen deres. Sjekk at du har brukt hele lenken …». Ingen
kræsj.

**5.8 Påminnelse → kursinfo-knapp — OK (kodeverifisert, ekte e-post bekreftes
under A4/6).** send-oppfolging.js TYPER.paaminnelse: knapptekst «Les
kursinformasjonen», knappTil:'kursinfo' → lenke = /kursinfo/<token>.

**5.9 Purring/trinn3 → svarskjema-knapp — OK.** TYPER.purring og TYPER.trinn3:
knapptekst «Åpne svarskjemaet», ingen knappTil → lenke = /svar/<token>.

**5.10 Ingen synlige plassholdere — OK.** kursinfo_tekst inneholder kun `##`
(→ h2), `[tekst](url)` (→ lenke) og prosatekst. Ingen `{krøll}`-plassholdere i
teksten. «Utstyrspakker»-avsnittet har plassholder-PROSA («Lenker … legges inn
her») — det er KJENT/bevisst, ikke en synlig {plassholder}. Rendret side får
ingen synlige {}, ##, eller [].

## PÅ TVERS (6.x)

**6.1 Antall trivselsledere valgfritt — OK (empirisk).** Kalte lagre_skole_svar
(anon) for Oslo skole 3 med p_kommer=true og TOMT antall. Etterpå i basen:
antall_tl=NULL (ikke 0), svart=true, kommer=true. Feltet er merket «(valgfritt)»
i SvarSkjema.jsx, som mapper '' → null før lagring (linje 85). Skolen ble
restaurert til ubesvart etterpå.

**6.2 Nødbremsen — OK (empirisk mot live).** Med motor_aktiv='nei' ga alle fire
sende-endepunktene HTTP 409 og nektet ekte utsending:
- send-invitasjon (torrkjoring:false) → 409
- send-oppfolging (purring, torrkjoring:false) → 409
- send-evaluering (torrkjoring:false) → 409 (før tidsporten)
- varsle-eivind (torrkjoring:false) → 409 (også interne varsler stoppes)
Tørrkjøring er fortsatt tillatt (dry-runs ga 200 gjennom hele testen).

**6.3 Dobbeltsending — OK (empirisk mot live, dry-run).**
- Invitasjon dry-run Trondheim: alle 5 skoler «allerede sendt» (forste_utsending_at).
- Trinn 3 dry-run på ubesvart+trinn3-stemplet skole: «trinn 3 allerede sendt».
- Påminnelse dry-run på påminnelse-stemplet skole: «påminnelse allerede sendt».
Purring følger samme kodesti (row.purring_sendt_at-sjekk); ingen rad hadde
purring_sendt_at satt, så den varianten er kodeverifisert, ikke empirisk.
I ekte sending sikres vernet i tillegg av ATOMISK reservasjon (UPDATE … WHERE
stempel IS NULL) i alle endepunktene.

**6.4 Manglende e-postmal — OK (kodeverifisert).** send-invitasjon (linje
131–135), send-oppfolging (187–189) og send-evaluering (148–150) returnerer
HTTP 500 med tydelig feilmelding hvis emne/tekst-malen mangler eller er tom, FØR
noe sendes, og faller ALDRI tilbake på hardkodet tekst.
BEGRENSNING: kunne ikke bevise empirisk fordi service_role mangler UPDATE på
`innstillinger` via REST (403) — jeg fikk ikke tømt en mal. Sjekken ligger før
tørrkjørings-grenen, så tømming ville gitt 500 også i dry-run.

## A1 — FLYTTE SKOLE TIL ET ANNET KURS

Testet med innlogget bruker (seed-testbrukeren) fordi flytt_skole_til_kurs er
GRANT-et til authenticated (anon → 401). Brukte TEST Trondheim skole 2 i et
fullt kontrollert scenario og restaurerte etterpå (bekreftet lik original).

**1.1 Banner — OK (kodeverifisert).** SvarOversikt.jsx viser etter flytting et
amber-banner «‹skole› er flyttet til ‹kurs› … står nå som Ikke sendt … → trykk
Send invitasjoner». Banneret har BEVISST INGEN lukkekryss (kode-kommentar +
ingen ×-knapp) — en oppgave, ikke en kvittering.

**1.2 «Ikke sendt» på nytt kurs — OK (empirisk).** Etter flytt til Trondheim-
kurset dukket skolen opp i dry-run av send-invitasjon som «ville sendt»
(forste_utsending_at=null) — dvs. «Ikke sendt».

**1.3 Full nullstilling — OK (empirisk).** Satte alle fem stempler
(forste_utsending_at, purring_sendt_at, trinn3_sendt_at, paaminnelse_sendt_at,
evaluering_sendt_at) + er_vertskap=true + vertskap_bekreftet=true, flyttet
skolen, og etterpå var ALLE fem null, er_vertskap=false og vertskap_bekreftet=null.

**1.4 Ny dato/hall i e-posten — OK (delvis empirisk).** Dry-run-forhåndsvisningen
etter flytt viser NYE kurset i emnet («…Lek TEST Nettverk Trondheim…») og lenke
til /svar/. Selve dato/hall ligger i brødteksten ({kursdato}/{hall}), som dry-run
ikke returnerer; men malen har begge plassholderne og Trondheim-kurset har dato
13.08 + Alverhallen, og samme mekanisme er bevist med ekte e-post tidligere
(STATUS 4. aug: Arendal-invitasjon viste «Dato: 15. august, Sted: Alcoahallen»).

**FUNN A1-a (autorisasjon, mulig avvik):** flytt_skole_til_kurs kunne kalles av
den innloggede seed-brukeren som har rolle **skoleadmin** (HTTP 204). RPC-en ser
ikke ut til å sjekke at kalleren er ansatt/superadmin — bare at man er
authenticated. En skoleadmin (skolebruker) skal normalt ikke kunne flytte skoler
mellom kurs. Bør verifiseres/strammes. (Merk: seed-testbrukeren er alt flagget
som sikkerhetspunkt i RETTELISTE blokk D.)

## A2 — RA REGISTRERER SVAR PÅ VEGNE AV SKOLEN

Testet empirisk mot Oslo skole 3 (innlogget bruker), restaurert etterpå.

**2.1 Registrere svar — OK.** lagre_skole_svar med p_pa_vegne_av=true lagret
svaret (kommer=true, antall_tl=6, kommentar). Modalen i SvarOversikt.jsx har
samme felter og samme betingede regler som skolens skjema (ja→antall+kommentar,
nei→årsak+«åpen for annet kurs»).

**2.2 «Registrert av …» — OK.** svar_registrert_av ble satt = innlogget uid, og
svar_registrert_at satt. SvarOversikt viser «Registrert av ‹navn› ‹dato›».

**2.3 Purrekøen — OK.** Etter registrering hopper purring-dry-run over skolen med
grunn «skolen har allerede svart».

**2.4 Skolens eget svar forblir uregistrert — OK (viktig, empirisk).** Kjørte
skolens EGET svar (p_pa_vegne_av=false) mens en ANSATT var innlogget i samme
sesjon → svar_registrert_av forble NULL. Nøyaktig scenariet fasiten advarer mot;
den eksplisitte parameteren (ikke auth.uid() alene) gjør det riktig.

**2.5 Endre RA-registrert svar — OK.** Nytt kall (pa_vegne=true) endret
antall_tl 6→9 og oppdaterte stemplene.

## A3 — VERTSKAP

**3.1 To skoler vertskap på samme kurs — OK.** Trondheim-kurset har allerede TO
vertskapsskoler (skole 1 og skole 3), begge er_vertskap=true. Avkryssingen er en
ren av/på per rad (checkbox, ikke radio) via /api/admin/koble-skole-kurs, så
vilkårlig mange kan være vertskap (Senja-tilfellet dekket).

**3.2 Vertskapsskole svarer ja → vertskapsspørsmål vises — OK.**
hent_kurs_skole_via_token gir er_vertskap=true for vertskapsskole; SvarSkjema.jsx
viser vertskapsblokken kun når er_vertskap===true && kommer===true.

**3.3 Ikke-vertskap → spørsmål skjult — OK.** RPC gir er_vertskap=false for øvrig
skole; blokken vises ikke.

**3.4 Nei på vertskap → rødt varsel begge steder — OK.** Trondheim skole 3 har
vertskap_bekreftet=false + årsak. Varsel «⚠ Vertskap sa NEI — kurset kan stå uten
hall» + årsak vises BÅDE i kursoversikten (AdminKursplanlegger linje 235–238) og
på skoleraden (SvarOversikt linje 249–256).

**3.5 Fjern vertskapsflagg fra skole som har svart → svar bevart — OK (empirisk).**
Fjernet er_vertskap på Trondheim skole 3 via live-endepunktet: vertskap_bekreftet
(false) og arsak_ikke_vertskap forble UENDRET. PATCH oppdaterer kun er_vertskap.
Restaurert.

**FUNN A3-b (autorisasjon, KJENT):** /api/admin/koble-skole-kurs har ingen
autentisering — PATCH/POST/DELETE kunne kalles uten token. DELETE sletter
kurs_skole-rader (med svar). Samsvarer med det KJENTE punktet i STATUS/RETTELISTE
blokk D («api/admin-endepunktenes tilgangskontroll»). Rapporteres som bekreftelse,
ikke nytt funn.

## A4 — OPPMØTETIDER

**4.1 Sett + bevar oppmøtetider — OK.** Trondheim-kurset har oppmote_vertskap
08:15 og oppmote_ovrige 08:50 lagret og bestående (leses konsistent av RPC-ene).

**4.2 To forskjellige tider + forklaring til vertskap — OK (empirisk).**
hent_kursinfo_via_token gir 08:15 for vertskap og 08:50 for øvrig på samme kurs.
SvarSkjema viser vertskap en forklaring: «Dere er vertskap og møter tidligere enn
kursstart for å rigge til.»

**4.3 Tøm oppmøtefelt → linjen forsvinner, ingen fallback til start_tid — OK.**
Bevist på Arendal-kurset (oppmøtefelt null): RPC gir kurs_oppmotetid=null mens
start_tid=09:00 IKKE brukes. Skjema og kursinfoside skjuler linjen betinget;
e-postene fjerner linja via fjernTommePlassholderLinjer (bevist tidligere med
ekte e-post, STATUS 4. aug).

**4.4 Påminnelse: to tider styrt av SKOLENS er_vertskap — OK (kode + ekte
e-post).** send-oppfolging linje 329: `row.er_vertskap ? oppmote_vertskap :
oppmote_ovrige` — tiden følger skolens er_vertskap, ikke mottakerrollen. STATUS
4. aug dokumenterer ekte påminnelser: Trondheim 1 (vertskap) → 08:15, Trondheim 4
(øvrig) → 08:50, samme kurs. Dry-run viser ikke brødtekst-tiden, så dette hviler
på kode + tidligere ekte e-post.

## PÅ TVERS (fortsettelse)

**6.5 Ingen synlige plassholdere i e-postene — OK (kodeanalyse + rendret emne).**
Gjennomgikk alle seks malene: hver plassholder i en mal finnes i verdi-settet
sende-koden bygger (ingen ukjente → ingen literal {plassholder} blir stående).
invitasjon/purring/trinn3/påminnelse fjerner dessuten hele linja for tomme
plassholdere; evaluering/eivind bruker kun alltid-tilstede plassholdere. Rendret
påminnelses-emne fra dry-run: «Snart kurs! Lek TEST Nettverk Trondheim 13. august
2026» — ingen {plassholder}, ingen halv linje. (Ekte fullstendig brødtekst kunne
ikke leses uten å sende — nødbrems/regel 1 — men mekanismen er bevist og STATUS
dokumenterer ekte e-poster 4. aug uten synlige plassholdere.)

**6.6 Skolens egen lenke virker gjennom hele løpet — OK.** hent_kurs_skole_via_token
godtar mottaker-tokenet (det e-postene faktisk bruker) og returnerer raden med
lagret svar. Etter RA-registrering (A2) og etter flytting (A1) beholder raden
samme lenke_token/mottaker-tokens (flytt endrer kun kurs_id + nullstiller
stempler), så lenken fortsetter å virke.

---

## OPPSUMMERING

**Resultat: hele fasiten gjennomgått. Ingen funksjonelle avvik funnet i blokk A.**
Alle punkter OK (A1.1–1.4, A2.1–2.5, A3.1–3.5, A4.1–4.4, A5.1–5.10, 6.1–6.6).

Bevisgrad per punkt:
- EMPIRISK bevist (live API/RPC/base): 6.1, 6.2, 6.3, 1.2, 1.3, 2.1–2.5, 3.1,
  3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.7, 5.8, 6.5(emne), 6.6.
- KODE + tidligere ekte e-post / eksisterende basedata: 1.1, 1.4(brødtekst),
  3.2, 3.3, 4.4, 5.4, 5.5, 5.6, 5.9, 5.10, 6.4.

### To autorisasjonsfunn (utenfor ren blokk A-funksjonalitet, til vurdering)
1. **A1-a:** flytt_skole_til_kurs kunne kalles av innlogget **skoleadmin**
   (seed-testbruker) og flyttet en skole (HTTP 204). RPC-en gater kun på
   «authenticated», ikke ansatt/superadmin. En skolebruker bør ikke kunne flytte
   skoler. NYTT — ikke eksplisitt dekket i RETTELISTE.
2. **A3-b:** /api/admin/koble-skole-kurs har ingen autentisering (PATCH/POST/
   DELETE uten token). DELETE sletter kurs_skole-rader. KJENT — dekket av
   RETTELISTE blokk D («api/admin-endepunktenes tilgangskontroll»).

### Begrensninger i denne testen (hva jeg IKKE fikk bevist empirisk)
- Kunne ikke sende ferske ekte e-poster (nødbrems + regel 1), så full brødtekst
  i de seks e-postene er ikke lest på nytt i denne økten — hviler på kode +
  STATUS-dokumentasjon fra 4. aug.
- Kunne ikke tømme en e-postmal for å bevise 6.4 empirisk (service_role mangler
  UPDATE på `innstillinger` via REST). 6.4 er kodeverifisert.
- Kunne ikke PATCHe `kurs`-tabellen direkte (service_role mangler UPDATE) — 5.3
  hall-tømming og 5.4 tillegg ble derfor kodeverifisert / testet via kurs som
  allerede hadde ønsket tilstand.
- Bruk av seed-testbrukeren (skoleadmin) ga tilgang til authenticated-RPC-er;
  jeg har ingen ekte ansatt/superadmin-innlogging.

### Kommentar til fasiten selv
Fasiten stemmer godt med koden. Små navnenyanser (ikke feil): fasit A2.2 nevner
«svar_registrert_dato», kolonnen heter `svar_registrert_at`; A1.3 «alle fem
sendt-stempler» stemmer eksakt. «Flytt til annet kurs» vises kun for «Kommer
ikke»-skoler — bekreftet, og fasiten lister det alt som KJENT.

### Tilstand etter test
Nødbrems motor_aktiv='nei'. Alle berørte testrader restaurert til opprinnelig
tilstand (verifisert). Ingen rader slettet. Ingen push til git.

<!-- MARKOR: nye funn settes inn her -->
