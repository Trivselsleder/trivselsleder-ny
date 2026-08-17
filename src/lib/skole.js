import { supabase } from './supabase'

// Finn brukerens aktive skole (til å stemple hjul/planer så HTLA på samme
// skole også ser dem). Returnerer null hvis brukeren ikke er koblet til noen
// skole – da er raden fortsatt synlig for eieren via bruker_id.
export async function hentMinSkole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('bruker_skole')
    .select('skole_id')
    .eq('bruker_id', user.id)
    .eq('aktiv', true)
    .order('skole_id', { ascending: true }) // deterministisk ved flere koblinger
    .limit(1)
    .maybeSingle()
  return data?.skole_id ?? null
}

// Navnet på skolen brukeren jobber i (til header). Faller tilbake til en skole
// RLS lar oss lese (intern/superadmin ser alle) om ingen aktiv medlemskap finnes.
export async function hentMinSkoleNavn() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: bs } = await supabase
    .from('bruker_skole')
    .select('skoler ( navn )')
    .eq('bruker_id', user.id)
    .eq('aktiv', true)
    .limit(1)
    .maybeSingle()
  if (bs?.skoler?.navn) return bs.skoler.navn
  // Ingen egen skole (typisk intern/superadmin): vis en skole RLS lar oss lese.
  // Foretrekk «Demoskolen» for test/demo, ellers første i lista.
  const { data: liste } = await supabase.from('skoler').select('navn').order('navn').limit(100)
  const demo = (liste || []).find((s) => s.navn === 'Demoskolen')
  return demo?.navn ?? liste?.[0]?.navn ?? null
}

// Full skole-rad (til «Skolen min → Kundeinformasjon»). RLS: skoleadmin ser egen skole.
export async function hentSkole(skoleId) {
  if (!skoleId) return null
  const { data, error } = await supabase.from('skoler').select('*').eq('id', skoleId).maybeSingle()
  if (error) throw error
  return data
}

// Brukere knyttet til skolen (til «Ansatte» / «Administratorer»).
export async function hentSkoleBrukere(skoleId) {
  if (!skoleId) return []
  const { data, error } = await supabase
    .from('bruker_skole')
    .select('rolle, stilling, tl_rolle, aktiv, profiles ( id, navn, epost, aktiv )')
    .eq('skole_id', skoleId)
  if (error) throw error
  const sett = new Map()
  ;(data || [])
    .filter((r) => r.profiles)
    .forEach((r) => {
      // Dedupliser på bruker-id (kan finnes flere bruker_skole-rader mot samme skole).
      if (!sett.has(r.profiles.id)) {
        sett.set(r.profiles.id, {
          id: r.profiles.id,
          navn: r.profiles.navn || '—',
          epost: r.profiles.epost || '',
          rolle: r.rolle,
          stilling: r.stilling ?? null,
          tl_rolle: r.tl_rolle ?? null,
          aktiv: r.aktiv !== false && r.profiles.aktiv !== false,
        })
      }
    })
  return [...sett.values()].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
}

// Lagre skole-endringer via proven endepunkt (/api/skole/oppdater-skole, Bearer-token).
// Endepunktet autoriserer skoleadmin og låser til egen skole.
export async function lagreSkole(skoleId, form) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sesjonen er utløpt — last inn siden på nytt.')
  // Hvitlist felter (unngår at fremtidige hjelpefelter i skjemaet lekker/overstyrer).
  const FELTER = ['navn', 'gateadresse', 'postnummer', 'poststed', 'telefon', 'type', 'nettverk',
    'rektor_navn', 'rektor_epost', 'rektor_telefon', 'hktl_navn', 'hktl_epost', 'hktl_telefon']
  const body = { skoleId }
  FELTER.forEach((k) => { if (form[k] != null) body[k] = form[k] })
  body.antall_elever = form.antall_elever !== '' && form.antall_elever != null ? Number(form.antall_elever) : null
  // Dropp tomme TLA-plassholderrader så de ikke lagres som søppel i jsonb.
  body.tla_kontakter = (form.tla_kontakter || []).filter((t) => t.navn || t.epost || t.telefon)
  const res = await fetch('/api/skole/oppdater-skole', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Noe gikk galt ved lagring.')
  return data
}

// Invitere en ny skolebruker via proven endepunkt (/api/auth/inviter-bruker).
// Skoleadmin kan kun invitere skoleadmin/skoleansatt til egen skole (sjekkes server-side).
export async function inviterSkolebruker({ epost, navn, rolle, skoleId, stilling, tl_rolle }) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sesjonen er utløpt — last inn siden på nytt.')
  const res = await fetch('/api/auth/inviter-bruker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ epost, navn, rolle, skoleId, stilling, tl_rolle }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Kunne ikke sende invitasjon.')
  return data
}

export function lekTittel(ressurs) {
  const inn = ressurs?.ressurs_innhold || []
  return (
    inn.find((i) => i.sprak === 'nb') ||
    inn.find((i) => i.sprak === 'nn') ||
    inn[0] ||
    {}
  ).tittel || 'Uten navn'
}
