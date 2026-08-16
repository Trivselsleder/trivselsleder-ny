import { useEffect, useMemo, useState } from 'react'
import { hentDokumentbank } from '../../lib/leker'

// «Slik lykkes du med TL» = kuratert håndbok. Henter Drift av TL-dokumentene fra
// samme bank som Maler & materiell (ingen dobbeltlagring, jf. vedtak 14. aug).
const HANDBOK_TYPER = ['Drift av TL']

// Innholdsoversikt (kronjuvelen: organisering, voksenrolle, motivasjon). Beskrivende
// «dette finner du her» — knyttes til dokumentene når håndbok-innholdet importeres.
const TEMAER = [
  { ic: '🚀', navn: 'Kom i gang', tekst: 'Oppstart, roller og de første ukene med TL på skolen.' },
  { ic: '💬', navn: 'Voksenrollen', tekst: 'Hvordan de voksne støtter, motiverer og følger opp trivselslederne.' },
  { ic: '🗂️', navn: 'Organisering & logistikk', tekst: 'Vaktlister, utstyr, soner og rutiner som får hverdagen til å gå rundt.' },
  { ic: '⭐', navn: 'Motivasjon & anerkjennelse', tekst: 'Å se elevene, feire innsats og holde gløden oppe gjennom året.' },
  { ic: '🦺', navn: 'Trivselspatruljen', tekst: 'Rekruttering, opplæring og oppfølging av patruljen.' },
  { ic: '🗓️', navn: 'Årshjulet', tekst: 'Naturlige holdepunkter gjennom skoleåret — fra oppstart til avslutning.' },
]

const DOK_IKON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

export default function SkoleDriftAvTL() {
  const [alle, setAlle] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    hentDokumentbank()
      .then(setAlle)
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [])

  const dokumenter = useMemo(() => alle.filter((d) => HANDBOK_TYPER.includes(d.type)), [alle])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Slik lykkes du med TL</h1>
      <p className="text-gray-500 text-sm mt-1">Håndboka bak trivselslederordningen — erfaringen som får den til å virke.</p>

      <div className="mt-4 rounded-2xl bg-petrol/5 border border-petrol/15 px-5 py-4">
        <p className="text-petrol/90">
          Dette er kunnskapen som gjør at TL faktisk fungerer: <strong>organisering</strong>, <strong>voksenrollen</strong> og
          <strong> motivasjon og anerkjennelse</strong>. Ikke skjemaer å fylle ut — men hvordan dere lykkes med ordningen i praksis.
        </p>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mt-8">Dette finner du her</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {TEMAER.map((t) => (
          <div key={t.navn} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <span className="text-xl leading-none mt-0.5" aria-hidden="true">{t.ic}</span>
            <div>
              <h3 className="font-bold text-gray-900">{t.navn}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t.tekst}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mt-10">Håndbok-dokumenter</h2>
      <p className="text-sm text-gray-500 mt-1">Samme dokumenter som i Maler &amp; materiell — samlet her som håndbok.</p>

      {laster && <p className="text-gray-500 mt-6">Laster håndbok …</p>}
      {feil && <p className="text-red-500 mt-6">Kunne ikke hente dokumenter: {feil}</p>}

      {!laster && !feil && (
        dokumenter.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center text-gray-500 py-12 px-4">
            Håndbok-dokumentene er på vei. De dukker opp her så snart de er klare — kuratert etter temaene over.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {dokumenter.map((d) => {
              const Wrapper = d.url ? 'a' : 'div'
              const props = d.url ? { href: d.url, target: '_blank', rel: 'noopener noreferrer' } : {}
              return (
                <Wrapper
                  key={d.id}
                  {...props}
                  className={`flex items-start gap-3 bg-white rounded-2xl border border-gray-200 p-4 transition ${
                    d.url ? 'hover:border-orange hover:shadow-md focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:outline-none' : ''
                  }`}
                >
                  <span className="shrink-0 w-10 h-10 rounded-xl bg-teal/15 text-petrol flex items-center justify-center" aria-hidden="true">{DOK_IKON}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 leading-snug">{d.tittel}</h3>
                    {d.sprak && <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-2">{d.sprak}</span>}
                  </div>
                  {d.url && (
                    <span className="ml-auto text-orange-ink shrink-0">
                      <span aria-hidden="true">↗</span>
                      <span className="sr-only">(åpnes i ny fane)</span>
                    </span>
                  )}
                </Wrapper>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
