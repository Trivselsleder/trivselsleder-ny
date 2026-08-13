import { lekEmoji, lekFarge } from '../lib/lekIkon'

// Selve ukerutenettet: dager som kolonner, leker som rader, TL-klasse i cellene,
// ansvarlig per dag. Innfelt redigering (uncontrolled + onBlur) for å unngå churn.
export default function PeriodeplanRutenett({ plan, deltakere, onCelle, onAnsvarlig, onSlettRad, onFlyttRad }) {
  const dager = plan.dager || []
  const navnListe = [...new Set((deltakere || []).flatMap((d) => [d.navn, d.gruppe].filter(Boolean)))]

  const th = 'border border-gray-300 px-2 py-1.5 text-xs'
  const inp = 'w-full text-xs px-1.5 py-1 border border-transparent hover:border-gray-200 focus:border-orange rounded focus:outline-none text-center'

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full border-collapse min-w-max">
        <thead>
          <tr>
            <th className={`${th} bg-white text-left w-56`}>Lek</th>
            {dager.map((d) => (
              <th key={d} className={`${th} bg-orange text-white text-center min-w-[120px]`}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-orange/10">
            <th className={`${th} text-left font-semibold`}>Ansvarlig</th>
            {dager.map((d) => (
              <td key={d} className={th}>
                <input
                  key={`ans-${d}`}
                  defaultValue={plan.ansvarlige?.[d] || ''}
                  list="tl-navn"
                  onBlur={(e) => onAnsvarlig(d, e.target.value)}
                  className={inp}
                  placeholder="—"
                />
              </td>
            ))}
          </tr>

          {plan.rader.map((r, idx) => {
            const emoji = r.lek?.id ? lekEmoji(r.lek) : '🎈'
            const farge = r.lek?.id ? lekFarge(r.lek) : '#9ca3af'
            return (
              <tr key={r.id} className="even:bg-gray-50/60">
                <th className={`${th} text-left font-medium`}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-sm shrink-0" style={{ background: farge }}>{emoji}</span>
                    <span className="flex-1 text-gray-900">{r.lek?.tittel}</span>
                    <span className="flex flex-col leading-none text-gray-300">
                      <button onClick={() => onFlyttRad(idx, -1)} disabled={idx === 0} className="hover:text-orange disabled:opacity-30" title="Opp">▲</button>
                      <button onClick={() => onFlyttRad(idx, 1)} disabled={idx === plan.rader.length - 1} className="hover:text-orange disabled:opacity-30" title="Ned">▼</button>
                    </span>
                    <button onClick={() => onSlettRad(r.id)} className="text-gray-300 hover:text-red-500 shrink-0" title="Fjern rad">×</button>
                  </div>
                </th>
                {dager.map((d) => (
                  <td key={d} className={th}>
                    <input
                      key={`${r.id}-${d}`}
                      defaultValue={r.celler?.[d] || ''}
                      list="tl-navn"
                      onBlur={(e) => onCelle(r.id, d, e.target.value)}
                      className={inp}
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

      <datalist id="tl-navn">
        {navnListe.map((n) => <option key={n} value={n} />)}
      </datalist>
    </div>
  )
}
