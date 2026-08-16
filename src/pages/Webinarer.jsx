import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { hentOffentligeWebinarer, datoLang, klokkeslett, datoBlokk } from '../lib/webinar'
import Nedtelling from '../components/webinar/Nedtelling'
import PameldingSkjema from '../components/webinar/PameldingSkjema'

// Offentlig webinar-side (/webinarer). Åpen påmelding for nysgjerrige skoler.
// Møtelenke ligger ALDRI på siden — den kommer i bekreftelses-e-posten.
export default function Webinarer() {
  const [liste, setListe] = useState(null)
  const [feil, setFeil] = useState(null)
  const [valgt, setValgt] = useState(null)
  const [params] = useSearchParams()

  useEffect(() => {
    let aktiv = true
    hentOffentligeWebinarer()
      .then((d) => {
        if (!aktiv) return
        setListe(d)
        // Dyplenke fra invitasjon: ?meld=<id> åpner påmelding direkte
        const meldId = params.get('meld')
        if (meldId) { const w = d.find((x) => x.id === meldId); if (w) setValgt(w) }
      })
      .catch((e) => { if (aktiv) { setFeil(e.message); setListe([]) } })
    return () => { aktiv = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const neste = liste && liste.length ? liste[0] : null

  return (
    <div className="bg-white">
      {/* Intro / hero */}
      <section className="bg-gradient-to-br from-petrol/10 via-white to-orange/10 py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-orange/10 text-orange-ink font-semibold text-sm px-4 py-1.5 rounded-full mb-5">Gratis · uforpliktende</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">Bli kjent med Trivselsleder — live</h1>
          <p className="text-lg text-gray-600 mt-4">
            Vurderer dere programmet? Bli med på et kort intro-webinar. Vi viser hva trivselslederne gjør i praksis,
            hvordan dere kommer i gang, og svarer på det dere lurer på.
          </p>

          {neste && (
            <div className="mt-8 inline-flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-teal">Neste webinar</span>
              <span className="text-xl font-bold text-gray-900 capitalize">{datoLang(neste.starter_at)}</span>
              <span className="text-gray-600">kl. {klokkeslett(neste.starter_at)} · {neste.varighet_min || 40} min</span>
              <Nedtelling starterAt={neste.starter_at} varighetMin={neste.varighet_min} className="mt-1" />
              <button onClick={() => setValgt(neste)} className="mt-3 bg-orange text-gray-900 font-semibold px-6 py-2.5 rounded-full hover:bg-orange/90">
                Meld skolen på
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Hva får dere svar på */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-3 gap-5 text-center">
          {[
            ['Hva er Trivselsleder?', 'Elevene leder aktivitet for elevene — 60 aktive minutter i skolehverdagen.'],
            ['Slik kommer dere i gang', 'Kurs, verktøy og materiell — vi viser hele veien fra oppstart til drift.'],
            ['Spør oss om alt', 'Praktisk gjennomføring, kostnad, erfaringer fra andre skoler.'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-bold text-gray-900">{t}</h3>
              <p className="text-sm text-gray-600 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kommende datoer */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Kommende datoer</h2>
        {feil && <p className="text-sm text-red-600 mb-3">Klarte ikke å hente webinarer akkurat nå.</p>}
        {liste === null ? (
          <p className="text-gray-500">Laster …</p>
        ) : liste.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-gray-600">Ingen åpne datoer akkurat nå.</p>
            <p className="text-gray-500 text-sm mt-1">
              Ta kontakt, så gir vi beskjed om neste webinar — eller <Link to="/kontakt" className="text-orange-ink font-medium">be om en prat</Link>.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {liste.map((w) => {
              const b = datoBlokk(w.starter_at)
              return (
                <li key={w.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="shrink-0 w-16 text-center rounded-xl overflow-hidden border border-gray-200">
                    <div className="bg-orange text-gray-900 text-[11px] font-bold uppercase py-0.5">{b.maaned}</div>
                    <div className="py-1.5"><div className="text-2xl font-extrabold leading-none">{b.dag}</div><div className="text-[11px] text-gray-500 capitalize">{b.ukedag}</div></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{w.tittel}</h3>
                    <p className="text-sm text-gray-500">kl. {klokkeslett(w.starter_at)} · {w.varighet_min || 40} min{w.vert_navn ? ` · ${w.vert_navn}` : ''}</p>
                  </div>
                  <button onClick={() => setValgt(w)} className="shrink-0 bg-orange text-gray-900 text-sm font-semibold px-4 py-2 rounded-full hover:bg-orange/90">Meld på</button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Sosialt bevis */}
      <section className="bg-petrol/5 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-bold text-petrol">640 skoler · 35 000 trivselsledere kurses hvert år</p>
          <p className="text-gray-600 mt-2">Bli med i nettverket av skoler som gir elevene en mer aktiv og inkluderende skolehverdag.</p>
        </div>
      </section>

      {/* Påmeldings-modal */}
      {valgt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setValgt(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-gray-900">{valgt.tittel}</h2>
              <button onClick={() => setValgt(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none" aria-label="Lukk">×</button>
            </div>
            <PameldingSkjema webinar={valgt} intern={false} />
          </div>
        </div>
      )}
    </div>
  )
}
