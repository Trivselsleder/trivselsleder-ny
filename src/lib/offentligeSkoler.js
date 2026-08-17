import { supabase } from './supabase'

// Felles, trygg kilde for OFFENTLIG skoleinformasjon.
// Kaller SECURITY DEFINER-RPC hent_offentlige_skoler() (migrasjon 044), som
// returnerer KUN id, navn, kommune, fylke, elevtall for aktive medlemsskoler –
// aldri kontakt-PII. Brukes av to flater:
//   (a) offentlig skoleoversikt paa forsiden (uinnlogget/anon)
//   (b) naboskole-velgeren ved deling av periodeplan (innlogget)
// Direkte lesing av `skoler` er strammet (migrasjon 042) slik at en skoleadmin
// kun ser egen skole. Derfor gaar begge flater via denne funksjonen i stedet.
export async function hentOffentligeSkoler() {
  const { data, error } = await supabase.rpc('hent_offentlige_skoler')
  if (error) throw error
  return data || []
}
