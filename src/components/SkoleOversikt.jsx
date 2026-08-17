import { useEffect, useMemo, useState } from 'react'
import { hentOffentligeSkoler } from '../lib/offentligeSkoler'

// Offentlig skoleoversikt for forsiden (uinnlogget). Viser aktive medlemsskoler
// med KUN offentlig basisinfo (navn, kommune, fylke, elevtall) via
// hent_offentlige_skoler(). Ingen kontakt-PII eksponeres.
export default function SkoleOversikt() {
  const [skoler, setSkoler] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [sok, setSok] = useState('')

  useEffect(() => {
    let aktiv = true
    hentOffentligeSkoler()
      .then((liste) => { if (aktiv) setSkoler(liste) })
      .catch((e) => { if (aktiv) setFeil(e.message || 'Ukjent feil') })
      .finally(() => { if (aktiv) setLaster(false) })
    return () => { aktiv = false }
  }, [])

  const filtrert = useMemo(() => {
    const q = sok.trim().toLowerCase()
    if (!q) return skoler
    return skoler.filter((s) =>
      [s.navn, s.kommune, s.fylke].some((v) => (v || '').toLowerCase().includes(q))
    )
  }, [skoler, sok])

  // Vis ikke seksjonen i det hele tatt hvis det ikke finnes noen skoler aa vise
  // (og lasting er ferdig uten feil) – da unngaar vi en tom, forvirrende blokk.
  if (!laster && !feil && skoler.length === 0) return null

  return (
    <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Skoler som er med</h2>
          <p className="text-lg text-gray-600 mt-3 max-w-2xl mx-auto">
            Et utvalg av skolene som bruker Trivselsleder i dag.
          </p>
        </div>

        {feil && (
          <p className="text-center text-gray-500">Kunne ikke laste skolelista akkurat nå.</p>
        )}

        {laster && !feil && (
          <p className="text-center text-gray-500">Laster skoler …</p>
        )}

        {!laster && !feil && (
          <>
            <div className="max-w-md mx-auto mb-8">
              <input
                type="search"
                value={sok}
                onChange={(e) => setSok(e.target.value)}
                placeholder="Søk etter skole, kommune eller fylke …"
                aria-label="Søk i skolelista"
                className="w-full border border-gray-300 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-orange"
              />
            </div>

            {filtrert.length === 0 ? (
              <p className="text-center text-gray-500">Ingen skoler passer søket «{sok}».</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrert.map((s) => (
                  <li key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="font-semibold text-gray-900">{s.navn}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {[s.kommune, s.fylke].filter(Boolean).join(' · ') || '—'}
                    </div>
                    {s.elevtall != null && (
                      <div className="text-sm text-petrol mt-2">{s.elevtall} elever</div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-center text-sm text-gray-400 mt-8">
              {skoler.length} {skoler.length === 1 ? 'skole' : 'skoler'} viser at de er med.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
