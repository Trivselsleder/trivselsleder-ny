-- 060: B15 (høring) – omsorgsmail «vi savnet dere» til nei-skoler.
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne). Idempotent.
--
-- Beslutning (høring pkt 10): DROPP «slik holder du kurs selv»-oppskriften. Bygg i
-- stedet en varm «vi savnet dere»-mail (Ylvas skisse): leker som slo an, kurshefte,
-- videolenker (når klart), nominasjonslapper, peker mot neste kurs. INGEN
-- bruksanvisning, INGEN oppfølging/evaluering av lokalt kurs. Sendes MANUELT av RA.
--
-- Malen legges i innstillinger (samme mønster som de andre e-postmalene) så RA kan
-- redigere teksten. Stempelet savnet_sendt_at brukes til visning («sendt <dato>»);
-- det sperrer ikke — RA bestemmer om den skal sendes på nytt.

begin;

-- Emne (kun hvis nøkkelen ikke finnes fra før).
insert into public.innstillinger (nokkel, verdi)
select 'epost_savnet_emne', 'Vi savnet dere på lekekurset'
where not exists (select 1 from public.innstillinger where nokkel = 'epost_savnet_emne');

-- Brødtekst (kun hvis nøkkelen ikke finnes fra før). {skolenavn} og {mottaker_navn}
-- fylles inn ved utsending.
insert into public.innstillinger (nokkel, verdi)
select 'epost_savnet_tekst',
'Hei!

Vi savnet {skolenavn} på det siste lekekurset – og vi håper vi ses neste gang.

Selv om dere ikke hadde anledning denne runden, vil vi gjerne dele litt som kan komme til nytte i friminuttene allerede nå:

- Lekene som slo best an på kurset, klare til å prøves ute.
- Kursheftet med aktiviteter og tips.
- Videolenker som viser lekene i praksis (kommer så snart de er klare).
- Nominasjonslapper til trivselsledere, om dere vil komme i gang på egen hånd.

Vi håper å se dere på neste kurs – vi sier fra i god tid.

Varm hilsen
Trivselsleder'
where not exists (select 1 from public.innstillinger where nokkel = 'epost_savnet_tekst');

-- Stempel for «sendt <dato>» (og for logg). Sperrer ikke gjensending.
alter table public.kurs_skole
  add column if not exists savnet_sendt_at timestamptz;

commit;
