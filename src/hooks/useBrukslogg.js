import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useBrukslogg(skoleId = null) {
  const { bruker } = useAuth()

  return useCallback((hendelsetype, opts = {}) => {
    if (!bruker?.id) return
    supabase.from('brukslogg').insert({
      bruker_id:     bruker.id,
      skole_id:      skoleId ?? null,
      hendelse_type: hendelsetype,
      ressurs_id:    opts.ressursId   ?? null,
      ressurs_navn:  opts.ressursNavn ?? null,
      side:          opts.side ?? window.location.pathname,
    })
    // Bevisst ingen await — logging skal aldri blokkere UI
  }, [bruker?.id, skoleId])
}
