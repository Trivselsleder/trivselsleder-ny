import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  hentPlanEn, oppdaterPlan, leggTilRad, settRadCeller, slettRad, settRekkefolge,
  arkiverPlan, kopierPlan, smarteForslag, NIVAA, planNivaa,
} from '../../lib/periodeplan'
import { hentLeker } from '../../lib/leker'
import { hentDeltakere } from '../../lib/tlDeltaker'
import { skrivUtPlan } from '../../lib/periodeplanPdf'
import { useAuth } from '../../contexts/AuthContext'
import PeriodeplanRutenett from '../../components/PeriodeplanRutenett'
import PeriodeplanOppsett from '../../components/PeriodeplanOppsett'
import GenererAar from '../../components/GenererAar'
import TlListeManager from '../../components/TlListeManager'

export default function SkolePeriodeplan() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { bruker } = useAuth()
  const kanAdmin = ['superadmin', 'ansatt', 'skoleadmin'].includes(bruker?.rolle)

  const [plan, setPlan] = useState(null)
  const [deltakere, setDeltakere] = useState([])
  const [alleLeker, setAlleLeker] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [redigerNavn, setRedigerNavn] = useState(false)
  const [navn, setNavn] = useState('')
  const [visning, setVisning] = useState('uke') // 'uke' | 'dag'
  const [valgtDag, setValgtDag] = useState(null)
  const [panel, setPanel] = useState(null) // 'innstillinger' | 'generer' | 'tl' | null
  const [sok, setSok] = useState('')
  const [forslag, setForslag] = useState(null)
  const [melding, setMelding] = useState(null)
  const [skjermAapen, setSkjermAapen] = useState(false)
  const [qrSrc, setQrSrc] = useState('')
  const meldingTimer = useRef(null)

  // Last plan ved id-bytte (setter laster + guarder mot ut-av-rekkefølge-svar).
  useEffect(() => {
    let aktiv = true
    setLaster(true); setFeil(null)
    hentPlanEn(id)
      .then((p) => { if (!aktiv) return; setPlan(p); setNavn(p.navn) })
      .catch((e) => { if (aktiv) setFeil(e.message) })
      .finally(() => { if (aktiv) setLaster(false) })
    return () => { aktiv = false }
  }, [id])

  useEffect(() => { hentDeltakere().then(setDeltakere).catch(() => {}) }, [])
  useEffect(() => { hentLeker().then(setAlleLeker).catch(() => {}) }, [])
  useEffect(() => () => { if (meldingTimer.current) clearTimeout(meldingTimer.current) }, [])

  // Hold valgt dag gyldig mot planens dager (også etter kopier/endret oppsett).
  useEffect(() => {
    if (!plan) return
    if (!valgtDag || !plan.dager.includes(valgtDag)) setValgtDag(plan.dager[0] || null)
  }, [plan?.dager]) // eslint-disable-line react-hooks/exhaustive-deps

  function refetch() {
    hentPlanEn(id).then(setPlan).catch((e) => visMelding(e.message))
  }
  function visMelding(t) {
    setMelding(t)
    if (meldingTimer.current) clearTimeout(meldingTimer.current)
    meldingTimer.current = window.setTimeout(() => setMelding(null), 3500)
  }

  async function lagreOppsett(felter) {
    setPlan((p) => ({ ...p, ...felter }))
    try { await oppdaterPlan(id, felter) } catch (e) { visMelding('Kunne ikke lagre: ' + e.message) }
  }
  // Nivå lagres i ansvarlige._nivaa (jsonb-hjørne, ingen schema-endring).
  async function settNivaa(nivaa) {
    const ansvarlige = { ...(plan.ansvarlige || {}) }
    if (nivaa) ansvarlige._nivaa = nivaa; else delete ansvarlige._nivaa
    setPlan((p) => ({ ...p, ansvarlige }))
    try { await oppdaterPlan(id, { ansvarlige }) } catch (e) { visMelding('Kunne ikke lagre nivå: ' + e.message) }
  }
  async function lagreNavn() {
    const ny = navn.trim()
    setRedigerNavn(false)
    if (!ny) { setNavn(plan.navn); return }
    if (ny === plan.navn) return
    setPlan((p) => ({ ...p, navn: ny }))
    try { await oppdaterPlan(id, { navn: ny }) } catch (e) { visMelding('Kunne ikke lagre navn: ' + e.message) }
  }
  // Bygg nytt celler-objekt inne i updateren (unngår stale-closure / siste-skriver-vinner).
  async function onCelle(radId, dag, tekst) {
    let nye
    setPlan((p) => ({
      ...p,
      rader: p.rader.map((r) => {
        if (r.id !== radId) return r
        const celler = { ...(r.celler || {}), [dag]: tekst }
        if (tekst === '') delete celler[dag]
        nye = celler
        return { ...r, celler }
      }),
    }))
    if (nye === undefined) return
    try { await settRadCeller(radId, nye) } catch (e) { visMelding('Kunne ikke lagre celle: ' + e.message); refetch() }
  }
  async function onAnsvarlig(dag, verdi) {
    let nye
    setPlan((p) => {
      const ansvarlige = { ...(p.ansvarlige || {}), [dag]: verdi }
      if (verdi === '') delete ansvarlige[dag]
      nye = ansvarlige
      return { ...p, ansvarlige }
    })
    try { await oppdaterPlan(id, { ansvarlige: nye }) } catch (e) { visMelding('Kunne ikke lagre: ' + e.message) }
  }
  async function onSlettRad(radId) {
    setPlan((p) => ({ ...p, rader: p.rader.filter((r) => r.id !== radId) }))
    try { await slettRad(radId) } catch (e) { visMelding(e.message); refetch() }
  }
  async function onFlyttRad(idx, dir) {
    let resultat
    setPlan((p) => {
      const ny = [...p.rader]
      const j = idx + dir
      if (j < 0 || j >= ny.length) return p
      ;[ny[idx], ny[j]] = [ny[j], ny[idx]]
      resultat = ny
      return { ...p, rader: ny }
    })
    if (!resultat) return
    try { await settRekkefolge(resultat) } catch (e) { visMelding(e.message); refetch() }
  }
  async function leggTilLek(lek) {
    try {
      await leggTilRad(id, lek.id, plan.rader.length)
      visMelding(`«${lek.tittel}» lagt til`)
      refetch()
    } catch (e) { visMelding('Kunne ikke legge til: ' + e.message) }
  }
  async function lastForslag() {
    try {
      const f = await smarteForslag({ ekskluder: plan.rader.map((r) => r.ressursId).filter(Boolean) })
      setForslag(f)
    } catch (e) { visMelding('Kunne ikke hente forslag: ' + e.message) }
  }
  // Sikre at planen har en delingstoken (for Del- og Skjerm-lenke). No-op hvis den finnes.
  async function sikreDelingstoken() {
    if (plan.delingstoken) return plan.delingstoken
    const t = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await oppdaterPlan(id, { delingstoken: t })
    setPlan((p) => ({ ...p, delingstoken: t }))
    return t
  }
  async function delLenke() {
    let t
    try { t = await sikreDelingstoken() } catch (e) { visMelding('Kunne ikke lage lenke: ' + e.message); return }
    const url = `${window.location.origin}/plan/${t}`
    try {
      await navigator.clipboard.writeText(url)
      visMelding('Delingslenke kopiert. Alle med lenken kan se planen (skrivebeskyttet). Elevnavn kan skjules.')
    } catch { visMelding(url) }
  }
  async function kopier() {
    try { const nyId = await kopierPlan(id, `${plan.navn} (kopi)`); navigate(`/min-side/periodeplaner/${nyId}`) }
    catch (e) { visMelding('Kunne ikke kopiere: ' + e.message) }
  }
  async function arkiver() {
    if (!window.confirm('Arkivere planen? Delingslenka slutter å virke.')) return
    try { await arkiverPlan(id); navigate('/min-side/periodeplaner') }
    catch (e) { visMelding('Kunne ikke arkivere: ' + e.message) }
  }
  function skjermUrl() {
    return plan?.delingstoken ? `${window.location.origin}/skjerm/${plan.delingstoken}` : null
  }
  async function aapneSkjerm() {
    setSkjermAapen(true); setQrSrc('')
    try {
      const t = await sikreDelingstoken()
      const url = `${window.location.origin}/skjerm/${t}`
      QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQrSrc).catch(() => setQrSrc(''))
    } catch (e) { visMelding('Kunne ikke klargjøre skjerm-lenke: ' + e.message) }
  }
  async function kopierSkjerm() {
    const url = skjermUrl(); if (!url) return
    try { await navigator.clipboard.writeText(url); visMelding('Skjerm-lenke kopiert.') } catch { visMelding(url) }
  }

  const paaPlan = useMemo(() => new Set((plan?.rader || []).map((r) => r.ressursId).filter(Boolean)), [plan])
  const bibliotek = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alleLeker.filter((l) => !q || (l.tittel || '').toLowerCase().includes(q)).slice(0, 40)
  }, [alleLeker, sok])

  if (laster) return <div className="max-w-6xl mx-auto px-4 text-gray-500">Laster …</div>
  if (feil) return <div className="max-w-6xl mx-auto px-4 text-red-600">{feil}</div>
  if (!plan) return null

  const periode = (plan.uker?.length ? `Uke ${plan.uker.join(', ')}` : 'Ingen uker satt') + (plan.aar ? ` · ${plan.aar}` : '')
  const knapp = 'text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-full hover:border-orange hover:text-orange transition whitespace-nowrap'
  const dagerVises = visning === 'dag' && valgtDag ? [valgtDag] : plan.dager

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6">
      {/* Topp-bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link to="/min-side/periodeplaner" className="text-sm text-gray-500 hover:text-orange">← Alle planer</Link>
          {redigerNavn ? (
            <input value={navn} onChange={(e) => setNavn(e.target.value)} onBlur={lagreNavn} autoFocus aria-label="Plannavn"
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setNavn(plan.navn); setRedigerNavn(false) } }}
              className="block mt-1 text-2xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-orange" />
          ) : (
            <button type="button" onClick={() => setRedigerNavn(true)} aria-label="Endre plannavn" title="Klikk for å endre navn"
              className="block mt-1 text-2xl font-bold text-gray-900 text-left hover:text-orange transition">{plan.navn}</button>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500">
            <label className="flex items-center gap-1">
              <span className="text-gray-400">Nivå:</span>
              <select value={planNivaa(plan) || ''} onChange={(e) => settNivaa(e.target.value || null)} aria-label="Nivå (hvem planen gjelder for)"
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-orange">
                <option value="">Ikke satt</option>
                {NIVAA.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
              </select>
            </label>
            <span aria-hidden="true">·</span>
            <span>{periode} · <span className="text-petrol font-medium">Autolagret</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full border border-gray-200 p-0.5 bg-white">
            {[['uke', 'Uke'], ['dag', 'Dag']].map(([v, l]) => (
              <button key={v} aria-pressed={visning === v} onClick={() => setVisning(v)}
                className={`text-sm px-4 py-1.5 rounded-full transition ${visning === v ? 'bg-orange text-white font-medium' : 'text-gray-600 hover:text-orange'}`}>{l}</button>
            ))}
          </div>
          <button onClick={delLenke} className={knapp}>🔗 Del</button>
          <button onClick={aapneSkjerm} className={knapp}>📺 Vis på skjerm</button>
          <button onClick={() => skrivUtPlan(plan)} className="text-sm bg-orange text-white font-medium px-4 py-2 rounded-full hover:bg-[#e8641c] transition whitespace-nowrap">🖨 Se arket</button>
          <button onClick={kopier} className={knapp}>Kopier</button>
          <button onClick={arkiver} className="text-sm text-gray-500 hover:text-red-500 px-2" title="Arkiverer planen og trekker tilbake delingslenka">Arkiver</button>
        </div>
      </div>

      {melding && <p role="status" className="text-sm text-petrol mt-2">{melding}</p>}

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 mt-4">
        {/* Sidebar: Lekbiblioteket */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 h-max lg:sticky lg:top-24">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">🎲 Lekbiblioteket</h2>
          <input value={sok} onChange={(e) => setSok(e.target.value)}
            placeholder={alleLeker.length ? `Søk blant ${alleLeker.length} leker …` : 'Søk i biblioteket …'} aria-label="Søk i biblioteket"
            className="w-full mt-3 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-orange">✨ Smarte forslag</span>
            <button onClick={lastForslag} className="text-xs text-gray-500 hover:text-orange">{forslag ? 'Oppdater' : 'Vis'}</button>
          </div>
          {forslag && (
            forslag.length === 0 ? <p className="text-xs text-gray-500 mt-1">Ingen forslag akkurat nå.</p> : (
              <div className="mt-2 space-y-1.5">
                {forslag.map((l) => <LekeRad key={l.id} lek={l} paa={paaPlan.has(l.id)} onLegg={() => leggTilLek(l)} />)}
              </div>
            )
          )}

          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-2">Alle leker</div>
          <div className="space-y-1.5 max-h-[52vh] overflow-y-auto pr-1">
            {bibliotek.length === 0 ? (
              <p className="text-xs text-gray-500">Ingen treff.</p>
            ) : (
              bibliotek.map((l) => <LekeRad key={l.id} lek={l} paa={paaPlan.has(l.id)} onLegg={() => leggTilLek(l)} />)
            )}
          </div>
        </aside>

        {/* Hoved: rutenett */}
        <main className="min-w-0">
          {visning === 'dag' && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {plan.dager.map((d) => (
                <button key={d} aria-pressed={valgtDag === d} onClick={() => setValgtDag(d)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition ${valgtDag === d ? 'bg-orange text-white border-orange' : 'bg-white text-gray-600 border-gray-300 hover:border-orange'}`}>{d}</button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span aria-hidden="true">ℹ️</span> Én plan gjelder alle ukene i perioden. {plan.rader.length} leker · {plan.dager.length} dager.
          </div>

          <PeriodeplanRutenett
            plan={plan}
            deltakere={deltakere}
            dagerVises={dagerVises}
            onCelle={onCelle}
            onAnsvarlig={onAnsvarlig}
            onSlettRad={onSlettRad}
            onFlyttRad={onFlyttRad}
          />

          {/* Verktøy */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setPanel(panel === 'innstillinger' ? null : 'innstillinger')} className={knapp}>⚙ Innstillinger</button>
            {kanAdmin && <button onClick={() => setPanel(panel === 'generer' ? null : 'generer')} className={knapp}>✨ Generer skoleåret</button>}
            {kanAdmin && <button onClick={() => setPanel(panel === 'tl' ? null : 'tl')} className={knapp}>Skolens TL-liste</button>}
          </div>

          {panel === 'innstillinger' && <div className="mt-3"><PeriodeplanOppsett plan={plan} onEndre={lagreOppsett} /></div>}
          {panel === 'generer' && <div className="mt-3"><GenererAar plan={plan} onGenerert={() => visMelding('Planer generert – se «Alle planer».')} /></div>}
          {panel === 'tl' && <div className="mt-3"><TlListeManager onEndret={() => hentDeltakere().then(setDeltakere)} /></div>}
        </main>
      </div>

      {/* Vis på skjerm-modal */}
      {skjermAapen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Vis på skjerm"
          tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') setSkjermAapen(false) }} onClick={() => setSkjermAapen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">📺 Vis på skjerm</h2>
              <button onClick={() => setSkjermAapen(false)} autoFocus aria-label="Lukk" className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {skjermUrl() ? (
              <>
                <p className="text-sm text-gray-600 mt-2">Åpne planen i fullskjerm på oppslags-TV-en. Skjermen viser dagens dag uthevet og oppdaterer seg selv når du endrer planen.</p>
                <div className="mt-4 flex flex-col items-center gap-3">
                  {qrSrc
                    ? <img src={qrSrc} alt="QR-kode til skjermvisning" className="w-44 h-44 rounded-xl border border-gray-100" />
                    : <div className="w-44 h-44 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">Lager QR …</div>}
                  <p className="text-xs text-gray-500 text-center">{qrSrc ? 'Skann med TV-ens nettleser eller en telefon som kaster til skjermen.' : 'Bruk lenken under hvis QR ikke vises.'}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <input readOnly value={skjermUrl()} aria-label="Skjerm-lenke" className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
                  <button onClick={kopierSkjerm} className="text-sm border border-gray-300 rounded-full px-4 py-2 hover:border-orange hover:text-orange whitespace-nowrap">Kopier</button>
                </div>
                <a href={skjermUrl()} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block text-center text-sm bg-orange text-white font-medium px-4 py-2.5 rounded-full hover:bg-[#e8641c] transition">
                  Åpne skjermvisning ↗
                </a>
                <p className="text-xs text-gray-400 mt-3">Elevnavn vises på skjermen. På selve skjermsiden kan du bytte til «Skjul elevnavn» hvis dere ønsker det.</p>
              </>
            ) : (
              <p className="text-sm text-gray-600 mt-3">Planen mangler en delingslenke ennå. Trykk «🔗 Del» én gang først, så blir skjerm-lenken tilgjengelig.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Lekekort i sidebaren — «+» legger den til planen.
function LekeRad({ lek, paa, onLegg }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2.5 py-2 hover:border-orange/60 transition">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{lek.tittel}</p>
        {lek.egnet?.[0] && <p className="text-xs text-gray-500 truncate">{lek.egnet[0]}</p>}
      </div>
      <button
        onClick={onLegg}
        title={paa ? 'Allerede på planen — legg til igjen' : 'Legg til i planen'}
        aria-label={`Legg til ${lek.tittel}`}
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none transition ${paa ? 'bg-gray-100 text-gray-500 hover:bg-orange/10 hover:text-orange' : 'bg-orange/10 text-orange hover:bg-orange hover:text-white'}`}
      >+</button>
    </div>
  )
}
