import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentSamlingPaaNokkel } from '../lib/samlinger'
import { harSamling } from '../lib/samlingForm'
import { hentManedensLek, hentManedensAktivLaering } from '../lib/manedensLek'
import { hentMineFavoritter, hentMineDokumentFavoritter } from '../lib/favoritter'
import { hentPlaner } from '../lib/periodeplan'
import { hentHjul } from '../lib/hjul'
import { hentKommendeWebinarer, datoBlokk, klokkeslett } from '../lib/webinar'
import { hentMinSkole, hentMinSkoleNavn } from '../lib/skole'
import { loggBrukHendelse } from '../lib/leker'
import {
  hentMinsideSeksjoner, hentAktuelt, hentMestKjopt, hentRegionansvarlig, hentTipslister,
} from '../lib/minside'
import { useNedtelling } from './webinar/Nedtelling'

// Skolens «Min side» — arbeidsbenk (design runde 7). Radene 1–2 ligger fast; radene
// 3–8 ordnes/skjules av minside_seksjon (migr 130). Ekte data der datalaget finnes;
// ellers uteblir kortet stille eller viser «Kommer snart». Nunito Sans (selvhostet,
// lastet globalt i main.jsx). Fargeregel: oransje som TEKST = --color-orange-ink.
const CSS = `
.ms{ --dark:#16181A; --grey:#5C6066; --grey2:#4A5056; --petrol:#106C75; --orange:#FF7B31;
  --ink:#B5560F; --line:#E2DED9; --soft:#FAF8F6; --pill:#F1EFEC; }
.ms *{box-sizing:border-box}
.ms{background:#FBF9F7;min-height:100vh}
.ms-wrap{max-width:1180px;margin:0 auto;padding:0 28px 40px;
  background:linear-gradient(180deg,#FFEDDD 0,#FDF6F0 110px,#FBF9F7 190px,#FBF9F7 100%)}
.ms-hei{display:flex;align-items:center;gap:14px;padding:20px 4px 14px;flex-wrap:wrap}
.ms-hei h1{font-size:26px;font-weight:700;letter-spacing:-.01em;color:var(--dark);margin:0}
.ms-hei .mnd{font-size:17px;color:var(--grey);text-transform:capitalize}
.ms-cols{display:flex;flex-direction:column;gap:18px}
.ms h2{color:var(--dark);margin:0}
.ms-sec{}
.ms-h2{font-size:21px;font-weight:700;line-height:1.25;color:var(--dark);margin:0 0 12px}
.ms-card{background:#fff;border-radius:20px;box-shadow:0 2px 12px rgba(20,24,40,.07);padding:22px}
.ms-grid5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.ms-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.ms-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.ms-tile{text-decoration:none;background:#fff;border-radius:18px;box-shadow:0 2px 12px rgba(20,24,40,.07);
  padding:18px;min-height:96px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.ms-tile:hover{box-shadow:0 4px 16px rgba(20,24,40,.12)}
.ms-tile .t{font-size:18px;font-weight:700;color:var(--dark)}
.ms-tile .n{font-size:16px;font-weight:600;color:var(--petrol)}
.ms-tile .n.tom{color:var(--grey)}
.ms-tile.soft{background:var(--soft)}
.ms-pill{align-self:flex-start;font-size:15px;font-weight:600;color:var(--grey2);
  background:var(--pill);border-radius:999px;padding:4px 12px}
.ms-tile-lbl{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:var(--grey2)}
.ms-btn{text-decoration:none;display:inline-flex;align-items:center;min-height:44px;font-size:16px;
  font-weight:700;color:var(--dark);background:#fff;border:1px solid var(--line);border-radius:999px;padding:0 18px}
.ms-btn:hover{border-color:var(--orange);background:#FFF8F2}
.ms-btn.primary{color:#2A1405;background:var(--orange);border:none}
.ms-btn.primary:hover{filter:brightness(.96)}
.ms-btnrow{display:flex;flex-wrap:wrap;gap:8px}
.ms-sub{font-size:16px;line-height:1.5;color:var(--grey);margin:0 0 14px}
.ms-h2ic{display:flex;align-items:center;gap:10px}
.ms-aktuelt{display:grid;grid-template-columns:260px minmax(0,1fr);gap:22px;align-items:center;border-radius:20px}
.ms-aktuelt img,.ms-aktuelt .ph{width:100%;aspect-ratio:4/3;border-radius:16px;object-fit:cover;
  background:linear-gradient(140deg,#FFC79C,#FF7B31)}
.ms-kicker{font-size:16px;font-weight:700;color:var(--petrol);margin:0 0 6px}
.ms-aktuelt h2{font-size:25px;font-weight:700;line-height:1.25;margin:0 0 10px}
.ms-aktuelt p.tx{font-size:17px;line-height:1.6;color:var(--grey2);margin:0 0 16px;max-width:660px}
.ms-mediarow{display:flex;gap:16px;align-items:center}
.ms-thumb{width:150px;flex:none;aspect-ratio:16/10;border-radius:14px;
  background:linear-gradient(140deg,#FFB577,#FF7B31);display:flex;align-items:center;justify-content:center}
.ms-thumb.petrol{background:linear-gradient(140deg,#5FB3BB,#106C75)}
.ms-thumb .play{width:46px;height:46px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center}
.ms-usecard{text-decoration:none;background:var(--soft);border-radius:16px;padding:16px;
  display:flex;align-items:center;justify-content:space-between;gap:14px}
.ms-usecard:hover{box-shadow:0 2px 10px rgba(20,24,40,.08)}
.ms-usecard .k{display:block;font-size:16px;font-weight:600;color:var(--petrol)}
.ms-usecard .v{display:block;font-size:21px;font-weight:700;color:var(--dark);margin-top:4px}
.ms-klubbrow{text-decoration:none;display:flex;align-items:center;gap:14px;min-height:72px;
  border-radius:14px;padding:8px 10px;color:inherit}
.ms-klubbrow:hover{background:var(--soft)}
.ms-klubbrow img,.ms-klubbrow .ph{width:56px;height:56px;flex:none;border-radius:12px;object-fit:cover;
  background:linear-gradient(140deg,#FDEEE2,#FBE9C7)}
.ms-klubbrow .navn{flex:1;font-size:17px;font-weight:600;color:var(--dark)}
.ms-klubbrow .pris{display:flex;align-items:baseline;gap:8px;flex:none}
.ms-klubbrow .forpris{font-size:16px;color:#8C9095;text-decoration:line-through}
.ms-klubbrow .npris{font-size:17px;font-weight:700;color:var(--dark)}
.ms-ra{margin-top:14px;padding-top:14px;border-top:1px solid #F1EDE9;font-size:16px;line-height:1.5;color:var(--grey2)}
.ms-ra a{font-weight:700;color:var(--ink)}
.ms-klassekort{text-decoration:none;display:flex;align-items:center;justify-content:space-between;gap:14px;
  min-height:56px;background:var(--soft);border-radius:14px;padding:12px 16px;color:inherit}
.ms-klassekort:hover{box-shadow:0 2px 10px rgba(20,24,40,.08)}
.ms-klassekort .navn{font-size:17px;font-weight:700;color:var(--dark)}
.ms-klassekort .les{flex:none;display:inline-flex;align-items:center;min-height:44px;font-size:16px;font-weight:700;color:var(--ink)}
.ms-trivsel{display:flex;gap:16px;align-items:flex-start;margin-top:16px;padding-top:16px;border-top:1px solid #F1EDE9}
.ms-trivsel .navn{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;color:var(--dark);margin:0 0 6px}
.ms-trivsel p{font-size:16px;line-height:1.5;color:var(--grey);margin:0}
.ms-details{background:var(--soft);border-radius:16px;padding:12px 16px;margin-top:10px}
.ms-details summary{display:flex;align-items:center;gap:8px;min-height:44px;font-size:17px;font-weight:700;color:var(--dark);cursor:pointer;list-style:none}
.ms-details summary::-webkit-details-marker{display:none}
.ms-details summary .lett{font-weight:400;color:var(--grey)}
.ms-webinar .rad{padding-bottom:12px;border-bottom:1px solid #F1EDE9}
.ms-webinar .tittel{font-size:18px;font-weight:700;line-height:1.35;color:var(--dark);margin:0}
.ms-webinar .meta{font-size:16px;color:var(--grey);margin:3px 0 10px}
.ms-webinar .tom{font-size:16px;color:var(--grey);margin:0}
.ms a:focus-visible,.ms button:focus-visible,.ms summary:focus-visible,.ms select:focus-visible{
  outline:3px solid var(--petrol);outline-offset:3px;border-radius:6px}
.ms-count{font-size:16px;color:var(--grey)}
.ms-sechead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:0 0 14px}
@media(max-width:900px){
  .ms-grid5{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ms-grid3{grid-template-columns:1fr}
  .ms-grid2{grid-template-columns:1fr}
  .ms-aktuelt{grid-template-columns:1fr}
}
`

// Petrol chevron/dokument-/lag-ikoner (fra designet). aria-hidden — dekorativt.
function Ikon({ navn }) {
  const felles = { width: 28, height: 28, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { color: '#106C75' } }
  if (navn === 'dok') return (<svg {...felles}><path d="M9 4h14l4 4v20H9z" /><path d="M13 13h10M13 19h7" /></svg>)
  if (navn === 'lag') return (<svg {...felles}><circle cx="11" cy="11" r="4" /><circle cx="22" cy="12" r="3.5" /><path d="M4 26c1-4.5 3.6-7 7-7s6 2.5 7 7M19 26c.7-3.4 2.6-5.5 5-5.5s4.3 2.1 5 5.5" /></svg>)
  return null
}

function Play() {
  return (
    <span className="play"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5l10 6.5-10 6.5z" fill="#106C75" /></svg></span>
  )
}

// Liten «søyle-sparkline» (dekorativ) for bruks-kortene.
function Spark({ label }) {
  const h = [38, 56, 74, 100]
  const farge = ['#BFDDE0', '#BFDDE0', '#7FBAC0', '#106C75']
  return (
    <span role="img" aria-label={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40, flex: 'none' }}>
      {h.map((v, i) => (<span key={i} style={{ width: 8, borderRadius: 3, height: `${v}%`, background: farge[i] }} />))}
    </span>
  )
}

export default function SkoleHjem() {
  const { t, i18n } = useTranslation()
  const [skole, setSkole] = useState({ id: null, navn: null })
  const [seksjoner, setSeksjoner] = useState(null) // null=laster, [] = fallback
  const [aktuelt, setAktuelt] = useState([])
  const [mestKjopt, setMestKjopt] = useState({ maaned: null, leker: [] })
  const [ra, setRa] = useState(null)
  const [manedslek, setManedslek] = useState(null)
  const [manedsAktiv, setManedsAktiv] = useState(null)
  const [tellere, setTellere] = useState({ planer: null, hjul: null, favLek: null, favDok: null })
  const [nesteWebinar, setNesteWebinar] = useState(undefined)
  const [samlinger, setSamlinger] = useState({ tldans: null, laginndeling: null, nominasjon: null, kursmodul: null })
  const [tipslister, setTipslister] = useState([])

  useEffect(() => {
    // Skole-kontekst → RA-oppslag når id finnes.
    hentMinSkole().then((id) => {
      setSkole((s) => ({ ...s, id }))
      if (id) hentRegionansvarlig(id).then(setRa).catch(() => setRa(null))
    }).catch(() => {})
    hentMinSkoleNavn().then((navn) => setSkole((s) => ({ ...s, navn }))).catch(() => {})

    hentMinsideSeksjoner(false).then(setSeksjoner).catch(() => setSeksjoner([]))
    hentAktuelt().then(setAktuelt).catch(() => setAktuelt([]))
    hentMestKjopt().then(setMestKjopt).catch(() => setMestKjopt({ maaned: null, leker: [] }))
    hentManedensLek().then(setManedslek).catch(() => setManedslek(null))
    hentManedensAktivLaering().then(setManedsAktiv).catch(() => setManedsAktiv(null))
    hentKommendeWebinarer().then((l) => setNesteWebinar(l[0] || null)).catch(() => setNesteWebinar(null))
    hentTipslister(i18n.language === 'sv' ? 'sv' : 'nb').then(setTipslister).catch(() => setTipslister([]))

    // Nøkkelbaserte samlinger (låses opp av nøkkelmigrasjonen). Uteblir stille → «Kommer snart».
    hentSamlingPaaNokkel('tl-dans').then((s) => setSamlinger((p) => ({ ...p, tldans: s }))).catch(() => {})
    hentSamlingPaaNokkel('laginndeling').then((s) => setSamlinger((p) => ({ ...p, laginndeling: s }))).catch(() => {})
    hentSamlingPaaNokkel('nominasjon').then((s) => setSamlinger((p) => ({ ...p, nominasjon: s }))).catch(() => {})
    hentKursmodul().then((s) => setSamlinger((p) => ({ ...p, kursmodul: s }))).catch(() => {})

    Promise.allSettled([hentPlaner(), hentHjul(), hentMineFavoritter(), hentMineDokumentFavoritter()]).then(
      ([p, h, fl, fd]) => setTellere({
        planer: p.status === 'fulfilled' ? p.value.length : null,
        hjul: h.status === 'fulfilled' ? h.value.length : null,
        favLek: fl.status === 'fulfilled' ? fl.value.size : null,
        favDok: fd.status === 'fulfilled' ? fd.value.size : null,
      }))
  }, [i18n.language])

  const maanedTekst = useMemo(() => {
    const locale = i18n.language === 'sv' ? 'sv-SE' : 'nb-NO'
    try { return new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' }) }
    catch { return '' }
  }, [i18n.language])

  // Rekkefølge for radene 3–8. Faller tilbake til designets rekkefølge om tabellen er tom.
  const raderIRekke = seksjoner && seksjoner.length
    ? seksjoner.map((s) => s.seksjon)
    : ['aktuelt', 'nominasjon', 'tldans', 'brukt_naa', 'klassetrivsel', 'mest_kjopt']

  const heiNavn = skole.navn || null

  return (
    <div className="ms">
      <style>{CSS}</style>
      <div className="ms-wrap">
        {/* ── 1 HILSEN (kompakt) ── */}
        <div className="ms-hei">
          <h1>{heiNavn ? t('minSide.hjem.hei', { skole: heiNavn }) : t('minSide.hjem.heiUtenNavn')}</h1>
          {maanedTekst && <span className="mnd">{maanedTekst}</span>}
        </div>

        <div className="ms-cols">
          {/* ── 1 MINE VALG ── */}
          <MineValg t={t} tellere={tellere} />

          {/* ── 2 VENTER PÅ SVAR (kun når det finnes noe) ── */}
          {/* Datakilde ikke levert av migr 130–135; raden uteblir til den finnes (design 4b). */}

          {/* ── 3–8: styrt av minside_seksjon ── */}
          {raderIRekke.map((key) => (
            <Seksjon
              key={key} navn={key} t={t}
              aktuelt={aktuelt} mestKjopt={mestKjopt} ra={ra}
              manedslek={manedslek} manedsAktiv={manedsAktiv} nesteWebinar={nesteWebinar}
              samlinger={samlinger} tipslister={tipslister}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Prøver kursmodulnøklene i tur (nøkkelmigrasjonen setter én av disse). Uteblir stille.
async function hentKursmodul() {
  for (const nokkel of ['kursmodul-host-2026', 'kursmodul-host', 'kursmodul-vinter-2026', 'kursmodul']) {
    const s = await hentSamlingPaaNokkel(nokkel).catch(() => null)
    if (harSamling(s)) return s
  }
  return null
}

function MineValg({ t, tellere }) {
  const tall = (n, nokkel) => (n != null ? t(nokkel, { antall: n }) : '')
  return (
    <section className="ms-sec" aria-labelledby="ms-mine">
      <h2 id="ms-mine" className="ms-h2">{t('minSide.hjem.mineValg')}</h2>
      <div className="ms-grid5">
        <Link to="/min-side/periodeplaner" className="ms-tile">
          <span className="t">{t('minSide.hjem.periodeplaner')}</span>
          <span className="n">{tall(tellere.planer, 'minSide.hjem.planerTeller')}</span>
        </Link>
        <Link to="/min-side/tl-hjulet" className="ms-tile">
          <span className="t">{t('minSide.hjem.tlhjul')}</span>
          <span className="n">{tall(tellere.hjul, 'minSide.hjem.hjulTeller')}</span>
        </Link>
        <Link to="/min-side/aktiviteter?fav=1" className="ms-tile">
          <span className="t">{t('minSide.hjem.favorittleker')}</span>
          <span className="n">{tall(tellere.favLek, 'minSide.hjem.merketTeller')}</span>
        </Link>
        <Link to="/min-side/dokumenter?fav=1" className="ms-tile">
          <span className="t">{t('minSide.hjem.favorittdokumenter')}</span>
          <span className={`n${tellere.favDok ? '' : ' tom'}`}>
            {tellere.favDok != null && tellere.favDok > 0
              ? t('minSide.hjem.merketTeller', { antall: tellere.favDok })
              : t('minSide.hjem.ingenEnna')}
          </span>
        </Link>
        {/* «Send inn forslag» — funksjonen kommer etter lansering (Kjartans beslutning). */}
        <div className="ms-tile soft" role="group" aria-label={t('minSide.hjem.sendForslag')}>
          <span className="ms-tile-lbl">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" style={{ color: '#8C9095' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 22V6m0 0l-6 6m6-6l6 6M6 22v3a2 2 0 002 2h16a2 2 0 002-2v-3" /></svg>
            {t('minSide.hjem.sendForslag')}
          </span>
          <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
        </div>
      </div>
    </section>
  )
}

// Én av radene 3–8. Returnerer null når raden ikke har noe å vise (design: da uteblir den).
function Seksjon({ navn, t, aktuelt, mestKjopt, ra, manedslek, manedsAktiv, nesteWebinar, samlinger, tipslister }) {
  if (navn === 'aktuelt') return <AktueltSeksjon t={t} aktuelt={aktuelt} />
  if (navn === 'nominasjon') return <NominasjonKurs t={t} samlinger={samlinger} />
  if (navn === 'tldans') return <DansLag t={t} samlinger={samlinger} />
  if (navn === 'brukt_naa') return <BruktNaa t={t} manedslek={manedslek} manedsAktiv={manedsAktiv} />
  if (navn === 'klassetrivsel') return <KlasseTips t={t} tipslister={tipslister} />
  if (navn === 'mest_kjopt') return <MestKjoptWebinar t={t} mestKjopt={mestKjopt} ra={ra} nesteWebinar={nesteWebinar} />
  return null
}

function AktueltSeksjon({ t, aktuelt }) {
  const blokk = aktuelt[0]
  if (!blokk) return null
  return (
    <section className="ms-sec ms-card ms-aktuelt" aria-labelledby="ms-aktuelt">
      {blokk.bilde_url
        ? <img src={blokk.bilde_url} alt={blokk.bilde_beskrivelse || ''} />
        : <div className="ph" role="presentation" />}
      <div>
        <p className="ms-kicker">{t('minSide.hjem.aktuelt')}</p>
        <h2 id="ms-aktuelt">{blokk.overskrift}</h2>
        {blokk.tekst && <p className="tx">{blokk.tekst}</p>}
        {blokk.knapp_tekst && blokk.knapp_lenke && (
          <a className="ms-btn" href={blokk.knapp_lenke} target="_blank" rel="noopener noreferrer">
            {blokk.knapp_tekst}
          </a>
        )}
      </div>
    </section>
  )
}

// Kort som enten lenker til en samling, eller viser «Kommer snart» til nøkkelen finnes.
function SamlingKnapp({ t, samling, label }) {
  if (harSamling(samling)) {
    return (
      <Link className="ms-btn" to={`/min-side/samlinger/${samling.id}`}>
        {samling.tittel || label}
      </Link>
    )
  }
  return <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
}

function NominasjonKurs({ t, samlinger }) {
  return (
    <div className="ms-grid2">
      <section className="ms-card" aria-labelledby="ms-nom">
        <h2 id="ms-nom" className="ms-h2 ms-h2ic"><Ikon navn="dok" />{t('minSide.hjem.nominasjon')}</h2>
        <p className="ms-sub">{t('minSide.hjem.nominasjonSub')}</p>
        <div className="ms-btnrow">
          <SamlingKnapp t={t} samling={samlinger.nominasjon} label={t('minSide.hjem.aapneNominasjon')} />
        </div>
      </section>
      <section className="ms-card" aria-labelledby="ms-kurs">
        <h2 id="ms-kurs" className="ms-h2">{t('minSide.hjem.lekekurs')}</h2>
        <div className="ms-mediarow" style={{ marginTop: 6 }}>
          <div className="ms-thumb" role="img" aria-label={t('minSide.hjem.lekekurs')}><Play /></div>
          <p className="ms-sub" style={{ margin: 0 }}>{t('minSide.hjem.lekekursSub')}</p>
        </div>
        <div className="ms-btnrow" style={{ marginTop: 14 }}>
          <SamlingKnapp t={t} samling={samlinger.kursmodul} label={t('minSide.hjem.aapneKurs')} />
        </div>
      </section>
    </div>
  )
}

function DansLag({ t, samlinger }) {
  return (
    <div className="ms-grid2">
      <section className="ms-card" aria-labelledby="ms-dans">
        <h2 id="ms-dans" className="ms-h2">{t('minSide.hjem.tldans')}</h2>
        <div className="ms-thumb petrol" role="img" aria-label={t('minSide.hjem.tldans')} style={{ width: '100%', height: 112, marginTop: 6, marginBottom: 12 }}><Play /></div>
        <div className="ms-btnrow">
          <SamlingKnapp t={t} samling={samlinger.tldans} label={t('minSide.hjem.aapneDans')} />
        </div>
      </section>
      <section className="ms-card" aria-labelledby="ms-lag">
        <h2 id="ms-lag" className="ms-h2 ms-h2ic"><Ikon navn="lag" />{t('minSide.hjem.laginndeling')}</h2>
        <p className="ms-sub">{t('minSide.hjem.laginndelingSub')}</p>
        <div className="ms-btnrow">
          <SamlingKnapp t={t} samling={samlinger.laginndeling} label={t('minSide.hjem.aapneLaginndeling')} />
        </div>
      </section>
    </div>
  )
}

function BruktKort({ to, kicker, navn, meta, label }) {
  return (
    <Link to={to} className="ms-usecard" aria-label={`${kicker}: ${navn}`}>
      <span>
        <span className="k">{kicker}</span>
        <span className="v">{navn}</span>
        {meta && <span style={{ display: 'block', fontSize: 16, color: '#5C6066', marginTop: 2 }}>{meta}</span>}
      </span>
      <Spark label={label} />
    </Link>
  )
}

function BruktNaa({ t, manedslek, manedsAktiv }) {
  if (!manedslek && !manedsAktiv) return null
  return (
    <section className="ms-card" aria-labelledby="ms-bruk">
      <div className="ms-sechead">
        <h2 id="ms-bruk" className="ms-h2" style={{ margin: 0 }}>{t('minSide.hjem.bruktNaa')}</h2>
      </div>
      <div className="ms-grid2">
        {manedslek && (
          <BruktKort to={`/min-side/aktiviteter/${manedslek.lek.id}`} kicker={t('minSide.hjem.manedensLek')}
            navn={manedslek.lek.tittel} label={t('minSide.hjem.brukSpark')} />
        )}
        {manedsAktiv && (
          <BruktKort to={`/min-side/aktiviteter/${manedsAktiv.lek.id}`} kicker={t('minSide.hjem.manedensAktiv')}
            navn={manedsAktiv.lek.tittel} label={t('minSide.hjem.brukSpark')} />
        )}
      </div>
    </section>
  )
}

function KlasseTips({ t, tipslister }) {
  return (
    <div className="ms-grid2">
      <section className="ms-card" aria-labelledby="ms-klasse">
        <h2 id="ms-klasse" className="ms-h2">{t('minSide.hjem.klassetrivsel')}</h2>
        {/* «Kjetil og Kjartans tips» — venter på plassering/kilde; vises som Kommer snart. */}
        <div className="ms-klassekort" aria-label={t('minSide.hjem.kjetilKjartan')} role="group">
          <span className="navn">{t('minSide.hjem.kjetilKjartan')}</span>
          <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
        </div>
        <div className="ms-trivsel">
          <svg width="72" height="72" viewBox="0 0 100 100" role="img" aria-label={t('minSide.hjem.trivselsaaret')} style={{ flex: 'none' }}>
            <g stroke="#fff" strokeWidth="1.5">
              <path d="M50 50 L50 6 A44 44 0 0 1 74.8 13.8 Z" fill="#FF7B31" />
              <path d="M50 50 L74.8 13.8 A44 44 0 0 1 90.9 33.2 Z" fill="#FFA766" />
              <path d="M50 50 L90.9 33.2 A44 44 0 0 1 92.2 57.5 Z" fill="#F0C14B" />
              <path d="M50 50 L92.2 57.5 A44 44 0 0 1 79.2 78.6 Z" fill="#9CBF5A" />
              <path d="M50 50 L79.2 78.6 A44 44 0 0 1 57.5 92.2 Z" fill="#54A1AB" />
              <path d="M50 50 L57.5 92.2 A44 44 0 0 1 33.2 90.9 Z" fill="#3D8C97" />
              <path d="M50 50 L33.2 90.9 A44 44 0 0 1 14.6 76.6 Z" fill="#106C75" />
              <path d="M50 50 L14.6 76.6 A44 44 0 0 1 6.6 57.9 Z" fill="#2F6E86" />
              <path d="M50 50 L6.6 57.9 A44 44 0 0 1 9.6 33.6 Z" fill="#7E7CA8" />
              <path d="M50 50 L9.6 33.6 A44 44 0 0 1 24.1 15.1 Z" fill="#CF442F" />
              <path d="M50 50 L24.1 15.1 A44 44 0 0 1 50 6 Z" fill="#E86A4B" />
            </g>
            <circle cx="50" cy="50" r="15" fill="#fff" />
          </svg>
          <div>
            <p className="navn">{t('minSide.hjem.trivselsaaret')}
              <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
            </p>
            <p>{t('minSide.hjem.trivselsaaretSub')}</p>
          </div>
        </div>
      </section>
      <section className="ms-card" aria-labelledby="ms-tips">
        <h2 id="ms-tips" className="ms-h2">{t('minSide.hjem.tipslister')}</h2>
        {tipslister.length ? (
          <div className="ms-btnrow">
            {tipslister.map((s) => (
              <Link key={s.id} className="ms-btn" to={`/min-side/samlinger/${s.id}`}>{s.tittel}</Link>
            ))}
          </div>
        ) : (
          <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
        )}
      </section>
    </div>
  )
}

function kr(n) {
  if (n == null) return ''
  const tall = Number(n)
  return `${tall % 1 === 0 ? tall.toFixed(0) : tall.toFixed(2).replace('.', ',')} kr`
}

function MestKjoptWebinar({ t, mestKjopt, ra, nesteWebinar }) {
  return (
    <div className="ms-grid2">
      <section className="ms-card" aria-labelledby="ms-klubb">
        <h2 id="ms-klubb" className="ms-h2">{t('minSide.hjem.mestKjopt')}</h2>
        {mestKjopt.leker.length > 0 && (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {mestKjopt.leker.map((k) => (
              <li key={k.id}>
                <a
                  className="ms-klubbrow" href={k.lenke} target="_blank" rel="noopener noreferrer"
                  onClick={() => loggBrukHendelse('klubb_klikk')}
                  aria-label={t('minSide.hjem.mestKjoptAria', {
                    navn: k.navn,
                    pris: kr(k.pris),
                    nyfane: t('minSide.hjem.aapnesNyFane'),
                  })}
                >
                  {k.bilde_url
                    ? <img src={k.bilde_url} alt={k.navn} />
                    : <span className="ph" aria-hidden="true" />}
                  <span className="navn">{k.navn}</span>
                  <span className="pris" aria-hidden="true">
                    {k.forpris != null && <span className="forpris">{kr(k.forpris)}</span>}
                    <span className="npris">{kr(k.pris)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}
        {mestKjopt.leker.length === 0 && <p className="ms-sub" style={{ margin: 0 }}>{t('minSide.hjem.mestKjoptTom')}</p>}
        {/* RA-linja står ALLTID under Mest kjøpte. */}
        <p className="ms-ra">
          {t('minSide.hjem.raSporsmaal')}{' '}
          {ra && (
            <>
              <br />
              <span>{ra.navn}</span>
              {ra.epost && <> — <a href={`mailto:${ra.epost}`}>{ra.epost}</a></>}
            </>
          )}
        </p>
      </section>
      <WebinarKort t={t} webinar={nesteWebinar} />
    </div>
  )
}

function WebinarKort({ t, webinar }) {
  const n = useNedtelling(webinar?.starter_at || new Date().toISOString(), webinar?.varighet_min)
  return (
    <section className="ms-card ms-webinar" aria-labelledby="ms-web">
      <h2 id="ms-web" className="ms-h2">{t('minSide.hjem.webinarer')}</h2>
      {webinar ? (
        <div className="rad">
          <p className="tittel">{webinar.tittel}</p>
          <p className="meta">{datoBlokk(webinar.starter_at).dag}. {datoBlokk(webinar.starter_at).maaned} · kl. {klokkeslett(webinar.starter_at)} · <span>{n.tekst}</span></p>
          <Link className="ms-btn" to="/min-side/webinarer">{t('minSide.hjem.meldPaa')}</Link>
        </div>
      ) : (
        <p className="tom">{t('minSide.hjem.ingenWebinar')}</p>
      )}
    </section>
  )
}
