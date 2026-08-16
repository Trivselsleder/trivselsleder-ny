import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { hentSatser, lagreSatser, STANDARD_SATSER } from '../utils/satser'
import { adminFetch } from '../lib/adminFetch'

// SAMLET KULTURKORT-OVERSIKT (Trinn 2).
// Slår sammen to kilder på skjermen (to tabeller under panseret):
//   - Kurs: kort som deles ut på kurset (kurs_skole). Antall = TL + 10 %,
//     levende til det fryses ved midnatt på kursdagen. Ingen porto.
//   - Bestilling: kort skolen bestiller i posten (kulturkort_bestillinger).
//     Fast antall skolen selv oppga. Porto kommer i tillegg.
// Camilla ser alt i én liste, ser tydelig KILDE, og kan filtrere.

function beregnKort(antallTl) {
  if (!antallTl || antallTl < 0) return 0
  return Math.ceil(antallTl * 1.1)
}
function effektivKort(rad) {
  return rad.antall_kort != null ? rad.antall_kort : beregnKort(rad.antall_tl)
}

const KURS_STATUS = ['Ikke behandlet', 'Fakturer', 'Gratis', 'Ikke ønsket']
const BEST_STATUS = ['Ny', 'Fakturert', 'Levert']
function nestBestStatus(s) {
  return BEST_STATUS[(BEST_STATUS.indexOf(s) + 1) % BEST_STATUS.length]
}
function bestStatusFarge(s) {
  if (s === 'Ny') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
  if (s === 'Fakturert') return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  return 'bg-green-100 text-green-600 hover:bg-green-200'
}
function formaterDato(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminKortoversikt() {
  const navigate = useNavigate()
  const satser = hentSatser()
  const [kursRader, setKursRader] = useState([])
  const [bestRader, setBestRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [kildeFilter, setKildeFilter] = useState('Alle')
  const [sok, setSok] = useState('')
  const [redigerId, setRedigerId] = useState(null)
  const [utkast, setUtkast] = useState('')

  // prisinnstillinger (flyttet hit fra den pensjonerte bestillinger-siden)
  const [satserForm, setSatserForm] = useState(hentSatser)
  const [satserLagret, setSatserLagret] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('kurs_skole')
        .select('id, antall_tl, antall_kort, kort_status, skoler(navn), kurs!kurs_skole_kurs_id_fkey(navn, dato)')
        .eq('kommer', true).eq('svart', true).range(0, 9999),
      supabase.from('kulturkort_bestillinger')
        .select('*').order('created_at', { ascending: false }).range(0, 9999),
    ]).then(([k, b]) => {
      if (k.error) setFeil(k.error.message)
      else setKursRader(k.data ?? [])
      if (b.error) setFeil(b.error.message)
      else setBestRader(b.data ?? [])
      setLaster(false)
    }).catch(e => { setFeil(e.message); setLaster(false) })
  }, [])

  const rader = useMemo(() => {
    const kurs = kursRader.map(r => ({
      _id: 'k' + r.id, kilde: 'Kurs', kursSkoleId: r.id,
      skole: r.skoler?.navn || '—',
      dato: r.kurs?.dato || null,
      detalj: r.kurs?.navn || '—',
      antall: effektivKort(r),
      frosset: r.antall_kort != null,
      antallTl: r.antall_tl,
      belop: effektivKort(r) * satser.kortpris,
      status: r.kort_status || 'Ikke behandlet',
    }))
    const best = bestRader.map(r => ({
      _id: 'b' + r.id, kilde: 'Bestilling', bestId: r.id,
      skole: r.skolenavn || '—',
      dato: r.created_at || null,
      detalj: [r.gate, [r.postnummer, r.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      antall: r.antall_kort,
      belop: r.total,
      status: r.status || 'Ny',
    }))
    return [...kurs, ...best]
  }, [kursRader, bestRader, satser])

  const filtrerte = rader.filter(r => {
    if (kildeFilter !== 'Alle' && r.kilde !== kildeFilter) return false
    if (sok) {
      const s = sok.toLowerCase()
      if (!r.skole.toLowerCase().includes(s) && !(r.detalj || '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const antallKurs = rader.filter(r => r.kilde === 'Kurs').length
  const antallBest = rader.filter(r => r.kilde === 'Bestilling').length
  const totaltKort = filtrerte.reduce((sum, r) => sum + (r.antall || 0), 0)
  const totaltBelop = filtrerte.reduce((sum, r) => sum + (r.belop || 0), 0)

  // ---- Handlinger ----
  async function settKursStatus(kursSkoleId, status) {
    const forrige = kursRader
    setKursRader(kursRader.map(r => r.id === kursSkoleId ? { ...r, kort_status: status } : r))
    const { error } = await supabase.rpc('sett_kort_status', { p_id: kursSkoleId, p_status: status })
    if (error) { setKursRader(forrige); alert('Kunne ikke lagre status. Prøv igjen.') }
  }

  async function lagreKortAntall(kursSkoleId, antallKort) {
    if (antallKort !== null && (!Number.isInteger(antallKort) || antallKort < 0)) {
      alert('Skriv et heltall (0 eller mer).'); return
    }
    const forrige = kursRader
    setKursRader(kursRader.map(r => r.id === kursSkoleId ? { ...r, antall_kort: antallKort } : r))
    setRedigerId(null)
    const res = await adminFetch('/api/kurs/frys-kortantall', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: kursSkoleId, antall_kort: antallKort }),
    })
    if (!res.ok) { setKursRader(forrige); alert('Kunne ikke lagre kort-tallet. Prøv igjen.') }
  }

  async function byttBestStatus(bestId) {
    const forrige = bestRader
    const rad = bestRader.find(b => b.id === bestId)
    if (!rad) return
    const ny = nestBestStatus(rad.status || 'Ny')
    setBestRader(bestRader.map(b => b.id === bestId ? { ...b, status: ny } : b))
    const { error } = await supabase.from('kulturkort_bestillinger').update({ status: ny }).eq('id', bestId)
    if (error) { setBestRader(forrige); alert('Kunne ikke lagre status. Prøv igjen.') }
  }

  function startRediger(r) { setRedigerId(r._id); setUtkast(String(r.antall)) }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:underline mb-4">
          ← Tilbake til admin
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Kulturkort — kort og bestillinger</h1>
        <p className="text-gray-500 mb-6">
          Alt kulturkort på ett sted. <b>Kilde</b> viser hvor raden kommer fra: <b>Kurs</b> = kort som deles ut
          på kurset (antall = TL + 10 %, låses 🔒 ved midnatt på kursdagen), <b>Bestilling</b> = kort skolen har
          bestilt i posten (porto i tillegg). Bruk filteret for å se én kilde om gangen.
        </p>

        {laster && <p className="text-gray-400">Laster …</p>}
        {feil && <p className="text-red-600">Feil: {feil}</p>}

        {!laster && !feil && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <select value={kildeFilter} onChange={e => setKildeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Alle">Alle kilder</option>
                <option value="Kurs">Kurs (kursutdeling)</option>
                <option value="Bestilling">Bestilling (post)</option>
              </select>
              <input type="text" value={sok} onChange={e => setSok(e.target.value)}
                placeholder="Søk skole eller adresse …"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64" />
              <span className="text-sm text-gray-500">
                Viser {filtrerte.length} av {rader.length} · {antallKurs} kurs · {antallBest} bestillinger
              </span>
              <span className="ml-auto text-sm px-3 py-1 rounded-lg bg-green-100 text-green-700 font-medium">
                {totaltKort} kort
              </span>
              <span className="text-sm px-3 py-1 rounded-lg bg-[#FF7B31]/10 text-[#B5560F] font-medium">
                {totaltBelop} kr
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Kilde</th>
                      <th className="text-left px-4 py-3">Skole</th>
                      <th className="text-left px-4 py-3">Dato</th>
                      <th className="text-left px-4 py-3">Kurs / adresse</th>
                      <th className="text-right px-4 py-3">Antall kort</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Beløp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrerte.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Ingen rader matcher.</td></tr>
                    )}
                    {filtrerte.map(r => (
                      <tr key={r._id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.kilde === 'Kurs' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.kilde}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.skole}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formaterDato(r.dato)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{r.detalj || '—'}</td>

                        {/* Antall kort */}
                        <td className="px-4 py-3 text-right">
                          {r.kilde === 'Kurs' ? (
                            redigerId === r._id ? (
                              <span className="inline-flex items-center gap-1 justify-end">
                                <input type="number" min="0" value={utkast} autoFocus
                                  onChange={e => setUtkast(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') lagreKortAntall(r.kursSkoleId, parseInt(utkast, 10))
                                    if (e.key === 'Escape') setRedigerId(null)
                                  }}
                                  className="w-16 border border-[#106C75] rounded-lg px-2 py-1 text-right text-sm focus:outline-none" />
                                <button onClick={() => lagreKortAntall(r.kursSkoleId, parseInt(utkast, 10))} className="text-xs text-[#106C75] hover:underline">Lagre</button>
                                <button onClick={() => setRedigerId(null)} className="text-xs text-gray-400 hover:underline">Avbryt</button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 justify-end">
                                <span className={`font-semibold ${r.frosset ? 'text-gray-900' : 'text-[#B5560F]'}`}>{r.antall}</span>
                                {r.frosset
                                  ? <span title="Låst tall — endres ikke automatisk." className="text-gray-400">🔒</span>
                                  : <span title="Levende beregning (TL + 10 %). Låses ved midnatt på kursdagen." className="text-gray-300 text-xs">beregnes</span>}
                                <button onClick={() => startRediger(r)} className="text-xs text-gray-400 hover:text-[#106C75] hover:underline">endre</button>
                                {r.frosset && (
                                  <button onClick={() => lagreKortAntall(r.kursSkoleId, null)} title="Tilbakestill til levende beregning" className="text-xs text-gray-300 hover:text-gray-500 hover:underline">↺</button>
                                )}
                              </span>
                            )
                          ) : (
                            <span className="font-semibold text-gray-900">{r.antall}</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {r.kilde === 'Kurs' ? (
                            <select value={r.status} onChange={e => settKursStatus(r.kursSkoleId, e.target.value)}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-[#106C75] focus:outline-none">
                              {KURS_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <button onClick={() => byttBestStatus(r.bestId)} title="Klikk for å bytte status"
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${bestStatusFarge(r.status)}`}>
                              {r.status}
                            </button>
                          )}
                        </td>

                        {/* Beløp */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{r.belop} kr</span>
                          {r.kilde === 'Bestilling' && <span className="block text-[10px] text-gray-400">inkl. porto</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Kurs-kort: beløp er eks. mva, uten porto (deles ut på kurs). Bestillinger: beløp inkl. porto.
              Kort-tall på kurs kan overstyres med «endre» og tilbakestilles med «↺».
            </p>

            {/* Prisinnstillinger (flyttet fra bestillinger-siden) */}
            <div className="mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                <h2 className="font-semibold text-gray-800 text-base">Prisinnstillinger</h2>
                <p className="text-xs text-gray-500 mt-0.5">Kortpris og portotrapper som brukes i bestillingsskjemaet og i beløpene over.</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kortpris per stk (kr)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" value={satserForm.kortpris}
                      onChange={e => setSatserForm(s => ({ ...s, kortpris: Number(e.target.value) }))}
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]" />
                    <span className="text-sm text-gray-500">kr / kort</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Portotrapper (basert på antall kort)</label>
                    <button type="button"
                      onClick={() => setSatserForm(s => ({ ...s, portoSatser: [...s.portoSatser, { fraAntall: (s.portoSatser.at(-1)?.tilAntall ?? 0) + 1, tilAntall: null, porto: 99 }] }))}
                      className="text-xs text-[#B5560F] hover:underline">+ Legg til trinn</button>
                  </div>
                  <div className="space-y-2">
                    {satserForm.portoSatser.map((trinn, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 w-6 text-right">{i + 1}.</span>
                        <input type="number" min="1" value={trinn.fraAntall}
                          onChange={e => setSatserForm(s => { const ny = [...s.portoSatser]; ny[i] = { ...ny[i], fraAntall: Number(e.target.value) }; return { ...s, portoSatser: ny } })}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]" />
                        <span className="text-xs text-gray-400">–</span>
                        <input type="number" min="1" placeholder="∞" value={trinn.tilAntall ?? ''}
                          onChange={e => setSatserForm(s => { const ny = [...s.portoSatser]; ny[i] = { ...ny[i], tilAntall: e.target.value === '' ? null : Number(e.target.value) }; return { ...s, portoSatser: ny } })}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]" />
                        <span className="text-xs text-gray-500">kort</span>
                        <span className="text-xs text-gray-400">→</span>
                        <input type="number" min="0" value={trinn.porto}
                          onChange={e => setSatserForm(s => { const ny = [...s.portoSatser]; ny[i] = { ...ny[i], porto: Number(e.target.value) }; return { ...s, portoSatser: ny } })}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]" />
                        <span className="text-xs text-gray-500">kr porto</span>
                        {satserForm.portoSatser.length > 1 && (
                          <button type="button" onClick={() => setSatserForm(s => ({ ...s, portoSatser: s.portoSatser.filter((_, j) => j !== i) }))}
                            className="text-red-400 hover:text-red-600 text-xs ml-1">Slett</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <button type="button"
                    onClick={() => { lagreSatser(satserForm); setSatserLagret(true); setTimeout(() => setSatserLagret(false), 2500) }}
                    className="bg-[#FF7B31] text-gray-900 font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4681a] transition-colors text-sm">
                    {satserLagret ? 'Lagret!' : 'Lagre innstillinger'}
                  </button>
                  <button type="button" onClick={() => setSatserForm(STANDARD_SATSER)}
                    className="border border-gray-300 text-gray-600 px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors text-sm">
                    Tilbakestill til standard
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
