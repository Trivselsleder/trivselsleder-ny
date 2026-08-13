# Fremdriftsplan v35 — Trivselsleder AS

**10. august 2026 · Bygget på v34 (7. august) — beslutninger til og med 9. august foldet inn**

## 0. Om dette dokumentet

**Hva v35 er.** v34 med alle beslutninger tatt til og med 9. august foldet
inn: de fire opptalte tallene skrevet inn konsekvent, de avklarte småtingene,
sikkerhetsjobben fullført (kap. 9.1), og en ny **Vedlegg D — Ferdig og
levert** der fullførte punkter er flyttet så Del 2 bare viser det som
gjenstår. Ingen omstrukturering ellers — samme fire deler som v34.

**Hva v34 var.** Samme innhold som v33 — ny struktur. v33 samlet alt som noen
gang har stått i fremdriftsplanene, men informasjonen sto spredt: samme tema
kunne stå i fem kapitler, og historikk sto blandet med arbeid som gjenstår.
v34 rydder dette etter fire prinsipper, besluttet av Kjartan 7. august:

1. **Hvert tema står fullt ut ETT sted.** Andre kapitler peker dit med én
   linje. Eksempel: alt om Ramsalt-leveransen står nå i kapittel 10, alt om
   video og Bunny.net samme sted — ikke fordelt på elleve kapitler som før.
2. **Planen følger arbeidsrekkefølgen.** Del 2 leses fra kapittel 7 til 14 i
   den rekkefølgen jobben skal gjøres frem til lansering. Del 3 er etter
   lansering, i prioritert rekkefølge — svensk side først.
3. **Teksten sier det som er sant NÅ.** v33 bevarte historikk som merkede
   blokker oppå eldre tekst; det gjorde at en tabell kunne si «Gjenstår» med
   en blokk over som sa «ferdig». I v34 står gjeldende status rett i teksten.
   Historikken er ikke mistet: den ligger i vedlegg B — og hele v33 beholdes
   uendret som arkiv ved siden av denne planen.
4. **Ingenting er fjernet uten beslutning.** Alt innhold står enten i
   Del 1–3, i vedleggene, eller er ført i endringsloggen (vedlegg A) som
   bevisst strøket med Kjartans ja.
5. **Ferdige punkter flyttes til Vedlegg D.** Når noe er gjort, merkes det
   tydelig og flyttes bakerst til «Ferdig og levert», så den aktive planen
   (Del 2) bare viser det som faktisk gjenstår. Ingenting slettes — det
   flyttes. (Ny regel fra v35, besluttet av Kjartan 9. august.)

**Dokumentets deler:**

| Del | Innhold | Slik brukes den |
|---|---|---|
| Del 1 (kap. 1–6) | Grunnlag: hva prosjektet er, regler, roller, hva som er ferdig, åpne beslutninger | Leses ved behov — endres sjelden |
| Del 2 (kap. 7–14) | Veien til lansering, i arbeidsrekkefølge | Selve arbeidsplanen — her jobber vi |
| Del 3 (kap. 15–24) | Etter lansering, i prioritert rekkefølge | Parkeringsplass med rekkefølge — ingenting her skal bekymre før lansering |
| Del 4 (vedlegg A–D) | Endringslogg, historikk, kunnskapsgrunnlag, ferdig-logg | Oppslagsverk — ingenting her krever handling |

Formen — farger, typografi, topptekst — følger v31-malen, som alltid.
Eldre endringslogger (v24 til v33) ligger i v33 og gjentas ikke her. Vedlegg
D samler det som er fullført og levert.

---

# DEL 1 — GRUNNLAG

*Det som sjelden endres: hva prosjektet er, reglene vi jobber etter, hvem som
gjør hva, hva som allerede er ferdig og bevist, og hvilke beslutninger som
fortsatt står åpne.*

---

## 1. Hva prosjektet er

Mål. Bygge ett samlet, moderne nettsted («trivselsleder-ny») som erstatter en utdatert Drupal 7løsning
og dagens fragmenterte verktøy — Excel, QuestBack og Google Forms. Siden skal være
fullstendig selvdriftet av Trivselsleder AS uten avhengighet til ekstern leverandør, og all kode eies av
Trivselsleder AS via GitHub.
Selskapet. Trivselsleder AS tilbyr fysiske aktivitetskurs («lekekurs») til skoler. Det avholdes ca. 150
lekekurs i året, og ca. 35 000 trivselsledere kurses årlig. Selskapet har ca. 640 aktive skoler.
Virksomheten finnes både i Norge (trivselsleder.no) og Sverige (trivselledare.se). Kjartan Eide og
Tommy eier 50/50. Selskapet er i en salgsprosess; siden bygges uavhengig av dette, og en selveid
plattform med lavere driftskostnad styrker selskapets verdi ved et eventuelt salg.
Det store bildet. Dagens drift er manuell og tidkrevende: samme informasjon finnes flere steder
samtidig og må flyttes manuelt. Et kurs lever i dag fire steder (master-kursoversikt med 17 faner,
QuestBack-liste på 3200 rader, TL-kursinformasjon med 15 fylkesfaner, og selve QuestBack).
Grunngrepet er at nettsiden blir navet: hver ting finnes ÉN gang i databasen, og endringer slår
automatisk gjennom alle steder.
Strategisk retning: bygg land-agnostisk fra første rad. Plattformen bygges som en to-lagsmodell:
ett universelt lag (innholdsmodell, verktøy, søk, AI — bygges én gang) og ett land-lag (trinn,
læreplan, geografi, valuta, utstyrsbutikk — konfigurasjon, ikke kode). Flerspråklig og multi-tenant fra
første rad gjør at både digital internasjonal tjeneste og en eventuell franchise-modell kan åpnes
senere uten ombygging. Full beskrivelse i kapittel 22.5.

### 1.1 Nøkkelpersoner

| Person | Rolle |
|---|---|
| Kjartan Eide | Daglig leder og medeier (50%). Hovedbruker. Superadmin. |
| Tommy | Medeier (50%). Superadmin-tilgang til Ledelse-siden. Deler CRM-avløservisjonen. |
| Camilla Veum Bottenvik | Kortutdeling og fakturering (Tripletex). Egen fane «Fra kurspåmelding». |
| Eivind | Salg/CRM. Hovedbruker av HubSpot. Varsles ved kjøpsinteresse. |
| Marielle Haarvik | Fagansvarlig/kurskoordinator, Rogaland. Aktuell pilotbruker. |
| Kari Snartemo | RA Vestland & Møre og Romsdal. Filkunnskap/backup; rydder dagens nettside. |
| Ylva Nesset | RA. Innspill om flere mottakere per skole — løst, se kapittel 5.8. |
| Jon Simonsen (Ramsalt) | Ekstern utvikler. Drupal 7-eksport av materiell. |
| Anneli / Malin | Svensk team. Verifiserer rektorliste (Sverige); aktive i HubSpot-salgspipeline. |
| Vegard / Karoline | Bidro til terminologi-beslutningen om lekebeskrivelser (kapittel 10.3). |

### 1.2 Merkeprofil

Merkefarger: Oransje #F47920 · Magenta #D6006E. Teal (#106C75) er utgått og skal ikke brukes.
Fonter i trykte hefter: Marvin (overskrifter), Avenir (brødtekst).

### 1.3 60-minuttersmålet — den strategiske rammen

Reposisjoner Trivselsleder fra «friminuttprogram» til «skolens verktøy for
hele det daglige 60-minutters fysisk aktivitet-målet». Trivselsleder dekker i
realiteten allerede friminutt, FYSAK, kroppsøving og aktiv læring i timene —
men denne bredden drukner i dagens kommunikasjon.

Tre horisonter, med hver sin plass i planen:

- **(a) Fortellingen og rammen** — inn i design-fasen og Evidence-siden NÅ
  (kun tekst og struktur, ingen ny kode). Kurs og bibliotek vises som ETT
  program, én reise — reisen er skoledagen, ikke bare friminuttet.
  Se kapittel 13.
- **(b) «Egnet for»-merking av leker** — inn i Fase 3-datamodellen. Billig å
  bygge når metadata uansett skal hentes ut av fritekst: et felt for
  friminutt/kroppsøving/SFO/aktiv læring/FYSAK per lek. Da kan en
  kroppsøvingslærer filtrere på «kroppsøving, 5. trinn, ute», og SFO kan få
  egen inngang. Se kapittel 10.
- **(c) Lærertimeplan med ledelsesrapportering** — stor modul, bygges etter
  lansering. Hver lærer får egen innlogging og timeplan og dokumenterer aktiv
  læring til ledelsen; rektor får dashbord på tvers av trinn. Gjør
  Trivselsleder synlig for beslutningstakeren UKENTLIG i stedet for bare ved
  fornyelse. Se kapittel 23.

**Hjemmelekse:** skaff ASK-studien i original (norsk, Vestlandet —
dokumenterer aktiv læring som effektiv repetisjons- og alternativ
undervisningsmetode) til Evidence-siden.

**Rød tråd:** nesten hver idé i denne retningen gjør det vanskeligere for en
skole å si opp: fellesskap gjennom deling og bidrag (kapittel 23), synlighet
hos beslutningstakeren, og å bli løsningen på et myndighetspålegg. Målet er å
bygge et produkt skolene vil DELTA i, ikke bare kjøpe.

---

## 2. Teknisk fundament og tjenester

| Tjeneste | Funksjon | Info |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | repo: trivselsleder-ny |
| Hosting | Vercel — auto-deploy ved push til main | vercel.com |
| Kildekode | GitHub (eid av Trivselsleder AS) | Trivselsleder/trivselsleder-ny |
| Database | Supabase — PostgreSQL, Auth, Storage (North- EU/Stockholm) | zpirjbrcbeubwpmtncxx |
| CRM | HubSpot — kontrakter, deals (master i dag) | portal 145220138 (app-eu1) |
| E-post | Resend — i drift, hele Trinn B ferdig | noreply@trivselsleder.no |
| Innlogging | Supabase Auth + Feide OIDC | sikt.no |
| AI | Claude API — rektoragent, Trivselsbot, churn | console.anthropic.com |
| Søk | SerpAPI — rektorbase-søk | 15 000/mnd |
| Video | Bunny.net Stream — valgt | bunny.net |
| E-signering | DealBuilder — BankID (beholdes) | ekstern |
| Fakturering | Tripletex (Camilla) | tripletex.no |
| Betaling intl. | Stripe (planlagt, Fase 8) | stripe.com |
| Utviklingsverktøy | Claude Code | vedlegg B |

Supabase prosjekt-ID: zpirjbrcbeubwpmtncxx. Kjartans superadmin-UID: 9ee20e27-c5c2-4917-a6ba-4b3baedabf11.

---

## 3. Regler og prinsipper

### 3.1 Kritiske sikkerhets- og arbeidsregler (uten unntak)

- Testing skjer ALLTID på https://trivselsleder-ny.vercel.app — ALDRI på den live siden
trivselsleder.no.
- HubSpot røres aldri live under utvikling. API-et virker (bekreftet på demoskole), men skole-import
mot live HubSpot skal ALDRI kjøres før alt er ferdig testet. Kun demoskole ved utvikling.

- HubSpot er master for kontrakter. Systemet flagger og foreslår, men endrer aldri HubSpot-status
selv.
- SQL alltid FØR kode. Databaseendringer kjøres i Supabase SQL-editor først, deretter pushes
kode.
- Verifiseringssløyfe: SQL → kodeendring → commit/push → vent på Vercel-deploy (sjekk at riktig
commit er «Ready») → test med Cmd+Shift+R.
- Nye tabeller: husk GRANT til anon + authenticated (ellers 403 tross korrekt RLS). Anonym
tilgang skjer via SECURITY DEFINER-funksjoner, aldri direkte tabelltilgang.
  *På vanlig norsk: en ny tabell i databasen er stengt for alle når den lages. To ting må
  åpnes hver for seg — (1) hvem som får lov til å banke på døra i det hele tatt (GRANT), og
  (2) hvilke rader hver enkelt får se når de er kommet inn (RLS). Glemmer man den første, får
  brukeren «403 / ingen tilgang» selv om regel to er helt riktig satt opp. «anon» betyr en
  besøkende uten innlogging, «authenticated» en innlogget bruker. En SECURITY DEFINER-funksjon
  er en betjent i luka: den besøkende får aldri gå inn i arkivet selv, men kan be betjenten
  hente akkurat den ene mappa han har lov til å se.*
- Nye tabeller og funksjoner må ALLTID få GRANT til service_role også. Dette
er blitt glemt flere ganger og stoppet arbeidet hver gang. Serverfunksjoner bruker
service_role-nøkkelen, og den arver ikke rettigheter automatisk når tabellen opprettes manuelt.
Regelen gjelder både tabeller (GRANT SELECT/INSERT/UPDATE) og funksjoner (GRANT
EXECUTE).
- Ved testing av serverfunksjoner via curl skal alltid -H "Cache-Control: no-cache"
legges på. Uten dette kan Vercel svare fra mellomlager, slik at man tester gammel kode uten å
vite det. Dette ga en halvtimes feilsøking på en feil som ikke fantes.
- Alt som sender e-post skal reservere plassen i samme operasjon som den skriver.
Én atomisk oppdatering med betingelse «kun hvis feltet er tomt» — ikke les-så-skriv. Bare da er
dobbeltsending umulig, uansett hvordan lesingen oppfører seg.
- API-nøkler i terminal: bruk python3 -c med input(), én nøkkel om gangen. Aldri nano.
Sjekk alltid at Vercel faktisk har bygget riktig commit. En byggefeil
kan gjøre at siden viser en eldre versjon selv om koden lokalt er korrekt. Bekreft også at git-push
faktisk fullførte.

### 3.2 Bærende prinsipper for hele prosjektet

- Flerspråklig fra dag 1: all tekst i i18n-filer. Ingen synlig tekst hardkodes.
- To-lags / land-agnostisk fra dag 1: universell logikk i Lag A; alt landsspesifikt i Lag B som
konfigurasjon. Se kapittel 22.5.
- Tilgjengelighet (WCAG 2.1 AA): lovpålagt for skolesektoren. Bygges inn fra start.
- Mobil-først: all utvikling tar utgangspunkt i mobilvisning.
- Uavhengig av én person: siden kan driftes, videreutvikles og overtas av andre.
- GDPR innebygd: personvern tenkes inn i all funksjonalitet fra starten.
- Dynamisk og selvdriftet: enkelt å endre uten ekstern leverandør.
- Innstillinger i basen, ikke i koden: verdier som kan tenkes å endre seg (dager før purring,
avsenderadresse, nettadresse) legges i innstillinger-tabellen. Bevist nyttig i Trinn B — se kapittel 5.8.
- Stripe-klar arkitektur: betalingsflyt planlegges inn tidlig.
- Systemet foreslår, mennesket bestemmer: automatikk genererer forslag som godkjennes —
endrer aldri forretningskritiske data selv.
- Rekkefølge-tenkning først: tenk gjennom tekniske avhengigheter før bygging.
- Bygg én ting, verifiser, gjenta. Ingenting erklæres ferdig uten bevis.

- Agenter: si fra om manglende tilgang, ikke konkluder tomt.

### 3.3 Regler for selve planen

Disse fire reglene gjelder dette dokumentet, og har hver sin historie bak seg
(vedlegg B):

1. **Planen skal kunne leses av den som eier den.** Der planen sier noe
   teknisk, står det en linje ved siden av på vanlig norsk om hva det betyr i
   praksis. Ikke i stedet for det tekniske — ved siden av. Følger av
   CLAUDE.md: «Kjartan er IKKE utvikler.»
2. **Planen kortes aldri ned.** Innhold flyttes eller omstruktureres, men
   fjernes bare med eksplisitt beslutning, ført i endringsloggen. Erfaringen
   fra juni og juli er entydig: krav som forsvant fra planen, forsvant fra
   prosjektet.
3. **Ingen statuslinje uten kilde, ingen påstand uten bevis.** Skalaen er
   BEVIST (sett virke i produksjon) → KODEVERIFISERT (lest i koden med fil og
   linjenummer) → PÅSTÅTT (står i et dokument, ikke kontrollert). En påstand
   om at noe IKKE finnes, krever samme bevis som en påstand om at det finnes.
4. **Den som bygger, kontrollerer ikke alene.** Hver ny utgave av planen
   kontrolleres av en uavhengig agent før den tas i bruk. Regelen har funnet
   feil i samtlige førsteutkast så langt.

Den praktiske arbeidsinstruksen for øktene — øktrutine, kommandostandard,
prinsipper for delagenter — ligger i vedlegg B.

---

## 4. Rollene

### 4.1 Rollene i systemet

- RA (regionansvarlig): oppretter/endrer kurs. Sender kurslenker. Ser svar
  live. Alle ansatte kan endre ethvert kurs ved behov; «mine kurs» blir
  standardvisningen (kapittel 8).
- Skolen (Hovedkontakt TL): får lenke på e-post, bekrefter/melder endring.
  To minutter.
- Camilla: kortutdeling og fakturering — systemet foreslår, hun bestemmer
  (kapittel 8).
- Kursholder: eget register (egne + eksterne). Ingen innlogging i dag;
  kursholderkalender er et mulig senere-punkt (kapittel 17).
- System: purrer ubesvarte, sender påminnelse, sender evaluering etter kurs,
  logger alt. Første utsending er automatisk (kapittel 5).

### 4.2 RA-rollen som arbeidsflyt

Arbeidsinstruksen for regionansvarlig er lest mot planen. Den bekrefter flere
moduler som reelt behov:

| Fra arbeidsinstruksen | Konsekvens for planen |
|---|---|
| Alle henvendelser skal loggføres i HubSpot | E-postsporingsknuten (kapittel 19) er en arbeidsinstruks, ikke en finesse |
| Oppstartsmail + registrering + rektorsamtale etter 6 mnd | En flyt som kan automatiseres med samme mekanikk som e-postmotoren |
| «Aktiv sagt opp»-playbook med faste kampanjer | Churn-flagging bør mate denne direkte (kapittel 18) |
| Rektormøte med ALLE skoler hvert 3. år, prioritert mot skoler man hører lite fra | Validerer inaktiv-skole-varsling (kapittel 23) som verktøy, ikke idé |
| Webinarer er fast RA-plikt | Webinar-modulen (kapittel 20) er et reelt behov |
| Aktiv læring-modul lages mars/april | Fast årshjul verdt å kjenne når moduler planlegges |

---

## 5. Ferdig og bevist

*Dette kapitlet svarer på: hva virker i dag, og hvor finner jeg det?
Byggehistorikken — datoer, byggetrinn, commits — ligger i vedlegg B.
Statusskalaen fra 3.3 gjelder: BEVIST betyr sett virke i produksjon;
KODEVERIFISERT betyr lest i koden, ikke kjørt.*

### 5.1 Statusoversikt (per 7. august 2026)

| Modul / fase | Status |
|---|---|
| Fase 1 — Grunnmur (React/Vercel, i18n, kulturkort) | Ferdig |
| Fase 2 — Innlogging, skoleregister, HubSpot-synk P1 | Ferdig |
| Rektoragent + skolesjef-agent (NO grundig, SE delvis) | Bygget & testet |
| Kursplanlegger (steg 1–5 + agenttest) | PILOT-KLAR — restarbeid i kapittel 8 |
| Hallregister (161) + Kursholderregister (17) | Ferdig — to importjobber gjenstår (kapittel 8) |
| Evaluering — grunnmodul + Fase 2 (Del 1–4) | KODEVERIFISERT, ikke kjørt — se 5.6 |
| Ledelse-side + churn-varsel (Trinn 1 + 2) | Ferdig — resten i kapittel 18 |
| E-postsystemet (Resend) — Trinn A og hele Trinn B | FERDIG OG BEVIST |
| Brukslogg (innlogging/sidevisning) | I drift — dashbord kommer med biblioteket |
| Kursinformasjonssiden | FERDIG OG BEVIST |
| Tekster og maler (admin-side) | FERDIG OG BEVIST |
| Kartlegginger (dagens side, HubSpot, Ramsalt, Edalio, omtaler, konkurrenter, Lærervikaren) | Ferdige — kunnskapsgrunnlag i vedlegg C |
| Videoverts | Bunny.net — valgt (kapittel 10) |
| Fase 3 — Ressursbibliotek | Klar til oppstart (kapittel 10) |
| Fase 4 — Interaktive verktøy | Må til lansering (kapittel 11) |
| Stor dataimport | Mot slutten (kapittel 12) |
| Forside-design | Planlagt (kapittel 13) |

### 5.2 Grunnmur og kulturkort (Fase 1)

Mål: fungerende side med kjernefunksjonalitet for kulturkort og grunnleggende struktur.

- React + Vite + Tailwind CSS. GitHub og Vercel med auto-deploy ved push til main.
- i18n norsk/svensk (react-i18next), språkvelger i header, SPA-routing.

- 1685 partnere i Supabase. Tre kategorier: aktiv, tidligere, potensiell.
- Bestillingsskjema med portokalkulator: 40 kr/kort (fra src/utils/satser.js). Portosatser:
28/28/46/69/99 kr etter vekt. Bestillinger til kulturkort@trivselsleder.no.
- Admin-panel /admin/kulturkort: tre kategorier, søk/filter, redigering, velg-og-send e-post med
BCC.
- 814 partnerbeskrivelser live; 176 manglende URL-er fylt via agent.
- Admin-lenke i toppmeny (kun superadmin).

### 5.3 Innlogging, brukere og skoleregister (Fase 2)

Mål: skolene logger inn, nye skoler melder seg på, full oversikt i backend.

- Supabase Auth: brukernavn/passord og Feide OIDC. Min side, glemt-passord med branded epost.
- Påmelding (/paamelding) + admin-godkjenning (/admin/paameldinger). Min side: skolen
redigerer egen info.
- HubSpot-synk fullt verifisert: alle skolefelter + kontaktroller. Rektor-bytte rydder gammel kobling
automatisk.
- Flere TL-ansvarlige per skole (2–5) synkes som egne HubSpot-kontakter. Selve mottakerlogikken
er nå bygget — se kapittel 5.8.
- Skoleregister: filtrering på alle felter, CSV-eksport (33 kolonner), velg-og-send e-post med BCC.
- Rollestyring i fire nivåer: superadmin / administrator / HTLA / ansatt.
- Databasetabeller: profiles, skoler, bruker_skole, paameldinger.

#### Master-fordeling: hvem eier hva (toveis-synk)

| Datatype | Master (eier) | Retning |
|---|---|---|
| Skoleinfo: rektor, HTLA, TLA, adresse, kontaktroller | Nettsiden | Nettside → HubSpot |
| Kontrakter / avtaler (startdato, pris, varighet, status) | HubSpot | HubSpot → nettside |

I praksis: nettsiden er master for skoleinfo, HubSpot er master for kontrakter/avtaler. Nettsiden
endrer aldri kontraktsdata i HubSpot selv — den foreslår og flagger.

#### HubSpot-synk — prioritetsnivåer

P1 (skolen endrer info på Min side → oppdateres automatisk i HubSpot) er
verifisert og i drift. P2 (ny skole godkjennes → opprettes automatisk som
Company) bygges som del av den store dataimporten — se kapittel 12. P3
(kontraktinfo på skolekortet + Tripletex) ligger etter lansering — se
kapittel 18.

#### Skolestatuser

Påmeldt · Aktiv · Aktiv sagt opp · Pause · Tidligere · Potensielle.

#### Min side — fullt faneoppsett (mål, fra gammel side)

Min side · Administratorer · Ansatte · Kundeinformasjon · Bestillinger · Dokumenter · Aktiviteter ·
Move it · Aktiv læring · Periodeplaner · TL-hjulet · Drift av TL.

### 5.4 Rektoragenten og skolesjef-agenten

En gjenbrukbar AI-agent (Claude API + SerpAPI) som bygger og vedlikeholder en komplett base
over rektorer og skolesjefer i Norden.

#### Norge (testet grundig)

- Rektorbase v7: 2456 aktive offentlige grunnskoler. 100% navn, 83% e-post, 100% telefon.
- Gjenbrukbar agent: Claude Haiku + Fable 5, 5 søkerunder. Flagger MULIG
NAVNEBYTTET/NEDLAGT.
- Skolesjef/oppvekstsjef v5: 357 kommuner. 94% navn, 85% e-post/telefon.

#### Sverige (delvis)

- Rektorbase: 4681 grundskolor via Skolverkets API. Fuzzy-matching: kun 9 av 373 TL-skoler ikke
funnet.
- Skolesjef: kjøres (276 kommuner). Ca. 3040 SerpAPI-søk gjenstår.

#### Datakilde-lærdommer

- Udir/NSR følger GSI med 1. oktober som telledato — nedleggelser/navnebytter henger etter.
- Brreg flagger ikke navnebytter pålitelig. Beste kvalitetssjekk er kommunens egen nettside.
- SerpAPI: 15 000 søk/mnd. Google Custom Search stengt for nye kunder fra jan 2026.

#### Gjenstår

- Island (~175 skoler), kjøres etter Norge og Sverige er godkjent.
- Admin-knapp i siden: start agent med filter. Cron 4x/år.
- Alle ~7300 nordiske skoler importeres til Supabase og synkes til HubSpot som varme kontakter.

### 5.5 Kulturkort-agenten

Samme mønster som rektoragenten, to oppgaver: (1) finn e-post til eksisterende partnere som
mangler det, (2) kartlegg tilsvarende tilbydere i alle TL-kommuner. Potensial: fra 714 til flere tusen
partnere.

### 5.6 Evaluering (KODEVERIFISERT — ikke kjørt)

Lukker sirkelen invitasjon → påmelding → påminnelse → kurs → evaluering.
Selve utsendingen er bevist i produksjon; resten — spørsmålsadministrasjon,
pakker, semester, admin-oversikten — er lest i koden og aldri testet. Den står
i del 1 av `TESTOPPDRAG-v32.md` og kjøres i loop-testen (kapittel 8).

Hva modulen inneholder: tre vurderinger (skala 1–6), gullkorn (fritekst) og
kjøpsinteresse på én side via token-lenke; redigerbare spørsmål per semester;
redigerbare pakker med priser der frossen pris lagres ved svar;
bildeopplasting av utstyrspakker; CSV-eksport tilpasset norsk Excel.
Detaljer i vedlegg B.

### 5.7 Churn-varsel og Ledelse-side

Churn-kort: antall flagget, andel av svar, fordeling på nettverk. Signalord-flagging mot redigerbar
ordliste. Ordlisten fokuserer på kapasitets- og budsjettspråk (slutter, oppsigelse, ressurser, økonomi,
nedleggelse) framfor rene misnøyesignaler. Systemet endrer ALDRI HubSpot-status selv.

Ledelse-siden (/admin/ledelse, kun superadmin) samler churn-signalene
aggregert — av pilotens 12 nei-svar var minst 5 oppsigelses- eller
risikosignaler. Ærlig status: siden er halvbygget mot målet. Churn-kortet finnes; svarprosent på tvers og status per region er
ikke bygget. «Andel av svar %» er andelen flaggede av alle svar, ikke
responsrate, og «Fordeling på nettverk» teller bare flaggede rader.
Resten av ledelsesbildet — trinn 3-varsling, fullt dashboard, playbook-
kobling — ligger etter lansering: kapittel 18.

### 5.8 E-postsystemet (Resend) — Trinn A og Trinn B ferdig

Tidligere gikk all kursrelatert e-post via mailto — RA klikket en
knapp som åpnet eget e-postprogram med adressene i blindkopi. Nå sender
systemet selv. Alle seks utsendingstypene er bygget og sendt i produksjon,
med nødbrems og dobbeltsendingsvern bevist på alle endepunkt. Malene
redigeres i admin-siden Tekster og maler (5.11).

Trinn B er overgangen fra «RA trykker send» til «systemet sender». Det høres ut som en teknisk
detalj, men det er en forutsetning for tre andre ting: purring kan ikke skje automatisk før noen har
sendt automatisk, systemet kan ikke vite hvem som har svart før hver mottaker har sin egen lenke,
og pilotflyten med Marielle blir ikke selvgående før begge deler er på plass.
Derfor bygges Trinn B som én samlet pakke, ikke som løse fikser: automatisk utsending, flere
mottakere per skole, og den ekte skole-importen slik at kontaktene faktisk finnes i basen.

#### Trappetrinn-modellen

Den viktigste forretningsbeslutningen i Trinn B er ikke teknisk: den handler om at hovedkontaktrollen
skal ha verdi. Hvis alle TL-ansvarlige får alt samtidig, betyr det ingenting å være hovedkontakt, og
ansvaret pulveriseres.

| Trinn | Hvem får e-post | Når |
|---|---|---|
| 1. Invitasjon | KUN Hovedkontakt TL | Når RA sender ut kurset |
| 2. Purring | Hovedkontakt TL | Etter 5 dager uten svar |
| 3. «Ikke hørt fra skolen» | Øvrige TL-ansvarlige | Etter 10 dager uten svar |
| 4. Overstyring | Alle TL-ansvarlige | Når RA trykker «send til alle nå» |

Både 5 og 10 dager ligger som verdier i innstillinger-tabellen (purring_dager, trinn3_dager) og kan
endres uten kodeendring når erfaringen fra piloten foreligger.

#### Ingen svar på e-post, men ingen svart hull

Et reelt driftsproblem i dag er at lærere svarer direkte på e-posten i stedet for å bruke skjemaet —
«vi er usikre på hvor mange TL vi blir», «vi tror ikke vi kan komme». Da havner informasjonen i en
innboks i stedet for i systemet, og oversikten forsvinner.
Løsningen er å sende fra en no-reply-adresse og si tydelig i selve e-posten at svar ikke registreres.
Men svaradressen skal likevel gå til et sted som leses: noen svar er ekte og viktige, som «vår
kontaktperson har sluttet» eller «dere har feil skole». Å la dem forsvinne ville vært verre enn dagens
situasjon.
Presisering: avsenderadressen løser ikke problemet alene. Læreren som skriver «vi vet ikke hvor
mange vi blir» gjør det fordi skjemaet ikke har plass til usikkerheten. Løst: antall-feltet er valgfritt
(bygget og bevist), og fritekstfeltet finnes.

#### De seks utsendingstypene

| # | Utsending | Til hvem | Når | Status |
|---|---|---|---|---|
| 1 | Kursinvitasjon | Hovedkontakt TL | Når RA sender ut kurset | FERDIG OG BEVIST |
| 2 | Purring | Hovedkontakt TL | 5 dager uten svar | FERDIG OG BEVIST |
| 3 | Ikke hørt fra skolen | Øvrige TL-ansvarlige | 10 dager uten svar | FERDIG OG BEVIST |
| 4 | Påminnelse | De som svarte ja | Før kursdato — RA velger dagen | FERDIG OG BEVIST |
| 5 | Evaluering | De som var på kurs | Etter kurs, kl. 13:30 | FERDIG OG BEVIST |
| 6 | Varsel om kjøpsinteresse | Eivind (internt) | Ved kjøpsinteresse i evaluering | FERDIG OG BEVIST |

Nr. 1–3 fører til samme skjema med samme type lenke, men har ulik ordlyd og
ulike mottakere. Nr. 6 går aldri til en skole. Påminnelsens knapp peker på
kursinformasjonssiden (5.10), ikke svarskjemaet — purring og trinn 3 peker
fortsatt på skjemaet, de går til skoler som ikke har svart.

Teknisk merknad om klokkeslett: Vercels klokke går i UTC og tar ikke hensyn
til norsk sommertid. Jobben våkner derfor hver time og lar koden selv avgjøre
om klokken er 07:00 eller 13:30 i Norge. Det gir riktig tid året rundt, og
retter seg selv hvis én kjøring feiler — Vercel prøver aldri på nytt av seg
selv.

#### Avsenderprofil

| Innstilling | Verdi | Begrunnelse |
|---|---|---|
| avsender_navn | Trivselsleder | Endres til RA-navn når RA-adressene finnes i basen |
| avsender_epost | noreply@trivselsleder.no | Verifisert domene, signaliserer at svar ikke leses |
| svar_til_epost | post@trivselsleder.no | Fanger de få ekte svarene |
| nettsted_url | https://trivselsleder-ny.vercel.app | Byttes til trivselsleder.no ved lansering |

Alle fire ligger i innstillinger-tabellen og kan endres uten kode. RA-enes egne e-postadresser finnes
ikke i basen ennå — det er en forutsetning for at e-posten skal kunne se ut til å komme fra skolens
egen regionansvarlige, og henger dermed på den store dataimporten (kapittel 12).

#### Leverandørvalg og GDPR

Bli på Resend (ikke bytt til Brevo) — byttekostnad høyere enn GDPR-gevinsten. Resend er GDPR-kompatibel,
DPA tilgjengelig, EU-US DPF-sertifisert. E-postsporing: test Resends egen sporing
FØRST før noe ekstra kjøpes. DPA med Resend må være signert før lansering (kapittel 14.2).

### 5.9 Brukslogg

Live: Supabase-tabell brukslogg med RLS, useBrukslogg.js hook, LoggSidevisning.jsx. Logger
innlogging, sidevisning, ressursbruk, nedlasting og søk.

Gjenstår: Recharts-dashboard, automatisk flagging av lav-aktive skoler, innspillskanal til høyt-aktive
skoler. Kobles inn når ressursbiblioteket er bygget. Den nye idéen om inaktiv-skole-varsling (kapittel 23.1)
bygger videre på dette.
Fra Edalio-kartleggingen (kapittel 10.2 og vedlegg C): hendelseslogging må være på plass fra
første deploy av ressursbiblioteket, ikke legges til etterpå. Edalio utsatte dette og står nå uten
grunnlag for å avgjøre hva som skal være gratis og hva som skal ligge bak betaling. Vi har allerede
bruksloggen — poenget er at den må dekke bibliotekbruk fra dag én, ikke bare innlogging og
sidevisning.

### 5.10 Kursinformasjonssiden

**Hva den er.** Når skolen trykker send, er det ikke slutten — det er
overgangen til «nå skal dere forberede dere». I stedet for at all kursinfo
ligger i en e-post som forsvinner i innboksen, sendes skolen til en
kursinformasjonsside på hjemmesiden. Informasjonen bor da ett sted, kan
oppdateres når som helst, og er alltid riktig.

- **Øverst:** kursspesifikke fakta hentet automatisk — skole, kurs, dato, sted,
  oppmøtetid og vertskapsnotat. Samme kilde som e-postene, så en endring RA
  gjør slår ut begge steder.
- **Under:** én felles tekst for ALLE skoler, lagret som `kursinfo_tekst` i
  `innstillinger` og redigerbar av de ansatte (kapittel 5.11). Pluss et valgfritt
  `kurs.kursinfo_tillegg` per kurs, for det som bare gjelder ett kurs.

Svarer skolen JA, sendes den til `/kursinfo/:token?takk=1` med kvitteringen
øverst på selve siden. Svarer den NEI, får den den gamle kvitteringen — siden
har ingenting å gi dem. Påminnelsens knapp peker nå på kursinfosiden («Les
kursinformasjonen»), ikke på svarskjemaet. Purring og trinn 3 peker fortsatt på
skjemaet, siden de går til skoler som ikke har svart.

`## Overskrift` gir mellomtittel, `- punkt` gir punktliste, tom linje gir nytt
avsnitt, `[tekst](/min-side)` gir lenke (skråstrek = intern, http = ekstern).

#### Sikkerhet

`anon` får aldri leserett på `innstillinger`. RPC-en `hent_kursinfo_via_token`
(SECURITY DEFINER) leser teksten på skolens vegne. Teksten settes aldri inn som
HTML — den bygges som React-elementer, så en feilskrevet mal kan ikke bli et
sikkerhetshull.

*På vanlig norsk: en lærer som åpner kurslenken sin er ikke innlogget. Hun får likevel ikke
lov til å lese i innstillingstabellen selv. I stedet ber hun en betjent — en funksjon i
databasen — om å hente akkurat teksten som hører til hennes kurs, og bare den. Og teksten som
kommer tilbake vises som ren tekst, ikke som kode nettleseren kjører. Det betyr at selv om
noen skrev noe ondsinnet inn i en mal, ville det bare stå der som bokstaver på skjermen.*

**BEVIST.** Samme kurs, to skoler: Trondheim 1 (vertskap) viste oppmøte 08:15
og vertskapsnotatet; Trondheim 4 (øvrig) viste 08:50 og ingen vertskapslinje.
Ekte påminnelse sendt med den nye knappen.

**Til rest:** de fire planlagte lenkene (ressursbiblioteket,
dokumentarkivet, kulturkort-modulen, utstyrspakker) — de to første peker inn i
Fase 3, som ikke er bygget. Utstyrspakke-lenkene står fortsatt som
plassholdertekst i `kursinfo_tekst` og må inn før drift.

---

### 5.11 Tekster og maler

Bygger på husregelen «innstillinger i basen, ikke i koden» — tidligere
måtte hver tekstendring gjøres med SQL i Supabase.

Én admin-side der de ansatte redigerer alt systemet sender ut: de seks
e-postene (emne + tekst), kursinfoteksten, vertskapsnotatet, avsenderadressene
og de tre tidsinnstillingene. Under hvert felt står plassholderne som virker
akkurat der — de er ikke like fra mal til mal.

**Siden nekter tre ting:** tom mal (en tom mal stopper all utsending), trinn 3
før purringen, og nettadresse uten `https://` eller med skråstrek til slutt.
Ukjente plassholdere blokkeres ikke, men advares om, med «lagre likevel» som
ett ekstra klikk.

Nødbremsen `motor_aktiv` vises som en setning, uten knapp. Den styres bevisst i
basen — den skal ikke kunne skrus av ved et uhell.

**DATABASE:** RLS slått på for `innstillinger`, med policyer for
superadmin/ansatt. Før dette hadde INGEN skriverett på tabellen — heller ikke
serverrollen. Hullet ble oppdaget av agenttesten, som ikke fikk tømt en mal for
å teste sikkerhetsventilen.

**FUNN I PLANEN, IKKE I KODEN:** planen ba om et felt `paaminnelse_dager_for`.
Den nøkkelen brukes ingen steder i koden. Påminnelsen har ingen tidsregel — RA
velger dagen og trykker. Feltet ble derfor ikke bygget. Avgjort 9. august:
RA velger dagen selv (ingen tidsregel), og den ubrukte nøkkelen
`paaminnelse_dager_for` utgår.

---

### 5.12 Fullførte kartlegginger

Ni kartlegginger er fullført og utgjør kunnskapsgrunnlaget for resten av
planen. Fullstendige rapporter og funn ligger i vedlegg C:

- Dagens side (Cowork, 8 oppdrag) og lokal Dropbox-backup
- HubSpot (8B-1 + 8B-2) — hva som faktisk ligger der
- Ramsalt-eksporten — utpakket og verifisert (arbeidet med den: kapittel 10)
- Fase 3-dybdekartleggingen (Fable 5, 4. juli) — metadata, taksonomi,
  media-sprik (vedlegg C.7; jobben: kapittel 10)
- Edalio — samme tekniske stack, ti gjenbrukbare mønstre (bruken av funnene:
  kapittel 10)
- Omtale-kartlegging — råstoff til Evidence-siden (kapittel 13)
- Internasjonal konkurrentkartlegging England + Tyskland (kapittel 22)
- Skolenes egne tilbakemeldinger 2023–2024 (kapittel 13)
- Lærervikaren.no (kapittel 24)

---

## 6. Åpne beslutninger — hele lista på ett sted

*Hver beslutning avgjøres i kapitlet der arbeidet står beskrevet — denne
lista er oversikten. Når et punkt avgjøres, oppdateres både lista og
kapitlet.*

| # | Beslutning | Avgjøres i | Haster fordi |
|---|---|---|---|
| 1 | Femte tall: kulturkortpartnere 1 685 vs 714 (de fire andre er talt, se Vedlegg D) | Kapittel 10 | Telles i Supabase; de fire andre er avklart |
| 2 | Media-sprikene: video 247 vs 439, bildeoriginaler 103/105 | Kapittel 10 | MÅ avklares med Jon FØR fersk eksport bestilles (aug/sep) |
| 3 | Dropbox: hvilken versjon er master + stier etter juli-omstruktureringen | Kapittel 10 | Før Dropbox brukes som hull-fyll i Fase 3 |
| 4 | Kan Aktiv læring-innholdet (194 opplegg) hentes hjem? | Kapittel 10 | Påvirker innholdsmengden i biblioteket |
| 5 | Drift etter Kjartan — hvem tar teknisk ansvar? | Kapittel 14 | Del av overleveringen ved lansering |
| 6 | DPA-avkrysning: Supabase, Vercel, Resend + Bunny.net | Kapittel 14 | Lovkrav før lansering |
| 7 | Svensk side: avvik i Lag B | Kapittel 15 | Etter lansering |
| 8 | Kursholder-innlogging: reelt behov? | Kapittel 17 | Etter lansering |
| 9 | Webinar: åpen eller lukket påmelding | Kapittel 20 | Etter lansering |
| 10 | Trivselsundersøkelsen: behandlingsansvar (jurist) | Kapittel 21 | Før undersøkelsen tas i bruk |
| 11 | Abonnementsmodell: per skole / lærer / kombinasjon | Kapittel 22 | Før digital tjeneste selges |
| 12 | Danmark-rapporten: ferdig, men ikke analysert | Kapittel 22 | Etter lansering |

*Avgjorte beslutninger står i endringsloggen (vedlegg A) og i «Ferdig og
levert» (vedlegg D). Tre punkter lukket 9. august: påminnelse, flytt-knapp,
«Inaktiv»-status. Fire tall talt opp — bare det femte gjenstår.*

# DEL 2 — VEIEN TIL LANSERING

*Kapitlene 7–14 leses i arbeidsrekkefølge: dette er planen frem til norsk
lansering. To milepæler styrer alt: PILOTEN med Marielle Haarvik medio
august, og LANSERINGEN med mål 1. oktober.*

---

## 7. Tidslinje, milepæler og kritisk sti

### 7.1 Tidslinjen

- **NÅ (august):** ferdigstille kursplanleggeren til pilot (kapittel 8) og
  lukke sikkerhetspunktene (kapittel 9). Demo-video spilles inn (manus klart,
  vedlegg C), demo-innhold og testspor slettes. Uavhengig av Jon og Fase 3 —
  kan kjøres parallelt med alt annet.
- **Medio august:** PILOT med Marielle Haarvik. Hun er motivert, og flyten er
  selvgående — automatisk e-post er ferdig og bevist.
- **Månedsskiftet aug/sep:** bestill fersk fulleksport fra Jon. Varsle
  innholdsfrys til de ansatte samtidig. De to media-sprikene MÅ avklares før
  denne bestillingen (kapittel 10).
- **Høst:** Fase 3-struktur på testdata → Fase 4-verktøy oppå → full import
  (kapittel 10–12). Forside/design og Evidence-siden parallelt (kapittel 13).
- **1. oktober (mål):** alle leker inne — norsk LANSERING (kapittel 14).
- **Sist i rekkefølgen:** stor dataimport av skoler/ansatte/nettverk, og
  HubSpot-synk aller sist (kapittel 12).
- **Jan/feb 2027:** første reelle drift-test på ett fylke før full utrulling.
- Deretter Del 3, i prioritert rekkefølge — svensk side først.

### 7.2 To milepæler, to lister

Ett skille er ikke nok: det som må være
klart til PILOTEN er ikke det samme som det som må være klart til
LANSERINGEN. Eksempel: automatisk e-post var en forutsetning for piloten,
mens RLS-gjennomgangen hører til lanseringen.

**Må til pilot (medio august)** — alt står i kapittel 8 og 9:

- Restpunktene i kursplanleggeren: filterrad + eksport i kursoversikten,
  sesong-rubrikk, kortutdelingens lagring og frysing, import av «Vanlig
  vertskap» og «Alternative haller» (kapittel 8).
- Hverdagsark for de ansatte med tilbakerulling-oppskrift (kapittel 14.3 —
  skrives nå, brukes fra pilot).
- Statushistorikk for skoler og lagring av frafallsvarsler (kapittel 12) —
  historikk kan ikke lages i ettertid; klokka går fra første ekte skole.
- Sikkerhet: push av tilgangssjekkene, CRON_SECRET, rotering av API-nøkler,
  de to «før pilot»-punktene (kapittel 9).
- Full loop-test mot planen som fasit (`TESTOPPDRAG-v32.md`).
- Sletting av demo-innhold og testspor.

**Må til lansering (1. oktober)** — kapitlene 10–14 i rekkefølge:

- Hele innholdsgrunnmuren: struktur på testdata, søk, vern, import
  (kapittel 10).
- Fase 4-verktøyene (kapittel 11).
- Stor dataimport + databasens oppskrift (kapittel 12).
- Forside, design, Evidence (kapittel 13).
- RLS-gjennomgang, GDPR/DPA, WCAG, Feide, DNS (kapittel 9 og 14).

**Kan komme etter lansering:** alt i Del 3. Ingenting der skal bekymre noen
før 1. oktober.

### 7.3 Kritisk sti — de reelle tidstyvene

Fase 3-strukturen (den store byggejobben), design-fasen, og at importen er
blokkert til Jons august-eksport foreligger. Det siste er verdt å merke seg:
uansett hvor fort det jobbes, kan ikke full innholdsimport skje før
månedsskiftet august/september. Den datoen setter en naturlig nedre grense
for lansering — og med mål om alle leker inne 1. oktober er marginen liten.

---

## 8. Kursplanleggeren — ferdigstilling til pilot

*Kursplanleggeren erstatter dagens Excel + QuestBack + Google Forms-flyt og
er kjernen i det aktive arbeidet. Den er PILOT-KLAR: alle fem byggesteg er
ferdige og agenttestet ende-til-ende (historikken i vedlegg B). Dette
kapitlet beskriver systemet slik det er — og samler ALT som gjenstår før
piloten medio august.*

Hvorfor: pilotperioden viste at man brukte mer tid, ikke mindre, fordi samme
info finnes flere steder. Et kurs lever i dag fire steder. Grunngrepet:
nettsiden blir navet, hvert kurs finnes ÉN gang.

> **Verifisert mot ekte kode 10. august.** Flere ting er lenger fremme enn
> planen antok: kortstatusene finnes allerede (Camilla kan registrere
> avgjørelsen sin i dag — se 8.6), adresse- og pris-feltene finnes i
> hall-skjemaet (8.5), og RA-feltet fylles automatisk fra nettverket (8.4).
> Den ekte jobben er å lagre og fryse kortantallet (8.6) og bygge
> filterrad/eksport i kurslista (8.4). Full byggeliste i prosjektnotatet
> `PILOT-kartlagt-mot-kode.md`. Et viktig funn: kortstatus-funksjonen finnes
> bare i den kjørende databasen, ikke i migrasjonsfilene — jf. kapittel 12.2.

### 8.1 Datamodell — én sannhet

Tabell kurs: tittel, uke/dato/dag, hall, vertskap, oppmøtetider, RA/kursholder/backup,
region/fylke/nettverk, status, maks_antall, sesong.
Tabell kurs_skole: mottaker/e-post/mobil, svar_status, onsket_kurs_id, årsak, antall_tl, antall_kort,
kort_status, vertskap-felt, melding_fra_skole, svar_tidspunkt, lenke_token,
svart_av_mottaker_id, forste_utsending_at, purring_sendt_at og trinn3_sendt_at.
Tabell kurs_skole_mottaker: én rad per TL-ansvarlig med egen lenke_token,
sendt_at og apnet_at. Se kapittel 5.8.
Teknisk merknad (FK-felle): kurs_skole har to FK til kurs — bruk alltid eksplisitt kurs!
kurs_skole_kurs_id_fkey i Supabase-spørringer.
*På vanlig norsk: en skolerad peker på kurset sitt to ganger — én gang på kurset den er meldt
på, og én gang på et kurs den eventuelt er flyttet til. Spør man databasen om «kurset» uten å
si hvilken av de to man mener, vet den ikke, og svaret blir enten tomt eller feil. Derfor må
navnet på koblingen alltid skrives ut i klartekst. Dette har vært årsaken til flere
«forsvunne» kurs under testing.*

**Merk om `antall_kort`:** feltet står i denne beskrivelsen av datamodellen, men
finnes hverken i migrasjonsfilene eller i koden — null kodetreff i `src/`, `api/` og `sql/`
(kapittel 8.6). Om kolonnen faktisk er opprettet i den kjørende databasen, er ikke kontrollert; det kan
ikke avgjøres fra prosjektfilene (databasens oppskrift er ufullstendig, kapittel 12.2). Tallet regnes ut på skjermen hver gang siden åpnes. Det er nettopp derfor frysingen
på kursdagen (kapittel 8.6) må bygges — den kan ikke virke før tallet faktisk lagres i dette feltet.
I tillegg: tabell evalueringer (henger på kurs_skole), kursholdere (egne + eksterne), epost_logg og innstillinger.

### 8.2 Modulene — ærlig status

| Modul | Status |
|---|---|
| Steg 1 — Opprett kurs | Ferdig |
| Steg 2 — Koble skoler | Ferdig |
| Steg 3 — Svar-skjema | Ferdig & testet |
| Steg 4 — RA-admin | Ferdig — to funksjoner mangler fortsatt: eksport (bygges nå, 8.4) og flytteforespørsel (kapittel 17) |
| Steg 5 — Purring/påminnelse | Ferdig — sendes automatisk av e-postmotoren (kapittel 5) |
| Automatisk førstegangsutsending | FERDIG OG BEVIST |
| Hallregister (161 haller) | Ferdig — to importjobber gjenstår (8.5) |
| Kursholderregister (17 eksterne) | Ferdig |
| Kopier kursplan til ny sesong | DELVIS: RPC-en `kopier_kurs` dupliserer ÉN kursrad, samme dato, uten skoler. Målet er kopiering av hele planen vår→vår med skolekoblinger, oppsagte markert og nye foreslått — verdien ligger i skolekoblingene, og den delen mangler. Ikke tidfestet (kapittel 17). |
| Kortutdeling | Prototype i drift — spesifisert modul bygges nå (8.6) |

### 8.3 Skolens opplevelse — lenken

Hver skole får en personlig lenke og kommer rett inn på sin egen rad — uten innlogging. Skjemaet
er kort (to minutter): bekreft info, kommer dere (ja/nei med årsak), antall trivselsledere, fritekst til
kursholder, vertskap-bekreftelse. Nei-svar kan be om annet lekekurs — RA godkjenner/avslår.
Lenken er personlig per MOTTAKER, ikke per skole. Flere TL-ansvarlige kan ha
hver sin lenke inn til samme svar-rad, og systemet registrerer hvem som faktisk åpnet og svarte. Se
kapittel 5.8.

### 8.4 RA sin opplevelse — og oversikten som bygges nå

Det som finnes: kursoversikt med fargekode på svarstatus; opprett/endre kurs
med hall fra hallregisteret; send lenker med én knapp (logges); live svar og
metaoversikt; melding fra skole med håndtert-avkryssing; automatisk flagging
av rader med fritekst, årsak eller «åpen for annet kurs» (`harMelding()` i
SvarOversikt) — det som mangler er å se de flaggede samlet på tvers av kurs;
RA kan registrere og endre svar på vegne av skolen; trappetrinn-visning per
skole med knappen «send til alle TL-ansvarlige nå».

**Oversikts-problemet, kontrollert i koden:** kurslista henter ALLE kurs uten
begrensning, sortert på dato, opptil 10 000 rader på én side
(`AdminKursplanlegger.jsx:112`; RA-kolonnen `:246`). Over tabellen står bare
knappen «+ Nytt kurs» — intet filter, intet søk, ingen eksport. Med rundt 150
kurs i året blir lista uoversiktlig etter én sesong.

**Fire tiltak:**

| # | Tiltak | Når |
|---|---|---|
| 1 | **Filterrad over lista** — nedtrekk for RA, sesong og nettverk, pluss søkefelt på kursnavn og hall | Pilot |
| 2 | **Eksport til regneark** fra kursoversikten. Aldri bygget | Pilot |
| 3 | **«Mine kurs» som standardvisning**, med bryter for «vis alle» | Lansering |
| 4 | **Kalendervisning** («liste eller kalender») | Etter lansering — kapittel 17 |

**Forutsetning for punkt 1:** feltet `kurs.sesong` finnes i datamodellen, men
har aldri fått en rubrikk å skrive i (`AdminKursplanlegger.jsx:31`). *På
vanlig norsk: sesongen kan lagres, men ingen kan taste den inn.* Får den en
rubrikk, viser lista inneværende sesong som standard — og halve problemet er
løst.

**Forutsetning for punkt 3:** RA-feltet er i dag fritekst
(`AdminKursplanlegger.jsx:637`), ikke koblet til brukerkontoen. *På vanlig
norsk: systemet vet ikke hvilken RA som er hvem — det står bare et navn
skrevet inn for hånd.* Skrives navnet ulikt to steder, treffer ikke filteret.
Ryddes samtidig.

**Ikke bygget (ærlig status):** flytteforespørsel med kapasitet synlig —
`onsket_kurs_id` skrives ingen steder (null kodetreff), skolen kan krysse av
for at den er åpen for annet kurs, men ikke si hvilket; `maks_antall` vises i
kursskjemaet (`:711`) men brukes ikke som kapasitetsvisning. Hele
flytteforespørsel-funksjonen ligger i kapittel 17.

**Avklart 9. august (var åpne punkter):** «Flytt til annet kurs» skal bare
vises for «Kommer ikke»-skoler — kontrollert i koden: dette er ALLEREDE slik
(`SvarOversikt.jsx:293`, betingelsen `r.kommer === false` siden 18. juni),
ingen jobb. Påminnelsen: RA velger dagen selv, ingen automatisk tidsregel —
den ubrukte nøkkelen `paaminnelse_dager_for` utgår (finnes ikke i koden).

### 8.5 Hallregister og kursholderregister — to importjobber

161 ekte haller importert, redigerbar tabell. Kursholderregister: navn,
e-post, mobil, type (egen/ekstern), aktiv, merknad — 17 eksterne importert.

Den ekte importjobben (kontrollert mot kildefila 10. august):

1. **«Vanlig vertskap» og «Alternative haller» skal importeres.** Begge
   kolonnene finnes i kildefila `Hallregister_utkast_2.xlsx` (Vanlig vertskap
   utfylt på 141 av 161 rader, Alternative haller på 65), men ble ikke tatt
   med inn. Den første er særlig ergerlig: vertskap hukes i dag av manuelt,
   kurs for kurs — mens svaret lå i regnearket hele tiden. Importeres før pilot.
2. **Spøkelsesfeltene «adresse» og «pris» ryddes.** Redigeringsskjemaet har
   felt for `adresse` og `pris` (`AdminHaller.jsx`), men kildefila har HVERKEN
   av dem, og de står tomme. Planen har tidligere påstått at «pris er selve
   verdien i registeret» — det stemmer ikke: registeret handler om hvor
   (hovedhall, alternative haller, vertskap), ikke kostnad. **Besluttet
   10. august: haller trenger verken pris eller adresse — begge feltene
   fjernes fra skjemaet.**

Til info: hall-lista har allerede søk, og kursholderregisteret (17 eksterne)
er komplett.

### 8.6 Kortutdelingen (Camilla) — fra prototype til modul

Flyten er bekreftet av Kjartan og er spesifikasjonen:

1. Skolen svarer at de kommer med f.eks. **15 trivselsledere**.
2. Systemet foreslår **antall TL + 10 %, rundet opp = 17 kort**. Kontrollert
   i koden: `Math.ceil(15 × 1,1)` = 17 (`AdminKortutdeling.jsx:13`).
3. **Skolen ser aldri tallet.** Verken i svarskjemaet eller på
   kursinformasjonssiden. Det er en intern beskjed.
4. Tallet kan endre seg helt til kursdagen — **da fryses det: ved midnatt når
   kursdagen begynner.** Kursholder reiser med flere hundre kort og deler ut
   fortløpende, så leveransen trenger ikke tallet tidligere.
5. Camilla får raden i **sin egen liste under kulturkortbestillinger**.
6. **Camilla bestemmer:** fakturer / gratis / ikke ønsket. Systemet
   fakturerer aldri av seg selv — enkelte skoler skal ikke faktureres eller
   ønsker ikke kort i det hele tatt. Husregelen: systemet foreslår, mennesket
   bestemmer.
7. Kursholder ser samme tall på kursdagen og deler ut.

**Det som må bygges (prototypen mangler fire ting):**

1. **Lagring og frysing av tallet.** Feltet `antall_kort` har null kodetreff
   i `src/`, `api/` og `sql/` — tallet regnes i dag ut på skjermen hver gang.
   Det må lagres på kurs_skole-raden og fryses ved midnatt på kursdagen.
2. **Statusen «Ikke ønsket» mangler.** Prototypen har tre statuser: Ikke
   behandlet, Fakturer, Gratis. Det skal være fire — noen skoler ønsker
   ikke kort i det hele tatt, og da er «Gratis» feil svar. I samme jobb:
   håndteringen av skoler som ikke har oppgitt antall.
3. **To faner på ÉN side.** I dag er kulturkort-bestillinger og kortutdeling
   to atskilte sider i admin-menyen. Målet er to faner på samme side,
   som Camilla veksler mellom — menyteksten lover det allerede: «Se
   bestillinger og kortutdeling fra skoler» (`Admin.jsx:42`, lenken `:48`).
   Meningen var der; byggingen havnet et annet sted.
4. **Kryssjekken mot forhåndsbestillinger** — Camillas eget hovedkrav: en skole som allerede har bestilt kort på hjemmesiden skal ikke få
   kort to ganger. I dag må hun oppdage det ved å sammenligne to lister.
   Systemet vet begge deler.

Kursholderens visning på kursdagen — samme tall som Camilla ser — er selve
tidsbesparelsen og hører med i modulen. Prototypen (`AdminKortutdeling.jsx`,
150 linjer, i drift på `/admin/kortutdeling`) er utgangspunktet, ikke noe
som bygges fra bunnen. Tidfesting: pilot.

### 8.7 Avgrensning

Excel-eksport beholdes som trygghet i pilot, men dataene bor i basen.
Bevisst IKKE med til pilot (ligger i kapittel 17): kortutdelingens kryssjekk i full bredde, flytteforespørsel, kopier
kursplan i ekte forstand, purring der RA velger målgruppe, overstyrbar
mottaker per skole, og samlet oversikt over ubehandlede meldinger.

### 8.8 Sjekkliste før pilot

- [ ] Filterrad + eksport + sesong-rubrikk (8.4, punkt 1–2)
- [ ] Kortutdeling: lagring, frysing, statuser, én side (8.6)
- [ ] Import av «Vanlig vertskap» og «Alternative haller» (8.5)
- [ ] Sikkerhetspunktene i kapittel 9
- [ ] Full loop-test mot fasit (`TESTOPPDRAG-v32.md`)
- [ ] Demo-video spilles inn (manus i vedlegg C)
- [ ] Demo-innhold og testspor slettes (samme operasjon)
- [ ] `eivind_epost` satt, `motor_aktiv` etter plan, plassholdertekst
      «Utstyrspakker» i kursinfoteksten erstattet med Klubben-lenkene

---

## 9. Sikkerhet

**✅ FERDIG 9. august — se Vedlegg D.** Sikkerhetshullet i
`api/kurs`-endepunktene er lukket, pushet og bevist tett: endepunktet svarer
nå 401 / ikke autentisert i stedet for å gi ut skolenavn, mottakernavn og
e-post. CRON_SECRET er satt, og GitHub-tokenet er ryddet. Full logg i Vedlegg D.

**Gjenstår (flyttet hit fra 9.1-lista — fortsatt åpent):**

### 9.1 Roter API-nøklene (før pilot)

Fire skript i «Min nettside» har API-nøkler i klartekst
(`kulturkort_agent_v1.py`, `kulturkort_potensiell_agent.py`,
`skolesjef_agent_v5.py`, `skolesjef_sverige_repair.py`) — samme SerpAPI- og
Anthropic-nøkkel går igjen. Roter begge og sjekk om filene har vært committet.

### 9.2 To ting før pilot

- `hent_evalueringer_admin` er SECURITY DEFINER uten sjekk av hvem som spør.
  *På vanlig norsk: den henter alle evalueringssvar og spør aldri hvem som
  ber — betjenten i luka utleverer hele arkivet til hvem som helst som kjenner
  navnet. Alvorlig.*
- `scripts/seed-testbruker.sql` har hardkodet passord, trolig i
  Git-historikken. Bytt passord (å slette linjen hjelper ikke — historikken
  husker den).

### 9.3 RLS-gjennomgangen (før lansering, før den store dataimporten)

Det eldste åpne sikkerhetspunktet. Vanskeligere å stramme inn tilganger etter
at hundretusenvis av rader er inne enn før.

- `anon` har lese- og skriverett på `kurs_skole_mottaker`. *På vanlig norsk:
  tabellen med lærernes navn, e-post og personlige lenker står åpen for
  besøkende uten innlogging — også til å endres. Nødvendig for at læreren skal
  kunne svare uten innlogging, men en gyldig lenke bør bare gi tilgang til
  egen rad. Personopplysninger — også et GDPR-punkt.*
- De fire admin-endepunktene validerer kroppen FØR de sjekker innlogging;
  rekkefølgen bør snus (ingen slipper forbi, men en uinnlogget får vite om
  skjemaet var riktig). Supabase Pro daglige backups er på plass; endringslogg
  og slettevern bygges i kapittel 10.

---

## 10. Innholdsgrunnmuren — Fase 3: ressursbibliotek, søk og AI-assistent

*Den største byggejobben før lansering. Fagskatten flyttes fra dagens side
til den nye. Alt som gjelder innholdet står i dette kapitlet: søket,
Edalio-lærdommene, den redaksjonelle standarden, Ramsalt-leveransen, video
og Bunny.net, og vernene som må inn i datamodellen fra start. Råstoffet —
kartleggingene av dagens side — ligger i vedlegg C.*

### 10.1 Målbildet: to veier til innhold, én inngang

Mål: to veier til innhold, slått sammen til én inngang. Læreren skal kunne
beskrive en situasjon og få et konkret opplegg med kildekort, nye
trivselsledere skal få ferdig materiell, og alt skal være søkbart.

Den tekniske skissen (fra juni, bekreftet i hovedsak av Edalio-kartleggingen):

- **Modus A — strukturert søk:** tabell `ressurser` med filterfelt + rating.
  Ratingkolonnen muliggjør «Månedens/Ukas lek» på forsiden. *På vanlig norsk:
  en liste over alle lekene med en kolonne for terningkast — uten den
  kolonnen finnes ikke grunnlaget for «Månedens lek».*
- **Modus B — AI-assistenten:** tabell `innhold_biter` med pgvector (RAG —
  søk på mening), Edge Function, kildekort, hybrid søk. *På vanlig norsk: alt
  materiellet kuttes opp i småbiter og lagres slik at maskinen kan lete etter
  MENING og ikke bare etter ord. Når noen spør, finner den de få avsnittene i
  vårt eget materiell som handler om spørsmålet, og svarer bare ut fra dem —
  den dikter ikke, den siterer huset. Dette er også motoren under den senere
  Trivselsboten (kapittel 24): uten den kan boten ikke svare fra eget stoff
  med kildehenvisning.*

Kartleggingsfunnene som ligger til grunn (fra juni): Leker og Move it er
samme node-type i dagens system — Move it er 126 leker skilt via kategori, og
kan trygt slås sammen til én søkbar modul med «aktivitetstype»-felt. Aktiv
læring (atlu) har rikere mal (kompetansemål per trinn) og trenger egen
datamodell, men kan ligge i samme søkeinngang. Dokumenter er flettet inn i
aktivitetene som vedlegg — fil, dokument-node og kobling må migreres i én
operasjon. På ny side: ett sammenhengende system der en lek flyter fritt
mellom bibliotek, hjul og periodeplan (i dag isolerte øyer).

**AVGJORT: fulltekstsøk fra dag én, meningssøk etterpå.** Ordsøket
(Postgres FTS + pg_trgm) bygges inn i hyllene fra start — noen dagers arbeid
når det gjøres samtidig med at tabellene lages, og nesten gratis sammenlignet
med å ettermontere det i et fullt bibliotek (Edalios største anger).
Meningssøket (Modus B) legges på etterpå som eget steg.

**AVGJORT: Edalio og Trivselsleder er to ulike produkter.** Ingen delt
database. Edalio-kartleggingen brukes som lærdom og mønsterbibliotek (10.2 og
vedlegg C), ikke som felles innholdsbase — innholdsmodellen bygges for
Trivselsleder alene.

### 10.2 Edalio-funnene som styrer byggingen

Edalio er kartlagt (fullt i vedlegg C): samme tekniske stack, ti gjenbrukbare
mønstre. Fire av funnene MÅ avgjøres eller bygges inn FØR Fase 3-strukturen
— resten kan vente (de står i kapittel 23):

| # | Funn (nummer fra Edalio-listen i vedlegg C) | Hva det betyr på vanlig norsk |
|---|---|---|
| 2 | **Fulltekstsøk fra dag én** (Postgres FTS + pg_trgm) | Vanlig ordsøk som tåler skrivefeil og treffer mens du skriver. **Edalios største anger** er at de manglet dette i starten. |
| 4 | Strukturert instruktørnotat per aktivitet | Kursholderens notat får sin egen rubrikk, i stedet for å ligge nederst i beskrivelsen der ingen finner det igjen. |
| 5 | Flertrinns-tagging i datamodellen NÅ | Én lek kan passe både 4. og 7. trinn, med hver sin variant. Skal den kunne det, må det bygges inn fra start. |
| 9 | Hendelseslogging fra første utrulling | Registrer hva folk faktisk bruker. Edalio utsatte det og står nå uten grunnlag for å bestemme hva som skal være gratis og hva som skal koste. Vi har bruksloggen — den må dekke bibliotekbruk fra dag én. |

Edalios punkt 3 — Aktiv læring-malen bekrefter husets 8-punktsmal — er
innholdsmodell og hører til 10.3. De øvrige fem punktene (fasettert
bibliotek med levende tellere, «foreslå denne»-boks, faste svartyper, lukket
innsendingssløyfe, skolen som ekte entitet) er ting på skjermen, ikke i
grunnmuren, og kan komme etterpå (kapittel 23.6 og vedlegg C).

### 10.3 Redaksjonell standard — husets 8-punktsmal

Alle lekebeskrivelser skal ha åtte faste elementer i fast rekkefølge:

| # | Element | Merknad |
|---|---|---|
| 1 | Sted / antall / klassetrinn / utstyr | I egen boks øverst |
| 2 | Forberedelse | Kokebok-detaljert |
| 3 | Inndeling | Hvordan gruppene settes sammen |
| 4 | Utgangsposisjon | Hvor alle står når det starter |
| 5 | (For)målet | Hva man skal oppnå |
| 6 | Kronologi | Hva skjer, i rekkefølge |
| 7 | Regler | Inkludert sikkerhet |
| 8 | Variasjoner og kuriositeter | Tilpasninger og bakgrunn |

Beskrivelsene skal være visuelle og bruke barnevennlig språk.
KONSEKVENS: denne malen erstatter den Fable foreslo i dybdekartleggingen, vedlegg C.7
(Hensikt/Oppsett/Steg/Variasjoner/Tilpasning). Husets egen mal er bedre, mer detaljert, og allerede
innarbeidet blant de som skal bruke den. Den skal legges inn i Fase 3-datamodellen som
feltstruktur.

#### Terminologi

Besluttet av Kjartan, Vegard og Karoline: bruk «barn» eller «person» (eventuelt «spillere») i
lekebeskrivelser — IKKE «elev». Dette er første oppføring i terminologi-ordlisten (kapittel 22.7).

#### Metadata-i-fritekst — den største enkeltjobben

Viktig omtolkning: at Sted/Antall/Utstyr står som fet tekst i beskrivelsen for 761 av 868 leker er
IKKE slurv — det er punkt 1 i husets egen mal, altså en bevisst regel som er fulgt konsekvent. Det er
gode nyheter for importen: når mønsteret er bevisst og konsekvent, har parsingen noe forutsigbart å
treffe. Til gjengjeld må selve husregelen oppdateres når boksen genereres automatisk fra
databasefelt i stedet for å skrives for hånd.

Fra dybdekartleggingen: Sted/Antall/Utstyr står som fet tekst i
beskrivelses-HTML på 761 av 868 leker og må hentes ut til egne felter ved
migrering. *På vanlig norsk: i dagens system står «Sted: ute», «Antall:
10–30», «Utstyr: ball» inne i selve beskrivelsesteksten. For et menneske er
det helt lesbart. For et søkefelt er det usynlig — man kan ikke be systemet
om «alle leker ute for over 20 elever uten utstyr», fordi systemet ikke vet
at det står der. Jobben er å hente opplysningene ut av teksten og gi dem hver
sin plass, slik at de kan filtreres på. Mønsteret er likt nok til at maskinen
kan gjøre det meste, men det må kontrolleres. Dette er arbeidet som avgjør om
innholdet blir søkbart til 1. oktober.*

I samme jobb legges «egnet for»-merkingen inn (kapittel 1.3): et felt for
friminutt/kroppsøving/SFO/aktiv læring/FYSAK per lek, og «kan ledes av
elever».

#### Taksonomi-vask

Kompetansemål: 302 termer, ~61 dubletter i 21 grupper. Regel: velg lavest
tall i parentes ved dubletter, aldri slett. *På vanlig norsk: merkelappene
som sorterer innholdet er skrevet litt ulikt gjennom årene, så samme
merkelapp finnes i flere varianter. De må slås sammen — ellers deles
innholdet på varianter og halvparten blir usynlig i filteret. Ingenting
slettes.* Rydd taksonomien VED import, ikke manuelt etterpå — og FØR
oversettelse (kapittel 22), så man ikke betaler for å oversette dubletter.

### 10.4 Innholdet som skal inn

| Bank | Antall | Video | Nøkkelfiltre |
|---|---|---|---|
| Aktiviteter / Leker (inkl. Move it) | 868 | 178 | Kategori, Type/trinn, Utstyr, Målform |
| — herav Move it | 126 | 74 | Video, Kategori, Type, Utstyr, Målform |
| Aktiv læring (atlu) | 289 | 22 | Fag, Klassetrinn 1–10, Video, Målform |
| Dokumentbank | 537 | — | Type, Innhold, Fag, Målform |

Til orientering (migreres IKKE, se Fase 4): periodeplaner 10 426 · TL-hjul 1 792 · advantages 818.

**AVKLART 9.–10. august (fire av fem tall talt fra ekte Ramsalt-data,
26. juni-eksport):** leker **868**, dokumenter **537**, TL-hjul **1 792**,
periodeplaner **10 426** (pluss atlu 289, advantages 818; sum 14 777 noder).
Disse er nå skrevet inn konsekvent i planen. **Femte tall gjenstår:**
kulturkortpartnere (1 685 vs 714) ligger i Supabase og må telles der — se
kapittel 6, punkt 1. Merk: dette er tall fra utviklingsdatasettet; den skarpe
importen kjøres på fersk sluttleveranse fra Jon, og da telles de på nytt.

- TL-kort: digitalt kortgalleri, to sett, PDF-nedlasting for innloggede skoler.
- Trivselsboka: 7 trinnsider, 11 månedlige opplegg per trinn. Kun digital visning.
- Mediebibliotek: alle godkjente bilder i Supabase Storage med metadata, søkbart, kobles til PDF-generator (kapittel 11).
Kan erstatte ambisjonen om en felles grafikkmappe for Norge og Sverige (se kapittel 10.3).
- PDF-mekanismer: auto-generert per lek (Puppeteer) OG ekte opplastede filer (~1200 ferdige
lek-PDF-er i Dropbox-backup).
- Hver ressurs får knapper: «Legg til i periodeplan», «Legg til i TL-hjul», «Last ned som PDF».

**Barnehage:** kategorien og barnehage-lekene som
finnes på dagens side følger med i innholdsflyttingen som alt annet. Det
DIGITALE barnehagekonseptet (programforslaget med betalingsløsning) venter
til etter lansering — kapittel 23.

**Aktiv læring hentes hjem? (ÅPEN, kapittel 6 nr. 4):** 194 opplegg på
Aktiv læring-siden er husets egne leker foredlet. Om de kan hentes inn i
biblioteket, påvirker innholdsmengden. Avklares under importen.

#### Dropbox og grafikk

Marielles juli-oppdatering: Dropbox er omstrukturert. Ansatte, backup og databehandleravtale ligger
nå under «administrasjon». Grafikkmappen er ryddet på nytt, men den gamle grafikkmappen står
fortsatt igjen, og opprydding i sosiale medier pågår. Dette betyr at Dropbox-stiene i
rutinedokumentene kan være utdaterte og MÅ verifiseres før Fase 3 bruker dem (vedlegg C).
Et ønske går igjen både i rutinedokumentene og fra Marielle: en FELLES grafikkmappe for Norge og
Sverige. Det støtter Lag A-konvergensen (kapittel 22.5) — og mediebiblioteket i Supabase (kapittel 10.4) kan erstatte hele ambisjonen med noe bedre.

**ÅPEN (kapittel 6, nr. 3):** to versjoner av lagringsrutinen er i omløp
(hvilken mappe er master?), og Dropbox-stiene etter juli-omstruktureringen må
verifiseres FØR Dropbox brukes som hull-fyll i importen.

### 10.5 Ramsalt-leveransen og Jon — alt på ett sted

**Status:** full eksport mottatt, utpakket og verifisert. Fersk sluttleveranse
bestilles fra Jon i månedsskiftet august/september — samtidig varsles
innholdsfrys (10.9).

#### Import-prosessen

1. Motta og sortere. 2. Bygge «hyllene» — den store jobben, på størrelse med eller større enn
evaluering-modulen. 3. Importere via skript: bilder → Supabase, video → Bunny.net. 4. Kontrollere
og rydde. Prinsipp: rydd taksonomi ved import, ikke manuelt etterpå.
Anbefalt: ta ÉN bank først (Aktiviteter) hele veien, mål tiden. Se kapittel 10.9 for den besluttede
arbeidsformen (bygg på testdata før full import).

#### Leveransen i tall (verifisert)

33,72 GB, 36 426 filer, tre trygge kopier. Innhold: 14 777 noder + 1 038
taksonomitermer fordelt på ni innholdstyper — game 868, atlu 289, document
537, advantages 818, wheel 1 792, play_schedule 10 426, pluss page, quote og
facebook_post. Video: 439 filer = 26,99 GB. Viktig: dagens eksport er et
UTVIKLINGSDATASETT — den skarpe importen kjøres på fersk sluttleveranse.
Originalbilde-regelen (fra Jon): fjern `styles/<stilnavn>/public/`
fra stien for å finne originalen; finnes den ikke, brukes beste tilgjengelige
derivat og avviket logges.

#### Det tekniske nøkkelfunnet

fid→filsti-koblingen er bekreftet løst og parsbar automatisk: hver fil ligger
i `<div id="file-<fid>">` i feltet safe-value; regelen er å kutte alt før
`/sites/default/files/`. *På vanlig norsk: i eksporten står hvert vedlegg med
et internt nummer, og selve filnavnet ligger gjemt i en tekstklump. Vi har
funnet mønsteret som knytter nummer til fil, og det er likt hver gang —
derfor kan alle de 33 GB med filer kobles til riktig lek maskinelt, uten
håndarbeid. Uten dette mønsteret ville hele importen vært manuell.*

Øvrige funn fra dybdekartleggingen (hele rapporten i vedlegg C.7): atlu har
kompetansemål-felt, trinn og hierarkisk emneinndeling som game mangler; ~1200
ferdige lek-PDF-er ligger i Dropbox-backupen og kan gjenbrukes; grafikk-
originaler må verifiseres mot derivater ved import (finnes originalen ikke,
brukes derivat og avvik logges).

#### MÅ avklares med Jon FØR bestillingen (ÅPEN, kapittel 6 nr. 2)

- **Video-tallet:** eksporten inneholder 439 videofiler; dybdekartleggingen
  fant at 247 av 254 refererte lek-mp4 mangler i `Files/`. Avviket må
  forklares — hvilke filer er i bruk, og hva er de resterende?
- **Bildeoriginaler:** 103 av 105 wysiwyg-originaler mangler — kun
  styles-derivater finnes. Original eller beste tilgjengelige derivat?

### 10.6 Video og Bunny.net — alt på ett sted

**Valgt videovert: Bunny.net Stream.** Estimert kostnad ca. $6/mnd
ved normal bruk; tilgangslåsing innebygd via signerte lenker. Merk:
`CLAUDE.md` i prosjektmappa lister fortsatt «Vimeo Pro» og må oppdateres —
beslutningen står.

#### Bakgrunn: Vimeos prisendring i 2026

Båndbreddegrense 2 TB/mnd rammer hardt med 640 skoler. Innbygd-grense 30 GB rekker ikke for
et ~26 GB bibliotek. Båndbredde, ikke lagring, er den drivende kostnaden.

#### Faktisk videovolum

Ramsalt-zip: ~26 GB ren aktivitetsvideo, 439 filer. Dropbox-supplement: potensielt større, men mest
ikke aktivitetsvideo.

#### Kandidater og avveiing

| Kandidat | Styrke | Svakhet |
|---|---|---|
| Bunny.net Stream (VALGT) | Billigst per GB, innebygd spiller+CDN, signerte URL-er, EU-lagring | Ny leverandør i GDPR-bildet |
| Cloudflare Stream | Solid, god ytelse | Dyrere per GB |
| api.video | Sterkest GDPR-profil | Dyrere |
| Vimeo (Pro/høyere) | Ferdig spiller, kjent | 2026-prising rammer i skala |
| Supabase Storage | Allerede i stacken | Egress dyrt fort ved video |

#### Beslutningskriterier (brukt)

1. Pris ved faktisk volum/båndbredde. 2. Avspillingshastighet. 3. GDPR/personvern. 4.
Sikkerhet/tilgangskontroll. 5. Nedetid/driftssikkerhet. 6. Vedlikeholdsbyrde. 7. Internasjonal skalering.

#### Tilgangslåsing — konkret bruksbehov

Konkret behov: skolene ønsker
digitale nettverksmøter der opptaket er tilgjengelig i én uke og deretter slettes, av personvernhensyn
(kapittel 13.4). Bunny.nets signerte URL-er dekker dette direkte. Kravet er dermed reelt, ikke teoretisk
— og det henger sammen med webinar-modulen (kapittel 20).

#### Gjennomføring

Videoene flyttes fra egen server til Bunny.net Stream ved importen (steg 3 i
10.5). Praktisk gjennomføring: eget Cowork-oppdrag. Videoproduksjon av NYE
videoer (demo-video m.m.) står i vedlegg C sammen med manuset.

### 10.7 Vern som bygges inn i datamodellen fra start

På ny side skal ansatte redigere leker og dokumenter DIREKTE i grensesnittet og lagre — ingen
last-ned-endre-last-opp slik det er i dag. PDF genereres fra data og er dermed alltid oppdatert
automatisk. Dette er et stort salgspoeng overfor de ansatte: ett steg i stedet for fem.

#### Rettighetsmatrise (besluttet)

| Rolle | Hvem | Kan gjøre |
|---|---|---|
| Superadmin | Kjartan og Tommy | Alt, inkludert sletting og endring av taksonomi |
| Administrator | Ansatte | Redigere og arkivere innhold. IKKE slette. |
| HTLA / skolebruker | Hovedkontakt TL ved skolen | Kun egne ting (egen skoles hjul, planer, opplysninger) |
| Ansatt ved skolen | Øvrige TL-ansvarlige | Kun egne ting |

Kjerneprinsippet: sletting krever superadmin. Arkivering er ansattes trygge alternativ — innholdet
forsvinner fra visningen, men ikke fra basen. Det løser det praktiske behovet uten å gi bort det
farlige.

#### To vern som bygges samtidig

(a) En endringslogg: hvem endret hva, når. (b) En bekreftelse før sletting. Sammen løser disse to
det aller meste av uhell — man kan se nøyaktig hva som skjedde og rulle tilbake.

Dette gjør også den manuelle backup-rutinen overflødig: i dag laster de
ansatte ned hver endret aktivitet som PDF til en Dropbox-mappe med strenge
filnavnkrav. På ny side genereres PDF-en fra data og er alltid oppdatert —
kombinert med Supabase Pro daglige backups, endringsloggen og slettevernet
blir ny side TRYGGERE enn dagens løsning, som hviler på at én person husker
en manuell rutine. Viktig presisering: «det ligger i Supabase» er ikke
automatisk trygt mot egne feilslettinger — derfor er endringslogg og
slettevern nødvendige, ikke valgfrie. Den skrevne oppskriften på HVORDAN man
ruller tilbake når noe er galt, hører til hverdagsarket (kapittel 14.3).

#### Én mekanisme, tre behov

Rettighetsfeltene (denne seksjonen), backup-avviklingen (kapittel 10.7) og oversettelsenes
ferskhetsflagging (kapittel 10.8 og 22.7) bør designes som ÉN mekanisme i datamodellen, ikke tre separate.
Alle tre trenger å vite hvem som endret hva og når. Beslutningen må derfor være tatt før Fase 3-strukturen
bygges, siden feltene skal ligge i modellen fra start.

### 10.8 Flerspråk og multi-tenant — inn i modellen nå

Flerspråklig fra første rad: norsk fylles nå, svenske (og senere andre) tekstfelt finnes tomme fra start.
Multi-tenant-klar: «operatør/land»-felt på skole, bruker og kurs. Å legge inn ett ekstra felt nå er
nesten gratis; å rette det opp etter import av hundretusenvis av rader er dyrt.
*På vanlig norsk: én og samme løsning skal senere kunne drives av flere — Norge,
Sverige, Danmark, en internasjonal partner — uten at de ser hverandres data. Det
krever bare at hver skole, bruker og hvert kurs får et lite felt som sier hvem
det tilhører. Legges feltet inn nå, koster det nesten ingenting. Skal det inn
etter at flere hundre tusen rader er importert, må alt gås gjennom på nytt.
Dette er derfor en beslutning som må tas før dataimporten, ikke ved
lansering i utlandet.*

Selve oversettelsen (batch-jobb etter import) og resten av
internasjonaliseringen står i kapittel 22 — men FELTENE må finnes i modellen
fra start: norsk fylles nå, svenske og andre tekstfelt står tomme, og hver
oversettelse får et ferskhetsflagg som automatisk settes til «utdatert» når
den norske originalen endres (samme mekanisme som 10.7).

### 10.9 Arbeidsform: bygg på testdata, frys innholdet sent

#### Fire steg (grove anslag)

1. Sortere/forstå dataene — mye er gjort (vedlegg C og kapittel 10.2/10.3). Gjenstår: de to media-sprikene
avklares med Jon. Anslag: dager.
2. Bygge «hyllene» (strukturen/datamodellen) — tabeller, felter, taksonomi, filtre, maler. Dette er den
STØRSTE jobben i hele Fase 3. Her bygges også fulltekstsøk (10.2), husets 8-punktsmal
(kapittel 10.3), «egnet for»-merking (kapittel 1.3), «kan ledes av elever» (kapittel 10.3), rettighetsfeltene (10.7)
og flerspråk-laget (10.8) fra start. Anslag: 1–2 uker+.
3. Importere via skript — tekst/metadata parses inn, bilder → Supabase, video → Bunny.net. Kjøres
på FERSK eksport fra Jon. Anslag: dager når skriptet er ferdig.
4. Rydde/kvalitetssikre. Anslag: dager.

#### Testdata først

1. Bygg strukturen med en liten testmengde — 10–20 leker, nok til å se at «hyllene» fungerer. 2.
Bygg TL-hjulet og Periodeplanen oppå den strukturen mens den bare har testdata. 3. Når struktur og
verktøy flyter: kjør full import på fersk eksport.
Fordelen: finnes det en feil i datamodellen, rettes den mens det bare er 15 leker inne — ikke etter at
868 er importert.
Presisering: Fase 4-verktøyene blokkerer IKKE importen. Strukturen bevist på testdata
er tilstrekkelig; verktøyene peker bare på leker. Men verktøyene MÅ være ferdige til lansering
(kapittel 11). De to tingene er altså begge sanne: importen kan kjøres før verktøyene er ferdige,
men lanseringen kan ikke.

#### Innholdsfrys — beskjed til de ansatte

De ansatte kan jobbe FRITT på gammel side akkurat nå — innholdet importeres uansett fra en fersk
eksport senere. Stoppbeskjeden kommer først når Jon tar den endelige eksporten (månedsskiftet
august/september). Fra det øyeblikket til ny side er live: ikke last opp eller endre på gammel side,
ellers jager man et bevegelig mål. Kjartan varsler frysen når sluttleveransen bestilles.

---

## 11. Fase 4 — de interaktive verktøyene

*Bygges helt på nytt, oppå Fase 3-strukturen mens den bare har testdata
(10.9). Verktøyene blokkerer ikke importen — men de MÅ være ferdige til
lansering.*

Besluttet: TL-hjul (1 792) og periodeplaner (10 426) migreres IKKE. Verktøyene bygges
helt på nytt, tomme. Skolene varsles via nyhetsbrev før lansering om å laste ned egne
hjul/periodeplaner lokalt. «Maler = lær, ikke arv.» Datamodellen er enkel — både hjul og periodeplan
lagrer bare PEKERE til leker, ikke kopier.
Besluttet: Fase 4-verktøyene MÅ være klare til lansering — TL-hjulet og
Periodeplanen står derfor i «må til lansering» i kapittel 7.

### 11.1 TL-hjulet — slik blir det betraktelig bedre enn dagens

**Til lansering:**

1. **Mye enklere å bygge:** lek-velger med filter og avhuking, dra
   rekkefølgen, se hjulet live mens du bygger — mot dagens tungvinte løsning.
   Opprett nytt med tittel, skole, kakestykker (leker), rotasjoner og
   skriftstørrelse.
2. **Alt henger sammen:** legg en lek i hjulet rett fra biblioteket
   («Legg til i TL-hjul», kapittel 10). Hjulet lagrer pekere til lekene —
   beskrivelse, video og PDF er dermed alltid oppdatert, og en lek flyter
   fritt mellom bibliotek, hjul og periodeplan (i dag isolerte øyer).
3. **Vinner-øyeblikket:** lekens navn + bilde, «Spill video»-knapp og PDF i
   pen visning.
4. **Virker overalt:** mobil, nettbrett, smartboard og skjermleser — bort fra
   dagens canvas-only.
5. **«Mine hjul» på Min side:** flere hjul per skole, gi nytt navn, kopier
   til nytt semester, arkiver, sorter — lett å flytte og ordne i egen
   oversikt.

**Etter lansering (kapittel 23.3):**

6. **Dele hjul med naboskole** — bygges sammen med periodeplan-delingen som
   ÉN delingsfunksjon.
7. **Tavle-modus:** flere redigerer samtidig; send dag/uke fra periodeplanen
   inn i hjulet.

### 11.2 Periodeplanen — slik blir den betraktelig bedre enn dagens

**Til lansering:**

1. **Ekte kalender, ikke fritekst:** velg uker og datoer i en kalender —
   mot dagens løsning der alt skrives inn for hånd.
2. **Årsplan i én operasjon:** sett opp rotasjon/mal én gang og generer hele
   skoleåret — systemet hopper automatisk over ferier. Mot dagens uke-for-uke.
3. **Strukturerte felt:** sted/lokasjon, ansvarlige TL-elever fra skolens
   egen liste, automatisk lekebilde — i stedet for at alt står i én tekstboks.
4. **Alt henger sammen:** legg en lek i planen rett fra biblioteket
   («Legg til i periodeplan», kapittel 10). Planen lagrer pekere til lekene,
   så beskrivelse, bilde og video alltid er oppdatert. Auto-genererte
   ikoner/bilder per lek.
5. **Smart lek-forslag:** forslag basert på trinn, sesong, inne/ute, vær,
   utstyr og nylig brukt — planen hjelper til i stedet for å være et tomt ark.
6. **«Mine planer» på Min side:** flere planer per skole, gi nytt navn,
   kopier til nytt semester eller skoleår, arkiver, sorter — lett å flytte
   og ordne i egen oversikt, akkurat som hjulene (11.1).
7. **PDF som virker:** liggende/stående, forhåndsvisning, «del lenke».

**Etter lansering (kapittel 23.3):**

8. **Dele planer med naboskole** — samme delingsfunksjon som TL-hjulene.
   Husk personvernet: en periodeplan kan inneholde elevnavn, så persondata
   strippes eller varsles før deling.
9. **Tavle-modus:** flere redigerer samtidig; send dag/uke fra planen inn i
   TL-hjulet.

### 11.3 PDF-generator lekekurshefte

Velg 10–12 leker → auto-generer hefte med forside, innholdsfortegnelse, sidetall.
Puppeteer/Playwright på Vercel.

Dagens periodeplaner (10 426) og TL-hjul (1 792) migreres IKKE som innhold —
verktøyene bygges nye, og skolene lager nye planer i dem. Deling av
periodeplaner mellom skoler er et etter-lansering-punkt (kapittel 23).

---

## 12. Stor dataimport og databasens oppskrift

*Mot slutten av løpet, etter at innholdsgrunnmuren står: alle skoler, ansatte
og nettverk inn — og forutsetningen som må være på plass FØR det skjer.*

### 12.1 Selve importen

- Alle skoler i skoleregisteret (640 aktive, 1400+ totalt) + alle
  ansatte/RA-er + nettverk-koblinger.
- Grunnmuren mange andre ting venter på: RA-som-kursholder-kobling, RA-navn
  som e-postavsender, fullt ledelsesdashboard (kapittel 18).
- RA som kursholder: koble fast ansatte RA-er inn som default kursholder per
  nettverk. kursholdere-tabellen har type-felt klart. Merk: nettverk→RA-
  autofyll fyller i dag tekst, ikke kursholder-kobling — ingen fast
  RA-default ennå.
- Multi-tenant-feltet («operatør/land», 10.8) skal være i modellen FØR denne
  importen.
- HubSpot-synk P2 (ny skole godkjennes → opprettes automatisk som Company)
  bygges her — og kjøres ALLER SIST.
- KRITISK: ALDRI skole-import mot live HubSpot før alt er testet.

### 12.2 Forutsetning: databasens oppskrift må være komplett

I dag finnes én mappe, `supabase/migrations`, med seksten filer nummerert
001–016. Det er alt som finnes, og de stopper i juni — ingen av
kursplanleggerens tabeller er med, og bare 2 av 8 databasefunksjoner. *På
vanlig norsk: databasen kan ikke bygges opp igjen fra prosjektfilene hvis
den går tapt — og et testmiljø kan heller ikke lages uten oppskriften. Dette
er ikke en teknisk detalj; det er forskjellen på om innholdsarbeidet kan
gjenskapes eller er tapt.* Oppskriften kompletteres FØR den store
dataimporten — og grunnen til at NÅ er riktig tidspunkt: i dag inneholder
basen testdata, så oppskriften kan BEVISES ved å bygge en kopi og
sammenligne. Etter importen av 2 456 rektorer og ekte skolesvar er samme
øvelse tyngre og mer risikabel — og oppskriften vokser for hver ny tabell
som lages. (Katastrofetilfellet er dekket av Supabase-backupene; oppskriften
handler om å kunne BYGGE, ikke bare gjenopprette.) Den er også forutsetningen for testmiljøet etter lansering
(kapittel 16).

Samtidig ryddes utviklingsmiljøets nivå 1 (fra kapittel 16): dagens
Vercel-oppsett har alt som trengs for trygg utprøving — det koster ingenting
og krever bare disiplin: testsiden trivselsleder-ny.vercel.app beholdes som
fast øvingsplass også etter lansering.

### 12.3 Datagrunnlag som må begynne å samles NÅ

Et dashbord bygges på historikk, og historikk kan ikke lages i ettertid —
klokka går fra første ekte skole. *På vanlig norsk: uten disse
registreringene kan dashbordet aldri vise vekst eller frafall over tid, bare
hvordan det ser ut akkurat i dag.* Tre ting legges derfor inn allerede fra
pilot, selv om dashbordet selv venter (kapittel 18):

1. **Statushistorikk for skoler:** når en skole bytter status (Aktiv → Pause
   → Tidligere osv.), lagres endringen med dato — i dag overskrives den, så
   det finnes ingen historikk. (Merk: avvis-flyten satte tidligere skoler til
   «Inaktiv»; det
   ble fjernet 9. august — se Vedlegg D. Statushistorikken bygges på de seks
   offisielle statusene: Påmeldt · Aktiv · Aktiv sagt opp · Pause · Tidligere ·
   Potensielle.)
2. **Frafallsvarslene lagres:** churn-flaggingen viser i dag bare dagens
   bilde (`hent_churn_oversikt` regner ut nå-tall, ikke utvikling). Løsning:
   lagre en linje hver gang et varsel utløses, så utviklingen kan leses
   senere.
3. **Ikke tøm det som allerede logges:** `brukslogg` og `epost_logg` er
   grunnmuren for all senere statistikk. Ved oppryddingen før pilot slettes
   testdataene — men tabellene og rutinen står. Merk også: `useBrukslogg.js`
   logger bare innloggede (`if (!bruker?.id) return`), så anonyme
   sidevisninger telles ikke — greit å vite når tallene leses.


## 13. Forside, design og Evidence-siden

*Kjøres parallelt med Fase 3 og 4 i høst. Rammen er 60-minuttersmålet
(kapittel 1.3): kurs og bibliotek vises som ETT program, én reise gjennom
skoledagen.*

### 13.1 Forside (planlagt, ikke bygget)

Hero med bildecollage + overskrift. Ikonkort: trivsel, inkludering, læringsro, lederskap. CTA «Meld
skolen på». Se også rullerende forside-idé (kapittel 23.1).

### 13.2 Designarbeidsmåte

Bruk Claude Design til forside, menystruktur/faner og undersider. Bygg «skallet» tomt FØRST, fyll
innhold etterpå. Merkefarger oransje #F47920, magenta #D6006E.

### 13.3 Fem hjemmeside-råd fra konkurrentkartleggingen

1. Vis EFFEKT med konkrete tall: eget «Evidence»-menypunkt. 640 skoler, 350 000+ elever. 2. Pakk
kurs + bibliotek som ETT program: vis hele reisen visuelt. 3. Transparent, enkel pris + gratis
prøve/kickstart. 4. Anerkjennelse og akkreditering: «sertifisert Trivselsleder-skole», elevbadges,
CPD-videoer. 5. Sterk søk/filter + gratis smakebiter.
Punkt 1 og 5 er høyest prioritert. Punkt 5 bekreftes uavhengig av både Edalio-kartleggingen (vedlegg C) og skolenes egne tilbakemeldinger (kapittel 13.4) — «hjemmesiden er vanskelig å bruke» er en
gjenganger.

### 13.4 Det skolene selv har bedt om

Skolenes egne tilbakemeldinger 2023–2024 er kartlagt (fullt i vedlegg C).
Det som styrer designet:

- Sortering på trinn og målgruppe.
- Sortering på antall deltakere (50–100+).
- Søk på sesong og semester.
- Bilde av forsiden på opplegg.
- «Hjemmesiden er vanskelig å bruke» — gjenganger, og bekrefter designrådet om sterk søk og
filtrering (kapittel 13.3).
- Turneringsskjema i dokumentbanken.

**Innholdshull bekreftet av to uavhengige kilder** (skolene selv og
dybdekartleggingen): samarbeidsleker, vinterleker og leker for nordlige
forhold, bli-kjent-leker, enkle kom-og-gå-leker, og tips til trivselslederne
selv. Dybdekartleggingen la til: rolige/regulerende aktiviteter,
tilpasning/inkludering som fast felt, leker for 1–2 deltakere,
tradisjonsleker, selvstyrte stasjonsleker og natur-/uteskoleleker.
Prioriteringen er dermed enkel.

**Det STØRSTE udekkede ønsket** — gjentatt både i 2023 og 2024: en bank med
STRATEGIER, ORGANISERING og LOGISTIKK for TL-drift, differensiert etter
skolestørrelse. Hvordan organiserer man TL på en liten, mellomstor eller
stor skole? Hva er voksenrollen? Effektive TL-møter? Motivasjon over tid?
Utstyrslagring? Rektors rolle? Dette innholdet finnes ikke i planen som egen
oppgave i dag — men samme innholdsaktivum mater tre ting samtidig: dette
ønsket, den senere Trivselsboten (kapittel 24) og en eventuell
franchise-håndbok (kapittel 22). Å skrive det én gang løser tre behov — og
det er 17 års taus kunnskap som uansett bør skrives ned mens den finnes i
hodene til folk.

Ønsket om digitale nettverksmøter med utløpende opptak er dekket av
Bunny.net-valget (10.6) og hører til webinar-modulen (kapittel 20).

### 13.5 Evidence-siden

Råstoffet er kartlagt (~30 offentlige omtaler, fullt i vedlegg C). Kjernen:
DNV GL-analysen 2017 (67 skoler/11 562 elever: 85 %+ mindre mobbing, 90 %+
fornyer), Harvard GSE-profilen (350 000+ elever, 1 300 skoler), Ashoka
Fellow, NRK «Årets pøbel», masteroppgaven i spes.ped 2021. Kritisk side å
kjenne: Udirs kunnskapsoversikt sier «ikke eksternt evaluert» — motsvares av
DNV GL + masteroppgaven, men vær presis.

**Hjemmelekser (Kjartan):** skaff DNV GL-rapporten i original, finn
masteroppgavens forfatter/arkivreferanse, skaff ASK-studien (kapittel 1.3).

Seks ferdige datasett fra juni ligger klare som råstoff (900 potensielle
kulturkort-partnere, 176 med gjenfunnet kontaktinfo, 2 456 rektorer, 337
skolesjefer, 156 svenske rektoravvik, 141 vertskapsoppføringer) — bruk og
kvalitetskontroll er beskrevet der de skal brukes (kapittel 8, 12 og 17).
Aktive brukere-eksporten fra gammel side (15.08.2025–30.06.2026) står i kø
som Cowork-oppdrag og gir tall til både Evidence og churn-grunnlaget.

---

## 14. Lansering

*Siste kapittel før 1. oktober: lovkrav, tilgjengelighet, Feide, DNS — og
menneskene som skal drifte siden.*

### 14.1 Tilgjengelighet (WCAG 2.1 AA)

Gjennomgang av alle sider: alt-tekst, tastaturnavigasjon, kontrastforhold, skjermleser-kompatibilitet.
Publisere tilgjengelighetserklæring.

### 14.2 GDPR — lovkravene

DPA med Supabase, Vercel og Resend. Personvernerklæring. Rutine for sletting av brukerdata ved
avtaleopphør. Cookie-banner. Notat om e-posthåndtering i personvernvurderingen — særlig aktuelt
nå som systemet sender selv (kapittel 5.8). Moms på digitale tjenester Norge→Island sjekkes med
regnskapsfører.

Tre lovkrav til i samme sjekkliste:

- **Kryptering av data ved lagring** (mangler i dagens løsning — må inn i ny).
- **Automatisert sletting av brukere ved oppsigelse.**
- **Ny databehandleravtale som lister korrekte underleverandører** — i dag:
  Vercel, Supabase, Resend, Bunny.net. (ÅPEN, kapittel 6 nr. 6:
  DPA-avkrysningen.)

### 14.3 Hverdagsark og tilbakerulling — skrives NÅ, brukes fra pilot

Én side for de ansatte: slik endrer du en tekst, slik ser du resultatet før
du sender, slik får du tilbake det som sto der før. Marielle og Ylva
redigerer allerede i «Tekster og maler» — behovet er der nå, ikke ved
lansering. Det finnes ingen bruksanvisning noe sted i dag.

Tilbakerullingen hører til hverdagsarket: selve MULIGHETEN er dekket teknisk
(endringslogg og slettevern, 10.7; Supabase-backups), men den skrevne
oppskriften — hva du som eier faktisk gjør, steg for steg, når noe er blitt
feil — mangler helt. Uten et skrevet ark er ikke prinsippet «uavhengig av én
person» (3.2) sant: da er svaret på «hvordan endrer jeg dette?» fortsatt
«spør Kjartan».

Presisering om staging: det finnes ikke noe eget staging-oppsett. Testsiden
`trivselsleder-ny.vercel.app` ER staging-miljøet, og det er sannsynligvis
godt nok — planen skal si det som er. Utviklingsmiljø med egen testdatabase:
kapittel 16.

### 14.4 Feide, DNS og teknisk lansering

Feide-aktivering i produksjon. DNS-overgang fra Drupal (gammel side beholdes
som fallback). AI-agenttesting: automatiserte testpersonas. Husk å bytte
`nettsted_url` i innstillinger-tabellen ved lansering.

### 14.5 E-post og domener ved lansering

- De fire konto-e-postene bygger lenker med fast domene, ikke
  `nettsted_url` — glemt-passord sender i dag brukeren til gamle
  trivselsleder.no.
- Fotlenken i alle e-poster peker på gamle trivselsleder.no.
- `nettsted_url` settes til trivselsleder.no ved lansering.
- Sjekk at kurs@trivselsleder.no fortsatt er i bruk (adressen kom fra en
  QuestBack-tekst og kan være gammel).

### 14.6 Overlevering — «Drift etter Kjartan»

Hvem tar teknisk ansvar? README-fil, veiledning for ansatte, veiledning for teknisk videreutvikling. (ÅPEN, kapittel 6 nr. 5: hvem tar teknisk ansvar?)

---

# DEL 3 — ETTER LANSERING

*I prioritert rekkefølge: kapittel 15 er første jobb etter lansering,
visjonene står sist. Ingenting her skal bekymre noen før 1. oktober — men
alt her er bevisst plassert, ikke glemt.*


## 15. Svensk side — første prioritet etter lansering

Samme Drupal-installasjon som norsk. Fremtidig struktur skal være lik for begge land — én side
med språk-switch, ikke to separate. Rekkefølge: norsk lansering først → stabiliser → konverter til
svensk. Ramsalt-pris: ca. 4 timer.
Avvik som må hensyntas i ny datamodell (Lag B per land): trinn (Norge 1–10 vs. Sverige Förskola/F-
3/4-6/7-9), læreplan (LK20 vs. Lgr22), fagstruktur, blandet NO+SE topic-taksonomi i dag,
sted/antall/utstyr som fritekst.

Gjenstår i kartleggings-sporet: skolesjef-agenten for Sverige har ~3040
SerpAPI-søk igjen (den svenske skolesjefbasen dekker i dag 29 av 276
kommuner). ÅPEN (kapittel 6, nr. 7): avvikene i Lag B håndteres når
konverteringen planlegges.

## 16. Utviklingsmiljø — nivå 2 og 3

Nivå 1 (testsiden som fast øvingsplass) er gratis og etableres før lansering
(kapittel 12). Etter lansering kommer neste nivå: en EGEN testdatabase, slik
at nye moduler — en trivselsundersøkelse, en Stripe-modul — kan bygges og
prøves i ro og fred, helt atskilt fra siden som skolene bruker.

*På vanlig norsk: nettsiden er den enkle halvparten — Vercel kan lage en egen
adresse for hver ting som bygges, uten at noen andre ser den. Databasen er
den vanskelige halvparten: en test-database må BYGGES fra en oppskrift, og
oppskriften må være komplett først (kapittel 12.2).*

| Nivå | Hva | Når |
|---|---|---|
| 1 | **Egen arbeidsgren.** Ny modul bygges på egen gren og får sin egen adresse automatisk. Databasen deles fortsatt — duger til skjermbilder og utseende, ikke til noe som skriver data. Prosjektet har i dag bare én arbeidsgren. | Kan tas i bruk ved behov. Ingen forberedelse, ingen kostnad. |
| 2 | **Egen testdatabase.** Et eget Supabase-prosjekt ved siden av. Testmiljøet er da helt frikoblet: ekte skoler kan ikke røres uansett hvor mye man roter. **Dette er målet.** | Før første modul bygges ETTER lansering. Ikke før lansering. Koster ekstra per måned. |
| 3 | Full kopi av produksjonsdata som øves mot | Ved behov, senere |

Hvorfor dette betyr noe: etter lansering skriver systemet ekte data — en
feil i en betalingsmodul er ikke en skrivefeil, det er en faktura. Å bygge
nye moduler rett i produksjon etter lansering er å pusse opp kjøkkenet mens
middagen serveres.

## 17. Kursplanlegger-utvidelser

Alt her er bevisst utsatt fra kapittel 8, i denne rekkefølgen:

1. **Kursholderkalender (mulig — behov ikke avklart, kapittel 6 nr. 8).**
   Kursholder logger inn og ser kun egne kurs med all relevant info. KRAV
   fra start hvis den bygges: **sensitiv info (deltakerliste, betaling,
   instruksjoner) kun synlig for kursholder og admin.** Valgfri Google
   Kalender-synk. *Hvorfor kravet ikke kan strykes: mange kursholdere er
   eksterne — 17 er importert. De trenger dato, hall, skolenavn, oppmøtetid
   og antall. De trenger ikke navnelister over kontaktpersoner ved andre
   skoler, og ikke å vite hva skolen betaler. Slik avgrensning må ligge i
   oppbyggingen fra start; den er dyr å ettermontere. Ingen risiko i dag:
   rollen «kursholder» finnes ikke i systemet ennå.*
2. **Automatisk utsending til potensielle skoler.** To ganger i året (mai +
   november): potensielle skoler i TL-kommuner får invitasjon med kursdato.
   FØR første utsending: rektorlisten (2 456 adresser) kontrolleres manuelt —
   21 % har lav eller feil konfidens (314 merket «feil» + 199 «lav»).
3. **Kalendervisning i kursoversikten** («liste eller kalender», kapittel 8).
4. **Flytteforespørsel i full bredde** med kapasitet synlig (`maks_antall`),
   og kopier kursplan i EKTE forstand (hele planen vår→vår med
   skolekoblinger, oppsagte markert, nye foreslått geografisk).
5. **Purring der RA velger målgruppe** (alle egne ubesvarte / ett kurs / ett
   område), overstyrbar mottaker per skole, samlet oversikt over ubehandlede
   meldinger, og eksport av SVARENE (kursoversikt-eksporten bygges til
   pilot, kapittel 8; svar-eksporten kommer her).
6. **Tre eldre krav:** «Min
   påmelding» — skolen ser og endrer egen påmelding selv; automatisk
   bekreftelsesmail med kurshefte ved ja-svar; oppfølgingsmail dagen etter
   kurset (vurderes mot evalueringsmailen som alt går ut kl. 13:30 samme
   dag, så skolene ikke får to).

## 18. Ledelse og økonomi

I prioritert rekkefølge når dette tas opp igjen (datagrunnlaget begynner å
samles allerede før lansering — kapittel 12.3):

### 18.1 Churn trinn 3

Claude API vurderer hvert nei-svar (oppsigelsessignal ja/nei/kanskje + begrunnelse). Ekte
tilbakekoblingssløyfe.

### 18.2 Fullt ledelsesdashboard

Egen senere økt. Det som fortsatt mangler:
svarprosent på tvers (i dag 54–67 % per RA), alle churn-signaler samlet,
status per region. Dashbordet bygges på statushistorikken og
frafallsloggen fra kapittel 12.3 — registreringen begynner derfor før
lansering, mens visningen venter.

### 18.3 Kobling til RA-ens playbook

RA-arbeidsinstruksen (kapittel 4.2) beskriver en fast «aktiv sagt opp»-playbook med konkrete
kampanjer: utstyrspakke, Trivselsboka, år uten programavgift. Churn-flaggingen bør mate denne
playbooken direkte — det er lite verdt å oppdage et signal hvis ingen handling utløses. Dette er en
liten kobling å bygge når Ledelse-siden utvides, men den gjør forskjellen mellom en rapport og et
verktøy.

### 18.4 Tripletex og kontraktfeltene på skolekortet

Mål: økonomioversikt og automatisering — bygges etter lansering. Tre deler
som hører sammen:

- Kontraktinfo fra HubSpot på skolekortet: **startdato, årsbeløp,
  kontraktsperiode**.
- **Tripletex-integrasjon:** ny skole opprettes automatisk som kunde via API.
- Ledelsesdashboard (Tommy/Kjartan): kontraktsverdi, geografi, churn, vekst
  (18.2).

*På vanlig norsk: når dere godkjenner en ny skole på nettsiden, dukker den
opp som kunde i Tripletex av seg selv, så Camilla slipper å taste den inn en
gang til. Og skolekortet viser kontraktens startdato, årsbeløp og periode.*
Ingenting av dette er bygget ennå. De tre linjene hører
sammen: økonomitallene i dashbordet (18.2) kommer fra kontraktfeltene og
Tripletex — uten dem har dashbordet ingenting å vise.

---

## 19. CRM — HubSpot-avløseren

Ingen panikk, ingen beslutning — en retning. Kunnskapsgrunnlaget er komplett
(HubSpot-kartleggingen 8B-1 + 8B-2).

### 19.1 Potensial

HubSpot koster ~150 000 kr/år. Samlet besparelse på sikt (Ramsalt + HubSpot + QuestBack) ≈ 500
000 kr/år.

### 19.2 Hva HubSpot faktisk inneholder

| Objekt | Antall | Merknad |
|---|---|---|
| Kontakter | 18 464 | NO+SE blandet. 269 egenskaper. |
| Selskaper | 9 058 | Skoler/barnehager/kommuner. 223 egenskaper. |
| — herav Potensielle | 6 097 | Prospekter. |
| — herav Aktiv | 1 830 | Aktive kunder. |
| Deals (avtaler) | 410 | 4 pipelines. |
| Leads | 1 955 | Egen prospekterings-pipeline, aktivt brukt. |

Viktig korreksjon: «Salg TL»-pipelinen er aktivt brukt med 409 ferske avtaler — særlig av svensk
team.

### 19.3 Dobbeltarbeid og hull

| Funksjon | Vurdering |
|---|---|
| Skole-/kunderegister + status | Overlapp — nær identisk modell begge steder |
| Kontaktpersoner / brukere | Overlapp — HubSpot bredere |
| Fakturadata + kontrakt | Overlapp — HubSpot er master |
| Nettverk/klynger + kulturkort-avtaler | Kun nettside |
| Salgs-pipeline/deals med verdi | Kun HubSpot (hull) |
| Aktivitetslogg / e-postsporing | Kun HubSpot (hull) — navlestrengen |
| Leads-prospektering i skala | Mest HubSpot |

### 19.4 Den ene knuten: e-postsporing

Gmail koblet for 9 brukere via HubSpot Sales-utvidelsen — logges automatisk med åpne/klikk.
Resend dekker utgående sending, men kan ikke automatisk logge 1:1 Gmail-korrespondanse på
riktig kontakt — det er HubSpots kjerneverdi og vanskeligst å gjenskape.
RA-arbeidsinstruksen slår fast at ALLE henvendelser skal loggføres i HubSpot. Det
er altså ikke bare en teknisk finesse — det er en arbeidsinstruks. Knuten er dermed reell og må
løses ordentlig hvis HubSpot en gang skal erstattes.

### 19.5 Nyhetsbrev, segmentering og automatisering

Nyhetsbrev brukes aktivt: 84 e-poster, ~7 500 sendt/mnd. Segmentering: 45 dynamiske lister.
Workflows (17, brukes) vs Sequences (7, brukes nesten ikke — kan droppes). Det finnes allerede en
«Nettside CRM-synk» aktiv.

Nyhetsbrev og nettverks-e-post hører til her: sende e-post direkte til
utvalg/nettverk av skoler — erstatter manuell Gmail-kopiering.
HubSpot-kartleggingen bekreftet at nyhetsbrev faktisk sendes via Marketing
Hub i dag (Eivind, Marielle, svensk team) — en reell funksjon å erstatte.
Resend Broadcasts er naturlig kandidat. Lovkrav som følger med:
**avmeldingshåndtering.**

### 19.6 Erstattbarhet per funksjon

| Funksjon | Vanskelighet |
|---|---|
| Sekvenser | Triviell |
| Dashboards/rapporter | Lav |
| Segmentering / «velg utvalg» | Lav–middels |
| Nyhetsbrev/utsendinger | Middels |
| Workflows (sync/GDPR) | Middels |
| DealBuilder | Middels–høy |
| E-postsporing / aktivitetsstrøm | Høy |

### 19.7 Trygg overgang (fire steg)

1. Nå: fullfør ny side. 2. Flytt det lette først: nyhetsbrev + segmentering. 3. Parallell drift en periode.
4. Kutt HubSpot først når vi er trygge.

### 19.8 CRM-krav som hører hjemme her

`Gml/CRM ny hjemmeside_flatten.pdf` krever blant annet: et notatfelt per
skole, at e-post sendt fra ny side lagres automatisk på skolekortet, og at
DealBuilder sender kontrakten rett til ny side i stedet for HubSpot.

## 20. Webinar-modulen

Anbefaling: bygg som EGEN liten modul («Webinarer»), ikke som underfane i kursplanleggeren.
Gjenbruker kjente byggeklosser. Å avklare: åpen/lukket påmelding? Bare samle, eller også sende
lenke/påminnelser?
RA-arbeidsinstruksen (kapittel 4.2) viser at webinarer er en FAST plikt for
regionansvarlige, ikke en sporadisk aktivitet. Modulen er dermed et reelt behov, ikke en mulighet. I
tillegg ønsker skolene digitale nettverksmøter med opptak tilgjengelig i én uke før sletting av
personvernhensyn — det er et konkret krav om utløpende videolenker (kapittel 10.6).

ÅPEN (kapittel 6, nr. 9): åpen eller lukket påmelding — og skal modulen
bare samle påmeldinger, eller også sende lenke og påminnelser?

## 21. Trivselsundersøkelsen

Anonym, kvalitetssikret elevundersøkelse i samarbeid med Olweus-programmet og Bergen-forskere.
23 spørsmål om trivsel, friminutt, mobbing og TL-rollen. Domenet trivselsundersokelsen.no er
registrert. Kun for medlemsskoler.

### 21.1 Spørsmålsstruktur

Sp. 6–14: trivsel på skolen/klassen/friminutt/aktivitet/venner. Sp. 15–19: inkludering, ensomhet,
mobbing, krangling. Sp. 20–21: TL-atferd. Sp. 23.1–23.6: TL-effekter.

### 21.2 Funksjonalitet

Kun tilgjengelig for innloggede lærere på medlemsskoler. Elevene svarer anonymt via engangskode.
TL får kun aggregerte tall. Longitudinell visning år for år.

### 21.3 GDPR-hensyn

Elevdata anonymiseres fullstendig. Skolen er behandlingsansvarlig. Krever juridisk vurdering.

*På vanlig norsk: «behandlingsansvarlig» er den som etter loven bestemmer hvorfor
og hvordan personopplysninger brukes — og som bærer ansvaret hvis noe går galt.
Sier vi at skolen er behandlingsansvarlig, er Trivselsleder bare leverandøren som
utfører oppdraget på skolens vegne. Det er en vesentlig forskjell for hvem som må
svare for et avvik, og den må stå skriftlig i en avtale mellom oss og hver skole
før undersøkelsen tas i bruk. Dette er ikke noe vi kan avgjøre selv — det må en
jurist se på. Åpent punkt i kapittel 6.*

## 22. Internasjonalt: arkitektur, marked og oversettelse

Plattformen selges digitalt i andre land — uten fysisk oppfølging. Den to-lags-arkitekturen (22.5) er den tekniske grunnmuren.

### 22.1 Hva må på plass

Stripe-betaling, flerspråklig arkitektur (Norsk → Svensk → Islandsk → Engelsk → Tysk → Fransk →
Spansk), justering av kontrakt.

### 22.2 «Need to have» vs «nice to have»

Innhold og verktøy som ikke kan lastes ned og sies opp. Gradvis tilgang basert på progresjon.
Nettverkssamlinger digitalt erstatter fysisk oppfølging.

### 22.3 Markeder og data

Prioritert: Sverige (i gang) → Danmark → Storbritannia → internasjonalt engelsk. Island: ~175
skoler, eget islandsk innhold. Se kapittel 22.6.

### 22.4 Konkurrentkartlegging England + Tyskland (fullført)

14 aktører per land. HOVEDFUNN: samlet pakke — fysisk kurs + elevledere + digitalt bibliotek +
trivselsmål — finnes IKKE som ett produkt i noen av markedene.
- England: modent/kommersielt. OPAL nærmest (£6 000+, 2 000+ skoler, sterk på evidens, men
voksendrevet uten elevledere/lekebank). PlayMaker £99/år. Twinkl/imoves høy gratis-standard.
- Tyskland: føderalt, dominert av gratis offentlig-/forsikringsfinansierte tilbud (DGUV, Sporthelfer,
fit4future). Pausenengel nærmest, digitalt svak.

Anbefaling: England først (betalingsvilje + sentralt innsalg + PE & Sport Premium), Tyskland steg 2.
Skrivebordsanalyse, ikke markedsvalidering — parkeres til norsk kjerne virker.

### 22.5 To-lags-arkitekturen og franchise

Den største arkitektoniske beslutningen: plattformen kan vokse fra én norsk tjeneste til en
europeisk plattform — og potensielt en franchise-modell — uten å bygge om grunnmuren.

| Lag | Hva det inneholder | Hvordan det endres |
|---|---|---|
| Lag A — universelt | Innholdsmodell, interaktive verktøy, søk, AI/Trivselsbot, brukerroller, e-postmotor | Kode — felles for alle land |
| Lag B — per land | Trinn-inndeling, læreplan, fagstruktur, geografi, valuta, utstyrsbutikk, taksonomi, juridiske tekster, operatør/land | Konfigurasjon — ikke ny kode |

#### Franchise som strategisk retning

Franchise er en strategisk retning, ikke en byggeoppgave nå. 17 års driftsmodell kan kodifiseres i en
håndbok — som både grunnlag for franchise OG mater Trivselsboten med taus kunnskap. Se
kapittel 13.4: skolene etterspør allerede nøyaktig dette innholdet.

#### Lek-katalogen: konvergens med legitime avvik

Norsk og svensk lek-katalog skal konvergere mot ett felles bibliotek (Lag A) — samme lek finnes ÉN
gang. Legitime avvik (trinn, fag, læreplan) håndteres i Lag B. Ønsket om en felles grafikkmappe for
Norge og Sverige (kapittel 10.3) peker i samme retning.

### 22.6 Island — digital tjeneste

Trivselsleder hadde tidligere en reell franchise på Island, som var vanskelig å opprettholde fysisk.
Planen er å etter norsk lansering tilby en ren digital tjeneste: språk-switch til islandsk + abonnement,
uten fysiske kurs.

- Digital-til-Island er ENKLERE enn Norge/Sverige — ingen fysiske kurs betyr ingen haller,
nettverk, kursplanlegger eller RA-logistikk.
- Men produktet som selges digitalt ER ressursbiblioteket — altså Fase 3. Island-tidslinjen henger
på Fase 3, ikke på kursplanleggeren.
- Største reelle nybygging: abonnementsmodul med Stripe. Gjenbruk Lærervikarens
domenemodell som DESIGN, men bygg nytt i Supabase. Trengs uansett for all digital salg, også
England.
- Betaling: skoler/kommuner betaler oftest faktura, ikke kort — «Stripe» betyr i praksis Stripe
Invoicing.
- Moms på digitale tjenester fra Norge til Island (EØS) — sjekkes med regnskapsfører.
- Islandsk språklag: AI-oversettelse er realistisk for 868 leker i batch, men islandsk er et lite språk
med svakere AI-kvalitet enn svensk — en islandsktalende bør kvalitetssikre.

#### Konklusjon

Island kan bli en billig PILOT for hele den digitale abonnementsmodellen — med eksisterende
merkevarekjennskap fra franchise-tiden som fordel — før England-satsingen. Rekkefølge: norsk
kjerne → Fase 3 → abonnementsmodul + Stripe → islandsk språklag → landskonfigurasjon.

### 22.7 Oversettelse: oversett data, ikke dokumenter

Kjerneprinsipp: layout, design og struktur bor i koden (React-malene), mens tekst bor som data i
Supabase. Det gjør oversettelse til én batch-jobb i stedet for 868 enkeltjobber. Etter Fase 3-importen
sender et skript alle tekstfelt gjennom Claude API i batch og skriver resultatet tilbake som et eget
språklag.

- Rydd taksonomien FØR oversettelse — ikke betal for å oversette dubletter eller nynorsk-rot.
- Terminologi-ordliste med 30–50 kjernebegreper besluttes én gang og brukes konsekvent.
- Status/ferskhetsfelt per oversettelse: flagges automatisk «utdatert» når den norske originalen
endres. Samme mekanisme som kapittel 10.7.
Første ord i ordlisten er besluttet: i lekebeskrivelser brukes «barn» eller «person»
(eventuelt «spillere») — IKKE «elev». Besluttet av Kjartan, Vegard og Karoline. Se kapittel 10.3. Dette
er et godt eksempel på at ordlisten må bygges av huset selv, ikke av oversettelsesverktøyet.

#### Format-spesifikke valg

- PDF-er oversettes IKKE direkte — de genereres på nytt fra det oversatte språklaget. Kun ekte
design-dokumenter (InDesign-plakater, ~15–20 stk) trenger manuell håndtering.
- Video: undertekster via AI (transkribering + oversettelse) er nesten gratis; dubbing er dyrere og
ikke nødvendig i første omgang.
- Engelsk-AI er svært god — utfordringen ligger i begrepsvalg, ikke språklig kvalitet.

#### Åpent spørsmål

Merkevarespørsmål: heter produktet «Trivselsleder» også i England, eller trengs et engelsk navn?
Avklares når England-satsingen nærmer seg.

ÅPEN (kapittel 6, nr. 11): abonnementsmodell per skole / lærer /
kombinasjon. ÅPEN (nr. 12): Danmark-rapporten er ferdig, men ikke analysert.

---

## 23. Idébanken

*Gode idéer med bekreftet verdi, bevisst lagt etter lansering. Rekkefølgen
her er ikke prioritert — de tas opp når kapasitet finnes.*

### 23.1 Fire idéer fra 29. juni

Send hefte + lokalt kurs-oppfølgingsopplegg med svar-skjema (samme token-mekanikk). Beslutning:
AI-video FRARÅDET. Kvaliteten og troverdigheten holder ikke for fysiske aktiviteter. Bruk Ramsalts
ekte videoer, supplert med AI-generert tekst og ikoner.

Rullerende seksjon på forsiden med lekepakker/utstyr fra Klubben-e-posten, redigerbar fra admin.

Overvåker ny forskning/nyheter om barn, fysisk aktivitet, trivsel og mobbing. Streng kildefiltrering +
godkjenningskø.

Bruk bruksloggen og Feide-innlogginger til å oppdage inaktive skoler og varsle. Kobler brukslogg +
ledelsesdashboard + churn-tenkning.
RA-arbeidsinstruksen har et uttrykt mål om rektormøte med ALLE skoler hvert tredje
år, prioritert mot skoler man hører lite fra. Inaktiv-skole-varslingen leverer nøyaktig den
prioriteringslisten — den er altså ikke en idé, men et verktøy til en eksisterende arbeidsplikt.

### 23.2 TLA laster opp egne lekeforslag (TL = redaktør)

Ivrige trivselsledere sender inn egne lekeforslag. Trivselsleder har redaktøransvar — beskytter
merkevaren, sikrer involvering, og kan bevisst fylle innholdshullene (kapittel 13.4).
Redaksjonell arbeidsflyt: innsendt → vurdering → redigering sammen med innsender →
godkjent/avvist → publisert med kreditering. Samme «systemet foreslår, mennesket bestemmer»prinsipp
som resten av plattformen.
Edalio har bygget nøyaktig denne sløyfen, med begrunnelse tilbake til innsender ved
avslag (kapittel 10.2 og vedlegg C). At en aktør på samme stack har gjort det og fått det til å fungere, senker
risikoen betydelig.
Krever at noen faktisk sitter som redaktør (Kari? Marielle?). Juridisk: en enkel avkrysning «gir TL rett
til å publisere» ved innsending. Tas etter lansering, og etter at Fase 3-strukturen finnes.

### 23.3 Dele periodeplaner OG TL-hjul mellom medlemsskoler

La en TLA dele sin periodeplan — eller sitt TL-hjul (kapittel 11.1) — med en
betalende naboskole. Bygges som ÉN delingsfunksjon for begge verktøyene. Sosialt bevis mellom likemenn er
sterkt for både fastholdelse og mersalg.
Bygger på Fase 4-verktøyene — en relativt liten påbygning når verktøyene finnes.
Start smalt (skole-til-skole, privat deling) før et åpent delingsbibliotek vurderes.
Personvern: en periodeplan kan inneholde elevnavn. Før deling må persondata enten strippes
automatisk, eller varsles tydelig. Edalios modell med magic-link-deling med rolle og utløpstid
(kapittel 10.2 og vedlegg C) er en ferdig løsning å se til.

### 23.4 Lærertimeplan med ledelsesrapportering

Se kapittel 1.3 (horisont c): hver lærer får egen innlogging og timeplan og
dokumenterer aktiv læring til ledelsen; rektor får dashbord på tvers av
trinn. Stor modul.

### 23.5 Det digitale barnehagekonseptet

Programforslaget for Trivselsleder i barnehagen forutsetter Stripe Checkout,
EHF-faktura og kjedekontoer med samlefakturering. Konseptet venter til etter lansering og får egen tidslinje sammen med
betalingsløsningen. (Barnehage-KATEGORIEN og dagens barnehage-leker følger
derimot med i innholdsflyttingen — kapittel 10.)

### 23.6 Mindre restpunkter

- Evaluering: «Kopier forrige semesters oppsett»-knapp, og rikere rapport
  (Excel/PDF/PowerPoint) bygget oppå CSV-grunnlaget.
- Kulturkort: admin-panel for bestillingsoversikt (levert/fakturert),
  portosatser i admin, og kulturkort-e-postenes eget visuelle uttrykk ryddes
  når designprofilen landes.
- Rektoragenten: admin-knapp i siden (start agent med filter, cron 4×/år),
  og import av alle ~7300 nordiske skoler som varme kontakter.
- Fra Edalio-listen (kan vente, fullt i vedlegg C): magic-link-deling,
  presentasjonsmodus, årshjul-regnskap, AI-knapper, dokumentopplasting.

### 23.7 Fjernundervisning / videosalg

Vurdert og FRARÅDET: AI-video av leker. Står her som bevisst valgt bort.

## 24. Visjonene

### 24.1 Trivselsboten som selvstendig produkt

Motoren bygges i Fase 3 (kapittel 10): meningssøk på eget innhold med
kildekort. Boten som eget produkt kommer etter: læreren beskriver situasjon
→ konkret opplegg med kildekort; PowerPoint til nye trivselsledere;
prediktiv skoleoppfølging. Versjon 3.0 — fremtid: Benchmarking mot lignende skoler. Netflix-anbefalinger for personlig innhold.

Innholdsgrunnlaget: skolenes største udekkede ønske (kapittel 13.4) er samme
innholdsaktivum som mater boten og franchise-håndboken — skrives én gang,
løser tre behov.

### 24.2 App og videreutvikling

App (iOS/Android eller nettbasert), aktivitetsbank med spillfunksjon, in-app betaling. Elevpålogging.
Timeplan for aktiv læring. Delingsbank.

### 24.3 Lærervikaren.no — fremtidig prosjekt

Kartlagt av Fable 5. Ligger BAKERST med vilje: TL-kjernen bygges ferdig først. Kan tenkes bygget
inn i TL-plattformen på sikt — ikke nå.

- Bemanningsmodulen = levende kjerne: 435 627 vikartimer, 358 339 SMS.
- Opplegg-biblioteket = dødt siden 18.08.2022: 2 236 dokumenter.
- Tall: 342 skoler, ~40 aktive abonnement, 20 229 brukere, 8,2 mill. kr historisk omsetning.

Drupal 7 EOL januar 2025 — ingen sikkerhetsoppdateringer, persondata for 20 000+ brukere. Quizappen
kjører på http uten kryptering. GDPR-grunnlag må avklares FØR migrering.

Abonnement/skoleregister/prisnivåer er identisk domenemodell. Bemanningen er den eneste reelt
nye modulen.

---

# DEL 4 — VEDLEGG

*Oppslagsverk. Ingenting her krever handling.*

## Vedlegg A — Endringslogg

### v34 → v35 (10. august 2026)

v35 = v34 med beslutninger til og med 9. august foldet inn. Ingen
omstrukturering — samme fire deler, pluss ny Vedlegg D.

| Endring i v35 | Hvor |
|---|---|
| Fire tall avklart og skrevet inn konsekvent (868 leker, 537 dok, 1 792 hjul, 10 426 planer) | Kap. 10.4, Vedlegg D |
| Kap. 6: tre lukkede beslutninger fjernet (påminnelse, flytt-knapp, «Inaktiv»); femtallssaken redusert til det gjenstående femte tallet | Kap. 6 |
| Sikkerhet 9.1 fullført og flyttet til Vedlegg D; kap. 9 viser kun det som gjenstår (nøkkelrotering, RLS m.m.) | Kap. 9, Vedlegg D |
| «Inaktiv»-status fjernet fra kode og plan | Kap. 8, Vedlegg D |
| Pilot verifisert mot ekte kode 10. aug (kortstatus finnes, adresse/pris finnes, RA autofylles, antall_kort er den ekte jobben) | Kap. 8 |
| Ny **Vedlegg D — Ferdig og levert** (regel 5) | Vedlegg D |

Detaljer i prosjektnotatene: `TALL-avklart.md`, `SMATING-avklart-9aug.md`,
`SIKKERHET-gjenstaar.md`, `PILOT-kartlagt-mot-kode.md`.

### v33 → v34 (7. august 2026)

v34 er en OMSTRUKTURERING, ikke en innholdsrevisjon: alt fra v33 er
videreført, flyttet dit det hører hjemme. Eldre endringslogger (v24→v33)
ligger i v33, som beholdes uendret som arkiv.

**Strukturgrepene (besluttet av Kjartan 7. august):**

| Grep | Hva det betyr |
|---|---|
| Fire deler | Grunnlag / Veien til lansering (arbeidsrekkefølge) / Etter lansering (prioritert) / Vedlegg |
| Ett tema, ett sted | Ramsalt: alt i kapittel 10 (sto i 13 kapitler). Video/Bunny.net: kapittel 10 (sto i 11). Edalio-byggefunnene: kapittel 10; resten vedlegg C. Søk/AI: kapittel 10; bot-visjonen kapittel 24 |
| Gjeldende sannhet i teksten | v33s merkede blokker oppå eldre tekst er skrevet inn som ren, gjeldende tekst. Historikken: vedlegg B og v33 |
| Historikk ut av planen | Kontrollrunder, byggetrinn, lukkede sikkerhetssaker → vedlegg B. Kartlegginger → vedlegg C |
| Åpne beslutninger samlet | Kapittel 6 er hele lista; hvert punkt avgjøres i sitt kapittel |
| Kun én endringslogg | Eldre logger ligger i v33 (besluttet 7. august) |

**Innholdsbeslutninger tatt 7. august (alle med Kjartans ja):**

- Barnehage: kategorien + dagens leker følger innholdsflyttingen; digitalt
  konsept etter lansering (kapittel 23.5).
- De tre kravene fra 3. juni-planen → kapittel 17 (etter lansering).
- CRM-kravene uten hjem → kapittel 19.8.
- Rektorlisten kontrolleres manuelt før første utsending → kapittel 17.
- De tre GDPR-lovkravene fra 3. juni-planen → lanseringssjekklisten (14.2).
- 60-minuttersmålet → Del 1 (kapittel 1.3) som strategisk ramme.
- Demo-manuset → vedlegg C. Arbeidsinstruksen → vedlegg B (kjernereglene
  står i kapittel 3).

**Nylig avgjort (august):**

| Beslutning | Avgjort |
|---|---|
| «Vet ikke ennå» på antall TL: FORKASTET — antall-feltet ble valgfritt i stedet (bygget og bevist) | 4. august |
| «Foreløpig påmelding — oppgi elever senere» (fra 3. juni-planen): samme sak, forkastet | 4. august |
| Ønsket kurs: parkert. Kalenderkobling: parkert | 5. august |
| Felles opplæring der alle skolene er vertskap (Senja): ingen egen mekanikk trengs | 5. august |
| Kulturkort og avtalen: kort beregnes for alle som melder antall — internt | 5. august |
| Kortantallet fryses ved midnatt når kursdagen begynner | 6. august |
| Kursbagger/utstyrsbestilling STRØKET — håndteres i Tripletex/manuelt | 6. august |
| RA-tilgang: alle beholder full tilgang; «mine kurs» + filter blir standardvisning | 6. august |
| Barnehage: kategorien og dagens barnehage-leker følger med i innholdsflyttingen; det digitale barnehagekonseptet venter til etter lansering | 7. august |
| «Min påmelding», bekreftelsesmail med kurshefte, oppfølgingsmail dagen etter: etter lansering (kapittel 17) | 7. august |
| CRM-kravene uten hjem → CRM-kapitlet (kapittel 19) | 7. august |
| Rektorlisten kontrolleres manuelt før første utsending (kapittel 17) | 7. august |
| **Edalio og Trivselsleder er TO ULIKE PRODUKTER — ingen delt database.** Edalio-kartleggingen brukes som lærdom, ikke som felles base (kapittel 10.1) | 7. august |
| **Fulltekstsøk fra dag én, meningssøk etterpå** (kapittel 10.1) | 7. august |
| TL-hjulet: utvidet kravliste skrevet inn (11.1) — «Mine hjul»-organisering til lansering; deling av hjul med naboskoler etter lansering, sammen med periodeplan-delingen (23.3) | 7. august |
| Periodeplanen: utvidet kravliste skrevet inn (11.2) — «Mine planer»-organisering til lansering; deling og tavle-modus etter lansering | 7. august |

---

**Opprydding 7. august (besluttet av Kjartan):** plan-arkeologi
(«forsvant i v20», «sto i konsept v1», «Endret i v31»), beslutningsdatoer
(«BESLUTTET 1. august») og kildehenvisninger til gamle dokumenter er tatt UT
av Del 1–3. Planen sier nå bare hva som gjelder; nær historien ligger her, i
vedlegg B og i v33. «Nylig avgjort»-tabellen over hørte tidligere til
kapittel 6 og ble flyttet hit i samme beslutning.

**Ingenting er strøket i v34** utover det som alt var strøket i v33
(kursbagger, 6. august). Alt annet er flyttet, ikke fjernet.

**Hvor ting havnet** — de viktigste flyttingene fra v33s nummerering:

| v33 | v34 |
|---|---|
| §4 status | 5.1 |
| §9 kursplanlegger | Kapittel 8 (9.9/9.10 → 17; 9.8 → vedlegg B) |
| §11.3 dashboard | 18.2 (de tre registreringene: 12.3) |
| §14 + §21 + §47.1 Fase 3/AI/Edalio | Kapittel 10 (21.4 → 24.1; 47 fullt → vedlegg C) |
| §23.4 staging/hverdagsark | 14.3 |
| §25/26/33/34 kartlegginger | Vedlegg C |
| §28/51 arbeidsform | Vedlegg B (kjernen: 3.3) |
| §29 + §46 tidslinje/bøtter | Kapittel 7 |
| §32 video + §15.4 | 10.6 |
| §36 åpne punkter | Oppløst: kapittel 6 + temakapitlene |
| §38 + §42 vern/backup | 10.7 |
| §43 60-min | 1.3 |
| §45 oversettelse | 22.7 (flerspråk-feltene: 10.8) |
| §54–58 historikk | Vedlegg B |
| §59 utviklingsmiljø | Nivå 1 + oppskrift: 12.2; nivå 2–3: kapittel 16 |

---

## Vedlegg B — Historikk, lærdommer og arbeidsinstruks

*Alt her er dokumentasjon av noe som er gjort eller lært. Ingen åpne
oppgaver. Seksjonsnumre nevnt i historikken (f.eks. «seksjon 58», «seksjon
9.8») viser til nummereringen i v32/v33, der hendelsene skjedde — de er
bevart ordrett som historisk dokumentasjon.*

### B.1 Arbeidsinstruksen for øktene


#### Arbeidsmåte og leveringsformat

##### Fast arbeidsflyt (uten unntak)

1. Start hver økt: lim inn STATUS.md. 2. SQL i Supabase SQL-editor FØR kode pushes. 3. Kode →
commit/push → vent på Vercel-deploy → test. 4. Avslutt hver økt: oppdatert STATUS.md.

##### Kommandostandard

Kommandoer merkes «→ TERMINALEN» eller «→ SUPABASE». Heredoc-terminator: SLUTT (ikke
EOF). Faste lenker hver gang. SQL-mønster: string_agg/concat_ws for én rute med tekst i stedet for
mange skjermbilder nedover en liste.

##### Leveringsformat for planer

Alltid BÅDE DOCX og PDF. Innholdsfortegnelsen bygges STATISK — sidetall hentes fra ferdig
rendret PDF og verifiseres visuelt før levering. (Historisk merknad: docx-js-regelen gjaldt
tidlige planer; fra v32 bygges planens PDF med v31-malen i pandoc/xelatex, som er dagens
gjeldende form.)

##### Dispatch/subagenter — prinsipper

Dispatch satt opp og verifisert ende-til-ende. 1. Analyse før kode. 2. Spesialiserte spor kun for tunge
oppgaver. 3. Uavhengig sikkerhetskontroll. 4. Si fra om manglende tilgang.

#### Arbeidsform: Claude Code (NY)

Fra 1. august 2026 skjer programmeringen i Claude Code, ikke som løse terminalkommandoer limt
inn én og én. Dette endrer arbeidsdelingen mellom de tre verktøyene.

| Verktøy | Rolle |
|---|---|
| Chat (denne samtalen) | Beslutninger, rekkefølge, arkitektur, SQL, og formulering av oppgaver til Claude Code |
| Claude Code | Selve programmeringen. Leser koden selv, bygger, stopper for godkjenning før push |
| Cowork / Fable 5-agenter | Kartlegging og uavhengig verifisering |

##### Hva som fungerer godt

- Klare ikke-tekniske beskjeder, ett steg om gangen, med eksplisitt beskjed om å stoppe før
commit og push.
- Be Claude Code lese seg opp på relevante filer FØR den bygger, i stedet for å beskrive koden
for den.
- Be den bevise en påstand i stedet for å gjette. I Trinn B-økten ba den selv om en diagnosespørring
i stedet for å gjette på årsaken — det sparte tid.
- SQL leveres i chatten, ikke via filer. Kjartan limer den inn i Supabase selv.
- To vinduer åpne samtidig: ett med Claude Code, ett vanlig terminalvindu for testkommandoer.

##### Fallgruver observert 1. august

- Claude Code kan foreslå å «rette opp» data manuelt når noe ser feil ut. Det skjuler ofte om
koden faktisk virker — be heller om en ren test.
- Vercel-mellomlagring kan gi inntrykk av at en rettelse ikke virket. Alltid no-cache ved testing.
- Filer som er opprettet lokalt finnes ikke på serveren før de er pushet. En serverfunksjon kan ikke
testes før den er ute.

##### Øktrutine (uendret, men presisert)

Start: lim inn STATUS.md. Underveis: SQL i Supabase FØR kode pushes, og ingenting erklæres
ferdig uten bevis. Slutt: oppdatert STATUS.md som limes inn i terminalen med cat-blokk.
STATUS.md er den tekniske statusen i koden; denne fremdriftsplanen er beslutningene og helheten.
De to utfyller hverandre og skal begge oppdateres.

---

### B.2 Byggehistorikk — slik ble modulene til


#### Kursplanleggerens agenttest (alle funn bevist og lukket)

> **UTVIDET 5. AUGUST.** Det kom en retest 6. juli (`kursplanlegger-retest-2026`)
> med åtte avvik. Fire av dem (A–D) har aldri stått i noen retteliste. De er nå
> kontrollert mot koden, og **alle fire er lukket**:
>
> | Funn | Status kontrollert i koden 5. aug |
> |---|---|
> | A — avvist påmelding er en blindgate | LUKKET. `api/admin/godkjenn-paamelding.js:150-158` reaktiverer en inaktiv skole med samme org.nr. |
> | B — unntakskobling kun ved godkjenning | LUKKET. `AdminKursplanlegger.jsx:338-357` søker blant alle aktive skoler uavhengig av nettverk. |
> | C — påminnelse går til NEI-skoler | LUKKET. `send-oppfolging.js:286` krever `svart && kommer`; `:302` avviser resten. |
> | D — ingen fallback når HTLA mangler | LUKKET. `sql/steg2-flere-mottakere.sql:135` `coalesce(hktl_epost, htla_epost, rektor_epost)`. |
>
> Lærdommen står igjen selv om funnet falt: **ingen skrev noe sted at de ble
> lukket.** Retterunder trenger sin egen kvittering, akkurat som «ferdig»
> trenger en kilde.
>
> **Agenttest 3, 4. august:** første test kjørt mot en fasit
> (`TESTFASIT-blokkA.md`) i stedet for fritt utforskende. Alle 34 punkter OK.
> Den fant til gjengjeld to autorisasjonshull — se seksjon 55.

En Opus 4.8-agent (Dispatch + Chrome) testet hele flyten selv på trivselsleder-ny.vercel.app:
påmelding, testkurs, svar-flyt, RA-verifisering, purring/påminnelse og evaluering. Rapport:
kursplanlegger-agenttest-2026.md.

| Feil funnet | Status |
|---|---|
| 1. org.nr-duplikat overskrev skoler STILLE | FIKSET & BEVIST 5. juli |
| 2. Godkjenning overførte ikke adresse/elevtall/rektor/kontakt | FIKSET & BEVIST 5. juli |
| 3. Enkeltskole kan ikke kobles til kurs uten nettverk | FIKSET & BEVIST — auto-foreslå nettverk fra kommune |
| 4. Svar-skjema viste ikke kursnavn/dato/skolenavn | FIKSET & BEVIST — kontekst lagt til |

Sluttest 6. juli 2026: Fable 5-agent kjørte hele testen på nytt, på blanke ark, ende-til-ende. GRØNN.
Hallregister ryddet. Kursplanleggeren er dermed PILOT-KLAR. Demo-innhold (3 testskoler, 2
nettverk, 1 kurs) står igjen for Marielle å se — slettes med kjent SQL-mønster rett før pilot starter.
Merk (1. august): testkurset «TEST Lekekurs Kjartan-test» har fått en del e-poster og tidsstempler
under Trinn B-testingen. Både demo-innholdet og disse sporene ryddes i samme operasjon før pilot.

#### Evaluering — byggetrinnene

Tabell evalueringer med RLS, token-lenke /evaluering/:token. Tre vurderinger (skala 1–6), gullkorn
(fritekst), kjøpsinteresse (pakke/samtale/nei). Alt på én side.

Redigerbare spørsmål per semester. Redigerbare pakker + priser (liten 7 119,-, stor 10 479,-).
Frossen pris lagres ved svar.

Bildeopplasting av utstyrspakker. Storage-bøtte «pakkebilder». Testet i admin.

CSV-eksport av alle svar. Kolonner: Skole, Kurs, Gjennomføring, Info i forkant, Aktiviteter, Gullkorn,
Kjøpsinteresse, Valgt pakke, Pakkepris. BOM + semikolon for norsk Excel.
(Varsling til Eivind og automatisk evalueringsutsending ble senere ferdig i
Trinn B — kapittel 5.8. «Kopier forrige semesters oppsett»-knappen og rikere
rapport er åpne restpunkter og står i kapittel 23.6.)

#### E-postsystemet — fra mailto til motor

Branded passord-tilbakestilling, brukerinvitasjon, påmeldingsbekreftelse og bestilling — i minst 7 apifiler.
Avsender noreply@trivselsleder.no, verifisert domene, ferdig branded HTML-mal.

Kurslenken gikk i dag til én Hovedkontakt TL per skole — sårbart hvis vedkommende slutter eller
ikke svarer. Skoler har 2–5 TL-ansvarlige, og dataene finnes allerede fra HubSpot-synken.
Spørsmålet som sto åpent i v30 var om flere mottakere skulle dele én felles svar-rad og token, eller
få hver sin lenke inn til samme rad.
Besluttet 1. august: hver mottaker får sin EGEN lenke inn til samme svar-rad. Da vet systemet
hvem som faktisk åpnet og hvem som svarte, uten at skolen får to konkurrerende svar. Se 12.7.

Ny fil api/_epost-mal.js. De fire konto-e-postene bruker den nå: glemt-passord, inviter-bruker,
godkjenn-paamelding og opprett-skole. Utseendet er uendret, men endres malen nå, endres alle fire
samtidig. Bevist: ekte glemt-passord-e-post sendt i produksjon og verifisert visuelt. Commit cd45e74.
De tre øvrige (påmelding + Kulturkort x2) har eget visuelt uttrykk og ble bevisst latt urørt. Kulturkorte-postene
bruker gradient og emoji uten oransje topplinje — de bør ryddes når designprofilen
landes, ikke isolert. Notert også i 5.3.

- Ny tabell kurs_skole_mottaker: én rad per TL-ansvarlig med rolle (htla/tla), navn, e-post, egen
lenke_token, sendt_at og apnet_at. Unik på kombinasjonen svar-rad + e-post.
- kurs_skole utvidet med svart_av_mottaker_id, forste_utsending_at, purring_sendt_at og
trinn3_sendt_at.
- Ny innstillinger-tabell (nøkkel/verdi) med purring_dager=5 og trinn3_dager=10, endrbart uten
kode.
- Funksjon opprett_kurs_skole_mottakere(uuid) henter hovedkontakt fra
skoler.hktl_navn/hktl_epost og øvrige fra skoler.tla_kontakter (jsonb). Kontakter uten e-post
hoppes over.
- hent_kurs_skole_via_token og begge varianter av lagre_skole_svar godtar nå BÅDE gammel
skole-token og ny mottaker-token, stempler apnet_at og setter svart_av_mottaker_id.
- BEVIST: begge lenketyper åpner riktig skjema, og apnet_at registreres på riktig mottaker.
SQL ligger i sql/steg2-flere-mottakere.sql. Commit e77f147, pushet 1. august sammen med steg 3a.

Ny serverfunksjon api/kurs/send-invitasjon.js. Tar imot en kurs-id og sender kursinvitasjonen
automatisk via Resend til hovedkontakten ved hver skole på kurset.
- Tørrkjøring er standard: uten eksplisitt beskjed om å sende ekte, viser funksjonen bare hvem
som VILLE fått e-post, med emne, avsender, svar-til og lenke. Ingenting sendes.
- Hver mottaker får sin egen lenke bygget på sin egen token.

- Alt logges i ny tabell epost_logg — hvem, hva, når, status, Resend-kvittering og eventuell
feilmelding. Også ved feil.
- Dobbeltsendings-vern: funksjonen reserverer plassen i samme operasjon som den stempler.
Andre kjøring får ingen rader tilbake og hopper over. Kan ikke omgås.
- Feiler én skole, fortsetter funksjonen til neste. En sending som ikke lar seg stemple rapporteres
som feil, ikke som suksess.
Bevist i produksjon 1. august: tre testskoler fikk ekte e-post med hver sin fungerende lenke, alle
stempler ble satt, og en påfølgende kjøring hoppet over alle tre med grunn «allerede sendt». Commit
406ad1d, 700b21c, 3abc011 og 5a2769e.
Tre feil ble funnet og rettet underveis — alle verdt å huske: (1) service_role manglet tilgang til
nye tabeller og funksjoner, tre ganger på rad. (2) Lenken pekte på gamle trivselsleder.no fordi koden
falt tilbake på et hardkodet domene når ingen nettleser var involvert; nettadressen ligger nå i
innstillinger. (3) Vercel serverte gamle svar fra mellomlager under testing, slik at det så ut som en feil
vi allerede hadde rettet fortsatt fantes. Alle tre er ført inn som faste regler i seksjon 3.1.

> **OPPDATERT 5. AUGUST — denne underseksjonen er i praksis tom nå.**
> Steg 3b, 3c og 3d er alle ferdige og bevist: purring, trinn 3, påminnelse og
> evaluering sendes fra Oppfølging-siden, med nødbrems og dobbeltsendingsvern
> på alle fire endepunkt. Teksten under beholdes som historikk.

| Steg | Innhold | Merknad |
|---|---|---|
| 3b | Utsendingsmotor i tørrkjøring | Daglig jobb som finner hvem som skal purres/påminnes, men sender ingenting |
| 3c | De fem gjenstående utsendingene + ekte sending | Bygges på samme mal som steg 1 |
| 3d | Frontend: trappetrinn-visning og RA-knapp | Erstatter mailto-knappene i AdminPurring.jsx |

Teknisk merknad om klokkeslett: Vercels klokke går i UTC og tar ikke hensyn til norsk sommertid.
Settes jobben fast til «kl. 07:00», blir det 07:00 om sommeren og 08:00 om vinteren. Anbefalt
løsning: la jobben våkne hver time og la koden selv avgjøre om klokken er 07:00 eller 13:30 i Norge.
Det gir riktig tid året rundt, og retter seg selv hvis én kjøring feiler — Vercel prøver aldri på nytt av
seg selv.

#### Cowork-oppdragene for Fase 3

- Oppdrag A — Dropbox-videoer: KORRIGERT. Riktig skann av delt team-mappe «Trivselsleder
NY» fant 3 224 videoer / 248 GB. Ramsalt-zip = primær strukturert kilde; Dropbox-samlinger =
supplerende hull-fyll.
- Oppdrag B — Inspirasjonssøk: 8–12 moderne skole-/læringsplattformer. Utført; supplert av
Edalio-kartleggingen (seksjon 47).
- Oppdrag C — Video-opplasting: kjøres nå som videoverts er valgt og parse-skript er klart.
- Oppdrag D — Videoverts-research: FERDIG — Bunny.net valgt, se seksjon 32.

### B.3 Sporbarhet og kontrollrundene


#### Sporbarhet — bevis, ikke påstand (NY)

**1. Ingen statuslinje uten kilde.** «Ferdig» skal peke på hvilket krav,
fra hvilket dokument, med hvilken dato.

**2. Ingen nedkorting uten fjernet-liste.** Kortes et dokument ned,
følger en liste over hva som gikk ut. `HVA-FORSVANT.md` er den listen
for juni 2026.

**3. Bevis, ikke påstand.** Tre nivåer:

| Merke | Betyr |
|---|---|
| **BEVIST** | Sett virke i produksjon — ekte e-post, skjermbilde eller kjørt kall |
| **KODEVERIFISERT** | Lest i koden med fil og linjenummer, ikke kjørt |
| **PÅSTÅTT** | Står i et dokument, ikke kontrollert |

**4. Plan mot kode går begge veier.** Koden kan gjøre mer enn planen
husket. Førsteutkastet av dette dokumentet brøt den regelen fem ganger —
se seksjon 58.

**Hvorfor dette ble nødvendig.** 4. august ble det oppdaget at
kursinformasjonssiden — en hel modul — hadde stått i konseptdokumentet
15. juni og forsvunnet tre dager senere, uten at noen hadde notert det.
5. august ble historien etterprøvd mot originaldokumentene. Den stemte.
Hele gjennomgangen ligger i `HVA-FORSVANT.md`, som er fjernet-lista for
juni 2026.

---

#### Hva som skal hindre gjentakelse (NY)

1. **Fasit før test.** Agenttest 1 og 2 fant ingenting av det som
   manglet. Agenttest 3, mot `TESTFASIT-blokkA.md`, dekket alt og fant et
   sikkerhetshull på kjøpet. Fasiten utvides fra blokk A til hele
   systemet.

2. **Et ferdig-stempel skjuler mangler.** Hallregisteret ble erklært ferdig
   i samme setning som adresse og pris forsvant fra feltlisten i konsept v2.
   Feltene ble bygget likevel — men uten data, og uten å vises i tabellen.
   Ingen leter etter mangler i noe som står som levert.

3. **Krav som forsvinner, kommer tilbake som brukerønsker.** Marielle og
   Ylva ba i august om noe som sto i spesifikasjonen i juni.

4. **Den som bygger, kontrollerer ikke alene.**

5. **Arbeidsresultater teller ikke før de er tatt i bruk.** 141
   vertskapsoppføringer lå i en fil mens vi bygget en funksjon for å
   taste dem inn manuelt.

6. **En påstand om at noe ikke finnes, krever samme bevis som en påstand
   om at det finnes.** Se seksjon 58.

---

---

#### Dette dokumentet ble selv felt av sin egen regel (NY)

Førsteutkastet av v32 ble skrevet 5. august og deretter motprøvd mot
koden av en uavhengig kontrollør, slik Dispatch-instruksen krever.
Kontrolløren fant fem feil — alle av samme type dokumentet er skrevet
for å avskaffe.

| Påstand i førsteutkastet | Virkeligheten |
|---|---|
| «Kortutdeling: null kodetreff, ikke bygget» | 150 linjer prototype fra 18. juni, i mappa jeg selv hadde listet opp |
| Retest-funn A: «KRITISK, ett feilklikk er permanent» | Lukket — re-godkjenning reaktiverer |
| Retest-funn B: «finnes ikke veien» | Lukket — unntakssøket søker alle aktive skoler |
| Retest-funn C: «må verifiseres» | Lukket — to grep ville avklart det |
| Retest-funn D: «ingen fallback til rektor-e-post» | Lukket — `coalesce(hktl, htla, rektor)` |

To av dem var på vei inn i «må gjøres før pilot».

Feilen var arvet: `RETTELISTE.md` sa «null kodetreff» om kortutdelingen,
og jeg videreførte det uten å søke selv. **Det er nøyaktig mekanismen fra
juni — en statuslinje kopiert videre uten ny kontroll.** At den slo til
igjen, i dokumentet som skulle avskaffe den, er den mest lærerike
enkeltobservasjonen i hele gjennomgangen.

Regelen som fanget den: *den som bygger, kontrollerer ikke alene*. Det
tok kontrolløren under ti minutter.

---

*Kilder: fremdriftsplan v31 (1. aug), konseptdokument v1/v2/v3 (15./18./19.
juni), prosjektplan (3. juni), status_kommando (18. juni), CRM-notat,
HubSpot-kartlegging, Edalio-kartlegging, barnehageforslaget,
retest-rapporten (6. juli), hallregister-utkastet, RETTELISTE.md,
STATUS.md, RAPPORT.md, TESTFASIT-blokkA.md og koden i trivselsleder-ny
per 5. august 2026. Motprøvd mot koden samme dag.*

##### Og en gang til, samme dag — om formen

Førsteutkastet av v32 var på ni sider. v31 er på 55. Jeg kortet ned 51
seksjoner til ni og listet resten som tall i en «videreført»-liste — samtidig
som dokumentets egen hovedtese er at nedkorting uten fjernet-liste er slik krav
dør.

v31 sier det rett ut, i seksjon 0: *«Forrige versjon er alltid malen for neste.
Alt fra forrige versjon skal alltid med videre — ingenting forsvinner ved en
glipp.»* Fire seksjoner — 1 (Overordnet), 2 (Teknisk stack), 3.2 (Bærende
prinsipper) og 4 (Status) — sto ikke engang i lista over det som var
videreført. De var usynlige.

Kjartan fanget det ved å spørre: *«husker du at fremdriftsplanene skulle ligne
på hverandre, og ikke miste noe på veien?»* Dette dokumentet er svaret.

Det er fjerde gang på én dag at samme mekanisme slår til. De tre første var
arvede påstander. Denne var selve formen på dokumentet — og den var vanskeligst
å se, fordi den ikke er en feil i en setning, men et fravær.

##### Kontrollrunden på den fullstendige utgaven

Også denne utgaven ble kontrollert av en uavhengig agent før den ble tatt i
bruk. Hovedspørsmålet — er noe fra v31 tapt? — fikk et rent svar: alle 51
seksjoner og alle 149 underseksjoner er til stede, og ingen seksjon er
kortere enn i v31.

Kontrolløren fant til gjengjeld ti andre feil, blant annet at fire tabellrader
hadde falt ut i den maskinelle konverteringen, at seks steder fortsatt sa at
Resend Trinn B «gjenstår» etter at det var ferdig, og at et linjenummer i 9.8
var utdatert fordi sikkerhetsrettingen samme dag hadde forskjøvet fila.

Alle ti er ført inn — men merk hvordan: som merkede oppdateringsblokker over
originalteksten, ikke ved å slette den. Regelen i 3.1 sier at planen aldri
kortes ned. Derfor står for eksempel den gamle statuskolonnen i 12.9 fortsatt
med «Gjenstår», med en blokk rett over som sier at alle seks er ferdige.
Leser man en tabell uten blokken over, kan man bli lurt. Det er en bevisst
avveining: historikken bevares, og det som gjelder nå står alltid først.

**Regelen er den samme hver gang: den som bygger, kontrollerer ikke alene.**

##### Kontrollrunden på v33 (NY)

Førsteutkastet av v33 ble kontrollert 6. august mot beslutningsnotatet
`BESLUTNINGER-til-v33.md`, som er fasiten: alle sju beslutninger Kjartan tok
den dagen, med kildesitat og angitt plassering. Kontrolløren fant **30 avvik**.
Dette er fjerde gang et førsteutkast er sendt til uavhengig kontroll (58,
58.2, denne — pluss formkritikken i 58.1, som Kjartan fanget selv). Alle fire
fant feil. Ingen førsteutkast har så langt stått seg. Regelen står fast.

**Det alvorligste funnet — jeg brøt min egen hovedregel samme dag jeg skjerpet
den.** Fasiten sa uttrykkelig om Tripletex-teksten: *«Tanken og
detaljrikdommen i forslagene skal beholdes — ikke kortes ned til en
stikkordslinje.»* Førsteutkastet gjorde nettopp det: erstattet det ordrette
v17-sitatet med en omskrevet oppsummering, og mistet på veien hele linjen om
ledelsesdashboardet med kontraktsverdi og geografi. Det er samme feiltype som
denne planen er bygget for å stoppe. Sitatet står nå ordrett i 6.3.

**De øvrige, gruppert:**

| Type | Antall | Eksempel |
|---|---|---|
| Beslutninger som ikke kom helt inn | 6 | «Mine kurs» sto i 9.5 og i endringsloggen, men ble aldri lagt inn i bøtte 2 (46.2) der den hører hjemme |
| Kildebevis strøket bort | 6 | `Math.ceil(15 × 1,1)` = 17 og «`antall_kort` har null kodetreff» var borte fra 9.7 — i strid med regelen «ingen statuslinje uten kilde» |
| Brutte kryssreferanser | 4 | «seksjon 32.6» finnes ikke (skal være 32.5); «se seksjon 9» skal være 58 |
| Motsigelser | 7 | 36 lukket og åpnet det samme punktet om kortantallet i samme seksjon |
| Uforklart IT-språk | 5 | «GRANT til anon + authenticated (ellers 403 tross korrekt RLS)» sto uoversatt i 3.1 — i selve seksjonen der språkregelen ble innført |
| Feil tall og datoer | 2 | «nitten versjoner» om v8→v29, som er tjueto |

**Kontrollrunde 2 (samme dag).** Den rettede utgaven ble sendt til en ny
uavhengig kontroll. Alle 30 rettelser ble bekreftet på plass. Runden fant
**24 nye avvik** — sju motsigelser innført av selve rettelsene (blant annet at
søk og filter havnet i to ulike bøtter samtidig), åtte mekaniske skader fra
v31→v32-konverteringen som ingen tidligere runde hadde sett (seks tabeller delt
i to med gjentatt overskriftsrad, to setninger brutt av en tom linje, tretten
sammenskrevne ord som «leseog skriverett»), fem steder der språkregelen fortsatt
ikke var anvendt, og fire tall- og datofeil. Alle 24 er rettet.

**Det som fikk mest å si:** kontrolløren fant at seksjon 14.7 — jobben med å
hente «Sted / Antall / Utstyr» ut av fritekst for 761 av 868 leker — sto uten
én forklarende linje. Det er den enkeltjobben som avgjør om innholdet blir
søkbart til 1. oktober, og den var usynlig for den som skal prioritere den.
Den har nå fått sin forklaring.

**Hva to runder på samme dag viser:** en rettelse er en ny tekst, og en ny
tekst kan innføre nye feil. Sju av de 24 avvikene fantes ikke før runde 1
rettet noe annet. Derfor kontrolleres det rettede dokumentet, ikke bare det
opprinnelige.

**Alle 30 er rettet før denne utgaven ble laget.** Fem tall der planen er uenig
med seg selv (868/869 leker og fire andre) er ikke rettet, fordi ingen av
tallene kan bekreftes fra dokumentet alene. De står nå som åpent punkt i
seksjon 36 i stedet for å bli gjettet på.

**Hva runden viser.** Fem av de seks feiltypene handler ikke om at noe var
ukjent, men om at noe var kjent og likevel falt ut under omskrivingen. Det er
det samme mønsteret som seksjon 55 og 57 beskriver, og det er grunnen til at
kontrollen aldri kan sløyfes fordi «denne gangen var jeg nøye».


---

### B.4 Sikkerhetsgjennomgangen 4.–5. august — det som ble lukket

- **Fem admin-endepunkt sto uten autentisering.** Hvem som helst kunne
  opprette skoler, godkjenne påmeldinger, endre nettverk, koble skoler
  til kurs og slette en `kurs_skole`-rad med skolens svar. BEVIST lukket.
- **`flytt_skole_til_kurs` hadde ingen rollesjekk.** En innlogget
  skoleadmin kunne flytte skoler. BEVIST lukket.
- **Ingen hadde skriverett på `innstillinger`.** Lukket med RLS.

Agenttest 3 fant det første av disse. Det andre — `koble-skole-kurs` —
sto allerede i rettelisten blokk D. De tre øvrige ble funnet da det
første skulle lukkes.

#### Arbeidsregelen som ble brutt

`Dispatch_Claude_Code_for_ny_trivselsleder_no.pdf` er den eneste skrevne
arbeidsinstruksen prosjektet har: «**Ikke la samme agent som bygger
funksjonen være eneste sikkerhetskontrollør**».

De fem åpne endepunktene er hva som skjer når den regelen ikke følges.
Seksjon 9 er hva som skjer når den følges.

---

**Full dokumentasjon:** `SIKKERHET-5-august.md`.

---

### B.5 Funnene 5. august — gjennomgangen av samtlige dokumenter

Fra gjennomgangen av samtlige dokumenter i `Min nettside`. Full vurdering
i `DOKUMENTOVERSIKT.md`.

*Kildemerknad: punktene i denne seksjonen bygger på dokumenter og filer
som ligger utenfor kode-repoet. De kan ikke etterprøves med grep i
`trivselsleder-ny`, og er derfor KODEVERIFISERT-nivå på det som gjelder
kode, PÅSTÅTT på resten.*

#### Hallregisteret

Behandlet i seksjon 9.6. Se korreksjonsblokken der.

#### Statusdriften var fem dager eldre enn antatt

Rettelisten peker på fremdriftsplan v23 (23. juni) som opphavet til
«Ferdig»-påstandene. `Gml/status_kommando.pdf` av **18. juni** sier
allerede at alle sju moduler er ferdige, inkludert Kortutdeling og Kopier
kursplan.

Samme dag som konseptdokumentet ble kortet fra ti til tre sider, og samme
dag som kortutdelings-prototypen ble skrevet. Nedkortingen,
ferdigmeldingen og prototypen skjedde innenfor timer.

#### Innholdsmodellen var bestemt to ganger

`Gml/GJENNOMGÅ FRA ANSATTE/Slik skal leker beskrives.docx` er en
åtte-punkts skrivestandard fra fagansatte, nesten identisk med det
Edalio-rapporten uavhengig anbefaler (v31 §47, mønster 3). To uavhengige
kilder, samme struktur. **Bør låses før Ramsalt-importen.**

`RA-rollen.docx` i samme mappe har krav som «tlf etter 6 mnd med rektor»
og «møter for alle skoler en gang per 3. år». Begge forutsetter en «sist
kontaktet»-dato som ikke finnes i datamodellen.

De øvrige funnene fra denne gjennomgangen er innarbeidet i planen: kravene
fra 3. juni (kapittel 14.2 og 17), datasettene (kapittel 13.5), CRM-kravene
(kapittel 19.8), barnehage/Stripe (kapittel 23.5), videovalget (kapittel
10.6) og videoproduksjonen (vedlegg C).

### B.6 Strøket med beslutning

> **BEVISST STRØKET, ikke forsvunnet.** Punktet lød:
>
> > «Kursbagger og utstyrsbestilling er en RA-oppgave som ikke er dekket noe
> > sted i fremdriftsplanen. Det kan være bevisst (håndteres i
> > Tripletex/manuelt), men det bør avklares — ikke oppdages ved lansering.»
>
> **Kjartans avgjørelse 6. august: strykes.** Kursbagger og utstyrsbestilling
> har ingenting med nettsiden å gjøre og håndteres i Tripletex eller manuelt.
> Punktet står oppført i endringsloggen 0.1 slik at det er sporbart at det ble
> tatt bort med hensikt.

---

## Vedlegg C — Kunnskapsgrunnlag

*De fullstendige kartleggingene og materialet planen bygger på. Brukes som
oppslagsverk fra kapitlene i Del 2 og 3.*


### C.1 Edalio-kartleggingen — samme stack, ti gjenbrukbare mønstre

Rapport: edalio-kartlegging-2026.md, ferdigstilt 1. august 2026. Det spesielle med denne
kartleggingen er at Edalio kjører SAMME tekniske stack som oss — Supabase med
radnivåsikkerhet, og Resend for e-post. Det betyr at mønstrene deres kan gjenbrukes direkte, ikke
bare tjene som inspirasjon.

#### De viktigste funnene — inn i Fase 3-strukturdesignet

| # | Mønster | Hvorfor det betyr noe for oss |
|---|---|---|
| 1 | Fasettert bibliotek med levende tellere og filtertilstand i URL | Filtrene oppdaterer antall løpende, og en filtrert visning kan deles som lenke |
| 2 | FULLTEKSTSØK fra dag én (Postgres FTS + pg_trgm) — *ordsøk som tåler skrivefeil og bøyninger, og som gir treff mens du skriver* | Søk-mens-du-skriver. Edalios STØRSTE ANGER er at de manglet dette i starten |
| 3 | Aktiv læring-malen bekrefter husets 8-punktsmal | To uavhengige kilder peker på samme struktur — se kapittel 10.3 |
| 4 | Strukturert instruktørnotat per aktivitet | Eget felt, ikke fritekst nederst i beskrivelsen |
| 5 | Flertrinns-tagging i datamodellen NÅ | Én aktivitet kan passe flere trinn med ulike varianter |
| 6 | Tomt søkeresultat blir «foreslå dette» | Gjør en skuffelse om til et innspill — kobler rett på kapittel 23.2 |
| 7 | Strukturert tilbakemelding per ressurs | Faste svartyper FØR fritekst gir data man kan telle |
| 8 | Lukket innsendings-sløyfe med begrunnelse | Innsender får vite hvorfor — validerer kapittel 23.2 |
| 9 | HENDELSESLOGGING fra første deploy | Edalio utsatte dette og står nå uten grunnlag for gratis/Pro-beslutninger |
| 10 | Skolen må være en ekte entitet i modellen | Vi har allerede dette — et forsprang verdt å beholde |

#### Kan vente til etter lansering

- Magic-link-deling med rolle (vikar/foreldre/instruktør) og utløpstid — samme mekanikk som
kapittel 23.3 trenger.
- Ta-egen-kopi frikoblet fra originalen, slik at skolens tilpasning ikke ødelegges når originalen
endres.
- Presentasjonsmodus for to skjermer.
- Årshjul- og dekningsregnskap: Edalios LK20-teller oversatt til et TL-årshjul som viser hva skolen
faktisk har dekket.
- AI-knapper med NAVNGITTE operasjoner («forenkle for 2. trinn», «lag uteversjon») — ikke et
tomt promptfelt. Dette er et viktig designpoeng: brukere vet ikke hva de skal skrive i en tom boks.

- Word/PDF-opplasting som konverteres til struktur.

#### Innholdsfunn

194 Aktiv læring-opplegg er TL og Lærervikarens EGNE leker, foredlet. De er utvidet med
LK20-kobling, nivåvarianter og instruktørnotat. Dette er vårt eget materiale i bedre innpakning — og
det bør kunne hentes hjem. Teknisk er det mulig via en samlet uttrekk fra deres innholdsfelt; det
praktiske og avtalemessige må avklares.
«Klassens time» finnes hos Edalio som generatortype, men UTEN egen bibliotekkategori. Det er et
åpent hull TL kan fylle — vi har innholdet, de har ikke kategorien.

### C.2 Skolenes egne tilbakemeldinger 2023–2024

Tilbakemeldingsloggen fra skolene er gjennomgått. Flere punkter er merket «avvente til ny nettside»
— de er altså allerede erkjent, men ikke løst.

#### Ønsker som ny side skal løse

- Sortering på trinn og målgruppe.
- Sortering på antall deltakere (50–100+).
- Søk på sesong og semester.
- Bilde av forsiden på opplegg.
- «Hjemmesiden er vanskelig å bruke» — gjenganger, og bekrefter designrådet om sterk søk og
filtrering (kapittel 13.3).
- Turneringsskjema i dokumentbanken.

#### Innholdshull — bekreftet uavhengig

Skolene etterspør de samme tingene som Fable-kartleggingen fant: samarbeidsleker, vinterleker og
leker for nordlige forhold, bli-kjent-leker, enkle kom-og-gå-leker, og tips til trivselslederne selv. At to
helt uavhengige kilder peker på samme hull gjør prioriteringen enkel.

#### Det største udekkede ønsket

Gjentatt både i 2023 og 2024, med en lang og engasjert tilbakemelding: skolene vil ha en bank
med STRATEGIER, ORGANISERING og LOGISTIKK for TL-drift, differensiert etter skolestørrelse.
Hvordan organiserer man TL på en liten, mellomstor eller stor skole? Hva er voksenrollen? Hvordan
holder man effektive TL-møter? Hvordan opprettholdes motivasjonen over tid? Hvor lagres utstyret?
Hva er rektors rolle?
Dette finnes ikke i planen i dag. Det er verdt å merke seg at det samme innholdsaktivumet mater tre
ting samtidig: dette ønsket, Trivselsboten (kapittel 24.1) og franchise-håndboken (kapittel 22.5). Å
skrive det én gang løser tre behov — og det er 17 års taus kunnskap som uansett bør skrives ned
mens den finnes i hodene til folk.

#### Digitale nettverksmøter med utløpende opptak

Et konkret ønske: digitale nettverksmøter der videoen er tilgjengelig i én uke og deretter slettes, av
personvernhensyn. Dette er et presist krav om tilgangslåsing og utløpende lenker, og det er en av
grunnene til at Bunny.nets signerte URL-er ble avgjørende i videoverts-valget (kapittel 10.6).

### C.3 Kartleggingen av dagens side (Cowork, 8 oppdrag)

Cowork har skannet dagens trivselsleder.no i detalj. Nettside-kartleggingen er KOMPLETT.

#### Fullførte oppdrag (00–08)

| Oppdrag | Innhold | Hovedfunn |
|---|---|---|
| 00 | Back-end-kart | 9 innholdstyper, eksakte tall |
| 01 | Leker (game) | 868 leker, 178 video |
| 02 | Aktiv læring (atlu) | 289 opplegg, rikere mal |
| 03 | Move it | 126 av lekene, filtrert via kategori |
| 04 | Dokumenter | 537 noder, flettet inn som vedlegg |
| 05 | Drift av TL | Dokumentkategori løftet til fane |
| 06 | TL-hjulet | 1 792 hjul, peker bare til lek-noder |
| 07 | Periodeplan | 10 426 planer, friksjonslogg fra testbruk |
| 08 | CRM | Fungerende skole-CRM med status/eier/kontrakt/nettverk |

#### Gjenstår i kartleggings-sporet

8B HubSpot-kartlegging: FERDIG. 9 Inspirasjonssøk: FERDIG, supplert av Edalio-kartleggingen
(kapittel 10.2 og vedlegg C). Sluttsyntese 0–8: ferdig.

#### Tre kilder krysssjekker hverandre

Cowork-skann + Dropbox-backup + Ramsalt-eksport. Tre vinkler fanger hull før de blir problem. I
v31 kommer en fjerde kilde til: de ansattes egne rutinedokumenter (kapittel 10.3).

### C.4 Lokal backup (Dropbox)

Backupen «Hjemmeside - BACKUP.zip» er 1311 filer / ~555 MB, nesten utelukkende PDF-er. Verdi:
de ~1200 ferdige lek-PDF-ene kan gjenbrukes direkte.
Korrigert videobilde: riktig skann av delt team-mappe «Trivselsleder NY» fant 3 224 videoer / 248
GB, inkl. ekte lekesamlinger. Ramsalt-zip er primær strukturert kilde; Dropbox er supplerende hullfyll.
ADVARSEL (NY i v31): Dropbox ble omstrukturert i juli 2026. Mapper for ansatte, backup og
databehandleravtale ligger nå under «administrasjon», grafikkmappen er ryddet på nytt, og
opprydding i sosiale medier pågår. Stiene som står i rutinedokumentene kan derfor være utdaterte.
De MÅ verifiseres før Fase 3 bruker Dropbox som hull-fyll — ellers leter importskriptet i mapper som
ikke lenger finnes.

### C.5 Redaksjonelle rutiner på dagens side

Fra ansattmøtet 29. juni + oppfølging fra Kari Snartemo, kraftig utdypet i v31 av fem mottatte
ansattdokumenter (kapittel 10.3). Styrer både Fase 3-importen og hvordan ny side skal fungere som
standard.
- PDF-backup-regel (viktigst i dag): hver ny/endret aktivitet lastes ned som PDF med nøyaktig
samme filnavn som på hjemmesiden. Filnavnet er kun lekenavnet — «Ballfangeren», ikke «1.
Ballfangeren». Dette er matchingsnøkkelen mot Ramsalt-data. Se kapittel 10.7 for hvordan
regelen kan avvikles trygt etter lansering.
- Dokument-lenking (SKJERPET): tilleggsmateriale til leker skal KUN vises under selve leken,
ALDRI i den generelle Dokumenter-oversikten. Bygges som default i ny datamodell fra start.
- NY DETALJ (v31): i dagens løsning sletter man en aktivitet med tilleggsmateriale, men
dokumentet slettes ikke — det DUKKER OPP under Dokumenter etterpå og må fjernes manuelt.
Ny datamodell må ha en ekte relasjon med kaskadesletting, ikke dagens taksonomi-triks.
- NY DETALJ (v31): dokumenter skal ikke lenkes til flere kategorier under Type. Prinsippet er ett
hjem + relasjoner, ikke multi-kategori.
- Filternumre skjules: ikke vis antall i parentes bak filteralternativer.
- Kompetansemål-regel: sjekk om finnes FØR nytt opprettes; velg lavest tall ved dubletter; ALDRI
slett (mister koblingen).
- Sletting: alt som slettes fra siden slettes også fra Back-up-mappen.
Å avklare: det finnes TO ulike versjoner av lagringsrutinen i omløp — én med mappestruktur (TL-
Norge / Team TL / Grafikk) og egen kursmodul-grafikkregel, og én uten. Kjartan må avklare hvilken
som er master før Fase 3 bygger på den.

### C.6 Omtale-kartleggingen — Evidence-råstoff

Fable 5-kartlegging av ~30 offentlige omtaler. Rapport: omtaler-trivselsleder-2026.md. Råstoffet til
«Evidence»-området på ny forside.

#### Topp-rangerte omtaler

1. DNV GL-analysen (2017): 67 skoler/11 562 elever — færre mistrivsel, +6 pp «morsomme
aktiviteter», 9% bedre arbeidsro, 85%+ mindre mobbing, 90%+ fornyer. MÅ skaffes i original. 2.
Harvard GSE-profilen: 350 000+ elever, 1 300 skoler, 70 000 elevledere. 3. Ashoka Fellow
(2013/14). 4. NRK «Årets pøbel» (2015). 5. Masteroppgave spes.ped (2021): 77% god erfaring
sårbare elever, 82% færre går alene — forfatter/arkivreferanse må graves frem. 6. Ferske stemmer:
Bergen/Lyshovden (2025), Pedagog Uppsala (2024), Sparebankstiftelsen DNB (3,7 mill.),
Kronprinsparets Fond.

#### Kritisk side å kjenne

Udirs kunnskapsoversikt: «ikke eksternt evaluert» — DEN faglige innvendingen. Motsvares av DNV
GL + masteroppgave, men vær presis.
Hjemmelekser (Kjartan): skaff DNV GL-rapporten i original. Finn masteroppgavens
forfatter/arkivreferanse. Skaff ASK-studien (kapittel 1.3).

### C.7 Fase 3-dybdekartleggingen (Fable 5, 4. juli)

Rapporter: fase3-ramsalt-dybde-2026.md, inspirasjon-lekebank-2026.md, fase3-inspirasjon-
SAMMENDRAG-2026.md.
- Metadata ligger i fritekst (største enkeltjobb): Sted/Antall/Utstyr står som fet tekst i beskrivelses-
HTML (761 av 868 leker). Må parses ut til egne felter ved migrering. NY INNSIKT i v31: dette er
en BEVISST husregel, ikke slurv — se seksjon 48.

  *På vanlig norsk, og dette er den største enkeltjobben i hele Fase 3: i dagens
  system står «Sted: ute», «Antall: 10–30», «Utstyr: ball» inne i selve
  beskrivelsesteksten, med fet skrift. For et menneske er det helt lesbart. For
  et søkefelt er det usynlig — man kan ikke be systemet om «alle leker ute for
  over 20 elever uten utstyr», fordi systemet ikke vet at det står der. Jobben
  er å hente disse opplysningene ut av teksten og gi dem hver sin plass, slik at
  de kan filtreres på. Det gjelder 761 av 868 leker. Mønsteret er likt nok til
  at maskinen kan gjøre det meste, men det må kontrolleres. **Dette er
  arbeidet som avgjør om innholdet blir søkbart til 1. oktober.***
- fid→fil kun via safe_value.
- Taksonomi-vask med tall: kompetansemål 302 termer, ~61 dubletter i 21 grupper. Regel: velg
lavest tall i parentes ved dubletter, aldri slett.
  *På vanlig norsk: merkelappene som brukes til å sortere innholdet — for
  eksempel kompetansemål — er skrevet inn litt ulikt gjennom årene, så samme
  merkelapp finnes i flere varianter. 302 merkelapper, hvorav rundt 61 er
  dubletter fordelt på 21 grupper. De må slås sammen, ellers deles innholdet på
  varianter og halvparten blir usynlig i filteret. Ingenting slettes — de
  slås sammen.*
- atlu ≠ game: atlu har kompetansemål-felt + trinn + hierarkisk topic, men mål og trinn er ikke
koblet per rad. Dokumenter: 537 totalt, 31 «Tilleggsmateriale til leker», 322 refereres fra
leker/atlu, 215 frittstående skjemabank.

- Bibliotek-idéer: fasett-filtre (trinn, antall min/maks, sted, utstyr med «uten utstyr» som ett klikk —
157 leker finnes men er gjemt, varighet, formål); video øverst med tekst-fallback + print-A4;
favoritter + programbygger; kuraterte samlinger.
- VIKTIGST: eget felt «kan ledes av elever» — TLs konkurransefortrinn bygget inn i selve
datamodellen. Ingen internasjonal konkurrent har dette.
- Innholdshull: rolige/regulerende aktiviteter, tilpasning/inkludering som fast felt, bli-kjent-leker,
leker for 1–2 deltakere, samarbeidsleker, tradisjonsleker, selvstyrte stasjonsleker,
natur-/uteskoleleker.
Korrigert i v31: Fable foreslo en lek-mal med Hensikt/Oppsett/Steg-for-steg/Variasjoner/Tilpasning.
Denne skal IKKE brukes — huset har sin egen 8-punktsmal som er bedre og allerede innarbeidet
blant de ansatte. Se seksjon 48.
TO MEDIA-SPRIK må fortsatt oppklares med Jon FØR importen: (a) VIDEO: 247 av 254
refererte lek-mp4 mangler i Files/, men utpakkings-verifiseringen fant 439 videofiler / 26,99 GB. (b)
BILDEORIGINALER: 103 av 105 wysiwyg-originaler mangler, kun styles-derivater finnes — trenger
«beste tilgjengelige derivat»-strategi.

### C.8 Demo-manus for instruksjonsvideoen (kursplanlegger)

> **INNSPILL MOTTATT 5. AUGUST (Tage/Edalio).** En arbeidsflyt er testet:
> skjermopptak etter manus, klipp fra Artlist via MCP, norsk AI-stemme som
> voice-over. Beslutningen i kapittel 23.1 om å fraråde AI-video må **nyanseres,
> ikke omgjøres**: begrunnelsen gjaldt GENERERT video av fysiske aktiviteter —
> barn som leker blir utroverdig. Det står ved lag. Skjermopptak av et
> grensesnitt med AI-stemme er noe annet: skjermbildet er ekte, stemmen leser
> en tekst vi har skrevet. Må avklares: test stemmen på vårt fagspråk først,
> lisens og eierskap over år, og om flyten også passer lekevideoene i Fase 3.

Komplett manus for instruksjonsvideo av kursplanleggeren: Claude skriver klikkrekkefølge +
talepunkter, Kjartan spiller inn selv (Cmd+Shift+5 + mikrofon, egen stemme, naturlig tempo). Agentopptak
er frarådet på grunn av ujevn rytme.
Manuset skal dekke ALT: påmelding → godkjenning med nettverksforslag → kursoppretting med
hall-søk → skolekobling → svar-lenker og svar-skjema med kontekst → admin-verifisering →
evaluering med aggregater, gullkorn, kjøpsinteresse og CSV.
Oppdatert i v31: manuset må nå også dekke den automatiske utsendingen — at RA trykker én
knapp og systemet sender personlige lenker til hver hovedkontakt, og at purringen skjer av seg selv
etter fem dager. Dette er den mest overbevisende delen av demoen for en RA som i dag sitter med
mailto og blindkopi. Manuset bør derfor skrives ETTER at steg 3d er ferdig, ikke før.
Sluttest-dataene (3 TEST-skoler, 2 TEST-nettverk, 1 kurs med svar) brukes som demo-innhold, og
slettes sammen med Trinn B-testsporene før pilot starter for ekte.


---

## Vedlegg D — Ferdig og levert

*Fullførte arbeidspunkter, flyttet ut av den aktive planen (regel 5 i
kapittel 0) så Del 2 bare viser det som gjenstår. Nyeste øverst.*

### 9. august 2026 — Sikkerhetshullet lukket ✅

- Rettingen av `api/kurs`-endepunktene pushet (commit `415e34b`) og live.
  Endepunktet `api/kurs/hvem-star-for-tur` svarer nå 401 / ikke autentisert i
  stedet for å gi ut kursnavn, mottakernavn og e-post. Bevist tett uavhengig
  fra Cowork.
- CRON_SECRET satt i Vercel (Production, Sensitive) og redeployet.
- GitHub-tokenet fjernet fra `.git/config`, slettet på GitHub, og nytt token
  lagt i macOS-nøkkelringen. Merk: `git push` må kjøres i et vanlig
  Terminal-vindu ved førstegangs-innlogging (interaktiv innlogging virker ikke
  inne i Claude Code); brukernavn `Trivselsleder`.

### 9. august 2026 — «Inaktiv»-status fjernet ✅

- Avvis-flyten satte skoler til status «Inaktiv». Fjernet, pushet og live
  (commit `11b0635`): avvisning endrer ikke lenger skolens status.
  Problem-påmeldinger håndteres manuelt. De offisielle statusene forblir seks:
  Påmeldt · Aktiv · Aktiv sagt opp · Pause · Tidligere · Potensielle.

### 9.–10. august 2026 — fire av fem tall talt fra ekte data ✅

- Fra Ramsalt-eksporten (26. juni): leker **868**, dokumenter **537**, TL-hjul
  **1 792**, periodeplaner **10 426** (pluss atlu 289, advantages 818; sum
  14 777 noder). Skrevet inn konsekvent i planen. Femte tall
  (kulturkortpartnere) gjenstår — ligger i Supabase, ikke talt (kap. 6, pkt. 1).

### 9. august 2026 — to småting avklart uten kodejobb ✅

- «Flytt til annet kurs» vises bare for «Kommer ikke»-skoler — viste seg
  ALLEREDE riktig i koden (siden 18. juni). Ingen endring nødvendig.
- Påminnelsen: RA velger dagen selv; den ubrukte nøkkelen
  `paaminnelse_dager_for` utgår.

### Pilot verifisert mot ekte kode — 10. august 2026

- Kursplanleggeren gjennomgått mot koden. Funn: kortstatus finnes allerede
  (tre valg, fjerde «Ikke ønsket» gjenstår), adresse/pris-felt finnes i
  hall-skjemaet (mangler data + tabellkolonner), RA-feltet autofylles fra
  nettverket, og `antall_kort` lagres ikke (den ekte kortutdelings-jobben).
  Full byggeliste i `PILOT-kartlagt-mot-kode.md`.
