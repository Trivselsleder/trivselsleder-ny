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

export function lekTittel(ressurs) {
  const inn = ressurs?.ressurs_innhold || []
  return (
    inn.find((i) => i.sprak === 'nb') ||
    inn.find((i) => i.sprak === 'nn') ||
    inn[0] ||
    {}
  ).tittel || 'Uten navn'
}
