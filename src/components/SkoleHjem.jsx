import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentSamlingKort, hentTLPraten } from '../lib/samlinger'
import { harSamling } from '../lib/samlingForm'
import {
  delNominasjonSamling, stripTipslistePrefiks, lekekursTittel,
  nominasjonEtikettNokkel, sorterDanser,
} from '../lib/minsideKort'
import { hentManedensLek, hentManedensAktivLaering } from '../lib/manedensLek'
import { hentMineFavoritter, hentMineDokumentFavoritter } from '../lib/favoritter'
import { hentPlaner } from '../lib/periodeplan'
import { hentHjul } from '../lib/hjul'
import { hentKommendeWebinarer, datoBlokk, klokkeslett } from '../lib/webinar'
import { hentMinSkole } from '../lib/skole'
import { loggBrukHendelse } from '../lib/leker'
import { bunnyThumbUrl } from '../lib/bunny'
import {
  hentMinsideSeksjoner, hentAktuelt, hentMestKjopt, hentRegionansvarlig, hentTipslister,
  hentNominasjonPresentasjoner,
} from '../lib/minside'
import { useNedtelling } from './webinar/Nedtelling'

// Skolens «Min side» — arbeidsbenk (design runde 8d). Radene 1–2 ligger fast; radene
// 3–8 ordnes/skjules av minside_seksjon (migr 130). Ekte data der datalaget finnes;
// ellers uteblir kortet stille eller viser «Kommer snart». Nunito Sans (selvhostet,
// lastet globalt i main.jsx). Fargeregel (WCAG 2.1 AA): oransje som FLATE = #FF7B31,
// oransje som TEKST = --ink #B5560F, aldri hvit tekst på oransje. Måltall/farger/avstander
// er hentet fra designet «Min side.dc.html» seksjon 5 (5a desktop 1280, 5c mobil 390, 5d
// målnotat, 5g videokort, 5j nedtrekk).
const CSS = `
.ms{ --dark:#16181A; --grey:#5C6066; --grey2:#4A5056; --petrol:#106C75; --orange:#FF7B31;
  --ink:#B5560F; --line:#E2DED9; --soft:#FAF8F6; --pill:#F1EFEC; }
.ms *{box-sizing:border-box}
.ms{background:#FBF9F7;min-height:100vh}
.ms-wrap{max-width:1280px;margin:0 auto;padding:28px 40px 40px;
  background:linear-gradient(180deg,#FFF1E4 0,#FCF7F3 150px,#FBF9F7 260px,#FBF9F7 100%)}
.ms-cols{display:flex;flex-direction:column;gap:20px}
.ms h2{color:var(--dark);margin:0}
.ms-h2{font-size:22px;font-weight:700;line-height:1.25;color:var(--dark);margin:0 0 14px}
.ms-h2ic{display:flex;align-items:center;gap:12px}
.ms-sub{font-size:17px;line-height:1.5;color:var(--grey);margin:0 0 20px}
.ms-card{background:#fff;border-radius:20px;box-shadow:0 2px 14px rgba(20,24,40,.07);padding:28px;display:flex;flex-direction:column}
.ms-sechead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:0 0 6px}
/* ── Topplinje (Mine valg + dato) ── */
.ms-topline{display:flex;align-items:baseline;justify-content:space-between;gap:24px;margin:0 0 16px}
.ms-topline h1{font-size:17px;font-weight:400;color:var(--grey);margin:0}
.ms-topline .hoyre{display:flex;align-items:center;gap:16px}
.ms-topline .dato{font-size:17px;font-weight:400;color:var(--grey)}
/* ── Mine valg-fliser ── */
.ms-grid5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
/* 5d «Kort i samme rad»: align-items:start — hvert kort er bare så høyt som innholdet,
   ingen tom flate under siste handling (erstatter runde 7s stretch). */
.ms-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}
.ms-tile{text-decoration:none;background:#fff;border-radius:20px;box-shadow:0 2px 14px rgba(20,24,40,.07);
  padding:22px 24px;min-height:104px;display:flex;flex-direction:column;justify-content:center;gap:6px}
.ms-tile:hover{box-shadow:0 4px 18px rgba(20,24,40,.12)}
.ms-tile .t{font-size:19px;font-weight:700;color:var(--dark)}
.ms-tile .n{font-size:17px;font-weight:600;color:var(--petrol)}
.ms-tile .n.tom{color:var(--grey)}
.ms-tile.soft{background:var(--soft)}
.ms-pill{align-self:flex-start;font-size:15px;font-weight:600;color:var(--grey2);
  background:var(--pill);border-radius:999px;padding:5px 13px}
.ms-tile-lbl{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:700;color:var(--grey2)}
/* ── Knapper ── */
.ms-btn{text-decoration:none;display:inline-flex;align-items:center;gap:10px;min-height:44px;font-size:16px;
  font-weight:700;color:var(--dark);background:#fff;border:1px solid var(--line);border-radius:999px;padding:0 20px}
.ms-btn:hover{border-color:var(--orange);background:#FFF8F2}
.ms-btn.primary{color:#2A1405;background:var(--orange);border:none;padding:0 24px}
.ms-btn.primary:hover{filter:brightness(.96)}
.ms-btnrow{display:flex;flex-wrap:wrap;gap:10px}
.ms-filmerke{display:inline-flex;align-items:center;font-size:14px;font-weight:700;border-radius:999px;padding:5px 11px}
.ms-filmerke.pdf{color:#16181A;background:#F1EFEC}
.ms-filmerke.pptx{color:#0B5A62;background:#E6F0F1}
/* ── Aktuelt ── */
.ms-aktuelt{display:grid;grid-template-columns:320px minmax(0,1fr);gap:28px;align-items:center}
.ms-aktuelt .fig{position:relative;aspect-ratio:4/3;border-radius:16px;overflow:hidden;
  display:flex;align-items:flex-end;justify-content:center;background:#FDEBDD}
.ms-aktuelt .fig img.foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ms-aktuelt .fig .dots{position:absolute;inset:0;background-image:radial-gradient(#FBC79B 1.6px,transparent 1.6px);background-size:16px 16px}
.ms-aktuelt .fig img.maskot{position:relative;height:136px;width:auto;display:block}
.ms-kicker{font-size:16px;font-weight:700;color:var(--petrol);margin:0 0 8px}
.ms-aktuelt h2{font-size:28px;font-weight:700;line-height:1.25;margin:0 0 12px}
.ms-aktuelt p.tx{font-size:18px;line-height:1.6;color:var(--grey2);margin:0 0 20px;max-width:720px}
/* ── Videokort (design 5g) ── */
.ms-video{position:relative;display:block;width:100%;aspect-ratio:16/9;border-radius:16px;
  overflow:hidden;text-decoration:none;background:var(--petrol)}
/* Videoflate-innmaten (bilde, gradient, prikker, spilleknapp) deles av det STORE kortet
   (.ms-video) OG den lille TL-praten-flaten (.ms-tlprat .flate) — F1, Fable 18. sep. */
.ms-video .img,.ms-tlprat .flate .img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ms-video .shade,.ms-tlprat .flate .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 42%,rgba(0,0,0,.62))}
.ms-video .dots,.ms-tlprat .flate .dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.2) 1.7px,transparent 1.7px);background-size:16px 16px}
.ms-video .play,.ms-tlprat .flate .play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:999px;display:flex;align-items:center;justify-content:center}
.ms-video .cap{position:absolute;left:18px;right:18px;bottom:16px}
.ms-video .cap .tt{display:block;font-size:19px;font-weight:700;line-height:1.3;color:#fff}
.ms-video .cap .sb{display:block;font-size:16px;font-weight:600;color:#EDE9E4;margin-top:3px}
/* ── TL-praten (horisontalt videokort i nominasjonskortet) ── */
.ms-tlprat{display:grid;grid-template-columns:200px minmax(0,1fr);gap:18px;align-items:center;
  text-decoration:none;background:#fff;border:1px solid #CADCDE;border-radius:16px;padding:14px;margin:0 0 20px}
.ms-tlprat:hover{box-shadow:0 2px 12px rgba(20,24,40,.09)}
.ms-tlprat .flate{position:relative;display:block;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:var(--petrol)}
.ms-tlprat .kick{display:block;font-size:16px;font-weight:700;color:#0B5A62}
.ms-tlprat .navn{display:block;font-size:19px;font-weight:700;line-height:1.3;color:var(--dark);margin-top:3px}
.ms-tlprat .sub{display:block;font-size:16px;color:var(--grey2);margin-top:4px}
.ms-nomlayout{display:flex;gap:18px;align-items:flex-end;margin-top:auto}
.ms-nomcol{flex:1;display:flex;flex-direction:column;gap:10px}
.ms-maskoter{flex:none;display:flex;align-items:flex-end;background:#F7FBFB;border-radius:20px;padding:10px 14px 0}
.ms-maskoter img{width:auto;display:block}
/* ── Nedtrekk (details/summary, design 5j) ── */
.ms-details{background:var(--soft);border-radius:16px;padding:0 16px}
.ms-details[open]{padding-bottom:12px}
.ms-details summary{display:flex;align-items:center;gap:10px;min-height:48px;font-size:17px;font-weight:700;color:var(--dark);cursor:pointer;list-style:none}
.ms-details summary::-webkit-details-marker{display:none}
.ms-details summary .lett{font-weight:400;color:var(--grey)}
/* Chevron peker HØYRE lukket, NED åpen (5d) — ren CSS på details[open], ingen JS. */
.ms-details summary svg{transition:transform .15s ease}
.ms-details:not([open]) summary svg{transform:rotate(-90deg)}
.ms-doklenke{text-decoration:none;display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:48px;border-top:1px solid #EDE9E4;padding:0 2px}
.ms-doklenke .navn{font-size:17px;color:var(--dark)}
.ms-dokliste{display:flex;flex-direction:column;gap:2px;padding:4px 0 0}
/* ── TL-dans ── */
.ms-dansvelg{margin-top:auto}
.ms-dansvelg label{display:block;font-size:16px;font-weight:600;color:var(--grey2);margin:0 0 8px}
.ms-dansvelg select{width:100%;min-height:48px;font-size:17px;font-weight:600;color:var(--dark);
  background:#fff;border:1px solid var(--line);border-radius:999px;padding:0 18px}
/* ── Bruk-kort ── */
.ms-usecard{text-decoration:none;background:var(--soft);border-radius:16px;padding:20px 22px;
  display:flex;align-items:center;justify-content:space-between;gap:18px}
.ms-usecard:hover{box-shadow:0 2px 10px rgba(20,24,40,.08)}
.ms-usecard .k{display:block;font-size:16px;font-weight:600;color:var(--petrol)}
.ms-usecard .v{display:block;font-size:22px;font-weight:700;color:var(--dark);margin-top:5px}
/* ── Klassetrivsel ── */
.ms-klassekort{text-decoration:none;display:flex;align-items:center;justify-content:space-between;gap:18px;
  background:var(--soft);border-radius:16px;padding:20px 22px;color:inherit}
.ms-klassekort:hover{box-shadow:0 2px 10px rgba(20,24,40,.08)}
.ms-klassekort .navn{display:block;font-size:19px;font-weight:700;line-height:1.3;color:var(--dark)}
.ms-klassekort .undertekst{display:block;font-size:17px;line-height:1.5;color:var(--grey);margin-top:5px}
.ms-klassekort .les{flex:none;display:inline-flex;align-items:center;min-height:44px;font-size:16px;font-weight:700;color:var(--ink)}
.ms-klasseinner{display:flex;flex-direction:column;gap:20px;flex:1}
.ms-trivsel{display:flex;gap:20px;align-items:center;background:var(--soft);border-radius:16px;padding:20px 22px;flex:1}
.ms-trivsel>div{min-width:0}
.ms-trivsel .navn{display:flex;align-items:center;flex-wrap:wrap;gap:12px;font-size:19px;font-weight:700;color:var(--dark);margin:0 0 6px}
.ms-trivsel p{font-size:17px;line-height:1.55;color:var(--grey);margin:0}
/* ── Tipslister ── */
.ms-tipsboks{background:var(--soft);border-radius:16px;padding:20px 22px;margin-top:auto}
.ms-tipsboks .lbl{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;color:var(--dark);margin:0 0 14px}
.ms-tipsboks .lbl .lett{font-weight:400;color:var(--grey)}
/* ── Mest kjøpte leker ── */
.ms-klubbliste{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.ms-klubbrow{text-decoration:none;display:flex;align-items:center;gap:18px;min-height:80px;
  border-radius:16px;padding:10px 12px;color:inherit}
.ms-klubbrow:hover{background:var(--soft)}
.ms-klubbrow img,.ms-klubbrow .ph{width:60px;height:60px;flex:none;border-radius:14px;object-fit:cover;
  background:linear-gradient(135deg,#E4DFD9,#C7C0B8)}
.ms-klubbrow .midt{flex:1;min-width:0}
.ms-klubbrow .navn{display:block;font-size:18px;font-weight:600;color:var(--dark)}
.ms-klubbrow .kilde{display:flex;align-items:center;gap:5px;font-size:16px;font-weight:600;color:var(--ink);margin-top:3px}
.ms-klubbrow .kilde .lett{font-weight:400;color:var(--grey)}
.ms-klubbrow .pris{display:flex;align-items:baseline;gap:10px;flex:none}
.ms-klubbrow .forpris{font-size:17px;color:var(--grey);text-decoration:line-through}
.ms-klubbrow .npris{font-size:18px;font-weight:700;color:var(--dark)}
.ms-tomkort{background:var(--soft);border-radius:16px;padding:22px;display:flex;align-items:center;gap:22px}
.ms-tomkort .maskotring{flex:none;display:flex;align-items:flex-end;justify-content:center;width:148px;height:148px;border-radius:999px;background:#F7FBFB}
.ms-tomkort .maskotring img{height:136px;width:auto;display:block}
.ms-tomkort .tt{font-size:19px;font-weight:700;line-height:1.3;color:var(--dark);margin:0 0 6px}
.ms-tomkort p{font-size:17px;line-height:1.55;color:var(--grey);margin:0 0 16px}
.ms-ra{margin-top:14px;padding-top:14px;border-top:1px solid #F1EDE9;font-size:16px;line-height:1.5;color:var(--grey2)}
.ms-ra a{font-weight:700;color:var(--ink)}
/* ── Webinar ── */
.ms-webinar .rad .tittel{font-size:19px;font-weight:700;line-height:1.35;color:var(--dark);margin:0}
.ms-webinar .rad .meta{font-size:17px;color:var(--grey);margin:3px 0 14px}
.ms-webinar .tom{display:flex;align-items:center;gap:20px;background:var(--soft);border-radius:16px;padding:22px}
.ms-webinar .tom .ikon{flex:none;width:64px;height:64px;border-radius:999px;background:#EAF3F4;display:flex;align-items:center;justify-content:center}
.ms-webinar .tom .tt{font-size:19px;font-weight:700;line-height:1.3;color:var(--dark);margin:0 0 6px}
.ms-webinar .tom p{font-size:17px;line-height:1.55;color:var(--grey);margin:0 0 14px}
/* ── Fokus (WCAG): synlig markør overalt ── */
.ms a:focus-visible,.ms button:focus-visible,.ms summary:focus-visible,.ms select:focus-visible{
  outline:3px solid var(--petrol);outline-offset:3px;border-radius:6px}
.ms-count{font-size:17px;color:var(--grey)}
.ms-ra-avslutt{font-size:16px;line-height:1.6;color:var(--grey);margin:4px 0 0}
.ms-ra-avslutt a{font-weight:700;color:var(--ink)}
@media(max-width:900px){
  .ms-wrap{padding:20px 16px 28px}
  .ms-grid5{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .ms-grid2{grid-template-columns:1fr}
  .ms-aktuelt{grid-template-columns:1fr}
  .ms-tlprat{grid-template-columns:1fr;gap:12px}
  .ms-topline .dato{font-size:16px}
  .ms-topline h1{font-size:16px}
  .ms-tile{min-height:72px;border-radius:16px;padding:14px 16px}
  .ms-tile .t{font-size:16px}
  .ms-tile .n{font-size:16px}
  .ms-card{padding:20px}
  .ms-trivsel{flex-wrap:wrap}
  /* 5c: nominasjonskortet har INGEN maskoter på mobil — TL-praten og nedtrekkene i full bredde (F2). */
  .ms-nomlayout{display:block}
  .ms-maskoter{display:none}
}
`

// Petrol dokument-/lag-ikoner (fra designet). aria-hidden — dekorativt.
function Ikon({ navn }) {
  const felles = { width: 28, height: 28, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { color: '#106C75', flex: 'none' } }
  if (navn === 'dok') return (<svg {...felles}><path d="M9 4h14l4 4v20H9z" /><path d="M13 13h10M13 19h7" /></svg>)
  if (navn === 'lag') return (<svg {...felles}><circle cx="11" cy="11" r="4" /><circle cx="22" cy="12" r="3.5" /><path d="M4 26c1-4.5 3.6-7 7-7s6 2.5 7 7M19 26c.7-3.4 2.6-5.5 5-5.5s4.3 2.1 5 5.5" /></svg>)
  return null
}

// Petrol chevron ned (sammenleggbart nedtrekk).
function ChevronNed() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" style={{ color: '#106C75', flex: 'none' }} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7l6 6 6-6" /></svg>
  )
}

// Liten «søyle-sparkline» (dekorativ) for bruks-kortene.
function Spark({ label }) {
  const h = [38, 56, 74, 100]
  const farge = ['#BFDDE0', '#BFDDE0', '#7FBAC0', '#106C75']
  return (
    <span role="img" aria-label={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 48, flex: 'none' }}>
      {h.map((v, i) => (<span key={i} style={{ width: 9, borderRadius: 3, height: `${v}%`, background: farge[i] }} />))}
    </span>
  )
}

// Filtype-merke (PDF/PPTX …) på et dokument (design 5j). Ukjent/uten type → intet merke.
function Filmerke({ filtype }) {
  const f = (filtype || '').toLowerCase()
  if (!f) return null
  const stil = f.includes('ppt') ? 'pptx' : (f.includes('pdf') ? 'pdf' : 'pdf')
  return <span className={`ms-filmerke ${stil}`}>{f.includes('ppt') ? 'PPTX' : f.toUpperCase()}</span>
}

// Videoflate (design 5g): Bunny-førstebilde når guid finnes, ellers petrol flate med prikker.
// Spilleknappen ligger alltid oppå: mørk sirkel over foto (synlig mot vilkårlig bilde), hvit
// sirkel over petrol. Bildet feiler → petrol-fallback (aldri brutt bildeikon). Aldri autoplay —
// dette er en LENKE til lek-siden, der klikk-for-å-spille bor (WCAG 1.4.2).
function VideoFlate({ guid, playSize = 62, cap = null }) {
  const [feilet, setFeilet] = useState(false)
  const visThumb = !!guid && !feilet
  const t = Math.round(playSize * 0.38)
  return (
    <>
      {visThumb && (
        <img className="img" src={bunnyThumbUrl(guid)} alt="" aria-hidden="true" loading="lazy" onError={() => setFeilet(true)} />
      )}
      <span className={visThumb ? 'shade' : 'dots'} aria-hidden="true" />
      <span className="play" aria-hidden="true"
        style={{ width: playSize, height: playSize, background: visThumb ? 'rgba(14,16,18,.78)' : '#fff' }}>
        <svg width={t} height={t} viewBox="0 0 20 20"><path d="M6 3.5l10 6.5-10 6.5z" fill={visThumb ? '#fff' : '#106C75'} /></svg>
      </span>
      {cap}
    </>
  )
}

// Full-bredde videokort (TL-dans, Lekekurs) — lenke til lek-/samlingssiden.
function Videokort({ to, guid, tittel, sub, ariaLabel }) {
  return (
    <Link to={to} className="ms-video" aria-label={ariaLabel || tittel}>
      <VideoFlate guid={guid} cap={
        <span className="cap">
          <span className="tt">{tittel}</span>
          {sub && <span className="sb">{sub}</span>}
        </span>
      } />
    </Link>
  )
}

export default function SkoleHjem() {
  const { t, i18n } = useTranslation()
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
  const [tlpraten, setTlpraten] = useState(null)
  const [presentasjoner, setPresentasjoner] = useState({ oppstart: [], elevpres: [] })

  useEffect(() => {
    // Skole-kontekst → RA-oppslag når id finnes. Skolenavnet vises ikke her (det står ved
    // logoen øverst i topplinja, design 8d), så vi trenger bare id-en til RA-oppslaget.
    hentMinSkole().then((id) => {
      if (id) hentRegionansvarlig(id).then(setRa).catch(() => setRa(null))
    }).catch(() => {})

    hentMinsideSeksjoner(false).then(setSeksjoner).catch(() => setSeksjoner([]))
    hentAktuelt().then(setAktuelt).catch(() => setAktuelt([]))
    hentMestKjopt().then(setMestKjopt).catch(() => setMestKjopt({ maaned: null, leker: [] }))
    hentManedensLek().then(setManedslek).catch(() => setManedslek(null))
    hentManedensAktivLaering().then(setManedsAktiv).catch(() => setManedsAktiv(null))
    hentKommendeWebinarer().then((l) => setNesteWebinar(l[0] || null)).catch(() => setNesteWebinar(null))
    hentTipslister(i18n.language === 'sv' ? 'sv' : 'nb').then(setTipslister).catch(() => setTipslister([]))
    hentTLPraten(i18n.language === 'sv' ? 'sv' : 'nb').then(setTlpraten).catch(() => setTlpraten(null))
    hentNominasjonPresentasjoner().then(setPresentasjoner).catch(() => setPresentasjoner({ oppstart: [], elevpres: [] }))

    // Nøkkelbaserte samlinger MED innhold (låses opp av nøkkelmigrasjonen). Kortene viser én
    // knapp per lek/dokument; uteblir stille → «Kommer snart».
    const sp = i18n.language === 'sv' ? 'sv' : 'nb'
    hentSamlingKort('tl-dans', sp).then((s) => setSamlinger((p) => ({ ...p, tldans: s }))).catch(() => {})
    hentSamlingKort('laginndeling', sp).then((s) => setSamlinger((p) => ({ ...p, laginndeling: s }))).catch(() => {})
    hentSamlingKort('nominasjon', sp).then((s) => setSamlinger((p) => ({ ...p, nominasjon: s }))).catch(() => {})
    hentKursmodul(sp).then((s) => setSamlinger((p) => ({ ...p, kursmodul: s }))).catch(() => {})

    Promise.allSettled([hentPlaner(), hentHjul(), hentMineFavoritter(), hentMineDokumentFavoritter()]).then(
      ([p, h, fl, fd]) => setTellere({
        planer: p.status === 'fulfilled' ? p.value.length : null,
        hjul: h.status === 'fulfilled' ? h.value.length : null,
        favLek: fl.status === 'fulfilled' ? fl.value.size : null,
        favDok: fd.status === 'fulfilled' ? fd.value.size : null,
      }))
  }, [i18n.language])

  const datoTekst = useMemo(() => {
    const locale = i18n.language === 'sv' ? 'sv-SE' : 'nb-NO'
    try { return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
    catch { return '' }
  }, [i18n.language])

  // Rekkefølge for radene 3–8. Faller tilbake til designets rekkefølge om tabellen er tom.
  const raderIRekke = seksjoner && seksjoner.length
    ? seksjoner.map((s) => s.seksjon)
    : ['aktuelt', 'nominasjon', 'tldans', 'brukt_naa', 'klassetrivsel', 'mest_kjopt']

  return (
    <div className="ms">
      <style>{CSS}</style>
      <div className="ms-wrap">
        <div className="ms-cols">
          {/* ── 1 MINE VALG (med topplinje: overskrift + dato) ── */}
          <MineValg t={t} tellere={tellere} datoTekst={datoTekst} />

          {/* ── 2 VENTER PÅ SVAR ── datakilde ikke levert av migr 130–135; raden uteblir til den finnes. */}

          {/* ── 3–8: styrt av minside_seksjon ── */}
          {raderIRekke.map((key) => (
            <Seksjon
              key={key} navn={key} t={t}
              aktuelt={aktuelt} mestKjopt={mestKjopt} ra={ra}
              manedslek={manedslek} manedsAktiv={manedsAktiv} nesteWebinar={nesteWebinar}
              samlinger={samlinger} tipslister={tipslister}
              tlpraten={tlpraten} presentasjoner={presentasjoner}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Prøver kursmodulnøklene i tur (nøkkelmigrasjonen setter én av disse). Uteblir stille.
async function hentKursmodul(sprak = 'nb') {
  for (const nokkel of ['kursmodul-host-2026', 'kursmodul-host', 'kursmodul-vinter-2026', 'kursmodul']) {
    const s = await hentSamlingKort(nokkel, sprak).catch(() => null)
    if (harSamling(s)) return s
  }
  return null
}

function MineValg({ t, tellere, datoTekst }) {
  const tall = (n, nokkel) => (n != null ? t(nokkel, { antall: n }) : '')
  return (
    <section className="ms-sec" aria-labelledby="ms-mine">
      {/* Topplinje: «Mine valg» er sidens H1, full dato til høyre. Skolenavnet står ved logoen
          øverst (utenfor denne komponenten). Værstripa (design 5h) bygges ikke nå — plassen står tom. */}
      <div className="ms-topline">
        <h1 id="ms-mine">{t('minSide.hjem.mineValg')}</h1>
        <span className="hoyre">
          {datoTekst && <span className="dato">{datoTekst}</span>}
        </span>
      </div>
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
function Seksjon({ navn, t, aktuelt, mestKjopt, ra, manedslek, manedsAktiv, nesteWebinar, samlinger, tipslister, tlpraten, presentasjoner }) {
  if (navn === 'aktuelt') return <AktueltSeksjon t={t} aktuelt={aktuelt} />
  if (navn === 'nominasjon') return <NominasjonKurs t={t} samlinger={samlinger} tlpraten={tlpraten} presentasjoner={presentasjoner} />
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
    <section className="ms-card ms-aktuelt" aria-labelledby="ms-aktuelt">
      <div className="fig">
        {blokk.bilde_url ? (
          <img className="foto" src={blokk.bilde_url} alt={blokk.bilde_beskrivelse || ''} />
        ) : (
          <>
            <span className="dots" aria-hidden="true" />
            <img className="maskot" src="/minside/maskot-gutt-ro.png" alt="" aria-hidden="true" />
          </>
        )}
      </div>
      <div>
        <p className="ms-kicker">{t('minSide.hjem.aktuelt')}</p>
        <h2 id="ms-aktuelt">{blokk.overskrift}</h2>
        {blokk.tekst && <p className="tx">{blokk.tekst}</p>}
        {blokk.knapp_tekst && blokk.knapp_lenke && (
          <a className="ms-btn primary" href={blokk.knapp_lenke} target="_blank" rel="noopener noreferrer">
            {blokk.knapp_tekst}
          </a>
        )}
      </div>
    </section>
  )
}

// Ett dokument = én knapp som åpner PDF-en i ny fane. Uten url gir dokumentet ingen knapp.
// Filtypemerket vises kun der designet har det (Nominasjonsregler-knappen og inne i nedtrekkene),
// ikke på Kurshefte/Ark-knappene → visMerke er opt-in.
function DokKnapp({ tittel, url, filtype, visMerke = false }) {
  if (!url) return null
  return (
    <a className="ms-btn" href={url} target="_blank" rel="noopener noreferrer">
      <span>{tittel}</span>
      {visMerke && <Filmerke filtype={filtype} />}
    </a>
  )
}

// Ett nedtrekk med dokumenter (design 5j). Antallet telles fra dokumentene, hardkodes ikke.
// Filtypemerket står på HVERT dokument inne i nedtrekket, ikke på summary-knappen. Åpen som
// standard hvis `apen`. Ingen dokumenter → nedtrekket uteblir (unngår tomt nedtrekk).
// Alle nedtrekk er LUKKET ved innlasting (5d). «Oppstartsmøte» vises åpen i TEGNINGEN bare for
// å demonstrere dokumentradene — det er ikke standardtilstanden.
function DokNedtrekk({ t, tittel, dokumenter, dokTittel = (d) => d.tittel }) {
  const doks = (dokumenter || []).filter((d) => d.url)
  if (!doks.length) return null
  const antall = t('minSide.hjem.dokumenterTeller', { count: doks.length })
  return (
    <details className="ms-details">
      <summary aria-label={`${tittel} — ${antall}`}>
        <ChevronNed />
        {tittel} <span className="lett">— {antall}</span>
      </summary>
      <div className="ms-dokliste">
        {doks.map((d) => (
          <a key={d.id} className="ms-doklenke" href={d.url} target="_blank" rel="noopener noreferrer">
            <span className="navn">{dokTittel(d)}</span>
            <Filmerke filtype={d.filtype} />
          </a>
        ))}
      </div>
    </details>
  )
}

function NominasjonKurs({ t, samlinger, tlpraten, presentasjoner }) {
  const nom = samlinger.nominasjon
  const kurs = samlinger.kursmodul
  // Fra SAMLINGEN: Nominasjonsregler (egen knapp) + Nominasjonslapper (ett nedtrekk).
  const { regler, lapper } = nom ? delNominasjonSamling(nom.dokumenter) : { regler: null, lapper: [] }
  const reglerTittel = regler
    ? (nominasjonEtikettNokkel(regler.kilde_nid) ? t('minSide.hjem.nominasjonsregler') : regler.tittel)
    : null
  const harDok = regler || lapper.length || presentasjoner.oppstart.length || presentasjoner.elevpres.length
  const kursTittel = lekekursTittel(t('minSide.hjem.lekekurs'), kurs?.tittel)
  const kursVideoTittel = kurs?.tittel || kursTittel
  return (
    <div className="ms-grid2">
      <section className="ms-card" aria-labelledby="ms-nom">
        <h2 id="ms-nom" className="ms-h2 ms-h2ic"><Ikon navn="dok" />{t('minSide.hjem.nominasjon')}</h2>
        <p className="ms-sub">{t('minSide.hjem.nominasjonSub')}</p>

        {/* TL-praten som videoelement (lenker til lek-siden). Uten guid → petrol flate (design 5g). */}
        {tlpraten && (
          <Link to={`/min-side/aktiviteter/${tlpraten.id}`} className="ms-tlprat"
            aria-label={`${t('minSide.hjem.tlpraten')}: ${tlpraten.tittel || t('minSide.hjem.tlpratenNavn')}`}>
            <span className="flate">
              <VideoFlate guid={tlpraten.bunny_video_id} playSize={52} />
            </span>
            <span>
              <span className="kick">{t('minSide.hjem.tlpraten')}</span>
              <span className="navn">{tlpraten.tittel || t('minSide.hjem.tlpratenNavn')}</span>
              <span className="sub">{t('minSide.hjem.starterIkke')}</span>
            </span>
          </Link>
        )}

        {harDok ? (
          <div className="ms-nomlayout">
            <div className="ms-nomcol">
              {regler && <DokKnapp tittel={reglerTittel} url={regler.url} filtype={regler.filtype} visMerke />}
              <DokNedtrekk t={t} tittel={t('minSide.hjem.nominasjonslapper')} dokumenter={lapper} />
              <DokNedtrekk t={t} tittel={t('minSide.hjem.oppstartsmote')} dokumenter={presentasjoner.oppstart} />
              <DokNedtrekk t={t} tittel={t('minSide.hjem.elevpresentasjoner')} dokumenter={presentasjoner.elevpres} />
            </div>
            <div className="ms-maskoter" aria-hidden="true">
              <img src="/minside/maskot-jente-ro.png" alt="" style={{ height: 132 }} />
              <img src="/minside/maskot-gutt-ro.png" alt="" style={{ height: 124, marginLeft: -10 }} />
            </div>
          </div>
        ) : (!tlpraten && (
          <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
        ))}
      </section>

      <section className="ms-card" aria-labelledby="ms-kurs">
        <h2 id="ms-kurs" className="ms-h2">{kursTittel}</h2>
        <p className="ms-sub">{t('minSide.hjem.lekekursSub')}</p>
        {harSamling(kurs) ? (
          <>
            <Videokort to={`/min-side/samlinger/${kurs.id}`} guid={kurs.bunny_video_id}
              tittel={kursVideoTittel} ariaLabel={kursVideoTittel} />
            <div className="ms-btnrow" style={{ marginTop: 14 }}>
              {(kurs.dokumenter || []).map((d) => <DokKnapp key={d.id} tittel={d.tittel} url={d.url} filtype={d.filtype} />)}
              {kurs.leker && kurs.leker.length > 0 && (
                <Link className="ms-btn" to={`/min-side/samlinger/${kurs.id}`}>{t('minSide.hjem.lekeneIKurset')}</Link>
              )}
            </div>
          </>
        ) : (
          <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
        )}
      </section>
    </div>
  )
}

// Nedtrekk for tidligere danser — navigerer til lek-siden ved valg.
function DansVelger({ t, danser }) {
  const navigate = useNavigate()
  return (
    <div className="ms-dansvelg">
      <label htmlFor="ms-dans-sel">{t('minSide.hjem.velgTidligereDans')}</label>
      <select id="ms-dans-sel" defaultValue=""
              onChange={(e) => { if (e.target.value) navigate(`/min-side/aktiviteter/${e.target.value}`) }}>
        <option value="" disabled>{t('minSide.hjem.velgDans')}</option>
        {danser.map((d) => <option key={d.id} value={d.id}>{d.tittel}</option>)}
      </select>
    </div>
  )
}

function TlDansKort({ t, dans }) {
  // Prod-rekkefolge er ubrukelig (19 danser på rekkefolge 0) — sortér på tallet i tittelen,
  // nyeste (høyeste tall) først. Se sorterDanser i lib/minsideKort.
  const leker = sorterDanser((dans && dans.leker) || [])
  const nyeste = leker[0] || null
  const tidligere = leker.slice(1)
  return (
    <section className="ms-card" aria-labelledby="ms-dans">
      <div className="ms-sechead">
        <h2 id="ms-dans" className="ms-h2" style={{ margin: 0 }}>{t('minSide.hjem.tldans')}</h2>
        {leker.length > 0 && <span className="ms-count">{t('minSide.hjem.danserTeller', { antall: leker.length })}</span>}
      </div>
      <p className="ms-sub">{t('minSide.hjem.tldansSub')}</p>
      {!harSamling(dans) ? (
        <>
          <Videokort to="/min-side/aktiviteter" guid={null} tittel={t('minSide.hjem.tldans')} />
          <div className="ms-btnrow" style={{ marginTop: 14 }}><span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span></div>
        </>
      ) : nyeste ? (
        <>
          <div style={{ margin: '0 0 20px' }}>
            <Videokort to={`/min-side/aktiviteter/${nyeste.id}`} guid={nyeste.bunny_video_id}
              tittel={nyeste.tittel} sub={t('minSide.hjem.nyesteDansSub')} ariaLabel={nyeste.tittel} />
          </div>
          {tidligere.length > 0 && <DansVelger t={t} danser={tidligere} />}
        </>
      ) : (
        <div className="ms-btnrow"><Link className="ms-btn" to={`/min-side/samlinger/${dans.id}`}>{t('minSide.hjem.aapneDans')}</Link></div>
      )}
    </section>
  )
}

function LaginndelingKort({ t, lag }) {
  return (
    <section className="ms-card" aria-labelledby="ms-lag">
      <h2 id="ms-lag" className="ms-h2 ms-h2ic"><Ikon navn="lag" />{t('minSide.hjem.laginndeling')}</h2>
      <p className="ms-sub">{t('minSide.hjem.laginndelingSub')}</p>
      <img src="/minside/laginndeling.jpg" alt={t('minSide.hjem.laginndelingAlt')}
        style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', objectPosition: 'center 38%', borderRadius: 16, display: 'block', margin: '0 0 20px', background: '#FAF8F6' }} />
      {harSamling(lag) ? (
        <div className="ms-btnrow" style={{ marginTop: 'auto' }}>
          {(lag.leker || []).map((l) => (
            <Link key={l.id} className="ms-btn" to={`/min-side/aktiviteter/${l.id}`}>{l.tittel}</Link>
          ))}
          {(lag.dokumenter || []).map((d) => (
            <DokKnapp key={d.id} tittel={t('minSide.hjem.arkUtskrift')} url={d.url} filtype={d.filtype} />
          ))}
        </div>
      ) : (
        <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
      )}
    </section>
  )
}

function DansLag({ t, samlinger }) {
  return (
    <div className="ms-grid2">
      <TlDansKort t={t} dans={samlinger.tldans} />
      <LaginndelingKort t={t} lag={samlinger.laginndeling} />
    </div>
  )
}

function BruktKort({ to, kicker, navn, meta, label }) {
  return (
    <Link to={to} className="ms-usecard" aria-label={`${kicker}: ${navn}`}>
      <span>
        <span className="k">{kicker}</span>
        <span className="v">{navn}</span>
        {meta && <span style={{ display: 'block', fontSize: 17, color: '#5C6066', marginTop: 3 }}>{meta}</span>}
      </span>
      <Spark label={label} />
    </Link>
  )
}

function BruktNaa({ t, manedslek, manedsAktiv }) {
  if (!manedslek && !manedsAktiv) return null
  return (
    <section className="ms-card" aria-labelledby="ms-bruk">
      <div className="ms-sechead" style={{ marginBottom: 14 }}>
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

// De tre KRØ-tipslistene vises som ÉN «Kroppsøving»-oppføring med tre trinn-knapper.
const KRO_TRINN = {
  'tips-kro-1-2': 'minSide.hjem.tipsTrinn12',
  'tips-kro-3-4': 'minSide.hjem.tipsTrinn34',
  'tips-kro-5-7': 'minSide.hjem.tipsTrinn57',
}

function TipslisteInnhold({ t, tipslister }) {
  const andre = tipslister.filter((s) => !KRO_TRINN[s.nokkel])
  const kro = tipslister
    .filter((s) => KRO_TRINN[s.nokkel])
    .sort((a, b) => a.nokkel.localeCompare(b.nokkel))
  return (
    <>
      {andre.length > 0 && (
        <div className="ms-btnrow" style={{ margin: '0 0 20px' }}>
          {andre.map((s) => (
            <Link key={s.id} className="ms-btn" to={`/min-side/samlinger/${s.id}`}>{stripTipslistePrefiks(s.tittel)}</Link>
          ))}
        </div>
      )}
      {kro.length > 0 && (
        <div className="ms-tipsboks">
          <p className="lbl">
            <ChevronNed />
            {t('minSide.hjem.tipsKroppsoving')}{' '}
            <span className="lett">— {t('minSide.hjem.tipsKroppsovingSub')}</span>
          </p>
          <div className="ms-btnrow">
            {kro.map((s) => (
              <Link
                key={s.id} className="ms-btn" to={`/min-side/samlinger/${s.id}`}
                aria-label={`${t('minSide.hjem.tipsKroppsoving')} ${t(KRO_TRINN[s.nokkel])}`}
              >
                {t(KRO_TRINN[s.nokkel])}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function KlasseTips({ t, tipslister }) {
  return (
    <div className="ms-grid2">
      <section className="ms-card" aria-labelledby="ms-klasse">
        <h2 id="ms-klasse" className="ms-h2">{t('minSide.hjem.klassetrivsel')}</h2>
        <p className="ms-sub">{t('minSide.hjem.klassetrivselSub')}</p>
        <div className="ms-klasseinner">
          {/* «Kjetil og Kjartans tips» — venter på plassering/kilde; vises som Kommer snart. */}
          <div className="ms-klassekort" aria-label={t('minSide.hjem.kjetilKjartan')} role="group">
            <span>
              <span className="navn">{t('minSide.hjem.kjetilKjartan')}</span>
              <span className="undertekst">{t('minSide.hjem.kjetilKjartanKilde')}</span>
            </span>
            <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
          </div>
          <div className="ms-trivsel">
            <svg width="104" height="104" viewBox="0 0 100 100" role="img" aria-label={t('minSide.hjem.trivselsaaret')} style={{ flex: 'none' }}>
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
              <circle cx="50" cy="50" r="15" fill="#FAF8F6" />
            </svg>
            <div>
              <p className="navn">{t('minSide.hjem.trivselsaaret')}
                <span className="ms-pill">{t('minSide.hjem.kommerSnart')}</span>
              </p>
              <p>{t('minSide.hjem.trivselsaaretSub')}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="ms-card" aria-labelledby="ms-tips">
        <h2 id="ms-tips" className="ms-h2">{t('minSide.hjem.tipslister')}</h2>
        <p className="ms-sub">{t('minSide.hjem.tipslisterSub')}</p>
        {tipslister.length ? (
          <TipslisteInnhold t={t} tipslister={tipslister} />
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
        <p className="ms-sub">{t('minSide.hjem.mestKjoptSub')}</p>
        {mestKjopt.leker.length > 0 ? (
          <ol className="ms-klubbliste">
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
                    ? <img src={k.bilde_url} alt="" aria-hidden="true" />
                    : <span className="ph" aria-hidden="true" />}
                  <span className="midt">
                    <span className="navn">{k.navn}</span>
                    <span className="kilde" aria-hidden="true">klubben.no
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h7v7M13 3L4 12" /></svg>
                      <span className="lett">{t('minSide.hjem.aapnesNyFane')}</span>
                    </span>
                  </span>
                  <span className="pris" aria-hidden="true">
                    {k.forpris != null && <span className="forpris">{kr(k.forpris)}</span>}
                    <span className="npris">{kr(k.pris)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <div className="ms-tomkort">
            <span className="maskotring"><img src="/minside/maskot-gutt-ro.png" alt="" aria-hidden="true" /></span>
            <div>
              <p className="tt">{t('minSide.hjem.mestKjoptTom')}</p>
              <p>{t('minSide.hjem.mestKjoptTomSub')}</p>
            </div>
          </div>
        )}
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
    <section className="ms-card ms-webinar" aria-labelledby="ms-web" style={{ background: '#EAF3F4' }}>
      <h2 id="ms-web" className="ms-h2">{t('minSide.hjem.webinarer')}</h2>
      <p className="ms-sub">{t('minSide.hjem.webinarerSub')}</p>
      {webinar ? (
        <div className="rad">
          <p className="tittel">{webinar.tittel}</p>
          <p className="meta">{datoBlokk(webinar.starter_at).dag}. {datoBlokk(webinar.starter_at).maaned} · kl. {klokkeslett(webinar.starter_at)} · <span>{n.tekst}</span></p>
          <Link className="ms-btn primary" to="/min-side/webinarer">{t('minSide.hjem.meldPaa')}</Link>
        </div>
      ) : (
        <div className="tom">
          <span className="ikon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" style={{ color: '#106C75' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="3" /><path d="M10 4v5M22 4v5M4 14h24" /></svg>
          </span>
          <div>
            <p className="tt">{t('minSide.hjem.ingenWebinarTittel')}</p>
            <p>{t('minSide.hjem.ingenWebinar')}</p>
            <Link className="ms-btn" to="/min-side/webinarer">{t('minSide.hjem.seTidligereOpptak')}</Link>
          </div>
        </div>
      )}
    </section>
  )
}
