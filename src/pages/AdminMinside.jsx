import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  hentMinsideSeksjoner, byttSeksjonRekkefolge, settSeksjonSynlig,
  hentAlleAktuelt, lagreAktuelt, slettAktuelt, lastOppAktueltBilde,
  hentMestKjoptForMaaned, lagreMestKjopt, slettMestKjopt, byttMestKjoptRekkefolge,
  lastOppMestKjoptBilde, innevaerendeMaaned,
} from '../lib/minside'

// TL-internt: rediger skolens «Min side». Tre deler — rekkefølge på radene 3–8,
// «Aktuelt»-blokker, og «Mest kjøpte leker» per måned. Kun ansatt/superadmin
// (rute-vakt i App.jsx + RLS i basen).

const KNAPP = 'inline-flex items-center min-h-[44px] px-5 rounded-full font-bold text-gray-900 bg-orange hover:brightness-95'
const KNAPP2 = 'inline-flex items-center min-h-[44px] px-4 rounded-full font-bold text-gray-900 bg-white border border-gray-200 hover:border-orange'
const FELT = 'w-full min-h-[44px] px-3 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol'
const LABEL = 'block font-semibold text-gray-600 mb-1.5'

export default function AdminMinside() {
  const { t } = useTranslation()
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-orange-ink mb-1">{t('adminMinside.tittel')}</h1>
        <p className="text-gray-500">{t('adminMinside.undertittel')}</p>
      </div>
      <SeksjonsRekkefolge t={t} />
      <AktueltRedigering t={t} />
      <MestKjoptRedigering t={t} />
    </div>
  )
}

// ── Del 1: rekkefølge + skjul på radene 3–8 ───────────────────────────────────
function SeksjonsRekkefolge({ t }) {
  const [rader, setRader] = useState(null)
  const [feil, setFeil] = useState(null)
  const [jobber, setJobber] = useState(false)

  // .then-stil (ikke async): setState i callback, så effekten ikke setter state synkront.
  function last() {
    return hentMinsideSeksjoner(true).then((d) => { setRader(d); setFeil(null) }).catch((e) => setFeil(e.message))
  }
  useEffect(() => { last() }, [])

  async function flytt(i, retning) {
    const j = i + retning
    if (!rader || j < 0 || j >= rader.length || jobber) return
    setJobber(true)
    try { await byttSeksjonRekkefolge(rader[i], rader[j]); await last() }
    catch (e) { setFeil(e.message) }
    finally { setJobber(false) }
  }
  async function skjul(rad) {
    if (jobber) return
    setJobber(true)
    try { await settSeksjonSynlig(rad.seksjon, !rad.synlig); await last() }
    catch (e) { setFeil(e.message) }
    finally { setJobber(false) }
  }

  return (
    <section aria-labelledby="ms-rekke" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="font-bold text-petrol mb-1">{t('adminMinside.intern')}</p>
      <h2 id="ms-rekke" className="text-2xl font-bold text-gray-900 mb-1">{t('adminMinside.rekkefolge.tittel')}</h2>
      <p className="text-gray-500 mb-4">{t('adminMinside.rekkefolge.hjelp')}</p>
      {feil && <p className="text-red-600 mb-3" role="alert">{feil}</p>}
      <div className="space-y-2">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <span className="font-semibold text-petrol">{t('adminMinside.laast')}</span>
          <span className="font-bold text-gray-900 flex-1">1 · {t('minSide.hjem.mineValg')}</span>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <span className="font-semibold text-petrol">{t('adminMinside.laast')}</span>
          <span className="font-bold text-gray-900 flex-1">2 · {t('minSide.hjem.venter')}</span>
        </div>
        {(rader || []).map((r, i) => (
          <div key={r.seksjon} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <span className={`font-bold flex-1 ${r.synlig ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{r.tittel}</span>
            <button type="button" onClick={() => flytt(i, -1)} disabled={i === 0 || jobber}
              aria-label={t('adminMinside.rekkefolge.opp', { navn: r.tittel })}
              className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-gray-200 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-petrol">▲</button>
            <button type="button" onClick={() => flytt(i, 1)} disabled={i === (rader.length - 1) || jobber}
              aria-label={t('adminMinside.rekkefolge.ned', { navn: r.tittel })}
              className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-gray-200 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-petrol">▼</button>
            <button type="button" onClick={() => skjul(r)} disabled={jobber}
              className="min-h-[44px] px-3 font-bold text-orange-ink focus-visible:ring-2 focus-visible:ring-petrol rounded-full">
              {r.synlig ? t('adminMinside.rekkefolge.skjul') : t('adminMinside.rekkefolge.vis')}
            </button>
          </div>
        ))}
        {rader === null && <p className="text-gray-400">{t('adminMinside.laster')}</p>}
      </div>
    </section>
  )
}

// ── Del 2: Aktuelt-blokker ────────────────────────────────────────────────────
const TOM_AKTUELT = { id: null, overskrift: '', tekst: '', bilde_sti: null, bilde_url: null,
  bilde_beskrivelse: '', knapp_tekst: '', knapp_lenke: '', synlig: true, rekkefolge: 0 }

function AktueltRedigering({ t }) {
  const [blokker, setBlokker] = useState(null)
  const [redigerer, setRedigerer] = useState(null) // objekt eller null
  const [feil, setFeil] = useState(null)

  function last() {
    return hentAlleAktuelt().then((d) => { setBlokker(d); setFeil(null) }).catch((e) => setFeil(e.message))
  }
  useEffect(() => { last() }, [])

  async function fjern(id) {
    if (!window.confirm(t('adminMinside.aktuelt.bekreftSlett'))) return
    try { await slettAktuelt(id); await last() } catch (e) { setFeil(e.message) }
  }

  return (
    <section aria-labelledby="ms-aktuelt" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="font-bold text-petrol mb-1">{t('adminMinside.intern')}</p>
      <h2 id="ms-aktuelt" className="text-2xl font-bold text-gray-900 mb-1">{t('adminMinside.aktuelt.tittel')}</h2>
      <p className="text-gray-500 mb-4">{t('adminMinside.aktuelt.hjelp')}</p>
      {feil && <p className="text-red-600 mb-3" role="alert">{feil}</p>}

      {redigerer
        ? <AktueltSkjema t={t} start={redigerer} onLagret={async () => { setRedigerer(null); await last() }} onAvbryt={() => setRedigerer(null)} onFeil={setFeil} />
        : (
          <>
            <div className="space-y-2 mb-4">
              {(blokker || []).map((b) => (
                <div key={b.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className={`font-bold flex-1 ${b.synlig ? 'text-gray-900' : 'text-gray-400'}`}>
                    {b.overskrift} {!b.synlig && <em className="font-normal text-gray-400">({t('adminMinside.skjult')})</em>}
                  </span>
                  <button type="button" className={KNAPP2} onClick={() => setRedigerer(b)}>{t('adminMinside.rediger')}</button>
                  <button type="button" className="min-h-[44px] px-3 font-bold text-orange-ink rounded-full focus-visible:ring-2 focus-visible:ring-petrol" onClick={() => fjern(b.id)}>{t('adminMinside.slett')}</button>
                </div>
              ))}
              {blokker !== null && blokker.length === 0 && <p className="text-gray-400">{t('adminMinside.aktuelt.tom')}</p>}
            </div>
            <button type="button" className={KNAPP} onClick={() => setRedigerer({ ...TOM_AKTUELT })}>{t('adminMinside.aktuelt.ny')}</button>
          </>
        )}
    </section>
  )
}

function AktueltSkjema({ t, start, onLagret, onAvbryt, onFeil }) {
  const [form, setForm] = useState(start)
  const [lagrer, setLagrer] = useState(false)
  const filRef = useRef(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function velgBilde(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    try {
      const sti = await lastOppAktueltBilde(fil)
      set('bilde_sti', sti)
      // Forhåndsvisning via lokal URL (rask) — public URL beregnes ved lesing uansett.
      set('bilde_url', URL.createObjectURL(fil))
    } catch (err) { onFeil(err.message) }
  }
  function fjernBilde() { set('bilde_sti', null); set('bilde_url', null); set('bilde_beskrivelse', '') }

  async function lagre() {
    // WCAG-speiling av base-CHECK: bilde krever beskrivelse.
    if (form.bilde_sti && !form.bilde_beskrivelse.trim()) { onFeil(t('adminMinside.aktuelt.altPaakrevd')); return }
    if (!form.overskrift.trim()) { onFeil(t('adminMinside.aktuelt.overskriftPaakrevd')); return }
    setLagrer(true)
    try { await lagreAktuelt(form); onLagret() }
    catch (e) { onFeil(e.message); setLagrer(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ak-overskrift" className={LABEL}>{t('adminMinside.aktuelt.overskrift')}</label>
        <input id="ak-overskrift" type="text" className={FELT} value={form.overskrift} onChange={(e) => set('overskrift', e.target.value)} />
      </div>
      <div>
        <label htmlFor="ak-tekst" className={LABEL}>{t('adminMinside.aktuelt.tekst')}</label>
        <textarea id="ak-tekst" rows={4} className={`${FELT} py-3`} value={form.tekst || ''} onChange={(e) => set('tekst', e.target.value)} />
      </div>
      <div>
        <span className={LABEL}>{t('adminMinside.aktuelt.bilde')}</span>
        <div className="flex items-center gap-3">
          {form.bilde_url
            ? <img src={form.bilde_url} alt="" className="w-24 h-18 object-cover rounded-xl" style={{ height: 72 }} />
            : <div className="w-24 rounded-xl bg-gray-100" style={{ height: 72 }} aria-hidden="true" />}
          <button type="button" className={KNAPP2} onClick={() => filRef.current?.click()}>{t('adminMinside.aktuelt.byttBilde')}</button>
          {form.bilde_sti && <button type="button" className="min-h-[44px] px-3 font-bold text-orange-ink rounded-full" onClick={fjernBilde}>{t('adminMinside.fjern')}</button>}
          <input ref={filRef} type="file" accept="image/*" className="sr-only" onChange={velgBilde} />
        </div>
        {form.bilde_sti && (
          <div className="mt-3">
            <label htmlFor="ak-alt" className={LABEL}>
              {t('adminMinside.aktuelt.alt')} <span className="text-orange-ink">{t('adminMinside.aktuelt.altObl')}</span>
            </label>
            <input id="ak-alt" type="text" required className={FELT} value={form.bilde_beskrivelse || ''} onChange={(e) => set('bilde_beskrivelse', e.target.value)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="ak-knapp" className={LABEL}>{t('adminMinside.aktuelt.knappTekst')}</label>
          <input id="ak-knapp" type="text" className={FELT} value={form.knapp_tekst || ''} onChange={(e) => set('knapp_tekst', e.target.value)} />
        </div>
        <div>
          <label htmlFor="ak-lenke" className={LABEL}>{t('adminMinside.aktuelt.lenke')}</label>
          <input id="ak-lenke" type="text" className={FELT} value={form.knapp_lenke || ''} onChange={(e) => set('knapp_lenke', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 font-semibold text-gray-700">
        <input type="checkbox" checked={form.synlig} onChange={(e) => set('synlig', e.target.checked)} />
        {t('adminMinside.aktuelt.synlig')}
      </label>
      <div className="flex items-center gap-3 pt-1">
        <button type="button" className={KNAPP} onClick={lagre} disabled={lagrer}>{t('adminMinside.publiser')}</button>
        <button type="button" className={KNAPP2} onClick={onAvbryt}>{t('adminMinside.avbryt')}</button>
      </div>
    </div>
  )
}

// ── Del 3: Mest kjøpte leker per måned ────────────────────────────────────────
function MestKjoptRedigering({ t }) {
  const [maaned, setMaaned] = useState(innevaerendeMaaned())
  const [rader, setRader] = useState(null)
  const [feil, setFeil] = useState(null)
  const [jobber, setJobber] = useState(false)

  function last() {
    return hentMestKjoptForMaaned(maaned).then((d) => { setRader(d); setFeil(null) }).catch((e) => setFeil(e.message))
  }
  useEffect(() => { last() }, [maaned])

  // Vis alltid 5 «slots» (rekkefolge 1–5): eksisterende rader + tomme.
  const slots = []
  for (let n = 1; n <= 5; n++) {
    slots.push((rader || []).find((r) => r.rekkefolge === n) || { id: null, maaned, navn: '', pris: '', forpris: '', bilde_sti: null, bilde_url: null, lenke: '', rekkefolge: n, synlig: true })
  }

  async function lagreRad(rad) {
    if (!rad.navn.trim() || rad.pris === '' || !rad.lenke.trim()) { setFeil(t('adminMinside.mestKjopt.paakrevd')); return }
    if (!/^https:\/\//.test(rad.lenke.trim())) { setFeil(t('adminMinside.mestKjopt.httpsKrav')); return }
    setJobber(true)
    try {
      await lagreMestKjopt({ ...rad, maaned, pris: Number(rad.pris), forpris: rad.forpris === '' ? null : Number(rad.forpris) })
      await last()
    } catch (e) { setFeil(e.message) } finally { setJobber(false) }
  }
  async function fjernRad(id) {
    if (!id || !window.confirm(t('adminMinside.mestKjopt.bekreftSlett'))) return
    setJobber(true)
    try { await slettMestKjopt(id); await last() } catch (e) { setFeil(e.message) } finally { setJobber(false) }
  }
  async function flytt(n, retning) {
    const a = (rader || []).find((r) => r.rekkefolge === n)
    const b = (rader || []).find((r) => r.rekkefolge === n + retning)
    if (!a || !b || jobber) return
    setJobber(true)
    try { await byttMestKjoptRekkefolge(a, b); await last() } catch (e) { setFeil(e.message) } finally { setJobber(false) }
  }

  return (
    <section aria-labelledby="ms-klubb" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="font-bold text-petrol mb-1">{t('adminMinside.intern')}</p>
      <h2 id="ms-klubb" className="text-2xl font-bold text-gray-900 mb-1">{t('adminMinside.mestKjopt.tittel')}</h2>
      <p className="text-gray-500 mb-4">{t('adminMinside.mestKjopt.hjelp')}</p>
      <div className="mb-4">
        <label htmlFor="mk-maaned" className={LABEL}>{t('adminMinside.mestKjopt.maaned')}</label>
        <input id="mk-maaned" type="month" className={`${FELT} max-w-[200px]`} value={maaned} onChange={(e) => setMaaned(e.target.value || innevaerendeMaaned())} />
      </div>
      {feil && <p className="text-red-600 mb-3" role="alert">{feil}</p>}
      <div className="space-y-3">
        {slots.map((rad) => (
          // Key inkluderer datainnhold: når parent laster på nytt (etter lagre/slett/bytt),
          // endres key og raden remountes med server-tilstand — uten en setState-i-effect.
          <MestKjoptRad key={`${rad.rekkefolge}-${rad.id ?? 'ny'}-${rad.navn}-${rad.pris}`}
            t={t} rad={rad} jobber={jobber}
            onLagre={lagreRad} onFjern={fjernRad} onFlytt={flytt} onFeil={setFeil} />
        ))}
        {rader === null && <p className="text-gray-400">{t('adminMinside.laster')}</p>}
      </div>
    </section>
  )
}

function MestKjoptRad({ t, rad, jobber, onLagre, onFjern, onFlytt, onFeil }) {
  // Startverdi fra prop; komponenten remountes (via key i forelder) når server-data endres.
  const [form, setForm] = useState(rad)
  const filRef = useRef(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function velgBilde(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    try { set('bilde_sti', await lastOppMestKjoptBilde(fil)); set('bilde_url', URL.createObjectURL(fil)) }
    catch (err) { onFeil(err.message) }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-petrol w-6">{rad.rekkefolge}</span>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input aria-label={t('adminMinside.mestKjopt.navn')} placeholder={t('adminMinside.mestKjopt.navn')} type="text" className={FELT} value={form.navn} onChange={(e) => set('navn', e.target.value)} />
          <input aria-label={t('adminMinside.mestKjopt.pris')} placeholder={t('adminMinside.mestKjopt.pris')} type="number" min="0" step="0.01" className={FELT} value={form.pris} onChange={(e) => set('pris', e.target.value)} />
          <input aria-label={t('adminMinside.mestKjopt.forpris')} placeholder={t('adminMinside.mestKjopt.forprisPh')} type="number" min="0" step="0.01" className={FELT} value={form.forpris ?? ''} onChange={(e) => set('forpris', e.target.value)} />
          <input aria-label={t('adminMinside.mestKjopt.lenke')} placeholder="https://klubben.no/…" type="url" className={FELT} value={form.lenke} onChange={(e) => set('lenke', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-2 pl-8">
        {form.bilde_url
          ? <img src={form.bilde_url} alt="" className="w-11 h-11 object-cover rounded-lg" />
          : <span className="w-11 h-11 rounded-lg bg-gray-100" aria-hidden="true" />}
        <button type="button" className={KNAPP2} onClick={() => filRef.current?.click()}>{t('adminMinside.mestKjopt.lastOpp')}</button>
        <input ref={filRef} type="file" accept="image/*" className="sr-only" onChange={velgBilde} />
        <button type="button" className={KNAPP} disabled={jobber} onClick={() => onLagre(form)}>{t('adminMinside.lagre')}</button>
        <button type="button" onClick={() => onFlytt(rad.rekkefolge, -1)} disabled={rad.rekkefolge === 1 || jobber || !rad.id}
          aria-label={t('adminMinside.rekkefolge.opp', { navn: form.navn })} className="w-11 h-11 rounded-full border border-gray-200 disabled:opacity-30">▲</button>
        <button type="button" onClick={() => onFlytt(rad.rekkefolge, 1)} disabled={rad.rekkefolge === 5 || jobber || !rad.id}
          aria-label={t('adminMinside.rekkefolge.ned', { navn: form.navn })} className="w-11 h-11 rounded-full border border-gray-200 disabled:opacity-30">▼</button>
        {rad.id && <button type="button" className="min-h-[44px] px-3 font-bold text-orange-ink rounded-full" onClick={() => onFjern(rad.id)}>{t('adminMinside.slett')}</button>}
      </div>
    </div>
  )
}
