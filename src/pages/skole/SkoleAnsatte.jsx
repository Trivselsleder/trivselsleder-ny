import { useEffect, useState } from 'react'
import { hentMinSkole, hentSkoleBrukere, inviterSkolebruker } from '../../lib/skole'

const ROLLE_LABEL = { skoleadmin: 'Administrator', skoleansatt: 'Ansatt', feide: 'Feide-bruker' }

export default function SkoleAnsatte() {
  const [skoleId, setSkoleId] = useState(null)
  const [brukere, setBrukere] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  const [navn, setNavn] = useState('')
  const [epost, setEpost] = useState('')
  const [rolle, setRolle] = useState('skoleansatt')
  const [sender, setSender] = useState(false)
  const [inviteFeil, setInviteFeil] = useState('')
  const [invitert, setInvitert] = useState('')

  async function last(sid) {
    const liste = await hentSkoleBrukere(sid)
    setBrukere(liste)
  }

  useEffect(() => {
    let aktiv = true
    ;(async () => {
      try {
        const sid = await hentMinSkole()
        if (!aktiv) return
        setSkoleId(sid)
        if (sid) await last(sid)
      } catch (e) {
        if (aktiv) setFeil(e.message)
      } finally {
        if (aktiv) setLaster(false)
      }
    })()
    return () => { aktiv = false }
  }, [])

  async function inviter(e) {
    e.preventDefault()
    setInviteFeil(''); setInvitert('')
    const e2 = epost.trim().toLowerCase()
    if (brukere.some((b) => b.epost.toLowerCase() === e2)) {
      setInviteFeil('Denne e-posten er allerede registrert på skolen.'); return
    }
    setSender(true)
    try {
      await inviterSkolebruker({ epost: epost.trim(), navn: navn.trim(), rolle, skoleId })
      setInvitert(`Invitasjon sendt til ${epost.trim()}.`)
      setNavn(''); setEpost(''); setRolle('skoleansatt')
      await last(skoleId)
    } catch (err) {
      setInviteFeil(err.message)
    } finally {
      setSender(false)
    }
  }

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/30'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Ansatte</h1>
      <p className="text-gray-500 text-sm mt-1">Skolens trivselsleder-ansvarlige. Inviter nye, så får de e-post for å sette passord.</p>

      {laster && <p className="text-gray-500 mt-8">Laster ansatte …</p>}
      {feil && <p role="alert" className="text-red-600 mt-8">Kunne ikke hente ansatte: {feil}</p>}

      {!laster && !feil && !skoleId && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-gray-500 py-12 px-6 text-center">
          Brukeren din er ikke koblet til en skole, så det er ingen ansatte å vise her.
        </div>
      )}

      {!laster && !feil && skoleId && (
        <>
          <form onSubmit={inviter} className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Inviter ny</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
              <input className={inputCls} value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn" aria-label="Navn" required />
              <input className={inputCls} type="email" value={epost} onChange={(e) => setEpost(e.target.value)} placeholder="E-post" aria-label="E-post" required />
              <select className={inputCls} value={rolle} onChange={(e) => setRolle(e.target.value)} aria-label="Rolle">
                <option value="skoleansatt">Ansatt</option>
                <option value="skoleadmin">Administrator</option>
              </select>
              <button
                type="submit"
                disabled={sender}
                className="bg-orange text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e8641c] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {sender ? 'Sender…' : 'Send invitasjon'}
              </button>
            </div>
            {inviteFeil && <p role="alert" className="text-sm text-red-600 mt-2">{inviteFeil}</p>}
            {invitert && <p role="status" className="text-sm text-petrol mt-2">✓ {invitert}</p>}
          </form>

          <h2 className="font-bold text-gray-900 mt-8">På skolen</h2>
          {brukere.length === 0 ? (
            <p className="text-gray-500 mt-3">Ingen ansatte registrert ennå.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
              {brukere.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-9 h-9 rounded-full bg-teal/15 text-petrol flex items-center justify-center font-bold shrink-0" aria-hidden="true">
                    {(b.navn || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{b.navn}</p>
                    <p className="text-sm text-gray-500 truncate">{b.epost}</p>
                  </div>
                  <span className="ml-auto flex items-center gap-2 shrink-0">
                    {!b.aktiv && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Ikke aktivert</span>}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ROLLE_LABEL[b.rolle] ?? b.rolle}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
