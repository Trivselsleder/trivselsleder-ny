# Trivselsleder – prosjektstatus

Sist oppdatert: 2026-06-05

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
  - Sender bestilling til kulturkort@trivselsleder.no via FormSubmit
- Admin-panel (`/admin/kulturkort`):
  - Tabell med alle 814 partnere, søk og filter på aktiv/inaktiv
  - Rediger/slett/aktiver–deaktiver partner
  - Legg til ny partner med modal (alle felter inkl. nettside-URL)
  - Data lagres foreløpig i minne fra JSON-fil – klar for Supabase

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
- [ ] Priser og portosatser konfigurerbare fra admin i stedet for hardkodet
- [ ] Fylke-mapping i CSV kan justeres manuelt for eventuelle feil

### Admin-panel (generelt)
- [ ] Autentisering – admin-sider er per nå uten tilgangskontroll
- [ ] Administrer brukere og skoler

### Integrasjoner
- [ ] Supabase (database)
- [ ] HubSpot (CRM) – koble kontaktskjema

### Annet
- [ ] Ekte logo i stedet for tekstlogoen
- [ ] Telefonnummer på kontaktsiden
- [ ] Personvern- og vilkårsider
