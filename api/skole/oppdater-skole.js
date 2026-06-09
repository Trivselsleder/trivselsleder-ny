import { createClient } from '@supabase/supabase-js'
import {
  finnSelskapIdPaaNavn,
  oppdaterSelskapFelter,
  oppdaterEllerOpprettKontakt,
  knyttKontaktTilSelskap,
  fjernGamleKoblinger,
} from '../_hubspot.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Ikke autentisert.' })
  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user: caller } } = await supabase.auth.getUser(token)
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon.' })

  const { data: profil } = await supabase
    .from('profiles')
    .select('rolle')
    .eq('id', caller.id)
    .single()

  if (!['skoleadmin', 'superadmin', 'ansatt'].includes(profil?.rolle)) {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }

  const {
    skoleId,
    navn, gateadresse, postnummer, poststed,
    telefon, antall_elever, type, nettverk,
    rektor_navn, rektor_epost, rektor_telefon,
    hktl_navn, hktl_epost, hktl_telefon,
    tla_kontakter,
  } = req.body

  if (!skoleId) return res.status(400).json({ error: 'Mangler skoleId.' })
  console.log('[oppdater-skole] Request body:', JSON.stringify(req.body))

  // Skoleadmin kan kun redigere sin egen skole
  if (profil.rolle === 'skoleadmin') {
    const { data: tilgang } = await supabase
      .from('bruker_skole')
      .select('skole_id')
      .eq('bruker_id', caller.id)
      .eq('skole_id', skoleId)
      .maybeSingle()
    if (!tilgang) return res.status(403).json({ error: 'Du har ikke tilgang til denne skolen.' })
  }

  // Hent nåværende navn og hubspot_company_id
  const { data: gammel } = await supabase
    .from('skoler')
    .select('navn, hubspot_company_id')
    .eq('id', skoleId)
    .single()

  // Oppdater Supabase (master)
  const oppdatering = {
    ...(navn           != null ? { navn }           : {}),
    ...(gateadresse    != null ? { gateadresse }    : {}),
    ...(postnummer     != null ? { postnummer }      : {}),
    ...(poststed       != null ? { poststed }        : {}),
    ...(telefon        != null ? { telefon }         : {}),
    ...(antall_elever  != null ? { antall_elever }   : {}),
    ...(type           != null ? { type }            : {}),
    ...(nettverk       != null ? { nettverk }        : {}),
    ...(rektor_navn    != null ? { rektor_navn }     : {}),
    ...(rektor_epost   != null ? { rektor_epost }    : {}),
    ...(rektor_telefon != null ? { rektor_telefon }  : {}),
    ...(hktl_navn      != null ? { hktl_navn }       : {}),
    ...(hktl_epost     != null ? { hktl_epost }      : {}),
    ...(hktl_telefon   != null ? { hktl_telefon }    : {}),
    ...(tla_kontakter  != null ? { tla_kontakter }   : {}),
  }

  const { error: dbFeil } = await supabase
    .from('skoler')
    .update(oppdatering)
    .eq('id', skoleId)

  if (dbFeil) return res.status(500).json({ error: dbFeil.message })

  // HubSpot (ikke-kritisk)
  if (process.env.HUBSPOT_API_KEY) {
    try {
      console.log('[HubSpot] HUBSPOT_API_KEY er satt ✓')
      console.log('[HubSpot] gammel:', JSON.stringify(gammel))

      let selskapId = gammel?.hubspot_company_id ?? null

      if (selskapId) {
        console.log('[HubSpot] Bruker lagret hubspot_company_id:', selskapId)
      } else {
        if (!gammel?.navn) {
          console.error('[HubSpot] AVBRYTER: gammel.navn er tom/null — kan ikke søke i HubSpot')
          return res.status(200).json({ ok: true })
        }
        console.log('[HubSpot] Ingen lagret ID — søker på navn:', gammel.navn)
        selskapId = await finnSelskapIdPaaNavn(gammel.navn)
        console.log('[HubSpot] selskapId fra navnesøk:', selskapId ?? 'IKKE FUNNET — hopper over')

        if (selskapId) {
          // Lagre ID for fremtidige kall
          const { error: idFeil } = await supabase
            .from('skoler')
            .update({ hubspot_company_id: selskapId })
            .eq('id', skoleId)
          if (idFeil) {
            console.error('[HubSpot] Klarte ikke lagre hubspot_company_id:', idFeil.message)
          } else {
            console.log('[HubSpot] hubspot_company_id lagret i Supabase:', selskapId)
          }
        }
      }

      if (selskapId) {
        // Oppdater Company-felter med riktige interne HubSpot-navn
        const selskapFelter = {
          ...(navn          ? { name:            navn }                       : {}),
          ...(gateadresse   ? { address:          gateadresse }               : {}),
          ...(postnummer    ? { zip:              postnummer }                 : {}),
          ...(poststed      ? { city:             poststed }                  : {}),
          ...(telefon       ? { phone:            telefon }                   : {}),
          ...(antall_elever != null ? { number_of_pupils: String(antall_elever) } : {}),
          ...(type          ? { school_type:      type }                      : {}),
          ...(nettverk      ? { nettverk:         nettverk }                  : {}),
        }
        console.log('[HubSpot] Oppdaterer selskap med felter:', JSON.stringify(selskapFelter))
        await oppdaterSelskapFelter(selskapId, selskapFelter)

        // Rektor
        console.log('[HubSpot] rektor_navn:', rektor_navn, '| rektor_epost:', rektor_epost)
        if (rektor_epost && rektor_navn) {
          const id = await oppdaterEllerOpprettKontakt({
            navn: rektor_navn, epost: rektor_epost,
            tittel: 'Rektor', telefon: rektor_telefon,
          })
          await fjernGamleKoblinger(selskapId, 'Rektor', id)
          console.log('[HubSpot] Rektor kontakt-ID:', id)
          await knyttKontaktTilSelskap(selskapId, id)
        } else {
          console.log('[HubSpot] Rektor hoppes over (mangler navn eller e-post)')
        }

        // htla_ (Hoved-TL-ansvarlig) er påmeldingskontakten fra Paamelding.jsx — inviteres som
        // skoleadmin ved godkjenning og oppdateres ikke herfra. hktl_ (Hovedkontakt TL) er den
        // løpende kontaktrollen som skoleadmin vedlikeholder på Min side.
        // Hovedkontakt TL
        console.log('[HubSpot] hktl_navn:', hktl_navn, '| hktl_epost:', hktl_epost)
        if (hktl_epost && hktl_navn) {
          const id = await oppdaterEllerOpprettKontakt({
            navn: hktl_navn, epost: hktl_epost,
            tittel: 'Hovedkontakt TL', telefon: hktl_telefon,
          })
          await fjernGamleKoblinger(selskapId, 'Hovedkontakt TL', id)
          console.log('[HubSpot] Hovedkontakt TL kontakt-ID:', id)
          await knyttKontaktTilSelskap(selskapId, id)
        } else {
          console.log('[HubSpot] Hovedkontakt TL hoppes over (mangler navn eller e-post)')
        }

        // TL-ansvarlige (liste)
        const tlaListe = Array.isArray(tla_kontakter) ? tla_kontakter : []
        const nyeTlaIder = []
        for (const tla of tlaListe) {
          if (tla.epost && tla.navn) {
            const id = await oppdaterEllerOpprettKontakt({
              navn: tla.navn, epost: tla.epost,
              tittel: 'TL-ansvarlig', telefon: tla.telefon,
            })
            nyeTlaIder.push(id)
            console.log('[HubSpot] TL-ansvarlig kontakt-ID:', id)
            await knyttKontaktTilSelskap(selskapId, id)
          } else {
            console.log('[HubSpot] TL-ansvarlig hoppes over (mangler navn eller e-post)')
          }
        }
        await fjernGamleKoblinger(selskapId, 'TL-ansvarlig', nyeTlaIder)
      }
    } catch (e) {
      console.error('[HubSpot] Feil ved skole-oppdatering:', e.message, e.stack)
    }
  } else {
    console.log('[HubSpot] HUBSPOT_API_KEY ikke satt — synk deaktivert')
  }

  return res.status(200).json({ ok: true })
}
