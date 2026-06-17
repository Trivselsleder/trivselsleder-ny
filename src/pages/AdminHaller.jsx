import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const TOM_HALL = {
  navn: '', adresse: '', kommune: '', fylke: '',
  nettverk: '', kontaktperson: '', epost: '', telefon: '', pris: '', merknad: '',
}

export default function AdminHaller() {
  const navigate = useNavigate()
  const [haller, setHaller] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [redigerer, setRedigerer] = useState(null)   // hall-objekt som redigeres
  const [nyForm, setNyForm] = useState(null)          // nytt-hall-skjema
  const [bekreftSlett, setBekreftSlett] = useState(null)
  const [søk, setSøk] = useState('')

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
    hentHaller()
  }

  const filtrert = haller.filter(h =>
    !søk ||
    (h.navn || '').toLowerCase().includes(søk.toLowerCase()) ||
    (h.kommune || '').toLowerCase().includes(søk.toLowerCase()) ||
    (h.nettverk || '').toLowerCase().includes(søk.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:text-orange mb-4">
        ← Tilbake til admin
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-orange mb-2">Haller</h1>
          <p className="text-gray-500">Felles register over haller som brukes til lekekurs.</p>
        </div>
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
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6"
      />

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
                <th className="px-4 py-3">Navn</th>
                <th className="px-4 py-3">Kommune</th>
                <th className="px-4 py-3">Nettverk</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrert.map(h => (
                <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{h.navn}</td>
                  <td className="px-4 py-3">{h.kommune || '—'}</td>
                  <td className="px-4 py-3">{h.nettverk || '—'}</td>
                  <td className="px-4 py-3">{h.kontaktperson || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setRedigerer(h)} className="text-blue-600 hover:underline mr-3">Rediger</button>
                    <button onClick={() => setBekreftSlett(h)} className="text-red-600 hover:underline">Slett</button>
                  </td>
                </tr>
              ))}
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
    </div>
  )
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
