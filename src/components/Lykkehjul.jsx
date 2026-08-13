import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { lekEmoji, lekFarge } from '../lib/lekIkon'

const BUNNY_LIB = '727245'
const R = 150
const C = 160
const VIEW = 320

function punkt(vinkelGrader, radius) {
  const rad = ((vinkelGrader - 90) * Math.PI) / 180
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)]
}

// Deterministisk «tilfeldig» uten Math.random (blokkert): tid + teller.
function nesteTrekk(teller) {
  const t = Date.now()
  return ((t % 1000) / 1000 + teller * 0.6180339887) % 1
}

export default function Lykkehjul({ leker, rotasjoner = 6, skriftstorrelse = 16, kanApneLek = true }) {
  const [rotasjon, setRotasjon] = useState(0)
  const [snurrer, setSnurrer] = useState(false)
  const [vinner, setVinner] = useState(null)
  const [visVideo, setVisVideo] = useState(false)
  const tellerRef = useRef(0)

  const n = leker.length
  const seg = n > 0 ? 360 / n : 360
  const fontSize = Math.max(8, Math.min(skriftstorrelse, n > 12 ? 9 : n > 8 ? 12 : skriftstorrelse))

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
      const [tx, ty] = punkt(start + seg / 2, R * 0.6)
      const [ex, ey] = punkt(start + seg / 2, R * 0.86)
      return { d, tx, ty, ex, ey, midt: start + seg / 2, farge: lekFarge(lek), emoji: lekEmoji(lek), lek }
    })
  }, [leker, n, seg])

  function snurr() {
    if (snurrer || n === 0) return
    setVinner(null)
    setVisVideo(false)
    setSnurrer(true)
    tellerRef.current += 1
    const trekk = nesteTrekk(tellerRef.current)
    const vinnerIndex = Math.floor(trekk * n) % n
    const midt = vinnerIndex * seg + seg / 2
    const grunnrunder = 360 * Math.max(3, rotasjoner)
    const naa = ((rotasjon % 360) + 360) % 360
    const maalMod = (360 - midt) % 360
    const delta = (maalMod - naa + 360) % 360
    setRotasjon(rotasjon + grunnrunder + delta)
    window.setTimeout(() => {
      setSnurrer(false)
      setVinner(leker[vinnerIndex])
    }, 4200)
  }

  if (n === 0) {
    return <div className="text-center text-gray-400 py-12">Legg til minst én lek for å snurre hjulet.</div>
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: VIEW, maxWidth: '100%' }}>
        <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -6 }} aria-hidden>
          <svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 26 L4 6 L24 6 Z" fill="#1f2937" /></svg>
        </div>
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-auto" role="img" aria-label={`Lykkehjul med ${n} leker`}>
          <g style={{
            transform: `rotate(${rotasjon}deg)`, transformOrigin: `${C}px ${C}px`,
            transition: snurrer ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}>
            {skiver.map((s, i) => (
              <g key={i}>
                <path d={s.d} fill={s.farge} stroke="#fff" strokeWidth="2" />
                {n <= 24 && (
                  <text x={s.ex} y={s.ey} fontSize={Math.min(16, seg / 2.4)} textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${s.midt}, ${s.ex}, ${s.ey})`}>{s.emoji}</text>
                )}
                {n > 1 && (
                  <text x={s.tx} y={s.ty} fill="#fff" fontSize={fontSize} fontWeight="600" textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${s.midt}, ${s.tx}, ${s.ty})`}>
                    {s.lek.tittel.length > 16 ? s.lek.tittel.slice(0, 15) + '…' : s.lek.tittel}
                  </text>
                )}
              </g>
            ))}
          </g>
          <circle cx={C} cy={C} r="26" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
        </svg>
      </div>

      <button onClick={snurr} disabled={snurrer}
        className="mt-5 bg-magenta text-white font-semibold px-8 py-3 rounded-full hover:bg-magenta/90 transition disabled:opacity-50">
        {snurrer ? 'Snurrer …' : 'Snurr hjulet'}
      </button>

      <div aria-live="polite" className="w-full">
        {vinner && !snurrer && (
          <div className="mt-5 text-center border border-magenta/20 bg-magenta/5 rounded-2xl p-5">
            <p className="text-sm text-gray-400">Dagens lek</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-lg" style={{ background: lekFarge(vinner) }}>{lekEmoji(vinner)}</span>
              <p className="text-2xl font-bold text-magenta">{vinner.tittel}</p>
            </div>

            {visVideo && vinner.harVideo && (
              <div className="relative w-full mt-4" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${vinner.video.bunny_video_id}?autoplay=true&preload=true`}
                  loading="lazy" className="absolute inset-0 w-full h-full rounded-xl border-0"
                  allow="accelerometer;gyroscope;encrypted-media;picture-in-picture;autoplay" allowFullScreen title={vinner.tittel} />
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {vinner.harVideo && !visVideo && (
                <button onClick={() => setVisVideo(true)} className="text-sm bg-orange text-white px-4 py-2 rounded-full hover:bg-orange/90">▶ Spill video</button>
              )}
              {kanApneLek && vinner.ressursId && (
                <Link to={`/min-side/aktiviteter/${vinner.ressursId}`} className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-full hover:border-orange hover:text-orange">Åpne lek</Link>
              )}
              <button onClick={snurr} className="text-sm text-gray-500 hover:text-magenta px-3">Snurr igjen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
