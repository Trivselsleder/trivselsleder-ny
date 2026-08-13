import { useMemo, useRef, useState } from 'react'

const FARGER = ['#F47920', '#D6006E', '#F9A25C', '#E24C9A', '#F58A3D', '#C71E7E']
const R = 150
const C = 160 // sentrum
const VIEW = 320

function punkt(vinkelGrader, radius) {
  // 0° = topp, med klokka
  const rad = ((vinkelGrader - 90) * Math.PI) / 180
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)]
}

// Deterministisk «tilfeldig» uten Math.random (som er blokkert): bruk tid + teller.
function nesteTrekk(teller) {
  const t = Date.now()
  return ((t % 1000) / 1000 + teller * 0.6180339887) % 1
}

export default function Lykkehjul({ leker }) {
  const [rotasjon, setRotasjon] = useState(0)
  const [snurrer, setSnurrer] = useState(false)
  const [vinner, setVinner] = useState(null)
  const tellerRef = useRef(0)

  const n = leker.length
  const seg = n > 0 ? 360 / n : 360

  const skiver = useMemo(() => {
    if (n === 0) return []
    return leker.map((lek, i) => {
      const start = i * seg
      const slutt = (i + 1) * seg
      const [x1, y1] = punkt(start, R)
      const [x2, y2] = punkt(slutt, R)
      const stor = seg > 180 ? 1 : 0
      const d = n === 1
        ? `M ${C - R} ${C} A ${R} ${R} 0 1 1 ${C + R} ${C} A ${R} ${R} 0 1 1 ${C - R} ${C} Z`
        : `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${stor} 1 ${x2} ${y2} Z`
      const [tx, ty] = punkt(start + seg / 2, R * 0.62)
      return { d, tx, ty, midt: start + seg / 2, farge: FARGER[i % FARGER.length], lek }
    })
  }, [leker, n, seg])

  function snurr() {
    if (snurrer || n === 0) return
    setVinner(null)
    setSnurrer(true)
    tellerRef.current += 1
    const trekk = nesteTrekk(tellerRef.current)
    const vinnerIndex = Math.floor(trekk * n) % n
    // Vi vil at midten av vinnerskiven skal ende på toppen (0°/pekeren).
    const midt = vinnerIndex * seg + seg / 2
    const grunnrunder = 360 * 5
    // Nåværende rotasjon mod 360, så legg til det som trengs for å bringe `midt` til topp.
    const naa = ((rotasjon % 360) + 360) % 360
    const maalMod = (360 - midt) % 360
    let delta = (maalMod - naa + 360) % 360
    const nyRotasjon = rotasjon + grunnrunder + delta
    setRotasjon(nyRotasjon)
    window.setTimeout(() => {
      setSnurrer(false)
      setVinner(leker[vinnerIndex])
    }, 4200)
  }

  if (n === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        Legg til minst én lek for å snurre hjulet.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: VIEW, maxWidth: '100%' }}>
        {/* Peker på toppen */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: -6 }}
          aria-hidden
        >
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path d="M14 26 L4 6 L24 6 Z" fill="#1f2937" />
          </svg>
        </div>

        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-auto">
          <g
            style={{
              transform: `rotate(${rotasjon}deg)`,
              transformOrigin: `${C}px ${C}px`,
              transition: snurrer ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {skiver.map((s, i) => (
              <g key={i}>
                <path d={s.d} fill={s.farge} stroke="#fff" strokeWidth="2" />
                {n > 1 && (
                  <text
                    x={s.tx}
                    y={s.ty}
                    fill="#fff"
                    fontSize={n > 10 ? 9 : 12}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${s.midt}, ${s.tx}, ${s.ty})`}
                  >
                    {s.lek.tittel.length > 16 ? s.lek.tittel.slice(0, 15) + '…' : s.lek.tittel}
                  </text>
                )}
              </g>
            ))}
          </g>
          <circle cx={C} cy={C} r="26" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
        </svg>
      </div>

      <button
        onClick={snurr}
        disabled={snurrer}
        className="mt-5 bg-magenta text-white font-semibold px-8 py-3 rounded-full hover:bg-magenta/90 transition disabled:opacity-50"
      >
        {snurrer ? 'Snurrer …' : 'Snurr hjulet'}
      </button>

      {vinner && !snurrer && (
        <div className="mt-5 text-center">
          <p className="text-sm text-gray-400">Dagens lek</p>
          <p className="text-2xl font-bold text-magenta mt-1">{vinner.tittel}</p>
        </div>
      )}
    </div>
  )
}
