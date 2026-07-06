// Fallback-kjede for mottaker-e-post (feil D, agent-retest 6. juli 2026):
// hktl_epost → htla_epost → rektor_epost → ingen.
// Brukes alle steder mottaker beregnes (purring, påminnelse, evaluering) —
// ÉN felles funksjon, aldri lokale kopier som kan sprike.
// Midlertidig bunnplanke: full mottaker-ombygging (flere mottakere per skole)
// kommer i Resend/Trinn B-økten.

export function finnMottaker(skole) {
  const verdi = felt => (skole?.[felt] || '').trim()
  if (verdi('hktl_epost')) return { epost: verdi('hktl_epost'), kilde: 'hktl' }
  if (verdi('htla_epost')) return { epost: verdi('htla_epost'), kilde: 'htla' }
  if (verdi('rektor_epost')) return { epost: verdi('rektor_epost'), kilde: 'rektor' }
  return { epost: null, kilde: null }
}

// Etikett som vises i grå tekst ved adressen når fallback brukes.
// RA skal alltid se hvem som faktisk mottar — aldri stille oppførsel.
export function kildeEtikett(kilde) {
  if (kilde === 'htla') return 'HTLA-e-post (fallback)'
  if (kilde === 'rektor') return 'rektor-e-post (fallback)'
  return null // hktl er normalen — ingen etikett
}
