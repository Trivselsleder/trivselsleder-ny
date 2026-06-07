import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function FeideCallback() {
  const [searchParams] = useSearchParams()
  const [feil, setFeil] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setFeil(`Feide-innlogging avbrutt: ${error}`)
      return
    }

    if (!code) {
      setFeil('Ingen autoriseringskode mottatt fra Feide.')
      return
    }

    // CSRF-sjekk
    const lagretState = sessionStorage.getItem('feide_state')
    sessionStorage.removeItem('feide_state')
    if (!lagretState || lagretState !== state) {
      setFeil('Ugyldig state-parameter. Prøv å logge inn på nytt.')
      return
    }

    const redirectUri = `${window.location.origin}/auth/feide/callback`

    fetch('/api/auth/feide/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setFeil(data.error)
        } else {
          window.location.href = data.actionLink
        }
      })
      .catch(() => setFeil('Noe gikk galt under innloggingen. Prøv igjen.'))
  }, [])

  if (feil) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-gray-700 text-sm">{feil}</p>
          <a href="/logg-inn" className="text-[#F47920] hover:underline text-sm block">
            Tilbake til innlogging
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600 text-sm">Logger inn med Feide…</p>
      </div>
    </div>
  )
}
