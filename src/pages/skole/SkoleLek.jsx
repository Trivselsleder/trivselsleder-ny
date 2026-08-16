import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { hentLek, hentDokumenter, loggBruk, trinnKort } from '../../lib/leker'
import { erFavoritt, settFavoritt } from '../../lib/favoritter'
import { hentPlaner, leggTilRad } from '../../lib/periodeplan'
import { hentHjul, leggLekTilHjul } from '../../lib/hjul'
import { skrivUtLek } from '../../lib/lekPdf'
import { useAuth } from '../../contexts/AuthContext'
import LekRedigering from '../../components/LekRedigering'

const BUNNY_LIB = '727245'
const PUNKTER = [
  ['forberedelse', 'Forberedelse'],
  ['inndeling', 'Inndeling'],
  ['utgangsposisjon', 'Utgangsposisjon'],
  ['formaal', 'Formålet'],
  ['kronologi', 'Slik gjør dere det'],
  ['regler', 'Regler'],
  ['variasjoner', 'Variasjoner og tilpasninger'],
  ['instruktoernotat', 'Notat til den voksne'],
]

export default function SkoleLek() {
  const { id } = useParams()
  const { bruker } = useAuth()
  const intern = ['superadmin', 'ansatt'].includes(bruker?.rolle)
  const [lek, setLek] = useState(null)
  const [dok, setDok] = useState([])
  const [feil, setFeil] = useState(null)
  const [rediger, setRediger] = useState(false)

  const [fav, setFav] = useState(false)
  const [planer, setPlaner] = useState([])
  const [hjul, setHjul] = useState([])
  const [aapen, setAapen] = useState(null) // 'plan' | 'hjul' | null
  const [melding, setMelding] = useState(null)
  const meldingTimer = useRef(null)

  useEffect(() => {
    let aktiv = true
    hentLek(id)
      .then((l) => {
        if (!aktiv) return
        setLek(l)
        loggBruk('visning', { ressursId: id })
      })
      .catch((e) => aktiv && setFeil(e.message))
    hentDokumenter(id).then((d) => aktiv && setDok(d))
    erFavoritt(id).then((f) => aktiv && setFav(f))
    hentPlaner().then((p) => aktiv && setPlaner(p)).catch(() => {})
    hentHjul().then((h) => aktiv && setHjul(h)).catch(() => {})
    return () => { aktiv = false }
  }, [id])

  function visMelding(tekst) {
    setMelding(tekst)
    setAapen(null)
    if (meldingTimer.current) clearTimeout(meldingTimer.current)
    meldingTimer.current = window.setTimeout(() => setMelding(null), 2800)
  }

  async function toggleFav() {
    const ny = !fav
    setFav(ny)
    try {
      await settFavoritt(id, ny)
    } catch {
      setFav(!ny) // rulle tilbake ved feil
    }
  }

  async function leggIPlan(plan) {
    try {
      await leggTilRad(plan.id, id, plan.rader.length)
      visMelding(`Lagt til i «${plan.navn}»`)
      setPlaner(await hentPlaner())
    } catch (e) {
      visMelding('Kunne ikke legge til: ' + e.message)
    }
  }

  async function leggPaaHjul(h) {
    try {
      const res = await leggLekTilHjul(h.id, id)
      visMelding(res === 'fantes' ? `Ligger allerede på «${h.navn}»` : `Lagt til på «${h.navn}»`)
      setHjul(await hentHjul())
    } catch (e) {
      visMelding('Kunne ikke legge til: ' + e.message)
    }
  }

  if (feil)
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">
        Fant ikke leken. <Link className="text-orange-ink" to="/min-side/aktiviteter">← Tilbake til Finn en lek</Link>
      </div>
    )
  if (!lek) return <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">Laster …</div>

  if (rediger && intern)
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <button onClick={() => setRediger(false)} className="text-sm text-orange-ink">← Tilbake til leken</button>
        <div className="mt-3">
          <LekRedigering
            lek={lek}
            onLagret={async () => { setRediger(false); setLek(await hentLek(id)) }}
            onAvbryt={() => setRediger(false)}
          />
        </div>
      </div>
    )

  const t = lek.tekst
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <Link to="/min-side/aktiviteter" className="text-sm text-orange-ink">← Tilbake til Finn en lek</Link>

      <div className="flex items-start justify-between gap-3 mt-2">
        <h1 className="text-3xl font-bold text-gray-900">{lek.tittel}</h1>
        <button
          onClick={toggleFav}
          aria-label={fav ? 'Fjern favoritt' : 'Legg til favoritt'}
          title={fav ? 'Fjern favoritt' : 'Legg til favoritt'}
          className={`shrink-0 text-2xl leading-none mt-1 transition ${fav ? 'text-tlred' : 'text-gray-300 hover:text-tlred'}`}
        >
          {fav ? '♥' : '♡'}
        </button>
      </div>

      {/* Legg til – fullbredde, som dagens side */}
      <div className="mt-4 space-y-2">
        <button onClick={() => setAapen(aapen === 'plan' ? null : 'plan')}
          className="w-full bg-petrol text-white font-semibold py-3 rounded-xl hover:bg-petrol/90 transition">
          Legg til i periodeplan
        </button>
        <button onClick={() => setAapen(aapen === 'hjul' ? null : 'hjul')}
          className="w-full bg-petrol text-white font-semibold py-3 rounded-xl hover:bg-petrol/90 transition">
          Legg til i TL-hjul
        </button>
        {melding && <p className="text-sm text-petrol">{melding}</p>}

        {aapen === 'plan' && (
          <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Velg periodeplan</p>
            {planer.length === 0 ? (
              <p className="text-sm text-gray-500">Du har ingen planer ennå. <Link to="/min-side/periodeplaner" className="text-orange-ink">Lag en plan →</Link></p>
            ) : (
              <div className="flex flex-col">
                {planer.map((p) => (
                  <button key={p.id} onClick={() => leggIPlan(p)} className="text-left text-sm px-2 py-2 rounded-lg hover:bg-orange/5">
                    {p.navn} <span className="text-gray-500">· {p.rader.length} leker</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {aapen === 'hjul' && (
          <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Velg TL-hjul</p>
            {hjul.length === 0 ? (
              <p className="text-sm text-gray-500">Du har ingen hjul ennå. <Link to="/min-side/tl-hjulet" className="text-orange-ink">Lag et hjul →</Link></p>
            ) : (
              <div className="flex flex-col">
                {hjul.map((h) => (
                  <button key={h.id} onClick={() => leggPaaHjul(h)} className="text-left text-sm px-2 py-2 rounded-lg hover:bg-orange/5">
                    {h.navn} <span className="text-gray-500">· {h.leker.length} leker</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 text-sm">
        <div><div className="text-gray-500">Sted</div><div className="font-medium capitalize">{lek.sted || '—'}</div></div>
        <div><div className="text-gray-500">Antall</div><div className="font-medium">{lek.antallMin}–{lek.antallMaks}</div></div>
        <div><div className="text-gray-500">Trinn</div><div className="font-medium">{trinnKort(lek.trinn)}</div></div>
        <div><div className="text-gray-500">Utstyr</div><div className="font-medium">{lek.utstyr.join(', ') || 'Ingen'}</div></div>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {lek.egnet.map((e) => <span key={e} className="text-xs bg-orange/10 text-orange-ink px-2 py-0.5 rounded-full">{e}</span>)}
        {lek.kanLedesAvElever && <span className="text-xs bg-petrol/10 text-petrol px-2 py-0.5 rounded-full">Kan ledes av elever</span>}
        {lek.sesong.map((s) => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
      </div>

      {lek.video && (
        <div className="mt-5">
          {lek.harVideo ? (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${lek.video.bunny_video_id}?preload=false&autoplay=false`}
                loading="lazy"
                className="absolute inset-0 w-full h-full rounded-xl border-0"
                allow="accelerometer;gyroscope;encrypted-media;picture-in-picture"
                allowFullScreen
                title={lek.tittel}
              />
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-500 rounded-xl p-6 text-center text-sm">Video kommer</div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {PUNKTER.map(([k, label]) =>
          t[k] ? (
            <section key={k}>
              <h2 className="font-bold text-gray-900">{label}</h2>
              <p className="text-gray-700 whitespace-pre-line">{t[k]}</p>
            </section>
          ) : null,
        )}
      </div>

      {dok.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-gray-900 mb-2">Tilleggsmateriale</h2>
          <ul className="space-y-1">
            {dok.map((d) => <li key={d.id} className="text-sm text-gray-700">📄 {d.tittel}</li>)}
          </ul>
        </div>
      )}

      {/* PDF-versjon + rediger */}
      <div className="mt-8 bg-gray-50 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>📄</span>
          <div>
            <p className="font-bold text-gray-900">PDF-versjon</p>
            <button onClick={() => skrivUtLek(lek)} className="text-sm text-orange-ink hover:underline">Last ned som PDF</button>
          </div>
        </div>
        {intern && (
          <button onClick={() => setRediger(true)} className="text-sm bg-petrol text-white px-4 py-2 rounded-full hover:bg-petrol/90 transition shrink-0">
            Rediger lek
          </button>
        )}
      </div>
    </div>
  )
}
