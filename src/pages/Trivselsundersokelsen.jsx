import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// ============================================================================
// Trivselsundersøkelsen — ELEVFLATEN (kap. 21, steg 3)
//
// Egen, minimal rute. Ingen nettstedsmeny/footer (styres i App.jsx via
// utenChrome). Skal fungere på skolens eldste nettbrett på dårlig nett.
//
// Flyt (delplan 21.2 + bakgrunnsvariabler 18. aug):
//   1) intro  → kort, vennlig, «frivillig / kan hoppe over / ingen ser hva DU svarer»
//   2) kode   → eleven taster koden. POST til /api/tu/hent-runde (koden i body,
//               ALDRI i URL). Serveren svarer med spørsmålssettet.
//   3) trinn  → OBLIGATORISK avkryssing (5.–10.). Kan ikke gå videre uten valg.
//   4) kjønn  → OBLIGATORISK avkryssing (jente/gutt/annet). Kan ikke gå videre uten valg.
//   5) spm    → ett spørsmål per skjerm, store trykkflater, tekst + symbol,
//               fremdriftsindikator, «hopp over» er lov.
//   6) send   → oppsummering + «Send inn». POST til /api/tu/lever-svar.
//   7) ferdig → vennlig takke-side. Koden er brukt opp.
//
// Bakgrunnsvariabler (trinn + kjønn): sendes med som EGNE felter, ikke inne i
// svar-objektet, og lagres som bakgrunnsvariabler på svaret (migr 046) — aldri
// koblet til kode/HMAC. Kjønn = jente/gutt/annet (som Elevundersøkelsen).
//
// WCAG 2.1 AA innebygd fra første komponent:
//   - Fullt tastaturnavigerbart (radiogroup med piltaster + Enter/mellomrom).
//   - Synlig fokusmarkering (focus-visible ring) overalt.
//   - Skjermleser: aria-live melder skjermbytte og feil; radiogroup har
//     aria-labelledby; hvert alternativ er en ekte radio.
//   - Kontrast: oransje TEKST bruker --color-orange-ink (4,9:1), aldri #FF7B31
//     som tekst på lyst (kjent regel i index.css).
//   - Ingen tidsfrist, ingen tvang på spørsmålene (men trinn+kjønn er obligatoriske).
//   - i18n fra første streng (ingen hardkodet tekst).
//
// Personvern: ingen kode/IP/tidsstempel lagres hos oss. All tekst via i18n.
// ============================================================================

const STEG = {
  INTRO: 'intro', KODE: 'kode', TRINN: 'trinn', KJONN: 'kjonn',
  SPM: 'spm', SEND: 'send', FERDIG: 'ferdig',
}

// --- QR-lenke (steg 4.3): koden kan komme via URL-FRAGMENTET (#kode=...) ---
// Fragmentet sendes aldri til serveren (ingen infrastruktur-logger). Leses ÉN
// gang ved oppstart; adresselinja renses i en effekt rett etterpå. Koden lever
// videre kun i minnet og sendes som POST — samme fasit som en tastet kode.
function lesKodeFraFragment() {
  const m = /[#&]kode=([^&]+)/.exec(window.location.hash || '')
  if (!m) return ''
  try { return decodeURIComponent(m[1]) } catch { return m[1] }
}

const TRINN_VALG = [5, 6, 7, 8, 9, 10]          // 5.–10., som Elevundersøkelsen
const KJONN_VALG = ['jente', 'gutt', 'annet']   // samme kategorier som Elevundersøkelsen

// Symboler til svarskalaen. Rent dekorative (aria-hidden) — teksten bærer
// betydningen for skjermleser. Vi bruker en nøytral prikk-skala som fungerer for
// alle 3–6-punkts skalaer, i stedet for smilefjes som ville tolket svaret for
// eleven (et «hvor mange dager leker du»-svar er ikke glad/trist).
function skalaSymbol(index, antall) {
  // Fyllte vs. tomme ringer gir en visuell «posisjon på skalaen» uten å farge
  // svaret følelsesmessig. Første alternativ = full, siste = tom.
  const andel = antall > 1 ? 1 - index / (antall - 1) : 1
  if (andel >= 0.8) return '●'
  if (andel >= 0.55) return '◕'
  if (andel >= 0.3) return '◑'
  if (andel > 0) return '◔'
  return '○'
}

export default function Trivselsundersokelsen() {
  const { t } = useTranslation()

  const [steg, setSteg] = useState(STEG.INTRO)
  const [kodeFraLenke] = useState(lesKodeFraFragment)   // '' når eleven kom uten QR
  const [kode, setKode] = useState(kodeFraLenke)
  const [sporsmal, setSporsmal] = useState([])   // [{nummer, kategori, antallAlternativer}]
  const [svar, setSvar] = useState({})           // { [nummer]: valgtIndex }
  const [trinn, setTrinn] = useState(null)       // bakgrunnsvariabel (obligatorisk)
  const [kjonn, setKjonn] = useState(null)       // bakgrunnsvariabel (obligatorisk)
  const [naa, setNaa] = useState(0)              // indeks i sporsmal
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')           // i18n-nøkkel eller ''
  const [tekniskRef, setTekniskRef] = useState('') // TU-<status>-<feilkode> ved teknisk feil; '' ellers

  // Fokusmål ved skjermbytte (skjermleser + tastatur skal lande riktig sted).
  const tittelRef = useRef(null)
  const kodeFeltRef = useRef(null)

  // Rens adresselinja for kode-fragmentet UMIDDELBART (replaceState — koden
  // havner dermed heller ikke i nettleserhistorikken). Ekstern system-
  // oppdatering, derfor i en effekt; selve koden ble lest i useState over.
  useEffect(() => {
    if (!kodeFraLenke) return
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [kodeFraLenke])

  // Flytt fokus til skjermtittelen når vi bytter steg/spørsmål.
  useEffect(() => {
    if (tittelRef.current) tittelRef.current.focus()
  }, [steg, naa])

  const total = sporsmal.length
  const gjeldende = sporsmal[naa] || null
  const antallSvart = Object.keys(svar).length

  // --- Steg 2: hent runde via kode -----------------------------------------
  // Felles kjerne for tastet kode OG kode fra QR-lenken. Returnerer true ved
  // suksess (kalleren fra intro-skjermen trenger å vite om den skal falle
  // tilbake til kode-skjermen med feilmelding).
  const hentRundeMedKode = useCallback(async (ren) => {
    setFeil('')
    setTekniskRef('')
    if (!ren) { setFeil('tu.kode.feilTom'); if (kodeFeltRef.current) kodeFeltRef.current.focus(); return false }
    setLaster(true)
    try {
      const res = await fetch('/api/tu/hent-runde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode: ren }),
      })
      if (!res.ok) {
        // Skill ELEVFEIL fra TEKNISK FEIL. Serveren sender en semantisk feilkode
        // i body ({ feil: '...' }); vi leser den for å avgjøre hvilken melding
        // eleven skal se — rå server-/Postgres-tekst når ALDRI hit (server
        // masker alt bak faste koder). Ekte elevfeil: TOM_KODE (400) og
        // UGYLDIG_KODE (404) → «sjekk koden». Alt annet (500 SERVERFEIL, samt
        // INGEN_SPORSMAL som er 404 men egentlig en konfigfeil, og uventede
        // statuser) er teknisk → eleven kan ikke rette det selv.
        let feilkode = ''
        try { feilkode = (await res.json())?.feil || '' } catch { feilkode = '' }
        const elevfeil = feilkode === 'UGYLDIG_KODE' || feilkode === 'TOM_KODE'
        if (elevfeil) {
          setTekniskRef('')
          setFeil('tu.kode.feilUgyldig')
        } else {
          // Teknisk feil: annen, vennlig melding som IKKE ber eleven sjekke koden,
          // + en diskret referanse (TU-<status>-<feilkode>) læreren/vi kan bruke.
          // Konsoll-loggen er skjult for eleven og speiler serverens eget mønster.
          const ref = 'TU-' + res.status + (feilkode ? '-' + feilkode : '')
          console.error('TU hent-runde teknisk feil:', res.status, feilkode || '(ukjent)')
          setTekniskRef(ref)
          setFeil('tu.kode.feilTeknisk')
        }
        if (kodeFeltRef.current) kodeFeltRef.current.focus()
        return false
      }
      setTekniskRef('')
      const data = await res.json()
      setSporsmal(Array.isArray(data.sporsmal) ? data.sporsmal : [])
      setSvar({})
      setTrinn(null)
      setKjonn(null)
      setNaa(0)
      setSteg(STEG.TRINN)          // bakgrunnsvariabler FØR spørsmålene
      return true
    } catch {
      setTekniskRef('')
      setFeil('tu.kode.feilNett')
      return false
    } finally {
      setLaster(false)
    }
  }, [])

  const hentRunde = useCallback(async (e) => {
    if (e) e.preventDefault()
    await hentRundeMedKode(kode.trim())
  }, [kode, hentRundeMedKode])

  // Fra intro-skjermen: med kode fra QR-lenken «veksler vi til POST» direkte
  // (byggeplan 4.3) — eleven slipper å taste. Feiler koden, lander eleven på
  // kode-skjermen med koden utfylt og en vanlig feilmelding.
  const startFraIntro = useCallback(async () => {
    if (kodeFraLenke && kode.trim()) {
      const ok = await hentRundeMedKode(kode.trim())
      if (!ok) setSteg(STEG.KODE)
      return
    }
    setSteg(STEG.KODE)
  }, [kodeFraLenke, kode, hentRundeMedKode])

  // --- Steg 3: velg svar ----------------------------------------------------
  function velg(nummer, index) {
    setSvar((s) => ({ ...s, [nummer]: index }))
  }
  function hoppOver(nummer) {
    setSvar((s) => { const n = { ...s }; delete n[nummer]; return n })
    gaaVidere()
  }
  function gaaVidere() {
    if (naa + 1 < total) setNaa(naa + 1)
    else setSteg(STEG.SEND)
  }
  function gaaTilbake() {
    if (naa > 0) setNaa(naa - 1)
    else setSteg(STEG.KJONN)       // tilbake til kjønn-skjermen
  }

  // Piltast-navigasjon i spørsmålenes radiogruppe.
  function radioTaster(e, nummer, antall) {
    const valgt = svar[nummer]
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const neste = valgt === undefined ? 0 : Math.min(valgt + 1, antall - 1)
      velg(nummer, neste)
    } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault()
      const forrige = valgt === undefined ? 0 : Math.max(valgt - 1, 0)
      velg(nummer, forrige)
    }
  }

  // --- Steg 6: send inn -----------------------------------------------------
  const sendInn = useCallback(async () => {
    setFeil('')
    // Trygghetssjekk: obligatoriske bakgrunnsvariabler må være satt.
    if (trinn === null || kjonn === null) { setFeil('tu.send.feilBakgrunn'); return }
    setLaster(true)
    try {
      const res = await fetch('/api/tu/lever-svar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode: kode.trim(), svar, trinn, kjonn }),
      })
      if (res.status === 409) { setFeil('tu.send.feilBrukt'); return }
      if (!res.ok) { setFeil('tu.send.feil'); return }
      setSteg(STEG.FERDIG)
    } catch {
      setFeil('tu.send.feil')
    } finally {
      setLaster(false)
    }
  }, [kode, svar, trinn, kjonn])

  // ==========================================================================
  // Felles skall — sentrert, luftig, stor tekst.
  // ==========================================================================
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Skjermleser-region som melder feil uten å flytte fokus brått. */}
      <div className="sr-only" role="status" aria-live="assertive">
        {feil ? t(feil) : ''}
      </div>

      <main className="flex-grow w-full max-w-xl mx-auto px-4 py-8 sm:py-12">
        {steg === STEG.INTRO && (
          <section aria-labelledby="tu-tittel">
            <h1
              id="tu-tittel"
              ref={tittelRef}
              tabIndex={-1}
              className="text-3xl sm:text-4xl font-bold outline-none"
            >
              {t('tu.intro.tittel')}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-700">{t('tu.intro.tekst')}</p>
            <button
              type="button"
              onClick={startFraIntro}
              disabled={laster}
              className="mt-8 w-full sm:w-auto min-h-[56px] px-8 py-4 rounded-2xl bg-petrol text-white text-lg font-bold hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 disabled:opacity-60 transition-colors"
            >
              {laster ? t('tu.kode.henter') : t('tu.intro.start')}
            </button>
          </section>
        )}

        {steg === STEG.KODE && (
          <section aria-labelledby="tu-tittel">
            <h1
              id="tu-tittel"
              ref={tittelRef}
              tabIndex={-1}
              className="text-2xl sm:text-3xl font-bold outline-none"
            >
              {t('tu.kode.tittel')}
            </h1>
            <p className="mt-3 text-lg text-gray-700">{t('tu.kode.hjelp')}</p>
            <form onSubmit={hentRunde} className="mt-6" noValidate>
              <label htmlFor="tu-kode" className="block text-base font-semibold mb-2">
                {t('tu.kode.felt')}
              </label>
              <input
                id="tu-kode"
                ref={kodeFeltRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder={t('tu.kode.plassholder')}
                aria-describedby={[feil && 'tu-kode-feil', tekniskRef && 'tu-kode-ref'].filter(Boolean).join(' ') || undefined}
                aria-invalid={feil ? 'true' : undefined}
                className="w-full min-h-[56px] px-4 py-3 text-2xl tracking-widest uppercase text-center rounded-2xl border-2 border-gray-300 focus-visible:outline-none focus-visible:border-petrol focus-visible:ring-4 focus-visible:ring-petrol/30"
              />
              {feil && (
                <p id="tu-kode-feil" className="mt-3 text-base font-semibold text-tlred">
                  {t(feil)}
                </p>
              )}
              {/* Diskret teknisk referanse — vises kun ved teknisk feil. Kort og
                  ufarlig for eleven; læreren/vi kan lese den opp ved feilsøking.
                  Aldri rå server-/Postgres-tekst — kun TU-<status>-<feilkode>. */}
              {tekniskRef && (
                <p id="tu-kode-ref" className="mt-1 text-sm text-gray-500">
                  {t('tu.kode.feilTekniskRef', { ref: tekniskRef })}
                </p>
              )}
              <button
                type="submit"
                disabled={laster}
                className="mt-6 w-full min-h-[56px] px-8 py-4 rounded-2xl bg-petrol text-white text-lg font-bold hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 disabled:opacity-60 transition-colors"
              >
                {laster ? t('tu.kode.henter') : t('tu.kode.knapp')}
              </button>
            </form>
          </section>
        )}

        {steg === STEG.TRINN && (
          <BakgrunnSkjerm
            t={t}
            tittelRef={tittelRef}
            tittelNokkel="tu.trinn.tittel"
            hjelpNokkel="tu.trinn.hjelp"
            valg={TRINN_VALG}
            etikett={(v) => t('tu.trinn.valg', { n: v })}
            valgt={trinn}
            onVelg={setTrinn}
            onNeste={() => setSteg(STEG.KJONN)}
            onTilbake={() => setSteg(STEG.KODE)}
            feil={feil === 'tu.trinn.feilMangler' ? t(feil) : ''}
            settFeil={setFeil}
            manglerFeilNokkel="tu.trinn.feilMangler"
          />
        )}

        {steg === STEG.KJONN && (
          <BakgrunnSkjerm
            t={t}
            tittelRef={tittelRef}
            tittelNokkel="tu.kjonn.tittel"
            hjelpNokkel="tu.kjonn.hjelp"
            valg={KJONN_VALG}
            etikett={(v) => t(`tu.kjonn.valg.${v}`)}
            valgt={kjonn}
            onVelg={setKjonn}
            onNeste={() => setSteg(STEG.SPM)}
            onTilbake={() => setSteg(STEG.TRINN)}
            feil={feil === 'tu.kjonn.feilMangler' ? t(feil) : ''}
            settFeil={setFeil}
            manglerFeilNokkel="tu.kjonn.feilMangler"
          />
        )}

        {steg === STEG.SPM && gjeldende && (
          <SporsmalSkjerm
            key={gjeldende.nummer}
            t={t}
            tittelRef={tittelRef}
            sporsmal={gjeldende}
            indeks={naa}
            total={total}
            valgt={svar[gjeldende.nummer]}
            onVelg={(i) => velg(gjeldende.nummer, i)}
            onTaster={(e) => radioTaster(e, gjeldende.nummer, gjeldende.antallAlternativer)}
            onNeste={gaaVidere}
            onTilbake={gaaTilbake}
            onHopp={() => hoppOver(gjeldende.nummer)}
            skalaSymbol={skalaSymbol}
          />
        )}

        {steg === STEG.SEND && (
          <section aria-labelledby="tu-tittel">
            <h1
              id="tu-tittel"
              ref={tittelRef}
              tabIndex={-1}
              className="text-2xl sm:text-3xl font-bold outline-none"
            >
              {t('tu.send.tittel')}
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              {t('tu.send.oppsummering', { svart: antallSvart, total })}
            </p>
            {antallSvart < total && (
              <p className="mt-1 text-base text-gray-500">{t('tu.send.hoppetInfo')}</p>
            )}
            {feil && (
              <p className="mt-4 text-base font-semibold text-tlred" role="alert">
                {t(feil)}
              </p>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={sendInn}
                disabled={laster}
                className="w-full min-h-[56px] px-8 py-4 rounded-2xl bg-petrol text-white text-lg font-bold hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 disabled:opacity-60 transition-colors"
              >
                {laster ? t('tu.send.sender') : t('tu.send.knapp')}
              </button>
              <button
                type="button"
                onClick={() => { setFeil(''); setNaa(total - 1); setSteg(STEG.SPM) }}
                className="w-full min-h-[48px] px-6 py-3 rounded-2xl border-2 border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-colors"
              >
                {t('tu.send.tilbake')}
              </button>
            </div>
          </section>
        )}

        {steg === STEG.FERDIG && (
          <section aria-labelledby="tu-tittel" className="text-center">
            <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
            <h1
              id="tu-tittel"
              ref={tittelRef}
              tabIndex={-1}
              className="text-3xl sm:text-4xl font-bold outline-none"
            >
              {t('tu.ferdig.tittel')}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-700">{t('tu.ferdig.tekst')}</p>
            <p className="mt-2 text-base text-gray-500">{t('tu.ferdig.ingenAdresse')}</p>
          </section>
        )}
      </main>
    </div>
  )
}

// ============================================================================
// OBLIGATORISK bakgrunns-skjerm (trinn / kjønn). Egen komponent — samme
// radiogroup-/tastatur-/fokusmønster som spørsmålene. Kan ikke gå videre uten valg.
// ============================================================================
function BakgrunnSkjerm({
  t, tittelRef, tittelNokkel, hjelpNokkel, valg, etikett, valgt,
  onVelg, onNeste, onTilbake, feil, settFeil, manglerFeilNokkel,
}) {
  function taster(e) {
    const idx = valg.indexOf(valgt)
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const neste = idx < 0 ? 0 : Math.min(idx + 1, valg.length - 1)
      onVelg(valg[neste]); settFeil('')
    } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault()
      const forrige = idx < 0 ? 0 : Math.max(idx - 1, 0)
      onVelg(valg[forrige]); settFeil('')
    }
  }
  function neste() {
    if (valgt === null || valgt === undefined) { settFeil(manglerFeilNokkel); return }
    settFeil(''); onNeste()
  }

  return (
    <section aria-labelledby="tu-tittel">
      <h1
        id="tu-tittel"
        ref={tittelRef}
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-bold leading-snug outline-none"
      >
        {t(tittelNokkel)}
      </h1>
      <p className="mt-3 text-lg text-gray-700">{t(hjelpNokkel)}</p>

      <div
        role="radiogroup"
        aria-labelledby="tu-tittel"
        aria-required="true"
        className="mt-6 flex flex-col gap-3"
        onKeyDown={taster}
      >
        {valg.map((v, i) => {
          const erValgt = valgt === v
          return (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={erValgt}
              tabIndex={erValgt || ((valgt === null || valgt === undefined) && i === 0) ? 0 : -1}
              onClick={() => { onVelg(v); settFeil('') }}
              className={[
                'w-full min-h-[56px] px-5 py-4 rounded-2xl border-2 text-left text-lg flex items-center gap-4',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors',
                erValgt
                  ? 'border-petrol bg-petrol/10 font-bold text-gray-900'
                  : 'border-gray-300 bg-white hover:border-petrol/60 hover:bg-gray-50 text-gray-800',
              ].join(' ')}
            >
              <span className="flex-grow">{etikett(v)}</span>
              {erValgt && (
                <span aria-hidden="true" className="text-petrol text-xl font-bold">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {feil && (
        <p className="mt-4 text-base font-semibold text-tlred" role="alert">{feil}</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={neste}
          className="w-full min-h-[56px] px-8 py-4 rounded-2xl bg-petrol text-white text-lg font-bold hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors"
        >
          {t('tu.spm.neste')}
        </button>
        <button
          type="button"
          onClick={onTilbake}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl border-2 border-gray-300 text-base font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-colors"
        >
          {t('tu.spm.tilbake')}
        </button>
      </div>
    </section>
  )
}

// ============================================================================
// Ett spørsmål per skjerm. Egen komponent så fokus/tastatur er innkapslet.
// ============================================================================
function SporsmalSkjerm({
  t, tittelRef, sporsmal, indeks, total, valgt,
  onVelg, onTaster, onNeste, onTilbake, onHopp, skalaSymbol,
}) {
  const nr = sporsmal.nummer
  const antall = sporsmal.antallAlternativer
  const progresjon = total > 0 ? Math.round(((indeks + 1) / total) * 100) : 0
  // Mobbedefinisjonen vises rett før spørsmål 11 (ordrett krav, delplan 21).
  const visMobbedef = nr === 11

  return (
    <section aria-labelledby="tu-tittel">
      {/* Fremdriftsindikator — både visuelt og for skjermleser. */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-500 mb-2">
          {t('tu.spm.avFremdrift', { n: indeks + 1, total })}
        </p>
        <div
          className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={indeks + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={t('tu.spm.avFremdrift', { n: indeks + 1, total })}
        >
          <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progresjon}%` }} />
        </div>
      </div>

      {visMobbedef && (
        <div className="mb-6 rounded-2xl border-l-4 border-petrol bg-petrol/5 px-4 py-4">
          <h2 className="text-base font-bold text-gray-900">{t('tu.mobbedef.tittel')}</h2>
          <p className="mt-1 text-base text-gray-700 leading-relaxed">{t('tu.mobbedef.tekst')}</p>
        </div>
      )}

      <h1
        id="tu-tittel"
        ref={tittelRef}
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-bold leading-snug outline-none"
      >
        {t(`tu.sp.${nr}.tekst`)}
      </h1>

      {/* Svaralternativer som en ekte radiogruppe. */}
      <div
        role="radiogroup"
        aria-labelledby="tu-tittel"
        className="mt-6 flex flex-col gap-3"
        onKeyDown={onTaster}
      >
        {Array.from({ length: antall }).map((_, i) => {
          const erValgt = valgt === i
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={erValgt}
              tabIndex={erValgt || (valgt === undefined && i === 0) ? 0 : -1}
              onClick={() => onVelg(i)}
              className={[
                'w-full min-h-[56px] px-5 py-4 rounded-2xl border-2 text-left text-lg flex items-center gap-4',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors',
                erValgt
                  ? 'border-petrol bg-petrol/10 font-bold text-gray-900'
                  : 'border-gray-300 bg-white hover:border-petrol/60 hover:bg-gray-50 text-gray-800',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={erValgt ? 'text-2xl text-petrol' : 'text-2xl text-gray-400'}
              >
                {skalaSymbol(i, antall)}
              </span>
              <span className="flex-grow">{t(`tu.sp.${nr}.svar.${i}`)}</span>
              {erValgt && (
                <span aria-hidden="true" className="text-petrol text-xl font-bold">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Navigasjon: tilbake / hopp over / neste. Hopp over er alltid lov. */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={onNeste}
          className="w-full min-h-[56px] px-8 py-4 rounded-2xl bg-petrol text-white text-lg font-bold hover:bg-[#0b4d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-petrol/40 transition-colors"
        >
          {indeks + 1 < total ? t('tu.spm.neste') : t('tu.spm.tilInnsending')}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onTilbake}
            className="flex-1 min-h-[48px] px-4 py-3 rounded-2xl border-2 border-gray-300 text-base font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-colors"
          >
            {t('tu.spm.tilbake')}
          </button>
          <button
            type="button"
            onClick={onHopp}
            className="flex-1 min-h-[48px] px-4 py-3 rounded-2xl text-base font-semibold text-orange-ink hover:bg-orange/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange/40 transition-colors"
          >
            {t('tu.spm.hopp')}
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center">{t('tu.spm.hoppInfo')}</p>
      </div>
    </section>
  )
}
