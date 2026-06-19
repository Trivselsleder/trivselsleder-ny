import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const KJOP_ETIKETT = {
  pakke: 'Ønsker pakke',
  samtale: 'Ønsker samtale',
  nei: 'Nei',
}

export default function AdminEvaluering() {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  const [kurs, setKurs] = useState([])
  const [valgtKurs, setValgtKurs] = useState('')
  const [mottakere, setMottakere] = useState([])
  const [henterMottakere, setHenterMottakere] = useState(false)

  const basis = window.location.origin

  function hentSvar() {
    supabase.rpc('hent_evalueringer_admin').then(({ data, error }) => {
      if (error) setFeil(error.message)
      else setRader(data ?? [])
      setLaster(false)
    })
  }

  useEffect(() => {
    hentSvar()
    supabase.from('kurs').select('id, navn, dato').order('dato', { ascending: false }).range(0, 9999)
      .then(({ data }) => setKurs(data ?? []))
  }, [])

  async function hentMottakere(kursId) {
    setValgtKurs(kursId)
    setMottakere([])
    if (!kursId) return
    setHenterMottakere(true)
    const { data, error } = await supabase.rpc('forbered_evalueringer', { p_kurs_id: kursId })
    setHenterMottakere(false)
    if (error) { alert('Kunne ikke hente mottakere: ' + error.message); return }
    setMottakere(data ?? [])
  }

  function lenkeFor(token) {
    return basis + '/evaluering/' + token
  }

  function sendEpost(mottaker) {
    const lenke = lenkeFor(mottaker.token)
    const emne = encodeURIComponent('Evaluering av lekekurset')
    const tekst = encodeURIComponent(
      'Hei,\n\nTusen takk for at dere var med på lekekurs!\n\n' +
      'Vi setter stor pris på en kort tilbakemelding – det tar bare et par minutter:\n' +
      lenke + '\n\n' +
      'Vennlig hilsen\nTrivselsleder'
    )
    window.location.href = 'mailto:' + (mottaker.hktl_epost || '') + '?subject=' + emne + '&body=' + tekst
  }

  if (laster) return <p className="text-gray-400">Laster evalueringer …</p>
  if (feil) return <p className="text-red-600">Feil: {feil}</p>

  const snitt = (felt) => {
    const tall = rader.map(r => r[felt]).filter(v => v != null)
    if (tall.length === 0) return '—'
    return (tall.reduce((a, b) => a + b, 0) / tall.length).toFixed(1)
  }

  const gullkorn = rader.filter(r => r.gullkorn && r.gullkorn.trim() !== '')
  const vilHa = rader.filter(r => r.kjopsinteresse === 'pakke' || r.kjopsinteresse === 'samtale')

  return (
    <div className="space-y-8">
      <p className="text-gray-500">Tilbakemeldinger fra skolene etter gjennomførte kurs.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Send evaluering</h3>
        <p className="text-sm text-gray-500 mb-4">Velg et gjennomført kurs og send evalueringslenke til skolene.</p>

        <select
          value={valgtKurs}
          onChange={e => hentMottakere(e.target.value)}
          className="w-full sm:w-96 border border-gray-300 rounded-lg px-3 py-2 bg-white mb-4"
        >
          <option value="">— Velg kurs —</option>
          {kurs.map(k => (
            <option key={k.id} value={k.id}>
              {k.navn}{k.dato ? ' (' + new Date(k.dato).toLocaleDateString('no-NO') + ')' : ''}
            </option>
          ))}
        </select>

        {henterMottakere && <p className="text-gray-400 text-sm">Henter mottakere …</p>}

        {valgtKurs && !henterMottakere && mottakere.length === 0 && (
          <p className="text-gray-500 text-sm">Ingen skoler koblet til dette kurset.</p>
        )}

        {mottakere.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2">Skole</th>
                  <th className="px-4 py-2">E-post</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {mottakere.map((m, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium">{m.skole_navn || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{m.hktl_epost || <span className="text-red-500 text-xs">mangler e-post</span>}</td>
                    <td className="px-4 py-2">
                      {m.alt_svart
                        ? <span className="text-green-700">Har svart</span>
                        : <span className="text-gray-400">Ikke svart</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m.hktl_epost
                        ? <button onClick={() => sendEpost(m)} className="text-orange hover:underline">Send e-post</button>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Åpner e-posten din med ferdig lenke. Automatisk utsending kommer senere.
        </p>
      </div>

      {rader.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          Ingen evalueringer er besvart ennå.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Antall svar</p>
              <p className="text-2xl font-bold text-gray-900">{rader.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gjennomføring</p>
              <p className="text-2xl font-bold text-orange">{snitt('vurd_gjennomforing')}<span className="text-base text-gray-400"> / 6</span></p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Info i forkant</p>
              <p className="text-2xl font-bold text-orange">{snitt('vurd_info')}<span className="text-base text-gray-400"> / 6</span></p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Aktiviteter</p>
              <p className="text-2xl font-bold text-orange">{snitt('vurd_aktiviteter')}<span className="text-base text-gray-400"> / 6</span></p>
            </div>
          </div>

          {vilHa.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Kjøpsinteresse ({vilHa.length})</h3>
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Skole</th>
                      <th className="px-4 py-3">Kurs</th>
                      <th className="px-4 py-3">Ønske</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vilHa.map(r => (
                      <tr key={r.evaluering_id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium">{r.skole_navn || '—'}</td>
                        <td className="px-4 py-3">{r.kurs_navn}</td>
                        <td className="px-4 py-3">
                          <span className={
                            r.kjopsinteresse === 'pakke'
                              ? 'inline-block px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold'
                              : 'inline-block px-2 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-semibold'
                          }>
                            {KJOP_ETIKETT[r.kjopsinteresse]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {gullkorn.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Gullkorn ({gullkorn.length})</h3>
              <div className="space-y-3">
                {gullkorn.map(r => (
                  <div key={r.evaluering_id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-gray-800 italic">«{r.gullkorn}»</p>
                    <p className="text-xs text-gray-500 mt-2">{r.skole_navn || '—'} · {r.kurs_navn}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Alle svar</h3>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Skole</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3 text-center">Gjennomf.</th>
                    <th className="px-4 py-3 text-center">Info</th>
                    <th className="px-4 py-3 text-center">Aktiv.</th>
                    <th className="px-4 py-3">Kjøp</th>
                  </tr>
                </thead>
                <tbody>
                  {rader.map(r => (
                    <tr key={r.evaluering_id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.skole_navn || '—'}</td>
                      <td className="px-4 py-3">{r.kurs_navn}</td>
                      <td className="px-4 py-3 text-center">{r.vurd_gjennomforing ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{r.vurd_info ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{r.vurd_aktiviteter ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{KJOP_ETIKETT[r.kjopsinteresse] ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
