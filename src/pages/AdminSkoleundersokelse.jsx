import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { adminFetch } from '../lib/adminFetch'
import SkoleusResultatEffekt from '../components/SkoleusResultatEffekt'

// Admin-flate for «Spørreundersøkelse til skolene».
// Del B: opprett runde, generer mottakere, se svar-status.
// Del 1b (denne): FLEKSIBLE undersøkelser oppå 079 — undersøkelse-liste,
// «ny fra mal»/«ny tom», spørsmålseditor (rediger + flytt rekkefølge + matriserader),
// og undersøkelse-velger i «Opprett runde». Gjenbruker admin-uttrykket fra
// AdminEvaluering.jsx. Krever migrasjon 079 (skoleus_undersokelse + undersokelse_id).

const STATUS_ETIKETT = { utkast: 'Utkast', aktiv: 'Aktiv', lukket: 'Lukket' }
const STATUS_KLASSE = {
  utkast: 'bg-gray-100 text-gray-700',
  aktiv: 'bg-orange-50 text-orange-700',
  lukket: 'bg-gray-200 text-gray-500',
}

const BLOKK_REKKEFOLGE = ['rolle', 'effekt', 'drift', 'plattform', 'aapent']
const BLOKK_ETIKETT = {
  rolle: 'Rolle', effekt: 'Effekt', drift: 'Drift', plattform: 'Plattform', aapent: 'Åpne spørsmål',
}
const TYPE_ETIKETT = { matrise: 'Matrise', enkeltvalg: 'Enkeltvalg', fritekst: 'Fritekst' }
const TYPE_VALG = ['matrise', 'enkeltvalg', 'fritekst']

const KILDE_ETIKETT = { hktl: 'HKTL', htla: 'HTLA (fallback)', rektor: 'Rektor (fallback)' }

const inputKlasse = 'w-full border border-gray-300 rounded-lg px-3 py-2'
const primærKnapp = 'px-4 py-2 rounded-lg bg-orange text-gray-900 text-sm font-semibold disabled:opacity-40'
const sekundærKnapp = 'px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40'

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '' }
}

// Målgruppe-filterakser (speiler Skoler-adminens filter: Status/Fylke/Kommune/Type/Nettverk).
// «kommune»-aksen matcher skoler.kommunenavn (jf. migr 080). Alle akser er flervalg.
const AKSER = [
  { key: 'status',   tittel: 'Status',   kol: 'status' },
  { key: 'fylke',    tittel: 'Fylke',    kol: 'fylke' },
  { key: 'kommune',  tittel: 'Kommune',  kol: 'kommunenavn' },
  { key: 'type',     tittel: 'Type',     kol: 'type' },
  { key: 'nettverk', tittel: 'Nettverk', kol: 'nettverk' },
]
const TOMT_FILTER = { status: [], fylke: [], kommune: [], type: [], nettverk: [] }

// Hvem runden sendes til (skoleus_runder.mottaker_rolle, migr 081).
const MOTTAKER_ROLLE_VALG = ['hovedkontakt', 'rektor', 'tl_ansvarlig']
const MOTTAKER_ROLLE_ETIKETT = {
  hovedkontakt: 'Hovedkontakt',
  rektor: 'Rektor',
  tl_ansvarlig: 'TL-ansvarlig',
}

// Kort sammendrag av et jsonb-filter for visning. Tomt = «Alle skoler».
function filterSammendrag(mg) {
  if (!mg || typeof mg !== 'object') return 'Alle skoler'
  const deler = AKSER
    .filter(a => Array.isArray(mg[a.key]) && mg[a.key].length > 0)
    .map(a => `${a.tittel}: ${mg[a.key].join(', ')}`)
  return deler.length ? deler.join(' · ') : 'Alle skoler'
}

// Én flervalgs-akse som RULLGARDIN med avkryssing (speiler TypeMultiselect i
// AdminSkoler.jsx): klikk åpner, huk av flere, klikk utenfor lukker; triggeren
// viser «Alle» / «N valgt». Passer akser med mange verdier (Kommune/Fylke).
function FilterAkse({ tittel, alternativer, valgt, onToggle }) {
  const [aapen, setAapen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handleKlikk(e) { if (ref.current && !ref.current.contains(e.target)) setAapen(false) }
    document.addEventListener('mousedown', handleKlikk)
    return () => document.removeEventListener('mousedown', handleKlikk)
  }, [])
  if (!alternativer || alternativer.length === 0) return null
  const label = valgt.length === 0 ? 'Alle'
    : valgt.length === alternativer.length ? 'Alle valgt'
    : `${valgt.length} valgt`
  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-xs font-medium text-gray-500">{tittel}</label>
      <div className="relative">
        <button
          type="button"
          onMouseDown={() => setAapen(v => !v)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:border-[#FF7B31] flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#FF7B31]/30"
        >
          <span>{label}</span>
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={aapen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        </button>
        {aapen && (
          <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {alternativer.map(v => (
              <li key={v}>
                <button
                  type="button"
                  onMouseDown={() => onToggle(v)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${valgt.includes(v) ? 'bg-[#FF7B31] border-[#FF7B31]' : 'border-gray-300'}`}>
                    {valgt.includes(v) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {v}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Bytt rekkefolge på to naboer (speiler flyttHjul i lib/hjul.js). rader må være
// sortert på rekkefolge. Skriver begge radene, kaller onFerdig() etterpå.
async function byttRekkefolge(tabell, rader, id, retning, onFerdig) {
  const rekke = [...rader]
  const idx = rekke.findIndex(x => x.id === id)
  const nyIdx = idx + retning
  if (idx < 0 || nyIdx < 0 || nyIdx >= rekke.length) return
  const a = rekke[idx], b = rekke[nyIdx]
  let ra = a.rekkefolge ?? 0, rb = b.rekkefolge ?? 0
  if (ra === rb) { ra = idx; rb = nyIdx } // normaliser om verdiene er like
  await supabase.from(tabell).update({ rekkefolge: rb }).eq('id', a.id)
  await supabase.from(tabell).update({ rekkefolge: ra }).eq('id', b.id)
  if (onFerdig) await onFerdig()
}

// ─────────────────────────────────────────────────────────────────────────────
// Én matriserad (redigerbar): radtekst (lagres onBlur), «ikke aktuelt», flytt, fjern.
// ─────────────────────────────────────────────────────────────────────────────
function MatriseRad({ rad, rader, index, antall, onEndret }) {
  const [tekst, setTekst] = useState(rad.radtekst || '')

  async function lagreTekst() {
    if (tekst === rad.radtekst) return
    await supabase.from('skoleus_matriserad').update({ radtekst: tekst }).eq('id', rad.id)
    onEndret()
  }
  async function settIA(v) {
    await supabase.from('skoleus_matriserad').update({ tillat_ikke_aktuelt: v }).eq('id', rad.id)
    onEndret()
  }
  async function fjern() {
    await supabase.from('skoleus_matriserad').delete().eq('id', rad.id)
    onEndret()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={tekst}
        onChange={e => setTekst(e.target.value)}
        onBlur={lagreTekst}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        placeholder="Radtekst"
      />
      <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
        <input type="checkbox" checked={!!rad.tillat_ikke_aktuelt} onChange={e => settIA(e.target.checked)} />
        ikke aktuelt
      </label>
      <span className="flex items-center">
        <button type="button" onClick={() => byttRekkefolge('skoleus_matriserad', rader, rad.id, -1, onEndret)} disabled={index === 0} className="text-gray-400 hover:text-orange-ink disabled:opacity-30 px-1" aria-label="Flytt rad opp">↑</button>
        <button type="button" onClick={() => byttRekkefolge('skoleus_matriserad', rader, rad.id, 1, onEndret)} disabled={index === antall - 1} className="text-gray-400 hover:text-orange-ink disabled:opacity-30 px-1" aria-label="Flytt rad ned">↓</button>
      </span>
      <button type="button" onClick={fjern} className="text-pink-600 hover:text-pink-800 text-xs px-1" aria-label="Fjern rad">✕</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ett spørsmål (redigerbart): tekst, blokk, type, skala, «ikke aktuelt» + matriserader.
// Flytt opp/ned og fjern spørsmål. Lagrer feltene samlet via «Lagre».
// ─────────────────────────────────────────────────────────────────────────────
function SporsmalKort({ s, rader, index, antall, onEndret }) {
  const [tekst, setTekst] = useState(s.sporsmaltekst || '')
  const [blokk, setBlokk] = useState(s.blokk)
  const [type, setType] = useState(s.type)
  const [skalaMin, setSkalaMin] = useState(s.skala_min ?? 1)
  const [skalaMax, setSkalaMax] = useState(s.skala_max ?? 6)
  const [tillatIA, setTillatIA] = useState(!!s.tillat_ikke_aktuelt)
  const [lagrer, setLagrer] = useState(false)
  const [lagret, setLagret] = useState(false)
  const [feil, setFeil] = useState(null)
  const [bekreftFjern, setBekreftFjern] = useState(false)

  async function lagre() {
    setFeil(null)
    if (tekst.trim() === '') { setFeil('Spørsmålsteksten kan ikke være tom.'); return }
    // Respekter CHECK-constraintene fra 077: fritekst uten skala; matrise/enkeltvalg med skala.
    let payload = { sporsmaltekst: tekst.trim(), blokk, type, tillat_ikke_aktuelt: tillatIA }
    if (type === 'fritekst') {
      payload.skala_min = null
      payload.skala_max = null
    } else {
      const mn = Number(skalaMin), mx = Number(skalaMax)
      if (!Number.isInteger(mn) || !Number.isInteger(mx) || mn > mx) {
        setFeil('Skala må være hele tall, og min ≤ maks.')
        return
      }
      payload.skala_min = mn
      payload.skala_max = mx
    }
    setLagrer(true)
    const { error } = await supabase.from('skoleus_sporsmal').update(payload).eq('id', s.id)
    setLagrer(false)
    if (error) { setFeil(error.message); return }
    setLagret(true)
    setTimeout(() => setLagret(false), 1500)
    onEndret()
  }

  async function fjern() {
    // Matriserader cascader (FK ON DELETE CASCADE fra 077).
    await supabase.from('skoleus_sporsmal').delete().eq('id', s.id)
    setBekreftFjern(false)
    onEndret()
  }

  async function leggTilRad() {
    const nesteRek = rader.length ? Math.max(...rader.map(r => r.rekkefolge ?? 0)) + 1 : 1
    await supabase.from('skoleus_matriserad').insert({
      sporsmal_id: s.id, rekkefolge: nesteRek, radtekst: '', tillat_ikke_aktuelt: false,
    })
    onEndret()
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <textarea
            value={tekst}
            onChange={e => setTekst(e.target.value)}
            rows={2}
            className={inputKlasse}
            placeholder="Spørsmålstekst"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Blokk</label>
              <select value={blokk} onChange={e => setBlokk(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {BLOKK_REKKEFOLGE.map(b => <option key={b} value={b}>{BLOKK_ETIKETT[b]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {TYPE_VALG.map(t => <option key={t} value={t}>{TYPE_ETIKETT[t]}</option>)}
              </select>
            </div>
            {type !== 'fritekst' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Skala min</label>
                  <input type="number" value={skalaMin} onChange={e => setSkalaMin(e.target.value)} className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Skala maks</label>
                  <input type="number" value={skalaMax} onChange={e => setSkalaMax(e.target.value)} className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={tillatIA} onChange={e => setTillatIA(e.target.checked)} />
              «ikke aktuelt» tillatt
            </label>
          </div>

          {type === 'matrise' && (
            <div className="mt-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Matriserader</p>
              <div className="space-y-2">
                {rader.map((r, i) => (
                  <MatriseRad key={r.id} rad={r} rader={rader} index={i} antall={rader.length} onEndret={onEndret} />
                ))}
              </div>
              <button type="button" onClick={leggTilRad} className="mt-2 text-orange-ink hover:underline text-sm">+ Legg til rad</button>
            </div>
          )}

          {feil && <p className="text-sm text-pink-700">{feil}</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={lagre} disabled={lagrer} className={primærKnapp}>
              {lagrer ? 'Lagrer …' : 'Lagre'}
            </button>
            {lagret && <span className="text-sm text-green-700">Lagret ✓</span>}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="inline-block px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold mb-1">{BLOKK_ETIKETT[s.blokk] || s.blokk}</span>
          <div className="flex flex-col items-center">
            <button type="button" onClick={() => index !== 0 && onEndret.flytt(s.id, -1)} disabled={index === 0} className="text-gray-400 hover:text-orange-ink disabled:opacity-30 px-1" aria-label="Flytt spørsmål opp">↑</button>
            <button type="button" onClick={() => index !== antall - 1 && onEndret.flytt(s.id, 1)} disabled={index === antall - 1} className="text-gray-400 hover:text-orange-ink disabled:opacity-30 px-1" aria-label="Flytt spørsmål ned">↓</button>
          </div>
          {bekreftFjern ? (
            <span className="flex flex-col items-center gap-1 mt-1">
              <button type="button" onClick={fjern} className="text-xs text-white bg-pink-600 rounded px-2 py-1">Bekreft</button>
              <button type="button" onClick={() => setBekreftFjern(false)} className="text-xs text-gray-500">Avbryt</button>
            </span>
          ) : (
            <button type="button" onClick={() => setBekreftFjern(true)} className="text-pink-600 hover:text-pink-800 text-xs mt-1" aria-label="Fjern spørsmål">Fjern</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor for én undersøkelse. Låst (read-only) hvis undersøkelsen er i bruk.
// ─────────────────────────────────────────────────────────────────────────────
function SporsmalEditor({ undersokelse, laast, onEndret, onLukk, onKopier }) {
  const [sporsmal, setSporsmal] = useState([])
  const [matriser, setMatriser] = useState([])
  const [laster, setLaster] = useState(true)
  const [leggerTil, setLeggerTil] = useState(false)

  async function hent() {
    setLaster(true)
    const [spRes, mrRes] = await Promise.all([
      supabase.from('skoleus_sporsmal')
        .select('id, rekkefolge, blokk, type, sporsmaltekst, skala_min, skala_max, tillat_ikke_aktuelt')
        .eq('undersokelse_id', undersokelse.id)
        .order('rekkefolge', { ascending: true }),
      supabase.from('skoleus_matriserad')
        .select('id, sporsmal_id, rekkefolge, radtekst, tillat_ikke_aktuelt')
        .order('rekkefolge', { ascending: true }),
    ])
    setSporsmal(spRes.data ?? [])
    setMatriser(mrRes.data ?? [])
    setLaster(false)
  }

  useEffect(() => { hent() }, [undersokelse.id])

  // onEndret for barn: en funksjon som re-henter, med .flytt-hjelper hengt på.
  const barnEndret = async () => { await hent(); if (onEndret) onEndret() }
  barnEndret.flytt = (id, retning) => byttRekkefolge('skoleus_sporsmal', sporsmal, id, retning, barnEndret)

  async function leggTilSporsmal() {
    setLeggerTil(true)
    const nesteRek = sporsmal.length ? Math.max(...sporsmal.map(s => s.rekkefolge ?? 0)) + 1 : 1
    await supabase.from('skoleus_sporsmal').insert({
      undersokelse_id: undersokelse.id,
      rekkefolge: nesteRek,
      blokk: 'aapent',
      type: 'enkeltvalg',
      sporsmaltekst: 'Nytt spørsmål',
      skala_min: 1, skala_max: 6,
      tillat_ikke_aktuelt: false,
    })
    setLeggerTil(false)
    barnEndret()
  }

  const raderFor = (sporsmalId) => matriser.filter(m => m.sporsmal_id === sporsmalId)

  return (
    <div className="bg-white border-2 border-orange-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-900">
          Redigerer: {undersokelse.navn}
          {undersokelse.er_mal && <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">Mal</span>}
        </h3>
        <button type="button" onClick={onLukk} className="text-gray-500 hover:text-gray-900 text-sm font-medium">Lukk editor</button>
      </div>

      {laast && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Denne undersøkelsen er i bruk (en runde er startet eller har svar) — den kan ikke endres,
          så innsamlede svar ikke endres under føttene.{' '}
          <button type="button" onClick={() => onKopier(undersokelse.id)} className="underline font-medium">Lag en kopi for å endre</button>.
        </div>
      )}

      {laster ? (
        <p className="text-gray-500">Laster spørsmål …</p>
      ) : laast ? (
        // Read-only-visning gruppert på blokk.
        <div className="space-y-5">
          {BLOKK_REKKEFOLGE.map(b => {
            const liste = sporsmal.filter(s => s.blokk === b)
            if (liste.length === 0) return null
            return (
              <div key={b}>
                <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold mb-2">{BLOKK_ETIKETT[b]}</span>
                <ul className="space-y-2">
                  {liste.map(s => (
                    <li key={s.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-900 font-medium">{s.sporsmaltekst}</p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {TYPE_ETIKETT[s.type] || s.type}
                          {s.type !== 'fritekst' && s.skala_min != null ? ` · ${s.skala_min}–${s.skala_max}` : ''}
                          {s.tillat_ikke_aktuelt ? ' · «ikke aktuelt»' : ''}
                        </span>
                      </div>
                      {raderFor(s.id).length > 0 && (
                        <ul className="mt-2 ml-4 list-disc text-sm text-gray-600 space-y-0.5">
                          {raderFor(s.id).map(m => (
                            <li key={m.id}>{m.radtekst}{m.tillat_ikke_aktuelt ? <span className="text-gray-400"> · «ikke aktuelt»</span> : null}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {sporsmal.length === 0 && <p className="text-sm text-gray-500">Ingen spørsmål ennå.</p>}
        </div>
      ) : (
        // Redigerbar, flat liste sortert på rekkefolge.
        <div className="space-y-3">
          {sporsmal.map((s, i) => (
            <SporsmalKort key={s.id} s={s} rader={raderFor(s.id)} index={i} antall={sporsmal.length} onEndret={barnEndret} />
          ))}
          {sporsmal.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500 text-sm">
              Ingen spørsmål ennå. Legg til det første under.
            </div>
          )}
          <button type="button" onClick={leggTilSporsmal} disabled={leggerTil} className={sekundærKnapp}>
            {leggerTil ? 'Legger til …' : '+ Legg til spørsmål'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hovedside.
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminSkoleundersokelse() {
  const [undersokelser, setUndersokelser] = useState([])
  const [sporsmalAntall, setSporsmalAntall] = useState({}) // undersokelse_id -> antall
  const [runder, setRunder] = useState([])
  const [mottakerAntall, setMottakerAntall] = useState({})
  const [svarAntall, setSvarAntall] = useState({})
  const [skoleFelter, setSkoleFelter] = useState({ status: [], fylke: [], kommune: [], type: [], nettverk: [] })
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  // Editor
  const [valgtEditor, setValgtEditor] = useState(null) // undersokelse_id

  // Ny fra mal / ny tom
  const [malDialog, setMalDialog] = useState(false)
  const [malKilde, setMalKilde] = useState('')
  const [malNavn, setMalNavn] = useState('')
  const [tomDialog, setTomDialog] = useState(false)
  const [tomNavn, setTomNavn] = useState('')
  const [jobber, setJobber] = useState(false)

  // Opprett runde
  const [nyNavn, setNyNavn] = useState('')
  const [filter, setFilter] = useState(TOMT_FILTER)
  const [nyRolle, setNyRolle] = useState('hovedkontakt')
  const [nyUndersokelse, setNyUndersokelse] = useState('')
  const [oppretter, setOppretter] = useState(false)
  const [opprettFeil, setOpprettFeil] = useState(null)

  // Åpen runde
  const [apenRunde, setApenRunde] = useState(null)
  const [mottakere, setMottakere] = useState([])
  const [henterMott, setHenterMott] = useState(false)
  const [genererer, setGenererer] = useState(false)
  const [genResultat, setGenResultat] = useState(null)
  const [bekreftSlett, setBekreftSlett] = useState(null)
  const [sletter, setSletter] = useState(false)
  // Utsending (DEL C) + status-styring
  const [statusJobber, setStatusJobber] = useState(null)   // runde-id som får statusendring
  const [sender, setSender] = useState(null)               // runde-id som sender/tørrkjører
  const [sendResultat, setSendResultat] = useState(null)   // { runde_id, ...svar }
  const [forhandsvis, setForhandsvis] = useState(null)     // { runde_id, emne, html } eller null
  const [testEpost, setTestEpost] = useState('')
  // Purring (DEL: manuell påminnelse) — egne tilstander så de ikke blander seg med utsending.
  const [purrer, setPurrer] = useState(null)               // runde-id som purrer/tørrkjører purring
  const [purreResultat, setPurreResultat] = useState(null) // { runde_id, ...svar }
  const [forhandsvisPurre, setForhandsvisPurre] = useState(null) // { runde_id, antall, forste }

  useEffect(() => { hentAlt(false) }, [])

  async function hentAlt(stille = true) {
    if (!stille) setLaster(true)
    setFeil(null)
    const [undRes, spRes, runderRes, skolerRes, mottRes, svarRes] = await Promise.all([
      supabase.from('skoleus_undersokelse').select('id, navn, beskrivelse, er_mal, opprettet_at'),
      supabase.from('skoleus_sporsmal').select('undersokelse_id'),
      supabase.from('skoleus_runder').select('id, navn, status, maalgruppe, mottaker_rolle, undersokelse_id, opprettet_at, lukket_at').order('opprettet_at', { ascending: false }),
      supabase.from('skoler').select('status, fylke, kommunenavn, type, nettverk'),
      supabase.from('skoleus_mottaker').select('runde_id'),
      supabase.from('skoleus_svar').select('runde_id'),
    ])
    if (undRes.error) { setFeil(undRes.error.message); setLaster(false); return }

    // Undersøkelser: mal først, så nyeste.
    const und = (undRes.data ?? []).slice().sort((a, b) => {
      if (a.er_mal !== b.er_mal) return a.er_mal ? -1 : 1
      return new Date(b.opprettet_at) - new Date(a.opprettet_at)
    })
    setUndersokelser(und)

    const spCount = {}
    for (const s of (spRes.data ?? [])) spCount[s.undersokelse_id] = (spCount[s.undersokelse_id] || 0) + 1
    setSporsmalAntall(spCount)

    setRunder(runderRes.data ?? [])

    // Distinkte verdier per akse hentes LIVE fra skoler (ansatt har lesetilgang) — aldri hardkodet.
    const skolerRader = skolerRes.data ?? []
    const distinkt = (kol) => [...new Set(skolerRader.map(s => s[kol]).filter(v => v && String(v).trim() !== ''))]
      .sort((a, b) => String(a).localeCompare(String(b), 'nb'))
    setSkoleFelter({
      status: distinkt('status'),
      fylke: distinkt('fylke'),
      kommune: distinkt('kommunenavn'),
      type: distinkt('type'),
      nettverk: distinkt('nettverk'),
    })

    const mCount = {}
    for (const m of (mottRes.data ?? [])) mCount[m.runde_id] = (mCount[m.runde_id] || 0) + 1
    setMottakerAntall(mCount)
    const sCount = {}
    for (const s of (svarRes.data ?? [])) sCount[s.runde_id] = (sCount[s.runde_id] || 0) + 1
    setSvarAntall(sCount)

    // Default undersøkelse i «Opprett runde» + «Ny fra mal»-kilde = standardmalen.
    // «Ny fra mal»-kilde: standardmalen. «Opprett runde»: default første IKKE-mal-undersøkelse
    // (en mal skal aldri kunne kjøres direkte som runde).
    const mal = und.find(u => u.er_mal) || und[0]
    if (mal) setMalKilde(prev => prev || mal.id)
    const forsteIkkeMal = und.find(u => !u.er_mal)
    if (forsteIkkeMal) setNyUndersokelse(prev => prev || forsteIkkeMal.id)
    setLaster(false)
  }

  // En undersøkelse er «i bruk»/låst hvis den har en runde med status ≠ utkast
  // ELLER en runde med svar.
  function erLaast(undId) {
    const rForU = runder.filter(r => r.undersokelse_id === undId)
    return rForU.some(r => r.status !== 'utkast' || (svarAntall[r.id] || 0) > 0)
  }

  async function nyFraMal() {
    if (!malKilde) return
    if (malNavn.trim() === '') { setFeil('Gi den nye undersøkelsen et navn.'); return }
    setJobber(true)
    const { data, error } = await supabase.rpc('skoleus_kopier_undersokelse', { p_kilde: malKilde, p_navn: malNavn.trim() })
    setJobber(false)
    if (error) { setFeil(error.message); return }
    const nyId = Array.isArray(data) ? data[0] : data
    setMalDialog(false); setMalNavn('')
    await hentAlt()
    if (nyId) setValgtEditor(nyId)
  }

  async function nyTom() {
    if (tomNavn.trim() === '') { setFeil('Gi undersøkelsen et navn.'); return }
    setJobber(true)
    const { data, error } = await supabase.from('skoleus_undersokelse')
      .insert({ navn: tomNavn.trim(), er_mal: false }).select('id').single()
    setJobber(false)
    if (error) { setFeil(error.message); return }
    setTomDialog(false); setTomNavn('')
    await hentAlt()
    if (data?.id) setValgtEditor(data.id)
  }

  function startKopiFra(kildeId) {
    setMalKilde(kildeId)
    setMalNavn('')
    setMalDialog(true)
    setValgtEditor(null)
  }

  function toggleFilter(key, v) {
    setFilter(prev => {
      const cur = prev[key] || []
      const ny = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]
      return { ...prev, [key]: ny }
    })
  }
  // Bygg jsonb-filteret: ta bare med akser som faktisk har verdier ({} = alle skoler).
  function byggFilterObjekt() {
    const mg = {}
    for (const a of AKSER) if (filter[a.key]?.length) mg[a.key] = filter[a.key]
    return mg
  }
  const antallValgt = AKSER.reduce((n, a) => n + (filter[a.key]?.length || 0), 0)

  async function opprettRunde(e) {
    e?.preventDefault()
    setOpprettFeil(null)
    if (nyNavn.trim() === '') { setOpprettFeil('Gi runden et navn.'); return }
    if (!nyUndersokelse) { setOpprettFeil('Velg en undersøkelse.'); return }
    setOppretter(true)
    const { error } = await supabase.from('skoleus_runder').insert({
      navn: nyNavn.trim(),
      status: 'utkast',
      maalgruppe: byggFilterObjekt(),
      mottaker_rolle: nyRolle,
      undersokelse_id: nyUndersokelse,
    })
    setOppretter(false)
    if (error) { setOpprettFeil(error.message); return }
    setNyNavn(''); setFilter(TOMT_FILTER); setNyRolle('hovedkontakt')
    hentAlt()
  }

  async function apneRunde(id) {
    if (apenRunde === id) { setApenRunde(null); return }
    setApenRunde(id); setGenResultat(null); setMottakere([]); setHenterMott(true)
    const { data } = await supabase.from('skoleus_mottaker')
      .select('id, navn, epost, rolle, opprettet_at, sendt_at, svart_at, purring_sendt_at, skoler(navn)')
      .eq('runde_id', id).order('opprettet_at', { ascending: true })
    setMottakere(data ?? []); setHenterMott(false)
  }

  async function genererMottakere(id) {
    setGenererer(true); setGenResultat(null)
    const { data, error } = await supabase.rpc('skoleus_opprett_mottakere', { p_runde: id })
    setGenererer(false)
    if (error) { setGenResultat({ feil: error.message }); return }
    const rad = Array.isArray(data) ? data[0] : data
    setGenResultat({ opprettet: rad?.opprettet ?? 0, hoppet_over: rad?.hoppet_over ?? 0 })
    const { data: m } = await supabase.from('skoleus_mottaker')
      .select('id, navn, epost, rolle, opprettet_at, sendt_at, svart_at, purring_sendt_at, skoler(navn)')
      .eq('runde_id', id).order('opprettet_at', { ascending: true })
    setMottakere(m ?? [])
    setMottakerAntall(prev => ({ ...prev, [id]: (m ?? []).length }))
  }

  // Sett runde-status (utkast → aktiv → lukket). Direkte via supabase (RLS: ansatt/superadmin).
  async function settStatus(id, nyStatus) {
    setStatusJobber(id); setFeil(null)
    const patch = { status: nyStatus }
    if (nyStatus === 'lukket') patch.lukket_at = new Date().toISOString()
    const { error } = await supabase.from('skoleus_runder').update(patch).eq('id', id)
    setStatusJobber(null)
    if (error) { setFeil(error.message); return }
    hentAlt()
  }

  // Tørrkjør eller ekte utsending av en runde (DEL C — api/skoleus/send-runde.js).
  async function sendRunde(id, torrkjoring) {
    setSender(id); setSendResultat(null); setFeil(null)
    try {
      const res = await adminFetch('/api/skoleus/send-runde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runde_id: id, torrkjoring }),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data?.error || 'Utsending feilet.'); setSender(null); return }
      setSendResultat({ runde_id: id, ...data })
    } catch (e) {
      setFeil('Kunne ikke nå utsendingstjenesten: ' + (e?.message || 'ukjent feil'))
    }
    setSender(null)
    hentAlt()
  }

  // Send én test-e-post til én adresse (ekte sending til testadressen, ingen skriving).
  async function sendTest(id) {
    const adr = testEpost.trim()
    if (!adr) { setFeil('Skriv inn en testadresse først.'); return }
    setSender(id); setSendResultat(null); setFeil(null)
    try {
      const res = await adminFetch('/api/skoleus/send-runde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runde_id: id, torrkjoring: false, test_epost: adr }),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data?.error || 'Testsending feilet.'); setSender(null); return }
      setSendResultat({ runde_id: id, test: true, ...data })
    } catch (e) {
      setFeil('Kunne ikke nå utsendingstjenesten: ' + (e?.message || 'ukjent feil'))
    }
    setSender(null)
  }

  // Forhåndsvis e-posten slik mottakerne får den (tørrkjøring gir emne + lenke pr. mottaker).
  async function forhandsvisEpost(id) {
    setSender(id); setForhandsvis(null); setFeil(null)
    try {
      const res = await adminFetch('/api/skoleus/send-runde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runde_id: id, torrkjoring: true }),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data?.error || 'Kunne ikke bygge forhåndsvisning.'); setSender(null); return }
      const forste = (data.forhandsvisning || [])[0] || null
      setForhandsvis({ runde_id: id, antall: data.ville_sendt_antall ?? 0, forste })
    } catch (e) {
      setFeil('Kunne ikke nå utsendingstjenesten: ' + (e?.message || 'ukjent feil'))
    }
    setSender(null)
  }

  // Tørrkjør eller ekte purring av en runde (api/skoleus/send-purring.js).
  // Speiler sendRunde eksakt, men mot purre-ruten (kun de som ikke har svart).
  async function sendPurring(id, torrkjoring) {
    setPurrer(id); setPurreResultat(null); setFeil(null)
    try {
      const res = await adminFetch('/api/skoleus/send-purring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runde_id: id, torrkjoring }),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data?.error || 'Purring feilet.'); setPurrer(null); return }
      setPurreResultat({ runde_id: id, ...data })
    } catch (e) {
      setFeil('Kunne ikke nå purre-tjenesten: ' + (e?.message || 'ukjent feil'))
    }
    setPurrer(null)
    hentAlt()
  }

  // Forhåndsvis purre-eposten slik de som ikke har svart får den (tørrkjøring).
  async function forhandsvisPurring(id) {
    setPurrer(id); setForhandsvisPurre(null); setFeil(null)
    try {
      const res = await adminFetch('/api/skoleus/send-purring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runde_id: id, torrkjoring: true }),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data?.error || 'Kunne ikke bygge forhåndsvisning.'); setPurrer(null); return }
      const forste = (data.forhandsvisning || [])[0] || null
      setForhandsvisPurre({ runde_id: id, antall: data.ville_sendt_antall ?? 0, forste })
    } catch (e) {
      setFeil('Kunne ikke nå purre-tjenesten: ' + (e?.message || 'ukjent feil'))
    }
    setPurrer(null)
  }

  async function slettRunde(id) {
    const r = runder.find(x => x.id === id)
    if (!r || r.status !== 'utkast') { setBekreftSlett(null); return }
    setSletter(true); setFeil(null)
    const { count, error: cErr } = await supabase.from('skoleus_svar')
      .select('id', { count: 'exact', head: true }).eq('runde_id', id)
    if (cErr) { setFeil(cErr.message); setSletter(false); setBekreftSlett(null); return }
    if ((count || 0) > 0) { setFeil('Runden har svar og kan ikke slettes.'); setSletter(false); setBekreftSlett(null); hentAlt(); return }
    await supabase.from('skoleus_mottaker').delete().eq('runde_id', id)
    const { error } = await supabase.from('skoleus_runder').delete().eq('id', id)
    setSletter(false); setBekreftSlett(null)
    if (error) { setFeil(error.message); return }
    if (apenRunde === id) setApenRunde(null)
    hentAlt()
  }

  async function slettUndersokelse(u) {
    // Bare ikke-mal, uten runder (FK NO ACTION ville uansett blokkere). Spørsmål cascader.
    const iBruk = runder.some(r => r.undersokelse_id === u.id)
    if (u.er_mal || iBruk) return
    await supabase.from('skoleus_undersokelse').delete().eq('id', u.id)
    if (valgtEditor === u.id) setValgtEditor(null)
    hentAlt()
  }

  const valgtUnd = undersokelser.find(u => u.id === valgtEditor) || null
  const ikkeMalUndersokelser = undersokelser.filter(u => !u.er_mal)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-orange-ink mb-1">Spørreundersøkelse til skolene</h1>
        <p className="text-gray-500">
          Bygg undersøkelser (fra mal eller fra bunnen), rediger spørsmålene, og kjør dem som runder til skolene.
        </p>
      </div>

      {feil && <p className="text-pink-700 bg-pink-50 border border-pink-200 rounded-lg py-3 px-4" role="alert">{feil}</p>}

      {/* ── Undersøkelser ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Undersøkelser</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setMalDialog(v => !v); setTomDialog(false) }} className={sekundærKnapp}>Ny fra mal</button>
            <button type="button" onClick={() => { setTomDialog(v => !v); setMalDialog(false) }} className={sekundærKnapp}>Ny tom</button>
          </div>
        </div>

        {malDialog && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kopier fra</label>
              <select value={malKilde} onChange={e => setMalKilde(e.target.value)} className={inputKlasse + ' bg-white'}>
                {undersokelser.map(u => <option key={u.id} value={u.id}>{u.navn}{u.er_mal ? ' (mal)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Navn på ny undersøkelse</label>
              <input type="text" value={malNavn} onChange={e => setMalNavn(e.target.value)} className={inputKlasse} placeholder="f.eks. Ungdomsskoler 2026" />
            </div>
            <button type="button" onClick={nyFraMal} disabled={jobber} className={primærKnapp}>{jobber ? 'Kopierer …' : 'Opprett kopi'}</button>
          </div>
        )}

        {tomDialog && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Navn på ny (tom) undersøkelse</label>
              <input type="text" value={tomNavn} onChange={e => setTomNavn(e.target.value)} className={inputKlasse} placeholder="f.eks. Pilot 2026" />
            </div>
            <button type="button" onClick={nyTom} disabled={jobber} className={primærKnapp}>{jobber ? 'Oppretter …' : 'Opprett tom'}</button>
          </div>
        )}

        {laster ? (
          <p className="text-gray-500">Laster …</p>
        ) : undersokelser.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">Ingen undersøkelser ennå.</div>
        ) : (
          <div className="space-y-2">
            {undersokelser.map(u => {
              const antSp = sporsmalAntall[u.id] || 0
              const iBruk = runder.some(r => r.undersokelse_id === u.id)
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-gray-200 rounded-lg p-4">
                  <div className="flex-1 min-w-[12rem]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{u.navn}</span>
                      {u.er_mal && <span className="inline-block px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">Mal</span>}
                      {iBruk && <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">I bruk</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{antSp} spørsmål · Opprettet {formaterDato(u.opprettet_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setValgtEditor(valgtEditor === u.id ? null : u.id)} className={sekundærKnapp}>
                      {valgtEditor === u.id ? 'Lukk' : (erLaast(u.id) ? 'Se spørsmål' : 'Rediger')}
                    </button>
                    {!u.er_mal && !iBruk && (
                      <button type="button" onClick={() => slettUndersokelse(u)} className="px-3 py-1.5 rounded-lg border border-pink-200 text-sm font-medium text-pink-700 hover:bg-pink-50">Slett</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Editor (åpen undersøkelse) ────────────────────────────────── */}
      {valgtUnd && (
        <SporsmalEditor
          key={valgtUnd.id}
          undersokelse={valgtUnd}
          laast={erLaast(valgtUnd.id)}
          onEndret={() => hentAlt()}
          onLukk={() => setValgtEditor(null)}
          onKopier={startKopiFra}
        />
      )}

      {/* ── Opprett runde ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opprett ny runde</h3>
        {ikkeMalUndersokelser.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
            Lag en undersøkelse fra malen først (se «Undersøkelser» → «Ny fra mal»), så kan du kjøre den som en runde.
          </div>
        ) : (
          <>
            <form onSubmit={opprettRunde} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="rundeNavn" className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                  <input id="rundeNavn" type="text" value={nyNavn} onChange={e => setNyNavn(e.target.value)} placeholder="f.eks. Skoleundersøkelse høst 2026" className={inputKlasse} />
                </div>
                <div>
                  <label htmlFor="rundeUndersokelse" className="block text-sm font-medium text-gray-700 mb-1">Undersøkelse</label>
                  <select id="rundeUndersokelse" value={nyUndersokelse} onChange={e => setNyUndersokelse(e.target.value)} className={inputKlasse + ' bg-white'}>
                    <option value="">Velg undersøkelse …</option>
                    {ikkeMalUndersokelser.map(u => <option key={u.id} value={u.id}>{u.navn}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="rundeRolle" className="block text-sm font-medium text-gray-700 mb-1">Send til</label>
                  <select id="rundeRolle" value={nyRolle} onChange={e => setNyRolle(e.target.value)} className={inputKlasse + ' bg-white'}>
                    {MOTTAKER_ROLLE_VALG.map(r => <option key={r} value={r}>{MOTTAKER_ROLLE_ETIKETT[r]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="text-sm font-medium text-gray-700">Målgruppe (filter)</span>
                  <span className="text-xs text-gray-500">Treffer: {filterSammendrag(byggFilterObjekt())}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {AKSER.map(a => (
                    <FilterAkse key={a.key} tittel={a.tittel} alternativer={skoleFelter[a.key]} valgt={filter[a.key]} onToggle={(v) => toggleFilter(a.key, v)} />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={oppretter || !nyUndersokelse} className={primærKnapp}>
                  {oppretter ? 'Oppretter …' : 'Opprett runde'}
                </button>
                {antallValgt > 0 && (
                  <button type="button" onClick={() => setFilter(TOMT_FILTER)} className="text-sm text-gray-500 hover:text-gray-800">Nullstill filter</button>
                )}
              </div>
            </form>
            {opprettFeil && <p className="mt-3 text-sm text-pink-700">{opprettFeil}</p>}
            <p className="mt-3 text-xs text-gray-500">
              En runde kjører én undersøkelse. «Send til» styrer hvilken kontakt hver skole får runden på
              (rektor/TL-ansvarlig treffer rektor_epost/htla_epost direkte; skoler uten den adressen hoppes over).
              Målgruppe-filteret AND-es: velger du flere akser, må en skole matche alle. Tomt filter = alle skoler.
              Maler kan ikke kjøres direkte — kopier først («Ny fra mal»).
            </p>
          </>
        )}
      </div>

      {/* ── Runder ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Runder</h3>
        {laster ? (
          <p className="text-gray-500">Laster …</p>
        ) : runder.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">Ingen runder ennå. Opprett den første over.</div>
        ) : (
          <div className="space-y-3">
            {runder.map(r => {
              const antMott = mottakerAntall[r.id] || 0
              const antSvar = svarAntall[r.id] || 0
              const kanSlettes = r.status === 'utkast' && antSvar === 0
              const erApen = apenRunde === r.id
              const undNavn = undersokelser.find(u => u.id === r.undersokelse_id)?.navn
              return (
                <div key={r.id} className="border border-gray-200 rounded-lg">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="flex-1 min-w-[12rem]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{r.navn}</span>
                        <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + (STATUS_KLASSE[r.status] || 'bg-gray-100 text-gray-700')}>
                          {STATUS_ETIKETT[r.status] || r.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {undNavn ? `${undNavn} · ` : ''}Send til {MOTTAKER_ROLLE_ETIKETT[r.mottaker_rolle] || r.mottaker_rolle || 'Hovedkontakt'} · {filterSammendrag(r.maalgruppe)} · Opprettet {formaterDato(r.opprettet_at)} · {antMott} mottaker{antMott === 1 ? '' : 'e'}
                        {antSvar > 0 ? ` · ${antSvar} svar` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'utkast' && (
                        <button type="button" onClick={() => settStatus(r.id, 'aktiv')} disabled={statusJobber === r.id} className={primærKnapp}>
                          {statusJobber === r.id ? '…' : 'Aktiver'}
                        </button>
                      )}
                      {r.status === 'aktiv' && (
                        <button type="button" onClick={() => settStatus(r.id, 'lukket')} disabled={statusJobber === r.id} className={sekundærKnapp}>
                          {statusJobber === r.id ? '…' : 'Lukk runde'}
                        </button>
                      )}
                      <button type="button" onClick={() => apneRunde(r.id)} className={sekundærKnapp}>{erApen ? 'Lukk' : 'Åpne'}</button>
                      {kanSlettes && (
                        bekreftSlett === r.id ? (
                          <span className="flex items-center gap-1">
                            <button type="button" onClick={() => slettRunde(r.id)} disabled={sletter} className="px-3 py-1.5 rounded-lg bg-pink-600 text-white text-sm font-medium disabled:opacity-40">{sletter ? 'Sletter …' : 'Bekreft sletting'}</button>
                            <button type="button" onClick={() => setBekreftSlett(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900">Avbryt</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setBekreftSlett(r.id)} className="px-3 py-1.5 rounded-lg border border-pink-200 text-sm font-medium text-pink-700 hover:bg-pink-50">Slett</button>
                        )
                      )}
                    </div>
                  </div>

                  {erApen && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/60">
                      {antSvar > 0 && (
                        <div className="mb-4">
                          <SkoleusResultatEffekt rundeId={r.id} />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <button type="button" onClick={() => genererMottakere(r.id)} disabled={genererer} className={primærKnapp}>
                          {genererer ? 'Genererer …' : antMott > 0 ? 'Regenerer mottakere' : 'Generer mottakere'}
                        </button>
                        {genResultat && !genResultat.feil && (
                          <span className="text-sm text-gray-700">{filterSammendrag(r.maalgruppe)} · {genResultat.opprettet} opprettet · {genResultat.hoppet_over} hoppet over (uten e-post)</span>
                        )}
                        {genResultat?.feil && <span className="text-sm text-pink-700">{genResultat.feil}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Regenerer rett før utsending hvis det har gått tid — adressen fryses ved generering. Gjentatt generering dubler ikke (én hovedkontakt per skole).</p>
                      {henterMott ? (
                        <p className="text-sm text-gray-500">Henter mottakere …</p>
                      ) : mottakere.length === 0 ? (
                        <p className="text-sm text-gray-500">Ingen mottakere ennå. Trykk «Generer mottakere».</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                              <tr><th className="px-4 py-2">Skole</th><th className="px-4 py-2">Kontakt</th><th className="px-4 py-2">E-post</th><th className="px-4 py-2">Kilde</th></tr>
                            </thead>
                            <tbody>
                              {mottakere.map(m => (
                                <tr key={m.id} className="border-t border-gray-100">
                                  <td className="px-4 py-2 font-medium">{m.skoler?.navn || '—'}</td>
                                  <td className="px-4 py-2 text-gray-700">{m.navn || '—'}</td>
                                  <td className="px-4 py-2 text-gray-600">{m.epost || '—'}</td>
                                  <td className="px-4 py-2 text-gray-500">{KILDE_ETIKETT[m.rolle] || m.rolle || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* ── Utsending (DEL C) ─────────────────────────────── */}
                      <div className="mt-5 pt-5 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Utsending</h4>
                        {r.status !== 'aktiv' ? (
                          <p className="text-sm text-gray-500">Aktiver runden før du sender. (Tørrkjøring og forhåndsvisning krever heller ikke aktiv, men ekte utsending gjør.)</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <button type="button" onClick={() => forhandsvisEpost(r.id)} disabled={sender === r.id} className={sekundærKnapp}>
                            Se e-posten slik mottakerne får den
                          </button>
                          <button type="button" onClick={() => sendRunde(r.id, true)} disabled={sender === r.id} className={sekundærKnapp}>
                            {sender === r.id ? 'Jobber …' : 'Tørrkjør (vis hvem som ville fått)'}
                          </button>
                          {r.status === 'aktiv' && (
                            <button type="button" onClick={() => sendRunde(r.id, false)} disabled={sender === r.id} className={primærKnapp}>
                              {sender === r.id ? 'Sender …' : 'Send runde'}
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <input
                            type="email"
                            value={testEpost}
                            onChange={(e) => setTestEpost(e.target.value)}
                            placeholder="test@adresse.no"
                            className={inputKlasse + ' max-w-xs'}
                          />
                          <button type="button" onClick={() => sendTest(r.id)} disabled={sender === r.id} className={sekundærKnapp}>
                            Send test til én adresse
                          </button>
                        </div>

                        {forhandsvis && forhandsvis.runde_id === r.id && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                            <p className="text-gray-700 mb-1"><span className="font-medium">{forhandsvis.antall}</span> mottaker(e) ville fått e-post.</p>
                            {forhandsvis.forste ? (
                              <div className="text-gray-600">
                                <p><span className="font-medium">Emne:</span> {forhandsvis.forste.emne}</p>
                                <p><span className="font-medium">Til (eksempel):</span> {forhandsvis.forste.mottaker_epost}</p>
                                <p className="break-all"><span className="font-medium">Lenke:</span> {forhandsvis.forste.lenke}</p>
                              </div>
                            ) : <p className="text-gray-500">Ingen mottakere å vise ennå — generer mottakere først.</p>}
                          </div>
                        )}

                        {sendResultat && sendResultat.runde_id === r.id && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                            {sendResultat.test ? (
                              <p>{sendResultat.ok ? `Test sendt til ${sendResultat.test_epost}.` : `Test feilet: ${sendResultat.feil || ''}`}</p>
                            ) : sendResultat.torrkjoring ? (
                              <p>Tørrkjøring: {sendResultat.ville_sendt_antall ?? 0} ville fått e-post · {(sendResultat.hoppet_over || []).length} hoppet over.</p>
                            ) : (
                              <p>Sendt: {sendResultat.sendt_antall ?? 0} · hoppet over: {(sendResultat.hoppet_over || []).length} · feilet: {(sendResultat.feilet || []).length}.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Purring (manuell påminnelse til de som ikke har svart) ── */}
                      <div className="mt-5 pt-5 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">Purring</h4>
                          {(() => {
                            const ikkeSvart = mottakere.filter(m => m.sendt_at && !m.svart_at).length
                            const kanPurres = mottakere.filter(m => m.sendt_at && !m.svart_at && !m.purring_sendt_at).length
                            return ikkeSvart > 0 ? (
                              <span className="text-xs text-gray-500">{ikkeSvart} ikke svart{kanPurres !== ikkeSvart ? ` · ${kanPurres} kan purres (resten alt purret)` : ''}</span>
                            ) : null
                          })()}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Sender en påminnelse KUN til mottakere som fikk lenken, ikke har svart, og ikke er purret før.
                          Samme lenke som utsendingen. Ingen purres to ganger.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => forhandsvisPurring(r.id)} disabled={purrer === r.id} className={sekundærKnapp}>
                            Se purre-eposten
                          </button>
                          <button type="button" onClick={() => sendPurring(r.id, true)} disabled={purrer === r.id} className={sekundærKnapp}>
                            {purrer === r.id ? 'Jobber …' : 'Tørrkjør purring – vis hvem som ville fått'}
                          </button>
                          {r.status === 'aktiv' && (
                            <button type="button" onClick={() => sendPurring(r.id, false)} disabled={purrer === r.id} className={primærKnapp}>
                              {purrer === r.id ? 'Sender …' : 'Send purring'}
                            </button>
                          )}
                        </div>

                        {forhandsvisPurre && forhandsvisPurre.runde_id === r.id && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                            <p className="text-gray-700 mb-1"><span className="font-medium">{forhandsvisPurre.antall}</span> mottaker(e) ville fått purring.</p>
                            {forhandsvisPurre.forste ? (
                              <div className="text-gray-600">
                                <p><span className="font-medium">Emne:</span> {forhandsvisPurre.forste.emne}</p>
                                <p><span className="font-medium">Til (eksempel):</span> {forhandsvisPurre.forste.mottaker_epost}</p>
                                <p className="break-all"><span className="font-medium">Lenke:</span> {forhandsvisPurre.forste.lenke}</p>
                              </div>
                            ) : <p className="text-gray-500">Ingen å purre nå — alle har enten svart eller er alt purret.</p>}
                          </div>
                        )}

                        {purreResultat && purreResultat.runde_id === r.id && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                            {purreResultat.torrkjoring ? (
                              <p>Tørrkjøring: {purreResultat.ville_sendt_antall ?? 0} ville fått purring · {(purreResultat.hoppet_over || []).length} hoppet over.</p>
                            ) : (
                              <p>Purret: {purreResultat.sendt_antall ?? 0} · hoppet over: {(purreResultat.hoppet_over || []).length} · feilet: {(purreResultat.feilet || []).length}.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
