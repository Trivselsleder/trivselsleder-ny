import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ForSkoler() {
  const { t } = useTranslation()

  const steps = [
    { number: '1', titleKey: 'forSkoler.step1Title', descKey: 'forSkoler.step1Desc' },
    { number: '2', titleKey: 'forSkoler.step2Title', descKey: 'forSkoler.step2Desc' },
    { number: '3', titleKey: 'forSkoler.step3Title', descKey: 'forSkoler.step3Desc' },
    { number: '4', titleKey: 'forSkoler.step4Title', descKey: 'forSkoler.step4Desc' },
  ]

  const included = [
    'forSkoler.inkludert1',
    'forSkoler.inkludert2',
    'forSkoler.inkludert3',
    'forSkoler.inkludert4',
    'forSkoler.inkludert5',
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('forSkoler.title')}</h1>
      <p className="text-lg text-gray-500 mb-12">{t('forSkoler.ingress')}</p>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('forSkoler.slikFungererTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange text-white font-bold flex items-center justify-center text-lg">
                {step.number}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{t(step.titleKey)}</h3>
                <p className="text-gray-600 text-sm">{t(step.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16 bg-gray-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('forSkoler.inkludertTitle')}</h2>
        <ul className="space-y-3">
          {included.map((key) => (
            <li key={key} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">{t(key)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-gradient-to-r from-orange to-magenta rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">{t('forSkoler.ctaTitle')}</h2>
        <p className="mb-6 text-white/90">{t('forSkoler.ctaIngress')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/kontakt"
            className="bg-white text-orange font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-colors"
          >
            {t('forSkoler.ctaMeld')}
          </Link>
          <Link
            to="/kontakt"
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
          >
            {t('forSkoler.ctaKontakt')}
          </Link>
        </div>
      </section>
    </div>
  )
}
