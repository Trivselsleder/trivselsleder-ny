import { useEffect, useMemo, useState } from 'react'
import { hentLeker } from '../lib/leker'

// Gjenbrukbar biblioteksøker. Kaller onVelg(lek) når en lek trykkes.
// modus 'toggle' viser hake for allerede valgte; 'legg-til' viser «Legg til».
export default function LekeVelger({ valgteIder = [], onVelg, modus = 'toggle' }) {
  const [alle, setAlle] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [sok, setSok] = useState('')
  const [fEgnet, setFEgnet] = useState('')
  const [fSted, setFSted] = useState('')

  useEffect(() => {
    hentLeker()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [])

  const valgt = useMemo(() => new Set(valgteIder), [valgteIder])

  const egnetValg = useMemo(() => {
    const s = new Set()
    alle.forEach((l) => l.egnet.forEach((x) => s.add(x)))
    return [...s].sort()
  }, [alle])

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alle.filter((l) => {
      if (q && !`${l.tittel || ''} ${l.tekst.formaal || ''}`.toLowerCase().includes(q)) return false
      if (fEgnet && !l.egnet.includes(fEgnet)) return false
      if (fSted && !(l.sted === fSted || l.sted === 'begge')) return false
      return true
    })
  }, [alle, sok, fEgnet, fSted])

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange'

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Søk i biblioteket …"
          className="flex-1 min-w-[180px] border border-gray-300 rounded-xl px-4 py-2 bg-white focus:outline-none focus:border-orange"
        />
        <select className={selCls} value={fEgnet} onChange={(e) => setFEgnet(e.target.value)}>
          <option value="">Egnet for …</option>
          {egnetValg.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} value={fSted} onChange={(e) => setFSted(e.target.value)}>
          <option value="">Sted …</option>
          <option value="inne">Inne</option>
          <option value="ute">Ute</option>
        </select>
      </div>

      {laster && <p className="text-gray-400 mt-4 text-sm">Laster leker …</p>}
      {feil && <p className="text-red-500 mt-4 text-sm">Kunne ikke hente leker: {feil}</p>}

      {!laster && !feil && (
        <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-gray-100 bg-white rounded-xl border border-gray-100">
          {treff.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">Ingen leker matchet søket.</p>
          ) : (
            treff.map((l) => {
              const erValgt = valgt.has(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onVelg(l)}
                  className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-orange/5"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-gray-900 block truncate">{l.tittel}</span>
                    <span className="text-xs text-gray-400">
                      {[l.sted, l.egnet.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {modus === 'toggle' ? (
                    <span className={`shrink-0 text-sm ${erValgt ? 'text-magenta font-semibold' : 'text-gray-300'}`}>
                      {erValgt ? '✓ Valgt' : 'Legg til'}
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm text-orange font-medium">+ Legg til</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
