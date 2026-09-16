import { useTranslation } from 'react-i18next'
import { loggBrukHendelse } from '../lib/leker'

// Delt dokumentkort for skoleflatene (Maler & materiell, Aktiv læring/Materiell osv.).
// WCAG: hele kortet er én lenke der tittelen er lenketeksten; «(åpnes i ny fane)» ligger både
// synlig (↗ er aria-hidden) og som skjermlesertekst. Filtype vises som merke. rel="noopener".
// Har dokumentet ingen ekte URL (skal ikke skje i prod), rendres et ikke-klikkbart kort.
//
// FAVORITTHJERTE (migr 132): vises KUN når onToggleFavoritt sendes inn. Hjertet ligger
// UTENFOR kort-lenken (egen knapp, eget aria-label), slik WCAG-notatet krever — ellers ville
// et klikk på hjertet også fulgt lenken. Foreldren eier favoritt-tilstanden (ett oppslag for
// hele lista), kortet bare viser og varsler.
const DOK_IKON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

function Hjerte({ aktiv, tittel, onToggle }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={aktiv}
      aria-label={aktiv
        ? t('favoritt.fjern', { navn: tittel })
        : t('favoritt.leggTil', { navn: tittel })}
      className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-11 h-11 rounded-full text-orange-ink hover:bg-orange/10 focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:outline-none transition"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={aktiv ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  )
}

// onÅpne: valgfri override. Lek-siden sender den (logger pdf_nedlastet med lekens ressurs-id).
// UTENFOR lek-siden logger kortet «dokument_apnet» med DOKUMENTETS id (migr 125).
export default function DokumentKort({ dok, onÅpne = undefined, erFavoritt = undefined, onToggleFavoritt = undefined }) {
  const { t } = useTranslation()
  const klikkbar = !!dok.url
  const visHjerte = typeof onToggleFavoritt === 'function'
  const Wrapper = klikkbar ? 'a' : 'div'
  const aapne = onÅpne || (() => loggBrukHendelse('dokument_apnet', { dokumentId: dok.id }))
  const props = klikkbar ? { href: dok.url, target: '_blank', rel: 'noopener noreferrer', onClick: aapne } : {}
  return (
    <div className="relative">
      {visHjerte && <Hjerte aktiv={!!erFavoritt} tittel={dok.tittel} onToggle={() => onToggleFavoritt(dok)} />}
      <Wrapper
        {...props}
        className={`block bg-white rounded-2xl border border-gray-200 p-4 transition ${visHjerte ? 'pr-14' : ''} ${
          klikkbar
            ? 'hover:border-orange hover:shadow-md focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:outline-none'
            : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-teal/15 text-petrol flex items-center justify-center">{DOK_IKON}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-snug">
              {dok.tittel}
              {klikkbar && <span className="sr-only"> ({t('skoledok.apnesNyFane')})</span>}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dok.filtype && <span className="text-xs uppercase bg-teal/15 text-petrol px-2 py-0.5 rounded-full">{dok.filtype}</span>}
              {(dok.sprak || []).map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t('dok.sprak.' + s, s)}</span>
              ))}
            </div>
          </div>
          {klikkbar && !visHjerte && (
            <span className="ml-auto text-orange-ink shrink-0" aria-hidden="true">↗</span>
          )}
        </div>
      </Wrapper>
    </div>
  )
}
