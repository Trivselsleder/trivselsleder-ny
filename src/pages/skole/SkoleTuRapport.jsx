import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useBrukslogg } from '../../hooks/useBrukslogg'
import { hentTuKontekst, hentTuRunder, hentRapportData } from '../../lib/tu'
import { byggRapportHtml, skrivUtRapport } from '../../lib/tuRapportPdf'

// ============================================================================
// Trivselsundersøkelsen — SKOLENS RESULTATRAPPORT (steg 5, utgang 1).
//
// Viser en forhåndsvisning av rapporten på skjermen (samme dokument som PDF-en,
// i en iframe) + en «Skriv ut / Lagre som PDF»-knapp som åpner nettleserens
// utskrift (samme mønster som periodeplanen — INGEN ny PDF-stack).
//
// Data hentes KUN fra de tre skjermede RPC-ene (tu.js). skjult_aarsak er
// allerede kastet i datalaget (§1) — den finnes ikke i noe objekt her.
//
// Tilgang: KUN skoleadmin/superadmin for EGEN skole (Kjartans beslutning 28. aug:
// rapporten er for rektor/skoleadmin — HTLA ser den ikke, og lenken vises ikke for
// HTLA). RLS i basen håndhever dette (rapport-RPC-ene kaster «Ingen tilgang» for
// alle andre, HTLA inkludert); frontend speiler den, svekker den ikke.
// WCAG: oransje TEKST = text-orange-ink; statuser som tekst; iframe har tittel.
// ============================================================================

export default function SkoleTuRapport() {
  const { rundeId } = useParams()
  const { t, i18n } = useTranslation()
  const { bruker } = useAuth()
  const loggBrukslogg = useBrukslogg()

  const [tilstand, setTilstand] = useState('laster') // laster | klar | ingenTilgang | feil | ikkeLukket
  const [skoleNavn, setSkoleNavn] = useState('')
  const [data, setData] = useState(null)
  const [popupBlokkert, setPopupBlokkert] = useState(false)
  const loggetRef = useRef(false)

  const sprak = i18n.language && i18n.language.startsWith('sv') ? 'sv' : 'no'

  useEffect(() => {
    let avbrutt = false
    async function last() {
      try {
        const kontekst = await hentTuKontekst(bruker)
        if (!kontekst.tilgang) { if (!avbrutt) setTilstand('ingenTilgang'); return }
        setSkoleNavn(kontekst.skoleNavn || '')

        // Finn runden i skolens egne runder (RLS gir kun egen skole).
        const runder = await hentTuRunder(kontekst.skoleId)
        const runde = runder.find((r) => r.id === rundeId)
        if (!runde) { if (!avbrutt) setTilstand('ingenTilgang'); return }
        // Rapport gir bare mening for en lukket runde (tallene er arkivert/frosset).
        if (runde.status !== 'lukket') { if (!avbrutt) setTilstand('ikkeLukket'); return }

        const rundeMeta = {
          id: runde.id, skole_id: kontekst.skoleId, trinn: runde.trinn,
          gruppe_navn: runde.gruppe_navn, skoleaar: runde.skoleaar,
          semester: runde.semester, startdato: runde.startdato, frist: runde.frist,
        }
        const rapport = await hentRapportData(rundeMeta, runde.land || 'NO', runde.sporsmalversjon || 1)
        if (avbrutt) return
        setData(rapport)
        setTilstand('klar')

        // §7 Hendelseslogg: rapport generert (best-effort, blokkerer aldri).
        if (!loggetRef.current) {
          loggetRef.current = true
          loggBrukslogg('tu_rapport_generert', { ressursId: rundeId })
        }
      } catch (e) {
        if (avbrutt) return
        // RPC-ene kaster «Ingen tilgang» via RLS → vis vennlig avvisning.
        if (/ingen tilgang/i.test(e?.message || '')) setTilstand('ingenTilgang')
        else setTilstand('feil')
      }
    }
    last()
    return () => { avbrutt = true }
  }, [rundeId, bruker, loggBrukslogg])

  function skrivUt() {
    if (!data) return
    const ok = skrivUtRapport(data, { skoleNavn, oversett: t, sprak })
    setPopupBlokkert(!ok)
  }

  const forhaandsvisning = data
    ? byggRapportHtml(data, { skoleNavn, oversett: t, sprak, print: false })
    : ''

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link to="/min-side/trivselsundersokelsen"
          className="text-sm font-semibold text-orange-ink hover:text-orange-ink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 rounded">
          ← {t('tu.rapport.tilbake')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{t('tu.rapport.sidetittel')}</h1>
      <p className="text-gray-600 mt-1">{t('tu.rapport.sideintro')}</p>

      {tilstand === 'laster' && (
        <p className="mt-6 text-gray-500">{t('tu.rapport.laster')}</p>
      )}

      {tilstand === 'ingenTilgang' && (
        <p className="mt-6 text-gray-700">{t('tu.rapport.ingenTilgang')}</p>
      )}

      {tilstand === 'ikkeLukket' && (
        <p className="mt-6 text-gray-700">{t('tu.rapport.ikkeLukket')}</p>
      )}

      {tilstand === 'feil' && (
        <p className="mt-6 text-tlred" role="alert">{t('tu.rapport.feil')}</p>
      )}

      {tilstand === 'klar' && (
        <>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <button type="button" onClick={skrivUt}
              className="rounded-full bg-orange text-gray-900 font-semibold px-5 py-2.5 hover:bg-[#e8641c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange/30 transition-colors">
              🖨 {t('tu.rapport.skrivUt')}
            </button>
            <span className="text-sm text-gray-500">{t('tu.rapport.skrivUtHint')}</span>
          </div>
          {popupBlokkert && (
            <p className="mt-2 text-sm font-semibold text-tlred" role="alert">
              {t('tu.rapport.popupBlokkert')}
            </p>
          )}
          <div className="mt-5 border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <iframe
              title={t('tu.rapport.forhaandsvisningTittel')}
              srcDoc={forhaandsvisning}
              className="w-full"
              style={{ height: '80vh', border: '0' }}
            />
          </div>
        </>
      )}
    </div>
  )
}
