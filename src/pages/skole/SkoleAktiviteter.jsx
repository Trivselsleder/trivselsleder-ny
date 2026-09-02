import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sokLeker, hentUtstyrListe, loggBruk, TRINN_NO, SESONGER } from '../../lib/leker'
import { hentMineFavoritter } from '../../lib/favoritter'
import LekeKort from '../../components/LekeKort'

// «Last mer» henter 50 om gangen (besluttet av Kjartan — ikke sidetall, ikke uendelig rulling).
const SIDE = 50

// Kanoniske filter-lister. MERK: dette er IKKE UI-tekst som skal oversettes — det er
// verdier som må matche databasens taksonomi (egnet_kategori.navn, trinn.kode osv.),
// fordi de sendes som filterverdi til søke-RPC-en. Svensk innhold oversettes i
// dataimporten, ikke her. Trinn/sesong kommer fra leker.js (samme kilde som før).
const EGNET = [
  'Friminutt', 'Kroppsøving', 'SFO/AKS', 'Aktiv læring', 'Move it', 'FYSAK',
  'Bli kjent / klassemiljø', 'Aktivitetsdager', 'Sosial kompetanse', 'TL-Mester',
  'Leker for 100+ elever', 'Barnehage',
]
const SAMLINGER = ['Favoritter', 'Månedens leker', 'Lekekurs', 'Utfordringer', 'Move it', 'Kropp og hjerne']
const SKOLETYPE = ['Barnehage', 'Barnetrinn', 'Ungdomstrinn', 'Kombinert', 'SFO']

export default function SkoleAktiviteter() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()

  // Filtertilstand
  const [sok, setSok] = useState('')
  const [fEgnet, setFEgnet] = useState('')
  const [fTrinn, setFTrinn] = useState('')
  const [fSted, setFSted] = useState('')
  const [fUtstyr, setFUtstyr] = useState('')
  const [utenUtstyr, setUtenUtstyr] = useState(false)
  const [fSesong, setFSesong] = useState('')
  const [kunVideo, setKunVideo] = useState(false)
  const [kunFav, setKunFav] = useState(false)
  const [blaApen, setBlaApen] = useState(false)

  // Resultat + status
  const [leker, setLeker] = useState([])
  const [totalt, setTotalt] = useState(0)
  const [laster, setLaster] = useState(true)
  const [lasterMer, setLasterMer] = useState(false)
  const [feil, setFeil] = useState(null)
  const [favoritter, setFavoritter] = useState(new Set())
  const [utstyrListe, setUtstyrListe] = useState([])
  const [klar, setKlar] = useState(false) // URL lest → søk kan starte

  const soekeRef = useRef(0)       // race-vakt: kun ferskeste svar teller
  const sistLoggetRef = useRef('') // logg søk per distinkt søketekst, ikke per filterklikk

  // 1) Les filtertilstand FRA adressen ved innlasting (én gang).
  useEffect(() => {
    if (params.get('fav') === '1') setKunFav(true)
    if (params.get('video') === '1') setKunVideo(true)
    if (params.get('utenutstyr') === '1') setUtenUtstyr(true)
    const sk = params.get('sok'); if (sk) setSok(sk)
    const eg = params.get('egnet'); if (eg) setFEgnet(eg)
    const tr = params.get('trinn'); if (tr) setFTrinn(tr)
    const st = params.get('sted'); if (st) setFSted(st)
    const us = params.get('utstyr'); if (us) setFUtstyr(us)
    const se = params.get('sesong'); if (se) setFSesong(se)
    if (params.get('bla') === '1') setBlaApen(true)
    hentMineFavoritter().then(setFavoritter).catch(() => {})
    hentUtstyrListe().then(setUtstyrListe).catch(() => {})
    setKlar(true)
    // Kun ved montering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtre = useMemo(() => ({
    sok, egnet: fEgnet, trinn: fTrinn, sted: fSted, utstyr: fUtstyr,
    utenUtstyr, sesong: fSesong, kunVideo, kunFav,
  }), [sok, fEgnet, fTrinn, fSted, fUtstyr, utenUtstyr, fSesong, kunVideo, kunFav])

  const filterNokkel = JSON.stringify({ ...filtre, sok: sok.trim() })

  // 2) SKRIV filtertilstand tilbake til adressen (så et søk kan limes inn i ny fane).
  useEffect(() => {
    if (!klar) return
    const p = {}
    if (sok.trim()) p.sok = sok.trim()
    if (fEgnet) p.egnet = fEgnet
    if (fTrinn) p.trinn = fTrinn
    if (fSted) p.sted = fSted
    if (fUtstyr) p.utstyr = fUtstyr
    if (fSesong) p.sesong = fSesong
    if (utenUtstyr) p.utenutstyr = '1'
    if (kunVideo) p.video = '1'
    if (kunFav) p.fav = '1'
    if (blaApen) p.bla = '1'
    setParams(p, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterNokkel, blaApen, klar])

  // 3) FERSKT SØK (server-side, debounced) ved endret filter/søketekst — nullstiller lista.
  useEffect(() => {
    if (!klar) return
    let avbrutt = false
    const id = ++soekeRef.current
    const timer = setTimeout(() => {
      setLaster(true)
      setFeil(null)
      sokLeker({ ...filtre, offset: 0, limit: SIDE })
        .then(({ leker: rader, totalt: sum }) => {
          if (avbrutt || id !== soekeRef.current) return
          setLeker(rader)
          setTotalt(sum)
          const q = sok.trim()
          // treff_antall logges (0 = null-treff — grunnlag for «hva mangler»).
          if (q && q !== sistLoggetRef.current) {
            sistLoggetRef.current = q
            loggBruk('sok', { sokTekst: q, treffAntall: sum })
          } else if (!q) {
            sistLoggetRef.current = ''
          }
        })
        .catch((e) => { if (!avbrutt && id === soekeRef.current) setFeil(e.message) })
        .finally(() => { if (!avbrutt && id === soekeRef.current) setLaster(false) })
    }, 400)
    return () => { avbrutt = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterNokkel, klar])

  // 4) «Last mer» — henter neste 50 og legger til (uten å nullstille lista).
  function lastMer() {
    if (lasterMer) return
    const id = soekeRef.current
    setLasterMer(true)
    sokLeker({ ...filtre, offset: leker.length, limit: SIDE })
      .then(({ leker: nye, totalt: sum }) => {
        if (id !== soekeRef.current) return // filtrene endret seg imens
        setLeker((prev) => [...prev, ...nye])
        setTotalt(sum)
      })
      .catch((e) => setFeil(e.message))
      .finally(() => setLasterMer(false))
  }

  function nullstill() {
    setSok(''); setFEgnet(''); setFTrinn(''); setFSted(''); setFUtstyr('')
    setUtenUtstyr(false); setFSesong(''); setKunVideo(false); setKunFav(false)
  }
  const bytt = (naa, ny, sett) => sett(naa === ny ? '' : ny)

  const harFilter = !!(sok.trim() || fEgnet || fTrinn || fSted || fUtstyr || utenUtstyr || fSesong || kunVideo || kunFav)
  const rest = Math.max(0, totalt - leker.length)

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/40'
  const chip = (aktiv) =>
    `text-sm rounded-full px-3 py-1.5 border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange/50 ${
      aktiv ? 'bg-orange text-gray-900 border-orange' : 'bg-white text-gray-700 border-gray-300 hover:border-orange hover:text-orange-ink'
    }`
  const chipKommer = 'text-sm rounded-full px-3 py-1.5 border border-dashed border-gray-200 text-gray-400 bg-gray-50 cursor-default'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('aktiviteter.tittel')}</h1>
      <p className="text-gray-500 text-sm mt-1">{t('aktiviteter.undertittel')}</p>

      <div className="mt-4">
        <input
          type="text"
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder={t('aktiviteter.sokPlassholder')}
          aria-label={t('aktiviteter.sokLabel')}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/40"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <select className={selCls} aria-label={t('aktiviteter.grEgnet')} value={fEgnet} onChange={(e) => setFEgnet(e.target.value)}>
          <option value="">{t('aktiviteter.egnetAlle')}</option>
          {EGNET.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} aria-label={t('aktiviteter.grTrinn')} value={fTrinn} onChange={(e) => setFTrinn(e.target.value)}>
          <option value="">{t('aktiviteter.trinnAlle')}</option>
          {TRINN_NO.map(([kode, navn]) => <option key={kode} value={kode}>{navn}</option>)}
        </select>
        <select className={selCls} aria-label={t('aktiviteter.grSted')} value={fSted} onChange={(e) => setFSted(e.target.value)}>
          <option value="">{t('aktiviteter.stedAlle')}</option>
          <option value="inne">{t('aktiviteter.stedInne')}</option>
          <option value="ute">{t('aktiviteter.stedUte')}</option>
        </select>
        <select className={selCls} aria-label={t('aktiviteter.grUtstyr')} value={fUtstyr} onChange={(e) => setFUtstyr(e.target.value)}>
          <option value="">{t('aktiviteter.utstyrAlle')}</option>
          {utstyrListe.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} aria-label={t('aktiviteter.grSesong')} value={fSesong} onChange={(e) => setFSesong(e.target.value)}>
          <option value="">{t('aktiviteter.sesongAlle')}</option>
          {SESONGER.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={utenUtstyr} onChange={(e) => setUtenUtstyr(e.target.checked)} />
          {t('aktiviteter.utenUtstyr')}
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={kunVideo} onChange={(e) => setKunVideo(e.target.checked)} />
          <span className="text-orange-ink" aria-hidden="true">▶</span> {t('aktiviteter.medVideo')}
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={kunFav} onChange={(e) => setKunFav(e.target.checked)} />
          <span className="text-tlred" aria-hidden="true">♥</span> {t('aktiviteter.kunFavoritter')}
        </label>
        <button onClick={nullstill} className="text-sm text-gray-500 hover:text-orange-ink px-2 rounded focus:outline-none focus:ring-2 focus:ring-orange/50">
          {t('aktiviteter.nullstill')}
        </button>
      </div>

      {/* Bla i kategorier — hele taksonomien synlig, gruppert, klikkbar. Lukket som standard. */}
      <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setBlaApen((v) => !v)}
          aria-expanded={blaApen}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange/50"
        >
          <span className={`text-[11px] transition-transform ${blaApen ? 'rotate-90' : ''}`} aria-hidden="true">▶</span>
          {t('aktiviteter.blaTittel')}
          <span className="font-normal text-gray-400">{t('aktiviteter.blaUnder')}</span>
        </button>

        {blaApen && (
          <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
            <Gruppe tittel={t('aktiviteter.grEgnet')}>
              {EGNET.map((x) => (
                <button key={x} className={chip(fEgnet === x)} onClick={() => bytt(fEgnet, x, setFEgnet)}>{x}</button>
              ))}
            </Gruppe>

            <Gruppe tittel={t('aktiviteter.grTrinn')}>
              {TRINN_NO.map(([kode, navn]) => (
                <button key={kode} className={chip(fTrinn === kode)} onClick={() => bytt(fTrinn, kode, setFTrinn)}>{navn}</button>
              ))}
            </Gruppe>

            <Gruppe tittel={t('aktiviteter.grSted')}>
              <button className={chip(fSted === 'inne')} onClick={() => bytt(fSted, 'inne', setFSted)}>{t('aktiviteter.stedInne')}</button>
              <button className={chip(fSted === 'ute')} onClick={() => bytt(fSted, 'ute', setFSted)}>{t('aktiviteter.stedUte')}</button>
            </Gruppe>

            {utstyrListe.length > 0 && (
              <Gruppe tittel={t('aktiviteter.grUtstyr')}>
                <button className={chip(utenUtstyr)} onClick={() => setUtenUtstyr((v) => !v)}>{t('aktiviteter.utenUtstyr')}</button>
                {utstyrListe.map((x) => (
                  <button key={x} className={chip(fUtstyr === x)} onClick={() => bytt(fUtstyr, x, setFUtstyr)}>{x}</button>
                ))}
              </Gruppe>
            )}

            <Gruppe tittel={t('aktiviteter.grSesong')}>
              {SESONGER.map((x) => (
                <button key={x} className={chip(fSesong === x)} onClick={() => bytt(fSesong, x, setFSesong)}>{x}</button>
              ))}
            </Gruppe>

            <Gruppe tittel={t('aktiviteter.grSamlinger')}>
              <button className={chip(kunFav)} onClick={() => setKunFav((v) => !v)}>{SAMLINGER[0]}</button>
              {SAMLINGER.slice(1).map((s) => (
                <span key={s} className={chipKommer} title={t('aktiviteter.kommerTittel')}>{s}</span>
              ))}
            </Gruppe>

            <Gruppe tittel={t('aktiviteter.grSkoletype')}>
              {SKOLETYPE.map((s) => (
                <span key={s} className={chipKommer} title={t('aktiviteter.kommerTittel')}>{s}</span>
              ))}
            </Gruppe>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('aktiviteter.grAktivitetstype')}</div>
              <p className="text-sm text-gray-500">{t('aktiviteter.aktivitetstypeEks')} <span className="italic">{t('aktiviteter.aktivitetstypeHale')}</span></p>
            </div>
            <p className="text-xs text-gray-400">{t('aktiviteter.kommerHint')}</p>
          </div>
        )}
      </div>

      {/* Statuslinje — annonseres for skjermleser (aria-live). */}
      <p className="text-sm text-gray-500 mt-5 min-h-[1.25rem]" role="status" aria-live="polite">
        {laster
          ? t('aktiviteter.laster')
          : feil
            ? t('aktiviteter.feil', { feil })
            : totalt > 0
              ? t('aktiviteter.teller', { vist: leker.length, totalt })
              : ''}
      </p>

      {!laster && !feil && (
        <>
          {totalt === 0 ? (
            !harFilter ? (
              <div className="text-center text-gray-500 py-16">{t('aktiviteter.ingenPublisert')}</div>
            ) : (
              <NullTreff t={t} sok={sok.trim()} />
            )
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {leker.map((l) => <LekeKort key={l.id} lek={l} favoritt={favoritter.has(l.id)} />)}
              </div>

              {leker.length < totalt && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={lastMer}
                    disabled={lasterMer}
                    className="rounded-xl border border-petrol px-6 py-3 text-petrol font-semibold hover:bg-petrol hover:text-white transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-petrol focus:ring-offset-2"
                  >
                    {lasterMer ? t('aktiviteter.lasterMer') : t('aktiviteter.lastMerRest', { rest })}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// Null-treff: si tydelig fra + tilby «foreslå denne leken» som krok. Selve
// innsendingssløyfen bygges senere (etappe 5) — knappen er en synlig krok her.
function NullTreff({ t, sok }) {
  return (
    <div className="text-center py-14 px-4">
      <p className="text-gray-700 font-semibold">
        {sok ? t('aktiviteter.nullTreffTittelSok', { sok }) : t('aktiviteter.nullTreffTittel')}
      </p>
      <p className="text-gray-500 text-sm mt-1">{t('aktiviteter.nullTreffTekst')}</p>
      <div className="mt-5">
        <p className="text-sm text-gray-600">{t('aktiviteter.foreslaHjelp')}</p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={t('aktiviteter.foreslaKommer')}
          className="mt-2 rounded-xl border border-dashed border-gray-300 px-5 py-2.5 text-gray-400 bg-gray-50 cursor-not-allowed"
        >
          {t('aktiviteter.foreslaKommer')}
        </button>
      </div>
    </div>
  )
}

function Gruppe({ tittel, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{tittel}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
