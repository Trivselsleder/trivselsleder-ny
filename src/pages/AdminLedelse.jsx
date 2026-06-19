import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminLedelse() {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [visDetaljer, setVisDetaljer] = useState(false)

  useEffect(() => {
    supabase.rpc('hent_churn_oversikt').then(({ data, error }) => {
      if (error) setFeil(error.message)
      else setRader(data ?? [])
      setLaster(false)
    })
  }, [])

  // Aggregerte tall (ligger likt på alle rader, så vi tar fra første)
  const totaltSvar = rader.length > 0 ? Number(rader[0].totalt_svar) : 0
  const totaltNei = rader.length > 0 ? Number(rader[0].totalt_nei) : 0
  const flagget = rader.length > 0 ? Number(rader[0].flagget_antall) : 0
  const andel = totaltSvar > 0 ? ((flagget / totaltSvar) * 100).toFixed(1) : '0.0'

  const flaggedeRader = rader.filter(r => r.er_flagget)

  // Fordeling på nettverk (kun flaggede)
  const perNettverk = {}
  flaggedeRader.forEach(r => {
    const n = r.nettverk || 'Ukjent'
    perNettverk[n] = (perNettverk[n] || 0) + 1
  })
  const nettverkListe = Object.entries(perNettverk).sort((a, b) => b[1] - a[1])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ledelse</h1>
        <p className="text-gray-500">Oversikt og styringssignaler for Trivselsleder.</p>
      </div>

      {laster && <p className="text-gray-400">Laster …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && (
        <div className="space-y-6">
          {/* CHURN-KORT */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Frafallsvarsel (churn)</h2>
                <p className="text-sm text-gray-500">Nei-svar med mulig oppsigelsessignal i årsaken.</p>
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-sm font-semibold">
                {flagget} flagget
              </span>
            </div>

            {/* Aggregerte tall */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Flaggede</p>
                <p className="text-2xl font-bold text-pink-600">{flagget}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Andel av svar</p>
                <p className="text-2xl font-bold text-gray-900">{andel}<span className="text-base text-gray-400"> %</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nei-svar totalt</p>
                <p className="text-2xl font-bold text-gray-900">{totaltNei}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Svar totalt</p>
                <p className="text-2xl font-bold text-gray-900">{totaltSvar}</p>
              </div>
            </div>

            {/* Fordeling på nettverk */}
            {nettverkListe.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fordeling på nettverk</p>
                <div className="flex flex-wrap gap-2">
                  {nettverkListe.map(([navn, antall]) => (
                    <span key={navn} className="inline-block px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm">
                      {navn}: <strong>{antall}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {flagget === 0 && (
              <p className="text-gray-400 text-sm mb-2">Ingen flaggede frafallsvarsler ennå.</p>
            )}

            {/* Detaljer (sammenleggbar) */}
            {flaggedeRader.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setVisDetaljer(v => !v)}
                  className="text-sm text-orange hover:underline"
                >
                  {visDetaljer ? 'Skjul detaljer' : `Vis de ${flaggedeRader.length} flaggede skolene`}
                </button>

                {visDetaljer && (
                  <div className="mt-3 overflow-hidden border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-2">Skole</th>
                          <th className="px-4 py-2">Nettverk</th>
                          <th className="px-4 py-2">Årsak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flaggedeRader.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-4 py-2 font-medium">{r.skole_navn || '—'}</td>
                            <td className="px-4 py-2 text-gray-600">{r.nettverk || '—'}</td>
                            <td className="px-4 py-2 text-gray-600">{r.arsak || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plassholder for fremtidige ledelseskort */}
          <div className="border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-400">
            Flere ledelseskort kommer her senere: kontraktsverdi, vekst, Norge vs. Sverige.
          </div>
        </div>
      )}
    </div>
  )
}
