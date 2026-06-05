import { useTranslation } from 'react-i18next'

export default function OmOss() {
  const { t } = useTranslation()

  const cards = [
    { titleKey: 'omOss.inkluderingTitle', descKey: 'omOss.inkluderingDesc' },
    { titleKey: 'omOss.aktivitetTitle', descKey: 'omOss.aktivitetDesc' },
    { titleKey: 'omOss.ansvarTitle', descKey: 'omOss.ansvarDesc' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('omOss.title')}</h1>
      <p className="text-lg text-gray-500 mb-12">{t('omOss.ingress')}</p>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('omOss.selskapTitle')}</h2>
        <div className="prose prose-lg text-gray-600 space-y-4">
          <p>{t('omOss.selskapP1')}</p>
          <p>{t('omOss.selskapP2')}</p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('omOss.programTitle')}</h2>
        <div className="text-gray-600 space-y-4 text-lg">
          <p dangerouslySetInnerHTML={{ __html: t('omOss.programP1') }} />
          <p>{t('omOss.programP2')}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.titleKey} className="bg-orange/5 border border-orange/20 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-2">{t(card.titleKey)}</h3>
              <p className="text-gray-600 text-sm">{t(card.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('omOss.misjonTitle')}</h2>
        <blockquote className="border-l-4 border-orange pl-6 text-xl text-gray-700 italic">
          {t('omOss.misjonSitat')}
        </blockquote>
      </section>
    </div>
  )
}
