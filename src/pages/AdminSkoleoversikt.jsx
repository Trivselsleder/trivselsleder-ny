import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// B11 (høring 17. aug): levende per-skole-tabell på tvers av ALLE kurs.
//
// Én rad per skole×kurs (kurs_skole). Viser svar, antall TL, vertskap og
// «trappstatus» — hvor langt i oppfølgingstrappa skolen er (Ikke sendt →
// Invitert → Purret → Trinn 3 → Svart), utledet fra tidsstemplene på kurs_skole.
// Filtrerbar; «Eksporter til regneark» skriver ut nøyaktig den filtrerte visningen.

function formaterDato(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Trappetrinn utledet av tidsstemplene. Rekkefølge = mest framskredne først.
function trappStatus(r) {
  if (r.svart) return 'Svart'
  if (r.trinn3_sendt_at) return 'Trinn 3'
  if (r.purring_sendt_at) return 'Purret'
  if (r.forste_utsending_at) return 'Invitert'
  return 'Ikke sendt'
}

function svarStatus(r) {
  if (!r.svart) return 'Ikke svart'
  return r.kommer ? 'Kommer' : 'Kommer ikke'
}

function vertskapTekst(r) {
  if (!r.er_vertskap) return '—'
  if (r.vertskap_bekreftet === true) return 'Ja'
  if (r.vertskap_bekreftet === false) return 'Nei'
  return 'Utpekt'
}

const TRAPP_KLASSE = {
  'Ikke sendt': 'bg-gray-100 text-gray-500',
  'Invitert': 'bg-blue-50 text-blue-700',
  'Purret': 'bg-amber-50 text-amber-700',
  'Trinn 3': 'bg-orange-50 text-orange-700',
  'Svart': 'bg-green-100 text-green-700',
}

export default function AdminSkoleoversikt() {
  const [rader, setRader] = useState([])
  const [raNettverkMap, setRaNettverkMap] = useState({})
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  const [sok, setSok] = useState('')
  const [nettverkFilter, setNettverkFilter] = useState('')
  const [fylkeFilter, setFylkeFilter] = useState('')
  const [raFilter, setRaFilter] = useState('')
  const [svarFilter, setSvarFilter] = useState('')
  const [trappFilter, setTrappFilter] = useState('')

  async function hent() {
    setLaster(true); setFeil(null)
    const [ks, ansvar] = await Promise.all([
      // kurs_skole har TO fremmednøkler til kurs (kurs_id + onsket_kurs_id), så
      // embed må peke på riktig én — ellers blir den tvetydig og feiler.
      supabase.from('kurs_skole').select(`
        id, kurs_id, skole_id, kommer, antall_tl, er_vertskap, vertskap_bekreftet,
        svart, svart_dato, forste_utsending_at, purring_sendt_at, trinn3_sendt_at,
        skoler(navn, kommunenavn, fylke),
        kurs!kurs_skole_kurs_id_fkey(navn, dato, nettverk)
      `).range(0, 9999),
      supabase.from('nettverk_ansvarlig').select('nettverk, profiles(navn)').range(0, 9999),
    ])
    if (ks.error) { setFeil(ks.error.message); setLaster(false); return }
    setRader(ks.data ?? [])
    setRaNettverkMap(Object.fromEntries((ansvar.data ?? []).map(a => [a.nettverk, a.profiles?.navn || null])))
    setLaster(false)
  }
  useEffect(() => { hent() }, [])

  const nettverkFor = r => r.kurs?.nettverk || null
  const fylkeFor = r => r.skoler?.fylke || null
  const raFor = r => raNettverkMap[nettverkFor(r)] || null

  // Filtervalg fra de innlastede radene.
  const nettverkValg = [...new Set(rader.map(nettverkFor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'))
  const fylkeValg = [...new Set(rader.map(fylkeFor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'))
  const raValg = [...new Set(rader.map(raFor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'))
  const SVAR_VALG = ['Ikke svart', 'Kommer', 'Kommer ikke']
  const TRAPP_VALG = ['Ikke sendt', 'Invitert', 'Purret', 'Trinn 3', 'Svart']

  const sokTreff = sok.trim().toLowerCase()
  const filtrerte = rader.filter(r => {
    if (nettverkFilter && nettverkFor(r) !== nettverkFilter) return false
    if (fylkeFilter && fylkeFor(r) !== fylkeFilter) return false
    if (raFilter && raFor(r) !== raFilter) return false
    if (svarFilter && svarStatus(r) !== svarFilter) return false
    if (trappFilter && trappStatus(r) !== trappFilter) return false
    if (sokTreff) {
      const skole = (r.skoler?.navn || '').toLowerCase()
      const kurs = (r.kurs?.navn || '').toLowerCase()
      const kommune = (r.skoler?.kommunenavn || '').toLowerCase()
      if (!skole.includes(sokTreff) && !kurs.includes(sokTreff) && !kommune.includes(sokTreff)) return false
    }
    return true
  })

  // Sorter: skole, så kursdato.
  const sortert = [...filtrerte].sort((a, b) => {
    const s = (a.skoler?.navn || '').localeCompare(b.skoler?.navn || '', 'nb')
    if (s !== 0) return s
    return (a.kurs?.dato || '').localeCompare(b.kurs?.dato || '')
  })

  function eksporterCSV(liste) {
    const kolonner = ['Skole', 'Kommune', 'Fylke', 'Kurs', 'Dato', 'Nettverk', 'RA', 'Svar', 'Antall TL', 'Vertskap', 'Trappstatus']
    const rows = liste.map(r => [
      r.skoler?.navn ?? '',
      r.skoler?.kommunenavn ?? '',
      fylkeFor(r) ?? '',
      r.kurs?.navn ?? '',
      formaterDato(r.kurs?.dato),
      nettverkFor(r) ?? '',
      raFor(r) ?? '',
      svarStatus(r),
      (r.svart && r.kommer && r.antall_tl != null) ? r.antall_tl : '',
      vertskapTekst(r),
      trappStatus(r),
    ])
    const csv = [kolonner, ...rows]
      .map(rad => rad.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skoleoversikt-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Alle skoler på tvers av kurs. «Trappstatus» viser hvor langt i oppfølgingen skolen er:
          Ikke sendt → Invitert → Purret → Trinn 3 → Svart. Filtrer fritt; eksporten skriver ut
          nøyaktig den filtrerte visningen.
        </p>
      </div>

      {laster && <p className="text-gray-400">Laster skoler …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="text"
              value={sok}
              onChange={e => setSok(e.target.value)}
              placeholder="Søk skole, kurs eller kommune …"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            />
            <select value={nettverkFilter} onChange={e => setNettverkFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Alle nettverk</option>
              {nettverkValg.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={fylkeFilter} onChange={e => setFylkeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Alle fylker</option>
              {fylkeValg.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={raFilter} onChange={e => setRaFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Alle RA</option>
              {raValg.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={svarFilter} onChange={e => setSvarFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Alle svar</option>
              {SVAR_VALG.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={trappFilter} onChange={e => setTrappFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Hele trappa</option>
              {TRAPP_VALG.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-sm text-gray-500">Viser {sortert.length} av {rader.length}</span>
            <button onClick={() => eksporterCSV(sortert)}
              className="ml-auto bg-orange text-gray-900 px-4 py-2 rounded-lg hover:opacity-90 text-sm">
              Eksporter til regneark
            </button>
          </div>

          {rader.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
              Ingen skoler er koblet til kurs ennå.
            </div>
          )}

          {rader.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Skole</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Svar</th>
                    <th className="px-4 py-3">Antall</th>
                    <th className="px-4 py-3">Vertskap</th>
                    <th className="px-4 py-3">Trappstatus</th>
                  </tr>
                </thead>
                <tbody>
                  {sortert.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Ingen rader matcher filteret.</td></tr>
                  )}
                  {sortert.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.skoler?.navn || 'Ukjent skole'}</div>
                        <div className="text-xs text-gray-500">
                          {[r.skoler?.kommunenavn, fylkeFor(r)].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{r.kurs?.navn || '—'}</div>
                        <div className="text-xs text-gray-500">
                          {formaterDato(r.kurs?.dato)}{nettverkFor(r) ? ` · ${nettverkFor(r)}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">{svarStatus(r)}</td>
                      <td className="px-4 py-3">{(r.svart && r.kommer && r.antall_tl != null) ? r.antall_tl : '—'}</td>
                      <td className="px-4 py-3">{vertskapTekst(r)}</td>
                      <td className="px-4 py-3">
                        <span className={'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ' + (TRAPP_KLASSE[trappStatus(r)] || 'bg-gray-100 text-gray-500')}>
                          {trappStatus(r)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
