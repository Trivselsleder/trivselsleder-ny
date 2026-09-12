import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentSamling } from '../../lib/samlinger'
import { grupperLeker, erGruppert } from '../../lib/samlingForm'
import { beskrivelseTilReact } from '../../lib/beskrivelse'
import LekeKort from '../../components/LekeKort'
import DokumentKort from '../../components/DokumentKort'

// Samlingsvisning for lærere (rute /min-side/samlinger/:id). Tittel + evt. innledning + evt.
// samle-video(er) + lekeliste (LekeKort i rekkefølge) + evt. dokumentliste. Kun visning.
const BUNNY_LIB = '727245' // samme Bunny-bibliotek som LekVisning/Lykkehjul

export default function SkoleSamling() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [samling, setSamling] = useState(null)
  // 'laster' | 'klar' | 'ikkefunnet' | 'feil' — feil skal ALDRI se ut som tom/ikke-funnet.
  const [status, setStatus] = useState('laster')

  // Ny :id uten remount → nullstill til laster under render (Reacts «adjust state on prop change»,
  // samme mønster som SkoleLek), så et gammelt resultat ikke blinker før det nye lastes.
  const [forrigeId, setForrigeId] = useState(id)
  if (id !== forrigeId) {
    setForrigeId(id)
    setStatus('laster')
    setSamling(null)
  }

  useEffect(() => {
    let aktiv = true
    hentSamling(id)
      .then((s) => {
        if (!aktiv) return
        if (!s) { setStatus('ikkefunnet'); return }
        setSamling(s)
        setStatus('klar')
      })
      .catch(() => { if (aktiv) setStatus('feil') })
    return () => { aktiv = false }
  }, [id])

  const brodsmule = (
    <nav className="text-sm" aria-label="Brødsmulesti">
      <Link to="/min-side/aktiviteter" className="text-orange-ink hover:underline">{t('samling.tilbake')}</Link>
      {status === 'klar' && samling?.tittel && (
        <span className="text-gray-500"> <span aria-hidden="true">›</span> <span className="text-gray-700">{samling.tittel}</span></span>
      )}
    </nav>
  )

  // Innledning vises KUN når den ikke er tom (de 20 importerte har beskrivelse = NULL).
  const harBeskrivelse = !!(samling?.beskrivelse && String(samling.beskrivelse).trim())
  const beskrivelse = harBeskrivelse ? beskrivelseTilReact(samling.beskrivelse) : null
  const videoer = (samling?.medier || []).filter((m) => m.type === 'video' && m.bunny_video_id)
  const bilder = (samling?.medier || []).filter((m) => m.type === 'bilde' && m.storage_sti)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      {brodsmule}

      {/* Laster/feil annonseres for skjermleser (aria-live). */}
      <p className="mt-4 min-h-[1.25rem] text-sm text-gray-500" role="status" aria-live="polite">
        {status === 'laster' ? t('samling.laster') : ''}
      </p>

      {status === 'feil' && (
        <div role="alert" className="mt-2 rounded-xl border border-tlred/30 bg-tlred/5 p-4 text-sm text-tlred">
          {t('samling.feil')}
        </div>
      )}

      {status === 'ikkefunnet' && (
        <div className="mt-2 text-gray-600">
          <p className="font-semibold text-gray-800">{t('samling.ikkeFunnet')}</p>
          <p className="text-sm mt-1">{t('samling.ikkeFunnetHjelp')}</p>
          <Link to="/min-side/aktiviteter" className="inline-block mt-3 text-sm font-medium text-orange-ink hover:underline">
            ← {t('samling.tilbake')}
          </Link>
        </div>
      )}

      {status === 'klar' && samling && (
        <div className="mt-3">
          <h1 className="text-3xl font-bold text-gray-900">{samling.tittel}</h1>

          {beskrivelse && (
            <div className="mt-3 text-gray-700 space-y-3">{beskrivelse}</div>
          )}

          {videoer.length > 0 && (
            <div className="mt-5 space-y-4">
              {videoer.map((v, i) => (
                <div key={v.id} className="relative w-full" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${v.bunny_video_id}?preload=false&autoplay=false`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full rounded-xl border-0"
                    allow="accelerometer;gyroscope;encrypted-media;picture-in-picture"
                    allowFullScreen
                    title={videoer.length > 1
                      ? `${samling.tittel} – ${t('samling.video')} ${i + 1}`
                      : `${samling.tittel} – ${t('samling.video')}`}
                  />
                </div>
              ))}
            </div>
          )}

          {bilder.length > 0 && (
            <div className="mt-5 space-y-3">
              {bilder.map((b) => (
                <img
                  key={b.id}
                  src={b.storage_sti}
                  alt={b.alt_tekst || samling.tittel || ''}
                  loading="lazy"
                  className="w-full max-w-2xl rounded-xl border border-gray-100"
                />
              ))}
            </div>
          )}

          {(() => {
            // Grupper (migr 119). Flat samling → én seksjonsløs gruppe (som før). Gruppert →
            // ekte h2 per seksjon (h1 er tittelen), lekene som en <ul>/<li>-liste (WCAG).
            const grupper = grupperLeker(samling.leker, samling.plasseringer)
            if (samling.leker.length === 0) {
              return (
                <section className="mt-8">
                  <h2 className="font-bold text-gray-900">{t('samling.leker')}</h2>
                  <p className="mt-2 text-gray-500">{t('samling.ingenLeker')}</p>
                </section>
              )
            }
            if (!erGruppert(grupper)) {
              return (
                <section className="mt-8">
                  <h2 className="font-bold text-gray-900">{t('samling.leker')}</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3 list-none p-0">
                    {grupper[0].leker.map((l) => <li key={l.id}><LekeKort lek={l} /></li>)}
                  </ul>
                </section>
              )
            }
            return grupper.map((g, i) => (
              <section className="mt-8" key={g.flere ? '_flere' : g.seksjon || i}>
                <h2 className="font-bold text-gray-900">{g.flere ? t('samling.flereLeker') : g.seksjon}</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3 list-none p-0">
                  {g.leker.map((l) => <li key={l.id}><LekeKort lek={l} /></li>)}
                </ul>
              </section>
            ))
          })()}

          {samling.dokumenter.length > 0 && (
            <section className="mt-8">
              <h2 className="font-bold text-gray-900">{t('samling.dokumenter')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                {samling.dokumenter.map((d) => <DokumentKort key={d.id} dok={d} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
