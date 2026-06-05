import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Kontakt() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ navn: '', epost: '', skole: '', melding: '' })
  const [sent, setSent] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  const contactItems = [
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
      label: t('kontakt.epostLabel'),
      value: 'post@trivselsleder.no',
      href: 'mailto:post@trivselsleder.no',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
      label: t('kontakt.telefonLabel'),
      value: '+47 000 00 000',
      href: 'tel:+4700000000',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
      label: t('kontakt.adresseLabel'),
      value: t('kontakt.adresseVerdi'),
      href: null,
    },
  ]

  const fields = [
    { name: 'navn', labelKey: 'kontakt.navnLabel', type: 'text', placeholderKey: 'kontakt.navnPlaceholder' },
    { name: 'epost', labelKey: 'kontakt.epostSkjemaLabel', type: 'email', placeholderKey: 'kontakt.epostPlaceholder' },
    { name: 'skole', labelKey: 'kontakt.skoleLabel', type: 'text', placeholderKey: 'kontakt.skolePlaceholder' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('kontakt.title')}</h1>
      <p className="text-lg text-gray-500 mb-12">{t('kontakt.ingress')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('kontakt.kontaktInfoTitle')}</h2>
          <div className="space-y-5">
            {contactItems.map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-0.5">{item.label}</div>
                  {item.href ? (
                    <a href={item.href} className="text-gray-800 font-medium hover:text-orange transition-colors">
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-gray-800 font-medium">{item.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('kontakt.skjemaTitle')}</h2>
          {sent ? (
            <div className="bg-orange/10 border border-orange/30 rounded-2xl p-8 text-center">
              <svg className="w-12 h-12 text-orange mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{t('kontakt.takkTitle')}</h3>
              <p className="text-gray-600">{t('kontakt.takkIngress')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={field.name}>
                    {t(field.labelKey)}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    placeholder={t(field.placeholderKey)}
                    value={form[field.name]}
                    onChange={handleChange}
                    required={field.name !== 'skole'}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange transition"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="melding">
                  {t('kontakt.meldingLabel')}
                </label>
                <textarea
                  id="melding"
                  name="melding"
                  rows={4}
                  placeholder={t('kontakt.meldingPlaceholder')}
                  value={form.melding}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange transition resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange text-white font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors"
              >
                {t('kontakt.sendKnapp')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
