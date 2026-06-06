# Trivselsleder – prosjektstatus

Sist oppdatert: 2026-06-06

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

---

## Gjenstår

### Hosting
- [ ] Koble GitHub-repo til Vercel for automatisk publisering

### Innlogget del
- [ ] Pålogging med Feide OIDC og/eller brukernavn/passord
- [ ] Ressursbibliotek (leker, Move it, læringsopplegg)
- [ ] Bestillingsskjema kun tilgjengelig for innloggede (per nå åpent)

### Kulturkortet – videre
- [ ] Koble admin-panelet til database (Supabase) så endringer lagres permanent
- [ ] Priser og portosatser synkroniseres mot Supabase (i dag i localStorage)
- [ ] Bestillinger lagres i Supabase (i dag i localStorage)
- [ ] Fylke-mapping i CSV kan justeres manuelt for eventuelle feil
- [ ] Resend: verifiser domenet `trivselsleder.no` og legg inn `RESEND_API_KEY` i Vercel

### Admin-panel (generelt)
- [ ] Fase 2: Ekte autentisering erstatter midlertidig passord på `/admin/bestillinger`
- [ ] Tilgangskontroll på `/admin/kulturkort` (per nå åpent)
- [ ] Administrer brukere og skoler

### Integrasjoner
- [ ] Supabase (database)
- [ ] HubSpot (CRM) – koble kontaktskjema

### Annet
- [ ] Ekte logo i stedet for tekstlogoen
- [ ] Telefonnummer på kontaktsiden
- [ ] Personvern- og vilkårsider
