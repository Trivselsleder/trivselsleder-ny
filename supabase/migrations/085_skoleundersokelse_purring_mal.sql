-- 085_skoleundersokelse_purring_mal.sql
-- MODUL «Spørreundersøkelse til skolene» — MANUELL PURRING (påminnelse til de som
-- fikk runden men ikke har svart). Seeder e-postmal-nøklene for purringen i
-- innstillinger-tabellen.
--
-- Speiler NØYAKTIG mønsteret i 082 (epost_skoleus_emne/-tekst): redigerbar mal i
-- innstillinger, plassholderne {skolenavn} og {mottaker_navn} fylles ved utsending.
-- Purre-ruten api/skoleus/send-purring.js leser disse nøklene og 500-er trygt hvis
-- de mangler (ingen hardkodet fallback).
--
-- Rører KUN innstillinger (to nye rader). Ingen tabeller/kolonner. purring_sendt_at
-- finnes ALLEREDE på skoleus_mottaker (migr 078) — INGEN datamodell-migrasjon trengs.
-- IKKE KJØRT MOT PROD. IKKE PUSHET. Idempotent (insert kun hvis nøkkel mangler).
--
-- ── STEG 0-funn vi bygger på (verifisert i faktisk kode 31. aug 2026) ────────
-- * innstillinger-seed-mønster (082 + 060): idempotent «insert ... select 'nokkel',
--   'verdi' where not exists (...)». Samme plassholdernavn {skolenavn}/{mottaker_navn}.
-- * skoleus_mottaker.purring_sendt_at (078) = ÉN-gangs-stempel for purring (NULL→nå),
--   akkurat som kurs_skole.eval_purring_sendt_at i cron-eval-purring.js.
-- * epost_logg.type har INGEN check-constraint (bekreftet i 082) — purre-ruten kan
--   bruke type='skoleundersokelse_purring' uten skjemaendring.
-- * Neste ledige migrasjonsnr = 085 (084 høyest på disk). Bekreftet.

begin;

-- Emne (kun hvis nøkkelen ikke finnes fra før).
insert into public.innstillinger (nokkel, verdi)
select 'epost_skoleus_purring_emne', 'Påminnelse: spørreundersøkelse fra Trivselsleder'
where not exists (select 1 from public.innstillinger where nokkel = 'epost_skoleus_purring_emne');

-- Brødtekst (kun hvis nøkkelen ikke finnes fra før). {skolenavn} og {mottaker_navn}
-- fylles inn ved utsending — samme plassholder-navn som 082-malen bruker.
insert into public.innstillinger (nokkel, verdi)
select 'epost_skoleus_purring_tekst',
'Hei {mottaker_navn}!

Vi sendte nylig en spørreundersøkelse til {skolenavn}, men har ikke registrert noe svar ennå. Vi håper dere fortsatt har mulighet til å svare — det tar bare noen få minutter, og svarene hjelper oss å gjøre Trivselsprogrammet bedre.

Lenken under er personlig for skolen deres, og er den samme som sist. Har dere allerede begynt, kan dere fortsette der dere slapp.

Trykk på knappen for å svare.

Takk for at dere tar dere tid!

Varm hilsen
Trivselsleder'
where not exists (select 1 from public.innstillinger where nokkel = 'epost_skoleus_purring_tekst');

commit;
