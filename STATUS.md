# STATUS — Kursplanlegger trivselsleder.no
Sist oppdatert: 18. juni 2026

## FERDIG OG TESTET I DAG (alle 7 modulene i kursplanleggeren)
Alt pushet til GitHub (Trivselsleder/trivselsleder-ny), siste commit 1981b8e.

1. Send lenker — RA åpner kurs, ser koblede skoler, kopierer personlige svar-lenker (én/alle). Testet ende-til-ende.
2. Metaoversikt — totaltall på tvers av alle kurs øverst i kursplanleggeren (inviterte/svart/kommer/kommer ikke).
3. Melding fra skole — RA kan markere skolesvar som "håndtert" i Se svar (DB-felt melding_handtert).
4. Flytteforespørsel — RA flytter skole til annet kurs (fleksibel: knapp på alle nei-svar). Skolen nullstilles til "ikke svart" på nytt kurs. Testet Bodø->Bergen.
5. Kortutdeling (PROTOTYPE til Camilla) — egen side /admin/kortutdeling. Antall = TL+10% rundet opp. Forenklet til Fakturer/Gratis. Ved "Fakturer" vises beløp eks mva (antall kort x 40kr, ingen porto) + toppsum "Til fakturering". Merket som prototype.
6. Kopier kursplan — "Kopier"-knapp dupliserer kurs (struktur følger, status=planlagt, navn+"(kopi)", uten skoler/svar).
7. Purring og påminnelse (Trinn A) — to SEPARATE faner i kursplanleggeren (Purring / Påminnelse). Sender via egen e-postklient (mailto BCC) til hktl_epost. Purring=ikke svart, Påminnelse=har svart.

Kursplanleggeren har nå 5 faner: Kurs / Haller / Kursholdere / Purring / Påminnelse.

## NYE DB-FUNKSJONER LAGET I DAG (Supabase)
- sett_melding_handtert(uuid, boolean)
- flytt_skole_til_kurs(uuid, uuid) — nullstiller svaret på nytt kurs
- sett_kort_status(uuid, text)
- kopier_kurs(uuid) RETURNS uuid
- GRANT-fikser: hent_kurs_skole_via_token + lagre_skole_svar måtte GRANT EXECUTE TO anon (skoler er ikke innlogget)
Nytt DB-felt: kurs_skole.melding_handtert (boolean, default false)

## VIKTIG LÆRDOM I DAG
- kurs_skole har TO koblinger til kurs (kurs_id + onsket_kurs_id). Må spesifisere kurs!kurs_skole_kurs_id_fkey i spørringer.
- id-kolonner er uuid (ikke bigint).
- Kortpris = 40 kr (fra src/utils/satser.js).
- E-post til skoler ligger i skoler-tabellen: hktl_epost (Hovedkontakt TL = standard mottaker), rektor_epost, htla_epost.
- Eksisterende e-postsending er mailto BCC (ikke server-send). Ekte auto-utsending krever Resend (ikke satt opp).

## GJENSTÅR / VENTER PÅ AVKLARING
### Kortutdeling — vis Camilla før endelig versjon:
- Hva skal "Fakturer" faktisk gjøre utover å vise beløp? (fakturautkast? eksportliste til Tripletex?)
- Forhold til kulturkort-bestillinger (unngå dobbeltfakturering av skoler som BÅDE bestiller online OG får på kurs)
- KK er variabel kostnad i kontrakt — kan ikke påtvinges (avklar Tommy/juridisk)
- Camilla vil ha ÉN liste. Forhold til dagens kalender (RA+eksterne bruker den) må avklares
- RA må kunne redigere antall asap frem til kursdag
- Senere idé: tagg gratis-skoler i skoleregisteret -> auto-kobling ved påmelding
- Slå kortutdeling sammen med Camillas AdminBestillinger som faner SENERE (når den migreres localStorage->Supabase)

### RA-filter (venter på ekte data):
- Kursplanlegger + metaoversikt skal filtrere "mine nettverk vs alle". RA ser eget område, kan slå av for å hjelpe andre. Krever RA->nettverk-kobling + import av skoler.

### Purring/påminnelse Trinn B (senere):
- Automatisk/planlagt utsending via Resend. Krever Resend-konto + API-nøkkel + domeneverifisering. Trinn A dekker mesteparten av behovet allerede.

### Hel-sesong-kopiering (senere):
- vår->vår, høst->høst med ukene bevart (faste reiseruter samme uke neste år) + diff mot skoleregister. Bygges når ekte data + to sesonger finnes.

## TIL LANSERING (v1.0)
- Supabase: oppgrader til Pro (~$25/mnd) FØR sommerferie — gir daglige backups + fjerner 7-dagers pause. (Kjartan gjør selv.)
- Vercel: Pro ($20/mnd) kreves ved kommersiell lansering (Hobby er kun ikke-kommersiell). Pauser IKKE ved inaktivitet, så kan vente til lansering.
- Lage samlet "systemkart"-dokument: alle koblinger i klartekst (sider<->tabeller<->funksjoner<->tjenester).

## NESTE OPPGAVE (klar til ny chat)
Importere hallregister fra "Hallregister_utkast_2.xlsx" (150+ nettverk, ekte kontaktinfo) til haller-tabellen.
OBS før import: sjekk haller-tabellens kolonner; rydd i data (noen rader er enkeltskoler m/avtaleperiode, ikke haller; noen kontaktceller har flere personer/e-poster/tlf). Originaltekst-kolonne finnes som backup.
