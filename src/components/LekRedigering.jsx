import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lagreRessurs, hentRessursForRedigering, hentFagValg } from '../lib/leker'
import { supabase } from '../lib/supabase'
import LekVisning from './LekVisning'
import LekVideoRedigering from './LekVideoRedigering'

// TipTap lastes i egen chunk KUN når redigeringsflaten faktisk vises (krav 4) —
// lekesiden og lekebiblioteket henter den aldri.
const BeskrivelseEditor = lazy(() => import('./BeskrivelseEditor'))

// Innholds-tekstfeltene (utover tittel + beskrivelse), med i18n-nøkkel.
const PUNKTER = ['formaal', 'forberedelse', 'inndeling', 'utgangsposisjon', 'kronologi', 'regler', 'variasjoner', 'instruktoernotat']
// Rekkefølge/utvalg av språk i fanene (kun de som faktisk finnes vises; nb er standard).
const SPRAK = [['nb', 'Bokmål'], ['nn', 'Nynorsk'], ['sv', 'Svenska'], ['is', 'Íslenska'], ['en', 'English']]
const norm = (v) => (v ?? '')                       // NULL og '' behandles likt (E1)
const endret = (a, b) => norm(a) !== norm(b)        // «faktisk redigert»

// Bildeopplasting (migr 109): interne laster opp til importfiler/redaksjon/<ressurs_id>/<uuid>.
// Frontend-grense (bøtta selv har ingen): jpg/png/webp, maks 10 MB. Originalen lastes opp uendret.
const REDAKSJON_BUCKET = 'importfiler'
const BILDE_TYPER = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAKS_BILDE = 10 * 1024 * 1024

// Objektsti ut av en public-URL. Vi sletter KUN filer under redaksjon/ — import/<id>/ røres aldri.
function objektStiFraUrl(url, bucket = REDAKSJON_BUCKET) {
  if (typeof url !== 'string') return null
  const merke = `/object/public/${bucket}/`
  const i = url.indexOf(merke)
  return i >= 0 ? decodeURIComponent(url.slice(i + merke.length)) : null
}

// Redigering på stedet for interne (superadmin/ansatt). Loader: henter hele ressursen + fag-valg,
// og rendrer selve skjemaet når data er klart (unngår betingede hooks).
export default function LekRedigering({ lek, onLagret, onAvbryt }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [fagValg, setFagValg] = useState([])
  const [feil, setFeil] = useState(null)

  async function last() {
    setData(await hentRessursForRedigering(lek.id))
  }
  useEffect(() => {
    last().catch((e) => setFeil(e.message))
    hentFagValg().then(setFagValg).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lek.id])

  if (feil) return <p className="text-sm text-red-600">{t('rediger.lasteFeil', { feil })}</p>
  if (!data) return <p className="text-gray-400 text-sm">{t('rediger.laster')}</p>
  // Ingen remount-key: etter lagring henter vi `data` på nytt (nytt token + nye baseline-verdier),
  // og Skjema leser E1-baseline fra data-prop-en — så språkfane, «Lagret»-melding og token følger med.
  return (
    <Skjema
      visLek={lek}
      data={data}
      fagValg={fagValg}
      etterLagring={async () => { await last(); onLagret && onLagret() }}
      onAvbryt={onAvbryt}
    />
  )
}

function Skjema({ visLek, data, fagValg, etterLagring, onAvbryt }) {
  const { t } = useTranslation()
  const erAktivLaering = data.ressurstype === 'aktiv_laering'

  // Språk som finnes på leken (+ nb + evt. språk lagt til denne økten). Fane skjules når bare ett.
  const [lagtTil, setLagtTil] = useState(() => new Set())
  const [aktivtSprak, setAktivtSprak] = useState('nb')
  const visSprak = useMemo(() => {
    const s = new Set(data.innholdPerSprak.map((r) => r.sprak))
    s.add('nb'); lagtTil.forEach((x) => s.add(x))
    return SPRAK.filter(([k]) => s.has(k))
  }, [data, lagtTil])
  const kanLeggeTil = SPRAK.filter(([k]) => !visSprak.some(([v]) => v === k))

  // Innhold holdes i et per-språk-kart (redigeringer bevares ved fane-bytte). Baseline for E1 (orig)
  // leses direkte fra basens rad. initInnhold gir '' kun for visning; E1 sammenligner mot orig.
  const FELT = ['tittel', 'beskrivelse', ...PUNKTER]
  const initInnhold = (sprak) => {
    const o = data.innholdPerSprak.find((r) => r.sprak === sprak) || {}
    return Object.fromEntries(FELT.map((k) => [k, o[k] || '']))
  }
  const orig = data.innholdPerSprak.find((r) => r.sprak === aktivtSprak) || { sprak: aktivtSprak }
  const [innholdMap, setInnholdMap] = useState(() => {
    const m = {}
    const spr = new Set(data.innholdPerSprak.map((r) => r.sprak)); spr.add('nb')
    for (const s of spr) m[s] = initInnhold(s)
    return m
  })
  const innhold = innholdMap[aktivtSprak] || initInnhold(aktivtSprak)

  // «Rørt»-flagg for beskrivelsen, per språk (krav 1). TipTap normaliserer HTML ved
  // innlasting (b→strong osv.), så vi kan IKKE stole på strengsammenligning — en urørt
  // beskrivelse ville sett «endret» ut. Flagget settes kun av en ekte brukerendring
  // (editorens onChange), aldri av innlasting, og beskrivelsen sendes bare når det er satt.
  const [beskrRort, setBeskrRort] = useState(() => new Set())

  const [meta, setMeta] = useState({
    sted: data.sted || 'begge',
    antall_min: data.antallMin ?? '',
    antall_maks: data.antallMaks ?? '',
  })
  // Bilder: eksisterende bilder (alt-tekst + fjern) og nye opplastede (migr 108/109).
  const bilder = useMemo(() => data.medier.filter((m) => m.type === 'bilde'), [data])
  // Video: én per lek (målt 1:1). Egen seksjon under bildene, egen lagring (medier-rad + Bunny).
  const eksisterendeVideo = useMemo(() => data.medier.find((m) => m.type === 'video') || null, [data])
  const videoTittel = (data.innholdPerSprak.find((r) => r.sprak === 'nb') || data.innholdPerSprak[0] || {}).tittel
    || visLek.tittel || 'Uten tittel'
  const [altTekst, setAltTekst] = useState(() => Object.fromEntries(bilder.map((b) => [b.id, b.alt_tekst || ''])))
  const [nyeBilder, setNyeBilder] = useState([])       // {key, sti, storage_sti, original_filnavn, alt_tekst}
  const [fjernet, setFjernet] = useState(() => new Set()) // id-er på eksisterende bilder som skal fjernes
  const [bildeFeil, setBildeFeil] = useState(null)
  const [bildeLaster, setBildeLaster] = useState(false)
  // Nullstill bilde-tilstand når parent har hentet `data` på nytt (etter lagring, uten remount):
  // alt-tekst-kartet får de nye radenes id, nye/fjernede tømmes (nå persistert i basen). Reset skjer
  // UNDER render — Reacts anbefalte mønster for «tilbakestill state når en prop endrer seg» (ikke i en
  // effekt, så «Lagret ✓» (ok) overlever mens bilde-tilstanden følger den ferske basen).
  const [dataSig, setDataSig] = useState(data.endretAt)
  if (dataSig !== data.endretAt) {
    setDataSig(data.endretAt)
    setAltTekst(Object.fromEntries(bilder.map((b) => [b.id, b.alt_tekst || ''])))
    setNyeBilder([])
    setFjernet(new Set())
    setBildeFeil(null)
    setBeskrRort(new Set())   // basen holder nå det lagrede — nullstill rørt-flagget
  }
  // Fag (kun aktiv læring): redigerbare avkrysninger.
  const [fagIds, setFagIds] = useState(() => new Set(data.fag.map((f) => f.id)))

  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState(null)
  const [ok, setOk] = useState(false)
  const [forhandsvis, setForhandsvis] = useState(false)

  function i(k, v) { setInnholdMap((s) => ({ ...s, [aktivtSprak]: { ...(s[aktivtSprak] || initInnhold(aktivtSprak)), [k]: v } })); setOk(false) }
  function m(k, v) { setMeta((s) => ({ ...s, [k]: v })); setOk(false) }

  // Aktive = ikke merket for fjerning. Endret alt-tekst på eksisterende → send. Nye bilder → send.
  const aktiveBilder = bilder.filter((b) => !fjernet.has(b.id))
  const endretBilder = aktiveBilder.filter((b) => endret(altTekst[b.id], b.alt_tekst))
  // Blokkerer lagring (WCAG): endret eksisterende uten tekst, ELLER nytt bilde uten tekst.
  const manglerAlt = [
    ...endretBilder.filter((b) => !norm(altTekst[b.id]).trim()),
    ...nyeBilder.filter((n) => !norm(n.alt_tekst).trim()),
  ]

  function toggleFjern(id) {
    setFjernet((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }); setOk(false)
  }
  function settNyAlt(key, v) {
    setNyeBilder((s) => s.map((n) => (n.key === key ? { ...n, alt_tekst: v } : n))); setOk(false)
  }

  // Filvelger: valider type + størrelse FØR opplasting, last opp til redaksjon/, hent public-URL.
  async function velgBilde(e) {
    const fil = e.target.files?.[0]
    e.target.value = ''                       // tillat å velge samme fil igjen etterpå
    if (!fil) return
    setBildeFeil(null)
    const ext = BILDE_TYPER[fil.type]
    if (!ext) { setBildeFeil(t('rediger.bildeFeilType')); return }
    if (fil.size > MAKS_BILDE) { setBildeFeil(t('rediger.bildeFeilStor')); return }
    setBildeLaster(true)
    try {
      const sti = `redaksjon/${data.id}/${crypto.randomUUID()}.${ext}`   // aldri upsert: ny uuid hver gang
      const { error: oppErr } = await supabase.storage.from(REDAKSJON_BUCKET)
        .upload(sti, fil, { upsert: false, contentType: fil.type })
      if (oppErr) throw oppErr
      const { data: urlData } = supabase.storage.from(REDAKSJON_BUCKET).getPublicUrl(sti)
      setNyeBilder((s) => [...s, { key: sti, sti, storage_sti: urlData.publicUrl, original_filnavn: fil.name, alt_tekst: '' }])
      setOk(false)
    } catch (err) {
      setBildeFeil(t('rediger.bildeOpplastFeil', { feil: err.message }))
    } finally {
      setBildeLaster(false)
    }
  }

  // Fjern et ennå ikke lagret bilde: ta det ut av lista OG slett den opplastede fila (ingen foreldreløse).
  async function fjernNyttBilde(key) {
    const b = nyeBilder.find((x) => x.key === key)
    setNyeBilder((s) => s.filter((x) => x.key !== key))
    if (b?.sti) { try { await supabase.storage.from(REDAKSJON_BUCKET).remove([b.sti]) } catch { /* rydding, ikke kritisk */ } }
  }

  async function lagre() {
    if (lagrer || bildeLaster || manglerAlt.length) return
    setLagrer(true); setFeil(null); setOk(false)
    try {
      const payload = { id: data.id, endret_at: data.endretAt, sprak: aktivtSprak }

      // INNHOLD (E1): send kun feltene som faktisk er endret fra basen. Uendret NULL → ikke sendt → bevart.
      const innEndr = {}
      for (const k of ['tittel', ...PUNKTER]) if (endret(innhold[k], orig[k])) innEndr[k] = innhold[k]
      // Beskrivelsen er unntatt strengsammenligning (krav 1): TipTap normaliserer HTML ved
      // innlasting, så den sendes KUN når brukeren faktisk har redigert den (rørt-flagget).
      if (beskrRort.has(aktivtSprak)) innEndr.beskrivelse = innhold.beskrivelse
      if (Object.keys(innEndr).length) payload.innhold = innEndr

      // META (E1): kun endrede ressurs-felt. Sted sammenlignes mot SAMME baseline som visningen
      // defaulter til ('begge' når basen er NULL), så en urørt lek ikke sender begge → NULL bevart.
      const resEndr = {}
      if (meta.sted !== (data.sted || 'begge')) resEndr.sted = meta.sted
      const min = meta.antall_min === '' ? null : Number(meta.antall_min)
      const maks = meta.antall_maks === '' ? null : Number(meta.antall_maks)
      if (min !== (data.antallMin ?? null)) resEndr.antall_min = min
      if (maks !== (data.antallMaks ?? null)) resEndr.antall_maks = maks
      if (Object.keys(resEndr).length) payload.ressurs = resEndr

      // BILDER (RPC setter alt_tekst_kilde='menneske' når alt_tekst sendes): endret eksisterende +
      // nye opplastede. Nye har ingen id → RPC insert'er dem (er_original=true via kolonnedefault).
      const medierUt = endretBilder.map((b) => ({ id: b.id, alt_tekst: altTekst[b.id] }))
      nyeBilder.forEach((n, idx) => medierUt.push({
        type: 'bilde',
        storage_sti: n.storage_sti,
        original_filnavn: n.original_filnavn,
        alt_tekst: n.alt_tekst,
        rekkefolge: aktiveBilder.length + idx,
      }))
      if (medierUt.length) payload.medier = medierUt
      if (fjernet.size) payload.medier_fjern = [...fjernet]

      // FAG (kun aktiv læring): send fag_ids KUN hvis endret (fravær = rør ikke).
      if (erAktivLaering) {
        const orgFag = new Set(data.fag.map((f) => f.id))
        const ulik = orgFag.size !== fagIds.size || [...fagIds].some((x) => !orgFag.has(x))
        if (ulik) payload.fag_ids = [...fagIds]
      }

      await lagreRessurs(payload)
      // Slett Storage-filer for FJERNEDE bilder — KUN under redaksjon/, aldri import/<id>/.
      for (const b of bilder.filter((x) => fjernet.has(x.id))) {
        const sti = objektStiFraUrl(b.storage_sti)
        if (sti && sti.startsWith('redaksjon/')) {
          try { await supabase.storage.from(REDAKSJON_BUCKET).remove([sti]) } catch { /* best effort */ }
        }
      }
      setOk(true)
      await etterLagring()   // henter på nytt → nytt token → resync-effekt tømmer bilde-tilstand
    } catch (e) {
      setFeil(e.message)
      // Mislykket lagring ETTER opplasting: slett de nettopp opplastede redaksjon/-filene, ellers
      // blir de liggende foreldreløse (ingen medier-rad peker på dem).
      for (const n of nyeBilder) {
        if (n.sti) { try { await supabase.storage.from(REDAKSJON_BUCKET).remove([n.sti]) } catch { /* best effort */ } }
      }
      setNyeBilder([])
    } finally {
      setLagrer(false)
    }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange'
  const omr = felt + ' min-h-[70px]'

  // Forhåndsvisning: bygg en formLek-formet struktur fra visLek (trinn/utstyr/egnet/sesong/video) +
  // gjeldende innhold/meta, og gjenbruk LekVisning — samme som lekesiden.
  const previewLek = { ...visLek, tittel: innhold.tittel || t('rediger.utenTittel'), tekst: { ...innhold, sprak: aktivtSprak }, sted: meta.sted, antallMin: meta.antall_min, antallMaks: meta.antall_maks }

  return (
    <div className="border border-petrol/30 rounded-2xl p-5 bg-petrol/5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-gray-900">{erAktivLaering ? t('rediger.tittelAL') : t('rediger.tittel')}</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setForhandsvis((v) => !v)}
            className="text-sm border border-petrol text-petrol px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition">
            {forhandsvis ? t('rediger.tilbakeRediger') : t('rediger.forhandsvis')}
          </button>
          <span className="text-xs text-gray-400">{t('rediger.loggesAuto')}</span>
        </div>
      </div>

      {/* Språkfaner — tab-raden vises kun når mer enn ett språk finnes (krav). «Legg til språk» er
          alltid tilgjengelig så en ansatt kan starte en oversettelse (RPC-en oppretter raden). */}
      {(visSprak.length > 1 || !forhandsvis) && (
        <div className="flex flex-wrap items-center gap-1 mt-3 border-b border-gray-200 pb-2">
          {visSprak.length > 1 && visSprak.map(([k, navn]) => (
            <button key={k} onClick={() => setAktivtSprak(k)}
              className={`text-sm px-3 py-1 rounded-full ${aktivtSprak === k ? 'bg-petrol text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {navn}
            </button>
          ))}
          {!forhandsvis && kanLeggeTil.length > 0 && (
            <select value="" onChange={(e) => { const k = e.target.value; if (!k) return; setLagtTil((s) => new Set(s).add(k)); setInnholdMap((mm) => (mm[k] ? mm : { ...mm, [k]: initInnhold(k) })); setAktivtSprak(k) }}
              aria-label={t('rediger.sprakLeggTil')}
              className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-full px-3 py-1 bg-white ml-1">
              <option value="">+ {t('rediger.sprakLeggTil')}</option>
              {kanLeggeTil.map(([k, navn]) => <option key={k} value={k}>{navn}</option>)}
            </select>
          )}
        </div>
      )}

      {forhandsvis ? (
        <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200">
          {/* LekVisning viser nå tittelen selv (h1). Forhåndsvisningen sender ingen `handlinger`. */}
          <LekVisning lek={previewLek} />
        </div>
      ) : (
        <>
          <label className="block text-xs text-gray-500 mt-4">{t('rediger.tittelFelt')}
            <input type="text" value={innhold.tittel} onChange={(e) => i('tittel', e.target.value)} className={`${felt} mt-0.5`} />
          </label>

          <div className="mt-3">
            <span className="block text-xs text-gray-500">{t('rediger.beskrivelse')} <span className="text-gray-400">{t('rediger.beskrivelseHint')}</span></span>
            <Suspense fallback={<div className={`${omr} mt-0.5 min-h-[110px] text-gray-400`}>{t('rediger.laster')}</div>}>
              {/* key=aktivtSprak: full remount ved språkbytte, så editoren laster riktig språks
                  innhold på nytt uten å fyre onUpdate (rører ikke flagget). */}
              <BeskrivelseEditor
                key={aktivtSprak}
                value={innhold.beskrivelse}
                onChange={(html) => { i('beskrivelse', html); setBeskrRort((s) => new Set(s).add(aktivtSprak)) }}
                labels={{
                  omrade: t('rediger.editor.omrade'),
                  fet: t('rediger.editor.fet'),
                  kursiv: t('rediger.editor.kursiv'),
                  punktliste: t('rediger.editor.punktliste'),
                  nummerliste: t('rediger.editor.nummerliste'),
                  mellomoverskrift: t('rediger.editor.mellomoverskrift'),
                }}
              />
            </Suspense>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <label className="text-xs text-gray-500">{t('rediger.sted')}
              <select value={meta.sted} onChange={(e) => m('sted', e.target.value)} className={`${felt} mt-0.5`}>
                <option value="inne">{t('rediger.stedInne')}</option>
                <option value="ute">{t('rediger.stedUte')}</option>
                <option value="begge">{t('rediger.stedBegge')}</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">{t('rediger.antallMin')}
              <input type="number" value={meta.antall_min} onChange={(e) => m('antall_min', e.target.value)} className={`${felt} mt-0.5`} />
            </label>
            <label className="text-xs text-gray-500">{t('rediger.antallMaks')}
              <input type="number" value={meta.antall_maks} onChange={(e) => m('antall_maks', e.target.value)} className={`${felt} mt-0.5`} />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {PUNKTER.map((k) => (
              <label key={k} className="block text-xs text-gray-500">{t('rediger.felt.' + k)}
                <textarea value={innhold[k]} onChange={(e) => i(k, e.target.value)} className={`${omr} mt-0.5`} />
              </label>
            ))}
          </div>

          {/* Bilder (WCAG): miniatyr + alt-tekst, fjern eksisterende, last opp nye til redaksjon/. */}
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-800">{t('rediger.bilder')}</h3>

            {/* Eksisterende bilder som IKKE er merket for fjerning */}
            {aktiveBilder.length > 0 && (
              <div className="mt-2 space-y-3">
                {aktiveBilder.map((b) => {
                  const tom = !norm(altTekst[b.id]).trim()
                  const visFallback = b.alt_tekst_kilde === 'fallback' && !endret(altTekst[b.id], b.alt_tekst)
                  const hjelpId = `alt-hjelp-${b.id}`
                  return (
                    <div key={b.id} className="flex items-start gap-3">
                      <img src={b.storage_sti} alt={b.alt_tekst || visLek.tittel || ''}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                      <label className="flex-1 text-xs text-gray-500">
                        {t('rediger.altTekst')} {tom && <span className="text-orange-ink font-semibold">· {t('rediger.altTekstPakrevd')}</span>}
                        {visFallback && <span className="ml-1 text-orange-ink font-semibold">· {t('rediger.altMaSkrives')}</span>}
                        <input type="text" value={altTekst[b.id] || ''}
                          onChange={(e) => { setAltTekst((s) => ({ ...s, [b.id]: e.target.value })); setOk(false) }}
                          aria-invalid={tom} aria-describedby={hjelpId}
                          className={`${felt} mt-0.5 ${tom ? 'border-tlred' : ''}`}
                          placeholder={t('rediger.altTekstPlassholder')} />
                        <span id={hjelpId} className="block text-gray-400 mt-0.5">{t('rediger.bildeAltHjelp')}</span>
                      </label>
                      <button type="button" onClick={() => toggleFjern(b.id)}
                        className="text-xs text-orange-ink hover:underline shrink-0 mt-1">{t('rediger.fjernBilde')}</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Eksisterende bilder merket for fjerning — reversibelt til lagring */}
            {bilder.filter((b) => fjernet.has(b.id)).map((b) => (
              <div key={b.id} className="flex items-center gap-3 mt-3 opacity-60">
                <img src={b.storage_sti} alt="" aria-hidden="true"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 grayscale shrink-0" />
                <span className="flex-1 text-xs text-gray-500">
                  <span className="line-through">{b.alt_tekst || visLek.tittel}</span>
                  <span className="block text-tlred mt-0.5">{t('rediger.fjernesVedLagring')}</span>
                </span>
                <button type="button" onClick={() => toggleFjern(b.id)}
                  className="text-xs text-petrol hover:underline shrink-0">{t('rediger.angreFjern')}</button>
              </div>
            ))}

            {/* Nye opplastede bilder (ennå ikke lagret) */}
            {nyeBilder.length > 0 && (
              <div className="mt-3 space-y-3">
                {nyeBilder.map((n) => {
                  const tom = !norm(n.alt_tekst).trim()
                  const hjelpId = `ny-alt-hjelp-${n.key}`
                  return (
                    <div key={n.key} className="flex items-start gap-3">
                      <img src={n.storage_sti} alt={n.alt_tekst || ''}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                      <label className="flex-1 text-xs text-gray-500">
                        {t('rediger.altTekst')} {tom && <span className="text-orange-ink font-semibold">· {t('rediger.altTekstPakrevd')}</span>}
                        <input type="text" value={n.alt_tekst}
                          onChange={(e) => settNyAlt(n.key, e.target.value)}
                          aria-invalid={tom} aria-describedby={hjelpId}
                          className={`${felt} mt-0.5 ${tom ? 'border-tlred' : ''}`}
                          placeholder={t('rediger.altTekstPlassholder')} />
                        <span id={hjelpId} className="block text-gray-400 mt-0.5">{t('rediger.bildeAltHjelp')}</span>
                      </label>
                      <button type="button" onClick={() => fjernNyttBilde(n.key)}
                        className="text-xs text-orange-ink hover:underline shrink-0 mt-1">{t('rediger.fjernBilde')}</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Legg til bilde — synlig label rundt en skjult, men tastaturfokuserbar filvelger */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-sm text-petrol border border-petrol rounded-full px-4 py-2 cursor-pointer hover:bg-petrol hover:text-white transition focus-within:ring-2 focus-within:ring-petrol">
                <span aria-hidden="true">＋</span> {t('rediger.leggTilBilde')}
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={velgBilde} disabled={bildeLaster} className="sr-only" />
              </label>
              {bildeLaster && <span className="text-sm text-gray-500">{t('rediger.bildeLasterOpp')}</span>}
            </div>
            {bildeFeil && <p role="alert" className="text-sm text-tlred mt-2">{bildeFeil}</p>}
          </div>

          {/* Video (egen seksjon, egen lagring): last opp direkte til Bunny, én video per lek. */}
          <LekVideoRedigering
            ressursId={data.id}
            token={data.endretAt}
            video={eksisterendeVideo}
            tittel={videoTittel}
            etterEndring={etterLagring}
          />

          {/* Aktiv læring: fag (redigerbart) + kompetansemål (LESBAR liste — bekreft/avvis går via køen). */}
          {erAktivLaering && (
            <div className="mt-5 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-800">{t('rediger.fag')}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {fagValg.map((f) => {
                  const på = fagIds.has(f.id)
                  return (
                    <button key={f.id} type="button"
                      onClick={() => { setFagIds((s) => { const n = new Set(s); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n }); setOk(false) }}
                      className={`text-sm rounded-full px-3 py-1 border ${på ? 'bg-orange text-gray-900 border-orange' : 'bg-white text-gray-700 border-gray-300 hover:border-orange'}`}>
                      {f.navn}
                    </button>
                  )
                })}
              </div>

              <h3 className="text-sm font-semibold text-gray-800 mt-4">{t('rediger.kompetansemaal')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('rediger.kompetansemaalHint')}</p>
              {data.kompetansemaal.length === 0 ? (
                <p className="text-sm text-gray-400 mt-1">{t('rediger.kompetansemaalTom')}</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {data.kompetansemaal.map((k) => (
                    <li key={k.id} className="text-sm text-gray-700"><span className="font-mono text-xs text-gray-500">{k.kode}</span> {k.tekst}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {manglerAlt.length > 0 && <p className="text-sm text-orange-ink mt-3">{t('rediger.altTekstBlokk')}</p>}
      {feil && (
        <p className="text-sm text-red-600 mt-3">
          {feil}
          {/lagret denne|finnes ikke|endringsstempel/i.test(feil) && (
            <button onClick={() => window.location.reload()} className="ml-2 underline text-orange-ink">{t('rediger.lastInnPaNytt')}</button>
          )}
        </p>
      )}
      {ok && !feil && <p className="text-sm text-petrol mt-3">{t('rediger.lagret')}</p>}

      <div className="flex gap-3 mt-4 items-center">
        <button onClick={lagre} disabled={lagrer || manglerAlt.length > 0}
          className="bg-petrol text-white font-medium px-6 py-2.5 rounded-full hover:bg-petrol/90 transition disabled:opacity-50">
          {lagrer ? t('rediger.lagrer') : t('rediger.lagre')}
        </button>
        <button onClick={onAvbryt} className="text-gray-500 hover:text-gray-700 px-4">{t('rediger.avbryt')}</button>
      </div>
    </div>
  )
}
