import { useState, useEffect, useRef } from 'react'
import SvarOversikt from './SvarOversikt'
import SendLenker from './SendLenker'
import KursMetaOversikt from './KursMetaOversikt'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AdminHaller from './AdminHaller'
import AdminKursholdere from './AdminKursholdere'

function ukeNummer(isoDato) {
  if (!isoDato) return ''
  const d = new Date(isoDato)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const uke1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - uke1) / 86400000 - 3 + ((uke1.getDay() + 6) % 7)) / 7)
}

function formaterDato(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const TOMT_KURS = {
  navn: '', nettverk: '', hall_id: '', dato: '',
  kursholder_id: '', backup_kursholder_id: '', ra: '', sesong: '',
  start_tid: '09:00', slutt_tid: '13:00',
  uke: '', dag: '', antall_tl: '', antall_skoler: '', maks_antall: '', merknad: '',
}

function SokbarVelger({ verdier, valgt, onVelg, placeholder }) {
  const [aapen, setAapen] = useState(false)
  const [sok, setSok] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    function klikkUtenfor(e) {
      if (ref.current && !ref.current.contains(e.target)) setAapen(false)
    }
    document.addEventListener('mousedown', klikkUtenfor)
    return () => document.removeEventListener('mousedown', klikkUtenfor)
  }, [])
  const filtrert = verdier.filter(v => v.toLowerCase().includes(sok.toLowerCase()))
  return (
    <div className="relative" ref={ref}>
      <input
        value={aapen ? sok : (valgt || '')}
        onChange={e => { setSok(e.target.value); setAapen(true) }}
        onFocus={() => { setSok(''); setAapen(true) }}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2"
      />
      {aapen && (
        <div className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtrert.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Ingen treff</div>}
          {filtrert.map(v => (
            <button key={v} type="button"
              onClick={() => { onVelg(v); setAapen(false) }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KursOversikt() {
  const [kurs, setKurs] = useState([])
  const [haller, setHaller] = useState([])
  const [kursholdere, setKursholdere] = useState([])
  const [nettverkData, setNettverkData] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [nyForm, setNyForm] = useState(null)
  const [redigerer, setRedigerer] = useState(null)
  const [bekreftSlett, setBekreftSlett] = useState(null)
  const [skoleKurs, setSkoleKurs] = useState(null)  // kurset vi kobler skoler til
  const [svarKurs, setSvarKurs] = useState(null)  // kurset vi ser svar for
  const [lenkeKurs, setLenkeKurs] = useState(null)  // kurset vi sender lenker for
  const [antallPerKurs, setAntallPerKurs] = useState({})

  function hentKurs() {
    supabase.from('kurs').select('*').order('dato', { ascending: true }).range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setKurs(data ?? [])
        setLaster(false)
      })
    hentAntall()
  }

  function hentAntall() {
    supabase.from('kurs_skole').select('kurs_id').range(0, 99999)
      .then(({ data }) => {
        const teller = {}
        for (const rad of (data ?? [])) {
          teller[rad.kurs_id] = (teller[rad.kurs_id] || 0) + 1
        }
        setAntallPerKurs(teller)
      })
  }

  useEffect(() => {
    hentKurs()
    supabase.from('haller').select('id, navn').order('navn').range(0, 9999)
      .then(({ data }) => setHaller(data ?? []))
    supabase.from('kursholdere').select('id, navn, aktiv').order('navn').range(0, 9999)
      .then(({ data }) => setKursholdere(data ?? []))
    supabase.from('skoler').select('nettverk, ansvarlig').range(0, 9999)
      .then(({ data }) => setNettverkData(data ?? []))
  }, [])

  function rensKurs(obj) {
    const renset = { ...obj }
    delete renset.id; delete renset.created_at; delete renset.status
    for (const k of Object.keys(renset)) if (renset[k] === '') renset[k] = null
    for (const tallfelt of ['uke', 'antall_tl', 'antall_skoler', 'maks_antall'])
      if (renset[tallfelt] != null) renset[tallfelt] = parseInt(renset[tallfelt], 10) || null
    return renset
  }

  async function lagreNytt() {
    const { error } = await supabase.from('kurs').insert([rensKurs(nyForm)])
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setNyForm(null); hentKurs()
  }
  async function lagreRediger() {
    const { error } = await supabase.from('kurs').update(rensKurs(redigerer)).eq('id', redigerer.id)
    if (error) { alert('Kunne ikke lagre: ' + error.message); return }
    setRedigerer(null); hentKurs()
  }
  async function slettKurs(id) {
    const { error } = await supabase.from('kurs').delete().eq('id', id)
    if (error) { alert('Kunne ikke slette: ' + error.message); return }
    setBekreftSlett(null); hentKurs()
  }

  const hallNavn = id => haller.find(h => h.id === id)?.navn || '—'
  const holderNavn = id => kursholdere.find(k => k.id === id)?.navn || '—'

  return (
    <div>
      <KursMetaOversikt />
      <div className="flex justify-end mb-6">
        <button onClick={() => setNyForm({ ...TOMT_KURS })}
          className="bg-orange text-white px-4 py-2 rounded-lg hover:opacity-90">
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
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3">Dato</th>
                <th className="px-4 py-3">Hall</th>
                <th className="px-4 py-3">Skoler</th>
                <th className="px-4 py-3">Kursholder</th>
                <th className="px-4 py-3">RA</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {kurs.map(k => (
                <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{k.navn || '—'}</td>
                  <td className="px-4 py-3">{formaterDato(k.dato)}</td>
                  <td className="px-4 py-3">{hallNavn(k.hall_id)}</td>
                  <td className="px-4 py-3">{antallPerKurs[k.id] || 0}</td>
                  <td className="px-4 py-3">{holderNavn(k.kursholder_id)}</td>
                  <td className="px-4 py-3">{k.ra || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setSkoleKurs(k)} className="text-orange hover:underline mr-3">Skoler</button>
                    <button onClick={() => setSvarKurs(k)} className="text-orange hover:underline mr-3">Se svar</button>
                    <button onClick={() => setLenkeKurs(k)} className="text-orange hover:underline mr-3">Send lenker</button>
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
        <KursSkjema
          verdi={nyForm || redigerer}
          erNy={!!nyForm}
          haller={haller}
          kursholdere={kursholdere}
          nettverkData={nettverkData}
          onEndre={felt => (nyForm ? setNyForm(felt) : setRedigerer(felt))}
          onLagre={nyForm ? lagreNytt : lagreRediger}
          onAvbryt={() => { setNyForm(null); setRedigerer(null) }}
        />
      )}

      {skoleKurs && (
        <SkoleKobling kurs={skoleKurs} onLukk={() => setSkoleKurs(null)} />
      )}

      {svarKurs && (
        <SvarOversikt kurs={svarKurs} onLukk={() => setSvarKurs(null)} />
      )}

      {lenkeKurs && (
        <SendLenker kurs={lenkeKurs} onLukk={() => setLenkeKurs(null)} />
      )}

      {bekreftSlett && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Slette kurs?</h3>
            <p className="text-gray-600 mb-6">Vil du slette «{bekreftSlett.navn || 'dette kurset'}»? Dette kan ikke angres.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBekreftSlett(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button onClick={() => slettKurs(bekreftSlett.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90">Slett</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SkoleKobling({ kurs, onLukk }) {
  const [koblede, setKoblede] = useState([])
  const [nettverkSkoler, setNettverkSkoler] = useState([])
  const [laster, setLaster] = useState(true)

  async function hent() {
    setLaster(true)
    // Skoler allerede koblet til kurset
    const { data: kobl } = await supabase
      .from('kurs_skole')
      .select('id, skole_id, skoler(navn, kommunenavn)')
      .eq('kurs_id', kurs.id)
      .range(0, 9999)
    setKoblede(kobl ?? [])
    // Alle skoler i kursets nettverk
    const { data: nettv } = await supabase
      .from('skoler')
      .select('id, navn, kommunenavn')
      .eq('nettverk', kurs.nettverk)
      .order('navn')
      .range(0, 9999)
    setNettverkSkoler(nettv ?? [])
    setLaster(false)
  }

  useEffect(() => { hent() }, [])

  const koblendeIder = new Set(koblede.map(k => k.skole_id))
  const ikkeKoblet = nettverkSkoler.filter(s => !koblendeIder.has(s.id))

  async function leggTil(skole) {
    const { error } = await supabase.from('kurs_skole').insert([{
      kurs_id: kurs.id, skole_id: skole.id,
    }])
    if (error) { alert('Kunne ikke legge til: ' + error.message); return }
    hent()
  }

  async function leggTilAlle() {
    const rader = ikkeKoblet.map(s => ({ kurs_id: kurs.id, skole_id: s.id }))
    if (rader.length === 0) return
    const { error } = await supabase.from('kurs_skole').insert(rader)
    if (error) { alert('Kunne ikke legge til alle: ' + error.message); return }
    hent()
  }

  async function fjern(koblingId) {
    const { error } = await supabase.from('kurs_skole').delete().eq('id', koblingId)
    if (error) { alert('Kunne ikke fjerne: ' + error.message); return }
    hent()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold">Skoler på kurset</h3>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-6">{kurs.navn} — nettverk: {kurs.nettverk || '—'}</p>

        {laster && <p className="text-gray-400">Laster …</p>}

        {!laster && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Koblet til kurset ({koblede.length})</h4>
              </div>
              {koblede.length === 0 ? (
                <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                  Ingen skoler koblet ennå. Legg til fra forslaget under.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {koblede.map(k => (
                    <li key={k.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span>{k.skoler?.navn || '—'} <span className="text-gray-400">{k.skoler?.kommunenavn || ''}</span></span>
                      <button onClick={() => fjern(k.id)} className="text-red-600 hover:underline">Fjern</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Forslag fra nettverket ({ikkeKoblet.length})</h4>
                {ikkeKoblet.length > 0 && (
                  <button onClick={leggTilAlle} className="text-sm bg-orange text-white px-3 py-1 rounded-lg hover:opacity-90">
                    + Legg til alle
                  </button>
                )}
              </div>
              {ikkeKoblet.length === 0 ? (
                <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {nettverkSkoler.length === 0
                    ? 'Ingen skoler funnet i dette nettverket.'
                    : 'Alle skoler i nettverket er allerede koblet.'}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {ikkeKoblet.map(s => (
                    <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span>{s.navn} <span className="text-gray-400">{s.kommunenavn || ''}</span></span>
                      <button onClick={() => leggTil(s)} className="text-orange hover:underline">+ Legg til</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onLukk} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Ferdig</button>
        </div>
      </div>
    </div>
  )
}

function KursSkjema({ verdi, erNy, haller, kursholdere, nettverkData, onEndre, onLagre, onAvbryt }) {
  const aktiveHoldere = kursholdere.filter(k => k.aktiv)
  const nettverk = [...new Set(nettverkData.map(d => d.nettverk).filter(Boolean))].sort()

  function velgNettverk(valgtNettverk) {
    const match = nettverkData.find(d => d.nettverk === valgtNettverk && d.ansvarlig)
    const oppdatert = { ...verdi, nettverk: valgtNettverk, ra: match?.ansvarlig || verdi.ra }
    if (!verdi.navn || verdi.navn === `Lek ${verdi.nettverk}`) {
      oppdatert.navn = `Lek ${valgtNettverk}`
    }
    onEndre(oppdatert)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full my-8">
        <h3 className="text-lg font-semibold mb-4">{erNy ? 'Nytt kurs' : 'Rediger kurs'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-sm text-gray-600 mb-1">Kursnavn</label>
            <input value={verdi.navn || ''}
              onChange={e => onEndre({ ...verdi, navn: e.target.value })}
              placeholder="Foreslås automatisk når du velger nettverk"
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dato</label>
            <input type="date" value={verdi.dato || ''}
              onChange={e => onEndre({ ...verdi, dato: e.target.value, uke: ukeNummer(e.target.value) || verdi.uke })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nettverk</label>
            <SokbarVelger verdier={nettverk} valgt={verdi.nettverk}
              onVelg={velgNettverk} placeholder="Skriv for å søke …" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">RA (auto)</label>
            <input value={verdi.ra || ''}
              onChange={e => onEndre({ ...verdi, ra: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" />
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
          <div>
            <label className="block text-sm text-gray-600 mb-1">Uke (auto)</label>
            <input type="number" value={verdi.uke || ''}
              onChange={e => onEndre({ ...verdi, uke: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm text-gray-600 mb-1">Hall</label>
            <SokbarVelger
              verdier={haller.map(h => h.navn)}
              valgt={haller.find(h => h.id === verdi.hall_id)?.navn || ''}
              onVelg={navn => {
                const h = haller.find(x => x.navn === navn)
                onEndre({ ...verdi, hall_id: h ? h.id : '' })
              }}
              placeholder="Skriv for å søke etter hall …"
            />
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
            <label className="block text-sm text-gray-600 mb-1">Antall TL</label>
            <input type="number" value={verdi.antall_tl || ''}
              onChange={e => onEndre({ ...verdi, antall_tl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Maks antall</label>
            <input type="number" value={verdi.maks_antall || ''}
              onChange={e => onEndre({ ...verdi, maks_antall: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="sm:col-span-3">
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
