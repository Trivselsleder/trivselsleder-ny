# Fremdriftsplan v33 — Trivselsleder AS

**6. august 2026 · bygget på v32 av 5. august**

## 0. Om dette dokumentet

**Hva v33 er.** Den fullstendige, samlede fremdriftsplanen. v32 er malen: alle
59 seksjoner (0–58) er med videre, ordrett. Det som er endret står som merkede blokker
der det hører hjemme. Ny seksjon: 59.

**Hva som er nytt i v33 (6. august).** Sju beslutninger er tatt, og alle er
svar på krav som forsvant ut av planen i juni og juli og som nå er hentet inn
igjen. De kom fram i gjennomgangen av samtlige 23 fremdriftsplaner fra v8 til
v30 — se `FUNN-v8-v30.md` (samme innhold som PDF-en `Funn_v8-v30_hva_falt_ut.pdf`). To av sakene reiste Kjartan selv underveis:
utviklingsmiljø etter lansering (ny seksjon 59) og oversikt i
kursplanleggeren (9.5). Ett punkt er bevisst strøket (49.2). Detaljert
endringslogg i 0.1.

> **Ny arbeidsregel fra 6. august: planen skal kunne leses av den som eier
> den.** Der planen sier noe teknisk, skal det stå en linje ved siden av på
> vanlig norsk om hva det betyr i praksis. Følger av CLAUDE.md: «Kjartan er
> IKKE utvikler.» Uten den regelen eier ikke prosjekteieren sitt eget
> dokument. Se seksjon 3.1.

**Hva som er nytt i v32 (5. august).** To ting. Det ene er at hele blokk A er
bygget og bevist: kursinformasjonssiden (52) og Tekster og maler (53) er nye
moduler, Resend Trinn B er fullført, og A1–A4 er ferdigstilt. Det andre er
sporbarhet (54): hvert punkt om kursplanleggeren sier nå hvor kravet kommer
fra, hva koden faktisk gjør, og hvordan vi vet det. Den gjennomgangen felte
fire statuslinjer som hadde stått som «Ferdig» siden 23. juni. Dessuten: to
autorisasjonshull funnet og lukket (55), og en gjennomgang av samtlige 33
dokumenter i «Min nettside» (56). Detaljert endringslogg i 0.1.

> **Om formatet.** Seksjon 1–51 er hentet ut av v31-PDF-en maskinelt.
> Innholdet er komplett — alle 51 seksjoner og alle 149 underseksjoner er
> kontrollert til stede — men tabeller og typografi er enklere enn i v31.
> Det er en bevisst avveining: innhold foran form. Originalen ligger fortsatt
> som `Fremdriftsplan_Trivselsleder_v31.pdf`.

### 0.1 Endringslogg v32 → v33

| Tema | Endring i v33 |
|---|---|
| **Språkregel (NY arbeidsregel)** | Der planen sier noe teknisk, skal det stå en linje ved siden av på vanlig norsk. Prosjekteieren skal kunne lese sin egen plan. Seksjon 3.1. |
| **Tilgangsstyring på kursholderkalenderen — LAGT TILBAKE** | «Deltakerliste, betaling, instruksjoner kun synlig for kursholder og admin.» Sto i planen fra v11 til v29, forsvant i v30. Personvernrelevant. Seksjon 9.9. |
| **Kortutdelingen — SPESIFISERT** | Hele flyten skrevet ned: beregning, at skolen aldri ser tallet, frysing på kursdagen, fire statuser, to faner hos Camilla, kryssjekk mot forhåndsbestillinger. Går fra prototype til spesifisert modul. Seksjon 9.7. |
| **Når fryses kortantallet — BESVART** | Ved midnatt når kursdagen begynner. Spørsmålet var stilt 15. juni og hadde stått ubesvart i 49 dager. Seksjon 9.7. |
| **Oversikt i kursplanleggeren — FIRE TILTAK** | Filterrad og eksport til pilot; «mine kurs» til lansering; kalendervisning etter lansering. Seksjon 9.5. |
| **Fase 3-designen — LAGT TILBAKE** | Den tekniske skissen fra juni (tabellene bak søk og AI-assistent) med kartleggingstallene. Sto i v13–v29, forsvant i v30. Merket som ikke revurdert mot Edalio. Seksjon 14.1. |
| **Åpne punkter ryddet (seksjon 36)** | Ett punkt lukket: kortantall-frysingen (besvart etter 49 dager). Statusraden for Resend Trinn B er dessuten rettet — den sa fortsatt «PÅGÅR» selv om Trinn B ble ferdig 4. august. Ett punkt strøket: kursbagger. To nye åpnet: rekkefølgen ordsøk/meningssøk i Fase 3, og RA-feltet som fritekst. Ett nytt fra kontrollrunden: fem tall der planen er uenig med seg selv. Seksjon 36. |
| **Kontrollrunden på v33** | Uavhengig kontrollør fant 30 avvik i førsteutkastet: nedkortet v17-sitat, manglende kildebevis, fire brutte kryssreferanser, sju motsigelser og fem uforklarte tekniske steder. Alle er rettet før utgivelse. Seksjon 58.3. |
| **Edalio-funnene flyttet inntil Fase 3** | De fire funnene som må avgjøres før bygging står nå ved siden av juni-skissen, ikke i en egen seksjon flere titalls sider bak. Seksjon 47 er uendret. Ny seksjon 14.1b. |
| **Bruksanvisning og tilbakerulling — LAGT TILBAKE** | Sto fra v8 til v29, forsvant i v30. Delt i to: hverdagsark for de ansatte (bøtte 1) og overlevering (23.5). Seksjon 23.4. |
| **Staging presisert** | Testsiden `trivselsleder-ny.vercel.app` ER staging-miljøet i dag. Planen skal si det som er. Seksjon 23.4. |
| **Tripletex og kontraktfelt — LAGT TILBAKE** | «Ny skole opprettes automatisk som kunde via API», og feltnavnene startdato, årsbeløp, kontraktsperiode. Sto til v17. Seksjon 6.3. |
| **Ledelsesdashboard — tre ting må registreres NÅ** | Statushistorikk for skoler, lagring av frafallsvarsler, og bevaring av brukslogg/e-postlogg. Historikk kan ikke lages i ettertid. Seksjon 11.3. |
| **Utviklingsmiljø etter lansering (NY seksjon 59)** | Tre nivåer, og oppskriften på databasen som forutsetning før den store dataimporten. Reist av Kjartan. |
| **Kursbagger og utstyrsbestilling — STRØKET** | v32 §49.2. Har ingenting med nettsiden å gjøre; håndteres i Tripletex/manuelt. Bevisst strøket 6. august, ikke forsvunnet. |


Hva dette er. Den fullstendige, samlede fremdriftsplanen for Trivselsleders nye digitale plattform.
Bygget ved å gå gjennom alle tidligere versjoner (v1–v30), begge
kursplanleggerkonseptdokumentene og CRM-notatet, slik at absolutt alt er med. Dette dokumentet
erstatter alle tidligere versjoner og alle løse arbeidsnotater.
Hva som er nytt i v31 (1. august). v31 er den første versjonen siden v30 der det faktisk er kodet
igjen. Hovedsaken er at Resend Trinn B er påbegynt for alvor: felles e-postmal er live, databasen for
flere mottakere per skole er ferdig, og den første automatiske kursinvitasjonen er sendt, bevist og
verifisert i produksjon. I tillegg er det kommet inn en betydelig mengde nytt kunnskapsgrunnlag: en
kartlegging av Edalio (som kjører samme tekniske stack som oss), fem interne ansattdokumenter
med husets egen redaksjonelle standard, og skolenes egne tilbakemeldinger fra 2023–2024. Fire
beslutninger er tatt som har stått åpne siden v30. Detaljert endringslogg i 0.1.
Hva som var nytt i v30 (10. juli). v30 var v29 med ti nye punkter fra en fri idémyldringsøkt (7. juli) —
ingen kode var endret siden v29. Nytt var: demo-manus (37), redigeringsrettigheter + endringslogg
(38), Fase 3+4 rekkefølge (39), TLA-lekeforslag (40), deling av periodeplaner (41), backup etter
lansering (42), 60-minuttersmålet (43), Island utdypet (44), oversettelsesstrategi (45) og må-til-lansering-rammeverket
(46).
Hva som var nytt i v29 (5. juli). Kursplanleggeren agenttestet ende-til-ende med alle fire fikser bevist.
Ramsalt-eksporten utpakket og verifisert. Fase 3-dybdekartlegging (Fable 5). Videoverts-research.
Redaksjonelle rutiner dokumentert. Internasjonal konkurrentkartlegging England + Tyskland.
Omtale-kartlegging. Lærervikaren.no kartlagt.
Hva som var nytt i v28 (29. juni). Evaluering Del 4 ferdig. Full Ramsalt-eksport mottatt. Dropbox-videokartleggingen
korrigert. Svensk side kartlagt. To-lags Europa-arkitektur besluttet. Fire nye
idéer. Videoverts gjort til åpent punkt.
Hva som var nytt i v26 og v27. v27: Ramsalt fid→filsti-kobling bekreftet løst, Dispatch/subagenter
dokumentert. v26: master-fordelingen i HubSpot-synken løftet eksplisitt frem.
Arbeidsregel for versjonering (fast). Forrige versjon er alltid malen for neste. Alt fra forrige versjon
skal alltid med videre — ingenting forsvinner ved en glipp. Det eneste som endres fra versjon til
versjon er det som bevisst er overstyrt, endret, besluttet fjernet, eller fullført. Slik kan ingen del falle
ut utilsiktet.
Forholdet til STATUS.md og CLAUDE.md. Tre dokumenter utfyller hverandre. Fremdriftsplanen
beskriver helheten: hvor vi er, hva som er besluttet, hva som gjenstår og hvorfor. STATUS.md (kort
tekstfil i prosjektmappen) er den tekniske statusen — nøyaktig hva som er bygget i koden — og
limes inn ved start av hver kodeøkt. CLAUDE.md er den faste prosjektkonteksten (stack, IDer,
regler, lærdommer) som sjelden endrer seg. STATUS.md endrer seg hver økt; CLAUDE.md ligger
fast.
Hvem dette er for. Kjartan Eide (daglig leder og medeier) er hovedbruker, og er ikke utvikler.
Planen er forståelig uten teknisk bakgrunn, men inneholder også de tekniske detaljene som trengs
mellom øktene.

### 0.2 Endringslogg v31 → v32

| Tema | Endring i v32 |
|---|---|
| **Blokk A ferdig og bevist** | A1 flytteflyt, A2 RA registrerer svar på vegne av skolen, A3 vertskap, A4 oppmøtetider — alle bygget og bevist 4. august. Seksjon 9.5. |
| **Resend Trinn B FERDIG** | Steg 3b, 3c og 3d er ferdige og bevist. Alle seks utsendingstypene er sendt i produksjon 2.–4. august, med nødbrems og dobbeltsendingsvern bevist på alle fire endepunkt. Seksjon 12, 12.9, 12.11. |
| **Kursinformasjonssiden (NY seksjon 52)** | En hel modul som sto i konsept v1 15. juni og forsvant 18. juni. Bygget 4. august — 50 dager forsinket. Ingen fremdriftsplan fra v16 til v31 nevner den. |
| **Tekster og maler (NY seksjon 53)** | Alle seks e-postene, kursinfoteksten, vertskapsnotatet, adressene og terskelverdiene redigeres nå av de ansatte selv. «Vi jobber tungvint» er løst. |
| **Kortutdeling — KORRIGERT** | Sto som «Ferdig» siden 23. juni. Er en 150-linjers prototype fra 18. juni som selv sier den ikke er ferdig. Seksjon 9.7. |
| **Kopier kursplan — KORRIGERT** | Sto som «Ferdig». `kopier_kurs` dupliserer ÉN kursrad uten skoler. Verdien lå i skolekoblingene. Seksjon 9.3. |
| **Flytteforespørsel — KORRIGERT** | «Kapasitet synlig» er ikke bygget. `onsket_kurs_id` har null kodetreff. Seksjon 9.5. |
| **Oppfølgingsflagg — KORRIGERT** | Delvis bygget: merkingen ER automatisk, oversikten mangler. Seksjon 9.5. |
| **Retest 6. juli — LUKKET** | Fire avvik som aldri sto i noen retteliste er kontrollert mot koden. Alle fire er lukket. Seksjon 9.8. |
| **Hallregisteret — PRESISERT** | Adresse og pris finnes som felt, men er tomme og vises ikke i tabellen. To utfylte kolonner i kildefila ble aldri importert. Seksjon 9.6. |
| **Evalueringsmodulen — NEDGRADERT** | Fra «komplett modul» til kodeverifisert, ikke kjørt. Bare selve utsendingen er bevist. Seksjon 10. |
| **Ledelse-siden — KORRIGERT** | Halvbygget. Svarprosent på tvers og status per region mangler. Seksjon 11. |
| **To nye arbeidsregler** | «Den som bygger, kontrollerer ikke alene» og «ingen nedkorting uten fjernet-liste». Begge lagt til fordi de ble brutt. Seksjon 3. |
| **Avgrensningen utvidet** | Sju krav fra konsept v1 som er beskrevet, men ikke bygget, er ført opp der de hører hjemme. Seksjon 9.11. |
| **Åpne punkter oppdatert** | Fem punkter avklart siden v31, fire nye åpnet. Seksjon 36. |
| **Videoproduksjon** | Innspill fra Tage/Edalio om skjermopptak med AI-stemme. Nyanserer, men omgjør ikke, beslutningen i 31.1. Seksjon 37. |
| **Bøttene oppdatert** | Trinn B ute av «må til pilot»; API-nøkkelrotering, hallimport og loop-test inn. RLS-gjennomgangen inn i «må til lansering». Seksjon 29 og 46. |
| **Sikkerhet (NY seksjon 55)** | Fem admin-endepunkter og fire `api/kurs`-endepunkter sto uten tilgangssjekk. Ett av dem lekket skolenes kontaktlister til hele internett. Rettet. |
| **Dokumentgjennomgang (NY seksjon 56)** | Samtlige 33 dokumenter i «Min nettside» vurdert. Ni funn som ikke sto noe sted fra før. |
| **Sporbarhet (NY seksjon 54)** | Tre bevisnivåer innført: BEVIST, KODEVERIFISERT, PÅSTÅTT. Ingen statuslinje uten kilde. |
| **Gjentakelsesvern (NY seksjon 57)** | Seks regler som skal hindre at juni gjentar seg. |
| **Selvkritikk (NY seksjon 58)** | Førsteutkastet av v32 brøt sine egne regler fem ganger og ble felt av kontrollører. Dokumentert, ikke skjult. |
| **Formatet** | v32 er bygget på v31 i sin helhet. Førsteutkastet var på ni sider og kortet v31 ned fra 55 — samme feil som ble gjort i juni. Rettet etter innsigelse fra Kjartan. Seksjon 58. |

### 0.3 Endringslogg v30 → v31

| Tema | Endring i v31 |
|---|---|
| Resend Trinn B — steg 1 (FERDIG) | Felles e-postmal api/_epost-mal.js live. De fire konto-e-postene bruker den. Bevist i produksjon. Seksjon 12.6. |
| Resend Trinn B — steg 2 (FERDIG) | Database for flere mottakere per skole ferdig: ny tabell, stempelkolonner, innstillinger-tabell. Ylva-innspillet (12.3) er dermed løst i datamodellen. Seksjon 12.7. |
| Resend Trinn B — steg 3a (FERDIG OG BEVIST) | Automatisk førstegangsutsending av kursinvitasjon sendt i produksjon med personlig lenke per mottaker, full logging og dobbeltsendings-vern. Seksjon 12.8. |
| Seks utsendingstyper, ikke fire (KORRIGERT) | v30 og STATUS.md listet fire. Riktig tall er seks — invitasjon og trinn 3 manglet. Seksjon 12.9. |
| Avsenderprofil besluttet | noreply@trivselsleder.no med svar-til post@trivselsleder.no. Alle tre verdiene ligger i innstillinger-tabellen og kan endres uten kode. Seksjon 12.10. |
| Fire beslutninger tatt 1. august | Fase 4-verktøy MÅ til lansering. Alle 868 leker inne ved lansering, mål 1. oktober. Bunny.net valgt. Rettighetsmatrise spikret. Seksjon 36 og 38. |
| Edalio-kartlegging (NY seksjon 47) | Konkurrent/nabo som kjører SAMME stack som oss. Ti konkrete mønstre som kan gjenbrukes direkte i Fase 3-strukturen, ikke bare inspirere. |
| Redaksjonell standard for leker (NY seksjon 48) | Husets egen 8-punktsmal mottatt. Erstatter den foreslåtte malen fra Fable-kartleggingen. Forklarer også metadata-i-fritekst-problemet. |
| RA-rollen som arbeidsflyt (NY seksjon 49) | Arbeidsinstruksen for regionansvarlig lest mot planen. Bekrefter tre moduler som reelt behov, avdekker ett mulig hull. |
| Skolenes tilbakemeldinger (NY seksjon 50) | Tilbakemeldingslogg 2023–2024. Bekrefter innholdshullene uavhengig, og avdekker det største udekkede ønsket: en bank for drift og organisering av TL. |
| Arbeidsform: Claude Code (NY seksjon 51) | Programmering skjer nå i Claude Code, ikke som løse terminalkommandoer. Ny arbeidsdeling mellom chat, Claude Code og agenter. |
| Tre nye kritiske regler (seksjon 3.1) | GRANT til service_role ved nye tabeller. Cache-hodet ved testing mot Vercel. Reservasjonsmønster for alt som sender e-post. |
| Seksjon 46 utvidet til tre bøtter | Sorteringsøkten 29. juli viste at det er to milepæler, ikke én: pilot og lansering. Rammeverket er utvidet tilsvarende. |

### 0.4 Endringslogg v29 → v30

| Tema | Endring i v30 |
|---|---|
| Demo-manus (seksjon 37) | Konkret plan for instruksjonsvideo: Claude skriver manus, Kjartan spiller inn selv. |
| Redigeringsrettigheter (seksjon 38) | Ansatte skal redigere direkte i grensesnittet. Rettigheter knyttes til de fire rollene; endringslogg + slette-vern. |
| Fase 3+4 rekkefølge (seksjon 39) | Bygg datamodell + verktøy på testdata (10–20 leker) FØR full import av 868. |
| TLA-lekeforslag (seksjon 40) | Redaksjonell arbeidsflyt der trivselsledere sender inn egne forslag. |
| Deling av periodeplaner (seksjon 41) | Skoler kan dele periodeplan med naboskole. Start smalt. |
| Backup etter lansering (seksjon 42) | Ansatte slipper manuell PDF-backup — automatikk erstatter menneskelig disiplin. |
| 60-minuttersmålet (seksjon 43) | Strategisk reposisjonering: TL som skolens verktøy for hele dagens fysiske aktivitet. |
| Island utdypet (seksjon 44) | Digital tjeneste via språk-switch + abonnement. Kan bli pilot for digital abonnementsmodell. |
| Oversettelsesstrategi (seksjon 45) | Oversett DATA i Supabase, ikke dokumenter. |
| Må-til-lansering (seksjon 46) | Ny beslutningsramme for hva som må være klart til lansering. |

### 0.5 Tidligere endringslogger (v24–v29, sammendrag)

v28→v29: kursplanlegger agenttestet med fire fikser bevist; Ramsalt verifisert + originalbilde-regel;
Fase 3-dybdekartlegging (metadata i fritekst = største parsejobb, taksonomi-vask tallfestet);
Bunny.net anbefalt; redaksjonelle rutiner (seksjon 33); internasjonal kartlegging England + Tyskland;
omtale-kartlegging (seksjon 34); Lærervikaren.no (seksjon 35).
v27→v28: Evaluering Del 4 ferdig; Ramsalt full eksport mottatt; Dropbox-video korrigert til 3 224
videoer / 248 GB; svensk side kartlagt; to-lags arkitektur + franchise (seksjon 30); fire nye idéer
(seksjon 31); videoverts under vurdering (seksjon 32); Dispatch verifisert.
v26→v27: Ramsalt fid→filsti løst. Full eksport bestilt. Dispatch/subagenter innarbeidet. Cowork-oppdrag
A/B/C dokumentert.
v25→v26: master-fordeling i HubSpot-synk (punkt 6.2) — nettsiden master for skoleinfo, HubSpot
master for kontrakter.
v24→v25: HubSpot 8B-2 fullført. E-postsporing forstått. Nyhetsbrev tallfestet (84 e-poster, ~7
500/mnd). Workflows vs Sequences skilt.
v23→v24: kartlegging av dagens side fullført. TL-hjul og periodeplaner: migreres IKKE. Evaluering
Del 3 ferdig.

---

## 1. Overordnet om prosjektet

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
senere uten ombygging. Full beskrivelse i seksjon 30.

### 1.1 Nøkkelpersoner

| Person | Rolle |
|---|---|
| Kjartan Eide | Daglig leder og medeier (50%). Hovedbruker. Superadmin. |
| Tommy | Medeier (50%). Superadmin-tilgang til Ledelse-siden. Deler CRM-avløservisjonen. |
| Camilla Veum Bottenvik | Kortutdeling og fakturering (Tripletex). Egen fane «Fra kurspåmelding». |
| Eivind | Salg/CRM. Hovedbruker av HubSpot. Varsles ved kjøpsinteresse. |
| Marielle Haarvik | Fagansvarlig/kurskoordinator, Rogaland. Aktuell pilotbruker. |
| Kari Snartemo | RA Vestland & Møre og Romsdal. Filkunnskap/backup; rydder dagens nettside. |
| Ylva Nesset | RA. Innspill om flere mottakere per skole — løst i v31, se seksjon 12.7. |
| Jon Simonsen (Ramsalt) | Ekstern utvikler. Drupal 7-eksport av materiell. |
| Anneli / Malin | Svensk team. Verifiserer rektorliste (Sverige); aktive i HubSpot-salgspipeline. |
| Vegard / Karoline | Bidro til terminologi-beslutningen om lekebeskrivelser (seksjon 48). |

### 1.2 Merkeprofil

Merkefarger: Oransje #F47920 · Magenta #D6006E. Teal (#106C75) er utgått og skal ikke brukes.
Fonter i trykte hefter: Marvin (overskrifter), Avenir (brødtekst).

## 2. Teknisk stack og tjenester

| Tjeneste | Funksjon | Info |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | repo: trivselsleder-ny |
| Hosting | Vercel — auto-deploy ved push til main | vercel.com |
| Kildekode | GitHub (eid av Trivselsleder AS) | Trivselsleder/trivselsleder-ny |
| Database | Supabase — PostgreSQL, Auth, Storage (North- EU/Stockholm) | zpirjbrcbeubwpmtncxx |
| CRM | HubSpot — kontrakter, deals (master i dag) | portal 145220138 (app-eu1) |
| E-post | Resend — i drift, Trinn B ferdig 4. aug (v31: «påbegynt») | noreply@trivselsleder.no |
| Innlogging | Supabase Auth + Feide OIDC | sikt.no |
| AI | Claude API — rektoragent, Trivselsbot, churn | console.anthropic.com |
| Søk | SerpAPI — rektorbase-søk | 15 000/mnd |
| Video | Bunny.net Stream — VALGT 1. august | bunny.net |
| E-signering | DealBuilder — BankID (beholdes) | ekstern |
| Fakturering | Tripletex (Camilla) | tripletex.no |
| Betaling intl. | Stripe (planlagt, Fase 8) | stripe.com |
| Utviklingsverktøy | Claude Code — programmering fra 1. august | seksjon 51 |

Supabase prosjekt-ID: zpirjbrcbeubwpmtncxx. Kjartans superadmin-UID: 9ee20e27-c5c2-4917a6ba-4b3baedabf11.

## 3. Kritiske regler og bærende prinsipper

> **KORRIGERT 5. AUGUST 2026.** To arbeidsregler er lagt til, begge fordi de
> ble brutt: **(1) Den som bygger, kontrollerer ikke alene.** Ingen påstand
> videreføres uten ny kontroll mot kilden — verken i kode eller i dokument.
> **(2) Ingen nedkorting uten fjernet-liste.** Kortes et dokument, følger en
> liste over hva som gikk ut. Se seksjon 54 og 58.

### 3.1 Kritiske sikkerhets- og arbeidsregler (uten unntak)

> **NY ARBEIDSREGEL 6. AUGUST — planen skal kunne leses av den som eier den.**
> Der planen sier noe teknisk, skal det stå en linje ved siden av på vanlig
> norsk om hva det betyr i praksis. Ikke i stedet for det tekniske — ved siden
> av. Følger av CLAUDE.md: «Kjartan er IKKE utvikler. Gi ALLTID eksakte
> copy-paste-kommandoer (restaurant-nivå), aldri tekniske forklaringer som
> forutsetter koding.»
>
> Regelen kom fordi den ble brutt: spørsmålene i `FUNN-v8-v30` var skrevet på
> fagspråk, og prosjekteieren kunne ikke svare på dem. En plan eieren ikke
> forstår, styrer ingenting.


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
- NY (1. aug): nye tabeller og funksjoner må ALLTID få GRANT til service_role også. Dette ble
glemt tre ganger på rad i Trinn B-økten og stoppet arbeidet hver gang. Serverfunksjoner bruker
service_role-nøkkelen, og den arver ikke rettigheter automatisk når tabellen opprettes manuelt.
Regelen gjelder både tabeller (GRANT SELECT/INSERT/UPDATE) og funksjoner (GRANT
EXECUTE).
- NY (1. aug): ved testing av serverfunksjoner via curl skal alltid -H "Cache-Control: no-cache"
legges på. Uten dette kan Vercel svare fra mellomlager, slik at man tester gammel kode uten å
vite det. Dette ga en halvtimes feilsøking på en feil som ikke fantes.
- NY (1. aug): alt som sender e-post skal reservere plassen i samme operasjon som den skriver.
Én atomisk oppdatering med betingelse «kun hvis feltet er tomt» — ikke les-så-skriv. Bare da er
dobbeltsending umulig, uansett hvordan lesingen oppfører seg.
- API-nøkler i terminal: bruk python3 -c med input(), én nøkkel om gangen. Aldri nano.
Lærdom (deploy-floke 22. juni). Sjekk alltid at Vercel faktisk har bygget riktig commit. En byggefeil
kan gjøre at siden viser en eldre versjon selv om koden lokalt er korrekt. Bekreft også at git-push
faktisk fullførte.

### 3.2 Bærende prinsipper for hele prosjektet

- Flerspråklig fra dag 1: all tekst i i18n-filer. Ingen synlig tekst hardkodes.
- To-lags / land-agnostisk fra dag 1: universell logikk i Lag A; alt landsspesifikt i Lag B som
konfigurasjon. Se seksjon 30.
- Tilgjengelighet (WCAG 2.1 AA): lovpålagt for skolesektoren. Bygges inn fra start.
- Mobil-først: all utvikling tar utgangspunkt i mobilvisning.
- Uavhengig av én person: siden kan driftes, videreutvikles og overtas av andre.
- GDPR innebygd: personvern tenkes inn i all funksjonalitet fra starten.
- Dynamisk og selvdriftet: enkelt å endre uten ekstern leverandør.
- Innstillinger i basen, ikke i koden: verdier som kan tenkes å endre seg (dager før purring,
avsenderadresse, nettadresse) legges i innstillinger-tabellen. Bevist nyttig i Trinn B — se seksjon
12.10.
- Stripe-klar arkitektur: betalingsflyt planlegges inn tidlig.
- Systemet foreslår, mennesket bestemmer: automatikk genererer forslag som godkjennes —
endrer aldri forretningskritiske data selv.
- Rekkefølge-tenkning først: tenk gjennom tekniske avhengigheter før bygging.
- Bygg én ting, verifiser, gjenta. Ingenting erklæres ferdig uten bevis.

- Agenter: si fra om manglende tilgang, ikke konkluder tomt.

## 4. Status akkurat nå (skrevet 1. august 2026, oppdatert 5. og 6. august)

> **OPPDATERT 5. AUGUST 2026.** Siden 1. august: hele blokk A er bygget og
> bevist (A1 flytteflyt, A2 RA registrerer svar på vegne, A3 vertskap, A4
> oppmøtetider, A5 kursinformasjonssiden, A6 Tekster og maler). Fem
> admin-endepunkter fikk tilgangssjekk 4. august; fire `api/kurs`-endepunkter
> 5. august. Agenttest 3 kjørte alle 34 punkter i fasiten uten avvik.
> Nye seksjoner: 52–58. Full endringslogg i 0.1.

> **RETTET 6. AUGUST.** To rader i tabellen under sa noe annet enn resten av
> planen: Resend Trinn B steg 3b–3d sto som «NESTE OPPGAVE» selv om det ble
> ferdig 4. august, og Evaluering sto som «Komplett» selv om seksjon 10 sier
> «kodeverifisert, ikke kjørt». Begge er rettet i tabellen. Blokken over sier
> «Nye seksjoner: 52–58» — det gjaldt v32; v33 legger til seksjon 59.

Kodearbeidet er gjenopptatt etter ferien. Den viktigste endringen siden v30 er at Resend Trinn B er
godt i gang: steg 1 (felles e-postmal) er live, steg 2 (flere mottakere per skole) er ferdig i databasen,
og steg 3a (automatisk førstegangsutsending) er bygget, sendt i produksjon og verifisert.
Kursplanleggeren er fortsatt pilot-klar. I tillegg er det kommet inn mye nytt kunnskapsgrunnlag som
påvirker Fase 3 direkte (seksjon 47–50).

| Modul / fase | Status |
|---|---|
| Fase 1 — Grunnmur (React/Vercel, i18n, kulturkort) | Ferdig |
| Fase 2 — Innlogging, skoleregister, HubSpot-synk | Ferdig |
| Rektoragent + skolesjef-agent (NO grundig, SE delvis) | Bygget & testet |
| Fase 6 — Kursplanlegger (steg 1–5 + agenttest) | PILOT-KLAR — fiks 1–4 bevist, sluttest grønn 6. juli |
| Hallregister (161) + Kursholderregister (17) | Ferdig |
| Evaluering — grunnmodul + Fase 2 (Del 1–4) | Kodeverifisert, ikke kjørt — nedgradert 5. august (v31: «Komplett»). Se seksjon 10. |
| Ledelse-side + churn (Trinn 1 + Trinn 2) | Ferdig |
| Resend Trinn B — steg 1 (felles e-postmal) | FERDIG OG LIVE 1. august |
| Resend Trinn B — steg 2 (flere mottakere, database) | FERDIG 1. august |
| Resend Trinn B — steg 3a (automatisk invitasjon) | FERDIG OG BEVIST 1. august |
| Resend Trinn B — steg 3b–3d (motor, e-poster, frontend) | FERDIG OG BEVIST 2.–4. august (v31 sa «NESTE OPPGAVE») — se 12.9 |
| Brukslogg (innlogging/sidevisning) | I drift (dashbord gjenstår) |
| Kartlegging dagens side (Cowork, 8 oppdrag) | Ferdig |
| HubSpot-kartlegging (8B-1 + 8B-2) | Ferdig |
| Ramsalt full eksport | UTPAKKET & VERIFISERT — fersk eksport bestilles aug/sep |
| Fase 3-dybdekartlegging (Fable 5) | Ferdig — to media-sprik å oppklare |
| Edalio-kartlegging | FERDIG 1. august — ti mønstre til Fase 3 (seksjon 47) |
| Ansattdokumenter / redaksjonell standard | MOTTATT 1. august (seksjon 48–50) |
| Videoverts | BESLUTTET 1. august — Bunny.net |
| Internasjonal konkurrentkartlegging (Eng + Tyskland) | Ferdig — England anbefalt førstemarked |
| Omtale-kartlegging (Evidence-råstoff) | Ferdig |
| Lærervikaren.no kartlagt | Ferdig — fremtidig prosjekt |
| To-lags Europa-arkitektur + franchise | Besluttet retning |
| Forside-design | Planlagt |
| Fase 3 — Ressursbibliotek | Klar til oppstart — arbeidsform besluttet (seksjon 39) |
| Fase 4 — Interaktive verktøy | MÅ til lansering (besluttet 1. aug) — bygges nytt |
| Stor dataimport (skoler/ansatte/nettverk) | Mot slutten |
| Redigeringsrettigheter/endringslogg | Rettighetsmatrise BESLUTTET 1. aug, ikke bygget |
| Fase 7–10 (undersøkelse, intl., AI, app) | På horisonten |
| CRM/HubSpot-avløser | Egen retning, lenger frem |

## 5. Fase 1 — Grunnmur (ferdig)

Mål: fungerende side med kjernefunksjonalitet for kulturkort og grunnleggende struktur.

### 5.1 Teknisk grunnlag (ferdig)

- React + Vite + Tailwind CSS. GitHub og Vercel med auto-deploy ved push til main.
- i18n norsk/svensk (react-i18next), språkvelger i header, SPA-routing.

### 5.2 Kulturkort (ferdig)

- 1685 partnere i Supabase. Tre kategorier: aktiv, tidligere, potensiell.
- Bestillingsskjema med portokalkulator: 40 kr/kort (fra src/utils/satser.js). Portosatser:
28/28/46/69/99 kr etter vekt. Bestillinger til kulturkort@trivselsleder.no.
- Admin-panel /admin/kulturkort: tre kategorier, søk/filter, redigering, velg-og-send e-post med
BCC.
- 814 partnerbeskrivelser live; 176 manglende URL-er fylt via agent.
- Admin-lenke i toppmeny (kun superadmin).

### 5.3 Restpunkter (mindre)

- Admin-panel for bestillingsoversikt tilsvarende gammel Drupal-side (levert/fakturert-status).
- Konfigurering av portosatser i admin.
- Kulturkort-e-postene har eget visuelt uttrykk (gradient/emoji, ingen oransje topplinje) og ble
bevisst latt urørt i Trinn B steg 1. Ryddes når designprofilen landes — se seksjon 12.6.

## 6. Fase 2 — Innlogging, brukere og skoleregister (ferdig)

Mål: skolene logger inn, nye skoler melder seg på, full oversikt i backend.

### 6.1 Ferdig

- Supabase Auth: brukernavn/passord og Feide OIDC. Min side, glemt-passord med branded epost.
- Påmelding (/paamelding) + admin-godkjenning (/admin/paameldinger). Min side: skolen
redigerer egen info.
- HubSpot-synk fullt verifisert: alle skolefelter + kontaktroller. Rektor-bytte rydder gammel kobling
automatisk.
- Flere TL-ansvarlige per skole (2–5) synkes som egne HubSpot-kontakter. Selve mottakerlogikken
er nå bygget — se seksjon 12.7.
- Skoleregister: filtrering på alle felter, CSV-eksport (33 kolonner), velg-og-send e-post med BCC.
- Rollestyring i fire nivåer: superadmin / administrator / HTLA / ansatt.
- Databasetabeller: profiles, skoler, bruker_skole, paameldinger.

### 6.2 Master-fordeling: hvem eier hva (toveis-synk)

| Datatype | Master (eier) | Retning |
|---|---|---|
| Skoleinfo: rektor, HTLA, TLA, adresse, kontaktroller | Nettsiden | Nettside → HubSpot |
| Kontrakter / avtaler (startdato, pris, varighet, status) | HubSpot | HubSpot → nettside |

I praksis: nettsiden er master for skoleinfo, HubSpot er master for kontrakter/avtaler. Nettsiden
endrer aldri kontraktsdata i HubSpot selv — den foreslår og flagger.

### 6.3 HubSpot-synk — tre prioritetsnivåer

> **LAGT TILBAKE 6. AUGUST.** To ting sto i planen fra v9/v15 til og med v17 og
> var borte igjen i v20:
>
> - **Tripletex-kobling, P3 — etter lansering:** «ny skole opprettes automatisk
>   som kunde via API». *På vanlig norsk: når dere godkjenner en ny skole på
>   nettsiden, dukker den opp som kunde i Tripletex av seg selv, så Camilla
>   slipper å taste den inn en gang til.* Merk at HubSpot-tvillingen står som
>   P2 i tabellen under — Tripletex-halvparten falt ut alene, og det ser ut som
>   en forglemmelse.
> - **Feltnavnene på kontraktinfoen:** startdato, årsbeløp, kontraktsperiode.
>   v32 sier bare «kontraktinfo», og da vet ingen hvilke felter det gjelder.
>   Samme type tap som hallregisterets «adresse» og «pris».
>
> **Ordrett fra v17 (§ Fase 2b) — kontraktinfoen sto der fra v9, 10. juni:**
>
> > «Fase 2b · Ledelsesdashboard og integrasjoner. Mål: økonomioversikt og
> > automatisering — bygges etter lansering.
> > ■ Kontraktinfo fra HubSpot på skolekort: **startdato, årsbeløp, periode**.
> > ■ **Tripletex-integrasjon: ny skole opprettes automatisk som kunde via
> > API.**
> > ■ Ledelsesdashboard (Tommy/Kjartan): kontraktsverdi, geografi, churn,
> > vekst.»
>
> Den tredje linjen — ledelsesdashboardet med kontraktsverdi og geografi —
> hører sammen med seksjon 11.3 og er det samme dashboardet Kjartan har
> valgt å utsette. Den er tatt med her fordi de tre linjene hørte sammen i
> juni: økonomitallene kommer fra Tripletex og kontraktfeltene, og uten dem
> har dashboardet ingenting å vise.
>
> Tidspunktet er uendret: alle tre sto som «bygges etter lansering» allerede i
> juni. Kontrollert 6. august: ingenting av dette er bygget — ingen
> Tripletex-kobling i koden, ingen kontraktfelter på skolekortet.


| Prioritet | Beskrivelse | Status |
|---|---|---|
| P1 — kritisk | Skolen endrer info på Min side → oppdateres automatisk i HubSpot | Verifisert |
| P2 — viktig | Ny skole godkjennes → opprettes automatisk som Company med status «Påmeldt» | Planlagt |
| P3 — etter lansering | Kontraktinfo fra HubSpot vises på skolekort på Min side: **startdato, årsbeløp, kontraktsperiode** | Planlagt |
| P3 — etter lansering | Tripletex: ny skole opprettes automatisk som kunde via API (LAGT TILBAKE 6. august) | Planlagt |

### 6.4 Skolestatuser

Påmeldt · Aktiv · Aktiv sagt opp · Pause · Tidligere · Potensielle.

### 6.5 Min side — fullt faneoppsett (mål, fra gammel side)

Min side · Administratorer · Ansatte · Kundeinformasjon · Bestillinger · Dokumenter · Aktiviteter ·
Move it · Aktiv læring · Periodeplaner · TL-hjulet · Drift av TL.

## 7. Rektoragenten og skolesjef-agenten (bygget og testet)

En gjenbrukbar AI-agent (Claude API + SerpAPI) som bygger og vedlikeholder en komplett base
over rektorer og skolesjefer i Norden.

### 7.1 Norge (testet grundig)

- Rektorbase v7: 2456 aktive offentlige grunnskoler. 100% navn, 83% e-post, 100% telefon.
- Gjenbrukbar agent: Claude Haiku + Fable 5, 5 søkerunder. Flagger MULIG
NAVNEBYTTET/NEDLAGT.
- Skolesjef/oppvekstsjef v5: 357 kommuner. 94% navn, 85% e-post/telefon.

### 7.2 Sverige (delvis)

- Rektorbase: 4681 grundskolor via Skolverkets API. Fuzzy-matching: kun 9 av 373 TL-skoler ikke
funnet.
- Skolesjef: kjøres (276 kommuner). Ca. 3040 SerpAPI-søk gjenstår.

### 7.3 Datakilde-lærdommer

- Udir/NSR følger GSI med 1. oktober som telledato — nedleggelser/navnebytter henger etter.
- Brreg flagger ikke navnebytter pålitelig. Beste kvalitetssjekk er kommunens egen nettside.
- SerpAPI: 15 000 søk/mnd. Google Custom Search stengt for nye kunder fra jan 2026.

### 7.4 Neste / gjenstår

- Island (~175 skoler), kjøres etter Norge og Sverige er godkjent.
- Admin-knapp i siden: start agent med filter. Cron 4x/år.
- Alle ~7300 nordiske skoler importeres til Supabase og synkes til HubSpot som varme kontakter.

## 8. Kulturkort-agenten

Samme mønster som rektoragenten, to oppgaver: (1) finn e-post til eksisterende partnere som
mangler det, (2) kartlegg tilsvarende tilbydere i alle TL-kommuner. Potensial: fra 714 til flere tusen
partnere.

## 9. Fase 6 — Kursplanlegger (PILOT-KLAR)

> **KORRIGERT 5. AUGUST 2026 — les dette før resten av seksjonen.**
> Fire statuslinjer i denne seksjonen var feil, og hadde vært det siden
> 23. juni. De er merket der de står. Kort:
>
> - **Kortutdeling** står som Ferdig. Riktig: prototype i drift, ikke fullført (9.7).
> - **Kopier kursplan til ny sesong** står som Ferdig. Riktig: `kopier_kurs`
>   dupliserer ÉN kursrad uten skoler (9.3).
> - **Flytteforespørsler med kapasitet synlig** er ikke bygget (9.5).
> - **Oppfølgingsflagg på fritekst** er delvis bygget (9.5).
>
> Til gjengjeld er seksjonen for forsiktig på ett punkt: de fire avvikene fra
> retesten 6. juli er alle lukket i koden (9.8).

Erstatter dagens Excel + QuestBack + Google Forms-flyt. Kjernen i det aktive arbeidet. Funksjonelt
komplett — alle fem byggesteg ferdige og testet, og hele flyten er agenttestet ende-til-ende med alle
fire fikser bevist (se 9.8).
Hvorfor: pilotperioden viste at man brukte mer tid, ikke mindre, fordi samme info finnes flere steder.
Et kurs lever i dag fire steder. Grunngrepet: nettsiden blir navet, hvert kurs finnes ÉN gang.

### 9.1 Roller

- RA (regionansvarlig): oppretter/endrer kurs. Sender kurslenker. Ser svar live.
- Alle ansatte: kan endre ethvert kurs ved behov.
- Skolen (Hovedkontakt TL): får lenke på e-post, bekrefter/melder endring. To minutter.
- Kursholder: eget register (egne + eksterne).
- System: purrer ubesvarte, sender påminnelse, sender evaluering etter kurs, logger alt. Fra 1.
august er første utsending automatisk — se seksjon 12.8.

### 9.2 Datamodell — én sannhet

Tabell kurs: tittel, uke/dato/dag, hall, vertskap, oppmøtetider, RA/kursholder/backup,
region/fylke/nettverk, status, maks_antall, sesong.
Tabell kurs_skole: mottaker/e-post/mobil, svar_status, onsket_kurs_id, årsak, antall_tl, antall_kort,
kort_status, vertskap-felt, melding_fra_skole, svar_tidspunkt, lenke_token. Utvidet 1. august med
svart_av_mottaker_id, forste_utsending_at, purring_sendt_at og trinn3_sendt_at.
Tabell kurs_skole_mottaker (NY 1. august): én rad per TL-ansvarlig med egen lenke_token,
sendt_at og apnet_at. Se seksjon 12.7.
Teknisk merknad (FK-felle): kurs_skole har to FK til kurs — bruk alltid eksplisitt kurs!
kurs_skole_kurs_id_fkey i Supabase-spørringer.
*På vanlig norsk: en skolerad peker på kurset sitt to ganger — én gang på kurset den er meldt
på, og én gang på et kurs den eventuelt er flyttet til. Spør man databasen om «kurset» uten å
si hvilken av de to man mener, vet den ikke, og svaret blir enten tomt eller feil. Derfor må
navnet på koblingen alltid skrives ut i klartekst. Dette har vært årsaken til flere
«forsvunne» kurs under testing.*

**Merk om `antall_kort` (6. august):** feltet står i denne beskrivelsen av datamodellen, men
finnes hverken i migrasjonsfilene eller i koden — null kodetreff i `src/`, `api/` og `sql/`
(9.7). Om kolonnen faktisk er opprettet i den kjørende databasen, er ikke kontrollert; det kan
ikke avgjøres fra prosjektfilene, jf. 59.4. Tallet regnes ut på skjermen hver gang siden åpnes. Det er nettopp derfor frysingen
på kursdagen (9.7) må bygges — den kan ikke virke før tallet faktisk lagres i dette feltet.
I tillegg: tabell evalueringer (henger på kurs_skole), kursholdere (egne + eksterne), epost_logg (ny 1.
august) og innstillinger (ny 1. august).

### 9.3 Ferdige moduler

> **KORRIGERT 5. AUGUST.** To linjer i tabellen under er feil:
>
> - **«Kopier kursplan til ny sesong — Ferdig»** er FEIL. Det som finnes er
>   RPC-en `kopier_kurs`: den dupliserer ÉN kursrad, samme dato, samme sesong,
>   uten skoler. Konsept v1 §6 beskrev at hele planen kopieres vår→vår og
>   høst→høst, at strukturen følger med, at oppsagte skoler markeres og nye
>   foreslås geografisk. Verdien ligger i skolekoblingene — og det er den
>   delen som mangler.
> - **«Kortutdeling (TL + 10% → Camilla) — Ferdig»** er FEIL. Se 9.7.
>
> **«Steg 4 — RA-admin: Ferdig»** er sant for det som er bygget, men
> RA-admin i konsept v1 §5 hadde seks funksjoner. To av dem —
> flytteforespørsel og eksport — finnes ikke.

| Modul | Status |
|---|---|
| Steg 1 — Opprett kurs | Ferdig |
| Steg 2 — Koble skoler | Ferdig |
| Steg 3 — Svar-skjema | Ferdig & testet |
| Steg 4 — RA-admin | Ferdig |
| Steg 5 — Purring/påminnelse (Trinn A, mailto) | Ferdig — erstattes av Trinn B, se seksjon 12 |
| Hallregister (161 haller) | Ferdig |
| Kursholderregister (17 eksterne) | Ferdig |
| Kopier kursplan til ny sesong | Ferdig |
| Kortutdeling (TL + 10% → Camilla) | Ferdig |
| Automatisk førstegangsutsending (Trinn B, steg 3a) | FERDIG OG BEVIST 1. august |

### 9.4 Skolens opplevelse — lenken

Hver skole får en personlig lenke og kommer rett inn på sin egen rad — uten innlogging. Skjemaet
er kort (to minutter): bekreft info, kommer dere (ja/nei med årsak), antall trivselsledere, fritekst til
kursholder, vertskap-bekreftelse. Nei-svar kan be om annet lekekurs — RA godkjenner/avslår.
Endret i v31: lenken er nå personlig per MOTTAKER, ikke per skole. Flere TL-ansvarlige kan ha
hver sin lenke inn til samme svar-rad, og systemet registrerer hvem som faktisk åpnet og svarte. Se
seksjon 12.7.

### 9.5 RA sin opplevelse — admin

> **NYTT 6. AUGUST — oversikt i kurslista.** Kontrollert i koden: siden henter
> ALLE kurs uten begrensning, sortert på dato, opptil 10 000 rader på én side
> (`AdminKursplanlegger.jsx:112`). Over tabellen står bare knappen «+ Nytt
> kurs». Kolonnen som viser RA står i samme fil (`:246`), og sesongfeltet er
> definert i datamodellen (`:31`) men har ingen inntastingsboks noe sted.
> Det finnes intet filter, intet søk, ingen «mine kurs» og ingen
> eksport. Med rundt 150 kurs i året blir lista uoversiktlig etter én sesong.
>
> Alle ansatte kan i dag se, endre, kopiere og **slette** ethvert kurs. Det er
> i tråd med planen — men RA-enes eget ønske om filter per område står fortsatt
> som uavklart punkt (seksjon 36). Begge kan være riktige: full tilgang,
> filtrert visning som standard.
>
> **Fire tiltak besluttet 6. august:**
>
> | # | Tiltak | Når |
> |---|---|---|
> | 1 | **Filterrad over lista** — nedtrekk for RA, sesong og nettverk, pluss søkefelt på kursnavn og hall | Bøtte 1 — pilot |
> | 2 | **Eksport til regneark** fra kursoversikten. Lovet i konsept v1 §5, aldri bygget | Bøtte 1 — pilot |
> | 3 | **«Mine kurs» som standardvisning**, med bryter for «vis alle» | Bøtte 2 — lansering |
> | 4 | **Kalendervisning.** Planen har hele veien sagt «liste eller kalender» | Bøtte 3 — etter lansering |
>
> **Forutsetning for punkt 1:** feltet `kurs.sesong` finnes i datamodellen, men
> har aldri fått en rubrikk å skrive i. *På vanlig norsk: sesongen kan lagres,
> men ingen kan taste den inn.* Får den en rubrikk, viser lista inneværende
> sesong som standard — og halve problemet er løst.
>
> **Forutsetning for punkt 3:** RA-feltet er i dag fritekst
> (`AdminKursplanlegger.jsx:637`), ikke koblet til brukerkontoen. Skrives
> navnet ulikt to steder, treffer ikke filteret. Ryddes samtidig.


> **KORRIGERT 5. AUGUST.**
>
> - **«Flytteforespørsler med kapasitet synlig»** er ikke bygget.
>   `onsket_kurs_id` skrives ingen steder — null treff i `src/`, `api/` og
>   `sql/`. Skolen krysser av for at den er åpen for et annet kurs, men kan
>   ikke si hvilket. `maks_antall` **vises** i kursskjemaet
>   (`AdminKursplanlegger.jsx:711`), men brukes ikke som kapasitetsvisning —
>   det finnes ingen flytteforespørsel å vise den ved.
> - **«Oppfølgingsflagg på fritekst»** er DELVIS bygget.
>   `SvarOversikt.jsx:101-103` har `harMelding()`, som automatisk flagger hver
>   rad med fritekst, årsak eller «åpen for annet kurs». Merkingen ER
>   automatisk. Det som mangler er å se dem samlet: ingen liste, filter eller
>   telling på tvers av kurs.
> - **RA registrerer svar på vegne av skolen** er nytt siden v31, bygget og
>   bevist 4. august (commit `1c1e4f7`). Kravet sto i konsept v1 og forsvant
>   18. juni.

- Kursoversikt med fargekode på svarstatus; opprett/endre kurs med hall fra hallregister.
- Send lenker (én knapp, logges); live svar + metaoversikt.
- Melding fra skole med håndtert-avkryssing; flytteforespørsler med kapasitet synlig.
- Oppfølgingsflagg på fritekst.
- Purring vs. påminnelse: purring til ubesvarte; påminnelse til dem som har svart, med deres egne
svar gjengitt.
- Kommer i steg 3d: trappetrinn-visning per skole og knappen «send til alle TL-ansvarlige nå».

### 9.6 Hallregister og kursholderregister (ferdig)

> **KORRIGERT 5. AUGUST.** Registeret er bygget, men to ting står igjen.
>
> **Feltene adresse og pris FINNES** i redigeringsskjemaet
> (`AdminHaller.jsx:311` og `:313`) — men de er tomme, fordi kildefila
> `Hallregister_utkast_2.xlsx` aldri hadde dem, og de vises ikke i
> hall-tabellen (`:152-156` viser bare Navn, Kommune, Nettverk). Konsept v1 §9
> krevde begge, og skrev at pris «er selve verdien i registeret».
>
> **To kolonner som fantes i kildefila ble ikke importert:**
> «Vanlig vertskap» (utfylt på 141 av 161 rader) og «Alternative haller»
> (65 rader). Den første er særlig ergerlig: A3 ble bygget slik at RA huker av
> vertskap manuelt, kurs for kurs — mens svaret lå i regnearket hele tiden.

161 ekte haller importert, redigerbar tabell. Kursholderregister: navn, e-post, mobil, type
(egen/ekstern), aktiv, merknad. 17 eksterne importert.

### 9.7 Kortutdeling (Camilla)

> **SPESIFISERT 6. AUGUST — modulen er ikke lenger bare en prototype på papiret.**
> Kjartan har bekreftet hele flyten, og den stemmer ordrett med konsept v1 §11.
>
> **Slik skal den virke:**
>
> 1. Skolen svarer at de kommer med f.eks. **15 trivselsledere**.
> 2. Systemet foreslår **antall TL + 10 %, rundet opp = 17 kort**.
>    Kontrollert i koden 6. august: `Math.ceil(15 × 1,1)` = 17
>    (`AdminKortutdeling.jsx:13`). Menyteksten «Se bestillinger og
>    kortutdeling fra skoler» står i `Admin.jsx:42`, lenken til selve siden
>    i `Admin.jsx:48`. Feltet `antall_kort` har derimot **null kodetreff** i
>    `src/`, `api/` og `sql/` — tallet regnes ut på skjermen og lagres ingen
>    steder. Det er grunnen til at frysingen (punkt 4) må bygges.
> 3. **Skolen ser aldri tallet.** Verken i svarskjemaet eller på
>    kursinformasjonssiden. Det er en intern beskjed.
> 4. Tallet kan endre seg helt til **kursdagen**, da fryses det.
> 5. Camilla får raden i **sin egen liste under kulturkortbestillinger**.
> 6. **Camilla bestemmer:** fakturer / gratis / ikke ønsket. Systemet fakturerer
>    aldri av seg selv. Husregelen «systemet foreslår, mennesket bestemmer».
> 7. Kursholder ser samme tall på kursdagen og deler ut.
>
> **NÅR FRYSES KORTANTALLET — BESVART 6. AUGUST.** Spørsmålet ble stilt i
> konsept v1 den 15. juni og gjentatt i v15, v16 og v17. Det sto ubesvart i
> **49 dager**.
>
> **Svar: ved midnatt når kursdagen begynner.** Kursholder reiser med flere
> hundre kort og deler ut fortløpende underveis — kortene pakkes ikke per skole
> på forhånd. Lista er derfor klar når kursholder våkner på kursdagen.
>
> *Hva det krever av bygging:* kortantallet lagres ikke i dag — det regnes ut
> på skjermen hver gang siden åpnes. **Et tall som regnes ut på nytt hver gang,
> kan ikke fryses.** Frysing krever at tallet lagres, med et tidsstempel for når
> det ble låst, og en regel om at det ikke endrer seg etterpå.
>
> **TRE TING SOM MANGLER I PROTOTYPEN:**
>
> **1. Plasseringen — to faner på ÉN side.** Merk: fanen «Fra kurspåmelding»
> som er nevnt i 1.1 er ønsket løsning, ikke noe som finnes.
> I dag er dette to atskilte sider i
> admin-menyen: «Kulturkort-bestillinger» og «Kortutdeling (fra
> kurspåmelding)». Konsept v1 sa to faner på samme side, som Camilla veksler
> mellom. Menyteksten på bestillingssiden sier allerede «Se bestillinger **og
> kortutdeling** fra skoler» — meningen var der, byggingen havnet et annet sted.
>
> **2. Statusen «ikke ønsket» mangler.** Prototypen har tre: Ikke behandlet,
> Fakturer, Gratis. Konsept v1 hadde fire. Noen skoler ønsker ikke kort i det
> hele tatt, og da er «Gratis» feil svar.
>
> **3. Kryssjekken mot forhåndsbestillinger.** Camillas eget hovedkrav fra juni:
> en skole som allerede har bestilt kort på hjemmesiden skal ikke få kort to
> ganger. I dag må hun oppdage det ved å sammenligne to lister. Systemet vet
> begge deler.


> **KORRIGERT 5. AUGUST — dette er den viktigste rettelsen i dokumentet.**
>
> Modulen står som **Ferdig** i v23, v24, v26, v27, v29 og v31. Den er det ikke.
>
> Det som finnes: `src/pages/AdminKortutdeling.jsx`, 150 linjer, bygget
> 18. juni i tre commits (`e45a129`, `4b8fd71`, `5cf24a7`). Rutet på
> `/admin/kortutdeling` (`App.jsx:121`) og lenket fra admin-menyen
> (`Admin.jsx:48`). Siden er i drift, og merker seg selv:
> «Prototype til gjennomgang med Camilla — ikke ferdig løsning.»
>
> Riktig status: **PROTOTYPE I DRIFT, MODULEN IKKE FULLFØRT.**
>
> **Merk også:** setningen lenger nede om at `kort_status` har fire
> tilstander (fakturer / gratis / ikke ønsket / behandlet) er feil.
> Prototypen har tre: `Ikke behandlet`, `Fakturer`, `Gratis`
> (`AdminKortutdeling.jsx:9`). «Ikke ønsket» finnes ikke.
>
> Av konsept v1 §11 mangler: Camillas **to faner**
> (kulturkortbestillinger + fra kurspåmelding), den fjerde statusen
> «ikke ønsket» (prototypen har Ikke behandlet / Fakturer / Gratis),
> **kursholderens visning på kursdagen** — som er selve tidsbesparelsen —
> håndteringen av skoler uten antall, og avklaringen av når tallet fryses.
> Og Camillas eget hovedkrav: **kryssjekken mot Kulturkort → Bestillinger**,
> så en skole som alt har forhåndsbestilt ikke får kort to ganger.
>
> Tidslinjen er verdt å lese sakte: prototypen ble bygget 18. juni. 19. juni
> flyttet konsept v3 modulen ned i «Avgrensning og videre». 23. juni står den
> som «Ferdig» i v23. Fra avgrenset bort til ferdig på fire dager — og det er
> ikke skrevet én linje kode på den siden.

Antall trivselsledere + 10% (rundet opp) → Camillas fane «Fra kurspåmelding». kort_status har fire
tilstander: fakturer / gratis / ikke ønsket / behandlet.

### 9.8 Agenttest — funn og fikser, ALLE BEVIST

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

### 9.9 Kurskalender for kursholdere (mulig senere)

> **LAGT TILBAKE 6. AUGUST.** Denne setningen sto i planen fra v11 (11. juni)
> til v29 (5. juli) — nitten versjoner — og forsvant i v30:
>
> > «Kursholder logger inn og ser kun egne kurs **med all relevant info**.
> > **Sensitiv info (deltakerliste, betaling, instruksjoner) kun synlig for
> > kursholder og admin.** Valgfri Google Kalender-synk.»
>
> **Gjelder når modulen bygges.** Modulen selv står fortsatt som «mulig senere»
> og hører til bøtte 3 — etter lansering.
>
> *Hvorfor den ikke kan strykes:* mange kursholdere er eksterne — 17 er
> importert. De trenger dato, hall, skolenavn, oppmøtetid og antall for å holde
> kurset. De trenger ikke navnelister over kontaktpersoner ved andre skoler, og
> ikke å vite hva skolen betaler. Slik avgrensning må ligge i oppbyggingen fra
> start; den er dyr å ettermontere.
>
> **Ingen risiko i dag:** det finnes ingen rolle «kursholder» i systemet. De 17
> eksterne står i et register uten innlogging. Kravet gjelder utelukkende en
> modul som ennå ikke finnes.


Kursholder logger inn og ser kun egne kurs. Valgfri Google Kalender-synk. Behov ikke avklart.

### 9.10 Automatisk utsending til potensielle skoler

To ganger i året (mai + november): potensielle skoler i TL-kommuner får invitasjon med kursdato.

### 9.11 Avgrensning

> **UTVIDET 5. AUGUST.** Følgende er beskrevet i konsept v1, men ikke bygget,
> og hører hjemme i denne avgrensningen: kortutdelingens kryssjekk (9.7),
> flytteforespørsel i hele sin bredde (9.5), kopier kursplan i ekte forstand
> (9.3), purring der RA velger målgruppe (alle egne ubesvarte / ett kurs / ett
> område), eksport fra kursoversikt og svar, overstyrbar mottaker per skole,
> og samlet oversikt over ubehandlede meldinger.

Excel-eksport beholdes som trygghet i pilot, men dataene bor i basen.

## 10. Evaluering (komplett i kode — ikke kjørt)

> **PRESISERT 5. AUGUST.** Modulen er **kodeverifisert, ikke kjørt**. Selve
> utsendingen er bevist i produksjon; resten — spørsmålsadministrasjon,
> pakker, semester, admin-oversikten — er lest i koden og aldri testet.
> Den står i del 1 av `TESTOPPDRAG-v32.md`.

Lukker sirkelen invitasjon → påmelding → påminnelse → kurs → evaluering. Hele
evalueringsmodulen er komplett — grunnmodul + Fase 2 Del 1–4 ferdig.

### 10.1 Grunnmodul (ferdig og testet)

Tabell evalueringer med RLS, token-lenke /evaluering/:token. Tre vurderinger (skala 1–6), gullkorn
(fritekst), kjøpsinteresse (pakke/samtale/nei). Alt på én side.

### 10.2 Fase 2 — Del 1 og 2 (ferdig)

Redigerbare spørsmål per semester. Redigerbare pakker + priser (liten 7 119,-, stor 10 479,-).
Frossen pris lagres ved svar.

### 10.3 Fase 2 — Del 3 (ferdig)

Bildeopplasting av utstyrspakker. Storage-bøtte «pakkebilder». Testet i admin.

### 10.4 Fase 2 — Del 4 (ferdig)

CSV-eksport av alle svar. Kolonner: Skole, Kurs, Gjennomføring, Info i forkant, Aktiviteter, Gullkorn,
Kjøpsinteresse, Valgt pakke, Pakkepris. BOM + semikolon for norsk Excel.
Gjenstår å koble på: varsling til Eivind/Klubben ved kjøpsinteresse og automatisk utsending av
evalueringslenke — begge inngår i Trinn B, se seksjon 12.9. «Kopier forrige semesters oppsett»knapp.
Rikere rapport (Excel/PDF/PowerPoint) kan bygges oppå CSV-grunnlaget.

## 11. Churn-varsel og Ledelse-side

> **KORRIGERT 5. AUGUST.** Ledelse-siden er halvbygget mot det konsept v1 §8
> lovet: «svarprosent på tvers (i dag 54–67 % per RA), alle churn-signaler
> samlet på ett sted, status per region». Churn-kortet finnes.
> **Svarprosent på tvers og status per region er ikke bygget.**
> Merk at «Andel av svar %» (`AdminLedelse.jsx:108`) er andelen *flaggede* av
> alle svar, ikke responsrate, og at «Fordeling på nettverk» (`:120`) teller
> bare flaggede rader. Nettverk er ikke det samme som region.

Av pilotens 12 nei-svar var minst 5 oppsigelses-eller risikosignaler. Ny Ledelse-side (/admin/ledelse,
kun superadmin) samler dette aggregert.

### 11.1 Trinn 1 og 2 (ferdig)

Churn-kort: antall flagget, andel av svar, fordeling på nettverk. Signalord-flagging mot redigerbar
ordliste. Ordlisten fokuserer på kapasitets- og budsjettspråk (slutter, oppsigelse, ressurser, økonomi,
nedleggelse) framfor rene misnøyesignaler. Systemet endrer ALDRI HubSpot-status selv.

### 11.2 Trinn 3 (senere)

Claude API vurderer hvert nei-svar (oppsigelsessignal ja/nei/kanskje + begrunnelse). Ekte
tilbakekoblingssløyfe.

### 11.3 Fullt ledelsesdashboard (egen senere økt)

> **NYTT 6. AUGUST — tre ting må registreres NÅ, selv om dashboardet venter.**
>
> Kjartan vil vente med dashboardet, men ba om beskjed hvis noe bør på plass i
> forkant. Det bør det.
>
> **Kontrollert i koden 6. august:** avviste påmeldinger settes til
> `status: 'Inaktiv'` (`api/admin/avvis-paamelding.js:65`) — merk at «Inaktiv»
> ikke står i statuslista i 6.4 (Påmeldt · Aktiv · Aktiv sagt opp · Pause ·
> Tidligere · Potensielle). Enten er lista utdatert eller koden bruker et navn
> som ikke er avtalt; må avklares samtidig — raden overskrives,
> så det finnes ingen historikk over hvem som ble avvist når. Churn-oversikten
> (`hent_churn_oversikt`) regner ut dagens tall, ikke utviklingen over tid.
> Bruksloggen skriver bare når noen er innlogget (`useBrukslogg.js`:
> `if (!bruker?.id) return`), så anonyme sidevisninger telles ikke.
>
> **Prinsippet: et dashboard er bygget på historikk, og historikk kan ikke
> lages i ettertid.** Registreres ikke en hendelse når den skjer, finnes tallet
> aldri. Dette er nøyaktig Edalios punkt 9 (seksjon 47.1): «Hendelseslogging fra
> første utrulling — Edalio utsatte dette og står nå uten grunnlag for
> gratis/Pro-beslutninger.»
>
> **1. Statushistorikk for skoler — det viktigste.** I dag overskrives
> statusfeltet. Går en skole fra Aktiv til Oppsagt, står det Oppsagt — datoen og
> den forrige tilstanden er borte. *På vanlig norsk: dashboardet kan aldri vise
> vekst eller frafall over tid, bare hvordan det ser ut i dag.* Løsning: én
> liten tabell som skriver en linje hver gang status endres — skole, fra, til,
> dato, hvem.
>
> **2. Frafallsvarslene lagres ikke.** Churn-oversikten regnes ut på nytt hver
> gang siden åpnes. «Hvor mange varsler hadde vi i september mot november?» kan
> aldri besvares for fortiden. Løsning: lagre en linje når et varsel utløses.
>
> **3. Ikke tøm det som allerede logges.** `brukslogg` og `epost_logg` er
> grunnmuren. Ved opprydding før lansering: slett testdataene, la tabellene og
> rutinen stå. Merk at brukslogg kun registrerer innloggede brukere — skolenes
> svar via personlige lenker havner ikke der.
>
> **Det som ikke haster:** selve dashboardet, utseendet, HubSpot-koblingen og
> kontraktverdiene. Kontraktdata bor i HubSpot og kan hentes når som helst. Det
> som er i fare er data som bare finnes i deres egen base — og som overskrives
> mens vi venter.
>
> Punkt 1 og 2 er små jobber og føres til bøtte 1. Ikke fordi dashboardet
> haster, men fordi klokka går fra dagen den første ekte skolen registreres.


Utvides med kontraktsverdi, kontraktslengde, vekst, Norge vs. Sverige. Krever HubSpot-data inn i
basen.

### 11.4 Kobling til RA-ens egen playbook (NY i v31)

RA-arbeidsinstruksen (seksjon 49) beskriver en fast «aktiv sagt opp»-playbook med konkrete
kampanjer: utstyrspakke, Trivselsboka, år uten programavgift. Churn-flaggingen bør mate denne
playbooken direkte — det er lite verdt å oppdage et signal hvis ingen handling utløses. Dette er en
liten kobling å bygge når Ledelse-siden utvides, men den gjør forskjellen mellom en rapport og et
verktøy.

## 12. E-postsystem (Resend) — Trinn A og Trinn B ferdig

*(v31-tittel: «Trinn A ferdig, Trinn B påbegynt». Trinn B ble fullført 4. august.)*

> **OPPDATERT 5. AUGUST.** Trinn B er nå ferdig og bevist. Alle seks
> utsendingstypene er sendt i produksjon 2.–4. august, nødbremsen er bevist på
> alle fire endepunkt, og dobbeltsendingsvernet er bevist. I tillegg er malene
> flyttet ut av koden og inn i en redigerbar admin-side — se seksjon 53.
> Påminnelsens knapp peker nå på kursinformasjonssiden (seksjon 52), ikke på
> svarskjemaet.

Dette kapittelet er kraftig utvidet i v31. Resend har vært i drift siden Fase 2, men frem til 1. august
gikk all kursrelatert e-post via mailto — altså at RA klikket en knapp som åpnet deres eget epostprogram
med adressene i blindkopi. Fra 1. august sender systemet selv.

### 12.1 I drift fra før (Trinn A)

Branded passord-tilbakestilling, brukerinvitasjon, påmeldingsbekreftelse og bestilling — i minst 7 apifiler.
Avsender noreply@trivselsleder.no, verifisert domene, ferdig branded HTML-mal.

### 12.2 Hva Trinn B er, og hvorfor det henger sammen

Trinn B er overgangen fra «RA trykker send» til «systemet sender». Det høres ut som en teknisk
detalj, men det er en forutsetning for tre andre ting: purring kan ikke skje automatisk før noen har
sendt automatisk, systemet kan ikke vite hvem som har svart før hver mottaker har sin egen lenke,
og pilotflyten med Marielle blir ikke selvgående før begge deler er på plass.
Derfor bygges Trinn B som én samlet pakke, ikke som løse fikser: automatisk utsending, flere
mottakere per skole, og den ekte skole-importen slik at kontaktene faktisk finnes i basen.

### 12.3 Ylva-innspillet — bakgrunn (nå løst i datamodellen)

Kurslenken gikk i dag til én Hovedkontakt TL per skole — sårbart hvis vedkommende slutter eller
ikke svarer. Skoler har 2–5 TL-ansvarlige, og dataene finnes allerede fra HubSpot-synken.
Spørsmålet som sto åpent i v30 var om flere mottakere skulle dele én felles svar-rad og token, eller
få hver sin lenke inn til samme rad.
Besluttet 1. august: hver mottaker får sin EGEN lenke inn til samme svar-rad. Da vet systemet
hvem som faktisk åpnet og hvem som svarte, uten at skolen får to konkurrerende svar. Se 12.7.

### 12.4 Trappetrinn-modellen (besluttet 1. august)

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

### 12.5 Beslutning: ingen svar på e-post, men ingen svart hull

Et reelt driftsproblem i dag er at lærere svarer direkte på e-posten i stedet for å bruke skjemaet —
«vi er usikre på hvor mange TL vi blir», «vi tror ikke vi kan komme». Da havner informasjonen i en
innboks i stedet for i systemet, og oversikten forsvinner.
Løsningen er å sende fra en no-reply-adresse og si tydelig i selve e-posten at svar ikke registreres.
Men svaradressen skal likevel gå til et sted som leses: noen svar er ekte og viktige, som «vår
kontaktperson har sluttet» eller «dere har feil skole». Å la dem forsvinne ville vært verre enn dagens
situasjon.
Presisering: avsenderadressen løser ikke problemet alene. Læreren som skriver «vi vet ikke hvor
mange vi blir» gjør det fordi skjemaet ikke har plass til usikkerheten. Skjemaet bør derfor ha «vet
ikke ennå» som gyldig svar på antall, og et fritekstfelt. Tas når skjemaet uansett skal justeres.

### 12.6 Steg 1 — felles e-postmal (FERDIG OG LIVE)

Ny fil api/_epost-mal.js. De fire konto-e-postene bruker den nå: glemt-passord, inviter-bruker,
godkjenn-paamelding og opprett-skole. Utseendet er uendret, men endres malen nå, endres alle fire
samtidig. Bevist: ekte glemt-passord-e-post sendt i produksjon og verifisert visuelt. Commit cd45e74.
De tre øvrige (påmelding + Kulturkort x2) har eget visuelt uttrykk og ble bevisst latt urørt. Kulturkorte-postene
bruker gradient og emoji uten oransje topplinje — de bør ryddes når designprofilen
landes, ikke isolert. Notert også i 5.3.

### 12.7 Steg 2 — flere mottakere per skole (FERDIG I DATABASEN)

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

### 12.8 Steg 3a — automatisk førstegangsutsending (FERDIG OG BEVIST)

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

### 12.9 De seks utsendingstypene (korrigert i v31)

> **OPPDATERT 5. AUGUST.** Statuskolonnen under er utdatert. Alle seks typene
> er nå bygget og sendt i produksjon (2.–4. august). Det som sto som
> «Gjenstår» er ferdig.

v30 og STATUS.md omtalte «de fire e-postene». Det tallet var feil — invitasjonen manglet fordi den
gikk via mailto, og trinn 3 manglet fordi den kom inn med trappetrinn-modellen etterpå. Riktig antall
er seks. Merk at dette er utsendingstyper i systemet, ikke ferdigskrevne e-poster.

| # | Utsending | Til hvem | Når | Status |
|---|---|---|---|---|
| 1 | Kursinvitasjon | Hovedkontakt TL | Når RA sender ut kurset | FERDIG |
| 2 | Purring | Hovedkontakt TL | 5 dager uten svar | Gjenstår |
| 3 | Ikke hørt fra skolen | Øvrige TL-ansvarlige | 10 dager uten svar | Gjenstår |
| 4 | Påminnelse | De som svarte ja | Før kursdato | Gjenstår |
| 5 | Evaluering | De som var på kurs | Etter kurs, kl. 13:30 | Gjenstår |
| 6 | Varsel om kjøpsinteresse | Eivind (internt) | Ved kjøpsinteresse i evaluering | Gjenstår |

Nr. 1–3 fører til samme skjema med samme type lenke, men har ulik ordlyd og ulike mottakere. Nr. 6
går aldri til en skole.

### 12.10 Avsenderprofil (besluttet 1. august)

| Innstilling | Verdi | Begrunnelse |
|---|---|---|
| avsender_navn | Trivselsleder | Endres til RA-navn når RA-adressene finnes i basen |
| avsender_epost | noreply@trivselsleder.no | Verifisert domene, signaliserer at svar ikke leses |
| svar_til_epost | post@trivselsleder.no | Fanger de få ekte svarene |
| nettsted_url | https://trivselsleder-ny.vercel.app | Byttes til trivselsleder.no ved lansering |

Alle fire ligger i innstillinger-tabellen og kan endres uten kode. RA-enes egne e-postadresser finnes
ikke i basen ennå — det er en forutsetning for at e-posten skal kunne se ut til å komme fra skolens
egen regionansvarlige, og henger dermed på den store dataimporten (seksjon 16).

### 12.11 Det som gjenstår i Trinn B

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

### 12.12 Leverandørvalg og GDPR

Bli på Resend (ikke bytt til Brevo) — byttekostnad høyere enn GDPR-gevinsten. Resend er GDPR-kompatibel,
DPA tilgjengelig, EU-US DPF-sertifisert. E-postsporing: test Resends egen sporing
FØRST før noe ekstra kjøpes. DPA med Resend må være signert før lansering (seksjon 23.2).

### 12.13 Fremtidig: nyhetsbrev og nettverks-e-post

Sende e-post direkte til utvalg/nettverk av skoler + nyhetsbrev — erstatter manuell Gmail-kopiering.
HubSpot-kartleggingen bekreftet at nyhetsbrev faktisk sendes via Marketing Hub i dag (Eivind,
Marielle, svensk team) — reell funksjon å erstatte. Resend Broadcasts er naturlig kandidat.

## 13. Brukslogg

Live: Supabase-tabell brukslogg med RLS, useBrukslogg.js hook, LoggSidevisning.jsx. Logger
innlogging, sidevisning, ressursbruk, nedlasting og søk.

Gjenstår: Recharts-dashboard, automatisk flagging av lav-aktive skoler, innspillskanal til høyt-aktive
skoler. Kobles inn når ressursbiblioteket er bygget. Den nye idéen om inaktiv-skole-varsling (31.4)
bygger videre på dette.
Forsterket i v31 (fra Edalio-kartleggingen, seksjon 47): hendelseslogging må være på plass fra
første deploy av ressursbiblioteket, ikke legges til etterpå. Edalio utsatte dette og står nå uten
grunnlag for å avgjøre hva som skal være gratis og hva som skal ligge bak betaling. Vi har allerede
bruksloggen — poenget er at den må dekke bibliotekbruk fra dag én, ikke bare innlogging og
sidevisning.

## 14. Fase 3 — Ressursbibliotek + AI-assistent

Fagskatten til Trivselsleder skal flyttes fra dagens side til den nye. Mål: to veier til innhold, slått
sammen til én inngang.

### 14.1 To moduser, én inngang

> **LAGT TILBAKE 6. AUGUST — den tekniske skissen fra juni.** Den sto i planen
> fra v13 (11. juni) til v29 (5. juli) — sytten versjoner — og forsvant i v30.
> v32 sier *hva*, men ikke *hvordan* og ikke *hvorfor*.
>
> **Ordrett fra v29:**
>
> > «Modus A — strukturert søk … **Teknisk: tabell `ressurser` med filterfelt +
> > rating → muliggjør «Månedens/Ukas lek» på forsiden.**
> > Modus B — Trivselsboten … **Teknisk: tabell `innhold_biter` med pgvector
> > (RAG — søk på mening), Edge Function, kildekort, hybrid søk.**»
>
> *På vanlig norsk:* det første er en liste over alle lekene med en kolonne for
> terningkast — uten den kolonnen finnes ikke grunnlaget for «Månedens lek» på
> forsiden. Det andre er alt materiellet kuttet opp i småbiter og lagret slik at
> maskinen kan lete etter **mening** og ikke bare etter ord. Det er motoren
> under Trivselsboten: uten den kan den ikke svare fra deres eget stoff med
> kildehenvisning.
>
> **Og kartleggingsfunnene med tallene, ordrett fra v29:**
>
> > «Leker + Move it = samme node-type (game) i dagens system — Move it er
> > **126 av 869** leker, skilt via kategori. Kan trygt slås sammen til én
> > søkbar modul med «aktivitetstype»-felt.
> > Aktiv læring (atlu) = eget teknisk spor med rikere mal (kompetansemål per
> > trinn). Kan ligge i samme søkeinngang, men **trenger egen datamodell**.
> > Dokumenter er flettet inn i aktivitetene (vedlegg). Fil + dokument-node +
> > kobling til aktivitet **må migreres i én operasjon**.
> > Alt henger sammen via lek-noder. På ny side: ett sammenhengende system der
> > en lek flyter fritt mellom bibliotek, hjul og periodeplan (i dag isolerte
> > øyer).»
>
> **VIKTIG MERKNAD:** skissen er skrevet 11.–15. juni 2026 og er **ikke
> revurdert opp mot Edalio-kartleggingen av 1. august**. Den er ikke feil — den
> er uvurdert. Se blokken under.

### 14.1b Hva Edalio lærte oss om oppbyggingen (NY 6. august)

Seksjon 47 er en full kartlegging av Edalio, nabobedriften som kjører samme
tekniske løsning som oss. Den har ti punkter. Fire av dem må avgjøres **før**
byggingen av Fase 3 starter, fordi de ligger i selve oppbyggingen og er dyre å
ettermontere. De står her, ved siden av juni-skissen, i stedet for 33
seksjoner unna. **Seksjon 47 er uendret — ingenting er flyttet bort derfra.**

| # | Funn | Hva det betyr på vanlig norsk |
|---|---|---|
| 2 | **Fulltekstsøk fra dag én** | Vanlig ordsøk som treffer mens du skriver. **Edalios største anger** er at de manglet dette i starten. |
| 4 | Strukturert instruktørnotat per aktivitet | Kursholderens notat får sin egen rubrikk, i stedet for å ligge nederst i beskrivelsen der ingen finner det igjen. |
| 5 | Flertrinns-tagging i datamodellen NÅ | Én lek kan passe både 4. og 7. trinn, med hver sin variant. Skal den kunne det, må det bygges inn fra start. |
| 9 | Hendelseslogging fra første utrulling | Registrer hva folk faktisk bruker. Edalio utsatte det og står nå uten grunnlag for å bestemme hva som skal være gratis og hva som skal koste. |

De øvrige fem punktene (fasettert bibliotek med levende tellere i filtrene,
«foreslå denne»-boks ved tomt søk, faste svartyper for tilbakemelding, lukket
innsendingssløyfe, skolen som ekte entitet) er ting på skjermen, ikke i
grunnmuren, og kan komme etterpå.

**Unntaket:** Edalios punkt 3 — at Aktiv læring-malen bekrefter husets
8-punktsmal — er verken skjerm eller grunnmur, men innholdsmodell. Det hører
sammen med seksjon 48 og må være avklart før lekene importeres, ikke etterpå.

**ÅPENT PUNKT — må avgjøres før bygging av Fase 3:** rekkefølgen på ordsøk
(fulltekstsøk) og meningssøk. Juni-skissen begynner med meningssøket; Edalio
angrer på at ordsøket kom for sent. De utelukker ikke hverandre, men ingen har
bestemt hva som kommer først. Føres også i seksjon 36.


- Modus A — strukturert søk: «stiv heks» → leken dukker opp, med filter på
type/trinn/antall/sted/varighet.
- Modus B — Trivselsboten: «Hvordan motivere 7. trinn?» → AI svarer fra egne dokumenter med
kildehenvisning.
- Sammenslåing: én inngang der man enten søker strukturert eller spør AI-en direkte.
Leker + Move it = samme node-type (game). Aktiv læring (atlu) = eget teknisk spor med rikere mal.
Dokumenter er flettet inn i aktivitetene. Alt henger sammen via lek-noder.
Forsterket i v31: fulltekstsøk må inn fra dag én, ikke som en senere forbedring. Se seksjon 47 —
dette er den enkeltfeilen Edalio angrer mest på.

### 14.2 Innholdsmengde å importere

| Bank | Antall | Video | Nøkkelfiltre |
|---|---|---|---|
| Aktiviteter / Leker (inkl. Move it) | 869 | 178 | Kategori, Type/trinn, Utstyr, Målform |
| — herav Move it | 126 | 74 | Video, Kategori, Type, Utstyr, Målform |
| Aktiv læring (atlu) | 289 | 22 | Fag, Klassetrinn 1–10, Video, Målform |
| Dokumentbank | 628 | — | Type, Innhold, Fag, Målform |

Til orientering (migreres IKKE, se Fase 4): periodeplaner 10 428 · TL-hjul 1 790 · advantages 818.

### 14.3 Import-prosess (Ramsalt-leveranse mottatt)

1. Motta og sortere. 2. Bygge «hyllene» — den store jobben, på størrelse med eller større enn
evaluering-modulen. 3. Importere via skript: bilder → Supabase, video → Bunny.net. 4. Kontrollere
og rydde. Prinsipp: rydd taksonomi ved import, ikke manuelt etterpå.
Anbefalt: ta ÉN bank først (Aktiviteter) hele veien, mål tiden. Se seksjon 39 for den besluttede
arbeidsformen (bygg på testdata før full import).

### 14.4 Ramsalt-leveranse

Drupal-eksport har 9 innholdstyper: game, atlu, document, advantages, page, play_schedule, quote,
wheel, facebook_post.
Ramsalt-status: UTPAKKET OG VERIFISERT. Full eksport mottatt 26. juni, verifisert 29. juni: 33,72
GB, 36 426 filer. Node-tall: game 868, atlu 289, document 537, advantages 818, wheel 1 792,
play_schedule 10 426 — totalt 14 777 noder + 1 038 taksonomitermer. Video: 439 filer = 26,99 GB.
Tre trygge kopier.
Viktig: dagens eksport er et UTVIKLINGSDATASETT. Den brukes til å BYGGE importløsningen.
Selve innholdsimporten kjøres på en fersk eksport bestilt etter at august-endringene er ferdige
(månedsskiftet aug/sep).
Originalbilde-regel (Jon, 2. juli): fjern styles/<stilnavn>/public/ fra stien. Forbehold: skriptet MÅ
verifisere at originalen faktisk finnes, ellers falle tilbake på derivat og logge avvik.
fid→filsti-kobling bekreftet løst og parsbar automatisk: hver fil ligger i <div id="file-<fid>"> i feltet
safe-value. Regel: kutt alt før /sites/default/files/.
*På vanlig norsk: i eksporten fra den gamle siden står hvert vedlegg med et internt
nummer, og selve filnavnet ligger gjemt inne i en tekstklump sammen med mye annet. Vi har
funnet mønsteret som knytter nummeret til filen, og det er likt hver gang — derfor kan alle
de 33 GB med filer kobles til riktig lek maskinelt, uten at noen må gjøre det for hånd. Uten
dette mønsteret ville hele Fase 3-importen vært et manuelt arbeid.*

### 14.5 Øvrig innhold i Fase 3

- TL-kort: digitalt kortgalleri, to sett, PDF-nedlasting for innloggede skoler.
- Trivselsboka: 7 trinnsider, 11 månedlige opplegg per trinn. Kun digital visning.
- Mediebibliotek: alle godkjente bilder i Supabase Storage med metadata, søkbart, kobles til PDF-generator.
Kan erstatte ambisjonen om en felles grafikkmappe for Norge og Sverige (se seksjon
48).
- PDF-mekanismer: auto-generert per lek (Puppeteer) OG ekte opplastede filer (~1200 ferdige
lek-PDF-er i Dropbox-backup).
- Hver ressurs får knapper: «Legg til i periodeplan», «Legg til i TL-hjul», «Last ned som PDF».

### 14.6 Cowork-oppdrag for Fase 3

- Oppdrag A — Dropbox-videoer: KORRIGERT. Riktig skann av delt team-mappe «Trivselsleder
NY» fant 3 224 videoer / 248 GB. Ramsalt-zip = primær strukturert kilde; Dropbox-samlinger =
supplerende hull-fyll.
- Oppdrag B — Inspirasjonssøk: 8–12 moderne skole-/læringsplattformer. Utført; supplert av
Edalio-kartleggingen (seksjon 47).
- Oppdrag C — Video-opplasting: kjøres nå som videoverts er valgt og parse-skript er klart.
- Oppdrag D — Videoverts-research: FERDIG — Bunny.net valgt, se seksjon 32.

### 14.7 Fase 3-dybdekartlegging (Fable 5, 4. juli)

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

## 15. Fase 4 — Interaktive verktøy (bygges helt på nytt)

Beslutning (23. juni): TL-hjul (1 790) og periodeplaner (10 428) migreres IKKE. Verktøyene bygges
helt på nytt, tomme. Skolene varsles via nyhetsbrev før lansering om å laste ned egne
hjul/periodeplaner lokalt. «Maler = lær, ikke arv.» Datamodellen er enkel — både hjul og periodeplan
lagrer bare PEKERE til leker, ikke kopier.
Beslutning (1. august): Fase 4-verktøyene MÅ være klare til lansering. Dette var et åpent spørsmål
i v30 (seksjon 46.4) og er nå avgjort. Konsekvensen er at TL-hjulet og Periodeplanen
flyttes fra «kan komme etter» til «må til lansering» i seksjon 46.

### 15.1 TL-hjulet

- Oversikt over skolens hjul. Opprett nytt: tittel, skole, kakestykker (leker), rotasjoner,
skriftstørrelse.
- Tydelig vinner-handling: lekens navn + bilde, «Spill video»-knapp og PDF i pen modal.
- Tilgjengelig og responsivt: bort fra dagens canvas-only.
- Enklere bygging: lek-velger med filter + avhuking + dra-rekkefølge + live forhåndsvisning.

### 15.2 Periodeplan

- Ekte kalender, ikke fritekst: velg uke(r)/datoer i kalender.
- Årsplan — generer hele skoleåret i én operasjon (Kjartans idé): sett opp rotasjon/mal én gang,
hopp automatisk over ferier.
- Strukturerte felt: sted/lokasjon, ansvarlige TL-elever fra skolens liste, automatisk lekebilde.
- Auto-genererte ikoner/bilder per lek (Kjartans idé).
- Smart lek-forslag basert på trinn, sesong, inne/ute, vær, utstyr, nylig brukt.
- Integrasjon/samarbeid/tavle-modus: send dag/uke til TL-hjul, flere kan redigere samtidig.
- PDF: liggende/stående + forhåndsvisning + «del lenke».

### 15.3 PDF-generator lekekurshefte

Velg 10–12 leker → auto-generer hefte med forside, innholdsfortegnelse, sidetall.
Puppeteer/Playwright på Vercel.

### 15.4 Video-strategi

Videoene flyttes fra egen server til Bunny.net Stream (valgt 1. august, se seksjon 32). Praktisk
gjennomføring: Cowork-oppdrag C.

## 16. Stor dataimport (grunnmur, mot slutten)

- Alle skoler i skoleregisteret (640 aktive, 1400+ totalt) + alle ansatte/RA-er + nettverk-koblinger.
- Grunnmuren mange andre ting venter på: RA-som-kursholder-kobling, RA-navn som epostavsender
(seksjon 12.10), fullt ledelsesdashboard.
- RA som kursholder: koble fast ansatte RA-er inn som default kursholder per nettverk.
kursholdere-tabellen har type-felt klart for dette. Venter på denne importen.
- Merk: nettverk→RA-autofyll fyller i dag tekst, ikke kursholder-kobling. Det er ingen fast RA-default
ennå.
- KRITISK: ALDRI skole-import mot live HubSpot før alt er testet.

> **FRIST 6. AUGUST — oppskriften på databasen må være på plass FØR denne
> importen.** I dag finnes én mappe, `supabase/migrations`, med seksten filer nummerert
> 001–016. Det er alt som finnes, og de stopper i juni.
> Ingen av kursplanleggerens tabeller er med. *På vanlig norsk: databasen kan
> ikke bygges opp igjen fra prosjektfilene hvis den går tapt — og et
> testmiljø kan heller ikke lages uten den.* Dette er ikke en teknisk detalj,
> det er forskjellen på om innholdsarbeidet kan gjenskapes eller er tapt. Se
> seksjon 59.4.

## 17. Webinar-påmelding (mulig egen modul)

Anbefaling: bygg som EGEN liten modul («Webinarer»), ikke som underfane i kursplanleggeren.
Gjenbruker kjente byggeklosser. Å avklare: åpen/lukket påmelding? Bare samle, eller også sende
lenke/påminnelser?
Oppgradert i v31: RA-arbeidsinstruksen (seksjon 49) viser at webinarer er en FAST plikt for
regionansvarlige, ikke en sporadisk aktivitet. Modulen er dermed et reelt behov, ikke en mulighet. I
tillegg ønsker skolene digitale nettverksmøter med opptak tilgjengelig i én uke før sletting av
personvernhensyn — det er et konkret krav om utløpende videolenker (seksjon 32.5).

## 18. CRM / HubSpot-avløser

Ingen panikk, ingen beslutning — en retning.

### 18.1 Potensial

HubSpot koster ~150 000 kr/år. Samlet besparelse på sikt (Ramsalt + HubSpot + QuestBack) ≈ 500
000 kr/år.

### 18.2 Hva HubSpot faktisk inneholder (8B-1)

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

### 18.3 Dobbeltarbeid og hull

| Funksjon | Vurdering |
|---|---|
| Skole-/kunderegister + status | Overlapp — nær identisk modell begge steder |
| Kontaktpersoner / brukere | Overlapp — HubSpot bredere |
| Fakturadata + kontrakt | Overlapp — HubSpot er master |
| Nettverk/klynger + kulturkort-avtaler | Kun nettside |
| Salgs-pipeline/deals med verdi | Kun HubSpot (hull) |
| Aktivitetslogg / e-postsporing | Kun HubSpot (hull) — navlestrengen |
| Leads-prospektering i skala | Mest HubSpot |

### 18.4 Den ene knuten: e-postsporing

Gmail koblet for 9 brukere via HubSpot Sales-utvidelsen — logges automatisk med åpne/klikk.
Resend dekker utgående sending, men kan ikke automatisk logge 1:1 Gmail-korrespondanse på
riktig kontakt — det er HubSpots kjerneverdi og vanskeligst å gjenskape.
Bekreftet i v31: RA-arbeidsinstruksen slår fast at ALLE henvendelser skal loggføres i HubSpot. Det
er altså ikke bare en teknisk finesse — det er en arbeidsinstruks. Knuten er dermed reell og må
løses ordentlig hvis HubSpot en gang skal erstattes.

### 18.5 Nyhetsbrev, segmentering og automatisering

Nyhetsbrev brukes aktivt: 84 e-poster, ~7 500 sendt/mnd. Segmentering: 45 dynamiske lister.
Workflows (17, brukes) vs Sequences (7, brukes nesten ikke — kan droppes). Det finnes allerede en
«Nettside CRM-synk» aktiv.

### 18.6 Erstattbarhet per funksjon

| Funksjon | Vanskelighet |
|---|---|
| Sekvenser | Triviell |
| Dashboards/rapporter | Lav |
| Segmentering / «velg utvalg» | Lav–middels |
| Nyhetsbrev/utsendinger | Middels |
| Workflows (sync/GDPR) | Middels |
| DealBuilder | Middels–høy |
| E-postsporing / aktivitetsstrøm | Høy |

### 18.7 Trygg overgang (fire steg)

1. Nå: fullfør ny side. 2. Flytt det lette først: nyhetsbrev + segmentering. 3. Parallell drift en periode.
4. Kutt HubSpot først når vi er trygge.

## 19. Fase 7 — Trivselsundersøkelsen

Anonym, kvalitetssikret elevundersøkelse i samarbeid med Olweus-programmet og Bergen-forskere.
23 spørsmål om trivsel, friminutt, mobbing og TL-rollen. Domenet trivselsundersokelsen.no er
registrert. Kun for medlemsskoler.

### 19.1 Spørsmålsstruktur

Sp. 6–14: trivsel på skolen/klassen/friminutt/aktivitet/venner. Sp. 15–19: inkludering, ensomhet,
mobbing, krangling. Sp. 20–21: TL-atferd. Sp. 23.1–23.6: TL-effekter.

### 19.2 Funksjonalitet

Kun tilgjengelig for innloggede lærere på medlemsskoler. Elevene svarer anonymt via engangskode.
TL får kun aggregerte tall. Longitudinell visning år for år.

### 19.3 GDPR-hensyn

Elevdata anonymiseres fullstendig. Skolen er behandlingsansvarlig. Krever juridisk vurdering.

*På vanlig norsk: «behandlingsansvarlig» er den som etter loven bestemmer hvorfor
og hvordan personopplysninger brukes — og som bærer ansvaret hvis noe går galt.
Sier vi at skolen er behandlingsansvarlig, er Trivselsleder bare leverandøren som
utfører oppdraget på skolens vegne. Det er en vesentlig forskjell for hvem som må
svare for et avvik, og den må stå skriftlig i en avtale mellom oss og hver skole
før undersøkelsen tas i bruk. Dette er ikke noe vi kan avgjøre selv — det må en
jurist se på. Åpent punkt i seksjon 36.*

## 20. Fase 8 — Internasjonal skalering

Plattformen selges digitalt i andre land — uten fysisk oppfølging. Den to-lags-arkitekturen (seksjon
30) er den tekniske grunnmuren.

### 20.1 Hva må på plass

Stripe-betaling, flerspråklig arkitektur (Norsk → Svensk → Islandsk → Engelsk → Tysk → Fransk →
Spansk), justering av kontrakt.

### 20.2 «Need to have» vs «nice to have»

Innhold og verktøy som ikke kan lastes ned og sies opp. Gradvis tilgang basert på progresjon.
Nettverkssamlinger digitalt erstatter fysisk oppfølging.

### 20.3 Markeder og data

Prioritert: Sverige (i gang) → Danmark → Storbritannia → internasjonalt engelsk. Island: ~175
skoler, eget islandsk innhold. Se seksjon 44.

### 20.4 Konkurrentkartlegging England + Tyskland (fullført)

14 aktører per land. HOVEDFUNN: samlet pakke — fysisk kurs + elevledere + digitalt bibliotek +
trivselsmål — finnes IKKE som ett produkt i noen av markedene.
- England: modent/kommersielt. OPAL nærmest (£6 000+, 2 000+ skoler, sterk på evidens, men
voksendrevet uten elevledere/lekebank). PlayMaker £99/år. Twinkl/imoves høy gratis-standard.
- Tyskland: føderalt, dominert av gratis offentlig-/forsikringsfinansierte tilbud (DGUV, Sporthelfer,
fit4future). Pausenengel nærmest, digitalt svak.

Anbefaling: England først (betalingsvilje + sentralt innsalg + PE & Sport Premium), Tyskland steg 2.
Skrivebordsanalyse, ikke markedsvalidering — parkeres til norsk kjerne virker.

## 21. Fase 9 — Trivselsboten og AI-visjonen

Høyeste AI-prioritet. Claude API trent på 17 års kompetanse og alt innhold.

### 21.1 Hva den gjør

Læreren beskriver situasjon → konkret opplegg med kildekort. PowerPoint til nye trivselsledere. AIsøk
i biblioteket. Prediktiv skoleoppfølging.

### 21.2 Teknisk

RAG: alt innhold som søkbare embeddings, AI henter relevante biter og svarer forankret i eget
materiell.
*På vanlig norsk: alt husets innhold gjøres søkbart på mening, ikke bare på ord. Når noen
spør boten om noe, finner den først de få avsnittene i vårt eget materiell som handler om
spørsmålet, og svarer så bare ut fra dem. Den dikter ikke — den siterer huset. Samme motor
som beskrives i 14.1.*

### 21.3 Innholdsgrunnlag (utvidet i v31)

Skolenes største udekkede ønske — en bank for strategier, organisering og logistikk rundt TL-drift
(seksjon 50) — er det samme innholdsaktivumet som mater både Trivselsboten og en eventuell
franchise-håndbok (seksjon 30.3). Å skrive dette innholdet én gang løser tre behov.

### 21.4 Versjon 3.0 — fremtid

Benchmarking mot lignende skoler. Netflix-anbefalinger for personlig innhold.

## 22. Fase 10 — App og videreutvikling

App (iOS/Android eller nettbasert), aktivitetsbank med spillfunksjon, in-app betaling. Elevpålogging.
Timeplan for aktiv læring. Delingsbank.

## 23. Fase 5 — Tilgjengelighet, GDPR, sikkerhet og lansering

### 23.1 Tilgjengelighet (WCAG 2.1 AA)

Gjennomgang av alle sider: alt-tekst, tastaturnavigasjon, kontrastforhold, skjermleser-kompatibilitet.
Publisere tilgjengelighetserklæring.

### 23.2 GDPR

DPA med Supabase, Vercel og Resend. Personvernerklæring. Rutine for sletting av brukerdata ved
avtaleopphør. Cookie-banner. Notat om e-posthåndtering i personvernvurderingen — særlig aktuelt
nå som systemet sender selv (seksjon 12). Moms på digitale tjenester Norge→Island sjekkes med
regnskapsfører.

### 23.3 Sikkerhet og backup

RLS-gjennomgang. GitHub-token rotert 23. juni, saken lukket. Backup: Supabase Pro daglige
backups. Se seksjon 42.
Nytt punkt til RLS-gjennomgangen (1. august): tabellen kurs_skole_mottaker gir anon både lese- og
skriverett. Det er nødvendig for at lærere skal kunne åpne lenken sin uten innlogging, men bør
gjennomgås for å sikre at en gyldig token bare gir tilgang til egen rad, ikke til andres.
*På vanlig norsk: tabellen med lærernes navn, e-post og personlige lenker står i
dag åpen for besøkende uten innlogging — ikke bare til å leses, men til å endres.
Det er nødvendig for at læreren skal kunne svare uten å logge inn, men slik det er
satt opp nå gir en gyldig lenke i prinsippet tilgang til mer enn sin egen rad.
Dette er personopplysninger, så det er et GDPR-punkt like mye som et teknisk. Samme
sak er beskrevet i 55.3.*

### 23.4 Feide, staging og lansering

> **LAGT TILBAKE 6. AUGUST.** Denne sto i planen fra v8 (9. juni) til v29
> (5. juli) — tjueto versjoner — og forsvant i v30:
>
> > «Staging-miljø: teste endringer før de går live. **Bruksanvisning: endre
> > innhold, teste på staging, rulle tilbake.**»
>
> Staging-miljøet ble stående. Bruksanvisningen og tilbakerullingen forsvant.
> Ordet «tilbakerulling» finnes ikke i v32 i det hele tatt.
>
> **Kravet deles i to, fordi det er to ulike behov:**
>
> - **Hverdagsarket — bøtte 1, må til pilot.** Én side for de ansatte: slik
>   endrer du en tekst, slik ser du resultatet før du sender, slik får du
>   tilbake det som sto der før. *Begrunnelse: «Tekster og maler» ble bygget
>   4. august. Marielle og Ylva redigerer allerede i dag — behovet er der nå,
>   ikke ved lansering.* Kontrollert 6. august: det finnes ingen bruksanvisning
>   noe sted.
> - **Overleveringen — seksjon 23.5** blir stående som den er. Den handler om
>   hvem som overtar teknisk ansvar den dagen du ikke er der, ikke om tirsdag
>   formiddag.
>
> **Tilbakerullingen hører til hverdagsarket.** Presisering 6. august: selve
> muligheten til å rulle tilbake er planlagt — endringsloggen (38.2) og
> sikkerhetskopiene (42) dekker den tekniske siden. Det som mangler helt, er
> **den skrevne oppskriften**: hva du som eier faktisk gjør, steg for steg, når
> noe er blitt feil.
>
> **PRESISERING om staging:** det finnes ikke noe eget staging-oppsett i
> prosjektet. Testsiden `trivselsleder-ny.vercel.app` ER staging-miljøet i dag.
> Det er sannsynligvis godt nok — men planen skal si det som er, ikke love et
> miljø som ikke er satt opp.
>
> Uten et skrevet ark er ikke prinsippet «uavhengig av én person» (seksjon 3.2)
> sant. Da er svaret på «hvordan endrer jeg dette?» fortsatt «spør Kjartan».


Feide-aktivering i produksjon. Staging-miljø. DNS-overgang fra Drupal (gammel side beholdes som
fallback). AI-agentesting: automatiserte testpersonas. Husk å bytte nettsted_url i innstillinger-tabellen
ved lansering (seksjon 12.10).

### 23.5 Overlevering — «Drift etter Kjartan»

Hvem tar teknisk ansvar? README-fil, veiledning for ansatte, veiledning for teknisk videreutvikling.

## 24. Forside og design

### 24.1 Forside (planlagt, ikke bygget)

Hero med bildecollage + overskrift. Ikonkort: trivsel, inkludering, læringsro, lederskap. CTA «Meld
skolen på». Se også rullerende forside-idé (31.2).

### 24.2 Designarbeidsmåte

Bruk Claude Design til forside, menystruktur/faner og undersider. Bygg «skallet» tomt FØRST, fyll
innhold etterpå. Merkefarger oransje #F47920, magenta #D6006E.

### 24.3 Fem hjemmeside-råd fra konkurrentkartleggingen

1. Vis EFFEKT med konkrete tall: eget «Evidence»-menypunkt. 640 skoler, 350 000+ elever. 2. Pakk
kurs + bibliotek som ETT program: vis hele reisen visuelt. 3. Transparent, enkel pris + gratis
prøve/kickstart. 4. Anerkjennelse og akkreditering: «sertifisert Trivselsleder-skole», elevbadges,
CPD-videoer. 5. Sterk søk/filter + gratis smakebiter.
Punkt 1 og 5 er høyest prioritert. Punkt 5 bekreftes uavhengig av både Edalio-kartleggingen (seksjon
47) og skolenes egne tilbakemeldinger (seksjon 50) — «hjemmesiden er vanskelig å bruke» er en
gjenganger.

### 24.4 60-minuttersmålet — se seksjon 43

Konkurrentkartleggingen og Fase 3-dybdekartleggingen peker begge mot en større strategisk
mulighet: å reposisjonere hele produktet rundt skolens daglige 60-minuttersmål for fysisk aktivitet,
ikke bare friminuttet. Horisont (a) i seksjon 43 hører hjemme direkte i designfasen.

## 25. Kartlegging av dagens side (Cowork) — fullført

Cowork har skannet dagens trivselsleder.no i detalj. Nettside-kartleggingen er KOMPLETT.

### 25.1 Fullførte oppdrag (00–08)

| Oppdrag | Innhold | Hovedfunn |
|---|---|---|
| 00 | Back-end-kart | 9 innholdstyper, eksakte tall |
| 01 | Leker (game) | 869 leker, 178 video |
| 02 | Aktiv læring (atlu) | 289 opplegg, rikere mal |
| 03 | Move it | 126 av lekene, filtrert via kategori |
| 04 | Dokumenter | 628 noder, flettet inn som vedlegg |
| 05 | Drift av TL | Dokumentkategori løftet til fane |
| 06 | TL-hjulet | 1 790 hjul, peker bare til lek-noder |
| 07 | Periodeplan | 10 428 planer, friksjonslogg fra testbruk |
| 08 | CRM | Fungerende skole-CRM med status/eier/kontrakt/nettverk |

### 25.2 Gjenstår i kartleggings-sporet

8B HubSpot-kartlegging: FERDIG. 9 Inspirasjonssøk: FERDIG, supplert av Edalio-kartleggingen
(seksjon 47). Sluttsyntese 0–8: ferdig.

### 25.3 Tre kilder krysssjekker hverandre

Cowork-skann + Dropbox-backup + Ramsalt-eksport. Tre vinkler fanger hull før de blir problem. I
v31 kommer en fjerde kilde til: de ansattes egne rutinedokumenter (seksjon 48).

## 26. Lokal backup (Dropbox) — korrigert

Backupen «Hjemmeside - BACKUP.zip» er 1311 filer / ~555 MB, nesten utelukkende PDF-er. Verdi:
de ~1200 ferdige lek-PDF-ene kan gjenbrukes direkte.
Korrigert videobilde: riktig skann av delt team-mappe «Trivselsleder NY» fant 3 224 videoer / 248
GB, inkl. ekte lekesamlinger. Ramsalt-zip er primær strukturert kilde; Dropbox er supplerende hullfyll.
ADVARSEL (NY i v31): Dropbox ble omstrukturert i juli 2026. Mapper for ansatte, backup og
databehandleravtale ligger nå under «administrasjon», grafikkmappen er ryddet på nytt, og
opprydding i sosiale medier pågår. Stiene som står i rutinedokumentene kan derfor være utdaterte.
De MÅ verifiseres før Fase 3 bruker Dropbox som hull-fyll — ellers leter importskriptet i mapper som
ikke lenger finnes.

## 27. Svensk side (trivselledare.se) — kartlagt

Samme Drupal-installasjon som norsk. Fremtidig struktur skal være lik for begge land — én side
med språk-switch, ikke to separate. Rekkefølge: norsk lansering først → stabiliser → konverter til
svensk. Ramsalt-pris: ca. 4 timer.
Avvik som må hensyntas i ny datamodell (Lag B per land): trinn (Norge 1–10 vs. Sverige Förskola/F-
3/4-6/7-9), læreplan (LK20 vs. Lgr22), fagstruktur, blandet NO+SE topic-taksonomi i dag,
sted/antall/utstyr som fritekst.

## 28. Arbeidsmåte og leveringsformat

### 28.1 Fast arbeidsflyt (uten unntak)

1. Start hver økt: lim inn STATUS.md. 2. SQL i Supabase SQL-editor FØR kode pushes. 3. Kode →
commit/push → vent på Vercel-deploy → test. 4. Avslutt hver økt: oppdatert STATUS.md.

### 28.2 Kommandostandard

Kommandoer merkes «→ TERMINALEN» eller «→ SUPABASE». Heredoc-terminator: SLUTT (ikke
EOF). Faste lenker hver gang. SQL-mønster: string_agg/concat_ws for én rute med tekst i stedet for
mange skjermbilder nedover en liste.

### 28.3 Leveringsformat for planer

Alltid BÅDE DOCX og PDF. Innholdsfortegnelsen bygges STATISK — sidetall hentes fra ferdig
rendret PDF og verifiseres visuelt før levering. Dokumentet bygges med docx-js, ikke pandoc;
pandoc gir feil visuelt uttrykk.

### 28.4 Dispatch/subagenter — prinsipper

Dispatch satt opp og verifisert ende-til-ende. 1. Analyse før kode. 2. Spesialiserte spor kun for tunge
oppgaver. 3. Uavhengig sikkerhetskontroll. 4. Si fra om manglende tilgang.

## 29. Pilot, tidslinje og veien videre

> **OPPDATERT 5. AUGUST.** «Fullfør Resend Trinn B — steg 3b til 3d» er gjort.
> Neste steg er i stedet: full loop-test mot dette dokumentet som fasit
> (`TESTOPPDRAG-v32.md`), rotering av de to API-nøklene, og RLS-gjennomgangen.

- NÅ (august): fullfør Resend Trinn B — steg 3b til 3d. Deretter demo-manus (seksjon 37),
videoinnspilling og sletting av demo-innhold. Denne pakken er uavhengig av Jon og Fase 3, og
kan kjøres parallelt med alt annet.
- ~medio august: pilot med Marielle Haarvik. Hun er motivert, men flyten bør være selvgående —
altså at automatisk e-post er ferdig — før piloten starter.
- Månedsskiftet aug/sep: bestill fersk fulleksport fra Jon. Varsle innholdsfrys til de ansatte
samtidig. De to media-sprikene må avklares FØR denne bestillingen.
- Høst: Fase 3-struktur på testdata → Fase 4-verktøy oppå → full import. Forside/design og
Evidence-siden parallelt.
- 1. oktober (mål): alle 868 leker inne. Besluttet 1. august.
- Sist i rekkefølgen: stor dataimport av skoler/ansatte/nettverk, og HubSpot-synk helt til slutt.

- jan/feb 2027: første reelle test/pilot på ett fylke før full utrulling.
- På sikt: CRM-avløser, svensk side, fullt ledelsesdashboard, Trivselsundersøkelsen, internasjonal
skalering, Trivselsboten, app.

## 30. To-lags Europa-arkitektur og franchise-retning

Den største arkitektoniske beslutningen i v28: plattformen kan vokse fra én norsk tjeneste til en
europeisk plattform — og potensielt en franchise-modell — uten å bygge om grunnmuren.

### 30.1 To-lags-modellen

| Lag | Hva det inneholder | Hvordan det endres |
|---|---|---|
| Lag A — universelt | Innholdsmodell, interaktive verktøy, søk, AI/Trivselsbot, brukerroller, e-postmotor | Kode — felles for alle land |
| Lag B — per land | Trinn-inndeling, læreplan, fagstruktur, geografi, valuta, utstyrsbutikk, taksonomi, juridiske tekster, operatør/land | Konfigurasjon — ikke ny kode |

### 30.2 Flerspråklig og multi-tenant fra første rad

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

### 30.3 Franchise som strategisk retning

Franchise er en strategisk retning, ikke en byggeoppgave nå. 17 års driftsmodell kan kodifiseres i en
håndbok — som både grunnlag for franchise OG mater Trivselsboten med taus kunnskap. Se
seksjon 50: skolene etterspør allerede nøyaktig dette innholdet.

### 30.4 Lek-katalogen: konvergens med legitime avvik

Norsk og svensk lek-katalog skal konvergere mot ett felles bibliotek (Lag A) — samme lek finnes ÉN
gang. Legitime avvik (trinn, fag, læreplan) håndteres i Lag B. Ønsket om en felles grafikkmappe for
Norge og Sverige (seksjon 48) peker i samme retning.

## 31. Fire nye idéer (29. juni)

### 31.1 Oppfølging av skoler uten lekekurs

Send hefte + lokalt kurs-oppfølgingsopplegg med svar-skjema (samme token-mekanikk). Beslutning:
AI-video FRARÅDET. Kvaliteten og troverdigheten holder ikke for fysiske aktiviteter. Bruk Ramsalts
ekte videoer, supplert med AI-generert tekst og ikoner.

### 31.2 Rullerende forside: Klubben-pakker og «mest kjøpte»

Rullerende seksjon på forsiden med lekepakker/utstyr fra Klubben-e-posten, redigerbar fra admin.

### 31.3 Nyhetsagent (forsknings-tvilling av rektoragenten)

Overvåker ny forskning/nyheter om barn, fysisk aktivitet, trivsel og mobbing. Streng kildefiltrering +
godkjenningskø.

### 31.4 Inaktiv-skole-varsling

Bruk bruksloggen og Feide-innlogginger til å oppdage inaktive skoler og varsle. Kobler brukslogg +
ledelsesdashboard + churn-tenkning.
Validert i v31: RA-arbeidsinstruksen har et uttrykt mål om rektormøte med ALLE skoler hvert tredje
år, prioritert mot skoler man hører lite fra. Inaktiv-skole-varslingen leverer nøyaktig den
prioriteringslisten — den er altså ikke en idé, men et verktøy til en eksisterende arbeidsplikt.

## 32. Videoverts — BESLUTTET: Bunny.net Stream

Beslutning 1. august 2026: Bunny.net Stream velges. Estimert kostnad ca. $6/måned ved normal
bruk, og tilgangslåsing er innebygd via signerte lenker. Dette lukker et punkt som har stått åpent
siden v28.

### 32.1 Bakgrunn: Vimeos prisendring i 2026

Båndbreddegrense 2 TB/mnd rammer hardt med 640 skoler. Innbygd-grense 30 GB rekker ikke for
et ~26 GB bibliotek. Båndbredde, ikke lagring, er den drivende kostnaden.

### 32.2 Faktisk videovolum

Ramsalt-zip: ~26 GB ren aktivitetsvideo, 439 filer. Dropbox-supplement: potensielt større, men mest
ikke aktivitetsvideo.

### 32.3 Kandidater og avveiing

| Kandidat | Styrke | Svakhet |
|---|---|---|
| Bunny.net Stream (VALGT) | Billigst per GB, innebygd spiller+CDN, signerte URL-er, EU-lagring | Ny leverandør i GDPR-bildet |
| Cloudflare Stream | Solid, god ytelse | Dyrere per GB |
| api.video | Sterkest GDPR-profil | Dyrere |
| Vimeo (Pro/høyere) | Ferdig spiller, kjent | 2026-prising rammer i skala |
| Supabase Storage | Allerede i stacken | Egress dyrt fort ved video |

### 32.4 Beslutningskriterier (brukt)

1. Pris ved faktisk volum/båndbredde. 2. Avspillingshastighet. 3. GDPR/personvern. 4.
Sikkerhet/tilgangskontroll. 5. Nedetid/driftssikkerhet. 6. Vedlikeholdsbyrde. 7. Internasjonal skalering.

### 32.5 Tilgangslåsing — nå med konkret bruksbehov

Signerte, utløpende lenker var i v30 et «ønske». I v31 finnes et konkret behov: skolene ønsker
digitale nettverksmøter der opptaket er tilgjengelig i én uke og deretter slettes, av personvernhensyn
(seksjon 50). Bunny.nets signerte URL-er dekker dette direkte. Kravet er dermed reelt, ikke teoretisk
— og det henger sammen med webinar-modulen (seksjon 17).

## 33. Redaksjonelle rutiner i dag

Fra ansattmøtet 29. juni + oppfølging fra Kari Snartemo, kraftig utdypet i v31 av fem mottatte
ansattdokumenter (seksjon 48). Styrer både Fase 3-importen og hvordan ny side skal fungere som
standard.
- PDF-backup-regel (viktigst i dag): hver ny/endret aktivitet lastes ned som PDF med nøyaktig
samme filnavn som på hjemmesiden. Filnavnet er kun lekenavnet — «Ballfangeren», ikke «1.
Ballfangeren». Dette er matchingsnøkkelen mot Ramsalt-data. Se seksjon 42 for hvordan
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

## 34. Omtale-kartlegging — Evidence-råstoff

Fable 5-kartlegging av ~30 offentlige omtaler. Rapport: omtaler-trivselsleder-2026.md. Råstoffet til
«Evidence»-området på ny forside.

### 34.1 Topp-rangerte omtaler

1. DNV GL-analysen (2017): 67 skoler/11 562 elever — færre mistrivsel, +6 pp «morsomme
aktiviteter», 9% bedre arbeidsro, 85%+ mindre mobbing, 90%+ fornyer. MÅ skaffes i original. 2.
Harvard GSE-profilen: 350 000+ elever, 1 300 skoler, 70 000 elevledere. 3. Ashoka Fellow
(2013/14). 4. NRK «Årets pøbel» (2015). 5. Masteroppgave spes.ped (2021): 77% god erfaring
sårbare elever, 82% færre går alene — forfatter/arkivreferanse må graves frem. 6. Ferske stemmer:
Bergen/Lyshovden (2025), Pedagog Uppsala (2024), Sparebankstiftelsen DNB (3,7 mill.),
Kronprinsparets Fond.

### 34.2 Kritisk side å kjenne

Udirs kunnskapsoversikt: «ikke eksternt evaluert» — DEN faglige innvendingen. Motsvares av DNV
GL + masteroppgave, men vær presis.
Hjemmelekser (Kjartan): skaff DNV GL-rapporten i original. Finn masteroppgavens
forfatter/arkivreferanse. Skaff ASK-studien (seksjon 43.2).

## 35. Lærervikaren.no — fremtidig prosjekt

Kartlagt av Fable 5. Ligger BAKERST med vilje: TL-kjernen bygges ferdig først. Kan tenkes bygget
inn i TL-plattformen på sikt — ikke nå.

### 35.1 Hovedinnsikt: to produkter, bare ett lever

- Bemanningsmodulen = levende kjerne: 435 627 vikartimer, 358 339 SMS.
- Opplegg-biblioteket = dødt siden 18.08.2022: 2 236 dokumenter.
- Tall: 342 skoler, ~40 aktive abonnement, 20 229 brukere, 8,2 mill. kr historisk omsetning.

### 35.2 Hvorfor det haster mer enn funksjonalitet tilsier

Drupal 7 EOL januar 2025 — ingen sikkerhetsoppdateringer, persondata for 20 000+ brukere. Quizappen
kjører på http uten kryptering. GDPR-grunnlag må avklares FØR migrering.

### 35.3 Gjenbruk fra trivselsleder-ny

Abonnement/skoleregister/prisnivåer er identisk domenemodell. Bemanningen er den eneste reelt
nye modulen.

## 36. Åpne punkter og avklaringer

> **NYE OG LUKKEDE PUNKTER 6. AUGUST.**
>
> **LUKKET:** «Når fryses kortantallet?» — besvart 6. august: ved midnatt når
> kursdagen begynner (9.7). Spørsmålet var stilt 15. juni og sto ubesvart i
> 49 dager.
>
> **NYTT:** rekkefølgen på ordsøk (fulltekstsøk) og meningssøk i Fase 3 må
> avgjøres før byggingen starter. Juni-skissen begynner med meningssøket;
> Edalio angrer på at ordsøket kom for sent. Se 14.1b.
>
> **NYTT:** RA-feltet på kurs er fritekst og ikke koblet til brukerkontoen.
> Må ryddes for at «mine kurs» skal treffe (9.5).
>
> **NYTT — planen er uenig med seg selv om fem tall.** Funnet av kontrolløren
> 6. august. Ingen av tallene er gjettet på her; de må avklares mot kilden før
> de brukes i noe som skal ut av huset:
>
> | Sak | Ett sted står det | Et annet sted står det |
> |---|---|---|
> | Antall leker | 869 (14.1, 14.2, 25.1) | 868 (14.4, 14.7, 29, 39.3, 44.1, 45, 46.2, 46.4, 48.3) |
> | Antall dokumenter | 628 (14.2, 25.1) | 537 (14.4, 14.7) |
> | TL-hjul | 1 790 (14.2, 15, 25.1) | 1 792 (14.4) |
> | Periodeplaner | 10 428 (14.2, 15, 25.1) | 10 426 (14.4) |
> | Kulturkortpartnere | 1 685 i Supabase (5.2) | «fra 714» (8) |
>
> Sannsynlig forklaring på de fire første: 14.2/25.1 teller fra ett uttrekk og
> 14.4 fra et annet, tatt på hvert sitt tidspunkt. På kulturkortpartnerne er
> 714 trolig antallet som er synlige på dagens side, mens 1 685 er alt som
> ligger i basen. **Men det er en antakelse, og planen skal ikke inneholde
> antakelser som ser ut som fakta (regel 3.1).** Én telling, én gang, og så
> ett tall gjennom hele dokumentet.
>
> **STRØKET:** kursbagger og utstyrsbestilling (49.2) — håndteres i Tripletex
> eller manuelt, hører ikke hjemme på nettsiden.


> **OPPDATERT 5. AUGUST.** Følgende er avklart siden v31: «vet ikke ennå» på
> antall trivselsledere (forkastet — feltet ble valgfritt i stedet), ønsket
> kurs (parkert), felles opplæring der alle skolene er vertskap (Senja —
> ingen egen mekanikk trengs), kalenderkobling (parkert), kulturkort og
> avtalen (kort beregnes for alle som melder antall, internt).
>
> Nye åpne punkter: ~~når skal kortantallet fryses~~ (LUKKET 6. august, se
> blokken øverst i denne seksjonen og 9.7).
> Skal «Flytt til annet kurs» kun vises for «Kommer ikke»-skoler
> (`SvarOversikt.jsx:293`)? Skal påminnelsen ha en tidsregel, eller strykes
> nøkkelen `paaminnelse_dager_for` fra planen? RA-tilgang: planen sier både
> «alle ansatte kan endre ethvert kurs» og «filter per område».

| Tema | Beskrivelse / status |
|---|---|
| Videoverts | LUKKET 1. august — Bunny.net valgt. |
| Fase 4 til lansering? | LUKKET 1. august — ja, verktøyene må være klare. |
| Innholdsmengde til lansering | LUKKET 1. august — alle 868 leker, mål 1. oktober. |
| Rettighetsmatrise | LUKKET 1. august — se seksjon 38. |
| Ylva-innspillet (flere mottakere) | LUKKET 1. august — egen lenke per mottaker, se 12.7. |
| Media-sprik Ramsalt | ÅPENT — (a) video 247 vs 439, (b) bildeoriginaler 103/105 mangler. MÅ avklares med Jon FØR fersk eksport bestilles. |
| Lagringsrutine: hvilken versjon er master? | ÅPENT — to versjoner i omløp, se seksjon 33. |
| Dropbox-stier etter juli-omstrukturering | ÅPENT — må verifiseres før Fase 3 bruker Dropbox som hull-fyll. |
| Edalio + TL: to produkter eller delt base? | ÅPENT og strategisk — bør avgjøres FØR datamodellen låses i høst. Se seksjon 47. |
| Kan Aktiv læring-innholdet hentes hjem? | ÅPENT — 194 opplegg er husets egne leker foredlet. Se seksjon 47. |
| Kursbagger / utstyrsbestilling | STRØKET 6. august — håndteres i Tripletex/manuelt, hører ikke hjemme på nettsiden. Se 49.2. |
| Kursplanlegger | PILOT-KLAR. Demo-innhold og Trinn B-testspor slettes før pilot. |
| Resend Trinn B | LUKKET 4. august — alle seks utsendingstypene i produksjon. Se 12.9. |
| Aktive brukere-eksport | Cowork-oppdrag i kø: eksport 15.08.2025–30.06.2026. |
| Danmark-rapporten | Ferdig men ikke analysert. |
| AI-video av leker | FRARÅDET. |
| Skolesjef Sverige | ~3040 SerpAPI-søk gjenstår. |
| Kursholder-innlogging | Behov ikke avklart. |
| Webinar-modul | Reelt behov bekreftet (seksjon 49). Åpen/lukket påmelding uavklart. |
| CRM-avløser | Egen retning. |
| Svensk side | Kartlagt, avvik i Lag B. |
| Trivselsundersøkelsen | Juridisk vurdering av behandlingsansvar må på plass. |
| Abonnementsmodell | Per skole/lærer/kombinasjon uavklart. Se seksjon 44. |
| Drift etter Kjartan | Hvem tar teknisk ansvar? |
| DPA-avkrysning | Dekker Supabase, Vercel, Resend + Bunny.net. |

> **Merknad om dokumentstrukturen (fra v31).** Seksjonene 47–51 er nye i v31 og lagt til bakerst, i tråd med etablert praksis fra v28→v29 og
v29→v30, slik at eksisterende seksjonsnumre og kryssreferanser ikke forstyrres. Seksjonene 37–46
er beholdt fra v30, med oppdateringer der beslutninger er tatt.

## 37. Demo-manus for instruksjonsvideo (kursplanlegger)

> **INNSPILL MOTTATT 5. AUGUST (Tage/Edalio).** En arbeidsflyt er testet:
> skjermopptak etter manus, klipp fra Artlist via MCP, norsk AI-stemme som
> voice-over. Beslutningen i seksjon 31.1 om å fraråde AI-video må **nyanseres,
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

## 38. Redigeringsrettigheter + endringslogg

På ny side skal ansatte redigere leker og dokumenter DIREKTE i grensesnittet og lagre — ingen
last-ned-endre-last-opp slik det er i dag. PDF genereres fra data og er dermed alltid oppdatert
automatisk. Dette er et stort salgspoeng overfor de ansatte: ett steg i stedet for fem.

### 38.1 Rettighetsmatrise (BESLUTTET 1. august)

| Rolle | Hvem | Kan gjøre |
|---|---|---|
| Superadmin | Kjartan og Tommy | Alt, inkludert sletting og endring av taksonomi |
| Administrator | Ansatte | Redigere og arkivere innhold. IKKE slette. |
| HTLA / skolebruker | Hovedkontakt TL ved skolen | Kun egne ting (egen skoles hjul, planer, opplysninger) |
| Ansatt ved skolen | Øvrige TL-ansvarlige | Kun egne ting |

Kjerneprinsippet: sletting krever superadmin. Arkivering er ansattes trygge alternativ — innholdet
forsvinner fra visningen, men ikke fra basen. Det løser det praktiske behovet uten å gi bort det
farlige.

### 38.2 To vern som bygges samtidig

(a) En endringslogg: hvem endret hva, når. (b) En bekreftelse før sletting. Sammen løser disse to
det aller meste av uhell — man kan se nøyaktig hva som skjedde og rulle tilbake.

### 38.3 Samme mekanisme bærer tre behov

Rettighetsfeltene (denne seksjonen), backup-avviklingen (seksjon 42) og oversettelsenes
ferskhetsflagging (seksjon 45) bør designes som ÉN mekanisme i datamodellen, ikke tre separate.
Alle tre trenger å vite hvem som endret hva og når. Beslutningen må derfor være tatt før Fase 3-strukturen
bygges, siden feltene skal ligge i modellen fra start.

## 39. Fase 3 + 4 — rekkefølge og arbeidsform

### 39.1 Fase 3-oppbygging, fire steg (grove anslag)

1. Sortere/forstå dataene — mye er gjort (seksjon 14.7 + 47 + 48). Gjenstår: de to media-sprikene
avklares med Jon. Anslag: dager.
2. Bygge «hyllene» (strukturen/datamodellen) — tabeller, felter, taksonomi, filtre, maler. Dette er den
STØRSTE jobben i hele Fase 3. Her bygges også fulltekstsøk (seksjon 47), husets 8-punktsmal
(seksjon 48), «egnet for»-merking (seksjon 43), «kan ledes av elever» (14.7), rettighetsfeltene (38)
og flerspråk-laget (45) fra start. Anslag: 1–2 uker+.
3. Importere via skript — tekst/metadata parses inn, bilder → Supabase, video → Bunny.net. Kjøres
på FERSK eksport fra Jon. Anslag: dager når skriptet er ferdig.
4. Rydde/kvalitetssikre. Anslag: dager.

### 39.2 Innholdsfrys — beskjed til de ansatte

De ansatte kan jobbe FRITT på gammel side akkurat nå — innholdet importeres uansett fra en fersk
eksport senere. Stoppbeskjeden kommer først når Jon tar den endelige eksporten (månedsskiftet
august/september). Fra det øyeblikket til ny side er live: ikke last opp eller endre på gammel side,
ellers jager man et bevegelig mål. Kjartan varsler frysen når sluttleveransen bestilles.

### 39.3 Arbeidsform: bygg struktur + Fase 4-verktøy PÅ TESTDATA før full import

1. Bygg strukturen med en liten testmengde — 10–20 leker, nok til å se at «hyllene» fungerer. 2.
Bygg TL-hjulet og Periodeplanen oppå den strukturen mens den bare har testdata. 3. Når struktur og
verktøy flyter: kjør full import på fersk eksport.
Fordelen: finnes det en feil i datamodellen, rettes den mens det bare er 15 leker inne — ikke etter at
868 er importert.
Presisering (1. august): Fase 4-verktøyene blokkerer IKKE importen. Strukturen bevist på testdata
er tilstrekkelig; verktøyene peker bare på leker. Men verktøyene MÅ være ferdige til lansering
(seksjon 15). De to tingene er altså begge sanne: importen kan kjøres før verktøyene er ferdige,
men lanseringen kan ikke.

## 40. TLA laster opp egne lekeforslag (TL = redaktør)

Ivrige trivselsledere sender inn egne lekeforslag. Trivselsleder har redaktøransvar — beskytter
merkevaren, sikrer involvering, og kan bevisst fylle innholdshullene fra seksjon 14.7 og 50.
Redaksjonell arbeidsflyt: innsendt → vurdering → redigering sammen med innsender →
godkjent/avvist → publisert med kreditering. Samme «systemet foreslår, mennesket bestemmer»prinsipp
som resten av plattformen.
Validert i v31: Edalio har bygget nøyaktig denne sløyfen, med begrunnelse tilbake til innsender ved
avslag (seksjon 47). At en aktør på samme stack har gjort det og fått det til å fungere, senker
risikoen betydelig.
Krever at noen faktisk sitter som redaktør (Kari? Marielle?). Juridisk: en enkel avkrysning «gir TL rett
til å publisere» ved innsending. Tas etter lansering, og etter at Fase 3-strukturen finnes.

## 41. Dele periodeplaner mellom medlemsskoler

La en TLA dele sin periodeplan med en betalende naboskole. Sosialt bevis mellom likemenn er
sterkt for både fastholdelse og mersalg.
Bygger på periodeplan-modulen i Fase 4 — en relativt liten påbygning når selve verktøyet finnes.
Start smalt (skole-til-skole, privat deling) før et åpent delingsbibliotek vurderes.
Personvern: en periodeplan kan inneholde elevnavn. Før deling må persondata enten strippes
automatisk, eller varsles tydelig. Edalios modell med magic-link-deling med rolle og utløpstid
(seksjon 47) er en ferdig løsning å se til.

## 42. Backup etter lansering

I dag er de ansatte avhengige av en streng manuell rutine: hver ny eller endret aktivitet lastes ned
som PDF til en Back-up-mappe i Dropbox, med filnavn som må matche nøyaktig (seksjon 33).
På ny side kan de ansatte slippe denne manuelle PDF-backupen helt — PDF-en genereres fra data
(seksjon 38) og er derfor alltid oppdatert automatisk. Dette er en reell lettelse å love de ansatte.
- Supabase Pro daglige backups (allerede på plass).
- Endringsloggen (seksjon 38) løser 90% av uhell.
- Slette-vern (seksjon 38) forhindrer resten.
- Eventuelt en automatisk innholds-eksport som ekstra forsikring.
Viktig presisering: «det ligger i Supabase» er ikke automatisk trygt mot egne feilslettinger — derfor
er endringslogg og slette-vern nødvendige, ikke valgfrie. Med disse på plass blir ny side faktisk
TRYGGERE enn dagens løsning, som hviler på at en person husker en manuell rutine hver gang.

## 43. 60-minuttersmålet — strategisk reposisjonering

Reposisjoner Trivselsleder fra «friminuttprogram» til «skolens verktøy for hele det daglige 60-minutters
fysisk aktivitet-målet». Trivselsleder dekker i realiteten allerede friminutt, FYSAK,
kroppsøving og aktiv læring i timene — men denne bredden drukner i dagens kommunikasjon.

### 43.1 Tre horisonter

(a) Fortellingen/rammen — inn i design-fasen og Evidence-siden NÅ (kun tekst/struktur, ingen ny
kode). Kobles til hjemmeside-rådet om at kurs og bibliotek skal vises som ETT program, én reise —
reisen er skoledagen, ikke bare friminuttet.
(b) «Egnet for»-merking av leker — inn i Fase 3-datamodellen. Billig å bygge når metadata uansett
skal parses ut fra fritekst: et felt for friminutt/kroppsøving/SFO/aktiv læring/FYSAK per lek. Da kan en
kroppsøvingslærer filtrere på «kroppsøving, 5. trinn, ute», og SFO kan få egen inngang.
(c) Lærertimeplan med ledelsesrapportering — stor modul, bygges senere. Hver lærer får egen
innlogging og timeplan, og dokumenterer aktiv læring til ledelsen; rektor får dashbord på tvers av
trinn. Gjør Trivselsleder synlig for beslutningstakeren UKENTLIG i stedet for bare ved fornyelse.

### 43.2 Hjemmelekse

Skaff ASK-studien i original (norsk, Vestlandet — dokumenterer aktiv læring som effektiv
repetisjons-og alternativ undervisningsmetode) til Evidence-siden.

### 43.3 Rød tråd

Nesten hver idé i denne retningen gjør det vanskeligere for en skole å si opp: fellesskap gjennom
deling og bidrag (seksjon 40 og 41), synlighet hos beslutningstakeren, og å bli løsningen på et
myndighetspålegg. Målet er å bygge et produkt skolene vil DELTA i, ikke bare kjøpe.

## 44. Island — digital tjeneste

Trivselsleder hadde tidligere en reell franchise på Island, som var vanskelig å opprettholde fysisk.
Planen er å etter norsk lansering tilby en ren digital tjeneste: språk-switch til islandsk + abonnement,
uten fysiske kurs.

### 44.1 Avstand og avhengigheter

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

### 44.2 Konklusjon

Island kan bli en billig PILOT for hele den digitale abonnementsmodellen — med eksisterende
merkevarekjennskap fra franchise-tiden som fordel — før England-satsingen. Rekkefølge: norsk
kjerne → Fase 3 → abonnementsmodul + Stripe → islandsk språklag → landskonfigurasjon.

## 45. Oversettelsesstrategi: oversett data, ikke dokumenter

Kjerneprinsipp: layout, design og struktur bor i koden (React-malene), mens tekst bor som data i
Supabase. Det gjør oversettelse til én batch-jobb i stedet for 868 enkeltjobber. Etter Fase 3-importen
sender et skript alle tekstfelt gjennom Claude API i batch og skriver resultatet tilbake som et eget
språklag.

### 45.1 Rekkefølge og nøyaktighet

- Rydd taksonomien FØR oversettelse — ikke betal for å oversette dubletter eller nynorsk-rot.
- Terminologi-ordliste med 30–50 kjernebegreper besluttes én gang og brukes konsekvent.
- Status/ferskhetsfelt per oversettelse: flagges automatisk «utdatert» når den norske originalen
endres. Samme mekanisme som seksjon 38.
Første ord i ordlisten er besluttet (1. august): i lekebeskrivelser brukes «barn» eller «person»
(eventuelt «spillere») — IKKE «elev». Besluttet av Kjartan, Vegard og Karoline. Se seksjon 48. Dette
er et godt eksempel på at ordlisten må bygges av huset selv, ikke av oversettelsesverktøyet.

### 45.2 Format-spesifikke valg

- PDF-er oversettes IKKE direkte — de genereres på nytt fra det oversatte språklaget. Kun ekte
design-dokumenter (InDesign-plakater, ~15–20 stk) trenger manuell håndtering.
- Video: undertekster via AI (transkribering + oversettelse) er nesten gratis; dubbing er dyrere og
ikke nødvendig i første omgang.
- Engelsk-AI er svært god — utfordringen ligger i begrepsvalg, ikke språklig kvalitet.

### 45.3 Åpent spørsmål

Merkevarespørsmål: heter produktet «Trivselsleder» også i England, eller trengs et engelsk navn?
Avklares når England-satsingen nærmer seg.

## 46. Må-til-pilot, må-til-lansering, kan-komme-etter

> **OPPDATERT 5. AUGUST.** Bøttene under gjelder fortsatt. Endringer:
> hele blokk A er flyttet fra «må til pilot» til ferdig og bevist.
> Nytt i «må til pilot»: rotering av de to API-nøklene som ligger i klartekst
> (seksjon 55), import av «Vanlig vertskap» og «Alternative haller» fra
> hallregister-regnearket (9.6), og full loop-test mot dette dokumentet som
> fasit (`TESTOPPDRAG-v32.md`). Nytt i «må til lansering»: RLS-gjennomgangen,
> som ble anbefalt 19. juni og fortsatt ikke er gjort.

Utvidet i v31. Sorteringsøkten 29. juli viste at v30-rammeverket med to bøtter var for grovt: det finnes
TO milepæler, ikke én. Piloten med Marielle kommer i august; lanseringen kommer i oktober. Ting
som må være klart til piloten er ikke det samme som ting som må være klart til lansering.
Dette løser også en tilsynelatende selvmotsigelse i v30: automatisk e-post sto oppført under «kan
komme etter lansering» (46.3), men er samtidig en forutsetning for at piloten skal være selvgående
(seksjon 29). Begge deler var riktige — de gjaldt bare ulike milepæler.

### 46.1 Bøtte 1 — MÅ til pilot (medio august)

> **OPPDATERT 5. AUGUST.** «Resend Trinn B ferdig: steg 3b, 3c, 3d» er gjort og
> kan strykes fra bøtta. Nytt i bøtte 1: rotering av API-nøklene (seksjon 55),
> import av «Vanlig vertskap» og «Alternative haller» (9.6), og full loop-test
> mot fasit.

> **OPPDATERT 6. AUGUST — nytt i bøtte 1:**
>
> - **Hverdagsark for de ansatte** med tilbakerulling (23.4). De redigerer
>   allerede tekster i dag.
> - **Filterrad og eksport i kursoversikten** (9.5), inkludert rubrikk for
>   sesong.
> - **Statushistorikk for skoler og lagring av frafallsvarsler** (11.3).
>   Historikk kan ikke lages i ettertid — klokka går fra første ekte skole.


- Resend Trinn B ferdig: steg 3b (motor), 3c (de fem gjenstående utsendingene), 3d (frontend og
RA-knapp).
- Demo-manus (seksjon 37) og videoinnspilling.
- Sletting av demo-innhold og Trinn B-testspor.
- Uavhengig av Jon og Fase 3 — kan kjøres nå.

### 46.2 Bøtte 2 — MÅ til norsk lansering (mål 1. oktober)

> **NYTT 6. AUGUST.** To ting fra kursplanleggeren er lagt inn i denne bøtta:
>
> - **«Mine kurs» som standardvisning** i kurslista. Uten det blir lista
>   uoversiktlig etter én sesong med rundt 150 kurs. Se 9.5.
>   *Merk: selve filterraden (RA, sesong, nettverk + søkefelt) står som bøtte 1
>   — pilot i 9.5, fordi piloten trenger den først. Det er «mine kurs» som
>   standardvisning som hører hjemme her i bøtte 2.*
> - **Rydding av RA-feltet**, som i dag er fritekst og ikke koblet til
>   brukerkontoen. *På vanlig norsk: systemet vet ikke hvilken RA som er
>   hvem, det står bare et navn skrevet inn for hånd.* Uten den koblingen kan
>   «mine kurs» ikke virke i det hele tatt. Se 9.5 og 36.

- Rettighetsfelt inn i datamodellen FØR hyllene bygges (seksjon 38) — samme mekanisme bærer
backup (42) og oversettelsesferskhet (45).
- Fase 3-struktur på testdata, inkludert fulltekstsøk, husets 8-punktsmal, «egnet for», «kan ledes
av elever» og flerspråk-laget.
- Fase 4-verktøyene: TL-hjul, Periodeplan, PDF-generator (besluttet 1. august).
- Media-sprikene avklart med Jon + fersk fulleksport bestilt + innholdsfrys varslet.
- Full import av alle 868 leker.
- Forside, design og Evidence-siden med 60-minuttersfortellingen.
- Stor dataimport av skoler/ansatte/nettverk, og HubSpot-synk aller sist.
- GDPR/DPA (Resend + Bunny.net), WCAG-gjennomgang, Feide i produksjon, DNS-overgang.

### 46.3 Bøtte 3 — kan trygt komme ETTER lansering

> **OPPDATERT 6. AUGUST — nytt i bøtte 3:** kalendervisning i kursoversikten
> (9.5), kursholderkalenderen med tilgangsstyringen (9.9), og **egen
> testdatabase** (seksjon 59, nivå 2).


- Abonnementsmodul + Stripe — trengs først når Island eller England skal selges digitalt.
- Ledelse-dashboard i full versjon (seksjon 11.3) og brukslogg-dashbord (13).
- Webinar-modul (17) og kursholder-innlogging (9.9).
- Svensk språk-switch (27).
- Kulturkort-restpunkter (5.3) og rektoragent-adminknapp (7.4).
- Nyhetsbrev og nettverks-e-post (12.13).
- Alle idébank-punktene: TLA-lekeforslag (40), deling av periodeplaner (41), lærertimeplanmodulen
(43.1c), de fire idéene i seksjon 31.
- Fra Edalio-listen: magic-link-deling, presentasjonsmodus, årshjul-regnskap, AI-knapper,
dokumentopplasting (seksjon 47).

### 46.4 Kritisk sti / de reelle tidstyvene

Fase 3-strukturen (den store byggejobben), design-fasen, og at importen er blokkert til Jons august-eksport
foreligger. Det siste er verdt å merke seg: uansett hvor fort det jobbes, kan ikke full
innholdsimport skje før månedsskiftet august/september. Den datoen setter en naturlig nedre grense
for lansering — og med mål om alle 868 leker inne 1. oktober er marginen liten.

## 47. Edalio-kartlegging (NY) — samme stack, ti gjenbrukbare mønstre
Rapport: edalio-kartlegging-2026.md, ferdigstilt 1. august 2026. Det spesielle med denne
kartleggingen er at Edalio kjører SAMME tekniske stack som oss — Supabase med
radnivåsikkerhet, og Resend for e-post. Det betyr at mønstrene deres kan gjenbrukes direkte, ikke
bare tjene som inspirasjon.

### 47.1 De viktigste funnene — inn i Fase 3-strukturdesignet

| # | Mønster | Hvorfor det betyr noe for oss |
|---|---|---|
| 1 | Fasettert bibliotek med levende tellere og filtertilstand i URL | Filtrene oppdaterer antall løpende, og en filtrert visning kan deles som lenke |
| 2 | FULLTEKSTSØK fra dag én (Postgres FTS + pg_trgm) — *ordsøk som tåler skrivefeil og bøyninger, og som gir treff mens du skriver* | Søk-mens-du-skriver. Edalios STØRSTE ANGER er at de manglet dette i starten |
| 3 | Aktiv læring-malen bekrefter husets 8-punktsmal | To uavhengige kilder peker på samme struktur — se seksjon 48 |
| 4 | Strukturert instruktørnotat per aktivitet | Eget felt, ikke fritekst nederst i beskrivelsen |
| 5 | Flertrinns-tagging i datamodellen NÅ | Én aktivitet kan passe flere trinn med ulike varianter |
| 6 | Tomt søkeresultat blir «foreslå dette» | Gjør en skuffelse om til et innspill — kobler rett på seksjon 40 |
| 7 | Strukturert tilbakemelding per ressurs | Faste svartyper FØR fritekst gir data man kan telle |
| 8 | Lukket innsendings-sløyfe med begrunnelse | Innsender får vite hvorfor — validerer seksjon 40 |
| 9 | HENDELSESLOGGING fra første deploy | Edalio utsatte dette og står nå uten grunnlag for gratis/Pro-beslutninger |
| 10 | Skolen må være en ekte entitet i modellen | Vi har allerede dette — et forsprang verdt å beholde |

### 47.2 Kan vente til etter lansering

- Magic-link-deling med rolle (vikar/foreldre/instruktør) og utløpstid — samme mekanikk som
seksjon 41 trenger.
- Ta-egen-kopi frikoblet fra originalen, slik at skolens tilpasning ikke ødelegges når originalen
endres.
- Presentasjonsmodus for to skjermer.
- Årshjul- og dekningsregnskap: Edalios LK20-teller oversatt til et TL-årshjul som viser hva skolen
faktisk har dekket.
- AI-knapper med NAVNGITTE operasjoner («forenkle for 2. trinn», «lag uteversjon») — ikke et
tomt promptfelt. Dette er et viktig designpoeng: brukere vet ikke hva de skal skrive i en tom boks.

- Word/PDF-opplasting som konverteres til struktur.

### 47.3 Innholdsfunn

194 Aktiv læring-opplegg er TL og Lærervikarens EGNE leker, foredlet. De er utvidet med
LK20-kobling, nivåvarianter og instruktørnotat. Dette er vårt eget materiale i bedre innpakning — og
det bør kunne hentes hjem. Teknisk er det mulig via en samlet uttrekk fra deres innholdsfelt; det
praktiske og avtalemessige må avklares.
«Klassens time» finnes hos Edalio som generatortype, men UTEN egen bibliotekkategori. Det er et
åpent hull TL kan fylle — vi har innholdet, de har ikke kategorien.

### 47.4 Strategisk spørsmål som må avgjøres FØR datamodellen låses

Kjartan må beslutte: skal Edalio og Trivselsleder være to separate produkter, eller dele database?
Dette er ikke et teknisk spørsmål som kan utsettes — det avgjør hvordan innholdsmodellen skal se
ut. Beslutningen bør tas før Fase 3-strukturen bygges i høst, ikke etterpå.

## 48. Redaksjonell standard for lekebeskrivelser (NY)

Fem interne dokumenter ble mottatt 1. august, sammen med Marielles Dropbox-oppdatering fra juli.
Det viktigste av dem er «SLIK SKAL LEKER BESKRIVES» — husets egen redaksjonelle standard.

### 48.1 Husets 8-punktsmal (skal brukes)

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
KONSEKVENS: denne malen erstatter den Fable foreslo i seksjon 14.7
(Hensikt/Oppsett/Steg/Variasjoner/Tilpasning). Husets egen mal er bedre, mer detaljert, og allerede
innarbeidet blant de som skal bruke den. Den skal legges inn i Fase 3-datamodellen som
feltstruktur.

### 48.2 Terminologi-beslutning

Besluttet av Kjartan, Vegard og Karoline: bruk «barn» eller «person» (eventuelt «spillere») i
lekebeskrivelser — IKKE «elev». Dette er første oppføring i terminologi-ordlisten (seksjon 45.1).

### 48.3 Metadata-i-fritekst-problemet i nytt lys

Viktig omtolkning: at Sted/Antall/Utstyr står som fet tekst i beskrivelsen for 761 av 868 leker er
IKKE slurv — det er punkt 1 i husets egen mal, altså en bevisst regel som er fulgt konsekvent. Det er
gode nyheter for importen: når mønsteret er bevisst og konsekvent, har parsingen noe forutsigbart å
treffe. Til gjengjeld må selve husregelen oppdateres når boksen genereres automatisk fra
databasefelt i stedet for å skrives for hånd.

### 48.4 Dropbox og grafikk

Marielles juli-oppdatering: Dropbox er omstrukturert. Ansatte, backup og databehandleravtale ligger
nå under «administrasjon». Grafikkmappen er ryddet på nytt, men den gamle grafikkmappen står
fortsatt igjen, og opprydding i sosiale medier pågår. Dette betyr at Dropbox-stiene i
rutinedokumentene kan være utdaterte og MÅ verifiseres før Fase 3 bruker dem (seksjon 26).
Et ønske går igjen både i rutinedokumentene og fra Marielle: en FELLES grafikkmappe for Norge og
Sverige. Det støtter Lag A-konvergensen (seksjon 30.4) — og mediebiblioteket i Supabase (seksjon
14.5) kan erstatte hele ambisjonen med noe bedre.

## 49. RA-rollen som arbeidsflyt (NY)

Arbeidsinstruksen for regionansvarlig er lest mot planen. Den bekrefter flere moduler som reelt
behov, og avdekker ett mulig hull.

### 49.1 Det instruksen bekrefter

| Fra arbeidsinstruksen | Konsekvens for planen |
|---|---|
| Alle henvendelser skal loggføres i HubSpot | E-postsporingsknuten (18.4) er en arbeidsinstruks, ikke en finesse |
| Oppstartsmail + registrering + rektorsamtale etter 6 mnd | En flyt som kan automatiseres med samme mekanikk som Trinn B |
| «Aktiv sagt opp»-playbook med faste kampanjer | Churn-flagging bør mate denne direkte (seksjon 11.4) |
| Rektormøte med ALLE skoler hvert 3. år, prioritert mot skoler man hører lite fra | Validerer inaktiv-skole-varsling (31.4) som verktøy, ikke idé |
| Webinarer er fast RA-plikt | Webinar-modulen (17) er et reelt behov |
| Aktiv læring-modul lages mars/april | Fast årshjul verdt å kjenne når moduler planlegges |

### 49.2 Mulig hull i planen — STRØKET 6. AUGUST

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

## 50. Skolenes egne tilbakemeldinger 2023–2024 (NY)

Tilbakemeldingsloggen fra skolene er gjennomgått. Flere punkter er merket «avvente til ny nettside»
— de er altså allerede erkjent, men ikke løst.

### 50.1 Ønsker som ny side skal løse

- Sortering på trinn og målgruppe.
- Sortering på antall deltakere (50–100+).
- Søk på sesong og semester.
- Bilde av forsiden på opplegg.
- «Hjemmesiden er vanskelig å bruke» — gjenganger, og bekrefter designrådet om sterk søk og
filtrering (24.3).
- Turneringsskjema i dokumentbanken.

### 50.2 Innholdshull — bekreftet uavhengig

Skolene etterspør de samme tingene som Fable-kartleggingen fant: samarbeidsleker, vinterleker og
leker for nordlige forhold, bli-kjent-leker, enkle kom-og-gå-leker, og tips til trivselslederne selv. At to
helt uavhengige kilder peker på samme hull gjør prioriteringen enkel.

### 50.3 Det STØRSTE udekkede ønsket

Gjentatt både i 2023 og 2024, med en lang og engasjert tilbakemelding: skolene vil ha en bank
med STRATEGIER, ORGANISERING og LOGISTIKK for TL-drift, differensiert etter skolestørrelse.
Hvordan organiserer man TL på en liten, mellomstor eller stor skole? Hva er voksenrollen? Hvordan
holder man effektive TL-møter? Hvordan opprettholdes motivasjonen over tid? Hvor lagres utstyret?
Hva er rektors rolle?
Dette finnes ikke i planen i dag. Det er verdt å merke seg at det samme innholdsaktivumet mater tre
ting samtidig: dette ønsket, Trivselsboten (seksjon 21) og franchise-håndboken (seksjon 30.3). Å
skrive det én gang løser tre behov — og det er 17 års taus kunnskap som uansett bør skrives ned
mens den finnes i hodene til folk.

### 50.4 Digitale nettverksmøter med utløpende opptak

Et konkret ønske: digitale nettverksmøter der videoen er tilgjengelig i én uke og deretter slettes, av
personvernhensyn. Dette er et presist krav om tilgangslåsing og utløpende lenker, og det er en av
grunnene til at Bunny.nets signerte URL-er ble avgjørende i videoverts-valget (seksjon 32.5).

## 51. Arbeidsform: Claude Code (NY)

Fra 1. august 2026 skjer programmeringen i Claude Code, ikke som løse terminalkommandoer limt
inn én og én. Dette endrer arbeidsdelingen mellom de tre verktøyene.

| Verktøy | Rolle |
|---|---|
| Chat (denne samtalen) | Beslutninger, rekkefølge, arkitektur, SQL, og formulering av oppgaver til Claude Code |
| Claude Code | Selve programmeringen. Leser koden selv, bygger, stopper for godkjenning før push |
| Cowork / Fable 5-agenter | Kartlegging og uavhengig verifisering |

### 51.1 Hva som fungerer godt

- Klare ikke-tekniske beskjeder, ett steg om gangen, med eksplisitt beskjed om å stoppe før
commit og push.
- Be Claude Code lese seg opp på relevante filer FØR den bygger, i stedet for å beskrive koden
for den.
- Be den bevise en påstand i stedet for å gjette. I Trinn B-økten ba den selv om en diagnosespørring
i stedet for å gjette på årsaken — det sparte tid.
- SQL leveres i chatten, ikke via filer. Kjartan limer den inn i Supabase selv.
- To vinduer åpne samtidig: ett med Claude Code, ett vanlig terminalvindu for testkommandoer.

### 51.2 Fallgruver observert 1. august

- Claude Code kan foreslå å «rette opp» data manuelt når noe ser feil ut. Det skjuler ofte om
koden faktisk virker — be heller om en ren test.
- Vercel-mellomlagring kan gi inntrykk av at en rettelse ikke virket. Alltid no-cache ved testing.
- Filer som er opprettet lokalt finnes ikke på serveren før de er pushet. En serverfunksjon kan ikke
testes før den er ute.

### 51.3 Øktrutine (uendret, men presisert)

Start: lim inn STATUS.md. Underveis: SQL i Supabase FØR kode pushes, og ingenting erklæres
ferdig uten bevis. Slutt: oppdatert STATUS.md som limes inn i terminalen med cat-blokk.
STATUS.md er den tekniske statusen i koden; denne fremdriftsplanen er beslutningene og helheten.
De to utfyller hverandre og skal begge oppdateres.

---

## 52. Kursinformasjonssiden (NY — bygget 4. august)

**Kilde:** konsept v1 §4, side 3–4, 15. juni 2026. Forsvant i v2 den 18. juni
og er ikke nevnt i noen fremdriftsplan fra v16 til v31. Bygget 4. august 2026,
commit `08975ae` — **50 dager etter at kravet forsvant**.

**Hva den er.** Når skolen trykker send, er det ikke slutten — det er
overgangen til «nå skal dere forberede dere». I stedet for at all kursinfo
ligger i en e-post som forsvinner i innboksen, sendes skolen til en
kursinformasjonsside på hjemmesiden. Informasjonen bor da ett sted, kan
oppdateres når som helst, og er alltid riktig.

### 52.1 To lag, som konsept v1 beskrev

- **Øverst:** kursspesifikke fakta hentet automatisk — skole, kurs, dato, sted,
  oppmøtetid og vertskapsnotat. Samme kilde som e-postene, så en endring RA
  gjør slår ut begge steder.
- **Under:** én felles tekst for ALLE skoler, lagret som `kursinfo_tekst` i
  `innstillinger` og redigerbar av de ansatte (seksjon 53). Pluss et valgfritt
  `kurs.kursinfo_tillegg` per kurs, for det som bare gjelder ett kurs.

### 52.2 Inngangene

Svarer skolen JA, sendes den til `/kursinfo/:token?takk=1` med kvitteringen
øverst på selve siden. Svarer den NEI, får den den gamle kvitteringen — siden
har ingenting å gi dem. Påminnelsens knapp peker nå på kursinfosiden («Les
kursinformasjonen»), ikke på svarskjemaet. Purring og trinn 3 peker fortsatt på
skjemaet, siden de går til skoler som ikke har svart.

### 52.3 Formattering en ansatt kan bruke uten HTML

`## Overskrift` gir mellomtittel, `- punkt` gir punktliste, tom linje gir nytt
avsnitt, `[tekst](/min-side)` gir lenke (skråstrek = intern, http = ekstern).

### 52.4 Sikkerhet

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

**Til rest:** de fire lenkene konsept v1 beskrev (ressursbiblioteket,
dokumentarkivet, kulturkort-modulen, utstyrspakker) — de to første peker inn i
Fase 3, som ikke er bygget. Utstyrspakke-lenkene står fortsatt som
plassholdertekst i `kursinfo_tekst` og må inn før drift.

---

## 53. Tekster og maler (NY — bygget 4. august)

**Kilde:** husregelen «innstillinger i basen, ikke i koden», og et konkret
behov: fram til 4. august måtte hver tekstendring gjøres med SQL i Supabase.
Bygget commit `19a4528`.

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

**FUNN I PLANEN, IKKE I KODEN:** STATUS ba om et felt `paaminnelse_dager_for`.
Den nøkkelen brukes ingen steder i koden. Påminnelsen har ingen tidsregel — RA
velger dagen og trykker. Feltet ble derfor ikke bygget. Åpent punkt: skal
påminnelsen ha en tidsregel, eller strykes nøkkelen fra planen?

---

## 54. Sporbarhet — bevis, ikke påstand (NY)

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

## 55. Sikkerhetsgjennomgang 4.–5. august (NY)

### 55.1 Lukket 4. august
- **Fem admin-endepunkt sto uten autentisering.** Hvem som helst kunne
  opprette skoler, godkjenne påmeldinger, endre nettverk, koble skoler
  til kurs og slette en `kurs_skole`-rad med skolens svar. BEVIST lukket.
- **`flytt_skole_til_kurs` hadde ingen rollesjekk.** En innlogget
  skoleadmin kunne flytte skoler. BEVIST lukket.
- **Ingen hadde skriverett på `innstillinger`.** Lukket med RLS.

Agenttest 3 fant det første av disse. Det andre — `koble-skole-kurs` —
sto allerede i rettelisten blokk D. De tre øvrige ble funnet da det
første skulle lukkes.

### 55.2 HASTER — nytt funn 5. august
**Fire skript har API-nøkler hardkodet i klartekst:**
`kulturkort_agent_v1.py`, `kulturkort_potensiell_agent.py`,
`skolesjef_agent_v5.py`, `skolesjef_sverige_repair.py`. Samme SerpAPI- og
Anthropic-nøkkel går igjen.

**Roter begge nøklene.** Sjekk om filene har vært committet til Git.
*(Filene ligger i `Min nettside`, ikke i kode-repoet.)*

### 55.3 Åpent — før den store dataimporten

> **PRESISERT 6. AUGUST — når må dette være gjort?** Punktene under har hatt
> tre ulike frister i planen («før dataimporten» her, «før pilot» i
> kulepunktet, «må til lansering» i seksjon 46). Slik gjelder det:
> `hent_evalueringer_admin` og det hardkodede passordet **før pilot**; hele
> RLS-gjennomgangen **før lansering** (bøtte 2, seksjon 46.2); rekkefølgen på
> validering og innloggingssjekk **når som helst før lansering**. Grunnen til
> at RLS-gjennomgangen må være ferdig før den store dataimporten, er at det er
> vanskeligere å stramme inn tilganger etter at hundretusenvis av rader er
> inne enn før.
- `scripts/seed-testbruker.sql` har hardkodet passord, trolig i
  Git-historikken. Brukeren er i aktiv bruk — bytt passord.
  *På vanlig norsk: et passord ble skrevet rett inn i en fil, og filen ligger i
  prosjektets versjonshistorikk. Å slette linjen i dag hjelper ikke — historikken
  husker den. Passordet må byttes.*
- `hent_evalueringer_admin` er SECURITY DEFINER uten sjekk av hvem som
  spør. *På vanlig norsk: denne funksjonen henter alle evalueringssvar og
  spør aldri hvem som ber om dem. Den er betjenten i luka som utleverer hele
  arkivet til hvem som helst som kjenner navnet på skranken. Alvorlig — bør
  rettes før pilot.*
- `anon` har lese- og skriverett på `kurs_skole_mottaker`. *På vanlig norsk:
  tabellen med lærernes navn, e-post og personlige lenker står åpen for
  besøkende uten innlogging — ikke bare til å leses, men til å endres. Det er
  nødvendig i dag for at læreren skal kunne svare uten å logge inn, men det
  må strammes inn slik at en lenke bare gir tilgang til sin egen rad.
  Personopplysninger — dette er også et GDPR-punkt, ikke bare et teknisk.*
- De fire andre admin-endepunktene validerer kroppen FØR de sjekker
  innlogging. Ingen slipper forbi, men rekkefølgen bør snus.
  *På vanlig norsk: dørvakten sjekker at skjemaet er riktig utfylt før han
  sjekker at du har billett. Ingen kommer inn uten billett, så det er ikke et
  hull — men en uinnlogget person får vite om skjemaet var riktig, og det er
  informasjon han ikke skal ha. Enkel retting.*

RLS-gjennomgangen ble anbefalt i konsept v3 den **19. juni**. Den er 47
dager gammel som åpent punkt.

### 55.4 E-post og domener før lansering
Fra rettelisten blokk D, utelatt i førsteutkastet:

- De fire konto-e-postene bygger lenker med **fast domene**, ikke
  `nettsted_url`. Glemt-passord sender brukeren til gamle
  trivselsleder.no.
- **Fotlenken i alle e-poster** peker på gamle trivselsleder.no.
- `nettsted_url` må settes til trivselsleder.no ved lansering.

### 55.5 Arbeidsregelen som ble brutt
`Dispatch_Claude_Code_for_ny_trivselsleder_no.pdf` er den eneste skrevne
arbeidsinstruksen prosjektet har: «**Ikke la samme agent som bygger
funksjonen være eneste sikkerhetskontrollør**».

De fem åpne endepunktene er hva som skjer når den regelen ikke følges.
Seksjon 9 er hva som skjer når den følges.

---

**Full dokumentasjon:** `SIKKERHET-5-august.md`.

---

## 56. Nye funn 5. august — fra gjennomgangen av samtlige dokumenter (NY)

Fra gjennomgangen av samtlige dokumenter i `Min nettside`. Full vurdering
i `DOKUMENTOVERSIKT.md`.

*Kildemerknad: punktene i denne seksjonen bygger på dokumenter og filer
som ligger utenfor kode-repoet. De kan ikke etterprøves med grep i
`trivselsleder-ny`, og er derfor KODEVERIFISERT-nivå på det som gjelder
kode, PÅSTÅTT på resten.*

### 56.1 Hallregisteret

Behandlet i seksjon 9.6. Se korreksjonsblokken der.

### 56.2 Ledelsens dashboard

Behandlet i seksjon 11. Se korreksjonsblokken der.

### 56.3 Statusdriften er fem dager eldre enn antatt
Rettelisten peker på fremdriftsplan v23 (23. juni) som opphavet til
«Ferdig»-påstandene. `Gml/status_kommando.pdf` av **18. juni** sier
allerede at alle sju moduler er ferdige, inkludert Kortutdeling og Kopier
kursplan.

Samme dag som konseptdokumentet ble kortet fra ti til tre sider, og samme
dag som kortutdelings-prototypen ble skrevet. Nedkortingen,
ferdigmeldingen og prototypen skjedde innenfor timer.

### 56.4 Krav fra prosjektplanen 3. juni som aldri kom videre
`Gml/trivselsleder_prosjektplan.pdf` er det eldste dokumentet:

- «**«Foreløpig påmelding» – oppgi elever senere**» — dette er «vet ikke
  ennå»-kravet. **To måneder eldre** enn vi trodde, forkastet 4. august
  uten at noen visste at det hadde stått der siden juni.
- «**«Min påmelding» – skolen ser og endrer egen påmelding**»
- «**Automatisk bekreftelsesmail med kurshefte**»
- «**Oppfølgingsmail dagen etter kurset**»
- Tre GDPR-krav som ikke står i noen lanseringssjekkliste:
  «**Kryptering av data ved lagring (mangler i dag – må inn i ny
  løsning)**», «**Sletting av brukere ved oppsigelse (automatisert)**»,
  «**Ny databehandleravtale … som lister korrekte underleverandører
  (Vercel, Supabase, Vimeo)**»

De tre GDPR-punktene er lovkrav, ikke ønsker. De hører i bøtte 2.

### 56.5 Seks ferdige datasett ligger ubrukt
Ikke krav som falt ut — arbeidsresultater som falt ut. Alle fra samme uke
i juni: 900 potensielle kulturkort-partnere · 176 med gjenfunnet
kontaktinfo · 2 456 rektorer med e-post · 337 av 357 norske skolesjefer ·
156 svenske rektoravvik · 141 vertskapsoppføringer.

Rektorbasen har **21 % lav eller feil konfidens** (314 «feil» + 199
«lav»). Manuell kontroll før utsending står ikke som oppgave noe sted.
Den svenske skolesjefbasen er 29 av 276 kommuner — 11 %.

### 56.6 Innholdsmodellen for Fase 3 er bestemt to ganger
`Gml/GJENNOMGÅ FRA ANSATTE/Slik skal leker beskrives.docx` er en
åtte-punkts skrivestandard fra fagansatte, nesten identisk med det
Edalio-rapporten uavhengig anbefaler (v31 §47, mønster 3). To uavhengige
kilder, samme struktur. **Bør låses før Ramsalt-importen.**

`RA-rollen.docx` i samme mappe har krav som «tlf etter 6 mnd med rektor»
og «møter for alle skoler en gang per 3. år». Begge forutsetter en «sist
kontaktet»-dato som ikke finnes i datamodellen.

### 56.7 CRM-spesifikasjonen har seks krav uten hjem
`Gml/CRM ny hjemmeside_flatten.pdf` ble nevnt i konsept v2 som «egen
spesifikasjon». Den krever blant annet «**Et notatfelt per skole**»,
«**E-post sendt fra ny side lagres automatisk på skolekortet**» og
«**DealBuilder sender kontrakten rett til ny side i stedet for
HubSpot**». Ingen står i noen plan i dag.

Fra HubSpot-kartleggingen: nyhetsbrev krever
«**avmeldingshåndtering**». Lovkrav, står ingen steder.

### 56.8 Rekkefølgekonflikt: barnehage mot Stripe
`Trivselsleder-i-barnehagen-programforslag.pdf` har høst 2026 i sin
tidslinje og forutsetter «**Stripe Checkout**», «**EHF-faktura**» og
«**Kjedekontoer med samlefakturering**». Stripe ligger i **Fase 8**.
Enten flyttes barnehagelanseringen, eller så flyttes betalingsløsningen.

### 56.9 Videovalget står ubesvart
v31 §32 sier «BESLUTTET: Bunny.net Stream». `CLAUDE.md` i prosjektmappa
lister fortsatt «Vimeo Pro». Cowork-oppdrag D av 29. juni ba om å ta
valget på nytt; ingen leveranse er funnet.

### 56.10 Videoproduksjon

Behandlet i seksjon 37. Se korreksjonsblokken der.


**Full vurdering av alle 33 dokumentene:** `DOKUMENTOVERSIKT.md`.

---

## 57. Hva som skal hindre gjentakelse (NY)

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

## 58. Dette dokumentet ble selv felt av sin egen regel (NY)

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

### 58.1 Og en gang til, samme dag — om formen

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

### 58.2 Kontrollrunden på den fullstendige utgaven

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

### 58.3 Kontrollrunden på v33 (NY)

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
| Feil tall og datoer | 2 | «nitten versjoner» om v8→v29, som er tjueto |

**Alle 30 er rettet før denne utgaven ble laget.** Fem tall der planen er uenig
med seg selv (868/869 leker og fire andre) er ikke rettet, fordi ingen av
tallene kan bekreftes fra dokumentet alene. De står nå som åpent punkt i
seksjon 36 i stedet for å bli gjettet på.

**Hva runden viser.** Fem av de seks feiltypene handler ikke om at noe var
ukjent, men om at noe var kjent og likevel falt ut under omskrivingen. Det er
det samme mønsteret som seksjon 55 og 57 beskriver, og det er grunnen til at
kontrollen aldri kan sløyfes fordi «denne gangen var jeg nøye».


---

## 59. Utviklingsmiljø etter lansering (NY)

Reist av Kjartan 6. august: *«når siden er lansert er det vel lurt å fortsatt
ha en testside hvor man for eksempel kan bygge en tilleggsmodul som
trivselsundersøkelsen eller en digital tjeneste via Stripe — at dette testes i
ro og fred, uavhengig av siden som da er live for alle skolene?»*

Svaret er ja. Og saken er to ting, ikke én.

### 59.1 Nettsiden er den enkle halvparten

Den finnes nesten allerede. `trivselsleder-ny.vercel.app` fungerer i praksis
som testside i dag. Når `trivselsleder.no` blir den nye siden ved lansering,
kan testsiden bare bli stående.

Vercel kan i tillegg lage en egen adresse for hver ting som bygges, slik at en
ny modul har sitt eget sted mens den lages, uten at noen andre ser den. Den
muligheten følger med Vercel-oppsettet vi allerede bruker, men er ikke tatt i
bruk — prosjektet har i dag bare én arbeidsgren.

### 59.2 Databasen er den vanskelige halvparten

Nettsiden er bare utstillingsvinduet. Alt det virkelige — skolene, kursene,
svarene, kontaktpersonene — ligger i databasen. **I dag finnes det én.**

Peker testsiden på den samme databasen, testes det ikke i ro og fred, men midt
oppi ekte skoledata. To konkrete eksempler:

- **Stripe-modulen.** Under bygging vil noen prøve en betaling. Peker testsiden
  på den ekte databasen, prøves det mot ekte skoler med ekte avtaler. En feil
  der er ikke en skrivefeil — det er en faktura.
- **Trivselsundersøkelsen.** En halvferdig modul som skriver til databasen kan
  legge igjen rader i tabeller de ansatte jobber i samtidig. Som å pusse opp
  kjøkkenet mens middagen serveres.

### 59.3 Tre nivåer

| Nivå | Hva | Når |
|---|---|---|
| **1** | **Egen arbeidsgren.** Ny modul bygges på egen gren og får sin egen adresse automatisk. Databasen deles fortsatt — duger til skjermbilder og utseende, ikke til noe som skriver data. | Kan tas i bruk ved behov. Ingen forberedelse, ingen kostnad. |
| **2** | **Egen testdatabase.** Et eget Supabase-prosjekt ved siden av. Testmiljøet er da helt frikoblet: ekte skoler kan ikke røres uansett hvor mye man roter. **Dette er målet.** | Før første modul bygges ETTER lansering. Ikke før lansering. Koster ekstra per måned. |
| **3** | **Kopi med anonymiserte data.** Testdatabase fylt med kopi av ekte innhold, der navn og e-postadresser er byttet ut. Mest realistisk testing, mer arbeid, personvernhensyn. | Vurderes senere. |

### 59.4 Forutsetningen — oppskriften på databasen

**Frist: før den store dataimporten.** Dette er det eneste punktet i seksjon 59
som har en reell frist, og den kommer før lansering.

Prosjektet har en mappe, `supabase/migrations`, med seksten filer nummerert
001–016. *På vanlig norsk: det er oppskriften på hvordan databasen bygges,
trinn for trinn, slik at den kan lages på nytt fra bunnen.*

**Men oppskriften stopper i juni.** Kontrollert 6. august: ingen av
kursplanleggerens tabeller står der — `kurs`, `kurs_skole`,
`kurs_skole_mottaker`, `innstillinger`, `haller`, `kursholdere`,
`evalueringer`. Av åtte små programmer inne i databasen som appen kaller, er to
skrevet ned. Resten finnes bare inne i Supabase.

**Konsekvens: databasen kan i dag ikke bygges opp igjen fra prosjektfilene.**
Dermed kan heller ingen testdatabase lages.

**Hvorfor fristen er dataimporten og ikke lansering:** katastrofetilfellet er
allerede dekket. Seksjon 42 sier «Supabase Pro daglige backups (allerede på
plass)», og en slik sikkerhetskopi henter tilbake både struktur og innhold.
Oppskriften trengs til to andre ting: å lage testdatabase nummer to, og å vise
en ny person hvordan systemet er bygget — prinsippet «uavhengig av én person».

Fristen er praktisk: nå inneholder basen testdata, så oppskriften kan bevises
ved å bygge en kopi og sammenligne. Etter importen av 2 456 rektorer og ekte
skolesvar er samme øvelse tyngre og mer risikabel. Og oppskriften vokser for
hver nye tabell.
