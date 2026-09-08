import { useState } from 'react'
import { lagreRessurs } from '../lib/leker'

// Innholds-tekstfeltene (utover tittel + beskrivelse) — vises som tekstområder.
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
// Lagrer via RPC-en lagre_ressurs (migr 107): én transaksjon, optimistisk lås, forståelige feil.
// Skjemaet sender KUN feltene det redigerer (ressurs + innhold for ett språk); taksonomi/medier
// utelates → RPC-en rører dem ikke (funn 3/7). endret_at sendes UENDRET som lås-token (funn 4b).
export default function LekRedigering({ lek, onLagret, onAvbryt }) {
  const sprak = lek.tekst?.sprak || 'nb'
  const [meta, setMeta] = useState({
    sted: lek.sted || 'begge',
    antall_min: lek.antallMin ?? '',
    antall_maks: lek.antallMaks ?? '',
  })
  const [innhold, setInnhold] = useState({
    tittel: lek.tekst?.tittel || '',
    // FUNN 3 (kritisk): beskrivelse er importens hovedtekst og MÅ vises/redigeres — ellers ble
    // den usynlig men levende, og en tidligere skjemaversjon kunne nullet den ved lagring.
    beskrivelse: lek.tekst?.beskrivelse || '',
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
      await lagreRessurs({
        id: lek.id,
        endret_at: lek.endretAt,          // RÅ streng fra basen — aldri gjennom Date() (funn 4b)
        sprak,
        ressurs: {
          sted: meta.sted,
          antall_min: meta.antall_min === '' ? null : Number(meta.antall_min),
          antall_maks: meta.antall_maks === '' ? null : Number(meta.antall_maks),
        },
        innhold,                          // alle innholdsfeltene skjemaet viser (inkl. beskrivelse)
      })
      onLagret()
    } catch (e) {
      // Basens feilmeldinger er allerede skrevet for en ikke-teknisk ansatt
      // («Noen andre lagret denne 14:03 …», «Alt-tekst er påkrevd …»).
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

      {/* Beskrivelse = hovedteksten (importens field_description). Stor, tidlig, alltid synlig. */}
      <label className="block text-xs text-gray-500 mt-3">Beskrivelse <span className="text-gray-400">(hovedtekst)</span>
        <textarea value={innhold.beskrivelse} onChange={(e) => i('beskrivelse', e.target.value)} className={`${omr} mt-0.5 min-h-[110px]`} />
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

      {feil && (
        <p className="text-sm text-red-600 mt-3">
          {feil}
          {/Noen andre lagret|finnes ikke|endringsstempel/i.test(feil) && (
            <button onClick={() => window.location.reload()} className="ml-2 underline text-orange-ink">Last inn på nytt</button>
          )}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={lagre} disabled={lagrer} className="bg-petrol text-white font-medium px-6 py-2.5 rounded-full hover:bg-petrol/90 transition disabled:opacity-50">
          {lagrer ? 'Lagrer …' : 'Lagre endringer'}
        </button>
        <button onClick={onAvbryt} className="text-gray-500 hover:text-gray-700 px-4">Avbryt</button>
      </div>
    </div>
  )
}
