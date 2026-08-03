import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Toppnivå-oversikt over ALLE kurs: totaltall på tvers.
// Ligger øverst i kursplanleggeren, over kurslista.

export default function KursMetaOversikt() {
  const [tall, setTall] = useState(null)

  useEffect(() => {
    supabase
      .from('kurs_skole')
      .select('kommer, svart, forste_utsending_at')
      .range(0, 99999)
      .then(({ data }) => {
        const rader = data ?? []
        // «Invitert» = faktisk sendt invitasjon (forste_utsending_at satt), ikke
        // bare koblet til kurset. Den vanligste feilen er å koble en skole og så
        // glemme å sende — det skal telleren avsløre, ikke skjule.
        const koblet = rader.length
        const inviterteRader = rader.filter(r => r.forste_utsending_at)
        const invitert = inviterteRader.length
        // «Har svart» måles mot SAMME grunnlag (de inviterte), så prosenten aldri
        // kan overstige 100. Kommer/Kommer ikke er absolutte svar-tall og står urørt.
        const svart = inviterteRader.filter(r => r.svart).length
        const kommer = rader.filter(r => r.svart && r.kommer === true).length
        const kommerIkke = rader.filter(r => r.svart && r.kommer === false).length
        const prosent = invitert > 0 ? Math.round((svart / invitert) * 100) : 0
        setTall({ koblet, invitert, svart, kommer, kommerIkke, prosent })
      })
  }, [])

  if (!tall) return null
  // Skjul kun når ingen skoler er koblet i det hele tatt. Koblet-men-ikke-sendt
  // (invitert === 0 mens koblet > 0) er nettopp det RA skal få se.
  if (tall.koblet === 0) return null

  const kort = [
    { etikett: 'Inviterte skoler', verdi: tall.invitert, undertekst: `av ${tall.koblet} koblede`, klasse: 'bg-gray-50 text-gray-800' },
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
            {k.undertekst && <p className="text-xs text-gray-400 mt-0.5">{k.undertekst}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
