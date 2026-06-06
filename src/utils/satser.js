const LS_KEY = 'kulturkort_satser'

export const STANDARD_SATSER = {
  kortpris: 40,
  portoSatser: [
    { fraAntall: 1,  tilAntall: 8,    porto: 28 },
    { fraAntall: 9,  tilAntall: 20,   porto: 28 },
    { fraAntall: 21, tilAntall: 36,   porto: 46 },
    { fraAntall: 37, tilAntall: 72,   porto: 69 },
    { fraAntall: 73, tilAntall: null, porto: 99 },
  ],
}

export function hentSatser() {
  try {
    const lagret = localStorage.getItem(LS_KEY)
    if (!lagret) return STANDARD_SATSER
    const parsed = JSON.parse(lagret)
    return {
      kortpris: Number(parsed.kortpris) || STANDARD_SATSER.kortpris,
      portoSatser: Array.isArray(parsed.portoSatser) ? parsed.portoSatser : STANDARD_SATSER.portoSatser,
    }
  } catch {
    return STANDARD_SATSER
  }
}

export function lagreSatser(satser) {
  localStorage.setItem(LS_KEY, JSON.stringify(satser))
}

export function beregnPris(antall, satser) {
  if (!antall || antall < 1) return null
  const s = satser || hentSatser()
  const kortpris = antall * s.kortpris
  const trinn = s.portoSatser.find(
    t => antall >= t.fraAntall && (t.tilAntall === null || antall <= t.tilAntall)
  )
  const porto = trinn ? trinn.porto : s.portoSatser[s.portoSatser.length - 1].porto
  return { kortpris, porto, total: kortpris + porto }
}
