import { useEffect, useMemo, useRef, useState } from 'react'
import { hentDeltakere, leggTilDeltaker, fjernDeltaker, leggTilDeltakereBulk } from '../lib/tlDeltaker'
import { parseTlTekst } from '../lib/tlImport'

// Skolens egen TL-liste (ansvarlige/grupper). Skoleadmin redigerer.
// Manuell én-og-én + import (lim inn / last opp fil med navn+klasse).
export default function TlListeManager({ onEndret }) {
  const [liste, setListe] = useState([])
  const [navn, setNavn] = useState('')
  const [gruppe, setGruppe] = useState('')
  const [feil, setFeil] = useState(null)

  const [importApen, setImportApen] = useState(false)
  const [raa, setRaa] = useState('')
  const [importerer, setImporterer] = useState(false)
  const [resultat, setResultat] = useState(null)
  const filRef = useRef(null)

  function last() {
    hentDeltakere().then(setListe).catch((e) => setFeil(e.message))
  }
  useEffect(last, [])

  async function leggTil() {
    if (!navn.trim()) return
    try {
      await leggTilDeltaker({ navn: navn.trim(), gruppe: gruppe.trim() || null })
      setNavn(''); setGruppe(''); setFeil(null)
      last(); onEndret?.()
    } catch (e) { setFeil(e.message) }
  }

  async function fjern(id) {
    try {
      await fjernDeltaker(id)
      setFeil(null); last(); onEndret?.()
    } catch (e) { setFeil(e.message) }
  }

  const forhaands = useMemo(() => parseTlTekst(raa), [raa])

  function velgFil(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    const leser = new FileReader()
    leser.onload = () => {
      // Prøv UTF-8. Hvis Excel-eksporten egentlig er Windows-1252 (norsk Windows),
      // gir UTF-8 erstatningstegn (�) på æ/ø/å — da dekoder vi på nytt som win-1252.
      const buf = leser.result
      let tekst = new TextDecoder('utf-8').decode(buf)
      if (tekst.includes('�')) {
        try { tekst = new TextDecoder('windows-1252').decode(buf) } catch { /* behold utf-8 */ }
      }
      setRaa(tekst); setResultat(null); setFeil(null)
    }
    leser.onerror = () => setFeil('Klarte ikke å lese fila.')
    leser.readAsArrayBuffer(fil)
    e.target.value = '' // tillat å velge samme fil på nytt
  }

  async function importer() {
    if (forhaands.antall === 0) return
    setImporterer(true); setFeil(null); setResultat(null)
    try {
      const r = await leggTilDeltakereBulk(forhaands.rader)
      setResultat(r)
      setRaa('')
      last(); onEndret?.()
    } catch (e) { setFeil(e.message) } finally { setImporterer(false) }
  }

  const felt = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange'

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Skolens TL-liste</h3>
          <p className="text-xs text-gray-500 mt-1">Navn/grupper her dukker opp som forslag i cellene og på «Ansvarlig».</p>
        </div>
        <button
          type="button"
          onClick={() => { setImportApen((v) => !v); setResultat(null) }}
          className="shrink-0 text-xs font-medium text-orange border border-orange/40 rounded-full px-3 py-1.5 hover:bg-orange/5"
          aria-expanded={importApen}
        >
          {importApen ? 'Lukk import' : 'Importer flere ↓'}
        </button>
      </div>

      {feil && <p className="text-sm text-red-600 mt-2" role="alert">{feil}</p>}

      {/* Manuell én-og-én */}
      <div className="flex flex-wrap gap-2 mt-3">
        <input value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn (f.eks. Katrine)" className={felt} aria-label="Navn" />
        <input value={gruppe} onChange={(e) => setGruppe(e.target.value)} placeholder="Gruppe/klasse (valgfritt)" className={felt} aria-label="Gruppe eller klasse" />
        <button onClick={leggTil} disabled={!navn.trim()} className="bg-orange text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-orange/90 disabled:opacity-50">
          Legg til
        </button>
      </div>

      {/* Import: lim inn eller last opp fil */}
      {importApen && (
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs text-gray-600">
            Lim inn navn (én per linje), eller last opp en CSV/regnearkfil. Første kolonne er <b>navn</b>, andre kolonne <b>klasse</b> (valgfritt).
            Skilletegn kan være komma, semikolon eller tabulator — en eventuell overskriftsrad hoppes over automatisk.
          </p>

          <textarea
            value={raa}
            onChange={(e) => { setRaa(e.target.value); setResultat(null) }}
            rows={5}
            placeholder={'Ada, 6B\nJonas, 6B\nSara, 7A'}
            aria-label="Lim inn trivselsledere"
            className="mt-2 w-full text-sm font-mono px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
          />

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <input ref={filRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={velgFil} className="hidden" />
            <button type="button" onClick={() => filRef.current?.click()} className="text-sm border border-gray-300 rounded-full px-3 py-1.5 hover:border-orange hover:text-orange bg-white">
              Last opp fil …
            </button>

            {forhaands.antall > 0 && (
              <span className="text-xs text-gray-600">
                Fant <b>{forhaands.antall}</b> navn klare til import.
                {forhaands.avkortet && <span className="text-[#B5560F]"> Viser de første {forhaands.antall} — er dette riktig fil?</span>}
              </span>
            )}

            <button
              type="button"
              onClick={importer}
              disabled={forhaands.antall === 0 || importerer}
              className="ml-auto bg-orange text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-orange/90 disabled:opacity-50"
            >
              {importerer ? 'Importerer …' : `Importer ${forhaands.antall || ''}`.trim()}
            </button>
          </div>

          {/* Forhåndsvisning av de første radene */}
          {forhaands.antall > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {forhaands.rader.slice(0, 12).map((r, i) => (
                <span key={i} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                  {r.navn}{r.gruppe ? ` · ${r.gruppe}` : ''}
                </span>
              ))}
              {forhaands.antall > 12 && <span className="text-xs text-gray-500 self-center">+ {forhaands.antall - 12} til</span>}
            </div>
          )}

          {resultat && (
            <p className="mt-2 text-sm text-[#106C75]" role="status" aria-live="polite">
              La til <b>{resultat.lagtTil.length}</b> {resultat.lagtTil.length === 1 ? 'trivselsleder' : 'trivselsledere'}
              {resultat.reaktivert > 0 && <> · gjenopprettet {resultat.reaktivert}</>}
              {resultat.hoppetOver > 0 && <> · hoppet over {resultat.hoppetOver} som fantes fra før</>}.
            </p>
          )}
        </div>
      )}

      {liste.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {liste.map((d) => (
            <span key={d.id} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              {d.navn}{d.gruppe ? ` · ${d.gruppe}` : ''}
              <button onClick={() => fjern(d.id)} className="text-gray-400 hover:text-red-500" aria-label={`Fjern ${d.navn}`}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
