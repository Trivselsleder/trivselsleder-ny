-- 096_brukslogg_anonymisering.sql
-- ============================================================================
-- PERSONVERN: TIDSBASERT ANONYMISERING AV `brukslogg` (12 MND)
-- ============================================================================
-- HVA: funksjonen public.anonymiser_brukslogg(). Etter 12 maaneder settes
--      bruker_id = null paa brukslogg-rader, mens raden selv BESTAAR — saa
--      aktivitetsstatistikk over tid (aarsmoenster gjennom skoleaaret) ikke gaar
--      tapt. Dette er avidentifisering, IKKE sletting.
--
-- HVORFOR: brukslogg lagrer innlogging per navngitt person UTEN tidsbasert
--      opprydding (kartlagt 3. sep, claude_LOGGTABELLER-KARTLAGT-3sep.md).
--      Kjartans beslutning 3. sep: brukslogg faar 12 maaneders frist. 12 mnd er nok
--      til aa se aarsmoenstre, kort nok til aa vaere forsvarlig overfor en jurist.
--
-- VIKTIG — NAVN: DENNE fila roerer `brukslogg`. Migr 088 (anonymiser_bruk_hendelse)
--      roerer `bruk_hendelse` — en ANNEN tabell — selv om baade 088s filnavn og
--      cron-ruta historisk sier «brukslogg». DB-objektene er riktig navngitt:
--      088 -> anonymiser_bruk_hendelse, denne -> anonymiser_brukslogg. 088-FILA roeres
--      IKKE (men 096 strammer execute-rettigheten paa funksjonen dens — se nederst).
--
-- ASYMMETRI MOT 088 (bevisst, ikke en glipp): 088 har TO frister (30 dager: koble
--      soek fra person/skole; 24 mnd: fjern raa soeketekst) fordi bruk_hendelse har en
--      fri soeketekst-kolonne (sok_tekst) som er ekstra identifiserende. `brukslogg`
--      har INGEN soeketekst-kolonne (bekreftet, se kolonnelista under), saa ETT steg paa
--      12 mnd er tilstrekkelig og enklere aa kontrollere.
--
-- KOLONNER (lest, migr 015 + 019 — ikke gjettet):
--      id (uuid pk) · skole_id (uuid) · bruker_id (uuid) · hendelse_type (text) ·
--      ressurs_id (text) · ressurs_navn (text) · side (text) · tidspunkt (timestamptz).
--   * bruker_id  -> NULLSTILLES (fjerner koblingen til personen). Selve beslutningen.
--   * tidspunkt  -> BEVARES (statistikkens tidsakse — hele poenget).
--   * hendelse_type / id / ressurs_id / ressurs_navn / side -> BEVARES (ikke person-
--     identifiserende alene naar bruker_id er borte).
--   * skole_id   -> ROERES IKKE (bevisst). Peker paa en SKOLE (organisasjon), ikke en
--     elev; lav re-identifiseringsrisiko uten soeketekst, og det aggregert statistikk
--     trenger. Merk: dagens rader har skole_id ALLEREDE null (skrivesides-gap i
--     AuthContext), saa aa nulle den ville uansett vaert et no-op. Aa faa skole-
--     dimensjonen til aa virke bakover krever en egen skrivesides-fiks (fyll skole_id
--     ved innlogging) — utenfor denne migrasjonen. Vil personvern-ansvarlig heller ha
--     skole_id fjernet ved 12 mnd, er det en enlinjes utvidelse (legg skole_id=null i
--     UPDATE-en); da mistes skole-nivaaet permanent etter 12 mnd.
--
-- FORM (speiler anonymiser_bruk_hendelse, migr 088): SECURITY DEFINER, search_path='',
--      returnerer antall beroerte rader (get diagnostics), execute kun for service_role.
--      Guarden «bruker_id is not null» gjoer at telletallet reflekterer REELLE endringer
--      (ikke rader som alt var anonymisert) og gjoer gjentatte kjoeringer trygge.
--
-- TRIGGES AV: den EKSISTERENDE nattlige Vercel-cron-ruta (api/brukslogg/cron-
--      anonymiser.js, kl. 03 norsk tid) som ETT ekstra rpc-kall ved siden av
--      anonymiser_bruk_hendelse — ikke en ny rute, ikke pg_cron (ikke installert).
--      Den kode-endringen er en egen utrulling (api/ + vercel.json), IKKE en del av
--      denne migrasjonen. Funksjonen gjoer ingenting foer ruta kaller den.
--
-- I TILLEGG (rettighets-hygiene): strammer execute saa KUN service_role kan kalle funksjonen
-- (Supabase gir anon/authenticated execute som standard — de maa navngis i revoke). Samme
-- stramming legges paa anonymiser_bruk_hendelse (088), som hadde det samme anon-kallbare
-- hullet i prod. Begge lukkes i denne migrasjonen. Se revoke nederst.
--
-- EGENSKAPER: Additiv · Idempotent (create or replace + revoke/grant) · ÉN transaksjon.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- PERSONVERNRUTINE: anonymiser_brukslogg()  — ETT steg, 12 maaneder
-- ----------------------------------------------------------------------------
create or replace function public.anonymiser_brukslogg()
returns table (frakoblet_person bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Rader eldre enn 12 maaneder mister koblingen til personen. Raden bestaar
  -- (tidspunkt + hendelse_type + skole_id urort) saa aktivitetsstatistikken lever.
  update public.brukslogg
     set bruker_id = null
   where tidspunkt < now() - interval '12 months'
     and bruker_id is not null;
  get diagnostics frakoblet_person = row_count;

  return next;
end;
$$;

-- Kun service_role (cron) skal kunne kjoere disse — de masse-anonymiserer personopplysninger
-- og skal ikke kunne utloeses utenfra via rpc/. VIKTIG: Supabase gir som standard anon OG
-- authenticated eksplisitt execute (via default privileges), saa 'revoke ... from public' alene
-- er IKKE nok — anon/authenticated maa navngis. Formen er den 072/093C bruker.
-- Vi lukker BEGGE personvern-funksjonene her: anonymiser_brukslogg (096) OG
-- anonymiser_bruk_hendelse (088) — sistnevnte hadde samme anon-kallbare hull i prod.
revoke execute on function public.anonymiser_brukslogg()     from public, anon, authenticated;
revoke execute on function public.anonymiser_bruk_hendelse() from public, anon, authenticated;
grant  execute on function public.anonymiser_brukslogg()     to service_role;
-- (anonymiser_bruk_hendelse beholder sin service_role-execute fra 088 — revoke over roerer
--  bare public/anon/authenticated, ikke service_role.)

commit;
