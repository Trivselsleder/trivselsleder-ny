import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const adminSider = [
  {
    tittel: 'Kursplanlegger',
    beskrivelse: 'Planlegg lekekurs, send invitasjoner og følg opp svar.',
    ikon: '📅',
    til: '/admin/kursplanlegger',
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
    tittel: 'Kulturkort-bestillinger',
    beskrivelse: 'Se bestillinger og kortutdeling fra skoler.',
    ikon: '📦',
    til: '/admin/bestillinger',
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
  const rolle = bruker?.rolle
  const synlige = adminSider.filter(s => s.roller.includes(rolle))
  const erOdde = synlige.length % 2 !== 0
  const vanlige = erOdde ? synlige.slice(0, -1) : synlige
  const siste = erOdde ? synlige[synlige.length - 1] : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-orange mb-2">Admin</h1>
      <p className="text-gray-500 mb-10">Velg hva du vil administrere.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {vanlige.map(side => (
          <Link
            key={side.til}
            to={side.til}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-orange hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">{side.ikon}</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange transition-colors">
              {side.tittel}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{side.beskrivelse}</p>
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
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange transition-colors">
              {siste.tittel}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{siste.beskrivelse}</p>
          </Link>
        </div>
      )}
    </div>
  )
}
