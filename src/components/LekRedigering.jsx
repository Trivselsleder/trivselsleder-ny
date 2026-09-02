import { useState } from 'react'
import { lagreLekMeta, lagreInnhold } from '../lib/leker'

const PUNKTER = [
  ['formaal', 'Formålet'],
  ['forberedelse', 'Forberedelse'],
  ['inndeling', 'Inndeling'],
  ['utgangsposisjon', 'Utgangsposisjon'],
  ['kronologi', 'Slik gjør dere det'],
  ['regler', 'Regler'],
  ['variasjoner', 'Variasjoner og tilpasninger'],
  ['instruktoernotat', 'Notat til den voksne'],
]

// Redigering på stedet for interne (superadmin/ansatt). lek = objektet fra formLek().
export default function LekRedigering({ lek, onLagret, onAvbryt }) {
  const sprak = lek.tekst?.sprak || 'nb'
  const [meta, setMeta] = useState({
    sted: lek.sted || 'begge',
    antall_min: lek.antallMin ?? '',
    antall_maks: lek.antallMaks ?? '',
    kan_ledes_av_elever: !!lek.kanLedesAvElever,
  })
  const [innhold, setInnhold] = useState({
    tittel: lek.tekst?.tittel || '',
    formaal: lek.tekst?.formaal || '',
    forberedelse: lek.tekst?.forberedelse || '',
    inndeling: lek.tekst?.inndeling || '',
    utgangsposisjon: lek.tekst?.utgangsposisjon || '',
    kronologi: lek.tekst?.kronologi || '',
    regler: lek.tekst?.regler || '',
    variasjoner: lek.tekst?.variasjoner || '',
    instruktoernotat: lek.tekst?.instruktoernotat || '',
  })
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState(null)

  function m(k, v) { setMeta((s) => ({ ...s, [k]: v })) }
  function i(k, v) { setInnhold((s) => ({ ...s, [k]: v })) }

  async function lagre() {
    if (lagrer) return
    setLagrer(true)
    setFeil(null)
    try {
      await lagreLekMeta(lek.id, {
        sted: meta.sted,
        antall_min: meta.antall_min === '' ? null : Number(meta.antall_min),
        antall_maks: meta.antall_maks === '' ? null : Number(meta.antall_maks),
        // «Kan ledes av elever» er fjernet fra visningen (Kjartans beslutning 2. sep 2026):
        // hele TL-programmet er elevledet, så feltet skiller ingenting. Verdien sendes
        // fortsatt uendret her slik at databasekolonnen bevares intakt ved redigering.
        kan_ledes_av_elever: meta.kan_ledes_av_elever,
      })
      await lagreInnhold(lek.id, sprak, innhold)
      onLagret()
    } catch (e) {
      setFeil(e.message)
    } finally {
      setLagrer(false)
    }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange'
  const omr = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange min-h-[70px]'

  return (
    <div className="border border-petrol/30 rounded-2xl p-5 bg-petrol/5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Rediger lek <span className="text-xs font-normal text-gray-400">({sprak})</span></h2>
        <span className="text-xs text-gray-400">Endringer logges automatisk</span>
      </div>

      <label className="block text-xs text-gray-500 mt-4">Tittel
        <input type="text" value={innhold.tittel} onChange={(e) => i('tittel', e.target.value)} className={`${felt} mt-0.5`} />
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <label className="text-xs text-gray-500">Sted
          <select value={meta.sted} onChange={(e) => m('sted', e.target.value)} className={`${felt} mt-0.5`}>
            <option value="inne">Inne</option>
            <option value="ute">Ute</option>
            <option value="begge">Begge</option>
          </select>
        </label>
        <label className="text-xs text-gray-500">Antall min
          <input type="number" value={meta.antall_min} onChange={(e) => m('antall_min', e.target.value)} className={`${felt} mt-0.5`} />
        </label>
        <label className="text-xs text-gray-500">Antall maks
          <input type="number" value={meta.antall_maks} onChange={(e) => m('antall_maks', e.target.value)} className={`${felt} mt-0.5`} />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {PUNKTER.map(([k, label]) => (
          <label key={k} className="block text-xs text-gray-500">{label}
            <textarea value={innhold[k]} onChange={(e) => i(k, e.target.value)} className={`${omr} mt-0.5`} />
          </label>
        ))}
      </div>

      {feil && <p className="text-sm text-red-500 mt-3">Kunne ikke lagre: {feil}</p>}

      <div className="flex gap-3 mt-4">
        <button onClick={lagre} disabled={lagrer} className="bg-petrol text-white font-medium px-6 py-2.5 rounded-full hover:bg-petrol/90 transition disabled:opacity-50">
          {lagrer ? 'Lagrer …' : 'Lagre endringer'}
        </button>
        <button onClick={onAvbryt} className="text-gray-500 hover:text-gray-700 px-4">Avbryt</button>
      </div>
    </div>
  )
}
