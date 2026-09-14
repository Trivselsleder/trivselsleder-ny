import { useTranslation } from 'react-i18next'

// Delt dokumentkort for skoleflatene (Maler & materiell, Slik lykkes du med TL, Aktiv læring/Materiell).
// WCAG: hele kortet er én lenke der tittelen er lenketeksten; «(åpnes i ny fane)» ligger både
// synlig (↗ er aria-hidden) og som skjermlesertekst. Filtype vises som merke. rel="noopener".
// Har dokumentet ingen ekte URL (skal ikke skje i prod), rendres et ikke-klikkbart kort.
const DOK_IKON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

// onÅpne: valgfri callback som kalles når et klikkbart dokument åpnes. Brukes av lek-siden til
// å logge pdf_nedlastet; andre sider sender den ikke (da er onClick undefined = uendret atferd).
export default function DokumentKort({ dok, onÅpne = undefined }) {
  const { t } = useTranslation()
  const klikkbar = !!dok.url
  const Wrapper = klikkbar ? 'a' : 'div'
  const props = klikkbar ? { href: dok.url, target: '_blank', rel: 'noopener noreferrer', onClick: onÅpne } : {}
  return (
    <Wrapper
      {...props}
      className={`block bg-white rounded-2xl border border-gray-200 p-4 transition ${
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
        {klikkbar && (
          <span className="ml-auto text-orange-ink shrink-0" aria-hidden="true">↗</span>
        )}
      </div>
    </Wrapper>
  )
}
