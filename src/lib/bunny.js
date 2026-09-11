import { supabase } from './supabase'

// Kall til /api/bunny/* MÅ ta med den innloggede sesjonen — endepunktene bruker
// service-nøkkelen og sjekker rollen selv (krevAnsatt). Samme mønster som adminFetch.
async function medToken(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Serverfeil (${res.status}).`)
  return data
}

// Oppretter et video-objekt hos Bunny og returnerer TUS-parametrene nettleseren
// trenger for å laste opp fila direkte: { videoId, libraryId, expire, signature }.
export async function opprettOpplasting(ressursId, tittel) {
  return medToken('/api/bunny/opprett-opplasting', {
    method: 'POST',
    body: JSON.stringify({ ressurs_id: ressursId, tittel }),
  })
}

// Sletter en Bunny-video (serveren nekter hvis guid-en fortsatt er i bruk).
export async function slettVideo(guid) {
  return medToken('/api/bunny/slett-video', {
    method: 'POST',
    body: JSON.stringify({ guid }),
  })
}

// Henter behandlingsstatus for én video: { status, klar }.
export async function videoStatus(guid) {
  return medToken(`/api/bunny/status?guid=${encodeURIComponent(guid)}`, { method: 'GET' })
}
