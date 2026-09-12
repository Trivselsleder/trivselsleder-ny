import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentAktivLaering, hentFagListe, hentTrinnListe, hentDokumentsideData, TRINN_NO } from '../../lib/leker'
import { hentMineFavoritter } from '../../lib/favoritter'
import { lagKlassifikator, grupperUnderRot, ROT_AKTIV_LAERING } from '../../lib/dokumentTre'
import LekeKort from '../../components/LekeKort'
import DokumentKort from '../../components/DokumentKort'

// Kanonisk FALLBACK-fagliste (LK20). Etappe 7 D1: fag hentes nå fra basen (hentFagListe) og
// overskriver denne ved sidelast; den beholdes som umiddelbar visning + trygt fall om lesingen
// feiler. Fag-koblingen på oppleggene fylles ved innholdsimporten; til da gir valg av fag 0 treff.
const FAG = [
  'Norsk', 'Matematikk', 'Engelsk', 'Naturfag', 'Samfunnsfag', 'KRLE',
  'Kroppsøving', 'Musikk', 'Kunst og håndverk', 'Mat og helse',
  'Bevegelse og kroppslig læring', 'Deltakelse og samspill',
]

export default function SkoleAktivLaering() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const vis = params.get('vis') === 'materiell' ? 'materiell' : 'opplegg'

  const [alle, setAlle] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [sok, setSok] = useState('')
  const [fFag, setFFag] = useState('')
  const [fTrinn, setFTrinn] = useState('')
  const [kunVideo, setKunVideo] = useState(false)
  const [favoritter, setFavoritter] = useState(new Set())
  // Datadrevet fag + trinn (etappe 7 D1) — init med kanonisk fallback, overskrives av basen.
  const [fagBase, setFagBase] = useState(FAG)
  const [trinnBase, setTrinnBase] = useState(TRINN_NO)
  // Materiell-visningen (frittstående Aktiv læring-dokumenter under kilde_tid 2).
  const [doks, setDoks] = useState(null)
  const [doksFeil, setDoksFeil] = useState(null)
  const [sokMat, setSokMat] = useState('')
  const location = useLocation()

  useEffect(() => {
    hentAktivLaering()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
    hentMineFavoritter().then(setFavoritter).catch(() => {})
    hentFagListe().then((l) => l.length && setFagBase(l)).catch(() => {})
    hentTrinnListe('NO').then((l) => l.length && setTrinnBase(l)).catch(() => {})
    hentDokumentsideData().then(setDoks).catch((e) => setDoksFeil(e.message))
  }, [])

  // Fane-re-klikk (RESTER-ETAPPE3-bug): Aktiv læring har ingen opplegg-filter i adressen, så
  // en ny navigasjon til fanen remonterer ikke og filtrene ble stående. Vi nullstiller når
  // rute-navigasjonen endrer seg (location.key) — og trygt ved montering (alt er da default).
  useEffect(() => { nullstill() }, [location.key])

  const valg = useMemo(() => {
    const tr = new Map()
    const dataFag = new Set()
    alle.forEach((l) => {
      l.trinn.forEach((x) => tr.set(x.kode, x.navn))
      ;(l.fag || []).forEach((f) => dataFag.add(f))
    })
    const fag = [...fagBase, ...[...dataFag].filter((f) => !fagBase.includes(f))]
    // Aktiv læring følger LK20 (1.–10. trinn) — basens trinnliste, uten barnehage.
    const kanon = trinnBase.filter(([k]) => k !== 'bhg')
    const kanonKoder = new Set(kanon.map(([k]) => k))
    const trinn = [...kanon, ...[...tr.entries()].filter(([k]) => !kanonKoder.has(k))]
    return { trinn, fag }
  }, [alle, fagBase, trinnBase])

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alle.filter((l) => {
      if (q && !(`${l.tittel || ''} ${l.tekst.formaal || ''}`.toLowerCase().includes(q))) return false
      if (fFag && !(l.fag || []).includes(fFag)) return false
      if (fTrinn && !l.trinn.some((tt) => tt.kode === fTrinn)) return false
      if (kunVideo && !l.harVideo) return false
      return true
    })
  }, [alle, sok, fFag, fTrinn, kunVideo])

  // Materiell: dokumenter i Aktiv læring-treet (2), gruppert på Kurshefter/Informasjon/Manualer/Aball.
  const matGrupper = useMemo(() => {
    if (!doks) return []
    const klass = lagKlassifikator(doks.typer)
    const q = sokMat.trim().toLowerCase()
    // Tillegg (910/924) vises KUN under leken — ekskluderes også her (låst beslutning).
    const basis = doks.dokumenter.filter(
      (d) => klass.iAktivLaering(d) && !klass.erTillegg(d) && (!q || (d.tittel || '').toLowerCase().includes(q)),
    )
    return grupperUnderRot(klass, basis, ROT_AKTIV_LAERING)
  }, [doks, sokMat])
  const matAntall = useMemo(() => matGrupper.reduce((s, g) => s + g.dokumenter.length, 0), [matGrupper])

  function nullstill() {
    setSok(''); setFFag(''); setFTrinn(''); setKunVideo(false)
  }
  function velgVis(v) {
    setParams((p) => { const n = new URLSearchParams(p); v === 'materiell' ? n.set('vis', 'materiell') : n.delete('vis'); return n }, { replace: true })
  }

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange'
  const visKnapp = (aktiv) =>
    `text-sm font-semibold px-4 py-2 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-orange/50 ${
      aktiv ? 'bg-petrol text-white border-petrol' : 'bg-white text-petrol border-petrol/40 hover:border-petrol'
    }`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('skoledok.aktiv.tittel')}</h1>
      <p className="text-gray-500 text-sm mt-1">{t('skoledok.aktiv.undertittel')}</p>

      {/* Visningsvalg: Opplegg (dagens innhold) eller Materiell (frittstående dokumenter). */}
      <div className="mt-4 flex gap-2" role="group" aria-label={t('skoledok.aktiv.visLabel')}>
        <button type="button" className={visKnapp(vis === 'opplegg')} aria-pressed={vis === 'opplegg'} onClick={() => velgVis('opplegg')}>
          {t('skoledok.aktiv.visOpplegg')}
        </button>
        <button type="button" className={visKnapp(vis === 'materiell')} aria-pressed={vis === 'materiell'} onClick={() => velgVis('materiell')}>
          {t('skoledok.aktiv.visMateriell')}
        </button>
      </div>

      {vis === 'opplegg' ? (
        <>
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-petrol/5 border border-petrol/15 px-4 py-3">
            <span className="text-petrol text-lg leading-none mt-0.5" aria-hidden="true">📚</span>
            <p className="text-sm text-petrol/90">{t('skoledok.aktiv.ingress')}</p>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              placeholder={t('skoledok.aktiv.sokOpplegg')}
              aria-label={t('skoledok.aktiv.sokOpplegg')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <select className={selCls} aria-label={t('skoledok.aktiv.fag')} value={fFag} onChange={(e) => setFFag(e.target.value)}>
              <option value="">{t('skoledok.aktiv.fagAlle')}</option>
              {valg.fag.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className={selCls} aria-label={t('skoledok.aktiv.trinn')} value={fTrinn} onChange={(e) => setFTrinn(e.target.value)}>
              <option value="">{t('skoledok.aktiv.trinnAlle')}</option>
              {valg.trinn.map(([kode, navn]) => <option key={kode} value={kode}>{navn}</option>)}
            </select>
            <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
              <input type="checkbox" checked={kunVideo} onChange={(e) => setKunVideo(e.target.checked)} />
              <span className="text-orange-ink" aria-hidden="true">▶</span> {t('skoledok.aktiv.medVideo')}
            </label>
            <button onClick={nullstill} className="text-sm text-gray-500 hover:text-orange-ink px-2">{t('skoledok.aktiv.nullstill')}</button>
          </div>

          {laster && <p className="text-gray-400 mt-8">{t('skoledok.aktiv.laster')}</p>}
          {feil && <p className="text-tlred mt-8">{t('skoledok.aktiv.feil', { feil })}</p>}

          <p className="text-sm text-gray-500 mt-5 min-h-[1.25rem]" role="status" aria-live="polite">
            {!laster && !feil && alle.length > 0 ? t('skoledok.aktiv.tellerOpplegg', { vist: treff.length, total: alle.length }) : ''}
          </p>

          {!laster && !feil && (
            alle.length === 0 ? (
              <div className="text-center text-gray-500 py-16">{t('skoledok.aktiv.tomOpplegg')}</div>
            ) : treff.length === 0 ? (
              <div className="text-center text-gray-500 py-16">{t('skoledok.aktiv.ingenTreffOpplegg')}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {treff.map((l) => <LekeKort key={l.id} lek={l} favoritt={favoritter.has(l.id)} />)}
              </div>
            )
          )}
        </>
      ) : (
        <>
          <div className="mt-4">
            <input
              type="text"
              value={sokMat}
              onChange={(e) => setSokMat(e.target.value)}
              placeholder={t('skoledok.aktiv.sokMateriell')}
              aria-label={t('skoledok.aktiv.sokMateriell')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange"
            />
          </div>

          {!doks && !doksFeil && <p className="text-gray-400 mt-8">{t('skoledok.aktiv.lasterMateriell')}</p>}
          {doksFeil && <p className="text-tlred mt-8">{t('skoledok.aktiv.feil', { feil: doksFeil })}</p>}

          <p className="text-sm text-gray-500 mt-5 min-h-[1.25rem]" role="status" aria-live="polite">
            {doks && !doksFeil && matAntall > 0 ? t('skoledok.aktiv.tellerMateriell', { total: matAntall }) : ''}
          </p>

          {doks && !doksFeil && (
            matAntall === 0 ? (
              <div className="text-center text-gray-500 py-16">{t('skoledok.aktiv.tomMateriell')}</div>
            ) : (
              <div className="mt-2 space-y-8">
                {matGrupper.map((g, i) => (
                  <section key={g.node ? g.node.kilde_tid : 'ovrig'} aria-labelledby={`mat-gruppe-${i}`}>
                    <h2 id={`mat-gruppe-${i}`} className="text-lg font-bold text-gray-900 mb-3">
                      {g.node ? g.node.navn : t('skoledok.aktiv.ovrig')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {g.dokumenter.map((d) => <DokumentKort key={d.id} dok={d} />)}
                    </div>
                  </section>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
