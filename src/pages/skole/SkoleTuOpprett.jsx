import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { hentTuKontekst, opprettTuRunder, beregnSkoleaar, beregnSemester } from '../../lib/tu'

// ============================================================================
// Trivselsundersøkelsen — OPPRETT RUNDE (steg 4.2, lærerflaten)
//
//   - VINDU: startdato + sluttdato (beslutning: vindu, ikke dag). Lagres som
//     tu_runder.startdato + tu_runder.frist (migr 064).
//   - GRUPPER: navn (f.eks. «6A») + trinn (5.–10.) + elevtall per gruppe.
//     Flere grupper per opprettelse → ÉN tu_runder-rad PER gruppe (beslutning
//     C, variant a). Gruppenavnet ligger KUN på runden, aldri på svaret.
//   - TL-KROK: «Skal elevene få spørsmål om de er trivselsleder dette
//     semesteret?» → tu_runder.tl_sporsmal. Selve spørsmålsblokken i
//     elevflaten bygges i et senere steg — dette er kun kroken.
//   - Skoleår + semester beregnes automatisk fra startdato og vises.
//   - Rundene opprettes som UTKAST. Koder/ark genereres i steg 4.3 (senere),
//     og runden åpnes derfra. Ingen svar-data berøres her.
//
// WCAG 2.1 AA: ekte <label> for alle felt, feil med role="alert" og
// aria-describedby, tastaturvennlige knapper, tekst-statuser.
// i18n (no + sv) fra første streng.
// ============================================================================

const TRINN_VALG = [5, 6, 7, 8, 9, 10]
const MAKS_GRUPPER = 30

function isoDato(d) { return d.toISOString().slice(0, 10) }

export default function SkoleTuOpprett() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { bruker } = useAuth()
  const [kontekst, setKontekst] = useState(null)

  // Standardvindu: start om en uke, to ukers varighet (standard_frist_dager=14).
  const [startdato, setStartdato] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return isoDato(d) })
  const [sluttdato, setSluttdato] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 21); return isoDato(d) })
  const [grupper, setGrupper] = useState([{ navn: '', trinn: 6, elevtall: '' }])
  const [tlSporsmal, setTlSporsmal] = useState(false)
  const [feil, setFeil] = useState('')       // i18n-nøkkel
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    let aktiv = true
    if (!bruker) return   // profilen laster fortsatt (ProtectedRoute har sesjon)
    hentTuKontekst(bruker).then((k) => { if (aktiv) setKontekst(k) })
    return () => { aktiv = false }
  }, [bruker])

  const skoleaar = useMemo(() => (startdato ? beregnSkoleaar(startdato) : ''), [startdato])
  const semester = useMemo(() => (startdato ? beregnSemester(startdato) : ''), [startdato])

  function oppdaterGruppe(i, felt, verdi) {
    setGrupper((g) => g.map((r, idx) => (idx === i ? { ...r, [felt]: verdi } : r)))
  }
  function leggTilGruppe() {
    setGrupper((g) => {
      if (g.length >= MAKS_GRUPPER) return g
      const forrige = g[g.length - 1]
      return [...g, { navn: '', trinn: forrige?.trinn ?? 6, elevtall: '' }]
    })
  }
  function fjernGruppe(i) {
    setGrupper((g) => (g.length > 1 ? g.filter((_, idx) => idx !== i) : g))
  }

  async function lagre(e) {
    e.preventDefault()
    setFeil('')

    if (!startdato || !sluttdato) { setFeil('tu.laerer.opprett.feilDatoMangler'); return }
    if (sluttdato < startdato) { setFeil('tu.laerer.opprett.feilDatoRekkefolge'); return }

    const rene = grupper
      .map((g) => ({ navn: String(g.navn || '').trim(), trinn: Number(g.trinn), elevtall: Number(g.elevtall) }))
      .filter((g) => g.navn || g.elevtall)
    if (rene.length === 0) { setFeil('tu.laerer.opprett.feilIngenGrupper'); return }
    for (const g of rene) {
      if (!g.navn) { setFeil('tu.laerer.opprett.feilGruppeNavn'); return }
      if (!Number.isInteger(g.elevtall) || g.elevtall < 1 || g.elevtall > 200) {
        setFeil('tu.laerer.opprett.feilElevtall'); return
      }
    }
    // Duplikat i skjemaet (samme navn + trinn) fanges før databasen gjør det.
    const sett = new Set()
    for (const g of rene) {
      const nokkel = `${g.trinn}|${g.navn.toLowerCase()}`
      if (sett.has(nokkel)) { setFeil('tu.laerer.opprett.feilDuplikat'); return }
      sett.add(nokkel)
    }

    setLagrer(true)
    try {
      await opprettTuRunder({
        skoleId: kontekst.skoleId,
        startdato,
        sluttdato,
        grupper: rene,
        tlSporsmal,
      })
      navigate('/min-side/trivselsundersokelsen')
    } catch (e2) {
      if (e2?.kode === 'DUPLIKAT_GRUPPE') setFeil('tu.laerer.opprett.feilDuplikatDb')
      else if (e2?.kode === 'INGEN_SKRIVETILGANG') setFeil('tu.laerer.opprett.feilTilgang')
      else setFeil('tu.laerer.opprett.feilGenerisk')
    } finally {
      setLagrer(false)
    }
  }

  if (kontekst === null) {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"><p className="text-gray-500 py-8">{t('tu.laerer.laster')}</p></div>
  }
  if (!kontekst.tilgang) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('tu.laerer.fane')}</h1>
        <p className="mt-4 text-gray-600">{t('tu.laerer.ingenTilgang')}</p>
      </div>
    )
  }

  // HTLA uten skoleadmin-tilgang (justering 23. aug): skjemaet vises ikke —
  // samme forklaringsboks som på info-siden. Samme grense som RLS-en (migr 041).
  if (!kontekst.kanOpprette) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('tu.laerer.opprett.tittel')}</h1>
        <div className="mt-4 rounded-xl border-l-4 border-orange bg-orange/10 px-4 py-3">
          <h2 className="font-bold text-orange-ink">{t('tu.laerer.info.kunAdminTittel')}</h2>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{t('tu.laerer.info.kunAdminTekst')}</p>
        </div>
        <Link to="/min-side/trivselsundersokelsen" className="inline-block mt-4 text-sm font-semibold text-orange-ink hover:underline">
          ← {t('tu.laerer.opprett.tilbake')}
        </Link>
      </div>
    )
  }

  const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-petrol focus-visible:ring-2 focus-visible:ring-petrol/30'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link to="/min-side/trivselsundersokelsen" className="text-sm font-semibold text-orange-ink hover:underline">
        ← {t('tu.laerer.opprett.tilbake')}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">{t('tu.laerer.opprett.tittel')}</h1>
      <p className="text-gray-600 mt-1">{t('tu.laerer.opprett.ingress')}</p>

      <form onSubmit={lagre} noValidate className="mt-6 flex flex-col gap-6">
        {/* VINDU */}
        <fieldset className="bg-white rounded-2xl border border-gray-200 p-5">
          <legend className="font-bold text-gray-900 px-1">{t('tu.laerer.opprett.vinduTittel')}</legend>
          <p className="text-sm text-gray-600 mt-1">{t('tu.laerer.opprett.vinduHjelp')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label htmlFor="tu-start" className="block text-sm font-semibold text-gray-700 mb-1">
                {t('tu.laerer.opprett.startdato')}
              </label>
              <input id="tu-start" type="date" value={startdato} onChange={(e) => setStartdato(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="tu-slutt" className="block text-sm font-semibold text-gray-700 mb-1">
                {t('tu.laerer.opprett.sluttdato')}
              </label>
              <input id="tu-slutt" type="date" value={sluttdato} min={startdato || undefined} onChange={(e) => setSluttdato(e.target.value)} className={inputCls} />
            </div>
          </div>
          {skoleaar && (
            <p className="text-sm text-gray-500 mt-3">
              {t('tu.laerer.opprett.skoleaarInfo', { skoleaar, semester: t(`tu.laerer.opprett.semester.${semester}`) })}
            </p>
          )}
        </fieldset>

        {/* GRUPPER */}
        <fieldset className="bg-white rounded-2xl border border-gray-200 p-5">
          <legend className="font-bold text-gray-900 px-1">{t('tu.laerer.opprett.grupperTittel')}</legend>
          <p className="text-sm text-gray-600 mt-1">{t('tu.laerer.opprett.grupperHjelp')}</p>

          <div className="mt-3 flex flex-col gap-3">
            {grupper.map((g, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                <div>
                  <label htmlFor={`tu-gnavn-${i}`} className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('tu.laerer.opprett.gruppeNavn')}
                  </label>
                  <input
                    id={`tu-gnavn-${i}`}
                    type="text"
                    value={g.navn}
                    maxLength={40}
                    onChange={(e) => oppdaterGruppe(i, 'navn', e.target.value)}
                    placeholder={t('tu.laerer.opprett.gruppeNavnPlassholder')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor={`tu-gtrinn-${i}`} className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('tu.laerer.opprett.trinn')}
                  </label>
                  <select
                    id={`tu-gtrinn-${i}`}
                    value={g.trinn}
                    onChange={(e) => oppdaterGruppe(i, 'trinn', Number(e.target.value))}
                    className={inputCls}
                  >
                    {TRINN_VALG.map((tr) => (
                      <option key={tr} value={tr}>{t('tu.laerer.opprett.trinnValg', { n: tr })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`tu-gantall-${i}`} className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('tu.laerer.opprett.elevtall')}
                  </label>
                  <input
                    id={`tu-gantall-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={200}
                    value={g.elevtall}
                    onChange={(e) => oppdaterGruppe(i, 'elevtall', e.target.value)}
                    placeholder="24"
                    className={`${inputCls} w-full sm:w-24`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fjernGruppe(i)}
                  disabled={grupper.length === 1}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
                >
                  {t('tu.laerer.opprett.fjernGruppe')}
                  <span className="sr-only"> {g.navn || i + 1}</span>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={leggTilGruppe}
            disabled={grupper.length >= MAKS_GRUPPER}
            className="mt-4 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-petrol hover:text-petrol disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol/40 transition-colors"
          >
            + {t('tu.laerer.opprett.leggTilGruppe')}
          </button>
        </fieldset>

        {/* TL-KROK */}
        <fieldset className="bg-white rounded-2xl border border-gray-200 p-5">
          <legend className="font-bold text-gray-900 px-1">{t('tu.laerer.opprett.tlTittel')}</legend>
          <label className="mt-2 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tlSporsmal}
              onChange={(e) => setTlSporsmal(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#106C75]"
            />
            <span>
              <span className="block font-semibold text-gray-800">{t('tu.laerer.opprett.tlSporsmal')}</span>
              <span className="block text-sm text-gray-600 mt-0.5">{t('tu.laerer.opprett.tlHjelp')}</span>
            </span>
          </label>
        </fieldset>

        {feil && (
          <p className="text-base font-semibold text-tlred" role="alert">{t(feil)}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={lagrer}
            className="rounded-xl bg-petrol text-white font-bold px-6 py-3 hover:bg-[#0b4d54] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors"
          >
            {lagrer ? t('tu.laerer.opprett.lagrer') : t('tu.laerer.opprett.opprettKnapp')}
          </button>
          <Link
            to="/min-side/trivselsundersokelsen"
            className="rounded-xl border-2 border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-colors"
          >
            {t('tu.laerer.opprett.avbryt')}
          </Link>
        </div>
        <p className="text-sm text-gray-500 -mt-2">{t('tu.laerer.opprett.utkastInfo')}</p>
      </form>
    </div>
  )
}
