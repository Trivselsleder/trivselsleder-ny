import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { trygFallbackOrigin, krevAnsatt } from '../_vakt.js'
import { oppdaterStatus } from '../_hubspot.js'
import { epostMal } from '../_epost-mal.js'
import { krevMotorAktiv, loggEpost } from '../_epost.js'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLLE_LABEL = {
  skoleadmin:  'Skoleadmin (HTLA)',
  skoleansatt: 'TL-ansvarlig (TLA)',
}

function epostHtml(navn, rolle, skolenavn, inviteLenke, nettstedUrl) {
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
    nettstedUrl,
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

  // ATOMISK reservasjon (dobbeltsending): kun den kjøringen som FAKTISK oppretter profilraden får
  // sende aktiveringsmail. ignoreDuplicates (on conflict do nothing) → et samtidig/gjentatt kall
  // får 0 rader tilbake og hopper over e-posten, så aktiveringsmailen aldri går ut to ganger.
  const { data: nyProfil } = await supabase
    .from('profiles')
    .upsert({ id: userId, navn, rolle, epost, aktiv: true }, { onConflict: 'id', ignoreDuplicates: true })
    .select('id')

  await supabase
    .from('bruker_skole')
    .upsert({ bruker_id: userId, skole_id: skoleId, rolle }, { onConflict: 'bruker_id,skole_id' })

  if (!nyProfil || nyProfil.length === 0) {
    // En parallell/gjentatt kjøring vant profil-innsettingen → den sender e-posten. Vi hopper over.
    return { status: 'eksisterer' }
  }

  let resendId = null, sendFeil = null
  try {
    const { data: sendData, error: epostFeil } = await resend.emails.send({
      from: 'noreply@trivselsleder.no',
      to: epost,
      subject: `Velkommen til Trivselsleder – aktiver kontoen din`,
      html: epostHtml(navn, rolle, skolenavn, inviteLenke, origin),
    })
    if (epostFeil) sendFeil = epostFeil.message || String(epostFeil)
    else resendId = sendData?.id || null
  } catch (e) { sendFeil = e?.message || String(e) }
  if (sendFeil) console.error('Resend feil:', sendFeil)

  await loggEpost(supabase, {
    type: 'konto_aktivering',
    mottaker_epost: epost,
    mottaker_navn: navn,
    status: sendFeil ? 'feil' : 'sendt',
    resend_id: resendId,
    feilmelding: sendFeil,
  })

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

  // Nødbrems (fail-closed): en godkjenning oppretter konto(er) OG sender aktiveringsmail — begge
  // skal stanses når bremsen er på. Stopp FØR noe opprettes.
  const brems = await krevMotorAktiv(supabase)
  if (brems) return res.status(brems.status).json({ error: brems.error })

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

  // ATOMISK CLAIM (dobbeltsending): vinn påmeldingen FØR skole/kontoer opprettes. To samtidige
  // «Godkjenn»-klikk (eller to admin-faner) → bare den FØRSTE flipper status til 'godkjent'; den
  // andre får 0 rader tilbake og stoppes her, så vi aldri oppretter to skoler eller sender to sett
  // aktiveringsmailer. (Erstatter den tidligere status-oppdateringen som skjedde ETTER utsending.)
  const { data: claim } = await supabase
    .from('paameldinger')
    .update({ status: 'godkjent' })
    .eq('id', paameldinId)
    .neq('status', 'godkjent')
    .select('id')
  if (!claim || claim.length === 0) {
    return res.status(409).json({ error: 'Denne påmeldingen er allerede godkjent (eller godkjennes akkurat nå).' })
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
    // F10 (17. sep) — HTLA→«Hovedkontakt TL»: personen som på påmeldingsskjemaet fylles
    // inn under «Hovedkontakt TL» (htla_*) blir skolens løpende hovedkontakt (hktl_*, vist
    // som «Hovedkontakt TL» og synket med tilknytningsmerket «Hovedkontakt TL» i HubSpot).
    // Tidligere ble TLA-kontakten (tla_*) lagret som hktl_* — da så skolen ett navn på
    // skjemaet og et annet i CRM. Nå er de samme personen. htla_* inviteres FORTSATT som
    // skoleadmin (under), og tla_* inviteres fortsatt som skoleansatt; tla_* lagres ikke
    // lenger på skolekortet. Kolonnenavnene (htla_*/hktl_*) i basen er uendret.
    hktl_navn:     p.htla_navn,
    hktl_epost:    p.htla_epost,
    hktl_telefon:  p.htla_telefon,
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
  if (skoleFeil) {
    // Frigi claimen så påmeldingen kan godkjennes på nytt når feilen er løst.
    await supabase.from('paameldinger').update({ status: 'påmeldt' }).eq('id', paameldinId)
    return res.status(500).json({ error: 'Kunne ikke opprette/oppdatere skole: ' + skoleFeil.message })
  }

  // (Status ble allerede satt til 'godkjent' av den atomiske claimen over — ingen ny oppdatering her.)

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
  const origin = await trygFallbackOrigin(req, supabase)
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
