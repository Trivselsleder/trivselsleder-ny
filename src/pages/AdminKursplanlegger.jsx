import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formaterDato(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function AdminKursplanlegger() {
  const navigate = useNavigate()
  const [kurs, setKurs] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    supabase
      .from('kurs')
      .select('*')
      .order('dato', { ascending: true })
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setKurs(data ?? [])
        setLaster(false)
      })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate('/admin')}
        className="text-sm text-gray-500 hover:text-orange mb-4"
      >
        ← Tilbake til admin
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange mb-2">Kursplanlegger</h1>
          <p className="text-gray-500">Planlegg lekekurs, send invitasjoner og følg opp svar.</p>
        </div>
      </div>

      {laster && <p className="text-gray-400">Laster kurs …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && kurs.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          Ingen kurs opprettet ennå.
        </div>
      )}

      {!laster && kurs.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Dato</th>
                <th className="px-4 py-3">Nettverk</th>
                <th className="px-4 py-3">RA</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {kurs.map(k => (
                <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{formaterDato(k.dato)}</td>
                  <td className="px-4 py-3">{k.nettverk || '—'}</td>
                  <td className="px-4 py-3">{k.ra || '—'}</td>
                  <td className="px-4 py-3">{k.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
