import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TOM_KURSHOLDER = { navn: '', epost: '', mobil: '', type: 'egen', aktiv: true, merknad: '' }

export default function AdminKursholdere() {
  const [kursholdere, setKursholdere] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [redigerer, setRedigerer] = useState(null)
  const [nyForm, setNyForm] = useState(null)
  const [bekreftSlett, setBekreftSlett] = useState(null)
  const [søk, setSøk] = useState('')

  function hent() {
    supabase
      .from('kursholdere')
      .select('*')
      .order('navn', { ascending: true })
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setKursholdere(data ?? [])
        setLaster(false)
      })
  }

  useEffect(() => { hent() }, [])

  async function lagreNy() {
    const { error } = await supabase.from('kursholdere').insert([nyForm])
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setNyForm(null)
    hent()
  }

  async function lagreRediger() {
    const { id, ...felter } = redigerer
    const { error } = await supabase.from('kursholdere').update(felter).eq('id', id)
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setRedigerer(null)
    hent()
  }

  async function slett(id) {
    const { error } = await supabase.from('kursholdere').delete().eq('id', id)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setBekreftSlett(null)
    hent()
  }

  const filtrert = kursholdere.filter(k =>
    !søk ||
    (k.navn || '').toLowerCase().includes(søk.toLowerCase()) ||
    (k.epost || '').toLowerCase().includes(søk.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500">Egne og eksterne kursholdere som kan settes på kurs.</p>
        <button
          onClick={() => setNyForm({ ...TOM_KURSHOLDER })}
          className="bg-orange text-white px-4 py-2 rounded-lg hover:opacity-90 whitespace-nowrap"
        >
          + Ny kursholder
        </button>
      </div>

      <input
        value={søk}
        onChange={e => setSøk(e.target.value)}
        placeholder="Søk på navn eller e-post …"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6"
      />

      {laster && <p className="text-gray-400">Laster kursholdere …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && filtrert.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          {kursholdere.length === 0 ? 'Ingen kursholdere registrert ennå.' : 'Ingen treff.'}
        </div>
      )}

      {!laster && filtrert.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Navn</th>
                <th className="px-4 py-3">E-post</th>
                <th className="px-4 py-3">Mobil</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Aktiv</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrert.map(k => (
                <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{k.navn}</td>
                  <td className="px-4 py-3">{k.epost || '—'}</td>
                  <td className="px-4 py-3">{k.mobil || '—'}</td>
                  <td className="px-4 py-3">{k.type === 'ekstern' ? 'Ekstern' : 'Egen'}</td>
                  <td className="px-4 py-3">{k.aktiv ? 'Ja' : 'Nei'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setRedigerer(k)} className="text-blue-600 hover:underline mr-3">Rediger</button>
                    <button onClick={() => setBekreftSlett(k)} className="text-red-600 hover:underline">Slett</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(nyForm || redigerer) && (
        <KursholderSkjema
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
            <h3 className="text-lg font-semibold mb-2">Slette kursholder?</h3>
            <p className="text-gray-600 mb-6">Vil du slette «{bekreftSlett.navn}»? Dette kan ikke angres. (Tips: sett heller «Aktiv» til nei for å beholde historikken.)</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBekreftSlett(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button onClick={() => slett(bekreftSlett.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90">Slett</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KursholderSkjema({ verdi, erNy, onEndre, onLagre, onAvbryt }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full my-8">
        <h3 className="text-lg font-semibold mb-4">{erNy ? 'Ny kursholder' : 'Rediger kursholder'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Navn *</label>
            <input value={verdi.navn || ''}
              onChange={e => onEndre({ ...verdi, navn: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">E-post</label>
            <input value={verdi.epost || ''}
              onChange={e => onEndre({ ...verdi, epost: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobil</label>
            <input value={verdi.mobil || ''}
              onChange={e => onEndre({ ...verdi, mobil: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Type</label>
            <select value={verdi.type || 'egen'}
              onChange={e => onEndre({ ...verdi, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="egen">Egen</option>
              <option value="ekstern">Ekstern</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Aktiv</label>
            <select value={verdi.aktiv ? 'ja' : 'nei'}
              onChange={e => onEndre({ ...verdi, aktiv: e.target.value === 'ja' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="ja">Ja</option>
              <option value="nei">Nei</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Merknad</label>
            <textarea value={verdi.merknad || ''}
              onChange={e => onEndre({ ...verdi, merknad: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onAvbryt} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
          <button onClick={onLagre} disabled={!verdi.navn}
            className="px-4 py-2 bg-orange text-white rounded-lg hover:opacity-90 disabled:opacity-40">
            Lagre
          </button>
        </div>
      </div>
    </div>
  )
}
