import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hentHjul, opprettHjul, kopierHjul, flyttHjul, hentKategorier, opprettKategori } from '../../lib/hjul'
import KakestykkeVelger from '../../components/KakestykkeVelger'
import HjulKategori from '../../components/HjulKategori'
import Lykkehjul from '../../components/Lykkehjul'

export default function SkoleTLhjulet() {
  const [hjul, setHjul] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [nytt, setNytt] = useState(false)
  const [navn, setNavn] = useState('')
  const [rotasjoner, setRotasjoner] = useState(6)
  const [skrift, setSkrift] = useState(20)
  const [kategoriId, setKategoriId] = useState(null)
  const [kategorier, setKategorier] = useState([])
  const [valgte, setValgte] = useState([]) // {kind,id?,tittel,key}
  const [lagrer, setLagrer] = useState(false)
  const [sortering, setSortering] = useState('egen')
  const friTeller = useRef(0)
  const navigate = useNavigate()

  function last() {
    setLaster(true)
    hentHjul().then(setHjul).catch((e) => setFeil(e.message)).finally(() => setLaster(false))
  }
  useEffect(last, [])
  useEffect(() => { hentKategorier().then(setKategorier).catch(() => {}) }, [])

  const sortert = useMemo(() => {
    const h = [...hjul]
    if (sortering === 'navn') h.sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb'))
    else if (sortering === 'nyeste') h.sort((a, b) => (b.id).localeCompare(a.id))
    // 'egen' = server-rekkefølge (sortering, deretter dato)
    return h
  }, [hjul, sortering])

  function toggleLek(lek) {
    setValgte((v) =>
      v.some((x) => x.kind === 'lek' && x.id === lek.id)
        ? v.filter((x) => !(x.kind === 'lek' && x.id === lek.id))
        : [...v, { kind: 'lek', id: lek.id, tittel: lek.tittel, key: 'lek-' + lek.id }]
    )
  }
  function leggFri(tekst) {
    friTeller.current += 1
    setValgte((v) => [...v, { kind: 'fri', tittel: tekst, key: 'fri-' + friTeller.current }])
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

  async function lagHjul() {
    if (!navn.trim() || valgte.length === 0 || lagrer) return
    setLagrer(true)
    try {
      const id = await opprettHjul({ navn: navn.trim(), segmenter, rotasjoner, skriftstorrelse: skrift, kategoriId })
      navigate(`/min-side/tl-hjulet/${id}`)
    } catch (e) { setFeil(e.message); setLagrer(false) }
  }

  async function kopier(h) {
    try {
      const id = await kopierHjul(h.id, `${h.navn} (kopi)`)
      navigate(`/min-side/tl-hjulet/${id}`)
    } catch (e) { setFeil(e.message) }
  }

  async function flytt(h, retning) {
    try { await flyttHjul(sortert, h.id, retning); last() } catch (e) { setFeil(e.message) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TL-hjulet</h1>
          <p className="text-gray-500 text-sm mt-1">Lag hjul med leker eller fri tekst (klasseliste, trivselsutfordringer, personalet …) og la elevene snurre.</p>
        </div>
        {!nytt && (
          <button onClick={() => setNytt(true)} className="shrink-0 bg-orange text-gray-900 font-medium px-5 py-2.5 rounded-full hover:bg-orange/90 transition">+ Nytt hjul</button>
        )}
      </div>

      {feil && <p className="text-red-500 mt-4">{feil}</p>}

      {nytt && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-bold text-gray-900">Nytt hjul</h2>
            <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn (f.eks. «Uteleker uke 40»)"
              className="mt-3 w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange" />

            <HjulKategori verdi={kategoriId} kategorier={kategorier} onEndre={setKategoriId} onNyKategori={nyKategori} />

            <div className="flex flex-wrap gap-6 mt-4">
              <label className="text-xs text-gray-500">Rotasjoner: <span className="text-gray-700 font-medium">{rotasjoner}</span>
                <input type="range" min="3" max="12" value={rotasjoner} onChange={(e) => setRotasjoner(Number(e.target.value))} className="block w-40 mt-1 accent-orange" />
              </label>
              <label className="text-xs text-gray-500">Skriftstørrelse: <span className="text-gray-700 font-medium">{skrift}</span>
                <input type="range" min="8" max="28" value={skrift} onChange={(e) => setSkrift(Number(e.target.value))} className="block w-40 mt-1 accent-orange" />
              </label>
            </div>

            <div className="mt-4">
              <KakestykkeVelger valgte={valgte} onToggleLek={toggleLek} onLeggFri={leggFri} onFjern={fjern} />
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={lagHjul} disabled={!navn.trim() || valgte.length === 0 || lagrer}
                className="bg-orange text-gray-900 font-medium px-6 py-2.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50">
                {lagrer ? 'Lagrer …' : 'Lag hjul'}
              </button>
              <button onClick={() => { setNytt(false); setNavn(''); setValgte([]); setKategoriId(null) }} className="text-gray-500 hover:text-gray-700 px-4">Avbryt</button>
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
            <option value="egen">Egen rekkefølge</option>
            <option value="nyeste">Nyeste</option>
            <option value="navn">Navn</option>
          </select>
        </label>
      </div>

      {laster && <p className="text-gray-400 mt-4">Laster …</p>}
      {!laster && sortert.length === 0 && <p className="text-gray-400 mt-4">Du har ingen hjul ennå. Trykk «+ Nytt hjul».</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {sortert.map((h, i) => (
          <div key={h.id} className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition p-5">
            <Link to={`/min-side/tl-hjulet/${h.id}`} className="block">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 hover:text-orange-ink">{h.navn}</h3>
                {h.kategoriNavn && <span className="text-[11px] bg-petrol/10 text-petrol px-2 py-0.5 rounded-full">{h.kategoriNavn}</span>}
              </div>
              <p className="text-sm text-gray-400 mt-1">{h.leker.length} kakestykker</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {h.leker.slice(0, 4).map((l) => (
                  <span key={l.koblingId} className={`text-xs px-2 py-0.5 rounded-full ${l.fri ? 'bg-petrol/10 text-petrol' : 'bg-orange/10 text-orange-ink'}`}>{l.tittel}</span>
                ))}
                {h.leker.length > 4 && <span className="text-xs text-gray-400 px-1">+{h.leker.length - 4}</span>}
              </div>
            </Link>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => kopier(h)} className="text-xs text-gray-500 hover:text-orange-ink">Kopier</button>
              {sortering === 'egen' && (
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => flytt(h, -1)} disabled={i === 0} className="text-gray-400 hover:text-orange-ink disabled:opacity-30 px-1" aria-label="Flytt opp">↑</button>
                  <button onClick={() => flytt(h, 1)} disabled={i === sortert.length - 1} className="text-gray-400 hover:text-orange-ink disabled:opacity-30 px-1" aria-label="Flytt ned">↓</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
