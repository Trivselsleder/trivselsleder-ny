import { TYPE_ETIKETT, datoBlokk, klokkeslett, lastNedIcs } from '../../lib/webinar'
import { useNedtelling } from './Nedtelling'

// Ett webinar som kort: dato-blokk + tittel + type-chip + nedtelling.
// Handling avhenger av kontekst: onMeldPaa (internt/eksternt) eller påmeldt-status.
export default function WebinarKort({ webinar, paameldt = false, onMeldPaa, kompakt = false }) {
  const b = datoBlokk(webinar.starter_at)
  const n = useNedtelling(webinar.starter_at, webinar.varighet_min)
  const type = TYPE_ETIKETT[webinar.type] || 'Webinar'

  return (
    <div className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 hover:border-orange/40 transition-colors">
      {/* Dato-blokk (kalenderark) */}
      <div className="shrink-0 w-16 text-center rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-orange text-white text-[11px] font-bold uppercase py-0.5">{b.maaned}</div>
        <div className="py-1.5">
          <div className="text-2xl font-extrabold leading-none text-gray-900">{b.dag}</div>
          <div className="text-[11px] text-gray-500 capitalize">{b.ukedag}</div>
        </div>
      </div>

      {/* Innhold */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-teal bg-teal/10 px-2 py-0.5 rounded-full">{type}</span>
          {webinar.synlighet === 'offentlig' && <span className="text-[11px] text-gray-400">Åpent</span>}
        </div>
        <h3 className="font-bold text-gray-900 leading-snug mt-1 truncate">{webinar.tittel}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          kl. {klokkeslett(webinar.starter_at)} · {webinar.varighet_min || 45} min
          <span className="mx-1.5">·</span>
          <span className={n.bliMedNaa ? 'text-petrol font-semibold' : ''}>{n.tekst}</span>
        </p>
        {!kompakt && webinar.beskrivelse && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{webinar.beskrivelse}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          {paameldt ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-petrol">✓ Du er påmeldt</span>
          ) : (
            <button
              type="button"
              onClick={() => onMeldPaa?.(webinar)}
              className={`text-sm font-semibold px-4 py-1.5 rounded-full text-white ${n.bliMedNaa ? 'bg-petrol hover:bg-petrol/90' : 'bg-orange hover:bg-orange/90'}`}
            >
              {n.bliMedNaa ? 'Bli med nå' : 'Meld på'}
            </button>
          )}
          <button
            type="button"
            onClick={() => lastNedIcs(webinar)}
            className="text-sm border border-gray-300 rounded-full px-3 py-1.5 hover:border-orange hover:text-orange"
          >
            Legg i kalender
          </button>
        </div>
      </div>
    </div>
  )
}
