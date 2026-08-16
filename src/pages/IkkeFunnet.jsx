import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

export default function IkkeFunnet() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center px-4 py-20">
      <div className="max-w-xl text-center">
        <p className="text-6xl font-bold text-[#106C75] mb-4">404</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {t('ikkeFunnet.tittel')}
        </h1>
        <p className="text-gray-600 mb-2">{t('ikkeFunnet.ingress')}</p>
        <p className="text-sm text-gray-500 mb-8 break-all">
          {t('ikkeFunnet.adresse')}: {pathname}
        </p>
        <Link
          to="/"
          className="inline-block bg-[#106C75] text-white font-bold px-8 py-3 rounded-full hover:bg-[#0b4d54] transition-colors"
        >
          {t('ikkeFunnet.tilForsiden')}
        </Link>
      </div>
    </div>
  )
}
