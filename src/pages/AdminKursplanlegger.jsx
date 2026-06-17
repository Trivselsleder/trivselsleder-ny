import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AdminHaller from './AdminHaller'

function formaterDato(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function KursOversikt() {
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
    <div>
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

export default function AdminKursplanlegger() {
  const navigate = useNavigate()
  const [fane, setFane] = useState('kurs')

  const faner = [
    { id: 'kurs', navn: 'Kurs' },
    { id: 'haller', navn: 'Haller' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate('/admin')}
        className="text-sm text-gray-500 hover:text-orange mb-4"
      >
        ← Tilbake til admin
      </button>

      <h1 className="text-3xl font-bold text-orange mb-2">Kursplanlegger</h1>
      <p className="text-gray-500 mb-6">Planlegg lekekurs, send invitasjoner og følg opp svar.</p>

      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {faner.map(f => (
          <button
            key={f.id}
            onClick={() => setFane(f.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              fane === f.id
                ? 'border-orange text-orange'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {f.navn}
          </button>
        ))}
      </div>

      {fane === 'kurs' && <KursOversikt />}
      {fane === 'haller' && <AdminHaller />}
    </div>
  )
}
