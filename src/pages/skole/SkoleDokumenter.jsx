import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentDokumentsideData } from '../../lib/leker'
import {
  lagKlassifikator, malerOgMateriell, hovedkategorier, underkategorier, iValgtKategori,
} from '../../lib/dokumentTre'
import DokumentKort from '../../components/DokumentKort'

// «Maler & materiell»: alle publiserte dokumenter som IKKE er tilleggsmateriale til leker (910/924)
// og som har minst én kategori utenfor Aktiv læring-treet (2). Kategorifilteret bygges av
// dokument_type-treet (ikke lenger filendelse). Filtervalg ligger i URL (samme mønster som «Finn en
// lek»): hovedkategori (kilde_tid) i ?hoved, underkategori i ?under, fritekst i ?sok.
export default function SkoleDokumenter() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const sok = params.get('sok') || ''
  const hoved = params.get('hoved') ? Number(params.get('hoved')) : null
  const under = params.get('under') ? Number(params.get('under')) : null

  const [data, setData] = useState(null) // { dokumenter, typer }
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    hentDokumentsideData()
      .then(setData)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [])

  const klass = useMemo(() => (data ? lagKlassifikator(data.typer) : null), [data])
  const basis = useMemo(() => (klass ? malerOgMateriell(klass, data.dokumenter) : []), [klass, data])
  const hovedListe = useMemo(() => (klass ? hovedkategorier(klass, basis) : []), [klass, basis])
  const underListe = useMemo(
    () => (klass && hoved != null ? underkategorier(klass, basis, hoved) : []),
    [klass, basis, hoved],
  )

  // Effektiv kategori = underkategori hvis valgt, ellers hovedkategori. Valg viser den + alle etterkommere.
  const valgtKildeTid = under ?? hoved ?? null

  const treff = useMemo(() => {
    if (!klass) return []
    const q = sok.trim().toLowerCase()
    const iKat = iValgtKategori(klass, basis, valgtKildeTid)
    return iKat.filter((d) => !q || (d.tittel || '').toLowerCase().includes(q))
  }, [klass, basis, valgtKildeTid, sok])

  function settParam(endring) {
    setParams((p) => {
      const n = new URLSearchParams(p)
      for (const [k, v] of Object.entries(endring)) v ? n.set(k, String(v)) : n.delete(k)
      return n
    }, { replace: true })
  }
  function velgHoved(kildeTid) {
    settParam({ hoved: hoved === kildeTid ? '' : kildeTid, under: '' })
  }
  function velgUnder(kildeTid) {
    settParam({ under: under === kildeTid ? '' : kildeTid })
  }

  const chip = (aktiv) =>
    `text-sm rounded-full px-3 py-1.5 border transition-colors focus:outline-none focus:ring-2 focus:ring-orange/50 ${
      aktiv ? 'bg-orange text-gray-900 border-orange' : 'bg-white text-gray-700 border-gray-300 hover:border-orange hover:text-orange-ink'
    }`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('skoledok.maler.tittel')}</h1>
      <p className="text-gray-500 text-sm mt-1">{t('skoledok.maler.undertittel')}</p>

      <div className="mt-4">
        <input
          type="text"
          value={sok}
          onChange={(e) => settParam({ sok: e.target.value })}
          placeholder={t('skoledok.maler.sokPlassholder')}
          aria-label={t('skoledok.maler.sokLabel')}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/40"
        />
      </div>

      {!laster && !feil && hovedListe.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2" id="dok-kategori-hoved">
            {t('skoledok.maler.kategori')}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="dok-kategori-hoved">
            <button type="button" className={chip(hoved == null)} aria-pressed={hoved == null} onClick={() => settParam({ hoved: '', under: '' })}>
              {t('skoledok.alle')}
            </button>
            {hovedListe.map((h) => (
              <button key={h.kilde_tid} type="button" className={chip(hoved === h.kilde_tid)} aria-pressed={hoved === h.kilde_tid} onClick={() => velgHoved(h.kilde_tid)}>
                {h.navn}
              </button>
            ))}
          </div>

          {underListe.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 pl-1 border-l-2 border-orange/30" role="group" aria-label={t('skoledok.maler.underkategori')}>
              {underListe.map((u) => (
                <button key={u.kilde_tid} type="button" className={chip(under === u.kilde_tid)} aria-pressed={under === u.kilde_tid} onClick={() => velgUnder(u.kilde_tid)}>
                  {u.navn}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {laster && <p className="text-gray-500 mt-8">{t('skoledok.maler.laster')}</p>}
      {feil && <p className="text-tlred mt-8">{t('skoledok.maler.feil', { feil })}</p>}

      {/* Alltid montert live-region: annonserer antall treff for skjermleser. */}
      <p className="text-sm text-gray-500 mt-6 min-h-[1.25rem]" role="status" aria-live="polite">
        {!laster && !feil && basis.length > 0 ? t('skoledok.maler.teller', { vist: treff.length, total: basis.length }) : ''}
      </p>

      {!laster && !feil && (
        basis.length === 0 ? (
          <div className="text-center text-gray-500 py-16">{t('skoledok.maler.tom')}</div>
        ) : treff.length === 0 ? (
          <div className="text-center text-gray-500 py-16">{t('skoledok.maler.ingenTreff')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {treff.map((d) => <DokumentKort key={d.id} dok={d} />)}
          </div>
        )
      )}
    </div>
  )
}
