// Ren logikk for «Månedens lek» (ingen supabase-import → node-testbar, samme mønster som
// samlingForm.js). hent_manedens_lek() (migr 120) returnerer { ressurs_id, kilde }.
// Kortet skal SKJULES stille når det ikke finnes en lek å vise.

// Skal kortet vises for en RPC-rad? Nei hvis raden mangler, kilde='ingen', eller
// ressurs_id ikke er satt (da har basen valgt «ingen lek denne måneden»).
export function harManedensLek(rad) {
  return !!(rad && rad.kilde !== 'ingen' && rad.ressurs_id)
}
