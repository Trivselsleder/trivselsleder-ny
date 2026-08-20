import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  hentWebinarerAdmin, opprettWebinar, oppdaterWebinar,
  publiserWebinar, avpubliserWebinar, slettWebinar, hentPameldingerAdmin,
  inviterWebinar, hentNettverkListe,
} from '../lib/webinarAdmin'
import { TYPE_ETIKETT, datoLang, klokkeslett } from '../lib/webinar'

const TYPER = [['nettverksmote', 'Nettverksmøte'], ['ra_webinar', 'RA-webinar'], ['intro_ekstern', 'Intro-webinar (ekstern)'], ['opplaering', 'Opplæring']]
const STATUS_ETIKETT = { utkast: 'Kladd', publisert: 'Publisert', gjennomfort: 'Gjennomført', avlyst: 'Avlyst' }

// ISO ⇄ datetime-local (lokal tid = norsk tid for admin)
function tilLokal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fraLokal = (val) => (val ? new Date(val).toISOString() : null)

const TOM = { tittel: '', synlighet: 'intern', type: 'nettverksmote', starter_at: '', varighet_min: 45, mote_lenke: '', maks_antall: '', beskrivelse: '' }

export default function AdminWebinarer() {
  const [liste, setListe] = useState(null)
  const [feil, setFeil] = useState(null)
  const [skjema, setSkjema] = useState(null)   // null = lukket; ellers felter (+ evt. id)
  const [lagrer, setLagrer] = useState(false)
  const [sok, setSok] = useState('')
  const [statusFilter, setStatusFilter] = useState('alle')
  const [typeFilter, setTypeFilter] = useState('alle')
  const [utvidet, setUtvidet] = useState(null)     // webinar-id vist med påmeldingsliste
  const [pameldinger, setPameldinger] = useState({})
  const [inviter, setInviter] = useState(null)     // webinar under invitasjon
  const [nettverkListe, setNettverkListe] = useState([])
  const [segment, setSegment] = useState({ type: 'alle_aktive' })
  const [forhaands, setForhaands] = useState(null) // dry-run-resultat
  const [inviterer, setInviterer] = useState(false)
  const [inviteResultat, setInviteResultat] = useState(null)

  function last() {
    hentWebinarerAdmin().then(setListe).catch((e) => { setFeil(e.message); setListe([]) })
  }
  useEffect(last, [])

  const vist = useMemo(() => {
    let r = liste || []
    if (statusFilter !== 'alle') r = r.filter((w) => w.status === statusFilter)
    if (typeFilter !== 'alle') r = r.filter((w) => w.type === typeFilter)
    if (sok.trim()) { const q = sok.toLowerCase(); r = r.filter((w) => (w.tittel || '').toLowerCase().includes(q)) }
    return r
  }, [liste, statusFilter, typeFilter, sok])

  async function lagre(e) {
    e.preventDefault()
    setFeil(null)
    if (!skjema.tittel.trim() || !skjema.starter_at) { setFeil('Tittel og starttidspunkt er påkrevd.'); return }
    setLagrer(true)
    try {
      const felt = {
        tittel: skjema.tittel, synlighet: skjema.synlighet, type: skjema.type,
        starter_at: fraLokal(skjema.starter_at), varighet_min: skjema.varighet_min || 45,
        mote_lenke: skjema.mote_lenke, maks_antall: skjema.maks_antall || null, beskrivelse: skjema.beskrivelse,
      }
      if (skjema.id) await oppdaterWebinar(skjema.id, felt)
      else await opprettWebinar(felt)
      setSkjema(null); last()
    } catch (e2) { setFeil(e2.message) } finally { setLagrer(false) }
  }

  async function bytt(id, publiser) {
    try { await (publiser ? publiserWebinar(id) : avpubliserWebinar(id)); last() } catch (e) { setFeil(e.message) }
  }
  async function fjern(id) {
    if (!window.confirm('Slette webinaret? Påmeldinger slettes også. Dette kan ikke angres.')) return
    try { await slettWebinar(id); last() } catch (e) { setFeil(e.message) }
  }
  async function visPameldinger(id) {
    if (utvidet === id) { setUtvidet(null); return }
    setUtvidet(id)
    if (!pameldinger[id]) {
      try { const p = await hentPameldingerAdmin(id); setPameldinger((s) => ({ ...s, [id]: p })) }
      catch (e) { setFeil(e.message) }
    }
  }

  function apneInviter(w) {
    setInviter(w); setSegment({ type: 'alle_aktive' }); setForhaands(null); setInviteResultat(null); setFeil(null)
    hentNettverkListe().then(setNettverkListe).catch(() => setNettverkListe([]))
  }
  async function kjorInvitasjon(torrkjoring) {
    setInviterer(true); setFeil(null)
    try {
      const r = await inviterWebinar(inviter.id, segment, torrkjoring)
      if (r.error) { setFeil(r.error); if (torrkjoring) setForhaands(null) }
      else if (torrkjoring) { setForhaands(r); setInviteResultat(null) }
      else { setInviteResultat(r); setForhaands(null) }
    } catch (e) { setFeil(e.message) } finally { setInviterer(false) }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-extrabold text-gray-900">Webinarer</h1>
        <button onClick={() => setSkjema({ ...TOM })} className="bg-orange text-gray-900 text-sm font-semibold px-4 py-2 rounded-full hover:bg-orange/90">+ Nytt webinar</button>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Opprett interne nettverksmøter og eksterne intro-webinarer. Publiser for å gjøre synlig. Påmeldte får bekreftelse og påminnelser automatisk.
        <Link to="/admin" className="text-orange-ink ml-2">← Admin</Link>
      </p>

      {feil && <p className="text-sm text-red-600 mb-3" role="alert">{feil}</p>}

      {/* Filterrad */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk tittel …" className={`${felt} max-w-xs`} aria-label="Søk" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={felt.replace('w-full', '')} aria-label="Status">
          <option value="alle">Alle statuser</option>
          {Object.entries(STATUS_ETIKETT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={felt.replace('w-full', '')} aria-label="Type">
          <option value="alle">Alle typer</option>
          {TYPER.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {liste === null ? (
        <p className="text-gray-400">Laster …</p>
      ) : vist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center py-12 text-gray-500">Ingen webinarer å vise.</div>
      ) : (
        <div className="space-y-2">
          {vist.map((w) => (
            <div key={w.id} className="rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${w.status === 'publisert' ? 'bg-petrol/10 text-petrol' : 'bg-gray-100 text-gray-500'}`}>{STATUS_ETIKETT[w.status] || w.status}</span>
                    <span className="text-[11px] text-teal font-medium">{TYPE_ETIKETT[w.type]}</span>
                    <span className="text-[11px] text-gray-400">{w.synlighet === 'offentlig' ? 'Offentlig' : 'Intern'}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 truncate mt-0.5">{w.tittel}</h3>
                  <p className="text-sm text-gray-500 capitalize">{datoLang(w.starter_at)} kl. {klokkeslett(w.starter_at)} · {w.varighet_min} min</p>
                </div>
                <button onClick={() => visPameldinger(w.id)} className="shrink-0 text-sm text-gray-600 hover:text-orange-ink" title="Se påmeldte">
                  👥 {w.antall_pameldte}{w.maks_antall ? `/${w.maks_antall}` : ''}
                </button>
                <div className="shrink-0 flex items-center gap-1.5">
                  {w.status === 'publisert'
                    ? <button onClick={() => bytt(w.id, false)} className="text-xs border border-gray-300 rounded-full px-3 py-1.5 hover:border-gray-400">Avpubliser</button>
                    : <button onClick={() => bytt(w.id, true)} className="text-xs bg-petrol text-white rounded-full px-3 py-1.5 hover:bg-petrol/90">Publiser</button>}
                  {w.status === 'publisert' && <button onClick={() => apneInviter(w)} className="text-xs bg-orange/10 text-orange-ink rounded-full px-3 py-1.5 hover:bg-orange/20 font-medium">Inviter</button>}
                  {new Date(w.starter_at) < new Date() && (
                    <Link to={`/admin/nyhetsbrev?webinar=${w.id}`} className="text-xs bg-petrol/10 text-petrol rounded-full px-3 py-1.5 hover:bg-petrol/20 font-medium" title="Send takk/«gikk du glipp?»-oppfølging med opptak">
                      Oppfølging
                    </Link>
                  )}
                  <button onClick={() => setSkjema({ ...w, starter_at: tilLokal(w.starter_at), maks_antall: w.maks_antall || '', beskrivelse: w.beskrivelse || '', mote_lenke: w.mote_lenke || '' })} className="text-xs border border-gray-300 rounded-full px-3 py-1.5 hover:border-orange hover:text-orange-ink">Rediger</button>
                  <button onClick={() => fjern(w.id)} className="text-xs text-gray-400 hover:text-red-600 px-1" aria-label="Slett">🗑</button>
                </div>
              </div>

              {utvidet === w.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60">
                  {!pameldinger[w.id] ? <p className="text-sm text-gray-400">Laster påmeldte …</p>
                    : pameldinger[w.id].length === 0 ? <p className="text-sm text-gray-500">Ingen påmeldte ennå.</p>
                    : (
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-gray-400 uppercase"><th className="py-1 pr-3">Navn</th><th className="pr-3">E-post</th><th className="pr-3">Kilde</th><th className="pr-3">Bekreftet</th></tr></thead>
                        <tbody>
                          {pameldinger[w.id].map((p) => (
                            <tr key={p.id} className={`border-t border-gray-100 ${p.avmeldt_at ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              <td className="py-1 pr-3">{p.navn}{p.rolle ? <span className="text-gray-400"> · {p.rolle}</span> : ''}</td>
                              <td className="pr-3">{p.epost}</td>
                              <td className="pr-3 text-gray-500">{p.kilde}</td>
                              <td className="pr-3">{p.bekreftet_at ? '✓' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invitasjons-modal */}
      {inviter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { if (!inviterer) setInviter(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Inviter til webinar</h2>
              <button onClick={() => setInviter(null)} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="Lukk">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-3 truncate">{inviter.tittel}</p>
            {feil && <p className="text-sm text-red-600 mb-2" role="alert">{feil}</p>}

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-gray-600 mb-1">Hvem skal inviteres?</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="seg" checked={segment.type === 'alle_aktive'} onChange={() => { setSegment({ type: 'alle_aktive' }); setForhaands(null); setInviteResultat(null) }} className="accent-orange" />
                Alle aktive skoler (kunder)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="seg" checked={segment.type === 'nettverk'} onChange={() => { setSegment({ type: 'nettverk', nettverk: nettverkListe[0] || '' }); setForhaands(null); setInviteResultat(null) }} className="accent-orange" />
                Ett nettverk:
                <select
                  disabled={segment.type !== 'nettverk'}
                  value={segment.nettverk || ''}
                  onChange={(e) => { setSegment({ type: 'nettverk', nettverk: e.target.value }); setForhaands(null) }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:opacity-50"
                >
                  {nettverkListe.length === 0 && <option value="">(ingen nettverk)</option>}
                  {nettverkListe.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="seg" checked={segment.type === 'prospekt'} onChange={() => { setSegment({ type: 'prospekt' }); setForhaands(null); setInviteResultat(null) }} className="accent-orange mt-0.5" />
                <span>Potensielle skoler (ekstern)
                  <span className="block text-xs text-[#B5560F]">⚠ Sperret til rektorlista er kvalitetssikret (rektorliste_qa_ok = «ja»). Forhåndsvisning er alltid tillatt.</span>
                </span>
              </label>
            </fieldset>

            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => kjorInvitasjon(true)} disabled={inviterer || (segment.type === 'nettverk' && !segment.nettverk)} className="text-sm border border-gray-300 rounded-full px-4 py-1.5 hover:border-orange hover:text-orange-ink disabled:opacity-50">
                {inviterer ? '…' : 'Forhåndsvis'}
              </button>
              {forhaands && forhaands.antall_mottakere > 0 && (
                <button onClick={() => { if (window.confirm(`Sende invitasjon til ${forhaands.antall_mottakere} mottakere?`)) kjorInvitasjon(false) }} disabled={inviterer} className="text-sm font-semibold bg-orange text-gray-900 rounded-full px-5 py-1.5 hover:bg-orange/90 disabled:opacity-50">
                  Send til {forhaands.antall_mottakere}
                </button>
              )}
            </div>

            {forhaands && (
              <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm text-gray-700"><b>{forhaands.antall_mottakere}</b> mottakere{forhaands.uten_epost ? ` · ${forhaands.uten_epost} skoler uten e-post` : ''}</p>
                {forhaands.antall_mottakere === 0 && <p className="text-sm text-gray-500 mt-1">Ingen å invitere (alle kan alt være påmeldt eller mangle e-post).</p>}
                {forhaands.forhandsvisning?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {forhaands.forhandsvisning.slice(0, 15).map((m, i) => <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">{m.epost}</span>)}
                    {forhaands.antall_mottakere > 15 && <span className="text-xs text-gray-500 self-center">+ {forhaands.antall_mottakere - 15} til</span>}
                  </div>
                )}
              </div>
            )}
            {inviteResultat && (
              <p className="mt-3 text-sm text-[#106C75]" role="status" aria-live="polite">
                Sendt <b>{inviteResultat.sendt}</b> invitasjoner{inviteResultat.hoppet_over ? ` · hoppet over ${inviteResultat.hoppet_over} (alt invitert)` : ''}{inviteResultat.feilet ? ` · ${inviteResultat.feilet.length} feilet` : ''}{inviteResultat.avkortet ? ` · ${inviteResultat.gjenstaar} gjenstår — kjør igjen` : ''}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Skjema-modal */}
      {skjema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSkjema(null)}>
          <form onSubmit={lagre} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">{skjema.id ? 'Rediger webinar' : 'Nytt webinar'}</h2>
              <button type="button" onClick={() => setSkjema(null)} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="Lukk">×</button>
            </div>
            {feil && <p className="text-sm text-red-600 mb-2" role="alert">{feil}</p>}
            <div className="space-y-3">
              <label className="block"><span className="text-xs font-medium text-gray-600">Tittel</span>
                <input value={skjema.tittel} onChange={(e) => setSkjema({ ...skjema, tittel: e.target.value })} className={felt} required /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-medium text-gray-600">Synlighet</span>
                  <select value={skjema.synlighet} onChange={(e) => setSkjema({ ...skjema, synlighet: e.target.value })} className={felt}>
                    <option value="intern">Intern (skoler)</option><option value="offentlig">Offentlig (forside)</option></select></label>
                <label className="block"><span className="text-xs font-medium text-gray-600">Type</span>
                  <select value={skjema.type} onChange={(e) => setSkjema({ ...skjema, type: e.target.value })} className={felt}>
                    {TYPER.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-medium text-gray-600">Start (dato/tid)</span>
                  <input type="datetime-local" value={skjema.starter_at} onChange={(e) => setSkjema({ ...skjema, starter_at: e.target.value })} className={felt} required /></label>
                <label className="block"><span className="text-xs font-medium text-gray-600">Varighet (min)</span>
                  <input type="number" min="5" value={skjema.varighet_min} onChange={(e) => setSkjema({ ...skjema, varighet_min: e.target.value })} className={felt} /></label>
              </div>
              <label className="block"><span className="text-xs font-medium text-gray-600">Møtelenke (Teams/Zoom/Meet)</span>
                <input type="url" value={skjema.mote_lenke} onChange={(e) => setSkjema({ ...skjema, mote_lenke: e.target.value })} placeholder="https://…" className={felt} />
                <span className="text-[11px] text-gray-400">Sendes kun på e-post til påmeldte — vises aldri på nettsiden.</span></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">Maks antall (valgfritt)</span>
                <input type="number" min="1" value={skjema.maks_antall} onChange={(e) => setSkjema({ ...skjema, maks_antall: e.target.value })} className={felt} /></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">Beskrivelse</span>
                <textarea rows={3} value={skjema.beskrivelse} onChange={(e) => setSkjema({ ...skjema, beskrivelse: e.target.value })} className={felt} /></label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setSkjema(null)} className="text-sm px-4 py-2 rounded-full border border-gray-300 hover:border-gray-400">Avbryt</button>
              <button type="submit" disabled={lagrer} className="text-sm font-semibold px-5 py-2 rounded-full bg-orange text-gray-900 hover:bg-orange/90 disabled:opacity-50">{lagrer ? 'Lagrer …' : 'Lagre'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
