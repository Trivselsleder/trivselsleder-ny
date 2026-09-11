import { useEffect, useRef } from 'react'

// Gjenbrukbar bekreftelsesdialog (WCAG 2.1 AA).
// - role="dialog" + aria-modal, tittel og tekst koblet via aria-labelledby/-describedby
// - fokus flyttes INN i dialogen når den åpnes (til bekreft-knappen)
// - Escape lukker (kaller onAvbryt)
// - fokus føres TILBAKE til elementet som åpnet dialogen når den lukkes
// - Tab holdes inne i dialogen (enkel felle mellom de to knappene)
// - synlig fokus (focus:ring), kun statiske Tailwind-klasser
// - «farlig» gir en rød bekreft-knapp (hvit tekst på red-700 = 5,9:1, over AA);
//   ingen oransje tekst på hvit.
export default function BekreftDialog({
  aapen,
  tittel,
  tekst,
  bekreftTekst = 'Slett',
  avbrytTekst = 'Avbryt',
  farlig = true,
  onBekreft,
  onAvbryt,
}) {
  const bekreftRef = useRef(null)
  const avbrytRef = useRef(null)
  const forrigeFokus = useRef(null)

  useEffect(() => {
    if (!aapen) return
    forrigeFokus.current = document.activeElement
    bekreftRef.current?.focus()
    return () => {
      // Fokus tilbake til knappen som åpnet dialogen.
      if (forrigeFokus.current && typeof forrigeFokus.current.focus === 'function') {
        forrigeFokus.current.focus()
      }
    }
  }, [aapen])

  if (!aapen) return null

  // Enkel fokusfelle: Tab/Shift+Tab sykler mellom Avbryt og Slett.
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onAvbryt()
      return
    }
    if (e.key !== 'Tab') return
    const first = avbrytRef.current
    const last = bekreftRef.current
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const bekreftKlasse = farlig
    ? 'bg-red-700 text-white hover:bg-red-800'
    : 'bg-orange text-gray-900 hover:bg-[#e8641c]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bekreft-tittel"
      aria-describedby="bekreft-tekst"
      onKeyDown={onKeyDown}
      onClick={onAvbryt}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="bekreft-tittel" className="text-lg font-bold text-gray-900">{tittel}</h2>
        <p id="bekreft-tekst" className="text-sm text-gray-600 mt-2">{tekst}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            ref={avbrytRef}
            onClick={onAvbryt}
            className="px-5 py-2.5 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-petrol focus:ring-offset-2"
          >
            {avbrytTekst}
          </button>
          <button
            ref={bekreftRef}
            onClick={onBekreft}
            className={`px-5 py-2.5 rounded-full font-medium focus:outline-none focus:ring-2 focus:ring-petrol focus:ring-offset-2 ${bekreftKlasse}`}
          >
            {bekreftTekst}
          </button>
        </div>
      </div>
    </div>
  )
}
