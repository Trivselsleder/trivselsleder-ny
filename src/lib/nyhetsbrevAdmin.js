import { supabase } from './supabase'

// Klientside mot api/nyhetsbrev/send-bruk-a.js (ansatt-endepunkt m/ service-nøkkel).
async function kall(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Ikke innlogget.')
  const res = await fetch('/api/nyhetsbrev/send-bruk-a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Noe gikk galt.')
  return json
}

export const forhandsvisBrukA = (felt) => kall({ ...felt, handling: 'forhandsvis' })
export const sendBrukA = (felt) => kall({ ...felt, handling: 'send' })
export const sendTestBrukA = (felt) => kall({ ...felt, handling: 'test' })

// Webinarliste til velgeren (nyeste først). RLS: ansatte ser alle.
export async function hentWebinarerTilOppfolging() {
  const { data, error } = await supabase
    .from('webinarer')
    .select('id, tittel, starter_at, varighet_min, status')
    .order('starter_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

// Utsendingshistorikk (RLS: kun ansatte).
export async function hentUtsendinger() {
  const { data, error } = await supabase
    .from('nyhetsbrev_utsendinger')
    .select('id, bruk, emne, status, antall_mottakere, planlagt_at, sendt_at, opprettet_at, segment_navn, feilmelding')
    .order('opprettet_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

// Nøkkeltall for mottakerbasen (RLS: kun ansatte).
export async function hentMottakerTall() {
  const { count: totalt } = await supabase
    .from('nyhetsbrev_mottakere').select('id', { count: 'exact', head: true })
  const { count: avmeldte } = await supabase
    .from('nyhetsbrev_mottakere').select('id', { count: 'exact', head: true })
    .not('avmeldt_at', 'is', null)
  return { totalt: totalt || 0, avmeldte: avmeldte || 0 }
}

// Nødbrems-status til visning i flaten.
export async function hentMotorStatus() {
  const { data } = await supabase.from('innstillinger')
    .select('verdi').eq('nokkel', 'motor_aktiv').maybeSingle()
  return (data?.verdi || '').trim().toLowerCase()
}
