import { trinnKort, formaterAntall } from '../lib/leker'
import { beskrivelseTilReact } from '../lib/beskrivelse'

// Gjenbrukbar lek-INNHOLDSVISNING: meta-rutenett, egnet/sesong-merker, video og tekstseksjonene
// slik læreren faktisk ser dem. Brukes av SkoleLek (den ekte siden) OG som forhåndsvisning i
// redigeringsskjemaet — samme kilde, så «forhåndsvisning» = leken slik den blir. `lek` er en
// formLek-formet struktur (eller bygget fra redigeringstilstanden).
const PUNKTER = [
  ['forberedelse', 'Forberedelse'],
  ['inndeling', 'Inndeling'],
  ['utgangsposisjon', 'Utgangsposisjon'],
  ['formaal', 'Formålet'],
  ['kronologi', 'Slik gjør dere det'],
  ['regler', 'Regler'],
  ['variasjoner', 'Variasjoner og tilpasninger'],
  ['instruktoernotat', 'Notat til den voksne'],
]

const BUNNY_LIB = '727245'

export default function LekVisning({ lek }) {
  const t = lek.tekst || {}
  const beskrivelse = beskrivelseTilReact(t.beskrivelse)
  const bilder = lek.bilder || []
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 text-sm">
        <div><div className="text-gray-500">Sted</div><div className="font-medium capitalize">{lek.sted || '—'}</div></div>
        <div><div className="text-gray-500">Antall</div><div className="font-medium">{formaterAntall(lek.antallMin, lek.antallMaks, lek.antallRaatekst) || '–'}</div></div>
        <div><div className="text-gray-500">Trinn</div><div className="font-medium">{trinnKort(lek.trinn)}</div></div>
        <div><div className="text-gray-500">Utstyr</div><div className="font-medium">{(lek.utstyr || []).join(', ') || 'Ingen'}</div></div>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {(lek.egnet || []).map((e) => <span key={e} className="text-xs bg-orange/10 text-orange-ink px-2 py-0.5 rounded-full">{e}</span>)}
        {(lek.sesong || []).map((s) => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
      </div>

      {beskrivelse && (
        <section className="mt-6">
          <h2 className="font-bold text-gray-900">Om leken</h2>
          <div className="mt-1 text-gray-700 space-y-3">{beskrivelse}</div>
        </section>
      )}

      {bilder.length > 0 && (
        <div className="mt-4 space-y-3">
          {bilder.map((b) => (
            <img
              key={b.id}
              src={b.storage_sti}
              alt={b.alt_tekst || lek.tittel || 'Illustrasjon til leken'}
              loading="lazy"
              className="w-full max-w-2xl rounded-xl border border-gray-100"
            />
          ))}
        </div>
      )}

      {lek.video && (
        <div className="mt-5">
          {lek.harVideo ? (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${lek.video.bunny_video_id}?preload=false&autoplay=false`}
                loading="lazy"
                className="absolute inset-0 w-full h-full rounded-xl border-0"
                allow="accelerometer;gyroscope;encrypted-media;picture-in-picture"
                allowFullScreen
                title={lek.tittel}
              />
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-500 rounded-xl p-6 text-center text-sm">Video kommer</div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {PUNKTER.map(([k, label]) =>
          t[k] ? (
            <section key={k}>
              <h2 className="font-bold text-gray-900">{label}</h2>
              <p className="text-gray-700 whitespace-pre-line">{t[k]}</p>
            </section>
          ) : null,
        )}
      </div>
    </>
  )
}
