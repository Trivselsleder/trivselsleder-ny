import { useEffect, useState } from 'react'
import { nedtelling } from '../../lib/webinar'

// Ren client-side nedtelling — ingen websocket. Ticker sjelden når det er lenge
// igjen, hvert sekund den siste minuttet. Returnerer {status,tekst,bliMedNaa}.
export function useNedtelling(starterAt, varighetMin = 60) {
  const [naa, setNaa] = useState(() => new Date())
  useEffect(() => {
    const diff = new Date(starterAt).getTime() - Date.now()
    // tett tikk nær start (siste 16 min), ellers rolig hvert minutt
    const intervall = Math.abs(diff) <= 16 * 60000 ? 1000 : 60000
    const t = window.setInterval(() => setNaa(new Date()), intervall)
    return () => window.clearInterval(t)
  }, [starterAt])
  return nedtelling(starterAt, naa, varighetMin)
}

// Liten nedtellings-pille. bliMedNaa gir pulserende petrol-prikk.
export default function Nedtelling({ starterAt, varighetMin = 60, className = '' }) {
  const n = useNedtelling(starterAt, varighetMin)
  const aktiv = n.bliMedNaa
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${aktiv ? 'text-petrol' : 'text-gray-500'} ${className}`}
      aria-live="polite"
    >
      {aktiv && <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange" />
      </span>}
      {n.tekst}
    </span>
  )
}
