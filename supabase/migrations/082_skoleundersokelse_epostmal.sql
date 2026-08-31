-- 082_skoleundersokelse_epostmal.sql
-- MODUL «Spørreundersøkelse til skolene» — byggetrinn 2, DEL C (utsending):
-- e-postmal-nøkler for skoleundersøkelsen i innstillinger-tabellen.
--
-- Speiler kurs-e-postenes mal-mønster (epost_invitasjon_emne/-tekst, epost_savnet_*):
-- redigerbar mal i innstillinger, plassholdere {skolenavn} og {mottaker_navn} fylles
-- ved utsending. Utsendingsruten api/skoleus/send-runde.js leser disse nøklene.
--
-- IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent (insert kun hvis nøkkel ikke finnes).
--
-- ── STEG 0-funn vi bygger på (verifisert i faktisk kode 31. aug 2026) ────────
-- * innstillinger-seed-mønster (verifisert i 060_savnet_mal.sql): idempotent
--   «insert ... select 'nokkel','verdi' where not exists (select 1 from
--   innstillinger where nokkel='nokkel')». Plassholderne {skolenavn} og
--   {mottaker_navn} brukes ordrett i epost_savnet_tekst — samme navn her.
-- * epost_logg (019): kolonnen `type text not null` har INGEN check-constraint
--   (bekreftet: kun pkey + to FK-er kurs_skole_id/kurs_skole_mottaker_id).
--   type='skoleundersokelse' krever derfor INGEN endring — ingen migrasjon på
--   epost_logg her. (De to FK-kolonnene lar utsendingsruten stå NULL for skoleus,
--   siden mottakeren ikke er en kurs_skole-mottaker; begge er nullbare + ON DELETE SET NULL.)
-- * motor_aktiv og nettsted_url finnes i innstillinger (leses av send-invitasjon.js
--   og alle andre utsendingsruter) — ingen ny nøkkel trengs for dem.
-- * Neste ledige migrasjonsnr = 082 (081 høyest på disk). Bekreftet.

begin;

-- Emne (kun hvis nøkkelen ikke finnes fra før).
insert into public.innstillinger (nokkel, verdi)
select 'epost_skoleus_emne', 'Spørreundersøkelse fra Trivselsleder'
where not exists (select 1 from public.innstillinger where nokkel = 'epost_skoleus_emne');

-- Brødtekst (kun hvis nøkkelen ikke finnes fra før). {skolenavn} og {mottaker_navn}
-- fylles inn ved utsending — samme plassholder-navn som kurs-malene bruker.
insert into public.innstillinger (nokkel, verdi)
select 'epost_skoleus_tekst',
'Hei {mottaker_navn}!

Vi ønsker å høre hvordan Trivselsprogrammet fungerer på {skolenavn}. Undersøkelsen tar noen få minutter, og svarene hjelper oss å gjøre programmet bedre.

Lenken under er personlig for skolen deres. Dere kan når som helst åpne den på nytt og justere svarene så lenge undersøkelsen er åpen.

Trykk på knappen for å svare.

Takk for at dere tar dere tid!

Varm hilsen
Trivselsleder'
where not exists (select 1 from public.innstillinger where nokkel = 'epost_skoleus_tekst');

commit;
