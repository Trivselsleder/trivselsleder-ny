-- ============================================================================
-- Denne filen er ryddet 3. sep 2026 for å gjøre gjenoppbygging fra bunnen mulig.
-- Den avviker bevisst fra SQL-en som faktisk bygget produksjonsbasen. Filen er en
-- GJENOPPBYGGINGS-OPPSKRIFT, ikke en historisk logg.
-- ============================================================================

-- Frosset kort-tall per skole på et kurs (N1).
--
-- antall_kort finnes ALLEREDE i den kjørende basen (lagt til direkte, utenom
-- migrasjonsfilene). Denne filen dokumenterer kolonnen så basen kan bygges opp
-- igjen fra kildene (jf. fremdriftsplan kap. 12.2 om migrasjonsgapet).
--
-- Verdien er antall trivselsledere + 10 %, rundet opp, låst ved midnatt på
-- kursdagen (via api/kurs/frys-kortantall.js + Vercel-cron). NULL = ikke frosset
-- ennå → grensesnittet viser den levende beregningen. En manuell overstyring
-- skriver også antall_kort, så en overstyrt rad regnes som frosset.

-- RYDDET 3. sep 2026: kurs_skole lages FØRST i 019 (etter denne fila). Ved gjenoppbygging
-- fra bunnen fantes tabellen ikke ennå, og «ADD COLUMN IF NOT EXISTS» hjalp ikke (det er
-- TABELLEN som mangler) — 017 krasjet med «relation kurs_skole does not exist» FØR 019.
-- Løsning: gjør ALTER-en betinget av at tabellen finnes. Ved gjenoppbygging hopper 017 over
-- (kurs_skole finnes ikke ennå), og antall_kort kommer fra 019s kurs_skole-CREATE (kolonnen
-- står allerede der). Mot prod (der kurs_skole finnes) er ALTER-en et no-op. Slik går ingen
-- ALTER før sin CREATE.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'kurs_skole') then
    alter table kurs_skole add column if not exists antall_kort integer;
  end if;
end $$;
