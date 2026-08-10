import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { hentSatser } from '../utils/satser'
import { adminFetch } from '../lib/adminFetch'

// "Fra kurspåmelding" — kortutdeling kursdeltakere.
// Antall = TL + 10 % rundet opp. Beløp = antall kort × kortpris (ingen porto, kort deles ut på kurs).

const STATUSVALG = ['Ikke behandlet', 'Fakturer', 'Gratis', 'Ikke ønsket']

function beregnKort(antallTl) {
  if (!antallTl || antallTl < 0) return 0
  return Math.ceil(antallTl * 1.1)
}

// Effektivt kort-tall: er antall_kort satt (frosset ELLER manuelt overstyrt),
// er DET fasit. Ellers vises det levende beregnede tallet.
function effektivKort(rad) {
  return rad.antall_kort != null ? rad.antall_kort : beregnKort(rad.antall_tl)
}
function erFrosset(rad) {
  return rad.antall_kort != null
}

export default function AdminKortutdeling() {
  const navigate = useNavigate()
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const satser = hentSatser()
  const [redigerId, setRedigerId] = useState(null)
  const [utkast, setUtkast] = useState('')

  useEffect(() => {
    supabase
      .from('kurs_skole')
      .select('id, antall_tl, antall_kort, kort_status, skoler(navn, kommunenavn), kurs!kurs_skole_kurs_id_fkey(navn, dato)')
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

  // Overstyr kort-tallet manuelt (låser raden), eller tilbakestill til levende
  // beregning ved å sende null. Går via service-endepunktet med sesjonen påhengt.
  async function lagreAntallKort(id, antallKort) {
    if (antallKort !== null && (!Number.isInteger(antallKort) || antallKort < 0)) {
      alert('Skriv et heltall (0 eller mer).'); return
    }
    const forrige = rader
    setRader(rader.map(r => r.id === id ? { ...r, antall_kort: antallKort } : r))
    setRedigerId(null)
    const res = await adminFetch('/api/kurs/frys-kortantall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, antall_kort: antallKort }),
    })
    if (!res.ok) {
      setRader(forrige) // rull tilbake — skjermen (og faktureringssummen) skal aldri vise et tall basen ikke lagret
      alert('Kunne ikke lagre kort-tallet. Ingenting ble endret. Prøv igjen.')
    }
  }

  function startRediger(rad) {
    setRedigerId(rad.id)
    setUtkast(String(effektivKort(rad)))
  }

  function belop(rad) {
    return effektivKort(rad) * satser.kortpris
  }

  const totaltKort = rader.reduce((sum, r) => sum + effektivKort(r), 0)
  const totaltTl = rader.reduce((sum, r) => sum + (r.antall_tl || 0), 0)
  const totaltFaktureres = rader
    .filter(r => r.kort_status === 'Fakturer')
    .reduce((sum, r) => sum + belop(r), 0)

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
          Antall kort beregnes automatisk: antall trivselsledere + 10 %, rundet opp. Beløp er eks. mva, uten porto (kort deles ut på kurs). Tallet er levende til midnatt på kursdagen, så låses det (🔒). Du kan når som helst overstyre et tall manuelt.
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
              <span className="px-3 py-1 rounded-lg bg-[#F47920]/10 text-[#F47920] text-sm font-medium">
                Til fakturering: {totaltFaktureres} kr eks. mva
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
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Beløp eks. mva</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rader.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.skoler?.navn || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.kurs?.navn || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formaterDato(r.kurs?.dato)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{r.antall_tl ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {redigerId === r.id ? (
                              <span className="inline-flex items-center gap-1 justify-end">
                                <input
                                  type="number" min="0"
                                  value={utkast}
                                  onChange={(e) => setUtkast(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') lagreAntallKort(r.id, parseInt(utkast, 10))
                                    if (e.key === 'Escape') setRedigerId(null)
                                  }}
                                  autoFocus
                                  className="w-16 border border-[#D6006E] rounded-lg px-2 py-1 text-right text-sm focus:outline-none"
                                />
                                <button onClick={() => lagreAntallKort(r.id, parseInt(utkast, 10))} className="text-xs text-[#D6006E] hover:underline">Lagre</button>
                                <button onClick={() => setRedigerId(null)} className="text-xs text-gray-400 hover:underline">Avbryt</button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 justify-end">
                                <span className={`font-semibold ${erFrosset(r) ? 'text-gray-900' : 'text-[#F47920]'}`}>{effektivKort(r)}</span>
                                {erFrosset(r)
                                  ? <span title="Låst tall — endres ikke automatisk." className="text-gray-400">🔒</span>
                                  : <span title="Levende beregning (TL + 10 %). Låses ved midnatt på kursdagen." className="text-gray-300 text-xs">beregnes</span>}
                                <button onClick={() => startRediger(r)} className="text-xs text-gray-400 hover:text-[#D6006E] hover:underline">endre</button>
                                {erFrosset(r) && (
                                  <button onClick={() => lagreAntallKort(r.id, null)} title="Tilbakestill til levende beregning" className="text-xs text-gray-300 hover:text-gray-500 hover:underline">↺</button>
                                )}
                              </span>
                            )}
                          </td>
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
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {r.kort_status === 'Fakturer'
                              ? <span className="font-semibold text-gray-900">{belop(r)} kr</span>
                              : <span className="text-gray-300">—</span>}
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
