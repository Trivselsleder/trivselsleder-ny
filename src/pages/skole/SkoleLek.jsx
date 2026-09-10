import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { hentLek, hentDokumenter, loggBrukHendelse, settStatus } from '../../lib/leker'
import { erFavoritt, settFavoritt } from '../../lib/favoritter'
import { hentPlaner, leggTilRad } from '../../lib/periodeplan'
import { hentHjul, leggLekTilHjul } from '../../lib/hjul'
import { skrivUtLek } from '../../lib/lekPdf'
import { useAuth } from '../../contexts/AuthContext'
import LekRedigering from '../../components/LekRedigering'
import LekVisning from '../../components/LekVisning'

export default function SkoleLek() {
  const { id } = useParams()
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

  useEffect(() => {
    let aktiv = true
    hentLek(id)
      .then((l) => {
        if (!aktiv) return
        setLek(l)
        loggBrukHendelse('visning', { ressursId: id })
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
        <button onClick={() => setAapen(aapen === 'plan' ? null : 'plan')} aria-expanded={aapen === 'plan'}
          className="bg-orange text-gray-900 text-sm font-semibold px-4 py-2 rounded-full hover:bg-orange/90 transition">
          Legg i periodeplan
        </button>
        <button onClick={() => setAapen(aapen === 'hjul' ? null : 'hjul')} aria-expanded={aapen === 'hjul'}
          aria-label="Legg til i TL-hjul"
          className="border border-petrol text-petrol text-sm font-medium px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition">
          TL-hjul
        </button>
        <button onClick={() => skrivUtLek(lek)} aria-label="Last ned leken som PDF"
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
          <p className="text-xs text-gray-500 mb-2">Velg periodeplan</p>
          {planer.length === 0 ? (
            <p className="text-sm text-gray-500">Du har ingen planer ennå. <Link to="/min-side/periodeplaner" className="text-orange-ink">Lag en plan →</Link></p>
          ) : (
            <div className="flex flex-col">
              {planer.map((p) => (
                <button key={p.id} onClick={() => leggIPlan(p)} className="text-left text-sm px-2 py-2 rounded-lg hover:bg-orange/5">
                  {p.navn} <span className="text-gray-500">· {p.rader.length} leker</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {aapen === 'hjul' && (
        <div className="absolute left-0 right-0 md:left-auto md:right-0 mt-2 w-full md:w-72 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Velg TL-hjul</p>
          {hjul.length === 0 ? (
            <p className="text-sm text-gray-500">Du har ingen hjul ennå. <Link to="/min-side/tl-hjulet" className="text-orange-ink">Lag et hjul →</Link></p>
          ) : (
            <div className="flex flex-col">
              {hjul.map((h) => (
                <button key={h.id} onClick={() => leggPaaHjul(h)} className="text-left text-sm px-2 py-2 rounded-lg hover:bg-orange/5">
                  {h.navn} <span className="text-gray-500">· {h.leker.length} leker</span>
                </button>
              ))}
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
        <LekVisning lek={lek} handlinger={handlinger} />
      </div>

      {dok.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-gray-900 mb-2">Tilleggsmateriale</h2>
          <ul className="space-y-1">
            {dok.map((d) => <li key={d.id} className="text-sm text-gray-700">📄 {d.tittel}</li>)}
          </ul>
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
