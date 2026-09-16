import { createClient } from '@supabase/supabase-js'

// ============================================================================
// api/admin/slett-skole.js
// SLETTERUTINE når en skole trer ut av Trivselsprogrammet (DBA 11.2 / 11.6).
// ----------------------------------------------------------------------------
// Kaller databasefunksjonen public.slett_skole (migr 129) med service-nøkkelen,
// og sletter deretter de FORELDRELØSE auth-brukerne via Supabase admin-API
// (rein GoTrue-opprydding — sesjoner, identiteter, refresh-tokens).
//
// TO MODUS (POST-body):
//   { skoleId, torrkjoring: true }  (STANDARD) → endrer INGENTING, returnerer
//       antall rader per tabell som VILLE blitt berørt + hvilke auth-brukere
//       som ville blitt slettet. auth.users røres ikke.
//   { skoleId, torrkjoring: false } → skarp: databasefunksjonen sletter alle
//       public-skjema-data i ÉN transaksjon, deretter slettes auth-brukerne.
//
// KUN SUPERADMIN. Endepunktet bruker service-nøkkelen og går utenom alle
// sperrer i basen — derfor sjekker det selv hvem som ringer på (mønster fra
// api/_vakt.js / api/admin/*), men strengere: kun 'superadmin', ikke 'ansatt'.
// HubSpot røres ALDRI (Databehandlers eget CRM, utenfor avtalen).
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? (FØR vi rører kroppen) — KUN SUPERADMIN ----
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ikke autentisert.' })
  }
  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon — last inn siden på nytt.' })
  const { data: callerProfil } = await supabase
    .from('profiles').select('rolle, aktiv').eq('id', caller.id).single()
  if (callerProfil?.rolle !== 'superadmin') {
    return res.status(403).json({ error: 'Kun superadmin kan slette en skole.' })
  }
  if (callerProfil?.aktiv === false) {
    return res.status(403).json({ error: 'Kontoen er deaktivert.' })
  }

  const { skoleId } = req.body || {}
  // Fail-safe: tørrkjøring er standard. Skarp kjøring krever eksplisitt false.
  const torrkjoring = req.body?.torrkjoring !== false
  if (!skoleId) return res.status(400).json({ error: 'Mangler skoleId.' })

  // ---- 1) Hvilke auth-brukere blir foreldreløse? MÅ leses FØR sletting. ----
  const { data: orphanRows, error: orphanFeil } = await supabase
    .rpc('slett_skole_foreldrelose_uid', { p_skole_id: skoleId })
  if (orphanFeil) {
    return res.status(500).json({ error: 'Kunne ikke lese foreldreløse brukere: ' + orphanFeil.message })
  }
  // rpc som returnerer setof uuid gir en liste av uuid-strenger (evt. objekter).
  const foreldreloseUid = (orphanRows || [])
    .map(r => (typeof r === 'string' ? r : r?.slett_skole_foreldrelose_uid))
    .filter(Boolean)

  // ---- 2) Slett public-skjema-data (tørrkjøring eller skarp) ----
  const { data: rapport, error: slettFeil } = await supabase
    .rpc('slett_skole', { p_skole_id: skoleId, p_torrkjoring: torrkjoring })
  if (slettFeil) {
    return res.status(500).json({ error: 'Sletting feilet: ' + slettFeil.message })
  }

  // ---- 3) Skarp: slett de foreldreløse auth-brukerne via admin-API ----
  const authResultat = []
  if (!torrkjoring) {
    for (const uid of foreldreloseUid) {
      const { error } = await supabase.auth.admin.deleteUser(uid)
      authResultat.push({ uid, slettet: !error, feil: error?.message ?? null })
      if (error) console.error('slett-skole: kunne ikke slette auth-bruker', uid, error.message)
    }
  }

  // ---- F4: databasedelen er ferdig og committet uansett; men hvis EN auth-sletting
  //      feilet, MÅ det være synlig. Databasen kan ikke gjenskape lista (skolen er
  //      merket 'Tidligere', bruker_skole er slettet), så vi returnerer uid-ene her
  //      OG i `rapport` (funksjonen legger dem inn som egne rader), med tydelig
  //      beskjed om manuell sletting i Supabase → Authentication → Users. ----
  const feilet = authResultat.filter(r => !r.slettet)
  const allSuksess = feilet.length === 0
  const status = torrkjoring ? 200 : (allSuksess ? 200 : 207)

  return res.status(status).json({
    ok: torrkjoring ? true : allSuksess,
    skoleId,
    torrkjoring,
    skole_status: torrkjoring ? null : 'Tidligere',   // skoler-raden beholdes, ikke slettet
    rapport,                                            // [{ tabell, rader }, ...] — inkl. foreldrelos_uid-rader
    foreldrelose_auth_brukere: foreldreloseUid,
    auth_sletting: torrkjoring ? null : authResultat,
    ...(allSuksess ? {} : {
      advarsel: `Databasen er ryddet, men ${feilet.length} innloggingskonto(er) ble IKKE slettet. ` +
        `Slett disse manuelt i Supabase → Authentication → Users: ` +
        feilet.map(r => r.uid).join(', ') +
        `. Feiler slettingen der også, står kontoen som fremmednøkkel et sted — sjekk ` +
        `feilmeldingen fra GoTrue; typisk må kurs_skole.svar_registrert_av nulles først.`,
      manuell_sletting_uid: feilet.map(r => r.uid),
    }),
  })
}
