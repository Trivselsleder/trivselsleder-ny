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

## ØKTER OG ARBEIDSFORM (fra 17. september 2026)

### De fem øktene
- **Hovedchat (claude.ai, prosjektet «Ny hjemmeside trivselsleder.no»)** — hodet. Planlegger,
  tar tekniske avgjørelser, fordeler arbeidet og skriver oppdrag til de andre øktene. Har IKKE
  tilgang til Mac-en. Skal aldri gi Kjartan cat-blokker, filflytting eller manuell opplasting
  for å lagre noe — er noe klart til lagring, gis ferdig tekst som limes i Cowork.
- **Cowork A, B og flere (Claude Desktop)** — analyse, filspeiling, SQL, lagring. Skriver til
  Mac OG prosjektet. Bokser limes i COWORK, aldri i en vanlig claude.ai-chat. Ny oppgave = tom
  økt; hovedchatten sier ALLTID om mappa må kobles til.
- **Claude Code** — bygger. Pusher aldri, rører aldri prod. Avslutter ALLTID med
  «=== TIL CLAUDE ===» med filnavn, md5 og mtime for hver leverte fil.
- **Fable** — uavhengig kontroll. Fersk økt per kontrollsak. Skriver rapporten til PROSJEKTET
  med project_write og sier eksplisitt fra i chatten når det er gjort. Rapporten limes ALDRI
  inn i chat for manuell kopiering — Kjartan skal ikke være mellomledd mellom økter.
- **Claude Design** — tegner. Min side og ikoner.

### Skriving og lesing i ~/trivselsleder-ny/
Kun ÉN økt SKRIVER om gangen. LESING kan skje parallelt, ubegrenset antall økter. Lesende git
skal bruke `git --no-optional-locks`.

### Slik gis instrukser til Kjartan
- ÉN boks per melding, som limes inn med én gang. Aldri «denne bruker du senere».
- Over hver boks: hvilken økt · lim inn NÅ eller vent · behold historikk eller clear.
- Alt Kjartan trenger å vite står OVER eller INNE I boksen. Aldri etter.
- Merking: → TERMINALEN / → COWORK / → SUPABASE / → NETTLESER / → CODE. Si alltid eksplisitt
  hva som skjer med resultatet.
- SQL: alltid `cat <fil> | pbcopy`, så Cmd+A og Cmd+V i editoren. Alltid klikkbar direktelenke
  merket **(PROD)** eller **(ØVINGSKOPI)**.
- Spørsmål til Kjartan kommer som ÉN linje han kan kopiere og endre, med anbefalt svar ferdig
  utfylt. Aldri valgbokser eller knapper med svaralternativer.
- Kjartan skal ha øktoversikt fortløpende — hvilken Cowork, hvilken Fable, hva som ligger i
  Code. Han skal ikke måtte minne om at en økt er ute på oppdrag.
- Skal han finne en mappe: minn om Cmd+Shift+G i Finder, og gi hele stien (særlig skjulte
  mapper som starter med _).

### Beslutningsgrensen
Claude tar tekniske avgjørelser selv. Men beslutninger om hva systemet GJØR, hva vi KAN SE og
hva som FJERNES er Kjartans — uansett hvor teknisk innpakningen er. Et nøytralt framlegg fra
Claude er i praksis en anbefaling: si hva du mener og hvorfor.

### Arbeidsdisiplin
- Søk i prosjektfilene FØR du spør Kjartan. Avgjorte spørsmål gjenåpnes ikke.
- Les kolonnenavn i basen før du skriver SQL — aldri gjett.
- Byggeren kontrollerer aldri eget arbeid.
- Pushet ≠ bygget ≠ kjørt ≠ verifisert. Etter push: sjekk Vercel Deployments = Ready. Etter
  hver migrasjon: egen lesespørring.
- En kvittering skrevet inne i transaksjonen er ikke bevis.

### Risiko og personvern
Utenom Trivselsundersøkelsen og barnenavn er innholdet ikke sensitivt. Personvern skal beskytte
barn og lærere, ikke gjøre systemet ubrukelig for dem som driver det. WCAG 2.1 AA er lovpålagt
for skolesektoren — minn Kjartan proaktivt om universell utforming.

## LÅSTE BESLUTNINGER — ALDRI TA OPP IGJEN (Kjartan har måttet gjenta disse mange ganger)
- **Trivselsboten kommer ETTER lansering.** Ikke planlegg, anbefal eller spør om den som del av lanseringen.
- **Feide er på plass.** Trivselsleder AS har allerede Feide-avtale, og mange skoler bruker Feide i dag.
  Avtalen flyttes til ny plattform — ingen ny søknad hos Sikt. Innlogging på ny side: skolene velger
  selv **Feide** eller **e-post + passord** (som brukeren lager selv). Eneste gjenstående er teknisk
  omlegging av Feide-tjenesten til nytt domene ved domeneflytten.
- Når en eldre STATUS-blokk, fremdriftsplan eller notat sier noe annet, er det UTGÅTT. Nyeste beslutning gjelder.

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
- **IMPORT-MARKØREN MÅ ALDRI FINNES I PROD** (fra Fables rev 3-kontroll, 6. sep 2026).
  Importsperren avgjør om en base er øvingskopien ved å lese `public.import_kopi_identitet`.
  En full gjenoppretting av øvingskopien INN i prod ville tatt markøren med seg — og da ville
  sperren tro at prod er øvingskopien. Etter ENHVER restore, gjenoppretting eller kloning:
  verifiser at `import_kopi_identitet` er FRAVÆRENDE i prod (`zpirjbrcbeubwpmtncxx`).

## Lærdommer (snublesteiner vi har løst)
- **«KOPIER FRA MIGRASJON N» ER UTRYGT** (fra migrasjon 104, 6. sep 2026). Sjekk ALLTID om
  objektet er skrevet om av en SENERE migrasjon før du kopierer en definisjon derfra. 104
  kopierte `fase3_logg_endring()` fra migrasjon 027, men 032 hadde i mellomtiden skrevet den
  om med `set search_path = public, pg_temp` — en SECURITY DEFINER-herding. En
  `create or replace` uten den klausulen fjerner herdingen STILLE fra funksjonen, ingen
  feilmelding. Migrasjonsporten kan ikke fange dette: den sammenligner to friske bygg som
  BEGGE er etter endringen, så begge mangler herdingen likt — ingen forskjell å oppdage.
  Kontrollen fanget det ved å måle `proconfig` FØR og ETTER migrasjonen mot en EKTE base (ikke
  bare to bygg mot hverandre). Regel: når du kopierer en funksjons-/objektdefinisjon fra en
  eldre migrasjon, sjekk om noen migrasjon MELLOM den og i dag har endret samme objekt — og
  hvis den kjørende basen allerede har objektet, mål dens EKTE definisjon (`pg_get_functiondef`
  / `proconfig` / tilsvarende) og bygg videre på DEN, ikke på filens historiske tekst.
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
- Migrasjonsnumre tildeles når fila BYGGES, aldri på forhånd. Et reservert nummer som ikke
  finnes som fil er et hull, og migrasjonskjøreren stopper på hull — det blokkerer
  gjenoppbygging for ALT videre arbeid, ikke bare den ene filen. Oppdaget 4. sep: 102 var
  reservert til læreplankode→fag mens slettemigrasjonen fikk 103; porten meldte FEILET: hull i
  nummerrekken: 102. Fanget av porten før kjøring i prod.
- Et tomt resultat er IKKE bevis på feil — det kan bety at målingen er feil satt opp. Spør alltid
  først: «ville denne målingen vist noe, hvis alt var i orden?». 3. sep ga tre falske alarmer:
  «Move It»-filteret så dødt ut, men frontend og base matchet allerede — migrasjonen ville
  ØDELAGT det, ikke rettet det; TU-loggingen så tom ut fordi ingen hadde åpnet rapporten siden
  funksjonen ble bygget; søkeloggingen fordi spørringen ble kjørt før innsettingen rakk å skje.
  En påstand om at noe er galt krever samme bevis som en påstand om at det virker.
- STOPP OG SPØR HVA MÅLET ER. Før neste byggeoppdrag: hva prøver vi å oppnå, og hvor strengt
  må det være for DETTE formålet? Kommer samme feilklasse tilbake to ganger, er designet
  feil — bytt tilnærming, ikke lapp hullet. 5. sep: importsperren tok fire runder fordi
  kontrollen ble bedt om å oppfinne nye angrep i stedet for å verifisere en spesifisert
  egenskap.
- RISIKOPROFILEN ER LAV UTENOM TRIVSELSUNDERSØKELSEN. Leker, TL-hjul, periodeplaner og
  lærerkontaktinfo er ikke sensitive — det siste ligger allerede åpent på kommunenes sider.
  TU er det eneste som krever streng behandling, og den er ferdig gjennomgått med jurist.
  Alt annet måles på om det VIRKER: få bugs, tåler mange brukere, henger riktig sammen. Ikke
  behandle en sikkerhetssele som om den skal stoppe en angriper.
- EN SUKSESSMELDING FRA SKRIVING ER IKKE BEVIS. Les tilbake og sjekk størrelse eller md5.
  5. sep: to skriveforsøk meldte suksess mens fila på Mac fortsatt var den gamle. Retry med
  force løste det.
- **SPEILING SKANNER PÅ MTIME, ALDRI PÅ BYGGERENS OPPRAMSING** (utvidet 8. september 2026).
  Mønsteret har nå gjentatt seg SEKS ganger. Tidligere (5. sep): test-vakter.mjs, en
  fagmapping-CSV, og et avvik i filtellingen. Deretter: test-107-r1.mjs. 8. sep, sjette
  gang: speilingen fant `_kontroll-import/test-e1.mjs`, som Code ikke hadde nevnt. Det er
  ikke lenger tilfeldig — en bygger som har jobbet lenge glemmer systematisk sine egne
  hjelpefiler. Speilingen skal ALLTID melde eksplisitt begge veier: fant den mer enn
  byggeren nevnte, eller var bildet rent.
- KONTROLLRAPPORTER FOR SKRIVELAGET fjernes fra prosjektkunnskapen når passet er BESTÅTT og
  det ikke står åpne funn. Dommen står i STATUS, fila står på Mac-en. Samme mønster som
  migrasjonsregelen, men med annen utløser.

- **PROSJEKTKAPASITET SJEKKES FØR EN ØKT BEGYNNER Å SKRIVE** (fra 7. sep 2026) — ikke når
  `project_write` avvises. 7. sep sto prosjektet på ~97,5 % og STATUS.md kunne ikke speiles;
  Mac og prosjekt sto ett hakk fra hverandre — nøyaktig det lagringsregelen finnes for å
  hindre. Samme sak 4. sep på 95 %. FAST TERSKEL: over **90 %** ryddes det FØR nytt arbeid
  starter, etter de eksisterende reglene (kontroll- og leveransenotater for migrasjoner
  kjørt og verifisert i prod; kontrollrapporter for skrivelag-pass som er BESTÅTT uten åpne
  funn). Fila blir ALLTID liggende på Mac-en — kun prosjekt-kopien fjernes. Rydding skal
  ALDRI skje under tidspress midt i et oppdrag.

- **TO-STEGSREGELEN BLE IKKE FULGT FØR 26. AUGUST** (fra 7. sep 2026). 7. sep ble 15 filer
  funnet som fantes KUN i claude.ai-prosjektet, uten kopi på Mac — blant dem kjøringsbevis
  for Trivselsundersøkelsen (TU-byggetrinn1-KJORT-16aug, TU-byggetrinn2-045-KJORT-17aug).
  Prosjektkunnskapen er ikke sikkerhetskopiert noe sted, så prosjektet var eneste kopi. Alle
  15 er nå kopiert ned til Mac med md5-bevis begge veier. Følgen for ryddereglene: FØR en
  fil slettes fra prosjektet skal det være BEVIST at den finnes på Mac (ls + bytestørrelse)
  — ikke antatt fordi den «burde» være der etter to-stegsregelen. Regelen gjaldt ikke i
  august, og filer fra den perioden kan mangle. Cowork skal liste slike som usikre i stedet
  for å slette dem.

- **EN FABLE-ØKT KAN SKRIVE TIL PROSJEKTET, MEN IKKE TIL MAC** (fra 8. september 2026).
  To-stegsregelen er formulert som «Cowork gjør begge steg», og har aldri sagt noe om hva
  som skjer når en ANNEN økttype lagrer noe. Fable-økter har `project_write`, men ingen
  tilgang til Mac-en. Skjedde to ganger 8. sep: `claude_KONTROLL-fable-D2-REKONTROLL-8sep.md`
  og `claude_KARTLEGGING-search-path-8sep.md` fantes kun i prosjektet. Prosjektkunnskapen er
  ikke sikkerhetskopiert noe sted, så prosjektet var eneste kopi — samme klasse som de 15
  filene funnet 7. sep. REGELEN: enhver fil en økt lagrer der den bare når ett av de to
  lagrene, må en Cowork-økt hente ned til det andre SAMME DAG. Fable-oppdrag skal be om at rapporten skrives til PROSJEKTET med project_write, og at
  økta sier eksplisitt fra i chatten når den har gjort det. Rapporten skal ALDRI limes inn
  i chatten for manuell kopiering — Kjartan skal ikke være mellomledd mellom økter.
  (Rettet 9. september 2026.)
  FAST SJEKK VED DAGENS SLUTT: list alt i prosjektet med dagens dato og kryss mot Mac.

- **SPEILING GJELDER KUN NOTATER** (fra 10. september 2026). Speiling mellom Mac og prosjekt
  gjelder KUN claude_*.md, STATUS.md og CLAUDE.md. Kodefiler heter noe annet i prosjektet
  (claude_kode_…) enn på Mac (src/…, supabase/…). Kode har git som sikkerhetskopi og speiles
  aldri. Ingen underagenter i speilingsoppdrag; sjekk én navngitt fil om gangen.

- **PUSHET ≠ BYGGET** (fra 10. september 2026). Vercel fikk ikke beskjed om commit 1b04cb9 —
  ingen status på GitHub, ikke i Deployments. Etter HVER push: sjekk at committen står som
  Ready i Vercel Deployments før testing i nettleser. Fiks: git commit --allow-empty + push.

- **KVITTERING INNE I EN TRANSAKSJON BEVISER IKKE AT NOE ER LAGRET** (fra 10. september 2026).
  Prøvekjøringen av 110 med rollback viste «261 koblet» i kvitteringen, men 0 i basen. Bevis
  ALLTID med en egen lesespørring etter kjøring.

- **SJEKK PROSJEKTNAVNET I SUPABASE** (fra 10. september 2026). Prod («trivselsleder») og
  øvingskopien («trivselsleder-ovingskopi») har samme importerte innhold og er lette å
  forveksle i hver sin fane. En spørring i feil fane ga et forvirrende resultat 10. sep.

- **BASH: UTROPSTEGN I DOBLE ANFØRSELSTEGN** (fra 10. september 2026). «!» tolkes som
  historikk-kommando («event not found»), og ingenting kjøres. Bruk ':(exclude)src' i stedet
  for ':!src' i git-kommandoer.

- **BESKRIVELSEN ER HTML** (fra 10. september 2026). ressurs_innhold.beskrivelse vises KUN via
  src/lib/beskrivelse.js (hviteliste av ti tagger) og redigeres KUN via BeskrivelseEditor
  (TipTap, låst skjema). Aldri dangerouslySetInnerHTML. Beskrivelsen sendes kun ved faktisk
  endring.

- **MAPPER I SUPABASE STORAGE ER BARE PREFIKS** (fra 10. september 2026). En «mappe» finnes kun så lenge
  minst én fil ligger i den. redaksjon/ forsvant da testbildet ble slettet. Et oppdrag som sier «mappa
  finnes» må si «opprett om den mangler».

- **RLS-VARSEL I SQL-EDITOREN KAN VÆRE FALSK ALARM** (fra 10. september 2026). Supabase varsler om
  tabeller uten RLS også når fila ikke lager tabeller (trolig select … into i DO-blokker). Sjekk fila
  med grep etter create table før valg. Ingen tabell → «Run without RLS». Aldri «Run and enable RLS» på
  en fil som ikke lager tabeller.

- **ET DERIVAT KAN IKKE AVVISES PÅ BYTESTØRRELSE** (fra 10. september 2026). Et nedskalert bilde har
  alltid annen størrelse enn originalen. Kun visuell kontroll avgjør om det er samme motiv. Og et søk som
  gir null treff beviser ingenting før det er kalibrert mot filer man vet finnes.

- **BYGGERENS TESTDATA MÅ LIGNE PROD, IKKE MIGRASJONEN** (fra 11. september 2026). Migrasjon 116 rev 1 var grønn fordi fixturen hadde nid_-prefiks i storage_sti – slik migrasjonen antok. I prod er storage_sti full URL som ender på /public/wysiwyg-media/<originalnavn>, og migrasjonen ville truffet 0 rader. Testdata skal bygges fra importens egen logikk (regler.mjs/storage.mjs), og kontrolløren bygger egne testdata.

- **LESENDE GIT FRA COWORK-VM KAN ETTERLATE .git/index.lock** (fra 11. september 2026). VM-en får ikke slette lock-fila, og neste commit blokkeres. Bruk «git --no-optional-locks status/diff/show» fra Cowork- og Fable-økter.

- **COWORK-BOKSER LIMES I COWORK, IKKE I VANLIG claude.ai-CHAT** (fra 11. september 2026). En vanlig prosjektchat har ikke Mac-tilgang. Står det «No folders are connected» i en ny Cowork-oppgave: koble ~/trivselsleder-ny via «Add folder», eller prøv igjen (kan være midlertidig).

- **KVITTERINGER SOM TELLER PÅ BRUKER-UID BLIR KUMULATIVE** (fra 11. september 2026). En kvitteringskolonne som telte lukkede kø-rader med Kjartans UID tok også med tidligere migrasjoners lukkinger. Avgrens med lost_at = now() – now() er konstant innen transaksjonen.

- **«KLAR» FRA ET EKSTERNT API ER IKKE «SPILLBAR»** (fra 11. september 2026). Videoskjemaet sa «klar» mens Bunny fortsatt behandlet videoen i over 5 minutter. For Bunny Stream er kun status 4 ferdig.

- **TO LEKER KAN HA SAMME TITTEL** (fra 11. september 2026). «Stein, saks, papir-runden» finnes som nid 13661 og 20072. Identifiser alltid på kilde_nid før en test som endrer data.

- **PRODS FUNKSJONSKROPPER AVVIKER FRA FILENE** (fra 12. september 2026). 15 av 82 funksjoner i prod har en ANNEN kropp enn migrasjonsfilene sier. secdef og config (inkl. search_path) er identiske — forskjellen sitter i selve kroppsteksten. De 15: anonymiser_bruk_hendelse (088), flytt_skole_til_kurs (061), hent_sendelogg_for_kurs (055), meld_paa_webinar (039), og elleve TU-funksjoner: tu_auto_lukk_forfalne, tu_folg_med, tu_lukk_runde_motor (068), tu_er_ansatt, tu_har_tilgang_skole (041), tu_lever_svar (046), tu_opprett_koder, tu_skjerm_fordeling, tu_skjermet_runde, tu_slett_utgatte_raasvar, tu_statistikk (045). BEVIS: anonymiser_brukslogg og anonymiser_bruk_hendelse er definert i SAMME fil (088), men prod matcher bare den første — en feilbygget lokal mal ville gitt avvik på begge. KONSEKVENS: basen kan IKKE gjenoppbygges fra filene og bli lik prod; det rammer generalprøven — en testkopi vil ha gamle versjoner av disse 15. REGEL: før noen skriver create or replace på en av de 15, MÅ prods faktiske kropp leses ut FØRST — ellers slettes en tidligere håndretting stille (samme klasse som 104-fellen). Status: prods råtekst for alle 15 er hentet ut i _kontroll-import/fnrydding/prod-fn-kropper-12sep.csv (md5 a2e8c87d1eb283e33559c74bd59f3de7, 20 386 bytes). Rettejobb planlagt. Kilde: claude_FN-AVVIK-KARTLAGT-12sep.md.

- **DEFAULT PRIVILEGES: PROD HAR ET ÅPENT SETT** (fra 12. september 2026). Målt i prod 12. sep (skjema-detaljer.sql, kategori defacl, filtrert på defaclrole = 'postgres'): prod har SEKS rader, en lokal mal TRE. De tre lokale er prods restriktive sett: r = postgres arwdDxtm + anon/authenticated/service_role Dxtm · f = postgres X · S = postgres rwU. De tre EKSTRA i prod er et ÅPENT sett: r = anon/authenticated/service_role arwdDxtm (altså select/insert/update/delete) · f = anon/authenticated/service_role X · S = anon/authenticated/service_role rwU. Gjelder KUN framtidige objekter, ikke eksisterende — målingen 4. sep viste at prods faktiske rettigheter er rene. KONSEKVENS: en ny tabell laget på feil sted kan arve åpne anon-rettigheter uten at noen ser det; forklarer også hvorfor gjenoppbyggings-riggen målte anon ALL på sekvenser 4. sep mens prod sa null. REGEL: enhver migrasjon som lager en ny tabell skal eksplisitt sette rettighetene selv (revoke all … from anon), ikke stole på at default privileges er stramme.

- **ET NULLTREFF PÅ FEIL PREFIKS** (fra 12. september 2026). Seks kø-saker (S65–S70) ble avskrevet som «ingen treff» fordi søket brukte REL og SAM, mens Udirs koder er RLE og SAF. 41 KRLE-mål og 62 samfunnsfag-mål finnes. Kalibrering mot noe man VET finnes er obligatorisk før et nulltreff kan brukes som konklusjon (samme prinsipp som «ET DERIVAT KAN IKKE AVVISES PÅ BYTESTØRRELSE», 10. sep).

- **SED PÅ EN KOMMENTAR ER IKKE SED PÅ KODEN** (fra 12. september 2026). scripts/rigg/skjema-detaljer.sql har ordet BYTT_KATEGORI i en KOMMENTAR, mens det som faktisk styrer spørringen er linja «where kategori = 'pol'». En erstatning på plassholderordet traff ingenting, og spørringen kjørte med feil kategori uten feilmelding. REGEL: les hva som faktisk styrer en fil før du automatiserer en endring i den.

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
- Kun ÉN økt SKRIVER i ~/trivselsleder-ny/ om gangen (ellers git-låsefeil). LESING kan skje
  parallelt, ubegrenset antall økter — se «ØKTER OG ARBEIDSFORM».

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
