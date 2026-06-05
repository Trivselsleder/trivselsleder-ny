import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navLinks = [
  { label: 'Om oss', to: '/om-oss' },
  { label: 'For skoler', to: '/for-skoler' },
  { label: 'Kulturkortet', to: '/kulturkortet' },
  { label: 'Kontakt', to: '/kontakt' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const activeClass = 'text-orange'
  const baseClass = 'text-gray-700 hover:text-orange font-medium transition-colors'

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange">Trivselsleder</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? `${baseClass} ${activeClass}` : baseClass
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/logg-inn"
              className="bg-magenta text-white px-4 py-2 rounded-full font-medium hover:bg-magenta/90 transition-colors"
            >
              Logg inn
            </Link>
          </nav>

          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-orange"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Meny"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                isActive
                  ? 'font-medium text-lg text-orange'
                  : 'text-gray-700 font-medium text-lg hover:text-orange'
              }
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/logg-inn"
            className="bg-magenta text-white px-4 py-3 rounded-full font-medium text-center hover:bg-magenta/90 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Logg inn
          </Link>
        </div>
      )}
    </header>
  )
}
