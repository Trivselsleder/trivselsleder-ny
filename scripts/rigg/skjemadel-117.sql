-- SKJEMADEL UTDRATT fra 117_samling_nokkel_alttekst_tilleggsko.sql (linje 54–55, verbatim).
-- Resten av 117 er DML bak sperrer (TL-dans-samling, /redaksjon/-alt-tekster,
-- tilleggsdokument-kø) og har ingen skjemaeffekt. Dette er den ENESTE skjemaendringen
-- i 117: ny nullable kolonne + partiell unik indeks på samlinger. Byggeren verifiserer
-- at disse to linjene fortsatt finnes ordrett i migrasjonen før den bruker uttrekket.
alter table samlinger add column if not exists nokkel text;
create unique index if not exists idx_samlinger_nokkel on samlinger (nokkel) where nokkel is not null;
