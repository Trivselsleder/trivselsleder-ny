-- 097B_seed_innstillinger.sql
-- ============================================================================
-- SEED: innstillinger — avsenderadresser, e-postmaler, terskler, motorbryter (21 noekler)
-- ============================================================================
-- HVORFOR: disse noeklene finnes i prod, men lages av INGEN migrasjon. Uten dem ville
--   en gjenoppbygd base hatt tomme e-poster, ingen avsenderadresse og ingen terskler.
--   Kilde: _kontroll-017-019/prod/prod_seed.csv (lest rad for rad, ikke hukommelse).
--
-- MOENSTER (som migr 082): insert ... where not exists — ALDRI update. Setter kun inn
--   en noekkel som mangler; en verdi som en ansatt har endret i admin-UI-et staar
--   dermed urort. oppdatert_at defaultes (now()) — holdes utenfor seed-diffen.
--   NO-OP MOT PROD: alle finnes -> 0 rader. TOM BASE: 21 rader. Idempotent.
--
-- FAIL-CLOSED: motor_aktiv seedes ALLTID som 'nei' (arbeidsregel 9) — en gjenoppbygd
--   base skal aldri starte med utsendingsmotoren PAA, uansett hva prod staar paa.
--
-- BEVISST IKKE SEEDET (hoerer ikke i en GitHub-fil / miljoeavhengig):
--   * nettsted_url        — peker paa test-miljoeet; hardkodet ville sendt en gjenoppbygd
--                           prod-base til vercel-testen. Settes PER MILJOE ved deploy
--                           (go-live-sjekklista). (Kjartans beslutning 3. sep.)
--   * eivind_epost        — test-/personadresse; settes per miljoe, ikke i repoet.
--   * kalender_alle_token — tilfeldig token; lages alt av migr 062 (gen_random_uuid()).
--                           Skal ALDRI hardkodes, ellers faar alle baser samme noekkel.
--
-- TO PRESISERINGER MOT SPEC-EN (funnet ved lesing av prod_seed.csv):
--   1) Kjerne-noeklene er 20, ikke 19 — spec-ens 19-oppsummering utelot epost_eivind_emne
--      (EMNE-teksten til kjoepsinteresse-varselet; ren transaksjonstekst, ingen hemmelighet
--      — kun MOTTAKEREN eivind_epost holdes ute). Den seedes her.
--   2) kursinfo_tekst er IKKE tom i prod (spec antok det) — den har reelt kurs-info-innhold
--      (markdown). Det er forretningstekst (som e-postmalene), saa den seedes med prods
--      verdi og lukker seed-diffen. Sesong-tekst som admin kan redigere; seeden overskriver
--      aldri (where not exists).
--
-- GO-LIVE-SJEKKLISTE (maa settes per miljoe, IKKE her):
--   * nettsted_url = produksjonsdomenet i prod, testdomenet i test.
--   * eivind_epost = Eivinds ekte adresse i prod.
--   * vurder motor_aktiv = 'ja' foerst NAAR utsending faktisk skal paa.
--
-- Nummer 097B: seed-par med 097 (churn_signalord), etter 095/096.
-- ============================================================================

begin;

insert into public.innstillinger (nokkel, verdi)
select 'avsender_epost', $verdi$noreply@trivselsleder.no$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'avsender_epost');

insert into public.innstillinger (nokkel, verdi)
select 'avsender_navn', $verdi$Trivselsleder$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'avsender_navn');

insert into public.innstillinger (nokkel, verdi)
select 'svar_til_epost', $verdi$post@trivselsleder.no$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'svar_til_epost');

insert into public.innstillinger (nokkel, verdi, beskrivelse)
select 'epost_invitasjon_emne', $verdi$Invitasjon til kurs: {kursnavn} – Trivselsleder$verdi$, $beskr$Emnefelt i kursinvitasjonen$beskr$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_invitasjon_emne');

insert into public.innstillinger (nokkel, verdi, beskrivelse)
select 'epost_invitasjon_tekst', $verdi$Skolen deres er invitert til kurset {kursnavn}:

Dato: {kursdato}
Sted: {hall}
Oppmøte: {oppmotetid}
{vertskapsnotat}

For å melde fra om dere kommer, bruker dere det personlige svarskjemaet nedenfor.

Viktig: Svar direkte på denne e-posten blir ikke registrert. Du må klikke på knappen og svare i skjemaet for at vi skal få svaret ditt.$verdi$, $beskr$Brødtekst i kursinvitasjonen. Linjer med tomme plassholdere fjernes automatisk.$beskr$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_invitasjon_tekst');

insert into public.innstillinger (nokkel, verdi)
select 'epost_paaminnelse_emne', $verdi$Snart kurs! {kursnavn} {kursdato}$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_paaminnelse_emne');

insert into public.innstillinger (nokkel, verdi)
select 'epost_paaminnelse_tekst', $verdi$Hei {mottaker_navn},

Da nærmer det seg! {skolenavn} er påmeldt {kursnavn}:

Dato: {kursdato}
Sted: {hall}
Oppmøte: {oppmotetid}
{vertskapsnotat}

Dere har meldt på {antall_tl} trivselsledere. Har det endret seg, eller noe annet vi bør vite, gi beskjed via knappen nedenfor.

Vi gleder oss til å se dere!$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_paaminnelse_tekst');

insert into public.innstillinger (nokkel, verdi)
select 'epost_purring_emne', $verdi$Svar på kursinvitasjonen – {kursnavn}$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_purring_emne');

insert into public.innstillinger (nokkel, verdi)
select 'epost_purring_tekst', $verdi$Hei {mottaker_navn},

For noen dager siden sendte vi invitasjon til {kursnavn} {kursdato}, og vi har ikke registrert svar fra {skolenavn} ennå. Vi håper å se dere på kurs!

Det tar to minutter å svare — også hvis dere ikke kan komme. I skjemaet kan dere også legge inn kommentarer eller andre beskjeder til oss.$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_purring_tekst');

insert into public.innstillinger (nokkel, verdi)
select 'epost_trinn3_emne', $verdi${skolenavn} har ikke svart på kursinvitasjonen ennå$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_trinn3_emne');

insert into public.innstillinger (nokkel, verdi)
select 'epost_trinn3_tekst', $verdi$Hei {mottaker_navn},

Du får denne fordi du er en av TL-kontaktene ved {skolenavn}. Skolen er invitert til {kursnavn} {kursdato}, men vi har ikke mottatt svar.

Kanskje har invitasjonen druknet i en travel innboks — det skjer fort. Hvem som helst av TL-kontaktene kan svare på vegne av skolen, og det tar bare to minutter.

Vi trenger et svar fra skolen uansett — også hvis dere ikke kan komme denne gangen.$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_trinn3_tekst');

insert into public.innstillinger (nokkel, verdi)
select 'epost_evaluering_emne', $verdi$Hvordan var kurset? 2 minutter til {skolenavn}$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_evaluering_emne');

insert into public.innstillinger (nokkel, verdi)
select 'epost_evaluering_tekst', $verdi$Hei {mottaker_navn},

Takk for at {skolenavn} deltok på {kursnavn} i dag!

Vi vil gjerne høre hvordan det var — tre raske spørsmål og plass til et gullkorn fra dagen.

Svarene hjelper oss å gjøre neste kurs enda bedre.$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_evaluering_tekst');

insert into public.innstillinger (nokkel, verdi)
select 'epost_eivind_emne', $verdi$Kjøpsinteresse: {skolenavn} – {pakkevalg}$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_eivind_emne');

insert into public.innstillinger (nokkel, verdi, beskrivelse)
select 'epost_vertskap_notat', $verdi$Skolen deres er vertskap for dette kurset, og møter derfor tidligere enn de øvrige for å rigge til.$verdi$, $beskr$Settes inn i invitasjon og påminnelse KUN for skoler som er vertskap. Tom verdi fjerner linjen.$beskr$
where not exists (select 1 from public.innstillinger where nokkel = 'epost_vertskap_notat');

insert into public.innstillinger (nokkel, verdi)
select 'paaminnelse_dager_for', $verdi$3$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'paaminnelse_dager_for');

insert into public.innstillinger (nokkel, verdi, beskrivelse)
select 'purring_dager', $verdi$5$verdi$, $beskr$Antall dager uten svar før purring sendes til Hovedkontakt TL$beskr$
where not exists (select 1 from public.innstillinger where nokkel = 'purring_dager');

insert into public.innstillinger (nokkel, verdi, beskrivelse)
select 'trinn3_dager', $verdi$10$verdi$, $beskr$Antall dager uten svar før e-post også går til øvrige TL-ansvarlige$beskr$
where not exists (select 1 from public.innstillinger where nokkel = 'trinn3_dager');

insert into public.innstillinger (nokkel, verdi)
select 'evaluering_klokkeslett', $verdi$13:30$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'evaluering_klokkeslett');

insert into public.innstillinger (nokkel, verdi)
select 'motor_aktiv', $verdi$nei$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'motor_aktiv');

insert into public.innstillinger (nokkel, verdi)
select 'kursinfo_tekst', $verdi$
## Velkommen til høstens leke- og aktivitetskurs

I løpet av august og september avholder vi ca. 150 TL lekekurs i hele landet. I denne perioden kurses ca. 35 000 trivselsledere.

Oppmøtetid og sluttid for deres eget kurs står øverst på denne siden. Lunsj er ca. kl. 11.00, men kan variere.

## Program for dagen

- Før lunsj: Lekekurs del 1 (4–5 leker)
- Etter lunsj: Lekekurs del 2 (4–5 leker)
- Siste 30 minutter: TL-prat, dans og felles aktivitet

Må skolen gå før avslutningstiden, gi oss beskjed i forkant. Det samme gjelder hvis dere ikke rekker å være presist til oppstart.

## Nominasjon av trivselsledere

- Elever som nomineres skal være vennlige, respektfulle, inkluderende og mobbefrie.
- Benytt elevpresentasjoner ved nominasjon.
- Last ned og skriv ut nominasjonslapper.
- Vis nominasjonsvideoen til ansatte og elever.
- Les mer på side 10–13 i programbeskrivelsen, som ligger under Dokumenter på [Min side](/min-side).
- Tips: sett av en klassetime til presentasjon, nominasjon og litt lek.

## Mål med kurset

- Lære nye leker som skaper aktivitet og trivsel.
- Lære å dele inn i lag på en god måte.
- Øve på å sette i gang og lede en aktivitet.
- Trene på hensyn og respekt for nye og gamle venner.
- Ha det gøy!

## Vertskapsrolle — lekeledere på kurset

- Vertskapsskolene møter tidligere enn de andre og er lekeledere på kurset. Står det en oppmøtetid øverst på denne siden, er det den som gjelder for dere.
- Vertskapet er ledere på gruppene, lærer lekene videre til de andre skolene og deler inn i lag.
- Viktig: ha med og på de oransje TL-vestene.
- Noen kurs har ikke vertskap, men felles opplæring for alle skolene.

## Forberedelser til kursdagen

- Snakk med trivselslederne om dagen, om oppførsel og om oppgavene de skal ha.
- Se gjerne gjennom lekene på forhånd. Høstens leker filmes og blir tilgjengelig på hjemmesiden.
- Elevene tar med mat og drikke. Kle dere sporty, og husk gymsko til innendørs bruk.

## Forventninger til de voksne

- Gå rundt i hallen sammen med kursholder, og vær tilgjengelig for elevene.
- De voksne er ansvarlige for elevene sine hele dagen.
- Sørg for at alle har en bra dag, og følg opp elever med spesielle behov.
- Husk å være gode forbilder.

## Kulturkort

Kulturkort deles ut på kursdagen. Dere trenger ikke bestille dem. Les mer om [Kulturkortet](/kulturkortet).

## Foto og video

- Det er tillatt å fotografere på offentlig sted, men vi unngår nærbilder uten avtale.
- Gi oss beskjed tidlig hvis dere har elever med fotoforbud.

## Utstyrspakker

Mange skoler supplerer utstyret sitt før kurset. Lenker til liten og stor lekekurspakke legges inn her.

## Spørsmål?

Har dere spesielle hensyn vi bør vite om, send en e-post til kurs@trivselsleder.no i forkant. Ellers kan dere ta kontakt med regionansvarlig i deres område.

Hilsen TL-teamet
$verdi$
where not exists (select 1 from public.innstillinger where nokkel = 'kursinfo_tekst');

commit;
