-- ============================================================================
-- 143_f2_profiles_ingen_selv_superadmin.sql — F2: ingen kan gi SEG SELV superadmin
-- ============================================================================
-- KILDE (fasit): Fable-kontroll 17. sep (claude_KONTROLL-fable-138-142-17sep.md, F2)
--   + prods MÅLTE bilde (_kontroll-import/rigg/les-profiles-prod.sql, kjørt av
--   Kjartan i prod FØR denne migrasjonen). 019-fila er IKKE fasit (104-fellen).
--
-- HULLET (bevist av Fable i base med 138–141): en HVILKEN SOM HELST innlogget bruker
--   (skoleansatt, ansatt, feide) kan kjøre
--     update public.profiles set rolle='superadmin' where id = <egen uid>
--   og få UPDATE 1. Årsak, to ledd som OR-es:
--     (a) policyen «Bruker kan oppdatere egen profil» er FOR UPDATE using
--         (auth.uid()=id) UTEN with check → USING brukes også som check, så en rad
--         som fortsatt har id=auth.uid() slipper gjennom UANSETT ny rolle-verdi.
--     (b) `authenticated` har TABELLVID update-grant på public.profiles (093B),
--         uten kolonnebegrensning → rolle-kolonnen er skrivbar.
--   141 lukker bare ansatt→superadmin via «Ansatt administrerer»-policyen; egen-
--   profil-veien står fortsatt åpen for alle. Dette er en lanseringssperre.
--
-- HVA (kolonnenivå-rettighet + with check — bevisst valgt framfor trigger):
--   Kolonne-rettigheter sjekkes FØR RLS og kan IKKE OR-es rundt av en permissiv
--   policy. Derfor:
--     1) revoke update on public.profiles from authenticated;  (fjerner (b))
--     2) grant update (navn) on public.profiles to authenticated;
--        — KUN `navn`: brukerens eget visningsnavn, ikke-privilegert, null
--          sikkerhetseffekt. Dette er den ENESTE kolonnen en vanlig bruker
--          legitimt redigerer på sin egen rad (egen-profil-policyen). Ingen
--          nåværende kode skriver den fra nettleseren (STEG 1-grep: kun
--          AdminBrukere skriver profiles fra nettleser, og det er rolle/aktiv som
--          superadmin — flyttet til api/admin/sett-bruker-rolle.js i samme
--          leveranse), så granten er framtidsrettet men holder policyen meningsfull.
--        — `rolle`, `aktiv`, `id`: ALDRI grantet. rolle/aktiv = privilegier
--          (eskalering / av-og-på), id = identitet. Endring av disse skjer kun via
--          service_role (server-endepunkt), aldri fra nettleserens authenticated.
--        — `epost`: bevisst UTELATT. Den brukes som oppslagsnøkkel i
--          inviter-bruker.js (.eq('epost', …)); selvredigering kunne misrute en
--          senere invitasjon. Endres i dag ikke av noen bruker-vei uansett.
--     3) drop+create «Bruker kan oppdatere egen profil» med prods MÅLTE using-tekst
--        (auth.uid()=id) + NYTT with check (auth.uid()=id) — forsvar i dybden
--        (hindrer å flytte egen rad til andres id; kolonnegranten er hovedvernet).
--
--     4) revoke truncate, trigger, references on public.profiles from anon;
--        — anon hadde fortsatt TRUNCATE, TRIGGER og REFERENCES på profiles (gammel
--          Supabase-standard som IKKE ble ryddet da SELECT/UPDATE ble fjernet, målt i
--          prod 17.–18. sep). TRUNCATE går HELT utenom RLS og kan tømme tabellen.
--          Dette bringer profiles på linje med det vi selv verifiserte for de nye
--          tabellene i 130–135 («anon ingen select/truncate»). Rører KUN anon på
--          profiles — ingen andre tabeller, ingen andre roller.
--
--   service_role og postgres mister INGENTING (revoke treffer kun authenticated/anon).
--   service_role beholder tabellvid update (bevist nødvendig: godkjenn-paamelding,
--   inviter-bruker, oppdater-skole og det nye sett-bruker-rolle skriver profiles via
--   service_role). ETTER-sperren avviser hvis service_role har mistet den.
--
-- FØLGE FOR KODE (samme leveranse): api/admin/sett-bruker-rolle.js (nytt,
--   service_role, superadmin-only) overtar rolle-/aktiv-endring; AdminBrukere.jsx
--   kaller det i stedet for å skrive profiles direkte fra nettleseren.
--
-- SPERRER: FØR (allerede kjørt → hopp over hele endringen, ETTER-sperren
--   verifiserer sluttilstanden uansett). ETTER: authenticated kan IKKE oppdatere
--   rolle/aktiv/id, KAN oppdatere navn; egen-profil-policyen har with_check;
--   service_role beholder update.
-- EGENSKAPER: idempotent · ÉN transaksjon · commit til slutt.
-- TILBAKERULLING (etter commit): begin;
--   grant update on public.profiles to authenticated;
--   grant truncate, trigger, references on public.profiles to anon;
--   drop policy if exists "Bruker kan oppdatere egen profil" on public.profiles;
--   create policy "Bruker kan oppdatere egen profil" on public.profiles
--     as permissive for update to public using (auth.uid() = id);
--   commit;
--   (og rull tilbake sett-bruker-rolle-koden — ellers kan superadmin ikke endre rolle.)
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- FØR + ENDRING: idempotent. Hopp over skrivingen hvis allerede kjørt
-- (egen-profil-policyen har with_check OG authenticated mangler update på rolle).
-- ----------------------------------------------------------------------------
do $$
declare
  v_har_check boolean;
  v_auth_rolle_update boolean;
  v_anon_truncate boolean;
begin
  select (with_check is not null) into v_har_check
    from pg_policies
   where schemaname='public' and tablename='profiles'
     and policyname='Bruker kan oppdatere egen profil';
  v_auth_rolle_update := has_column_privilege('authenticated','public.profiles','rolle','UPDATE');
  v_anon_truncate := has_table_privilege('anon','public.profiles','TRUNCATE');

  if coalesce(v_har_check,false) and not v_auth_rolle_update and not v_anon_truncate then
    raise notice '143 allerede kjørt (policy har with_check, authenticated mangler update på rolle, anon mangler truncate) — hopper over.';
    return;
  end if;

  -- (1) fjern den tabellvide update-granten (kolonneløs) fra authenticated.
  execute 'revoke update on public.profiles from authenticated';
  -- (2) gi tilbake update KUN på navn (ikke-privilegert, selvredigerbar kolonne).
  execute 'grant update (navn) on public.profiles to authenticated';
  -- (2b) fjern anon sine TRUNCATE/TRIGGER/REFERENCES på profiles (gammel Supabase-
  --      standard; TRUNCATE går utenom RLS og kan tømme tabellen). KUN anon, KUN profiles.
  execute 'revoke truncate, trigger, references on public.profiles from anon';
  -- (3) egen-profil-policyen: prods målte using + nytt with check.
  execute 'drop policy if exists "Bruker kan oppdatere egen profil" on public.profiles';
  execute 'create policy "Bruker kan oppdatere egen profil" on public.profiles '
       || 'as permissive for update to public using (auth.uid() = id) with check (auth.uid() = id)';
  raise notice '143: revoke(auth update)+grant(navn)+revoke(anon truncate/trigger/references)+policy m/with_check anvendt.';
end $$;

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: verifiser sluttilstanden (kjøres uansett om FØR hoppet over).
-- ----------------------------------------------------------------------------
do $$
declare v_check text;
begin
  -- authenticated skal IKKE kunne oppdatere de privilegerte kolonnene …
  if has_column_privilege('authenticated','public.profiles','rolle','UPDATE') then
    raise exception 'STOPP 143 (etter): authenticated har fortsatt UPDATE på profiles.rolle.';
  end if;
  if has_column_privilege('authenticated','public.profiles','aktiv','UPDATE') then
    raise exception 'STOPP 143 (etter): authenticated har fortsatt UPDATE på profiles.aktiv.';
  end if;
  if has_column_privilege('authenticated','public.profiles','id','UPDATE') then
    raise exception 'STOPP 143 (etter): authenticated har fortsatt UPDATE på profiles.id.';
  end if;
  -- … men SKAL kunne oppdatere navn (egen-profil-policyen skal fortsatt virke).
  if not has_column_privilege('authenticated','public.profiles','navn','UPDATE') then
    raise exception 'STOPP 143 (etter): authenticated mangler UPDATE på profiles.navn.';
  end if;
  -- service_role må BEHOLDE update (admin-endepunktet skriver rolle/aktiv derfra).
  if not has_column_privilege('service_role','public.profiles','rolle','UPDATE') then
    raise exception 'STOPP 143 (etter): service_role mangler UPDATE på profiles.rolle — admin-endepunktet ville brutt.';
  end if;
  -- anon skal IKKE ha TRUNCATE på profiles (går utenom RLS, kan tømme tabellen).
  if has_table_privilege('anon','public.profiles','TRUNCATE') then
    raise exception 'STOPP 143 (etter): anon har fortsatt TRUNCATE på profiles.';
  end if;
  -- egen-profil-policyen skal ha with_check som binder til auth.uid()=id.
  select with_check into v_check from pg_policies
   where schemaname='public' and tablename='profiles'
     and policyname='Bruker kan oppdatere egen profil';
  if v_check is null then
    raise exception 'STOPP 143 (etter): egen-profil-policyen mangler with_check.';
  end if;
  if v_check not like '%auth.uid()%' then
    raise exception 'STOPP 143 (etter): with_check nevner ikke auth.uid() (%).', v_check;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING: authenticated sine gjenværende update-kolonner + policyens with_check.
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'authenticated UPDATE-kolonner: ' || coalesce((
    select string_agg(column_name, ',' order by column_name)
      from information_schema.column_privileges
     where table_schema='public' and table_name='profiles'
       and grantee='authenticated' and privilege_type='UPDATE'), '(ingen)'),
  'egen-profil with_check: ' || coalesce((
    select with_check from pg_policies
     where schemaname='public' and tablename='profiles'
       and policyname='Bruker kan oppdatere egen profil'), '(mangler)'),
  'anon truncate: ' || has_table_privilege('anon','public.profiles','TRUNCATE')::text
) as kvittering;

commit;
