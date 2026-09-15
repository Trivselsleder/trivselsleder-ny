import { Link } from 'react-router-dom'
import { formaterAntall } from '../lib/leker'
import LekeIkon from './LekeIkon'

export default function LekeKort({ lek, favoritt = false }) {
  // Lite TL-symbol (SVG-sprite) ved tittelen — samme uttrykk som før (w-8 h-8, rounded-lg, på
  // deterministisk TL-farge), bare bedre symbol enn emojien. Diskret, lar kortet være et rolig
  // hvitt kort. Rent dekorativt (aria-hidden) — tittelen ved siden bærer meningen.
  return (
    <Link
      to={`/min-side/aktiviteter/${lek.id}`}
      className="block bg-white rounded-2xl border border-gray-200 hover:border-petrol hover:shadow-md transition p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <LekeIkon lek={lek} className="w-8 h-8 rounded-lg" />
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
