import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt } from '../_vakt.js'
import { paaminnelseEpost } from '../_webinar-epost.js'

// WEBINAR-PÅMINNELSER (Vercel-cron, hver time — koden avgjør norsk tid selv).
// 24 t før: påminnelse m/ møtelenke. ~1 t før: kort «starter snart».
// Samme vern som e-postmotoren ellers: tørrkjøring er standard, motor_aktiv er
// nødbrems, og hvert stempel reserveres atomisk (kan ikke dobbeltsende).
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')

  const { data: innst } = await supabase.from('innstillinger').select('nokkel, verdi').in('nokkel', ['motor_aktiv'])
  const motorAktiv = (innst?.find((r) => r.nokkel === 'motor_aktiv')?.verdi || '').trim().toLowerCase()
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(200).json({ error: 'Nødbremsen er på (motor_aktiv = «nei»). Ekte utsending stanset.', motor_aktiv: motorAktiv })
  }

  const naa = Date.now()
  const om24t = new Date(naa + 24 * 3600000).toISOString()
  const naaIso = new Date(naa).toISOString()

  // Webinarer som starter innen 24 t (publiserte, ikke passert).
  const { data: webinarer, error: wFeil } = await supabase
    .from('webinarer')
    .select('id, tittel, beskrivelse, starter_at, varighet_min, mote_lenke, status')
    .eq('status', 'publisert')
    .gt('starter_at', naaIso)
    .lte('starter_at', om24t)
  if (wFeil) return res.status(500).json({ error: 'Kunne ikke hente webinarer: ' + wFeil.message })
  if (!webinarer?.length) return res.status(200).json({ torrkjoring, aktuelle_webinarer: 0, sendt: 0 })

  const wMap = new Map(webinarer.map((w) => [w.id, w]))
  const { data: pameldinger, error: pFeil } = await supabase
    .from('webinar_pameldinger')
    .select('id, webinar_id, navn, epost, paminnelse_24t_sendt_at, paminnelse_1t_sendt_at, avmeldt_at')
    .in('webinar_id', webinarer.map((w) => w.id))
    .is('avmeldt_at', null)
  if (pFeil) return res.status(500).json({ error: 'Kunne ikke hente påmeldinger: ' + pFeil.message })

  // Bestem hvilken påminnelse hver påmelding trenger.
  const jobber = []
  for (const pm of pameldinger || []) {
    const w = wMap.get(pm.webinar_id)
    if (!w) continue
    const timerTil = (new Date(w.starter_at).getTime() - naa) / 3600000
    if (timerTil <= 1 && !pm.paminnelse_1t_sendt_at) jobber.push({ pm, w, variant: '1t', stempel: 'paminnelse_1t_sendt_at' })
    // 24t-varianten skal ALDRI gå ut i siste time (ellers «I morgen …» rett før start)
    else if (timerTil > 1 && timerTil <= 24 && !pm.paminnelse_24t_sendt_at) jobber.push({ pm, w, variant: '24t', stempel: 'paminnelse_24t_sendt_at' })
  }

  if (torrkjoring) {
    return res.status(200).json({
      torrkjoring: true,
      aktuelle_webinarer: webinarer.length,
      ville_sendt: jobber.length,
      forhandsvisning: jobber.slice(0, 50).map((j) => ({ epost: j.pm.epost, webinar: j.w.tittel, variant: j.variant })),
    })
  }

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY mangler.' })
  const resend = new Resend(process.env.RESEND_API_KEY)

  let sendt = 0
  const feilet = []
  for (const j of jobber) {
    const tid = new Date().toISOString()
    // Atomisk reservasjon av stempelet
    const { data: reservert, error: rF } = await supabase
      .from('webinar_pameldinger')
      .update({ [j.stempel]: tid })
      .eq('id', j.pm.id)
      .is(j.stempel, null)
      .select('id')
    if (rF) { feilet.push({ epost: j.pm.epost, grunn: 'reservasjon: ' + rF.message }); continue }
    if (!reservert?.length) continue // en annen kjøring tok den

    const { subject, html } = paaminnelseEpost(j.w, { navn: j.pm.navn, variant: j.variant })
    let resendId = null, sendFeil = null
    try {
      const { data: sd, error: sF } = await resend.emails.send({ from: 'noreply@trivselsleder.no', to: j.pm.epost, subject, html })
      if (sF) sendFeil = sF.message || String(sF); else resendId = sd?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }

    try {
      await supabase.from('epost_logg').insert({
        type: `webinar_paaminnelse_${j.variant}`, mottaker_epost: j.pm.epost, mottaker_navn: j.pm.navn || null,
        status: sendFeil ? 'feil' : 'sendt', resend_id: resendId, feilmelding: sendFeil,
      })
    } catch (e) { console.error('Påminnelse: epost_logg feilet (ikke-kritisk):', e?.message) }

    if (sendFeil) {
      await supabase.from('webinar_pameldinger').update({ [j.stempel]: null }).eq('id', j.pm.id) // frigi
      feilet.push({ epost: j.pm.epost, variant: j.variant, grunn: sendFeil })
      continue
    }
    sendt++
  }

  return res.status(200).json({ torrkjoring: false, aktuelle_webinarer: webinarer.length, sendt, ...(feilet.length ? { feilet } : {}) })
}
