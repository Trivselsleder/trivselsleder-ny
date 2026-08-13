const UKEDAGER = ['MANDAG', 'TIRSDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LØRDAG', 'SØNDAG']

// Oppsett for planen: år, uke(r), hvilke ukedager (kolonner), orientering.
export default function PeriodeplanOppsett({ plan, onEndre }) {
  function toggleDag(d) {
    const har = plan.dager.includes(d)
    // behold kanonisk ukedag-rekkefølge
    const nye = UKEDAGER.filter((x) => (x === d ? !har : plan.dager.includes(x)))
    onEndre({ dager: nye })
  }

  function settUker(tekst) {
    const uker = tekst
      .split(/[\s,]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 53)
    onEndre({ uker })
  }

  const felt = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange'

  return (
    <div className="border border-gray-200 rounded-xl p-4 flex flex-wrap gap-5 items-end">
      <label className="text-xs text-gray-500">År
        <input
          type="number"
          defaultValue={plan.aar || ''}
          onBlur={(e) => onEndre({ aar: e.target.value ? Number(e.target.value) : null })}
          className={`${felt} w-24 mt-0.5 block`}
          placeholder="2026"
        />
      </label>
      <label className="text-xs text-gray-500">Uke(r) <span className="text-gray-400">(f.eks. 39, 41)</span>
        <input
          type="text"
          defaultValue={(plan.uker || []).join(', ')}
          onBlur={(e) => settUker(e.target.value)}
          className={`${felt} w-40 mt-0.5 block`}
          placeholder="39, 41"
        />
      </label>

      <div className="text-xs text-gray-500">
        Ukedager (kolonner)
        <div className="flex flex-wrap gap-1.5 mt-1">
          {UKEDAGER.map((d) => {
            const på = plan.dager.includes(d)
            return (
              <button
                key={d}
                onClick={() => toggleDag(d)}
                className={`px-2 py-1 rounded-full text-xs border transition ${på ? 'bg-orange text-white border-orange' : 'bg-white text-gray-500 border-gray-300 hover:border-orange'}`}
              >
                {d.slice(0, 3)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Retning
        <div className="flex gap-1.5 mt-1">
          {[['landscape', 'Liggende'], ['portrait', 'Stående']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => onEndre({ orientering: v })}
              className={`px-3 py-1 rounded-full text-xs border transition ${plan.orientering === v ? 'bg-magenta text-white border-magenta' : 'bg-white text-gray-500 border-gray-300 hover:border-magenta'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
