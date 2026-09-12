import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hentDokumentsideData } from '../../lib/leker'
import { lagKlassifikator, grupperUnderRot, ROT_DRIFT_AV_TL } from '../../lib/dokumentTre'
import DokumentKort from '../../components/DokumentKort'

// «Slik lykkes du med TL» = kuratert håndbok. Fast innholdstekst (ingress + temaer) beholdes;
// dokumentlisten under henter Drift av TL-treet (kilde_tid 901), uten tilleggsmateriale, gruppert
// på underkategori (direkte barn av 901) i tre-rekkefølge. Samme dokumentbank som Maler & materiell.
const TEMAER = [
  { ic: '🚀', key: 'komIgang' },
  { ic: '💬', key: 'voksenrollen' },
  { ic: '🗂️', key: 'organisering' },
  { ic: '⭐', key: 'motivasjon' },
  { ic: '🦺', key: 'trivselspatruljen' },
  { ic: '🗓️', key: 'arshjulet' },
]

export default function SkoleDriftAvTL() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    hentDokumentsideData()
      .then(setData)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [])

  const grupper = useMemo(() => {
    if (!data) return []
    const klass = lagKlassifikator(data.typer)
    const basis = data.dokumenter.filter((d) => !klass.erTillegg(d) && klass.iSubtre(d, ROT_DRIFT_AV_TL))
    return grupperUnderRot(klass, basis, ROT_DRIFT_AV_TL)
  }, [data])

  const antall = useMemo(() => grupper.reduce((s, g) => s + g.dokumenter.length, 0), [grupper])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('skoledok.drift.tittel')}</h1>
      <p className="text-gray-500 text-sm mt-1">{t('skoledok.drift.undertittel')}</p>

      <div className="mt-4 rounded-2xl bg-petrol/5 border border-petrol/15 px-5 py-4">
        <p className="text-petrol/90">{t('skoledok.drift.ingress')}</p>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mt-8">{t('skoledok.drift.detteFinnerDu')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {TEMAER.map((tema) => (
          <div key={tema.key} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <span className="text-xl leading-none mt-0.5" aria-hidden="true">{tema.ic}</span>
            <div>
              <h3 className="font-bold text-gray-900">{t(`skoledok.drift.tema.${tema.key}.navn`)}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t(`skoledok.drift.tema.${tema.key}.tekst`)}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mt-10">{t('skoledok.drift.dokumenter')}</h2>
      <p className="text-sm text-gray-500 mt-1">{t('skoledok.drift.dokumenterUnder')}</p>

      {laster && <p className="text-gray-500 mt-6">{t('skoledok.drift.laster')}</p>}
      {feil && <p className="text-tlred mt-6">{t('skoledok.drift.feil', { feil })}</p>}

      {/* Alltid montert live-region: annonserer antall dokumenter for skjermleser. */}
      <p className="text-sm text-gray-500 mt-4 min-h-[1.25rem]" role="status" aria-live="polite">
        {!laster && !feil && antall > 0 ? t('skoledok.drift.teller', { total: antall }) : ''}
      </p>

      {!laster && !feil && (
        antall === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center text-gray-500 py-12 px-4">
            {t('skoledok.drift.tom')}
          </div>
        ) : (
          <div className="mt-2 space-y-8">
            {grupper.map((g, i) => (
              <section key={g.node ? g.node.kilde_tid : 'ovrig'} aria-labelledby={`drift-gruppe-${i}`}>
                <h3 id={`drift-gruppe-${i}`} className="font-bold text-gray-900 mb-3">
                  {g.node ? g.node.navn : t('skoledok.drift.ovrig')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {g.dokumenter.map((d) => <DokumentKort key={d.id} dok={d} />)}
                </div>
              </section>
            ))}
          </div>
        )
      )}
    </div>
  )
}
