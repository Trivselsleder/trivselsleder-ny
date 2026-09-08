-- ============================================================================
-- 104_kompetansemaal_endringssporing.sql
-- ============================================================================
-- Sporing av hvilken IMPORTKJØRING som endret delt referansedata (kompetansemaal*),
-- slik at en tilbakerulling kan finne akkurat denne kjøringens endringer.
-- Bygger PÅ den eksisterende revisjonsloggen fra migr 027 (endringslogg +
-- fase3_logg_endring()) — ingen ny logg-tabell. Grunnlag: claude_104-SPESIFIKASJON-5sep.md
-- + claude_104-FORSJEKK-6sep.md (som fant at spec-ens punkt 6 var feil: 093B la ALLEREDE inn
-- «revoke all ... from anon» på kompetansemaal_trinn — den linja skal derfor IKKE med her).
--
-- TRE ADDITIVE endringer:
--   DEL A: endringslogg får nullbar import_kjoring_id (hvem gjorde endringen).
--          DEL B: fase3_logg_endring() leser sesjonsvariabelen trivsel.import_kjoring_id og skriver den
--          inn i endringslogg. Kroppen er ELLERS ORDRETT som GJELDENDE versjon i basen (migr 032, IKKE
--          027 — 032 skrev funksjonen om og la til «set search_path = public, pg_temp» som retting av et
--          kontrollfunn; den klausulen MÅ beholdes, ellers fjernes herdingen stille fra en SECURITY
--          DEFINER-funksjon, jf. 099-regelen). Kun v_kjoring lagt til. All eksisterende trafikk på de 11
--          tabellene som alt har triggeren er UENDRET: sesjonsvariabelen er fraværende i UI/PostgREST →
--          import_kjoring_id blir NULL, og search_path er bevart.
--   DEL C: kompetansemaal_trinn får trg_logg (manglet trigger helt — hullet 104 lukker).
--
-- ADDITIVT: kun ny NULLBAR kolonne + create-or-replace av funksjon + ny trigger. Ingen eksisterende
-- rad røres, ingen NOT NULL uten default. IKKE rørt: kompetansemaal-radene, rettigheter (uendret av
-- kolonne-tillegg; 093B dekker anon-revoke), de ti andre trg_logg-tabellene.
-- EN transaksjon. Kvittering nederst som EGEN lesespørring (editor-fellen 4. sep).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- DEL A — import_kjoring_id på endringslogg (nullbar, on delete restrict som ellers i basen)
-- ----------------------------------------------------------------------------
alter table endringslogg
  add column if not exists import_kjoring_id uuid references import_kjoring(id) on delete restrict;

-- ----------------------------------------------------------------------------
-- DEL B — fase3_logg_endring(): ORDRETT som GJELDENDE versjon (migr 032, med set search_path), pluss
-- v_kjoring (2 linjer) + import_kjoring_id i insert-setningen. search_path-klausulen beholdes fra 032.
-- ----------------------------------------------------------------------------
create or replace function fase3_logg_endring() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_handling text; v_endringer jsonb := '{}'::jsonb; v_full jsonb;
  v_radid text; v_bruker uuid; v_kjoring uuid; k text;
begin
  begin v_bruker := auth.uid(); exception when others then v_bruker := null; end;
  -- NYTT (104): hvilken importkjøring gjorde endringen. Sesjonsvariabel satt av transaksjonsåpneren;
  -- fraværende (NULL) for all vanlig UI/PostgREST-trafikk — da logges det som før, bare uten kjøring.
  v_kjoring := nullif(current_setting('trivsel.import_kjoring_id', true), '')::uuid;
  if (tg_op = 'INSERT') then
    v_handling := 'opprett'; v_radid := (to_jsonb(new)->>'id'); v_full := to_jsonb(new);
  elsif (tg_op = 'DELETE') then
    v_handling := 'slett'; v_radid := (to_jsonb(old)->>'id'); v_full := to_jsonb(old);
  else
    v_radid := (to_jsonb(new)->>'id');
    if (to_jsonb(new) ? 'status') and (to_jsonb(new)->>'status') = 'arkivert'
       and coalesce(to_jsonb(old)->>'status','') <> 'arkivert' then
      v_handling := 'arkiver'; v_full := to_jsonb(old);
    else v_handling := 'endre'; end if;
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if (to_jsonb(new)->k) is distinct from (to_jsonb(old)->k) then
        v_endringer := v_endringer || jsonb_build_object(k, jsonb_build_object('gammel', to_jsonb(old)->k, 'ny', to_jsonb(new)->k));
      end if;
    end loop;
  end if;
  insert into endringslogg (tabell, rad_id, handling, endringer, full_rad, endret_av, import_kjoring_id)
  values (tg_table_name, v_radid, v_handling,
          case when v_endringer = '{}'::jsonb then null else v_endringer end, v_full, v_bruker, v_kjoring);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

-- ----------------------------------------------------------------------------
-- DEL C — trg_logg på kompetansemaal_trinn (samme trigger som de 11 andre tabellene fra 027/029).
-- Merk: kompetansemaal_trinn har komposit-PK (ingen «id»-kolonne) → rad_id blir NULL. For opprett/slett
-- settes full_rad = hele raden (kompetansemaal_id + trinn_id), så disse KAN reverseres (insert↔delete) —
-- og det er nettopp det aktiv læring-passet gjør her (insert ... on conflict do nothing, aldri update).
-- En UPDATE ville derimot gitt en 'endre'-rad UTEN full_rad/rad_id (kun endret kolonne) — altså IKKE
-- reverserbar; men passet gjør aldri update på denne tabellen, så formålet holder.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_logg on kompetansemaal_trinn;
create trigger trg_logg after insert or update or delete on kompetansemaal_trinn
  for each row execute function fase3_logg_endring();

commit;

-- ============================================================================
-- KVITTERING (Kjartan, Supabase SQL-editor, KUN lesing, eget kjør ETTER 104 er commitet)
-- Forventet: begge skjema-endringer finnes · triggeren på kompetansemaal_trinn finnes ·
--   RLS uendret (begge true) · radantall uendret (mål mot FØR-tall du tok separat)
-- ============================================================================
-- DEL A: kolonnen finnes på endringslogg
select column_name from information_schema.columns
 where table_schema='public' and table_name='endringslogg' and column_name='import_kjoring_id';   -- 1 rad

-- DEL C: triggeren finnes nå på kompetansemaal_trinn
select tgname from pg_trigger
 where tgrelid = 'public.kompetansemaal_trinn'::regclass and tgname='trg_logg' and not tgisinternal;  -- 1 rad

-- RLS uendret
select relname, relrowsecurity from pg_class
 where relname in ('endringslogg','kompetansemaal_trinn') order by relname;  -- begge true

-- Additivitet: radantall (sammenlign mot tall tatt FØR migrasjonen)
select (select count(*) from kompetansemaal)       as kompetansemaal,
       (select count(*) from kompetansemaal_trinn) as kompetansemaal_trinn,
       (select count(*) from endringslogg)         as endringslogg;
