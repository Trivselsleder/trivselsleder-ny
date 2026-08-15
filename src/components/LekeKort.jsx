import { Link } from 'react-router-dom'

export default function LekeKort({ lek, favoritt = false }) {
  return (
    <Link
      to={`/min-side/aktiviteter/${lek.id}`}
      className="block bg-white rounded-2xl border border-gray-200 hover:border-petrol hover:shadow-md transition p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-gray-900">{lek.tittel}</h3>
        <span className="flex items-center gap-1 shrink-0">
          {favoritt && <span title="Favoritt" className="text-tlred">♥</span>}
          {lek.harVideo && <span title="Har video" className="text-orange">▶</span>}
        </span>
      </div>
      {lek.tekst.formaal && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{lek.tekst.formaal}</p>
      )}
      <div className="flex flex-wrap gap-1 mt-3">
        {lek.egnet.slice(0, 3).map((e) => (
          <span key={e} className="text-xs bg-orange/10 text-orange px-2 py-0.5 rounded-full">{e}</span>
        ))}
        {lek.utenUtstyr && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Uten utstyr</span>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        {[lek.sted, `${lek.antallMin}–${lek.antallMaks}`, lek.trinn.map((t) => t.navn).slice(0, 2).join(', ')]
          .filter(Boolean)
          .join(' · ')}
      </div>
    </Link>
  )
}
