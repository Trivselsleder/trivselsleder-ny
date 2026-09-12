-- ============================================================================
-- skjema-detaljer.sql — list de faktiske radene for ÉN kategori (testverktøy).
-- ============================================================================
-- KUN SELECT. Samme raddefinisjoner som skjema-fingeravtrykk.sql, men i stedet for
-- md5 vises selve (normaliserte) radene, så et avvik funnet av sammenlign-
-- fingeravtrykk.mjs kan lokaliseres helt ned til raden.
--
-- BRUK: bytt kategori-navnet på SISTE linje (der det står BYTT_KATEGORI), kjør mot
--   begge basene (lokal + prod), og diff de to radlistene (f.eks. lim hver til en fil
--   og kjør «diff»). Gyldige kategorier: kol, con, idx, rls, pol, trg, fn,
--   privT, privS, privF, defacl.
-- ============================================================================

-- FAST SØKESTI (samme grunn som i skjema-fingeravtrykk.sql): identisk rendring av
-- operatorklasser lokalt og i prod, uavhengig av databasens/klonens søkesti.
set search_path = public, extensions, pg_catalog;

with
pub_tab as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p')
),
pub_seq as (
  select c.oid, c.relname from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
),
pub_fn as (
  select p.oid, p.proname from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind in ('f','p')
),
roller(r) as (values ('anon'),('authenticated'),('service_role')),
tab_priv(p) as (values
  ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
  ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')),
seq_priv(p) as (values ('SELECT'),('USAGE'),('UPDATE')),
alle(kategori, rad) as (
  select 'kol', t.relname || '.' || a.attname
      || ' | ' || format_type(a.atttypid, a.atttypmod)
      || ' | ' || (case when a.attnotnull then 'NOT NULL' else 'NULL' end)
      || ' | ' || coalesce(btrim(regexp_replace(pg_get_expr(d.adbin, d.adrelid), '\s+', ' ', 'g')), '')
    from pub_tab t
    join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  union all
  select 'con', t.relname || ' | ' || c.conname || ' | ' || c.contype::text
      || ' | ' || btrim(regexp_replace(pg_get_constraintdef(c.oid), '\s+', ' ', 'g'))
    from pg_constraint c join pub_tab t on t.oid = c.conrelid
  union all
  select 'idx', i.tablename || ' | ' || i.indexname
      || ' | ' || btrim(regexp_replace(i.indexdef, '\s+', ' ', 'g'))
    from pg_indexes i where i.schemaname = 'public'
  union all
  select 'rls', t.relname || ' | rls=' || t.relrowsecurity::text
      || ' | force=' || t.relforcerowsecurity::text
    from pub_tab t
  union all
  select 'pol', p.schemaname || '.' || p.tablename || ' | ' || p.policyname
      || ' | ' || p.cmd
      || ' | ' || coalesce(array_to_string(p.roles, ','), '')
      || ' | ' || coalesce(btrim(regexp_replace(p.qual, '\s+', ' ', 'g')), '')
      || ' | ' || coalesce(btrim(regexp_replace(p.with_check, '\s+', ' ', 'g')), '')
    from pg_policies p
    where p.schemaname = 'public'
       or (p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname like 'Redaksjon%')
  union all
  select 'trg', t.relname || ' | ' || g.tgname
      || ' | ' || btrim(regexp_replace(pg_get_triggerdef(g.oid), '\s+', ' ', 'g'))
    from pg_trigger g join pub_tab t on t.oid = g.tgrelid where not g.tgisinternal
  union all
  select 'fn', f.proname || '(' || pg_get_function_identity_arguments(f.oid) || ')'
      || ' | secdef=' || p.prosecdef::text
      || ' | config=' || coalesce(array_to_string(p.proconfig, ','), '')
      || ' | ' || md5(btrim(regexp_replace(pg_get_functiondef(f.oid), '\s+', ' ', 'g')))
    from pub_fn f join pg_proc p on p.oid = f.oid
  union all
  select 'privT', r.r || ' | ' || t.relname || ' | ' || tp.p
      || '=' || has_table_privilege(r.r, t.oid, tp.p)::text
    from pub_tab t cross join roller r cross join tab_priv tp
  union all
  select 'privS', r.r || ' | ' || s.relname || ' | ' || sp.p
      || '=' || has_sequence_privilege(r.r, s.oid, sp.p)::text
    from pub_seq s cross join roller r cross join seq_priv sp
  union all
  select 'privF', r.r || ' | ' || f.proname || '(' || pg_get_function_identity_arguments(f.oid) || ')'
      || ' | EXECUTE=' || has_function_privilege(r.r, f.oid, 'EXECUTE')::text
    from pub_fn f cross join roller r
  union all
  select 'defacl', da.defaclobjtype::text || ' | ' || coalesce(da.defaclacl::text, '')
    from pg_default_acl da where pg_get_userbyid(da.defaclrole) = 'postgres'
)
select kategori, rad
from alle
where kategori = 'pol'   -- ◄── BYTT_KATEGORI: sett til den kategorien du vil grave i
order by rad;
