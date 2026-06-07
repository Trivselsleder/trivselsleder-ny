import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Registrer() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ navn: '', epost: '', passord: '', bekreft: '' })
  const [feil, setFeil] = useState('')
  const [laster, setLaster] = useState(false)

  function oppdater(felt) {
    return e => { setForm(f => ({ ...f, [felt]: e.target.value })); setFeil('') }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (form.passord !== form.bekreft) {
      setFeil('Passordene stemmer ikke overens.')
      return
    }
    if (form.passord.length < 8) {
      setFeil('Passordet må være minst 8 tegn.')
      return
    }

    setLaster(true)
    setFeil('')

    try {
      const res = await fetch('/api/auth/registrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navn: form.navn, epost: form.epost, passord: form.passord }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFeil(data.error ?? 'Noe gikk galt. Prøv igjen.')
        return
      }

      // Logg inn direkte etter registrering
      const { error: innloggingsFeil } = await supabase.auth.signInWithPassword({
        email: form.epost,
        password: form.passord,
      })

      if (innloggingsFeil) {
        // Konto opprettet, men innlogging feilet — send til innloggingssiden
        navigate('/logg-inn?registrert=1')
        return
      }

      navigate('/min-side')
    } catch {
      setFeil('Noe gikk galt. Prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F47920]/10 mb-3">
            <svg className="w-7 h-7 text-[#F47920]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Opprett konto</h1>
          <p className="text-sm text-gray-500 mt-1">Trivselsleder-portalen</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fullt navn</label>
            <input
              type="text"
              value={form.navn}
              onChange={oppdater('navn')}
              required
              autoFocus
              autoComplete="name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
            <input
              type="email"
              value={form.epost}
              onChange={oppdater('epost')}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passord</label>
            <input
              type="password"
              value={form.passord}
              onChange={oppdater('passord')}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
            <p className="text-xs text-gray-400 mt-1">Minst 8 tegn</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bekreft passord</label>
            <input
              type="password"
              value={form.bekreft}
              onChange={oppdater('bekreft')}
              required
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          {feil && <p className="text-red-500 text-xs">{feil}</p>}

          <button
            type="submit"
            disabled={laster}
            className="w-full bg-[#F47920] text-white font-semibold py-2.5 rounded-full hover:bg-[#d4681a] transition-colors disabled:opacity-60"
          >
            {laster ? 'Oppretter konto…' : 'Opprett konto'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Har du allerede konto?{' '}
            <Link to="/logg-inn" className="text-[#F47920] hover:underline font-medium">
              Logg inn
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
