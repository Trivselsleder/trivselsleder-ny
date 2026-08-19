# STATUS.md — Trivselsleder-ny (teknisk status + aktive spor)

**Sist oppdatert: 19. august 2026 — SLÅTT SAMMEN til ÉN kilde.** Denne fila
samler det som før lå i to ulike STATUS.md-er (claude.ai-prosjektet + Mac-mappa
`~/trivselsleder-ny/`), som hadde vokst fra hverandre. Ved motstrid gjelder det
**nyeste**. Leses ved starten av hver økt.

**Gjeldende plan: FREMDRIFTSPLAN v41** (bygget + uavhengig kontrollert 18. aug,
regel 4). v40 og eldre = arkiv. **v41 ligger nå i prosjektet som
`FREMDRIFTSPLAN-v41.md`** (lagt inn 19. aug).

STATUS.md = teknisk status + aktive spor i koden. Fremdriftsplanen = beslutninger
og helhet. Begge oppdateres. Mål norsk lansering: ca. 1. oktober 2026.

---

## INSTRUKS TIL CLAUDE — LES FØRST (til meg selv, ikke til Kjartan)

*Kjartan trenger ikke lese denne boksen. Den er faste regler for hvordan økta
kjøres, så han trygt kan nøye seg med den enkle åpningslinja under.*

1. **ANKER:** Bruk KUN denne `STATUS.md` + `FREMDRIFTSPLAN-v41.md` som fasit for
   hva som gjelder nå. Alt annet i prosjektet er **ARKIV**.
2. **DATOSJEKK:** Før du sier at noe er «ferdig» eller «gjenstår», sjekk datoen i
   kilden. Presenter **ALDRI** en arkivfil som dagens status. (Dette gikk galt
   18.–19. aug — en retteliste fra 4. aug ble lagt fram som fersk.)
3. **FINN RIKTIG FIL via «TEMA → GJELDENDE FIL»-kartet under.** Ikke fritt
   søk som førstevalg — søk rangerer på tema, ikke dato, og gir gamle treff.
4. **LAGRING:** Filer i `~/trivselsleder-ny/` synkes **IKKE** automatisk til
   prosjektet — ingen auto-synk finnes. Når noe skal være trygt for neste økt,
   lagre det EKSPLISITT begge steder (prosjekt + Mac) og bekreft.
5. **KOMMUNIKASJON:** Skriv til Kjartan i klartekst. Merk alt han skal forstå
   eller gjøre med **«Til deg:»**. Hold teknisk internprat kort og adskilt — han
   er ikke tekniker og skal slippe å tolke teknisk sjargong.

## SLIK GJØR KJARTAN DET (de to eneste frasene han trenger)

- **Åpne ny chat:** «Les STATUS.md i prosjektet før du gjør noe annet. I dag
  jobber vi med [tema].»
- **Lagre:** «Lagre STATUS.md» (eller «Lagre <filnavn>») → Claude lagrer fila i
  prosjektkunnskapen **og** i `~/trivselsleder-ny/`, og bekrefter begge steder.

---

## TEMA → GJELDENDE FIL (så du slipper å huske filnavn)

Si temaet i ny chat («vi jobber med X»), så åpner Claude riktig fil herfra. Alt
annet med samme tema er arkiv.

| Tema | Gjeldende fil(er) |
|---|---|
| Overordnet plan / helhet | `FREMDRIFTSPLAN-v41.md` (+ denne STATUS.md) |
| Kursplanleggeren | `claude_BYGGELISTE-horing-kursplanlegger.md` + `claude_HORING-analyse-alle-seks.md` |
| Trivselsundersøkelsen | `DELPLAN-kap21-trivselsundersokelsen.md` + `TU-byggetrinn2-steg3-elevflate-LEVERT-18aug.md` + `TU-bakgrunnsvariabler-trinn-kjonn-18aug.md` |
| Trivselsboten | `DELPLAN-trivselsboten-fra-lansering.md` |
| Periodeplan / Fase 4 (verktøy) | `PERIODEPLAN-A2-bygget.md` + `FASE4-tlhjul-v2.md` |
| Fase 3 (innhold/bibliotek) | `FASE3-BYGGEPLAN.md` + `FASE3-STEG*`-filene |
| Webinar-modulen | `WEBINAR-plan.md` + `WEBINAR-BESLUTNINGER-15aug.md` |
| Rollemodell | `rollemodell-frontend-KJORT-17aug.md` + `BESLUTNING-rollemodell-17aug.md` |
| Grafisk identitet | `GRAFISK-IDENTITET-v2.md` |

---

## AKTIVT SPOR 1 — KURSPLANLEGGER, etter høringen (17. aug)

Svarmail SENDT til de seks ansatte (Marielle, Eivind, Kari, Tommy, Ylva, Julie;
Malin konsultert). Alt som er lovet ligger i:
- `claude_BYGGELISTE-horing-kursplanlegger.md` (A1–A6, B1–B15, H1–H3, C1–C3, D, HUSK)
- `claude_HORING-analyse-alle-seks.md` (stemmetall 1–13 + de seks funnene)

**Begge ligger nå i prosjektkunnskapen** (lagt inn 19. aug).

LØFTER Å HUSKE:
- **HubSpot-synk i TO STEG.** Steg 1 (nå): énveis nettside→HubSpot. Steg 2 (lovet,
  senere): TOVEIS — ansatte endrer i HubSpot, tilbakeføres til nettsiden. Krever
  konfliktregler, endringshistorikk, dublett-/løkkevern. Skal inn i fremdriftsplanen.
- Regel til teamet: kontaktendringer gjøres PÅ NETTSIDEN inntil toveis er klart.
- Kalenderkobling lovet etter lansering (behov jul 2026 / jan 2027).
- Lokalt kurs: kun varm «vi savnet dere»-mal, aldri full bruksanvisning.

NESTE TREKK (kursplanlegger):
1. Verifiser FØR bygging: (a) samme skole på to kurs, (b) hvilke kontaktfelt
   (rektor/hovedkontakt/TLA) som faktisk synker nettside→HubSpot.
2. Start byggelista: «Les STATUS.md + claude_BYGGELISTE-horing-kursplanlegger.md,
   vi fortsetter med kursplanleggeren» → første uhakede punkt (A1).
3. Toveis HubSpot-synk (steg 2) inn i neste fremdriftsplan.

Merk: mulig **runde to** fra Kari/Marielle etter helgen — forklaringstekster
låses ikke før den er inne.

---

## SISTE ØKT (18. aug, sen kveld) — TU bakgrunnsvariabler + spm 8 + steg 3 elevflate

- **✅ Steg 3 (elevflaten) bygget + COMMITTET + PUSHET (commit 7781161).**
  (NB: nyeste status — tidligere «ligger i repoet, ikke pushet» er utdatert.)
  Flyt: intro → kode (POST, ikke URL) → trinn → kjønn → 13 spørsmål → send →
  ferdig. WCAG 2.1 AA + i18n (no + sv) fra første komponent. Rute `/undersokelse`
  (uten meny/footer). Full dok: `TU-byggetrinn2-steg3-elevflate-LEVERT-18aug.md`.
- **✅ Bakgrunnsvariabler trinn + kjønn — BEGGE OBLIGATORISK.** Kjønn =
  jente/gutt/annet (som Elevundersøkelsen). To egne avkryssingsskjermer FØR spm 1;
  kan ikke gå videre uten valg (radiogroup, piltast, fokus, samme WCAG-nivå).
  Full dok: `TU-bakgrunnsvariabler-trinn-kjonn-18aug.md`.
- **✅ Spørsmål 8 kjønnsnøytralt:** «… slik at eleven må gå alene …» (no + sv).
- **✅ Migrasjon 046 KJØRT LIVE i Supabase.** `tu_svar` + trinn (CHECK 5–10) +
  kjønn (CHECK jente/gutt/annet), begge NOT NULL — bakgrunnsvariabler på SVARET,
  ALDRI koblet til kode/HMAC, i EGNE kolonner (ikke i svar-JSON, så aggregering
  ser kun spm 1–13). `tu_lever_svar` utvidet til 4 argumenter
  (`p_kode_hmac,p_svar,p_trinn,p_kjonn`): DROP gammel signatur + CREATE + GRANT
  (husregel 6), kun service_role, validerer trinn+kjønn før koden reserveres.
  Arkivfil `supabase/migrations/046_...sql` lagt i repoet.
- **✅ BEVIST:** migr 046 mot ekte Postgres 16 lokalt (obligatorisk håndhevet,
  bakgrunnsvar IKKE i svar-JSON, ingen kodekobling, atomisk) · full `npm run
  build` OK · i18n 111/111 no+sv · skjermbilder.
- **RAPPORT-KRAV (steg 5, IKKE bygget):** kjønnsdelte tall MÅ respektere
  k-terskelen (migr 045, 10/15 per kategori); vis aldri kjønnsdelt tall under
  terskel; homogene/små kjønnsceller skjermes (delplan 21.4/21.9.12).
- **JURIST-SPOR:** kjønn er bakgrunnsvariabel → **inn i DPIA** (delplan 21.7).

## ØKT 18. aug (dag) — konto-e-post-lenker (LØST + BEKREFTET)

- **✅ Glemt-passord/invitasjonslenker pekte til gamle trivselsleder.no — RETTET
  + ENDE-TIL-ENDE BEKREFTET.** Rotårsak tre steder: `_vakt.js`-fallback +
  `_epost-mal.js`-fotlenke (kode), `nettsted_url` (base), Supabase Auth Redirect
  URLs (manglet vercel-domenet). Kode-fiks commit `6fd29af` (pushet). Auth:
  `https://trivselsleder-ny.vercel.app/**` lagt i Redirect URLs.
  **Bevist 18. aug (sent):** faktisk glemt-passord-e-post → lenke peker til
  trivselsleder-ny.vercel.app. Saken lukket. **Go-live-huskelapp:** ved lansering
  `nettsted_url` → produksjon + fjern vercel-oppføring i Auth Redirect URLs.
- **✅ V2 bekreftet mot kode (v41-kontroll):** `_vakt.js`-fallbacken er trygg
  (`trygFallbackOrigin` + `SIKKER_FALLBACK`, hardkodet til vercel). Rotårsaken lå
  i `_epost-mal.js`-fotlenke + `nettsted_url` + Auth Redirect URLs — ikke i
  `_vakt.js`.

## FORRIGE ØKT (17. aug)

- **✅ `skoler`-SELECT strammet** («bruker ser egne skoler»). Live-bevist.
  `claude/kode/skoler-RLS-stramming-17aug.sql`.
- **✅ Rollemodell — DB + FRONTEND bygget + VERIFISERT LIVE.** `bruker_skole` +
  stilling/tl_rolle/tilgang + «én HTLA per skole». Frontend b585bfb + ff6d3a6.
  Bevist 200/409. `rollemodell-frontend-KJORT-17aug.md`.
- **✅ #3 lukket (skoleadmin-HTTP):** endepunkter låser skoleadmin til egen skole.
- **✅ ALT PUSHET (origin/main = `ff6d3a6` → senere `6fd29af`):** migr 041–043 +
  frontend-commitene.
- **✅ Voyage AI satt opp:** `voyage-4`, 1024 dim → `vector(1024)` for RAG.

## ØKT 16. aug (kveld)

- **TU BYGGETRINN 1 (SQL-kjernen) KJØRT + VERIFISERT LIVE.** 5 tabeller, 9
  funksjoner, RLS, 13 spm, 24/24 fasit-tester PASS. `TU-byggetrinn1-KJORT-16aug.md`.
- Skriveflyter live-testet (periodeplan + TL-hjul). `QA-skriveflyter-16aug.md`.

---

## STATUS v41 (18. aug, natt)

- **✅ FREMDRIFTSPLAN v41 bygget + uavhengig kontrollert (regel 4) + funn rettet.**
  Regel 2 holder (ingen substanstap fra v40); regel 3 stort sett riktig. Funn
  K1/V1/V2/M2 rettet. PDF + DOCX levert. **✅ Lagt inn i prosjektet som
  `FREMDRIFTSPLAN-v41.md` (19. aug).**
- **GENERALPRØVE (V3 — besluttet 18. aug):** FØR ansatte slippes til, kjør
  generalprøve i testmiljøet — inviter ansatte som skoleadmin/skoleansatt (ikke
  superadmin) på testskole; Kjartan lager liksom-brukere (egne e-poster/+alias) og
  kjører full kurs-livssyklus live. KUN trivselsleder-ny.vercel.app + testskoler,
  ALDRI HubSpot. `motor_aktiv` styrer ekte utsending (av mellom tester).

---

## Hvor vi er nå (kortversjon)

- **Piloten:** forutsetningene ferdig og bevist live (10.–12. aug).
- **Webinar-modulen:** bygget + testet ende-til-ende live (15. aug).
- **Fase 3 + Fase 4 + «Skolen min» + CSV-import:** pushet/deployet (15. aug).
- **Merkeprofil v2:** migrert (14.–15. aug) — åtte kulturkort/admin-filer gjenstår.
- **Konto-e-post-lenker:** rettet + bekreftet (18. aug).
- **Kursplanlegger:** ferdig til pilot; **høringen (17. aug) ferdig analysert →
  byggeliste A1–B15/H1–H3/C/D klar** (se AKTIVT SPOR 1). Bygging ikke startet.
- **To nye moduler forsert inn før lansering:**
  - **Trivselsundersøkelsen v1** — byggetrinn 1 + migr 045 (skjerming) + migr 046
    (bakgrunnsvariabler) LIVE. Steg 3 (elevflate) bygget + pushet 18. aug.
    Gjenstår: steg 4 (lærerflate/kodegenerator) + steg 5 (rapport, inkl. kjønnsdelt
    m/k-skjerming).
  - **Trivselsboten v1** — RAG (pgvector).

---

## FERDIG OG BEVIST LIVE (nyeste øverst)

- **TU bakgrunnsvariabler (migr 046) + steg 3 elevflate + spm 8** — 18. aug,
  pushet (commit 7781161). Se «SISTE ØKT» over.
- **Konto-e-post-lenker** — rettet + bekreftet (18. aug), commit `6fd29af`.
- **Rollemodell (DB + frontend)** — 17. aug, b585bfb + ff6d3a6.
- **TU byggetrinn 1 + migr 045 (skjerming)** — 16.–17. aug (24/24 + 28/28 PASS).
- **Webinar-modulen** — 15. aug (migr 039 + 040), ende-til-ende.
- **Kursplanlegger til pilot + sikkerhet** — 10.–12. aug (migr 017/020/021/022).
  GJENSTÅR: bevis ved gjenoppbygging.

---

## Kritiske arbeidsregler (uten unntak)

1. **Testing kun på** https://trivselsleder-ny.vercel.app — ALDRI live trivselsleder.no.
2. **HubSpot røres aldri live** under utvikling. Kun demoskole.
3. **SQL FØR kode.** DB-endringer i Supabase SQL-editor først, deretter push.
4. **Verifiseringssløyfe:** SQL → kode → commit/push → vent på Vercel «Ready» → test.
5. **Nye tabeller/funksjoner:** GRANT til `anon` + `authenticated` + `service_role`.
   Anonym tilgang kun via SECURITY DEFINER. Skrive-RPC-er: REVOKE fra public/anon;
   SECURITY DEFINER med `SET search_path=''`.
6. **Ny RPC-parameter** = slett gammel signatur i samme transaksjon + GRANT på nytt.
7. **curl-testing:** alltid `-H "Cache-Control: no-cache"`. Sky-sandboksen når IKKE
   supabase.co — bruk nettleser-`fetch` mot REST.
8. **E-post:** reserver plassen i samme atomiske operasjon som utsending.
   Konto-e-post-lenker: les `nettsted_url` via `trygFallbackOrigin`, aldri hardkod
   domenet. Auth Redirect URLs MÅ inneholde domenet, ellers overstyrer Auth med
   Site URL.
9. **`motor_aktiv` = `nei`** mellom tester (og `bot_aktiv`). Fail-closed.
10. **Den som bygger kontrollerer ikke alene.** Uavhengig kontroll på alt vesentlig.
    Bevis, ikke påstand.
11. **Full build-sjekk før «ferdig».** Kjør full `npm run build`. NB: Mac-node_modules
    bygger ikke i desktop-VM-en (darwin-vs-linux native binary) — bygg i sky med
    ferskt `npm install`, eller la Vercel bygge ved push.
12. **Supabase SQL-editor via nettleserbro er treg/upålitelig.** Injiser i monaco,
    klikk «Run», VENT, verifiser via nettleser-`fetch` mot REST. Hele skriptet = én
    transaksjon.
13. **Sky-sandboksen er efemer.** Kode leveres til Mac-arbeidstreet; varig kontekst
    til prosjektet. Git-push gjør Kjartan fra egen terminal. Filplassering via
    device-broen (`~/trivselsleder-ny`).
14. **Grundighet — ingenting glemmes.** For omfattende endringer: to uavhengige
    kontrollører. Gjenstår-lista i v41 er fasit.
15. **Test skoleadmin-RLS via DB-simulering:** `set local role authenticated` +
    `request.jwt.claims`. SECURITY DEFINER med `search_path=''` MÅ skjemakvalifisere
    ALT. Endepunkt-dry-run: superadmin-token fra localStorage, `fetch` mot `/api/...`.

## FAST FLYT (arbeidsform)

- **Kode/migrasjoner:** Claude Code → stopp → Kjartan kjører SQL i Supabase → git
  add/commit/push fra terminal → test på vercel-domenet.
- **Notater/planer:** Claude leverer cat-blokk → Kjartan limer i terminal →
  `claude_NAVN.md` i `~/trivselsleder-ny/`. **MEN dette lagrer kun på Mac-en —
  fila må EKSPLISITT også legges i prosjektkunnskapen** (last opp, eller be Claude
  hente den i en prosjekt-chat). Ingen auto-synk finnes.
- **STATUS.md og `claude_`-filer holdes utenfor git.**
- **Kun ÉN Cowork/Code-økt mot repoet om gangen** (git-låsefeil ellers).

## Grafisk identitet (v2.0)

Primær oransje **#FF7B31** · petrol **#106C75** · lys teal **#54A1AB** · rød
**#CF442F** · grå **#EBEBED**. Marvin/Avenir. Magenta #D6006E UTGÅTT. **WCAG:
oransje #FF7B31 = 2,6:1 mot hvitt — som TEKST brukes `--color-orange-ink`
(#B5560F, 4,9:1). Elevflaten følger dette.**

## Migrasjoner

- **001–046 kjørt i basen.** 046 = TU bakgrunnsvariabler (trinn+kjønn på `tu_svar`
  + `tu_lever_svar` 4-arg), KJØRT LIVE 18. aug. 041 = TU byggetrinn 1; 042 =
  skoler-RLS; 043 = rollemodell; 044 = offentlige_skoler; 045 = TU-skjerming; 046
  = TU-bakgrunnsvariabler.
- **Repo/origin-synk:** 041–043 pushet (origin/main = `6fd29af`). **045 + 046
  arkivfiler — repo-synk (legg `045_*.sql` + `046_*.sql` i `supabase/migrations`
  + push) GJENSTÅR å bekrefte** (idempotente arkiv; basen alt endret). NB:
  `supabase db push` skal IKKE kjøres for 041–046 — allerede kjørt.
- **Neste TU-migrasjon:** ingen planlagt før steg 4/5.
- **Trivselsboten:** `innhold_biter` (pgvector, `vector(1024)`, Voyage `voyage-4`)
  får **NESTE LEDIGE nummer** ved bygging — **IKKE 044** (044 = offentlige_skoler).
  *(Rettet tidligere STATUS-forveksling.)*
- GJENSTÅR: bevise oppskriften ved gjenoppbygging fra `019`.

## Repo-hygiene (lav prioritet)

- `supabase/.temp/` fjernet fra sporing (commit 7044a82).
- Testartefakter på Demoskolen: RYDDET 18. aug (0 gjenstående).
- `_to_delete/` i repoet: kan slettes trygt av Kjartan.

---

## AKTIVT SPOR 2 — PERIODEPLAN til ansatthøring (som kursplanleggeren)

Når periodeplanen sendes på ansatthøring, ta med:
- Rutenett + lekbibliotek får ikke plass samtidig på skjermen; alle fem dager
  vises først når biblioteket skjules. Arbeidsflyten fungerer (plukk leker → skjul
  bibliotek → fordel ansvar/dager i full bredde), men er den intuitiv for ansatte
  som ikke kjenner verktøyet? Vurder: skal biblioteket være skjult som standard når
  planen alt har leker, og/eller gjøre «Skjul»-knappen tydeligere?
- La en ansatt (f.eks. Ylva) lage en plan uten hint og se om hun finner rytmen selv.

## AKTIVT SPOR 3 — TU STEG 5: resultatrapport for skolene (bygges etter steg 4)

Besluttet utseende (Kjartan 18. aug):
- **FORMAT:** PDF (ikke PowerPoint) — låst, lik hos alle, egner seg til
  foreldremøte/kommune. Gjenbruk PDF-mønsteret fra periodeplanen.
- **FORSIDE:** logo, skolenavn, trinn, DATO for runden.
- **HOVEDBILDE:** ett tema per rad, enkle vannrette prosentsøyler, ett tall, klart
  språk. Ingen desimaler. Mobbesøylen er RØD. Lav % = bra der.
- **KJØNNSDELT SIDE:** jente/gutt/annet per tema. MÅ respektere k-terskel — vis
  ALDRI tall for gruppe under terskel; skriv f.eks. «Skjult for å beskytte elevenes
  anonymitet». Hjørnestein, ikke detalj.
- **UTVIKLING OVER TID:** enkel linje fra runde 2+ (retention-verdi). Tom første gang.
- **INGEN TOLKNING** — kun fakta. Systemet viser tall, mennesket tolker.
- **METODEFOTNOTE** trykt på rapporten: temperaturmål, ikke forskning; frivillig
  deltakelse gir skjevhet; små grupper skjules; supplement til Udir.
- Dette er v1.0. Åpne valg (tas ved bygging): eksakt ordlyd på terskelmeldingen;
  hvor sterk rødfargen på mobbetallet skal være.

---

## Åpne punkter (v41 kap. 6)

- Nr. 1 femte tall (kulturkortpartnere) — telles i Supabase.
- Nr. 2 media-sprik — venter Jon-svar. **Blokkerer importen.**
- Nr. 3/4/9 — LUKKET. Nr. 6 DPA (rest + Anthropic + embeddings + **kjønn i DPIA**).
  Nr. 10 TU jurist-leveranser. Nr. 13 England-navn — åpen.
- **TU HMAC-nøkkel (`TU_KODE_HMAC_KEY`):** settes i Vercel (server-side) før
  ende-til-ende-test; steg 4-kodegeneratoren MÅ bruke samme nøkkel/algoritme.
- **Kursplanlegger:** verifiser samme skole på to kurs + hvilke kontaktfelt som
  synker nettside→HubSpot, FØR bygging (se AKTIVT SPOR 1).
- **DPA embeddings (Voyage AI):** motpart = MongoDB Inc. Be om DPA + behandlingssted.

## Lanserings-sjekkliste — se v41 «GJENSTÅR TIL LANSERING» (fasit)

- [ ] Fersk fulleksport fra Jon + innholdsfrys → full import (kritisk sti).
- [ ] Metadata-i-fritekst + taksonomi-vask; koble filtre + video-filter til ekte felt.
- [ ] Formell QA/testrunde Fase 4; TL-hjul-deling; PDF-generator; «Bestillinger»-fane.
- [ ] **Kursplanlegger byggeliste (høring 17. aug):** A1–A6 + B1–B15 + H1–H3 + C1–C3.
- [ ] **Trivselsundersøkelsen v1:** steg 4 (lærerflate/kodegenerator) + steg 5
      (rapport, inkl. kjønnsdelt m/k-skjerming). + **Trivselsboten v1** (RAG).
- [x] **Rollemodell: DB + frontend — GJORT + verifisert 17. aug.** Import-mapping gjenstår.
- [x] **Konto-e-post-lenker → riktig domene — GJORT + verifisert 18. aug.**
- [ ] Forside/design/Evidence + strategibanken v1 + aktive brukere-eksport.
- [ ] Samlet RLS-/GDPR-gjennomgang; DPA-rest + kunde-DPA + **DPIA (inkl. TU-kjønn)**;
      WCAG; Feide/DNS.
- [ ] E-post/domener; verdiflipp (`motor_aktiv`→ja); 8 magenta-filer; oppdater
      `CLAUDE.md`; Resend-domene; overlevering. **Legg Voyage API-nøkkel +
      `TU_KODE_HMAC_KEY` som hemmelige miljøvariabler.** Go-live: `nettsted_url` →
      produksjonsdomene; fjern vercel-oppføring i Auth Redirect URLs.
- [x] **`FREMDRIFTSPLAN-v41.md` lagt inn i prosjektkunnskapen (19. aug).**
- [ ] **Generalprøve (V3) i testmiljøet før ansatte slippes til.**

## Referansedokumenter i prosjektet

`FREMDRIFTSPLAN-v41` (GJELDENDE — legges i prosjektet) ·
`claude_BYGGELISTE-horing-kursplanlegger.md` · `claude_HORING-analyse-alle-seks.md`
· `DELPLAN-kap21-trivselsundersokelsen.md` · `DELPLAN-trivselsboten-fra-lansering.md`
· `TU-byggetrinn2-steg3-elevflate-LEVERT-18aug.md` ·
`TU-bakgrunnsvariabler-trinn-kjonn-18aug.md` · `TU-byggetrinn2-045-KJORT-17aug.md` ·
`TU-byggetrinn1-KJORT-16aug.md` · `BESLUTNING-rollemodell-17aug.md` ·
`rollemodell-frontend-KJORT-17aug.md` · `GRAFISK-IDENTITET-v2.md` ·
`WEBINAR-BESLUTNINGER-15aug.md` · `PERIODEPLAN-A2-bygget.md` · `FASE4-tlhjul-v2.md`
· `sporsmaal-til-jon.md`.
