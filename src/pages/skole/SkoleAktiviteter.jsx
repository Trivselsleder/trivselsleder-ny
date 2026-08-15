import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hentLeker, loggBruk } from '../../lib/leker'
import { hentMineFavoritter } from '../../lib/favoritter'
import LekeKort from '../../components/LekeKort'

// Kanonisk «egnet for»-liste = de 12 inngangene på Min side (speiles her, uansett
// hva testdataene tilfeldigvis inneholder). Rekkefølgen følger boksene på hero-en.
const EGNET = [
  'Friminutt', 'Kroppsøving', 'SFO/AKS', 'Aktiv læring', 'Aktive pauser', 'FYSAK',
  'Bli kjent / klassemiljø', 'Aktivitetsdager', 'Sosial kompetanse', 'TL-Mester',
  'Leker for 100+ elever', 'Barnehage',
]
// Kuraterte samlinger + skoletype (fra dagens side). Full aktivitetstype-taksonomi
// («de 100+») fylles ved innholdsimporten; strukturen står klar her.
const SAMLINGER = ['Favoritter', 'Månedens leker', 'Lekekurs', 'Utfordringer', 'Move it', 'Kropp og hjerne']
const SKOLETYPE = ['Barnehage', 'Barnetrinn', 'Ungdomstrinn', 'Kombinert', 'SFO']
const AKTIVITETSTYPE_EKS = 'Balanse · Ball · Sisten · Snø · Stafett · Samarbeid · Musikk og dans …'

export default function SkoleAktiviteter() {
  const [alle, setAlle] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [sok, setSok] = useState('')
  const [fEgnet, setFEgnet] = useState('')
  const [fTrinn, setFTrinn] = useState('')
  const [fSted, setFSted] = useState('')
  const [fUtstyr, setFUtstyr] = useState('')
  const [utenUtstyr, setUtenUtstyr] = useState(false)
  const [fSesong, setFSesong] = useState('')
  const [favoritter, setFavoritter] = useState(new Set())
  const [kunFav, setKunFav] = useState(false)
  const [kunVideo, setKunVideo] = useState(false)
  const [blaApen, setBlaApen] = useState(false)
  const [params] = useSearchParams()

  useEffect(() => {
    if (params.get('fav') === '1') setKunFav(true)
    const eg = params.get('egnet'); if (eg) setFEgnet(eg)
    const st = params.get('sted'); if (st) setFSted(st)
    const sk = params.get('sok'); if (sk) setSok(sk)
    if (params.get('bla') === '1') setBlaApen(true)
  }, [params])

  useEffect(() => {
    hentLeker()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
    hentMineFavoritter().then(setFavoritter).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sok.trim()) return
    const t = setTimeout(() => loggBruk('sok', { sokTekst: sok.trim() }), 900)
    return () => clearTimeout(t)
  }, [sok])

  const valg = useMemo(() => {
    const tr = new Map()
    const u = new Set()
    const s = new Set()
    alle.forEach((l) => {
      l.trinn.forEach((x) => tr.set(x.kode, x.navn))
      l.utstyr.forEach((x) => u.add(x))
      l.sesong.forEach((x) => s.add(x))
    })
    // «Egnet for» drives av den kanoniske lista, forent med evt. ekstra dataverdier.
    const dataEgnet = new Set()
    alle.forEach((l) => l.egnet.forEach((x) => dataEgnet.add(x)))
    const egnet = [...EGNET, ...[...dataEgnet].filter((x) => !EGNET.includes(x))]
    return {
      egnet,
      trinn: [...tr.entries()],
      utstyr: [...u].sort(),
      sesong: [...s].sort(),
    }
  }, [alle])

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alle.filter((l) => {
      if (q && !(`${l.tittel || ''} ${l.tekst.formaal || ''}`.toLowerCase().includes(q))) return false
      if (fEgnet && !l.egnet.includes(fEgnet)) return false
      if (fTrinn && !l.trinn.some((t) => t.kode === fTrinn)) return false
      if (fSted && !(l.sted === fSted || l.sted === 'begge')) return false
      if (fUtstyr && !l.utstyr.includes(fUtstyr)) return false
      if (utenUtstyr && !l.utenUtstyr) return false
      if (fSesong && !l.sesong.includes(fSesong)) return false
      if (kunVideo && !l.harVideo) return false
      if (kunFav && !favoritter.has(l.id)) return false
      return true
    })
  }, [alle, sok, fEgnet, fTrinn, fSted, fUtstyr, utenUtstyr, fSesong, kunVideo, kunFav, favoritter])

  function nullstill() {
    setSok(''); setFEgnet(''); setFTrinn(''); setFSted(''); setFUtstyr(''); setUtenUtstyr(false); setFSesong(''); setKunVideo(false); setKunFav(false)
  }
  // Klikk på ett chip = sett (eller skru av) filteret.
  const bytt = (naa, ny, sett) => sett(naa === ny ? '' : ny)

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange'
  const chip = (aktiv) =>
    `text-sm rounded-full px-3 py-1.5 border transition-colors cursor-pointer ${
      aktiv ? 'bg-orange text-white border-orange' : 'bg-white text-gray-700 border-gray-300 hover:border-orange hover:text-orange'
    }`
  // Merkelapper som ennå ikke har eget filter-felt (kobles ved innholdsimport).
  const chipKommer = 'text-sm rounded-full px-3 py-1.5 border border-dashed border-gray-200 text-gray-400 bg-gray-50 cursor-default'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Søk i biblioteket</h1>
      <p className="text-gray-500 text-sm mt-1">60 aktive minutter — én lek om gangen.</p>

      <div className="mt-4">
        <input
          type="text"
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Søk etter lek …"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <select className={selCls} aria-label="Egnet for" value={fEgnet} onChange={(e) => setFEgnet(e.target.value)}>
          <option value="">Egnet for …</option>
          {valg.egnet.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} aria-label="Trinn" value={fTrinn} onChange={(e) => setFTrinn(e.target.value)}>
          <option value="">Trinn …</option>
          {valg.trinn.map(([kode, navn]) => <option key={kode} value={kode}>{navn}</option>)}
        </select>
        <select className={selCls} aria-label="Sted" value={fSted} onChange={(e) => setFSted(e.target.value)}>
          <option value="">Sted …</option>
          <option value="inne">Inne</option>
          <option value="ute">Ute</option>
        </select>
        <select className={selCls} aria-label="Utstyr" value={fUtstyr} onChange={(e) => setFUtstyr(e.target.value)}>
          <option value="">Utstyr …</option>
          {valg.utstyr.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} aria-label="Sesong" value={fSesong} onChange={(e) => setFSesong(e.target.value)}>
          <option value="">Sesong …</option>
          {valg.sesong.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={utenUtstyr} onChange={(e) => setUtenUtstyr(e.target.checked)} />
          Uten utstyr
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={kunVideo} onChange={(e) => setKunVideo(e.target.checked)} />
          <span className="text-orange" aria-hidden="true">▶</span> Med video
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={kunFav} onChange={(e) => setKunFav(e.target.checked)} />
          <span className="text-tlred" aria-hidden="true">♥</span> Kun favoritter
        </label>
        <button onClick={nullstill} className="text-sm text-gray-500 hover:text-orange px-2">Nullstill</button>
      </div>

      {/* Bla i kategorier — hele taksonomien synlig, gruppert, klikkbar. Lukket som standard. */}
      <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setBlaApen((v) => !v)}
          aria-expanded={blaApen}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <span className={`text-[11px] transition-transform ${blaApen ? 'rotate-90' : ''}`}>▶</span>
          Bla i kategorier
          <span className="font-normal text-gray-400">— se alt uten å søke</span>
        </button>

        {blaApen && (
          <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
            <Gruppe tittel="Egnet for">
              {valg.egnet.map((x) => (
                <button key={x} className={chip(fEgnet === x)} onClick={() => bytt(fEgnet, x, setFEgnet)}>{x}</button>
              ))}
            </Gruppe>

            {valg.trinn.length > 0 && (
              <Gruppe tittel="Trinn">
                {valg.trinn.map(([kode, navn]) => (
                  <button key={kode} className={chip(fTrinn === kode)} onClick={() => bytt(fTrinn, kode, setFTrinn)}>{navn}</button>
                ))}
              </Gruppe>
            )}

            <Gruppe tittel="Sted">
              <button className={chip(fSted === 'inne')} onClick={() => bytt(fSted, 'inne', setFSted)}>Inne</button>
              <button className={chip(fSted === 'ute')} onClick={() => bytt(fSted, 'ute', setFSted)}>Ute</button>
            </Gruppe>

            {valg.utstyr.length > 0 && (
              <Gruppe tittel="Utstyr">
                <button className={chip(utenUtstyr)} onClick={() => setUtenUtstyr((v) => !v)}>Uten utstyr</button>
                {valg.utstyr.map((x) => (
                  <button key={x} className={chip(fUtstyr === x)} onClick={() => bytt(fUtstyr, x, setFUtstyr)}>{x}</button>
                ))}
              </Gruppe>
            )}

            {valg.sesong.length > 0 && (
              <Gruppe tittel="Sesong">
                {valg.sesong.map((x) => (
                  <button key={x} className={chip(fSesong === x)} onClick={() => bytt(fSesong, x, setFSesong)}>{x}</button>
                ))}
              </Gruppe>
            )}

            <Gruppe tittel="Samlinger">
              <button className={chip(kunFav)} onClick={() => setKunFav((v) => !v)}>Favoritter</button>
              {SAMLINGER.filter((s) => s !== 'Favoritter').map((s) => (
                <span key={s} className={chipKommer} title="Kobles til presist filter ved innholdsimporten">{s}</span>
              ))}
            </Gruppe>

            <Gruppe tittel="Skoletype">
              {SKOLETYPE.map((s) => (
                <span key={s} className={chipKommer} title="Kobles til presist filter ved innholdsimporten">{s}</span>
              ))}
            </Gruppe>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Aktivitetstype</div>
              <p className="text-sm text-gray-500">{AKTIVITETSTYPE_EKS} <span className="italic">— fylles ved innholdsimporten.</span></p>
            </div>
            <p className="text-xs text-gray-400">Grå merkelapper er synlige nå og kobles til presist filter når innholds-taksonomien importeres.</p>
          </div>
        )}
      </div>

      {laster && <p className="text-gray-400 mt-8">Laster leker …</p>}
      {feil && <p className="text-red-500 mt-8">Kunne ikke hente leker: {feil}</p>}

      {!laster && !feil && (
        <>
          {alle.length > 0 && <p className="text-sm text-gray-500 mt-5">Viser {treff.length} av {alle.length} leker</p>}
          {alle.length === 0 ? (
            <div className="text-center text-gray-500 py-16">Ingen leker publisert ennå. Innholdet importeres i innholdsjobben.</div>
          ) : treff.length === 0 ? (
            <div className="text-center text-gray-500 py-16">Ingen leker matchet. Prøv å nullstille filtrene.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {treff.map((l) => <LekeKort key={l.id} lek={l} favoritt={favoritter.has(l.id)} />)}
            </div>
          )}
        </>
      )}
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
