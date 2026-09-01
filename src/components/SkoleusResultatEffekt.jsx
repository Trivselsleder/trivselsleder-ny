import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// DEL F, trinn 2B: resultatkort for skoleundersøkelsens EFFEKT-matrise.
// Viser snitt PER RAD («X,X av N») på tvers av alle skoler som har svart i runden.
// Data: RPC-en skoleus_resultat_effekt(p_runde) (migr 086 → 087) — aggregerer mot
// rundens undersokelse_id (ikke globalt) og returnerer skala_max fra effekt-spørsmålet.
// Gjenbrukbart: skoleus-admin nå, ledelsessiden senere.
// Merkefarger (GRAFISK-IDENTITET-v2): petrol #106C75 overskrift, teal #54A1AB søyler.
// Ingen oransje her — ingenting på kortet er et ekte varsel.

const STANDARD_SKALA = 6  // trygg fallback hvis RPC ikke gir skala_max (skal normalt finnes)

function formaterSnitt(n) {
  if (n === null || n === undefined) return '–'
  return Number(n).toFixed(1).replace('.', ',')  // norsk desimalkomma
}

export default function SkoleusResultatEffekt({ rundeId, className = '', onSeHele }) {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    let aktiv = true
    async function hent() {
      setLaster(true)
      setFeil(null)
      const { data, error } = await supabase.rpc('skoleus_resultat_effekt', { p_runde: rundeId })
      if (!aktiv) return
      if (error) {
        setFeil(error.message)
        setRader([])
      } else {
        setRader(data || [])
      }
      setLaster(false)
    }
    if (rundeId) hent()
    return () => { aktiv = false }
  }, [rundeId])

  const harSvar = rader.some(r => (r.antall_svar || 0) > 0)
  const antSkoler = rader.reduce((m, r) => Math.max(m, r.antall_svar || 0), 0)
  // Skala fra RPC-svaret (effekt-spørsmålets skala_max). Trygg fallback.
  const skalaMax = rader.find(r => r.skala_max != null && Number(r.skala_max) > 0)?.skala_max ?? STANDARD_SKALA

  return (
    <div className={'bg-white border border-gray-200 rounded-xl p-5 ' + className}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h4 className="text-lg font-semibold text-petrol">Effekt av programmet</h4>
        <span className="text-xs text-gray-500">Snitt av {skalaMax}</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Snitt på tvers av skolene som har svart
        {antSkoler > 0 ? ` (${antSkoler} ${antSkoler === 1 ? 'skole' : 'skoler'})` : ''}.
      </p>

      {laster ? (
        <p className="text-sm text-gray-500">Laster resultat …</p>
      ) : feil ? (
        <p className="text-sm text-pink-700">Kunne ikke hente resultat: {feil}</p>
      ) : rader.length === 0 ? (
        <p className="text-sm text-gray-500">Ingen effekt-spørsmål i denne undersøkelsen.</p>
      ) : !harSvar ? (
        <p className="text-sm text-gray-500">Ingen svar ennå.</p>
      ) : (
        <ul className="space-y-3">
          {rader.map(rad => {
            const har = rad.snitt !== null && rad.snitt !== undefined
            const pct = har ? Math.max(0, Math.min(100, (Number(rad.snitt) / skalaMax) * 100)) : 0
            return (
              <li key={rad.matriserad_id}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-sm text-gray-800">{rad.radtekst}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {formaterSnitt(rad.snitt)} <span className="font-normal text-gray-400">av {skalaMax}</span>
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-petrol/10 overflow-hidden"
                  role="img"
                  aria-label={har ? `${formaterSnitt(rad.snitt)} av ${skalaMax}` : 'Ingen svar'}
                >
                  <div className="h-full rounded-full bg-teal" style={{ width: pct + '%' }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100">
        {onSeHele ? (
          <button type="button" onClick={onSeHele} className="text-sm font-medium text-petrol hover:underline">
            Se hele undersøkelsen →
          </button>
        ) : (
          <span className="text-sm font-medium text-gray-400 cursor-default" title="Detaljvisning kommer senere">
            Se hele undersøkelsen →
          </span>
        )}
      </div>
    </div>
  )
}
