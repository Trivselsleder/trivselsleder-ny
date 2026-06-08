import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SettPassord() {
  const navigate = useNavigate()
  const [klar, setKlar] = useState(false)
  const [passord, setPassord] = useState('')
  const [bekreft, setBekreft] = useState('')
  const [feil, setFeil] = useState('')
  const [laster, setLaster] = useState(false)
  const [ferdig, setFerdig] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // PASSWORD_RECOVERY = tilbakestillingslenke, SIGNED_IN = invitasjonslenke
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setKlar(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (passord !== bekreft) {
      setFeil('Passordene stemmer ikke overens.')
      return
    }
    if (passord.length < 8) {
      setFeil('Passordet må være minst 8 tegn.')
      return
    }
    setFeil('')
    setLaster(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passord })
      if (error) throw error
      setFerdig(true)
      setTimeout(() => navigate('/logg-inn'), 3000)
    } catch {
      setFeil('Noe gikk galt. Prøv å be om en ny tilbakestillingslenke.')
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        {!klar ? (
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 text-sm">Bekrefter lenke…</p>
          </div>
        ) : ferdig ? (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700">Passordet er oppdatert. Du sendes til innloggingssiden…</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900">Sett nytt passord</h1>
              <p className="text-sm text-gray-500 mt-1">Velg et passord på minst 8 tegn</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nytt passord</label>
                <input
                  type="password"
                  value={passord}
                  onChange={e => { setPassord(e.target.value); setFeil('') }}
                  required
                  autoFocus
                  minLength={8}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bekreft passord</label>
                <input
                  type="password"
                  value={bekreft}
                  onChange={e => { setBekreft(e.target.value); setFeil('') }}
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
                {laster ? 'Lagrer…' : 'Sett nytt passord'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
