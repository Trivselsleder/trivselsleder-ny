import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const BUNNY_LIB = '727245'

// Geometri (sentrert i 0,0)
const R = 150          // ytre radius kaker
const RIM = 166        // felg
const HUB = 42         // nav
const VB = 190         // halv viewBox

// TL-palett v2.0 (varm, på identitet) – per posisjon, ikke per lek.
const PALETT = ['#FF7B31', '#F2B01E', '#CF442F', '#106C75', '#54A1AB', '#7FB069']

function polar(deg, radius) {
  const r = ((deg - 90) * Math.PI) / 180
  return [radius * Math.cos(r), radius * Math.sin(r)]
}
function kile(a0, a1, radius) {
  const [x0, y0] = polar(a0, radius)
  const [x1, y1] = polar(a1, radius)
  const stor = a1 - a0 > 180 ? 1 : 0
  return `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${radius} ${radius} 0 ${stor} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
}

// Deterministisk trekk (unngår hydrerings-uro): tid + teller.
function nesteTrekk(teller) {
  const t = Date.now()
  return ((t % 997) / 997 + teller * 0.6180339887) % 1
}

// -------- Lyd (WebAudio, syntetisk, av/på) --------
function lagLyd() {
  let ctx = null
  const sikre = () => {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') ctx.resume()
    } catch { ctx = null }
    return ctx
  }
  const tone = ({ f = 440, type = 'square', t = 0, a = 0.005, d = 0.1, v = 0.2, slide = 0 }) => {
    const c = sikre(); if (!c) return
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t
    o.type = type; o.frequency.setValueAtTime(f, t0)
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + a + d)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(v, t0 + a)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + a + d)
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + a + d + 0.05)
  }
  return {
    vekk: sikre,
    tick: () => tone({ f: 1400, type: 'square', a: 0.001, d: 0.03, v: 0.06 }),
    count: (final) => tone({ f: final ? 880 : 440, type: 'sine', a: 0.01, d: final ? 0.4 : 0.16, v: 0.28 }),
    win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ f, type: 'sawtooth', t: i * 0.12, a: 0.01, d: 0.5, v: 0.12 })),
    boom: () => tone({ f: 150, slide: 40, type: 'sine', a: 0.005, d: 0.6, v: 0.4 }),
  }
}

function Konfetti({ kjor }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!kjor) return
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = cv.clientWidth, H = cv.clientHeight
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const COLS = ['#FF7B31', '#CF442F', '#F2B01E', '#106C75', '#54A1AB', '#ffffff']
    const parts = []
    const cannon = (x, dir) => {
      for (let i = 0; i < 90; i++) {
        const a = (-90 + dir * (16 + Math.random() * 30)) * Math.PI / 180
        const sp = 8 + Math.random() * 10
        parts.push({ x, y: H + 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          w: 5 + Math.random() * 6, h: 4 + Math.random() * 5, r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3, c: COLS[(Math.random() * COLS.length) | 0],
          shape: Math.random() < 0.3 ? 'c' : 'r', life: 150 + Math.random() * 60 })
      }
    }
    cannon(W * 0.08, 1); cannon(W * 0.92, -1)
    let raf, alive = true
    const loop = () => {
      if (!alive) return
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.life--; p.vy += 0.16; p.x += p.vx; p.y += p.vy; p.r += p.vr
        if (p.life <= 0) continue
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r)
        ctx.globalAlpha = Math.min(1, p.life / 40); ctx.fillStyle = p.c
        if (p.shape === 'c') { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 7); ctx.fill() }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (parts.some((p) => p.life > 0 && p.y < H + 40)) raf = requestAnimationFrame(loop)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [kjor])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60] w-full h-full" aria-hidden />
}

export default function Lykkehjul({ leker, rotasjoner = 6, skriftstorrelse = 20, kanApneLek = true, kategoriNavn = null }) {
  const [rotasjon, setRotasjon] = useState(0)
  const [fase, setFase] = useState('idle')       // idle | countdown | spinning | winner
  const [nedtelling, setNedtelling] = useState(null)
  const [vinner, setVinner] = useState(null)
  const [visVideo, setVisVideo] = useState(false)
  const [lyd, setLyd] = useState(true)
  const tellerRef = useRef(0)
  const lydRef = useRef(null)
  const timers = useRef([])

  useEffect(() => { lydRef.current = lagLyd() }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const senere = (fn, ms) => { const id = window.setTimeout(fn, ms); timers.current.push(id); return id }

  const n = leker.length
  const seg = n > 0 ? 360 / n : 360
  const fontSize = Math.max(9, Math.min(skriftstorrelse, n > 14 ? 10 : n > 10 ? 13 : n > 6 ? 17 : skriftstorrelse))
  const maxTegn = n > 14 ? 12 : n > 10 ? 16 : n > 6 ? 22 : 30

  const skiver = useMemo(() => {
    if (n === 0) return []
    return leker.map((lek, i) => {
      const a0 = i * seg, a1 = a0 + seg
      const midt = a0 + seg / 2
      const farge = PALETT[i % PALETT.length]
      const [px, py] = polar(a0, R - 8)
      let tekst = lek.tittel || ''
      if (tekst.length > maxTegn) tekst = tekst.slice(0, maxTegn - 1) + '…'
      return { d: kile(a0, a1, R), midt, farge, px, py, tekst }
    })
  }, [leker, n, seg, maxTegn])

  function snurr() {
    if (fase === 'countdown' || fase === 'spinning' || n === 0) return
    setVinner(null); setVisVideo(false)
    lydRef.current?.vekk()
    setFase('countdown')
    // 3-2-1
    const tall = [3, 2, 1]
    tall.forEach((t, i) => senere(() => {
      setNedtelling(t)
      if (lyd) lydRef.current?.count(false)
    }, i * 620))
    senere(() => { setNedtelling(null); startRotasjon() }, tall.length * 620)
  }

  function startRotasjon() {
    setFase('spinning')
    tellerRef.current += 1
    const trekk = nesteTrekk(tellerRef.current)
    const vinnerIndex = Math.floor(trekk * n) % n
    const midt = vinnerIndex * seg + seg / 2
    const runder = 360 * Math.max(3, rotasjoner)
    const naa = ((rotasjon % 360) + 360) % 360
    const maalMod = (360 - midt) % 360
    const delta = (maalMod - naa + 360) % 360
    const total = runder + delta
    const varighet = 4200
    setRotasjon((r) => r + total)

    // tikk-lyd med avtakende tempo
    if (lyd) {
      const antall = Math.min(48, Math.max(14, n * 3))
      for (let i = 0; i < antall; i++) {
        const p = i / antall
        const naar = (1 - Math.pow(1 - p, 3)) * (varighet - 250)
        senere(() => lydRef.current?.tick(), naar)
      }
    }
    senere(() => {
      const v = leker[vinnerIndex]
      setVinner(v); setFase('winner')
      if (lyd) { lydRef.current?.boom(); lydRef.current?.win() }
    }, varighet + 60)
  }

  function lukk() { setVinner(null); setVisVideo(false); setFase('idle') }

  if (n === 0) {
    return <div className="text-center text-gray-400 py-12">Legg til minst ett kakestykke (lek eller fri tekst) for å snurre.</div>
  }

  const ribbon = vinner?.fri ? '🎉 VINNEREN 🎉' : '🏆 DAGENS LEK 🏆'

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full rounded-3xl overflow-hidden shadow-sm" style={{ maxWidth: 460 }}>
        {/* varm TL-bakgrunn med bølger */}
        <svg viewBox="0 0 460 520" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="tlbg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFB755" /><stop offset="0.45" stopColor="#FFE3A6" /><stop offset="1" stopColor="#FFF4DD" />
            </linearGradient>
          </defs>
          <rect width="460" height="520" fill="url(#tlbg)" />
          <path d="M0 150 C120 110 220 190 330 150 C400 125 440 165 460 150 V0 H0 Z" fill="#FFC978" opacity="0.5" />
          <path d="M0 330 C130 290 250 380 360 330 V150 C250 200 130 110 0 160 Z" fill="#FFD98A" opacity="0.45" />
        </svg>

        {/* ticker */}
        <div className="relative z-10 mx-3 mt-3 rounded-xl text-white text-[11px] font-black tracking-widest text-center py-1.5 overflow-hidden"
          style={{ background: 'linear-gradient(90deg,#FF7B31,#F2B01E)' }}>
          ★ ER DERE KLARE? ★ {kategoriNavn ? kategoriNavn.toUpperCase() + ' ★' : 'DAGENS AKTIVITET ★'}
        </div>

        {/* lyd-knapp */}
        <button onClick={() => setLyd((v) => !v)} aria-pressed={lyd} aria-label="Skru lyd av eller på"
          className="absolute top-3 right-4 z-20 w-9 h-9 rounded-full bg-white/80 border border-orange/30 text-lg leading-none">
          {lyd ? '🔊' : '🔇'}
        </button>

        <div className="relative z-10 px-4 pt-2 pb-4">
          <svg viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`} className="w-full h-auto" role="img"
            aria-label={`TL-hjulet med ${n} felt`}>
            {/* felg */}
            <circle r={RIM} fill="url(#tlbg)" stroke="#F2B01E" strokeWidth="6" />
            <circle r={RIM - 6} fill="none" stroke="#fff" strokeWidth="2" opacity="0.85" />
            {/* roterende hjul */}
            <g style={{
              transform: `rotate(${rotasjon}deg)`, transformOrigin: '0px 0px',
              transition: fase === 'spinning' ? 'transform 4.2s cubic-bezier(0.16,0.73,0.12,1)' : 'none',
            }}>
              {skiver.map((s, i) => (
                <g key={i}>
                  <path d={s.d} fill={s.farge} stroke="rgba(255,255,255,.65)" strokeWidth="2" />
                  {n > 1 && (
                    <g transform={`rotate(${s.midt - 90})`}>
                      <text x={R - 14} y="0" textAnchor="end" dominantBaseline="middle"
                        fontSize={fontSize} fontWeight="800" fill="#fff"
                        style={{ paintOrder: 'stroke', stroke: 'rgba(20,30,20,.5)', strokeWidth: 3, strokeLinejoin: 'round' }}>
                        {s.tekst}
                      </text>
                    </g>
                  )}
                  {n > 1 && <circle cx={s.px} cy={s.py} r="3.5" fill="#fff" />}
                </g>
              ))}
            </g>
            {/* nav med ekte TL-logo */}
            <circle r={HUB} fill="#fff" stroke="#20303a" strokeWidth="3" />
            <image href="/tl-logo.png" x={-HUB + 8} y={-HUB + 6} width={HUB * 2 - 16} height={HUB * 2 - 12}
              preserveAspectRatio="xMidYMid meet" />
            {/* peker (topp) */}
            <g transform={`translate(0 ${-RIM + 6})`}>
              <path d="M-15 -10 Q0 -16 15 -10 L4 34 Q0 39 -4 34 Z" fill="#fff" stroke="#20303a" strokeWidth="3" />
              <circle r="5.5" fill="#FF7B31" stroke="#20303a" strokeWidth="2.5" />
            </g>
          </svg>
        </div>

        {/* nedtelling-overlegg */}
        {nedtelling != null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <span className="text-white font-black" style={{ fontSize: 160, textShadow: '0 0 24px rgba(255,123,49,.9)' }}>{nedtelling}</span>
          </div>
        )}
      </div>

      <button onClick={snurr} disabled={fase === 'countdown' || fase === 'spinning'}
        className="mt-5 text-white font-black tracking-wide px-10 py-3.5 rounded-full transition disabled:opacity-50 shadow-lg"
        style={{ background: 'linear-gradient(115deg,#FF7B31,#CF442F)', fontSize: 22 }}>
        {fase === 'spinning' ? 'Snurrer …' : fase === 'countdown' ? 'Klar …' : 'SNURR!'}
      </button>

      <Konfetti kjor={fase === 'winner' && !vinner?.fri ? true : fase === 'winner'} />

      {/* Vinner-kort */}
      <div aria-live="polite">
        {vinner && fase === 'winner' && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 px-4" onClick={lukk}>
            <div className="rounded-3xl shadow-2xl w-full max-w-md p-1"
              style={{ background: 'linear-gradient(135deg,#FF7B31,#F2B01E,#CF442F,#FF7B31)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="bg-[#fffaf2] rounded-[22px] p-6 text-center relative">
                <button onClick={lukk} aria-label="Lukk" className="absolute top-3 right-4 text-gray-300 hover:text-gray-500 text-xl">×</button>
                <img src="/tl-logo.png" alt="Trivselsleder" className="h-8 mx-auto mb-1" />
                <div className="inline-block text-[13px] font-black tracking-widest px-4 py-1 rounded-full mb-3"
                  style={{ color: '#b8611a', background: '#fff5e6', border: '1px solid #f0a94a' }}>{ribbon}</div>

                <h3 className="text-3xl font-black" style={{ color: '#CF442F' }}>{vinner.tittel}</h3>

                {!vinner.fri && (vinner.egnet?.length > 0 || vinner.utstyr?.length > 0) && (
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {vinner.egnet?.slice(0, 2).map((e, i) => (
                      <span key={'e' + i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-orange/30 text-gray-600">📍 {e}</span>
                    ))}
                    {vinner.utstyr?.slice(0, 2).map((u, i) => (
                      <span key={'u' + i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-orange/30 text-gray-600">🎒 {u}</span>
                    ))}
                  </div>
                )}

                {visVideo && vinner.harVideo && (
                  <div className="relative w-full mt-4" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${vinner.video.bunny_video_id}?autoplay=true&preload=true`}
                      loading="lazy" className="absolute inset-0 w-full h-full rounded-xl border-0"
                      allow="accelerometer;gyroscope;encrypted-media;picture-in-picture;autoplay" allowFullScreen title={vinner.tittel} />
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-5">
                  {!vinner.fri && vinner.harVideo && !visVideo && (
                    <button onClick={() => setVisVideo(true)} className="text-white font-bold py-2.5 rounded-full"
                      style={{ background: 'linear-gradient(115deg,#FF7B31,#CF442F)' }}>▶ Spill video</button>
                  )}
                  {!vinner.fri && kanApneLek && vinner.ressursId && (
                    <Link to={`/min-side/aktiviteter/${vinner.ressursId}`}
                      className="font-bold py-2.5 rounded-full border-2"
                      style={{ borderColor: '#e6b483', color: '#8a5116' }}>
                      Gå til aktivitet →
                    </Link>
                  )}
                  <button onClick={() => { lukk(); senere(snurr, 300) }} className="text-gray-500 hover:text-orange text-sm py-1">↻ Snurr igjen</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
