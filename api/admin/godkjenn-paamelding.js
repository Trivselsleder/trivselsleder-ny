import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { trygtOrigin, krevAnsatt } from '../_vakt.js'
import { oppdaterStatus } from '../_hubspot.js'
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
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Skolen din er nå aktivert som Trivselsleder-skole.</p>
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
    subject: `Velkommen til Trivselsleder – aktiver kontoen din`,
    html: epostHtml(navn, rolle, skolenavn, inviteLenke),
  })
  if (epostFeil) console.error('Resend feil:', epostFeil)

  return { status: 'invitert' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? (FØR vi rører kroppen) ----
  // Service-nøkkelen går utenom alle sperrer, så endepunktet må selv sjekke
  // hvem som kaller. Sjekken ligger nå FØR kropp-valideringen, så en uinnlogget
  // ikke får vite om skjemaet var gyldig. krevAnsatt fanger også deaktiverte
  // kontoer (aktiv = false).
  const vakt = await krevAnsatt(req, supabase)
  if (vakt) return res.status(vakt.status).json({ error: vakt.error })

  const { paameldinId } = req.body
  if (!paameldinId) return res.status(400).json({ error: 'Mangler paameldinId' })

  const { data: p, error: hentFeil } = await supabase
    .from('paameldinger')
    .select('*')
    .eq('id', paameldinId)
    .single()
  if (hentFeil) return res.status(404).json({ error: 'Påmelding ikke funnet' })

  // Sjekk om det finnes en skole med samme org.nr fra før.
  const { data: eksisterendeSkole } = await supabase
    .from('skoler')
    .select('id, navn, status')
    .eq('org_nr', p.organisasjonsnummer)
    .maybeSingle()

  // Ekte duplikat: en AKTIV skole finnes allerede → ikke godkjenn, vis rød feilboks.
  // (Påmeldingen er ikke rørt her, så ingen rollback trengs.)
  if (eksisterendeSkole && eksisterendeSkole.status === 'Aktiv') {
    return res.status(409).json({
      error: `En skole med org.nr ${p.organisasjonsnummer} finnes allerede i registeret: «${eksisterendeSkole.navn}». Påmeldingen er IKKE godkjent. Sjekk om dette er en duplikat-påmelding, eller rett org.nr før ny godkjenning.`,
    })
  }

  // Felles feltsett fra påmelding → skolekort (samme felter ved ny skole og re-godkjenning).
  const skoleFelter = {
    navn:          p.skolenavn,
    org_nr:        p.organisasjonsnummer,
    kommunenavn:   p.kommune,
    fylke:         p.fylke,
    type:          p.type,
    status:        'Aktiv',
    antall_elever: p.antall_elever,
    gateadresse:   p.gateadresse,
    postnummer:    p.postnummer,
    poststed:      p.poststed,
    telefon:       p.kontortelefon,
    rektor_navn:   p.rektor_navn,
    rektor_epost:  p.rektor_epost,
    rektor_telefon: p.rektor_telefon,
    htla_navn:     p.htla_navn,
    htla_epost:    p.htla_epost,
    hktl_navn:     p.tla_navn,
    hktl_epost:    p.tla_epost,
    hktl_telefon:  p.tla_telefon,
    hubspot_company_id: p.hubspot_company_id,
  }

  // Re-godkjenning: en INAKTIV skole med samme org.nr finnes (tidligere avvist) →
  // oppdater den eksisterende raden og reaktiver den, i stedet for å blokkere.
  let skole, skoleFeil
  if (eksisterendeSkole && eksisterendeSkole.status === 'Inaktiv') {
    ;({ data: skole, error: skoleFeil } = await supabase
      .from('skoler')
      .update(skoleFelter)
      .eq('id', eksisterendeSkole.id)
      .select('id, navn, kommunenavn, fylke')
      .single())
  } else {
    ;({ data: skole, error: skoleFeil } = await supabase
      .from('skoler')
      .insert(skoleFelter)
      .select('id, navn, kommunenavn, fylke')
      .single())
  }
  if (skoleFeil) return res.status(500).json({ error: 'Kunne ikke opprette/oppdatere skole: ' + skoleFeil.message })

  // Alt kritisk har lykkes → marker påmeldingen som godkjent.
  await supabase.from('paameldinger').update({ status: 'godkjent' }).eq('id', paameldinId)

  // FIKS 3: hent nettverksforslag (kommune → fylke → intet)
  let nettverksforslag = []
  try {
    const { data: forslag, error: forslagFeil } = await supabase
      .rpc('foresla_nettverk', {
        ny_kommunenavn: skole.kommunenavn,
        ny_fylke: skole.fylke,
      })
    if (forslagFeil) console.error('Nettverksforslag-feil:', forslagFeil.message)
    else nettverksforslag = forslag ?? []
  } catch (e) {
    console.error('Nettverksforslag-unntak:', e.message)
  }

  // Kun kjente adresser godtas — se trygtOrigin i api/_vakt.js.
  const origin = trygtOrigin(req)
  const resultater = {}

  if (p.htla_epost && p.htla_navn) {
    resultater.htla = await inviterEllerKnytt(supabase, {
      epost:     p.htla_epost,
      navn:      p.htla_navn,
      rolle:     'skoleadmin',
      skoleId:   skole.id,
      skolenavn: skole.navn,
      origin,
    })
  }

  if (p.tla_epost && p.tla_navn) {
    resultater.tla = await inviterEllerKnytt(supabase, {
      epost:     p.tla_epost,
      navn:      p.tla_navn,
      rolle:     'skoleansatt',
      skoleId:   skole.id,
      skolenavn: skole.navn,
      origin,
    })
  }

  if (process.env.HUBSPOT_API_KEY && p.hubspot_company_id) {
    try {
      await oppdaterStatus(p.hubspot_company_id, 'Aktiv')
    } catch (e) {
      console.error('HubSpot-feil ved godkjenning:', e.message)
    }
  }

  return res.status(200).json({ ok: true, skole, resultater, nettverksforslag })
}
