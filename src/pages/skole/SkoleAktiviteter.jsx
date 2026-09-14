import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  sokLeker, hentUtstyrListe, loggBrukHendelse,
  hentEgnetListe, hentSesongListe,
  SESONGER, EGNET_NO,
} from '../../lib/leker'
import { hentSamlinger } from '../../lib/samlinger'
import { hentMineFavoritter } from '../../lib/favoritter'
import LekeKort from '../../components/LekeKort'

// «Last mer» henter 50 om gangen (besluttet av Kjartan — ikke sidetall, ikke uendelig rulling).
const SIDE = 50

// Filter-listene EGNET og SESONG er DATADREVNE (etappe 7 D1): de hentes fra basen ved sidelast
// (hentEgnetListe/hentSesongListe) og bytter ut de kanoniske fallback-listene fra leker.js.
// Endrer en ansatt et navn i basen, følger nedtrekket etter. MERK: verdiene sendes som filterverdi
// til søke-RPC-en (egnet_kategori.navn), derfor er de IKKE UI-tekst som oversettes.
//
// TRINN-NEDTREKKET ER FJERNET FRA LEKEBIBLIOTEKET (beslutning 7. sep, målt kartlegging): enkelttrinn
// var falsk presisjon — 74 % av lekene ligger i alle tre trinn-band, og band 1-4 vs 5-7 skiller kun
// tre leker. Gamle siden brukte dessuten aldri enkelttrinn, kun skoletype (field_school_type).
// SKOLETYPE-filteret erstatter det. (Trinn beholdes i AKTIV LÆRING, der kompetansemål er
// trinn-knyttet — se SkoleAktivLaering.jsx.) p_trinn i sok_leker er URØRT (Min side + aktiv læring).
//
// SAMLINGER er nå DATADREVNE (11. sep): de importerte tipslistene, julekalenderen, «Månedens
// Move it», TL-dans m.fl. hentes fra samlinger-tabellen (hentSamlinger) og vises som LENKER til
// samlingssiden — de tidligere grå «kommer»-plassholderne er borte. Favoritter-bryteren står
// uendret (den er en filter-toggle mot favoritter-tabellen, ikke en samling).

// SKOLETYPE er et EKTE filter (migr 105): en avledning som sok_leker løser opp til trinn/egnet, og
// speiler importregelen (regler.mjs::regelTrinn). «Trykk ett sted, ikke huk av sju trinn.» `kode`
// sendes til RPC-en (p_skoletype); avledningen bor i basen. barneskole→1-7, ungdomsskole→8-10,
// SFO/AKS→egnet «SFO/AKS». («Kombinert» er utelatt — det ga samme sett som ungdomsskole.)
const SKOLETYPE = [
  { label: 'Barnehage', kode: 'barnehage' },
  { label: 'Barneskole', kode: 'barnetrinn' },
  { label: 'Ungdomsskole', kode: 'ungdomstrinn' },
  { label: 'SFO/AKS', kode: 'sfo' },
]

// Egnet-verdier som skjules i «Egnet for»-nedtrekket og kategoripanelet (Kjartan 13. sep).
// Skjules KUN i visning — de slettes ikke fra egnet_kategori (ansatte fyller dem senere).
const SKJUL_EGNET = new Set([
  'Friminutt', 'Kroppsøving', 'Aktiv læring', 'Bli kjent / klassemiljø', 'Aktivitetsdager',
])

export default function SkoleAktiviteter() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()

  // Filtertilstand
  const [sok, setSok] = useState('')
  const [fEgnet, setFEgnet] = useState('')
  const [fSkoletype, setFSkoletype] = useState('')
  const [fSted, setFSted] = useState('')
  const [fUtstyr, setFUtstyr] = useState('')
  const [utenUtstyr, setUtenUtstyr] = useState(false)
  const [fSesong, setFSesong] = useState('')
  const [kunVideo, setKunVideo] = useState(false)
  const [kunFav, setKunFav] = useState(false)
  // Åpent som standard (midlertidig, til samlingene primært ligger på Min side) så læreren
  // faktisk finner samlingene. URL-param ?bla=0/1 og toggle-knappen styrer resten.
  const [blaApen, setBlaApen] = useState(true)

  // Resultat + status
  const [leker, setLeker] = useState([])
  const [totalt, setTotalt] = useState(0)
  const [laster, setLaster] = useState(true)
  const [lasterMer, setLasterMer] = useState(false)
  const [feil, setFeil] = useState(null)
  const [favoritter, setFavoritter] = useState(new Set())
  const [utstyrListe, setUtstyrListe] = useState([])
  const [samlinger, setSamlinger] = useState([]) // synlige samlinger (datadrevet, lenker)
  // Datadrevne filter-lister — init med kanonisk fallback, overskrives av basen ved montering.
  const [egnetListe, setEgnetListe] = useState(EGNET_NO)
  // Egnet-verdier som SKJULES i nedtrekket/kategoripanelet (Kjartans beslutning 13. sep):
  // 0 treff (Friminutt/Kroppsøving/Aktiv læring/Aktivitetsdager) eller overlapp med «Sosial
  // kompetanse» (Bli kjent / klassemiljø). Verdiene BEHOLDES i basen (egnet_kategori) — dette
  // er kun en visnings-skjuling; ansatte kan fylle dem senere. Se rapport for migrasjons-note.
  const egnetVises = egnetListe.filter((x) => !SKJUL_EGNET.has(x))
  const [sesongListe, setSesongListe] = useState(SESONGER)
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
    const sty = params.get('skoletype'); if (sty) setFSkoletype(sty)
    const st = params.get('sted'); if (st) setFSted(st)
    const us = params.get('utstyr'); if (us) setFUtstyr(us)
    const se = params.get('sesong'); if (se) setFSesong(se)
    if (params.get('bla') === '1') setBlaApen(true)
    hentMineFavoritter().then(setFavoritter).catch(() => {})
    hentUtstyrListe().then(setUtstyrListe).catch(() => {})
    hentSamlinger().then(setSamlinger).catch(() => {}) // feiler stille → gruppa viser kun Favoritter
    // Datadrevne lister fra basen — .catch beholder fallbacken hvis lesingen feiler.
    hentEgnetListe().then((l) => l.length && setEgnetListe(l)).catch(() => {})
    hentSesongListe().then((l) => l.length && setSesongListe(l)).catch(() => {})
    setKlar(true)
    // Kun ved montering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtre = useMemo(() => ({
    sok, egnet: fEgnet, skoletype: fSkoletype, sted: fSted, utstyr: fUtstyr,
    utenUtstyr, sesong: fSesong, kunVideo, kunFav,
  }), [sok, fEgnet, fSkoletype, fSted, fUtstyr, utenUtstyr, fSesong, kunVideo, kunFav])

  const filterNokkel = JSON.stringify({ ...filtre, sok: sok.trim() })

  // 2) SKRIV filtertilstand tilbake til adressen (så et søk kan limes inn i ny fane).
  useEffect(() => {
    if (!klar) return
    const p = {}
    if (sok.trim()) p.sok = sok.trim()
    if (fEgnet) p.egnet = fEgnet
    if (fSkoletype) p.skoletype = fSkoletype
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
            loggBrukHendelse('sok', { sokTekst: q, treffAntall: sum })
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
    setSok(''); setFEgnet(''); setFSkoletype(''); setFSted(''); setFUtstyr('')
    setUtenUtstyr(false); setFSesong(''); setKunVideo(false); setKunFav(false)
  }
  const bytt = (naa, ny, sett) => sett(naa === ny ? '' : ny)

  const harFilter = !!(sok.trim() || fEgnet || fSkoletype || fSted || fUtstyr || utenUtstyr || fSesong || kunVideo || kunFav)
  const rest = Math.max(0, totalt - leker.length)

  // Fane-re-klikk (RESTER-ETAPPE3-bug): «Finn en lek» navigerer til /min-side/aktiviteter uten
  // query, så adressen tømmes mens komponenten står montert. URL→state-lesingen kjører kun ved
  // montering, så filter-TILSTANDEN i minnet ble stående. Her speiler vi adressen: forsvinner
  // alle filter-parametre mens vi fortsatt har aktive filtre, nullstiller vi dem. Nøklet KUN på
  // adressen (params) — fyrer ikke på state-endringer, så et nettopp valgt filter (ennå ikke
  // skrevet til URL) blir ikke feilaktig tømt.
  useEffect(() => {
    if (!klar) return
    const FILTERNOKLER = ['sok', 'egnet', 'skoletype', 'sted', 'utstyr', 'sesong', 'utenutstyr', 'video', 'fav']
    const urlTom = !FILTERNOKLER.some((k) => params.get(k))
    if (urlTom && harFilter) nullstill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, klar])

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/40'
  const chip = (aktiv) =>
    `text-sm rounded-full px-3 py-1.5 border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange/50 ${
      aktiv ? 'bg-orange text-gray-900 border-orange' : 'bg-white text-gray-700 border-gray-300 hover:border-orange hover:text-orange-ink'
    }`
  // Samlingslenker: samme utseende som en inaktiv chip, men er en <Link> (ikke et filter).
  const chipLenke = `${chip(false)} no-underline inline-block`

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
          {egnetVises.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        {/* Skoletype står der trinn sto (etter «Egnet for», før «Sted»): hvem leken er for, så hvor. */}
        <select className={selCls} aria-label={t('aktiviteter.grSkoletype')} value={fSkoletype} onChange={(e) => setFSkoletype(e.target.value)}>
          <option value="">{t('aktiviteter.skoletypeAlle')}</option>
          {SKOLETYPE.map((s) => <option key={s.kode} value={s.kode}>{s.label}</option>)}
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
        {/* Sesong-nedtrekket fjernet: ressurs_sesong har 0 rader (0 treff for alle verdier).
            Verdiene beholdes i basen; ansatte kan fylle dem senere (jf. egnet-terskelen). */}
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
              {egnetVises.map((x) => (
                <button key={x} className={chip(fEgnet === x)} onClick={() => bytt(fEgnet, x, setFEgnet)}>{x}</button>
              ))}
            </Gruppe>

            <Gruppe tittel={t('aktiviteter.grSkoletype')}>
              {SKOLETYPE.map((s) => (
                <button key={s.kode} className={chip(fSkoletype === s.kode)} onClick={() => bytt(fSkoletype, s.kode, setFSkoletype)}>{s.label}</button>
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

            {/* SESONG-seksjonen fjernet: ressurs_sesong har 0 rader (jf. sesong-nedtrekket). */}

            <Gruppe tittel={t('aktiviteter.grSamlinger')}>
              <button className={chip(kunFav)} onClick={() => setKunFav((v) => !v)}>{t('samling.favoritter')}</button>
              {samlinger.map((s) => (
                <Link
                  key={s.id}
                  to={`/min-side/samlinger/${s.id}`}
                  className={chipLenke}
                  aria-label={t('samling.aapneSamling', { tittel: s.tittel || '' })}
                >
                  {s.tittel || t('samling.utenTittel')}
                </Link>
              ))}
            </Gruppe>
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
