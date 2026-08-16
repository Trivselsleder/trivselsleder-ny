import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { hentDeltPlan, nivaaLabel } from '../lib/periodeplan'
import { lekEmoji, lekFarge } from '../lib/lekIkon'

const DAG_IDX = ['SØNDAG', 'MANDAG', 'TIRSDAG', 'ONSDAG', 'TORSDAG', 'FREDAG', 'LØRDAG']

// Offentlig, skrivebeskyttet SKJERMVISNING for oppslags-TV / storskjerm på skolen.
// Elevnavn vises som standard (poenget er at elevene ser hvem som har ansvar hvor);
// «Skjul elevnavn» bytter dem til «elev»/«TL-vakt». Auto-oppdaterer lydløst.
export default function SkjermPlan() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const [plan, setPlan] = useState(null)
  const [feil, setFeil] = useState(null)
  const [frakoblet, setFrakoblet] = useState(false)
  const [laster, setLaster] = useState(true)
  const [skjul, setSkjul] = useState(() => {
    if (params.get('skjul') === '1') return true
    try { return localStorage.getItem(`tl-skjerm-skjul-${token}`) === '1' } catch { return false }
  })
  const [naa, setNaa] = useState(() => new Date())
  const [erFull, setErFull] = useState(false)
  const [sistOppdatert, setSistOppdatert] = useState(null)
  const montert = useRef(true)
  const harPlan = useRef(false)
  const rot = useRef(null)

  function hent() {
    hentDeltPlan(token)
      .then((data) => {
        if (!montert.current) return
        if (!data) { if (!harPlan.current) setFeil('Fant ingen plan for denne lenken.'); return }
        harPlan.current = true
        setPlan(data); setFeil(null); setFrakoblet(false); setSistOppdatert(new Date())
      })
      .catch((e) => {
        if (!montert.current) return
        // Behold sist lagrede plan ved forbigående feil — bytt aldri en fungerende TV til feilskjerm.
        if (harPlan.current) setFrakoblet(true); else setFeil(e.message)
      })
      .finally(() => { if (montert.current) setLaster(false) })
  }

  useEffect(() => {
    montert.current = true
    hent()
    const r = window.setInterval(hent, 180000) // auto-oppdater hvert 3. min
    const k = window.setInterval(() => setNaa(new Date()), 1000) // klokke
    return () => { montert.current = false; window.clearInterval(r); window.clearInterval(k) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    function onFull() { setErFull(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])

  function byttSkjul() {
    setSkjul((v) => {
      const ny = !v
      try { localStorage.setItem(`tl-skjerm-skjul-${token}`, ny ? '1' : '0') } catch { /* ignorer */ }
      return ny
    })
  }
  function fullskjerm() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else (rot.current || document.documentElement).requestFullscreen?.().catch(() => {})
  }

  const iDag = DAG_IDX[naa.getDay()]
  const dager = plan?.dager || []
  const rader = plan?.rader || []
  const nivaa = plan?.ansvarlige?._nivaa
  const periode = useMemo(() => {
    const u = (plan?.uker || []).join(', ')
    return [u ? `Uke ${u}` : '', plan?.aar].filter(Boolean).join(' · ')
  }, [plan])

  const klokke = naa.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
  const dato = naa.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })

  if (laster && !plan) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-2xl">Laster …</div>
  if (feil && !plan) return <div className="min-h-screen flex items-center justify-center text-gray-600 text-2xl px-6 text-center">{feil}</div>

  return (
    <div ref={rot} className="min-h-screen bg-[#FFF8F2] text-gray-900 flex flex-col">
      <header className="flex items-center gap-4 px-6 lg:px-10 py-4 border-b-4 border-orange bg-white/70">
        <img src="/tl-logo.png" alt="Trivselsleder" className="h-12 lg:h-14 w-auto" />
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-4xl font-extrabold leading-tight truncate">{plan?.navn}</h1>
          <p className="text-sm lg:text-lg text-gray-500">
            {periode}
            {nivaa && <span className="ml-2 align-middle text-xs lg:text-sm bg-orange/10 text-[#B5560F] px-2 py-0.5 rounded-full">{nivaaLabel(nivaa)}</span>}
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <div className="text-2xl lg:text-4xl font-bold tabular-nums">{klokke}</div>
          <div className="text-xs lg:text-base text-gray-500 capitalize">{dato}</div>
        </div>
        <div className="flex flex-col gap-1.5 ml-2 shrink-0 print:hidden">
          <button onClick={byttSkjul} className="text-xs lg:text-sm border border-gray-300 rounded-full px-3 py-1.5 hover:border-orange hover:text-orange-ink bg-white">
            {skjul ? 'Vis elevnavn' : 'Skjul elevnavn'}
          </button>
          <button onClick={fullskjerm} className="text-xs lg:text-sm border border-gray-300 rounded-full px-3 py-1.5 hover:border-orange hover:text-orange-ink bg-white">
            {erFull ? 'Avslutt fullskjerm' : 'Fullskjerm'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 lg:p-8">
        {dager.length === 0 ? (
          <p className="text-center text-gray-500 text-xl mt-16">Ingen dager satt på planen ennå.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 lg:p-4 w-1/5" />
                {dager.map((d) => {
                  const idag = d.toUpperCase() === iDag
                  return (
                    <th key={d} className="p-2 lg:p-3">
                      <div className={`rounded-2xl px-3 py-2 lg:py-3 text-lg lg:text-2xl font-extrabold ${idag ? 'bg-[#C2410C] text-white shadow' : 'bg-white text-gray-700 border border-gray-200'}`}>
                        {d}{idag && <span className="block text-xs lg:text-sm font-semibold">i dag</span>}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="text-left align-middle p-3 text-base lg:text-xl font-bold text-[#B5560F] uppercase tracking-wide">Ansvar · TL-vakt</th>
                {dager.map((d) => {
                  const idag = d.toUpperCase() === iDag
                  const a = plan.ansvarlige?.[d]
                  return (
                    <td key={d} className={`p-2 lg:p-3 text-center align-middle ${idag ? 'bg-orange/10' : ''}`}>
                      <span className="inline-block text-lg lg:text-2xl font-semibold text-gray-800">{a ? (skjul ? 'TL-vakt' : a) : '—'}</span>
                    </td>
                  )
                })}
              </tr>
              {rader.length === 0 ? (
                <tr><td colSpan={dager.length + 1} className="text-center text-gray-500 text-xl py-16">Ingen leker lagt til ennå.</td></tr>
              ) : (
                rader.map((r, i) => {
                  const lek = { tittel: r.tittel || 'Lek', utstyr: [], egnet: [] }
                  return (
                    <tr key={i} className="border-t border-gray-200/70">
                      <th className="text-left p-3 lg:p-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 lg:w-14 lg:h-14 rounded-xl text-xl lg:text-3xl shrink-0" style={{ background: lekFarge(lek) }}>{lekEmoji(lek)}</span>
                          <div>
                            <span className="block text-xl lg:text-3xl font-bold leading-tight">{lek.tittel}</span>
                            {(r.celler || {})._sted && <span className="block text-base lg:text-xl text-gray-500 mt-0.5">📍 {(r.celler || {})._sted}</span>}
                          </div>
                        </div>
                      </th>
                      {dager.map((d) => {
                        const idag = d.toUpperCase() === iDag
                        const chips = ((r.celler || {})[d] || '').split(',').map((s) => s.trim()).filter(Boolean)
                        return (
                          <td key={d} className={`p-2 lg:p-3 align-middle text-center ${idag ? 'bg-orange/10' : ''}`}>
                            <div className="flex flex-wrap gap-1.5 lg:gap-2 justify-center">
                              {chips.map((c, k) => (
                                <span key={k} className="text-base lg:text-2xl font-semibold bg-orange/10 text-[#B5560F] px-3 py-1 rounded-full whitespace-nowrap">
                                  {skjul ? 'elev' : c}
                                </span>
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </main>

      <footer className="px-6 lg:px-10 py-2 text-xs lg:text-sm text-gray-400 flex items-center justify-between border-t border-gray-200 bg-white/60 print:hidden">
        <span>trivselsleder.no · oppslagsskjerm</span>
        {frakoblet
          ? <span className="text-[#B5560F]">Får ikke kontakt — viser sist lagrede versjon.</span>
          : sistOppdatert && <span>Oppdatert kl. {sistOppdatert.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} · oppdateres automatisk</span>}
      </footer>
    </div>
  )
}
