import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hentHjulEn, settHjulSegmenter, oppdaterHjul, arkiverHjul, kopierHjul, hentKategorier, opprettKategori } from '../../lib/hjul'
import Lykkehjul from '../../components/Lykkehjul'
import KakestykkeVelger from '../../components/KakestykkeVelger'
import HjulKategori from '../../components/HjulKategori'

export default function SkoleHjul() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hjul, setHjul] = useState(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [rediger, setRediger] = useState(false)
  const [navn, setNavn] = useState('')
  const [rotasjoner, setRotasjoner] = useState(6)
  const [skrift, setSkrift] = useState(20)
  const [kategoriId, setKategoriId] = useState(null)
  const [kategorier, setKategorier] = useState([])
  const [valgte, setValgte] = useState([]) // {kind,id?,tittel,key}
  const [lagrer, setLagrer] = useState(false)
  const friTeller = useRef(0)

  function segmenterFraHjul(h) {
    friTeller.current = 0
    return h.leker.map((l) => {
      if (l.fri) { friTeller.current += 1; return { kind: 'fri', tittel: l.tekst, key: 'fri-' + friTeller.current } }
      return { kind: 'lek', id: l.ressursId, tittel: l.tittel, key: 'lek-' + l.ressursId }
    })
  }

  function last() {
    setLaster(true)
    setFeil(null)
    hentHjulEn(id)
      .then((h) => {
        setHjul(h)
        setNavn(h.navn)
        setRotasjoner(h.rotasjoner)
        setSkrift(h.skriftstorrelse)
        setKategoriId(h.kategoriId)
        setValgte(segmenterFraHjul(h))
      })
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }
  useEffect(last, [id])
  useEffect(() => { hentKategorier().then(setKategorier).catch(() => {}) }, [])

  function toggleLek(lek) {
    setValgte((v) =>
      v.some((x) => x.kind === 'lek' && x.id === lek.id)
        ? v.filter((x) => !(x.kind === 'lek' && x.id === lek.id))
        : [...v, { kind: 'lek', id: lek.id, tittel: lek.tittel, key: 'lek-' + lek.id }]
    )
  }
  function leggFri(tekst) {
    friTeller.current += 1
    setValgte((v) => [...v, { kind: 'fri', tittel: tekst, key: 'fri-ny-' + friTeller.current }])
  }
  function fjern(item) { setValgte((v) => v.filter((x) => x.key !== item.key)) }

  const forhandsLeker = valgte.map((x) =>
    x.kind === 'fri'
      ? { fri: true, tittel: x.tittel, tekst: x.tittel, egnet: [], utstyr: [], harVideo: false }
      : { fri: false, ressursId: x.id, tittel: x.tittel, egnet: [], utstyr: [], harVideo: false }
  )
  const segmenter = valgte.map((x) => (x.kind === 'fri' ? { fri: true, tekst: x.tittel } : { ressursId: x.id }))

  async function nyKategori(navnStr) {
    const k = await opprettKategori(navnStr)
    setKategorier((ks) => [...ks, k])
    return k
  }

  async function lagre() {
    if (lagrer) return
    setLagrer(true)
    try {
      await oppdaterHjul(id, { navn: navn.trim() || hjul.navn, rotasjoner, skriftstorrelse: skrift, kategori_id: kategoriId })
      await settHjulSegmenter(id, segmenter)
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{hjul.navn}</h1>
          {hjul.kategoriNavn && <span className="text-xs bg-petrol/10 text-petrol px-2 py-0.5 rounded-full">{hjul.kategoriNavn}</span>}
        </div>
        {!rediger && (
          <div className="flex items-center gap-2">
            <button onClick={() => setRediger(true)} className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-50">Rediger</button>
            <button onClick={kopier} className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-50">Kopier</button>
          </div>
        )}
      </div>

      {!rediger && (
        <div className="mt-6">
          <Lykkehjul leker={hjul.leker} rotasjoner={hjul.rotasjoner} skriftstorrelse={hjul.skriftstorrelse} kategoriNavn={hjul.kategoriNavn} />
          <div className="mt-8">
            <h2 className="font-bold text-gray-900 text-sm">Kakestykker ({hjul.leker.length})</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {hjul.leker.map((l) => (
                l.fri
                  ? <span key={l.koblingId} className="text-sm bg-petrol/10 text-petrol px-3 py-1 rounded-full">✎ {l.tittel}</span>
                  : <Link key={l.koblingId} to={`/min-side/aktiviteter/${l.ressursId}`} className="text-sm bg-orange/10 text-orange px-3 py-1 rounded-full hover:bg-orange/20">{l.tittel}</Link>
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

            <HjulKategori verdi={kategoriId} kategorier={kategorier} onEndre={setKategoriId} onNyKategori={nyKategori} />

            <div className="flex flex-wrap gap-6 mt-4">
              <label className="text-xs text-gray-500">Rotasjoner: <span className="text-gray-700 font-medium">{rotasjoner}</span>
                <input type="range" min="3" max="12" value={rotasjoner} onChange={(e) => setRotasjoner(Number(e.target.value))} className="block w-40 mt-1 accent-orange" />
              </label>
              <label className="text-xs text-gray-500">Skriftstørrelse: <span className="text-gray-700 font-medium">{skrift}</span>
                <input type="range" min="10" max="28" value={skrift} onChange={(e) => setSkrift(Number(e.target.value))} className="block w-40 mt-1 accent-orange" />
              </label>
            </div>

            <div className="mt-4">
              <KakestykkeVelger valgte={valgte} onToggleLek={toggleLek} onLeggFri={leggFri} onFjern={fjern} />
            </div>

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
            <Lykkehjul leker={forhandsLeker} rotasjoner={rotasjoner} skriftstorrelse={skrift} kanApneLek={false} kategoriNavn={hjul.kategoriNavn} />
          </div>
        </div>
      )}
    </div>
  )
}
