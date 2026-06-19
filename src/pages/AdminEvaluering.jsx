import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const KJOP_ETIKETT = {
  pakke: 'Ønsker pakke',
  samtale: 'Ønsker samtale',
  nei: 'Nei',
}

export default function AdminEvaluering() {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    supabase.rpc('hent_evalueringer_admin').then(({ data, error }) => {
      if (error) setFeil(error.message)
      else setRader(data ?? [])
      setLaster(false)
    })
  }, [])

  if (laster) return <p className="text-gray-400">Laster evalueringer …</p>
  if (feil) return <p className="text-red-600">Feil: {feil}</p>

  if (rader.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
        Ingen evalueringer er besvart ennå.
      </div>
    )
  }

  // Snitt på de tre vurderingene
  const snitt = (felt) => {
    const tall = rader.map(r => r[felt]).filter(v => v != null)
    if (tall.length === 0) return '—'
    return (tall.reduce((a, b) => a + b, 0) / tall.length).toFixed(1)
  }

  const gullkorn = rader.filter(r => r.gullkorn && r.gullkorn.trim() !== '')
  const vilHa = rader.filter(r => r.kjopsinteresse === 'pakke' || r.kjopsinteresse === 'samtale')

  return (
    <div className="space-y-8">
      <p className="text-gray-500">Tilbakemeldinger fra skolene etter gjennomførte kurs.</p>

      {/* Snitt-kort */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Antall svar</p>
          <p className="text-2xl font-bold text-gray-900">{rader.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gjennomføring</p>
          <p className="text-2xl font-bold text-orange">{snitt('vurd_gjennomforing')}<span className="text-base text-gray-400"> / 6</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Info i forkant</p>
          <p className="text-2xl font-bold text-orange">{snitt('vurd_info')}<span className="text-base text-gray-400"> / 6</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Aktiviteter</p>
          <p className="text-2xl font-bold text-orange">{snitt('vurd_aktiviteter')}<span className="text-base text-gray-400"> / 6</span></p>
        </div>
      </div>

      {/* Salgssignaler */}
      {vilHa.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Kjøpsinteresse ({vilHa.length})</h3>
          <div className="overflow-hidden border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Skole</th>
                  <th className="px-4 py-3">Kurs</th>
                  <th className="px-4 py-3">Ønske</th>
                </tr>
              </thead>
              <tbody>
                {vilHa.map(r => (
                  <tr key={r.evaluering_id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{r.skole_navn || '—'}</td>
                    <td className="px-4 py-3">{r.kurs_navn}</td>
                    <td className="px-4 py-3">
                      <span className={
                        r.kjopsinteresse === 'pakke'
                          ? 'inline-block px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold'
                          : 'inline-block px-2 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-semibold'
                      }>
                        {KJOP_ETIKETT[r.kjopsinteresse]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gullkorn */}
      {gullkorn.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Gullkorn ({gullkorn.length})</h3>
          <div className="space-y-3">
            {gullkorn.map(r => (
              <div key={r.evaluering_id} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-gray-800 italic">«{r.gullkorn}»</p>
                <p className="text-xs text-gray-500 mt-2">{r.skole_navn || '—'} · {r.kurs_navn}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full liste */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Alle svar</h3>
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Skole</th>
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3 text-center">Gjennomf.</th>
                <th className="px-4 py-3 text-center">Info</th>
                <th className="px-4 py-3 text-center">Aktiv.</th>
                <th className="px-4 py-3">Kjøp</th>
              </tr>
            </thead>
            <tbody>
              {rader.map(r => (
                <tr key={r.evaluering_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.skole_navn || '—'}</td>
                  <td className="px-4 py-3">{r.kurs_navn}</td>
                  <td className="px-4 py-3 text-center">{r.vurd_gjennomforing ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{r.vurd_info ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{r.vurd_aktiviteter ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{KJOP_ETIKETT[r.kjopsinteresse] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
