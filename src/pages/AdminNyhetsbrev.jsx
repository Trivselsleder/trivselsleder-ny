import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  forhandsvisBrukA, sendBrukA, sendTestBrukA, hentWebinarerTilOppfolging,
  hentUtsendinger, hentMottakerTall, hentMotorStatus,
} from '../lib/nyhetsbrevAdmin'

// Utsendinger (Resend Broadcasts) — fundamentet + Bruk A (webinar-oppfølging).
// Prinsipp: systemet foreslår, mennesket bestemmer. Forhåndsvisning er alltid
// tørrkjøring; ekte sending krever motor_aktiv='ja' og en eksplisitt bekreftelse.

const STATUS_ETIKETT = { utkast: 'Kladd', planlagt: 'Planlagt', sendt: 'Sendt', feilet: 'Feilet' }

function datoTid(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'short' })
    + ' kl. ' + d.toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' })
}

export default function AdminNyhetsbrev() {
  const [sp] = useSearchParams()
  const [webinarer, setWebinarer] = useState([])
  const [utsendinger, setUtsendinger] = useState(null)
  const [tall, setTall] = useState(null)
  const [motor, setMotor] = useState(null)
  const [feil, setFeil] = useState(null)

  // Skjema for Bruk A
  const [webinarId, setWebinarId] = useState(sp.get('webinar') || '')
  const [inkluderTla, setInkluderTla] = useState(false)
  const [opptakLenke, setOpptakLenke] = useState('')
  const [emne, setEmne] = useState('')
  const [planlagt, setPlanlagt] = useState('')
  const [forhaands, setForhaands] = useState(null)
  const [jobber, setJobber] = useState(false)
  const [resultat, setResultat] = useState(null)

  function lastAlt() {
    hentWebinarerTilOppfolging().then(setWebinarer).catch((e) => setFeil(e.message))
    hentUtsendinger().then(setUtsendinger).catch((e) => { setFeil(e.message); setUtsendinger([]) })
    hentMottakerTall().then(setTall).catch(() => setTall(null))
    hentMotorStatus().then(setMotor).catch(() => setMotor(null))
  }
  useEffect(lastAlt, [])

  // Endres innholdsvalgene, er forhåndsvisningen utdatert → send-knappen skjules
  // til admin har forhåndsvist på nytt (mennesket skal se det som faktisk går ut).
  function endre(setter) {
    return (verdi) => { setter(verdi); setForhaands(null); setResultat(null) }
  }
  const settWebinarId = endre(setWebinarId)
  const settInkluderTla = endre(setInkluderTla)
  const settOpptakLenke = endre(setOpptakLenke)
  const settEmne = endre(setEmne)
  const settPlanlagt = endre(setPlanlagt)

  async function kjorForhandsvis() {
    if (!webinarId) { setFeil('Velg et webinar først.'); return }
    setJobber(true); setFeil(null); setResultat(null)
    try {
      const r = await forhandsvisBrukA({
        webinar_id: webinarId, inkluder_tla: inkluderTla,
        opptak_lenke: opptakLenke || null, emne: emne || null,
      })
      setForhaands(r)
    } catch (e) { setFeil(e.message); setForhaands(null) } finally { setJobber(false) }
  }

  async function kjorSend() {
    const antall = forhaands?.antall_mottakere || 0
    const hva = planlagt
      ? `Planlegge utsendingen til ${antall} mottakere (${datoTid(new Date(planlagt).toISOString())})?`
      : `Sende utsendingen til ${antall} mottakere NÅ?`
    if (!window.confirm(hva + ' Hver mottaker får personlig avmeldingslenke.')) return
    setJobber(true); setFeil(null)
    try {
      const r = await sendBrukA({
        webinar_id: webinarId, inkluder_tla: inkluderTla,
        opptak_lenke: opptakLenke || null, emne: emne || null,
        planlagt_at: planlagt ? new Date(planlagt).toISOString() : null,
      })
      setResultat(r); setForhaands(null); lastAlt()
    } catch (e) { setFeil(e.message) } finally { setJobber(false) }
  }

  // Ekte test-e-post til ÉN adresse (eget test-segment) — beviser flettingen av
  // den personlige avmeldingslenken uten å røre skolene. Krever motor PÅ.
  async function kjorTest() {
    const adresse = window.prompt('Send en ekte test-e-post (kun til denne ene adressen):')
    if (!adresse) return
    setJobber(true); setFeil(null)
    try {
      const r = await sendTestBrukA({
        webinar_id: webinarId, inkluder_tla: inkluderTla,
        opptak_lenke: opptakLenke || null, emne: emne || null, test_epost: adresse.trim(),
      })
      setResultat({ ...r, antall_mottakere: 1 })
    } catch (e) { setFeil(e.message) } finally { setJobber(false) }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Utsendinger (nyhetsbrev)</h1>
      <p className="text-gray-500 text-sm mb-5">
        Masseutsendinger via Resend Broadcasts, med egen samtykkebase og personlig avmeldingslenke i hver e-post.
        <Link to="/admin" className="text-orange-ink ml-2">← Admin</Link>
      </p>

      {/* Statuslinje */}
      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <span className={`px-3 py-1.5 rounded-full font-medium ${motor === 'ja' ? 'bg-petrol/10 text-petrol' : 'bg-[#CF442F]/10 text-[#CF442F]'}`}>
          {motor === 'ja' ? 'Motor PÅ — ekte utsending mulig' : 'Nødbrems PÅ (motor_aktiv ≠ «ja») — kun forhåndsvisning'}
        </span>
        {tall && (
          <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
            Mottakerbase: {tall.totalt} registrert · {tall.avmeldte} avmeldt
          </span>
        )}
      </div>

      {feil && <p className="text-sm text-red-600 mb-3" role="alert">{feil}</p>}

      {/* ── Bruk A: webinar-oppfølging ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Webinar-oppfølging (Bruk A)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Én e-post som både takker de som deltok og fanger opp de som gikk glipp av webinaret.
          Går til skolenes kontaktpersoner (HTLA{inkluderTla ? ' + TLA' : ''}) på aktive skoler.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <label className="block"><span className="text-xs font-medium text-gray-600">Webinar</span>
            <select value={webinarId} onChange={(e) => settWebinarId(e.target.value)} className={felt} aria-label="Velg webinar">
              <option value="">Velg webinar …</option>
              {webinarer.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.tittel} — {datoTid(w.starter_at)}{new Date(w.starter_at) > new Date() ? ' (ikke avholdt)' : ''}
                </option>
              ))}
            </select></label>
          <label className="block"><span className="text-xs font-medium text-gray-600">Emne (valgfritt — forslag lages automatisk)</span>
            <input value={emne} onChange={(e) => settEmne(e.target.value)} className={felt} placeholder="La stå tom for forslag" /></label>
        </div>
        <label className="block mb-3"><span className="text-xs font-medium text-gray-600">Lenke til opptaket (valgfritt)</span>
          <input type="url" value={opptakLenke} onChange={(e) => settOpptakLenke(e.target.value)} className={felt} placeholder="https://… (utelates seksjonen om opptak hvis tom)" />
          <span className="text-[11px] text-gray-400">Hentes automatisk fra webinar-modulen når opptaksdelen er på plass (V1.1). Inntil da limes den inn her.</span></label>
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inkluderTla} onChange={(e) => settInkluderTla(e.target.checked)} className="accent-orange" />
            Ta også med TLA-ene (i tillegg til HTLA)
          </label>
          <label className="block"><span className="text-xs font-medium text-gray-600">Planlagt sending (valgfritt — tomt = send nå)</span>
            <input type="datetime-local" value={planlagt} onChange={(e) => settPlanlagt(e.target.value)} className={felt} /></label>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={kjorForhandsvis} disabled={jobber || !webinarId}
            className="text-sm border border-gray-300 rounded-full px-4 py-1.5 hover:border-orange hover:text-orange-ink disabled:opacity-50">
            {jobber ? '…' : 'Forhåndsvis (tørrkjøring)'}
          </button>
          {forhaands && forhaands.antall_mottakere > 0 && (
            <button onClick={kjorSend} disabled={jobber || motor !== 'ja'}
              title={motor !== 'ja' ? 'Nødbremsen er på — skru på motor_aktiv for ekte utsending' : undefined}
              className="text-sm font-semibold bg-orange text-gray-900 rounded-full px-5 py-1.5 hover:bg-orange/90 disabled:opacity-50">
              {planlagt ? `Planlegg for ${forhaands.antall_mottakere}` : `Send til ${forhaands.antall_mottakere}`}
            </button>
          )}
          {forhaands && (
            <button onClick={kjorTest} disabled={jobber || motor !== 'ja'}
              title={motor !== 'ja' ? 'Nødbremsen er på — også test-e-post krever motor_aktiv = «ja»' : 'Ekte e-post til én adresse du velger'}
              className="text-sm border border-petrol/40 text-petrol rounded-full px-4 py-1.5 hover:bg-petrol/5 disabled:opacity-50">
              Send test til én adresse
            </button>
          )}
        </div>

        {forhaands && (
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm text-gray-700">
              <b>{forhaands.antall_mottakere}</b> mottakere
              {forhaands.ekskludert_avmeldt ? ` · ${forhaands.ekskludert_avmeldt} holdt utenfor (avmeldt)` : ''}
              {forhaands.uten_epost ? ` · ${forhaands.uten_epost} skoler uten e-post` : ''}
              {!forhaands.avholdt && <span className="text-[#B5560F]"> · webinaret er ikke avholdt ennå — velg planlagt tidspunkt etter slutt</span>}
              {forhaands.har_opptak_registrert && !opptakLenke && <span className="text-[#B5560F]"> · det finnes opptak i webinar-modulen — vurder å lime inn lenken</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1">Emne: <b>{forhaands.emne}</b> · Fra: {forhaands.fra}</p>
            {forhaands.mottakere?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {forhaands.mottakere.slice(0, 15).map((m, i) => (
                  <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600" title={`${m.skole || ''} (${m.rolle})`}>{m.epost}</span>
                ))}
                {forhaands.antall_mottakere > 15 && <span className="text-xs text-gray-500 self-center">+ {forhaands.antall_mottakere - 15} til</span>}
              </div>
            )}
            <details className="mt-3">
              <summary className="text-sm text-petrol cursor-pointer font-medium">Se e-posten slik mottakerne får den</summary>
              <iframe title="Forhåndsvisning av e-posten" srcDoc={forhaands.html} sandbox=""
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white" style={{ height: 640 }} />
            </details>
          </div>
        )}

        {resultat && (
          <p className="mt-3 text-sm text-[#106C75]" role="status" aria-live="polite">
            {resultat.test
              ? <>Test-e-post <b>sendt</b> til {resultat.sendt_til} — sjekk innboksen og prøv avmeldingslenken.</>
              : resultat.planlagt
                ? <>Utsendingen er <b>planlagt</b> ({datoTid(resultat.planlagt_at)}) til <b>{resultat.antall_mottakere}</b> mottakere.</>
                : <>Utsendingen er <b>sendt</b> til <b>{resultat.antall_mottakere}</b> mottakere.</>}
            {resultat.feilet_synk_antall ? <span className="text-[#CF442F]"> {resultat.feilet_synk_antall} mottakere kom ikke med (synkfeil) — se loggen.</span> : null}
          </p>
        )}
      </div>

      {/* ── Historikk ── */}
      <h2 className="text-lg font-bold text-gray-900 mb-2">Tidligere utsendinger</h2>
      {utsendinger === null ? <p className="text-gray-400">Laster …</p>
        : utsendinger.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center py-10 text-gray-500">Ingen utsendinger ennå.</div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 px-4">Bruk</th><th className="px-3">Emne</th><th className="px-3">Status</th>
                <th className="px-3">Mottakere</th><th className="px-3">Tidspunkt</th>
              </tr></thead>
              <tbody>
                {utsendinger.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 text-gray-700">
                    <td className="py-2 px-4 font-semibold">{u.bruk}</td>
                    <td className="px-3">{u.emne}{u.feilmelding ? <span className="block text-xs text-[#CF442F]">{u.feilmelding}</span> : null}</td>
                    <td className="px-3">
                      <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${u.status === 'sendt' ? 'bg-petrol/10 text-petrol' : u.status === 'feilet' ? 'bg-[#CF442F]/10 text-[#CF442F]' : 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_ETIKETT[u.status] || u.status}
                      </span>
                    </td>
                    <td className="px-3">{u.antall_mottakere ?? '—'}</td>
                    <td className="px-3 text-gray-500">{datoTid(u.sendt_at || u.planlagt_at || u.opprettet_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <p className="text-xs text-gray-400 mt-6">
        Bruk B (nyhetsbrev fra hjemmesiden, double opt-in) og Bruk C (potensielle skoler) bygger på samme base og kommer i neste runde.
      </p>
    </div>
  )
}
