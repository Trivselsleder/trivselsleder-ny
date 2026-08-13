import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hentHjulEn, settHjulLeker, oppdaterHjul, arkiverHjul, kopierHjul } from '../../lib/hjul'
import Lykkehjul from '../../components/Lykkehjul'
import LekeVelger from '../../components/LekeVelger'

export default function SkoleHjul() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hjul, setHjul] = useState(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [rediger, setRediger] = useState(false)
  const [navn, setNavn] = useState('')
  const [rotasjoner, setRotasjoner] = useState(6)
  const [skrift, setSkrift] = useState(16)
  const [valgte, setValgte] = useState([]) // {id, tittel}
  const [lagrer, setLagrer] = useState(false)

  function last() {
    setLaster(true)
    setFeil(null)
    hentHjulEn(id)
      .then((h) => {
        setHjul(h)
        setNavn(h.navn)
        setRotasjoner(h.rotasjoner)
        setSkrift(h.skriftstorrelse)
        setValgte(h.leker.map((l) => ({ id: l.ressursId, tittel: l.tittel })))
      })
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }
  useEffect(last, [id])

  function toggleLek(lek) {
    setValgte((v) =>
      v.some((x) => x.id === lek.id) ? v.filter((x) => x.id !== lek.id) : [...v, { id: lek.id, tittel: lek.tittel }]
    )
  }

  // Live-forhåndsvisning i redigering (nok data til emoji/farge/tittel).
  const forhandsLeker = valgte.map((x) => ({ ressursId: x.id, tittel: x.tittel, egnet: [], utstyr: [], harVideo: false }))

  async function lagre() {
    if (lagrer) return
    setLagrer(true)
    try {
      await oppdaterHjul(id, { navn: navn.trim() || hjul.navn, rotasjoner, skriftstorrelse: skrift })
      await settHjulLeker(id, valgte.map((x) => x.id))
      setRediger(false)
      last()
    } catch (e) { setFeil(e.message) } finally { setLagrer(false) }
  }

  async function kopier() {
    try {
      const nyId = await kopierHjul(id, `${hjul.navn} (kopi)`)
      navigate(`/min-side/tl-hjulet/${nyId}`)
    } catch (e) { setFeil(e.message) }
  }

  async function arkiver() {
    try { await arkiverHjul(id); navigate('/min-side/tl-hjulet') } catch (e) { setFeil(e.message) }
  }

  if (laster) return <div className="max-w-3xl mx-auto px-4 text-gray-400">Laster …</div>
  if (feil) return <div className="max-w-3xl mx-auto px-4 text-red-500">{feil}</div>
  if (!hjul) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link to="/min-side/tl-hjulet" className="text-sm text-gray-500 hover:text-orange">← Alle hjul</Link>

      <div className="flex items-center justify-between gap-4 mt-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{hjul.navn}</h1>
        {!rediger && (
          <div className="flex items-center gap-2">
            <button onClick={() => setRediger(true)} className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-50">Rediger</button>
            <button onClick={kopier} className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-50">Kopier</button>
          </div>
        )}
      </div>

      {!rediger && (
        <div className="mt-6">
          <Lykkehjul leker={hjul.leker} rotasjoner={hjul.rotasjoner} skriftstorrelse={hjul.skriftstorrelse} />
          <div className="mt-8">
            <h2 className="font-bold text-gray-900 text-sm">Leker på hjulet ({hjul.leker.length})</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {hjul.leker.map((l) => (
                <Link key={l.koblingId} to={`/min-side/aktiviteter/${l.ressursId}`} className="text-sm bg-orange/10 text-orange px-3 py-1 rounded-full hover:bg-orange/20">{l.tittel}</Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {rediger && (
        <div className="mt-6 grid md:grid-cols-2 gap-8">
          <div>
            <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange" />

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

            <div className="flex items-center gap-3 mt-4">
              <button onClick={lagre} disabled={lagrer} className="bg-orange text-white font-medium px-6 py-2.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50">
                {lagrer ? 'Lagrer …' : 'Lagre'}
              </button>
              <button onClick={() => { setRediger(false); last() }} className="text-gray-500 hover:text-gray-700 px-4">Avbryt</button>
              <button onClick={arkiver} className="ml-auto text-sm text-gray-400 hover:text-red-500">Arkiver hjul</button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2 text-center">Forhåndsvisning</p>
            <Lykkehjul leker={forhandsLeker} rotasjoner={rotasjoner} skriftstorrelse={skrift} kanApneLek={false} />
          </div>
        </div>
      )}
    </div>
  )
}
