import { useEffect, useRef, useState } from 'react'
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
  const ref = useRef(null)
  const { pathname } = useLocation()
  const skolenMinAktiv = skolenMin.some((s) => pathname.startsWith(s.to))

  useEffect(() => { setApen(false) }, [pathname])
  useEffect(() => {
    function utenfor(e) { if (ref.current && !ref.current.contains(e.target)) setApen(false) }
    document.addEventListener('mousedown', utenfor)
    return () => document.removeEventListener('mousedown', utenfor)
  }, [])

  return (
    <div>
      <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
        <nav className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max items-center">
            {faner.map((f) => (
              <NavLink key={f.to} to={f.to} end={f.end} className={lenkeCls}>{f.label}</NavLink>
            ))}

            {/* Skolen min ▾ – samler skolens egen administrasjon */}
            <div className="relative" ref={ref}>
              <button
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
              {apen && (
                <div className="absolute right-0 sm:left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                  {skolenMin.map((s) => (
                    <NavLink
                      key={s.to}
                      to={s.to}
                      className={({ isActive }) =>
                        `block px-4 py-2.5 text-sm transition-colors ${
                          isActive ? 'text-orange bg-orange/5 font-medium' : 'text-gray-600 hover:text-orange hover:bg-gray-50'
                        }`
                      }
                    >
                      {s.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
      <div className="py-6">
        <Outlet />
      </div>
    </div>
  )
}
