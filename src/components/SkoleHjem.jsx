import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hentLeker, trinnKort } from '../lib/leker'
import { hentMineFavoritter } from '../lib/favoritter'
import { hentPlaner } from '../lib/periodeplan'
import { hentHjul } from '../lib/hjul'

// Bygget 1:1 fra min-side-mockup_4.html (den vi har iterert på), koblet til ekte data.
const CSS = `
.tlh{ --o:#FF7B31; --magenta:#D6006E; --dark:#2B2B2B; --grey:#5B6470; --line:#ECEEF1; --soft:#FDEEE2; }
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
.tlh-chip{border:1px solid #E4D3C4;background:#fff;color:#8a5a2f;font-size:13.5px;padding:7px 13px;border-radius:999px;cursor:pointer;transition:.12s}
.tlh-chip:hover{background:var(--soft);border-color:var(--o)}
.tlh-parse{margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.tlh-parse .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tlh-parse .said{color:var(--grey);font-size:14px}
.tlh-parse .said b{color:var(--dark)}
.tlh-fchip{display:inline-flex;align-items:center;gap:6px;background:var(--soft);color:#b5590f;font-weight:700;font-size:13px;padding:6px 11px;border-radius:8px}
.tlh-parse .note{margin-top:10px;font-size:13px;color:var(--grey)}
.tlh-backlink{display:inline-block;margin-top:16px}
.tlh-backlink a{color:var(--o);font-weight:700;text-decoration:none;font-size:14px;cursor:pointer}
.tlh-brow{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;margin-top:22px}
.tlh-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}
.tlh-panel h2{font-size:16px;margin-bottom:4px;color:var(--dark)}
.tlh-panel .s{color:var(--grey);font-size:13.5px;margin-bottom:14px}
.tlh-ctx{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tlh-ctx a{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--dark);border:1px solid var(--line);border-radius:11px;padding:11px 12px;font-weight:600;font-size:14px;transition:.12s;cursor:pointer}
.tlh-ctx a:hover{border-color:var(--o);background:#FFF8F2}
.tlh-ctx .ic{width:26px;height:26px;border-radius:8px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 26px}
.tlh-month{display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;border-radius:12px;padding:6px;margin:-6px}
.tlh-month:hover{background:#fff7f1}
.tlh-month:hover h3{color:#b0125f}
.tlh-month .thumb{flex:0 0 84px;height:84px;border-radius:12px;background:linear-gradient(135deg,#FDEEE2,#FAD9E7);display:flex;align-items:center;justify-content:center;color:#d59a6a;font-weight:800}
.tlh-month h3{font-size:17px}
.tlh-month .why{font-size:13px;color:var(--grey);margin-top:3px}
.tlh-mine{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.tlh-mine a{flex:1;min-width:120px;text-decoration:none;color:var(--dark);border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center;font-weight:700;font-size:14px}
.tlh-mine a:hover{border-color:var(--magenta);color:#b0125f}
.tlh-mine a small{display:block;font-weight:400;color:var(--grey);font-size:12px;margin-top:3px}
.tlh-results h2{font-size:18px;margin-bottom:2px;color:var(--dark)}
.tlh-results .cnt{color:var(--grey);font-size:14px;margin-bottom:16px}
.tlh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.tlh-lek{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:.14s;cursor:pointer;text-decoration:none;color:inherit;display:block}
.tlh-lek:hover{box-shadow:0 8px 22px rgba(0,0,0,.08);transform:translateY(-2px)}
.tlh-lek .ph{height:104px;background:linear-gradient(135deg,#FDEEE2,#FAD9E7);display:flex;align-items:center;justify-content:center;color:#d59a6a;font-size:13px;font-weight:700;letter-spacing:.5px}
.tlh-lek .body{padding:12px 14px}
.tlh-lek h3{font-size:16px;margin-bottom:6px}
.tlh-lek .meta{font-size:12.5px;color:var(--grey);margin-bottom:9px}
.tlh-tags{display:flex;gap:6px;flex-wrap:wrap}
.tlh-tag{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:#EEF1F4;color:#5B6470}
.tlh-tag.o{background:var(--soft);color:#b5590f}
@media(max-width:820px){.tlh-brow{grid-template-columns:1fr}.tlh-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.tlh-grid{grid-template-columns:1fr}.tlh-hero h1{font-size:24px}}
`

// Tolke-lag: fritekst → felt (som mockupen, men mot ekte «egnet for»-verdier).
function parseQ(t) {
  t = (t || '').toLowerCase()
  const f = {}
  if (/sfo|aks/.test(t)) { f.egnet = 'SFO / AKS'; f._key = 'sfo' }
  else if (/kroppsøv|gymtime/.test(t)) { f.egnet = 'Kroppsøving'; f._key = 'kroppsøv' }
  else if (/aktive? pause/.test(t)) { f.egnet = 'Aktive pauser'; f._key = 'aktive pause' }
  else if (/aktivitetsdag/.test(t)) { f.egnet = 'Aktivitetsdager'; f._key = 'aktivitetsdag' }
  else if (/aktiv læring|matte|matematikk|norsk|\bfag\b/.test(t)) { f.egnet = 'Aktiv læring'; f._key = 'aktiv læring' }
  else if (/friminutt/.test(t)) { f.egnet = 'Friminutt'; f._key = 'friminutt' }
  else if (/fysak|uteskole/.test(t)) { f.egnet = 'FYSAK'; f._key = 'fysak' }
  else if (/bli.?kjent|klassemilj|trivsel|første skoledag/.test(t)) { f.egnet = 'Bli kjent / klassemiljø'; f._key = 'kjent' }
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
function score(l, f) {
  let s = 0
  if (f._key && l.egnet.some((e) => e.toLowerCase().includes(f._key))) s += 3
  if (f.sted && (l._sted === f.sted.toLowerCase() || l._sted === 'begge')) s += 2
  if (f.utstyr === 'Uten utstyr' && l._utenUtstyr) s += 2
  return s
}

export default function SkoleHjem({ fornavn = null }) {
  const navigate = useNavigate()
  const [alle, setAlle] = useState([])
  const [q, setQ] = useState('')
  const [aktivQ, setAktivQ] = useState(null)   // satt tekst = viser resultater
  const [teller, setTeller] = useState({ planer: null, hjul: null, fav: null })

  useEffect(() => {
    hentLeker().then((r) => setAlle(r.map(visLek))).catch(() => {})
    Promise.allSettled([hentPlaner(), hentHjul(), hentMineFavoritter()]).then(([p, h, f]) => {
      setTeller({
        planer: p.status === 'fulfilled' ? p.value.length : null,
        hjul: h.status === 'fulfilled' ? h.value.length : null,
        fav: f.status === 'fulfilled' ? f.value.size : null,
      })
    })
  }, [])

  const parsed = useMemo(() => (aktivQ ? parseQ(aktivQ) : null), [aktivQ])
  const resultater = useMemo(() => {
    if (!aktivQ) return []
    const f = parsed
    const qq = aktivQ.toLowerCase()
    const ranked = alle
      .map((l) => ({ l, s: score(l, f) + (l.n.toLowerCase().includes(qq) ? 1 : 0) }))
      .sort((a, b) => b.s - a.s)
    const treff = ranked.filter((x) => x.s > 0)
    return (treff.length ? treff : ranked).slice(0, 6).map((x) => x.l)
  }, [aktivQ, parsed, alle])

  function run(tekst) {
    const t = (tekst ?? q).trim()
    if (!t) return
    setQ(t); setAktivQ(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() { setAktivQ(null); setQ('') }

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
            type="text" placeholder="F.eks. leker til SFO utendørs til 10 barn på 4. trinn" />
          <button onClick={() => run()}>Vis leker</button>
        </div>
        <div className="tlh-chips">
          <span className="lbl">Prøv:</span>
          <span className="tlh-chip" onClick={() => run('Leker til SFO utendørs til 10 barn på 4. trinn')}>SFO ute · 4. trinn</span>
          <span className="tlh-chip" onClick={() => run('Aktiv pause i klasserommet, kort og rolig')}>Aktiv pause · inne</span>
          <span className="tlh-chip" onClick={() => run('Kroppsøving oppvarming for hel klasse')}>Kroppsøving · oppvarming</span>
          <span className="tlh-chip" onClick={() => run('Aktivitetsdag med stasjoner for hele skolen')}>Aktivitetsdag</span>
          <span className="tlh-chip" onClick={() => run('Aktiv læring matematikk ute 5. trinn')}>Aktiv læring · matte</span>
        </div>

        {aktivQ && (
          <div className="tlh-parse">
            <div className="row"><span className="said">Vi forsto: <b>«{aktivQ}»</b></span></div>
            <div className="row" style={{ marginTop: 10 }}>
              {pills.length ? pills.map((v, i) => (
                <span key={i} className="tlh-fchip">{v}</span>
              )) : <span className="said">Fritekstsøk i hele biblioteket</span>}
            </div>
            <div className="note">Vi oversetter det du skriver til filtrene under (egnet&nbsp;for · sted · antall · trinn · utstyr). Feltet blir smartere etter hvert.</div>
          </div>
        )}
        {aktivQ && <div className="tlh-backlink"><a onClick={reset}>← Tilbake til Min side</a></div>}
      </section>

      {/* Resultater (inline) */}
      {aktivQ && (
        <section className="tlh-results" style={{ marginTop: 26 }}>
          <h2>Leker som passer</h2>
          <div className="cnt">{resultater.length} leker som passer — sortert etter treff</div>
          <div className="tlh-grid">
            {resultater.map((l) => (
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
            {resultater.length === 0 && <p className="cnt">Ingen leker matchet ennå — prøv en annen beskrivelse.</p>}
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
              <a onClick={() => run('Friminuttleker for mellomtrinnet')}><span className="ic">🏃</span> Friminutt</a>
              <a onClick={() => run('Kroppsøving oppvarming for hel klasse')}><span className="ic">🤸</span> Kroppsøving</a>
              <a onClick={() => run('Leker til SFO utendørs til 10 barn på 4. trinn')}><span className="ic">🧩</span> SFO / AKS</a>
              <a onClick={() => run('Aktiv læring matematikk ute 5. trinn')}><span className="ic">📚</span> Aktiv læring</a>
              <a onClick={() => run('Aktiv pause i klasserommet, kort og rolig')}><span className="ic">⏸️</span> Aktive pauser</a>
              <a onClick={() => run('FYSAK uteskole lavterskel')}><span className="ic">🌲</span> FYSAK</a>
              <a onClick={() => run('Bli kjent og godt klassemiljø første skoledag')}><span className="ic">🤝</span> Bli kjent / klassemiljø</a>
              <a onClick={() => run('Aktivitetsdag med stasjoner for hele skolen')}><span className="ic">🎪</span> Aktivitetsdager</a>
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
    </div>
  )
}
