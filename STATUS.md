# Trivselsleder – prosjektstatus

Sist oppdatert: 2026-06-08

---

## Hva er gjort

### Teknisk grunnstruktur
- React + Vite prosjekt opprettet
- Tailwind CSS v4 installert og konfigurert med Vite-plugin
- Merkevarefarger definert som Tailwind-tema-variabler: oransje `#F47920` og magenta `#D6006E`
- React Router DOM installert for klientside-navigasjon
- `react-i18next` + `i18next-browser-languagedetector` installert og konfigurert

### Sider
| Side | Rute | Status |
|------|------|--------|
| Forside | `/` | Ferdig |
| Om oss | `/om-oss` | Ferdig |
| For skoler | `/for-skoler` | Ferdig |
| Kontakt | `/kontakt` | Ferdig |
| Kulturkortet – partnerside | `/kulturkortet` | Ferdig |
| Kulturkortet – bestilling | `/kulturkortet/bestill` | Ferdig |
| Kulturkortet – admin | `/admin/kulturkort` | Ferdig |

### Komponenter
- **Header** – sticky, med logo, navigasjon, språkvelger (🇳🇴/🇸🇪) og «Logg inn»-knapp. Aktiv side markert i oransje. Mobil-meny med hamburger-ikon.
- **Footer** – mørk, tre-kolonne layout med sidelenker og kontaktinfo.

### Kulturkortet
- Offentlig partnerside (`/kulturkortet`) med 714 aktive samarbeidspartnere importert fra `advantages_admin.csv`
- Filtrer på fylke → kommune (kaskaderende) og type – fritekst-søk på navn og sted
- 638 nettside-URL-er generert automatisk fra e-postdomener i CSV
- Hvert partnerkort viser navn, kommune, type (med emoji-ikon) og «Besøk nettside»-lenke
- Bestillingsskjema (`/kulturkortet/bestill`):
  - Felt: skolenavn, antall, kontaktperson, e-post, leveringsadresse (gate, postnummer, poststed), tilleggsinfo
  - Automatisk prisutregning live mens antall fylles inn: 40 kr/kort + porto etter vekttrapper (28/46/69/99 kr)
  - Prissammendrag (kortpris + porto + totalt eks. mva) vises under antall-feltet og igjen rett før «Send»-knappen
  - Sender bestilling via Vercel serverless funksjon (`/api/send-bestilling.js`) med Resend SDK
  - Sender automatisk to e-poster: intern varsel til kulturkort@trivselsleder.no (reply-to = kunde) og bekreftelse til kunden
  - Fra-adresse: `noreply@trivselsleder.no` (krever DNS-verifisering i Resend-dashbordet)
  - API-nøkkel lagres som miljøvariabel (`RESEND_API_KEY`) i Vercel – aldri i kode
  - Prisutregning byttet til antallsbaserte portotrapper (ikke vektbasert); satser leses fra localStorage via `src/utils/satser.js`
  - Bestilling lagres i `localStorage` (`kulturkort_bestillinger`) etter vellykket innsending
- Admin-panel (`/admin/kulturkort`):
  - Tabell med alle 814 partnere, søk og filter på aktiv/inaktiv
  - Rediger/slett/aktiver–deaktiver partner
  - Legg til ny partner med modal (alle felter inkl. nettside-URL)
  - Data lagres foreløpig i minne fra JSON-fil – klar for Supabase
- Bestillings-admin (`/admin/bestillinger`):
  - Passordskjerm (passord: `trivsel2025`) med sessionStorage-basert sesjon
  - Tabell med alle innkomne bestillinger: dato, skole, kontaktperson, e-post, antall, adresse, priser
  - Statushåndtering per bestilling: Ny → Fakturert → Levert (klikk på chip, lagres i localStorage)
  - Filtrer på status (Alle / Ny / Fakturert / Levert) med tellere
  - Statistikk-chips i header viser antall per status
  - Prisinnstillinger-seksjon: kortpris og portotrapper redigeres direkte og lagres i localStorage
  - Endringer i satser slår automatisk gjennom i bestillingsskjemaet

### Flerspråklig støtte (i18n)
- Norsk som standardspråk (`fallbackLng: 'no'`), valg lagres i localStorage
- `src/locales/no/translation.json` – alle norske tekster for alle sider og komponenter
- `src/locales/sv/translation.json` – komplett svensk oversettelse
- Språkvelger i Header bytter mellom norsk og svensk med ett klikk

### Git og hosting
- Git-repository på `main`-branch
- Koblet til GitHub: `https://github.com/Trivselsleder/trivselsleder-ny`
- Kode pushet og oppdatert

### RLS for ansatt-rollen (2026-06-08)

- Migrasjon `008_rls_ansatt.sql`: ansatt har nå full lese- og skrivetilgang til `paameldinger`, `skoler` og `profiles`
- `/admin/brukere` er kun tilgjengelig for superadmin – håndheves av `ProtectedRoute kreverRolle="superadmin"` i App.jsx
- Bruker `get_min_rolle()` (SECURITY DEFINER) for å unngå rekursiv RLS-evaluering på `profiles`

### Aktivering av skole fra påmelding (2026-06-08)

- Ny serverless funksjon `api/admin/godkjenn-paamelding.js`:
  - Setter påmelding-status til `godkjent`
  - Upserterer skole i `skoler`-tabellen (org_nr som konflikt-nøkkel, status `Aktiv`)
  - Inviterer HTLA automatisk som `skoleadmin` og sender branded velkomst-e-post
  - Inviterer TLA automatisk som `skoleansatt` og sender branded velkomst-e-post
  - Hvis bruker allerede finnes (samme e-post): knyttes til skolen uten ny invitasjon
- `AdminPaameldinger`: «Godkjenn»-knappen kaller nå ny funksjon og viser resultatkort i modalen (hvem ble invitert, hvem fantes fra før)

### Fase 2 – Innlogging og brukersystem (2026-06-07)

#### Supabase-oppsett
- `@supabase/supabase-js` installert
- Databaseskjema (`supabase/migrations/001_initial_schema.sql`):
  - `profiles` – knyttet til Supabase auth.users, med roller: `superadmin`, `administrator`, `ansatt`
  - `skoler` – med `org_nr UNIQUE` som idempotent nøkkel for fremtidig Excel/CSV-import
  - `bruker_skole` – mange-til-mange mellom brukere og skoler med rolle per skole
  - RLS-policyer på alle tabeller
- Databaseskjema (`supabase/migrations/002_paameldinger.sql`):
  - `paameldinger` – lagrer innkomne skolepåmeldinger med alle kontaktfelter og status
  - RLS: kun superadmin har tilgang

#### Autentisering
- `src/lib/supabase.js` – Supabase-klient
- `src/contexts/AuthContext.jsx` – React context med `loggInn`, `loggUt`, `glemmtPassord`, `settNyttPassord`, `bruker` (inkl. rolle), `session`, `laster`
- `src/components/ProtectedRoute.jsx` – vaktkomponent med valgfri `kreverRolle`-prop
- Eksisterende hardkodet passord i AdminBestillinger fjernet og erstattet med ekte auth

#### Sider
| Side | Rute | Status |
|------|------|--------|
| Innlogging | `/logg-inn` | Ferdig |
| Sett/tilbakestill passord | `/sett-passord` | Ferdig |
| Min side (dashbord) | `/min-side` | Ferdig |
| Feide OIDC callback | `/auth/feide/callback` | Ferdig |
| Påmelding nye skoler | `/paamelding` | Ferdig |
| Admin – påmeldingsbehandling | `/admin/paameldinger` | Ferdig |

#### Innloggingsmetoder
- **E-post/passord** – Supabase Auth med sesjonshåndtering
- **Glemt passord** – serverless funksjon (`api/auth/glemt-passord.js`) genererer Supabase recovery-lenke og sender branded e-post via Resend
- **Feide OIDC** – knapp på innloggingssiden; `api/auth/feide/exchange.js` bytter kode mot tokens server-side (client_secret aldri i nettleserbunten), henter brukerinfo, oppretter Supabase-bruker og returnerer magic link
- Selvregistrering er deaktivert – brukere opprettes av superadmin

#### Min side (`/min-side`)
- Viser brukerens navn og rolle etter innlogging
- Superadmin-lenker til bestillingsadmin og kulturkort-admin
- Fallback-henting av profil direkte fra Supabase hvis konteksten ikke er klar ennå
- Viser tydelig advarsel hvis profilrad mangler i databasen

#### Header
- Viser brukerens navn og «Logg ut»-knapp når innlogget
- Viser «Logg inn»-knapp for ikke-innloggede

#### Påmeldingsskjema (`/paamelding`)
- Offentlig tilgjengelig (ingen innlogging)
- Felter: skolenavn, type, antall elever, adresse, fakturainformasjon, rektor / HTLA / TLA, merknader
- `api/paamelding.js`: lagrer i `paameldinger`-tabellen med status `påmeldt` og sender formatert HTML-e-post til `post@trivselsleder.no` via Resend (reply-to = rektors e-post)

#### Admin-side for påmeldinger (`/admin/paameldinger`) – 2026-06-07 kveld
- Krever innlogging (ProtectedRoute)
- Henter alle påmeldinger fra Supabase sortert nyest-først
- **Oversiktstabell** med kolonner: dato, skolenavn, type, kommune, rektornavn, rektors e-post, status
  - Klikk på rad åpner detaljmodal
  - E-postlenker stopper klikk-propagasjon så tabellraden ikke aktiveres
- **Statusteller-chips** i header: antall påmeldt (gul), godkjent (grønn), avvist (rød)
- **Filterknapper**: Alle / Påmeldt / Godkjent / Avvist – aktiv filter markert i magenta
- **Detaljmodal** viser alle felt gruppert i seksjoner:
  - Skole (type, antall elever, hjemmeside)
  - Adresse (gate, postnr/poststed, kommune, fylke)
  - Faktura (org.nr, fakturaadresse, fakturareferanse, kontortelefon)
  - Rektor, HTLA, TLA – med klikk-bare e-postlenker
  - Merknader (vises kun hvis utfylt)
- **Godkjenn/Avvis-knapper** i modalens footer:
  - Optimistisk oppdatering (UI endres umiddelbart, rulles tilbake ved feil fra Supabase)
  - Knappene vises kun når det er meningsfylt (ikke «Godkjenn» hvis allerede godkjent)
  - Laste-tilstand (disabled) mens Supabase-kall pågår
  - Lukker modal automatisk etter vellykket statusbytte
- Tomme-tilstander: «Ingen påmeldinger ennå» / «Ingen med valgt filter»
- Spinner-animasjon under lasting

#### E-post via Resend
- Glemt passord: branded tilbakestillingslenke
- Påmelding: fullstendig HTML-e-post med alle skoledata til post@trivselsleder.no
- (Velkomst-e-post fjernet da selvregistrering ble deaktivert)

---

## Gjenstår

### Brukeradmin (Fase 2 Steg 2)
- [x] Superadmin kan invitere brukere via e-post (Supabase invite + Resend)
- [x] Skole opprettes automatisk og HTLA/TLA inviteres ved godkjenning av påmelding
- [ ] Superadmin kan opprette skoler manuelt (uten påmelding)
- [ ] Administrator kan legge til ansatte på sin skole (skoleadmin-flyt)
- [ ] Excel/CSV-import av skolelister (tabellen er klar med `org_nr` som upsert-nøkkel)
- [ ] Velg enhet for brukere med tilgang til flere skoler

### Feide
- [ ] Sett `VITE_FEIDE_CLIENT_ID`, `FEIDE_CLIENT_ID` og `FEIDE_CLIENT_SECRET` i Vercel
- [ ] Registrer `https://trivselsleder.no/auth/feide/callback` som redirect URI hos Sikt

### Supabase – gjenstående oppsett
- [ ] Kjør `002_paameldinger.sql` i SQL Editor
- [ ] Sett `SUPABASE_SERVICE_ROLE_KEY` i Vercel (påkrevd for glemt passord, Feide og påmelding)
- [ ] Opprett første superadmin-bruker manuelt og INSERT i `profiles`

### Kulturkortet – videre
- [ ] Koble admin-panelet til Supabase så endringer lagres permanent
- [ ] Bestillinger lagres i Supabase (i dag i localStorage)
- [ ] Priser og portosatser synkroniseres mot Supabase

### Innlogget del
- [ ] Ressursbibliotek (leker, Move it, læringsopplegg)

### Integrasjoner
- [ ] HubSpot (CRM) – koble kontaktskjema

### Annet
- [ ] Ekte logo i stedet for tekstlogoen
- [ ] Telefonnummer på kontaktsiden
- [ ] Personvern- og vilkårsider
