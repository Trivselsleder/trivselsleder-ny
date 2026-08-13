// Auto-ikon for en lek: emoji valgt ut fra nøkkelord + en deterministisk farge.
// Brukes i rutenettet, på hjulet og på kort NÅR leken mangler ekte bilde.
// (Når ekte game_category m/ field_color er importert, kan farge byttes til
//  kategorifargen — se lekFarge().)

const EMOJI_REGLER = [
  [/\bbowling\b/i, '🎳'],
  [/\bdart|blink|prikk|treff/i, '🎯'],
  [/\bfotball|fifa|kickball|bump/i, '⚽'],
  [/\bbasket|kurv/i, '🏀'],
  [/\bvolley|kin-?ball|six-?ball|moonball|sprett|kaste?ball|ball\b/i, '🏐'],
  [/\bhåndball/i, '🤾'],
  [/\btennis|badminton|speedminton|racket/i, '🏸'],
  [/\bhockey|bandy|innebandy|kølle/i, '🏒'],
  [/\bsisten|haien|jakt|fange|fanger|bytte|løp|stafett|kanon|stikkball/i, '🏃'],
  [/\bhopp|hinke|paradis|hoppe/i, '🤸'],
  [/\bgjemsel|gjemme|skjul/i, '🙈'],
  [/\bslange|orm/i, '🐍'],
  [/\bfisk|hav|sjø/i, '🐟'],
  [/\bbjørn|dyr|monster/i, '🐻'],
  [/\bfallskjerm/i, '🪂'],
  [/\bstein|saks|papir|gjett/i, '✊'],
  [/\bdans|musikk|sang|rytme/i, '🎵'],
  [/\bsnø|vinter|aking|ski/i, '❄️'],
  [/\bvann|bade/i, '💧'],
  [/\btau|dra\b|drakamp/i, '🪢'],
  [/\bstjerne|konge|king|dronning/i, '👑'],
  [/\bkjegle|bumerang|frisbee/i, '🥏'],
]

const FARGER = ['#F47920', '#D6006E', '#0EA5E9', '#16A34A', '#7C3AED', '#EAB308', '#EF4444', '#0891B2', '#DB2777', '#65A30D']

function tekstFor(lek) {
  const utstyr = (lek.utstyr || []).join(' ')
  const egnet = (lek.egnet || []).join(' ')
  return `${lek.tittel || ''} ${utstyr} ${egnet}`
}

export function lekEmoji(lek) {
  const t = tekstFor(lek)
  for (const [re, emoji] of EMOJI_REGLER) if (re.test(t)) return emoji
  return '🎈'
}

// Deterministisk farge ut fra tittelen (byttes til kategorifarge når den finnes).
export function lekFarge(lek) {
  const s = lek.tittel || ''
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return FARGER[h % FARGER.length]
}

// Ekte bilde hvis leken har det (bilde-peker fra biblioteket), ellers null.
export function lekBilde(lek) {
  const m = (lek.medier || []).find((x) => x.type === 'bilde' && x.url)
  return m?.url || null
}

// Samlet: { emoji, farge, bilde }
export function lekIkon(lek) {
  return { emoji: lekEmoji(lek), farge: lekFarge(lek), bilde: lekBilde(lek) }
}
