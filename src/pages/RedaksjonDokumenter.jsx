import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { hentAlleDokumenter, hentDokumenttyper, lagreDokument } from '../lib/dokument'

const SPRAK = ['nb', 'nn', 'en'] // dokument_sprak CHECK = nb/nn/en (migr 103 + 114). «en» tillatt fra 114 (beslutning 10. sep).
const STATUSER = ['utkast', 'publisert', 'arkivert']

// Grupper dokumenttypene (to nivåer): forelder + barn.
function byggGrupper(typer) {
  const barn = {}
  for (const t of typer) if (t.forelder_id != null) (barn[t.forelder_id] || (barn[t.forelder_id] = [])).push(t)
  return typer.filter((t) => t.forelder_id == null).map((p) => ({ ...p, barn: barn[p.id] || [] }))
}

export default function RedaksjonDokumenter() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const sok = params.get('sok') || ''
  const fType = params.get('type') || ''
  const fSprak = params.get('sprak') || ''
  const fStatus = params.get('status') || ''

  const [alle, setAlle] = useState(null)
  const [typer, setTyper] = useState([])
  const [feil, setFeil] = useState(null)
  const [apen, setApen] = useState(null)

  async function last() {
    try {
      const [d, ty] = await Promise.all([hentAlleDokumenter(), hentDokumenttyper()])
      setAlle(d); setTyper(ty)
    } catch (e) { setFeil(e.message) }
  }
  useEffect(() => { last() }, [])

  const typeNavn = useMemo(() => Object.fromEntries(typer.map((x) => [x.id, x.navn])), [typer])
  const grupper = useMemo(() => byggGrupper(typer), [typer])

  const filtrert = useMemo(() => {
    if (!alle) return []
    const q = sok.trim().toLowerCase()
    return alle.filter((d) => {
      if (q && !(d.tittel || '').toLowerCase().includes(q)) return false
      if (fType && !d.typeIds.includes(Number(fType))) return false
      if (fSprak && !d.sprak.includes(fSprak)) return false
      if (fStatus && d.status !== fStatus) return false
      return true
    })
  }, [alle, sok, fType, fSprak, fStatus])

  const statusTellere = useMemo(() => {
    const t2 = {}
    for (const d of alle || []) t2[d.status] = (t2[d.status] || 0) + 1
    return t2
  }, [alle])

  function settParam(nokkel, verdi) {
    setParams((p) => { const n = new URLSearchParams(p); verdi ? n.set(nokkel, verdi) : n.delete(nokkel); return n })
  }

  const selCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange'

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/admin/redaksjon" className="text-sm text-orange-ink">← {t('dok.tilbake')}</Link>
      <h1 className="text-3xl font-bold text-orange-ink mt-1 mb-1">{t('dok.tittel')}</h1>
      <p className="text-gray-500 mb-6">{t('dok.undertittel', { n: alle ? alle.length : 0 })}</p>

      {feil && <p className="text-sm text-red-600 mb-3">{feil}</p>}
      {alle === null ? (
        <p className="text-gray-400">{t('dok.laster')}</p>
      ) : (
        <>
          {/* Filtre */}
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <input type="text" value={sok} onChange={(e) => settParam('sok', e.target.value)}
              placeholder={t('dok.sokPlassholder')} aria-label={t('dok.sokPlassholder')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange min-w-[220px]" />
            <select className={selCls} aria-label={t('dok.filterType')} value={fType} onChange={(e) => settParam('type', e.target.value)}>
              <option value="">{t('dok.alleTyper')}</option>
              {grupper.map((g) => (
                <optgroup key={g.id} label={g.navn}>
                  <option value={g.id}>{g.navn}</option>
                  {g.barn.map((b) => <option key={b.id} value={b.id}>— {b.navn}</option>)}
                </optgroup>
              ))}
            </select>
            <select className={selCls} aria-label={t('dok.filterSprak')} value={fSprak} onChange={(e) => settParam('sprak', e.target.value)}>
              <option value="">{t('dok.alleSprak')}</option>
              {SPRAK.map((s) => <option key={s} value={s}>{t('dok.sprak.' + s)}</option>)}
            </select>
            <select className={selCls} aria-label={t('dok.filterStatus')} value={fStatus} onChange={(e) => settParam('status', e.target.value)}>
              <option value="">{t('dok.alleStatus')}</option>
              {STATUSER.map((s) => <option key={s} value={s}>{t('dok.status.' + s)}</option>)}
            </select>
          </div>

          {/* Levende tellere */}
          <p className="text-sm text-gray-500 mb-4">
            {t('dok.teller', { vist: filtrert.length, total: alle.length })}
            {'  ·  '}
            {STATUSER.map((s) => `${t('dok.status.' + s)}: ${statusTellere[s] || 0}`).join('  ·  ')}
          </p>

          {filtrert.length === 0 ? (
            <p className="text-gray-400 py-10 text-center">{alle.length === 0 ? t('dok.tomtProd') : t('dok.ingenTreff')}</p>
          ) : (
            <ul className="space-y-2">
              {filtrert.map((d) => (
                <DokRad key={d.id} d={d} apen={apen === d.id} onToggle={() => setApen(apen === d.id ? null : d.id)}
                  grupper={grupper} typeNavn={typeNavn} onLagret={last} t={t} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function DokRad({ d, apen, onToggle, grupper, typeNavn, onLagret, t }) {
  const { bruker } = useAuth()
  const [tittel, setTittel] = useState(d.tittel || '')
  const [status, setStatus] = useState(d.status)
  const [typeIds, setTypeIds] = useState(() => new Set(d.typeIds))
  const [sprak, setSprak] = useState(() => new Set(d.sprak))
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState(null)
  const [ok, setOk] = useState(false)

  function toggleSet(setter, val) { setter((s) => { const n = new Set(s); n.has(val) ? n.delete(val) : n.add(val); return n }); setOk(false) }

  async function lagre() {
    if (lagrer) return
    setLagrer(true); setFeil(null); setOk(false)
    try {
      await lagreDokument(d.id, { tittel, status, typeIds: [...typeIds], sprak: [...sprak] }, bruker?.id)
      setOk(true); await onLagret()
    } catch (e) { setFeil(e.message) } finally { setLagrer(false) }
  }

  const felt = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange'

  return (
    <li className="border border-gray-200 rounded-xl">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 rounded-xl">
        <span className="min-w-0">
          <span className="font-medium text-gray-900">{d.tittel || t('dok.utenTittel')}</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            {d.filtype && <span className="uppercase">{d.filtype}</span>}
            {' · '}{(d.sprak.join(', ') || '—')}
            {' · '}{(d.typeIds.map((id) => typeNavn[id]).filter(Boolean).join(', ') || t('dok.ingenType'))}
            {d.koApne.length > 0 && <span className="ml-2 text-orange-ink font-semibold">⚑ {t('dok.koFlagg', { n: d.koApne.length })}</span>}
          </span>
        </span>
        <span className="text-xs text-gray-400 shrink-0">{apen ? '▲' : '▼'}</span>
      </button>

      {apen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          {/* Åpne kø-flagg (bl.a. «en»-språkflagget for de 90 dokumentene) */}
          {d.koApne.length > 0 && (
            <div className="text-xs bg-orange/5 border border-orange/20 rounded-lg p-2">
              <p className="font-semibold text-orange-ink">{t('dok.koTittel')}</p>
              <ul className="mt-1 space-y-0.5 text-gray-700">
                {d.koApne.map((k, i) => <li key={i}>{k.beskrivelse || k.type}</li>)}
              </ul>
            </div>
          )}

          <label className="block text-xs text-gray-500">{t('dok.feltTittel')}
            <input type="text" value={tittel} onChange={(e) => { setTittel(e.target.value); setOk(false) }} className={`${felt} mt-0.5`} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-500">{t('dok.feltStatus')}
              <select value={status} onChange={(e) => { setStatus(e.target.value); setOk(false) }} className={`${felt} mt-0.5`}>
                {STATUSER.map((s) => <option key={s} value={s}>{t('dok.status.' + s)}</option>)}
              </select>
            </label>
            <div className="text-xs text-gray-500">{t('dok.feltSprak')}
              <div className="flex gap-3 mt-1.5">
                {SPRAK.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={sprak.has(s)} onChange={() => toggleSet(setSprak, s)} /> {t('dok.sprak.' + s)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Dokumenttyper (flervalg, gruppert) */}
          <div className="text-xs text-gray-500">{t('dok.feltTyper')}
            <div className="mt-1.5 space-y-2 max-h-64 overflow-auto border border-gray-100 rounded-lg p-2">
              {grupper.map((g) => (
                <div key={g.id}>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <input type="checkbox" checked={typeIds.has(g.id)} onChange={() => toggleSet(setTypeIds, g.id)} /> {g.navn}
                  </label>
                  {g.barn.length > 0 && (
                    <div className="ml-5 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {g.barn.map((b) => (
                        <label key={b.id} className="flex items-center gap-1.5 text-sm text-gray-600">
                          <input type="checkbox" checked={typeIds.has(b.id)} onChange={() => toggleSet(setTypeIds, b.id)} /> {b.navn}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Koblede leker (lesbar liste — redigering hører til lek-siden, punkt 4) */}
          <div className="text-xs text-gray-500">{t('dok.koblet')}
            {d.leker.length === 0 ? (
              <p className="text-sm text-gray-400 mt-1">{t('dok.ingenKobling')}</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-2">
                {d.leker.map((l) => (
                  <li key={l.id}>
                    <Link to={`/min-side/aktiviteter/${l.id}`} className="text-sm text-orange-ink hover:underline">{l.tittel || l.id}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {feil && <p className="text-sm text-red-600">{feil}</p>}
          {ok && !feil && <p className="text-sm text-petrol">{t('dok.lagret')}</p>}
          <div className="flex gap-3">
            <button onClick={lagre} disabled={lagrer} className="bg-petrol text-white font-medium px-6 py-2.5 rounded-full hover:bg-petrol/90 transition disabled:opacity-50">
              {lagrer ? t('dok.lagrer') : t('dok.lagre')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
