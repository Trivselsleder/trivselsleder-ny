# Trivselsleder – prosjektstatus

Sist oppdatert: 2026-06-05

---

## Hva er gjort

### Teknisk grunnstruktur
- React + Vite prosjekt opprettet
- Tailwind CSS v4 installert og konfigurert med Vite-plugin
- Merkevarefarger definert som Tailwind-tema-variabler: oransje `#F47920` og magenta `#D6006E`
- React Router DOM installert for klientside-navigasjon

### Sider
| Side | Rute | Status |
|------|------|--------|
| Forside | `/` | Ferdig |
| Om oss | `/om-oss` | Ferdig |
| For skoler | `/for-skoler` | Ferdig |
| Kontakt | `/kontakt` | Ferdig |

### Komponenter
- **Header** – sticky, med logo, navigasjon og «Logg inn»-knapp. Aktiv side markert i oransje. Mobil-meny med hamburger-ikon.
- **Footer** – mørk, tre-kolonne layout med sidelenker og kontaktinfo.

### Kulturkortet
- Offentlig partnerside (`/kulturkortet`) med 714 aktive samarbeidspartnere fra CSV
- Filtrer på fylke, kommune og type – kaskaderende dropdowns
- Fritekst-søk på navn og sted
- 638 nettside-URL-er generert automatisk fra e-postdomener
- Bestillingsskjema (`/kulturkortet/bestill`) med automatisk prisutregning (40 kr/kort + porto basert på vekt), adressefelter og prissammendrag før innsending. Sender til kulturkort@trivselsleder.no
- Admin-panel (`/admin/kulturkort`) med rediger/slett/aktiver/legg til ny partner

### Flerspråklig støtte (i18n)
- `react-i18next` installert og konfigurert med `i18next-browser-languagedetector`
- Norsk som standardspråk (`fallbackLng: 'no'`)
- Alle hardkodede tekster på alle sider og komponenter flyttet til `src/locales/no/translation.json`
- Tilsvarende svensk oversettelse i `src/locales/sv/translation.json`
- Språkvelger (🇳🇴 / 🇸🇪) i Header – lagres i localStorage
- Sider med i18n: Home, Om oss, For skoler, Kontakt, Kulturkortet, Bestill, Admin, Header, Footer

### Git og hosting
- Git-repository initialisert (`main`-branch)
- `.gitignore` oppdatert med beskyttelse for `.env`-filer
- Koblet til GitHub: `https://github.com/Trivselsleder/trivselsleder-ny`
- Første commit gjort med all kildekode

---

## Gjenstår

### Hosting
- [ ] Push kode til GitHub (krever interaktiv innlogging i terminal: `git push --set-upstream origin main`)
- [ ] Koble GitHub-repo til Vercel for automatisk publisering

### Innlogget del
- [ ] Pålogging med Feide OIDC og brukernavn/passord
- [ ] Ressursbibliotek (leker, Move it, læringsopplegg)

### Admin-panel
- [ ] Last opp innhold
- [ ] Administrer brukere og skoler

### Integrasjoner
- [ ] Supabase (database)
- [ ] HubSpot (CRM) – koble kontaktskjema

### Annet
- [ ] Ekte logo i stedet for tekstlogoen
- [ ] Telefonnummer på kontaktsiden
- [ ] Personvern- og vilkårsider
