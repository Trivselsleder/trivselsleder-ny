import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { hentTuKontekst, hentTuRunder } from '../../lib/tu'
import { skrivUtKodeark } from '../../lib/tuKodeark'

// ============================================================================
// Trivselsundersøkelsen — KODER + ARK (steg 4.3, lærerflaten)
//
//   - Viser rundene som venter på koder (status 'utkast') med avkryssing
//     (alle valgt som standard). Én knapp genererer koder for alle valgte
//     grupper og åpner utskriften av kodearket i SAMME handling.
//   - Rå-kodene finnes KUN i denne sidens minne (svaret fra
//     /api/tu/opprett-koder) og på papirarket. De lagres aldri, kan aldri
//     hentes fram igjen (engangsgarantien i migr 066) — tydelig varslet
//     FØR generering, og «skriv ut igjen» virker bare så lenge siden er åpen.
//   - QR per kode: engangs-svarlenke /undersokelse#kode=XXXX-XXXX. Koden
//     ligger i URL-FRAGMENTET (etter #) — det sendes aldri til serveren og
//     havner dermed aldri i infrastruktur-logger. Elevflaten leser fragmentet,
//     fjerner det fra adresselinja umiddelbart og sender koden videre som
//     POST (samme fasit som tastet kode).
//
// Tilgang: kanOpprette (skoleadmin/superadmin) — samme grense som opprett-
// siden, endepunktet og databasens RLS/tu_har_tilgang_skole.
// WCAG 2.1 AA: ekte checkbokser med label, status som tekst, role="alert"
// på feil, fokusrekkefølge urørt. i18n (no + sv) fra første streng.
// ============================================================================

export default function SkoleTuKoder() {
  const { t, i18n } = useTranslation()
  const { bruker } = useAuth()
  const [kontekst, setKontekst] = useState(null)
  const [utkast, setUtkast] = useState([])         // runder med status 'utkast'
  const [valgte, setValgte] = useState({})         // { [rundeId]: true }
  const [genererer, setGenererer] = useState(false)
  const [resultat, setResultat] = useState(null)   // { grupper, feilede } — KUN i minnet
  const [feil, setFeil] = useState('')             // i18n-nøkkel
  const [popupBlokkert, setPopupBlokkert] = useState(false)

  useEffect(() => {
    let aktiv = true
    if (!bruker) return
    hentTuKontekst(bruker).then(async (k) => {
      if (!aktiv) return
      setKontekst(k)
      if (k.tilgang && k.skoleId) {
        try {
          const alle = await hentTuRunder(k.skoleId)
          if (!aktiv) return
          const u = alle.filter((r) => r.status === 'utkast')
          setUtkast(u)
          setValgte(Object.fromEntries(u.map((r) => [r.id, true])))
        } catch {
          if (aktiv) setFeil('tu.laerer.koder.feilLasting')
        }
      }
    })
    return () => { aktiv = false }
  }, [bruker])

  const antallValgt = useMemo(() => utkast.filter((r) => valgte[r.id]).length, [utkast, valgte])
  const svarUrl = `${window.location.origin}/undersokelse`

  async function generer() {
    setFeil('')
    setPopupBlokkert(false)
    const rundene = utkast.filter((r) => valgte[r.id])
    if (rundene.length === 0) { setFeil('tu.laerer.koder.feilIngenValgt'); return }
    setGenererer(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setFeil('tu.laerer.koder.feilGenerisk'); return }

      const grupper = []
      const feilede = []
      // Én runde om gangen (hver er atomisk i databasen). Feiler én gruppe,
      // fortsetter vi med resten — det som lyktes, skal alltid på arket.
      for (const r of rundene) {
        try {
          const res = await fetch('/api/tu/opprett-koder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ rundeId: r.id }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            feilede.push({ runde: r, feil: data?.feil || 'SERVERFEIL' })
            continue
          }
          // QR: engangs-svarlenke med koden i fragmentet (aldri til server).
          const koder = []
          for (const kode of data.koder || []) {
            const lenke = `${svarUrl}#kode=${encodeURIComponent(kode)}`
            let qrDataUrl = ''
            try {
              qrDataUrl = await QRCode.toDataURL(lenke, { errorCorrectionLevel: 'M', margin: 0, width: 220 })
            } catch { /* uten QR-bilde er koden + adressen fortsatt brukbar */ }
            koder.push({ kode, qrDataUrl })
          }
          grupper.push({
            gruppeNavn: data.runde?.gruppeNavn ?? r.gruppe_navn,
            trinn: data.runde?.trinn ?? r.trinn,
            frist: data.runde?.frist ?? r.frist,
            koder,
          })
        } catch {
          feilede.push({ runde: r, feil: 'NETT' })
        }
      }

      const nyttResultat = { grupper, feilede }
      setResultat(nyttResultat)
      // Rydd listen: det som lyktes er nå 'apen' og skal ikke kunne velges igjen.
      const lyktesIkke = new Set(feilede.map((f) => f.runde.id))
      setUtkast((u) => u.filter((r) => lyktesIkke.has(r.id)))

      if (grupper.length > 0) {
        const ok = skrivUtKodeark(t, {
          skoleNavn: kontekst?.skoleNavn,
          svarUrl,
          grupper,
          spraak: i18n.language,
        })
        setPopupBlokkert(!ok)
      }
      if (feilede.length > 0 && grupper.length === 0) setFeil(feilNokkel(feilede[0].feil))
    } finally {
      setGenererer(false)
    }
  }

  function skrivUtIgjen() {
    if (!resultat || resultat.grupper.length === 0) return
    const ok = skrivUtKodeark(t, {
      skoleNavn: kontekst?.skoleNavn,
      svarUrl,
      grupper: resultat.grupper,
      spraak: i18n.language,
    })
    setPopupBlokkert(!ok)
  }

  if (kontekst === null) {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"><p className="text-gray-500 py-8">{t('tu.laerer.laster')}</p></div>
  }
  if (!kontekst.tilgang || !kontekst.kanOpprette) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('tu.laerer.koder.tittel')}</h1>
        <div className="mt-4 rounded-xl border-l-4 border-orange bg-orange/10 px-4 py-3">
          <h2 className="font-bold text-orange-ink">{t('tu.laerer.info.kunAdminTittel')}</h2>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{t('tu.laerer.info.kunAdminTekst')}</p>
        </div>
        <Link to="/min-side/trivselsundersokelsen" className="inline-block mt-4 text-sm font-semibold text-orange-ink hover:underline">
          ← {t('tu.laerer.koder.tilbake')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link to="/min-side/trivselsundersokelsen" className="text-sm font-semibold text-orange-ink hover:underline">
        ← {t('tu.laerer.koder.tilbake')}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">{t('tu.laerer.koder.tittel')}</h1>
      <p className="text-gray-600 mt-1">{t('tu.laerer.koder.ingress')}</p>

      {/* Engangs-advarselen — FØR noe genereres */}
      <div className="mt-5 rounded-xl border-l-4 border-orange bg-orange/10 px-4 py-3">
        <p className="text-sm text-gray-800 leading-relaxed font-semibold">{t('tu.laerer.koder.advarsel')}</p>
      </div>

      {resultat && (
        <div className="mt-5 bg-white rounded-2xl border border-gray-200 p-5" role="status">
          {resultat.grupper.length > 0 && (
            <>
              <h2 className="font-bold text-gray-900">{t('tu.laerer.koder.ferdigTittel')}</h2>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                {t('tu.laerer.koder.ferdigTekst', { antall: resultat.grupper.length })}
              </p>
              <p className="text-sm font-semibold text-gray-800 mt-2">{t('tu.laerer.koder.ferdigHusk')}</p>
              <button
                type="button"
                onClick={skrivUtIgjen}
                className="mt-3 rounded-xl border-2 border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-colors"
              >
                {t('tu.laerer.koder.skrivUtIgjen')}
              </button>
            </>
          )}
          {resultat.feilede.length > 0 && (
            <p className="text-sm font-semibold text-tlred mt-3" role="alert">
              {t('tu.laerer.koder.feilDelvis', {
                grupper: resultat.feilede
                  .map((f) => f.runde.gruppe_navn || t('tu.laerer.runder.heleTrinnet', { trinn: f.runde.trinn }))
                  .join(', '),
              })}
            </p>
          )}
          {popupBlokkert && (
            <p className="text-sm font-semibold text-tlred mt-2" role="alert">{t('tu.laerer.koder.popupBlokkert')}</p>
          )}
        </div>
      )}

      {/* Runder som venter på koder */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900">{t('tu.laerer.koder.valgTittel')}</h2>
        {utkast.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">{t('tu.laerer.koder.ingenUtkast')}</p>
        )}
        {utkast.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {utkast.map((r) => (
              <li key={r.id}>
                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={!!valgte[r.id]}
                    onChange={(e) => setValgte((v) => ({ ...v, [r.id]: e.target.checked }))}
                    className="mt-1 w-5 h-5 accent-[#106C75]"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900">
                      {r.gruppe_navn
                        ? t('tu.laerer.runder.gruppeEtikett', { gruppe: r.gruppe_navn, trinn: r.trinn })
                        : t('tu.laerer.runder.heleTrinnet', { trinn: r.trinn })}
                    </span>
                    <span className="block text-sm text-gray-600 mt-0.5">
                      {Number.isInteger(r.elevtall)
                        ? t('tu.laerer.koder.antall', { antall: r.elevtall + 2, elevtall: r.elevtall })
                        : t('tu.laerer.koder.manglerElevtall')}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {feil && (
          <p className="mt-3 text-base font-semibold text-tlred" role="alert">{t(feil)}</p>
        )}

        {utkast.length > 0 && (
          <button
            type="button"
            onClick={generer}
            disabled={genererer || antallValgt === 0}
            className="mt-4 rounded-xl bg-petrol text-white font-bold px-6 py-3 hover:bg-[#0b4d54] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors"
          >
            {genererer ? t('tu.laerer.koder.genererer') : t('tu.laerer.koder.genererKnapp')}
          </button>
        )}
      </div>
    </div>
  )
}

// Oversetter endepunktets feilkoder til i18n-nøkler (menneskelige beskjeder).
function feilNokkel(kode) {
  switch (kode) {
    case 'MANGLER_NOKKEL': return 'tu.laerer.koder.feilNokkel'
    case 'ALLEREDE_GENERERT': return 'tu.laerer.koder.feilAllerede'
    case 'KOLLISJON': return 'tu.laerer.koder.feilKollisjon'
    case 'MANGLER_ELEVTALL': return 'tu.laerer.koder.feilElevtall'
    case 'NETT': return 'tu.laerer.koder.feilNett'
    default: return 'tu.laerer.koder.feilGenerisk'
  }
}
