# Trivselsleder – prosjektstatus

Sist oppdatert: 2026-06-04

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
