import { useState } from 'react'
import LekeVelger from './LekeVelger'

// Kakestykker = leker (peker) ELLER fri tekst (klasseliste, utfordring, navn ...).
// valgte: [{ kind:'lek'|'fri', id?, tittel, key }]
export default function KakestykkeVelger({ valgte, onToggleLek, onLeggFri, onFjern }) {
  const [fritekst, setFritekst] = useState('')

  function leggTil() {
    const t = fritekst.trim()
    if (!t) return
    onLeggFri(t)
    setFritekst('')
  }

  const lekIder = valgte.filter((x) => x.kind === 'lek').map((x) => x.id)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        Kakestykker: <span className="font-medium text-gray-700">{valgte.length}</span>
      </p>

      {valgte.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {valgte.map((x) => (
            <span key={x.key}
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                x.kind === 'fri' ? 'bg-petrol/10 text-petrol' : 'bg-orange/10 text-orange'
              }`}>
              {x.kind === 'fri' && <span aria-hidden>✎</span>}
              {x.tittel}
              <button onClick={() => onFjern(x)} className="hover:opacity-70" aria-label="Fjern">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Fri tekst */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={fritekst}
          onChange={(e) => setFritekst(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTil() } }}
          placeholder="Skriv fri tekst (navn, utfordring …) og trykk Enter"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange"
        />
        <button onClick={leggTil} disabled={!fritekst.trim()}
          className="shrink-0 bg-petrol text-white font-medium px-4 py-2.5 rounded-xl hover:bg-petrol/90 disabled:opacity-50">
          + Legg til
        </button>
      </div>

      {/* Leker fra biblioteket */}
      <p className="text-xs text-gray-400 mb-2">… eller søk opp leker fra biblioteket:</p>
      <LekeVelger valgteIder={lekIder} onVelg={onToggleLek} modus="toggle" />
    </div>
  )
}
