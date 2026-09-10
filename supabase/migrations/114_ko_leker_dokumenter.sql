-- ============================================================================
-- 114_ko_leker_dokumenter.sql — redaksjonskøen: leker, dokumenter og kø-lukking
-- ============================================================================
-- KILDE (fasit): claude_KO-VURDERINGER-FORSLAG-10sep.md + Kjartans rettelser R1–R5.
--   Nid-lister og antall-verdier er utledet ved å kjøre importens EGEN logikk
--   (regler.mjs regelAntall) og lese field_lang/field_type_document i 240826-eksporten
--   (game-nodes.json / Content/document-nodes.json). Tallene er verifisert mot rapportens.
--
-- HVA (én transaksjon):
--   A) Avpubliser «Test» (nid 20062) — status → 'arkivert' (024: utkast/publisert/arkivert).
--      MERK: «Test» ble EKSKLUDERT fra lek-strømmen (TESTNODE-filter i byggKontekst) og
--      ble ALDRI importert. Oppdateringen treffer derfor trolig 0 rader; n rapporteres.
--   B) Antall på 11 leker: 4.1 (6 racket-leker: bekreft intervall 2–4) + 4.2 (5 leker:
--      sett verdier lest ut av teksten). Match på kilde_nid.
--   C) 63 «Aktiv læring»-dokumenter med språkkode «en» → dokument_fag = Engelsk DER
--      dokumentet ikke allerede har et fag (forslag 7a). Match på kilde_nid.
--   D) dokument_sprak-CHECK utvides til ('nb','nn','en') (samme constraint-navn) og «en»
--      settes på de 14 ekte engelske oversettelsene (forslag 7b/R3). Match på kilde_nid.
--   E) 2 PDF-er (nid 5982, 6833): storage_sti (dokumentets fil-kolonne) settes til den
--      offentlige URL-en til de nye filene under importfiler/redaksjon/dokumenter/ (samme
--      form som redaksjon-opplastede filer, jf. LekRedigering). Sperre krever at objektene
--      finnes i storage.objects med riktig størrelse, ellers STOPP «PDF ikke lastet opp».
--   F) Lukk kø-radene som er håndtert av 112–114 (status 'lost'). Alt annet står åpent —
--      spesielt de 6 «/tl-dans»-lenke_ulost-radene (samling→samling mangler i modellen).
--
-- SPERRER: «allerede kjørt»-stopp (CHECK-en tillater alt «en»), fag Engelsk finnes, begge
--   PDF-objektene finnes med riktig størrelse. ETTER-sperre teller lukkede kø-rader per
--   type og bekrefter at de 6 TL-dans-radene fortsatt er åpne.
--
-- TILBAKERULLING (etter commit, hvis nødvendig — skisse):
--   * antall/status/storage_sti/dokument_fag/dokument_sprak: sett tilbake manuelt per kilde_nid.
--   * kø: update redaksjonell_ko set status='ny', lost_at=null, lost_av=null where ... (de lukkede).
--   * CHECK: drop + add check (sprak in ('nb','nn'))  (kun hvis ingen 'en'-rader finnes).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SPERRER FØR
-- ----------------------------------------------------------------------------
do $$
declare v_def text;
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint where conname = 'dokument_sprak_sprak_check';
  if v_def is null then
    raise exception 'STOPP 114: constraint dokument_sprak_sprak_check finnes ikke — kjør 103 først.';
  end if;
  if v_def like '%''en''%' then
    raise exception 'STOPP 114 (allerede kjørt): dokument_sprak_sprak_check tillater allerede «en» (%). Ingenting endret.', v_def;
  end if;
  if not exists (select 1 from fag where lower(navn) = lower('Engelsk')) then
    raise exception 'STOPP 114: fag «Engelsk» mangler (kjør 103-fagseed først).';
  end if;
  -- PDF-sperre: begge de opplastede objektene finnes med riktig størrelse.
  if not exists (select 1 from storage.objects
                 where bucket_id = 'importfiler'
                   and name = 'redaksjon/dokumenter/kurshefte_host_2020.pdf'
                   and metadata->>'size' = '9953531') then
    raise exception 'STOPP 114: PDF ikke lastet opp — redaksjon/dokumenter/kurshefte_host_2020.pdf (forventet 9953531 bytes) finnes ikke i storage.objects.';
  end if;
  if not exists (select 1 from storage.objects
                 where bucket_id = 'importfiler'
                   and name = 'redaksjon/dokumenter/kunnskapsbattle_redigerbar.pdf'
                   and metadata->>'size' = '282337') then
    raise exception 'STOPP 114: PDF ikke lastet opp — redaksjon/dokumenter/kunnskapsbattle_redigerbar.pdf (forventet 282337 bytes) finnes ikke i storage.objects.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- A) Avpubliser «Test» (nid 20062). Trolig 0 rader (aldri importert) — ikke en feil.
-- ----------------------------------------------------------------------------
update ressurser set status = 'arkivert'
where kilde_nid = '20062' and status <> 'arkivert';

-- ----------------------------------------------------------------------------
-- B) Antall på 11 leker (match på kilde_nid).
-- ----------------------------------------------------------------------------
-- 4.1 (6): bekreft intervall 2–4 (importen satte det alt; idempotent).
update ressurser set antall_min = 2, antall_maks = 4
where kilde_nid in ('1286','2854','2855','2857','2858','1232');
-- 4.2 (5): verdier lest ut av Antall-teksten.
update ressurser set antall_min = 10, antall_maks = 20   where kilde_nid = '1260';  -- Dirigenten
update ressurser set antall_min = 8,  antall_maks = null  where kilde_nid = '1332';  -- Ballbingehåndball
update ressurser set antall_min = 2,  antall_maks = 8     where kilde_nid = '2795';  -- Scoop
update ressurser set antall_min = 1,  antall_maks = 2     where kilde_nid = '2806';  -- Frisbee Freestyle
update ressurser set antall_min = 1,  antall_maks = null  where kilde_nid = '2887';  -- Slakk line

-- ----------------------------------------------------------------------------
-- C) 63 «Aktiv læring»-en-dokumenter → dokument_fag = Engelsk DER ingen fag finnes.
-- ----------------------------------------------------------------------------
insert into dokument_fag(dokument_id, fag_id)
select d.id, (select id from fag where lower(navn) = lower('Engelsk'))
from dokumenter d
where d.kilde_nid in (
    '11177','11310','11311','11315','11320','11430','11431','11432','11433','12362',
    '13157','13484','13487','13489','13672','14506','14508','14509','14510','14657',
    '15199','1617','17512','17694','19747','19815','19817','20036','20037','3975',
    '3977','3978','3980','3990','3992','4183','4184','4185','4246','4406',
    '4409','4413','5283','5284','5285','5286','5297','5298','5375','5378',
    '5379','5380','5381','5382','5383','5415','5416','790','801','812',
    '8404','864','901')
  and not exists (select 1 from dokument_fag df where df.dokument_id = d.id)
on conflict (dokument_id, fag_id) do nothing;

-- ----------------------------------------------------------------------------
-- D) dokument_sprak-CHECK → ('nb','nn','en') (samme navn) + «en» på de 14.
-- ----------------------------------------------------------------------------
alter table dokument_sprak drop constraint dokument_sprak_sprak_check;
alter table dokument_sprak add  constraint dokument_sprak_sprak_check check (sprak in ('nb','nn','en'));

insert into dokument_sprak(dokument_id, sprak)
select d.id, 'en'
from dokumenter d
where d.kilde_nid in (
    '937','14338','15687','16690','16695','16978','16979','917','931','933',
    '938','939','17686','18241')
on conflict (dokument_id, sprak) do nothing;

-- ----------------------------------------------------------------------------
-- E) 2 PDF-er: storage_sti → offentlig URL til opplastet fil (importfiler/redaksjon/…).
-- ----------------------------------------------------------------------------
update dokumenter set storage_sti = 'https://zpirjbrcbeubwpmtncxx.supabase.co/storage/v1/object/public/importfiler/redaksjon/dokumenter/kurshefte_host_2020.pdf'
where kilde_nid = '5982';
update dokumenter set storage_sti = 'https://zpirjbrcbeubwpmtncxx.supabase.co/storage/v1/object/public/importfiler/redaksjon/dokumenter/kunnskapsbattle_redigerbar.pdf'
where kilde_nid = '6833';

-- ----------------------------------------------------------------------------
-- F) LUKK KØ-RADENE som er håndtert av 112–114. status='lost', lost_at now(),
--    lost_av = Kjartans superadmin-UID. Alt annet står åpent.
-- ----------------------------------------------------------------------------
-- F1: antall_uavklart (de 11 lekene).
update redaksjonell_ko set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where status = 'ny' and type = 'antall_uavklart'
  and ressurs_id in (select id from ressurser where kilde_nid in
      ('1286','2854','2855','2857','2858','1232','1260','1332','2795','2806','2887'));

-- F2: tom_tekst (8907, 10143 — aksepteres uten brødtekst, forslag 3.2).
update redaksjonell_ko set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where status = 'ny' and type = 'tom_tekst'
  and ressurs_id in (select id from ressurser where kilde_nid in ('8907','10143'));

-- F3: fil_mangler (de 2 PDF-ene, nå lastet opp).
update redaksjonell_ko set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where status = 'ny' and type = 'fil_mangler'
  and dokument_id in (select id from dokumenter where kilde_nid in ('5982','6833'));

-- F4: språk-«en»-flagget (type 'annet', «utenfor 103-CHECK») for de 77 dokumentene
--     som er håndtert (63 fag + 14 språk). Andre 'annet'-rader (fag mangler o.l.) røres IKKE.
update redaksjonell_ko set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
where status = 'ny' and type = 'annet' and beskrivelse like '%utenfor 103-CHECK%'
  and dokument_id in (select id from dokumenter where kilde_nid in (
    -- 63 (7a):
    '11177','11310','11311','11315','11320','11430','11431','11432','11433','12362',
    '13157','13484','13487','13489','13672','14506','14508','14509','14510','14657',
    '15199','1617','17512','17694','19747','19815','19817','20036','20037','3975',
    '3977','3978','3980','3990','3992','4183','4184','4185','4246','4406',
    '4409','4413','5283','5284','5285','5286','5297','5298','5375','5378',
    '5379','5380','5381','5382','5383','5415','5416','790','801','812',
    '8404','864','901',
    -- 14 (7b):
    '937','14338','15687','16690','16695','16978','16979','917','931','933',
    '938','939','17686','18241'));

-- F5+F6: samling-forankrede lenke_ulost / lenke_upublisert som 113 håndterte.
--     Match på (samling.kilde_nid, type, alias i beskrivelsen). «tl-dans» er IKKE med
--     (samling→samling mangler i modellen) → de 6 radene forblir åpne.
update redaksjonell_ko rk set status = 'lost', lost_at = now(), lost_av = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
from samlinger s, (values
    ('15468','lenke_ulost','high-five-0'),
    ('15468','lenke_ulost','kjegleduellen-0'),
    ('15468','lenke_ulost','spagaten-0'),
    ('15468','lenke_ulost','alle-mot-alle-1'),
    ('15510','lenke_ulost','spagaten-0'),
    ('16212','lenke_ulost','popcorn-0'),
    ('15468','lenke_upublisert','stein-saks-papir-runden-1'),
    ('19389','lenke_upublisert','stein-saks-papir-runden-1'),
    ('19696','lenke_upublisert','stein-saks-papir-runden-1'),
    ('16072','lenke_upublisert','stein-saks-papir-runden-1'),
    ('15468','lenke_upublisert','alle-sammen-ut-av-huset')
  ) v(s_nid, ktype, alias)
where rk.samling_id = s.id and s.kilde_nid = v.s_nid
  and rk.type = v.ktype and rk.status = 'ny'
  and rk.beskrivelse like '%' || v.alias || '%';

-- ----------------------------------------------------------------------------
-- SPERRER ETTER: de 6 TL-dans-lenke_ulost skal fortsatt være åpne.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from redaksjonell_ko where type = 'lenke_ulost' and status = 'ny'
    and beskrivelse like '%tl-dans%';
  if n <> 6 then
    raise exception 'STOPP 114 (etter): forventet 6 åpne «tl-dans»-lenke_ulost, fant %. TL-dans-radene skal IKKE lukkes.', n;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad): antall endrede + lukket per type.
-- ----------------------------------------------------------------------------
select
  (select count(*) from ressurser where kilde_nid = '20062' and status = 'arkivert')                       as test_arkivert,
  (select count(*) from ressurser where kilde_nid in ('1286','2854','2855','2857','2858','1232') and antall_min=2 and antall_maks=4) as antall41_ok,
  (select count(*) from dokument_fag df join dokumenter d on d.id=df.dokument_id join fag f on f.id=df.fag_id
     where f.navn='Engelsk' and d.kilde_nid in ('11177','13157','790','901','20037'))                       as fag_engelsk_stikkprove,
  (select count(*) from dokument_sprak ds join dokumenter d on d.id=ds.dokument_id where ds.sprak='en')      as sprak_en,
  (select count(*) from dokumenter where kilde_nid in ('5982','6833') and storage_sti like 'https://%redaksjon/dokumenter/%') as pdf_satt,
  (select string_agg(type||':'||c, ', ' order by type) from (
      select type, count(*) c from redaksjonell_ko
      where status='lost' and lost_av='9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
      group by type) t)                                                                                     as lukket_per_type,
  (select count(*) from redaksjonell_ko where type='lenke_ulost' and status='ny' and beskrivelse like '%tl-dans%') as tldans_apne;

commit;
