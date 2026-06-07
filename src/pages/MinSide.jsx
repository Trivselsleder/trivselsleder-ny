import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const rolleLabel = {
  superadmin: 'Superadmin (Trivselsleder AS)',
  administrator: 'Administrator',
  ansatt: 'Ansatt',
}

export default function MinSide() {
  const { bruker, session, loggUt } = useAuth()
  const navigate = useNavigate()

  const navn = bruker?.navn ?? session?.user?.email ?? 'Bruker'
  const rolle = bruker?.rolle

  async function handleLoggUt() {
    await loggUt()
    navigate('/logg-inn')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Velkommen, {navn.split(' ')[0]}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Du er innlogget som{' '}
                <span className="font-medium text-[#F47920]">
                  {rolleLabel[rolle] ?? rolle}
                </span>
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {rolle === 'superadmin' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Admin</h2>
            <div className="flex flex-col gap-3">
              <Link
                to="/admin/bestillinger"
                className="flex items-center justify-between px-5 py-3 rounded-xl border border-gray-200 hover:border-[#F47920] hover:bg-[#F47920]/5 transition-colors group"
              >
                <span className="font-medium text-gray-700 group-hover:text-[#F47920]">Kulturkort-bestillinger</span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F47920]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/admin/kulturkort"
                className="flex items-center justify-between px-5 py-3 rounded-xl border border-gray-200 hover:border-[#F47920] hover:bg-[#F47920]/5 transition-colors group"
              >
                <span className="font-medium text-gray-700 group-hover:text-[#F47920]">Kulturkort-partnere</span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F47920]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        <button
          onClick={handleLoggUt}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          Logg ut
        </button>

      </div>
    </div>
  )
}
