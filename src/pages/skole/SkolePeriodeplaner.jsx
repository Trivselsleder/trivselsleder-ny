import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hentPlaner, opprettPlan, kopierPlan, arkiverPlan, NIVAA, planNivaa, nivaaLabel } from '../../lib/periodeplan'

export default function SkolePeriodeplaner() {
  const [planer, setPlaner] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [nytt, setNytt] = useState(false)
  const [navn, setNavn] = useState('')
  const [aar, setAar] = useState('')
  const [nivaa, setNivaa] = useState('hele')
  const [lagrer, setLagrer] = useState(false)
  const [sortering, setSortering] = useState('dato') // 'dato' | 'navn'
  const navigate = useNavigate()

  function last() {
    setLaster(true)
    hentPlaner().then(setPlaner).catch((e) => setFeil(e.message)).finally(() => setLaster(false))
  }
  useEffect(last, [])

  const sortert = useMemo(() => {
    const p = [...planer]
    if (sortering === 'navn') p.sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'))
    return p
  }, [planer, sortering])

  async function lagPlan() {
    if (!navn.trim() || lagrer) return
    setLagrer(true)
    try {
      const id = await opprettPlan({ navn: navn.trim(), aar: aar ? Number(aar) : null, nivaa: nivaa || null })
      navigate(`/min-side/periodeplaner/${id}`)
    } catch (e) { setFeil(e.message); setLagrer(false) }
  }

  async function kopier(p) {
    const id = await kopierPlan(p.id, `${p.navn} (kopi)`)
    navigate(`/min-side/periodeplaner/${id}`)
  }

  async function arkiver(p) {
    await arkiverPlan(p.id)
    last()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periodeplaner</h1>
          <p className="text-gray-500 text-sm mt-1">Ukerutenett med leker, ansvarlige og TL-klasser — som i dag, bare bedre.</p>
        </div>
        {!nytt && (
          <button onClick={() => setNytt(true)} className="shrink-0 bg-orange text-gray-900 font-medium px-5 py-2.5 rounded-full hover:bg-[#e8641c] transition">
            + Ny plan
          </button>
        )}
      </div>

      {feil && <p className="text-red-500 mt-4">{feil}</p>}

      {nytt && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900">Ny periodeplan</h2>
          <div className="flex flex-wrap gap-3 mt-3">
            <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn (f.eks. «Sørumsand – høst»)"
              className="flex-1 min-w-[220px] border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange" />
            <input type="number" value={aar} onChange={(e) => setAar(e.target.value)} placeholder="År"
              className="w-28 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange" />
            <label className="flex flex-col text-xs text-gray-500">
              <span className="mb-1">Nivå</span>
              <select value={nivaa} onChange={(e) => setNivaa(e.target.value)} aria-label="Nivå (hvem planen gjelder for)"
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange">
                {NIVAA.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">Nivået sier hvem planen gjelder for — velg om den er for barneskolen, ungdomsskolen eller hele skolen.</p>
          <div className="flex gap-3 mt-4">
            <button onClick={lagPlan} disabled={!navn.trim() || lagrer} className="bg-orange text-gray-900 font-medium px-6 py-2.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50">
              {lagrer ? 'Lagrer …' : 'Lag plan'}
            </button>
            <button onClick={() => { setNytt(false); setNavn(''); setAar('') }} className="text-gray-500 hover:text-gray-700 px-4">Avbryt</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <h2 className="font-bold text-gray-900">Mine planer</h2>
        <label className="text-sm text-gray-500 flex items-center gap-2">
          Sorter:
          <select value={sortering} onChange={(e) => setSortering(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm">
            <option value="dato">Nyeste</option>
            <option value="navn">Navn</option>
          </select>
        </label>
      </div>

      {laster && <p className="text-gray-400 mt-4">Laster …</p>}
      {!laster && sortert.length === 0 && <p className="text-gray-400 mt-4">Ingen planer ennå. Trykk «+ Ny plan».</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {sortert.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition p-5">
            <Link to={`/min-side/periodeplaner/${p.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-900 hover:text-orange-ink">{p.navn}</h3>
                {planNivaa(p) && <span className="shrink-0 text-xs bg-orange/10 text-[#B5560F] px-2 py-0.5 rounded-full">{nivaaLabel(planNivaa(p))}</span>}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {[p.uker.length ? `Uke ${p.uker.join(', ')}` : null, p.aar].filter(Boolean).join(' · ') || 'Ingen uker satt'}
              </p>
              <p className="text-xs text-gray-400 mt-1">{p.rader.length} leker · {p.dager.length} dager</p>
            </Link>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => kopier(p)} className="text-xs text-gray-500 hover:text-orange-ink">Kopier</button>
              <button onClick={() => arkiver(p)} className="text-xs text-gray-400 hover:text-red-500 ml-auto">Arkiver</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
