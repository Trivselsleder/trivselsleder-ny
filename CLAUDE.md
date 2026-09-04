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

- Kjartan vil ALDRI ha valgbokser eller knapper med svaralternativer — alltid direkte
  diskusjon i klartekst.

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

## FAST REGEL: fremdriftsplan-mal (docx) — fasit (fra 31. aug 2026)
Fremdriftsplanen bygges med **docx-js (IKKE pandoc)**, **US Letter**, statisk TOC med **ekte
sidetall via to-runde-bygg**. **Skrift = Calibri. Overskrifter (Heading1) = petrol #106C75.**
Slik v44.docx OG v45.docx faktisk er — **filene er fasit.** Overskriftfargen er IKKE oransje
#F47920 (det er den utgåtte web-oransjen), og skriften er IKKE Arial. Forside som v45 (petrol
TRIVSELSLEDER-tittel, grå undertekster). Merkefarger i tekst: oransje #FF7B31, petrol #106C75
(magenta UTGÅTT). Bordered footer «trivselsleder.no · Konfidensielt · Side {PAGE}».
*(Cowork fanget en feil mal-spec 30. aug — «Arial + oransje #F47920» — som ikke matchet filene;
Kjartan bekreftet Calibri + petrol, uendret.)*

## Viktige IDer
- Kjartans superadmin-UID: 9ee20e27-c5c2-4917-a6ba-4b3baedabf11
- Rollekolonne i profiles-tabellen heter "rolle", superadmin-verdi: "superadmin"
- **Roller — TO UAVHENGIGE NIVÅER, ikke bland dem:**
  - **`profiles.rolle`** = internt nivå i plattformen: `'superadmin'` (Kjartan), `'ansatt'` (ansatt hos
    TRIVSELSLEDER AS), `'skoleadmin'`, `'skoleansatt'`, `'feide'`. Det er DENNE `get_min_rolle()` leser.
    Vakten `get_min_rolle() in ('ansatt','superadmin')` betyr «kun folk som jobber hos Trivselsleder AS».
  - **`bruker_skole`** = tre uavhengige felt per person per skole (vedtatt 17. aug, migr 043):
    - **tilgang**: `'skoleadmin'` | `'skoleansatt'` — NB: dette er kolonnen som faktisk HETER `rolle` i
      `bruker_skole`. Det finnes ingen egen `tilgang`-kolonne; navnet «tilgang» brukes her kun for å
      skille den fra `profiles.rolle`.
    - **stilling**: `'rektor'` | `'inspektor'` | `'styrer'` | `'ansatt'` | `NULL`.
    - **tl_rolle**: `'htla'` | `'tla'` | `NULL`. **Maks én HTLA per skole.**
  - **FELLE — ordet «ansatt» finnes to steder med ULIK betydning:**
    - `profiles.rolle = 'ansatt'`      → ansatt hos Trivselsleder AS.
    - `bruker_skole.stilling = 'ansatt'` → vanlig lærer på en skole.
    To forskjellige kolonner i to forskjellige tabeller. En rollevakt skal ALLTID lese `profiles` via
    `get_min_rolle()`, ALDRI `bruker_skole` (verken dens `rolle`/tilgang eller `stilling` — merk at
    kolonnenavnet `rolle` finnes i BEGGE tabellene, med ulike verdisett). Skriver noen en vakt mot feil
    kolonne, åpnes interne data for hele skole-Norge.
  - **MÅLT I PROD 4. sep:** `profiles` har 3 rader — 1 superadmin, 2 skoleadmin, 0 ansatt. Ingen ugyldige
    verdier, ingen NULL.

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
- Byggeren skriver ALDRI kontrollrunde-avsnittet selv — det skrives kun av den
  uavhengige kontrolløren (regel 4-innskjerping, 21. aug 2026).
- Mac-mappa ~/trivselsleder-ny/ er autoritativ for CLAUDE.md og STATUS.md. Det finnes
  INGEN auto-synk til claude.ai-prosjektet — Cowork gjør ALLTID begge steg: skriv fila til
  ~/trivselsleder-ny/ OG kjør eksplisitt project_write, og bevis Mac-steget med `ls`.

## Lærdommer (snublesteiner vi har løst)
- Supabase RLS: nye tabeller trenger BÅDE policyer OG `ENABLE ROW LEVEL SECURITY`.
- Supabase GRANT: anon + authenticated trenger eksplisitt GRANT SELECT på nye tabeller,
  ellers 403 selv med korrekte RLS-policyer.
- Rettigheter på nye objekter — stol ALDRI på defaults. Migrasjoner kjøres som postgres, og
  det er postgres sitt sett i pg_default_acl som gjelder. I VÅR base (målt 4. sep 2026) gir
  det: nye TABELLER → anon, authenticated og service_role får TRUNCATE, REFERENCES, TRIGGER
  (+MAINTAIN), INGEN select/insert/update/delete (derfor 403 for innloggede på en ny tabell
  selv med riktige policyer); nye SEKVENSER → ingenting; nye FUNKSJONER → ingenting via
  defaults, MEN Postgres selv gir PUBLIC (= alle roller, anon inkludert) EXECUTE på hver ny
  funksjon (proacl NULL). Supabase-standarden er ALL til alle tre på alt — vår base er
  strammet for hånd (udokumentert, uten fil), og det kan bli nullstilt av ny instans/
  gjenoppretting/oppgradering. Derfor skriver hver migrasjon som lager en TABELL selv:
    grant select, insert, update, delete on public.<tabell> to authenticated, service_role;
    revoke all on public.<tabell> from anon;
  og ved identity/serial-kolonne også:
    grant usage, select on sequence public.<tabell>_id_seq to authenticated, service_role;
    revoke all on sequence public.<tabell>_id_seq from anon;
  (formen fra 063/077/095/100). Skal anon lese, er det en BESLUTNING: grant select … to anon,
  begrunnet i fila. Hver migrasjon som lager eller endrer en FUNKSJON skriver:
    revoke execute on function public.<fn>(<signatur>) from public, anon, authenticated;
    grant execute on function public.<fn>(<signatur>) to <rollene som skal ha den>;
  (formen fra 098/099). «from public» er linjen som fjerner den implisitte EXECUTE; «anon,
  authenticated» tas med fordi eldre filer har gitt dem eksplisitt execute, som overlever
  revoke fra PUBLIC; service_role må grantes eksplisitt — den får ingenting av default.
  RLS er IKKE nok alene: RLS filtrerer rader for select/insert/update/delete, men TRUNCATE
  omgår RLS (og anon HAR truncate på hver ny tabell til den revokes), sekvenser og funksjoner
  har ingen RLS, og service_role omgår RLS helt — grant/revoke er det eneste vernet der.
  093B strammet 001–093-bildet for tabeller men kjenner ikke tabeller laget etter seg; 099
  satte alle 65 SECURITY DEFINER-funksjoner eksplisitt. Historikk: 3. sep 102 tabell-avvik og
  28 anon-kallbare funksjoner i prod (40 fra filene alene — 12 var strammet for hånd);
  4. sep 100 (dokument_type) laget uten revoke. Kontrollen måler has_table_privilege,
  has_sequence_privilege og has_function_privilege for anon i en base bygget med prods
  målte postgres-sett (retest-riggens stub_auth.sql, rettet 4. sep) — aldri fila alene.
- Tillegg (dokumentasjon av det udokumenterte): postgres-settet i pg_default_acl er strammet
  i prod (anon/authenticated/service_role = Dxtm på tabeller, ingenting på S og f). Det står
  i ingen fil. Sjekk det (spørring i claude_ANON-DEFAULT-PRIVILEGES-4sep.md §3) etter enhver
  ny instans, gjenoppretting eller Supabase-oppgradering — og før en gjenoppbygging tas som
  bevis.
- Ellevte udokumenterte produksjonsendring (funnet 4. sep, i rekka fra 3. sep): `Dxtm` på
  postgres-settet i `pg_default_acl` er IKKE Supabase-standard. Noen har grantet og deretter
  revoket select/insert/update/delete i denne basen. Det kan vises fordi `pg_default_acl` har
  rader for `postgres | S` og `postgres | f` som bare inneholder eierens egen standard
  (`postgres=rwU` hhv. `postgres=X`) — Postgres lager ikke slike rader for den innebygde
  standarden; en slik rad oppstår bare når noen har kjørt `alter default privileges` og siden
  revoket det igjen. Hvem og når er ukjent, og det står i ingen fil.
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
- ALDRI kjør en migrasjon i prod uten at HELE kjeden den forutsetter alt står i prod — og
  bevis at «kontrollert = i prod» (md5 av funksjonsdefinisjonen) før du bygger videre. 3. sep:
  TU-skjermingen ble svekket fordi kjernen (073) ble kjørt i prod mens propagatoren den
  forutsetter (072) var kontrollert og godkjent, men aldri kjørt. Halve kjeden gikk live; den
  kombinasjonen fikk ALDRI PASS, og 114 kjønnsceller ble entydig bestembare på 150 runder.
  Rettet med 093C. En godkjent fil er ikke nok — det som fikk PASS må bevises byte-likt det som
  faktisk står i prod.
- INGEN baseendring uten et migrasjonsnummer. Alt som kjøres i basen skal være en nummerert,
  sporet migrasjon — aldri løs SQL i editoren. 3. sep ble ti endringer funnet i prod som ingen
  fil kjente: migr 088 (kjørt, aldri lagret som fil), «Aktive pauser»→«Move it» (løs SQL),
  konfidens+telefon på kulturkort_partnere, skoler_status_check 6→7 verdier, to
  profiles-policyer som hadde driftet, tu_kjonn_pinned (personvernhullet over), og 102
  rettighetsavvik der ~70 tabeller hadde anon-tilgang prod hadde stengt. Hver ville gjort en
  gjenoppbygging fra bunnen feil — og noen ville gjort den farlig (åpen der prod var lukket).
- Et tomt resultat er IKKE bevis på feil — det kan bety at målingen er feil satt opp. Spør alltid
  først: «ville denne målingen vist noe, hvis alt var i orden?». 3. sep ga tre falske alarmer:
  «Move It»-filteret så dødt ut, men frontend og base matchet allerede — migrasjonen ville
  ØDELAGT det, ikke rettet det; TU-loggingen så tom ut fordi ingen hadde åpnet rapporten siden
  funksjonen ble bygget; søkeloggingen fordi spørringen ble kjørt før innsettingen rakk å skje.
  En påstand om at noe er galt krever samme bevis som en påstand om at det virker.

## Standard arbeidsflyt for endringer
1. Kjør SQL-migrasjon i Supabase SQL editor (hvis databaseendring)
2. Endre kode (Claude Code bygger, stopper alltid før push så Kjartan ser diffen)
3. git add <fil> && git commit -m "..." && git push (på Kjartans klarsignal)
4. Vent 1-2 min på Vercel, test med Cmd+Shift+R

## Arbeidsform (fra 4. august 2026)

### HVORDAN FILER HAVNER I CLAUDE-PROSJEKTET (rettet 31. aug 2026 — INGEN auto-synk)
Det finnes INGEN automatisk synk/speiling mellom Mac-mappa ~/trivselsleder-ny/ og claude.ai-prosjektet. To helt separate lagre. (Tidligere antakelse om auto-speiling var FEIL — den kostet mange timer.) Derfor:
- Cowork gjør ALLTID BEGGE steg når noe skal være trygt for neste økt: (1) skriv fila til ~/trivselsleder-ny/ via device-broen, OG (2) kjør eksplisitt `project_write` på samme fil.
- Cowork BEVISER steg 1 med `ls ~/trivselsleder-ny/` (device_list_dir) som viser fila — aldri bare påstå det.
- project_write tar KUN tekst (.md/.txt/.sql). Binærfiler (docx/pdf) kan IKKE legges i prosjektet med project_write — Kjartan drar dem inn manuelt. Derfor lages det for planer/dossier ALLTID en .md-tekstversjon i tillegg, som project_write tar.
- Bortsett fra binær docx/pdf laster Kjartan ALDRI opp filer manuelt — tekst havner i prosjektet via project_write, ikke ved opplasting.
- claude_-filer, STATUS.md og FREMDRIFTSPLAN-v* er i .gitignore (havner aldri på GitHub) — project_write er veien inn i prosjektet.

- Chat (Cowork) tar beslutninger, rekkefølge, SQL og formulerer oppdrag til Claude Code.
  Claude Code programmerer, stopper før push. Kjartan kjører SQL i Supabase selv og gir
  klarsignal til push. Nødbremsen (motor_aktiv i innstillinger) styrer all ekte utsending.
- Cowork-chatten har direkte tilgang til prosjektmappa: skriver STATUS.md og RETTELISTE.md
  rett til disk, leser koden selv. Ingen store cat-blokker lenger.
- Ingenting erklæres ferdig uten bevis — helst en ekte e-post eller et skjermbilde.
- STATUS.md = hvor vi er akkurat nå. RETTELISTE.md = alle funn med kilde og bevisstatus.
  Begge holdes utenfor git-commits.

## FAST REGEL: dokumenter fra chat til prosjektkunnskapen (fra 17. aug 2026)
- Notater, planer og analyser fra chat leveres ALLTID som cat-blokk som Kjartan
  limer inn i terminalen. Filnavn: claude_NAVN.md, i ROTEN av ~/trivselsleder-ny/
  (aldri undermapper). Heredoc-terminator er alltid SLUTT.
- Filene havner i prosjektet KUN når Cowork kjører project_write på dem — INGEN auto-synk.
  Cowork gjør begge steg (skriv til ~/trivselsleder-ny/ + project_write) og beviser Mac-steget
  med ls. Tekstfiler krever ikke manuell opplasting; kun binær docx/pdf dras inn manuelt av Kjartan.
- claude_-filer holdes UTENFOR git (kun kode og migrasjoner committes).
- KUN EN Cowork/Code-okt mot ~/trivselsleder-ny om gangen (ellers git-laasefeil).

## FAST REGEL: innspill fra ansatte/kunder — bygg nå eller bare fang (fra 30. aug 2026)
- Når Kjartan limer inn et innspill (mail/tilbakemelding/idé), spør ALLTID om det skal
  BYGGES NÅ eller BARE FANGES.
- Skal det bare fanges: gjør det STRAKS til en claude_IDEBANK-*-fil under riktig tema
  (eller føy til en eksisterende tematisk fil) — aldri la det bli liggende kun i chatten.
  Da har senere prosjektgjennomganger noe å finne.

## ARBEIDSDELING CHAT vs COWORK (presisering 18. aug 2026)
- Cowork = device-broen: skriver filer til ~/trivselsleder-ny, kjører kode/SQL,
  leser STATUS.md og CLAUDE.md selv. All LAGRING og BYGGING skjer her.
- Prosjektchat (claude.ai) = planlegging/beslutning/tekst. Har IKKE device-broen.
  Skal ALDRI gi Kjartan cat-blokker, filflytting, filkort eller manuell
  opplasting for å lagre notater. Er noe klart til lagring: gi ferdig tekst
  Kjartan limer inn i Cowork.
- Kjartan er ikke utvikler. Ved tvil om arbeidsflyt: les denne fila FØR du
  foreslår en metode — ikke finn på noe nytt.
