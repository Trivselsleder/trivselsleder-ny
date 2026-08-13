import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { hentLek, hentDokumenter, loggBruk } from '../../lib/leker'

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
  const [lek, setLek] = useState(null)
  const [dok, setDok] = useState([])
  const [feil, setFeil] = useState(null)

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
    return () => { aktiv = false }
  }, [id])

  if (feil)
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">
        Fant ikke leken. <Link className="text-orange" to="/min-side/aktiviteter">← Tilbake til Aktiviteter</Link>
      </div>
    )
  if (!lek) return <div className="max-w-3xl mx-auto px-4 py-12 text-gray-400">Laster …</div>

  const t = lek.tekst
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <Link to="/min-side/aktiviteter" className="text-sm text-orange">← Tilbake til Aktiviteter</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-2">{lek.tittel}</h1>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 text-sm">
        <div><div className="text-gray-400">Sted</div><div className="font-medium capitalize">{lek.sted || '—'}</div></div>
        <div><div className="text-gray-400">Antall</div><div className="font-medium">{lek.antallMin}–{lek.antallMaks}</div></div>
        <div><div className="text-gray-400">Trinn</div><div className="font-medium">{lek.trinn.map((x) => x.navn).join(', ') || '—'}</div></div>
        <div><div className="text-gray-400">Utstyr</div><div className="font-medium">{lek.utstyr.join(', ') || 'Ingen'}</div></div>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {lek.egnet.map((e) => <span key={e} className="text-xs bg-orange/10 text-orange px-2 py-0.5 rounded-full">{e}</span>)}
        {lek.kanLedesAvElever && <span className="text-xs bg-magenta/10 text-magenta px-2 py-0.5 rounded-full">Kan ledes av elever</span>}
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
            <div className="bg-gray-100 text-gray-400 rounded-xl p-6 text-center text-sm">Video kommer</div>
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

      <div className="mt-8 flex flex-wrap gap-2">
        <button disabled className="text-sm bg-gray-100 text-gray-400 px-4 py-2 rounded-full cursor-not-allowed">Legg til i periodeplan (kommer)</button>
        <button disabled className="text-sm bg-gray-100 text-gray-400 px-4 py-2 rounded-full cursor-not-allowed">Legg til i TL-hjul (kommer)</button>
        <button disabled className="text-sm bg-gray-100 text-gray-400 px-4 py-2 rounded-full cursor-not-allowed">Last ned som PDF (kommer)</button>
      </div>
    </div>
  )
}
