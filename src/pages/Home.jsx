import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentOffentligeWebinarer, datoLang, klokkeslett } from '../lib/webinar'
import SkoleOversikt from '../components/SkoleOversikt'

export default function Home() {
  const { t } = useTranslation()

  const stats = [
    { number: t('home.stat1Number'), label: t('home.stat1Label') },
    { number: t('home.stat2Number'), label: t('home.stat2Label') },
    { number: t('home.stat3Number'), label: t('home.stat3Label') },
  ]

  const [nesteWebinar, setNesteWebinar] = useState(null)
  useEffect(() => {
    let aktiv = true
    hentOffentligeWebinarer().then((l) => { if (aktiv) setNesteWebinar(l[0] || null) }).catch(() => {})
    return () => { aktiv = false }
  }, [])

  return (
    <>
    <section className="bg-gradient-to-br from-orange/10 via-white to-petrol/10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block bg-orange/10 text-orange-ink font-semibold text-sm px-4 py-1.5 rounded-full mb-6">
          {t('home.badge')}
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
          {t('home.heading').split('<orange>')[0]}
          <span className="text-orange-ink">
            {t('home.heading').split('<orange>')[1]?.split('</orange>')[0]}
          </span>
          {t('home.heading').split('</orange>')[1]}
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('home.ingress')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/for-skoler"
            className="bg-orange text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-orange/90 transition-colors shadow-lg shadow-orange/20"
          >
            {t('home.ctaSkoler')}
          </Link>
          <Link
            to="/om-oss"
            className="bg-white text-gray-800 border-2 border-gray-200 px-8 py-4 rounded-full text-lg font-semibold hover:border-orange hover:text-orange-ink transition-colors"
          >
            {t('home.ctaMer')}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-petrol mb-1">{stat.number}</div>
            <div className="text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Webinar — alltid synlig invitasjon til nysgjerrige skoler */}
    <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-petrol/10 to-orange/5 border border-petrol/15 p-8 sm:p-10 text-center">
        <span className="inline-block bg-orange/10 text-orange-ink font-semibold text-sm px-4 py-1.5 rounded-full mb-4">Gratis intro-webinar</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Bli kjent med Trivselsleder — live</h2>
        <p className="text-lg text-gray-600 mt-3 max-w-2xl mx-auto">
          Vurderer dere programmet? Bli med på et kort, uforpliktende webinar. Vi viser hva trivselslederne gjør,
          hvordan dere kommer i gang, og svarer på det dere lurer på.
        </p>
        {nesteWebinar && (
          <p className="mt-5 text-gray-800">
            <span className="font-semibold">Neste:</span>{' '}
            <span className="capitalize">{datoLang(nesteWebinar.starter_at)}</span> kl. {klokkeslett(nesteWebinar.starter_at)}
          </p>
        )}
        <Link to="/webinarer" className="inline-block mt-6 bg-orange text-gray-900 px-8 py-3.5 rounded-full text-lg font-semibold hover:bg-orange/90 transition-colors shadow-lg shadow-orange/20">
          Meld skolen på
        </Link>
      </div>
    </section>

    {/* Offentlig skoleoversikt — aktive medlemsskoler (ingen PII) */}
    <SkoleOversikt />
    </>
  )
}
