import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lagreRessurs, hentRessursForRedigering, hentFagValg } from '../lib/leker'
import LekVisning from './LekVisning'

// Innholds-tekstfeltene (utover tittel + beskrivelse), med i18n-nøkkel.
const PUNKTER = ['formaal', 'forberedelse', 'inndeling', 'utgangsposisjon', 'kronologi', 'regler', 'variasjoner', 'instruktoernotat']
// Rekkefølge/utvalg av språk i fanene (kun de som faktisk finnes vises; nb er standard).
const SPRAK = [['nb', 'Bokmål'], ['nn', 'Nynorsk'], ['sv', 'Svenska'], ['is', 'Íslenska'], ['en', 'English']]
const norm = (v) => (v ?? '')                       // NULL og '' behandles likt (E1)
const endret = (a, b) => norm(a) !== norm(b)        // «faktisk redigert»

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

  const [meta, setMeta] = useState({
    sted: data.sted || 'begge',
    antall_min: data.antallMin ?? '',
    antall_maks: data.antallMaks ?? '',
  })
  // Bilder: rediger alt-tekst på eksisterende bilder (opplasting av NYE er egen sak, migr 108).
  const bilder = useMemo(() => data.medier.filter((m) => m.type === 'bilde'), [data])
  const [altTekst, setAltTekst] = useState(() => Object.fromEntries(bilder.map((b) => [b.id, b.alt_tekst || ''])))
  // Fag (kun aktiv læring): redigerbare avkrysninger.
  const [fagIds, setFagIds] = useState(() => new Set(data.fag.map((f) => f.id)))

  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState(null)
  const [ok, setOk] = useState(false)
  const [forhandsvis, setForhandsvis] = useState(false)

  function i(k, v) { setInnholdMap((s) => ({ ...s, [aktivtSprak]: { ...(s[aktivtSprak] || initInnhold(aktivtSprak)), [k]: v } })); setOk(false) }
  function m(k, v) { setMeta((s) => ({ ...s, [k]: v })); setOk(false) }

  // Bilder som mangler alt-tekst OG som brukeren har rørt (endret) — blokkerer lagring (WCAG).
  const endretBilder = bilder.filter((b) => endret(altTekst[b.id], b.alt_tekst))
  const manglerAlt = endretBilder.filter((b) => !norm(altTekst[b.id]).trim())

  async function lagre() {
    if (lagrer || manglerAlt.length) return
    setLagrer(true); setFeil(null); setOk(false)
    try {
      const payload = { id: data.id, endret_at: data.endretAt, sprak: aktivtSprak }

      // INNHOLD (E1): send kun feltene som faktisk er endret fra basen. Uendret NULL → ikke sendt → bevart.
      const innEndr = {}
      for (const k of ['tittel', 'beskrivelse', ...PUNKTER]) if (endret(innhold[k], orig[k])) innEndr[k] = innhold[k]
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

      // BILDER: send kun bilder der alt-tekst er endret (RPC setter da alt_tekst_kilde='menneske').
      if (endretBilder.length) payload.medier = endretBilder.map((b) => ({ id: b.id, alt_tekst: altTekst[b.id] }))

      // FAG (kun aktiv læring): send fag_ids KUN hvis endret (fravær = rør ikke).
      if (erAktivLaering) {
        const orgFag = new Set(data.fag.map((f) => f.id))
        const ulik = orgFag.size !== fagIds.size || [...fagIds].some((x) => !orgFag.has(x))
        if (ulik) payload.fag_ids = [...fagIds]
      }

      await lagreRessurs(payload)
      setOk(true)
      await etterLagring()   // henter på nytt → nytt token → remonterer skjemaet
    } catch (e) {
      setFeil(e.message)
    } finally {
      setLagrer(false)
    }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange'
  const omr = felt + ' min-h-[70px]'

  // Forhåndsvisning: bygg en formLek-formet struktur fra visLek (trinn/utstyr/egnet/sesong/video) +
  // gjeldende innhold/meta, og gjenbruk LekVisning — samme som lekesiden.
  const previewLek = { ...visLek, tittel: innhold.tittel, tekst: { ...innhold, sprak: aktivtSprak }, sted: meta.sted, antallMin: meta.antall_min, antallMaks: meta.antall_maks }

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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{innhold.tittel || t('rediger.utenTittel')}</h1>
          <LekVisning lek={previewLek} />
        </div>
      ) : (
        <>
          <label className="block text-xs text-gray-500 mt-4">{t('rediger.tittelFelt')}
            <input type="text" value={innhold.tittel} onChange={(e) => i('tittel', e.target.value)} className={`${felt} mt-0.5`} />
          </label>

          <label className="block text-xs text-gray-500 mt-3">{t('rediger.beskrivelse')} <span className="text-gray-400">{t('rediger.beskrivelseHint')}</span>
            <textarea value={innhold.beskrivelse} onChange={(e) => i('beskrivelse', e.target.value)} className={`${omr} mt-0.5 min-h-[110px]`} />
          </label>

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

          {/* Bilder + alt-tekst (WCAG). Opplasting av nye bilder er egen sak (migr 108). */}
          {bilder.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-800">{t('rediger.bilder')}</h3>
              <div className="mt-2 space-y-2">
                {bilder.map((b) => {
                  const tom = !norm(altTekst[b.id]).trim()
                  return (
                    <div key={b.id} className="flex items-start gap-2">
                      <span className="text-lg" aria-hidden>🖼️</span>
                      <label className="flex-1 text-xs text-gray-500">
                        {t('rediger.altTekst')} {tom && <span className="text-orange-ink font-semibold">· {t('rediger.altTekstPakrevd')}</span>}
                        <input type="text" value={altTekst[b.id] || ''}
                          onChange={(e) => { setAltTekst((s) => ({ ...s, [b.id]: e.target.value })); setOk(false) }}
                          aria-invalid={tom} className={`${felt} mt-0.5 ${tom ? 'border-tlred' : ''}`}
                          placeholder={t('rediger.altTekstPlassholder')} />
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
