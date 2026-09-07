#!/usr/bin/env node
// IMPORTKJØREREN — den samlede orkestratoren (funn N2/O-1). Bygget VED SIDEN AV test-alle-fem-pass.mjs
// (som forblir den uavhengige regresjonsporten), men GJENBRUKER dens delte byggekloss byggKontekst
// — «vokse ut av», ikke duplisere (kravkartets anbefaling). byggKontekst tar nå en valgfri kjørings-id
// (default = testens faste KJ), så kjøreren kan sende sin EGEN per-kjøring-id inn.
//
// Kjøreren EIER rekkefølgen: hvert steg deklarerer sine avhengigheter, og kjøreren NEKTER å kjøre et
// steg før avhengighetene har kjørt (håndhevet i KODE — ikke overlatt til at kallene tilfeldigvis står
// riktig, og ikke til at FK-en feiler). Den setter sesjonsvariabelen fra migr 104, håndhever
// stoppregelen, og ruller tilbake via den BESTÅTTE slettKjøring i db.mjs. Sperren i db.mjs brukes for
// ekte tilkobling (Skriver.koble); den skrives ikke på nytt.
//
//   node scripts/import/import-kjorer.mjs --skriv     (EKTE — via Skriver.koble mot øvingskopien)
// (BEVIS mot lokal base: se test-importkjorer.mjs, som kaller kjorImport med en lokal klient.)
//
// IKKE med: fil-opplasting til Bunny/Supabase Storage (etappe 6, eget spor).

import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggMediePass, skrivMediePass } from './lib/mediepass.mjs'
import { byggSamlingPass, skrivSamlingPass } from './lib/samlingpass.mjs'
import { byggOgSkrivAktivLaering } from './lib/aktivlaering.mjs'
import { randomUUID } from 'node:crypto'
import { Skriver } from './lib/db.mjs'
import { byggKontekst } from './test-alle-fem-pass.mjs'

// ── STEG med DEKLARERTE avhengigheter (håndheves i kode) ────────────────────────────────────────
// oppslag + udir_seed gjøres av byggKontekst (grunnlaget). De øvrige fem passene har FK-avhengigheter:
//   lek → dokument (ressurs_dokument.dokument_id → dokumenter)
//   medie → lek     (medier.ressurs_id → ressurser)
//   samling → lek + dokument (samling_ressurs→ressurser, samling_dokument→dokumenter)
//   aktiv_laering → udir_seed (uriTilId fra seedUdirMaal)
export const STEG = {
  dokument: {
    avhengerAv: [],
    kjor: async (k, ctx, opts) => { const p = byggDokumentPass(ctx.pubDocs, ctx.kjoringId, ctx.o).plan; opts.saboter?.dokument?.(p); await skrivDokumentPass(k, p) },
  },
  lek: {
    avhengerAv: ['dokument'],
    kjor: async (k, ctx, opts) => { const p = byggLekPass(ctx.lekNoder, ctx.kjoringId, ctx.o, ctx.K, { pubDocNids: ctx.pubDocNids }).plan; opts.saboter?.lek?.(p); await skrivLekPass(k, p) },
  },
  medie: {
    avhengerAv: ['lek'],
    kjor: async (k, ctx, opts) => { const p = byggMediePass(ctx.lekNoder, ctx.kjoringId, ctx.finnes).plan; opts.saboter?.medie?.(p); await skrivMediePass(k, p) },
  },
  samling: {
    avhengerAv: ['lek', 'dokument'],
    kjor: async (k, ctx, opts) => {
      // Mål vei-A-bidraget (ressurs_egnet fra samlinger) rundt dette steget.
      const før = +(await k.query('select count(*) n from ressurs_egnet where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [ctx.kjoringId])).rows[0].n
      const p = byggSamlingPass(ctx.pubSamlinger, ctx.kjoringId, ctx.o, ctx.samlingCtx).plan; opts.saboter?.samling?.(p); await skrivSamlingPass(k, p)
      ctx._veiA = +(await k.query('select count(*) n from ressurs_egnet where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [ctx.kjoringId])).rows[0].n - før
    },
  },
  aktiv_laering: {
    avhengerAv: ['udir_seed'],
    kjor: async (k, ctx) => { await byggOgSkrivAktivLaering(k, ctx.atluNoder, ctx.vokab, ctx.fagmap, ctx.koblingForslag, ctx.uriTilId, ctx.kjoringId) },
  },
}
export const STANDARD_REKKEFOLGE = ['dokument', 'lek', 'medie', 'samling', 'aktiv_laering']

// STOPPREGELEN (claude_IMPORTFASIT-2sep.md). To klasser:
//   FEILKOBLING (peker på noe GALT eller noe som ikke finnes) → ÉN er nok → stopp + full tilbakerulling.
//     Den TEKNISKE varianten («noe som ikke finnes») fanges av FK/CHECK i transaksjonen (kaster → rollback).
//     Den AUTOMATISKE etter-sjekken under teller foreldreløse koblinger (skal være 0 — FK garanterer det;
//     et vern i dybden). Innholdsmessig feilkobling («noe GALT, men gyldig») er usynlig for basen og
//     avgjøres av menneske/Fable på 50-utvalget → da kaller operatøren rullTilbake() (slettKjøring).
//   MANGLENDE, ærlig tom (peker på INGENTING: tomt sted/antall, fallback-alt-tekst) → teller mot 3 av 50.
//     Kjøreren TELLER og RAPPORTERER disse; 3-grensen er en QA-utvalgsregel (menneske), ikke en total-grense.
export async function klassifiserStoppregel(k, kjoringId) {
  const q = async (sql) => +(await k.query(sql, [kjoringId])).rows[0].n
  const rid = '(select id from ressurser where import_kjoring_id=$1)'
  const did = '(select id from dokumenter where import_kjoring_id=$1)'
  const sid = '(select id from samlinger where import_kjoring_id=$1)'
  // Foreldreløse koblinger (feilkobling: peker på noe som ikke finnes). FK gjør dette til 0; vern i dybden.
  const foreldrelose =
    await q(`select count(*) n from ressurs_dokument rd where rd.ressurs_id in ${rid} and not exists (select 1 from dokumenter d where d.id=rd.dokument_id)`) +
    await q(`select count(*) n from samling_ressurs sr where sr.samling_id in ${sid} and not exists (select 1 from ressurser r where r.id=sr.ressurs_id)`) +
    await q(`select count(*) n from samling_dokument sd where sd.samling_id in ${sid} and not exists (select 1 from dokumenter d where d.id=sd.dokument_id)`) +
    await q(`select count(*) n from medier m where m.import_kjoring_id=$1 and not exists (select 1 from ressurser r where r.id=m.ressurs_id)`)
  // Ærlig tomme felt (peker på ingenting) — telles for QA-utvalgets 3-grense.
  const manglende = await q(`select count(*) n from redaksjonell_ko where import_kjoring_id=$1 and type in ('tom_tekst','antall_uavklart','manglende_alttekst')`)
  return { feilkoblinger: foreldrelose, manglende }
}

// Ruller tilbake en committet kjøring via den BESTÅTTE slettKjøring i db.mjs (fire eiere + sikkerhetsnett).
export async function rullTilbake(klient, kjoringId) {
  const s = new Skriver({ dryRun: false, envSti: null }); s.klient = klient
  await s.slettKjøring(kjoringId)
}

// Selve orkestratoren. Tar en TILKOBLET klient (Skriver.koble i ekte modus, eller lokal klient i test).
// opts:
//   kjoringId — valgfri. STANDARD: en NY tilfeldig uuid PER kjøring (randomUUID), så to kjøringer
//               etter hverandre ALDRI deler id (funn 6-sep: delt id ⇒ loggene blander seg og
//               slettKjøring ville tatt begge). Testene sender inn en FAST id der de trenger determinisme.
//   merke     — valgfri tekst som navngir kjøringen for gjenkjenning i loggen (import_kjoring.notat).
//   rekkefolge — for å bevise håndhevelsen. saboter — plan-mutasjoner for feilkobling-bevis.
export async function kjorImport(klient, opts = {}) {
  const rekkefolge = opts.rekkefolge || STANDARD_REKKEFOLGE
  const kjoringId = opts.kjoringId || randomUUID()   // NY id per kjøring med mindre en fast er oppgitt
  const merke = opts.merke ?? null
  await klient.query('begin')
  try {
    // import_kjoring-ankeret MÅ finnes FØR sesjonsvariabelen settes: 104-triggeren stempler
    // endringslogg.import_kjoring_id = kjoringId på hver audit-skriving (også kategorier/utstyr i
    // oppslaget), og den kolonnen har FK → import_kjoring(id). Uten ankeret først → FK-brudd på
    // første audit-rad. Merket legges i notat (byggKontekst sitt on-conflict-do-update rører kun antall_noder).
    await klient.query(`insert into import_kjoring (id, kilde, status, antall_noder, notat) values ($1,'240826-eksport','paagaar',0,$2) on conflict (id) do nothing`, [kjoringId, merke])
    // Migr 104: sett kjøringskonteksten FØR noe skrives, så alle endringene spores til DENNE kjøringen.
    await klient.query('select set_config($1, $2, true)', ['trivsel.import_kjoring_id', kjoringId])
    // Grunnlaget: oppslag (opprett-eller-gjenbruk) + Udir-seed (byggKontekst upserter samme anker via kjoringId).
    const ctx = await byggKontekst(klient, kjoringId)
    const kjort = new Set(['oppslag', 'udir_seed'])   // begge gjort av byggKontekst
    for (const navn of rekkefolge) {
      const steg = STEG[navn]
      if (!steg) throw new Error(`kjøreren nekter: ukjent steg «${navn}».`)
      for (const dep of steg.avhengerAv) {
        if (!kjort.has(dep)) {
          throw new Error(`kjøreren nekter: steget «${navn}» krever at «${dep}» har kjørt først (FK-avhengighet håndhevet i kjøreren, ikke overlatt til kall-rekkefølgen eller til at FK-en feiler).`)
        }
      }
      await steg.kjor(klient, ctx, opts)
      kjort.add(navn)
    }
    // Stoppregel: teknisk feilkobling (foreldreløs) → stopp. (Innholdsfeilkobling = QA, se rullTilbake.)
    const stopp = await klassifiserStoppregel(klient, kjoringId)
    if (stopp.feilkoblinger > 0) throw new Error(`STOPPREGEL: ${stopp.feilkoblinger} feilkobling(er) (peker på noe som ikke finnes) — ruller tilbake hele kjøringen.`)
    // Vellykket: merk kjøringen ferdig (ellers står den på 'paagaar' for alltid).
    await klient.query(`update import_kjoring set status='ferdig', ferdig_at=now() where id=$1`, [kjoringId])
    await klient.query('commit')
    return { ok: true, kjoringId, merke, veiA: ctx._veiA, stoppregel: stopp }
  } catch (e) {
    await klient.query('rollback').catch(() => {})
    return { ok: false, kjoringId, merke, feil: e.message }
  }
}

// ── CLI: ekte kjøring GJENNOM SPERREN (Skriver.koble). Kjøres kun ved direkte kjøring. ──
async function main() {
  const arg = process.argv.slice(2)
  const flaggVerdi = (n) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : undefined }
  if (!arg.includes('--skriv')) {
    console.log('Tørrmodus: importkjøreren skriver ikke uten --skriv. Ekte kjøring går GJENNOM Skriver.koble (sperren) mot øvingskopien i .env.import.')
    console.log('Flagg: --merke «navn» gir kjøringen et gjenkjennelig navn i loggen. --kjoring-id «uuid» tvinger en bestemt id (ellers genereres en ny per kjøring).')
    console.log('BEVIS mot lokal base: node scripts/import/test-importkjorer.mjs')
    return
  }
  const ENV_STI = flaggVerdi('--env') || `${process.env.HOME}/trivselsleder-ny/.env.import`
  const merke = flaggVerdi('--merke')            // valgfritt navn for gjenkjenning i loggen
  const kjoringId = flaggVerdi('--kjoring-id')   // valgfri tvungen id (ellers: ny per kjøring)
  const s = new Skriver({ dryRun: false, envSti: ENV_STI })
  await s.koble()   // ← SPERREN: forgiftet-sjekk + allowlist + bekreftKopiIdentitet (BESTÅTT, gjenbrukt)
  try {
    const r = await kjorImport(s.klient, { merke, kjoringId })
    if (!r.ok) { console.error('IMPORT STOPPET:', r.feil); await rullTilbake(s.klient, r.kjoringId).catch(() => {}); process.exit(1) }
    console.log('IMPORT OK. kjøring:', r.kjoringId, r.merke ? `(«${r.merke}»)` : '', '· vei-A:', r.veiA, '· manglende (QA):', r.stoppregel.manglende)
  } finally { await s.ferdig() }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
