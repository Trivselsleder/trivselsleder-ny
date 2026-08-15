import { useEffect, useMemo, useState } from 'react'
import { hentDokumentbank } from '../../lib/leker'

// Kanoniske dokumenttyper (fra dagens skjemabank) — vises alltid, gruppert som filtre.
// Ingen synlige antall (de ansatte fjernet «(n)» på dagens side).
const TYPER = [
  'Diplom og attester', 'Invitasjoner', 'Presentasjoner', 'Tips og plakater',
  'Pratekort', 'Nominasjon, søknad og advarsel', 'Søknader om tilskudd',
  'Turneringer og TL-Mester', 'Trivselspatruljen', 'Drift av TL',
  'Lek og aktivitet', 'Aktiv læring', 'TL-logo', 'Informasjon',
]

export default function SkoleDokumenter() {
  const [alle, setAlle] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [sok, setSok] = useState('')
  const [fType, setFType] = useState('')

  useEffect(() => {
    hentDokumentbank()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [])

  // Typene som vises = kanonisk liste forent med det som faktisk ligger i banken.
  const typer = useMemo(() => {
    const data = new Set()
    alle.forEach((d) => d.type && data.add(d.type))
    return [...TYPER, ...[...data].filter((t) => !TYPER.includes(t))]
  }, [alle])

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alle.filter((d) => {
      if (q && !d.tittel.toLowerCase().includes(q)) return false
      if (fType && d.type !== fType) return false
      return true
    })
  }, [alle, sok, fType])

  const chip = (aktiv) =>
    `text-sm rounded-full px-3 py-1.5 border transition-colors cursor-pointer ${
      aktiv ? 'bg-orange text-white border-orange' : 'bg-white text-gray-700 border-gray-300 hover:border-orange hover:text-orange'
    }`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Maler & materiell</h1>
      <p className="text-gray-500 text-sm mt-1">Skjemaer, maler, diplomer og plakater — klare til utskrift.</p>

      <div className="mt-4">
        <input
          type="text"
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Søk i maler & materiell …"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange"
        />
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(fType === '')} onClick={() => setFType('')}>Alle</button>
          {typer.map((t) => (
            <button key={t} className={chip(fType === t)} onClick={() => setFType(fType === t ? '' : t)}>{t}</button>
          ))}
        </div>
      </div>

      {laster && <p className="text-gray-500 mt-8">Laster maler & materiell …</p>}
      {feil && <p className="text-red-500 mt-8">Kunne ikke hente dokumenter: {feil}</p>}

      {!laster && !feil && (
        <>
          {alle.length > 0 && <p className="text-sm text-gray-500 mt-6">Viser {treff.length} av {alle.length} dokumenter</p>}
          {alle.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              Maler &amp; materiell er på vei — dokumentene dukker opp her så snart de er klare.
            </div>
          ) : treff.length === 0 ? (
            <div className="text-center text-gray-500 py-16">Ingen dokumenter matchet. Prøv en annen type eller søk.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {treff.map((d) => <DokumentKort key={d.id} dok={d} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DokumentKort({ dok }) {
  const Wrapper = dok.url ? 'a' : 'div'
  const props = dok.url ? { href: dok.url, target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <Wrapper
      {...props}
      className={`block bg-white rounded-2xl border border-gray-200 p-4 transition ${
        dok.url ? 'hover:border-orange hover:shadow-md focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:outline-none' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-xl bg-teal/15 text-petrol flex items-center justify-center" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 leading-snug">{dok.tittel}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs bg-teal/15 text-petrol px-2 py-0.5 rounded-full">{dok.type}</span>
            {dok.sprak && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{dok.sprak}</span>}
          </div>
        </div>
        {dok.url && (
          <span className="ml-auto text-orange shrink-0">
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(åpnes i ny fane)</span>
          </span>
        )}
      </div>
    </Wrapper>
  )
}
