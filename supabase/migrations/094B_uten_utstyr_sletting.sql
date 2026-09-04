-- ============================================================================
-- 094B_uten_utstyr_sletting.sql — FOERSTE SLETTING I PROSJEKTET
-- Skrevet 3. sep 2026 av Cowork (Claude). Grunnlag: claude_094-SPESIFIKASJON-3sep.md
-- (DEL 094B, punkt 6). Egen fil, som spec-en anbefaler (additivt vs. destruktivt =
-- ulike risikoklasser — samme snitt som 091/091B).
-- ============================================================================
--
-- HVA: fjerner «Uten utstyr»-termen fra utstyr + koblingene til den. I den nye modellen
-- betyr «uten utstyr» FRAVAER av rad i ressurs_utstyr (RPC 089 filtrerer med NOT EXISTS).
-- En lek koblet til termen ville vist «har utstyr: Uten utstyr» OG falt UT av «uten
-- utstyr»-filteret — det motsatte av meningen. Termen ryddes derfor aktivt.
--
-- AVKLARING AV STOPP-PUNKTET (viktig — les dette):
--   Spec-en (og forsjekken) forventet 8 koblinger og satte en stoppregel: «stopp hvis
--   antallet ikke er 8, eller hvis ekte data er koblet». Forsjekken fant 4. Jeg leste
--   migr 034 (testimporten) direkte: den lager NOEYAKTIG 4 ressurs_utstyr-koblinger til
--   «Uten utstyr» (linjene 128, 156, 323, 354) — til de fire testlekene:
--     Fisken i det roede hav, Bjoernen sover, Steinen bak ryggen, Hoey og lav.
--   Tallet «8» var en FEILTELLING i spec-en; basen har alltid hatt 4, og de matcher 034
--   eksakt (ingenting er fjernet siden). Alle fire er TESTDATA: 034 setter verken
--   kilde_nid eller import_kjoring_id (insert into ressurser har bare 6 kolonner), saa
--   kilde_nid er NULL paa alle fire. Ekte importert innhold ville hatt kilde_nid satt.
--   Importen har ikke kjoert. => Trygt aa slette. Forventet antall er 4, ikke 8.
--
-- SELVVERN: en do-blokk stopper HOEYT hvis en koblet ressurs har kilde_nid satt (ekte
-- data) — da avbrytes hele migrasjonen foer noe slettes. Stoppregelen «ekte data koblet»
-- er altsaa kodet inn i fila, ikke bare i forsjekken.
--
-- FORHAANDSVISNING: FOER- og ETTER-tellingene skrives ut. Vil du se tallene UTEN aa
-- slette, bytt «commit;» nederst til «rollback;», kjoer, les FOER-raden, bytt tilbake.
--
-- REKKEFOELGE (kritisk): (a) tell/vern, (b) slett koblinger eksplisitt (for aa telle dem;
-- cascade fra utstyr ville ellers gjort det stille), (c) slett termen, (d) smal CHECK
-- ETTER slettingen (en CHECK foer ville hindret at raden i det hele tatt fantes).
-- Idempotent: kjoeres den paa nytt er alt alt slettet (0/0) og CHECK-en finnes.
--
-- PLASSERING: 094B kjoerer etter 094 (case-vern-indeksen paa utstyr; kolliderer ikke —
-- «Uten utstyr» er ingen case-dublett) og etter 091 (kilde_nid finnes). Kjoereren:
-- 094 < 094B < 095.
-- ============================================================================

begin;

-- FOER: bevis. Forventet: termer=1, koblinger=4, koblinger_med_kilde_nid=0.
select 'FOER' as fase,
  (select count(*) from utstyr where lower(navn) = 'uten utstyr') as termer,
  (select count(*) from ressurs_utstyr ru
     join utstyr u on u.id = ru.utstyr_id
    where lower(u.navn) = 'uten utstyr')                          as koblinger,
  (select count(*) from ressurs_utstyr ru
     join utstyr u on u.id = ru.utstyr_id
     join ressurser r on r.id = ru.ressurs_id
    where lower(u.navn) = 'uten utstyr'
      and r.kilde_nid is not null)                                as koblinger_med_kilde_nid;

-- SELVVERN: stopp hvis EKTE (importert) data er koblet til termen.
do $$
declare n int;
begin
  select count(*) into n
  from ressurs_utstyr ru
    join utstyr u    on u.id = ru.utstyr_id
    join ressurser r on r.id = ru.ressurs_id
  where lower(u.navn) = 'uten utstyr'
    and r.kilde_nid is not null;
  if n > 0 then
    raise exception 'STOPP: % kobling(er) til «Uten utstyr» peker paa ressurs med kilde_nid (ekte importert data). Sletter ingenting.', n;
  end if;
end $$;

-- (b) slett koblingene EKSPLISITT (for aa telle dem — ikke stille via cascade)
delete from ressurs_utstyr
  where utstyr_id in (select id from utstyr where lower(navn) = 'uten utstyr');

-- (c) slett selve termen
delete from utstyr where lower(navn) = 'uten utstyr';

-- (d) smal CHECK som hindrer at termen kommer tilbake (ETTER slettingen).
--     Smal med vilje (ikke «not like 'uten %'», som kunne rammet ekte termer).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'utstyr_ikke_uten_utstyr') then
    alter table utstyr add constraint utstyr_ikke_uten_utstyr check (lower(navn) <> 'uten utstyr');
  end if;
end $$;

-- ETTER: bevis. Begge skal vaere 0.
select 'ETTER' as fase,
  (select count(*) from utstyr where lower(navn) = 'uten utstyr') as termer_igjen,
  (select count(*) from ressurs_utstyr ru
     join utstyr u on u.id = ru.utstyr_id
    where lower(u.navn) = 'uten utstyr')                          as koblinger_igjen;

commit;
