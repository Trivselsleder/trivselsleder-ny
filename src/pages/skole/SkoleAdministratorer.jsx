import { useEffect, useState } from 'react'
import { hentMinSkole, hentSkoleBrukere } from '../../lib/skole'

export default function SkoleAdministratorer() {
  const [skoleId, setSkoleId] = useState(null)
  const [admins, setAdmins] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    let aktiv = true
    ;(async () => {
      try {
        const sid = await hentMinSkole()
        if (!aktiv) return
        setSkoleId(sid)
        if (sid) {
          const liste = await hentSkoleBrukere(sid)
          if (aktiv) setAdmins(liste.filter((b) => b.rolle === 'skoleadmin'))
        }
      } catch (e) {
        if (aktiv) setFeil(e.message)
      } finally {
        if (aktiv) setLaster(false)
      }
    })()
    return () => { aktiv = false }
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Administratorer</h1>
      <p className="text-gray-500 text-sm mt-1">De som kan administrere skolen, invitere ansatte og redigere skoleinformasjon.</p>

      {laster && <p className="text-gray-500 mt-8">Laster administratorer …</p>}
      {feil && <p role="alert" className="text-red-600 mt-8">Kunne ikke hente administratorer: {feil}</p>}

      {!laster && !feil && !skoleId && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-gray-500 py-12 px-6 text-center">
          Brukeren din er ikke koblet til en skole, så det er ingen administratorer å vise her.
        </div>
      )}

      {!laster && !feil && skoleId && (
        admins.length === 0 ? (
          <p className="text-gray-500 mt-6">Ingen administratorer registrert ennå.</p>
        ) : (
          <ul className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-9 h-9 rounded-full bg-orange/15 text-[#B5560F] flex items-center justify-center font-bold shrink-0" aria-hidden="true">
                  {(a.navn || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.navn}</p>
                  <p className="text-sm text-gray-500 truncate">{a.epost}</p>
                </div>
                {!a.aktiv && <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">Ikke aktivert</span>}
              </li>
            ))}
          </ul>
        )
      )}
      <p className="text-sm text-gray-500 mt-4">Nye administratorer inviteres under «Ansatte» med rollen Administrator.</p>
    </div>
  )
}
