import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const EPOST_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function Kontakt() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ navn: '', epost: '', skole: '', melding: '' })
  const [feil, setFeil] = useState({})          // per-felt: { navn: 'melding', ... }
  const [serverFeil, setServerFeil] = useState(null)
  const [sender, setSender] = useState(false)
  const [sent, setSent] = useState(false)
  const feltRefs = { navn: useRef(null), epost: useRef(null), melding: useRef(null) }
  const oppsummeringRef = useRef(null)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function valider() {
    const f = {}
    if (!form.navn.trim()) f.navn = t('kontakt.feilNavn')
    if (!form.epost.trim()) f.epost = t('kontakt.feilEpostMangler')
    else if (!EPOST_RE.test(form.epost.trim())) f.epost = t('kontakt.feilEpostUgyldig')
    if (!form.melding.trim()) f.melding = t('kontakt.feilMelding')
    return f
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerFeil(null)
    const f = valider()
    setFeil(f)
    if (Object.keys(f).length > 0) {
      // Flytt fokus til feiloppsummeringen (WCAG 3.3.1 / 2.4.3).
      requestAnimationFrame(() => oppsummeringRef.current?.focus())
      return
    }

    setSender(true)
    try {
      const res = await fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          navn: form.navn.trim(),
          epost: form.epost.trim(),
          skole: form.skole.trim(),
          melding: form.melding.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // «Takk» skal ALDRI vises uten et OK-svar fra serveren.
        setServerFeil(data.error || t('kontakt.sendFeil'))
        requestAnimationFrame(() => oppsummeringRef.current?.focus())
        return
      }
      setSent(true)
    } catch {
      setServerFeil(t('kontakt.nettverksfeil'))
      requestAnimationFrame(() => oppsummeringRef.current?.focus())
    } finally {
      setSender(false)
    }
  }

  // Telefonnummeret var en plassholder («+47 000 00 000»). Fjernet heller enn å vise et
  // falskt nummer (se TIL-CLAUDE-notatet: et ekte kontaktnummer mangler).
  const contactItems = [
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
      label: t('kontakt.epostLabel'),
      value: 'post@trivselsleder.no',
      href: 'mailto:post@trivselsleder.no',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
      label: t('kontakt.adresseLabel'),
      value: t('kontakt.adresseVerdi'),
      href: null,
    },
  ]

  const fields = [
    { name: 'navn', labelKey: 'kontakt.navnLabel', type: 'text', placeholderKey: 'kontakt.navnPlaceholder', pakrevd: true },
    { name: 'epost', labelKey: 'kontakt.epostSkjemaLabel', type: 'email', placeholderKey: 'kontakt.epostPlaceholder', pakrevd: true },
    { name: 'skole', labelKey: 'kontakt.skoleLabel', type: 'text', placeholderKey: 'kontakt.skolePlaceholder', pakrevd: false },
  ]

  // Rekkefølge for feiloppsummeringens lenker (skjemaets rekkefølge).
  const feilRekke = ['navn', 'epost', 'melding'].filter((k) => feil[k])

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
                  <svg className="w-5 h-5 text-orange-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {item.icon}
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-0.5">{item.label}</div>
                  {item.href ? (
                    <a href={item.href} className="text-gray-800 font-medium hover:text-orange-ink transition-colors">
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
            <div className="bg-orange/10 border border-orange/30 rounded-2xl p-8 text-center" role="status">
              <svg className="w-12 h-12 text-orange-ink mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{t('kontakt.takkTitle')}</h3>
              <p className="text-gray-600">{t('kontakt.takkIngress')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Feiloppsummering — får fokus ved feil, leses av skjermleser (role=alert). */}
              {(feilRekke.length > 0 || serverFeil) && (
                <div
                  ref={oppsummeringRef}
                  tabIndex={-1}
                  role="alert"
                  className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  {serverFeil ? (
                    <p>{serverFeil}</p>
                  ) : (
                    <>
                      <p className="font-semibold mb-2">{t('kontakt.feilOppsummeringTittel')}</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feilRekke.map((k) => (
                          <li key={k}>
                            <a href={`#${k}`} className="underline hover:no-underline" onClick={(e) => { e.preventDefault(); feltRefs[k]?.current?.focus() }}>
                              {feil[k]}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {fields.map((field) => {
                const harFeil = Boolean(feil[field.name])
                return (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={field.name}>
                      {t(field.labelKey)}
                      {field.pakrevd && <span className="text-red-700" aria-hidden="true"> *</span>}
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      ref={feltRefs[field.name]}
                      type={field.type}
                      placeholder={t(field.placeholderKey)}
                      value={form[field.name]}
                      onChange={handleChange}
                      required={field.pakrevd}
                      aria-required={field.pakrevd}
                      aria-invalid={harFeil}
                      aria-describedby={harFeil ? `${field.name}-feil` : undefined}
                      className={`w-full border rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition ${harFeil ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-orange/50 focus:border-orange'}`}
                    />
                    {harFeil && (
                      <p id={`${field.name}-feil`} className="mt-1 text-sm text-red-700">{feil[field.name]}</p>
                    )}
                  </div>
                )
              })}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="melding">
                  {t('kontakt.meldingLabel')}
                  <span className="text-red-700" aria-hidden="true"> *</span>
                </label>
                <textarea
                  id="melding"
                  name="melding"
                  ref={feltRefs.melding}
                  rows={4}
                  placeholder={t('kontakt.meldingPlaceholder')}
                  value={form.melding}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(feil.melding)}
                  aria-describedby={feil.melding ? 'melding-feil' : undefined}
                  className={`w-full border rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition resize-none ${feil.melding ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-orange/50 focus:border-orange'}`}
                />
                {feil.melding && (
                  <p id="melding-feil" className="mt-1 text-sm text-red-700">{feil.melding}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={sender}
                className="w-full bg-orange text-gray-900 font-semibold py-3 rounded-full hover:bg-orange/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sender ? t('kontakt.sender') : t('kontakt.sendKnapp')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
