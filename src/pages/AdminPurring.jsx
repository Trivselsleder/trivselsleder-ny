import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Purring og påminnelse (Trinn A — RA sender via egen e-postklient, BCC).
// modus="purring": de som IKKE har svart.  modus="paaminnelse": de som HAR svart.
// Mottaker: Hovedkontakt TL (hktl_epost).

export default function AdminPurring({ modus = 'purring' }) {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    supabase
      .from('kurs_skole')
      .select('id, svart, kommer, skoler(navn, hktl_epost), kurs!kurs_skole_kurs_id_fkey(navn, dato)')
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setRader(data ?? [])
        setLaster(false)
      })
  }, [])

  const erPurring = modus === 'purring'
  const data = erPurring ? rader.filter(r => !r.svart) : rader.filter(r => r.svart)

  const tittel = erPurring ? 'Purring — ikke svart' : 'Påminnelse — har svart'
  const beskrivelse = erPurring
    ? 'Skoler som ennå ikke har svart på kursinvitasjonen.'
    : 'Skoler som har svart. Minn dem om kurset før kursdato.'
  const knappetekst = erPurring ? 'Send purring' : 'Send påminnelse'
  const farge = erPurring ? 'bg-[#D6006E] hover:opacity-90' : 'bg-[#F47920] hover:opacity-90'

  function epostliste(liste) {
    return liste.map(r => r.skoler?.hktl_epost).filter(Boolean)
  }

  function sendTil(liste) {
    const adresser = epostliste(liste)
    if (adresser.length === 0) {
      alert('Ingen e-postadresser å sende til. Sjekk at skolene har Hovedkontakt TL-e-post.')
      return
    }
    window.location.href = `mailto:?bcc=${adresser.join(',')}`
  }

  function formaterDato(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const medEpost = epostliste(data).length

  return (
    <div>
      <p className="text-gray-500 mb-6 text-sm">
        Sender via din egen e-postklient (BCC). Mottaker er Hovedkontakt TL.
      </p>

      {laster && <p className="text-gray-400">Laster …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{tittel}</h2>
              <p className="text-sm text-gray-500">{beskrivelse}</p>
            </div>
            <button
              onClick={() => sendTil(data)}
              disabled={medEpost === 0}
              className={`text-sm text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${farge}`}
            >
              {knappetekst} ({medEpost})
            </button>
          </div>

          {data.length === 0 ? (
            <p className="text-gray-400 mt-4">Ingen skoler i denne listen nå.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Skole</th>
                    <th className="text-left px-4 py-2">Kurs</th>
                    <th className="text-left px-4 py-2">Dato</th>
                    <th className="text-left px-4 py-2">Hovedkontakt TL e-post</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{r.skoler?.navn || '—'}</td>
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.kurs?.navn || '—'}</td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">{formaterDato(r.kurs?.dato)}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {r.skoler?.hktl_epost || <span className="text-red-500 text-xs">mangler e-post</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
