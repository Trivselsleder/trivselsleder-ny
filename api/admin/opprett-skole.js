import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostMal } from '../_epost-mal.js'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLLE_LABEL = {
  skoleadmin:  'Skoleadmin (HTLA)',
  skoleansatt: 'TL-ansvarlig (TLA)',
}

function epostHtml(navn, rolle, skolenavn, inviteLenke) {
  const fornavn = navn.split(' ')[0]
  const rolletekst = ROLLE_LABEL[rolle] ?? rolle
  return epostMal({
    overskrift: 'Velkommen til Trivselsleder!',
    brødtekst: `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">Hei ${fornavn},</p>
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Skolen din er registrert som Trivselsleder-skole.</p>
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Skole: <strong>${skolenavn}</strong></p>
      <p style="font-size:14px;color:#444;margin:0 0 24px;">Din rolle: <strong>${rolletekst}</strong></p>
      <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">
        Klikk på knappen nedenfor for å sette passord og aktivere kontoen din.
      </p>`,
    knapptekst: 'Aktiver konto',
    knapplenke: inviteLenke,
    fottekst: 'Lenken er gyldig i 24 timer.',
  })
}

async function inviterEllerKnytt(supabase, { epost, navn, rolle, skoleId, skolenavn, origin }) {
  const { data: eksisterende } = await supabase
    .from('profiles')
    .select('id')
    .eq('epost', epost)
    .maybeSingle()

  if (eksisterende) {
    await supabase
      .from('bruker_skole')
      .upsert({ bruker_id: eksisterende.id, skole_id: skoleId, rolle }, { onConflict: 'bruker_id,skole_id' })
    return { status: 'eksisterer' }
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: epost,
    options: { redirectTo: `${origin}/sett-passord` },
  })
  if (error) return { status: 'feil', melding: error.message }

  const userId = data.user.id
  const inviteLenke = data.properties.action_link

  await supabase
    .from('profiles')
    .upsert({ id: userId, navn, rolle, epost, aktiv: true }, { onConflict: 'id' })

  await supabase
    .from('bruker_skole')
    .upsert({ bruker_id: userId, skole_id: skoleId, rolle }, { onConflict: 'bruker_id,skole_id' })

  const { error: epostFeil } = await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: epost,
    subject: 'Velkommen til Trivselsleder – aktiver kontoen din',
    html: epostHtml(navn, rolle, skolenavn, inviteLenke),
  })
  if (epostFeil) console.error('Resend feil:', epostFeil)

  return { status: 'invitert' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    navn, orgNr, kommunenavn, fylke, type, status, ansvarlig,
    htlaNavn, htlaEpost,
    tlaNavn, tlaEpost,
  } = req.body

  if (!navn) return res.status(400).json({ error: 'Skolenavn er påkrevd.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? ----
  // Dette endepunktet bruker service-nøkkelen og går utenom alle sperrer. Da
  // MÅ det selv sjekke hvem som kaller — ellers står det åpent for hele
  // internett. Manglet fram til 4. aug (funnet av agenttest 3).
  // Samme mønster som api/auth/inviter-bruker.js.
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ikke autentisert.' })
  }
  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon — last inn siden på nytt.' })
  const { data: callerProfil } = await supabase
    .from('profiles').select('rolle').eq('id', caller.id).single()
  if (!['superadmin', 'ansatt'].includes(callerProfil?.rolle)) {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }

  // Bygg skole-objektet – upsert på org_nr hvis oppgitt, ellers vanlig insert
  const skoleData = {
    navn,
    ...(orgNr   ? { org_nr: orgNr }         : {}),
    ...(kommunenavn ? { kommunenavn }        : {}),
    ...(fylke   ? { fylke }                  : {}),
    ...(type    ? { type }                   : {}),
    ...(status  ? { status }                 : {}),
    ...(ansvarlig ? { ansvarlig }            : {}),
  }

  let skole
  if (orgNr) {
    const { data, error } = await supabase
      .from('skoler')
      .upsert(skoleData, { onConflict: 'org_nr' })
      .select('id, navn')
      .single()
    if (error) return res.status(500).json({ error: 'Kunne ikke opprette skole: ' + error.message })
    skole = data
  } else {
    const { data, error } = await supabase
      .from('skoler')
      .insert(skoleData)
      .select('id, navn')
      .single()
    if (error) return res.status(500).json({ error: 'Kunne ikke opprette skole: ' + error.message })
    skole = data
  }

  const origin = req.headers.origin || 'https://trivselsleder.no'
  const resultater = {}

  if (htlaEpost && htlaNavn) {
    resultater.htla = await inviterEllerKnytt(supabase, {
      epost:     htlaEpost,
      navn:      htlaNavn,
      rolle:     'skoleadmin',
      skoleId:   skole.id,
      skolenavn: skole.navn,
      origin,
    })
  }

  if (tlaEpost && tlaNavn) {
    resultater.tla = await inviterEllerKnytt(supabase, {
      epost:     tlaEpost,
      navn:      tlaNavn,
      rolle:     'skoleansatt',
      skoleId:   skole.id,
      skolenavn: skole.navn,
      origin,
    })
  }

  return res.status(200).json({ ok: true, skole, resultater })
}
