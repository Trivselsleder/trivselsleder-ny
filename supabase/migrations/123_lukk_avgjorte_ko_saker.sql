-- ============================================================================
-- 123_lukk_avgjorte_ko_saker.sql — lukker Kjartans avgjorte saker i redaksjonskøen
-- ============================================================================
-- KILDE (fasit): Kjartans LÅSTE beslutninger 12. sep 2026, bygget på
--   claude_KO-FORSLAG-ALLE-11sep.md (Cowork B), claude_KO-FORSLAG-FORHAANDSSJEKK-12sep.md
--   (Cowork A, uavhengig trinn-join i prod), claude_KO-S65-S70-NY-RUNDE-12sep.md (Cowork A).
--   Saker identifiseres KUN på kø-id (uuid) — aldri på tittel (to leker kan dele tittel).
--
-- FEM GRUPPER (forventet antall = HARD SPERRE 60/4/12/3/3):
--   1) 60 usikker_maalkobling BEKREFT  → RPC bekreft_kompetansemaal_forslag (fra 118): setter
--      menneske-kobling, markerer forslaget 'godkjent', lukker kø-raden. RPC-en er laget nettopp
--      for dette; brukes derfor uendret. (S14/S17/S30/S49 er de 4 som IKKE er her — se gruppe 2.)
--   2) 4 usikker_maalkobling AVVIS (S14 Brøkkampen, S17 Finn ordklassen, S30 Kim's matematikk,
--      S49 Perform a text — de 4 uten trinn-overlapp, etterprøvd med direkte join i prod).
--      RPC-en har ingen avvis-vei → direkte: forslaget markeres 'avvist' (revisjonsspor, 092),
--      og kø-raden settes status='avvist' (ikke 'lost') — se LUKKING.
--   3) 12 «en»-dokumenter (type 'annet') LUKKES som feilmerket. Migr 114 satte 'en' på de 14 EKTE
--      oversettelsene; disse 12 er ikke blant dem, og CHECK-en er alt utvidet — foreldede flagg.
--      Ingen dokumentendring; kun kø-raden lukkes.
--   4) 3 S65-S70 BEKREFT (S65, S68, S69) — type 'manglende_maal'.
--   5) 3 S65-S70 AVVIS  (S66, S67, S70) — type 'manglende_maal'; kø-raden settes status='avvist'.
--      (Rettet 12. sep: «4/2» i det opprinnelige oppdraget var en formateringsfeil. Kjartans
--      faktiske beslutning er 3 BEKREFT / 3 AVVIS. Sperren teller derfor BEKREFT-gruppen og
--      AVVIS-gruppen — 3 og 3 — ikke de to tekstlinjene i oppdraget.)
--      manglende_maal har INGEN kompetansemaal_id og INGEN forslagsrad → RPC-en passer ikke.
--      BEKREFT gjøres som direkte menneske-kobling til det målet Kjartan/Cowork A fant
--      (grunnlaget, ikke gjett):
--        S65 → kompetansemaal 1255 (RLE01-04) · S68 → 1254 (RLE01-04) · S69 → 191 (ENG01-06).
--      S69: grunnlaget oppgir «ENG01-06/ENG02-06, id 191/252». RETTET 13. sep (Fable funn 2):
--        dette er IKKE samme mål i to målformer. ENG01-06 = «Læreplan i engelsk»; ENG02-06 =
--        «Læreplan i engelsk for elever med TEGNSPRÅK» — en EGEN læreplan, ikke en målform
--        (målform ligger som kolonnene tekst_nb/tekst_nn på samme rad, migr 090 — gir aldri to
--        rader). Tekstene er dessuten ulike. Samme mønster for «02»-familien: RLE02-04 = KRLE
--        samisk plan, SAF02-05 = samfunnsfag samisk. For en VANLIG lek er den ordinære
--        engelsk-læreplanen riktig, så vi kobler KUN id 191 (ENG01-06) — samme ordinære «01»-
--        familie som S65/S68 (RLE01-04) — og utelater id 252 (ENG02-06, tegnspråkplanen).
--      AVVIS (S66/S67/S70) har ikke noe mål å koble → kø-raden lukkes uten kobling.
--
-- BEHANDLER: alt tilskrives Kjartans superadmin-UID (9ee20e27-c5c2-4917-a6ba-4b3baedabf11). request.jwt.claim.sub settes
--   transaksjonslokalt slik at RPC-ens rollevakt (get_min_rolle → profiles) passerer og
--   auth.uid() inne i RPC-en blir Kjartan. Direkte writes bruker UID-literalen (114-mønster).
--
-- HARD SPERRE (FØR skriving, i samme transaksjon): finner migrasjonen ikke NØYAKTIG
--   60/4/12/3/3 kø-rader med status 'ny' og forventet type, stopper hele migrasjonen (raise).
--   Et nulltreff eller avvik betyr at grunnlaget ikke stemmer med basen → ingenting skrives.
--   Re-kjøring stopper også her (radene er da 'lost', ikke 'ny' → antall 0 ≠ forventet).
--
-- LUKKING (rettet 13. sep, Fable funn 1): kø-radens status følger frontend-fanene i
--   src/pages/RedaksjonKo.jsx + src/lib/redaksjon.js (verifisert): «Løst»-fanen filtrerer på
--   status='lost', «Avvist»-fanen på status='avvist' (093-CHECK: 'ny','under_arbeid','lost',
--   'avvist'). Begge setter lost_at+lost_av. Derfor:
--     * BEKREFT (60 komp via RPC + S65/S68/S69) og de 12 «en»-dok → status='lost' (75 rader).
--     * AVVIS (4 komp: S14/S17/S30/S49 + S66/S67/S70) → status='avvist' (7 rader).
--   Alle får lost_at=now(), lost_av=UID. BEKREFT/AVVIS for komp ligger dessuten i forslagets
--   status ('godkjent'/'avvist') og i om en kobling opprettes.
-- KVITTERING: én rad, per gruppe (bekreftet/avvist/lukket) + lost=75/avvist=7, avgrenset med now().
-- EGENSKAPER: ÉN transaksjon · commit som siste linje · reversibel (se under).
--
-- TILBAKERULLING (etter commit, hvis nødvendig): sett de berørte kø-radene tilbake til 'ny'
--   (lost_at/lost_av=null), forslagene tilbake til 'ny', og slett menneske-koblingene laget nå.
--   Kø-id-ene står i denne fila. (Ikke automatisert — gjøres bevisst hvis det trengs.)
-- ============================================================================

begin;

do $$
declare
  v_uid  constant uuid := '9ee20e27-c5c2-4917-a6ba-4b3baedabf11';
  v_bekreft60 uuid[] := array[
    'd6ac4231-d4aa-eba2-05a6-d18edb6a1d19',
    'da30fd08-a97c-e999-8b50-386d1d2fd4e4',
    'bb4d6f0a-9e97-1347-8294-c059c1fefba2',
    '201a83c6-8950-d6e0-0438-ed418d1e2f8c',
    'b584c90d-11c9-859c-4d28-1f549270eb95',
    '41fb254b-012d-558f-3490-6fa6d40599be',
    '3bd61198-47eb-2b57-9dfe-9e9bd406e93c',
    '79772a94-b2e0-7a6c-b187-f21b1d185cd2',
    'f0444d13-c28a-cecb-dc1e-1371e9a11c7f',
    'ae93904f-9fc7-6852-b172-9ff3a772db3e',
    '20d965dc-fb9e-3591-6fe3-099d5dc1afdf',
    'e236724f-8064-1e3e-7ff2-ad0d8c555961',
    '2d5eee43-522b-1636-15d6-c6a1f191029f',
    '81f82d7e-ec7c-c98a-6012-063017f4b3a4',
    'fb820c03-c7b0-f034-4872-c182a368c98c',
    'cd624d64-3bcf-1965-c905-dfe8a74b0bce',
    '07e63b1c-98c0-7cd7-ffd4-4f32ca49b2e9',
    'e9a50722-97b1-8ddf-81f6-40f2d3c3b9c2',
    'ebe2dd7f-b881-3ec5-7eac-16a97ea49b5c',
    'c7938cc1-323e-7922-5698-57fe14fe0de6',
    '255f1118-8977-1330-85ea-bb5c175bb766',
    '26bb597f-099f-c783-d601-79fff35d8045',
    '79ab74b8-5a21-0b0e-9430-996e74085acb',
    '170a23b8-dd6d-38f8-bcf8-c683064757f2',
    'f2f79f6d-8d18-3df7-257b-a5b3156c1e6b',
    '04cd1b9c-4580-3e08-bb5a-9f16110f0030',
    'c557fcaa-b023-f3f5-0cef-d5417c2e6441',
    '2907eb07-6349-0cdf-93d4-70daddd9175d',
    'bb08acf9-99b9-0685-d61a-dc16d17dcb3f',
    '01985eed-9e59-7120-da5f-eb27f397cba1',
    '9ba98386-de10-d639-9061-2527e22025fc',
    'ef9373b7-17f1-7e97-1e97-b24bfeda14d3',
    '5dd5b0cd-5d3d-ce95-753c-1c01c16835ae',
    '818e46cc-727b-3a5a-dc85-3c2d0f819f93',
    '556a8981-e14d-d582-b0be-79633f602a83',
    'e6227e07-899b-d42e-5922-084306b4ec07',
    '18ee679f-f13c-cfbe-49f2-6dc35849802f',
    '0813ccc3-cc85-b256-75e7-ab47dd0d2e17',
    'e38ad6fb-359f-076b-ab5c-8fe048ca9642',
    '8c6b3d67-93c5-df03-0e6a-25a1bc0f8d4d',
    'ffe5d93d-df65-d534-5de7-455434ae72f7',
    '0b6ddc93-3024-b066-35c0-34cc4d467c9c',
    'df53f9ce-8cf0-421e-e50e-7a2066a2ebf0',
    '47590652-f006-6073-3bdf-cd6f199ab222',
    '5e21ac74-b7a1-52a9-cef7-21b421827f88',
    '65b86320-d088-f362-bdeb-c5ae0c76e832',
    '2e319427-67aa-842c-f588-4c54a39524a6',
    '076b19f0-56ad-53c8-1b1c-5668dcd4621e',
    'c1b01dd8-b249-10de-ebb8-e74c10639c7e',
    '869e928b-0a94-de8b-5695-b964929bf7b8',
    'abec2746-9223-0939-80c1-618ab45d91d9',
    '20bd4379-8bdc-2f5f-86d2-39a1c6aaf337',
    '1a7d84c2-69c4-b53c-b892-9e9df15041df',
    '4c1f096b-7cc0-9565-6ad6-7ad14f780faf',
    'aaf14dfd-ef14-f881-d4d4-52540195543c',
    '8eeb8161-dd6d-abb6-2b34-4b4f4b98fe9c',
    '347a7a53-d6d0-0b97-5778-db3b7d7af0c2',
    'e5d60082-fd97-cb48-78f3-543f4a70d876',
    'ab3f8c74-38db-0ff6-3a15-78a5ec34dbc6',
    '2873832e-aaf6-86d5-43a0-db40754159f8'
  ];
  v_avvis4 uuid[] := array[
    'a5aafc7e-6575-9590-78ab-cfeec07a3a64',
    'b74097e5-a85d-3111-a262-79e5bfe81948',
    'ed8d0152-db7f-b989-214a-f0dc704f01c7',
    'a812aacd-18a6-6a55-1253-c45379b5930a'
  ];
  v_en12 uuid[] := array[
    '06603b99-8a81-dedf-c92c-9d5293970c5f',
    '11911755-731b-913e-70f4-ab91736b01aa',
    '11df313d-ff36-426a-b7f8-fea7352ff0a2',
    '2a6a7246-0cce-1415-e837-e91f91fa291a',
    '4c7c9e6d-d7ea-e7e9-a3fe-4312dee1e74b',
    '4fe29c7b-073b-02ac-1b3a-770c2c25f21f',
    'c3160f17-a641-14ed-deb6-15c655f23975',
    'd59672a5-7be6-98d1-0925-63399b2bbe8f',
    'd7ee2ed9-56cd-a13a-d332-2d8950ecb9b6',
    'ec386c27-7140-6ef8-6e63-2da712227665',
    'f8ae1c09-3034-dd69-65b7-6c6b45480f6c',
    'fb1b39f3-7308-980d-1c0d-7f5a96ac0f76'
  ];
  v_s_bekreft uuid[] := array['e2b32dfa-acb6-8032-ce7b-68b69243fa00','56e7579e-14af-66e0-3bbd-9534412ce6db','feb2a6f4-0ded-ac3e-e5a5-498e622dd62c'];  -- 3 BEKREFT (S65,S68,S69)
  v_s_avvis   uuid[] := array['c815c4b8-f68c-d63c-664a-144665ef46dd','c66d9be7-3f19-6e1c-d87e-55fb5bbdca61','a047475a-f828-e6fd-5cbe-688b0683481f'];  -- 3 AVVIS  (S66,S67,S70)
  v_id  uuid;
  v_res uuid;
  n int;
begin
  -- Provenans + rollevakt: la RPC-en (og auth.uid()) se Kjartan som kaller.
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  -- ===================== HARD SPERRE (før skriving) =====================
  select count(*) into n from public.redaksjonell_ko
   where id = any(v_bekreft60) and status='ny' and type='usikker_maalkobling';
  if n <> 60 then raise exception 'STOPP 123 (gruppe 1): forventet 60 usikker_maalkobling BEKREFT med status ny, fant %. Grunnlaget stemmer ikke med basen — ingenting skrives.', n; end if;

  select count(*) into n from public.redaksjonell_ko
   where id = any(v_avvis4) and status='ny' and type='usikker_maalkobling';
  if n <> 4 then raise exception 'STOPP 123 (gruppe 2): forventet 4 usikker_maalkobling AVVIS med status ny, fant %.', n; end if;

  select count(*) into n from public.redaksjonell_ko
   where id = any(v_en12) and status='ny' and type='annet';
  if n <> 12 then raise exception 'STOPP 123 (gruppe 3): forventet 12 «en»-dokumenter (annet) med status ny, fant %.', n; end if;

  select count(*) into n from public.redaksjonell_ko
   where id = any(v_s_bekreft) and status='ny' and type='manglende_maal';
  if n <> 3 then raise exception 'STOPP 123 (gruppe 4, S65/S68/S69 BEKREFT): forventet 3 manglende_maal med status ny, fant %.', n; end if;

  select count(*) into n from public.redaksjonell_ko
   where id = any(v_s_avvis) and status='ny' and type='manglende_maal';
  if n <> 3 then raise exception 'STOPP 123 (gruppe 5, S66/S67/S70 AVVIS): forventet 3 manglende_maal med status ny, fant %.', n; end if;

  -- ===================== 1) 60 BEKREFT via RPC (118) =====================
  foreach v_id in array v_bekreft60 loop
    perform public.bekreft_kompetansemaal_forslag(v_id);
  end loop;

  -- ===================== 2) 4 AVVIS (usikker_maalkobling) =====================
  foreach v_id in array v_avvis4 loop
    update public.ressurs_kompetansemaal_forslag f
       set status='avvist', behandlet_av=v_uid, behandlet_at=now()
      from public.redaksjonell_ko k
     where k.id = v_id and f.ressurs_id = k.ressurs_id and f.kompetansemaal_id = k.kompetansemaal_id;
    -- Kø-raden til «Avvist»-fanen (status='avvist'), ikke «Løst».
    update public.redaksjonell_ko set status='avvist', lost_at=now(), lost_av=v_uid where id = v_id;
  end loop;

  -- ===================== 3) 12 «en»-dokumenter: lukk (feilmerket) =====================
  update public.redaksjonell_ko set status='lost', lost_at=now(), lost_av=v_uid
   where id = any(v_en12);

  -- ===================== 4) S65/S68/S69 BEKREFT: menneske-kobling + lukk =====================
  -- S65 → kompetansemaal 1255 (RLE01-04)
  select ressurs_id into v_res from public.redaksjonell_ko where id = 'e2b32dfa-acb6-8032-ce7b-68b69243fa00';
  insert into public.ressurs_kompetansemaal (ressurs_id, kompetansemaal_id, satt_av, bekreftet_av, bekreftet_at)
    values (v_res, 1255, 'menneske', v_uid, now()) on conflict (ressurs_id, kompetansemaal_id) do nothing;
  update public.redaksjonell_ko set status='lost', lost_at=now(), lost_av=v_uid where id = 'e2b32dfa-acb6-8032-ce7b-68b69243fa00';

  -- S68 → kompetansemaal 1254 (RLE01-04)
  select ressurs_id into v_res from public.redaksjonell_ko where id = '56e7579e-14af-66e0-3bbd-9534412ce6db';
  insert into public.ressurs_kompetansemaal (ressurs_id, kompetansemaal_id, satt_av, bekreftet_av, bekreftet_at)
    values (v_res, 1254, 'menneske', v_uid, now()) on conflict (ressurs_id, kompetansemaal_id) do nothing;
  update public.redaksjonell_ko set status='lost', lost_at=now(), lost_av=v_uid where id = '56e7579e-14af-66e0-3bbd-9534412ce6db';

  -- S69 → kompetansemaal 191 (ENG01-06, ordinær engelsk). 252 (ENG02-06) = engelsk for elever
  -- med tegnspråk (egen læreplan, ikke målform) → utelatt for en vanlig lek.
  select ressurs_id into v_res from public.redaksjonell_ko where id = 'feb2a6f4-0ded-ac3e-e5a5-498e622dd62c';
  insert into public.ressurs_kompetansemaal (ressurs_id, kompetansemaal_id, satt_av, bekreftet_av, bekreftet_at)
    values (v_res, 191, 'menneske', v_uid, now()) on conflict (ressurs_id, kompetansemaal_id) do nothing;
  update public.redaksjonell_ko set status='lost', lost_at=now(), lost_av=v_uid where id = 'feb2a6f4-0ded-ac3e-e5a5-498e622dd62c';

  -- ===================== 5) S66/S67/S70 AVVIS: til «Avvist»-fanen, uten kobling =====================
  update public.redaksjonell_ko set status='avvist', lost_at=now(), lost_av=v_uid
   where id = any(v_s_avvis);
end $$;

-- ===================== KVITTERING (én rad, avgrenset med now()) =====================
select concat_ws(' · ',
  'gruppe1 komp BEKREFT (forslag godkjent): '
     || (select count(*) from public.ressurs_kompetansemaal_forslag where status='godkjent' and behandlet_at = now()),
  'gruppe2 komp AVVIS (forslag avvist): '
     || (select count(*) from public.ressurs_kompetansemaal_forslag where status='avvist' and behandlet_at = now()),
  'gruppe3 «en»-dok LUKKET: '
     || (select count(*) from public.redaksjonell_ko where type='annet' and status='lost' and lost_at = now()),
  'gruppe4 S65-S70 BEKREFT (lost): '
     || (select count(*) from public.redaksjonell_ko where id in ('e2b32dfa-acb6-8032-ce7b-68b69243fa00','56e7579e-14af-66e0-3bbd-9534412ce6db','feb2a6f4-0ded-ac3e-e5a5-498e622dd62c') and status='lost' and lost_at = now()),
  'gruppe5 S65-S70 AVVIS (avvist): '
     || (select count(*) from public.redaksjonell_ko where id in ('c815c4b8-f68c-d63c-664a-144665ef46dd','c66d9be7-3f19-6e1c-d87e-55fb5bbdca61','a047475a-f828-e6fd-5cbe-688b0683481f') and status='avvist' and lost_at = now()),
  'kø LØST (status=lost, skal være 75): '
     || (select count(*) from public.redaksjonell_ko where status='lost' and lost_at = now()),
  'kø AVVIST (status=avvist, skal være 7): '
     || (select count(*) from public.redaksjonell_ko where status='avvist' and lost_at = now()),
  'nye menneske-koblinger totalt: '
     || (select count(*) from public.ressurs_kompetansemaal where bekreftet_at = now())
) as kvittering;

commit;
