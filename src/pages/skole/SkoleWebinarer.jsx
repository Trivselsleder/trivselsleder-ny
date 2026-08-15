import { useEffect, useState } from 'react'
import { hentKommendeWebinarer } from '../../lib/webinar'
import WebinarKort from '../../components/webinar/WebinarKort'
import PameldingSkjema from '../../components/webinar/PameldingSkjema'

// Intern webinar-flate (innlogget skole). Kommende nettverksmøter/webinarer med
// nedtelling og lukket-men-lav-terskel påmelding. Opptak + referater kommer etter
// lansering (v1.1) — vises som rolige tomtilstander her.
export default function SkoleWebinarer() {
  const [liste, setListe] = useState(null)
  const [feil, setFeil] = useState(null)
  const [valgt, setValgt] = useState(null)     // webinar under påmelding (modal)
  const [paameldte, setPaameldte] = useState({}) // id -> true etter påmelding

  useEffect(() => {
    let aktiv = true
    hentKommendeWebinarer()
      .then((d) => { if (aktiv) setListe(d) })
      .catch((e) => { if (aktiv) { setFeil(e.message); setListe([]) } })
    return () => { aktiv = false }
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Webinarer</h1>
        <p className="text-gray-500 mt-1">Nettverksmøter og webinarer for skolen din. Meld deg på — så får du møtelenke og påminnelse på e-post.</p>
      </header>

      {feil && <p className="text-sm text-red-600 mb-3" role="alert">{feil}</p>}

      {liste === null ? (
        <p className="text-gray-400">Laster …</p>
      ) : liste.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center py-12 px-4">
          <p className="text-gray-600 font-medium">Ingen planlagte webinarer akkurat nå.</p>
          <p className="text-gray-500 text-sm mt-1">Neste nettverksmøte annonseres her — og du får e-post når det er klart.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liste.map((w) => (
            <WebinarKort
              key={w.id}
              webinar={w}
              paameldt={!!paameldte[w.id]}
              onMeldPaa={() => setValgt(w)}
            />
          ))}
        </div>
      )}

      {/* Tomtilstander for det som kommer etter lansering */}
      <div className="grid sm:grid-cols-2 gap-3 mt-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900 text-sm">Opptak</h2>
          <p className="text-sm text-gray-500 mt-1">Opptak fra nettverksmøter ligger her i én uke etter møtet — så slettes de av personvernhensyn. Kommer etter lansering.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900 text-sm">Referater</h2>
          <p className="text-sm text-gray-500 mt-1">Korte, godkjente referater fra gjennomførte webinarer samles her — med lenker til leker og maler som ble nevnt. Kommer etter lansering.</p>
        </div>
      </div>

      {/* Påmeldings-modal */}
      {valgt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setValgt(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-gray-900">{valgt.tittel}</h2>
              <button onClick={() => setValgt(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none" aria-label="Lukk">×</button>
            </div>
            <PameldingSkjema
              webinar={valgt}
              intern
              onFerdig={(res) => { if (res.status === 'ok') setPaameldte((p) => ({ ...p, [valgt.id]: true })) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
