import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentLek, hentDokumenter, loggBrukHendelse, settStatus } from '../../lib/leker'
import DokumentKort from '../../components/DokumentKort'
import { erFavoritt, settFavoritt } from '../../lib/favoritter'
import { hentPlaner, leggTilRad, opprettPlan } from '../../lib/periodeplan'
import { hentHjul, leggLekTilHjul, opprettHjul } from '../../lib/hjul'
import { skrivUtLek } from '../../lib/lekPdf'
import { useAuth } from '../../contexts/AuthContext'
import LekRedigering from '../../components/LekRedigering'
import LekVisning from '../../components/LekVisning'

export default function SkoleLek() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { bruker } = useAuth()
  const intern = ['superadmin', 'ansatt'].includes(bruker?.rolle)
  const [lek, setLek] = useState(null)
  const [dok, setDok] = useState([])
  const [feil, setFeil] = useState(null)
  const [rediger, setRediger] = useState(false)

  const [fav, setFav] = useState(false)
  const [planer, setPlaner] = useState([])
  const [hjul, setHjul] = useState([])
  const [aapen, setAapen] = useState(null) // 'plan' | 'hjul' | null
  const [melding, setMelding] = useState(null)
  const meldingTimer = useRef(null)

  // «Ny plan/hjul med denne leken» — hvert nedtrekk har tre modi: liste → skjema → resultat.
  const [planSkjema, setPlanSkjema] = useState(false)
  const [planNavn, setPlanNavn] = useState('')
  const [planResultat, setPlanResultat] = useState(null) // { url, feil } | null
  const [hjulSkjema, setHjulSkjema] = useState(false)
  const [hjulNavn, setHjulNavn] = useState('')
  const [hjulResultat, setHjulResultat] = useState(null) // { url, feil } | null
  const [oppretter, setOppretter] = useState(false)
  const [opprettFeil, setOpprettFeil] = useState(null)   // vises kun i skjemaet (aria-describedby)
  const planInputRef = useRef(null)
  const planResultatRef = useRef(null)
  const hjulInputRef = useRef(null)
  const hjulResultatRef = useRef(null)

  // Fokus flyttes til feltet når skjemaet åpnes, og til kvitteringen etter opprett (WCAG).
  useEffect(() => { if (planSkjema && planInputRef.current) { planInputRef.current.focus(); planInputRef.current.select() } }, [planSkjema])
  useEffect(() => { if (planResultat) planResultatRef.current?.focus() }, [planResultat])
  useEffect(() => { if (hjulSkjema && hjulInputRef.current) { hjulInputRef.current.focus(); hjulInputRef.current.select() } }, [hjulSkjema])
  useEffect(() => { if (hjulResultat) hjulResultatRef.current?.focus() }, [hjulResultat])

  // Ny lek (route-param bytter uten remount): nullstill nedtrekk-modi under render, så et
  // gammelt resultat/skjema ikke henger igjen. Reacts anbefalte «reset state on prop change».
  const [forrigeId, setForrigeId] = useState(id)
  if (id !== forrigeId) {
    setForrigeId(id)
    setAapen(null); setPlanSkjema(false); setPlanResultat(null); setHjulSkjema(false); setHjulResultat(null); setOpprettFeil(null)
  }

  useEffect(() => {
    let aktiv = true
    hentLek(id)
      .then((l) => {
        if (!aktiv) return
        setLek(l)
        // Aktiv læring-opplegg er ressurser (ressurstype='aktiv_laering') som åpnes via denne
        // siden — logg dem som eget signal (migr 125) så «hvilke opplegg brukes» kan måles skilt
        // fra vanlige lek-visninger. Vanlige leker logges som før ('visning').
        loggBrukHendelse(l.ressurstype === 'aktiv_laering' ? 'aktiv_laering_apnet' : 'visning', { ressursId: id })
      })
      .catch((e) => aktiv && setFeil(e.message))
    hentDokumenter(id).then((d) => aktiv && setDok(d))
    erFavoritt(id).then((f) => aktiv && setFav(f))
    hentPlaner().then((p) => aktiv && setPlaner(p)).catch(() => {})
    hentHjul().then((h) => aktiv && setHjul(h)).catch(() => {})
    return () => { aktiv = false }
  }, [id])

  function visMelding(tekst) {
    setMelding(tekst)
    setAapen(null)
    if (meldingTimer.current) clearTimeout(meldingTimer.current)
    meldingTimer.current = window.setTimeout(() => setMelding(null), 2800)
  }

  async function toggleFav() {
    const ny = !fav
    setFav(ny)
    try {
      await settFavoritt(id, ny)
    } catch {
      setFav(!ny) // rulle tilbake ved feil
    }
  }

  // D3: publiser/avpubliser hurtighandling (kun interne). Via lagre_ressurs (optimistisk lås);
  // basens feilmelding vises (f.eks. «En publisert lek må ha en tittel.», «Noen andre lagret …»).
  const [statusJobb, setStatusJobb] = useState(false)
  async function bytStatus() {
    if (statusJobb || !lek) return
    setStatusJobb(true)
    const ny = lek.status === 'publisert' ? 'utkast' : 'publisert'
    try {
      await settStatus(lek, ny)
      setLek(await hentLek(id))
      visMelding(ny === 'publisert' ? 'Publisert' : 'Avpublisert (utkast)')
    } catch (e) {
      visMelding(e.message)
    } finally {
      setStatusJobb(false)
    }
  }

  async function leggIPlan(plan) {
    try {
      await leggTilRad(plan.id, id, plan.rader.length)
      visMelding(`Lagt til i «${plan.navn}»`)
      setPlaner(await hentPlaner())
    } catch (e) {
      visMelding('Kunne ikke legge til: ' + e.message)
    }
  }

  async function leggPaaHjul(h) {
    try {
      const res = await leggLekTilHjul(h.id, id)
      visMelding(res === 'fantes' ? `Ligger allerede på «${h.navn}»` : `Lagt til på «${h.navn}»`)
      setHjul(await hentHjul())
    } catch (e) {
      visMelding('Kunne ikke legge til: ' + e.message)
    }
  }

  // Åpne/lukk et nedtrekk — alltid i listemodus, med nullstilt skjema/resultat.
  function togglePanel(navn) {
    setAapen(aapen === navn ? null : navn)
    setPlanSkjema(false); setPlanResultat(null); setHjulSkjema(false); setHjulResultat(null); setOpprettFeil(null)
  }

  // Ny periodeplan med denne leken: samme opprett-funksjon og standardverdier som
  // periodeplan-siden (nivå «hele», ingen år), deretter leggTilRad med leken (rekkefolge 0).
  async function opprettNyPlan() {
    if (oppretter) return
    setOppretter(true); setOpprettFeil(null)
    let nyId
    try {
      nyId = await opprettPlan({ navn: planNavn.trim() || 'Ny periodeplan', aar: null, nivaa: 'hele' })
    } catch (e) {
      setOpprettFeil('Kunne ikke opprette planen: ' + e.message); setOppretter(false); return
    }
    const url = `/min-side/periodeplaner/${nyId}`
    try {
      await leggTilRad(nyId, id, 0)
    } catch (e) {
      // Plan laget, men raden feilet — vis feil i klartekst med lenke, IKKE slett planen.
      setPlanSkjema(false)
      setPlanResultat({ url, feil: 'Planen ble opprettet, men leken kunne ikke legges til: ' + e.message })
      setPlaner(await hentPlaner().catch(() => planer)); setOppretter(false); return
    }
    setPlanSkjema(false)
    setPlanResultat({ url, feil: null })
    setPlaner(await hentPlaner().catch(() => planer)); setOppretter(false)
  }

  // Nytt TL-hjul med denne leken: opprettHjul (kun navn — ingen påkrevd kategori/segment),
  // deretter leggLekTilHjul som ved «legg på eksisterende hjul».
  async function opprettNyttHjul() {
    if (oppretter) return
    setOppretter(true); setOpprettFeil(null)
    let nyId
    try {
      nyId = await opprettHjul({ navn: hjulNavn.trim() || 'Nytt TL-hjul' })
    } catch (e) {
      setOpprettFeil('Kunne ikke opprette hjulet: ' + e.message); setOppretter(false); return
    }
    const url = `/min-side/tl-hjulet/${nyId}`
    try {
      await leggLekTilHjul(nyId, id)
    } catch (e) {
      setHjulSkjema(false)
      setHjulResultat({ url, feil: 'Hjulet ble opprettet, men leken kunne ikke legges til: ' + e.message })
      setHjul(await hentHjul().catch(() => hjul)); setOppretter(false); return
    }
    setHjulSkjema(false)
    setHjulResultat({ url, feil: null })
    setHjul(await hentHjul().catch(() => hjul)); setOppretter(false)
  }

  if (feil)
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">
        Fant ikke leken. <Link className="text-orange-ink" to="/min-side/aktiviteter">← Tilbake til Finn en lek</Link>
      </div>
    )
  if (!lek) return <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">Laster …</div>

  if (rediger && intern)
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <button onClick={() => setRediger(false)} className="text-sm text-orange-ink">← Tilbake til leken</button>
        <div className="mt-3">
          <LekRedigering
            lek={lek}
            onLagret={async () => { setLek(await hentLek(id)) }}
            onAvbryt={() => setRediger(false)}
          />
        </div>
      </div>
    )

  const kategori = lek.kategorier?.[0] || null

  // Handlingene fra dagens side (periodeplan, TL-hjul, PDF, favoritt) — nå ved tittelen.
  // Nedtrekkene (velg plan / velg hjul) åpnes som popover under knapperaden.
  const handlinger = (
    <div className="relative">
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button onClick={() => togglePanel('plan')} aria-expanded={aapen === 'plan'}
          className="bg-orange text-gray-900 text-sm font-semibold px-4 py-2 rounded-full hover:bg-orange/90 transition">
          Legg i periodeplan
        </button>
        <button onClick={() => togglePanel('hjul')} aria-expanded={aapen === 'hjul'}
          aria-label="Legg til i TL-hjul"
          className="border border-petrol text-petrol text-sm font-medium px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition">
          TL-hjul
        </button>
        <button onClick={() => { loggBrukHendelse('pdf_nedlastet', { ressursId: id }); skrivUtLek(lek) }} aria-label="Last ned leken som PDF"
          className="border border-petrol text-petrol text-sm font-medium px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition">
          PDF
        </button>
        <button onClick={toggleFav} aria-pressed={fav}
          aria-label={fav ? 'Fjern favoritt' : 'Legg til favoritt'}
          className={`border border-petrol rounded-full w-10 h-10 flex items-center justify-center text-lg leading-none transition hover:bg-petrol/10 ${fav ? 'text-tlred' : 'text-petrol'}`}>
          <span aria-hidden="true">{fav ? '♥' : '♡'}</span>
        </button>
      </div>
      {melding && <p className="text-sm text-petrol mt-2 md:text-right">{melding}</p>}

      {aapen === 'plan' && (
        <div className="absolute left-0 right-0 md:left-auto md:right-0 mt-2 w-full md:w-72 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          {planResultat ? (
            <div ref={planResultatRef} tabIndex={-1} className="focus:outline-none focus:ring-2 focus:ring-petrol/40 rounded-lg">
              {planResultat.feil
                ? <p role="alert" className="text-sm text-tlred">{planResultat.feil}</p>
                : <p className="text-sm font-medium text-gray-900">Leken er lagt i den nye planen.</p>}
              <Link to={planResultat.url} className="inline-block mt-2 text-sm font-medium text-orange-ink hover:underline">Åpne planen →</Link>
            </div>
          ) : planSkjema ? (
            <div>
              <label htmlFor="ny-plan-navn" className="block text-xs text-gray-500">Navn på planen</label>
              <input id="ny-plan-navn" ref={planInputRef} type="text" value={planNavn}
                onChange={(e) => setPlanNavn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); opprettNyPlan() }
                  else if (e.key === 'Escape') { e.preventDefault(); setPlanSkjema(false); setOpprettFeil(null) }
                }}
                aria-describedby={opprettFeil ? 'ny-plan-feil' : undefined}
                className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/40" />
              {opprettFeil && <p id="ny-plan-feil" role="alert" className="text-sm text-tlred mt-1">{opprettFeil}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={opprettNyPlan} disabled={oppretter}
                  className="bg-orange text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50">
                  {oppretter ? 'Oppretter …' : 'Opprett'}
                </button>
                <button onClick={() => { setPlanSkjema(false); setOpprettFeil(null) }} className="text-sm text-gray-500 hover:text-gray-700 px-3">Avbryt</button>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => { setOpprettFeil(null); setPlanNavn('Ny periodeplan'); setPlanSkjema(true) }}
                className="w-full text-left text-sm font-semibold text-orange-ink px-2 py-2 rounded-lg hover:bg-orange/5">
                + Ny periodeplan med denne leken
              </button>
              {planer.length === 0 ? (
                <p className="text-xs text-gray-500 mt-1 px-2">Ingen planer fra før. <Link to="/min-side/periodeplaner" className="text-orange-ink">Gå til periodeplaner →</Link></p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mt-2 mb-1 px-2">Eller legg i en plan du har:</p>
                  <div className="flex flex-col">
                    {planer.map((p) => (
                      <button key={p.id} onClick={() => leggIPlan(p)} className="text-left text-sm px-2 py-2 rounded-lg hover:bg-orange/5">
                        {p.navn} <span className="text-gray-500">· {p.rader.length} leker</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {aapen === 'hjul' && (
        <div className="absolute left-0 right-0 md:left-auto md:right-0 mt-2 w-full md:w-72 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          {hjulResultat ? (
            <div ref={hjulResultatRef} tabIndex={-1} className="focus:outline-none focus:ring-2 focus:ring-petrol/40 rounded-lg">
              {hjulResultat.feil
                ? <p role="alert" className="text-sm text-tlred">{hjulResultat.feil}</p>
                : <p className="text-sm font-medium text-gray-900">Leken er lagt i det nye hjulet.</p>}
              <Link to={hjulResultat.url} className="inline-block mt-2 text-sm font-medium text-orange-ink hover:underline">Åpne hjulet →</Link>
            </div>
          ) : hjulSkjema ? (
            <div>
              <label htmlFor="ny-hjul-navn" className="block text-xs text-gray-500">Navn på hjulet</label>
              <input id="ny-hjul-navn" ref={hjulInputRef} type="text" value={hjulNavn}
                onChange={(e) => setHjulNavn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); opprettNyttHjul() }
                  else if (e.key === 'Escape') { e.preventDefault(); setHjulSkjema(false); setOpprettFeil(null) }
                }}
                aria-describedby={opprettFeil ? 'ny-hjul-feil' : undefined}
                className="mt-0.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/40" />
              {opprettFeil && <p id="ny-hjul-feil" role="alert" className="text-sm text-tlred mt-1">{opprettFeil}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={opprettNyttHjul} disabled={oppretter}
                  className="bg-orange text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-orange/90 transition disabled:opacity-50">
                  {oppretter ? 'Oppretter …' : 'Opprett'}
                </button>
                <button onClick={() => { setHjulSkjema(false); setOpprettFeil(null) }} className="text-sm text-gray-500 hover:text-gray-700 px-3">Avbryt</button>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => { setOpprettFeil(null); setHjulNavn('Nytt TL-hjul'); setHjulSkjema(true) }}
                className="w-full text-left text-sm font-semibold text-orange-ink px-2 py-2 rounded-lg hover:bg-orange/5">
                + Nytt TL-hjul med denne leken
              </button>
              {hjul.length === 0 ? (
                <p className="text-xs text-gray-500 mt-1 px-2">Ingen hjul fra før. <Link to="/min-side/tl-hjulet" className="text-orange-ink">Gå til TL-hjulet →</Link></p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mt-2 mb-1 px-2">Eller legg på et hjul du har:</p>
                  <div className="flex flex-col">
                    {hjul.map((h) => (
                      <button key={h.id} onClick={() => leggPaaHjul(h)} className="text-left text-sm px-2 py-2 rounded-lg hover:bg-orange/5">
                        {h.navn} <span className="text-gray-500">· {h.leker.length} leker</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <nav className="text-sm" aria-label="Brødsmulesti">
        <Link to="/min-side/aktiviteter" className="text-orange-ink hover:underline">Finn en lek</Link>
        {kategori && <span className="text-gray-500"> <span aria-hidden="true">›</span> <span className="text-gray-700">{kategori}</span></span>}
      </nav>

      <div className="mt-3">
        <LekVisning lek={lek} handlinger={handlinger}
          onVideoSpilt={() => loggBrukHendelse('video_spilt', { ressursId: id })} />
      </div>

      {dok.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-gray-900 mb-2">{t('skoledok.lek.tilleggsmateriale')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF-dokument åpnet fra lek-siden logges som pdf_nedlastet, med LEKENS ressurs-id
                (dokumentet er tilleggsmateriale til denne leken). Kun PDF — andre filtyper er
                ikke pdf_nedlastet, og «åpnet dokument» er ingen definert hendelsestype (se rapport). */}
            {dok.map((d) => (
              <DokumentKort key={d.id} dok={d}
                onÅpne={/pdf/i.test(d.filtype || '') ? () => loggBrukHendelse('pdf_nedlastet', { ressursId: id }) : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Status + rediger (kun interne) — beholdt der de er */}
      {intern && (
        <div className="mt-8 flex items-center gap-2 flex-wrap">
          {lek.status && lek.status !== 'publisert' && (
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-ink bg-orange/10 px-2 py-1 rounded-full">{lek.status}</span>
          )}
          <button onClick={bytStatus} disabled={statusJobb}
            className="text-sm border border-petrol text-petrol px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition disabled:opacity-50">
            {lek.status === 'publisert' ? 'Avpubliser' : 'Publiser'}
          </button>
          <button onClick={() => setRediger(true)} className="text-sm bg-petrol text-white px-4 py-2 rounded-full hover:bg-petrol/90 transition">
            Rediger lek
          </button>
        </div>
      )}
    </div>
  )
}
