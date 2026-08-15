import { useEffect, useMemo, useState } from 'react'
import { hentAktivLaering, TRINN_NO } from '../../lib/leker'
import { hentMineFavoritter } from '../../lib/favoritter'
import LekeKort from '../../components/LekeKort'

// Kanonisk fagliste (LK20) — vises alltid, uansett hva testdataene inneholder.
// Fag-koblingen fylles ved innholdsimporten; til da gir valg av fag 0 treff.
const FAG = [
  'Norsk', 'Matematikk', 'Engelsk', 'Naturfag', 'Samfunnsfag', 'KRLE',
  'Kroppsøving', 'Musikk', 'Kunst og håndverk', 'Mat og helse',
  'Bevegelse og kroppslig læring', 'Deltakelse og samspill',
]

export default function SkoleAktivLaering() {
  const [alle, setAlle] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [sok, setSok] = useState('')
  const [fFag, setFFag] = useState('')
  const [fTrinn, setFTrinn] = useState('')
  const [kunVideo, setKunVideo] = useState(false)
  const [favoritter, setFavoritter] = useState(new Set())

  useEffect(() => {
    hentAktivLaering()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
    hentMineFavoritter().then(setFavoritter).catch(() => {})
  }, [])

  const valg = useMemo(() => {
    const tr = new Map()
    const dataFag = new Set()
    alle.forEach((l) => {
      l.trinn.forEach((x) => tr.set(x.kode, x.navn))
      ;(l.fag || []).forEach((f) => dataFag.add(f))
    })
    const fag = [...FAG, ...[...dataFag].filter((f) => !FAG.includes(f))]
    // Aktiv læring følger LK20 (1.–10. trinn) — kanonisk liste, uten barnehage.
    const kanon = TRINN_NO.filter(([k]) => k !== 'bhg')
    const kanonKoder = new Set(kanon.map(([k]) => k))
    const trinn = [...kanon, ...[...tr.entries()].filter(([k]) => !kanonKoder.has(k))]
    return { trinn, fag }
  }, [alle])

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alle.filter((l) => {
      if (q && !(`${l.tittel || ''} ${l.tekst.formaal || ''}`.toLowerCase().includes(q))) return false
      if (fFag && !(l.fag || []).includes(fFag)) return false
      if (fTrinn && !l.trinn.some((t) => t.kode === fTrinn)) return false
      if (kunVideo && !l.harVideo) return false
      return true
    })
  }, [alle, sok, fFag, fTrinn, kunVideo])

  function nullstill() {
    setSok(''); setFFag(''); setFTrinn(''); setKunVideo(false)
  }

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Aktiv læring</h1>
      <p className="text-gray-500 text-sm mt-1">Fysisk aktivitet koblet til fag og kompetansemål (LK20) — læring i bevegelse.</p>

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-petrol/5 border border-petrol/15 px-4 py-3">
        <span className="text-petrol text-lg leading-none mt-0.5" aria-hidden="true">📚</span>
        <p className="text-sm text-petrol/90">
          Aktiv læring er et eget innhold — filtrert på <b>fag</b> og <b>trinn</b>, ikke på friminutt-kontekst.
          Trenger du en vanlig lek i stedet, ligger den under <b>Finn en lek</b>.
        </p>
      </div>

      <div className="mt-4">
        <input
          type="text"
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Søk i aktiv læring …"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <select className={selCls} aria-label="Fag" value={fFag} onChange={(e) => setFFag(e.target.value)}>
          <option value="">Fag …</option>
          {valg.fag.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className={selCls} aria-label="Trinn" value={fTrinn} onChange={(e) => setFTrinn(e.target.value)}>
          <option value="">Trinn …</option>
          {valg.trinn.map(([kode, navn]) => <option key={kode} value={kode}>{navn}</option>)}
        </select>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={kunVideo} onChange={(e) => setKunVideo(e.target.checked)} />
          <span className="text-orange">▶</span> Med video
        </label>
        <button onClick={nullstill} className="text-sm text-gray-500 hover:text-orange px-2">Nullstill</button>
      </div>

      {laster && <p className="text-gray-400 mt-8">Laster aktiv læring …</p>}
      {feil && <p className="text-red-500 mt-8">Kunne ikke hente innhold: {feil}</p>}

      {!laster && !feil && (
        <>
          {alle.length > 0 && <p className="text-sm text-gray-500 mt-5">Viser {treff.length} av {alle.length} opplegg</p>}
          {alle.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              Ingen aktiv læring-opplegg publisert ennå. Innholdet importeres i innholdsjobben.
            </div>
          ) : treff.length === 0 ? (
            <div className="text-center text-gray-500 py-16">Ingen opplegg matchet. Prøv å nullstille filtrene.</div>
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
