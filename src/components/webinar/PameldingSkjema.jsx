import { useState } from 'react'
import { meldPaaWebinar, lastNedIcs, datoLang, klokkeslett } from '../../lib/webinar'

// Gjenbrukbart påmeldingsskjema. intern=true → innlogget skole (skjuler skole/nyhetsbrev);
// intern=false → offentlig påmelding fra forsiden (skole som fritekst + nyhetsbrev-hake).
// Møtelenke vises ALDRI her — den kommer på e-post (beslutning 15. aug).
export default function PameldingSkjema({ webinar, intern = false, skoleId = null, onFerdig }) {
  const [navn, setNavn] = useState('')
  const [rolle, setRolle] = useState('')
  const [skole, setSkole] = useState('')
  const [epost, setEpost] = useState('')
  const [nyhetsbrev, setNyhetsbrev] = useState(false)
  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState(null)
  const [ferdig, setFerdig] = useState(null) // 'ok' | 'fullt'

  async function send(e) {
    e?.preventDefault?.()
    setFeil(null)
    if (!navn.trim() || !epost.trim()) { setFeil('Fyll inn navn og e-post.'); return }
    setSender(true)
    try {
      const res = await meldPaaWebinar({
        webinarId: webinar.id,
        navn: navn.trim(),
        epost: epost.trim(),
        rolle: [rolle.trim(), !intern && skole.trim() ? `Skole: ${skole.trim()}` : ''].filter(Boolean).join(' · ') || null,
        skoleId,
        nyhetsbrevSamtykke: !intern && nyhetsbrev,
        intern,
      })
      setFerdig(res.status === 'fullt' ? 'fullt' : 'ok')
      onFerdig?.(res)
    } catch (e2) {
      setFeil(e2.message || 'Noe gikk galt. Prøv igjen.')
    } finally { setSender(false) }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20'

  if (ferdig === 'fullt') {
    return (
      <div className="rounded-xl bg-tlgold/10 border border-tlgold/40 p-4 text-sm text-gray-800" role="status">
        Webinaret er dessverre fullt. Vil du stå på venteliste, ta kontakt med oss — eller meld deg på neste dato.
      </div>
    )
  }
  if (ferdig === 'ok') {
    return (
      <div className="rounded-xl bg-petrol/5 border border-petrol/30 p-4" role="status" aria-live="polite">
        <p className="font-semibold text-petrol">Takk, du er påmeldt! ✓</p>
        <p className="text-sm text-gray-700 mt-1">
          Du får en bekreftelse på <b>{epost.trim()}</b> med møtelenke og kalenderfil. Legg det gjerne rett i kalenderen din nå:
        </p>
        <button
          type="button"
          onClick={() => lastNedIcs(webinar)}
          className="mt-3 text-sm font-semibold border border-petrol/40 text-petrol rounded-full px-4 py-1.5 hover:bg-petrol/5"
        >
          Legg i kalender (.ics)
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <p className="text-sm text-gray-600">
        {datoLang(webinar.starter_at)} kl. {klokkeslett(webinar.starter_at)} · {webinar.varighet_min || 45} min.
        Møtelenken sender vi på e-post.
      </p>
      {feil && <p className="text-sm text-red-600" role="alert">{feil}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Navn</span>
          <input value={navn} onChange={(e) => setNavn(e.target.value)} className={felt} required aria-label="Navn" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Rolle (valgfritt)</span>
          <input value={rolle} onChange={(e) => setRolle(e.target.value)} placeholder="F.eks. rektor, lærer" className={felt} aria-label="Rolle" />
        </label>
      </div>

      {!intern && (
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Skole</span>
          <input value={skole} onChange={(e) => setSkole(e.target.value)} placeholder="Skolens navn" className={felt} aria-label="Skole" />
        </label>
      )}

      <label className="block">
        <span className="text-xs font-medium text-gray-600">E-post</span>
        <input type="email" value={epost} onChange={(e) => setEpost(e.target.value)} className={felt} required aria-label="E-post" />
      </label>

      {!intern && (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={nyhetsbrev} onChange={(e) => setNyhetsbrev(e.target.checked)} className="mt-0.5 accent-orange" />
          <span>Send meg også datoer for kommende kurs og webinarer.</span>
        </label>
      )}

      <button
        type="submit"
        disabled={sender}
        className="bg-orange text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-orange/90 disabled:opacity-50"
      >
        {sender ? 'Melder på …' : 'Meld på'}
      </button>
    </form>
  )
}
