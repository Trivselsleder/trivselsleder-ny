-- 097_seed_churn_signalord.sql
-- ============================================================================
-- SEED: churn_signalord — ordlista churn-flaggingen leser (13 ord)
-- ============================================================================
-- HVORFOR: de 13 ordene finnes i prod, men lages av INGEN migrasjon (haandseedet
--   19. juni + 11. aug). En gjenoppbygd base ville hatt en DOED churn-flagging.
--   Kilde: _kontroll-017-019/prod/prod_seed.csv (lest, ikke skrevet av hukommelsen).
--
-- MOENSTER (som migr 082): insert ... where not exists — ALDRI update. Setter kun inn
--   et ord som mangler; overskriver aldri noe noen har endret. Prods faste UUID-er
--   brukes (identitets-likhet i seed-diffen). Vakt paa lower(ord) saa et ord aldri
--   dukker opp to ganger uansett skrivemaate. created_at defaultes (now()) —
--   tidsstempler holdes utenfor seed-diffen.
--
-- NO-OP MOT PROD: alle 13 finnes -> 0 rader. TOM BASE: 13 rader. Idempotent.
-- Nummer 097: seed-par med 097B (innstillinger), etter 095/096; churn foerst (triviell).
-- ============================================================================

begin;

insert into public.churn_signalord (id, ord, aktiv)
select '747a1cc0-e6c1-4380-8e23-4098a14b7126', 'avslutt', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('avslutt'));

insert into public.churn_signalord (id, ord, aktiv)
select '878aa5f9-e6fb-4730-8032-280dfa17552b', 'avvikl', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('avvikl'));

insert into public.churn_signalord (id, ord, aktiv)
select '4445ec3e-e02d-48ba-8eef-bd85d1225b19', 'budsjett', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('budsjett'));

insert into public.churn_signalord (id, ord, aktiv)
select 'b4f5089d-668b-4250-9929-4fd08e5167bf', 'i tvil', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('i tvil'));

insert into public.churn_signalord (id, ord, aktiv)
select '18fad1ef-c47f-4a9b-9579-a3fb61595812', 'ikke fortsette', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('ikke fortsette'));

insert into public.churn_signalord (id, ord, aktiv)
select '8366bcc5-6dee-4ebd-97fb-8d5fcb46db5c', 'ikke videre', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('ikke videre'));

insert into public.churn_signalord (id, ord, aktiv)
select 'f94c3a49-8260-45a6-9ec9-8dbedab7e8e3', 'legges ned', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('legges ned'));

insert into public.churn_signalord (id, ord, aktiv)
select '20383f31-f0dc-4ad9-855c-e502c0c6e96a', 'nedlegg', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('nedlegg'));

insert into public.churn_signalord (id, ord, aktiv)
select '166ed690-60ea-42fc-a5a6-4946004a2122', 'oppsig', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('oppsig'));

insert into public.churn_signalord (id, ord, aktiv)
select '58ca2024-2ffb-46f1-96c8-e3638c1ff646', 'prioriter', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('prioriter'));

insert into public.churn_signalord (id, ord, aktiv)
select '9d9aa40b-c41b-48f4-9a29-91912faf3f5a', 'ressurs', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('ressurs'));

insert into public.churn_signalord (id, ord, aktiv)
select '8fcf54f1-4ec1-4026-aba6-9e2afbdc6830', 'slutt', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('slutt'));

insert into public.churn_signalord (id, ord, aktiv)
select '99902547-15b1-49b7-a7bf-d0a7a19331f2', 'økonomi', true
where not exists (select 1 from public.churn_signalord where lower(ord) = lower('økonomi'));

commit;
