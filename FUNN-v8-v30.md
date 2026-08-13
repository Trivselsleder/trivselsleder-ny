## 0. Om dette dokumentet

**Hva det er.** En gjennomgang av alle 22 fremdriftsplanene fra v8 (9. juni) til
v30 (10. juli), lest mot hverandre og mot v31. Formålet er ikke å oppsummere hva
de inneholder, men å finne **hva som falt ut mellom versjonene** — og aldri kom
tilbake.

**Hvorfor.** Prosjektet har en svikt som allerede har kostet minst 50 dager. Et
krav står i ett dokument. Neste versjon er skrevet om. Ingen noterer hva som ble
fjernet. Kravet finnes ikke lenger for noen som leser videre — og fordi
versjoneringsregelen sier at ingenting forsvinner, stoler alle på at det som
står, er alt som finnes.

Kursinformasjonssiden og kortutdelingen ble funnet på nøyaktig denne måten
4.–5. august. Denne gjennomgangen leter etter resten.

> **Om påliteligheten.** Første utkast av dette dokumentet ble kontrollert av en
> uavhengig agent, som felte flere av påstandene — blant annet en «korreksjon»
> som i virkeligheten var en tilbakerulling av noe v32 allerede hadde riktig.
> Dokumentet er skrevet om fra bunnen. **Alle funn under er nå verifisert med
> ordrett tekstsøk i samtlige 23 dokumenter**, ikke med statistikk. Seksjon 6
> forklarer hva som var galt, og hvorfor.

---

## 1. To vippepunkter

Hele materialet peker mot to omskrivinger. De to står for nesten alt varig tap.

| | Dato | Hva skjedde |
|---|---|---|
| **v20** | 22. juni | Planen ble bygget om til «komplett samleplan». Ble **større** enn v17 — og mistet likevel elleve krav for godt. |
| **v30** | 10. juli | Sier den bare legger til ti punkter. Er **24 % kortere** enn v29. |

Alt annet i rekken er stort sett trygt. v23–v29 vokser jevnt uten varig tap, og
v18/v19 er arbeidsnotater, ikke planer.

---

## 2. Vippepunkt 1 — v20 (22. juni)

v20 sier om seg selv:

> «Samler alt på ett sted — kursplanleggeren, evaluering, churn/ledelse,
> e-postsystemet, ressursbiblioteket (Fase 3), interaktive verktøy (Fase 4),
> stor dataimport, webinar og CRM-avløseren — så vi slipper å holde styr på
> mange løse dokumenter.»

Den er **større** enn forgjengeren: 19 885 mot 16 846 tekstbytes.

Og likevel: elleve begreper som sto i v15, v16 **og** v17 finnes ikke i v20 —
og ikke i noen versjon etterpå, til og med v31. Hvert av dem er kontrollert med
ordrett søk i alle 23 dokumentene.

**Dette er hovedpoenget i hele gjennomgangen: en omskriving som vokser kan tape
like mye som en som krymper.** Vi har hittil lett etter tap der dokumentet ble
kortere. Det er feil sted å lete.

### 2.1 Hva som forsvant i v20

| Krav | Ordrett fra v17 (17. juni) | Sist sett |
|---|---|---|
| **Kursinformasjonssiden** | «Kursinfo-side etter send: auto-hentet topp + fast evergreen-mal. Lenker til ressursbibliotek, dokumenter, kulturkort, utstyrspakker.» | v17 |
| **Når fryses kortantallet** | «Når «fryses» kortantallet før kursdagen? (Kjartan/Camilla).» | v17 |
| **Vertskapsspørsmålet** | «Betinget skjema (FERDIG): vertskapsspørsmål kun for vertskap; årsak kun ved nei. Verifisert mot faktisk QuestBack-skjema.» | v17 |
| **Bruksanvisning + tilbakerulling** | «Feide-aktivering i produksjon (Sikt). Staging-miljø. Bruksanvisning + tilbakerulling.» | v17 |
| **Økonomioversikt (Fase 2b)** | «Mål: økonomioversikt og automatisering — bygges etter lansering.» | v17 |
| **Tripletex-integrasjon** | «Tripletex-integrasjon: ny skole opprettes automatisk som kunde via API.» | v17 |
| **Årsbeløp på skolekortet** | «Kontraktinfo fra HubSpot på skolekort: startdato, årsbeløp, periode.» | v17 (sto fra v9) |
| **Landsspesifikk data** | «Flerspråklig fra start: samme system for Sverige/Island — språkfil + landsspesifikk data.» | v17 |
| **Årsplaner som AI-leveranse** | «Claude API trent på 17 års kompetanse. Konkrete opplegg + kildekort, PowerPoint, årsplaner, prediktiv churn…» | v17 |
| **Avviksrapport Sverige** | «Avviksrapport til Anneli/Malin. Fuzzy-matching: kun 9 av 373 TL-skoler ikke funnet.» | v17 |
| **Evergreen-malen** som begrep | del av kursinfo-linjen over | v17 |

Merk **årsbeløp**: det sto i hver eneste plan fra v9 til v17 — ni versjoner på
rad — og forsvant i v20.

### 2.2 Om kursinformasjonssiden — en presisering av v32

`HVA-FORSVANT.md` og `FREMDRIFTSPLAN-v32` sier at kravet ikke er nevnt i noen
fremdriftsplan fra v16 til v31. **Det er ikke helt riktig.** Setningen står
ordrett i v15, v16 **og v17**. Kravet levde altså to dager lenger i
fremdriftsplanen enn vi har trodd, og døde i omskrivingen til v20 — ikke med
konsept v2 den 18. juni.

Det endrer ikke konklusjonen, bare datoen og åstedet.

---

## 3. Vippepunkt 2 — v30 (10. juli)

v30 om seg selv:

> «v30 er v29 med ti nye punkter fra en fri idémyldringsøkt (7. juli) — ingen
> kode er endret siden v29, dette er planarbeid.»

Målt: v29 er 134 263 tekstbytes, v30 er 102 072. **32 191 borte — 24 %.**

En setning som sier at ingenting er fjernet, er ikke et bevis for at ingenting
er fjernet.

### 3.1 Hva som forsvant i v30

Alle kontrollert med ordrett søk: står i v28 og v29, finnes ikke i v30 eller v31.

| Krav | Ordrett fra v29 | Sto fra |
|---|---|---|
| **Den tekniske Fase 3-designen** | «Teknisk: tabell `innhold_biter` med pgvector … Edge Function, kildekort, hybrid søk» | v13 |
| **Bruksanvisning ved lansering** | «Staging-miljø: teste endringer før de går live. Bruksanvisning: endre innhold, teste på staging, rulle tilbake.» | v8 |
| **Selvbetjent onboarding** | «Stripe-betaling: selvbetjent onboarding, alle valutaer, måneds- og årsabonnement, automatisk faktura/kvittering.» | v8 |
| **Årsabonnement** | samme setning | v9 |
| **Tilgangsstyring på kursholderkalenderen** | «(deltakerliste, betaling, instruksjoner) kun synlig for kursholder og admin. Valgfri Google Kalender-synk.» | v11 |

Det siste er verdt å merke seg: **det er et personvernkrav.** Det sto i planen i
nitten versjoner — v11 til v29 — og forsvant uten et ord. `pgvector`,
`innhold_biter` og `hybrid søk` sto i sytten versjoner, fra v13.

---

## 4. Statusdrift — når «Ferdig» oppsto

Rettelista og v32 har allerede riktig dato her; dette bekrefter og presiserer.

Den falske «Ferdig»-påstanden oppsto **18. juni**, samme dag som
kortutdeling-prototypen ble pushet. Fremdriftsplan v18:

> «Kursplanlegger steg 4 og 5 ferdigstilt i tidligere økt (18. juni): alle sju
> moduler (Send lenker, Metaoversikt, Melding-håndtert, Flytteforespørsel,
> **Kortutdeling, Kopier kursplan**, Purring/påminnelse) bygget, testet og
> pushet.»

Og `Gml/status_kommando.pdf` samme kveld:

> «## Ferdig og testet — Kursplanlegger, alle 7 moduler (…) Pushet til GitHub.»

Deretter går påstanden inn i modultabellen og blir stående. v20 (22. juni),
side 2:

> Kopier kursplan til ny sesong — **Ferdig**
> Kortutdeling (Camillas fane: antall TL + 10%) — **Ferdig**
> Steg 4 — RA-admin (oversikt, meta, melding, flytt, send) — **Ferdig**

**Det siste er det reneste eksempelet i hele materialet.** v17, fem dager
tidligere, om samme modul:

> «4 — RA-admin. Live svar-oversikt (detaljnivå) ferdig. **Gjenstår:
> metaoversikt, melding-håndtering, send lenker, flytteforespørsler.** ◐ I gang»

Fire navngitte restpunkter ble til ett ord. **Flytteforespørsel er ikke bygget
den dag i dag** — `onsket_kurs_id` har null treff i `src/`, `api/` og `sql/`,
kontrollert mot koden 5. august.

Fra 18. juni levde påstanden uimotsagt gjennom v19, v20, v21, v23, v24, v25,
v26, v27, v28, v29, v30 og v31 — til 5. august.

---

## 5. Spørsmål til deg

Ni spørsmål fra første utkast er strøket fordi kontrollen viste at premissene
var feil — det de spurte om står fortsatt i v31. Disse fem står igjen, og hvert
av dem er kontrollert.

1. **Tilgangsstyring på kursholderkalenderen.** «Deltakerliste, betaling,
   instruksjoner kun synlig for kursholder og admin» sto i planen fra v11 til
   v29 og forsvant i v30. Kalenderen står fortsatt i v31 §9.9 som «mulig
   senere», men uten tilgangsstyringen. Er kravet strøket, eller glemt? Det er
   personvernrelevant.

2. **Den tekniske Fase 3-designen.** `innhold_biter` med pgvector, Edge
   Function og hybrid søk sto i sytten versjoner og forsvant i v30. v31
   beskriver RAG som prinsipp, men ikke mekanikken. Er designen fortsatt
   gjeldende, eller skal Fase 3 tegnes på nytt?

3. **Bruksanvisning og tilbakerulling.** «Bruksanvisning: endre innhold, teste
   på staging, rulle tilbake» var et lanseringskrav fra v8 til v29.
   Staging-miljøet står fortsatt i v31 §23.4 — bruksanvisningen gjør ikke.
   Strøket eller glemt?

4. **Tripletex og økonomi på skolekortet.** «Tripletex-integrasjon: ny skole
   opprettes automatisk som kunde via API» og «årsbeløp» på skolekortet sto fra
   v9/v15 til v17. v31 har kontraktinfo fra HubSpot som «P3 — etter lansering»,
   men ikke Tripletex-koblingen. Er den ute?

5. **Når fryses kortantallet?** Sto som åpent spørsmål til deg og Camilla i
   v15, v16, v17 og i konsept v1. Aldri besvart. 17. juni → 5. august =
   **49 dager**. Dette er det eldste ubesvarte spørsmålet i materialet.

Og en observasjon uten spørsmålstegn: **v22 finnes ikke i mappa.** Rekken går
v21 → v23. Om den aldri ble skrevet, eller er slettet, vet jeg ikke.

---

## 6. Hva første utkast tok feil — og hva det betyr for metoden

Første utkast bygget på en maskinell sammenligning: et begrep regnes som tapt
når det står i to versjoner, forsvinner, og aldri kommer tilbake. Kontrolløren
viste at metoden ikke holder:

**Feil 1 — bindestrekene.** PDF-ene bytter bindestrektype midt i serien. v14,
v20 og v21 bruker myk bindestrek (usynlig, U+00AD); v15, v16, v17 og v23–v31
bruker vanlig. Skiftene ligger på nøyaktig de overgangene analysen bygget på.
Hvert sammensatte ord bytter identitet der. For v21→v23 var **85 %** av de
«tapte» begrepene ren PDF-støy.

**Feil 2 — sammensatte ord.** «dashboard» ser tapt ut fordi v31 skriver
«ledelsesdashboard». Ordet er der; tellingen ser det ikke.

**Feil 3 — og den alvorligste: jeg rullet tilbake en riktig rettelse.**
Utkastet påsto at «Ferdig» på kortutdeling oppsto i v20 den 22. juni, og kalte
det en korreksjon av v32 «som peker på v23». Men v32 §56.3 hadde allerede
flyttet datoen til **18. juni**. Utkastet flyttet den fire dager *senere* og
kalte det å finne noe eldre. Hadde det blitt ført videre, ville et riktig funn
blitt erstattet med et dårligere.

**Feil 4.** Utkastet påsto at «Konsept vedtatt — én inngang, to moduser» (Modus
A strukturert søk / Modus B Trivselsboten) forsvant i v15. Det står i v15, v16
og som egen seksjon 14.1 helt til og med v31. Hele avsnittet er slettet.

**Konsekvensen for metoden:** maskinell begrepstelling duger som **søkelys**,
ikke som **måling**. Den peker ut hvor man skal se. Deretter må hvert funn
bekreftes med ordrett søk i alle versjoner. Alle funn i seksjon 2, 3 og 4 er
bekreftet slik. Tallene fra første utkast — «136 begreper», «72 begreper»,
«645 begreper» — er tatt ut, fordi de ikke tåler etterprøving.

---

## 7. Metode

Alle 23 dokumentene (v8–v31) er hentet ut som tekst med `pdftotext -layout`.
Den maskinelle sammenligningen ble brukt til å peke ut kandidater. Hver
kandidat er deretter kontrollert med ordrett, bindestrek-ufølsomt søk i
**samtlige** 23 dokumenter, og bare de som er borte i alle senere versjoner
står i dette dokumentet.

v18 og v19 er to sider hver. De inneholder fulle statustabeller — det er der
«Ferdig»-funnet i seksjon 4 står — men de er ikke komplette planer, og telles
ikke som nedkorting. Siste komplette plan før v20 er v17.

**Forbehold:**

- Et krav som er skrevet helt om med andre ord vil ikke bli fanget.
- Tekstuttrekk fra PDF er ikke perfekt; tabeller kan komme skjevt ut.
- Kodepåstander: `onsket_kurs_id` er kontrollert i repoet. `kopier_kurs` sin
  funksjonskropp ligger i Supabase, ikke i repoet — den påstanden hviler på
  commit `300666f` (18. juni) og et tidligere oppslag i databasen.
- Denne utgaven er kontrollert én gang. Regn med at en runde til finner mer.
