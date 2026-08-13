-- 030_fase3_rls.sql
-- Rettigheter: hjelpefunksjoner, GRANTs og RLS-policyer for alle Fase 3-tabeller.
-- Roller: superadmin (alt), ansatt (intern admin: rediger/arkiver, IKKE slette),
-- skoleadmin/skoleansatt/feide (les publisert + egne ting).

create or replace function fase3_rolle() returns text language sql stable security definer set search_path=public as $$
  select rolle from public.profiles where id = auth.uid()
$$;
create or replace function fase3_intern() returns boolean language sql stable as $$
  select fase3_rolle() in ('superadmin','ansatt')
$$;
create or replace function fase3_super() returns boolean language sql stable as $$
  select fase3_rolle() = 'superadmin'
$$;
create or replace function fase3_ressurs_synlig(rid uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.ressurser r where r.id=rid and (r.status='publisert' or fase3_intern()))
$$;

grant select, insert, update, delete on
  egnet_kategori, kategorier, utstyr, sesong, trinn, fag, kompetansemaal,
  ressurser, ressurs_innhold, ressurs_kategori, ressurs_utstyr, ressurs_egnet,
  ressurs_fag, ressurs_kompetansemaal, ressurs_sesong, ressurs_trinn, ressurs_trinn_innhold,
  medier, dokumenter, dokument_fag, endringslogg, bruk_hendelse, favoritter,
  vurderinger, popularitet_snapshot, samlinger, samling_innhold, samling_ressurs
  to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Taksonomi: alle innloggede leser; kun superadmin skriver
do $$ declare t text; begin
  foreach t in array array['egnet_kategori','kategorier','utstyr','sesong','trinn','fag','kompetansemaal'] loop
    execute format('drop policy if exists p_les on %I', t);
    execute format('create policy p_les on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists p_skriv on %I', t);
    execute format('create policy p_skriv on %I for all to authenticated using (fase3_super()) with check (fase3_super())', t);
  end loop;
end $$;

-- Barn/koblinger av ressurs: synlig hvis foreldreressursen er synlig; intern skriver
do $$ declare t text; begin
  foreach t in array array['ressurs_kategori','ressurs_utstyr','ressurs_egnet','ressurs_fag','ressurs_kompetansemaal','ressurs_sesong','ressurs_trinn','ressurs_trinn_innhold','medier'] loop
    execute format('drop policy if exists p_les on %I', t);
    execute format('create policy p_les on %I for select to authenticated using (fase3_ressurs_synlig(ressurs_id))', t);
    execute format('drop policy if exists p_skriv on %I', t);
    execute format('create policy p_skriv on %I for all to authenticated using (fase3_intern()) with check (fase3_intern())', t);
  end loop;
end $$;

-- Enkle: alle innloggede leser, intern skriver
do $$ declare t text; begin
  foreach t in array array['dokument_fag','samling_innhold','samling_ressurs','popularitet_snapshot'] loop
    execute format('drop policy if exists p_les on %I', t);
    execute format('create policy p_les on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists p_skriv on %I', t);
    execute format('create policy p_skriv on %I for all to authenticated using (fase3_intern()) with check (fase3_intern())', t);
  end loop;
end $$;

-- ressurser
drop policy if exists p_les on ressurser;
create policy p_les on ressurser for select to authenticated using (status='publisert' or fase3_intern());
drop policy if exists p_ins on ressurser;
create policy p_ins on ressurser for insert to authenticated with check (fase3_intern());
drop policy if exists p_upd on ressurser;
create policy p_upd on ressurser for update to authenticated using (fase3_intern()) with check (fase3_intern());
drop policy if exists p_del on ressurser;
create policy p_del on ressurser for delete to authenticated using (fase3_super());

-- ressurs_innhold
drop policy if exists p_les on ressurs_innhold;
create policy p_les on ressurs_innhold for select to authenticated using (fase3_ressurs_synlig(ressurs_id));
drop policy if exists p_skriv on ressurs_innhold;
create policy p_skriv on ressurs_innhold for all to authenticated using (fase3_intern()) with check (fase3_intern());

-- dokumenter
drop policy if exists p_les on dokumenter;
create policy p_les on dokumenter for select to authenticated using (status='publisert' or fase3_intern());
drop policy if exists p_ins on dokumenter;
create policy p_ins on dokumenter for insert to authenticated with check (fase3_intern());
drop policy if exists p_upd on dokumenter;
create policy p_upd on dokumenter for update to authenticated using (fase3_intern()) with check (fase3_intern());
drop policy if exists p_del on dokumenter;
create policy p_del on dokumenter for delete to authenticated using (fase3_super());

-- samlinger
drop policy if exists p_les on samlinger;
create policy p_les on samlinger for select to authenticated using (synlig or fase3_intern());
drop policy if exists p_skriv on samlinger;
create policy p_skriv on samlinger for all to authenticated using (fase3_intern()) with check (fase3_intern());

-- endringslogg: kun intern leser; ingen direkte skriving (trigger skriver via definer)
drop policy if exists p_les on endringslogg;
create policy p_les on endringslogg for select to authenticated using (fase3_intern());

-- bruk_hendelse
drop policy if exists p_ins on bruk_hendelse;
create policy p_ins on bruk_hendelse for insert to authenticated with check (bruker_id = auth.uid() or bruker_id is null);
drop policy if exists p_les on bruk_hendelse;
create policy p_les on bruk_hendelse for select to authenticated using (fase3_intern() or bruker_id = auth.uid());

-- favoritter: hver bruker sine egne
drop policy if exists p_egne on favoritter;
create policy p_egne on favoritter for all to authenticated using (bruker_id = auth.uid()) with check (bruker_id = auth.uid());

-- vurderinger: alle leser (snitt), egne skriver
drop policy if exists p_les on vurderinger;
create policy p_les on vurderinger for select to authenticated using (true);
drop policy if exists p_egne on vurderinger;
create policy p_egne on vurderinger for all to authenticated using (bruker_id = auth.uid()) with check (bruker_id = auth.uid());
