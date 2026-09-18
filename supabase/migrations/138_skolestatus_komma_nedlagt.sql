-- ============================================================================
-- 138_skolestatus_komma_nedlagt.sql — statuslista lik ny side og HubSpot
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning 17. sep (claude_OPPDRAG-CODE-HUBSPOT-OG-
--   TILGANG-17sep.md, DEL 1) + prod-avlesning DEL 0 (resultat-hubspot-tilgang-prod.md):
--     skoler_status_check hadde 7 verdier: Påmeldt, Aktiv, «Aktiv sagt opp» (uten
--     komma), Pause, Tidligere, Potensielle, Inaktiv. Prod: 15 Aktiv + 1 Påmeldt +
--     1 Potensielle (ingen rad hadde «Aktiv sagt opp» pr. 17. sep — men vi migrerer
--     likevel, idempotent).
--
-- HVA (ÉN transaksjon, ingen funksjonsendring):
--   1) «Aktiv sagt opp» får komma → «Aktiv, sagt opp» (i CHECK og i eventuelle rader).
--   2) «Nedlagt» legges til som lovlig verdi.
--   Ny lovlig liste (lik ny side + HubSpot): Påmeldt · Aktiv · Aktiv, sagt opp ·
--   Pause · Tidligere · Potensielle · Nedlagt · Inaktiv. («Tidligere» = tidligere
--   TL-skole som kan bli TL-skole igjen; «Nedlagt» = skolen finnes ikke lenger.
--   «Inaktiv» = intern verdi for avviste påmeldinger, sendes ALDRI til HubSpot.)
--
-- FUNKSJONSKROPPER: DEL 0 fant KUN ett pg_proc-treff på «sagt opp» —
--   public.hent_offentlige_skoler (044). Der står strengen i en KOMMENTAR
--   («… «Aktiv sagt opp» faller ut automatisk»); logikken filtrerer på
--   s.status = 'Aktiv' (eksakt), som er uendret. Funksjonen rører derfor ALDRI
--   den gamle verdien i drift, og trenger ingen endring. Vi gjør bevisst IKKE en
--   create-or-replace bare for å pynte en kommentar: (a) «sed på en kommentar er
--   ikke sed på koden» (12. sep), og (b) prods faktiske kropp må leses før enhver
--   create-or-replace (104-fellen / 15-funksjoners-avviket 12. sep). Ingen kode i
--   src/ eller api/ bruker strengen i logikk (kun visning i AdminSkoler-lista, som
--   rettes i frontend-committen samtidig).
--
-- SPERRER:
--   FØR: ingen skole har en status utenfor forventet sett (fanger drift).
--   ETTER: ingen rad har lengre den komma-løse «Aktiv sagt opp».
-- KVITTERING: ny CHECK-definisjon + antall rader med den nye komma-verdien.
-- EGENSKAPER: idempotent (kan kjøres på nytt) · ÉN transaksjon · commit til slutt.
-- TILBAKERULLING (etter commit): begin;
--   alter table public.skoler drop constraint if exists skoler_status_check;
--   update public.skoler set status='Aktiv sagt opp' where status='Aktiv, sagt opp';
--   alter table public.skoler add constraint skoler_status_check
--     check (status = any (array['Påmeldt','Aktiv','Aktiv sagt opp','Pause',
--            'Tidligere','Potensielle','Inaktiv']::text[]));
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SPERRE FØR: ingen status utenfor det forventede settet (gammel ELLER ny form).
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.skoler
   where status is not null
     and status not in ('Påmeldt','Aktiv','Aktiv sagt opp','Aktiv, sagt opp',
                        'Pause','Tidligere','Potensielle','Nedlagt','Inaktiv');
  if n <> 0 then
    raise exception 'STOPP 138 (før): % skole(r) har en status utenfor forventet sett — undersøk før migrering.', n;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) Slipp gammel CHECK (må vekk før radene kan få komma-verdien).
-- 2) Gi «Aktiv sagt opp» komma i eksisterende rader.
-- 3) Ny CHECK: komma + «Nedlagt», gammel komma-løs verdi fjernet.
-- ----------------------------------------------------------------------------
alter table public.skoler drop constraint if exists skoler_status_check;

update public.skoler set status = 'Aktiv, sagt opp' where status = 'Aktiv sagt opp';

alter table public.skoler add constraint skoler_status_check
  check (status = any (array[
    'Påmeldt','Aktiv','Aktiv, sagt opp','Pause','Tidligere','Potensielle','Nedlagt','Inaktiv'
  ]::text[]));

-- ----------------------------------------------------------------------------
-- SPERRE ETTER.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.skoler where status = 'Aktiv sagt opp';
  if n <> 0 then raise exception 'STOPP 138 (etter): % rad har fortsatt «Aktiv sagt opp» uten komma.', n; end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING.
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'ny check: ' || (select pg_get_constraintdef(oid) from pg_constraint where conname = 'skoler_status_check'),
  'rader med «Aktiv, sagt opp»: ' || (select count(*)::text from public.skoler where status = 'Aktiv, sagt opp')
) as kvittering;

commit;
