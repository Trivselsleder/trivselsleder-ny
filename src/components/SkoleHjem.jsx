import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentLeker, sokLeker, trinnKort, TRINN_NO } from '../lib/leker'
import { hentMineFavoritter } from '../lib/favoritter'
import { hentPlaner } from '../lib/periodeplan'
import { hentHjul } from '../lib/hjul'
import { hentKommendeWebinarer, datoBlokk, klokkeslett } from '../lib/webinar'
import { useNedtelling } from './webinar/Nedtelling'

// Bygget 1:1 fra min-side-mockup_4.html (den vi har iterert på), koblet til ekte data.
const CSS = `
.tlh{ --o:#FF7B31; --petrol:#106C75; --dark:#2B2B2B; --grey:#5B6470; --line:#ECEEF1; --soft:#FDEEE2; }
.tlh *{box-sizing:border-box}
.tlh-hero{background:linear-gradient(135deg,#fff 0%,#FFF6EF 100%);border-bottom:1px solid var(--line);border-radius:20px;padding:34px 26px 26px}
.tlh-hero h1{font-size:30px;font-weight:800;letter-spacing:-.3px;color:var(--dark)}
.tlh-hero .sub{color:var(--grey);margin-top:6px;font-size:16px}
.tlh-searchbox{margin-top:20px;background:#fff;border:2px solid var(--o);border-radius:16px;box-shadow:0 6px 24px rgba(255,123,49,.12);padding:6px 6px 6px 18px;display:flex;align-items:center;gap:10px}
.tlh-searchbox svg{flex:0 0 22px}
.tlh-searchbox input{flex:1;border:0;outline:0;font-size:17px;padding:14px 0;background:transparent;color:var(--dark);min-width:0}
.tlh-searchbox input::placeholder{color:#9aa1ab}
.tlh-searchbox button{border:0;background:var(--o);color:#fff;font-weight:700;font-size:15px;padding:13px 22px;border-radius:11px;cursor:pointer;white-space:nowrap}
.tlh-searchbox button:hover{filter:brightness(.95)}
.tlh-chips{margin-top:14px;display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.tlh-chips .lbl{color:var(--grey);font-size:13px;margin-right:2px}
.tlh-chip{border:1px solid #E4D3C4;background:#fff;color:#8a5a2f;font-size:13.5px;font-family:inherit;padding:7px 13px;border-radius:999px;cursor:pointer;transition:.12s}
.tlh-chip:hover{background:var(--soft);border-color:var(--o)}
.tlh-parse{margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.tlh-parse .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tlh-parse .said{color:var(--grey);font-size:14px}
.tlh-parse .said b{color:var(--dark)}
.tlh-fchip{display:inline-flex;align-items:center;gap:6px;background:var(--soft);color:#B5560F;font-weight:700;font-size:13px;padding:6px 11px;border-radius:8px}
.tlh-parse .note{margin-top:10px;font-size:13px;color:var(--grey)}
.tlh-backlink{display:inline-block;margin-top:16px}
.tlh-backlink a,.tlh-backlink button{color:var(--o);font-weight:700;text-decoration:none;font-size:14px;font-family:inherit;background:none;border:0;padding:0;cursor:pointer}
.tlh-backrow{margin-top:18px}
.tlh-back{display:inline-flex;align-items:center;gap:8px;background:#fff;border:2px solid var(--petrol);color:var(--petrol);font-weight:700;font-size:15px;font-family:inherit;padding:11px 20px;border-radius:11px;cursor:pointer;transition:.12s}
.tlh-back:hover{background:var(--petrol);color:#fff}
.tlh-back:focus-visible{outline:3px solid var(--o);outline-offset:2px}
.tlh-brow{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;margin-top:22px}
.tlh-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}
.tlh-panel h2{font-size:16px;margin-bottom:4px;color:var(--dark)}
.tlh-panel .s{color:var(--grey);font-size:13.5px;margin-bottom:14px}
.tlh-ctx{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tlh-ctx a,.tlh-ctx button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;text-decoration:none;color:var(--dark);background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 12px;font-weight:600;font-size:14px;font-family:inherit;transition:.12s;cursor:pointer}
.tlh-ctx a:hover,.tlh-ctx button:hover{border-color:var(--o);background:#FFF8F2}
.tlh-ctx .ic{width:26px;height:26px;border-radius:8px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 26px}
.tlh-month{display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;border-radius:12px;padding:6px;margin:-6px}
.tlh-month:hover{background:#fff7f1}
.tlh-month:hover h3{color:#0d565e}
.tlh-month .thumb{flex:0 0 84px;height:84px;border-radius:12px;background:linear-gradient(135deg,#FDEEE2,#FBE9C7);display:flex;align-items:center;justify-content:center;color:#c98a3a;font-weight:800}
.tlh-month h3{font-size:17px}
.tlh-month .why{font-size:13px;color:var(--grey);margin-top:3px}
.tlh-mine{display:flex;gap:10px;flex-wrap:nowrap;margin-top:6px}
.tlh-mine a{flex:1;min-width:0;text-decoration:none;color:var(--dark);border:1px solid var(--line);border-radius:12px;padding:14px 10px;text-align:center;font-weight:700;font-size:14px}
.tlh-mine a:hover{border-color:var(--petrol);color:#0d565e}
.tlh-mine a small{display:block;font-weight:400;color:var(--grey);font-size:12px;margin-top:3px}
.tlh-results h2{font-size:18px;margin-bottom:2px;color:var(--dark)}
.tlh-results .cnt{color:var(--grey);font-size:14px;margin-bottom:16px}
.tlh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tlh-lek{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:.14s;cursor:pointer;text-decoration:none;color:inherit;display:block}
.tlh-lek:hover{box-shadow:0 8px 22px rgba(0,0,0,.08);transform:translateY(-2px)}
.tlh-lek .ph{height:104px;background:linear-gradient(135deg,#FDEEE2,#FBE9C7);display:flex;align-items:center;justify-content:center;color:#c98a3a;font-size:13px;font-weight:700;letter-spacing:.5px}
.tlh-lek .body{padding:12px 14px}
.tlh-lek h3{font-size:16px;margin-bottom:6px}
.tlh-lek .meta{font-size:12.5px;color:var(--grey);margin-bottom:9px}
.tlh-tags{display:flex;gap:6px;flex-wrap:wrap}
.tlh-tag{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:#EEF1F4;color:#5B6470}
.tlh-tag.o{background:var(--soft);color:#B5560F}
@media(max-width:820px){.tlh-brow{grid-template-columns:1fr}.tlh-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.tlh-grid{grid-template-columns:1fr}.tlh-hero h1{font-size:24px}}
`

// Tolke-lag: fritekst → felt (som mockupen, men mot ekte «egnet for»-verdier).
function parseQ(t) {
  t = (t || '').toLowerCase()
  const f = {}
  if (/sfo|aks/.test(t)) { f.egnet = 'SFO/AKS'; f._key = 'sfo' }
  else if (/kroppsøv|gymtime/.test(t)) { f.egnet = 'Kroppsøving'; f._key = 'kroppsøv' }
  else if (/aktive? pause/.test(t)) { f.egnet = 'Move it'; f._key = 'aktive pause' }
  else if (/aktivitetsdag/.test(t)) { f.egnet = 'Aktivitetsdager'; f._key = 'aktivitetsdag' }
  else if (/friminutt/.test(t)) { f.egnet = 'Friminutt'; f._key = 'friminutt' }
  else if (/aktiv læring|matte|matematikk|\bnorsk\b|\bfag\b/.test(t)) { f.egnet = 'Aktiv læring'; f._key = 'aktiv læring' }
  else if (/fysak|uteskole/.test(t)) { f.egnet = 'FYSAK'; f._key = 'fysak' }
  else if (/bli.?kjent|klassemilj|trivsel|første skoledag/.test(t)) { f.egnet = 'Bli kjent / klassemiljø'; f._key = 'kjent' }
  else if (/sosial kompetanse|vennskap|inkluder/.test(t)) { f.egnet = 'Sosial kompetanse'; f._key = 'sosial' }
  else if (/tl-?mester|turnering/.test(t)) { f.egnet = 'TL-Mester'; f._key = 'mester' }
  else if (/100\s*\+|hundre|mange elever|stor gruppe/.test(t)) { f.egnet = 'Leker for 100+ elever'; f._key = '100' }
  else if (/barnehage|førskole/.test(t)) { f.trinn = 'Barnehage'; f._key = 'barnehage' }
  if (/\bute|utend|uteskole/.test(t)) f.sted = 'Ute'
  else if (/\binne|klasserom/.test(t)) f.sted = 'Inne'
  const mt = t.match(/(\d+)\s*(barn|elever|stk)/); if (mt) f.antall = '~' + mt[1] + ' barn'
  const tr = t.match(/(\d+)\.?\s*trinn/); if (tr) f.trinn = tr[1] + '. trinn'
  if (/uten utstyr/.test(t)) f.utstyr = 'Uten utstyr'
  if (/rolig/.test(t)) f.stemning = 'Rolig'
  return f
}

function visLek(l) {
  const sted = l.sted === 'begge' ? 'Inne/ute' : (l.sted ? l.sted[0].toUpperCase() + l.sted.slice(1) : '–')
  return {
    id: l.id,
    n: l.tittel,
    sted,
    trinn: trinnKort(l.trinn).replace(/ trinn/g, ''),
    antall: (l.antallMin != null && l.antallMaks != null) ? `${l.antallMin}–${l.antallMaks}` : '–',
    utstyr: l.utstyr.length ? l.utstyr.join(', ') : 'Ingen',
    egnet: l.egnet,
    m: l.utenUtstyr ? 'Uten utstyr' : (l.egnet[0] || ''),
    _sted: l.sted, _utenUtstyr: l.utenUtstyr,
  }
}
// Formar en rad fra søke-RPC-en (sok_leker, migr 089) til samme visningsform som
// visLek. RPC-en leverer ikke utstyrsnavn i listevisningen (kun uten_utstyr), så
// utstyr vises som «Ingen» / «–» her — de fulle navnene ligger på lekesiden.
function visLekRPC(l) {
  const sted = l.sted === 'begge' ? 'Inne/ute' : (l.sted ? l.sted[0].toUpperCase() + l.sted.slice(1) : '–')
  const egnet = l.egnet || []
  return {
    id: l.id,
    n: l.tittel,
    sted,
    trinn: trinnKort(l.trinn).replace(/ trinn/g, ''),
    antall: (l.antallMin != null && l.antallMaks != null) ? `${l.antallMin}–${l.antallMaks}` : '–',
    utstyr: l.utenUtstyr ? 'Ingen' : '–',
    egnet,
    m: l.utenUtstyr ? 'Uten utstyr' : (egnet[0] || ''),
  }
}

// Gjør tolkede felt (parseQ) om til RPC-filtre. Når tolkningen gir minst ett filter
// er dette et situasjonssøk («SFO ute 4. trinn») → filtrér på det. Gir tolkningen
// ingenting, er det et fritekst-/tittelsøk → da sender vi teksten til RPC-en som
// gjør skrivefeil-toleransen (trgm) i basen (jf. «balfangeren» → «Ballfangeren»).
function filtreFraParse(f) {
  const ut = {}
  if (f.egnet) ut.egnet = f.egnet
  if (f.sted) ut.sted = f.sted.toLowerCase()
  if (f.utstyr === 'Uten utstyr') ut.utenUtstyr = true
  if (f.trinn) {
    const par = TRINN_NO.find(([, navn]) => navn === f.trinn)
    if (par) ut.trinn = par[0]
  }
  return ut
}

export default function SkoleHjem({ fornavn = null }) {
  const [params, setParams] = useSearchParams()
  const { t } = useTranslation()
  const [alle, setAlle] = useState([])
  const qParam = (params.get('q') || '').trim()
  const aktivQ = qParam || null                 // ?q= i adressen = viser resultater (delbar, F5-trygg, back-knappen virker)
  const [q, setQ] = useState(qParam)            // inputfeltets tekst mens man skriver
  const [resultater, setResultater] = useState({ items: [], direkte: false, laster: false })
  const [teller, setTeller] = useState({ planer: null, hjul: null, fav: null })
  const [nesteWebinar, setNesteWebinar] = useState(undefined) // undefined=laster, null=ingen
  const sokRef = useRef(0) // race-vakt: kun ferskeste søkesvar teller

  useEffect(() => {
    hentKommendeWebinarer().then((liste) => setNesteWebinar(liste[0] || null)).catch(() => setNesteWebinar(null))
    hentLeker().then((r) => setAlle(r.map(visLek))).catch(() => {})
    Promise.allSettled([hentPlaner(), hentHjul(), hentMineFavoritter()]).then(([p, h, f]) => {
      setTeller({
        planer: p.status === 'fulfilled' ? p.value.length : null,
        hjul: h.status === 'fulfilled' ? h.value.length : null,
        fav: f.status === 'fulfilled' ? f.value.size : null,
      })
    })
  }, [])

  // Hold inputfeltet i takt med adressen (back/forward, «Min side»-fanen, chip-klikk).
  useEffect(() => { setQ(qParam) }, [qParam])

  const parsed = useMemo(() => (aktivQ ? parseQ(aktivQ) : null), [aktivQ])

  // Søk via basen (sok_leker, migr 089): den rangerer og skrivefeil-tolererer i
  // Postgres. «Direkte treff» = RPC-en returnerte minst én rad — dvs. noe klarte
  // relevansterskelen (eksakt/delstreng/fulltekst/trgm ≥ 0,30). Da slipper vi den
  // gamle browser-utregningen som krevde eksakt delstreng i tittelen og derfor
  // dumpet skrivefeil-treff («balfangeren» → «Ballfangeren») i forslagsbøtta.
  // Ingen treff → behold forslagstilstanden og vis nærmeste alternativer.
  useEffect(() => {
    if (!aktivQ) { setResultater({ items: [], direkte: false, laster: false }); return }
    const id = ++sokRef.current
    setResultater((r) => ({ ...r, laster: true }))
    const filtre = filtreFraParse(parsed || {})
    const harFiltre = Object.keys(filtre).length > 0
    const args = harFiltre ? { ...filtre, limit: 6 } : { sok: aktivQ, limit: 6 }
    sokLeker(args)
      .then(({ leker }) => {
        if (id !== sokRef.current) return
        const items = (leker || []).map(visLekRPC)
        if (items.length) setResultater({ items, direkte: true, laster: false })
        else setResultater({ items: alle.slice(0, 6), direkte: false, laster: false })
      })
      .catch(() => {
        if (id !== sokRef.current) return
        setResultater({ items: alle.slice(0, 6), direkte: false, laster: false })
      })
  }, [aktivQ, parsed, alle])

  function run(tekst) {
    const tekstQ = (tekst ?? q).trim()
    if (!tekstQ) return
    // Skriv søket til adressen: ny historikk-oppføring → nettleserens back virker,
    // F5 beholder resultatet, og lenka kan deles. Samme mønster som Finn en lek.
    setParams({ q: tekstQ })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // Tilbake til forsiden av Min side (fjerner ?q). Samme effekt som å klikke «Min side»-fanen.
  function reset() { setParams({}) }

  const manedslek = alle.find((l) => /haien kommer/i.test(l.n)) || null
  const pills = parsed
    ? Object.entries(parsed).filter(([k]) => !k.startsWith('_')).map(([, v]) => v)
    : []

  return (
    <div className="tlh">
      <style>{CSS}</style>

      {/* Hero */}
      <section className="tlh-hero">
        <h1>Hva trenger du i dag{fornavn ? `, ${fornavn}` : ''}?</h1>
        <p className="sub">Beskriv situasjonen din med egne ord — så finner vi lekene som passer.</p>
        <div className="tlh-searchbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FF7B31" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run() }}
            type="text" aria-label="Beskriv situasjonen din" placeholder="F.eks. leker til SFO utendørs til 10 barn på 4. trinn" />
          <button type="button" onClick={() => run()}>Vis leker</button>
        </div>
        <div className="tlh-chips">
          <span className="lbl">Prøv:</span>
          <button type="button" className="tlh-chip" onClick={() => run('Leker til SFO utendørs til 10 barn på 4. trinn')}>SFO ute · 4. trinn</button>
          <button type="button" className="tlh-chip" onClick={() => run('Aktiv pause i klasserommet, kort og rolig')}>Aktiv pause · inne</button>
          <button type="button" className="tlh-chip" onClick={() => run('Kroppsøving oppvarming for hel klasse')}>Kroppsøving · oppvarming</button>
          <button type="button" className="tlh-chip" onClick={() => run('Aktivitetsdag med stasjoner for hele skolen')}>Aktivitetsdag</button>
          <button type="button" className="tlh-chip" onClick={() => run('Aktiv læring matematikk ute 5. trinn')}>Aktiv læring · matte</button>
        </div>

        {aktivQ && (
          <div className="tlh-parse">
            <div className="row"><span className="said">Vi forsto: <b>«{aktivQ}»</b></span></div>
            <div className="row" style={{ marginTop: 10 }}>
              {pills.length ? pills.map((v, i) => (
                <span key={i} className="tlh-fchip">{v}</span>
              )) : <span className="said">Fritekstsøk i hele biblioteket</span>}
            </div>
          </div>
        )}
        {aktivQ && (
          <div className="tlh-backrow">
            <button type="button" className="tlh-back" onClick={reset}>
              <span aria-hidden="true">←</span> {t('minSide.tilbake')}
            </button>
          </div>
        )}
      </section>

      {/* Resultater (inline) */}
      {aktivQ && (
        <section className="tlh-results" style={{ marginTop: 26 }}>
          <h2>
            {resultater.laster && resultater.items.length === 0
              ? t('minSide.sok.laster')
              : resultater.direkte ? t('minSide.sok.treffTittel') : t('minSide.sok.ingenTittel')}
          </h2>
          {!(resultater.laster && resultater.items.length === 0) && (
            <div className="cnt">
              {resultater.direkte
                ? t('minSide.sok.treffTeller', { antall: resultater.items.length })
                : t('minSide.sok.forslagTeller')}
            </div>
          )}
          <div className="tlh-grid">
            {resultater.items.map((l) => (
              <Link key={l.id} to={`/min-side/aktiviteter/${l.id}`} className="tlh-lek">
                <div className="ph">{(l.n.split(' ')[0] || '').toUpperCase()}</div>
                <div className="body">
                  <h3>{l.n}</h3>
                  <div className="meta">{[l.sted, l.trinn, l.antall, l.utstyr].filter(Boolean).join(' · ')}</div>
                  <div className="tlh-tags">
                    {l.egnet.slice(0, 3).map((e, i) => <span key={i} className="tlh-tag o">{e}</span>)}
                    {l.m && <span className="tlh-tag">{l.m}</span>}
                  </div>
                </div>
              </Link>
            ))}
            {resultater.items.length === 0 && !resultater.laster && <p className="cnt">{t('minSide.sok.ingenMatchet')}</p>}
          </div>
        </section>
      )}

      {/* Idle-blokker (skjules når resultater vises) */}
      {!aktivQ && (
        <div className="tlh-brow">
          <div className="tlh-panel">
            <h2>Søk i biblioteket</h2>
            <p className="s">60 aktive minutter — én lek om gangen.</p>
            <div className="tlh-ctx">
              <button type="button" onClick={() => run('Friminuttleker for mellomtrinnet')}><span className="ic">🏃</span> Friminutt</button>
              <button type="button" onClick={() => run('Kroppsøving oppvarming for hel klasse')}><span className="ic">🤸</span> Kroppsøving</button>
              <button type="button" onClick={() => run('Leker til SFO utendørs til 10 barn på 4. trinn')}><span className="ic">🧩</span> SFO/AKS</button>
              <Link to="/min-side/aktiv-laering"><span className="ic">📚</span> Aktiv læring</Link>
              <button type="button" onClick={() => run('Aktiv pause i klasserommet, kort og rolig')}><span className="ic">⏸️</span> Move it</button>
              <button type="button" onClick={() => run('FYSAK uteskole lavterskel')}><span className="ic">🌲</span> FYSAK</button>
              <button type="button" onClick={() => run('Bli kjent og godt klassemiljø første skoledag')}><span className="ic">🤝</span> Bli kjent / klassemiljø</button>
              <button type="button" onClick={() => run('Aktivitetsdag med stasjoner for hele skolen')}><span className="ic">🎪</span> Aktivitetsdager</button>
              <button type="button" onClick={() => run('Sosial kompetanse og vennskap')}><span className="ic">🤗</span> Sosial kompetanse</button>
              <button type="button" onClick={() => run('TL-Mester turnering')}><span className="ic">🏅</span> TL-Mester</button>
              <button type="button" onClick={() => run('Leker for over 100 elever samtidig')}><span className="ic">👥</span> Leker for 100+ elever</button>
              <button type="button" onClick={() => run('Leker for barnehage')}><span className="ic">🧸</span> Barnehage</button>
            </div>
          </div>
          <div className="tlh-panel">
            <h2>Månedens lek</h2>
            <Link className="tlh-month" to={manedslek ? `/min-side/aktiviteter/${manedslek.id}` : '/min-side/aktiviteter'}>
              <div className="thumb">{manedslek ? (manedslek.n.split(' ')[0] || '').toUpperCase() : 'LEK'}</div>
              <div>
                <h3>{manedslek ? manedslek.n : 'Haien kommer'}</h3>
                <div className="why">Kort, aktiv sisten-lek ute — ingen utstyr.</div>
              </div>
            </Link>
            <div style={{ height: 30 }} />
            <h2>Mine ting</h2>
            <div className="tlh-mine">
              <Link to="/min-side/periodeplaner">Planer<small>{teller.planer != null ? `${teller.planer} periodeplaner` : 'periodeplaner'}</small></Link>
              <Link to="/min-side/tl-hjulet">TL-hjul<small>{teller.hjul != null ? `${teller.hjul} hjul` : 'hjul'}</small></Link>
              <Link to="/min-side/aktiviteter?fav=1">Favoritter<small>{teller.fav != null ? `${teller.fav} leker` : 'leker'}</small></Link>
            </div>
          </div>
        </div>
      )}

      {/* Webinar-boks — alltid synlig i idle, viser nærmeste eller rolig tomtilstand */}
      {!aktivQ && nesteWebinar !== undefined && (
        <WebinarBoks webinar={nesteWebinar} />
      )}
    </div>
  )
}

// Boks på Min side: nærmeste webinar (m/ nedtelling) eller tomtilstand. Klikk → /min-side/webinarer.
function WebinarBoks({ webinar }) {
  const n = useNedtelling(webinar?.starter_at || new Date().toISOString(), webinar?.varighet_min)
  if (!webinar) {
    return (
      <Link to="/min-side/webinarer" className="block mt-5 rounded-2xl border border-gray-200 bg-white p-5 hover:border-orange/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🎥</span>
          <div>
            <h2 className="font-bold text-gray-900">Webinarer</h2>
            <p className="text-sm text-gray-500">Ingen planlagte akkurat nå — du får e-post når neste nettverksmøte er klart.</p>
          </div>
        </div>
      </Link>
    )
  }
  const b = datoBlokk(webinar.starter_at)
  return (
    <Link to="/min-side/webinarer" className="block mt-5 rounded-2xl border border-petrol/30 bg-petrol/5 p-5 hover:border-petrol/60 transition-colors">
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-16 text-center rounded-xl overflow-hidden border border-gray-200 bg-white">
          <div className="bg-orange text-gray-900 text-[11px] font-bold uppercase py-0.5">{b.maaned}</div>
          <div className="py-1.5"><div className="text-2xl font-extrabold leading-none text-gray-900">{b.dag}</div><div className="text-[11px] text-gray-500 capitalize">{b.ukedag}</div></div>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-teal">Neste webinar</span>
          <h2 className="font-bold text-gray-900 leading-snug truncate">{webinar.tittel}</h2>
          <p className="text-sm text-gray-600">kl. {klokkeslett(webinar.starter_at)} · <span className={n.bliMedNaa ? 'text-petrol font-semibold' : ''}>{n.tekst}</span></p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-gray-900 bg-orange px-4 py-1.5 rounded-full">Meld på</span>
      </div>
    </Link>
  )
}
