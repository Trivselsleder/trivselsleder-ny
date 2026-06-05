import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Header() {
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: t('nav.omOss'), to: '/om-oss' },
    { label: t('nav.forSkoler'), to: '/for-skoler' },
    { label: t('nav.kulturkortet'), to: '/kulturkortet' },
    { label: t('nav.kontakt'), to: '/kontakt' },
  ]

  const baseClass = 'text-gray-700 hover:text-orange font-medium transition-colors'
  const activeClass = 'text-orange'

  const otherLang = i18n.language === 'sv' ? 'no' : 'sv'
  const langLabel = i18n.language === 'sv' ? '🇳🇴 NO' : '🇸🇪 SV'

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
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? `${baseClass} ${activeClass}` : baseClass
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              onClick={() => i18n.changeLanguage(otherLang)}
              className="text-sm text-gray-500 hover:text-orange font-medium transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
              title={otherLang === 'sv' ? 'Byt till svenska' : 'Bytt til norsk'}
            >
              {langLabel}
            </button>
            <Link
              to="/logg-inn"
              className="bg-magenta text-white px-4 py-2 rounded-full font-medium hover:bg-magenta/90 transition-colors"
            >
              {t('nav.loggInn')}
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
              key={link.to}
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
          <button
            onClick={() => { i18n.changeLanguage(otherLang); setMenuOpen(false) }}
            className="text-left text-gray-600 font-medium text-lg hover:text-orange"
          >
            {langLabel}
          </button>
          <Link
            to="/logg-inn"
            className="bg-magenta text-white px-4 py-3 rounded-full font-medium text-center hover:bg-magenta/90 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.loggInn')}
          </Link>
        </div>
      )}
    </header>
  )
}
