import { Link } from 'react-router-dom'
import { formaterAntall } from '../lib/leker'
import { lekEmoji, lekFarge } from '../lib/lekIkon'

export default function LekeKort({ lek, favoritt = false }) {
  // Lite auto-ikon ved tittelen — NØYAKTIG samme uttrykk som PeriodeplanRutenett (w-8 h-8,
  // rounded-lg, emoji på deterministisk TL-farge). Diskret, tar nesten ingen plass, og lar
  // kortet være et rolig hvitt kort. Rent dekorativt (aria-hidden), så skjermleseren aldri leser
  // opp emojien — tittelen ved siden bærer meningen. Ingen tekst ligger oppå fargekvadratet, så
  // tekstkontrast mot fargen er ikke et tema. (Bildegrenen er fjernet: et miniatyrbilde i et 32px
  // kvadrat gir ikke mening, og liste-RPC-en sok_leker returnerer uansett ingen bilde-URL.)
  const emoji = lekEmoji(lek)
  const farge = lekFarge(lek)
  return (
    <Link
      to={`/min-side/aktiviteter/${lek.id}`}
      className="block bg-white rounded-2xl border border-gray-200 hover:border-petrol hover:shadow-md transition p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-base shrink-0"
            style={{ background: farge }}
            aria-hidden="true"
          >
            {emoji}
          </span>
          <h3 className="font-bold text-gray-900">{lek.tittel}</h3>
        </div>
        <span className="flex items-center gap-1 shrink-0">
          {favoritt && <span title="Favoritt" className="text-tlred">♥</span>}
          {lek.harVideo && <span title="Har video" className="text-orange-ink">▶</span>}
        </span>
      </div>
      {lek.tekst.formaal && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{lek.tekst.formaal}</p>
      )}
      <div className="flex flex-wrap gap-1 mt-3">
        {lek.egnet.slice(0, 3).map((e) => (
          <span key={e} className="text-xs bg-orange/10 text-orange-ink px-2 py-0.5 rounded-full">{e}</span>
        ))}
        {lek.utenUtstyr && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Uten utstyr</span>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        {[lek.sted, formaterAntall(lek.antallMin, lek.antallMaks), lek.trinn.map((t) => t.navn).slice(0, 2).join(', ')]
          .filter(Boolean)
          .join(' · ')}
      </div>
    </Link>
  )
}
