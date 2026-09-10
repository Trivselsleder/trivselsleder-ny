import { trinnKort, formaterAntall } from '../lib/leker'
import { beskrivelseTilReact, splittMetaBlokk } from '../lib/beskrivelse'

// Gjenbrukbar lek-INNHOLDSVISNING: tittel + merkelapper, mediefelt + faktaboks, tips, «Om leken»
// og tekstseksjonene slik læreren faktisk ser dem. Brukes av SkoleLek (den ekte siden) OG som
// forhåndsvisning i redigeringsskjemaet — samme kilde, så «forhåndsvisning» = leken slik den blir.
// `lek` er en formLek-formet struktur (eller bygget fra redigeringstilstanden). `handlinger` er en
// valgfri node (knapperaden) som legges til høyre for tittelen — forhåndsvisningen sender den ikke.
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

export default function LekVisning({ lek, handlinger = null }) {
  const t = lek.tekst || {}
  // Metablokk (Antall/Utstyr/tips) skilles ut fra FØRSTE avsnitt — kun for visning, aldri i basen.
  const meta = splittMetaBlokk(t.beskrivelse)
  const beskrivelse = beskrivelseTilReact(meta.restHtml)

  const bilder = lek.bilder || []
  const harVideo = !!lek.harVideo
  // Mediefeltet: video hvis harVideo, ellers første bilde. Resten av bildene vises under «Om leken».
  const slotBilde = !harVideo && bilder.length ? bilder[0] : null
  const ekstraBilder = harVideo ? bilder : (slotBilde ? bilder.slice(1) : [])

  let media = null
  if (harVideo) {
    media = (
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
    )
  } else if (slotBilde) {
    media = (
      <img
        src={slotBilde.storage_sti}
        alt={slotBilde.alt_tekst || lek.tittel || 'Illustrasjon til leken'}
        loading="lazy"
        className="w-full rounded-xl border border-gray-100"
      />
    )
  } else if (lek.video) {
    media = <div className="bg-gray-100 text-gray-500 rounded-xl p-6 text-center text-sm">Video kommer</div>
  }
  const harMedia = media !== null

  const egnet = lek.egnet || []
  const sesong = lek.sesong || []
  const antallVerdi = formaterAntall(lek.antallMin, lek.antallMaks, lek.antallRaatekst) || '—'
  const utstyrVerdi = meta.utstyrTekst || ((lek.utstyr || []).join(', ') || 'Ingen')

  return (
    <>
      {/* Tittel + merkelapper (venstre), handlinger til høyre — under på mobil */}
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">{lek.tittel}</h1>
          {(egnet.length > 0 || sesong.length > 0 || lek.sted) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {egnet.map((e) => (
                <span key={e} className="text-xs bg-orange/10 text-orange-ink px-2 py-0.5 rounded-full">{e}</span>
              ))}
              {sesong.map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{s}</span>
              ))}
              {lek.sted && (
                <span className="text-xs bg-petrol/10 text-petrol px-2 py-0.5 rounded-full capitalize">{lek.sted}</span>
              )}
            </div>
          )}
        </div>
        {handlinger && <div className="md:shrink-0">{handlinger}</div>}
      </header>

      {/* Mediefelt (venstre) + faktaboks (høyre). Ingen media → faktaboks full bredde. */}
      <div className={harMedia ? 'mt-6 grid md:grid-cols-2 gap-6 items-start' : 'mt-6'}>
        {harMedia && <div className="min-w-0">{media}</div>}
        <dl className="bg-petrol/5 rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm self-start">
          <div><dt className="text-gray-500">Antall</dt><dd className="font-medium text-gray-900">{antallVerdi}</dd></div>
          <div><dt className="text-gray-500">Utstyr</dt><dd className="font-medium text-gray-900">{utstyrVerdi}</dd></div>
          <div><dt className="text-gray-500">Sted</dt><dd className="font-medium text-gray-900 capitalize">{lek.sted || '—'}</dd></div>
          <div><dt className="text-gray-500">Trinn</dt><dd className="font-medium text-gray-900">{trinnKort(lek.trinn)}</dd></div>
        </dl>
      </div>

      {/* Tips-felt: lys oransje flate, oransje venstrekant, lyspære */}
      {meta.tips.length > 0 && (
        <div className="mt-5 bg-orange/5 border-l-4 border-orange rounded-r-xl p-4">
          <div className="flex items-start gap-2">
            <span aria-hidden="true" className="text-lg leading-none">💡</span>
            <ul className="space-y-1 text-sm text-gray-800">
              {meta.tips.map((tp, idx) => <li key={idx}>{tp}</li>)}
            </ul>
          </div>
        </div>
      )}

      {beskrivelse && (
        <section className="mt-6">
          <h2 className="font-bold text-gray-900">Om leken</h2>
          <div className="mt-1 text-gray-700 space-y-3">{beskrivelse}</div>
        </section>
      )}

      {ekstraBilder.length > 0 && (
        <div className="mt-4 space-y-3">
          {ekstraBilder.map((b) => (
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
