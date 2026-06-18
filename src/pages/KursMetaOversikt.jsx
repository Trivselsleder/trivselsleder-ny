import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Toppnivå-oversikt over ALLE kurs: totaltall på tvers.
// Ligger øverst i kursplanleggeren, over kurslista.

export default function KursMetaOversikt() {
  const [tall, setTall] = useState(null)

  useEffect(() => {
    supabase
      .from('kurs_skole')
      .select('kommer, svart')
      .range(0, 99999)
      .then(({ data }) => {
        const rader = data ?? []
        const invitert = rader.length
        const svart = rader.filter(r => r.svart).length
        const kommer = rader.filter(r => r.svart && r.kommer === true).length
        const kommerIkke = rader.filter(r => r.svart && r.kommer === false).length
        const prosent = invitert > 0 ? Math.round((svart / invitert) * 100) : 0
        setTall({ invitert, svart, kommer, kommerIkke, prosent })
      })
  }, [])

  if (!tall) return null
  if (tall.invitert === 0) return null

  const kort = [
    { etikett: 'Inviterte skoler', verdi: tall.invitert, klasse: 'bg-gray-50 text-gray-800' },
    { etikett: 'Har svart', verdi: `${tall.svart} (${tall.prosent}%)`, klasse: 'bg-gray-50 text-gray-800' },
    { etikett: 'Kommer', verdi: tall.kommer, klasse: 'bg-green-50 text-green-700' },
    { etikett: 'Kommer ikke', verdi: tall.kommerIkke, klasse: 'bg-pink-50 text-pink-700' },
  ]

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Oversikt — alle kurs</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kort.map(k => (
          <div key={k.etikett} className={'rounded-xl border border-gray-200 p-4 ' + k.klasse}>
            <p className="text-2xl font-bold">{k.verdi}</p>
            <p className="text-sm mt-1">{k.etikett}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
