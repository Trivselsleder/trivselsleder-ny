#!/usr/bin/env node
// BEVIS for e-post-rettingene (14. sep). Kjøres med modul-mock (ingen ekte database/e-post):
//   node --import ./scripts/epost-test/register.mjs scripts/test-epost-vern.mjs
// Beviser: (1) nødbremsen (fail-closed) stopper ekte e-post i hver av de seks rutene — også når
// innstillingen er fraværende/uleselig; (2) dobbeltsendingssperren gir én e-post ved to samtidige
// kall (godkjenn, opprett-skole, send-savnet); (3) loggingen til epost_logg faktisk sendes (awaited).
process.env.VITE_SUPABASE_URL = 'http://mock'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key'
process.env.RESEND_API_KEY = 'mock-resend'
// HUBSPOT_API_KEY bevisst USATT → paamelding/godkjenn hopper over HubSpot.

let ok = 0, feil = 0
const P = (s) => console.log(s)
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

// ---- Delt resolver: oversetter et query-chain til et {data,error}-svar ut fra global __state ----
globalThis.__supaResolver = (chain) => {
  const st = globalThis.__state
  const has = (m) => chain.ops.some(o => o[0] === m)
  const arg = (m) => (chain.ops.find(o => o[0] === m) || [])[1] || []
  const eqVal = (col) => { const o = chain.ops.find(x => x[0] === 'eq' && x[1][0] === col); return o ? o[1][1] : undefined }
  const eqCol = (col) => chain.ops.some(x => x[0] === 'eq' && x[1][0] === col)

  if (chain.table === 'innstillinger') {
    if (st.innstFeil) return { data: null, error: { message: 'lesefeil' } }
    if (has('in')) { // send-savnet leser flere nøkler som en liste
      const rows = [
        { nokkel: 'avsender_navn', verdi: 'Trivselsleder' },
        { nokkel: 'avsender_epost', verdi: 'noreply@trivselsleder.no' },
        { nokkel: 'svar_til_epost', verdi: 'post@trivselsleder.no' },
        { nokkel: 'nettsted_url', verdi: 'https://trivselsleder-ny.vercel.app' },
        { nokkel: 'epost_savnet_emne', verdi: 'Vi savnet dere' },
        { nokkel: 'epost_savnet_tekst', verdi: 'Hei {mottaker_navn}' },
      ]
      if (st.motor !== undefined) rows.push({ nokkel: 'motor_aktiv', verdi: st.motor })
      return { data: rows, error: null }
    }
    if (eqVal('nokkel') === 'motor_aktiv') return { data: st.motor === undefined ? null : { verdi: st.motor }, error: null }
    if (eqVal('nokkel') === 'nettsted_url') return { data: { verdi: 'https://trivselsleder-ny.vercel.app' }, error: null }
    return { data: null, error: null }
  }
  if (chain.table === 'paameldinger') {
    if (has('insert')) return { data: { id: 'pm1' }, error: null }
    if (has('update') && has('neq')) { // atomisk claim
      if (st.claimTaken) return { data: [], error: null }
      st.claimTaken = true; return { data: [{ id: 'pm1' }], error: null }
    }
    if (has('update')) return { data: null, error: null } // release / hubspot-id
    return { data: st.p, error: null } // fetch p
  }
  if (chain.table === 'skoler') {
    if (has('select') && eqCol('org_nr')) return { data: st.eksisterendeSkole ?? null, error: null }
    if (has('select') && eqCol('id')) return { data: { navn: 'Skole' }, error: null }
    if (has('insert') || has('update') || has('upsert')) return { data: { id: 'sk1', navn: 'Skole', kommunenavn: 'K', fylke: 'F' }, error: st.skoleFeil ? { message: 'skolefeil' } : null }
    return { data: null, error: null }
  }
  if (chain.table === 'profiles') {
    if (has('select') && eqCol('id')) return { data: { rolle: 'superadmin', aktiv: true }, error: null } // caller
    if (has('select') && eqCol('epost')) return { data: st.profileExists ? { id: 'existing' } : null, error: null }
    if (has('upsert')) { // atomisk profil-claim (ignoreDuplicates)
      const id = (arg('upsert')[0] || {}).id
      st.profileClaims = st.profileClaims || new Set()
      if (st.profileClaims.has(id)) return { data: [], error: null }
      st.profileClaims.add(id); return { data: [{ id }], error: null }
    }
    return { data: null, error: null }
  }
  if (chain.table === 'bruker_skole') return { data: null, error: null }
  if (chain.table === 'kurs_skole') {
    if (has('update') && has('is')) { // savnet-reservasjon
      if (st.savnetTaken) return { data: [], error: null }
      st.savnetTaken = true; return { data: [{ id: 'ks1' }], error: null }
    }
    if (has('update')) return { data: null, error: null } // frigi
    return { data: st.ks, error: null } // hent kurs_skole
  }
  if (chain.table === 'kurs_skole_mottaker') return { data: [{ navn: 'Rektor', epost: 'htla@skole.no' }], error: null }
  if (chain.table === 'epost_logg') {
    globalThis.__log.push({ epost_logg: arg('insert')[0] })
    return { data: null, error: st.loggFeil ? { message: 'loggfeil' } : null }
  }
  return { data: null, error: null }
}

globalThis.__resendSend = async (o) => {
  globalThis.__log.push({ resend: o })
  return { data: { id: 're' + globalThis.__log.length }, error: (globalThis.__state.resendFeil ? { message: 'sendfeil' } : null) }
}

function nyttOppsett(state) {
  globalThis.__state = state
  globalThis.__log = []
}
const resendAntall = () => globalThis.__log.filter(x => x.resend).length
const loggAntall = () => globalThis.__log.filter(x => x.epost_logg).length

function lagRes() {
  return { _s: null, _j: null, status(c) { this._s = c; return this }, json(o) { this._j = o; return this } }
}
async function kall(handler, body, headers = {}) {
  const req = { method: 'POST', body, headers }
  const res = lagRes()
  await handler(req, res)
  return res
}

// Standard påmelding (for godkjenn) — kun htla-mottaker (én e-post per vellykket godkjenning).
const paameldingP = {
  id: 'pm1', status: 'påmeldt', skolenavn: 'Testskole', organisasjonsnummer: '123', kommune: 'Oslo',
  fylke: 'Oslo', type: 'barnetrinn', antall_elever: 100, gateadresse: 'Vei 1', postnummer: '0001',
  poststed: 'Oslo', kontortelefon: '111', rektor_navn: 'R', rektor_epost: 'r@skole.no', rektor_telefon: '2',
  htla_navn: 'H', htla_epost: 'htla@skole.no', tla_navn: null, tla_epost: null, tla_telefon: null,
  hubspot_company_id: null,
}
const ADMIN_H = { authorization: 'Bearer tok', origin: 'https://trivselsleder-ny.vercel.app' }

async function main() {
  P('# Bevis: e-post-vern (nødbrems fail-closed + dobbeltsending + logging)\n')

  const H = {
    paamelding: (await import('../api/paamelding.js')).default,
    godkjenn: (await import('../api/admin/godkjenn-paamelding.js')).default,
    opprettSkole: (await import('../api/admin/opprett-skole.js')).default,
    bestilling: (await import('../api/send-bestilling.js')).default,
    glemtPassord: (await import('../api/auth/glemt-passord.js')).default,
    inviter: (await import('../api/auth/inviter-bruker.js')).default,
    savnet: (await import('../api/kurs/send-savnet.js')).default,
  }

  // ============================================================
  P('## RETTING 1 — nødbremsen (motor_aktiv != «ja») stopper EKTE e-post i alle seks rutene')

  const bestillingBody = { skolenavn: 'S', antallKort: '10', kontaktperson: 'K', epost: 'k@s.no', gate: 'G', postnummer: '1', poststed: 'P', kortpris: 400, porto: 100, total: 500 }
  const seks = [
    ['paamelding.js', H.paamelding, { skolenavn: 'S', type: 'barnetrinn', gateadresse: 'G', postnummer: '1', poststed: 'P', kommune: 'Oslo', fylke: 'Oslo', organisasjonsnummer: '9', rektor_navn: 'R', rektor_epost: 'r@s.no' }, {}],
    ['admin/godkjenn-paamelding.js', H.godkjenn, { paameldinId: 'pm1' }, ADMIN_H],
    ['admin/opprett-skole.js', H.opprettSkole, { navn: 'S', orgNr: '9', htlaNavn: 'H', htlaEpost: 'htla@s.no' }, ADMIN_H],
    ['send-bestilling.js', H.bestilling, bestillingBody, {}],
    ['auth/glemt-passord.js', H.glemtPassord, { epost: 'x@s.no' }, {}],
    ['auth/inviter-bruker.js', H.inviter, { epost: 'ny@s.no', navn: 'Ny', rolle: 'ansatt' }, ADMIN_H],
  ]
  for (const [navn, handler, body, headers] of seks) {
    nyttOppsett({ motor: 'nei', p: { ...paameldingP } })
    await kall(handler, body, headers)
    krev(`${navn}: motor='nei' → 0 ekte e-post`, resendAntall() === 0, `resend=${resendAntall()}`)
  }

  // Fail-closed: fraværende og uleselig innstilling skal OGSÅ stoppe (representativt: opprett-skole + paamelding)
  P('\n## RETTING 1 (fail-closed) — fraværende/uleselig motor_aktiv stopper også')
  nyttOppsett({ motor: undefined, p: { ...paameldingP } }) // raden finnes ikke
  await kall(H.opprettSkole, { navn: 'S', orgNr: '9', htlaNavn: 'H', htlaEpost: 'htla@s.no' }, ADMIN_H)
  krev("opprett-skole: motor_aktiv FRAVÆRENDE → 0 e-post (fail-closed)", resendAntall() === 0, `resend=${resendAntall()}`)

  nyttOppsett({ innstFeil: true, p: { ...paameldingP } }) // oppslaget feiler
  await kall(H.paamelding, { skolenavn: 'S', type: 'barnetrinn', gateadresse: 'G', postnummer: '1', poststed: 'P', kommune: 'Oslo', fylke: 'Oslo', organisasjonsnummer: '9', rektor_navn: 'R', rektor_epost: 'r@s.no' }, {})
  krev('paamelding: motor_aktiv ULESELIG (oppslag feiler) → 0 e-post (fail-closed)', resendAntall() === 0, `resend=${resendAntall()}`)

  // Kontroll: motor='ja' slipper e-post gjennom (ellers beviser ikke testen noe)
  nyttOppsett({ motor: 'ja' })
  await kall(H.glemtPassord, { epost: 'x@s.no' }, {})
  krev("KONTROLL: motor='ja' → glemt-passord sender 1 e-post (vernet er ikke bare alltid-av)", resendAntall() === 1, `resend=${resendAntall()}`)

  // ============================================================
  P('\n## RETTING 3 — dobbeltsendingssperren: to samtidige kall gir ÉN e-post')

  // godkjenn: atomisk claim på paameldinger.status
  nyttOppsett({ motor: 'ja', p: { ...paameldingP } })
  await Promise.all([kall(H.godkjenn, { paameldinId: 'pm1' }, ADMIN_H), kall(H.godkjenn, { paameldinId: 'pm1' }, ADMIN_H)])
  krev('godkjenn-paamelding: to samtidige «Godkjenn» → 1 aktiveringsmail (status-claim vinner én gang)', resendAntall() === 1, `resend=${resendAntall()}`)

  // opprett-skole: atomisk profil-claim i inviterEllerKnytt (samme e-post → samme userId)
  nyttOppsett({ motor: 'ja' })
  await Promise.all([
    kall(H.opprettSkole, { navn: 'S', orgNr: '9', htlaNavn: 'H', htlaEpost: 'htla@s.no' }, ADMIN_H),
    kall(H.opprettSkole, { navn: 'S', orgNr: '9', htlaNavn: 'H', htlaEpost: 'htla@s.no' }, ADMIN_H),
  ])
  krev('opprett-skole: to samtidige kall (samme e-post) → 1 aktiveringsmail (profil-claim vinner én gang)', resendAntall() === 1, `resend=${resendAntall()}`)

  // send-savnet: atomisk reservasjon på savnet_sendt_at
  const ks = { id: 'ks1', kurs_id: 'k1', kommer: false, svart: true, skoler: { navn: 'Skole', hktl_navn: 'H', hktl_epost: 'htla@skole.no' } }
  nyttOppsett({ motor: 'ja', ks })
  await Promise.all([
    kall(H.savnet, { kurs_skole_id: 'ks1', torrkjoring: false }, ADMIN_H),
    kall(H.savnet, { kurs_skole_id: 'ks1', torrkjoring: false }, ADMIN_H),
  ])
  krev('send-savnet: to samtidige kall → 1 omsorgsmail (savnet_sendt_at-reservasjon vinner én gang)', resendAntall() === 1, `resend=${resendAntall()}`)

  // ============================================================
  P('\n## RETTING 2 — loggingen til epost_logg sendes faktisk (awaited)')

  nyttOppsett({ motor: 'ja', p: { ...paameldingP } })
  const r = await kall(H.paamelding, { skolenavn: 'S', type: 'barnetrinn', gateadresse: 'G', postnummer: '1', poststed: 'P', kommune: 'Oslo', fylke: 'Oslo', organisasjonsnummer: '9', rektor_navn: 'R', rektor_epost: 'r@s.no' }, {})
  krev('paamelding: 1 epost_logg-rad skrevet FØR svaret (await), med korrekt type', loggAntall() === 1 && globalThis.__log.find(x => x.epost_logg)?.epost_logg.type === 'paamelding_varsel', `logg=${loggAntall()} svar=${JSON.stringify(r._j)}`)

  nyttOppsett({ motor: 'ja' })
  await kall(H.opprettSkole, { navn: 'S', orgNr: '9', htlaNavn: 'H', htlaEpost: 'htla@s.no' }, ADMIN_H)
  krev('opprett-skole: aktiveringsmail logget (type konto_aktivering)', globalThis.__log.some(x => x.epost_logg?.type === 'konto_aktivering'), JSON.stringify(globalThis.__log.filter(x => x.epost_logg).map(x => x.epost_logg.type)))

  nyttOppsett({ motor: 'ja' })
  await kall(H.bestilling, bestillingBody, {})
  krev('send-bestilling: TO epost_logg-rader (intern + kunde)', loggAntall() === 2, `logg=${loggAntall()}`)

  // Logging velter aldri utsendingen: selv om epost_logg-insert feiler, går e-posten (resend) ut
  nyttOppsett({ motor: 'ja', loggFeil: true })
  await kall(H.glemtPassord, { epost: 'x@s.no' }, {})
  krev('logging feiler → e-posten går LIKEVEL ut (loggFeil svelges, resend=1)', resendAntall() === 1, `resend=${resendAntall()}`)

  P('')
  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
