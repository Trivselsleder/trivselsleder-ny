import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { hentTuKontekst, hentTuRunder } from '../../lib/tu'
import { lastNedForeldreinfo } from '../../lib/tuForeldreinfo'

// ============================================================================
// Trivselsundersøkelsen — INFO-SIDE (steg 4.1, lærerflaten)
//
// Landing for fanen «Trivselsundersøkelsen» i SkoleLayout:
//   - Essensielt øverst: hva / ~10 min / utdeling / personvern i korte trekk
//     + «Opprett runde»-knapp ved siden.
//   - «Les mer» folder ut full B1-tekst (moderdok) — to varianter:
//     medlemsskole / potensiell skole (skoler.status = 'Potensielle').
//     Personvern-avsnittet er IDENTISK i begge (moderdok-regel).
//   - Nedlastbart foreldreinfo-skriv (beslutning D) — E.2-malen, skolenavn
//     fylles inn automatisk. Jurist godkjenner ordlyden før ekte elever.
//   - Liste over skolens runder/grupper (metadata — ALDRI svar-innhold).
//
// Synlighet: KUN HTLA / skoleadmin / superadmin (hentTuKontekst). Andre får
// en vennlig avvisning (fanen er også skjult for dem i SkoleLayout).
// WCAG 2.1 AA: overskriftshierarki, disclosure med aria-expanded, statuser
// som tekst (ikke bare farge), oransje tekst = text-orange-ink (4,9:1).
// i18n (no + sv) fra første streng. Ordet «anonym» brukes ikke i UI.
// ============================================================================

const STATUS_STIL = {
  utkast: 'bg-gray-100 text-gray-700',
  apen: 'bg-teal/15 text-petrol',
  lukket: 'bg-orange/15 text-orange-ink',
}

export default function SkoleTrivselsundersokelsen() {
  const { t } = useTranslation()
  const { bruker } = useAuth()
  const [kontekst, setKontekst] = useState(null)   // null = laster
  const [runder, setRunder] = useState([])
  const [runderFeil, setRunderFeil] = useState(false)
  const [lesMer, setLesMer] = useState(false)
  const [popupBlokkert, setPopupBlokkert] = useState(false)

  useEffect(() => {
    let aktiv = true
    if (!bruker) return   // profilen laster fortsatt (ProtectedRoute har sesjon)
    hentTuKontekst(bruker).then(async (k) => {
      if (!aktiv) return
      setKontekst(k)
      if (k.tilgang && k.skoleId) {
        try { setRunder(await hentTuRunder(k.skoleId)) }
        catch { setRunderFeil(true) }
      }
    })
    return () => { aktiv = false }
  }, [bruker])

  if (kontekst === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-gray-500 py-8">{t('tu.laerer.laster')}</p>
      </div>
    )
  }

  if (!kontekst.tilgang) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('tu.laerer.fane')}</h1>
        <p className="mt-4 text-gray-600">{t('tu.laerer.ingenTilgang')}</p>
      </div>
    )
  }

  const variant = kontekst.erPotensiell ? 'potensiell' : 'medlem'

  function foreldreinfo() {
    const ok = lastNedForeldreinfo(t, kontekst.skoleNavn)
    setPopupBlokkert(!ok)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('tu.laerer.fane')}</h1>
      <p className="text-gray-600 mt-1">{t(`tu.laerer.info.ingress.${variant}`)}</p>

      {/* Essensielt øverst + Opprett runde-knapp ved siden (4.1) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EssensKort ikon="🎯" tittel={t('tu.laerer.info.hvaTittel')} tekst={t('tu.laerer.info.hvaTekst')} />
          <EssensKort ikon="⏱️" tittel={t('tu.laerer.info.tidTittel')} tekst={t('tu.laerer.info.tidTekst')} />
          <EssensKort ikon="🎟️" tittel={t('tu.laerer.info.utdelingTittel')} tekst={t('tu.laerer.info.utdelingTekst')} />
          <EssensKort ikon="🛡️" tittel={t('tu.laerer.info.personvernTittel')} tekst={t('tu.laerer.info.personvernTekst')} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
          {kontekst.kanOpprette ? (
            <>
              <h2 className="font-bold text-gray-900">{t('tu.laerer.info.kortKlarTittel')}</h2>
              <p className="text-sm text-gray-600 flex-grow">{t('tu.laerer.info.kortKlarTekst')}</p>
              <Link
                to="/min-side/trivselsundersokelsen/opprett"
                className="block text-center rounded-xl bg-petrol text-white font-bold px-5 py-3 hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors"
              >
                {t('tu.laerer.info.opprettKnapp')}
              </Link>
            </>
          ) : (
            /* HTLA uten skoleadmin-tilgang: forklaringsboks i stedet for knapp
               (justering 23. aug). Samme grense som RLS-en — frontend speiler den. */
            <div className="rounded-xl border-l-4 border-orange bg-orange/10 px-4 py-3 flex-grow">
              <h2 className="font-bold text-orange-ink">{t('tu.laerer.info.kunAdminTittel')}</h2>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{t('tu.laerer.info.kunAdminTekst')}</p>
            </div>
          )}
          <button
            type="button"
            onClick={foreldreinfo}
            className="rounded-xl border-2 border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-colors"
          >
            {t('tu.laerer.info.foreldreinfoKnapp')}
          </button>
          <p className="text-xs text-gray-500">{t('tu.laerer.info.foreldreinfoHjelp')}</p>
          {popupBlokkert && (
            <p className="text-xs font-semibold text-tlred" role="alert">{t('tu.laerer.info.popupBlokkert')}</p>
          )}
        </div>
      </div>

      {/* «Les mer» → full B1-tekst i riktig variant */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={() => setLesMer((v) => !v)}
          aria-expanded={lesMer}
          aria-controls="tu-lesmer"
          className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-gray-900 hover:bg-gray-50 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/30 transition-colors"
        >
          <span>{t('tu.laerer.info.lesMer')}</span>
          <span aria-hidden="true" className={`text-sm transition-transform ${lesMer ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {lesMer && (
          <div id="tu-lesmer" className="px-5 pb-5 text-gray-700 leading-relaxed">
            <h2 className="font-bold text-gray-900 mt-2">{t(`tu.laerer.b1.${variant}.omTittel`)}</h2>
            <p className="mt-2">{t(`tu.laerer.b1.${variant}.om1`)}</p>
            <p className="mt-3">{t(`tu.laerer.b1.${variant}.om2`)}</p>
            <h2 className="font-bold text-gray-900 mt-5">{t('tu.laerer.b1.gjennomforingTittel')}</h2>
            <p className="mt-2">{t('tu.laerer.b1.gjennomforing')}</p>
            <h2 className="font-bold text-gray-900 mt-5">{t('tu.laerer.b1.personvernTittel')}</h2>
            <p className="mt-2">{t('tu.laerer.b1.personvern')}</p>
          </div>
        )}
      </div>

      {/* Skolens runder — metadata per gruppe. ALDRI svar-innhold her. */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{t('tu.laerer.runder.tittel')}</h2>
          {/* Steg 4.3: runder i utkast venter på koder + ark. Kun kanOpprette —
              samme grense som endepunktet og RLS-en. */}
          {kontekst.kanOpprette && runder.some((r) => r.status === 'utkast') && (
            <Link
              to="/min-side/trivselsundersokelsen/koder"
              className="rounded-xl bg-petrol text-white font-bold px-5 py-2.5 hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors"
            >
              {t('tu.laerer.runder.koderKnapp')}
            </Link>
          )}
        </div>
        {runderFeil && <p className="mt-2 text-tlred">{t('tu.laerer.runder.feil')}</p>}
        {!runderFeil && runder.length === 0 && (
          <p className="mt-2 text-gray-500">{t('tu.laerer.runder.ingen')}</p>
        )}
        {runder.length > 0 && (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {runder.map((r) => (
              <li key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900">
                    {r.gruppe_navn
                      ? t('tu.laerer.runder.gruppeEtikett', { gruppe: r.gruppe_navn, trinn: r.trinn })
                      : t('tu.laerer.runder.heleTrinnet', { trinn: r.trinn })}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STIL[r.status] || STATUS_STIL.utkast}`}>
                    {t(`tu.laerer.status.${r.status}`)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1.5">
                  {r.skoleaar}
                  {r.elevtall ? ` · ${t('tu.laerer.runder.elever', { antall: r.elevtall })}` : ''}
                </p>
                {(r.startdato || r.frist) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {t('tu.laerer.runder.vindu', {
                      start: r.startdato ? datoTekst(r.startdato) : '—',
                      slutt: r.frist ? datoTekst(r.frist) : '—',
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EssensKort({ ikon, tittel, tekst }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">{ikon}</span>
        <h2 className="font-bold text-gray-900">{tittel}</h2>
      </div>
      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{tekst}</p>
    </div>
  )
}

function datoTekst(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
}
