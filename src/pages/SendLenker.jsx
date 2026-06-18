import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Viser personlige svar-lenker for alle skoler koblet til ett kurs.
// RA kan kopiere lenkene. E-postutsending kobles på senere (Resend).

export default function SendLenker({ kurs, onLukk }) {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [kopiert, setKopiert] = useState(null)

  const basis = window.location.origin

  useEffect(() => {
    supabase
      .from('kurs_skole')
      .select('id, lenke_token, svart, skole:skole_id ( navn )')
      .eq('kurs_id', kurs.id)
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setRader(data ?? [])
        setLaster(false)
      })
  }, [kurs.id])

  function lenkeFor(token) {
    return `${basis}/svar/${token}`
  }

  async function kopier(token, id) {
    try {
      await navigator.clipboard.writeText(lenkeFor(token))
      setKopiert(id)
      setTimeout(() => setKopiert(null), 1500)
    } catch {
      alert('Kunne ikke kopiere automatisk. Marker lenken og kopier manuelt.')
    }
  }

  async function kopierAlle() {
    const tekst = rader
      .filter(r => r.lenke_token)
      .map(r => `${r.skole?.navn || 'Skole'}: ${lenkeFor(r.lenke_token)}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(tekst)
      setKopiert('alle')
      setTimeout(() => setKopiert(null), 1500)
    } catch {
      alert('Kunne ikke kopiere automatisk.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Send lenker</h3>
            <p className="text-gray-500 text-sm">{kurs.navn || 'Kurs'} — personlige svar-lenker per skole</p>
          </div>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {laster && <p className="text-gray-400">Laster lenker …</p>}
        {feil && <p className="text-red-600">Feil: {feil}</p>}

        {!laster && !feil && rader.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            Ingen skoler er koblet til dette kurset ennå. Bruk «Skoler» først.
          </div>
        )}

        {!laster && rader.length > 0 && (
          <>
            <div className="flex justify-end mb-3">
              <button onClick={kopierAlle} className="text-sm bg-orange text-white px-3 py-2 rounded-lg hover:opacity-90">
                {kopiert === 'alle' ? 'Kopiert!' : 'Kopier alle lenker'}
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2">Skole</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rader.map(r => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium">{r.skole?.navn || '—'}</td>
                      <td className="px-4 py-2">
                        {r.svart
                          ? <span className="text-green-700">Svart</span>
                          : <span className="text-gray-400">Ikke svart</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {r.lenke_token
                          ? <button onClick={() => kopier(r.lenke_token, r.id)} className="text-orange hover:underline">
                              {kopiert === r.id ? 'Kopiert!' : 'Kopier lenke'}
                            </button>
                          : <span className="text-red-500 text-xs">mangler token</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Automatisk e-postutsending kommer senere. Foreløpig kopierer du lenkene herfra.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
