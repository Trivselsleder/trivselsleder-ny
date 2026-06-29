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

  const [aktivtSemester, setAktivtSemester] = useState(null)
  const [sporsmal, setSporsmal] = useState([])
  const [lagrerSp, setLagrerSp] = useState(null)
  const [spLagret, setSpLagret] = useState(false)

  const [pakker, setPakker] = useState([])
  const [lagrerPk, setLagrerPk] = useState(null)
  const [pkLagret, setPkLagret] = useState(false)

  const basis = window.location.origin

  function hentSvar() {
    supabase.rpc('hent_evalueringer_admin').then(({ data, error }) => {
      if (error) setFeil(error.message)
      else setRader(data ?? [])
      setLaster(false)
    })
  }

  function hentSporsmal() {
    supabase.rpc('hent_aktivt_semester').then(({ data }) => {
      if (data && data.length > 0) setAktivtSemester(data[0])
    })
    supabase.rpc('hent_aktive_sporsmal').then(({ data }) => {
      setSporsmal(data ?? [])
    })
  }

  function hentPakker() {
    supabase.rpc('hent_pakker_admin').then(({ data }) => {
      setPakker(data ?? [])
    })
  }

  function endreSp(id, felt, verdi) {
    setSporsmal(liste => liste.map(s => s.id === id ? { ...s, [felt]: verdi } : s))
    setSpLagret(false)
  }

  async function lagreSp(s) {
    setLagrerSp(s.id)
    setSpLagret(false)
    const { error } = await supabase.rpc('oppdater_sporsmal', {
      p_id: s.id,
      p_sporsmal: s.sporsmal,
      p_skala_lav: s.skala_lav,
      p_skala_hoy: s.skala_hoy,
    })
    setLagrerSp(null)
    if (error) alert('Kunne ikke lagre: ' + error.message)
    else setSpLagret(true)
  }

  function endrePk(id, felt, verdi) {
    setPakker(liste => liste.map(p => p.id === id ? { ...p, [felt]: verdi } : p))
    setPkLagret(false)
  }

  async function lagrePk(p) {
    setLagrerPk(p.id)
    setPkLagret(false)
    const { error } = await supabase.rpc('oppdater_pakke', {
      p_id: p.id,
      p_navn: p.navn,
      p_pris: parseInt(p.pris, 10) || 0,
      p_beskrivelse: p.beskrivelse,
      p_bilde_url: p.bilde_url || null,
    })
    setLagrerPk(null)
    if (error) alert('Kunne ikke lagre: ' + error.message)
    else setPkLagret(true)
  }

  async function lastOppBilde(p, fil) {
    if (!fil) return
    setLagrerPk(p.id)
    const filendelse = fil.name.split('.').pop()
    const filnavn = p.id + '-' + Date.now() + '.' + filendelse
    const { error: oppErr } = await supabase.storage
      .from('pakkebilder')
      .upload(filnavn, fil, { upsert: true })
    if (oppErr) {
      setLagrerPk(null)
      alert('Kunne ikke laste opp bilde: ' + oppErr.message)
      return
    }
    const { data: urlData } = supabase.storage
      .from('pakkebilder')
      .getPublicUrl(filnavn)
    const nyUrl = urlData.publicUrl
    const { error: lagreErr } = await supabase.rpc('oppdater_pakke', {
      p_id: p.id,
      p_navn: p.navn,
      p_pris: parseInt(p.pris, 10) || 0,
      p_beskrivelse: p.beskrivelse,
      p_bilde_url: nyUrl,
    })
    setLagrerPk(null)
    if (lagreErr) { alert('Kunne ikke lagre bilde-URL: ' + lagreErr.message); return }
    setPakker(liste => liste.map(x => x.id === p.id ? { ...x, bilde_url: nyUrl } : x))
    setPkLagret(true)
  }

  useEffect(() => {
    hentSvar()
    hentSporsmal()
    hentPakker()
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

  function lastNedCsv() {
    if (rader.length === 0) { alert('Ingen evalueringer å eksportere ennå.'); return }
    const kolonner = ['Skole', 'Kurs', 'Gjennomføring', 'Info i forkant', 'Aktiviteter', 'Gullkorn', 'Kjøpsinteresse', 'Valgt pakke', 'Pakkepris (kr)']
    const celle = (v) => {
      if (v == null) return ''
      const t = String(v).replace(/"/g, '""')
      return '"' + t + '"'
    }
    const linjer = rader.map(r => [
      celle(r.skole_navn),
      celle(r.kurs_navn),
      celle(r.vurd_gjennomforing),
      celle(r.vurd_info),
      celle(r.vurd_aktiviteter),
      celle(r.gullkorn),
      celle(KJOP_ETIKETT[r.kjopsinteresse] ?? r.kjopsinteresse),
      celle(r.valgt_pakke_navn),
      celle(r.valgt_pakke_pris),
    ].join(';'))
    const csv = '\uFEFF' + kolonner.join(';') + '\n' + linjer.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'evalueringer-' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-900">Rediger spørsmål</h3>
          {aktivtSemester && (
            <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-sm font-semibold">
              {aktivtSemester.navn}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">Teksten skolene ser i evalueringsskjemaet. Endringer slår inn ved neste åpning av skjemaet.</p>

        {sporsmal.length === 0 ? (
          <p className="text-gray-400 text-sm">Ingen spørsmål funnet for aktivt semester.</p>
        ) : (
          <div className="space-y-5">
            {sporsmal.map(s => (
              <div key={s.id} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Spørsmål</label>
                <input
                  type="text"
                  value={s.sporsmal}
                  onChange={e => endreSp(s.id, 'sporsmal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                />
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skala 1 betyr</label>
                    <input
                      type="text"
                      value={s.skala_lav}
                      onChange={e => endreSp(s.id, 'skala_lav', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skala 6 betyr</label>
                    <input
                      type="text"
                      value={s.skala_hoy}
                      onChange={e => endreSp(s.id, 'skala_hoy', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  onClick={() => lagreSp(s)}
                  disabled={lagrerSp === s.id}
                  className="px-4 py-2 rounded-lg bg-orange text-white text-sm font-semibold disabled:opacity-40"
                >
                  {lagrerSp === s.id ? 'Lagrer …' : 'Lagre'}
                </button>
              </div>
            ))}
            {spLagret && <p className="text-green-700 text-sm">Lagret.</p>}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-900">Rediger pakker</h3>
          {aktivtSemester && (
            <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-sm font-semibold">
              {aktivtSemester.navn}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">Pakkene skolene kan velge i evalueringen. Pris i hele kroner eks. mva. Last opp et bilde per pakke om ønskelig.</p>

        {pakker.length === 0 ? (
          <p className="text-gray-400 text-sm">Ingen pakker funnet for aktivt semester.</p>
        ) : (
          <div className="space-y-5">
            {pakker.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                    <input
                      type="text"
                      value={p.navn}
                      onChange={e => endrePk(p.id, 'navn', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pris (kr eks mva)</label>
                    <input
                      type="number"
                      value={p.pris}
                      onChange={e => endrePk(p.id, 'pris', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                <textarea
                  rows="2"
                  value={p.beskrivelse || ''}
                  onChange={e => endrePk(p.id, 'beskrivelse', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                />
                <label className="block text-sm font-medium text-gray-700 mb-1">Bilde</label>
                <div className="flex items-center gap-4 mb-3">
                  {p.bilde_url ? (
                    <img src={p.bilde_url} alt={p.navn} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs text-center">Ingen bilde</div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={e => lastOppBilde(p, e.target.files[0])}
                      disabled={lagrerPk === p.id}
                      className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange file:text-white hover:file:opacity-90 disabled:opacity-40"
                    />
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG eller WEBP. Bildet lagres automatisk når du har valgt fil.</p>
                  </div>
                </div>
                <button
                  onClick={() => lagrePk(p)}
                  disabled={lagrerPk === p.id}
                  className="px-4 py-2 rounded-lg bg-orange text-white text-sm font-semibold disabled:opacity-40"
                >
                  {lagrerPk === p.id ? 'Lagrer …' : 'Lagre'}
                </button>
              </div>
            ))}
            {pkLagret && <p className="text-green-700 text-sm">Lagret.</p>}
          </div>
        )}
      </div>

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
                      <th className="px-4 py-3">Pakke</th>
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
                        <td className="px-4 py-3 text-gray-600">
                          {r.valgt_pakke_navn ? r.valgt_pakke_navn + ' (' + (r.valgt_pakke_pris != null ? r.valgt_pakke_pris.toLocaleString('no-NO') + ' kr' : '—') + ')' : '—'}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Alle svar</h3>
              <button
                onClick={lastNedCsv}
                className="px-4 py-2 rounded-lg bg-orange text-white text-sm font-semibold hover:opacity-90"
              >
                Last ned som CSV
              </button>
            </div>
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
