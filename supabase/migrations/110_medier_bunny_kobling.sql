-- ============================================================================
-- 110_medier_bunny_kobling.sql
-- ============================================================================
-- HVA: kobler de importerte video-radene i prod til Bunny ved aa fylle
--   `bunny_video_id` paa 261 rader i `medier` og 3 rader i `samling_medie`
--   (alle type='video', import_kjoring_id = b275b3c7-d8a5-447d-8ac7-b2c955b18738).
--   Verdiene er hentet EN gang, som lesing, fra oevingskopien
--   (bnbrbgvywdnczxajpaoj, kjoering 84777758-f6b4-45a0-abc6-e9473ae24458) og
--   ligger inline som VALUES nedenfor. Ingen ekstern kilde ved kjoretid.
--
-- HVORFOR DATA-KOPI OG IKKE video-fase2.mjs PAA NYTT: aa kjoere
--   import/opplastings-skriptet mot prod ville lastet de samme 264 filene opp til
--   Bunny en gang til og laget 264 DUBLETTER i biblioteket (nye guid-er, dobbelt
--   lagring, feil kobling). Bunny-videoene finnes allerede — de ble lastet opp da
--   oevingskopien ble bygget, og prod skal peke paa NOEYAKTIG de samme guid-ene.
--   Derfor kopieres bare koblingen (kilde_nid/storage_sti -> bunny_video_id), ikke
--   selve videoene.
--
-- BEVIST FOER BYGG (10. sep 2026):
--   * Oevingskopi: 261 medier + 3 samling_medie, type='video', kjoering 84777758…,
--     ALLE med bunny_video_id, 264 distinkte. Fingeravtrykk (md5 av string_agg av
--     kilde_nid|storage_sti, sortert): medier=3afa15660b5f3cf4bee476e8c2172940,
--     samling_medie=f7bbaa9fc4f8a04594edba942dab1760 — reprodusert lokalt fra
--     eksporten, identisk.
--   * Bunny-bibliotek 727245: 264 videoer totalt, ALLE status=4 (Finished). Hver av
--     de 264 guid-ene finnes i biblioteket med status=4. 0 mangler, 0 ikke-ferdige,
--     0 videoer i biblioteket som IKKE er referert. Derfor tas ALLE 264 med; ingen
--     justering av forventede tall.
--   * Prod (zpirjbrcbeubwpmtncxx, kjoering b275b3c7…): 261 medier + 3 samling_medie,
--     type='video', ALLE bunny_video_id NULL; 0 medier i HELE tabellen har
--     bunny_video_id. Prods fingeravtrykk for de radene er identisk med oevingskopien.
--     Ingen CHECK/UNIQUE paa bunny_video_id. (kilde_nid, storage_sti) er unik i begge
--     tabeller i begge baser — derfor er joinen entydig.
--
-- ENDRINGSLOGG: verken `medier` eller `samling_medie` har en trg_logg / endringslogg-
--   trigger (027/029/104 legger trg_logg paa ressurser, ressurs_innhold, dokumenter,
--   samlinger, kompetansemaal_trinn m.fl. — IKKE paa disse to). Kjoeringen gir derfor
--   0 endringslogg-rader. Ingen ferskhet- eller sokevektor-trigger paa disse heller.
--
-- JOIN: kun paa (kilde_nid, storage_sti) + type='video' + prods import_kjoring_id.
--   Aldri paa noe annet. type-filteret paa maalraden hindrer at en bilde-rad som
--   maatte dele (kilde_nid, storage_sti) med en video roeres.
--
-- IKKE IDEMPOTENT — KAN KUN KJOERES EN GANG. Ved ny kjoering etter commit stopper
--   Sperre B med «allerede koblet», fordi radene da alt har bunny_video_id.
--
-- FORHAANDSVISNING (les FOER du committer): bytt 'commit;' nederst til 'rollback;',
--   kjoer, les kvitteringen, bytt tilbake til 'commit;' og kjoer paa nytt for aa utfoere.
--
-- TILBAKERULLING (etter commit, hvis noedvendig):
--   begin;
--   update public.medier        set bunny_video_id = null
--     where type='video' and import_kjoring_id = 'b275b3c7-d8a5-447d-8ac7-b2c955b18738';
--   update public.samling_medie set bunny_video_id = null
--     where type='video' and import_kjoring_id = 'b275b3c7-d8a5-447d-8ac7-b2c955b18738';
--   commit;
-- ============================================================================

begin;

do $$
declare
  v_kj            uuid := 'b275b3c7-d8a5-447d-8ac7-b2c955b18738';  -- prods import_kjoring_id
  fp_med_expect   text := '3afa15660b5f3cf4bee476e8c2172940';
  fp_sam_expect   text := 'f7bbaa9fc4f8a04594edba942dab1760';
  n               int;
  n_dist          int;
  fp              text;
  n_med_before_tab int;   -- medier med bunny_video_id i HELE tabellen, foer
  n_sam_before_tab int;   -- samling_medie med bunny_video_id i HELE tabellen, foer
  n_med_updated   int;
  n_sam_updated   int;
  n_med_after_tab int;
  n_sam_after_tab int;
begin
  -- ----------------------------------------------------------------------
  -- Sperre A: prod har noeyaktig 261 medier + 3 samling_medie i scope
  -- ----------------------------------------------------------------------
  select count(*) into n from public.medier
    where type='video' and import_kjoring_id = v_kj;
  if n <> 261 then
    raise exception 'STOPP 110 (A-medier): forventet 261 video-medier for kjoering %, fant %. Sperren maalte feil grunnlag — ingenting endret.', v_kj, n;
  end if;

  select count(*) into n from public.samling_medie
    where type='video' and import_kjoring_id = v_kj;
  if n <> 3 then
    raise exception 'STOPP 110 (A-samling): forventet 3 video-samling_medie for kjoering %, fant %. Ingenting endret.', v_kj, n;
  end if;

  -- ----------------------------------------------------------------------
  -- Sperre B: ingen av radene i scope har bunny_video_id fra foer
  --           (klar «allerede koblet»-melding ved ny kjoering)
  -- ----------------------------------------------------------------------
  select count(*) into n from public.medier
    where type='video' and import_kjoring_id = v_kj and bunny_video_id is not null;
  if n > 0 then
    raise exception 'STOPP 110 (B-medier): allerede koblet — % av 261 video-medier har bunny_video_id fra foer. Migrasjonen er alt kjoert. Ingenting endret.', n;
  end if;

  select count(*) into n from public.samling_medie
    where type='video' and import_kjoring_id = v_kj and bunny_video_id is not null;
  if n > 0 then
    raise exception 'STOPP 110 (B-samling): allerede koblet — % av 3 video-samling_medie har bunny_video_id fra foer. Ingenting endret.', n;
  end if;

  -- ----------------------------------------------------------------------
  -- Sperre C: prods fingeravtrykk for radene i scope er som maalt
  --           (samme rader, samme noekler som oevingskopien vi kopierer fra)
  -- ----------------------------------------------------------------------
  select md5(string_agg(coalesce(kilde_nid,'∅')||'|'||coalesce(storage_sti,'∅'), E'\n'
             order by kilde_nid, storage_sti))
    into fp from public.medier where type='video' and import_kjoring_id = v_kj;
  if fp is distinct from fp_med_expect then
    raise exception 'STOPP 110 (C-medier): fingeravtrykk % <> forventet %. Prod-radene er ikke de vi maalte — ingenting endret.', fp, fp_med_expect;
  end if;

  select md5(string_agg(coalesce(kilde_nid,'∅')||'|'||coalesce(storage_sti,'∅'), E'\n'
             order by kilde_nid, storage_sti))
    into fp from public.samling_medie where type='video' and import_kjoring_id = v_kj;
  if fp is distinct from fp_sam_expect then
    raise exception 'STOPP 110 (C-samling): fingeravtrykk % <> forventet %. Ingenting endret.', fp, fp_sam_expect;
  end if;

  -- Baseline: hvor mange i HELE tabellen har bunny_video_id foer (skal vaere 0)
  select count(*) into n_med_before_tab from public.medier        where bunny_video_id is not null;
  select count(*) into n_sam_before_tab from public.samling_medie where bunny_video_id is not null;

  -- ----------------------------------------------------------------------
  -- Sperre D (medier): payload-lista har 261 rader, ingen dublett paa
  --           noekkel (kilde_nid,storage_sti) og ingen dublett paa bunny_video_id
  -- ----------------------------------------------------------------------
  select count(*), count(distinct (nid, sti)) , count(distinct bid)
    into n, n_dist, n
  from ( values
      ('10123', 'public/wysiwyg-media/byggekaos.mp4', 'b652b13f-86b2-4d2a-bc29-2e3c84746461'),
      ('10124', 'public/wysiwyg-media/skattekammeret.mp4', 'f944631a-86cf-4920-b787-e59d13c87e2d'),
      ('10125', 'public/wysiwyg-media/stjernegevinsten.mp4', '76e1ee6d-f1b2-4ff8-a7e0-3840a443f937'),
      ('10126', 'public/wysiwyg-media/kjeglevinnerne.mp4', '1f5ceadb-07d9-4c0d-b567-f114dc8611bd'),
      ('10127', 'public/wysiwyg-media/befrierne.mp4', '819e25c3-acd0-4b1e-bf6d-6553016e2355'),
      ('10129', 'public/wysiwyg-media/den_forsvunne_diamanten.mp4', '760e220f-0aea-49ad-aea7-0ad26ae3e280'),
      ('10130', 'public/wysiwyg-media/ringracet.mp4', '52540750-e332-4b94-a365-23b85432bb58'),
      ('10131', 'public/wysiwyg-media/stein_saks_papir_stigen.mp4', '70af0857-e108-49c9-8698-1ba5d0625f11'),
      ('10132', 'public/wysiwyg-media/hatten_pa.mp4', '8a8ae084-0050-4732-9c7b-01611c70affd'),
      ('10133', 'public/wysiwyg-media/slalamstafetten_v2_1.mp4', '1d8e9343-24a1-4f99-a3a6-80b6d0fd7963'),
      ('10135', 'public/wysiwyg-media/finn_en_feil.mp4', '0ac52a77-cc76-41e1-8d3e-c385c48ab873'),
      ('10136', 'public/wysiwyg-media/skyggen.mp4', '82033e8f-30eb-4fd8-a3e0-91b35d1277f4'),
      ('10143', 'public/wysiwyg-media/digital_kursmodul_vinter_2023.mp4', 'd26bec58-539a-4989-9170-93376083bde1'),
      ('10173', 'public/wysiwyg-media/oppdraget_ny.mp4', 'cf0655c9-3b2c-417f-8c33-a2d2b1ea7414'),
      ('1039', 'public/wysiwyg-media/07_-_fengselsdirektoren_og_fangene_1080p_5mbps_nor.mp4', '913f1652-8af1-4045-a07d-66f2633eb728'),
      ('1040', 'public/wysiwyg-media/06_-_bil_og_garasje_1080p_5mbps_nor_0.mp4', '22baac90-6e4e-49e1-892e-614fd748efd5'),
      ('1041', 'public/wysiwyg-media/samlerne_no_0.mp4', 'b8ef54b0-069a-4d2f-b6c4-0692a39e119b'),
      ('1045', 'public/wysiwyg-media/aktivitet_blinkstafetten.mp4', 'f276d79f-f26c-4165-8faa-241e9cf0ae5a'),
      ('1048', 'public/wysiwyg-media/aktivitet_samurai.mp4', 'cd1ff0ca-e7e1-40c8-b024-5772773b36cb'),
      ('1051', 'public/wysiwyg-media/13_-_laererne_knuser_kidsa_1080p_5mbps_nor.mp4', '2cad6635-4f34-4324-b36e-ed1079e4deea'),
      ('1052', 'public/wysiwyg-media/nord_og_sor.mp4', '465b4ed0-b441-464d-9092-2245f68f9a4e'),
      ('1053', 'public/wysiwyg-media/09_-_ringbattle_1080p_5mbps_nor_0.mp4', '9e5261bd-11ad-49b3-8da9-4b1e4d1f7ff1'),
      ('1054', 'public/wysiwyg-media/sjiraffen_no.mp4', '7f978b5f-910e-4a3b-b974-440f08dd8927'),
      ('1058', 'public/wysiwyg-media/yoshi_no.mp4', '6dfe2b4c-0dd5-41dd-91b5-31dc561018af'),
      ('10581', 'public/wysiwyg-media/utfordring_dorulltarnet.mp4', '343dabc2-1f92-4e5e-a798-3b1e2fba1e40'),
      ('10582', 'public/wysiwyg-media/move_it_high_five.mp4', '3e9e3f8d-eca8-4d2f-9c11-13bd12cb0965'),
      ('10584', 'public/wysiwyg-media/movie_it_spagaten.mp4', 'f23f4f94-a2ec-4bf4-94dc-3443b98aeacc'),
      ('1059', 'public/wysiwyg-media/04_-_snorrmonsteret_1080p_5mbps_nor_0.mp4', '9bc883b0-6499-492a-851d-a630fdc9f092'),
      ('1060', 'public/wysiwyg-media/aktivitet_silent_escape.mp4', '6d891ced-f979-43eb-8c67-f7e05a121d50'),
      ('1064', 'public/wysiwyg-media/heia_heidi_redigert_0.mp4', 'c78e2761-9f98-4e7b-86c9-dd8d3b9897a6'),
      ('1065', 'public/wysiwyg-media/aktivitet_dropball.mp4', 'f4cb135f-ff5c-47f3-bdc3-587a727f4da5'),
      ('1066', 'public/wysiwyg-media/05_-_gladiatorene_1080p_5mbps_nor_0.mp4', 'fe0b9d54-e628-4a89-8c44-91797df31bd8'),
      ('1071', 'public/wysiwyg-media/aktivitet_piloten.mp4', 'd26129e1-abeb-4d86-acbb-fd0e2ff07845'),
      ('1076', 'public/wysiwyg-media/move_it_fire_lys.mp4', '9b2d5a2a-92d6-4657-8f59-13891bb3735f'),
      ('1082', 'public/wysiwyg-media/aktivitet_4_wembley.mp4', 'd3beff32-e384-45a9-b877-f122028202d6'),
      ('1092', 'public/wysiwyg-media/move_it_inn_til_midten.mp4', 'd293b2e5-3073-4da3-b96f-02746e3960fb'),
      ('1094', 'public/wysiwyg-media/aktivitet_rockehuset.mp4', 'dd8e8d66-264d-4612-aa3b-ea1bf5cef102'),
      ('1098', 'public/wysiwyg-media/aktivitet_fotballkubb.mp4', '6a0c7dbf-55cd-4072-a3de-15c84c3303de'),
      ('1100', 'public/wysiwyg-media/cowboyen_no.mp4', '811879a4-a4a6-4dda-9518-cacee5d7a40a'),
      ('1119', 'public/wysiwyg-media/erobreren_no.mp4', 'e5c809e6-1031-4c33-9f5c-705bdf474a33'),
      ('1133', 'public/wysiwyg-media/tail-tag_no_0.mp4', '1874ac28-1a15-4841-8adc-0cf187c981fb'),
      ('1134', 'public/wysiwyg-media/fargeduell_no.mp4', 'b903617f-bc88-4df7-963a-0fb6fe161659'),
      ('1135', 'public/wysiwyg-media/brennende_lavastein_no_0.mp4', 'da92b7f5-c73e-43f6-b210-c3e04539cafb'),
      ('1138', 'public/wysiwyg-media/move_it_dyrene_skriker.mp4', '1300abab-5772-4549-bd55-803793c1588e'),
      ('1141', 'public/wysiwyg-media/aktivitet_7_bevegelsesmemory.mp4', '81df9701-6a0e-4ab8-bee8-4eeb52d733f8'),
      ('1150', 'public/wysiwyg-media/harry_potter_no.mp4', '415bdd3d-6866-4b20-bd08-d8e03ce5d137'),
      ('1165', 'public/wysiwyg-media/amoba_no.mp4', '1db3730b-74e1-4fb3-a70b-9d9709b87712'),
      ('1178', 'public/wysiwyg-media/aktivitet_10_hi_ha_ho.mp4', 'acd6c169-5f78-404c-8fad-3efe96bc42c6'),
      ('1181', 'public/wysiwyg-media/skip_ohai_no.mp4', '89c7dd0c-400b-4574-b917-60d75750b7f9'),
      ('1182', 'public/wysiwyg-media/aktivitet_nattduellen.mp4', 'cacd49a0-7d1e-441b-9cc0-2bd0eb4d1c53'),
      ('1184', 'public/wysiwyg-media/chewbacca.mp4', 'aac1f2e3-a23a-4967-ad64-46c5a0ab2c1d'),
      ('1196', 'public/wysiwyg-media/aktivitet_8_elgen_helge.mp4', '2f55eb49-a451-484c-80e6-a32122883dd5'),
      ('1198', 'public/wysiwyg-media/ballfangeren_no.mp4', 'fde45c06-919e-41ac-af1e-cfb4950a1c59'),
      ('12388', 'public/wysiwyg-media/hoppeduellen_redigert_0.mp4', '9d62d5da-8dcb-461b-9fb8-3a684b3f2e24'),
      ('1246', 'public/wysiwyg-media/aktivitet_3_signalet.mp4', '6e6812e3-3cca-4004-b82b-bbd16b3bb8c1'),
      ('1247', 'public/wysiwyg-media/03_-_ekornsisten_1080p_5mbps_nor_0.mp4', '11f29ba4-3f74-4d8a-9067-038e607b810b'),
      ('1248', 'public/wysiwyg-media/aktivitet_steinen_bak_ryggen.mp4', '60563a89-05a2-4886-855d-dea228f0a608'),
      ('1255', 'public/wysiwyg-media/butterflynett_no_0.mp4', 'b21e2ae4-bf82-4ee3-977b-bf02df49cf6b'),
      ('13080', 'public/wysiwyg-media/digital_kursmodul_vinter_var_2024.mp4', 'a437c78d-aa12-4d75-acf8-c42074179aca'),
      ('1311', 'public/wysiwyg-media/superking_no.mp4', '73481e96-5492-448e-a971-a5859c04d79e'),
      ('1323', 'public/wysiwyg-media/aktivitet_prikk.mp4', '02ad5053-a2ba-4f74-9f28-79ace993bb43'),
      ('1328', 'public/wysiwyg-media/jungelfotball_no.mp4', 'fd23f06a-4f4a-4c37-93ed-954d76d3af5a'),
      ('1353', 'public/wysiwyg-media/15_-_bulldog_1080p_5mbps_nor.mp4', '89e12bc7-13a2-4e98-8687-b14762ed6280'),
      ('13623', 'public/wysiwyg-media/lek_2_-_supermusa_nor_v2_0.mp4', '48f70121-c8fd-49d0-9f80-2b574d21cbca'),
      ('13624', 'public/wysiwyg-media/lek_1_-_linjekampen_nor_v4_0.mp4', '4f83efc3-602e-4373-82e1-a9bb522906e4'),
      ('13625', 'public/wysiwyg-media/lek_3_-_togstopp_nor_v5.mp4', '53d33377-e8f0-4b0c-8687-9e821ee75cac'),
      ('13627', 'public/wysiwyg-media/lek_4_-_rydde_hagen_nor_v2.mp4', '707c7c4a-0b11-466c-8f81-f2a7d70e20de'),
      ('13628', 'public/wysiwyg-media/lek_5_-_dodraugen_nor_v2.mp4', '053a6b47-3cef-4180-ae89-eb44f1a3b206'),
      ('13629', 'public/wysiwyg-media/lek_6_-_masterball_med_frisbee_nor_v2.mp4', 'be54ecb9-950a-4364-8c4a-b9a468c079a0'),
      ('13630', 'public/wysiwyg-media/lek_7_-_indiana_jones_mini_nor_0.mp4', 'e5017eef-04b1-4b8a-be73-9ef8c62342a9'),
      ('13631', 'public/wysiwyg-media/lek_8_-_fliptriangelet_nor_v4.mp4', '2c3b41f1-a7a5-4d31-8ee7-c40778d2ef67'),
      ('13632', 'public/wysiwyg-media/lek_9_-_klokka_nor_v2.mp4', 'cdda9e3e-399a-4764-a0d2-ef54d315c0e7'),
      ('13633', 'public/wysiwyg-media/ta_flagget_nor_v2.mp4', '99d6c999-7c0c-4b82-b6ed-290320093054'),
      ('13634', 'public/wysiwyg-media/treeren_nor_v2.mp4', '31fd839d-554f-4579-b1ad-30c17db1f293'),
      ('13635', 'public/wysiwyg-media/lek_10_-_den_flyvende_pennen_nor_v2.mp4', '4b749859-2fc8-4e57-8ba4-30fee0c56e2a'),
      ('13649', 'public/wysiwyg-media/1_-_musenes_ostefest_h.264.mp4', 'f89c28cc-2f43-4c2a-a60d-558b5641d18e'),
      ('13650', 'public/wysiwyg-media/2_-_isduellen_h.264.mp4', 'd4395940-02fd-4b82-83d2-a1c56f1e157d'),
      ('13651', 'public/wysiwyg-media/3_-_det_skjeve_tarnet_h.264.mp4', 'bd442520-6286-4d20-92a2-ec7c6f1c21f7'),
      ('13652', 'public/wysiwyg-media/4_-_ballrenna_h.264.mp4', 'fb9caccd-822b-4023-977a-b771b906e36d'),
      ('13653', 'public/wysiwyg-media/5_-_jageband_h.264.mp4', '478db78f-ae9b-465b-a4dc-2d0e3d63fc39'),
      ('13655', 'public/wysiwyg-media/6_-_flyvende_tallerken_h.264.mp4', 'ba30d221-9bbb-4f1e-850f-ffcaa553c63d'),
      ('13656', 'public/wysiwyg-media/7_-_mastermind_h.264.mp4', 'a0d9d68c-ffa7-4c22-87d6-0e3ae5219231'),
      ('13657', 'public/wysiwyg-media/8_-_kjegleduellen_h.264.mp4', '88a7da0e-4761-4d61-bc16-2f2fcf59c85c'),
      ('13658', 'public/wysiwyg-media/9_-_gamechanger_h.264.mp4', 'a4c870ac-15f3-4589-b5bb-46897117c51f'),
      ('13659', 'public/wysiwyg-media/10_-_alle_mot_alle_h.264.mp4', 'c050418b-4fe2-4eeb-b667-a9583661faba'),
      ('13660', 'public/wysiwyg-media/11_-_hoyere_eller_lavere_svensk_h.264.mp4', 'fe679134-5b71-4b7c-ae8b-2d770c0ab63b'),
      ('13662', 'public/wysiwyg-media/15_-_krysset_h.264.mp4', '97f65a46-7208-4716-877b-53b29ffda970'),
      ('13663', 'public/wysiwyg-media/16_-_telleren_h.264.mp4', 'ca294bee-dec2-4c34-bd72-675ff6fca289'),
      ('1388', 'public/wysiwyg-media/aktivitet_dansesisten.mp4', 'df91aca4-3745-4bfb-86fc-59f8dce24c3a'),
      ('1393', 'public/wysiwyg-media/aktivitet_limbo.mp4', '76ec739e-bd64-4cb1-9456-09b6407d8eda'),
      ('1422', 'public/wysiwyg-media/aktivitet_fallskjerm.mp4', '62ed31b5-3e4c-443f-90bd-81b1518fed9f'),
      ('1433', 'public/wysiwyg-media/move_it_atomleken.mp4', '21ad5c88-5fb5-424c-b66c-cb6295486871'),
      ('1452', 'public/wysiwyg-media/siste_paret_ut_no.mp4', '91a8be01-ff32-4ec3-b1f5-7349f75f5251'),
      ('14735', 'public/wysiwyg-media/01_-_box_ball_1080p_5mbps_nor_0.mp4', 'c37848f0-42e5-49ee-bb49-72e4c8adbe10'),
      ('14738', 'public/wysiwyg-media/10_-_levende_fotballmal_1080p_5mbps_nor.mp4', '13df5f2d-8102-44b1-ac70-1827f2d02d64'),
      ('14739', 'public/wysiwyg-media/11_-_heis_flagget_1080p_5mbps_nor.mp4', '1c2fbed8-5975-4065-ab06-af375e493105'),
      ('14748', 'public/wysiwyg-media/alle_leker_1080p_2mbps_nor.mp4', '29bc735d-4f53-44b4-9c9a-2b44f747b629'),
      ('15355', 'public/wysiwyg-media/fire_lys_no.mp4', 'f86c1f6b-ed8b-4dc5-b6ee-d6d449ec47a4'),
      ('15373', 'public/wysiwyg-media/nattduellen.mp4', '9f8681b5-1467-44ee-9aa4-420fc81849ec'),
      ('16122', 'public/wysiwyg-media/nominasjonsvideo.mp4', '26cae571-1147-42f2-b2da-3ced77fcb36b'),
      ('16213', 'public/wysiwyg-media/selfiesisten_no.mp4', '045c70c9-a05d-4b9a-83a2-ddf9613c9319'),
      ('16214', 'public/wysiwyg-media/kuslippet_no.mp4', '51c2559c-9fe5-4467-8cd7-e68a044b1513'),
      ('16579', 'public/wysiwyg-media/boom_klapp_snapp.mp4', 'fa6ad793-0aba-4a53-b8c0-3189e5e50746'),
      ('16714', 'public/wysiwyg-media/fingerspelet_med_hogstdaie-ram__0.mp4', '84915f1a-2f87-4c2c-a79a-dc9289097411'),
      ('16715', 'public/wysiwyg-media/fotnian_hogstadie-ram_0.mp4', 'a7e7621b-f213-4f6b-b072-9ac9065924da'),
      ('16716', 'public/wysiwyg-media/hjulet_hogstadie_-ram_.mp4', '7a064e59-2b7b-42b7-aaba-4c23210831aa'),
      ('16717', 'public/wysiwyg-media/huvud_mage_hogstadie_-ram_.mp4', '0cc7a3ae-fc6d-4c94-8b20-1fd1e5e836b5'),
      ('16718', 'public/wysiwyg-media/orm_och_delfin_med_hogstadie_ram.mp4', 'ecd48c87-fd00-4f46-8512-b60376618bcc'),
      ('16719', 'public/wysiwyg-media/tumme_upp_hogstadie_-ram.mp4', 'be7ac9a1-877a-4d43-954f-8431e57ccb87'),
      ('16775', 'public/wysiwyg-media/viskelaersisten.mp4', 'd67faf52-8bf2-4e5a-9848-149e17f07acf'),
      ('1682', 'public/wysiwyg-media/aktivitet_myggsisten-myggjage.mp4', 'a919d07d-f09f-4276-a017-0d1131b41136'),
      ('1685', 'public/wysiwyg-media/02_-_rubiks_matte_1080p_5mbps_nor_0.mp4', 'b7438364-1769-405a-b4d0-ae1e2e18bf40'),
      ('1687', 'public/wysiwyg-media/tvert_om_no_0.mp4', '666e50b8-3c77-4618-9549-b6bfb46c2a3b'),
      ('1688', 'public/wysiwyg-media/pirates_of_the_caribbean_no_0.mp4', '1e1bdf6c-9960-4393-87ba-0804b90f0c10'),
      ('1691', 'public/wysiwyg-media/touchball_no_0.mp4', '7708f6cf-219f-4d0e-af49-90c6c9440c9f'),
      ('1693', 'public/wysiwyg-media/nummerleken_no.mp4', '7d099579-9d3a-416c-8148-20c343aedb9e'),
      ('17073', 'public/wysiwyg-media/popcorn.mp4', '37fae98b-cebf-47c8-912f-aff0db0fbcc0'),
      ('17095', 'public/wysiwyg-media/klapperingen_no.mp4', 'b8bf664b-03ef-45af-96b1-db1a60afa01a'),
      ('17383', 'public/wysiwyg-media/muggduellen_0.mp4', 'e308e77e-fca7-484d-a87e-ae1df778295b'),
      ('17385', 'public/wysiwyg-media/draduellen_no_0.mp4', 'd5b1a8ff-aac3-4791-9c3b-f2243be781c9'),
      ('17386', 'public/wysiwyg-media/fanga_hatten_0.mp4', '8d817f8f-3603-4f9c-aaa5-a56ff7b368bc'),
      ('17387', 'public/wysiwyg-media/koll_pa_bollen.mp4', '743d0f6c-d440-4cce-b0d0-c6e83322dad6'),
      ('17388', 'public/wysiwyg-media/fanga_boll_i_stapel.mp4', '45b7f56f-64db-48a9-98eb-ac304b3aff58'),
      ('17389', 'public/wysiwyg-media/klockan.mp4', '4635612c-96b7-4a1a-928a-458e96dc1ab4'),
      ('17724', 'public/wysiwyg-media/blyantene.mp4', '127b4223-d0b1-4ac5-a6db-a73e8dc2902b'),
      ('17726', 'public/wysiwyg-media/koll_pa_bollen_0.mp4', '5ca58d67-e1a9-4582-95cb-cdb3105d64e6'),
      ('17729', 'public/wysiwyg-media/tyv_og_politi_no.mp4', 'ec5bf44a-bab6-4d58-a896-7e3fd0fdacd8'),
      ('17746', 'public/wysiwyg-media/bytt_hus_no.mp4', '52fc6af9-f166-4fe9-8117-f5663650216e'),
      ('17748', 'public/wysiwyg-media/kin-ball-sisten_no.mp4', '22fd8e3c-7b1d-4f5a-8539-1b6ca355621b'),
      ('17749', 'public/wysiwyg-media/speed_stacks-stafett_no.mp4', 'f1d142a1-6fce-4154-b084-e0e9eccccba1'),
      ('18397', 'public/wysiwyg-media/hei_hello_hallo.mp4', 'c1796583-e501-4076-8540-45b124ac7a4d'),
      ('18398', 'public/wysiwyg-media/feil_farge_no_0.mp4', '4c89655b-65ee-409f-9f03-61a553e243d9'),
      ('18406', 'public/wysiwyg-media/hodepine.mp4', 'a54de4e1-a388-4b78-adb6-b0ec135d47b3'),
      ('18407', 'public/wysiwyg-media/fotsignaturen.mp4', '67048de1-89f1-48a1-b288-e13279956ac1'),
      ('18408', 'public/wysiwyg-media/klappen_gar_0.mp4', 'a19f03c4-6b11-4236-afbe-b07b380c3693'),
      ('18411', 'public/wysiwyg-media/kontorpingis.mp4', '5df2d62a-28ec-40b2-879f-829550123bda'),
      ('18413', 'public/wysiwyg-media/lynpennen.mp4', 'd48aef89-fa4a-4bfb-916a-8745c7342ba8'),
      ('18419', 'public/wysiwyg-media/klokka_1_minutt.mp4', '7fbc0abb-a731-43a1-ba71-5fef24302659'),
      ('18433', 'public/wysiwyg-media/tre_klapp_spring_no_0.mp4', 'aa143d68-73b4-4d3d-98bd-a02e2548aa00'),
      ('18434', 'public/wysiwyg-media/klossen.mp4', '9de4a81a-3a63-456b-9fb6-8c659e9f8f93'),
      ('18436', 'public/wysiwyg-media/sifferdans.mp4', '105be93f-2599-4a99-a57d-1b8f309b359c'),
      ('18437', 'public/wysiwyg-media/klasseromsoppdrag.mp4', '597787c7-6bf8-4410-86aa-646a2cb45274'),
      ('18438', 'public/wysiwyg-media/gjett_ordet.mp4', '7f2c9461-62f0-45c6-ab03-259d2abc1fc2'),
      ('18439', 'public/wysiwyg-media/pingvinen.mp4', 'd18e5015-e379-451e-ac1d-4788330bc193'),
      ('18840', 'public/wysiwyg-media/jumbojageren_no_0.mp4', '465f1544-4186-4277-8ca5-12c54b2c552e'),
      ('18841', 'public/wysiwyg-media/kjempe_trollmann_og_drage_no_0.mp4', '66f49a38-6a40-4637-8c25-8f116f9b9b82'),
      ('18842', 'public/wysiwyg-media/byggeracet_no_0.mp4', '315f5b0d-7ae7-405b-8cc6-80c49fad4c27'),
      ('18843', 'public/wysiwyg-media/vend_pannekaken_no_0.mp4', 'f6608d26-8130-4c31-b2f4-86735bf46664'),
      ('18844', 'public/wysiwyg-media/rekkefolgen_-_duell_no_0.mp4', 'fb5a80e5-e2ec-40ad-a7eb-38761533cacd'),
      ('18895', 'public/wysiwyg-media/speedstacksmonstret.mp4', '78bb9853-9513-45fe-b409-8902ee1357c7'),
      ('18896', 'public/wysiwyg-media/film_boll_i_hatt_.mp4', '4a632858-9cc0-4915-b91e-41ee18e8c9fe'),
      ('18897', 'public/wysiwyg-media/kul_i_bok.mp4', 'e8cf0859-bcdd-45d5-a917-674358f8b013'),
      ('18898', 'public/wysiwyg-media/snurra_rockringen.mp4', 'bb888cb5-372d-4106-b139-9e8ea07998f1'),
      ('20063', 'public/wysiwyg-media/minuttball_no.mp4', '2e4d5c44-4895-4daf-8c55-97cd094de907'),
      ('20064', 'public/wysiwyg-media/slottstriden_no.mp4', '516fe12e-19a7-417e-9ff4-a7a592efcce2'),
      ('20065', 'public/wysiwyg-media/sirkelsprett_no.mp4', 'f0b9bdc2-77ee-4577-be85-711938ad2e2e'),
      ('20066', 'public/wysiwyg-media/bikuben_no.mp4', '207e6935-c772-4793-8287-cb8c2e1a3e4e'),
      ('20067', 'public/wysiwyg-media/flyvende_farger_no_new.mp4', 'da5138d3-3849-4f5c-9051-174e05f25469'),
      ('20068', 'public/wysiwyg-media/krokodille-_og_myggsisten_no.mp4', '82a49352-b8e6-4dab-af0d-24a60afce4b5'),
      ('20069', 'public/wysiwyg-media/pingvin_og_pelikan_no.mp4', '68bec641-4c1d-438c-a87b-61af16b3eb55'),
      ('20070', 'public/wysiwyg-media/boccia-bowling_no.mp4', '315e84d1-23a3-4a5a-9a39-033338a0c02c'),
      ('20071', 'public/wysiwyg-media/signalet_no.mp4', 'c494e123-3432-4b17-80ac-1034320256e2'),
      ('20072', 'public/wysiwyg-media/stein_saks_papir_-_runden_no.mp4', '5fa3592b-8165-4c9d-a34a-e0c63ef8cd29'),
      ('20073', 'public/wysiwyg-media/moonball_challenge_no.mp4', 'e9bd31b6-7a4b-4592-b1a2-c953559ca66d'),
      ('20074', 'public/wysiwyg-media/moonball_-_sprett_og_fang_no.mp4', '6d17d769-0b08-4c86-89e8-9e17f979961d'),
      ('20075', 'public/wysiwyg-media/moonball_-_kast_og_fang_no.mp4', 'ce99ac16-556a-4cd1-936d-7f7a30da48f1'),
      ('20076', 'public/wysiwyg-media/clap_trap_no.mp4', 'd4e3f7c8-df72-44f2-afb3-1e77e3fb2b0f'),
      ('20077', 'public/wysiwyg-media/rytmerebellen_no.mp4', '23052047-4dbb-4f7a-ae5b-da2432f01a7b'),
      ('2264', 'public/wysiwyg-media/move_it_fange_finger.mp4', '09deab49-298a-44cb-a058-7bace69f5dae'),
      ('2265', 'public/wysiwyg-media/aktivitet_parsisten.mp4', 'd988476e-e505-44fe-aadc-b671536fa982'),
      ('2271', 'public/wysiwyg-media/elgen_velger_no.mp4', 'b0520f66-e420-4e6f-a359-e1c76b116564'),
      ('2274', 'public/wysiwyg-media/hopp_inn_-_hopp_ut_1234_redigert_0.mp4', 'e3a8185b-f676-4f79-8d45-38f24257dae2'),
      ('2275', 'public/wysiwyg-media/move_it_bevegelsesalfabetet.mp4', 'edf1308b-6d6c-4f08-83f5-4b68123082a8'),
      ('2277', 'public/wysiwyg-media/felles_krefter_redigert_0.mp4', '59c60355-4ef1-4716-9072-f9039f7c67a4'),
      ('2281', 'public/wysiwyg-media/aktivitet_100_om_dagen.mp4', '75d6a926-5900-43ae-aeb3-c4cb90147a83'),
      ('2282', 'public/wysiwyg-media/move_it_just_dance.mp4', 'e1ff3fd0-3bdc-4b20-902d-d4a3c94635a5'),
      ('2468', 'public/wysiwyg-media/move_it_enarmet_banditt.mp4', '9773ad01-fbd6-410d-81f1-ca226e43eb3b'),
      ('2735', 'public/wysiwyg-media/aktivitet_snikende_tiger.mp4', '7c953669-3f0b-4249-904c-4eb86839ceb1'),
      ('2737', 'public/wysiwyg-media/stokk_eller_stein_no_ny_0.mp4', '5292de63-c6ea-4a0c-bb55-43baff8764fe'),
      ('2773', 'public/wysiwyg-media/08_-_terningstafett_1080p_5mbps_nor_0.mp4', 'e9d9c570-6a63-403f-a962-59deed93490a'),
      ('2844', 'public/wysiwyg-media/tl-aktivitet_flyvern.mp4', 'cea9599b-62aa-48f0-85af-74f4a7edf2a5'),
      ('3200', 'public/wysiwyg-media/koralljakten_no_0.mp4', '1a42e59f-a3e2-4ba7-b6e9-8b20913d1408'),
      ('3206', 'public/wysiwyg-media/aktivitet_boccia_bowling.mp4', 'a917e3c5-9bdb-4ef3-95d8-54cdfd267554'),
      ('3688', 'public/wysiwyg-media/move_it_abc_123.mp4', 'ae5fa2f1-18a8-4fd6-9d24-bf4758db9b20'),
      ('3689', 'public/wysiwyg-media/move_it_knyttneve_highfive.mp4', 'a2426656-be3c-4575-a7af-bbbb028aaa9a'),
      ('3888', 'public/wysiwyg-media/move_it_forst_pa_steinen.mp4', '3f5e6972-a281-460f-a8b0-3960a29d9308'),
      ('3907', 'public/wysiwyg-media/move_it._regneduellen.mp4', 'dc068e7c-b715-4a8f-a122-c530fd41ed8b'),
      ('3908', 'public/wysiwyg-media/move_it_stein_saks_papir_hopp.mp4', '16c52eab-8cb7-4908-8e0e-fbb1b0d5e457'),
      ('3931', 'public/wysiwyg-media/move_it_terningyoga.mp4', 'ac054240-29c4-41c4-9874-3ac94af7aa46'),
      ('3933', 'public/wysiwyg-media/move_it_slap_jack.mp4', '344768ba-abaa-4dd1-b53f-3804cca98caf'),
      ('3934', 'public/wysiwyg-media/move_it_dyreparken.mp4', 'de3d4f5f-9021-43fe-a401-7f8c03688946'),
      ('3935', 'public/wysiwyg-media/move_it_gjett_sporten-_gissa_sporten.mp4', 'd0bdcd38-7f65-4a48-a783-baac74821d35'),
      ('3936', 'public/wysiwyg-media/move_it_forst_til_50.mp4', 'eb62cfa3-abda-47f7-a867-718faab6f7d6'),
      ('3937', 'public/wysiwyg-media/move_it_tryllestav.mp4', '6094d578-f561-457c-975e-4931174f11d5'),
      ('3939', 'public/wysiwyg-media/21_no_0.mp4', '48b31eb0-d782-444d-9190-b97a73f724d1'),
      ('3940', 'public/wysiwyg-media/aktivitet_dance_monkey.mp4', '73cf86bd-8c66-4425-b0ac-64ebdf4360a0'),
      ('4091', 'public/wysiwyg-media/aktivitet_spinn_og_spring.mp4', '86a95bb3-1fe4-461f-8505-9512e71bdc5e'),
      ('4092', 'public/wysiwyg-media/aktivitet_2_rattent_egg.mp4', 'bbfb4094-0df2-4e68-9a02-96caad8dc244'),
      ('4093', 'public/wysiwyg-media/aktivitet_5_griseflaks_1.mp4', 'a834b6d2-ae1a-45c2-844a-a6ba4a69ac0e'),
      ('4094', 'public/wysiwyg-media/aktivitet_9_flytte_ringen.mp4', 'efc4dd41-2b69-48e7-a091-5b5e34f00ca4'),
      ('4497', 'public/wysiwyg-media/speed_stacks_no_utomhus.mp4', 'e1784608-6602-46f1-bc62-e64c544de936'),
      ('5131', 'public/wysiwyg-media/aktivitet_volleyball_med_sixball.mp4', '53a4e2ea-e38c-4e97-91f4-0e1036d6cd7a'),
      ('5132', 'public/wysiwyg-media/aktivitet_to_tarn.mp4', '705c6a06-0be0-455f-857f-925b18699397'),
      ('5133', 'public/wysiwyg-media/aktivitet_terningsisten.mp4', '3179fb59-151b-41e3-b338-0900d66b9658'),
      ('5135', 'public/wysiwyg-media/move_it_stein_saks_papir_nittigradern.mp4', '372e9c44-bf2a-4fe5-9e11-c2bfeda5413e'),
      ('5136', 'public/wysiwyg-media/move_it_stein_saks_papir_med_ertepose.mp4', 'a3d86b1c-83ac-4fbd-8ef5-f3c5d2c13b4a'),
      ('5137', 'public/wysiwyg-media/aktivitet_spinnsisten.mp4', '3fe2fc96-a3eb-4930-9ec8-9843654d9391'),
      ('5138', 'public/wysiwyg-media/aktivitet_larven.mp4', 'decfd81e-6e36-43ff-a7bd-23ee1f705f88'),
      ('5139', 'public/wysiwyg-media/aktivitet_jumbostafett.mp4', '22ceca7e-e18f-4ea9-8b1e-57875a07698b'),
      ('5140', 'public/wysiwyg-media/aktivitet_flip_it.mp4', '15f162f6-b77f-429e-a52e-3ccebf0e95ee'),
      ('5141', 'public/wysiwyg-media/aktivitet_drakamp.mp4', 'e93530de-6cf6-4d19-a96f-8eb553e29249'),
      ('5145', 'public/wysiwyg-media/aktivitet_varme_kalde_baller.mp4', '05d8ba9a-8f9e-42cf-b851-dc4fc6b4d156'),
      ('6006', 'public/wysiwyg-media/move_it_dyrene_i_afrika.mp4', '19a86cc3-1b94-4f60-ab21-eff7793529ae'),
      ('6086', 'public/wysiwyg-media/laginndeling_forst_og_sist.mp4', '0e1472d1-439e-4131-ad24-b62368e99e75'),
      ('6088', 'public/wysiwyg-media/aktivitet_toget_gar.mp4', 'c0b986f3-4355-43e4-af93-cb7d9236ea57'),
      ('6091', 'public/wysiwyg-media/aktivitet_swipe_up_and_down.mp4', '7489bf4e-95ef-4e36-8f48-421e2f29a62b'),
      ('6092', 'public/wysiwyg-media/aktivitet_sumpmonsteret.mp4', '0a4783e2-bae7-4b40-bca1-76598b6f5da3'),
      ('6093', 'public/wysiwyg-media/alene_hjemme_no.mp4', 'e145d138-0ef5-4cb3-b5dc-ed0d85ca7752'),
      ('6094', 'public/wysiwyg-media/aktivitet_vinn_en_rockering.mp4', 'd726ede6-30d8-40d5-9914-4264cdf5a17c'),
      ('6095', 'public/wysiwyg-media/aktivitet_flippe_kjegle_pa_kjegle.mp4', '000f0ca9-91d4-4a90-9b70-e51b57f46be3'),
      ('6096', 'public/wysiwyg-media/aktivitet_hoyeste_kortet.mp4', '96a0ad95-34a2-4e71-b423-5948b4b43077'),
      ('6097', 'public/wysiwyg-media/aktivitet_jumbogevinsten.mp4', 'f2cbc26b-525d-4ae2-aef5-c57f428ba0e7'),
      ('6098', 'public/wysiwyg-media/aktivitet_kjeglevelten.mp4', '37a087be-9802-4cd9-b884-28a77998457c'),
      ('6099', 'public/wysiwyg-media/aktivitet_nikke-fange.mp4', '2fa54bf9-4789-4bdb-9347-ca8bac54d1f8'),
      ('6100', 'public/wysiwyg-media/digital_kursmodul_host_2021.mp4', '1f84c099-14c1-4389-85eb-c7a9373aac2d'),
      ('6101', 'public/wysiwyg-media/digital_kursmodul_vinter_2021.mp4', 'c2402bec-0e3e-459d-9e89-3ecd5ed393a4'),
      ('6102', 'public/wysiwyg-media/tl_digital_kursmodul_host_2020.mp4', 'cf09d860-3538-4ccb-bc35-39881f3679d8'),
      ('6146', 'public/wysiwyg-media/move_it_touche_fot.mp4', 'f54b99e7-ab86-42a3-8dab-fe1b695ff920'),
      ('6147', 'public/wysiwyg-media/move_it_kick_open_side_to_side.mp4', 'dc3a8106-6a3b-4102-9255-b6fa7e9b2b6c'),
      ('7378', 'public/wysiwyg-media/aktivitet_stinkdyret.mp4', '8ad1e80e-bc09-4b25-a9de-b5865a01f4b6'),
      ('7379', 'public/wysiwyg-media/aktivitet_ulvehulen.mp4', '8436cd1a-4852-430f-bd72-c0a85293317d'),
      ('7380', 'public/wysiwyg-media/aktivitet_jumbo_over_hodet.mp4', '5d28c27c-8e60-4375-b58a-4ef661f1c10b'),
      ('7381', 'public/wysiwyg-media/aktivitet_terningduellen.mp4', '040ebff7-5889-4fcb-a963-c39a865bb6d0'),
      ('7382', 'public/wysiwyg-media/aktivitet_kjeglememory.mp4', '37e6ea15-3470-412f-9d9e-ee9195587eaa'),
      ('7383', 'public/wysiwyg-media/aktivitet_perfekt_pasning.mp4', 'eec504a7-83fa-4089-86b3-94ae2bc95165'),
      ('7384', 'public/wysiwyg-media/aktivitet_gagaball.mp4', '3f1808c6-312d-4b93-96aa-d2d6d5e37915'),
      ('7385', 'public/wysiwyg-media/aktivitet_teamtoss_volley.mp4', 'fe00295c-5f73-4db9-87d5-185a06f3c096'),
      ('7387', 'public/wysiwyg-media/aktivitet_ja_eller_nei.mp4', '1a90b0b8-e183-4c7a-a85f-13bc8c63bf26'),
      ('7391', 'public/wysiwyg-media/movie_it_stempelet_gar.mp4', '58c0138f-9c8e-43c2-9732-de426888b4de'),
      ('7392', 'public/wysiwyg-media/move_it_forst_pa_kortet.mp4', '09bf728e-d971-4eaa-9448-78bad3f7975d'),
      ('7521', 'public/wysiwyg-media/digital_kursmodul_var_2022.mp4', 'e3102720-9d3b-4a25-9121-d3d07778c38b'),
      ('8852', 'public/wysiwyg-media/aktivitet_slalamkjoreren.mp4', '1ddf5fe0-7841-4635-8b1b-3972eb2dd66e'),
      ('8853', 'public/wysiwyg-media/aktivitet_flip_out._norsk.mp4', '17d79db4-23fb-47a0-a068-f1a396ba8d4d'),
      ('8854', 'public/wysiwyg-media/aktivitet_poengball.mp4', '3f5d4f30-7184-4e9d-94e7-0315f202ff37'),
      ('8855', 'public/wysiwyg-media/aktivitet_snurr_og_lop.mp4', 'e4214ca5-87cf-4510-98c3-57902bf93abc'),
      ('8856', 'public/wysiwyg-media/aktivitet_haukene.mp4', 'ce3b3608-b7a6-44fe-8f87-165a45d29a6c'),
      ('8857', 'public/wysiwyg-media/aktivitet_jaktlag.mp4', 'cf9f82e3-5900-48c9-8c7c-4e196534559d'),
      ('8858', 'public/wysiwyg-media/aktivitet_soppball_1.mp4', '5e885a26-1da3-403d-b16f-987e2a995243'),
      ('8859', 'public/wysiwyg-media/aktivitet_team-gaga.mp4', '784ea048-227b-4a17-9ca4-cdb316ca9a80'),
      ('8860', 'public/wysiwyg-media/aktivitet_terningfotball.mp4', 'f6627fe2-4117-4bfd-ad73-9da3859858ff'),
      ('8863', 'public/wysiwyg-media/aktivitet_ertekopp.mp4', '765536e8-4f35-4ead-bb2f-97ed98cbc0fe'),
      ('8864', 'public/wysiwyg-media/aktivitet_streetracket_-_nettet.mp4', '929a21a9-ef77-45b3-8c48-90f28c9c726c'),
      ('8865', 'public/wysiwyg-media/aktivitet_streetracket_-_ringen.mp4', '78c2080f-5ebb-44f8-93e5-8ef461f6af1a'),
      ('8866', 'public/wysiwyg-media/aktivitet_streetracket_-_veggen_0.mp4', 'c1244ab3-ba0a-4e9e-8c58-4cc1b4c8ab10'),
      ('8870', 'public/wysiwyg-media/aktivitet_korridoren.mp4', '5c88d9ed-898b-4cdd-9714-54c12a915024'),
      ('8871', 'public/wysiwyg-media/move_it_hopp_med_kropp._norsk.mp4', '902c1472-8b03-454c-b68e-ff2d5a19ea5a'),
      ('8872', 'public/wysiwyg-media/move_it_bevegelsesserie._norsk.mp4', 'ff8673cd-d8a2-40d1-85f2-855a8155d128'),
      ('8907', 'public/wysiwyg-media/digital_kursmodul_host_2022_1.mp4', 'a7a14256-d88c-4dbd-8767-faae6a84c050'),
      ('9662', 'public/wysiwyg-media/en_to_tre_1.mp4', 'e270ab04-1b85-4235-b7ae-4c86883cd1a6'),
      ('9663', 'public/wysiwyg-media/koden_0.mp4', 'f17d5da3-2323-4b68-b85a-fe606358a77a'),
      ('9744', 'public/wysiwyg-media/move_it_stein_saks_papir_-_hvem_vinner__1.mp4', '4d63dec5-2d85-4ae4-a72f-e2f243dd795c')
  ) as v(nid, sti, bid);
  if n_dist <> 261 then
    raise exception 'STOPP 110 (D-medier): payload har dublett paa (kilde_nid,storage_sti) — distinkte noekler=%, forventet 261. Ingenting endret.', n_dist;
  end if;
  if n <> 261 then
    raise exception 'STOPP 110 (D-medier): payload har dublett paa bunny_video_id eller feil antall — distinkte id/antall=%, forventet 261. Ingenting endret.', n;
  end if;

  -- ----------------------------------------------------------------------
  -- Oppdatering (medier)
  -- ----------------------------------------------------------------------
  update public.medier m
     set bunny_video_id = v.bid
  from ( values
      ('10123', 'public/wysiwyg-media/byggekaos.mp4', 'b652b13f-86b2-4d2a-bc29-2e3c84746461'),
      ('10124', 'public/wysiwyg-media/skattekammeret.mp4', 'f944631a-86cf-4920-b787-e59d13c87e2d'),
      ('10125', 'public/wysiwyg-media/stjernegevinsten.mp4', '76e1ee6d-f1b2-4ff8-a7e0-3840a443f937'),
      ('10126', 'public/wysiwyg-media/kjeglevinnerne.mp4', '1f5ceadb-07d9-4c0d-b567-f114dc8611bd'),
      ('10127', 'public/wysiwyg-media/befrierne.mp4', '819e25c3-acd0-4b1e-bf6d-6553016e2355'),
      ('10129', 'public/wysiwyg-media/den_forsvunne_diamanten.mp4', '760e220f-0aea-49ad-aea7-0ad26ae3e280'),
      ('10130', 'public/wysiwyg-media/ringracet.mp4', '52540750-e332-4b94-a365-23b85432bb58'),
      ('10131', 'public/wysiwyg-media/stein_saks_papir_stigen.mp4', '70af0857-e108-49c9-8698-1ba5d0625f11'),
      ('10132', 'public/wysiwyg-media/hatten_pa.mp4', '8a8ae084-0050-4732-9c7b-01611c70affd'),
      ('10133', 'public/wysiwyg-media/slalamstafetten_v2_1.mp4', '1d8e9343-24a1-4f99-a3a6-80b6d0fd7963'),
      ('10135', 'public/wysiwyg-media/finn_en_feil.mp4', '0ac52a77-cc76-41e1-8d3e-c385c48ab873'),
      ('10136', 'public/wysiwyg-media/skyggen.mp4', '82033e8f-30eb-4fd8-a3e0-91b35d1277f4'),
      ('10143', 'public/wysiwyg-media/digital_kursmodul_vinter_2023.mp4', 'd26bec58-539a-4989-9170-93376083bde1'),
      ('10173', 'public/wysiwyg-media/oppdraget_ny.mp4', 'cf0655c9-3b2c-417f-8c33-a2d2b1ea7414'),
      ('1039', 'public/wysiwyg-media/07_-_fengselsdirektoren_og_fangene_1080p_5mbps_nor.mp4', '913f1652-8af1-4045-a07d-66f2633eb728'),
      ('1040', 'public/wysiwyg-media/06_-_bil_og_garasje_1080p_5mbps_nor_0.mp4', '22baac90-6e4e-49e1-892e-614fd748efd5'),
      ('1041', 'public/wysiwyg-media/samlerne_no_0.mp4', 'b8ef54b0-069a-4d2f-b6c4-0692a39e119b'),
      ('1045', 'public/wysiwyg-media/aktivitet_blinkstafetten.mp4', 'f276d79f-f26c-4165-8faa-241e9cf0ae5a'),
      ('1048', 'public/wysiwyg-media/aktivitet_samurai.mp4', 'cd1ff0ca-e7e1-40c8-b024-5772773b36cb'),
      ('1051', 'public/wysiwyg-media/13_-_laererne_knuser_kidsa_1080p_5mbps_nor.mp4', '2cad6635-4f34-4324-b36e-ed1079e4deea'),
      ('1052', 'public/wysiwyg-media/nord_og_sor.mp4', '465b4ed0-b441-464d-9092-2245f68f9a4e'),
      ('1053', 'public/wysiwyg-media/09_-_ringbattle_1080p_5mbps_nor_0.mp4', '9e5261bd-11ad-49b3-8da9-4b1e4d1f7ff1'),
      ('1054', 'public/wysiwyg-media/sjiraffen_no.mp4', '7f978b5f-910e-4a3b-b974-440f08dd8927'),
      ('1058', 'public/wysiwyg-media/yoshi_no.mp4', '6dfe2b4c-0dd5-41dd-91b5-31dc561018af'),
      ('10581', 'public/wysiwyg-media/utfordring_dorulltarnet.mp4', '343dabc2-1f92-4e5e-a798-3b1e2fba1e40'),
      ('10582', 'public/wysiwyg-media/move_it_high_five.mp4', '3e9e3f8d-eca8-4d2f-9c11-13bd12cb0965'),
      ('10584', 'public/wysiwyg-media/movie_it_spagaten.mp4', 'f23f4f94-a2ec-4bf4-94dc-3443b98aeacc'),
      ('1059', 'public/wysiwyg-media/04_-_snorrmonsteret_1080p_5mbps_nor_0.mp4', '9bc883b0-6499-492a-851d-a630fdc9f092'),
      ('1060', 'public/wysiwyg-media/aktivitet_silent_escape.mp4', '6d891ced-f979-43eb-8c67-f7e05a121d50'),
      ('1064', 'public/wysiwyg-media/heia_heidi_redigert_0.mp4', 'c78e2761-9f98-4e7b-86c9-dd8d3b9897a6'),
      ('1065', 'public/wysiwyg-media/aktivitet_dropball.mp4', 'f4cb135f-ff5c-47f3-bdc3-587a727f4da5'),
      ('1066', 'public/wysiwyg-media/05_-_gladiatorene_1080p_5mbps_nor_0.mp4', 'fe0b9d54-e628-4a89-8c44-91797df31bd8'),
      ('1071', 'public/wysiwyg-media/aktivitet_piloten.mp4', 'd26129e1-abeb-4d86-acbb-fd0e2ff07845'),
      ('1076', 'public/wysiwyg-media/move_it_fire_lys.mp4', '9b2d5a2a-92d6-4657-8f59-13891bb3735f'),
      ('1082', 'public/wysiwyg-media/aktivitet_4_wembley.mp4', 'd3beff32-e384-45a9-b877-f122028202d6'),
      ('1092', 'public/wysiwyg-media/move_it_inn_til_midten.mp4', 'd293b2e5-3073-4da3-b96f-02746e3960fb'),
      ('1094', 'public/wysiwyg-media/aktivitet_rockehuset.mp4', 'dd8e8d66-264d-4612-aa3b-ea1bf5cef102'),
      ('1098', 'public/wysiwyg-media/aktivitet_fotballkubb.mp4', '6a0c7dbf-55cd-4072-a3de-15c84c3303de'),
      ('1100', 'public/wysiwyg-media/cowboyen_no.mp4', '811879a4-a4a6-4dda-9518-cacee5d7a40a'),
      ('1119', 'public/wysiwyg-media/erobreren_no.mp4', 'e5c809e6-1031-4c33-9f5c-705bdf474a33'),
      ('1133', 'public/wysiwyg-media/tail-tag_no_0.mp4', '1874ac28-1a15-4841-8adc-0cf187c981fb'),
      ('1134', 'public/wysiwyg-media/fargeduell_no.mp4', 'b903617f-bc88-4df7-963a-0fb6fe161659'),
      ('1135', 'public/wysiwyg-media/brennende_lavastein_no_0.mp4', 'da92b7f5-c73e-43f6-b210-c3e04539cafb'),
      ('1138', 'public/wysiwyg-media/move_it_dyrene_skriker.mp4', '1300abab-5772-4549-bd55-803793c1588e'),
      ('1141', 'public/wysiwyg-media/aktivitet_7_bevegelsesmemory.mp4', '81df9701-6a0e-4ab8-bee8-4eeb52d733f8'),
      ('1150', 'public/wysiwyg-media/harry_potter_no.mp4', '415bdd3d-6866-4b20-bd08-d8e03ce5d137'),
      ('1165', 'public/wysiwyg-media/amoba_no.mp4', '1db3730b-74e1-4fb3-a70b-9d9709b87712'),
      ('1178', 'public/wysiwyg-media/aktivitet_10_hi_ha_ho.mp4', 'acd6c169-5f78-404c-8fad-3efe96bc42c6'),
      ('1181', 'public/wysiwyg-media/skip_ohai_no.mp4', '89c7dd0c-400b-4574-b917-60d75750b7f9'),
      ('1182', 'public/wysiwyg-media/aktivitet_nattduellen.mp4', 'cacd49a0-7d1e-441b-9cc0-2bd0eb4d1c53'),
      ('1184', 'public/wysiwyg-media/chewbacca.mp4', 'aac1f2e3-a23a-4967-ad64-46c5a0ab2c1d'),
      ('1196', 'public/wysiwyg-media/aktivitet_8_elgen_helge.mp4', '2f55eb49-a451-484c-80e6-a32122883dd5'),
      ('1198', 'public/wysiwyg-media/ballfangeren_no.mp4', 'fde45c06-919e-41ac-af1e-cfb4950a1c59'),
      ('12388', 'public/wysiwyg-media/hoppeduellen_redigert_0.mp4', '9d62d5da-8dcb-461b-9fb8-3a684b3f2e24'),
      ('1246', 'public/wysiwyg-media/aktivitet_3_signalet.mp4', '6e6812e3-3cca-4004-b82b-bbd16b3bb8c1'),
      ('1247', 'public/wysiwyg-media/03_-_ekornsisten_1080p_5mbps_nor_0.mp4', '11f29ba4-3f74-4d8a-9067-038e607b810b'),
      ('1248', 'public/wysiwyg-media/aktivitet_steinen_bak_ryggen.mp4', '60563a89-05a2-4886-855d-dea228f0a608'),
      ('1255', 'public/wysiwyg-media/butterflynett_no_0.mp4', 'b21e2ae4-bf82-4ee3-977b-bf02df49cf6b'),
      ('13080', 'public/wysiwyg-media/digital_kursmodul_vinter_var_2024.mp4', 'a437c78d-aa12-4d75-acf8-c42074179aca'),
      ('1311', 'public/wysiwyg-media/superking_no.mp4', '73481e96-5492-448e-a971-a5859c04d79e'),
      ('1323', 'public/wysiwyg-media/aktivitet_prikk.mp4', '02ad5053-a2ba-4f74-9f28-79ace993bb43'),
      ('1328', 'public/wysiwyg-media/jungelfotball_no.mp4', 'fd23f06a-4f4a-4c37-93ed-954d76d3af5a'),
      ('1353', 'public/wysiwyg-media/15_-_bulldog_1080p_5mbps_nor.mp4', '89e12bc7-13a2-4e98-8687-b14762ed6280'),
      ('13623', 'public/wysiwyg-media/lek_2_-_supermusa_nor_v2_0.mp4', '48f70121-c8fd-49d0-9f80-2b574d21cbca'),
      ('13624', 'public/wysiwyg-media/lek_1_-_linjekampen_nor_v4_0.mp4', '4f83efc3-602e-4373-82e1-a9bb522906e4'),
      ('13625', 'public/wysiwyg-media/lek_3_-_togstopp_nor_v5.mp4', '53d33377-e8f0-4b0c-8687-9e821ee75cac'),
      ('13627', 'public/wysiwyg-media/lek_4_-_rydde_hagen_nor_v2.mp4', '707c7c4a-0b11-466c-8f81-f2a7d70e20de'),
      ('13628', 'public/wysiwyg-media/lek_5_-_dodraugen_nor_v2.mp4', '053a6b47-3cef-4180-ae89-eb44f1a3b206'),
      ('13629', 'public/wysiwyg-media/lek_6_-_masterball_med_frisbee_nor_v2.mp4', 'be54ecb9-950a-4364-8c4a-b9a468c079a0'),
      ('13630', 'public/wysiwyg-media/lek_7_-_indiana_jones_mini_nor_0.mp4', 'e5017eef-04b1-4b8a-be73-9ef8c62342a9'),
      ('13631', 'public/wysiwyg-media/lek_8_-_fliptriangelet_nor_v4.mp4', '2c3b41f1-a7a5-4d31-8ee7-c40778d2ef67'),
      ('13632', 'public/wysiwyg-media/lek_9_-_klokka_nor_v2.mp4', 'cdda9e3e-399a-4764-a0d2-ef54d315c0e7'),
      ('13633', 'public/wysiwyg-media/ta_flagget_nor_v2.mp4', '99d6c999-7c0c-4b82-b6ed-290320093054'),
      ('13634', 'public/wysiwyg-media/treeren_nor_v2.mp4', '31fd839d-554f-4579-b1ad-30c17db1f293'),
      ('13635', 'public/wysiwyg-media/lek_10_-_den_flyvende_pennen_nor_v2.mp4', '4b749859-2fc8-4e57-8ba4-30fee0c56e2a'),
      ('13649', 'public/wysiwyg-media/1_-_musenes_ostefest_h.264.mp4', 'f89c28cc-2f43-4c2a-a60d-558b5641d18e'),
      ('13650', 'public/wysiwyg-media/2_-_isduellen_h.264.mp4', 'd4395940-02fd-4b82-83d2-a1c56f1e157d'),
      ('13651', 'public/wysiwyg-media/3_-_det_skjeve_tarnet_h.264.mp4', 'bd442520-6286-4d20-92a2-ec7c6f1c21f7'),
      ('13652', 'public/wysiwyg-media/4_-_ballrenna_h.264.mp4', 'fb9caccd-822b-4023-977a-b771b906e36d'),
      ('13653', 'public/wysiwyg-media/5_-_jageband_h.264.mp4', '478db78f-ae9b-465b-a4dc-2d0e3d63fc39'),
      ('13655', 'public/wysiwyg-media/6_-_flyvende_tallerken_h.264.mp4', 'ba30d221-9bbb-4f1e-850f-ffcaa553c63d'),
      ('13656', 'public/wysiwyg-media/7_-_mastermind_h.264.mp4', 'a0d9d68c-ffa7-4c22-87d6-0e3ae5219231'),
      ('13657', 'public/wysiwyg-media/8_-_kjegleduellen_h.264.mp4', '88a7da0e-4761-4d61-bc16-2f2fcf59c85c'),
      ('13658', 'public/wysiwyg-media/9_-_gamechanger_h.264.mp4', 'a4c870ac-15f3-4589-b5bb-46897117c51f'),
      ('13659', 'public/wysiwyg-media/10_-_alle_mot_alle_h.264.mp4', 'c050418b-4fe2-4eeb-b667-a9583661faba'),
      ('13660', 'public/wysiwyg-media/11_-_hoyere_eller_lavere_svensk_h.264.mp4', 'fe679134-5b71-4b7c-ae8b-2d770c0ab63b'),
      ('13662', 'public/wysiwyg-media/15_-_krysset_h.264.mp4', '97f65a46-7208-4716-877b-53b29ffda970'),
      ('13663', 'public/wysiwyg-media/16_-_telleren_h.264.mp4', 'ca294bee-dec2-4c34-bd72-675ff6fca289'),
      ('1388', 'public/wysiwyg-media/aktivitet_dansesisten.mp4', 'df91aca4-3745-4bfb-86fc-59f8dce24c3a'),
      ('1393', 'public/wysiwyg-media/aktivitet_limbo.mp4', '76ec739e-bd64-4cb1-9456-09b6407d8eda'),
      ('1422', 'public/wysiwyg-media/aktivitet_fallskjerm.mp4', '62ed31b5-3e4c-443f-90bd-81b1518fed9f'),
      ('1433', 'public/wysiwyg-media/move_it_atomleken.mp4', '21ad5c88-5fb5-424c-b66c-cb6295486871'),
      ('1452', 'public/wysiwyg-media/siste_paret_ut_no.mp4', '91a8be01-ff32-4ec3-b1f5-7349f75f5251'),
      ('14735', 'public/wysiwyg-media/01_-_box_ball_1080p_5mbps_nor_0.mp4', 'c37848f0-42e5-49ee-bb49-72e4c8adbe10'),
      ('14738', 'public/wysiwyg-media/10_-_levende_fotballmal_1080p_5mbps_nor.mp4', '13df5f2d-8102-44b1-ac70-1827f2d02d64'),
      ('14739', 'public/wysiwyg-media/11_-_heis_flagget_1080p_5mbps_nor.mp4', '1c2fbed8-5975-4065-ab06-af375e493105'),
      ('14748', 'public/wysiwyg-media/alle_leker_1080p_2mbps_nor.mp4', '29bc735d-4f53-44b4-9c9a-2b44f747b629'),
      ('15355', 'public/wysiwyg-media/fire_lys_no.mp4', 'f86c1f6b-ed8b-4dc5-b6ee-d6d449ec47a4'),
      ('15373', 'public/wysiwyg-media/nattduellen.mp4', '9f8681b5-1467-44ee-9aa4-420fc81849ec'),
      ('16122', 'public/wysiwyg-media/nominasjonsvideo.mp4', '26cae571-1147-42f2-b2da-3ced77fcb36b'),
      ('16213', 'public/wysiwyg-media/selfiesisten_no.mp4', '045c70c9-a05d-4b9a-83a2-ddf9613c9319'),
      ('16214', 'public/wysiwyg-media/kuslippet_no.mp4', '51c2559c-9fe5-4467-8cd7-e68a044b1513'),
      ('16579', 'public/wysiwyg-media/boom_klapp_snapp.mp4', 'fa6ad793-0aba-4a53-b8c0-3189e5e50746'),
      ('16714', 'public/wysiwyg-media/fingerspelet_med_hogstdaie-ram__0.mp4', '84915f1a-2f87-4c2c-a79a-dc9289097411'),
      ('16715', 'public/wysiwyg-media/fotnian_hogstadie-ram_0.mp4', 'a7e7621b-f213-4f6b-b072-9ac9065924da'),
      ('16716', 'public/wysiwyg-media/hjulet_hogstadie_-ram_.mp4', '7a064e59-2b7b-42b7-aaba-4c23210831aa'),
      ('16717', 'public/wysiwyg-media/huvud_mage_hogstadie_-ram_.mp4', '0cc7a3ae-fc6d-4c94-8b20-1fd1e5e836b5'),
      ('16718', 'public/wysiwyg-media/orm_och_delfin_med_hogstadie_ram.mp4', 'ecd48c87-fd00-4f46-8512-b60376618bcc'),
      ('16719', 'public/wysiwyg-media/tumme_upp_hogstadie_-ram.mp4', 'be7ac9a1-877a-4d43-954f-8431e57ccb87'),
      ('16775', 'public/wysiwyg-media/viskelaersisten.mp4', 'd67faf52-8bf2-4e5a-9848-149e17f07acf'),
      ('1682', 'public/wysiwyg-media/aktivitet_myggsisten-myggjage.mp4', 'a919d07d-f09f-4276-a017-0d1131b41136'),
      ('1685', 'public/wysiwyg-media/02_-_rubiks_matte_1080p_5mbps_nor_0.mp4', 'b7438364-1769-405a-b4d0-ae1e2e18bf40'),
      ('1687', 'public/wysiwyg-media/tvert_om_no_0.mp4', '666e50b8-3c77-4618-9549-b6bfb46c2a3b'),
      ('1688', 'public/wysiwyg-media/pirates_of_the_caribbean_no_0.mp4', '1e1bdf6c-9960-4393-87ba-0804b90f0c10'),
      ('1691', 'public/wysiwyg-media/touchball_no_0.mp4', '7708f6cf-219f-4d0e-af49-90c6c9440c9f'),
      ('1693', 'public/wysiwyg-media/nummerleken_no.mp4', '7d099579-9d3a-416c-8148-20c343aedb9e'),
      ('17073', 'public/wysiwyg-media/popcorn.mp4', '37fae98b-cebf-47c8-912f-aff0db0fbcc0'),
      ('17095', 'public/wysiwyg-media/klapperingen_no.mp4', 'b8bf664b-03ef-45af-96b1-db1a60afa01a'),
      ('17383', 'public/wysiwyg-media/muggduellen_0.mp4', 'e308e77e-fca7-484d-a87e-ae1df778295b'),
      ('17385', 'public/wysiwyg-media/draduellen_no_0.mp4', 'd5b1a8ff-aac3-4791-9c3b-f2243be781c9'),
      ('17386', 'public/wysiwyg-media/fanga_hatten_0.mp4', '8d817f8f-3603-4f9c-aaa5-a56ff7b368bc'),
      ('17387', 'public/wysiwyg-media/koll_pa_bollen.mp4', '743d0f6c-d440-4cce-b0d0-c6e83322dad6'),
      ('17388', 'public/wysiwyg-media/fanga_boll_i_stapel.mp4', '45b7f56f-64db-48a9-98eb-ac304b3aff58'),
      ('17389', 'public/wysiwyg-media/klockan.mp4', '4635612c-96b7-4a1a-928a-458e96dc1ab4'),
      ('17724', 'public/wysiwyg-media/blyantene.mp4', '127b4223-d0b1-4ac5-a6db-a73e8dc2902b'),
      ('17726', 'public/wysiwyg-media/koll_pa_bollen_0.mp4', '5ca58d67-e1a9-4582-95cb-cdb3105d64e6'),
      ('17729', 'public/wysiwyg-media/tyv_og_politi_no.mp4', 'ec5bf44a-bab6-4d58-a896-7e3fd0fdacd8'),
      ('17746', 'public/wysiwyg-media/bytt_hus_no.mp4', '52fc6af9-f166-4fe9-8117-f5663650216e'),
      ('17748', 'public/wysiwyg-media/kin-ball-sisten_no.mp4', '22fd8e3c-7b1d-4f5a-8539-1b6ca355621b'),
      ('17749', 'public/wysiwyg-media/speed_stacks-stafett_no.mp4', 'f1d142a1-6fce-4154-b084-e0e9eccccba1'),
      ('18397', 'public/wysiwyg-media/hei_hello_hallo.mp4', 'c1796583-e501-4076-8540-45b124ac7a4d'),
      ('18398', 'public/wysiwyg-media/feil_farge_no_0.mp4', '4c89655b-65ee-409f-9f03-61a553e243d9'),
      ('18406', 'public/wysiwyg-media/hodepine.mp4', 'a54de4e1-a388-4b78-adb6-b0ec135d47b3'),
      ('18407', 'public/wysiwyg-media/fotsignaturen.mp4', '67048de1-89f1-48a1-b288-e13279956ac1'),
      ('18408', 'public/wysiwyg-media/klappen_gar_0.mp4', 'a19f03c4-6b11-4236-afbe-b07b380c3693'),
      ('18411', 'public/wysiwyg-media/kontorpingis.mp4', '5df2d62a-28ec-40b2-879f-829550123bda'),
      ('18413', 'public/wysiwyg-media/lynpennen.mp4', 'd48aef89-fa4a-4bfb-916a-8745c7342ba8'),
      ('18419', 'public/wysiwyg-media/klokka_1_minutt.mp4', '7fbc0abb-a731-43a1-ba71-5fef24302659'),
      ('18433', 'public/wysiwyg-media/tre_klapp_spring_no_0.mp4', 'aa143d68-73b4-4d3d-98bd-a02e2548aa00'),
      ('18434', 'public/wysiwyg-media/klossen.mp4', '9de4a81a-3a63-456b-9fb6-8c659e9f8f93'),
      ('18436', 'public/wysiwyg-media/sifferdans.mp4', '105be93f-2599-4a99-a57d-1b8f309b359c'),
      ('18437', 'public/wysiwyg-media/klasseromsoppdrag.mp4', '597787c7-6bf8-4410-86aa-646a2cb45274'),
      ('18438', 'public/wysiwyg-media/gjett_ordet.mp4', '7f2c9461-62f0-45c6-ab03-259d2abc1fc2'),
      ('18439', 'public/wysiwyg-media/pingvinen.mp4', 'd18e5015-e379-451e-ac1d-4788330bc193'),
      ('18840', 'public/wysiwyg-media/jumbojageren_no_0.mp4', '465f1544-4186-4277-8ca5-12c54b2c552e'),
      ('18841', 'public/wysiwyg-media/kjempe_trollmann_og_drage_no_0.mp4', '66f49a38-6a40-4637-8c25-8f116f9b9b82'),
      ('18842', 'public/wysiwyg-media/byggeracet_no_0.mp4', '315f5b0d-7ae7-405b-8cc6-80c49fad4c27'),
      ('18843', 'public/wysiwyg-media/vend_pannekaken_no_0.mp4', 'f6608d26-8130-4c31-b2f4-86735bf46664'),
      ('18844', 'public/wysiwyg-media/rekkefolgen_-_duell_no_0.mp4', 'fb5a80e5-e2ec-40ad-a7eb-38761533cacd'),
      ('18895', 'public/wysiwyg-media/speedstacksmonstret.mp4', '78bb9853-9513-45fe-b409-8902ee1357c7'),
      ('18896', 'public/wysiwyg-media/film_boll_i_hatt_.mp4', '4a632858-9cc0-4915-b91e-41ee18e8c9fe'),
      ('18897', 'public/wysiwyg-media/kul_i_bok.mp4', 'e8cf0859-bcdd-45d5-a917-674358f8b013'),
      ('18898', 'public/wysiwyg-media/snurra_rockringen.mp4', 'bb888cb5-372d-4106-b139-9e8ea07998f1'),
      ('20063', 'public/wysiwyg-media/minuttball_no.mp4', '2e4d5c44-4895-4daf-8c55-97cd094de907'),
      ('20064', 'public/wysiwyg-media/slottstriden_no.mp4', '516fe12e-19a7-417e-9ff4-a7a592efcce2'),
      ('20065', 'public/wysiwyg-media/sirkelsprett_no.mp4', 'f0b9bdc2-77ee-4577-be85-711938ad2e2e'),
      ('20066', 'public/wysiwyg-media/bikuben_no.mp4', '207e6935-c772-4793-8287-cb8c2e1a3e4e'),
      ('20067', 'public/wysiwyg-media/flyvende_farger_no_new.mp4', 'da5138d3-3849-4f5c-9051-174e05f25469'),
      ('20068', 'public/wysiwyg-media/krokodille-_og_myggsisten_no.mp4', '82a49352-b8e6-4dab-af0d-24a60afce4b5'),
      ('20069', 'public/wysiwyg-media/pingvin_og_pelikan_no.mp4', '68bec641-4c1d-438c-a87b-61af16b3eb55'),
      ('20070', 'public/wysiwyg-media/boccia-bowling_no.mp4', '315e84d1-23a3-4a5a-9a39-033338a0c02c'),
      ('20071', 'public/wysiwyg-media/signalet_no.mp4', 'c494e123-3432-4b17-80ac-1034320256e2'),
      ('20072', 'public/wysiwyg-media/stein_saks_papir_-_runden_no.mp4', '5fa3592b-8165-4c9d-a34a-e0c63ef8cd29'),
      ('20073', 'public/wysiwyg-media/moonball_challenge_no.mp4', 'e9bd31b6-7a4b-4592-b1a2-c953559ca66d'),
      ('20074', 'public/wysiwyg-media/moonball_-_sprett_og_fang_no.mp4', '6d17d769-0b08-4c86-89e8-9e17f979961d'),
      ('20075', 'public/wysiwyg-media/moonball_-_kast_og_fang_no.mp4', 'ce99ac16-556a-4cd1-936d-7f7a30da48f1'),
      ('20076', 'public/wysiwyg-media/clap_trap_no.mp4', 'd4e3f7c8-df72-44f2-afb3-1e77e3fb2b0f'),
      ('20077', 'public/wysiwyg-media/rytmerebellen_no.mp4', '23052047-4dbb-4f7a-ae5b-da2432f01a7b'),
      ('2264', 'public/wysiwyg-media/move_it_fange_finger.mp4', '09deab49-298a-44cb-a058-7bace69f5dae'),
      ('2265', 'public/wysiwyg-media/aktivitet_parsisten.mp4', 'd988476e-e505-44fe-aadc-b671536fa982'),
      ('2271', 'public/wysiwyg-media/elgen_velger_no.mp4', 'b0520f66-e420-4e6f-a359-e1c76b116564'),
      ('2274', 'public/wysiwyg-media/hopp_inn_-_hopp_ut_1234_redigert_0.mp4', 'e3a8185b-f676-4f79-8d45-38f24257dae2'),
      ('2275', 'public/wysiwyg-media/move_it_bevegelsesalfabetet.mp4', 'edf1308b-6d6c-4f08-83f5-4b68123082a8'),
      ('2277', 'public/wysiwyg-media/felles_krefter_redigert_0.mp4', '59c60355-4ef1-4716-9072-f9039f7c67a4'),
      ('2281', 'public/wysiwyg-media/aktivitet_100_om_dagen.mp4', '75d6a926-5900-43ae-aeb3-c4cb90147a83'),
      ('2282', 'public/wysiwyg-media/move_it_just_dance.mp4', 'e1ff3fd0-3bdc-4b20-902d-d4a3c94635a5'),
      ('2468', 'public/wysiwyg-media/move_it_enarmet_banditt.mp4', '9773ad01-fbd6-410d-81f1-ca226e43eb3b'),
      ('2735', 'public/wysiwyg-media/aktivitet_snikende_tiger.mp4', '7c953669-3f0b-4249-904c-4eb86839ceb1'),
      ('2737', 'public/wysiwyg-media/stokk_eller_stein_no_ny_0.mp4', '5292de63-c6ea-4a0c-bb55-43baff8764fe'),
      ('2773', 'public/wysiwyg-media/08_-_terningstafett_1080p_5mbps_nor_0.mp4', 'e9d9c570-6a63-403f-a962-59deed93490a'),
      ('2844', 'public/wysiwyg-media/tl-aktivitet_flyvern.mp4', 'cea9599b-62aa-48f0-85af-74f4a7edf2a5'),
      ('3200', 'public/wysiwyg-media/koralljakten_no_0.mp4', '1a42e59f-a3e2-4ba7-b6e9-8b20913d1408'),
      ('3206', 'public/wysiwyg-media/aktivitet_boccia_bowling.mp4', 'a917e3c5-9bdb-4ef3-95d8-54cdfd267554'),
      ('3688', 'public/wysiwyg-media/move_it_abc_123.mp4', 'ae5fa2f1-18a8-4fd6-9d24-bf4758db9b20'),
      ('3689', 'public/wysiwyg-media/move_it_knyttneve_highfive.mp4', 'a2426656-be3c-4575-a7af-bbbb028aaa9a'),
      ('3888', 'public/wysiwyg-media/move_it_forst_pa_steinen.mp4', '3f5e6972-a281-460f-a8b0-3960a29d9308'),
      ('3907', 'public/wysiwyg-media/move_it._regneduellen.mp4', 'dc068e7c-b715-4a8f-a122-c530fd41ed8b'),
      ('3908', 'public/wysiwyg-media/move_it_stein_saks_papir_hopp.mp4', '16c52eab-8cb7-4908-8e0e-fbb1b0d5e457'),
      ('3931', 'public/wysiwyg-media/move_it_terningyoga.mp4', 'ac054240-29c4-41c4-9874-3ac94af7aa46'),
      ('3933', 'public/wysiwyg-media/move_it_slap_jack.mp4', '344768ba-abaa-4dd1-b53f-3804cca98caf'),
      ('3934', 'public/wysiwyg-media/move_it_dyreparken.mp4', 'de3d4f5f-9021-43fe-a401-7f8c03688946'),
      ('3935', 'public/wysiwyg-media/move_it_gjett_sporten-_gissa_sporten.mp4', 'd0bdcd38-7f65-4a48-a783-baac74821d35'),
      ('3936', 'public/wysiwyg-media/move_it_forst_til_50.mp4', 'eb62cfa3-abda-47f7-a867-718faab6f7d6'),
      ('3937', 'public/wysiwyg-media/move_it_tryllestav.mp4', '6094d578-f561-457c-975e-4931174f11d5'),
      ('3939', 'public/wysiwyg-media/21_no_0.mp4', '48b31eb0-d782-444d-9190-b97a73f724d1'),
      ('3940', 'public/wysiwyg-media/aktivitet_dance_monkey.mp4', '73cf86bd-8c66-4425-b0ac-64ebdf4360a0'),
      ('4091', 'public/wysiwyg-media/aktivitet_spinn_og_spring.mp4', '86a95bb3-1fe4-461f-8505-9512e71bdc5e'),
      ('4092', 'public/wysiwyg-media/aktivitet_2_rattent_egg.mp4', 'bbfb4094-0df2-4e68-9a02-96caad8dc244'),
      ('4093', 'public/wysiwyg-media/aktivitet_5_griseflaks_1.mp4', 'a834b6d2-ae1a-45c2-844a-a6ba4a69ac0e'),
      ('4094', 'public/wysiwyg-media/aktivitet_9_flytte_ringen.mp4', 'efc4dd41-2b69-48e7-a091-5b5e34f00ca4'),
      ('4497', 'public/wysiwyg-media/speed_stacks_no_utomhus.mp4', 'e1784608-6602-46f1-bc62-e64c544de936'),
      ('5131', 'public/wysiwyg-media/aktivitet_volleyball_med_sixball.mp4', '53a4e2ea-e38c-4e97-91f4-0e1036d6cd7a'),
      ('5132', 'public/wysiwyg-media/aktivitet_to_tarn.mp4', '705c6a06-0be0-455f-857f-925b18699397'),
      ('5133', 'public/wysiwyg-media/aktivitet_terningsisten.mp4', '3179fb59-151b-41e3-b338-0900d66b9658'),
      ('5135', 'public/wysiwyg-media/move_it_stein_saks_papir_nittigradern.mp4', '372e9c44-bf2a-4fe5-9e11-c2bfeda5413e'),
      ('5136', 'public/wysiwyg-media/move_it_stein_saks_papir_med_ertepose.mp4', 'a3d86b1c-83ac-4fbd-8ef5-f3c5d2c13b4a'),
      ('5137', 'public/wysiwyg-media/aktivitet_spinnsisten.mp4', '3fe2fc96-a3eb-4930-9ec8-9843654d9391'),
      ('5138', 'public/wysiwyg-media/aktivitet_larven.mp4', 'decfd81e-6e36-43ff-a7bd-23ee1f705f88'),
      ('5139', 'public/wysiwyg-media/aktivitet_jumbostafett.mp4', '22ceca7e-e18f-4ea9-8b1e-57875a07698b'),
      ('5140', 'public/wysiwyg-media/aktivitet_flip_it.mp4', '15f162f6-b77f-429e-a52e-3ccebf0e95ee'),
      ('5141', 'public/wysiwyg-media/aktivitet_drakamp.mp4', 'e93530de-6cf6-4d19-a96f-8eb553e29249'),
      ('5145', 'public/wysiwyg-media/aktivitet_varme_kalde_baller.mp4', '05d8ba9a-8f9e-42cf-b851-dc4fc6b4d156'),
      ('6006', 'public/wysiwyg-media/move_it_dyrene_i_afrika.mp4', '19a86cc3-1b94-4f60-ab21-eff7793529ae'),
      ('6086', 'public/wysiwyg-media/laginndeling_forst_og_sist.mp4', '0e1472d1-439e-4131-ad24-b62368e99e75'),
      ('6088', 'public/wysiwyg-media/aktivitet_toget_gar.mp4', 'c0b986f3-4355-43e4-af93-cb7d9236ea57'),
      ('6091', 'public/wysiwyg-media/aktivitet_swipe_up_and_down.mp4', '7489bf4e-95ef-4e36-8f48-421e2f29a62b'),
      ('6092', 'public/wysiwyg-media/aktivitet_sumpmonsteret.mp4', '0a4783e2-bae7-4b40-bca1-76598b6f5da3'),
      ('6093', 'public/wysiwyg-media/alene_hjemme_no.mp4', 'e145d138-0ef5-4cb3-b5dc-ed0d85ca7752'),
      ('6094', 'public/wysiwyg-media/aktivitet_vinn_en_rockering.mp4', 'd726ede6-30d8-40d5-9914-4264cdf5a17c'),
      ('6095', 'public/wysiwyg-media/aktivitet_flippe_kjegle_pa_kjegle.mp4', '000f0ca9-91d4-4a90-9b70-e51b57f46be3'),
      ('6096', 'public/wysiwyg-media/aktivitet_hoyeste_kortet.mp4', '96a0ad95-34a2-4e71-b423-5948b4b43077'),
      ('6097', 'public/wysiwyg-media/aktivitet_jumbogevinsten.mp4', 'f2cbc26b-525d-4ae2-aef5-c57f428ba0e7'),
      ('6098', 'public/wysiwyg-media/aktivitet_kjeglevelten.mp4', '37a087be-9802-4cd9-b884-28a77998457c'),
      ('6099', 'public/wysiwyg-media/aktivitet_nikke-fange.mp4', '2fa54bf9-4789-4bdb-9347-ca8bac54d1f8'),
      ('6100', 'public/wysiwyg-media/digital_kursmodul_host_2021.mp4', '1f84c099-14c1-4389-85eb-c7a9373aac2d'),
      ('6101', 'public/wysiwyg-media/digital_kursmodul_vinter_2021.mp4', 'c2402bec-0e3e-459d-9e89-3ecd5ed393a4'),
      ('6102', 'public/wysiwyg-media/tl_digital_kursmodul_host_2020.mp4', 'cf09d860-3538-4ccb-bc35-39881f3679d8'),
      ('6146', 'public/wysiwyg-media/move_it_touche_fot.mp4', 'f54b99e7-ab86-42a3-8dab-fe1b695ff920'),
      ('6147', 'public/wysiwyg-media/move_it_kick_open_side_to_side.mp4', 'dc3a8106-6a3b-4102-9255-b6fa7e9b2b6c'),
      ('7378', 'public/wysiwyg-media/aktivitet_stinkdyret.mp4', '8ad1e80e-bc09-4b25-a9de-b5865a01f4b6'),
      ('7379', 'public/wysiwyg-media/aktivitet_ulvehulen.mp4', '8436cd1a-4852-430f-bd72-c0a85293317d'),
      ('7380', 'public/wysiwyg-media/aktivitet_jumbo_over_hodet.mp4', '5d28c27c-8e60-4375-b58a-4ef661f1c10b'),
      ('7381', 'public/wysiwyg-media/aktivitet_terningduellen.mp4', '040ebff7-5889-4fcb-a963-c39a865bb6d0'),
      ('7382', 'public/wysiwyg-media/aktivitet_kjeglememory.mp4', '37e6ea15-3470-412f-9d9e-ee9195587eaa'),
      ('7383', 'public/wysiwyg-media/aktivitet_perfekt_pasning.mp4', 'eec504a7-83fa-4089-86b3-94ae2bc95165'),
      ('7384', 'public/wysiwyg-media/aktivitet_gagaball.mp4', '3f1808c6-312d-4b93-96aa-d2d6d5e37915'),
      ('7385', 'public/wysiwyg-media/aktivitet_teamtoss_volley.mp4', 'fe00295c-5f73-4db9-87d5-185a06f3c096'),
      ('7387', 'public/wysiwyg-media/aktivitet_ja_eller_nei.mp4', '1a90b0b8-e183-4c7a-a85f-13bc8c63bf26'),
      ('7391', 'public/wysiwyg-media/movie_it_stempelet_gar.mp4', '58c0138f-9c8e-43c2-9732-de426888b4de'),
      ('7392', 'public/wysiwyg-media/move_it_forst_pa_kortet.mp4', '09bf728e-d971-4eaa-9448-78bad3f7975d'),
      ('7521', 'public/wysiwyg-media/digital_kursmodul_var_2022.mp4', 'e3102720-9d3b-4a25-9121-d3d07778c38b'),
      ('8852', 'public/wysiwyg-media/aktivitet_slalamkjoreren.mp4', '1ddf5fe0-7841-4635-8b1b-3972eb2dd66e'),
      ('8853', 'public/wysiwyg-media/aktivitet_flip_out._norsk.mp4', '17d79db4-23fb-47a0-a068-f1a396ba8d4d'),
      ('8854', 'public/wysiwyg-media/aktivitet_poengball.mp4', '3f5d4f30-7184-4e9d-94e7-0315f202ff37'),
      ('8855', 'public/wysiwyg-media/aktivitet_snurr_og_lop.mp4', 'e4214ca5-87cf-4510-98c3-57902bf93abc'),
      ('8856', 'public/wysiwyg-media/aktivitet_haukene.mp4', 'ce3b3608-b7a6-44fe-8f87-165a45d29a6c'),
      ('8857', 'public/wysiwyg-media/aktivitet_jaktlag.mp4', 'cf9f82e3-5900-48c9-8c7c-4e196534559d'),
      ('8858', 'public/wysiwyg-media/aktivitet_soppball_1.mp4', '5e885a26-1da3-403d-b16f-987e2a995243'),
      ('8859', 'public/wysiwyg-media/aktivitet_team-gaga.mp4', '784ea048-227b-4a17-9ca4-cdb316ca9a80'),
      ('8860', 'public/wysiwyg-media/aktivitet_terningfotball.mp4', 'f6627fe2-4117-4bfd-ad73-9da3859858ff'),
      ('8863', 'public/wysiwyg-media/aktivitet_ertekopp.mp4', '765536e8-4f35-4ead-bb2f-97ed98cbc0fe'),
      ('8864', 'public/wysiwyg-media/aktivitet_streetracket_-_nettet.mp4', '929a21a9-ef77-45b3-8c48-90f28c9c726c'),
      ('8865', 'public/wysiwyg-media/aktivitet_streetracket_-_ringen.mp4', '78c2080f-5ebb-44f8-93e5-8ef461f6af1a'),
      ('8866', 'public/wysiwyg-media/aktivitet_streetracket_-_veggen_0.mp4', 'c1244ab3-ba0a-4e9e-8c58-4cc1b4c8ab10'),
      ('8870', 'public/wysiwyg-media/aktivitet_korridoren.mp4', '5c88d9ed-898b-4cdd-9714-54c12a915024'),
      ('8871', 'public/wysiwyg-media/move_it_hopp_med_kropp._norsk.mp4', '902c1472-8b03-454c-b68e-ff2d5a19ea5a'),
      ('8872', 'public/wysiwyg-media/move_it_bevegelsesserie._norsk.mp4', 'ff8673cd-d8a2-40d1-85f2-855a8155d128'),
      ('8907', 'public/wysiwyg-media/digital_kursmodul_host_2022_1.mp4', 'a7a14256-d88c-4dbd-8767-faae6a84c050'),
      ('9662', 'public/wysiwyg-media/en_to_tre_1.mp4', 'e270ab04-1b85-4235-b7ae-4c86883cd1a6'),
      ('9663', 'public/wysiwyg-media/koden_0.mp4', 'f17d5da3-2323-4b68-b85a-fe606358a77a'),
      ('9744', 'public/wysiwyg-media/move_it_stein_saks_papir_-_hvem_vinner__1.mp4', '4d63dec5-2d85-4ae4-a72f-e2f243dd795c')
  ) as v(nid, sti, bid)
  where m.kilde_nid = v.nid
    and m.storage_sti = v.sti
    and m.type = 'video'
    and m.import_kjoring_id = v_kj;
  get diagnostics n_med_updated = row_count;

  -- ----------------------------------------------------------------------
  -- Sperre D (samling_medie): 3 rader, ingen dubletter
  -- ----------------------------------------------------------------------
  select count(*), count(distinct (nid, sti)), count(distinct bid)
    into n, n_dist, n
  from ( values
      ('16190', '/file/oppdatertogkomprimertmp4', '3543669f-bab1-4b30-aec8-b529237f5d49'),
      ('18822', '/file/allalekarno500mbmp4', '8b5d4425-1377-4374-9c2c-deb8f96fc567'),
      ('20030', '/file/allanorskalekarnewmp4', '45f407eb-20b2-4e3a-a4cd-0693a8924ce4')
  ) as v(nid, sti, bid);
  if n_dist <> 3 then
    raise exception 'STOPP 110 (D-samling): payload har dublett paa (kilde_nid,storage_sti) — distinkte noekler=%, forventet 3. Ingenting endret.', n_dist;
  end if;
  if n <> 3 then
    raise exception 'STOPP 110 (D-samling): payload har dublett paa bunny_video_id eller feil antall=%, forventet 3. Ingenting endret.', n;
  end if;

  -- ----------------------------------------------------------------------
  -- Oppdatering (samling_medie)
  -- ----------------------------------------------------------------------
  update public.samling_medie m
     set bunny_video_id = v.bid
  from ( values
      ('16190', '/file/oppdatertogkomprimertmp4', '3543669f-bab1-4b30-aec8-b529237f5d49'),
      ('18822', '/file/allalekarno500mbmp4', '8b5d4425-1377-4374-9c2c-deb8f96fc567'),
      ('20030', '/file/allanorskalekarnewmp4', '45f407eb-20b2-4e3a-a4cd-0693a8924ce4')
  ) as v(nid, sti, bid)
  where m.kilde_nid = v.nid
    and m.storage_sti = v.sti
    and m.type = 'video'
    and m.import_kjoring_id = v_kj;
  get diagnostics n_sam_updated = row_count;

  -- ----------------------------------------------------------------------
  -- Sperrer ETTER (samme transaksjon): riktig antall rader oppdatert, og
  -- ingen ANDRE rader roert (hele-tabell-tellingen oekte med noeyaktig det
  -- antallet vi oppdaterte, fra baseline).
  -- ----------------------------------------------------------------------
  if n_med_updated <> 261 then
    raise exception 'STOPP 110 (etter, medier): oppdaterte % rader, forventet 261. Rulles tilbake.', n_med_updated;
  end if;
  if n_sam_updated <> 3 then
    raise exception 'STOPP 110 (etter, samling): oppdaterte % rader, forventet 3. Rulles tilbake.', n_sam_updated;
  end if;

  select count(*) into n_med_after_tab from public.medier        where bunny_video_id is not null;
  select count(*) into n_sam_after_tab from public.samling_medie where bunny_video_id is not null;

  if n_med_after_tab <> n_med_before_tab + 261 then
    raise exception 'STOPP 110 (etter, medier hele tabell): bunny_video_id-antall gikk fra % til %, forventet +261. Andre rader kan vaere roert. Rulles tilbake.', n_med_before_tab, n_med_after_tab;
  end if;
  if n_sam_after_tab <> n_sam_before_tab + 3 then
    raise exception 'STOPP 110 (etter, samling hele tabell): bunny_video_id-antall gikk fra % til %, forventet +3. Rulles tilbake.', n_sam_before_tab, n_sam_after_tab;
  end if;

  raise notice '110 OK: medier +% , samling_medie +% (hele tabell: medier %->%, samling %->%)',
    n_med_updated, n_sam_updated, n_med_before_tab, n_med_after_tab, n_sam_before_tab, n_sam_after_tab;
end $$;

-- ----------------------------------------------------------------------------
-- Kvittering: EN rad. Les etter kjoering (og under forhaandsvisning m/rollback).
-- ----------------------------------------------------------------------------
select string_agg(x, ' · ') as kvittering_110 from ( values
  ('medier koblet (kjoering): '        || (select count(*) from public.medier        where type='video' and import_kjoring_id='b275b3c7-d8a5-447d-8ac7-b2c955b18738' and bunny_video_id is not null)::text),
  ('samling_medie koblet (kjoering): ' || (select count(*) from public.samling_medie where type='video' and import_kjoring_id='b275b3c7-d8a5-447d-8ac7-b2c955b18738' and bunny_video_id is not null)::text),
  ('distinkte bunny_video_id (begge): '|| (select count(distinct bid) from (
        select bunny_video_id bid from public.medier        where type='video' and import_kjoring_id='b275b3c7-d8a5-447d-8ac7-b2c955b18738' and bunny_video_id is not null
        union all
        select bunny_video_id     from public.samling_medie where type='video' and import_kjoring_id='b275b3c7-d8a5-447d-8ac7-b2c955b18738' and bunny_video_id is not null
     ) q)::text),
  ('medier med bunny_video_id (hele tabell): ' || (select count(*) from public.medier where bunny_video_id is not null)::text)
) as t(x);

commit;
