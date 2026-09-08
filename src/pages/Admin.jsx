import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const adminSider = [
  {
    tittel: 'Ledelse',
    beskrivelse: 'Styringssignaler: frafallsvarsel (churn) og nøkkeltall.',
    ikon: '📊',
    til: '/admin/ledelse',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Kursplanlegger',
    beskrivelse: 'Planlegg lekekurs, send invitasjoner og følg opp svar.',
    ikon: '📅',
    til: '/admin/kursplanlegger',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Spørreundersøkelse til skolene',
    beskrivelse: 'Opprett undersøkelsesrunder, generer mottakere til skolene og se spørsmålene.',
    ikon: '📝',
    til: '/admin/skoleundersokelse',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Påmeldinger',
    beskrivelse: 'Se og godkjenn nye skoler som vil melde seg på.',
    ikon: '📋',
    til: '/admin/paameldinger',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Webinarer',
    beskrivelse: 'Opprett interne nettverksmøter og eksterne intro-webinarer. Påmeldte får bekreftelse og påminnelser automatisk.',
    ikon: '🎥',
    til: '/admin/webinarer',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Utsendinger (nyhetsbrev)',
    beskrivelse: 'Masseutsendinger via Resend Broadcasts: webinar-oppfølging, mottakerbase og avmeldinger.',
    ikon: '📨',
    til: '/admin/nyhetsbrev',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Skoler',
    beskrivelse: 'Administrer skoleregisteret og skoleinfo.',
    ikon: '🏫',
    til: '/admin/skoler',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Kulturkort-partnere',
    beskrivelse: 'Rediger og legg til kulturkort-partnere.',
    ikon: '🎭',
    til: '/admin/kulturkort',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Kulturkort — kort og bestillinger',
    beskrivelse: 'Alt kulturkort på ett sted: kort fra kurs og bestillinger i posten, med kilde og filter.',
    ikon: '🎟️',
    til: '/admin/kortoversikt',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Evalueringer',
    beskrivelse: 'Skolenes evalueringer av lekekursene: vurderinger, gullkorn og kjøpsinteresse.',
    ikon: '⭐',
    til: '/admin/evalueringer',
    roller: ['superadmin', 'ansatt'],
  },
  {
    // REDAKSJON (D3): samler redaksjonelt arbeid. «Tekster og maler» + «Leker og opplegg» (utkast)
    // ligger nå ett nivå ned, under /admin/redaksjon. Tekst via i18n (i18n-nøkkel-markør).
    i18n: 'redaksjon.kort',
    tittel: 'Redaksjon',
    beskrivelse: 'Rediger tekster, maler, leker og opplegg.',
    ikon: '✏️',
    til: '/admin/redaksjon',
    roller: ['superadmin', 'ansatt'],
  },
  {
    tittel: 'Brukere',
    beskrivelse: 'Administrer brukere og roller.',
    ikon: '👥',
    til: '/admin/brukere',
    roller: ['superadmin'],
  },
]

export default function Admin() {
  const { bruker } = useAuth()
  const { t } = useTranslation()
  const rolle = bruker?.rolle
  const synlige = adminSider.filter(s => s.roller.includes(rolle))
  const erOdde = synlige.length % 2 !== 0
  const vanlige = erOdde ? synlige.slice(0, -1) : synlige
  const siste = erOdde ? synlige[synlige.length - 1] : null
  // Kort med i18n-markør oversettes; øvrige beholder sin (eksisterende) hardkodede tekst.
  const tit = (s) => (s.i18n ? t(s.i18n + '.tittel') : s.tittel)
  const besk = (s) => (s.i18n ? t(s.i18n + '.beskrivelse') : s.beskrivelse)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-orange-ink mb-2">Admin</h1>
      <p className="text-gray-500 mb-10">Velg hva du vil administrere.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {vanlige.map(side => (
          <Link
            key={side.til}
            to={side.til}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-orange hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">{side.ikon}</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-ink transition-colors">
              {tit(side)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{besk(side)}</p>
          </Link>
        ))}
      </div>
      {siste && (
        <div className="mt-6">
          <Link
            to={siste.til}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-orange hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">{siste.ikon}</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-ink transition-colors">
              {tit(siste)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{besk(siste)}</p>
          </Link>
        </div>
      )}
    </div>
  )
}
