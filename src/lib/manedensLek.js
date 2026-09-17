import { supabase } from './supabase'
import { hentLek } from './leker'
import { harManedensLek } from './manedensLekForm'

// «Månedens lek» (migr 120). Kaller RPC-en hent_manedens_lek() som FRYSER valget per måned
// (automatisk fra skolenes bruk, redaksjonell reserve, eller «ingen») og returnerer
// { ressurs_id, kilde }. Henter så selve leken i LekeKort-form via hentLek (leker.js — IKKE
// endret). Returnerer { lek, kilde } eller NULL når det ikke finnes en lek å vise:
//   * kilde = 'ingen' eller manglende ressurs_id  → null (kortet skjules stille),
//   * RPC/tabell finnes ikke ennå (120 ikke kjørt) → error → null,
//   * hentLek feiler (leken skjult/slettet)        → null.
// Kortet på Min side skal ALDRI vise en feil — det bare uteblir.
export async function hentManedensLek() {
  try {
    const { data, error } = await supabase.rpc('hent_manedens_lek')
    if (error) return null
    const rad = Array.isArray(data) ? data[0] : data
    if (!harManedensLek(rad)) return null
    const lek = await hentLek(rad.ressurs_id)
    if (!lek) return null
    return { lek, kilde: rad.kilde }
  } catch {
    return null
  }
}

// «Månedens aktiv læring» (migr 126). Speiler hentManedensLek, men mot RPC-en
// hent_manedens_aktivlaering() (samme retur { ressurs_id, kilde }). Returnerer
// { lek, kilde } eller null → kortet uteblir stille. Brukes i «Dette bruker skolene nå».
export async function hentManedensAktivLaering() {
  try {
    const { data, error } = await supabase.rpc('hent_manedens_aktivlaering')
    if (error) return null
    const rad = Array.isArray(data) ? data[0] : data
    if (!harManedensLek(rad)) return null
    const lek = await hentLek(rad.ressurs_id)
    if (!lek) return null
    return { lek, kilde: rad.kilde }
  } catch {
    return null
  }
}
