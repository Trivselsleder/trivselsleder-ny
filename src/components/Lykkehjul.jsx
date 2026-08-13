import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const BUNNY_LIB = '727245'
const R = 150
const C = 160
const VIEW_W = 320
const VIEW_H = 410

// Vivid rainbow-palett per posisjon (som dagens hjul), ikke per lek.
const PALETT = ['#E4572E', '#4CB944', '#9B5DE5', '#F3A712', '#3A86FF', '#D6006E',
  '#06AED5', '#8AC926', '#FFCA3A', '#FF7B00', '#1B9AAA', '#EF476F']

function punkt(vinkelGrader, radius) {
  const rad = ((vinkelGrader - 90) * Math.PI) / 180
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)]
}

// Svart/hvit tekst ut fra hvor lys segmentfargen er.
function tekstFarge(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#1f2937' : '#ffffff'
}

// Deterministisk «tilfeldig» uten Math.random (blokkert): tid + teller.
function nesteTrekk(teller) {
  const t = Date.now()
  return ((t % 1000) / 1000 + teller * 0.6180339887) % 1
}

function Rosett() {
  const scallop = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * 2 * Math.PI
    return [50 + 42 * Math.cos(a), 50 + 42 * Math.sin(a)]
  })
  return (
    <svg viewBox="0 0 100 124" width="120" height="150" aria-hidden>
      <path d="M36 80 L28 118 L44 107 L50 120 L56 107 L72 118 L64 80 Z" fill="#6D28D9" />
      {scallop.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill="#F59E0B" />)}
      <circle cx="50" cy="50" r="42" fill="#FBBF24" />
      <circle cx="50" cy="50" r="33" fill="#FDE68A" />
      <text x="50" y="46" textAnchor="middle" fontSize="9" fill="#B45309" letterSpacing="1">★ ★ ★</text>
      <text x="50" y="62" textAnchor="middle" fontSize="15" fontWeight="800" fontStyle="italic" fill="#6D28D9">Vinner</text>
    </svg>
  )
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
      const [tx, ty] = punkt(start + seg / 2, R * 0.62)
      const [px, py] = punkt(start, R - 10)
      const farge = PALETT[i % PALETT.length]
      return { d, tx, ty, px, py, midt: start + seg / 2, farge, tekst: tekstFarge(farge), lek }
    })
  }, [leker, n, seg])

  function snurr() {
    if (snurrer || n === 0) return
    setVinner(null); setVisVideo(false); setSnurrer(true)
    tellerRef.current += 1
    const trekk = nesteTrekk(tellerRef.current)
    const vinnerIndex = Math.floor(trekk * n) % n
    const midt = vinnerIndex * seg + seg / 2
    const grunnrunder = 360 * Math.max(3, rotasjoner)
    const naa = ((rotasjon % 360) + 360) % 360
    const maalMod = (360 - midt) % 360
    const delta = (maalMod - naa + 360) % 360
    setRotasjon(rotasjon + grunnrunder + delta)
    window.setTimeout(() => { setSnurrer(false); setVinner(leker[vinnerIndex]) }, 4200)
  }

  if (n === 0) {
    return <div className="text-center text-gray-400 py-12">Legg til minst én lek for å snurre hjulet.</div>
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full rounded-3xl overflow-hidden" style={{ maxWidth: 380 }}>
        {/* bølget bakgrunn */}
        <svg viewBox="0 0 380 460" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width="380" height="460" fill="#FBBF24" />
          <path d="M0 120 Q95 90 190 120 T380 120 V0 H0 Z" fill="#FCD34D" />
          <path d="M0 250 Q110 215 210 250 T380 250 V120 H0 Z" fill="#FDE68A" />
          <path d="M0 380 Q120 345 230 380 T380 380 V250 H0 Z" fill="#FEF3C7" />
        </svg>

        <div className="relative px-4 pt-2 pb-4">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label={`Lykkehjul med ${n} leker`}>
            {/* staffeli-bein (bak hjulet) */}
            <g stroke="#A9744B" strokeWidth="11" strokeLinecap="round">
              <line x1="120" y1="285" x2="86" y2="400" />
              <line x1="200" y1="285" x2="234" y2="400" />
              <line x1="160" y1="300" x2="160" y2="405" />
            </g>

            {/* roterende hjul */}
            <g style={{
              transform: `rotate(${rotasjon}deg)`, transformOrigin: `${C}px ${C}px`,
              transition: snurrer ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}>
              {skiver.map((s, i) => (
                <g key={i}>
                  <path d={s.d} fill={s.farge} stroke="#fff" strokeWidth="2" />
                  {n > 1 && (
                    <text x={s.tx} y={s.ty} fill={s.tekst} fontSize={fontSize} fontWeight="600" textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${s.midt}, ${s.tx}, ${s.ty})`}>
                      {s.lek.tittel.length > 18 ? s.lek.tittel.slice(0, 17) + '…' : s.lek.tittel}
                    </text>
                  )}
                  {n > 1 && <circle cx={s.px} cy={s.py} r="4" fill="#fff" />}
                </g>
              ))}
            </g>

            {/* nav med TL-logo */}
            <circle cx={C} cy={C} r="36" fill="#fff" stroke="#F3A712" strokeWidth="4" />
            <image href="/tl-logo.png" x={C - 26} y={C - 30} width="52" height="60" preserveAspectRatio="xMidYMid meet" />

            {/* peker */}
            <path d="M160 44 L142 6 L178 6 Z" fill="#8a5a2b" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <button onClick={snurr} disabled={snurrer}
        className="mt-5 bg-magenta text-white font-semibold px-8 py-3 rounded-full hover:bg-magenta/90 transition disabled:opacity-50">
        {snurrer ? 'Snurrer …' : 'Snurr hjulet'}
      </button>

      {/* Vinner-modal */}
      <div aria-live="polite">
        {vinner && !snurrer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setVinner(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setVinner(null)} aria-label="Lukk" className="absolute top-3 right-4 text-gray-300 hover:text-gray-500 text-xl">×</button>
              <h3 className="text-2xl font-bold text-magenta">{vinner.tittel}</h3>
              <div className="flex justify-center my-3"><Rosett /></div>

              {visVideo && vinner.harVideo && (
                <div className="relative w-full mb-3" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${vinner.video.bunny_video_id}?autoplay=true&preload=true`}
                    loading="lazy" className="absolute inset-0 w-full h-full rounded-xl border-0"
                    allow="accelerometer;gyroscope;encrypted-media;picture-in-picture;autoplay" allowFullScreen title={vinner.tittel} />
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                {vinner.harVideo && !visVideo && (
                  <button onClick={() => setVisVideo(true)} className="bg-orange text-white font-medium py-2.5 rounded-full hover:bg-orange/90">▶ Spill video</button>
                )}
                {kanApneLek && (vinner.ressursId ?? vinner.id) && (
                  <Link to={`/min-side/aktiviteter/${vinner.ressursId ?? vinner.id}`} className="bg-magenta text-white font-medium py-2.5 rounded-full hover:bg-magenta/90">Gå til aktivitet</Link>
                )}
                <button onClick={() => { setVinner(null); snurr() }} className="text-gray-500 hover:text-magenta text-sm py-1">Snurr igjen</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
