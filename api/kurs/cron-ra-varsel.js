import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

// B12 (høring 17. aug): RA-VARSEL — daglig oppsummering til rådgiveren (RA).
//
// To situasjoner krever at RA gjør noe manuelt, og drukner lett i mengden:
//   1) en skole sier NEI, men er ÅPEN for et annet kurs i nærheten
//      (kommer=false OG apen_for_annet_kurs=true) — RA kan flytte skolen,
//   2) et utpekt VERTSKAP har sagt NEI (er_vertskap=true OG vertskap_bekreftet=false)
//      — RA må peke ut nytt vertskap.
//
// Cronen samler NYE slike saker i RA-ens egne nettverk (via nettverk_ansvarlig)
// og sender én oppsummering per RA til RA-ens e-post (profiles.epost). Hver sak
// varsles maks én gang (stempelet ra_varslet_at settes først når e-posten er sendt).
//
// NØDBREMS: sender ekte e-post kun når torrkjoring=false OG motor_aktiv != 'nei'.
// Vercel-cron kaller med ?torrkjoring=false. Standard er tørrkjøring (fail-closed).
//
// Innringere (samme vakt som de andre kursjobbene):
//   1. Vercel-cron (Bearer CRON_SECRET) — daglig.
//   2. En innlogget ansatt — for manuell kjøring/forhåndsvisning.

const resend = new Resend(process.env.RESEND_API_KEY)

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''

// Bygg en <li>-liste av flaggede saker.
function listeHtml(poster) {
  return poster.map(p => {
    const kurs = p.kurs?.navn || 'kurs'
    const dato = p.kurs?.dato ? ` (${formaterDato(p.kurs.dato)})` : ''
    const ekstra = p.ekstra ? ` — «${escapeHtml(p.ekstra)}»` : ''
    return `<li style="margin:0 0 6px;">${escapeHtml(p.skole)} · ${escapeHtml(kurs)}${escapeHtml(dato)}${ekstra}</li>`
  }).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')

  // ---- Innstillinger ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger').select('nokkel, verdi')
    .in('nokkel', ['avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv'])
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))
  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const svarTilEpost = innst.svar_til_epost
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()

  if (!avsenderEpost || !avsenderNavn) return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger.' })
  if (!nettstedUrl) return res.status(500).json({ error: 'Mangler nettsted_url i innstillinger.' })

  const ekteSending = !torrkjoring && motorAktiv !== 'nei'
  const from = `${avsenderNavn} <${avsenderEpost}>`

  // ---- Flaggede, ikke-varslede saker ----
  // svart=true + ra_varslet_at is null + (nei&åpen ELLER vertskap-nei).
  const { data: rader, error: raderFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id, kommer, apen_for_annet_kurs, er_vertskap, vertskap_bekreftet,
      arsak_ikke_komme, arsak_ikke_vertskap, onske_tekst,
      skoler(navn),
      kurs!kurs_skole_kurs_id_fkey(navn, dato, nettverk)
    `)
    .is('ra_varslet_at', null)
    .eq('svart', true)
    .or('and(kommer.eq.false,apen_for_annet_kurs.eq.true),and(er_vertskap.eq.true,vertskap_bekreftet.eq.false)')
    .range(0, 9999)
  if (raderFeil) return res.status(500).json({ error: 'Kunne ikke hente saker: ' + raderFeil.message })

  if (!rader || rader.length === 0) {
    return res.status(200).json({ torrkjoring: !ekteSending, motor_aktiv: motorAktiv || null, saker: 0, ra_varslet: 0 })
  }

  // ---- Nettverk → RA (bruker_id + epost + navn) ----
  const { data: ansvar, error: ansvarFeil } = await supabase
    .from('nettverk_ansvarlig').select('nettverk, bruker_id, profiles(navn, epost)').range(0, 9999)
  if (ansvarFeil) return res.status(500).json({ error: 'Kunne ikke hente nettverksansvar: ' + ansvarFeil.message })
  const raForNettverk = Object.fromEntries((ansvar || []).map(a => [a.nettverk, {
    bruker_id: a.bruker_id, navn: a.profiles?.navn || '', epost: a.profiles?.epost || '',
  }]))

  // ---- Grupper saker per RA ----
  const perRa = {}         // bruker_id → { ra, neiApen:[], vertskapNei:[], radIder:[] }
  const utenRa = []        // nettverk uten RA (varsles ikke; stemples ikke)
  for (const row of rader) {
    const nettverk = row.kurs?.nettverk || null
    const ra = nettverk ? raForNettverk[nettverk] : null
    if (!ra || !ra.bruker_id) { utenRa.push({ kurs_skole_id: row.id, nettverk }); continue }

    const bucket = (perRa[ra.bruker_id] ||= { ra, neiApen: [], vertskapNei: [], radIder: [] })
    const skole = row.skoler?.navn || '(ukjent skole)'
    let truffet = false
    if (row.kommer === false && row.apen_for_annet_kurs === true) {
      bucket.neiApen.push({ skole, kurs: row.kurs, ekstra: row.onske_tekst || row.arsak_ikke_komme || '' })
      truffet = true
    }
    if (row.er_vertskap === true && row.vertskap_bekreftet === false) {
      bucket.vertskapNei.push({ skole, kurs: row.kurs, ekstra: row.arsak_ikke_vertskap || '' })
      truffet = true
    }
    if (truffet) bucket.radIder.push(row.id)
  }

  const forhandsvisning = []
  const varslet = []
  const feilet = []

  for (const brukerId of Object.keys(perRa)) {
    const { ra, neiApen, vertskapNei, radIder } = perRa[brukerId]
    const antall = neiApen.length + vertskapNei.length
    if (antall === 0) continue

    if (!gyldigEpost(ra.epost)) {
      feilet.push({ ra: ra.navn || brukerId, grunn: 'RA mangler e-postadresse (profiles.epost)' })
      continue
    }

    // ---- Bygg oppsummeringen ----
    const seksjoner = []
    if (neiApen.length > 0) {
      seksjoner.push(
        `<p style="font-size:15px;color:#111;font-weight:600;margin:18px 0 6px;">Sier nei, men åpen for et annet kurs (${neiApen.length})</p>` +
        `<ul style="font-size:15px;color:#444;line-height:1.6;margin:0 0 8px;padding-left:20px;">${listeHtml(neiApen)}</ul>`
      )
    }
    if (vertskapNei.length > 0) {
      seksjoner.push(
        `<p style="font-size:15px;color:#111;font-weight:600;margin:18px 0 6px;">Vertskap har sagt nei — pek ut nytt vertskap (${vertskapNei.length})</p>` +
        `<ul style="font-size:15px;color:#444;line-height:1.6;margin:0 0 8px;padding-left:20px;">${listeHtml(vertskapNei)}</ul>`
      )
    }
    const brødtekst =
      `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 8px;">Hei${ra.navn ? ' ' + escapeHtml(ra.navn.split(' ')[0]) : ''},</p>` +
      `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 8px;">Nye saker i dine nettverk trenger en hånd:</p>` +
      seksjoner.join('\n')
    const emne = `Oppfølging trengs: ${antall} ${antall === 1 ? 'sak' : 'saker'} i dine nettverk`
    const html = epostMal({
      overskrift: 'Skoler som trenger oppfølging',
      brødtekst,
      knapptekst: 'Åpne kursplanleggeren',
      knapplenke: `${nettstedUrl}/admin`,
      fottekst: 'Automatisk varsel fra kursplanleggeren. Hver sak varsles bare én gang.',
      nettstedUrl,
    })

    if (!ekteSending) {
      forhandsvisning.push({ ra: ra.navn || brukerId, epost: ra.epost, antall, nei_apen: neiApen.length, vertskap_nei: vertskapNei.length })
      continue
    }

    let sendFeil = null, resendId = null
    try {
      const { data: sendData, error: rFeil } = await resend.emails.send({
        from, to: ra.epost, subject: emne, html,
        ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
      })
      if (rFeil) sendFeil = rFeil.message || String(rFeil)
      else resendId = sendData?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }

    await supabase.from('epost_logg').insert({
      type: 'ra-varsel',
      mottaker_epost: ra.epost,
      mottaker_navn: ra.navn || null,
      status: sendFeil ? 'feil' : 'sendt',
      resend_id: resendId,
      feilmelding: sendFeil,
    })

    if (sendFeil) {
      feilet.push({ ra: ra.navn || brukerId, epost: ra.epost, grunn: sendFeil })
      continue
    }

    // Stemple KUN etter vellykket send, så en feilet sending forsøkes igjen i morgen.
    const naa = new Date().toISOString()
    await supabase.from('kurs_skole').update({ ra_varslet_at: naa }).in('id', radIder).is('ra_varslet_at', null)
    varslet.push({ ra: ra.navn || brukerId, epost: ra.epost, antall })
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring: !ekteSending,
    motor_aktiv: motorAktiv || null,
    saker: rader.length,
    uten_ra: utenRa.length,
    ...(ekteSending ? { ra_varslet: varslet.length, varslet } : { ville_varslet: forhandsvisning.length, forhandsvisning }),
    feilet,
  })
}
