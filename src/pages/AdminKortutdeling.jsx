import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const STATUSVALG = [
  'Ikke behandlet',
  'Fakturer',
  'Gratis (avtale/kampanje/pause)',
  'Samlefaktura kommune',
  'Slås sammen med reise',
  'Avventer reisesum fra RA',
  'Behandlet',
]

function beregnKort(antallTl) {
  if (!antallTl || antallTl < 0) return 0
  return Math.ceil(antallTl * 1.1)
}

export default function AdminKortutdeling() {
  const navigate = useNavigate()
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    supabase
      .from('kurs_skole')
      .select('id, antall_tl, kort_status, skoler(navn, kommunenavn), kurs(navn, dato)')
      .eq('kommer', true)
      .eq('svart', true)
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setRader(data ?? [])
        setLaster(false)
      })
  }, [])

  async function settStatus(id, status) {
    setRader(rader.map(r => r.id === id ? { ...r, kort_status: status } : r))
    const { error } = await supabase.rpc('sett_kort_status', { p_id: id, p_status: status })
    if (error) alert('Kunne ikke lagre status. Prøv igjen.')
  }

  const totaltKort = rader.reduce((sum, r) => sum + beregnKort(r.antall_tl), 0)
  const totaltTl = rader.reduce((sum, r) => sum + (r.antall_tl || 0), 0)

  function formaterDato(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:underline mb-4">
          ← Tilbake til admin
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Kortutdeling — fra kurspåmelding</h1>
        <p className="text-gray-500 mb-2">
          Antall kort beregnes automatisk: antall trivselsledere + 10 %, rundet opp.
        </p>
        <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-6 inline-block">
          Prototype til gjennomgang med Camilla — ikke ferdig løsning.
        </p>

        {laster && <p className="text-gray-400">Laster …</p>}
        {feil && <p className="text-red-600">Feil: {feil}</p>}

        {!laster && !feil && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                {rader.length} skoler kommer
              </span>
              <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                {totaltTl} trivselsledere totalt
              </span>
              <span className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-sm font-medium">
                {totaltKort} kort totalt (beregnet)
              </span>
            </div>

            {rader.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                Ingen skoler har svart «ja» på kurs ennå.
              </div>
            )}

            {rader.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Skole</th>
                        <th className="text-left px-4 py-3">Kurs</th>
                        <th className="text-left px-4 py-3">Dato</th>
                        <th className="text-right px-4 py-3">Antall TL</th>
                        <th className="text-right px-4 py-3">Kort (TL +10%)</th>
                        <th className="text-left px-4 py-3">Status (Camilla styrer)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rader.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.skoler?.navn || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.kurs?.navn || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formaterDato(r.kurs?.dato)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{r.antall_tl ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#F47920]">{beregnKort(r.antall_tl)}</td>
                          <td className="px-4 py-3">
                            <select
                              value={r.kort_status || 'Ikke behandlet'}
                              onChange={(e) => settStatus(r.id, e.target.value)}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-[#D6006E] focus:outline-none"
                            >
                              {STATUSVALG.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
