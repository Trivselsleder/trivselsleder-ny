import { NavLink, Outlet } from 'react-router-dom'

const faner = [
  { label: 'Min side', to: '/min-side', end: true },
  { label: 'Administratorer', to: '/min-side/administratorer' },
  { label: 'Ansatte', to: '/min-side/ansatte' },
  { label: 'Kundeinformasjon', to: '/min-side/kundeinformasjon' },
  { label: 'Bestillinger', to: '/min-side/bestillinger' },
  { label: 'Dokumenter', to: '/min-side/dokumenter' },
  { label: 'Aktiviteter', to: '/min-side/aktiviteter' },
  { label: 'Move it', to: '/min-side/move-it' },
  { label: 'Aktiv læring', to: '/min-side/aktiv-laering' },
  { label: 'Periodeplaner', to: '/min-side/periodeplaner' },
  { label: 'TL-hjulet', to: '/min-side/tl-hjulet' },
  { label: 'Drift av TL', to: '/min-side/drift-av-tl' },
]

export default function SkoleLayout() {
  return (
    <div>
      <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
        <nav className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {faner.map((f) => (
              <NavLink
                key={f.to}
                to={f.to}
                end={f.end}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-orange text-orange'
                      : 'border-transparent text-gray-600 hover:text-orange hover:border-gray-300'
                  }`
                }
              >
                {f.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
      <div className="py-6">
        <Outlet />
      </div>
    </div>
  )
}
