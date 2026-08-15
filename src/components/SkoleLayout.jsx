import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

// Ny informasjonsarkitektur (IA-skolens-side-forslag): tydelige innganger
// + samlemeny «Skolen min». Aktiv læring er egen fane (eget innhold: Fag + Trinn).
const faner = [
  { label: 'Min side', to: '/min-side', end: true },
  { label: 'Finn en lek', to: '/min-side/aktiviteter' },
  { label: 'Aktiv læring', to: '/min-side/aktiv-laering' },
  { label: 'Periodeplaner', to: '/min-side/periodeplaner' },
  { label: 'TL-hjul', to: '/min-side/tl-hjulet' },
  { label: 'Maler & materiell', to: '/min-side/dokumenter' },
  { label: 'Slik lykkes du med TL', to: '/min-side/drift-av-tl' },
]

const skolenMin = [
  { label: 'Administratorer', to: '/min-side/administratorer' },
  { label: 'Ansatte', to: '/min-side/ansatte' },
  { label: 'Kundeinformasjon', to: '/min-side/kundeinformasjon' },
  { label: 'Bestillinger', to: '/min-side/bestillinger' },
]

const lenkeCls = ({ isActive }) =>
  `whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
    isActive ? 'border-orange text-orange' : 'border-transparent text-gray-600 hover:text-orange hover:border-gray-300'
  }`

export default function SkoleLayout() {
  const [apen, setApen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const knappRef = useRef(null)
  const menyRef = useRef(null)
  const { pathname } = useLocation()
  const skolenMinAktiv = skolenMin.some((s) => pathname.startsWith(s.to))

  function plasser() {
    const r = knappRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) })
  }
  // Portal-menyen posisjoneres fra knappens rect → slipper unna at fane-raden
  // har overflow (som ellers klipper et vanlig absolutt nedtrekk).
  useLayoutEffect(() => { if (apen) plasser() }, [apen])
  useEffect(() => { setApen(false) }, [pathname])
  useEffect(() => {
    if (!apen) return
    function utenfor(e) {
      if (knappRef.current?.contains(e.target)) return
      if (menyRef.current?.contains(e.target)) return
      setApen(false)
    }
    function reposEllerLukk() { setApen(false) }
    document.addEventListener('mousedown', utenfor)
    window.addEventListener('resize', reposEllerLukk)
    window.addEventListener('scroll', reposEllerLukk, true)
    return () => {
      document.removeEventListener('mousedown', utenfor)
      window.removeEventListener('resize', reposEllerLukk)
      window.removeEventListener('scroll', reposEllerLukk, true)
    }
  }, [apen])

  return (
    <div>
      <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
        <nav className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max items-center">
            {faner.map((f) => (
              <NavLink key={f.to} to={f.to} end={f.end} className={lenkeCls}>{f.label}</NavLink>
            ))}

            {/* Skolen min ▾ – samler skolens egen administrasjon */}
            <button
              ref={knappRef}
              onClick={() => setApen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={apen}
              className={`whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                skolenMinAktiv ? 'border-orange text-orange' : 'border-transparent text-gray-600 hover:text-orange hover:border-gray-300'
              }`}
            >
              Skolen min
              <span className={`text-[10px] transition-transform ${apen ? 'rotate-180' : ''}`}>▾</span>
            </button>
          </div>
        </nav>
      </div>

      {apen && createPortal(
        <div
          ref={menyRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 60 }}
          className="w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        >
          {skolenMin.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              onClick={() => setApen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'text-orange bg-orange/5 font-medium' : 'text-gray-600 hover:text-orange hover:bg-gray-50'
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </div>,
        document.body,
      )}

      <div className="py-6">
        <Outlet />
      </div>
    </div>
  )
}
