# HVA FORSVANT — konsept v1 → v2 → v3

## Kontrollert 5. august 2026 mot originaldokumentene

Dette er vedlegget fremdriftsplanen aldri fikk: en ordrett gjennomgang av
hva som sto i konseptdokumentet 15. juni, og hva som var borte fire dager
senere.

Fram til nå har vi *sluttet oss til* denne historien fra hullene i koden.
Nå er den etterprøvd mot de tre dokumentene.

**Kilder** (i `Skrivebord/Min nettside/Gml/`):

| Dokument | Dato | Omfang |
|---|---|---|
| `Kursplanlegger 15.06.26flatten.pdf` | 15. juni | 10 sider, 26 775 tegn |
| `kursplanlegger_v2_flatten.pdf` | 18. juni | 3 sider, 7 138 tegn |
| `kursplanlegger_v3_flatten.pdf` | 19. juni | 3 sider, 6 253 tegn |

**73 % av teksten forsvant på tre dager.** Ingen steder står det hva som
ble fjernet.

> **Rettet 5. august 2026, etter kontroll.** Denne filen ble skrevet
> samme dag som `FREMDRIFTSPLAN-v32.md`, og ble kontrollert etterpå av en
> annen agent mot de samme kildene. Åtte påstander var feil: én om
> kortutdeling (§5), én om oppfølgingsflagg, én om `maks_antall`, én om
> mottaker-feltet, tre sidehenvisninger og ett ordantall. Alle er rettet
> i teksten under, og hver retting er merket. Kildene er de samme PDF-ene
> — ingen påstand her hviler lenger på en tidligere fremdriftsplan.

---

## DET ALVORLIGSTE: to krav forsvant HELT

### 1. Kursinformasjonssiden — nedbygget 18. juni, borte 19. juni

**v1, 15. juni, side 3–4** — egen seksjon på nesten en halv side:

> «Når skolen har trykket send, er det ikke slutten — det er overgangen
> til «nå skal dere forberede dere». I stedet for at all kursinfo ligger i
> en e-post som forsvinner i innboksen, sendes skolen rett til en
> kursinformasjonsside på hjemmesiden.»

Med **to lag** spesifisert (kursspesifikk topp + fast evergreen-mal) og
**fire lenker** listet opp (ressursbiblioteket, dokumentarkivet,
kulturkort-modulen, utstyrspakker).

**v2, 18. juni** — hele seksjonen redusert til én bisetning:

> «Etter send går skolen rett til en kursinformasjonsside som bor ett sted
> og alltid er oppdatert.»

De to lagene: borte. De fire lenkene: borte.

**v3, 19. juni** — setningen finnes ikke. Kursinformasjonssiden er ikke
nevnt med ett ord.

Fra da av eksisterte den ikke i noe plandokument. Ingen fremdriftsplan fra
v16 til v31 nevner den. Den ble bygget 4. august 2026 — **50 dager etter
at den forsvant**.

### 2. RA registrerer svar på vegne av skolen — borte 18. juni

**v1, side 4**, siste setning i avsnittet om purring:

> «De som svarer per e-post i stedet, registrerer RA med ett klikk, så de
> også faller ut av purrekøen.»

**v2:** setningen finnes ikke. **v3:** finnes ikke.

I august ba Marielle og Ylva om dette, hver for seg og uoppfordret. De ba
altså om noe som sto i den opprinnelige spesifikasjonen, og som ingen
hadde fortalt dem var strøket. Bygget 4. august — **47 dager etter**.

---

## DET SOM BLE KORTET NED TIL DET UGJENKJENNELIGE

### 3. Purring — hvem og når (v1 side 5)

v1 spesifiserer to valg RA skal ha:

> «Hvem: alle egne ubesvarte, ett bestemt kurs, eller ett område.
> Superadmin kan kjøre alle regioner samtidig i en felles purrerunde.
> Når: manuell «purr nå»-knapp når RA vil, eller en automatisk regel
> (f.eks. hver tirsdag morgen til ubesvarte — Ena påpekte at
> mandagsutsendelse + tirsdagsoppfølging gir best respons).»

v2 og v3: begge valgene borte. Igjen står bare prinsippet om at purring
treffer ubesvarte.

I dag hukes skoler av enkeltvis. Det fungerer på tre testkurs. Det
skalerer dårlig mot ~150 kurs i året.

Merk også at **Enas observasjon om ukedag** — et konkret råd fra en som
kjenner responsmønsteret — forsvant sammen med mekanikken.

### 4. Kopier kursplan til ny sesong (v1 side 5–6)

v1 bruker en hel side. Tre nummererte punkter: strukturen følger med
(ruter, nettverk, haller, vertskap, datoer forskjøvet), endringer flagges
fra skoleregisteret (oppsagte skoler markeres, nye foreslås geografisk),
full frihet til å endre alt.

Pluss begrunnelsen:

> «Sammen med churn-innsikten: når du kopierer, ser du eksakt hvem som
> falt fra siden sist (og hvorfor, fra nei-årsakene) og hvem som er
> kommet til.»

**v2:** én bisetning — «Kopier kursplan: til neste sesong. Strukturen
følger med; skoleregisteret differ inn/ut skoler.»
**v3:** fem ord — «Kopier kursplan til neste sesong.»

Det som finnes i koden i dag heter `kopier_kurs` og dupliserer ÉN kursrad,
samme dato, samme sesong, uten skoler. Verdien v1 beskrev — skolekoblingene
og churn-diffen — finnes ikke.

### 5. Kortutdeling (v1 side 7–8)

v1 bruker halvannen side: beregningen, Camillas to faner, de fire
statusene, kursholderens bruk på kursdagen, hva som skjer med skoler som
ikke melder antall, og det åpne spørsmålet om når tallet skal fryses.

**v2:** to linjer. **v3:** flyttet ned i «Avgrensning og videre».

**Rettet 5. august:** her tok denne filen selv feil i første utgave. Det
står kode. `src/pages/AdminKortutdeling.jsx` er 150 linjer og ble bygget
18. juni i tre commits (`e45a129` «Kortutdeling-prototype», `4b8fd71`,
`5cf24a7`). Siden merker seg selv:

> «Prototype til gjennomgang med Camilla — ikke ferdig løsning.»

Prototypen har beregningen (`Math.ceil(antallTl * 1.1)`), en tabell over
skoler som kommer, fakturasum og tre statusvalg. Av v1s spesifikasjon
mangler: Camillas **to faner** (kulturkortbestillinger + fra
kurspåmelding), den fjerde statusen («ikke ønsket» — prototypen har
Ikke behandlet / Fakturer / Gratis), **kursholderens visning på
kursdagen** som er selve tidsbesparelsen, håndteringen av skoler uten
antall, og det åpne spørsmålet om når tallet fryses.

Fem dager etter v3, i fremdriftsplan v23 (23. juni), står modulen som
**Ferdig** i modultabellen. Den påstanden ble kopiert videre gjennom v24,
v26, v27, v29 og v31 — mens det som faktisk fantes var en prototype som
med egne ord ikke var en ferdig løsning.

Slik ser statusdrift ut når man kan følge den dokument for dokument: et
krav flyttes til «avgrensning», og få dager senere er avgrensningen blitt
til «ferdig» — med en prototype som eneste dekning.

### 6. Flytteforespørsel (v1 side 4)

v1 har tre nummererte steg. Det viktigste — **hvordan skolen ser
alternativene** — forsvant:

> «Systemet viser andre kurs i geografisk nærhet samme periode (samme
> region/nettverk, samme eller nærliggende uke — finnes allerede i
> dataene).»

v2 og v3 beholder at det er «en forespørsel RA godkjenner», men ikke at
skolen skal få se og velge. Uten det er `onsket_kurs_id` en kolonne som
aldri kan fylles — og den er tom i dag.

v1 dokumenterer også hvorfor kravet fantes:

> «en skole skrev «jeg er opptatt på kurs i Oslo den dagen, men fikk høre
> at vi kunne delta i Lyehallen i stedet».»

Det ekte tilfellet forsvant med mekanikken.

---

## DET SOM FORSVANT UTEN AT NOEN HAR SAVNET DET

Disse sto i v1, forsvant i v2 eller v3, og er ikke nevnt i noen
fremdriftsplan siden. Ingen av dem er bygget.

**Eksport fra kursplanleggeren.** v1 side 5:
> «Eksport: CSV/Excel for dem som fortsatt vil ha et regneark, men det er
> ikke lenger kilden — bare en utskrift.»
Skoleliste og evaluering har CSV. Kursoversikt og svar har ingen.

**Hallregisterets to felt.** v1 §9, side 7, lister sju felt: hallnavn,
kommune, **adresse**, kontaktperson, e-post, telefon, **pris**. v2 §6
lister åtte: navn, kommune, fylke, nettverk, kontaktperson, e-post,
telefon, merknad. Fem av dem er de samme som i v1 (navn, kommune,
kontaktperson, e-post, telefon). Tre er nye (fylke, nettverk, merknad) —
og to er borte: **adresse** og **pris**.

Prisen er den som svir. v1 skrev eksplisitt at RA skulle fylle inn «e-post,
telefon og pris, ikke bare en generisk adresse» — «dette er selve verdien i
registeret».

**Rettet 5. august, andre kontrollrunde:** her må man skille skarpt mellom
dokumentet og koden. I DOKUMENTENE forsvant adresse og pris, akkurat som
beskrevet over. I KODEN finnes de: `AdminHaller.jsx:311` og `:313` har begge
feltene i redigeringsskjemaet. Noen bygget dem likevel.

Det som mangler er data (kildefila `Hallregister_utkast_2.xlsx` har ingen av
delene, så de 161 radene er tomme) og visning (halltabellen viser bare navn,
kommune og nettverk). Dette er altså et sjeldent tilfelle av det motsatte av
resten av filen: kravet overlevde i koden selv om det døde i dokumentet.

Det som gjør dette spesielt: v2 presenterer hallregisteret som **Ferdig**.
Bortfallet er dermed pakket inn i en fullført-melding. Ingen ville lett
etter noe som sto som ferdig.

**Ledelsens dashboard.** v1 side 7:
> «Når alle kurs bor i samme base, får ledelsen ett dashboard: svarprosent
> på tvers (i dag 54–67 % per RA), alle churn-signaler samlet på ett sted,
> status per region.»
Ledelse-siden finnes med churn-kort. Svarprosent på tvers og status per
region: ikke bygget.

**Oppfølgingsflagg på fritekst.** v1 side 6 og v2 §7:
> «flere skoler stiller spørsmål i svaret («Lurer på om vi er vertskap?»).
> Svar med fritekst merkes «trenger oppfølging» så de ikke drukner»
Forsvant mellom v2 og v3. **Rettet 5. august:** det *finnes* automatisk
merking. `SvarOversikt.jsx:101` — `harMelding()` — flagger selv hver rad
som har kommentar, årsak eller «åpen for annet kurs», og viser «Ikke
håndtert» / «✓ Håndtert» med knapp. Det som mangler er å få dem opp:
ingen filtrering på uhåndterte, ingen opptelling, ingen visning på tvers
av kurs. RA må fortsatt bla gjennom listen for å finne dem — så
«drukner»-problemet v1 beskrev er redusert, ikke løst.

**Import av H26-data.** v1 side 9, punkt 2 i «Neste steg»:
> «Importere H26-data: én engangsjobb fra «Liste til Questback» → kurs +
> kurs_skole, så vi slipper å taste på nytt.»
Forsvant i v2. Den store dataimporten står fortsatt igjen, og er nå en
forutsetning for RLS-gjennomgangen.

**Mottaker overstyrbar per skole.** Står i v1 (§2, §3 og §4) og i v2
(§2 og §3) — men er borte i v3, og aldri bygget. Mottaker hentes alltid
fra skolekortet.

**De seks skjemaspørsmålene ordrett.** v1 §14 gjengir dem fra QuestBack,
med den betingede logikken forklart. Forsvant i v2. (Skjemaet ble bygget
riktig likevel.)

---

## DET SOM OVERLEVDE I ALLE TRE DOKUMENTENE — OG FORSVANT I KODEN

Denne kategorien manglet i første utgave av filen, og den er viktig: her
er dokumentene uskyldige. Kravet står svart på hvitt i v1, v2 og v3. Det
er byggingen som aldri kom.

**maks_antall sin hensikt — kapasitet ved flytteforespørsel.**

- v1, side 4: «RA ser hvor fullt kurset er (mot `maks_antall`)»
- v2 §4: «ser kapasitet mot `maks_antall`»
- v3 §5: «flytteforespørsler med kapasitet synlig» — merk at v3 er den
  eneste som ikke navngir feltet i selve setningen. `maks_antall` står
  der bare i kolonnelista i §3. Hensikten er beholdt, koblingen til
  feltnavnet er det ikke.

Alle tre dokumentene ber om det samme. I koden er `maks_antall` et
tallfelt RA kan fylle ut i kursskjemaet (`AdminKursplanlegger.jsx:711`) —
og der stopper det. Ingen skjerm sammenligner det mot antall påmeldte.
`onsket_kurs_id` finnes ikke i én eneste linje under `src/` eller `api/`.
Hele flytteforespørselen — skolens valg, RAs kapasitetsvisning,
godkjenningen — er uskrevet.

Det gjør dette til et annet slags tap enn resten av filen. De andre
punktene forsvant fordi et dokument ble kortet ned. Dette forsvant selv om
dokumentet holdt stand. Ingen kortning å skylde på — bare et krav ingen
plukket opp.

---

## HVA SOM KOM TIL, OG BØR HUSKES

Ikke alt gikk feil vei. Dette sto ikke i v1:

- **Kursholderregister** (v3, 19. juni) — 17 eksterne importert. Bygget.
- **Churn-varsel med signalord-ordliste** (v3) — Ledelse-side, Trinn 1.
  Bygget. v1 hadde ideen, v3 ga den mekanikk.
- **Sikkerhetspunktet** (v3 §10, 19. juni):
  > «Sikkerhet: aldri skole-import mot live HubSpot før alt er testet på
  > ny side; Supabase Pro for backup; RLS-gjennomgang anbefales.»
  RLS-gjennomgangen ble anbefalt 19. juni. Den er fortsatt ikke gjort.
  Den er nå 47 dager gammel som åpent punkt — og agenttest 3 viste
  4. august hvorfor den haster.

---

## MØNSTERET, SLIK DET FAKTISK SER UT

Rettelisten beskrev tre mekanismer. Alle tre er bekreftet, men den
midterste er verre enn antatt:

**1. Komprimering (15.–18. juni).** 26 775 tegn ble 7 138. Ingen liste
over hva som gikk ut. Det som overlevde var *prinsippene*; det som
forsvant var *mekanikken*. Et prinsipp uten mekanikk kan ikke bygges, men
det ser komplett ut i et dokument.

**2. Statusdrift (18.–23. juni).** Verre enn vi trodde. v2 erklærte
**alle fem byggesteg ferdige tre dager etter** at kravdokumentet ble
skrevet. Da var flere av kravene i steg 4 og 5 nettopp fjernet fra
dokumentet. «Ferdig» målte dermed mot en liste som hadde krympet — ikke
mot kravene. Kortutdelingen er det tydeligste eksempelet, og
rekkefølgen er verdt å lese sakte: prototypen ble bygget **18. juni** og
merket seg selv «ikke ferdig løsning». **19. juni** flyttet v3 modulen ned
i «Avgrensning og videre». **23. juni** står den som «Ferdig» i v23. Den
gikk altså fra *avgrenset bort* til *ferdig* på fire dager, med en
selverklært uferdig prototype som eneste dekning — og ingen skrev en linje
mer kode på den etterpå.

**3. Frysning (23. juni–5. juli).** Kapittelet var «ferdig», så ingen
leste det igjen.

**En fjerde mekanisme vi ikke hadde sett:** *bortfall pakket i
fullført-melding*. Hallregisteret mistet adresse og pris i samme setning
som erklærte det ferdig. Ingen leter etter mangler i noe som står som
levert.

---

## HVA DETTE BØR ENDRE

1. **Ingen statuslinje uten kilde.** «Ferdig» må peke på hva som er
   ferdig — hvilket krav, fra hvilket dokument. v32 gjør dette.
2. **Ingen nedkorting uten fjernet-liste.** Kortes et dokument, følger en
   liste over hva som gikk ut og hvorfor. Denne filen er den listen for
   juni.
3. **Et ferdig-stempel skjuler mangler.** Når noe erklæres ferdig, sjekk
   feltlisten mot originalen. Hallregisteret er beviset.
4. **Krav som forsvinner, kommer tilbake som brukerønsker.** Marielle og
   Ylva ba i august om noe som sto i spesifikasjonen i juni. Når en bruker
   ber om noe, sjekk om vi allerede har lovet det.
5. **Et dokument om feil kan selv ta feil.** Første utgave av denne filen
   påsto at kortutdelingen aldri fikk én linje kode. Den fikk 150, og
   filen som skrev det hadde selv listet filen tre timer tidligere.
   Påstanden var arvet fra `RETTELISTE.md` uten kontroll — nøyaktig samme
   mekanisme som filen ble skrevet for å avskaffe. Regelen som fanget den:
   **den som bygger, kontrollerer ikke alene.**
6. **Skill mellom to slags tap.** Noe forsvant fordi dokumentet ble
   kortet ned. Noe annet sto i alle tre dokumentene og ble aldri bygget
   (`maks_antall` / flytteforespørsel). De krever ulik medisin: det første
   trenger en fjernet-liste, det andre trenger at noen faktisk leser
   kravdokumentet før modulen erklæres ferdig.
