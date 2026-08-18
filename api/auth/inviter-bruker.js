import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { trygFallbackOrigin } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLLE_LABEL = {
  superadmin:  'Superadmin (Trivselsleder AS)',
  ansatt:      'Ansatt (Trivselsleder AS)',
  skoleadmin:  'Skoleadmin',
  skoleansatt: 'Skoleansatt',
}

function epostHtml(navn, rolle, skolenavn, inviteLenke, nettstedUrl) {
  const fornavn = navn.split(' ')[0]
  const rolletekst = ROLLE_LABEL[rolle] ?? rolle
  const skoletekst = skolenavn ? `<p style="font-size:14px;color:#444;margin:0 0 8px;">Skole: <strong>${skolenavn}</strong></p>` : ''
  return epostMal({
    overskrift: 'Du er invitert til Trivselsleder',
    brødtekst: `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">
        Hei ${fornavn},
      </p>
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Rolle: <strong>${rolletekst}</strong></p>
      ${skoletekst}
      <p style="font-size:14px;color:#444;line-height:1.6;margin:16px 0 24px;">
        Klikk på knappen nedenfor for å sette passord og aktivere kontoen din.
      </p>`,
    knapptekst: 'Aktiver konto',
    knapplenke: inviteLenke,
    fottekst: 'Lenken er gyldig i 24 timer.',
    nettstedUrl,
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifiser innlogging FØR kroppen valideres, så en uinnlogget ikke får vite
  // om skjemaet var gyldig. (Selve tilgangen for skoleadmin sjekkes lenger nede,
  // siden den avhenger av hvilken skole og rolle invitasjonen gjelder.)
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Ikke autentisert.' })
  const token = authHeader.slice(7)

  const { data: { user: caller } } = await supabase.auth.getUser(token)
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon.' })

  const { data: callerProfil } = await supabase
    .from('profiles')
    .select('rolle, aktiv')
    .eq('id', caller.id)
    .single()

  const callerRolle = callerProfil?.rolle

  if (!['superadmin', 'ansatt', 'skoleadmin'].includes(callerRolle)) {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }
  if (callerProfil?.aktiv === false) {
    return res.status(403).json({ error: 'Kontoen er deaktivert.' })
  }

  const { epost, navn, rolle, skoleId, stilling, tl_rolle } = req.body
  if (!epost || !navn || !rolle) return res.status(400).json({ error: 'Mangler påkrevde felt.' })

  // Valgfrie beskrivende felt: stilling ved skolen + rolle i TL-programmet.
  // Ukjente/tomme verdier normaliseres til null (aldri stol på klienten).
  const STILLINGER = ['rektor', 'inspektor', 'styrer', 'ansatt']
  const TL_ROLLER = ['htla', 'tla']
  const stillingVerdi = STILLINGER.includes(stilling) ? stilling : null
  const tlRolleVerdi = TL_ROLLER.includes(tl_rolle) ? tl_rolle : null

  // Skoleadmin kan kun invitere til sin egen skole, og kun skolerolle
  if (callerRolle === 'skoleadmin') {
    if (!['skoleadmin', 'skoleansatt'].includes(rolle)) {
      return res.status(403).json({ error: 'Du kan bare invitere skoleadmin eller skoleansatt.' })
    }
    if (!skoleId) return res.status(400).json({ error: 'Skole er påkrevd.' })
    const { data: tilgang } = await supabase
      .from('bruker_skole')
      .select('skole_id')
      .eq('bruker_id', caller.id)
      .eq('skole_id', skoleId)
      .maybeSingle()
    if (!tilgang) return res.status(403).json({ error: 'Du har ikke tilgang til denne skolen.' })
  }

  // Én HTLA per skole: sjekk FØR vi oppretter konto, så vi ikke lager en halv bruker
  // hvis plassen er tatt. (Databasen håndhever det uansett via unik indeks — dette
  // gir bare en vennlig melding i stedet for en rå 500.)
  if (tlRolleVerdi === 'htla' && skoleId) {
    const { data: htlaFinnes } = await supabase
      .from('bruker_skole')
      .select('bruker_id')
      .eq('skole_id', skoleId)
      .eq('tl_rolle', 'htla')
      .maybeSingle()
    if (htlaFinnes) return res.status(409).json({ error: 'Skolen har allerede en HTLA. Endre den eksisterende først.' })
  }

  // Kun kjente adresser godtas — se trygtOrigin i api/_vakt.js.
  const origin = await trygFallbackOrigin(req, supabase)

  // Generer invitasjonslenke uten at Supabase sender e-post
  const { data, error: linkFeil } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: epost,
    options: { redirectTo: `${origin}/sett-passord` },
  })
  if (linkFeil) return res.status(500).json({ error: linkFeil.message })

  const userId = data.user.id
  const inviteLenke = data.properties.action_link

  // Opprett profil
  const { error: profilFeil } = await supabase
    .from('profiles')
    .upsert({ id: userId, navn, rolle, epost, aktiv: true }, { onConflict: 'id' })
  if (profilFeil) return res.status(500).json({ error: profilFeil.message })

  // Knytt til skole hvis oppgitt
  let skolenavn = null
  if (skoleId) {
    const skoleRolle = ['skoleadmin', 'skoleansatt'].includes(rolle) ? rolle : 'skoleansatt'
    const { error: bsFeil } = await supabase
      .from('bruker_skole')
      .upsert(
        { bruker_id: userId, skole_id: skoleId, rolle: skoleRolle, stilling: stillingVerdi, tl_rolle: tlRolleVerdi },
        { onConflict: 'bruker_id,skole_id' }
      )
    if (bsFeil) {
      // 23505 her = HTLA-unik-indeksen (dobbeltsjekk mot race). Konflikt på (bruker,skole)
      // fanges av upsert og gir ikke 23505.
      if (bsFeil.code === '23505') return res.status(409).json({ error: 'Skolen har allerede en HTLA. Endre den eksisterende først.' })
      return res.status(500).json({ error: bsFeil.message })
    }

    const { data: skole } = await supabase.from('skoler').select('navn').eq('id', skoleId).single()
    skolenavn = skole?.navn ?? null
  }

  // Send branded e-post via Resend
  const { error: epostFeil } = await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: epost,
    subject: 'Invitasjon til Trivselsleder',
    html: epostHtml(navn, rolle, skolenavn, inviteLenke, origin),
  })
  if (epostFeil) console.error('Resend feil:', epostFeil)

  return res.status(200).json({ ok: true })
}
