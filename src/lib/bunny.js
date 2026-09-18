import { supabase } from './supabase'

// CDN-vertsnavn (pull zone) for Bunny-biblioteket, kilde: Bunny-dashbordet 13. sep 2026.
// Samme verdi som i LekVisning.jsx. Hotlink-beskyttet (Referer-allowlist) og «Embed view token
// authentication» er AV → thumbnailene (default-filnavnet thumbnail.jpg) hentes direkte uten
// signering. bunnyThumbUrl gir førstebildet for en video-guid, eller null uten guid — kalleren
// faller da tilbake til petrol-flaten (samme mønster som Min side-videokortene, design 8d/5g).
export const BUNNY_CDN = 'vz-ace6fd97-c27.b-cdn.net'
export function bunnyThumbUrl(guid) {
  return guid ? `https://${BUNNY_CDN}/${guid}/thumbnail.jpg` : null
}

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
