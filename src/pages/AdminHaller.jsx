import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TOM_HALL = {
  navn: '', adresse: '', kommune: '', fylke: '',
  nettverk: '', kontaktperson: '', epost: '', telefon: '', pris: '', merknad: '',
}

// Deler en celle med flere verdier (komma eller linjeskift) til en liste
function delOpp(verdi) {
  if (!verdi) return []
  return String(verdi)
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

export default function AdminHaller() {
  const [haller, setHaller] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [redigerer, setRedigerer] = useState(null)   // hall-objekt som redigeres
  const [nyForm, setNyForm] = useState(null)          // nytt-hall-skjema
  const [bekreftSlett, setBekreftSlett] = useState(null)       // enkelt-slett
  const [bekreftMasseslett, setBekreftMasseslett] = useState(false)
  const [søk, setSøk] = useState('')
  const [åpen, setÅpen] = useState(null)              // hvilken hall-rad er utvidet
  const [valgte, setValgte] = useState([])            // id-er krysset av for masseslett

  function hentHaller() {
    supabase
      .from('haller')
      .select('*')
      .order('navn', { ascending: true })
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setHaller(data ?? [])
        setLaster(false)
      })
  }

  useEffect(() => { hentHaller() }, [])

  async function lagreNy() {
    const { error } = await supabase.from('haller').insert([nyForm])
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setNyForm(null)
    hentHaller()
  }

  async function lagreRediger() {
    const { id, ...felter } = redigerer
    const { error } = await supabase.from('haller').update(felter).eq('id', id)
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setRedigerer(null)
    hentHaller()
  }

  async function slettHall(id) {
    const { error } = await supabase.from('haller').delete().eq('id', id)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setBekreftSlett(null)
    setÅpen(null)
    hentHaller()
  }

  async function slettValgte() {
    const { error } = await supabase.from('haller').delete().in('id', valgte)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setBekreftMasseslett(false)
    setValgte([])
    setÅpen(null)
    hentHaller()
  }

  const filtrert = haller.filter(h =>
    !søk ||
    (h.navn || '').toLowerCase().includes(søk.toLowerCase()) ||
    (h.kommune || '').toLowerCase().includes(søk.toLowerCase()) ||
    (h.nettverk || '').toLowerCase().includes(søk.toLowerCase())
  )

  function veksleValgt(id) {
    setValgte(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  }

  const alleValgt = filtrert.length > 0 && filtrert.every(h => valgte.includes(h.id))
  function veksleAlle() {
    if (alleValgt) setValgte([])
    else setValgte(filtrert.map(h => h.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">Felles register over haller som brukes til lekekurs.</p>
        <button
          onClick={() => setNyForm({ ...TOM_HALL })}
          className="bg-orange text-white px-4 py-2 rounded-lg hover:opacity-90 whitespace-nowrap"
        >
          + Ny hall
        </button>
      </div>

      <input
        value={søk}
        onChange={e => setSøk(e.target.value)}
        placeholder="Søk på navn, kommune eller nettverk …"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
      />

      {valgte.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <span className="text-sm text-red-800">{valgte.length} hall(er) valgt</span>
          <div className="flex gap-3">
            <button onClick={() => setValgte([])} className="text-sm text-gray-600 hover:underline">Avbryt</button>
            <button
              onClick={() => setBekreftMasseslett(true)}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            >
              Slett valgte
            </button>
          </div>
        </div>
      )}

      {laster && <p className="text-gray-400">Laster haller …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && filtrert.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          {haller.length === 0 ? 'Ingen haller registrert ennå.' : 'Ingen treff.'}
        </div>
      )}

      {!laster && filtrert.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={alleValgt}
                    onChange={veksleAlle}
                    className="w-4 h-4 align-middle"
                    aria-label="Velg alle"
                  />
                </th>
                <th className="px-4 py-3">Navn</th>
                <th className="px-4 py-3">Kommune</th>
                <th className="px-4 py-3">Nettverk</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtrert.map(h => {
                const erÅpen = åpen === h.id
                const eposter = delOpp(h.epost)
                const telefoner = delOpp(h.telefon)
                const personer = delOpp(h.kontaktperson)
                const antall = Math.max(personer.length, eposter.length, telefoner.length)
                const harKontakt = antall > 0 || h.merknad
                return (
                  <FragmentRad key={h.id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={valgte.includes(h.id)}
                          onChange={() => veksleValgt(h.id)}
                          className="w-4 h-4 align-middle"
                          aria-label={`Velg ${h.navn}`}
                        />
                      </td>
                      <td
                        className="px-4 py-3 font-medium cursor-pointer"
                        onClick={() => setÅpen(erÅpen ? null : h.id)}
                      >
                        {h.navn}
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setÅpen(erÅpen ? null : h.id)}>
                        {h.kommune || '—'}
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setÅpen(erÅpen ? null : h.id)}>
                        {h.nettverk || '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-gray-400 cursor-pointer text-center"
                        onClick={() => setÅpen(erÅpen ? null : h.id)}
                      >
                        {erÅpen ? '▲' : '▼'}
                      </td>
                    </tr>

                    {erÅpen && (
                      <tr className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={5} className="px-4 py-4">
                          {!harKontakt && (
                            <p className="text-gray-400 text-sm mb-4">Ingen kontaktinfo registrert.</p>
                          )}

                          {antall > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                                Kontaktperson{antall > 1 ? 'er' : ''}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Array.from({ length: antall }).map((_, i) => (
                                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-1">Kontaktperson {i + 1}</p>
                                    {personer[i] && (
                                      <p className="font-medium text-gray-800 text-sm">{personer[i]}</p>
                                    )}
                                    {eposter[i] && (
                                      <a
                                        href={`mailto:${eposter[i]}`}
                                        className="text-blue-600 hover:underline text-sm block break-all"
                                      >
                                        {eposter[i]}
                                      </a>
                                    )}
                                    {telefoner[i] && (
                                      <p className="text-gray-500 text-sm">{telefoner[i]}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {h.merknad && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Merknad</p>
                              <p className="text-gray-600 text-sm whitespace-pre-line">{h.merknad}</p>
                            </div>
                          )}

                          <div className="flex gap-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => setRedigerer(h)}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              Rediger
                            </button>
                            <button
                              onClick={() => setBekreftSlett(h)}
                              className="text-red-600 hover:underline text-sm"
                            >
                              Slett
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentRad>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(nyForm || redigerer) && (
        <HallSkjema
          verdi={nyForm || redigerer}
          erNy={!!nyForm}
          onEndre={felt => (nyForm ? setNyForm(felt) : setRedigerer(felt))}
          onLagre={nyForm ? lagreNy : lagreRediger}
          onAvbryt={() => { setNyForm(null); setRedigerer(null) }}
        />
      )}

      {bekreftSlett && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Slette hall?</h3>
            <p className="text-gray-600 mb-6">Vil du slette «{bekreftSlett.navn}»? Dette kan ikke angres.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBekreftSlett(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button onClick={() => slettHall(bekreftSlett.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90">Slett</button>
            </div>
          </div>
        </div>
      )}

      {bekreftMasseslett && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Slette {valgte.length} haller?</h3>
            <p className="text-gray-600 mb-6">Vil du slette de {valgte.length} valgte hallene? Dette kan ikke angres.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBekreftMasseslett(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button onClick={slettValgte} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90">Slett alle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Liten hjelper så vi kan returnere to <tr> per hall uten ekstra markup
function FragmentRad({ children }) {
  return <>{children}</>
}

function HallSkjema({ verdi, erNy, onEndre, onLagre, onAvbryt }) {
  const felter = [
    ['navn', 'Navn *'], ['adresse', 'Adresse'], ['kommune', 'Kommune'],
    ['fylke', 'Fylke'], ['nettverk', 'Nettverk'], ['kontaktperson', 'Kontaktperson'],
    ['epost', 'E-post'], ['telefon', 'Telefon'], ['pris', 'Pris'], ['merknad', 'Merknad'],
  ]
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full my-8">
        <h3 className="text-lg font-semibold mb-4">{erNy ? 'Ny hall' : 'Rediger hall'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {felter.map(([nøkkel, etikett]) => (
            <div key={nøkkel} className={nøkkel === 'merknad' ? 'sm:col-span-2' : ''}>
              <label className="block text-sm text-gray-600 mb-1">{etikett}</label>
              <input
                value={verdi[nøkkel] || ''}
                onChange={e => onEndre({ ...verdi, [nøkkel]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onAvbryt} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
          <button
            onClick={onLagre}
            disabled={!verdi.navn}
            className="px-4 py-2 bg-orange text-white rounded-lg hover:opacity-90 disabled:opacity-40"
          >
            Lagre
          </button>
        </div>
      </div>
    </div>
  )
}
