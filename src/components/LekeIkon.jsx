import { lekIkonId, lekFarge, kontrastTekst } from '../lib/lekIkon'

// Lite avrundet fargekvadrat med et TL-symbol (SVG-sprite). Erstatter emojien. Symbolet bruker
// currentColor; vi setter den til den av hvit/nær-svart som gir best kontrast mot kvadratets farge.
// Rent dekorativt (aria-hidden). `className` styrer størrelse/avrunding per bruksted (uendret layout).
export default function LekeIkon({ lek, className = 'w-8 h-8 rounded-lg' }) {
  const harLek = lek && (lek.id || lek.tittel)
  const farge = harLek ? lekFarge(lek) : '#9ca3af'
  const id = harLek ? lekIkonId(lek) : 'tl-utenutstyr'
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ background: farge }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="w-3/4 h-3/4" style={{ color: kontrastTekst(farge) }}>
        <use href={`#${id}`} />
      </svg>
    </span>
  )
}
