import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// B10 (høring 17. aug): tilordne RA-konto til hvert nettverk.
//
// Beslutning: «RA eier nettverk, nettverk eier kursene». Én RA kan ha mange
// nettverk; hvert nettverk har ÉN ansvarlig RA. «Mine kurs» i kursplanleggeren
// leser koblingen som settes her (tabellen nettverk_ansvarlig). Dette erstatter
// det gamle fritekst-RA-feltet på kurset.
export default function AdminNettverksansvar() {
  const [nettverk, setNettverk] = useState([])   // distinkte nettverksnavn
  const [ansatte, setAnsatte] = useState([])     // profiles (ansatt/superadmin)
  const [kobling, setKobling] = useState({})     // nettverk → bruker_id
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [lagrer, setLagrer] = useState(null)     // nettverket som lagres nå
  const [sok, setSok] = useState('')

  async function hent() {
    setLaster(true); setFeil(null)
    const [skoler, kurs, profiler, koblinger] = await Promise.all([
      supabase.from('skoler').select('nettverk').range(0, 9999),
      supabase.from('kurs').select('nettverk').range(0, 9999),
      supabase.from('profiles').select('id, navn, rolle, aktiv').in('rolle', ['ansatt', 'superadmin']).range(0, 9999),
      supabase.from('nettverk_ansvarlig').select('nettverk, bruker_id').range(0, 9999),
    ])
    const forsteFeil = skoler.error || kurs.error || profiler.error || koblinger.error
    if (forsteFeil) { setFeil(forsteFeil.message); setLaster(false); return }

    // Nettverk finnes som tekst på både skoler og kurs — slå sammen begge, så
    // ingen nettverk med kurs, men uten skoler (eller omvendt), faller ut.
    const alle = [...(skoler.data ?? []), ...(kurs.data ?? [])].map(r => r.nettverk).filter(Boolean)
    const distinkte = [...new Set(alle)].sort((a, b) => a.localeCompare(b, 'nb'))
    setNettverk(distinkte)
    setAnsatte((profiler.data ?? [])
      .filter(p => p.aktiv !== false)
      .sort((a, b) => (a.navn || '').localeCompare(b.navn || '', 'nb')))
    setKobling(Object.fromEntries((koblinger.data ?? []).map(k => [k.nettverk, k.bruker_id])))
    setLaster(false)
  }
  useEffect(() => { hent() }, [])

  async function settAnsvarlig(nv, brukerId) {
    setLagrer(nv)
    const forrige = kobling[nv]
    // Optimistisk oppdatering; rull tilbake ved feil.
    setKobling(prev => {
      const neste = { ...prev }
      if (brukerId) neste[nv] = brukerId; else delete neste[nv]
      return neste
    })
    let error
    if (!brukerId) {
      ({ error } = await supabase.from('nettverk_ansvarlig').delete().eq('nettverk', nv))
    } else {
      ({ error } = await supabase.from('nettverk_ansvarlig').upsert(
        { nettverk: nv, bruker_id: brukerId, oppdatert_at: new Date().toISOString() },
        { onConflict: 'nettverk' },
      ))
    }
    if (error) {
      setKobling(prev => {
        const neste = { ...prev }
        if (forrige) neste[nv] = forrige; else delete neste[nv]
        return neste
      })
      alert('Kunne ikke lagre: ' + error.message)
    }
    setLagrer(null)
  }

  const synlige = nettverk.filter(nv => !sok.trim() || nv.toLowerCase().includes(sok.trim().toLowerCase()))
  const antallTilordnet = nettverk.filter(nv => kobling[nv]).length

  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Sett hvilken rådgiver (RA) som er ansvarlig for hvert nettverk. En RA kan ha mange nettverk.
          Kursene arver ansvaret fra nettverket sitt, så «Mine kurs» i kursoversikten viser automatisk
          alle kurs i nettverkene dine.
        </p>
      </div>

      {laster && <p className="text-gray-400">Laster nettverk …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="text"
              value={sok}
              onChange={e => setSok(e.target.value)}
              placeholder="Søk nettverk …"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56"
            />
            <span className="text-sm text-gray-500">
              {antallTilordnet} av {nettverk.length} nettverk har RA
            </span>
          </div>

          {nettverk.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
              Ingen nettverk funnet ennå.
            </div>
          )}

          {nettverk.length > 0 && (
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Nettverk</th>
                    <th className="px-4 py-3">Ansvarlig RA</th>
                  </tr>
                </thead>
                <tbody>
                  {synlige.length === 0 && (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">Ingen nettverk matcher søket.</td></tr>
                  )}
                  {synlige.map(nv => (
                    <tr key={nv} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{nv}</td>
                      <td className="px-4 py-3">
                        <select
                          value={kobling[nv] || ''}
                          disabled={lagrer === nv}
                          onChange={e => settAnsvarlig(nv, e.target.value || null)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[220px] disabled:opacity-50"
                        >
                          <option value="">— Ingen RA —</option>
                          {ansatte.map(a => (
                            <option key={a.id} value={a.id}>{a.navn || '(uten navn)'}</option>
                          ))}
                        </select>
                        {lagrer === nv && <span className="ml-2 text-xs text-gray-400">lagrer …</span>}
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
