import { useState } from 'react'

// Redigerbar hjultype/kategori. Skolen kan velge blant standardtyper + egne,
// og legge til nye på stedet.
export default function HjulKategori({ verdi, kategorier, onEndre, onNyKategori }) {
  const [nyModus, setNyModus] = useState(false)
  const [navn, setNavn] = useState('')
  const [lagrer, setLagrer] = useState(false)

  async function lagre() {
    const t = navn.trim()
    if (!t || lagrer) return
    setLagrer(true)
    try {
      const ny = await onNyKategori(t)
      if (ny?.id) onEndre(ny.id)
      setNavn(''); setNyModus(false)
    } finally { setLagrer(false) }
  }

  return (
    <div className="mt-4">
      <label className="text-xs text-gray-500 block mb-1">Hjultype</label>
      {!nyModus ? (
        <div className="flex items-center gap-2">
          <select value={verdi || ''} onChange={(e) => onEndre(e.target.value || null)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange">
            <option value="">(ingen)</option>
            {kategorier.map((k) => (
              <option key={k.id} value={k.id}>{k.navn}{k.global ? '' : ' •'}</option>
            ))}
          </select>
          <button type="button" onClick={() => setNyModus(true)} className="text-sm text-petrol hover:underline">+ Ny type</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input type="text" value={navn} onChange={(e) => setNavn(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lagre() } }}
            placeholder="Navn på ny type"
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange" />
          <button type="button" onClick={lagre} disabled={!navn.trim() || lagrer}
            className="text-sm bg-petrol text-white px-3 py-2 rounded-xl disabled:opacity-50">{lagrer ? '…' : 'Lagre'}</button>
          <button type="button" onClick={() => { setNyModus(false); setNavn('') }} className="text-sm text-gray-400">Avbryt</button>
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-1">Egne typer er merket •. Brukes til å ordne «Mine hjul» (klassemiljø, trinn, personalet …).</p>
    </div>
  )
}
