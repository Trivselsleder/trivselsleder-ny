import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FEIDE_AUTH_URL = 'https://auth.dataporten.no/oauth/authorization'
const FEIDE_CLIENT_ID = import.meta.env.VITE_FEIDE_CLIENT_ID

function loggInnMedFeide() {
  const state = crypto.randomUUID()
  sessionStorage.setItem('feide_state', state)
  const params = new URLSearchParams({
    client_id: FEIDE_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: `${window.location.origin}/auth/feide/callback`,
    state,
  })
  window.location.href = `${FEIDE_AUTH_URL}?${params}`
}

export default function LoggInn() {
  const { loggInn, glemmtPassord } = useAuth()
  const navigate = useNavigate()

  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [feil, setFeil] = useState('')
  const [laster, setLaster] = useState(false)

  const [visGlemt, setVisGlemt] = useState(false)
  const [glemmtEpost, setGlemmtEpost] = useState('')
  const [glemmtSendt, setGlemmtSendt] = useState(false)
  const [glemmtFeil, setGlemmtFeil] = useState('')
  const [glemmtLaster, setGlemmtLaster] = useState(false)

  async function handleLoggInn(e) {
    e.preventDefault()
    setFeil('')
    setLaster(true)
    try {
      await loggInn(epost, passord)
      navigate('/min-side')
    } catch {
      setFeil('Feil e-post eller passord. Prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  async function handleGlemmtPassord(e) {
    e.preventDefault()
    setGlemmtFeil('')
    setGlemmtLaster(true)
    try {
      await glemmtPassord(glemmtEpost)
      setGlemmtSendt(true)
    } catch {
      setGlemmtFeil('Noe gikk galt. Sjekk at e-postadressen er riktig.')
    } finally {
      setGlemmtLaster(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F47920]/10 mb-3">
            <svg className="w-7 h-7 text-[#F47920]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Logg inn</h1>
          <p className="text-sm text-gray-500 mt-1">Trivselsleder-portalen</p>
        </div>

        {!visGlemt ? (
          <form onSubmit={handleLoggInn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
              <input
                type="email"
                value={epost}
                onChange={e => { setEpost(e.target.value); setFeil('') }}
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passord</label>
              <input
                type="password"
                value={passord}
                onChange={e => { setPassord(e.target.value); setFeil('') }}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
              />
            </div>
            {feil && <p className="text-red-500 text-xs">{feil}</p>}
            <button
              type="submit"
              disabled={laster}
              className="w-full bg-[#F47920] text-white font-semibold py-2.5 rounded-full hover:bg-[#d4681a] transition-colors disabled:opacity-60"
            >
              {laster ? 'Logger inn…' : 'Logg inn'}
            </button>
            <button
              type="button"
              onClick={() => setVisGlemt(true)}
              className="w-full text-sm text-[#F47920] hover:underline text-center"
            >
              Glemt passord?
            </button>

            <p className="text-center text-sm text-gray-500">
              Ingen konto?{' '}
              <Link to="/registrer" className="text-[#F47920] hover:underline font-medium">
                Opprett konto
              </Link>
            </p>

            {FEIDE_CLIENT_ID && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-400">eller</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loggInnMedFeide}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-full hover:bg-gray-50 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  Logg inn med Feide
                </button>
              </>
            )}
          </form>
        ) : (
          <div>
            {!glemmtSendt ? (
              <form onSubmit={handleGlemmtPassord} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Skriv inn e-postadressen din, så sender vi deg en lenke for å sette nytt passord.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input
                    type="email"
                    value={glemmtEpost}
                    onChange={e => { setGlemmtEpost(e.target.value); setGlemmtFeil('') }}
                    required
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
                  />
                </div>
                {glemmtFeil && <p className="text-red-500 text-xs">{glemmtFeil}</p>}
                <button
                  type="submit"
                  disabled={glemmtLaster}
                  className="w-full bg-[#F47920] text-white font-semibold py-2.5 rounded-full hover:bg-[#d4681a] transition-colors disabled:opacity-60"
                >
                  {glemmtLaster ? 'Sender…' : 'Send tilbakestillingslenke'}
                </button>
                <button
                  type="button"
                  onClick={() => setVisGlemt(false)}
                  className="w-full text-sm text-gray-500 hover:underline text-center"
                >
                  Tilbake til innlogging
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">
                  E-post sendt til <strong>{glemmtEpost}</strong>. Sjekk innboksen din.
                </p>
                <button
                  type="button"
                  onClick={() => { setVisGlemt(false); setGlemmtSendt(false); setGlemmtEpost('') }}
                  className="text-sm text-[#F47920] hover:underline"
                >
                  Tilbake til innlogging
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
