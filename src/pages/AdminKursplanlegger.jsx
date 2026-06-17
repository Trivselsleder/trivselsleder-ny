import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AdminHaller from './AdminHaller'
import AdminKursholdere from './AdminKursholdere'

function formaterDato(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const TOMT_KURS = {
  nettverk: '', hall_id: '', dato: '', start_tid: '', slutt_tid: '',
  kursholder_id: '', backup_kursholder_id: '', ra: '', sesong: '',
  uke: '', dag: '', antall_tl: '', antall_skoler: '', maks_antall: '', merknad: '',
}

function KursOversikt() {
  const [kurs, setKurs] = useState([])
  const [haller, setHaller] = useState([])
  const [kursholdere, setKursholdere] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [nyForm, setNyForm] = useState(null)

  function hentKurs() {
    supabase
      .from('kurs')
      .select('*')
      .order('dato', { ascending: true })
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setKurs(data ?? [])
        setLaster(false)
      })
  }

  useEffect(() => {
    hentKurs()
    supabase.from('haller').select('id, navn').order('navn').range(0, 9999)
      .then(({ data }) => setHaller(data ?? []))
    supabase.from('kursholdere').select('id, navn, aktiv').order('navn').range(0, 9999)
      .then(({ data }) => setKursholdere(data ?? []))
  }, [])

  async function lagreNytt() {
    const renset = { ...nyForm }
    for (const k of Object.keys(renset)) {
      if (renset[k] === '') renset[k] = null
    }
    for (const tallfelt of ['uke', 'antall_tl', 'antall_skoler', 'maks_antall']) {
      if (renset[tallfelt] != null) renset[tallfelt] = parseInt(renset[tallfelt], 10) || null
    }
    const { error } = await supabase.from('kurs').insert([renset])
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setNyForm(null)
    hentKurs()
  }

  const hallNavn = id => haller.find(h => h.id === id)?.navn || '—'
  const holderNavn = id => kursholdere.find(k => k.id === id)?.navn || '—'

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setNyForm({ ...TOMT_KURS })}
          className="bg-orange text-white px-4 py-2 rounded-lg hover:opacity-90"
        >
          + Nytt kurs
        </button>
      </div>

      {laster && <p className="text-gray-400">Laster kurs …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && kurs.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          Ingen kurs opprettet ennå.
        </div>
      )}

      {!laster && kurs.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Dato</th>
                <th className="px-4 py-3">Tid</th>
                <th className="px-4 py-3">Nettverk</th>
                <th className="px-4 py-3">Hall</th>
                <th className="px-4 py-3">Kursholder</th>
                <th className="px-4 py-3">RA</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {kurs.map(k => (
                <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{formaterDato(k.dato)}</td>
                  <td className="px-4 py-3">{k.start_tid ? k.start_tid.slice(0,5) : '—'}</td>
                  <td className="px-4 py-3">{k.nettverk || '—'}</td>
                  <td className="px-4 py-3">{hallNavn(k.hall_id)}</td>
                  <td className="px-4 py-3">{holderNavn(k.kursholder_id)}</td>
                  <td className="px-4 py-3">{k.ra || '—'}</td>
                  <td className="px-4 py-3">{k.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nyForm && (
        <KursSkjema
          verdi={nyForm}
          haller={haller}
          kursholdere={kursholdere}
          onEndre={setNyForm}
          onLagre={lagreNytt}
          onAvbryt={() => setNyForm(null)}
        />
      )}
    </div>
  )
}

function KursSkjema({ verdi, haller, kursholdere, onEndre, onLagre, onAvbryt }) {
  const aktiveHoldere = kursholdere.filter(k => k.aktiv)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full my-8">
        <h3 className="text-lg font-semibold mb-4">Nytt kurs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dato</label>
            <input type="date" value={verdi.dato || ''}
              onChange={e => onEndre({ ...verdi, dato: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nettverk</label>
            <input value={verdi.nettverk || ''}
              onChange={e => onEndre({ ...verdi, nettverk: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Starttid</label>
            <input type="time" value={verdi.start_tid || ''}
              onChange={e => onEndre({ ...verdi, start_tid: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sluttid</label>
            <input type="time" value={verdi.slutt_tid || ''}
              onChange={e => onEndre({ ...verdi, slutt_tid: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Hall</label>
            <select value={verdi.hall_id || ''}
              onChange={e => onEndre({ ...verdi, hall_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">— Velg hall —</option>
              {haller.map(h => <option key={h.id} value={h.id}>{h.navn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Kursholder</label>
            <select value={verdi.kursholder_id || ''}
              onChange={e => onEndre({ ...verdi, kursholder_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">— Velg kursholder —</option>
              {aktiveHoldere.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Backup-kursholder</label>
            <select value={verdi.backup_kursholder_id || ''}
              onChange={e => onEndre({ ...verdi, backup_kursholder_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">— Velg backup —</option>
              {aktiveHoldere.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">RA</label>
            <input value={verdi.ra || ''}
              onChange={e => onEndre({ ...verdi, ra: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Uke</label>
            <input type="number" value={verdi.uke || ''}
              onChange={e => onEndre({ ...verdi, uke: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Antall TL</label>
            <input type="number" value={verdi.antall_tl || ''}
              onChange={e => onEndre({ ...verdi, antall_tl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Antall skoler</label>
            <input type="number" value={verdi.antall_skoler || ''}
              onChange={e => onEndre({ ...verdi, antall_skoler: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Maks antall</label>
            <input type="number" value={verdi.maks_antall || ''}
              onChange={e => onEndre({ ...verdi, maks_antall: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Merknad</label>
            <input value={verdi.merknad || ''}
              onChange={e => onEndre({ ...verdi, merknad: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onAvbryt} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
          <button onClick={onLagre} disabled={!verdi.dato}
            className="px-4 py-2 bg-orange text-white rounded-lg hover:opacity-90 disabled:opacity-40">
            Lagre
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminKursplanlegger() {
  const navigate = useNavigate()
  const [fane, setFane] = useState('kurs')

  const faner = [
    { id: 'kurs', navn: 'Kurs' },
    { id: 'haller', navn: 'Haller' },
    { id: 'kursholdere', navn: 'Kursholdere' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:text-orange mb-4">
        ← Tilbake til admin
      </button>

      <h1 className="text-3xl font-bold text-orange mb-2">Kursplanlegger</h1>
      <p className="text-gray-500 mb-6">Planlegg lekekurs, send invitasjoner og følg opp svar.</p>

      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {faner.map(f => (
          <button key={f.id} onClick={() => setFane(f.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              fane === f.id ? 'border-orange text-orange' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {f.navn}
          </button>
        ))}
      </div>

      {fane === 'kurs' && <KursOversikt />}
      {fane === 'haller' && <AdminHaller />}
      {fane === 'kursholdere' && <AdminKursholdere />}
    </div>
  )
}
