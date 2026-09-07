-- ============================================================================
-- 106_utstyr_rydding.sql — D1b: rydd utstyrslista FØR lansering (Kjartans beslutning 7. sep)
-- ============================================================================
-- HVA: en engangsrydding av 7 utstyrstermer. FASIT er målt og avgjort av Cowork A + Kjartan
--   (denne fila gjør INGEN egne vurderinger av hvilke termer som røres):
--     SLETT (testsøppel/rolle, ikke utstyr):  «Test» · «Dommer»
--     DØP OM (skrivefeil/for vagt navn):       «Basseball»→«Baseball» · «Bilder»→«Bildekort»
--     SLÅ SAMMEN (flytt koblinger, behold mål): «Ertepose»→«Erteposer» ·
--                «Markeringskjegler 7,5 cm»→«Markeringskjegler» · «Kjegler»→«Markeringskjegler»
--   RØR IKKE (målt, kritisk): «Markeringstallerkener» (175 – tallerkener, ikke kjegler),
--     «Minikjegler», «Nummererte markeringskjegler», «Små erteposer», og alle øvrige termer.
--
-- LAGER INGEN TABELL (rev 2, etter Supabase-linteradvarsel): FØR/ETTER er inline-SELECT (som 102),
--   og alt arbeid + alle sperrer skjer i ÉN plpgsql DO-blokk med LOKALE VARIABLER. Ingen temp-tabell,
--   ingen varig tabell — ingenting blir stående, en gjenoppbygging arver ingenting. (Rev 1 brukte
--   `create temp table … on commit drop`; de forsvant ved commit, men den statiske linteren flagget
--   dem likevel som «tabell uten RLS». Fjernet helt for å unngå enhver tvil.)
--
-- ÉN UNIFORM MEKANIKK for alle fem konsolideringer (flytt + omdøp): finnes MÅLNAVNET fra før (også
--   via uq_utstyr_lower_navn, migr 094) → SAMMENSLÅING (flytt koblinger med `on conflict do nothing`,
--   verifiser, slett kilde); finnes det ikke → REN OMDØPING (bytt navn, raden består). Målt i
--   øvingskopien: Baseball/Bildekort finnes ikke → omdøpinger. Porten (fersk base) har «Ertepose»
--   uten «Erteposer» → der blir den omdøping. Uniform mekanikk = korrekt på begge baser.
--   Kjegle-familien har 2 målte kollisjoner → `on conflict do nothing` kreves for komposit-PK-en.
--   ressurs_utstyr → utstyr har ON DELETE CASCADE, så term-sletting rydder resten av koblingene.
--
-- SPERRER (alle harde, i DO-blokken; rollback ved brudd): ingen lek mister ALLE utstyrskoblinger
--   (distinct-lek-tallet er uendret); hver kilde-lek har målnavnet FØR kilden slettes; ingen lek som
--   bare hadde Test/Dommer (forhåndssjekk før sletting); alle kildenavn borte; «rør ikke»-termene
--   uendret; utstyr-antallet stemmer. Alle relative/invariante → passerer også migrasjonsporten.
--
-- FORHÅNDSVISNING: bytt 'commit;' nederst til 'rollback;', kjør, les FØR/ETTER, bytt tilbake.
-- IDEMPOTENT: etter fullført rydding er kildene borte → alt treffer 0, alle sperrer teller likt.
-- ============================================================================

begin;

-- ── FØR-kvittering (inline SELECT — leser tilstand, oppretter ingenting) ────────────────────
select 'FOER' as fase, 'utstyr_totalt' as maal, count(*)::int as antall from utstyr
union all select 'FOER','ressurs_utstyr_totalt', count(*)::int from ressurs_utstyr
union all select 'FOER', u.navn, (select count(*)::int from ressurs_utstyr ru where ru.utstyr_id=u.id)
  from utstyr u where u.navn in ('Erteposer','Markeringskjegler','Ertepose','Markeringskjegler 7,5 cm',
    'Kjegler','Markeringstallerkener','Minikjegler','Nummererte markeringskjegler','Små erteposer');

-- ── ALT ARBEID + ALLE SPERRER i én DO-blokk (lokale variabler; ingen tabell opprettes) ──────
do $$
declare
  par           record;
  kilde_id      int;
  mal_id        int;
  tmp           int;
  n_utstyr_for  int;
  n_leker_for   int;   -- antall distinkte leker med minst ett utstyr FØR
  kilder_for    int;   -- antall kildenavn som fantes FØR
  maalnavn_for  int;   -- antall målnavn som fantes FØR
  maalnavn_ett  int;   -- ... og ETTER (nye målnavn opprettet ved omdøping)
  urort_for     text;  -- fingeravtrykk (navn:antall) for «rør ikke»-termene FØR
  urort_ett     text;  -- ... og ETTER
begin
  -- Snapshot FØR (i variabler — forsvinner med blokken).
  select count(*) into n_utstyr_for from utstyr;
  select count(distinct ressurs_id) into n_leker_for from ressurs_utstyr;
  select count(*) into kilder_for from utstyr where navn in
    ('Test','Dommer','Ertepose','Markeringskjegler 7,5 cm','Kjegler','Basseball','Bilder');
  select count(*) into maalnavn_for from utstyr where navn in
    ('Erteposer','Markeringskjegler','Baseball','Bildekort');
  select string_agg(navn||':'||cnt, ',' order by navn) into urort_for from (
    select u.navn, count(ru.ressurs_id) cnt from utstyr u
    left join ressurs_utstyr ru on ru.utstyr_id=u.id
    where u.navn in ('Markeringstallerkener','Minikjegler','Nummererte markeringskjegler','Små erteposer')
    group by u.navn) s;

  -- KONSOLIDERINGER: sammenslåing hvis målnavnet finnes, ellers omdøping. «7,5 cm» før «Kjegler»
  -- (deler mål «Markeringskjegler»). Verifiser at hver kilde-lek har målet FØR kilden slettes.
  for par in select * from (values
      ('Ertepose','Erteposer'),
      ('Markeringskjegler 7,5 cm','Markeringskjegler'),
      ('Kjegler','Markeringskjegler'),
      ('Basseball','Baseball'),
      ('Bilder','Bildekort')
    ) as t(kilde, mal)
  loop
    select id into kilde_id from utstyr where navn = par.kilde;
    if kilde_id is null then continue; end if;                  -- ikke i denne basen
    select id into mal_id from utstyr where lower(navn) = lower(par.mal);
    if mal_id is null then
      update utstyr set navn = par.mal where id = kilde_id;      -- ren omdøping (mål finnes ikke)
    else
      insert into ressurs_utstyr (ressurs_id, utstyr_id)         -- flytt koblinger (komposit-PK trygt)
        select ru.ressurs_id, mal_id from ressurs_utstyr ru where ru.utstyr_id = kilde_id
        on conflict (ressurs_id, utstyr_id) do nothing;
      select count(*) into tmp from ressurs_utstyr ru            -- verifiser FØR sletting
        where ru.utstyr_id = kilde_id
          and not exists (select 1 from ressurs_utstyr x where x.ressurs_id = ru.ressurs_id and x.utstyr_id = mal_id);
      if tmp > 0 then raise exception 'STOPP 106: % kilde-lek(er) mangler mål «%» etter flytting.', tmp, par.mal; end if;
      delete from utstyr where id = kilde_id;                    -- cascade rydder kilde-koblinger
    end if;
  end loop;

  -- SLETTINGER: forhåndssjekk at ingen lek bare hadde Test/Dommer, deretter slett.
  select count(*) into tmp from ressurs_utstyr ru join utstyr u on u.id = ru.utstyr_id
    where u.navn in ('Test','Dommer')
      and (select count(*) from ressurs_utstyr x where x.ressurs_id = ru.ressurs_id) < 2;
  if tmp > 0 then raise exception 'STOPP 106: % lek(er) ville mistet ALT utstyr ved sletting av Test/Dommer.', tmp; end if;
  delete from utstyr where navn in ('Test','Dommer');           -- cascade fjerner den ene koblingen

  -- SPERRER ETTER (harde).
  -- 1) Ingen lek mistet ALLE utstyrskoblinger (distinct-lek-tallet er uendret).
  select count(distinct ressurs_id) into tmp from ressurs_utstyr;
  if tmp <> n_leker_for then
    raise exception 'STOPP 106: antall leker med utstyr endret (% → %) — en lek mistet alt.', n_leker_for, tmp;
  end if;
  -- 2) Alle kildenavn er borte.
  select count(*) into tmp from utstyr where navn in
    ('Test','Dommer','Ertepose','Markeringskjegler 7,5 cm','Kjegler','Basseball','Bilder');
  if tmp > 0 then raise exception 'STOPP 106: % kildenavn står fortsatt i utstyr.', tmp; end if;
  -- 3) «Rør ikke»-termene er uendret (samme navn + koblingstall).
  select string_agg(navn||':'||cnt, ',' order by navn) into urort_ett from (
    select u.navn, count(ru.ressurs_id) cnt from utstyr u
    left join ressurs_utstyr ru on ru.utstyr_id=u.id
    where u.navn in ('Markeringstallerkener','Minikjegler','Nummererte markeringskjegler','Små erteposer')
    group by u.navn) s;
  if urort_ett is distinct from urort_for then
    raise exception 'STOPP 106: en «rør ikke»-term ble endret. FØR=[%] ETTER=[%]', urort_for, urort_ett;
  end if;
  -- 4) utstyr-antall stemmer: før − (kilder som fantes) + (nye målnavn opprettet ved omdøping).
  select count(*) into maalnavn_ett from utstyr where navn in ('Erteposer','Markeringskjegler','Baseball','Bildekort');
  select count(*) into tmp from utstyr;
  if tmp <> n_utstyr_for - kilder_for + (maalnavn_ett - maalnavn_for) then
    raise exception 'STOPP 106: utstyr-antall stemmer ikke. Forventet %, fikk %.',
      n_utstyr_for - kilder_for + (maalnavn_ett - maalnavn_for), tmp;
  end if;
end $$;

-- ── ETTER-kvittering (inline SELECT) ───────────────────────────────────────────────────────
select 'ETTER' as fase, 'utstyr_totalt' as maal, count(*)::int as antall from utstyr
union all select 'ETTER','ressurs_utstyr_totalt', count(*)::int from ressurs_utstyr
union all select 'ETTER', u.navn, (select count(*)::int from ressurs_utstyr ru where ru.utstyr_id=u.id)
  from utstyr u where u.navn in ('Erteposer','Markeringskjegler','Baseball','Bildekort',
    'Markeringstallerkener','Minikjegler','Nummererte markeringskjegler','Små erteposer');

commit;
