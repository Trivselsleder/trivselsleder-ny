import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lagreRessurs } from '../lib/leker'
import { opprettOpplasting, slettVideo, videoStatus } from '../lib/bunny'

// Videoseksjon i lekredigeringen. Én video per lek (målt 1:1): «Legg til video» når det
// ikke finnes én, ellers «Bytt video» + «Fjern video».
//
// Opplasting går DIREKTE fra nettleseren til Bunny med tus-js-client (gjenopptakbar ved
// brudd). tus-js-client lastes lazy (dynamic import) KUN når en fil velges — den skal
// aldri havne i hovedbunten. API-nøkkelen forlater aldri serveren (se api/bunny/_bunny.js).
//
// Etter vellykket opplasting lagres en medier-rad (type video) via samme RPC som resten av
// redigeringen (lagre_ressurs). Ved «Bytt» fjernes den gamle raden i samme lagring, og den
// gamle Bunny-videoen slettes etterpå (da er guid-en ute av bruk → slett-video slipper den).

const TILLATTE_MIME = ['video/mp4', 'video/quicktime', 'video/webm']
const TILLATTE_ENDELSER = ['.mp4', '.mov', '.webm']
const MAKS_VIDEO = 2 * 1024 * 1024 * 1024   // 2 GB
const TUS_ENDEPUNKT = 'https://video.bunnycdn.com/tusupload'
const POLL_MS = 15000
const MAKS_POLL = 40                         // 40 × 15 s = 10 minutter

function gyldigVideofil(fil) {
  if (TILLATTE_MIME.includes(fil.type)) return true
  const navn = (fil.name || '').toLowerCase()
  return TILLATTE_ENDELSER.some((e) => navn.endsWith(e))
}

export default function LekVideoRedigering({ ressursId, token, video, tittel, etterEndring }) {
  const { t } = useTranslation()
  const [feil, setFeil] = useState(null)
  const [lasterOpp, setLasterOpp] = useState(false)
  const [prosent, setProsent] = useState(0)
  const [jobber, setJobber] = useState(false)         // fjern/lagre pågår
  const [bekreftFjern, setBekreftFjern] = useState(false)
  const [status, setStatus] = useState(null)          // Bunny-status for gjeldende video (tall) eller null
  const [melding, setMelding] = useState('')          // alt som skal leses av skjermleser (live-regionen under)
  const oppRef = useRef(null)                          // aktiv tus.Upload (for Avbryt)
  const ventendeGuidRef = useRef(null)                 // guid opprettet hos Bunny, ennå ikke lagret (for rydding)
  const overskriftRef = useRef(null)                   // stabilt fokusmål etter avbryt/fjern/ferdig
  const avbrytRef = useRef(null)                       // fokusmål når filvelgeren byttes ut med fremdrift
  const sisteBucketRef = useRef(-1)                    // siste annonserte fremdriftstrinn (grovt, hvert 20 %)

  // Flytt fokus etter at DOM-en er oppdatert (WCAG 2.4.3) — elementet finnes først etter render.
  function flyttFokus(ref) {
    requestAnimationFrame(() => { try { ref.current?.focus() } catch { /* elementet kan være borte */ } })
  }

  const guid = video?.bunny_video_id || null

  // Nullstill status når videoen (guid) endrer seg — Reacts anbefalte «juster state når en prop
  // endrer seg»-mønster, gjort UNDER render (ikke i en effekt), så vi unngår en ekstra render-runde.
  const [sisteGuid, setSisteGuid] = useState(guid)
  if (sisteGuid !== guid) {
    setSisteGuid(guid)
    setStatus(null)
  }

  // Status-polling: sjekk umiddelbart og deretter hvert 15. sekund i maks 10 min, til klar (status 4).
  useEffect(() => {
    if (!guid) return
    let stopp = false
    let forsok = 0
    let timer = null
    async function poll() {
      if (stopp) return
      try {
        const s = await videoStatus(guid)
        if (stopp) return
        setStatus(s.status)
        // Annonser reelle statusoverganger via live-regionen (behandles → klar).
        if (s.klar) setMelding(t('rediger.videoKlar'))
        else if (s.status !== null) setMelding(t('rediger.videoBehandles'))
        if (s.klar) return                     // ferdig — ikke poll mer
      } catch {
        /* forbigående — prøv igjen til vi når grensen */
      }
      forsok += 1
      if (forsok >= MAKS_POLL) return
      timer = setTimeout(poll, POLL_MS)
    }
    timer = setTimeout(poll, 0)
    return () => { stopp = true; if (timer) clearTimeout(timer) }
  }, [guid])

  const klar = status === 4
  const behandles = guid && status !== null && status !== 4

  // Lagre medier-rad etter fullført opplasting (evt. bytt ut den gamle i samme kall).
  async function lagreEtterOpplasting(nyGuid) {
    const payload = {
      id: ressursId,
      endret_at: token,
      medier: [{ type: 'video', bunny_video_id: nyGuid }],
    }
    if (video?.id) payload.medier_fjern = [video.id]
    await lagreRessurs(payload)
    ventendeGuidRef.current = null            // nå lagret → ikke lenger foreldreløs
    const gammelGuid = video?.bunny_video_id
    await etterEndring()                      // henter på nytt → ny token + ny video-rad (starter ny polling)
    setMelding(t('rediger.videoLagtTil'))     // bekreft for skjermleser
    flyttFokus(overskriftRef)                 // filvelgeren er borte etter render → flytt fokus til et stabilt element
    // Slett den gamle videoen hos Bunny FØRST etter at raden er borte fra basen (ellers nekter serveren).
    if (gammelGuid && gammelGuid !== nyGuid) {
      try { await slettVideo(gammelGuid) } catch { /* rydding, ikke kritisk */ }
    }
  }

  async function velgFil(e) {
    const fil = e.target.files?.[0]
    e.target.value = ''                       // tillat samme fil på nytt senere
    if (!fil) return
    setFeil(null); setBekreftFjern(false)
    if (!gyldigVideofil(fil)) { setFeil(t('rediger.videoFeilType')); return }
    if (fil.size > MAKS_VIDEO) { setFeil(t('rediger.videoFeilStor')); return }

    setLasterOpp(true); setProsent(0)
    sisteBucketRef.current = -1               // nullstill fremdriftsannonsering for ny opplasting
    setMelding(t('rediger.videoLasterOpp'))
    flyttFokus(avbrytRef)                     // filvelgeren erstattes av fremdrift → flytt fokus til Avbryt

    let params
    try {
      params = await opprettOpplasting(ressursId, tittel)
    } catch (err) {
      setFeil(t('rediger.videoOpplastFeil', { feil: err.message }))
      setLasterOpp(false)
      flyttFokus(overskriftRef)              // fremdrift borte → ikke mist fokus
      return
    }
    ventendeGuidRef.current = params.videoId

    let tus
    try {
      tus = await import('tus-js-client')       // lazy: holder biblioteket ute av hovedbunten
    } catch (err) {
      setFeil(t('rediger.videoOpplastFeil', { feil: err.message }))
      setLasterOpp(false)
      // Rydd opp det tomme Bunny-objektet vi nettopp opprettet.
      try { await slettVideo(params.videoId) } catch { /* best effort */ }
      ventendeGuidRef.current = null
      return
    }

    const opp = new tus.Upload(fil, {
      endpoint: TUS_ENDEPUNKT,
      retryDelays: [0, 3000, 5000, 10000, 20000],   // gjenopptakbar ved brudd
      headers: {
        AuthorizationSignature: params.signature,
        AuthorizationExpire: String(params.expire),
        VideoId: params.videoId,
        LibraryId: String(params.libraryId),
      },
      metadata: { filetype: fil.type, title: tittel || 'Uten tittel' },
      onError: (error) => {
        oppRef.current = null
        setFeil(t('rediger.videoOpplastFeil', { feil: error?.message || String(error) }))
        setLasterOpp(false)
        setProsent(0)
      },
      onProgress: (sendt, total) => {
        const p = total ? Math.round((sendt / total) * 100) : 0
        setProsent(p)
        // Annonser i grove trinn (hvert 20 %) — ikke hver prosent, ellers spammes skjermleseren.
        const bucket = Math.floor(p / 20) * 20
        if (p < 100 && bucket !== sisteBucketRef.current) {
          sisteBucketRef.current = bucket
          setMelding(t('rediger.videoLasterProsent', { prosent: bucket }))
        }
      },
      onSuccess: async () => {
        oppRef.current = null
        try {
          await lagreEtterOpplasting(params.videoId)
        } catch (err) {
          // Lagring feilet ETTER opplasting → ingen foreldreløs video: slett den vi lastet opp.
          try { await slettVideo(params.videoId) } catch { /* best effort */ }
          ventendeGuidRef.current = null
          setFeil(t('rediger.videoLagreFeil', { feil: err.message }))
        } finally {
          setLasterOpp(false)
          setProsent(0)
        }
      },
    })
    oppRef.current = opp
    opp.start()
  }

  async function avbryt() {
    const opp = oppRef.current
    if (opp) { try { opp.abort(true) } catch { /* ignorer */ } }
    oppRef.current = null
    setLasterOpp(false)
    setProsent(0)
    setMelding(t('rediger.videoAvbrutt'))     // annonser avbrudd
    flyttFokus(overskriftRef)                 // Avbryt-knappen forsvinner → flytt fokus til et stabilt element
    // Fjern det tomme/halve Bunny-objektet slik at ingen foreldreløs video blir liggende.
    const guidRydd = ventendeGuidRef.current
    ventendeGuidRef.current = null
    if (guidRydd) { try { await slettVideo(guidRydd) } catch { /* best effort */ } }
  }

  async function fjernVideo() {
    if (!video?.id || jobber) return
    setJobber(true); setFeil(null)
    try {
      const gammelGuid = video.bunny_video_id
      await lagreRessurs({ id: ressursId, endret_at: token, medier_fjern: [video.id] })
      await etterEndring()
      setMelding(t('rediger.videoFjernet'))   // annonser fjerning
      setStatus(null)
      flyttFokus(overskriftRef)               // «Ja, fjern» forsvinner → flytt fokus til et stabilt element
      if (gammelGuid) { try { await slettVideo(gammelGuid) } catch { /* best effort */ } }
    } catch (err) {
      setFeil(err.message)
    } finally {
      setJobber(false)
      setBekreftFjern(false)
    }
  }

  const knapp = 'text-sm border rounded-full px-4 py-2 transition disabled:opacity-50'
  const feilId = 'video-feil'

  return (
    <div className="mt-5 border-t border-gray-200 pt-4">
      <h3 ref={overskriftRef} tabIndex={-1} className="text-sm font-semibold text-gray-800 outline-none">{t('rediger.video')}</h3>

      {/* ÉN alltid-montert live-region for skjermleser: får all status (laster opp / X % / lagt til /
          behandles / klar / fjernet / avbrutt). Alltid montert, ellers leses ikke oppdateringene. */}
      <p role="status" aria-live="polite" className="sr-only">{melding}</p>

      {/* Opplasting pågår: fremdrift + avbryt */}
      {lasterOpp ? (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"
              role="progressbar" aria-valuenow={prosent} aria-valuemin={0} aria-valuemax={100}
              aria-label={t('rediger.videoLasterOpp')}>
              <div className="h-full bg-petrol transition-all" style={{ width: `${prosent}%` }} />
            </div>
            <span className="text-sm text-gray-600 tabular-nums w-12 text-right">{prosent}%</span>
            <button type="button" onClick={avbryt} ref={avbrytRef}
              className={`${knapp} border-gray-300 text-gray-700 hover:bg-gray-100`}>
              {t('rediger.videoAvbryt')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('rediger.videoLasterOpp')}</p>
        </div>
      ) : (
        <>
          {/* Status på eksisterende video (visuelt; skjermleser får samme via live-regionen over) */}
          {guid && (
            <p className="text-sm mt-2">
              {behandles && <span className="text-gray-700">{t('rediger.videoBehandles')}</span>}
              {klar && <span className="text-petrol">{t('rediger.videoKlar')}</span>}
              {guid && status === null && <span className="text-gray-500">{t('rediger.videoLagtTil')}</span>}
            </p>
          )}

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {/* «Legg til video» / «Bytt video» — synlig label rundt en skjult, fokuserbar filvelger */}
            <label className="inline-flex items-center gap-2 text-sm text-petrol border border-petrol rounded-full px-4 py-2 cursor-pointer hover:bg-petrol hover:text-white transition focus-within:ring-2 focus-within:ring-petrol">
              <span aria-hidden="true">＋</span> {guid ? t('rediger.byttVideo') : t('rediger.leggTilVideo')}
              <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                onChange={velgFil} disabled={jobber} className="sr-only" />
            </label>

            {/* «Fjern video» med inline bekreftelse (sletting hos Bunny er ugjenkallelig) */}
            {guid && !bekreftFjern && (
              <button type="button" onClick={() => { setBekreftFjern(true); setFeil(null) }} disabled={jobber}
                className={`${knapp} border-gray-300 text-orange-ink hover:bg-orange/5`}>
                {t('rediger.fjernVideo')}
              </button>
            )}
            {guid && bekreftFjern && (
              <span className="inline-flex items-center gap-2">
                <span className="text-sm text-gray-700">{t('rediger.fjernVideoBekreftSporsmal')}</span>
                <button type="button" onClick={fjernVideo} disabled={jobber}
                  className={`${knapp} border-tlred text-tlred hover:bg-tlred hover:text-white`}>
                  {jobber ? t('rediger.videoFjerner') : t('rediger.fjernVideoBekreft')}
                </button>
                <button type="button" onClick={() => setBekreftFjern(false)} disabled={jobber}
                  className={`${knapp} border-gray-300 text-gray-600 hover:bg-gray-100`}>
                  {t('rediger.angreFjern')}
                </button>
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 mt-2">{t('rediger.videoHint')}</p>
        </>
      )}

      {feil && <p id={feilId} role="alert" className="text-sm text-tlred mt-2">{feil}</p>}
    </div>
  )
}
