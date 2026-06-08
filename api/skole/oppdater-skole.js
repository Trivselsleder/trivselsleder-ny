import { createClient } from '@supabase/supabase-js'
import {
  finnSelskapIdPaaNavn,
  oppdaterSelskapFelter,
  oppdaterEllerOpprettKontakt,
  knyttKontaktTilSelskap,
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
    skoleId, navn, gateadresse, postnummer, poststed,
    antall_elever, rektor_navn, rektor_epost, htla_navn, htla_epost,
  } = req.body

  if (!skoleId) return res.status(400).json({ error: 'Mangler skoleId.' })

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

  // Hent nåværende navn (trengs for HubSpot-søk, siden navn kan endres)
  const { data: gammel } = await supabase
    .from('skoler')
    .select('navn')
    .eq('id', skoleId)
    .single()

  // Oppdater Supabase (master)
  const oppdatering = {
    ...(navn          != null ? { navn }          : {}),
    ...(gateadresse   != null ? { gateadresse }   : {}),
    ...(postnummer    != null ? { postnummer }     : {}),
    ...(poststed      != null ? { poststed }       : {}),
    ...(antall_elever != null ? { antall_elever }  : {}),
    ...(rektor_navn   != null ? { rektor_navn }    : {}),
    ...(rektor_epost  != null ? { rektor_epost }   : {}),
    ...(htla_navn     != null ? { htla_navn }      : {}),
    ...(htla_epost    != null ? { htla_epost }     : {}),
  }

  const { error: dbFeil } = await supabase
    .from('skoler')
    .update(oppdatering)
    .eq('id', skoleId)

  if (dbFeil) return res.status(500).json({ error: dbFeil.message })

  // HubSpot (ikke-kritisk)
  if (process.env.HUBSPOT_API_KEY) {
    try {
      const selskapId = await finnSelskapIdPaaNavn(gammel.navn)
      if (selskapId) {
        // Oppdater Company-felter
        const selskapFelter = {
          ...(navn        ? { name:    navn }        : {}),
          ...(gateadresse ? { address: gateadresse } : {}),
          ...(postnummer  ? { zip:     postnummer }  : {}),
          ...(poststed    ? { city:    poststed }    : {}),
          ...(rektor_navn ? { rektor_navn }          : {}),
          ...(rektor_epost? { rektor_epost }         : {}),
          ...(htla_navn   ? { htla_navn }            : {}),
          ...(htla_epost  ? { htla_epost }           : {}),
        }
        await oppdaterSelskapFelter(selskapId, selskapFelter)

        // Rektor som tilknyttet Contact
        if (rektor_epost && rektor_navn) {
          const kontaktId = await oppdaterEllerOpprettKontakt({
            navn:   rektor_navn,
            epost:  rektor_epost,
            tittel: 'Rektor',
          })
          await knyttKontaktTilSelskap(selskapId, kontaktId)
        }

        // HTLA som tilknyttet Contact
        if (htla_epost && htla_navn) {
          const kontaktId = await oppdaterEllerOpprettKontakt({
            navn:   htla_navn,
            epost:  htla_epost,
            tittel: 'Hoved-TL-ansvarlig (HTLA)',
          })
          await knyttKontaktTilSelskap(selskapId, kontaktId)
        }
      }
    } catch (e) {
      console.error('HubSpot-feil ved skole-oppdatering:', e.message)
    }
  }

  return res.status(200).json({ ok: true })
}
