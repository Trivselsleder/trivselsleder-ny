import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hentPlaner, opprettPlan } from '../../lib/periodeplan'

export default function SkolePeriodeplaner() {
  const [planer, setPlaner] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [nytt, setNytt] = useState(false)
  const [navn, setNavn] = useState('')
  const [lagrer, setLagrer] = useState(false)
  const navigate = useNavigate()

  function last() {
    setLaster(true)
    hentPlaner()
      .then(setPlaner)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }
  useEffect(last, [])

  async function lagPlan() {
    if (!navn.trim() || lagrer) return
    setLagrer(true)
    try {
      const id = await opprettPlan({ navn: navn.trim() })
      navigate(`/min-side/periodeplaner/${id}`)
    } catch (e) {
      setFeil(e.message)
      setLagrer(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periodeplaner</h1>
          <p className="text-gray-500 text-sm mt-1">Sett sammen leker til en plan for en periode.</p>
        </div>
        {!nytt && (
          <button
            onClick={() => setNytt(true)}
            className="shrink-0 bg-magenta text-white font-medium px-5 py-2.5 rounded-full hover:bg-magenta/90 transition"
          >
            + Ny plan
          </button>
        )}
      </div>

      {feil && <p className="text-red-500 mt-4">{feil}</p>}

      {nytt && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900">Ny periodeplan</h2>
          <input
            type="text"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            placeholder="Navn på planen (f.eks. «Høst 2026»)"
            className="mt-3 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={lagPlan}
              disabled={!navn.trim() || lagrer}
              className="bg-orange text-white font-medium px-6 py-2.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50"
            >
              {lagrer ? 'Lagrer …' : 'Lag plan'}
            </button>
            <button onClick={() => { setNytt(false); setNavn('') }} className="text-gray-500 hover:text-gray-700 px-4">
              Avbryt
            </button>
          </div>
        </div>
      )}

      <h2 className="font-bold text-gray-900 mt-8">Mine planer</h2>
      {laster && <p className="text-gray-400 mt-4">Laster …</p>}
      {!laster && planer.length === 0 && (
        <p className="text-gray-400 mt-4">Du har ingen planer ennå. Trykk «+ Ny plan» for å lage en.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {planer.map((p) => (
          <Link
            key={p.id}
            to={`/min-side/periodeplaner/${p.id}`}
            className="block bg-white rounded-2xl border border-gray-200 hover:border-magenta hover:shadow-md transition p-5"
          >
            <h3 className="font-bold text-gray-900">{p.navn}</h3>
            <p className="text-sm text-gray-400 mt-1">{p.oppforinger.length} oppføringer</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
