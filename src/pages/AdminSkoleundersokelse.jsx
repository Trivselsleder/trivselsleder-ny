import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Admin-flate for «Spørreundersøkelse til skolene» (byggetrinn 2, del B).
// Gjenbruker admin-uttrykket fra AdminEvaluering.jsx (kort, tabell, knapp, badge).
// KUN: opprett runde, liste runder, generer/regenerer mottakere, se spørsmål
// (read-only), slett utkast-runde uten svar. INGEN utsending/svar/resultat her.

const STATUS_ETIKETT = { utkast: 'Utkast', aktiv: 'Aktiv', lukket: 'Lukket' }
const STATUS_KLASSE = {
  utkast: 'bg-gray-100 text-gray-700',
  aktiv: 'bg-orange-50 text-orange-700',
  lukket: 'bg-gray-200 text-gray-500',
}

// Rekkefølge + etikett for spørsmålsblokkene (fra 077-seeden).
const BLOKK_REKKEFOLGE = ['rolle', 'effekt', 'drift', 'plattform', 'aapent']
const BLOKK_ETIKETT = {
  rolle: 'Rolle',
  effekt: 'Effekt',
  drift: 'Drift',
  plattform: 'Plattform',
  aapent: 'Åpne spørsmål',
}
const TYPE_ETIKETT = { matrise: 'Matrise', enkeltvalg: 'Enkeltvalg', fritekst: 'Fritekst' }

// Fallback-kilden generatoren lagret i skoleus_mottaker.rolle (jf. mottaker.js).
const KILDE_ETIKETT = {
  hktl: 'HKTL',
  htla: 'HTLA (fallback)',
  rektor: 'Rektor (fallback)',
}

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function AdminSkoleundersokelse() {
  const [runder, setRunder] = useState([])
  const [mottakerAntall, setMottakerAntall] = useState({}) // runde_id -> antall
  const [svarAntall, setSvarAntall] = useState({})         // runde_id -> antall
  const [skoletyper, setSkoletyper] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  // Opprett runde
  const [nyNavn, setNyNavn] = useState('')
  const [nyMaalgruppe, setNyMaalgruppe] = useState('') // '' = alle skoler (NULL)
  const [oppretter, setOppretter] = useState(false)
  const [opprettFeil, setOpprettFeil] = useState(null)

  // Åpen runde (mottakere + generering)
  const [apenRunde, setApenRunde] = useState(null)
  const [mottakere, setMottakere] = useState([])
  const [henterMott, setHenterMott] = useState(false)
  const [genererer, setGenererer] = useState(false)
  const [genResultat, setGenResultat] = useState(null) // { opprettet, hoppet_over } | { feil }

  // Spørsmål (read-only, global)
  const [sporsmal, setSporsmal] = useState([])
  const [matriserader, setMatriserader] = useState([])
  const [visSporsmal, setVisSporsmal] = useState(false)
  const [henterSp, setHenterSp] = useState(false)

  // Slett (to-stegs bekreftelse, ingen native dialog)
  const [bekreftSlett, setBekreftSlett] = useState(null)
  const [sletter, setSletter] = useState(false)

  useEffect(() => { hentAlt(false) }, [])

  async function hentAlt(stille = true) {
    if (!stille) setLaster(true)
    setFeil(null)
    const [runderRes, skolerRes, mottRes, svarRes] = await Promise.all([
      supabase.from('skoleus_runder')
        .select('id, navn, status, maalgruppe, opprettet_at, lukket_at')
        .order('opprettet_at', { ascending: false }),
      supabase.from('skoler').select('type'),
      supabase.from('skoleus_mottaker').select('runde_id'),
      supabase.from('skoleus_svar').select('runde_id'),
    ])
    if (runderRes.error) { setFeil(runderRes.error.message); setLaster(false); return }
    setRunder(runderRes.data ?? [])

    // Distinkte skoletyper hentes LIVE fra skoler.type (ansatt har lesetilgang) —
    // aldri hardkodet, så målgruppe-nedtrekket alltid matcher faktiske data.
    const typer = [...new Set((skolerRes.data ?? []).map(s => s.type).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'nb'))
    setSkoletyper(typer)

    const mCount = {}
    for (const m of (mottRes.data ?? [])) mCount[m.runde_id] = (mCount[m.runde_id] || 0) + 1
    setMottakerAntall(mCount)

    const sCount = {}
    for (const s of (svarRes.data ?? [])) sCount[s.runde_id] = (sCount[s.runde_id] || 0) + 1
    setSvarAntall(sCount)

    setLaster(false)
  }

  async function opprettRunde(e) {
    e?.preventDefault()
    setOpprettFeil(null)
    if (nyNavn.trim() === '') { setOpprettFeil('Gi runden et navn.'); return }
    setOppretter(true)
    const { error } = await supabase.from('skoleus_runder').insert({
      navn: nyNavn.trim(),
      status: 'utkast',
      maalgruppe: nyMaalgruppe === '' ? null : nyMaalgruppe,
    })
    setOppretter(false)
    if (error) { setOpprettFeil(error.message); return }
    setNyNavn('')
    setNyMaalgruppe('')
    hentAlt()
  }

  async function apneRunde(id) {
    if (apenRunde === id) { setApenRunde(null); return }
    setApenRunde(id)
    setGenResultat(null)
    setMottakere([])
    setHenterMott(true)
    const { data } = await supabase.from('skoleus_mottaker')
      .select('id, navn, epost, rolle, opprettet_at, skoler(navn)')
      .eq('runde_id', id)
      .order('opprettet_at', { ascending: true })
    setMottakere(data ?? [])
    setHenterMott(false)
  }

  async function genererMottakere(id) {
    setGenererer(true)
    setGenResultat(null)
    const { data, error } = await supabase.rpc('skoleus_opprett_mottakere', { p_runde: id })
    setGenererer(false)
    if (error) { setGenResultat({ feil: error.message }); return }
    const rad = Array.isArray(data) ? data[0] : data
    setGenResultat({ opprettet: rad?.opprettet ?? 0, hoppet_over: rad?.hoppet_over ?? 0 })

    // Frisk mottakerliste + oppdater telleren for denne runden (uten full flimring).
    const { data: m } = await supabase.from('skoleus_mottaker')
      .select('id, navn, epost, rolle, opprettet_at, skoler(navn)')
      .eq('runde_id', id)
      .order('opprettet_at', { ascending: true })
    setMottakere(m ?? [])
    setMottakerAntall(prev => ({ ...prev, [id]: (m ?? []).length }))
  }

  async function toggleSporsmal() {
    if (sporsmal.length > 0) { setVisSporsmal(v => !v); return }
    setHenterSp(true)
    const [spRes, mrRes] = await Promise.all([
      supabase.from('skoleus_sporsmal')
        .select('id, rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt')
        .order('rekkefolge', { ascending: true }),
      supabase.from('skoleus_matriserad')
        .select('id, sporsmal_id, rekkefolge, radtekst, tillat_ikke_aktuelt')
        .order('rekkefolge', { ascending: true }),
    ])
    setSporsmal(spRes.data ?? [])
    setMatriserader(mrRes.data ?? [])
    setHenterSp(false)
    setVisSporsmal(true)
  }

  async function slettRunde(id) {
    const r = runder.find(x => x.id === id)
    if (!r || r.status !== 'utkast') { setBekreftSlett(null); return }
    setSletter(true)
    setFeil(null)
    // Sikkerhet: sjekk svar-antall LIVE rett før sletting (verner data).
    const { count, error: cErr } = await supabase.from('skoleus_svar')
      .select('id', { count: 'exact', head: true }).eq('runde_id', id)
    if (cErr) { setFeil(cErr.message); setSletter(false); setBekreftSlett(null); return }
    if ((count || 0) > 0) {
      setFeil('Runden har svar og kan ikke slettes.')
      setSletter(false); setBekreftSlett(null)
      hentAlt()
      return
    }
    // Slett mottaker-radene først, så selve runden.
    await supabase.from('skoleus_mottaker').delete().eq('runde_id', id)
    const { error } = await supabase.from('skoleus_runder').delete().eq('id', id)
    setSletter(false)
    setBekreftSlett(null)
    if (error) { setFeil(error.message); return }
    if (apenRunde === id) setApenRunde(null)
    hentAlt()
  }

  const inputKlasse = 'w-full border border-gray-300 rounded-lg px-3 py-2'
  const primærKnapp = 'px-4 py-2 rounded-lg bg-orange text-gray-900 text-sm font-semibold disabled:opacity-40'

  // Grupper spørsmål per blokk for read-only-visningen.
  const sporsmalPerBlokk = BLOKK_REKKEFOLGE
    .map(b => ({ blokk: b, sporsmal: sporsmal.filter(s => s.blokk === b) }))
    .filter(g => g.sporsmal.length > 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-orange-ink mb-1">Spørreundersøkelse til skolene</h1>
        <p className="text-gray-500">
          Opprett en undersøkelsesrunde, generer mottakere til skolene og se hva som spørres om.
          Utsending og resultater kommer i egne trinn.
        </p>
      </div>

      {feil && (
        <p className="text-pink-700 bg-pink-50 border border-pink-200 rounded-lg py-3 px-4" role="alert">{feil}</p>
      )}

      {/* ── Opprett runde ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opprett ny runde</h3>
        <form onSubmit={opprettRunde} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="rundeNavn" className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
            <input
              id="rundeNavn"
              type="text"
              value={nyNavn}
              onChange={e => setNyNavn(e.target.value)}
              placeholder="f.eks. Skoleundersøkelse høst 2026"
              className={inputKlasse}
            />
          </div>
          <div>
            <label htmlFor="rundeMaalgruppe" className="block text-sm font-medium text-gray-700 mb-1">Målgruppe</label>
            <select
              id="rundeMaalgruppe"
              value={nyMaalgruppe}
              onChange={e => setNyMaalgruppe(e.target.value)}
              className={inputKlasse + ' bg-white'}
            >
              <option value="">Alle skoler</option>
              {skoletyper.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button type="submit" disabled={oppretter} className={primærKnapp}>
            {oppretter ? 'Oppretter …' : 'Opprett runde'}
          </button>
        </form>
        {opprettFeil && <p className="mt-3 text-sm text-pink-700">{opprettFeil}</p>}
        <p className="mt-3 text-xs text-gray-500">
          Målgruppe styrer hvilke skoler som får runden når du genererer mottakere.
          «Alle skoler» = ingen skoletype-begrensning.
        </p>
      </div>

      {/* ── Spørsmål (read-only) ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Spørsmål i undersøkelsen</h3>
          <button type="button" onClick={toggleSporsmal} className="text-orange-ink hover:underline text-sm font-medium">
            {henterSp ? 'Henter …' : visSporsmal ? 'Skjul' : 'Vis spørsmålene'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Spørsmålene er felles for alle runder. Redigering kommer senere — her er de kun til gjennomsyn.
        </p>
        {visSporsmal && (
          <div className="mt-4 space-y-5">
            {sporsmalPerBlokk.map(({ blokk, sporsmal: liste }) => (
              <div key={blokk}>
                <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold mb-2">
                  {BLOKK_ETIKETT[blokk] || blokk}
                </span>
                <ul className="space-y-2">
                  {liste.map(s => {
                    const rader = matriserader.filter(m => m.sporsmal_id === s.id)
                    return (
                      <li key={s.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-gray-900 font-medium">{s.sporsmaltekst}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {TYPE_ETIKETT[s.type] || s.type}
                            {s.type !== 'fritekst' && s.skala_min != null && s.skala_max != null
                              ? ` · ${s.skala_min}–${s.skala_max}` : ''}
                            {s.tillat_ikke_aktuelt ? ' · «ikke aktuelt»' : ''}
                          </span>
                        </div>
                        {rader.length > 0 && (
                          <ul className="mt-2 ml-4 list-disc text-sm text-gray-600 space-y-0.5">
                            {rader.map(m => (
                              <li key={m.id}>
                                {m.radtekst}
                                {m.tillat_ikke_aktuelt ? <span className="text-gray-400"> · «ikke aktuelt»</span> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {sporsmalPerBlokk.length === 0 && (
              <p className="text-sm text-gray-500">Ingen spørsmål funnet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Runder ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Runder</h3>

        {laster ? (
          <p className="text-gray-500">Laster …</p>
        ) : runder.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
            Ingen runder ennå. Opprett den første over.
          </div>
        ) : (
          <div className="space-y-3">
            {runder.map(r => {
              const antMott = mottakerAntall[r.id] || 0
              const antSvar = svarAntall[r.id] || 0
              const kanSlettes = r.status === 'utkast' && antSvar === 0
              const erApen = apenRunde === r.id
              return (
                <div key={r.id} className="border border-gray-200 rounded-lg">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="flex-1 min-w-[12rem]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{r.navn}</span>
                        <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + (STATUS_KLASSE[r.status] || 'bg-gray-100 text-gray-700')}>
                          {STATUS_ETIKETT[r.status] || r.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Målgruppe: {r.maalgruppe ? r.maalgruppe : 'Alle skoler'} · Opprettet {formaterDato(r.opprettet_at)} · {antMott} mottaker{antMott === 1 ? '' : 'e'}
                        {antSvar > 0 ? ` · ${antSvar} svar` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => apneRunde(r.id)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        {erApen ? 'Lukk' : 'Åpne'}
                      </button>
                      {kanSlettes && (
                        bekreftSlett === r.id ? (
                          <span className="flex items-center gap-1">
                            <button type="button" onClick={() => slettRunde(r.id)} disabled={sletter} className="px-3 py-1.5 rounded-lg bg-pink-600 text-white text-sm font-medium disabled:opacity-40">
                              {sletter ? 'Sletter …' : 'Bekreft sletting'}
                            </button>
                            <button type="button" onClick={() => setBekreftSlett(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900">
                              Avbryt
                            </button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setBekreftSlett(r.id)} className="px-3 py-1.5 rounded-lg border border-pink-200 text-sm font-medium text-pink-700 hover:bg-pink-50">
                            Slett
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {erApen && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/60">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <button type="button" onClick={() => genererMottakere(r.id)} disabled={genererer} className={primærKnapp}>
                          {genererer ? 'Genererer …' : antMott > 0 ? 'Regenerer mottakere' : 'Generer mottakere'}
                        </button>
                        {genResultat && !genResultat.feil && (
                          <span className="text-sm text-gray-700">
                            {genResultat.opprettet} opprettet · {genResultat.hoppet_over} hoppet over (uten e-post)
                          </span>
                        )}
                        {genResultat?.feil && <span className="text-sm text-pink-700">{genResultat.feil}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Regenerer rett før utsending hvis det har gått tid — adressen fryses ved generering.
                        Gjentatt generering dubler ikke (én hovedkontakt per skole).
                      </p>

                      {henterMott ? (
                        <p className="text-sm text-gray-500">Henter mottakere …</p>
                      ) : mottakere.length === 0 ? (
                        <p className="text-sm text-gray-500">Ingen mottakere ennå. Trykk «Generer mottakere».</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                              <tr>
                                <th className="px-4 py-2">Skole</th>
                                <th className="px-4 py-2">Kontakt</th>
                                <th className="px-4 py-2">E-post</th>
                                <th className="px-4 py-2">Kilde</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mottakere.map(m => (
                                <tr key={m.id} className="border-t border-gray-100">
                                  <td className="px-4 py-2 font-medium">{m.skoler?.navn || '—'}</td>
                                  <td className="px-4 py-2 text-gray-700">{m.navn || '—'}</td>
                                  <td className="px-4 py-2 text-gray-600">{m.epost || '—'}</td>
                                  <td className="px-4 py-2 text-gray-500">{KILDE_ETIKETT[m.rolle] || m.rolle || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
