# CLAUDE.md — Prosjektkontekst for trivselsleder.no

Denne filen gir Claude fast kontekst om prosjektet. Les den før du hjelper.

## Om prosjektet
Ny nettside for Trivselsleder AS som erstatter gammel Drupal 7-løsning. Målet er full
selvstendighet fra ekstern leverandør (Ramsalt). Eier: Kjartan Eide (daglig leder).

## Hvem jeg hjelper
Kjartan er IKKE utvikler. Gi ALLTID eksakte copy-paste-kommandoer ("restaurant-nivå"),
aldri tekniske forklaringer som forutsetter koding. Én kommando om gangen ved feilsøking,
så han ikke svarer "suksess" på flere på en gang. Kommuniser på norsk.

## Teknisk stack
- Frontend: React + Vite + Tailwind CSS
- Hosting: Vercel (auto-deploy ved push til main)
- Database/auth/storage: Supabase (prosjekt-ID: zpirjbrcbeubwpmtncxx, North-EU/Stockholm)
- Kildekode: GitHub (Trivselsleder/trivselsleder-ny)
- CRM: HubSpot (portal 145220138, app-eu1)
- E-post: Resend
- Innlogging: Feide OIDC (Sikt) + brukernavn/passord
- Søk-agenter: SerpAPI (Production, 15000/mnd)
- AI: Claude API
- Video: Vimeo Pro
- Fakturering: Tripletex (planlagt)

## Brandfarger (offisielle, i src/index.css)
- Oransje: #F47920 (primær)
- Magenta: #D6006E (sekundær)
- Hover-varianter #e06910 / #d4681a er OK
- Fonter: Marvin (overskrifter), Avenir (brødtekst)
- MERK: teal #106C75 er UTGÅTT — skal ikke brukes

## Viktige IDer
- Kjartans superadmin-UID: 9ee20e27-c5c2-4917-a6ba-4b3baedabf11
- Rollekolonne i profiles-tabellen heter "rolle", superadmin-verdi: "superadmin"
- Roller: superadmin, ansatt, skoleadmin, skoleansatt, feide

## Direktelenker (gi alltid klikkbar URL når Kjartan skal sjekke noe)
- Supabase SQL editor: https://supabase.com/dashboard/project/zpirjbrcbeubwpmtncxx/sql/new
- Nettsiden: https://trivselsleder-ny.vercel.app

## Faste regler
- SQL-migrasjoner kjøres ALLTID i Supabase SQL editor FØR kode pushes til GitHub
  (ellers venter live kode på kolonner som ikke finnes ennå).
- API-nøkler i terminal: bruk python3 -c med input(), én nøkkel om gangen. Aldri nano.
- WCAG 2.1 AA er lovpålagt for skolesektoren — bygges inn fra start, ikke etterpå.
- Flerspråklig fra start: all tekst i i18n-filer, ingen hardkodet tekst.
- Systemet foreslår, mennesket bestemmer: automatikk endrer aldri forretningskritiske
  data (som HubSpot-status) av seg selv — flagger for manuell godkjenning.

## Lærdommer (snublesteiner vi har løst)
- Supabase RLS: nye tabeller trenger BÅDE policyer OG `ENABLE ROW LEVEL SECURITY`.
- Supabase GRANT: anon + authenticated trenger eksplisitt GRANT SELECT på nye tabeller,
  ellers 403 selv med korrekte RLS-policyer.
- Supabase "Max rows" (Data API-innstilling) overstyrer .range() i koden — begge må
  settes for å hente store lister (satt til 10000).
- RLS-rekursjon: en SECURITY DEFINER-funksjon som leser fra en tabell med RLS kan lage
  uendelig løkke hvis policyene kaller funksjonen. Skriv funksjonen i plpgsql med
  SECURITY DEFINER, eller unngå at policyer på en tabell leser fra samme tabell.
- Tailwind: dynamiske klasser i template literals (`${x ? 'col-span-2' : ''}`) kompileres
  IKKE. Bruk statiske klasser, eller flytt elementet ut av containeren det skal bryte ut av.
- Når noe "ikke endrer seg" på siden: sjekk i rekkefølge — bygger koden lokalt (npx vite
  build)? er riktig commit pushet (git log)? Da er det cache/timing, ikke koden.

## Standard arbeidsflyt for endringer
1. Kjør SQL-migrasjon i Supabase SQL editor (hvis databaseendring)
2. Endre kode (gi Kjartan python3 -c kommando som redigerer filen trygt)
3. git add <fil> && git commit -m "..." && git push
4. Vent 1-2 min på Vercel, test med Cmd+Shift+R
