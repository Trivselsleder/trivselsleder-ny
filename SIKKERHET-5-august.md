# SIKKERHET — gjennomgang 5. august 2026

Kjartan ba meg droppe dette fordi det «sikkert var sikkert». Det var det ikke.
Derfor står beviset først.

---

## BEVISET

Denne adressen ble åpnet i nettleseren **uten innlogging**:

```
https://trivselsleder-ny.vercel.app/api/kurs/hvem-star-for-tur
```

Svaret (forkortet, ekte utklipp):

```json
{"ok":true,"motor_aktiv":"nei","antall":{"paaminnelse":7},
 "paaminnelse":[{"skole":"TEST Arendal skole 2 (agenttest)",
   "kurs":"Lek TEST Nettverk Arendal","kursdato":"15. august 2026",
   "mottaker_navn":"HTLA Arendal 2 (test)",
   "mottaker_epost":"kjartan+arendal2@trivselsleder.no"}, ...]}
```

Skolenavn, kursnavn, kursdato, kontaktpersonens navn og e-postadresse — for
**hele basen**, til hvem som helst på internett.

I dag ligger det bare testdata der. Poenget er at hullet står åpent **før** de
2 456 rektor-e-postene og 161 hallene importeres.

Nødbremsen hjelper ikke her. `motor_aktiv` stopper **utsending**. Dette var
**lesing**.

---

## HVORFOR DET SKJEDDE

4. august fikk alle fem `api/admin/*`-endepunktene en tilgangssjekk, etter et
funn i agenttest 3. `api/kurs/*` ble ikke tatt med i den runden.

`ProtectedRoute` i frontenden skjuler bare knappene. Den stopper ingen som
skriver adressen rett inn i nettleseren. Endepunktene bruker service-nøkkelen
og går utenom alle sperrer i databasen — da må de selv spørre *hvem er dette*.
Fire av dem gjorde det ikke.

---

## HVA SOM STO ÅPENT

| Endepunkt | Metode | Trengte man å vite noe? | Verste utfall |
|---|---|---|---|
| `hvem-star-for-tur` | GET | **nei, ingenting** | Hele kontaktlista lekket. Bevist over. |
| `send-evaluering` | GET | nei — adressen står i `vercel.json` | Ekte evaluerings-e-post, når `motor_aktiv='ja'` |
| `send-invitasjon` | POST | `kurs_id` | Ekte invitasjon til alle skoler på kurset |
| `send-oppfolging` | POST | `kurs_skole_ids` | Ekte purring / påminnelse |
| `varsle-eivind` | POST | skolens token | **Åpen med vilje** — se under |

`varsle-eivind` kalles fra evalueringsskjemaet, som skolen fyller ut uten å
være innlogget. Den kan derfor ikke kreve en ansatt. Beskyttelsen er skolens
personlige token, samme modell som svarskjemaet og kursinfosiden. Den er
vurdert og skal ikke ha vakt.

---

## HVA SOM ER GJORT (ikke pushet)

**Ny fil `api/_vakt.js`** — én felles vakt, så mønsteret ikke kan gå i utakt
neste gang:

- `krevAnsatt(req, supabase)` — krever Bearer-token, gyldig sesjon, rolle
  superadmin/ansatt, **og at kontoen ikke er deaktivert**.
- `krevCronEllerAnsatt(req, supabase)` — for `send-evaluering`, som både
  kjøres av Vercel-cron og manuelt av en ansatt.
- `trygtOrigin(req)` — se neste punkt.

Vakten kalles **før** kroppen valideres. En fremmed skal få 401, ikke 400.
Et 400-svar røper at endepunktet finnes og hva det vil ha.

**Fire endepunkter fikk vakt:** `hvem-star-for-tur`, `send-invitasjon`,
`send-oppfolging`, `send-evaluering`.

**Frontenden ble lagt om** fra `fetch` til `adminFetch`, som legger på
sesjonen automatisk: `AdminOppfolging.jsx:154` og `:184`,
`SendLenker.jsx:72` og `:121`. Ingen lovlig bruker mister tilgang — begge
sidene nås kun via ruter som allerede krever superadmin/ansatt.

---

## TO FUNN TIL, FRA KONTROLLRUNDEN

En uavhengig agent kontrollerte rettingen. Den bekreftet at hullet er tettet,
og fant to ting jeg hadde oversett:

**1. Passord-tilbakestilling kunne kapres.** `api/auth/glemt-passord.js:32`
brukte `req.headers.origin` — en verdi den som ringer bestemmer selv — som mål
for lenken i e-posten:

```js
const origin = req.headers.origin || 'https://trivselsleder.no'
options: { redirectTo: `${origin}/sett-passord` }
```

Setter noen `Origin: https://ondsted.no`, går det ut en **ekte** e-post fra
trivselsleder.no til offeret, med en lenke som lander hos angriperen — med
tilbakestillingsnøkkelen i adressen. Kontokapring i to steg.

Rettet: `trygtOrigin(req)` godtar kun tre kjente adresser og faller ellers
tilbake til trivselsleder.no. Lista er hardkodet med vilje — dette er et
forsvar, ikke en innstilling, og skal ikke kunne endres fra admin-siden.
Samme rettelse i `inviter-bruker.js`, `godkjenn-paamelding.js` og
`opprett-skole.js`, som hadde nøyaktig samme linje.

**2. Deaktivert ansatt slapp gjennom API-et.** `ProtectedRoute.jsx:16` stenger
en deaktivert bruker ute av skjermbildene, men sesjonen lever til den utløper.
Vakten sjekket bare rolle. Rettet: den sjekker nå `aktiv` også.

Dessuten: `api/paamelding.js` returnerte den rå Postgres-feilen til den som
ringte — tabell-, kolonne- og constraint-navn rett ut på internett. Nå går
detaljene i serverloggen og kalleren får en vanlig beskjed.

---

## FORTSATT ÅPENT — IKKE RETTET I DENNE RUNDEN

Disse står i RETTELISTE som egne punkter. Ingen av dem lekker data, men to av
dem kan misbrukes.

- **`api/paamelding.js` er helt åpen for skriving.** Hvert kall lager en rad i
  `paameldinger`, et selskap i HubSpot og en e-post til post@. Ingen captcha,
  ingen ratebegrensning. Et skript kan fylle tabellen og forurense CRM-et.
- **`api/send-bestilling.js` er et åpent e-postrelé.** Den sender til en
  vilkårlig adresse oppgitt av den som ringer, fra noreply@trivselsleder.no.
  Innholdet er escapet, så ingen injeksjon — men domenet kan misbrukes til
  phishing og ryktet kan ryke.
- **Supabase sin Redirect-URL-liste må kontrolleres.** Har den jokertegn,
  var punkt 1 over utnyttbart. Koden er rettet uansett, men lista bør sjekkes.
- **`crypto.timingSafeEqual`** i `krevCronEllerAnsatt` i stedet for `===`.
  Teoretisk tidskanal. Lav.
- **`varsle-eivind` tørrkjøring** returnerer `ville_sendt_til`, altså
  `eivind_epost`, til en uinnlogget kaller med gyldig token. En
  forretningsadresse. Lav.
- **`api/auth/feide/exchange.js`** er åpen med vilje (OAuth-callback).
  Vurdert: nye brukere får rollen `feide`, som ikke gir admin-tilgang. OK.

---

## DU GJØR — i denne rekkefølgen

Hullet står åpent til dette er rullet ut.

### 1 → VERCEL
Åpne prosjektet trivselsleder-ny → Settings → Environment Variables → Add.

- Name: `CRON_SECRET`
- Value: en lang tilfeldig tekst (minst 32 tegn, bare bokstaver og tall)
- Kryss av for **Production** og **Preview**

Uten denne slutter den daglige evaluerings-jobben å virke — stille. Den
logger 401 i Vercel, men ingen får beskjed.

### 2 → TERMINALEN
```
cd ~/trivselsleder-ny && npm run build
```
Skal ende med «built in …». Kommer det en feil, stopp og send meg den.

### 3 → TERMINALEN
```
cd ~/trivselsleder-ny && git add api/_vakt.js api/kurs/hvem-star-for-tur.js api/kurs/send-invitasjon.js api/kurs/send-oppfolging.js api/kurs/send-evaluering.js api/kurs/varsle-eivind.js api/auth/glemt-passord.js api/auth/inviter-bruker.js api/admin/godkjenn-paamelding.js api/admin/opprett-skole.js api/paamelding.js src/pages/AdminOppfolging.jsx src/pages/SendLenker.jsx && git commit -m "Sikkerhet: vakt paa api/kurs-endepunktene + trygg origin i e-postlenker" && git push
```

Filene er listet opp én for én med vilje. `git add -A` ville dratt med seg
alle .md-filene og `.claude/`.

### 4 → NETTLESEREN (beviset på at det virker)
Når Vercel er ferdig med utrullingen, åpne den samme adressen som øverst i
dette dokumentet:

```
https://trivselsleder-ny.vercel.app/api/kurs/hvem-star-for-tur
```

Nå skal det stå `{"error":"Ikke autentisert."}`. Gjør det ikke det, si fra.

Logg deretter inn og sjekk at Oppfølging-siden og Send invitasjoner fortsatt
virker som før.

---

## NOTAT: GITHUB-TOKENET

`.git/config` inneholder et GitHub-token i klartekst, midt i adressen til
repoet. Det er ikke committet, men det ligger på disken. Det bør trekkes
tilbake på github.com og fjernes fra remote-adressen:

```
cd ~/trivselsleder-ny && git remote set-url origin https://github.com/Trivselsleder/trivselsleder-ny.git
```

Gjøres dette FØR punkt 3 over, spør Git om innlogging ved push. Da lager du
et nytt token og lar macOS-nøkkelringen huske det.
