-- ============================================================================
-- 094_struktur_additivt.sql — STRUKTUR/TAKSONOMI (additivt + case-vern)
-- Skrevet 3. sep 2026 av Cowork (Claude). Grunnlag: claude_094-SPESIFIKASJON-3sep.md
-- + claude_FORSJEKK-094-095-SAMLET-3sep.md, med Kjartans beslutninger 3. sep.
-- ============================================================================
--
-- HVA: rent additive endringer + strukturelt case-vern, pluss den siste Move It-
-- rettelsen (tl_hjul_kategori). Kan ikke oedelegge eksisterende data. Idempotent.
--
-- BESLUTNINGER 3. sep innarbeidet:
--  * dokument_type-hierarkiet (spec punkt 2) er TATT UT av 094. CSV-ens forelder-navn
--    er tvetydige («Informasjon» finnes 3 ganger), og forsjekken fant at et globalt
--    unique(lower(navn)) paa dokument_type ville motsi nettopp de dublettnavnene.
--    Riktig form er unique(forelder_id, lower(navn)); den + seeden krever en egen
--    innholdsbeslutning og kommer i en senere, egen migrasjon (kilde_tid foelger med).
--  * tl_hjul_kategori «Move it» → «Move It» er lagt i 094 (ikke 094B), etter beslutning.
--  * Slettingen av «Uten utstyr» ligger i 094B (egen fil), som spec-en anbefaler.
--
-- CASE-VERN: unique(lower(navn)) legges paa kategorier/utstyr/egnet_kategori — laerdommen
-- fra Move It-saken gjort strukturell: samme navn kan ikke finnes i to skrivemaater.
-- (fag/sesong er valgfrie i spec og utelatt her; dokument_type er ute, se over.) En guard
-- hever tydelig hvis en case-dublett alt finnes, FOER indeksen legges.
-- ============================================================================

begin;

-- 1) ressurs_innhold: prosa-felt + raatekst (ETAPPE5 pkt 0 + beslutning B) -----
alter table ressurs_innhold add column if not exists beskrivelse     text;
alter table ressurs_innhold add column if not exists antall_raatekst text;

-- 1b) soekevektor-trigger: legg beskrivelse paa vekt C (som 024, + beskrivelse).
--     antall_raatekst skal IKKE inn i vektoren (tall er ikke soekbar prosa).
create or replace function fase3_oppdater_sokevektor() returns trigger
language plpgsql as $$
declare cfg regconfig;
begin
  cfg := case new.sprak when 'sv' then 'swedish'::regconfig
                        when 'en' then 'english'::regconfig
                        else 'norwegian'::regconfig end;
  new.sokevektor :=
    setweight(to_tsvector(cfg, coalesce(new.tittel,'')), 'A') ||
    setweight(to_tsvector(cfg, coalesce(new.formaal,'')), 'B') ||
    setweight(to_tsvector(cfg, coalesce(new.beskrivelse,'') || ' ' ||
      coalesce(new.forberedelse,'') || ' ' ||
      coalesce(new.kronologi,'') || ' ' || coalesce(new.regler,'') || ' ' ||
      coalesce(new.variasjoner,'') || ' ' || coalesce(new.inndeling,'') || ' ' ||
      coalesce(new.utgangsposisjon,'') || ' ' || coalesce(new.instruktoernotat,'')), 'C');
  new.oppdatert_at := now();
  return new;
end $$;
-- Triggeren trg_sokevektor (024) peker alt paa funksjonen — uendret. Eksisterende rader
-- faar ny vektor ved neste update; importen skriver ferske rader som faar den ved insert.

-- 4) samling_ressurs.seksjon (SAMLINGER hull B) --------------------------------
alter table samling_ressurs add column if not exists seksjon text;

-- 5) egnet_kategori: idempotent re-seed av de fire 038-verdiene, saa «gi boksene deres
--    verdier» er fanget som nummerert migrasjon (038 var UTKAST). No-op om de finnes.
insert into egnet_kategori (navn, rekkefolge) values
  ('Sosial kompetanse', 9),
  ('TL-Mester', 10),
  ('Leker for 100+ elever', 11),
  ('Barnehage', 12)
on conflict (navn) do nothing;

-- 3) Case-vern: unique(lower(navn)). Guard FOERST (forsjekk F skal vaere 0). -----
do $$
declare r record;
begin
  for r in
        select 'kategorier'     as t, lower(navn) as n, count(*) as c from kategorier     group by lower(navn) having count(*) > 1
    union all select 'utstyr',         lower(navn),      count(*)        from utstyr         group by lower(navn) having count(*) > 1
    union all select 'egnet_kategori', lower(navn),      count(*)        from egnet_kategori group by lower(navn) having count(*) > 1
  loop
    raise exception 'Case-dublett i %: «%» finnes % ganger. Slaa sammen/omdoep FOER unique(lower(navn)) legges.', r.t, r.n, r.c;
  end loop;
end $$;

create unique index if not exists uq_kategorier_lower_navn     on kategorier     (lower(navn));
create unique index if not exists uq_utstyr_lower_navn         on utstyr         (lower(navn));
create unique index if not exists uq_egnet_kategori_lower_navn on egnet_kategori (lower(navn));

-- 7) tl_hjul_kategori: global «Move it» → «Move It» (beslutning 3. sep; siste rest).
--    Laast til den globale seed-radens id + belte-og-bukseseler (skole_id null, lower=move it).
--    Skolespesifikke «move it»-rader (brukerdata) roeres IKKE. ux_tl_hjul_kategori_global
--    ville hevet hoeyt om en global «Move It» alt fantes (forsjekk I: 0). Idempotent.
update tl_hjul_kategori set navn = 'Move It'
  where id = 'e519af66-6ca1-479e-897c-2cd1c715b117'
    and skole_id is null
    and lower(navn) = 'move it';

commit;
