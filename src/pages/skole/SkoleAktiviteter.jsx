import { useEffect, useMemo, useState } from 'react'
import { hentLeker, loggBruk } from '../../lib/leker'
import LekeKort from '../../components/LekeKort'

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

  useEffect(() => {
    hentLeker()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [])

  useEffect(() => {
    if (!sok.trim()) return
    const t = setTimeout(() => loggBruk('sok', { sokTekst: sok.trim() }), 900)
    return () => clearTimeout(t)
  }, [sok])

  const valg = useMemo(() => {
    const e = new Set()
    const tr = new Map()
    const u = new Set()
    const s = new Set()
    alle.forEach((l) => {
      l.egnet.forEach((x) => e.add(x))
      l.trinn.forEach((x) => tr.set(x.kode, x.navn))
      l.utstyr.forEach((x) => u.add(x))
      l.sesong.forEach((x) => s.add(x))
    })
    return {
      egnet: [...e].sort(),
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
      return true
    })
  }, [alle, sok, fEgnet, fTrinn, fSted, fUtstyr, utenUtstyr, fSesong])

  function nullstill() {
    setSok(''); setFEgnet(''); setFTrinn(''); setFSted(''); setFUtstyr(''); setUtenUtstyr(false); setFSesong('')
  }

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange'

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
        <select className={selCls} value={fEgnet} onChange={(e) => setFEgnet(e.target.value)}>
          <option value="">Egnet for …</option>
          {valg.egnet.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} value={fTrinn} onChange={(e) => setFTrinn(e.target.value)}>
          <option value="">Trinn …</option>
          {valg.trinn.map(([kode, navn]) => <option key={kode} value={kode}>{navn}</option>)}
        </select>
        <select className={selCls} value={fSted} onChange={(e) => setFSted(e.target.value)}>
          <option value="">Sted …</option>
          <option value="inne">Inne</option>
          <option value="ute">Ute</option>
        </select>
        <select className={selCls} value={fUtstyr} onChange={(e) => setFUtstyr(e.target.value)}>
          <option value="">Utstyr …</option>
          {valg.utstyr.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={selCls} value={fSesong} onChange={(e) => setFSesong(e.target.value)}>
          <option value="">Sesong …</option>
          {valg.sesong.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <label className="text-sm text-gray-600 flex items-center gap-2 px-2">
          <input type="checkbox" checked={utenUtstyr} onChange={(e) => setUtenUtstyr(e.target.checked)} />
          Uten utstyr
        </label>
        <button onClick={nullstill} className="text-sm text-gray-500 hover:text-orange px-2">Nullstill</button>
      </div>

      {laster && <p className="text-gray-400 mt-8">Laster leker …</p>}
      {feil && <p className="text-red-500 mt-8">Kunne ikke hente leker: {feil}</p>}

      {!laster && !feil && (
        <>
          <p className="text-sm text-gray-400 mt-5">Viser {treff.length} av {alle.length} leker</p>
          {treff.length === 0 ? (
            <div className="text-center text-gray-400 py-16">Ingen leker matchet. Prøv å nullstille filtrene.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {treff.map((l) => <LekeKort key={l.id} lek={l} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
