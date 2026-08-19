import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// C1 (høring): RA-styrt kursholder-visning + eksport.
//
// Velg en kursholder → se alle kursene de skal holde (dato, tid, hall, antall
// skoler, antall TL som kommer), inkludert der de står som BACKUP. Eksporter til
// regneark (CSV) eller skriv ut, så RA kan sende kursholderen planen sin.
// RA-facing: ingen innlogging for kursholder (kan bygges på senere).

function formaterDato(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function kl(t) {
  return t ? String(t).slice(0, 5) : ''
}

export default function AdminKursholderPlan() {
  const [kursholdere, setKursholdere] = useState([])
  const [kurs, setKurs] = useState([])
  const [haller, setHaller] = useState([])
  const [agg, setAgg] = useState({})           // kurs_id → { skoler, tl_ja }
  const [valgt, setValgt] = useState('')        // valgt kursholder-id
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [kopiert, setKopiert] = useState(false) // C2: kalenderlenke kopiert

  useEffect(() => {
    (async () => {
      setLaster(true); setFeil(null)
      const [kh, k, h, ks] = await Promise.all([
        supabase.from('kursholdere').select('id, navn, aktiv, kalender_token').order('navn').range(0, 9999),
        supabase.from('kurs').select('id, navn, dato, start_tid, slutt_tid, hall_id, nettverk, kursholder_id, backup_kursholder_id').range(0, 9999),
        supabase.from('haller').select('id, navn').range(0, 9999),
        supabase.from('kurs_skole').select('kurs_id, kommer, antall_tl').range(0, 99999),
      ])
      const forsteFeil = kh.error || k.error || h.error || ks.error
      if (forsteFeil) { setFeil(forsteFeil.message); setLaster(false); return }
      setKursholdere(kh.data ?? [])
      setKurs(k.data ?? [])
      setHaller(h.data ?? [])
      const kart = {}
      for (const rad of (ks.data ?? [])) {
        const m = kart[rad.kurs_id] || { skoler: 0, tl_ja: 0 }
        m.skoler += 1
        if (rad.kommer === true) m.tl_ja += (rad.antall_tl || 0)
        kart[rad.kurs_id] = m
      }
      setAgg(kart)
      setLaster(false)
    })()
  }, [])

  const hallNavn = id => haller.find(h => h.id === id)?.navn || '—'
  const holderNavn = id => kursholdere.find(k => k.id === id)?.navn || ''

  // Kursene til valgt kursholder (som hovedholder ELLER backup), sortert på dato.
  const mine = !valgt ? [] : kurs
    .filter(k => k.kursholder_id === valgt || k.backup_kursholder_id === valgt)
    .map(k => ({ ...k, rolle: k.kursholder_id === valgt ? 'Hovedholder' : 'Backup' }))
    .sort((a, b) => (a.dato || '').localeCompare(b.dato || ''))

  function eksporterCSV() {
    const navn = holderNavn(valgt) || 'kursholder'
    const kolonner = ['Kurs', 'Dato', 'Fra', 'Til', 'Hall', 'Nettverk', 'Rolle', 'Antall skoler', 'Antall TL (ja)']
    const rows = mine.map(k => [
      k.navn ?? '',
      formaterDato(k.dato),
      kl(k.start_tid),
      kl(k.slutt_tid),
      hallNavn(k.hall_id),
      k.nettverk ?? '',
      k.rolle,
      agg[k.id]?.skoler ?? 0,
      agg[k.id]?.tl_ja ?? 0,
    ])
    const csv = [kolonner, ...rows]
      .map(rad => rad.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kursholderplan-${navn.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // C2: kopier kursholderens personlige kalenderlenke (abonnement).
  const valgtHolder = kursholdere.find(h => h.id === valgt)
  async function kopierKalenderlenke() {
    const token = valgtHolder?.kalender_token
    if (!token) return
    const url = `${window.location.origin}/api/kurs/kalender.ics?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    } catch { /* kunne ikke kopiere automatisk */ }
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Velg en kursholder for å se og eksportere kursene de skal holde — inkludert der de står
          som backup. «Eksporter til regneark» og «Skriv ut» gir en plan du kan sende kursholderen.
        </p>
      </div>

      {laster && <p className="text-gray-400">Laster …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select value={valgt} onChange={e => setValgt(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[240px]">
              <option value="">— Velg kursholder —</option>
              {kursholdere.map(h => (
                <option key={h.id} value={h.id}>{h.navn}{h.aktiv === false ? ' (deaktivert)' : ''}</option>
              ))}
            </select>
            {valgt && (
              <>
                <span className="text-sm text-gray-500">{mine.length} kurs</span>
                <div className="ml-auto flex gap-2">
                  {valgtHolder?.kalender_token && (
                    <button onClick={kopierKalenderlenke}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap">
                      {kopiert ? 'Kopiert!' : 'Kopier kalenderlenke'}
                    </button>
                  )}
                  <button onClick={() => window.print()}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
                    Skriv ut
                  </button>
                  <button onClick={eksporterCSV} disabled={mine.length === 0}
                    className="bg-orange text-gray-900 px-4 py-2 rounded-lg hover:opacity-90 text-sm disabled:opacity-40">
                    Eksporter til regneark
                  </button>
                </div>
              </>
            )}
          </div>

          {!valgt && (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
              Velg en kursholder over for å se planen.
            </div>
          )}

          {valgt && mine.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
              {holderNavn(valgt)} står ikke på noen kurs ennå.
            </div>
          )}

          {valgt && mine.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Dato</th>
                    <th className="px-4 py-3">Tid</th>
                    <th className="px-4 py-3">Hall</th>
                    <th className="px-4 py-3">Rolle</th>
                    <th className="px-4 py-3">Skoler</th>
                    <th className="px-4 py-3">TL (ja)</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map(k => (
                    <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {k.navn || '—'}
                        {k.nettverk && <div className="text-xs text-gray-400">{k.nettverk}</div>}
                      </td>
                      <td className="px-4 py-3">{formaterDato(k.dato)}</td>
                      <td className="px-4 py-3">{kl(k.start_tid)}{k.slutt_tid ? `–${kl(k.slutt_tid)}` : ''}</td>
                      <td className="px-4 py-3">{hallNavn(k.hall_id)}</td>
                      <td className="px-4 py-3">
                        {k.rolle === 'Backup'
                          ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Backup</span>
                          : <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">Hovedholder</span>}
                      </td>
                      <td className="px-4 py-3">{agg[k.id]?.skoler ?? 0}</td>
                      <td className="px-4 py-3">{agg[k.id]?.tl_ja ?? 0}</td>
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
