import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// C2 (høring): abonnements-lenker til kalender-feeder.
//
// Viser den innloggede RA-ens EGNE lenker: «Mine kurs» (kursene i dine nettverk)
// og «Hele oversikten» (alle kurs). Lenkene hentes via en ansatt-sikret RPC.
// Per-kursholder-lenker ligger i «Kursholder-plan»-fanen.
//
// Slik brukes en lenke: kopier den, og i kalenderappen velg «Legg til kalender
// fra URL» (Google/Apple/Outlook). Kursene dukker opp og oppdaterer seg selv.

function LenkeBoks({ tittel, forklaring, url }) {
  const [kopiert, setKopiert] = useState(false)
  async function kopier() {
    try {
      await navigator.clipboard.writeText(url)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    } catch {
      // Klarte ikke å kopiere automatisk — marker teksten manuelt.
    }
  }
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <p className="font-medium text-gray-900">{tittel}</p>
      <p className="text-sm text-gray-500 mb-3">{forklaring}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          readOnly
          value={url}
          onFocus={e => e.target.select()}
          className="flex-1 min-w-[240px] border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600"
        />
        <button onClick={kopier}
          className="bg-orange text-gray-900 px-4 py-2 rounded-lg hover:opacity-90 text-sm whitespace-nowrap">
          {kopiert ? 'Kopiert!' : 'Kopier lenke'}
        </button>
      </div>
    </div>
  )
}

export default function AdminKalender() {
  const [lenker, setLenker] = useState(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    (async () => {
      setLaster(true); setFeil(null)
      const { data, error } = await supabase.rpc('hent_mine_kalenderlenker')
      if (error) { setFeil(error.message); setLaster(false); return }
      // RPC returnerer én rad (ra_token, alle_token).
      const rad = Array.isArray(data) ? data[0] : data
      setLenker(rad || null)
      setLaster(false)
    })()
  }, [])

  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const mineUrl = lenker?.ra_token ? `${base}/api/kurs/kalender.ics?token=${lenker.ra_token}` : ''
  const alleUrl = lenker?.alle_token ? `${base}/api/kurs/kalender.ics?token=${lenker.alle_token}` : ''

  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Abonner på kursene dine i din egen kalender. Kopier en lenke under og legg den til i
          kalenderappen («Legg til kalender fra URL» i Google/Apple/Outlook) — kursene dukker opp
          og oppdaterer seg selv. Lenkene er personlige; del dem bare med den de gjelder.
          Kursholdernes egne lenker finner du under «Kursholder-plan».
        </p>
      </div>

      {laster && <p className="text-gray-400">Laster …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && (
        <div className="space-y-4">
          {mineUrl && (
            <LenkeBoks
              tittel="Mine kurs"
              forklaring="Alle kurs i nettverkene du er RA for."
              url={mineUrl}
            />
          )}
          {alleUrl && (
            <LenkeBoks
              tittel="Hele oversikten"
              forklaring="Alle kurs i systemet — for totalbildet."
              url={alleUrl}
            />
          )}
          {!mineUrl && !alleUrl && (
            <p className="text-gray-400">Fant ingen kalenderlenker for kontoen din.</p>
          )}
        </div>
      )}
    </div>
  )
}
