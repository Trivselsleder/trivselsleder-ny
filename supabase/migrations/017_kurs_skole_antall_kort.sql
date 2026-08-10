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

ALTER TABLE kurs_skole ADD COLUMN IF NOT EXISTS antall_kort INTEGER;
