-- SKJEMADEL UTDRATT fra 114_ko_leker_dokumenter.sql (linje 108–109, verbatim).
-- Resten av 114 er DML bak sperrer (storage.objects-PDF-er, fag Engelsk, kø-lukking)
-- og har ingen skjemaeffekt. Dette er den ENESTE skjemaendringen i 114:
-- CHECK-en på dokument_sprak utvides med 'en'. Byggeren verifiserer at disse to
-- linjene fortsatt finnes ordrett i migrasjonen før den bruker uttrekket.
alter table dokument_sprak drop constraint dokument_sprak_sprak_check;
alter table dokument_sprak add  constraint dokument_sprak_sprak_check check (sprak in ('nb','nn','en'));
