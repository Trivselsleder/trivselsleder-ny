import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useBrukslogg(skoleId = null) {
  const { bruker } = useAuth()
  const brukerId = bruker?.id ?? null

  return useCallback((hendelsetype, opts = {}) => {
    if (!brukerId) return
    // supabase-js sender IKKE forespørselen før noen kaller .then() på den —
    // uten .then() ble insert-en aldri sendt (derfor sto brukslogg tom, funnet
    // 28. aug under TU steg 5). Vi kaller .then() med tomme handlere: sender nå,
    // blokkerer aldri UI, og en feil i loggingen når aldri brukeren.
    supabase.from('brukslogg').insert({
      bruker_id:     brukerId,
      skole_id:      skoleId ?? null,
      hendelse_type: hendelsetype,
      ressurs_id:    opts.ressursId   ?? null,
      ressurs_navn:  opts.ressursNavn ?? null,
      side:          opts.side ?? window.location.pathname,
    }).then(() => {}, () => {})
    // Bevisst ingen await — logging skal aldri blokkere UI
  }, [brukerId, skoleId])
}
