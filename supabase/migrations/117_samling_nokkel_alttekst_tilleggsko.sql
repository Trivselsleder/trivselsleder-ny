-- ============================================================================
-- 117_samling_nokkel_alttekst_tilleggsko.sql — tre additive rettinger, én transaksjon
-- ============================================================================
-- KILDE (fasit): Kjartans byggeoppdrag 11. sep 2026 (ettermiddag) + målinger i prod
--   samme dag (21 samlinger, TL-dans-samlingen 8f827d19…, 11 /redaksjon/-bilder med
--   «Foto: »/«Illustrasjon: »-prefiks, 4 publiserte tilleggsdokumenter uten kobling).
--
-- KOLONNER JEG BYGGER PÅ (kilde-migrasjon i parentes):
--   samlinger(id, nokkel[NY], rekkefolge, synlig) (029; nokkel legges til her).
--   samling_innhold(samling_id, sprak, tittel) (029).
--   medier(id, ressurs_id, storage_sti, alt_tekst, alt_tekst_kilde) (026 + 095).
--   dokumenter(id, status) (026 + 091).  dokument_type(id, forelder_id, kilde_tid) (100).
--   dokument_dokumenttype(dokument_id, dokument_type_id) (103).
--   ressurs_dokument(ressurs_id, dokument_id) (091B).
--   redaksjonell_ko(id, type, dokument_id, status, beskrivelse) (093; CHECK type∈22-lista,
--     status∈('ny','under_arbeid','lost','avvist'); 'annet' er en tillatt type).
--
-- HVA (tre deler):
--   1. samlinger.nokkel (text, nullable) + unik indeks der nokkel is not null. nokkel='tl-dans'
--      på TL-dans-samlingen (8f827d19…, laget i 113). Nøkkelen gir en STABIL peker fra Min side
--      til én bestemt samling, uten å hardkode en uuid i frontend.
--   2. De 11 /redaksjon/-bildene: fjern «Foto: »/«Illustrasjon: » fra STARTEN av alt_tekst, og
--      gjør første bokstav stor. (De ble lastet opp 10. sep med prefiks; alt_tekst_kilde='menneske'
--      og røres ikke. Prefiks er redaksjonell metadata, ikke en beskrivelse av bildet — WCAG.)
--   3. Én redaksjonskø-rad per publisert tilleggsdokument (kilde_tid 910/924, rekursivt) UTEN
--      rad i ressurs_dokument — de er ikke koblet til noen lek. type='annet' (se VALG under).
--
-- TYPEVALG FOR DEL 3 (begrunnet): ingen av de 22 kø-typene i 093 betyr presist «tilleggsdokument
--   mangler lek-kobling». 'kategori_uavklart' ville feilaktig påstå at KATEGORIEN er feil (den er
--   riktig — dokumentet ER tilleggsmateriale); problemet er den manglende koblingen. 'annet'
--   (sekkebøtta) er derfor det ærlige valget, med beskrivelsen som forklarer handlingen. dokument_id
--   settes uansett, så rk_minst_ett_subjekt er oppfylt.
--
-- SPERRER (raise FØR skriving): del 1 — samlingen finnes og har nb-tittel «TL-dans»; del 2 —
--   nøyaktig 11 prefiks-bilder før, 0 etter, ingen andre medier endret, alt_tekst_kilde uendret;
--   del 3 — nøyaktig 4 ukoblede tilleggsdokumenter, og ingen ÅPEN kø-rad med samme beskrivelse
--   finnes (idempotens: en ny kjøring stopper rent, ingenting committes).
--
-- EGENSKAPER: Additiv (kun en ny kolonne, ingen create table) · idempotent stopp ved re-kjøring
--   · ÉN transaksjon. Kolonnen nokkel arver samlinger sine grants (093B: authenticated har select).
--
-- TILBAKERULLING (etter commit, hvis nødvendig):
--   begin;
--   update samlinger set nokkel = null where nokkel = 'tl-dans';
--   -- (del 2 og 3 rulles ikke trivielt tilbake; se claude-leveransenotat for skisse.)
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- DEL 1 (DDL, additiv): kolonne + unik indeks. Idempotent (if not exists).
-- ----------------------------------------------------------------------------
alter table samlinger add column if not exists nokkel text;
create unique index if not exists idx_samlinger_nokkel on samlinger (nokkel) where nokkel is not null;

-- ----------------------------------------------------------------------------
-- Momentbilder + kandidater (kun lesing — ingen skriving før sperrene har bitt).
-- ----------------------------------------------------------------------------
-- Alle medier FØR, for urørt-sperren (ingen andre enn de 11 endres; kilde uendret).
create temp table tmp_medier_snapshot on commit drop as
  select id, alt_tekst, alt_tekst_kilde from medier;

-- De 11 målradene (id + gammel tekst), for «endret seg faktisk»- og «ingen andre»-sperrene.
create temp table tmp_alttekst_maal on commit drop as
  select id, alt_tekst as gammel from medier
  where storage_sti like '%/redaksjon/%'
    and (alt_tekst like 'Foto: %' or alt_tekst like 'Illustrasjon: %');

-- Del 3-kandidatene: publiserte dokumenter i subtreet under kilde_tid 910/924 (rekursivt,
-- samme logikk som etterkommerIder i src/lib/dokumentTre.js) uten rad i ressurs_dokument.
create temp table tmp_tillegg_ukoblet on commit drop as
with recursive tillegg_tre(id) as (
  select id from dokument_type where kilde_tid in (910, 924)
  union all
  select dt.id from dokument_type dt join tillegg_tre tt on dt.forelder_id = tt.id
)
select distinct d.id as dokument_id
from dokumenter d
join dokument_dokumenttype dd on dd.dokument_id = d.id
join tillegg_tre tt on tt.id = dd.dokument_type_id
where d.status = 'publisert'
  and not exists (select 1 from ressurs_dokument rd where rd.dokument_id = d.id);

-- ----------------------------------------------------------------------------
-- SPERRER FØR (raise før enhver skriving).
-- ----------------------------------------------------------------------------
do $$
declare
  n int;
  v_tldans uuid := '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
begin
  -- DEL 1: TL-dans-samlingen finnes og har nb-tittel «TL-dans».
  if not exists (select 1 from samlinger where id = v_tldans) then
    raise exception 'STOPP 117 (del 1): TL-dans-samlingen (%) finnes ikke.', v_tldans;
  end if;
  if not exists (select 1 from samling_innhold
                 where samling_id = v_tldans and sprak = 'nb' and tittel = 'TL-dans') then
    raise exception 'STOPP 117 (del 1): samling_innhold nb-tittel for % er ikke «TL-dans».', v_tldans;
  end if;

  -- DEL 2: nøyaktig 11 prefiks-bilder (/redaksjon/, Foto:/Illustrasjon:) FØR.
  select count(*) into n from tmp_alttekst_maal;
  if n <> 11 then
    raise exception 'STOPP 117 (del 2): forventet 11 prefiks-bilder under /redaksjon/, fant % — enten allerede kjørt, eller datagrunnlaget er et annet.', n;
  end if;

  -- DEL 3: nøyaktig 4 ukoblede publiserte tilleggsdokumenter.
  select count(*) into n from tmp_tillegg_ukoblet;
  if n <> 4 then
    raise exception 'STOPP 117 (del 3): forventet 4 ukoblede tilleggsdokumenter (kilde_tid 910/924), fant %.', n;
  end if;

  -- DEL 3 idempotens: ingen ÅPEN kø-rad med samme beskrivelse finnes for noen av dem.
  select count(*) into n from redaksjonell_ko rk
   where rk.beskrivelse = 'Tilleggsmateriale til leker uten kobling til noen lek – koble til riktig lek eller flytt til annen kategori.'
     and rk.status in ('ny','under_arbeid')
     and rk.dokument_id in (select dokument_id from tmp_tillegg_ukoblet);
  if n <> 0 then
    raise exception 'STOPP 117 (del 3, allerede kjørt): % åpen kø-rad med samme beskrivelse finnes allerede.', n;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- DEL 1 (skriv): sett nokkel.
-- ----------------------------------------------------------------------------
update samlinger set nokkel = 'tl-dans'
 where id = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';

-- ----------------------------------------------------------------------------
-- DEL 2 (skriv): fjern prefiks + stor forbokstav. Kun de 11 /redaksjon/-radene.
-- 'Foto: ' = 6 tegn (substr fra 7); 'Illustrasjon: ' = 14 tegn (substr fra 15).
-- upper(left(rest,1)) er no-op på tegn som ikke er liten bokstav → trygt for allerede store.
-- ----------------------------------------------------------------------------
update medier m
   set alt_tekst = upper(left(s.rest, 1)) || substr(s.rest, 2)
  from (
    select id,
      case
        when alt_tekst like 'Foto: %'         then substr(alt_tekst, 7)
        when alt_tekst like 'Illustrasjon: %' then substr(alt_tekst, 15)
      end as rest
    from medier
    where storage_sti like '%/redaksjon/%'
      and (alt_tekst like 'Foto: %' or alt_tekst like 'Illustrasjon: %')
  ) s
 where m.id = s.id;

-- ----------------------------------------------------------------------------
-- DEL 3 (skriv): én kø-rad per ukoblet tilleggsdokument. type='annet', status='ny'.
-- ----------------------------------------------------------------------------
insert into redaksjonell_ko (type, dokument_id, status, beskrivelse)
select 'annet', dokument_id, 'ny',
       'Tilleggsmateriale til leker uten kobling til noen lek – koble til riktig lek eller flytt til annen kategori.'
from tmp_tillegg_ukoblet;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER.
-- ----------------------------------------------------------------------------
do $$
declare
  n int;
  v_tldans uuid := '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea';
begin
  -- DEL 1: nokkel satt + unik indeks finnes.
  if not exists (select 1 from samlinger where id = v_tldans and nokkel = 'tl-dans') then
    raise exception 'STOPP 117 (etter, del 1): nokkel «tl-dans» ble ikke satt.';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_samlinger_nokkel') then
    raise exception 'STOPP 117 (etter, del 1): unik indeks idx_samlinger_nokkel mangler.';
  end if;

  -- DEL 2: 0 prefiks-bilder igjen.
  select count(*) into n from medier
   where storage_sti like '%/redaksjon/%'
     and (alt_tekst like 'Foto: %' or alt_tekst like 'Illustrasjon: %');
  if n <> 0 then raise exception 'STOPP 117 (etter, del 2): % prefiks-bilder igjen, forventet 0.', n; end if;

  -- DEL 2: ingen medier UTENFOR de 11 fikk endret alt_tekst.
  select count(*) into n from tmp_medier_snapshot s
   where s.id not in (select id from tmp_alttekst_maal)
     and not exists (select 1 from medier m where m.id = s.id and m.alt_tekst is not distinct from s.alt_tekst);
  if n <> 0 then raise exception 'STOPP 117 (etter, del 2): % medier utenfor de 11 fikk endret alt_tekst.', n; end if;

  -- DEL 2: alt_tekst_kilde uendret for ALLE medier.
  select count(*) into n from tmp_medier_snapshot s
   where not exists (select 1 from medier m where m.id = s.id and m.alt_tekst_kilde is not distinct from s.alt_tekst_kilde);
  if n <> 0 then raise exception 'STOPP 117 (etter, del 2): % medier fikk endret alt_tekst_kilde.', n; end if;

  -- DEL 2: alle 11 målrader ble faktisk endret (prefikset fjernet ⇒ ny tekst).
  select count(*) into n from tmp_alttekst_maal t
   join medier m on m.id = t.id
   where m.alt_tekst = t.gammel;
  if n <> 0 then raise exception 'STOPP 117 (etter, del 2): % av de 11 prefiks-bildene ble ikke endret.', n; end if;

  -- DEL 3: nøyaktig 4 nye kø-rader.
  select count(*) into n from redaksjonell_ko
   where beskrivelse = 'Tilleggsmateriale til leker uten kobling til noen lek – koble til riktig lek eller flytt til annen kategori.'
     and status = 'ny';
  if n <> 4 then raise exception 'STOPP 117 (etter, del 3): forventet 4 nye kø-rader, fant %.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'tl-dans nokkel satt: '  || (select count(*) from samlinger where id = '8f827d19-f81c-2c61-1bbb-3c4f1c34b4ea' and nokkel = 'tl-dans'),
  'alt-tekster rettet: '   || (select count(*) from tmp_alttekst_maal),
  'kø-rader lagt til: '     || (select count(*) from redaksjonell_ko
                                where beskrivelse = 'Tilleggsmateriale til leker uten kobling til noen lek – koble til riktig lek eller flytt til annen kategori.'
                                  and status = 'ny'),
  'prefiks igjen: '        || (select count(*) from medier
                                where storage_sti like '%/redaksjon/%'
                                  and (alt_tekst like 'Foto: %' or alt_tekst like 'Illustrasjon: %'))
) as kvittering;

commit;
