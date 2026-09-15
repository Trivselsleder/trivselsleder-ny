// Auto-ikon for en lek: et TL-symbol (SVG-sprite, public/tl-ikoner.svg) valgt ut fra KATEGORI,
// på en deterministisk TL-farge. Kategorien velges med SUBSTRING-matching (ikke \b-forankret), så
// sammensatte ord treffer — «Poengsisten» → sisten, «Snørugby» → snø. Prioritet: AKTIVITET før
// tilfeldig utstyr (en jaktlek med ball blir sisten, ikke ball). Kilde: kategorianalysen 14. sep.

// Kategori → symbol-id. Prioritert liste, første treff vinner. Kategorier uten eget symbol
// (generisk markering, reaksjon, strategi, samarbeid, gjemsel) faller BEVISST til det nøytrale
// symbolet (tl-utenutstyr) — de er verbale/abstrakte og lar seg ikke tegne som 32px-ikon.
const KATEGORIER = [
  ['tl-ssp',        ['stein, saks', 'saks, papir', 'stein saks', 'stein-saks', ' saks ', 'papir-runde', 'sten saks']],
  ['tl-dans',       ['dans', 'musikk', 'rytme', 'sang', 'klapp', 'disco', 'freeze']],
  ['tl-sno',        ['snø', ' ski ', 'miniski', 'aking', 'akebrett', 'aketog', 'skøyte', 'pulk', 'snørugby', 'snøball']],
  ['tl-fallskjerm', ['fallskjerm', 'laken']],
  ['tl-blinde',     ['blind', 'blende', 'i mørke', 'bind for', 'mørkl']],
  ['tl-tau',        ['tau', 'drakamp', 'hoppetau']],
  ['tl-hopp',       ['hopp', 'hink', 'paradis', 'bukk']],
  ['tl-sisten',     ['sisten', 'fange', 'fanger', 'fanget', 'jakt', 'jage', 'jeger', 'jager', 'haien', 'kanonball', 'stikkball', 'dødball', 'dodgeball', 'dodge', 'brennball', 'heks']],
  ['tl-stafett',    ['stafett', 'kappløp', 'spring', 'sprint', 'kappestrid', 'kappl', ' løp', 'friidrett', 'hekkeløp']],
  ['tl-kolle',      ['hockey', 'innebandy', 'bandy', 'kølle', 'rumpeldunk']],
  ['tl-racket',     ['streetracket', 'racket', 'tennis', 'badminton', 'ketsjer', 'bordtennis']],
  ['tl-frisbee',    ['frisbee', 'disc', 'dodgebee', 'flyvende', 'flygende']],
  ['tl-bowling',    ['bowling', 'kjegle', 'boccia', ' golf', 'blink', 'presisjon', 'velte', 'snikskytt', 'dart', 'bøtte', 'kremmerhus']],
  ['tl-ball',       ['ball', 'six-ball', 'kin-ball', 'fotball', 'basket', 'volley', 'håndball', 'kickball', 'dragonskin', 'aball', 'a-ball', 'moonball', 'rugby']],
  ['tl-ertepose',   ['ertepose']],
  ['tl-ring',       ['rockering', 'hulahoop', 'hula']],
  ['tl-kort',       ['kortstokk', 'spillkort', 'terning', 'kortspill', 'sjakk', 'stratego', 'memory', 'brikke']],
  ['tl-balanse',    ['balanse', 'slakk line', 'stylte']],
  ['tl-dyr',        ['gris', 'bjørn', 'slange', ' orm', 'katt', ' mus', ' rev', 'løve', ' elg', 'krokodille', 'ekorn', 'yeti', 'sjiraff', 'pingvin', 'edderkopp', 'drage', 'monster', 'troll', 'ninja', 'kirkerott']],
]
const NEUTRAL = 'tl-utenutstyr'

// TL-identitet v2.0 (ingen rosa): oransje, petrol, teal, rød, gull + noen nøytrale for variasjon.
const FARGER = ['#FF7B31', '#106C75', '#54A1AB', '#CF442F', '#F2B01E', '#0EA5E9', '#16A34A', '#0891B2', '#7C3AED', '#65A30D']

function tekstFor(lek) {
  const utstyr = (lek.utstyr || []).join(' ')
  const egnet = (lek.egnet || []).join(' ')
  return `${lek.tittel || ''} ${utstyr} ${egnet}`.toLowerCase()
}

// Symbol-id (tl-…) for leken. Substring, aktivitet før utstyr; nøytralt symbol som fallback.
export function lekIkonId(lek) {
  const t = tekstFor(lek)
  for (const [id, ord] of KATEGORIER) if (ord.some((o) => t.includes(o))) return id
  return NEUTRAL
}

// Emoji beholdes KUN for PDF-utskriften (periodeplanPdf.js) — en print-HTML kan ikke bruke en
// currentColor-sprite pålitelig. Utledes fra samme kategori, så den får substring-fiksen den òg.
const EMOJI_FOR = {
  'tl-ball': '⚽', 'tl-bowling': '🎳', 'tl-sisten': '🏃', 'tl-dans': '🎵', 'tl-stafett': '🏁',
  'tl-kolle': '🏒', 'tl-racket': '🏸', 'tl-kort': '🃏', 'tl-frisbee': '🥏', 'tl-sno': '❄️',
  'tl-blinde': '🙈', 'tl-tau': '🪢', 'tl-hopp': '🤸', 'tl-ring': '⭕', 'tl-dyr': '🐾',
  'tl-ertepose': '🌰', 'tl-ssp': '✊', 'tl-balanse': '🤹', 'tl-fallskjerm': '🪂', 'tl-utenutstyr': '🎈',
}
export function lekEmoji(lek) {
  return EMOJI_FOR[lekIkonId(lek)] || '🎈'
}

// Deterministisk farge ut fra tittelen (byttes til kategorifarge når den finnes).
export function lekFarge(lek) {
  const s = lek.tittel || ''
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return FARGER[h % FARGER.length]
}

// Symbolet bruker currentColor. Velg #fff eller nær-svart — den som gir best kontrast mot
// kvadratets farge (WCAG for grafiske objekter er 3:1; vi tar alltid den beste av de to).
function relLum(hex) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function kontrastTekst(farge) {
  const L = relLum(farge)
  const motHvit = 1.05 / (L + 0.05)             // hvit tekst mot fargen
  const motSvart = (L + 0.05) / (0.0096 + 0.05) // nær-svart (#111827) mot fargen
  return motHvit >= motSvart ? '#ffffff' : '#111827'
}

// Ekte bilde hvis leken har det (bilde-peker fra biblioteket), ellers null.
export function lekBilde(lek) {
  const m = (lek.medier || []).find((x) => x.type === 'bilde' && x.url)
  return m?.url || null
}

// Samlet.
export function lekIkon(lek) {
  return { id: lekIkonId(lek), emoji: lekEmoji(lek), farge: lekFarge(lek), bilde: lekBilde(lek) }
}
