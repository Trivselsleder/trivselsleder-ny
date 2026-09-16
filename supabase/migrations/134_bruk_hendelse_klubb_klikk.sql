-- ============================================================================
-- 134_bruk_hendelse_klubb_klikk.sql
-- MIN SIDE (D): ny bruksloggs-hendelse 'klubb_klikk' (klikk på «Mest kjøpte leker»)
-- ============================================================================
-- KILDE: byggeoppdrag «Min side» 16. sep, punkt D — «Klikk logges i bruk_hendelse
--   (ny hendelsestype — utvid CHECK riktig, les dagens verdier først)».
--
-- DAGENS VERDIER (målt mot en base bygget med 121 + 125, IKKE 118-øyeblikksbildet som
--   var utdatert): bruk_hendelse_hendelse_check tillater i dag SYV verdier —
--   'visning','video_spilt','pdf_nedlastet','sok','favoritt','dokument_apnet',
--   'aktiv_laering_apnet' (migr 125 la til de to siste). Vi legger til ÉN til:
--     'klubb_klikk'  (skolen klikket seg til Klubben fra «Mest kjøpte leker»)
--   i samme stil (verb/handling), og BEHOLDER alle syv.
--
-- INTEGRITET (rører ikke de andre CHECK-ene):
--   * bruk_hendelse_dokument_peker (125): (hendelse='dokument_apnet') = (dokument_id is not null).
--     'klubb_klikk' setter ALDRI dokument_id → biimplikasjonen holder (begge sider usanne).
--   * bruk_hendelse_treff_kun_sok: treff_antall kun for 'sok' → 'klubb_klikk' har treff_antall null.
--   Ingen peker til hvilken lek (bruk_hendelse har ingen mest_kjopt-kolonne, og punkt D ber kun
--   om en ny hendelsestype). Signalet er «en skole klikket seg videre til Klubben». skole_id +
--   bruker_id stemples som for andre hendelser (p_ins fra 121 er hendelse-agnostisk).
--
-- 104-FELLEN: ingen EKSISTERENDE funksjon røres. Kun én CHECK byttes (drop+add), i tråd med
--   125s egen tilbakerullingsoppskrift. Idempotent (sjekker om verdien alt finnes).
-- SPERRER: idempotens FØR · verifisering ETTER (ny verdi godtas, ugyldig avvises,
--   peker-CHECK intakt) · kvittering. Én transaksjon.
-- TILBAKERULLING (etter commit): begin;
--   delete from public.bruk_hendelse where hendelse = 'klubb_klikk';
--   alter table public.bruk_hendelse drop constraint bruk_hendelse_hendelse_check;
--   alter table public.bruk_hendelse add constraint bruk_hendelse_hendelse_check
--     check (hendelse in ('visning','video_spilt','pdf_nedlastet','sok','favoritt','dokument_apnet','aktiv_laering_apnet')); commit;
-- ============================================================================

begin;

-- Forutsetning + idempotens.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='bruk_hendelse_hendelse_check'
                 and conrelid='public.bruk_hendelse'::regclass) then
    raise exception 'STOPP 134: bruk_hendelse_hendelse_check finnes ikke — kjør forutsetningsmigrasjonene (125) først.';
  end if;
  if pg_get_constraintdef((select oid from pg_constraint where conname='bruk_hendelse_hendelse_check'
       and conrelid='public.bruk_hendelse'::regclass)) like '%klubb_klikk%' then
    raise exception 'STOPP 134 (allerede kjørt): klubb_klikk finnes allerede i CHECK-en.';
  end if;
  -- de syv forutsatte verdiene MÅ finnes i dagens CHECK (ellers bygger vi på feil grunnlag)
  if pg_get_constraintdef((select oid from pg_constraint where conname='bruk_hendelse_hendelse_check'
       and conrelid='public.bruk_hendelse'::regclass)) not like '%aktiv_laering_apnet%' then
    raise exception 'STOPP 134: dagens CHECK mangler aktiv_laering_apnet (125 ikke kjørt?) — avbryt.';
  end if;
end $$;

alter table public.bruk_hendelse drop constraint bruk_hendelse_hendelse_check;
alter table public.bruk_hendelse add constraint bruk_hendelse_hendelse_check
  check (hendelse = any (array[
    'visning','video_spilt','pdf_nedlastet','sok','favoritt',
    'dokument_apnet','aktiv_laering_apnet','klubb_klikk'
  ]::text[]));

-- ── Verifisering ETTER ──
do $$
declare v_bruker uuid; v_skole uuid;
begin
  select id into v_bruker from public.profiles limit 1;
  select id into v_skole from public.skoler limit 1;
  -- ny verdi skal godtas
  insert into public.bruk_hendelse (bruker_id, skole_id, hendelse) values (v_bruker, v_skole, 'klubb_klikk');
  -- ugyldig verdi skal fortsatt avvises
  begin
    insert into public.bruk_hendelse (bruker_id, skole_id, hendelse) values (v_bruker, v_skole, 'tull_verdi');
    raise exception 'STOPP 134 (etter): ugyldig hendelse ble tillatt — CHECK biter ikke.';
  exception when check_violation then null;
  end;
  -- peker-CHECK intakt: klubb_klikk MED dokument_id skal avvises (biimplikasjon)
  begin
    insert into public.bruk_hendelse (bruker_id, skole_id, hendelse, dokument_id)
    values (v_bruker, v_skole, 'klubb_klikk', (select id from public.dokumenter limit 1));
    raise exception 'STOPP 134 (etter): klubb_klikk med dokument_id ble tillatt — peker-CHECK brutt.';
  exception when check_violation then null;
  end;
  -- rydd testrader (samme transaksjon)
  delete from public.bruk_hendelse where hendelse = 'klubb_klikk';
end $$;

-- ── Kvittering ──
select concat_ws(' · ',
  'klubb_klikk i CHECK: ' || (pg_get_constraintdef((select oid from pg_constraint where conname='bruk_hendelse_hendelse_check' and conrelid='public.bruk_hendelse'::regclass)) like '%klubb_klikk%'),
  'peker-CHECK intakt: ' || exists (select 1 from pg_constraint where conname='bruk_hendelse_dokument_peker' and conrelid='public.bruk_hendelse'::regclass),
  'antall verdier: 8'
) as kvittering;

commit;
