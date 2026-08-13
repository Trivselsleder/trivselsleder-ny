import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hentHjul, opprettHjul, kopierHjul } from '../../lib/hjul'
import LekeVelger from '../../components/LekeVelger'
import Lykkehjul from '../../components/Lykkehjul'

export default function SkoleTLhjulet() {
  const [hjul, setHjul] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [nytt, setNytt] = useState(false)
  const [navn, setNavn] = useState('')
  const [rotasjoner, setRotasjoner] = useState(6)
  const [skrift, setSkrift] = useState(16)
  const [valgte, setValgte] = useState([]) // {id, tittel}
  const [lagrer, setLagrer] = useState(false)
  const [sortering, setSortering] = useState('dato')
  const navigate = useNavigate()

  function last() {
    setLaster(true)
    hentHjul().then(setHjul).catch((e) => setFeil(e.message)).finally(() => setLaster(false))
  }
  useEffect(last, [])

  const sortert = useMemo(() => {
    const h = [...hjul]
    if (sortering === 'navn') h.sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'))
    return h
  }, [hjul, sortering])

  function toggleLek(lek) {
    setValgte((v) =>
      v.some((x) => x.id === lek.id) ? v.filter((x) => x.id !== lek.id) : [...v, { id: lek.id, tittel: lek.tittel }]
    )
  }

  const forhandsLeker = valgte.map((x) => ({ ressursId: x.id, tittel: x.tittel, egnet: [], utstyr: [], harVideo: false }))

  async function lagHjul() {
    if (!navn.trim() || lagrer) return
    setLagrer(true)
    try {
      const id = await opprettHjul({ navn: navn.trim(), leker: valgte.map((x) => x.id), rotasjoner, skriftstorrelse: skrift })
      navigate(`/min-side/tl-hjulet/${id}`)
    } catch (e) { setFeil(e.message); setLagrer(false) }
  }

  async function kopier(h) {
    try {
      const id = await kopierHjul(h.id, `${h.navn} (kopi)`)
      navigate(`/min-side/tl-hjulet/${id}`)
    } catch (e) { setFeil(e.message) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TL-hjulet</h1>
          <p className="text-gray-500 text-sm mt-1">Lag et hjul med leker og la elevene snurre om dagens aktivitet.</p>
        </div>
        {!nytt && (
          <button onClick={() => setNytt(true)} className="shrink-0 bg-magenta text-white font-medium px-5 py-2.5 rounded-full hover:bg-magenta/90 transition">+ Nytt hjul</button>
        )}
      </div>

      {feil && <p className="text-red-500 mt-4">{feil}</p>}

      {nytt && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-bold text-gray-900">Nytt hjul</h2>
            <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn (f.eks. «Uteleker uke 40»)"
              className="mt-3 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange" />

            <div className="flex flex-wrap gap-6 mt-4">
              <label className="text-xs text-gray-500">Rotasjoner: <span className="text-gray-700 font-medium">{rotasjoner}</span>
                <input type="range" min="3" max="12" value={rotasjoner} onChange={(e) => setRotasjoner(Number(e.target.value))} className="block w-40 mt-1 accent-magenta" />
              </label>
              <label className="text-xs text-gray-500">Skriftstørrelse: <span className="text-gray-700 font-medium">{skrift}</span>
                <input type="range" min="10" max="28" value={skrift} onChange={(e) => setSkrift(Number(e.target.value))} className="block w-40 mt-1 accent-magenta" />
              </label>
            </div>

            <p className="text-sm text-gray-500 mt-4 mb-2">Valgte leker: <span className="font-medium text-gray-700">{valgte.length}</span></p>
            {valgte.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {valgte.map((x) => (
                  <span key={x.id} className="text-xs bg-magenta/10 text-magenta px-2 py-1 rounded-full flex items-center gap-1">
                    {x.tittel}
                    <button onClick={() => toggleLek(x)} className="hover:text-magenta/70" aria-label="Fjern">×</button>
                  </span>
                ))}
              </div>
            )}
            <LekeVelger valgteIder={valgte.map((x) => x.id)} onVelg={toggleLek} modus="toggle" />

            <div className="flex gap-3 mt-4">
              <button onClick={lagHjul} disabled={!navn.trim() || valgte.length === 0 || lagrer}
                className="bg-orange text-white font-medium px-6 py-2.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50">
                {lagrer ? 'Lagrer …' : 'Lag hjul'}
              </button>
              <button onClick={() => { setNytt(false); setNavn(''); setValgte([]) }} className="text-gray-500 hover:text-gray-700 px-4">Avbryt</button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2 text-center">Forhåndsvisning</p>
            <Lykkehjul leker={forhandsLeker} rotasjoner={rotasjoner} skriftstorrelse={skrift} kanApneLek={false} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <h2 className="font-bold text-gray-900">Mine hjul</h2>
        <label className="text-sm text-gray-500 flex items-center gap-2">Sorter:
          <select value={sortering} onChange={(e) => setSortering(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm">
            <option value="dato">Nyeste</option>
            <option value="navn">Navn</option>
          </select>
        </label>
      </div>

      {laster && <p className="text-gray-400 mt-4">Laster …</p>}
      {!laster && sortert.length === 0 && <p className="text-gray-400 mt-4">Du har ingen hjul ennå. Trykk «+ Nytt hjul».</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {sortert.map((h) => (
          <div key={h.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition p-5">
            <Link to={`/min-side/tl-hjulet/${h.id}`} className="block">
              <h3 className="font-bold text-gray-900 hover:text-magenta">{h.navn}</h3>
              <p className="text-sm text-gray-400 mt-1">{h.leker.length} leker</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {h.leker.slice(0, 4).map((l) => (
                  <span key={l.koblingId} className="text-xs bg-orange/10 text-orange px-2 py-0.5 rounded-full">{l.tittel}</span>
                ))}
                {h.leker.length > 4 && <span className="text-xs text-gray-400 px-1">+{h.leker.length - 4}</span>}
              </div>
            </Link>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => kopier(h)} className="text-xs text-gray-500 hover:text-orange">Kopier</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
