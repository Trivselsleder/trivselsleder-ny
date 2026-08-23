-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 064: NAVNGITTE GRUPPER PÅ RUNDEN
-- Trivselsleder-ny · 23. aug 2026 · TU steg 4, del 1 · Beslutning C (variant a)
--
-- BESLUTNING (Kjartan 23. aug): TU-runde = per GRUPPE (variant a fra
-- gruppe-verifiseringen). HTLA oppretter navngitte grupper («6A», «6B») med
-- elevtall, og hver gruppe blir ÉN rad i tu_runder. Kodesettet (tu_koder)
-- henger på runden som før — dermed blir kodearket automatisk «per gruppe».
--
-- PERSONVERN (kritisk — dette er hele poenget med variant a):
--   * gruppe_navn og elevtall ligger KUN på tu_runder (utdelingssiden).
--   * tu_svar RØRES IKKE: svaret beholder (runde_id, svar, trinn, kjonn) —
--     ingen gruppe-kolonne, ingen kodekobling, ingen tidsstempel (migr 041/046).
--   * tu_lever_svar skriver fortsatt kun runde_id inn i svaret → et enkeltsvar
--     kan aldri merkes «6A» direkte. Rapport per gruppe utledes via runde_id,
--     og k-terskel/skjerming (migr 045) gjelder allerede per runde — dvs. nå
--     automatisk per gruppe (strengere, ikke svakere, enn per trinn).
--   * Elevtall er et FORVENTNINGSTALL til svarprosent (mot brukte koder,
--     designvalg A.3) — ikke en personopplysning.
--
-- VINDU (byggeplan 4.2 — «vindu, ikke dag»): runden får startdato i tillegg
-- til eksisterende `frist` (date, fra migr 041), som fra nå ER vinduets
-- SLUTTDATO. Auto-lukk-cron (steg 4.5, senere) lukker på frist.
--
-- TL-KROK (byggeplan 4.2): flagget tl_sporsmal sier om runden skal stille den
-- betingede TL-blokken («Er du trivselsleder dette semesteret?») til elevene.
-- Selve spørsmålsblokken i elevflaten bygges senere — dette er kun kroken.
--
-- RPC-SJEKK (husregel 6): det finnes INGEN opprettelses-RPC for runder
-- (tu_opprett_runde finnes ikke — kun tu_opprett_koder, som er uendret her).
-- Runder opprettes via direkte INSERT på tu_runder (RLS-policy
-- tu_runder_egen_skole_ins + GRANT insert til authenticated, migr 041).
-- Nye kolonner dekkes av eksisterende tabell-GRANT → ingen signaturendring,
-- ingen DROP/CREATE av funksjoner i denne migrasjonen.
--
-- FORUTSETNING: migr 041 + 045 + 046 er kjørt live. Ingen ekte TU-runder
-- finnes ennå (modulen er «bak lås») → indeksbytte er trygt.
--
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent (IF NOT EXISTS / IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Nye kolonner på tu_runder (KUN på runden — aldri på tu_svar)
-- ---------------------------------------------------------------------------
alter table public.tu_runder
  add column if not exists gruppe_navn text,                    -- f.eks. '6A'. NULL = hele trinnet (bakoverkompatibelt)
  add column if not exists elevtall    int,                     -- forventet antall elever i gruppen
  add column if not exists startdato   date,                    -- vinduets start (frist = vinduets slutt)
  add column if not exists tl_sporsmal boolean not null default false;  -- TL-krok (4.2)

-- CHECK-er som navngitte constraints (idempotent — legges kun til hvis de mangler).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tu_runder_elevtall_check') then
    alter table public.tu_runder
      add constraint tu_runder_elevtall_check
      check (elevtall is null or elevtall between 1 and 200);
  end if;
  -- Vindu-sanitet: når begge datoer er satt, må start være før eller lik slutt.
  if not exists (select 1 from pg_constraint where conname = 'tu_runder_vindu_check') then
    alter table public.tu_runder
      add constraint tu_runder_vindu_check
      check (startdato is null or frist is null or startdato <= frist);
  end if;
  -- Gruppenavn: kort og ikke bare mellomrom (1–40 tegn etter trim).
  if not exists (select 1 from pg_constraint where conname = 'tu_runder_gruppe_navn_check') then
    alter table public.tu_runder
      add constraint tu_runder_gruppe_navn_check
      check (gruppe_navn is null or length(btrim(gruppe_navn)) between 1 and 40);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Unikhet: én runde per (skole, trinn, GRUPPE, skoleår, semester).
--    Erstatter tu_runder_unik_trinn fra migr 041 (som ikke skilte på gruppe —
--    den ville sperret «6A» og «6B» på samme trinn/semester).
--    coalesce(gruppe_navn,'') → NULL-gruppe («hele trinnet») er fortsatt unik
--    per trinn, mens navngitte grupper skilles fra hverandre.
-- ---------------------------------------------------------------------------
drop index if exists public.tu_runder_unik_trinn;
create unique index if not exists tu_runder_unik_gruppe
  on public.tu_runder (skole_id, trinn, coalesce(btrim(gruppe_navn),''), skoleaar, coalesce(semester,''));

-- ============================================================================
-- SLUTT MIGRASJON 064.
-- MERK (senere steg, IKKE her): 4.3 kodegenerator lager koder per runde/gruppe
-- via tu_opprett_koder (uendret); 4.5 auto-lukk-cron lukker på `frist`
-- (Oslo-tidsvakt-mønsteret). tu_svar er ikke rørt i denne migrasjonen.
-- ============================================================================
