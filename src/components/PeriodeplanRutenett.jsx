import { useState } from 'react'
import { lekEmoji, lekFarge } from '../lib/lekIkon'

// A2-stylet ukerutenett: dager som kolonner, leker som rader, TL-klasser som «chips»
// i cellene, ansvarlig (TL-vakt) per dag. Samme data-plumbing som før
// (onCelle / onAnsvarlig / onSlettRad / onFlyttRad) — bare rikere presentasjon.
export default function PeriodeplanRutenett({ plan, deltakere, onCelle, onAnsvarlig, onSlettRad, onFlyttRad, onSted, dagerVises }) {
  const dager = dagerVises && dagerVises.length ? dagerVises : (plan.dager || [])
  const navnListe = [...new Set((deltakere || []).flatMap((d) => [d.navn, d.gruppe].filter(Boolean)))]

  if (dager.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center text-gray-500 py-10 px-4">
        Ingen ukedager valgt. Åpne <b>Innstillinger</b> og velg hvilke dager planen skal dekke.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="w-full border-collapse min-w-max">
        <caption className="sr-only">Periodeplan: TL-klasser per lek og ukedag</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left align-bottom px-4 py-3 w-64 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lek</span>
            </th>
            {dager.map((d) => (
              <th key={d} scope="col" className="px-3 py-3 min-w-[124px] border-b border-gray-100 border-l border-gray-100">
                <span className="inline-block text-sm font-bold text-white bg-orange rounded-full px-3 py-1">{d}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Ansvar-rad */}
          <tr className="bg-orange/5">
            <th scope="row" className="text-left px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#B5560F]">Ansvar · TL-vakt</span>
            </th>
            {dager.map((d) => (
              <td key={d} className="px-2 py-2 border-b border-gray-100 border-l border-gray-100">
                <input
                  key={`ans-${d}`}
                  defaultValue={plan.ansvarlige?.[d] || ''}
                  list="tl-navn"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (plan.ansvarlige?.[d] || '')) onAnsvarlig(d, v) }}
                  placeholder="—"
                  aria-label={`Ansvarlig ${d}`}
                  className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 text-center"
                />
              </td>
            ))}
          </tr>

          {plan.rader.length === 0 ? (
            <tr>
              <td colSpan={dager.length + 1} className="px-4 py-10 text-center text-gray-500">
                Ingen leker ennå. Legg til fra biblioteket til venstre — eller «Smarte forslag».
              </td>
            </tr>
          ) : (
            plan.rader.map((r, idx) => {
              const emoji = r.lek?.id ? lekEmoji(r.lek) : '🎈'
              const farge = r.lek?.id ? lekFarge(r.lek) : '#9ca3af'
              const meta = r.lek?.egnet?.[0]
              const tittel = r.lek?.tittel || 'Lek'
              return (
                <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50">
                  <th scope="row" className="text-left px-4 py-3 align-top font-normal">
                    <div className="flex items-start gap-2.5">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-base shrink-0" style={{ background: farge }}>{emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 leading-snug">{tittel}</p>
                        {meta && <p className="text-xs text-gray-500 mt-0.5">{meta}</p>}
                        <StedInline verdi={r.celler?._sted || ''} onLagre={(v) => onSted(r.id, v)} />
                      </div>
                      <span className="flex flex-col leading-none text-gray-500 -mt-0.5">
                        <button onClick={() => onFlyttRad(idx, -1)} disabled={idx === 0} className="p-1 hover:text-orange disabled:opacity-30 text-xs" aria-label={`Flytt ${tittel} opp`} title="Opp">▲</button>
                        <button onClick={() => onFlyttRad(idx, 1)} disabled={idx === plan.rader.length - 1} className="p-1 hover:text-orange disabled:opacity-30 text-xs" aria-label={`Flytt ${tittel} ned`} title="Ned">▼</button>
                      </span>
                      <button onClick={() => onSlettRad(r.id)} className="p-1 text-gray-500 hover:text-red-500 shrink-0 text-lg leading-none" aria-label={`Fjern ${tittel}`} title="Fjern rad">×</button>
                    </div>
                  </th>
                  {dager.map((d) => (
                    <td key={d} className="px-2 py-2 align-top border-l border-gray-50">
                      <Celle verdi={r.celler?.[d] || ''} onLagre={(v) => onCelle(r.id, d, v)} />
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <datalist id="tl-navn">
        {navnListe.map((n) => <option key={n} value={n} />)}
      </datalist>
    </div>
  )
}

// Sted/lokasjon per lek (📍) — lagres i celler._sted (jsonb-hjørne, ingen schema-endring).
function StedInline({ verdi, onLagre }) {
  const [rediger, setRediger] = useState(false)
  if (rediger) {
    return (
      <input
        autoFocus
        defaultValue={verdi}
        placeholder="Sted, f.eks. Skolegården"
        aria-label="Sted"
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== verdi) onLagre(v); setRediger(false) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = verdi; setRediger(false) } }}
        className="mt-1 w-full text-xs px-2 py-1 rounded-lg border border-orange focus:outline-none focus:ring-2 focus:ring-orange/20"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setRediger(true)}
      className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-orange"
      aria-label={verdi ? `Sted: ${verdi}` : 'Legg til sted'}
    >
      <span aria-hidden="true">📍</span>{verdi || <span className="text-gray-400">Legg til sted</span>}
    </button>
  )
}

// En celle: viser TL-klasser som chips (komma-separert tekst), klikk for å redigere.
// (Ingen datalist her — den ville erstattet HELE kommaseparerte verdien og spist chips.)
function Celle({ verdi, onLagre }) {
  const [rediger, setRediger] = useState(false)
  const chips = verdi.split(',').map((s) => s.trim()).filter(Boolean)

  if (rediger) {
    return (
      <input
        autoFocus
        defaultValue={verdi}
        placeholder="Ada 7A, Jonas 7A …"
        aria-label="TL-klasser (komma mellom hver)"
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== verdi) onLagre(v); setRediger(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { e.currentTarget.value = verdi; setRediger(false) }
        }}
        className="w-full text-sm px-2 py-1.5 rounded-lg border border-orange focus:outline-none focus:ring-2 focus:ring-orange/20"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setRediger(true)}
      className="w-full min-h-[40px] flex flex-wrap gap-1 items-center rounded-lg px-1.5 py-1 hover:bg-orange/5 transition text-left"
      aria-label={chips.length ? `Rediger TL-klasser: ${chips.join(', ')}` : 'Legg til TL-klasse'}
    >
      {chips.length === 0 ? (
        <span className="text-gray-400 text-lg leading-none px-1">+</span>
      ) : (
        chips.map((c, i) => (
          <span key={i} className="text-xs font-medium bg-orange/10 text-[#B5560F] px-2 py-0.5 rounded-full whitespace-nowrap">{c}</span>
        ))
      )}
    </button>
  )
}
