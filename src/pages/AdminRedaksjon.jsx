import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Redaksjon-samlesiden (D3). Ett nivå under Admin. Samme kortmønster som Admin-panelet.
// Utvidbar: D4 (redaksjonskø) og D5 (dokumenter) legges inn som nye kort i `kort`-lista senere.
const kort = [
  { i18n: 'redaksjon.tekster', ikon: '✏️', til: '/admin/tekster' },
  { i18n: 'redaksjon.leker', ikon: '🎲', til: '/admin/redaksjon/leker' },
  { i18n: 'redaksjon.ko', ikon: '🗂️', til: '/admin/redaksjon/ko' },
  { i18n: 'redaksjon.dokumenter', ikon: '📄', til: '/admin/redaksjon/dokumenter' },
]

export default function AdminRedaksjon() {
  const { t } = useTranslation()
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-orange-ink mb-2">{t('redaksjon.tittel')}</h1>
      <p className="text-gray-500 mb-10">{t('redaksjon.undertittel')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {kort.map((k) => (
          <Link
            key={k.til}
            to={k.til}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-orange hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">{k.ikon}</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-ink transition-colors">
              {t(k.i18n + '.tittel')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t(k.i18n + '.beskrivelse')}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
