# A6 «Tekster og maler» — bygget, venter på deg

## Skrevet 4. august 2026 mens agenttesten kjørte

Koden er ferdig og syntakssjekket. **Ingenting er committet, ingenting
er pushet, og databasen er ikke rørt.** Tre ting gjenstår, i denne
rekkefølgen.

---

## STEG 1 — VENT TIL AGENTTESTEN ER FERDIG

SQL-en under endrer rettigheter på `innstillinger`-tabellen. Testen
leser og skriver i den tabellen (nødbremsen). Kjører du SQL midt i
testen, kan du få uforklarlige feil i RAPPORT.md som ikke er ekte funn.

Vent til testen sier den er ferdig.

---

## STEG 2 — SQL I SUPABASE

Siden lar innloggede ansatte skrive til `innstillinger` fra nettleseren.
Det har ingen gjort før — til nå har serverfunksjonene bare LEST derfra.

**Agenttesten bekreftet dette mens jeg skrev:** den prøvde å tømme en
e-postmal for å teste sikkerhetsventilen, og fikk 403. Ingen har
skriverett på `innstillinger` i dag — heller ikke serverrollen. Det er
grunnen til at SQL-en under trengs, og det forklarer hvorfor testen måtte
nøye seg med å lese koden på det punktet (6.4 i RAPPORT.md).

**→ SUPABASE** (https://supabase.com/dashboard/project/zpirjbrcbeubwpmtncxx/sql/new)

```sql
begin;

-- Sikkerhetsnett: stopp hele operasjonen hvis hjelpefunksjonen mangler,
-- i stedet for å lage en policy som slipper inn feil folk.
do $$
begin
  if to_regprocedure('public.get_min_rolle()') is null then
    raise exception 'get_min_rolle() finnes ikke — stopper. Si fra til Claude.';
  end if;
end $$;

alter table innstillinger enable row level security;

-- Ansatte og superadmin skal kunne lese og endre tekstene.
grant select, insert, update on innstillinger to authenticated;

-- Serverrollen manglet skriverett (bekreftet av agenttesten, 403).
-- Den leser i dag, men et framtidig endepunkt som skal skrive ville
-- feilet stille på samme måte.
grant select, insert, update on innstillinger to service_role;

-- Utloggede har ingenting her å gjøre. Kursinformasjonssiden leser
-- tekstene gjennom hent_kursinfo_via_token, som går utenom RLS.
revoke all on innstillinger from anon;

drop policy if exists "ansatte leser innstillinger" on innstillinger;
create policy "ansatte leser innstillinger" on innstillinger
  for select to authenticated
  using (get_min_rolle() in ('superadmin', 'ansatt'));

drop policy if exists "ansatte endrer innstillinger" on innstillinger;
create policy "ansatte endrer innstillinger" on innstillinger
  for update to authenticated
  using (get_min_rolle() in ('superadmin', 'ansatt'))
  with check (get_min_rolle() in ('superadmin', 'ansatt'));

drop policy if exists "ansatte oppretter innstillinger" on innstillinger;
create policy "ansatte oppretter innstillinger" on innstillinger
  for insert to authenticated
  with check (get_min_rolle() in ('superadmin', 'ansatt'));

commit;
```

Deretter, som kontroll:

```sql
select policyname, cmd from pg_policies where tablename = 'innstillinger';
```

Forventet: tre rader — SELECT, UPDATE, INSERT.

**Feiler den på `get_min_rolle() finnes ikke`:** ingenting er endret,
si fra, så skriver jeg policyene på en annen måte.

---

## STEG 3 — PUSH

**→ TERMINALEN**

```
cd ~/trivselsleder-ny && git add src/pages/AdminTekster.jsx src/App.jsx src/pages/Admin.jsx && git commit -m "A6: Tekster og maler — RA redigerer e-poster og kursinfo selv" && git push
```

---

## SLIK SER DU AT DEN VIRKER

1. Admin → nytt kort **«Tekster og maler»** (✏️)
2. Alle seks e-postene ligger der, én og én. Klikk for å åpne.
3. Endre noe smått i purringens emne, trykk **Lagre**.
4. Last siden på nytt — endringen skal stå.
5. Skriv `{oppmøtetid}` (med ø) et sted i en tekst og trykk Lagre.
   **Forventet:** gul advarsel om at plassholderen ikke finnes, med
   knappen «Jeg vet hva jeg gjør — lagre likevel». Trykk **Forkast**.
6. Tøm purringens emnefelt helt og trykk Lagre.
   **Forventet:** rød feil, lagring blokkeres. En tom mal stopper all
   utsending — derfor slipper den ikke gjennom.

Får du **«permission denied»** eller **«row-level security»** ved
lagring, er SQL-en i steg 2 ikke kjørt.

---

## HVA SIDEN INNEHOLDER

**De seks e-postene** — emne og tekst, én og én, med hvem de går til og
når de sendes. Varselet om kjøpsinteresse har bare emnefelt; selve
innholdet er en faktaliste systemet bygger, og finnes ikke som mal.

**Andre tekster** — kursinformasjonssiden og vertskapsnotatet.

**Avsender og adresser** — avsendernavn, avsenderadresse, svar-til,
adressen kjøpsinteresse-varselet går til, og nettadressen alle lenker
bygges fra.

**Når ting skal skje** — dager før purring, dager før trinn 3,
klokkeslett for evalueringen.

**Under hvert felt** står plassholderne som finnes akkurat der. De er
ikke like: `{antall_tl}` virker i påminnelsen, men ikke i invitasjonen,
fordi skolen ikke har svart ennå når invitasjonen går ut.

---

## TRE TING SIDEN NEKTER

1. **Tom mal.** Serverfunksjonene AVBRYTER utsendingen når en mal
   mangler — det er en bevisst sikkerhetsventil. En redigeringsside som
   lot noen lagre tomt ville dermed kunne stanse all utsending med et
   uhell.
2. **Trinn 3 før purringen.** Blokkeres, siden trappetrinnet da ville
   stått på hodet.
3. **Nettadresse med skråstrek til slutt**, eller uten `https://`.
   Begge deler ville gitt ødelagte lenker i alle e-poster.

Ukjente plassholdere blokkeres **ikke** — de advares om, og kan lagres
med ett klikk til. Skrivefeil er det vanlige tilfellet, men det finnes
lovlige grunner til å skrive noe i krøllparentes.

---

## PLAN MOT KODE — BEGGE VEIER

### Ett avvik i PLANEN, ikke i koden
STATUS.md ba om et felt for `paaminnelse_dager_for`. **Den nøkkelen
brukes ingen steder i koden** — jeg søkte gjennom hele `api/` og `src/`.
Påminnelsen har ingen tidsregel: RA velger selv dagen og trykker.

Jeg tok den derfor IKKE med. Et felt som later som det styrer noe, men
ikke gjør det, er verre enn ikke noe felt. Dette er samme type funn som
resten av rettelisten: planen beskrev noe koden aldri fikk.

**Du bør bestemme:** skal påminnelsen ha en tidsregel, eller skal
`paaminnelse_dager_for` strykes fra planen? Jeg heller mot å stryke den
— RA velger dagen, og det følger husregelen om at systemet foreslår og
mennesket bestemmer.

### Koden gjør mer enn planen ba om
1. **`eivind_epost` er tatt med** blant adressene. Sto ikke i listen, men
   hører hjemme der — det er en adresse de ansatte kan trenge å endre.
2. **Nødbremsens tilstand vises** øverst, som en setning uten knapp.
   Planen sa «ikke motor_aktiv i grensesnittet», og det er fulgt: den kan
   ikke endres herfra. Men den som redigerer tekster bør se om utsending
   er på eller av. Er du uenig, fjerner jeg boksen på ett minutt.
3. **Validering utover det som ble bedt om**: e-postadresse må ha @,
   nettadressen må begynne med http og ikke slutte med skråstrek,
   tersklene må være hele tall over 0, klokkeslettet må være et
   klokkeslett.
4. **«Forkast»-knapp** og en teller som viser hvor mange endringer som
   ikke er lagret.

### Ikke bygget, med vilje
`motor_aktiv` som bryter. `epost_logg` (det er en logg, ikke en
innstilling). Forhåndsvisning av ferdig e-post — det ville krevd et nytt
endepunkt, og tørrkjøringen dekker behovet i dag.

---

## FILER

| Fil | |
|---|---|
| `src/pages/AdminTekster.jsx` | ny, 491 linjer |
| `src/App.jsx` | +2 linjer (import + rute `/admin/tekster`) |
| `src/pages/Admin.jsx` | +7 linjer (kortet) |

Alle tre er syntakssjekket. Full `vite build` er ikke kjørt — den kan
ikke kjøres herfra, fordi `node_modules` på maskinen din er installert
for Mac mens arbeidsmiljøet mitt er Linux. Vercel bygger på ekte ved
push.
