import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  hentPlanEn, oppdaterPlan, leggTilRad, settRadCeller, slettRad, settRekkefolge,
  arkiverPlan, kopierPlan, delingsUrl, smarteForslag,
} from '../../lib/periodeplan'
import { hentDeltakere } from '../../lib/tlDeltaker'
import { skrivUtPlan } from '../../lib/periodeplanPdf'
import { useAuth } from '../../contexts/AuthContext'
import PeriodeplanRutenett from '../../components/PeriodeplanRutenett'
import PeriodeplanOppsett from '../../components/PeriodeplanOppsett'
import GenererAar from '../../components/GenererAar'
import TlListeManager from '../../components/TlListeManager'
import LekeVelger from '../../components/LekeVelger'

export default function SkolePeriodeplan() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { bruker } = useAuth()
  const kanAdmin = ['superadmin', 'ansatt', 'skoleadmin'].includes(bruker?.rolle)

  const [plan, setPlan] = useState(null)
  const [deltakere, setDeltakere] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [redigerNavn, setRedigerNavn] = useState(false)
  const [navn, setNavn] = useState('')
  const [panel, setPanel] = useState(null) // 'lek' | 'forslag' | 'generer' | 'tl' | null
  const [forslag, setForslag] = useState([])
  const [melding, setMelding] = useState(null)
  const meldingTimer = useRef(null)

  function last() {
    setFeil(null)
    hentPlanEn(id)
      .then((p) => { setPlan(p); setNavn(p.navn) })
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }
  useEffect(last, [id])
  useEffect(() => { hentDeltakere().then(setDeltakere).catch(() => {}) }, [])

  function visMelding(t) {
    setMelding(t)
    if (meldingTimer.current) clearTimeout(meldingTimer.current)
    meldingTimer.current = window.setTimeout(() => setMelding(null), 3500)
  }

  async function lagreOppsett(felter) {
    setPlan((p) => ({ ...p, ...felter }))
    try { await oppdaterPlan(id, felter) } catch (e) { visMelding('Kunne ikke lagre: ' + e.message) }
  }

  async function lagreNavn() {
    if (navn.trim() && navn.trim() !== plan.navn) await oppdaterPlan(id, { navn: navn.trim() })
    setRedigerNavn(false)
    setPlan((p) => ({ ...p, navn: navn.trim() || p.navn }))
  }

  async function onCelle(radId, dag, tekst) {
    const rad = plan.rader.find((r) => r.id === radId)
    if (!rad) return
    const celler = { ...(rad.celler || {}), [dag]: tekst }
    if (tekst === '') delete celler[dag]
    setPlan((p) => ({ ...p, rader: p.rader.map((r) => (r.id === radId ? { ...r, celler } : r)) }))
    try { await settRadCeller(radId, celler) } catch (e) { visMelding('Kunne ikke lagre celle: ' + e.message) }
  }

  async function onAnsvarlig(dag, verdi) {
    const ansvarlige = { ...(plan.ansvarlige || {}), [dag]: verdi }
    if (verdi === '') delete ansvarlige[dag]
    setPlan((p) => ({ ...p, ansvarlige }))
    try { await oppdaterPlan(id, { ansvarlige }) } catch (e) { visMelding('Kunne ikke lagre: ' + e.message) }
  }

  async function onSlettRad(radId) {
    setPlan((p) => ({ ...p, rader: p.rader.filter((r) => r.id !== radId) }))
    try { await slettRad(radId) } catch (e) { visMelding(e.message) }
  }

  async function onFlyttRad(idx, dir) {
    const ny = [...plan.rader]
    const j = idx + dir
    if (j < 0 || j >= ny.length) return
    ;[ny[idx], ny[j]] = [ny[j], ny[idx]]
    setPlan((p) => ({ ...p, rader: ny }))
    try { await settRekkefolge(ny) } catch (e) { visMelding(e.message) }
  }

  async function leggTilLek(lek) {
    try {
      await leggTilRad(id, lek.id, plan.rader.length)
      visMelding(`«${lek.tittel}» lagt til`)
      last()
    } catch (e) { visMelding('Kunne ikke legge til: ' + e.message) }
  }

  async function visForslag() {
    setPanel(panel === 'forslag' ? null : 'forslag')
    if (panel !== 'forslag') {
      const f = await smarteForslag({ ekskluder: plan.rader.map((r) => r.ressursId).filter(Boolean) })
      setForslag(f)
    }
  }

  async function delLenke() {
    const url = delingsUrl(plan)
    try {
      await navigator.clipboard.writeText(url)
      visMelding('Delingslenke kopiert. Alle med lenken kan se planen (skrivebeskyttet).')
    } catch {
      visMelding(url)
    }
  }

  async function kopier() {
    try {
      const nyId = await kopierPlan(id, `${plan.navn} (kopi)`)
      navigate(`/min-side/periodeplaner/${nyId}`)
    } catch (e) { visMelding('Kunne ikke kopiere: ' + e.message) }
  }

  async function arkiver() {
    try {
      await arkiverPlan(id)
      navigate('/min-side/periodeplaner')
    } catch (e) { visMelding('Kunne ikke arkivere: ' + e.message) }
  }

  if (laster) return <div className="max-w-6xl mx-auto px-4 text-gray-400">Laster …</div>
  if (feil) return <div className="max-w-6xl mx-auto px-4 text-red-500">{feil}</div>
  if (!plan) return null

  const knapp = 'text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-full hover:border-orange hover:text-orange transition'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link to="/min-side/periodeplaner" className="text-sm text-gray-500 hover:text-orange">← Alle planer</Link>

      <div className="flex items-center justify-between gap-4 mt-2 flex-wrap">
        {redigerNavn ? (
          <input value={navn} onChange={(e) => setNavn(e.target.value)} onBlur={lagreNavn} autoFocus
            className="text-2xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-orange" />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => setRedigerNavn(true)} title="Klikk for å endre navn">{plan.navn}</h1>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => skrivUtPlan(plan)} className={knapp}>Skriv ut / PDF</button>
          <button onClick={delLenke} className={knapp}>Del lenke</button>
          <button onClick={kopier} className={knapp}>Kopier</button>
          <button onClick={arkiver} className="text-sm text-gray-400 hover:text-red-500 px-2">Arkiver</button>
        </div>
      </div>

      {melding && <p className="text-sm text-magenta mt-2">{melding}</p>}

      <div className="mt-4"><PeriodeplanOppsett plan={plan} onEndre={lagreOppsett} /></div>

      <div className="mt-5">
        <PeriodeplanRutenett
          plan={plan}
          deltakere={deltakere}
          onCelle={onCelle}
          onAnsvarlig={onAnsvarlig}
          onSlettRad={onSlettRad}
          onFlyttRad={onFlyttRad}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setPanel(panel === 'lek' ? null : 'lek')} className="bg-orange text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-orange/90">
          {panel === 'lek' ? 'Skjul biblioteket' : '+ Legg til lek'}
        </button>
        <button onClick={visForslag} className={knapp}>Smarte forslag</button>
        {kanAdmin && <button onClick={() => setPanel(panel === 'generer' ? null : 'generer')} className={knapp}>Generer hele året</button>}
        {kanAdmin && <button onClick={() => setPanel(panel === 'tl' ? null : 'tl')} className={knapp}>Skolens TL-liste</button>}
      </div>

      {panel === 'lek' && <div className="mt-4"><LekeVelger onVelg={leggTilLek} modus="legg-til" /></div>}

      {panel === 'forslag' && (
        <div className="mt-4 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-2">Forslag ut fra sesong, sted og trinn (ikke allerede på planen):</p>
          {forslag.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen forslag akkurat nå.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {forslag.map((l) => (
                <button key={l.id} onClick={() => leggTilLek(l)} className="text-sm bg-orange/10 text-orange px-3 py-1.5 rounded-full hover:bg-orange/20">
                  + {l.tittel}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === 'generer' && <div className="mt-4"><GenererAar plan={plan} onGenerert={() => visMelding('Planer generert – se «Mine planer».')} /></div>}
      {panel === 'tl' && <div className="mt-4"><TlListeManager onEndret={() => hentDeltakere().then(setDeltakere)} /></div>}
    </div>
  )
}
