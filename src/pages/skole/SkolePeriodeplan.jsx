import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  hentPlanEn,
  giPlanNavn,
  arkiverPlan,
  leggTilOppforing,
  oppdaterOppforing,
  slettOppforing,
} from '../../lib/periodeplan'
import LekeVelger from '../../components/LekeVelger'

function OppforingRad({ o, onEndret, onSlett }) {
  const [f, setF] = useState({
    dato: o.dato || '',
    uke: o.uke ?? '',
    sted: o.sted || '',
    ansvarlige: o.ansvarlige || '',
    notat: o.notat || '',
  })

  function lagreFelt(felt, verdi) {
    const payload = { [felt]: verdi === '' ? null : verdi }
    if (felt === 'uke') payload.uke = verdi === '' ? null : parseInt(verdi, 10)
    oppdaterOppforing(o.id, payload).then(onEndret).catch(() => {})
  }

  const inp = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange'

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {o.ressursId ? (
            <Link to={`/min-side/aktiviteter/${o.ressursId}`} className="font-semibold text-magenta hover:underline">
              {o.tittel}
            </Link>
          ) : (
            <span className="font-semibold text-gray-400 italic">Fri linje (ingen lek)</span>
          )}
        </div>
        <button onClick={() => onSlett(o.id)} className="text-gray-300 hover:text-red-500 shrink-0" aria-label="Slett">×</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <label className="text-xs text-gray-500">
          Dato
          <input
            type="date"
            value={f.dato}
            onChange={(e) => setF({ ...f, dato: e.target.value })}
            onBlur={(e) => lagreFelt('dato', e.target.value)}
            className={`${inp} w-full mt-0.5`}
          />
        </label>
        <label className="text-xs text-gray-500">
          Uke
          <input
            type="number"
            value={f.uke}
            onChange={(e) => setF({ ...f, uke: e.target.value })}
            onBlur={(e) => lagreFelt('uke', e.target.value)}
            className={`${inp} w-full mt-0.5`}
          />
        </label>
        <label className="text-xs text-gray-500">
          Sted
          <input
            type="text"
            value={f.sted}
            onChange={(e) => setF({ ...f, sted: e.target.value })}
            onBlur={(e) => lagreFelt('sted', e.target.value)}
            className={`${inp} w-full mt-0.5`}
          />
        </label>
        <label className="text-xs text-gray-500">
          Ansvarlige
          <input
            type="text"
            value={f.ansvarlige}
            onChange={(e) => setF({ ...f, ansvarlige: e.target.value })}
            onBlur={(e) => lagreFelt('ansvarlige', e.target.value)}
            className={`${inp} w-full mt-0.5`}
          />
        </label>
      </div>
      <label className="text-xs text-gray-500 block mt-2">
        Notat
        <input
          type="text"
          value={f.notat}
          onChange={(e) => setF({ ...f, notat: e.target.value })}
          onBlur={(e) => lagreFelt('notat', e.target.value)}
          className={`${inp} w-full mt-0.5`}
        />
      </label>
    </div>
  )
}

export default function SkolePeriodeplan() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [redigerNavn, setRedigerNavn] = useState(false)
  const [navn, setNavn] = useState('')
  const [visVelger, setVisVelger] = useState(false)

  function last() {
    setFeil(null)
    hentPlanEn(id)
      .then((p) => { setPlan(p); setNavn(p.navn) })
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }
  useEffect(last, [id])

  async function leggTilLek(lek) {
    await leggTilOppforing(id, { ressursId: lek.id, rekkefolge: plan.oppforinger.length })
    last()
  }

  async function leggTilFri() {
    await leggTilOppforing(id, { rekkefolge: plan.oppforinger.length })
    last()
  }

  async function lagreNavn() {
    if (navn.trim() && navn.trim() !== plan.navn) await giPlanNavn(id, navn.trim())
    setRedigerNavn(false)
    last()
  }

  async function slett(oppforingId) {
    await slettOppforing(oppforingId)
    last()
  }

  async function arkiver() {
    await arkiverPlan(id)
    navigate('/min-side/periodeplaner')
  }

  if (laster) return <div className="max-w-3xl mx-auto px-4 text-gray-400">Laster …</div>
  if (feil) return <div className="max-w-3xl mx-auto px-4 text-red-500">{feil}</div>
  if (!plan) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link to="/min-side/periodeplaner" className="text-sm text-gray-500 hover:text-orange">← Alle planer</Link>

      <div className="flex items-center justify-between gap-4 mt-2">
        {redigerNavn ? (
          <input
            type="text"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            onBlur={lagreNavn}
            autoFocus
            className="text-2xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-orange"
          />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => setRedigerNavn(true)} title="Klikk for å endre navn">
            {plan.navn}
          </h1>
        )}
        <button onClick={arkiver} className="shrink-0 text-sm text-gray-400 hover:text-red-500">Arkiver</button>
      </div>

      <div className="mt-6 space-y-3">
        {plan.oppforinger.length === 0 && (
          <p className="text-gray-400">Ingen oppføringer ennå. Legg til leker fra biblioteket under.</p>
        )}
        {plan.oppforinger.map((o) => (
          <OppforingRad key={o.id} o={o} onEndret={last} onSlett={slett} />
        ))}
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={() => setVisVelger((v) => !v)}
          className="bg-orange text-white font-medium px-5 py-2.5 rounded-full hover:bg-orange/90 transition"
        >
          {visVelger ? 'Skjul biblioteket' : '+ Legg til lek'}
        </button>
        <button onClick={leggTilFri} className="text-sm text-gray-500 hover:text-orange px-3">
          + Fri linje
        </button>
      </div>

      {visVelger && (
        <div className="mt-4">
          <LekeVelger onVelg={leggTilLek} modus="legg-til" />
        </div>
      )}
    </div>
  )
}
