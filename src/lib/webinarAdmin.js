import { supabase } from './supabase'

// Klientside mot api/webinar/admin.js (ansatt-endepunkt m/ service-nøkkel).
async function kall(handling, ekstra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Ikke innlogget.')
  const res = await fetch('/api/webinar/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ handling, ...ekstra }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Noe gikk galt.')
  return json
}

export const hentWebinarerAdmin = () => kall('list').then((r) => r.webinarer || [])
export const opprettWebinar = (felt) => kall('opprett', felt)
export const oppdaterWebinar = (id, felt) => kall('oppdater', { id, ...felt })
export const publiserWebinar = (id) => kall('publiser', { id })
export const avpubliserWebinar = (id) => kall('avpubliser', { id })
export const slettWebinar = (id) => kall('slett', { id })
export const hentPameldingerAdmin = (id) => kall('pameldinger', { id }).then((r) => r.pameldinger || [])
