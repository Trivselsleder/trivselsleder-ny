import { supabase } from './supabase'

// Kall til /api/admin/* MÅ ta med den innloggede sesjonen.
//
// Endepunktene der bruker service-nøkkelen og går utenom ALLE sperrer — RLS,
// policyer, alt. Da må de selv kunne se hvem som ringer på. Fram til 4. august
// gjorde de ikke det: hvem som helst på internett kunne opprette skoler,
// godkjenne påmeldinger eller slette en kurs_skole-rad med skolens svar og
// lenke. Funnet av agenttest 3.
//
// Denne funksjonen finnes for at ingen skal glemme headeren på ett kallsted.
// Bruk den overalt der /api/admin/ kalles — aldri fetch() direkte.
export async function adminFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
