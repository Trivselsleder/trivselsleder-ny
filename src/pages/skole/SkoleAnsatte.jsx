import { useEffect, useState } from 'react'
import { hentMinSkole, hentSkoleBrukere, inviterSkolebruker } from '../../lib/skole'

const ROLLE_LABEL = { skoleadmin: 'Administrator', skoleansatt: 'Ansatt', feide: 'Feide-bruker' }
const STILLING_LABEL = { rektor: 'Rektor', inspektor: 'Inspektør', styrer: 'Styrer', ansatt: 'Ansatt' }

export default function SkoleAnsatte() {
  const [skoleId, setSkoleId] = useState(null)
  const [brukere, setBrukere] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  const [navn, setNavn] = useState('')
  const [epost, setEpost] = useState('')
  const [rolle, setRolle] = useState('skoleansatt')
  const [stilling, setStilling] = useState('')
  const [tlRolle, setTlRolle] = useState('')
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
      await inviterSkolebruker({
        epost: epost.trim(), navn: navn.trim(), rolle, skoleId,
        stilling: stilling || null, tl_rolle: tlRolle || null,
      })
      setInvitert(`Invitasjon sendt til ${epost.trim()}.`)
      setNavn(''); setEpost(''); setRolle('skoleansatt'); setStilling(''); setTlRolle('')
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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={inputCls} value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn" aria-label="Navn" required />
              <input className={inputCls} type="email" value={epost} onChange={(e) => setEpost(e.target.value)} placeholder="E-post" aria-label="E-post" required />
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <label className="text-xs text-gray-500 flex flex-col gap-0.5">Tilgang
                <select className={inputCls} value={rolle} onChange={(e) => setRolle(e.target.value)} aria-label="Tilgang">
                  <option value="skoleansatt">Ansatt</option>
                  <option value="skoleadmin">Administrator</option>
                </select>
              </label>
              <label className="text-xs text-gray-500 flex flex-col gap-0.5">Stilling
                <select className={inputCls} value={stilling} onChange={(e) => setStilling(e.target.value)} aria-label="Stilling ved skolen">
                  <option value="">—</option>
                  <option value="rektor">Rektor</option>
                  <option value="inspektor">Inspektør</option>
                  <option value="styrer">Styrer (barnehage)</option>
                  <option value="ansatt">Ansatt</option>
                </select>
              </label>
              <label className="text-xs text-gray-500 flex flex-col gap-0.5">TL-rolle
                <select className={inputCls} value={tlRolle} onChange={(e) => setTlRolle(e.target.value)} aria-label="Rolle i TL-programmet">
                  <option value="">—</option>
                  <option value="htla">HTLA (hovedansvarlig)</option>
                  <option value="tla">TLA</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={sender}
                className="bg-orange text-gray-900 text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e8641c] transition-colors disabled:opacity-50 whitespace-nowrap h-[38px]"
              >
                {sender ? 'Sender…' : 'Send invitasjon'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Tilgang = hva de kan i portalen. Stilling = hva de er på skolen. TL-rolle = ansvaret deres i programmet. Feltene er uavhengige — f.eks. en rektor som også er HTLA.</p>
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
                  <span className="ml-auto flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {!b.aktiv && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Ikke aktivert</span>}
                    {b.tl_rolle === 'htla' && <span className="text-xs bg-orange/20 text-[#b8501a] px-2 py-0.5 rounded-full font-medium">HTLA</span>}
                    {b.tl_rolle === 'tla' && <span className="text-xs bg-teal/15 text-petrol px-2 py-0.5 rounded-full">TLA</span>}
                    {b.stilling && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{STILLING_LABEL[b.stilling] ?? b.stilling}</span>}
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
