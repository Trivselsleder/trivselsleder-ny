-- ============================================================================
-- 144_ryddig_rettigheter_truncate_skoler.sql
--   — fjern TRUNCATE/TRIGGER/REFERENCES/MAINTAIN og anon-skriving som ikke skal være der
-- ============================================================================
-- KILDE (fasit): Fable-rekontroll 18. sep + prods MÅLTE rettighetsbilde 18. sep
--   (public, alle tabeller):
--     anon:          TRUNCATE 67 · TRIGGER 67 · REFERENCES 67 · SELECT 9 · DELETE 1 · INSERT 1 · UPDATE 2
--     authenticated: TRUNCATE 90 · TRIGGER 90 · REFERENCES 90 · SELECT 78 · DELETE 68 · INSERT 71 · UPDATE 72 · MAINTAIN 12
--   anon sine skriverettigheter: skoler (DELETE,INSERT,UPDATE) og kurs_skole_mottaker (UPDATE).
--
-- HULLET (bevist av Fable med ekte handler): `truncate profiles cascade` som en vanlig
--   innlogget bruker (authenticated) tømte 57 tabeller. TRUNCATE går HELT utenom RLS —
--   alle våre policyer har null effekt mot det. anon hadde dessuten DELETE/INSERT/UPDATE
--   på skoler: uinnlogget kunne slette skoler om en policy glapp. Dette er lanseringssperrer.
--
-- HVA (KUN dette — ingenting mer):
--   (a) revoke truncate      på ALLE public-tabeller fra anon, authenticated.
--   (b) revoke trigger, references på ALLE public-tabeller fra anon, authenticated.
--       (TRIGGER = lag trigger på tabellen; REFERENCES = lag fremmednøkkel mot den.
--        Ingen nettleserrolle har bruk for noen av delene — de er rester fra gammel
--        Supabase-standard, ikke bevisst gitt. Ingen kodevei bruker dem.)
--   (c) revoke maintain      på ALLE public-tabeller fra authenticated.
--   (d) revoke delete, insert, update på public.skoler fra anon.
--       GREP-BEVIS (18. sep): ingen kodevei lar anon skrive skoler. Alle API-skriv går
--        på service_role — api/skole/oppdater-skole.js, api/admin/opprett-skole.js,
--        api/admin/slett-skole.js, godkjenn-paamelding.js, sett-nettverk.js. Den ENESTE
--        frontend-skrivingen (SvarOversikt.jsx: skoler.update notat) kjører på den
--        innloggede brukerens sesjon = authenticated (rørt IKKE, jf. (g)). anon = null.
--   (e) revoke update på public.kurs_skole_mottaker fra anon.
--       GREP-BEVIS (18. sep): anon skriver ALDRI denne tabellen direkte. De offentlige
--        lenkesidene (SvarSkjema.jsx, EvalueringSkjema.jsx) skriver via SECURITY DEFINER-
--        RPC-er som kjører som eier (postgres), ikke som anon:
--          hent_kurs_skole_via_token (054) gjør «update kurs_skole_mottaker set apnet_at…»
--          lagre_skole_svar (050) / lagre_evaluering (047) skriver kurs_skole/evalueringer.
--        Den eneste src/-referansen til tabellen er en SELECT på admin-siden SvarOversikt.
--        anon-granten (093B ga «select, update») er altså ubrukt — SECURITY DEFINER omgår
--        den. Fjernes. anon beholder SELECT (jf. (f), en av de 9 offentlige lesningene).
--
-- HVA SOM IKKE RØRES (bevisst):
--   (f) anon sine 9 SELECT (bruker_skole, haller, kulturkort_partnere, kurs, kurs_skole,
--        kurs_skole_mottaker, kursholdere, skoler, tl_hjul_kategori) — de offentlige sidene
--        trenger dem. Denne fila revoker ALDRI SELECT.
--   (g) authenticated sine DELETE/INSERT/UPDATE/SELECT — brede, men RLS står i veien;
--        opprydding der er en egen jobb med egen kontroll. IKKE tatt her.
--   service_role og postgres mister INGENTING (revoke treffer kun anon/authenticated).
--
--   (h) ALTER DEFAULT PRIVILEGES: prods postgres-sett (målt 4. sep, se lib-rigg.mjs) gir
--        «GRANT ALL … REVOKE insert/select/update/delete» → NYE tabeller arver fortsatt
--        TRUNCATE/TRIGGER/REFERENCES (+ MAINTAIN) til anon/authenticated. Uten å stramme
--        default-settet er ryddingen glemt neste gang noen lager en tabell. Vi legger
--        derfor på et revoke i default privileges (FOR ROLE postgres, som resten av settet).
--
-- SPERRER: FØR (idempotent — hele revoke-blokken hoppes over hvis sluttilstanden alt er
--   nådd; ETTER-sperren verifiserer uansett). ETTER: anon og authenticated har 0 tabeller
--   med TRUNCATE/TRIGGER/REFERENCES, authenticated 0 med MAINTAIN, anon 0 skriv på skoler
--   og kurs_skole_mottaker; anon beholder SELECT på skoler + kurs_skole_mottaker;
--   service_role beholder TRUNCATE på minst én tabell (uendret).
-- EGENSKAPER: idempotent · ÉN transaksjon · commit til slutt.
-- TILBAKERULLING (etter commit): begin;
--   grant truncate, trigger, references on all tables in schema public to anon, authenticated;
--   grant maintain on all tables in schema public to authenticated;
--   grant delete, insert, update on public.skoler to anon;
--   grant update on public.kurs_skole_mottaker to anon;
--   alter default privileges for role postgres in schema public
--     grant truncate, trigger, references on tables to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant maintain on tables to authenticated;
--   commit;
--   (Dette gjenåpner hullet Fable beviste — kun for feilsøking, aldri som varig tilstand.)
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- (h) DEFAULT PRIVILEGES: stram postgres-settet så FRAMTIDIGE tabeller ikke arver
--     truncate/trigger/references (+ maintain) til nettleserrollene. Idempotent —
--     et revoke av noe som ikke er der er et no-op. Kjøres alltid (også 2. gang).
--     FOR ROLE postgres = samme rad-eier som prods eksisterende default-sett.
-- ----------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke maintain on tables from authenticated;

-- ----------------------------------------------------------------------------
-- FØR + ENDRING (a–e): idempotent. Hopp over revoke-ene hvis sluttilstanden alt er nådd
-- (0 TRUNCATE for anon+authenticated OG anon uten skriv på skoler/kurs_skole_mottaker).
-- ----------------------------------------------------------------------------
do $$
declare
  v_anon_trunc   int;
  v_auth_trunc   int;
  v_skoler_skriv boolean;
  v_ksm_upd      boolean;
begin
  select count(*) into v_anon_trunc
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','p')
     and has_table_privilege('anon', c.oid, 'TRUNCATE');
  select count(*) into v_auth_trunc
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','p')
     and has_table_privilege('authenticated', c.oid, 'TRUNCATE');
  v_skoler_skriv :=
       has_table_privilege('anon','public.skoler','INSERT')
    or has_table_privilege('anon','public.skoler','UPDATE')
    or has_table_privilege('anon','public.skoler','DELETE');
  v_ksm_upd := has_table_privilege('anon','public.kurs_skole_mottaker','UPDATE');

  if v_anon_trunc = 0 and v_auth_trunc = 0 and not v_skoler_skriv and not v_ksm_upd then
    raise notice '144 allerede kjørt (anon/authenticated 0 TRUNCATE, anon uten skriv på skoler/kurs_skole_mottaker) — hopper over revoke-blokken.';
    return;
  end if;

  raise notice '144 FØR: anon TRUNCATE=% · authenticated TRUNCATE=% · anon skoler-skriv=% · anon ksm-update=%',
    v_anon_trunc, v_auth_trunc, v_skoler_skriv, v_ksm_upd;

  -- (a) TRUNCATE — går utenom RLS, kan tømme en tabell. Ingen nettleserrolle skal ha den.
  execute 'revoke truncate on all tables in schema public from anon, authenticated';
  -- (b) TRIGGER + REFERENCES — DDL-lignende rettigheter, ikke for en nettleserrolle.
  execute 'revoke trigger, references on all tables in schema public from anon, authenticated';
  -- (c) MAINTAIN (VACUUM/ANALYZE/REINDEX m.m.) — ikke for authenticated.
  execute 'revoke maintain on all tables in schema public from authenticated';
  -- (d) anon skal ikke kunne skrive skoler (alt går via service_role).
  execute 'revoke delete, insert, update on public.skoler from anon';
  -- (e) anon skal ikke ha direkte UPDATE på kurs_skole_mottaker (skriv via SECURITY DEFINER).
  execute 'revoke update on public.kurs_skole_mottaker from anon';

  raise notice '144: revoke truncate/trigger/references(anon+auth) + maintain(auth) + skoler-skriv(anon) + ksm-update(anon) anvendt.';
end $$;

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: verifiser sluttilstanden (kjøres uansett om FØR hoppet over).
-- ----------------------------------------------------------------------------
do $$
declare
  v_anon_trunc int; v_auth_trunc int;
  v_anon_trig  int; v_auth_trig  int;
  v_anon_ref   int; v_auth_ref   int;
  v_auth_maint int;
  v_svc_trunc  int;
begin
  select count(*) into v_anon_trunc from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon', c.oid, 'TRUNCATE');
  select count(*) into v_auth_trunc from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated', c.oid, 'TRUNCATE');
  select count(*) into v_anon_trig from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon', c.oid, 'TRIGGER');
  select count(*) into v_auth_trig from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated', c.oid, 'TRIGGER');
  select count(*) into v_anon_ref from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon', c.oid, 'REFERENCES');
  select count(*) into v_auth_ref from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated', c.oid, 'REFERENCES');
  select count(*) into v_auth_maint from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated', c.oid, 'MAINTAIN');
  select count(*) into v_svc_trunc from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('service_role', c.oid, 'TRUNCATE');

  if v_anon_trunc <> 0 then raise exception 'STOPP 144 (etter): anon har fortsatt TRUNCATE på % tabell(er).', v_anon_trunc; end if;
  if v_auth_trunc <> 0 then raise exception 'STOPP 144 (etter): authenticated har fortsatt TRUNCATE på % tabell(er).', v_auth_trunc; end if;
  if v_anon_trig  <> 0 then raise exception 'STOPP 144 (etter): anon har fortsatt TRIGGER på % tabell(er).', v_anon_trig; end if;
  if v_auth_trig  <> 0 then raise exception 'STOPP 144 (etter): authenticated har fortsatt TRIGGER på % tabell(er).', v_auth_trig; end if;
  if v_anon_ref   <> 0 then raise exception 'STOPP 144 (etter): anon har fortsatt REFERENCES på % tabell(er).', v_anon_ref; end if;
  if v_auth_ref   <> 0 then raise exception 'STOPP 144 (etter): authenticated har fortsatt REFERENCES på % tabell(er).', v_auth_ref; end if;
  if v_auth_maint <> 0 then raise exception 'STOPP 144 (etter): authenticated har fortsatt MAINTAIN på % tabell(er).', v_auth_maint; end if;

  -- anon skal ikke ha skriv på skoler …
  if has_table_privilege('anon','public.skoler','INSERT')
     or has_table_privilege('anon','public.skoler','UPDATE')
     or has_table_privilege('anon','public.skoler','DELETE') then
    raise exception 'STOPP 144 (etter): anon har fortsatt INSERT/UPDATE/DELETE på skoler.';
  end if;
  -- … eller UPDATE på kurs_skole_mottaker …
  if has_table_privilege('anon','public.kurs_skole_mottaker','UPDATE') then
    raise exception 'STOPP 144 (etter): anon har fortsatt UPDATE på kurs_skole_mottaker.';
  end if;
  -- … men SKAL beholde de offentlige lesningene.
  if not has_table_privilege('anon','public.skoler','SELECT') then
    raise exception 'STOPP 144 (etter): anon mistet SELECT på skoler — offentlig side ville brutt.';
  end if;
  if not has_table_privilege('anon','public.kurs_skole_mottaker','SELECT') then
    raise exception 'STOPP 144 (etter): anon mistet SELECT på kurs_skole_mottaker.';
  end if;
  -- service_role skal være uberørt (beholder TRUNCATE på minst én tabell).
  if v_svc_trunc = 0 then
    raise exception 'STOPP 144 (etter): service_role mistet TRUNCATE på alt — revoke traff feil rolle.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING: tellingene etter kjøring.
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'anon TRUNCATE: '          || (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon', c.oid, 'TRUNCATE'))::text,
  'authenticated TRUNCATE: ' || (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated', c.oid, 'TRUNCATE'))::text,
  'authenticated MAINTAIN: ' || (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated', c.oid, 'MAINTAIN'))::text,
  'anon skoler INSERT/UPDATE/DELETE: ' ||
     (has_table_privilege('anon','public.skoler','INSERT') or has_table_privilege('anon','public.skoler','UPDATE') or has_table_privilege('anon','public.skoler','DELETE'))::text,
  'anon ksm UPDATE: ' || has_table_privilege('anon','public.kurs_skole_mottaker','UPDATE')::text,
  'anon skoler SELECT: ' || has_table_privilege('anon','public.skoler','SELECT')::text
) as kvittering;

commit;
