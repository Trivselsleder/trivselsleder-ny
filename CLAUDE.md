# CLAUDE.md — Prosjektkontekst for trivselsleder.no

Denne filen gir Claude fast kontekst om prosjektet. Les den før du hjelper.

## Om prosjektet
Ny nettside for Trivselsleder AS som erstatter gammel Drupal 7-løsning. Målet er full
selvstendighet fra ekstern leverandør (Ramsalt). Eier: Kjartan Eide (daglig leder).

## Hvem jeg hjelper
Kjartan er IKKE utvikler. Gi ALLTID eksakte copy-paste-kommandoer ("restaurant-nivå"),
aldri tekniske forklaringer som forutsetter koding. Én kommando om gangen ved feilsøking,
så han ikke svarer "suksess" på flere på en gang. Kommuniser på norsk.
- Når han skal ENDRE noe inni en SQL/kommando (bytte et passord, et navn, en verdi):
  skriv eksplisitt HVORDAN han gjør det i grensesnittet — f.eks. «dobbeltklikk på ordet
  BYTTMEG og skriv passordet ditt i stedet, behold anførselstegnene rundt». Ikke bare vis
  blokken og anta at han vet at man kan redigere inni feltet. Bruk et tydelig
  plassholderord (BYTTMEG) som er lett å finne og erstatte.
- Arbeidsregel (fra 11. aug 2026): hvis Claude kan gjøre noe selv, gjør det selv. Ellers
  spør Kjartan. Er det en beslutning Kjartan skal ta, spør FØR du gjør noe. Si alltid
  tydelig HVORFOR noe havner hos ham (krever pålogging, hemmelighet, eller en beslutning).

## Teknisk stack
- Frontend: React + Vite + Tailwind CSS
- Hosting: Vercel (auto-deploy ved push til main)
- Database/auth/storage: Supabase (prosjekt-ID: zpirjbrcbeubwpmtncxx, North-EU/Stockholm)
- Kildekode: GitHub (Trivselsleder/trivselsleder-ny)
- CRM: HubSpot (portal 145220138, app-eu1) — MASTER for kontrakter; systemet foreslår/flagger, endrer aldri status selv
- E-post: Resend (noreply@trivselsleder.no) — kurs- OG webinar-motor
- Innlogging: Feide OIDC (Sikt) + brukernavn/passord
- Søk-agenter: SerpAPI (Production, 15000/mnd)
- AI: Claude API
- Video: Bunny.net Stream (DPA v2 signert 13. aug 2026 — EU-lagring, signerte URL-er)
- Fakturering: Tripletex (planlagt)

## Brandfarger (offisielle v2.0, kilde: GRAFISK-IDENTITET-v2.md / TL Identitet v.2.0.pdf)
- Primær oransje: #FF7B31
- Sekundær petrol: #106C75
- Lys teal: #54A1AB
- Rød: #CF442F
- Grå: #EBEBED
- MERK: Magenta #D6006E er UTGÅTT. Gull/#F2B01E finnes ikke. Gammel oransje #F47920 er erstattet av #FF7B31.
- TILGJENGELIGHET (satt 16. aug 2026, målt): #FF7B31 gir bare 2,6:1 mot hvitt og kan
  IKKE brukes som tekstfarge på lys bakgrunn eller med hvit tekst oppå. Regelen er:
  * fyll/flate/ikon-bakgrunn = #FF7B31 (uendret, vivid)
  * tekst på hvit/lys bakgrunn = --color-orange-ink #B5560F (4,9:1), hover #8A4109 (7,4:1)
  * tekst oppå oransje flate = text-gray-900 (6,9:1) — aldri text-white
  * oransje→petrol-gradient er forbudt: den blir grumsete brun i midten. Bruk
    petrol→#0b4d54 for mørke band, eller ensfarget flate.
  * unntak: Footer har mørk bakgrunn — der er vivid #FF7B31 riktig. Logo-ordmerket er
    logotype og er unntatt kontrastkravet.
- Fonter: Marvin (overskrifter), Avenir (brødtekst)
- Logo: BRUK public/tl-logo.png — aldri AI-tegne

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
- SECURITY DEFINER-funksjoner: legg ALLTID inn en caller-sjekk (get_min_rolle() in
  ('ansatt','superadmin')) hvis funksjonen utleverer eller endrer data — ellers kan hvem
  som helst med anon-nøkkelen kalle den. auth.uid() virker inne i nestede DEFINER-kall.
  Skrive-RPC-er: REVOKE fra public/anon; SECURITY DEFINER med SET search_path=''.
- Tailwind: dynamiske klasser i template literals (`${x ? 'col-span-2' : ''}`) kompileres
  IKKE. Bruk statiske klasser, eller flytt elementet ut av containeren det skal bryte ut av.
- Når noe "ikke endrer seg" på siden: sjekk i rekkefølge — bygger koden lokalt (npx vite
  build)? er riktig commit pushet (git log)? Da er det cache/timing, ikke koden.
- RPC-utvidelse: en ny parameter med standardverdi ERSTATTER ikke en funksjon, den lager
  en overload. Med to varianter i basen blir kall med samme antall navngitte parametre
  tvetydige. Slett den gamle signaturen i samme transaksjon, og sett GRANT på nytt.
  Det samme ved endret RETURNS TABLE: DROP + CREATE + GRANT — ellers får anon tom side.
- Plan-mot-kode går BEGGE veier: koden kan inneholde mer enn planen husker (et ferdig
  skjema listen sa manglet). Sjekk begge retninger før noe erklæres ferdig eller bygges om.
- Endres en e-postmal i innstillinger-tabellen, må koden som fyller plassholderne endres
  i SAMME operasjon — ellers står {plassholder} som synlig tekst i utsendt e-post.
- Supabase SQL-editor via nettleserbro lyver av og til «0 rows» — verifiser via nettleser-fetch
  mot REST (påstand om at noe IKKE finnes krever samme bevis som at det finnes).

## Standard arbeidsflyt for endringer
1. Kjør SQL-migrasjon i Supabase SQL editor (hvis databaseendring)
2. Endre kode (Claude Code bygger, stopper alltid før push så Kjartan ser diffen)
3. git add <fil> && git commit -m "..." && git push (på Kjartans klarsignal)
4. Vent 1-2 min på Vercel, test med Cmd+Shift+R

## Arbeidsform (fra 4. august 2026)
- Chat (Cowork) tar beslutninger, rekkefølge, SQL og formulerer oppdrag til Claude Code.
  Claude Code programmerer, stopper før push. Kjartan kjører SQL i Supabase selv og gir
  klarsignal til push. Nødbremsen (motor_aktiv i innstillinger) styrer all ekte utsending.
- Cowork-chatten har direkte tilgang til prosjektmappa: skriver STATUS.md og RETTELISTE.md
  rett til disk, leser koden selv. Ingen store cat-blokker lenger.
- Ingenting erklæres ferdig uten bevis — helst en ekte e-post eller et skjermbilde.
- STATUS.md = hvor vi er akkurat nå. RETTELISTE.md = alle funn med kilde og bevisstatus.
  Begge holdes utenfor git-commits.

## FAST REGEL: dokumenter fra chat til prosjektkunnskapen (fra 17. aug 2026)
- Notater, planer og analyser Claude lager i en prosjektchat leveres ALLTID som
  fil direkte i chatten (filkort), med filnavn claude_NAVN.md. Kjartan legger
  dem til i prosjektet med ett klikk på filkortet. Det er HELE flyten.
- ALDRI be Kjartan om cat-blokker, git-kommandoer, mapper eller manuell
  opplasting for å få dokumenter inn i prosjektkunnskapen. ALDRI introduser
  nye metoder. Er Claude usikker: lag filen i chatten, ferdig.
- Terminal/git brukes KUN til kode og migrasjoner — ikke til chatnotater.
