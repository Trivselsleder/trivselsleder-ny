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

export function lekTittel(ressurs) {
  const inn = ressurs?.ressurs_innhold || []
  return (
    inn.find((i) => i.sprak === 'nb') ||
    inn.find((i) => i.sprak === 'nn') ||
    inn[0] ||
    {}
  ).tittel || 'Uten navn'
}
