-- ============================================================================
-- 128_tl_dans_ressurstype.sql — TL-dans som egen ressurstype ('tl_dans')
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning (Vei B, claude_TLDANS-LAGRINGSVALG-14sep.md). TL-dans er
--   IKKE leker — en videoserie med musikk (tittel, sang, artist), ikke regler/forberedelse. Alle
--   34 lagres som ressurser med ny ressurstype='tl_dans' og vises som egen liste på Min side
--   (frontend venter på design — ikke i denne runden).
--
-- MÅLT I PROD 14. sep: 16 danser finnes som leker (TL-dans 1–15 = kilde_nid 1406–1420, TL-dans 28
--   = 9698), alle publisert, 0 medie-rader, 0 i periodeplan/TL-hjul/favoritt. 18 danser har aldri
--   eksistert som sider. Endringen er risikofri (kun type-omklassifisering + nye rader).
--
-- ── SANG/ARTIST: egen liten tabell dans_metadata(ressurs_id pk, sang, artist) ──
--   Valgt framfor (a) kolonner på ressurser — ville forurenset den delte tabellen (lek/aktiv
--   læring) med to alltid-null-kolonner; og (b) ressurs_innhold.beskrivelse — sang/artist er
--   KORT STRUKTURERT metadata, ikke beskrivende HTML; å parse dem ut av beskrivelse-HTML er
--   skjørt. En 1:1-tabell på ressurs_id er ryddig, spørrbar, rører ikke ressurser/ressurs_innhold,
--   og bare danser har en rad. Dansetrinns-teksten de 16 alt har i ressurs_innhold.beskrivelse
--   blir stående som «Om dansen». Sang/artist backfilles her fra kartleggingens strukturerte
--   verdier (dans 16–22 mangler all tekst i kilden → sang/artist = null, fylles av ansatte senere).
--   VIDEO er utenfor denne runden (ingen Bunny-opplasting): når videoene lastes opp, kobles de via
--   den eksisterende `medier`-tabellen (medier.ressurs_id → dansens ressurs.id), akkurat som leker.
--
-- ── SØK: sok_leker skjuler tl_dans (samme mekanikk som aktiv_laering) ──
--   sok_leker filtrerer i dag `ressurstype <> 'aktiv_laering'`. tl_dans ville ellers STÅTT IGJEN i
--   lekebiblioteket. Vi legger til `and r.ressurstype <> 'tl_dans'`. 104-FELLEN: i stedet for å
--   reprodusere hele funksjonskroppen (165 linjer, risiko for avvik fra prod) leser vi prods
--   FAKTISKE kropp med pg_get_functiondef, erstatter KUN den ene filterlinja, og re-eksekverer.
--   Feiler hvis den forventede linja ikke finnes (kroppen avviker) → ingen stille feil.
--   (Verifisert: sok_leker sist definert i migr 105, ikke rørt av 119–127, ikke blant de 15
--   avvikende funksjonene 12. sep → prodmal_118 = prod. Den dynamiske erstatningen holder uansett.)
--
-- ── RETTIGHETER (12.-sep default-privileges-lærdom) ── ny tabell setter rettighetene eksplisitt
--   (revoke all from anon) og har RLS. authenticated leser (sang/artist er ikke sensitivt), kun
--   service_role skriver via backend; ingen sekvens (ressurs_id-PK).
--
-- SPERRER: forutsetning FØR (CHECK finnes · samling nokkel='tl-dans' finnes · srp finnes ·
--   dans_metadata finnes IKKE = idempotens) · nøyaktig 16 eksisterende (kilde_nid) · 18 nye ·
--   34 totalt · 34 metadata · 34 koblet · sok_leker filtrerer tl_dans. EGENSKAPER: ÉN transaksjon.
--
-- TILBAKERULLING (etter commit): omfattende (slett 18 nye ressurser, tilbakestill 16, drop tabell,
--   gjenopprett CHECK og sok_leker) — se claude-notat ved behov. Additiv nok til å kjøres én gang.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- FORUTSETNING-SPERRE (raise FØR skriving)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.ressurser'::regclass and conname='ressurser_ressurstype_check') then
    raise exception 'STOPP 128: ressurser_ressurstype_check mangler (migr 024).';
  end if;
  if to_regclass('public.samling_ressurs_plassering') is null then
    raise exception 'STOPP 128: samling_ressurs_plassering mangler (migr 119).';
  end if;
  if not exists (select 1 from public.samlinger where nokkel='tl-dans') then
    raise exception 'STOPP 128: fant ingen samling med nokkel=''tl-dans'' (migr 117).';
  end if;
  if to_regclass('public.dans_metadata') is not null then
    raise exception 'STOPP 128 (allerede kjørt): public.dans_metadata finnes allerede.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) UTVID ressurstype-CHECK: 'lek','aktiv_laering' → + 'tl_dans'
-- ----------------------------------------------------------------------------
alter table public.ressurser drop constraint ressurser_ressurstype_check;
alter table public.ressurser
  add constraint ressurser_ressurstype_check check (ressurstype in ('lek','aktiv_laering','tl_dans'));

-- ----------------------------------------------------------------------------
-- 2) NY TABELL dans_metadata (sang/artist) + RLS + rettigheter
-- ----------------------------------------------------------------------------
create table public.dans_metadata (
  ressurs_id uuid primary key references public.ressurser(id) on delete cascade,
  sang       text,
  artist     text
);
comment on table public.dans_metadata is 'Sang/artist for TL-dans (128), 1:1 med ressurser der ressurstype=tl_dans.';

alter table public.dans_metadata enable row level security;
grant select on public.dans_metadata to authenticated;
grant select, insert, update, delete on public.dans_metadata to service_role;
revoke all on public.dans_metadata from anon;
create policy p_les on public.dans_metadata for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- 3) DATAGRUNNLAG — de 34 dansene (kartleggingen). kilde_nid satt for de 16 eksisterende.
-- ----------------------------------------------------------------------------
-- kilde_nid er TEXT i ressurser (målt) — heltalls-literalene under auto-caster til text ved insert.
create temp table _dans (nummer int, tittel text, sang text, artist text, kilde_nid text, ressurs_id uuid) on commit drop;
insert into _dans (nummer, tittel, sang, artist, kilde_nid) values
  (1,  'TL-dans 1',  'Break your heart', 'Taio Cruz', 1406),
  (2,  'TL-dans 2',  'Outrun the sun', 'Madcon feat. Maad*Moiselle', 1407),
  (3,  'TL-dans 3',  'Gettin'' Over You', 'David Guetta feat. Fergie & LMFAO', 1408),
  (4,  'TL-dans 4',  'Sunrise', 'Alexandra Joner feat. Madcon', 1409),
  (5,  'TL-dans 5',  'Spectrum (Say my name)', 'Florence + the Machine', 1410),
  (6,  'TL-dans 6',  'Scream and shout', 'Will.I.am and Britney Spears', 1411),
  (7,  'TL-dans 7',  'Wake me up', 'Avicii', 1412),
  (8,  'TL-dans 8',  'Timber', 'Pitbull feat. Ke$ha', 1413),
  (9,  'TL-dans 9',  'Jubel', 'Klingande', 1414),
  (10, 'TL-dans 10', 'Summer', 'Calvin Harris', 1415),
  (11, 'TL-dans 11', 'Break Free', 'Ariana Grande', 1416),
  (12, 'TL-dans 12', 'Samsara', 'Tungevaag & Raaban', 1417),
  (13, 'TL-dans 13', 'Five more hours', 'Deorro & Chris Brown', 1418),
  (14, 'TL-dans 14', 'Easy Love', 'Sigala', 1419),
  (15, 'TL-dans 15', 'Light it up', 'Major Lazer', 1420),
  (16, 'TL-dans 16', null, null, null),
  (17, 'TL-dans 17', null, null, null),
  (18, 'TL-dans 18', null, null, null),
  (19, 'TL-dans 19', null, null, null),
  (20, 'TL-dans 20', null, null, null),
  (21, 'TL-dans 21', null, null, null),
  (22, 'TL-dans 22', null, null, null),
  (23, 'TL-dans 23', 'Takeaway (Andrew Rayel Remix)', 'The Chainsmokers, ILLENIUM, Lennon Stella, Andrew Rayel', null),
  (24, 'TL-dans 24', 'Story of my life', 'Lesley Roy', null),
  (25, 'TL-dans 25', 'Alla på snö', 'Alexander Persson', null),
  (26, 'TL-dans 26', 'Säg mig', 'Carola och Zara Larsson', null),
  (27, 'TL-dans 27', 'Shivers (Alok Remix)', 'Ed Sheeran, Alok', null),
  (28, 'TL-dans 28', 'Theori', 'Theoz', 9698),
  (29, 'TL-dans 29', 'All By Myself', 'Alok, Sigala, Ellie Goulding', null),
  (30, 'TL-dans 30', 'Starlight', 'Drenchill, Jorik Burema', null),
  (31, 'TL-dans 31', 'Memories', 'Sam Feldt, Sofiloud', null),
  (32, 'TL-dans 32', 'Thunder', 'Lucas Estrada, Brendan Mills, BELLA X, LRMEO', null),
  (33, 'TL-dans 33', 'Look who''s laughing now', 'Benjamin Ingrosso', null),
  (34, 'TL-dans 34', 'Golden', 'HUNTER/x, EJAE, AUDREY NUNA, REI AMI (KPOP Demon Hunters)', null);

-- SPERRE: nøyaktig 16 med kilde_nid, 18 uten, 34 totalt (navngir avvik)
do $$
declare v_eks int; v_nye int; v_tot int;
begin
  select count(*) filter (where kilde_nid is not null),
         count(*) filter (where kilde_nid is null),
         count(*)
    into v_eks, v_nye, v_tot from _dans;
  if v_eks <> 16 or v_nye <> 18 or v_tot <> 34 then
    raise exception 'STOPP 128 (datagrunnlag): forventet 16 eksisterende / 18 nye / 34 totalt, fant % / % / %.', v_eks, v_nye, v_tot;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4) MAP de 16 eksisterende på kilde_nid (ALDRI tittel), og verifiser at ALLE 16 finnes
-- ----------------------------------------------------------------------------
update _dans d set ressurs_id = r.id
  from public.ressurser r
  where r.kilde_nid = d.kilde_nid and d.kilde_nid is not null;

do $$
declare v_funnet int;
begin
  select count(*) into v_funnet from _dans where kilde_nid is not null and ressurs_id is not null;
  if v_funnet <> 16 then
    raise exception 'STOPP 128: forventet å finne 16 eksisterende TL-dans-leker på kilde_nid, fant %. Sjekk kilde_nid-lista mot prod.', v_funnet;
  end if;
end $$;

-- Endre type på de 16 (identifisert via ressurs_id fra kilde_nid-mappingen)
update public.ressurser set ressurstype = 'tl_dans'
  where id in (select ressurs_id from _dans where kilde_nid is not null);

-- ----------------------------------------------------------------------------
-- 5) OPPRETT de 18 nye (ressurser + ressurs_innhold-tittel), og fyll _dans.ressurs_id
-- ----------------------------------------------------------------------------
do $$
declare r record; v_id uuid;
begin
  for r in select nummer, tittel from _dans where kilde_nid is null order by nummer loop
    insert into public.ressurser (ressurstype, status) values ('tl_dans', 'publisert') returning id into v_id;
    insert into public.ressurs_innhold (ressurs_id, sprak, tittel) values (v_id, 'nb', r.tittel);
    update _dans set ressurs_id = v_id where nummer = r.nummer;
  end loop;
end $$;

-- SPERRE: alle 34 har nå en ressurs_id
do $$
declare v_mangler int;
begin
  select count(*) into v_mangler from _dans where ressurs_id is null;
  if v_mangler <> 0 then
    raise exception 'STOPP 128: % dans(er) mangler ressurs_id etter opprettelse.', v_mangler;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6) BACKFILL dans_metadata for alle 34 (sang/artist; null der ukjent)
-- ----------------------------------------------------------------------------
insert into public.dans_metadata (ressurs_id, sang, artist)
  select ressurs_id, sang, artist from _dans;

-- ----------------------------------------------------------------------------
-- 7) KOBLE alle 34 til samlingen nokkel='tl-dans'. To trinn: basemedlemskap i samling_ressurs
--    (som srp har FK mot), deretter plassering (seksjon 'TL-dans', rekkefolge = dansenummer).
-- ----------------------------------------------------------------------------
insert into public.samling_ressurs (samling_id, ressurs_id)
  select (select id from public.samlinger where nokkel='tl-dans'), d.ressurs_id
    from _dans d
  on conflict (samling_id, ressurs_id) do nothing;

insert into public.samling_ressurs_plassering (samling_id, ressurs_id, seksjon, rekkefolge)
  select (select id from public.samlinger where nokkel='tl-dans'), d.ressurs_id, 'TL-dans', d.nummer
    from _dans d
  on conflict (samling_id, ressurs_id, seksjon) do nothing;

-- ----------------------------------------------------------------------------
-- 8) SKJUL tl_dans fra lekesøket — dynamisk endring av sok_leker (104-felle-sikker)
-- ----------------------------------------------------------------------------
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.sok_leker(text,text,text,text,text,text,boolean,text,boolean,boolean,integer,integer)'::regprocedure);
  if position('r.ressurstype <> ''tl_dans''' in v_def) > 0 then
    null; -- allerede filtrert (idempotent)
  elsif position('r.ressurstype <> ''aktiv_laering''' in v_def) > 0 then
    v_def := replace(v_def,
      'r.ressurstype <> ''aktiv_laering''',
      'r.ressurstype <> ''aktiv_laering'' and r.ressurstype <> ''tl_dans''');
    execute v_def;
  else
    raise exception 'STOPP 128: fant ikke det forventede ressurstype-filteret i sok_leker — kroppen avviker fra det ventede. Sjekk manuelt før tl_dans skjules.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
declare v_tot int; v_meta int; v_kobl int;
begin
  select count(*) into v_tot from public.ressurser where ressurstype='tl_dans';
  if v_tot <> 34 then raise exception 'STOPP 128 (etter): forventet 34 ressurser med tl_dans, fant %.', v_tot; end if;
  select count(*) into v_meta from public.dans_metadata;
  if v_meta <> 34 then raise exception 'STOPP 128 (etter): forventet 34 rader i dans_metadata, fant %.', v_meta; end if;
  select count(*) into v_kobl from public.samling_ressurs_plassering srp
    where srp.samling_id = (select id from public.samlinger where nokkel='tl-dans')
      and srp.ressurs_id in (select ressurs_id from _dans);
  if v_kobl <> 34 then raise exception 'STOPP 128 (etter): forventet 34 koblinger til tl-dans-samlingen, fant %.', v_kobl; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.ressurser'::regclass and conname='ressurser_ressurstype_check') not like '%tl_dans%' then
    raise exception 'STOPP 128 (etter): CHECK ble ikke utvidet med tl_dans.';
  end if;
  if pg_get_functiondef('public.sok_leker(text,text,text,text,text,text,boolean,text,boolean,boolean,integer,integer)'::regprocedure) not like '%tl_dans%' then
    raise exception 'STOPP 128 (etter): sok_leker filtrerer ikke tl_dans.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'tl_dans totalt: ' || (select count(*) from public.ressurser where ressurstype='tl_dans'),
  'dans_metadata: ' || (select count(*) from public.dans_metadata),
  'koblet til samling: ' || (select count(*) from public.samling_ressurs_plassering where samling_id=(select id from public.samlinger where nokkel='tl-dans')),
  'CHECK: ' || (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.ressurser'::regclass and conname='ressurser_ressurstype_check'),
  'sok_leker skjuler tl_dans: ' || (pg_get_functiondef('public.sok_leker(text,text,text,text,text,text,boolean,text,boolean,boolean,integer,integer)'::regprocedure) like '%tl_dans%'),
  'anon select dans_metadata (skal NEI): ' || has_table_privilege('anon','public.dans_metadata','SELECT')
) as kvittering;

commit;
