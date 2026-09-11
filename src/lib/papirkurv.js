// Felles papirkurv-hjelpere for periodeplaner og TL-hjul.
// En rad i papirkurven (status='arkivert') slettes for godt 30 dager etter
// arkivert_at. Nattjobben api/papirkurv/cron-slett.js gjør den faktiske slettingen;
// disse funksjonene regner bare ut hvor lenge det er igjen, til visning.
export const PAPIRKURV_DAGER = 30

// Hele dager igjen før raden slettes for godt (0 = slettes ved neste nattjobb).
export function dagerTilSletting(arkivertAt) {
  if (!arkivertAt) return PAPIRKURV_DAGER
  const gaatt = Math.floor((Date.now() - new Date(arkivertAt).getTime()) / 86400000)
  return Math.max(0, PAPIRKURV_DAGER - gaatt)
}

// Ferdig tekst til papirkurv-kortet.
export function slettesTekst(arkivertAt) {
  const d = dagerTilSletting(arkivertAt)
  if (d <= 0) return 'Slettes for godt ved neste opprydding'
  return `Slettes for godt om ${d} ${d === 1 ? 'dag' : 'dager'}`
}
