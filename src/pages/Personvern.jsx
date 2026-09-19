import { useTranslation } from 'react-i18next'

// PERSONVERNERKLÆRING (/personvern). Footeren har lenket hit på hver side; ruta manglet
// og ga 404. Teksten er hentet ORDRETT fra PERSONVERNERKLARING-trivselsleder.md (den
// endelige, juristvurderte erklæringen som 19. sep 2026 erstattet utkastet
// claude_PERSONVERNERKLARING-14sep.md — det gamle utkastet skal ikke lenger brukes som
// kilde). Ingen omskriving (se TIL-CLAUDE-notatet). Innholdet ligger strukturert i i18n
// (personvern.seksjoner) så det kan oversettes og rendres uten dangerouslySetInnerHTML.
//
// Den norske teksten er den autoritative. Den svenske versjonen er IKKE en direkte
// oversettelse (annen tilsynsmyndighet, «huvudman», annet rettsgrunnlag), og lages
// separat når den norske er juridisk godkjent — se kildens Del B4. Inntil da faller sv
// tilbake til den norske teksten (i18next fallbackLng), med et svensk varsel øverst.

// Én tekstlinje bygd av «runs»: vanlig tekst (t), fet (b) eller lenke (a + url).
function Runs({ runs }) {
  return (
    <>
      {runs.map((r, i) => {
        if (r.b) return <strong key={i}>{r.b}</strong>
        if (r.a) return <a key={i} href={r.url} className="text-orange-ink underline hover:text-[#8A4109]">{r.a}</a>
        return <span key={i}>{r.t}</span>
      })}
    </>
  )
}

function Blokk({ blokk }) {
  if (blokk.type === 'liste') {
    return (
      <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700 leading-relaxed">
        {blokk.punkter.map((p, i) => (
          <li key={i}><Runs runs={p.runs} /></li>
        ))}
      </ul>
    )
  }
  if (blokk.type === 'tabell') {
    // tabIndex=0 + role/label: på smal skjerm kan tabellen scrolle vannrett, og en
    // scrollbar region må kunne nås med tastatur (WCAG 2.1.1). axe krevde dette på 390px.
    return (
      <div
        className="overflow-x-auto mb-4"
        tabIndex={0}
        role="region"
        aria-label={blokk.kolonner.join(', ')}
      >
        <table className="w-full text-sm border border-gray-200 border-collapse">
          <thead>
            <tr>
              {blokk.kolonner.map((k, i) => (
                <th key={i} scope="col" className="text-left font-semibold text-gray-900 bg-gray-50 border border-gray-200 px-3 py-2">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blokk.rader.map((rad, ri) => (
              <tr key={ri}>
                {rad.map((celle, ci) => (
                  <td key={ci} className="align-top text-gray-700 border border-gray-200 px-3 py-2"><Runs runs={celle} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  // type === 'p'
  return <p className="mb-4 text-gray-700 leading-relaxed"><Runs runs={blokk.runs} /></p>
}

export default function Personvern() {
  const { t, i18n } = useTranslation()
  const seksjoner = t('personvern.seksjoner', { returnObjects: true })
  const visSvVarsel = (i18n.resolvedLanguage || i18n.language || '').startsWith('sv')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('personvern.tittel')}</h1>
      <p className="text-sm text-gray-500 italic mb-8">{t('personvern.undertittel')}</p>

      {visSvVarsel && (
        <div className="bg-orange/10 border border-orange/30 rounded-xl p-4 mb-8 text-sm text-gray-800" role="note">
          {t('personvern.svVarsel')}
        </div>
      )}

      {Array.isArray(seksjoner) && seksjoner.map((s, i) => (
        <section key={i} className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">{s.h2}</h2>
          {s.blokker.map((b, bi) => (
            <Blokk key={bi} blokk={b} />
          ))}
        </section>
      ))}
    </div>
  )
}
