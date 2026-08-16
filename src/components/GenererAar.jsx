import { useMemo, useState } from 'react'
import { genererForUker } from '../lib/periodeplan'

// Foreslåtte norske ferieuker (varierer med region/år – redigerbare).
const FORESLATTE_FERIER = [8, 15, 16, 40, 52, 1]

export default function GenererAar({ plan, onGenerert }) {
  const [fra, setFra] = useState(34)
  const [til, setTil] = useState(50)
  const [ferier, setFerier] = useState(new Set(FORESLATTE_FERIER))
  const [jobber, setJobber] = useState(false)
  const [melding, setMelding] = useState(null)

  const uker = useMemo(() => {
    const a = Math.max(1, Math.min(fra, til))
    const b = Math.min(53, Math.max(fra, til))
    const liste = []
    for (let u = a; u <= b; u++) if (!ferier.has(u)) liste.push(u)
    return liste
  }, [fra, til, ferier])

  function toggleFerie(u) {
    setFerier((s) => {
      const n = new Set(s)
      n.has(u) ? n.delete(u) : n.add(u)
      return n
    })
  }

  async function generer() {
    if (jobber || uker.length === 0) return
    setJobber(true)
    setMelding(null)
    try {
      const antall = await genererForUker(plan.id, uker)
      setMelding(`Laget ${antall} planer (én per uke). Se dem under «Mine planer».`)
      onGenerert?.()
    } catch (e) {
      setMelding('Kunne ikke generere: ' + e.message)
    } finally {
      setJobber(false)
    }
  }

  const felt = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-20 focus:outline-none focus:border-orange'
  // uker i valgt spenn til å huke av som ferie (klemt til gyldig 1–53)
  const spennUker = []
  for (let u = Math.max(1, Math.min(fra, til)); u <= Math.min(53, Math.max(fra, til)); u++) spennUker.push(u)

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-900 text-sm">Generer hele skoleåret</h3>
      <p className="text-xs text-gray-500 mt-1">
        Lager én plan per uke med dette rutenettet som mal. Huk av ferieukene som skal hoppes over.
      </p>

      <div className="flex flex-wrap items-end gap-4 mt-3">
        <label className="text-xs text-gray-500">Fra uke
          <input type="number" value={fra} onChange={(e) => setFra(Number(e.target.value))} className={`${felt} block mt-0.5`} />
        </label>
        <label className="text-xs text-gray-500">Til uke
          <input type="number" value={til} onChange={(e) => setTil(Number(e.target.value))} className={`${felt} block mt-0.5`} />
        </label>
      </div>

      <div className="text-xs text-gray-500 mt-3">Hopp over (ferieuker):
        <div className="flex flex-wrap gap-1 mt-1 max-w-2xl">
          {spennUker.map((u) => (
            <button
              key={u}
              onClick={() => toggleFerie(u)}
              className={`w-8 py-1 rounded text-xs border transition ${ferier.has(u) ? 'bg-gray-200 text-gray-400 line-through border-gray-200' : 'bg-white text-gray-600 border-gray-300 hover:border-orange'}`}
              title={ferier.has(u) ? 'Hoppes over' : 'Tas med'}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={generer}
          disabled={jobber || uker.length === 0}
          className="bg-orange text-gray-900 font-medium px-5 py-2 rounded-full hover:bg-orange/90 transition disabled:opacity-50"
        >
          {jobber ? 'Genererer …' : `Generer ${uker.length} uker`}
        </button>
        {melding && <span className="text-sm text-petrol">{melding}</span>}
      </div>
    </div>
  )
}
