#!/usr/bin/env node
// MEKANISK TEST av lek-passet (lib/lekpass.mjs) mot en ekte 001→102-base.
// Bygger oppslagslaget, skriver import_kjoring-anker (steg 2), kjører lek-passet (steg 4/5/6),
// teller FAKTISKE rader i basen, kjører EN GANG TIL for determinisme, og ruller tilbake.
//
//   node scripts/import/test-lekpass.mjs        (mot trivsel_port_test)

import { lesItems } from './lib/kilde.mjs'
import { Oppslag } from './lib/oppslag.mjs'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { finnLenkesamlingNids, TESTNODE_NID } from './lib/samlingpass.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const KJORING_ID = detUuid('kjoring', 'test-lekpass-4sep')

async function tellIBasen(k) {
  const q = async (sql, p = []) => (await k.query(sql, p)).rows[0].n
  const idFilter = 'where ressurs_id in (select id from ressurser where import_kjoring_id=$1)'
  return {
    ressurser: +await q('select count(*) n from ressurser where import_kjoring_id=$1', [KJORING_ID]),
    ressurs_innhold: +await q(`select count(*) n from ressurs_innhold ${idFilter}`, [KJORING_ID]),
    ressurs_kategori: +await q(`select count(*) n from ressurs_kategori ${idFilter}`, [KJORING_ID]),
    ressurs_utstyr: +await q(`select count(*) n from ressurs_utstyr ${idFilter}`, [KJORING_ID]),
    ressurs_trinn: +await q(`select count(*) n from ressurs_trinn ${idFilter}`, [KJORING_ID]),
    ressurs_egnet: +await q(`select count(*) n from ressurs_egnet ${idFilter}`, [KJORING_ID]),
    redaksjonell_ko: +await q('select count(*) n from redaksjonell_ko where import_kjoring_id=$1', [KJORING_ID]),
  }
}

async function main() {
  // ── Kilder ──
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const K = {
    catName: Object.fromEntries(catTerms.map(t => [String(t.tid), t.name])),
    eqName: Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name])),
  }
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t]))
  const eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))
  const alleePubliserte = games.filter(n => n.status === 1 || n.status === '1')

  // FILTRERT LEKESTRØM (steg 11-filteret, samme logikk som samlings-passet):
  // 867 publiserte − de C1-lenkesamlingene − testnoden 20062 = 846 ekte leker.
  // Forrige lek-kjøring gikk mot de ufiltrerte 867; denne går mot de filtrerte 846.
  const samlingNids = finnLenkesamlingNids(games)
  const publiserte = alleePubliserte.filter(
    n => !samlingNids.has(String(n.nid)) && String(n.nid) !== String(TESTNODE_NID))

  // Referte termer (samme som oppslagstesten) for opprett-eller-gjenbruk.
  const katTids = new Set(), utsTids = new Set()
  for (const n of publiserte) {
    for (const c of (n.field_game_category || [])) if (c.tid != null) katTids.add(String(c.tid))
    for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsTids.add(String(e.target_id))
  }
  for (const tid of [...katTids]) for (const p of (catByTid.get(tid)?.parents || [])) if (catByTid.has(String(p))) katTids.add(String(p))
  const kategoriTermer = [...katTids].map(t => catByTid.get(t)).filter(Boolean)
  const utstyrTermer = [...utsTids].map(t => eqByTid.get(t)).filter(Boolean)

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()

  const P = (s) => console.log(s)
  await k.query('begin')
  try {
    // STEG 3 (forutsetning): oppslagslaget.
    const o = new Oppslag(k)
    await o.lesFaste()
    await o.opprettEllerGjenbruk(kategoriTermer, utstyrTermer)

    // STEG 2 (forutsetning): import_kjoring-anker (FK-mål for ressurser).
    await k.query(
      `insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2)
       on conflict (id) do update set antall_noder=excluded.antall_noder`,
      [KJORING_ID, publiserte.length])

    // N1: pubDocNids er OBLIGATORISK. Denne testen er lek-ISOLERT (ingen dokumenter i basen), så vi
    // sender inn et TOMT Set eksplisitt — da blir hver field_related_documents-kobling en synlig
    // `lenke_upublisert`-kø (ikke et stille tap), og ingen ressurs_dokument-rad bygges (unngår FK mot
    // dokumenter som ikke finnes her). ressurs_dokument dekkes av test-medie-* og test-samlingpass.
    const ISOLERT = { pubDocNids: new Set() }

    // ── KJØRING 1: bygg + skriv lek-passet (steg 4/5/6) ──
    const b1 = byggLekPass(publiserte, KJORING_ID, o, K, ISOLERT)
    await skrivLekPass(k, b1.plan)
    const tell1 = await tellIBasen(k)

    // ── KJØRING 2 på SAMME base (determinisme + idempotens) ──
    const b2 = byggLekPass(publiserte, KJORING_ID, o, K, ISOLERT)
    await skrivLekPass(k, b2.plan)
    const tell2 = await tellIBasen(k)

    // kø per type (fra basen)
    const køRader = (await k.query('select type, count(*) n from redaksjonell_ko where import_kjoring_id=$1 group by type order by 2 desc', [KJORING_ID])).rows

    // Trinn-fordeling per lek (referansetall 645 / 653). Kodene 1–10 er de ti klassetrinnene.
    const trinnPerLek = (await k.query(
      `select rt.ressurs_id, array_agg(t.kode) koder
         from ressurs_trinn rt
         join trinn t on t.id = rt.trinn_id
         join ressurser r on r.id = rt.ressurs_id
        where r.import_kjoring_id = $1
        group by rt.ressurs_id`, [KJORING_ID])).rows
    const TI = ['1','2','3','4','5','6','7','8','9','10']
    const ATTE_TIL_TI = ['8','9','10']
    let medAlleTi = 0, med8til10 = 0
    for (const row of trinnPerLek) {
      const s = new Set(row.koder)
      if (TI.every(kode => s.has(kode))) medAlleTi++
      if (ATTE_TIL_TI.every(kode => s.has(kode))) med8til10++
    }

    // ── Rapport ──
    P(`# Lek-pass — mekanisk test mot 001→102-base`)
    P(`Leker behandlet (FILTRERT strøm): ${publiserte.length}   (${alleePubliserte.length} publiserte − ${samlingNids.size} lenkesamlinger − testnode ${TESTNODE_NID})`)
    P(``)
    P(`## Rader FAKTISK skrevet i basen (talt via import_kjoring_id)`)
    for (const t of Object.keys(tell1)) P(`  ${t.padEnd(18)} ${String(tell1[t]).padStart(6)}`)
    P(``)
    P(`## redaksjonell_ko per type`)
    for (const r of køRader) P(`  ${r.type.padEnd(20)} ${String(r.n).padStart(6)}`)
    P(``)
    P(`## Trinn-fordeling (referanse godkjent kjøring: 645 / 653)`)
    P(`  leker med alle ti trinn (1–10): ${medAlleTi}   (referanse: 645)`)
    P(`  leker på 8–10 (8,9,10):         ${med8til10}   (referanse: 653)`)
    P(`  leker med minst ett trinn:      ${trinnPerLek.length}`)
    P(``)
    P(`## Oppslag brukt (0 bom = alle koblinger fikk en id)`)
    P(`  kategorier opprettet/gjenbrukt: ny=${o.telling.kategorier.ny_opprettet} navn+stemplet=${o.telling.kategorier.gjenbruk_navn_stemplet}`)
    P(`  utstyr opprettet/gjenbrukt:     ny=${o.telling.utstyr.ny_opprettet} navn+stemplet=${o.telling.utstyr.gjenbruk_navn_stemplet}`)
    P(``)
    // ── Determinisme-bevis ──
    const likt = Object.keys(tell1).every(t => tell1[t] === tell2[t])
    P(`## Determinisme (kjøring 1 vs 2 på samme base)`)
    for (const t of Object.keys(tell1)) P(`  ${t.padEnd(18)} kjøring1=${tell1[t]}  kjøring2=${tell2[t]}  ${tell1[t] === tell2[t] ? 'OK' : 'AVVIK!'}`)
    P(``)
    P(likt
      ? `RESULTAT: identiske tall i begge kjøringer → deterministisk og idempotent. Koblinger skrevet med *_id (G1 lukket).`
      : `RESULTAT: AVVIK mellom kjøringene — se over.`)

    // Plan-telling skal også være byte-lik mellom de to byggene.
    const planLikt = JSON.stringify(b1.telling) === JSON.stringify(b2.telling)
    P(`Plan-bygg deterministisk (samme radtelling begge ganger): ${planLikt ? 'JA' : 'NEI'}`)
  } finally {
    await k.query('rollback')   // MÅLING: ingenting skrives varig
    await k.end()
  }
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
