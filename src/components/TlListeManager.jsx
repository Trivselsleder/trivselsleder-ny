import { useEffect, useState } from 'react'
import { hentDeltakere, leggTilDeltaker, fjernDeltaker } from '../lib/tlDeltaker'

// Skolens egen TL-liste (ansvarlige/grupper). Skoleadmin redigerer.
export default function TlListeManager({ onEndret }) {
  const [liste, setListe] = useState([])
  const [navn, setNavn] = useState('')
  const [gruppe, setGruppe] = useState('')
  const [feil, setFeil] = useState(null)

  function last() {
    hentDeltakere().then(setListe).catch((e) => setFeil(e.message))
  }
  useEffect(last, [])

  async function leggTil() {
    if (!navn.trim()) return
    try {
      await leggTilDeltaker({ navn: navn.trim(), gruppe: gruppe.trim() || null })
      setNavn(''); setGruppe('')
      last(); onEndret?.()
    } catch (e) { setFeil(e.message) }
  }

  async function fjern(id) {
    await fjernDeltaker(id)
    last(); onEndret?.()
  }

  const felt = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange'

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-900 text-sm">Skolens TL-liste</h3>
      <p className="text-xs text-gray-500 mt-1">Navn/grupper her dukker opp som forslag i cellene og på «Ansvarlig».</p>

      {feil && <p className="text-sm text-red-500 mt-2">{feil}</p>}

      <div className="flex flex-wrap gap-2 mt-3">
        <input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn (f.eks. Katrine)" className={felt} />
        <input value={gruppe} onChange={(e) => setGruppe(e.target.value)} placeholder="Gruppe/klasse (valgfritt)" className={felt} />
        <button onClick={leggTil} disabled={!navn.trim()} className="bg-orange text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-orange/90 disabled:opacity-50">
          Legg til
        </button>
      </div>

      {liste.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {liste.map((d) => (
            <span key={d.id} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              {d.navn}{d.gruppe ? ` · ${d.gruppe}` : ''}
              <button onClick={() => fjern(d.id)} className="text-gray-400 hover:text-red-500" aria-label="Fjern">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
