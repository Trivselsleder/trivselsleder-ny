import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import {
  hentKotellere, hentKorader, lukkRad, tildelRad, lukkGruppe,
  KVITTERING_TYPER, BLOKKERT_TYPER,
} from '../lib/redaksjon'

const STATUSER = ['ny', 'under_arbeid', 'lost', 'avvist']

// Rediger-mål for en rad: ressurs → D3-skjema (aktiv); dokument/samling → kommer (D5/D6, deaktivert).
function redigerMaal(rad) {
  if (rad.ressursId) return { to: `/min-side/aktiviteter/${rad.ressursId}`, aktiv: true }
  if (rad.dokumentId) return { aktiv: false, grunn: 'D5' }
  if (rad.samlingId) return { aktiv: false, grunn: 'D6' }
  return { aktiv: false, grunn: null }
}

export default function RedaksjonKo() {
  const { t } = useTranslation()
  const { bruker } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'ny'
  const valgtType = params.get('type') || ''

  const [tellere, setTellere] = useState({})
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [lasterRader, setLasterRader] = useState(false)
  const [feil, setFeil] = useState(null)
  const [apenRad, setApenRad] = useState(null)
  // Bulk-gate: stikkprøver må ses og bekreftes før «Lukk alle» blir aktiv.
  const [visStikk, setVisStikk] = useState(false)
  const [stikkSett, setStikkSett] = useState(false)
  const [jobber, setJobber] = useState(false)
  const [melding, setMelding] = useState(null)

  async function lastTellere() {
    setTellere(await hentKotellere(status))
  }
  useEffect(() => {
    setLaster(true); setFeil(null)
    lastTellere().catch((e) => setFeil(e.message)).finally(() => setLaster(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function lastRader() {
    if (!valgtType) { setRader([]); return }
    setLasterRader(true); setVisStikk(false); setStikkSett(false)
    try { setRader(await hentKorader(valgtType, status)) }
    catch (e) { setFeil(e.message) }
    finally { setLasterRader(false) }
  }
  useEffect(() => {
    lastRader()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valgtType, status])

  // Grupper: kvitteringstyper først (i fast rekkefølge), så arbeidstyper etter antall.
  const grupper = useMemo(() => {
    const typer = Object.keys(tellere).filter((tp) => tellere[tp] > 0)
    const kvittering = KVITTERING_TYPER.filter((tp) => typer.includes(tp))
    const arbeid = typer.filter((tp) => !KVITTERING_TYPER.includes(tp)).sort((a, b) => tellere[b] - tellere[a])
    return { kvittering, arbeid }
  }, [tellere])

  const totalt = useMemo(() => Object.values(tellere).reduce((a, b) => a + b, 0), [tellere])
  const erKvittering = KVITTERING_TYPER.includes(valgtType)
  const stikkprover = rader.slice(0, 10)

  function velgType(tp) { setParams((p) => { const n = new URLSearchParams(p); n.set('type', tp); return n }) }
  function velgStatus(s) { setParams((p) => { const n = new URLSearchParams(p); n.set('status', s); n.delete('type'); return n }) }
  const visMelding = (tekst) => { setMelding(tekst); window.setTimeout(() => setMelding(null), 3000) }

  async function etterEndring() { await Promise.all([lastTellere(), lastRader()]) }

  async function handling(fn, ok) {
    if (jobber) return
    setJobber(true); setFeil(null)
    try { await fn(); await etterEndring(); if (ok) visMelding(ok) }
    catch (e) { setFeil(e.message) }
    finally { setJobber(false) }
  }

  const typeLabel = (tp) => t('ko.type.' + tp, tp)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-1">
        <Link to="/admin/redaksjon" className="text-sm text-orange-ink">← {t('ko.tilbake')}</Link>
      </div>
      <h1 className="text-3xl font-bold text-orange-ink mb-1">{t('ko.tittel')}</h1>
      <p className="text-gray-500 mb-6">{t('ko.undertittel', { n: totalt })}</p>

      {/* Statusfilter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSER.map((s) => (
          <button key={s} onClick={() => velgStatus(s)}
            className={`text-sm rounded-full px-3 py-1 border ${status === s ? 'bg-petrol text-white border-petrol' : 'bg-white text-gray-700 border-gray-300 hover:border-orange'}`}>
            {t('ko.status.' + s)}
          </button>
        ))}
      </div>

      {feil && <p className="text-sm text-red-600 mb-3">{feil}</p>}
      {melding && <p className="text-sm text-petrol mb-3">{melding}</p>}
      {laster ? (
        <p className="text-gray-400">{t('ko.laster')}</p>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          {/* Venstre: typegrupper med tellere */}
          <div className="space-y-4">
            <TypeGruppe tittel={t('ko.grupper.kvittering')} typer={grupper.kvittering} {...{ tellere, valgtType, velgType, typeLabel, badge: 'kvittering' }} />
            <TypeGruppe tittel={t('ko.grupper.arbeid')} typer={grupper.arbeid} {...{ tellere, valgtType, velgType, typeLabel, badge: 'arbeid' }} />
            {grupper.kvittering.length === 0 && grupper.arbeid.length === 0 && (
              <p className="text-sm text-gray-400">{t('ko.tomGruppe')}</p>
            )}
          </div>

          {/* Høyre: valgt type */}
          <div>
            {!valgtType ? (
              <p className="text-gray-400">{t('ko.velgType')}</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">{typeLabel(valgtType)}</h2>
                  <span className="text-sm text-gray-500">{t('ko.antall', { n: tellere[valgtType] || 0 })}</span>
                </div>

                {/* BULK — kun kvitteringstyper, kun status 'ny', gated bak stikkprøver. */}
                {erKvittering && status === 'ny' && (tellere[valgtType] || 0) > 0 && (
                  <div className="border border-petrol/30 bg-petrol/5 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-800">{t('ko.bulk.tittel')}</p>
                    <p className="text-xs text-gray-600 mt-1">{t('ko.bulk.forklaring', { n: tellere[valgtType] || 0 })}</p>
                    {!visStikk ? (
                      <button onClick={() => setVisStikk(true)}
                        className="mt-3 text-sm border border-petrol text-petrol px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition">
                        {t('ko.bulk.seStikkprover')}
                      </button>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('ko.bulk.stikkproverTittel', { vist: stikkprover.length, n: tellere[valgtType] || 0 })}</p>
                        <ul className="mt-1 space-y-1 max-h-56 overflow-auto">
                          {stikkprover.map((r) => (
                            <li key={r.id} className="text-sm text-gray-700 border-b border-gray-100 pb-1">
                              {r.ressursTittel && <span className="font-medium">{r.ressursTittel}: </span>}
                              {r.beskrivelse || <span className="text-gray-400">—</span>}
                            </li>
                          ))}
                        </ul>
                        <label className="flex items-center gap-2 mt-3 text-sm text-gray-700">
                          <input type="checkbox" checked={stikkSett} onChange={(e) => setStikkSett(e.target.checked)} />
                          {t('ko.bulk.bekreftSett')}
                        </label>
                        <button
                          disabled={!stikkSett || jobber}
                          onClick={() => handling(() => lukkGruppe(valgtType, bruker?.id), t('ko.bulk.lukket', { n: tellere[valgtType] || 0 }))}
                          className="mt-3 text-sm bg-petrol text-white px-5 py-2 rounded-full hover:bg-petrol/90 transition disabled:opacity-50">
                          {t('ko.bulk.lukkAlle', { n: tellere[valgtType] || 0 })}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Radliste */}
                {lasterRader ? (
                  <p className="text-gray-400">{t('ko.laster')}</p>
                ) : rader.length === 0 ? (
                  <p className="text-gray-400">{t('ko.ingenRader')}</p>
                ) : (
                  <ul className="space-y-2">
                    {rader.map((r) => (
                      <Rad key={r.id} r={r} apen={apenRad === r.id} onToggle={() => setApenRad(apenRad === r.id ? null : r.id)}
                        bruker={bruker} jobber={jobber} handling={handling} t={t} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TypeGruppe({ tittel, typer, tellere, valgtType, velgType, typeLabel, badge }) {
  if (!typer.length) return null
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{tittel}</div>
      <div className="space-y-1">
        {typer.map((tp) => (
          <button key={tp} onClick={() => velgType(tp)}
            className={`w-full flex items-center justify-between gap-2 text-left text-sm px-3 py-2 rounded-lg border ${valgtType === tp ? 'border-orange bg-orange/5' : 'border-gray-200 hover:border-orange'}`}>
            <span className={valgtType === tp ? 'text-orange-ink font-medium' : 'text-gray-700'}>{typeLabel(tp)}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge === 'kvittering' ? 'bg-gray-100 text-gray-600' : 'bg-orange/10 text-orange-ink'}`}>{tellere[tp]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Rad({ r, apen, onToggle, bruker, jobber, handling, t }) {
  const maal = redigerMaal(r)
  const mittAnsvar = r.ansvarlig && bruker?.id && r.ansvarlig === bruker.id
  const blokkert = BLOKKERT_TYPER.includes(r.type)
  const lukket = r.status === 'lost' || r.status === 'avvist'

  return (
    <li className="border border-gray-200 rounded-xl">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 rounded-xl">
        <span className="min-w-0">
          {r.ressursTittel && <span className="font-medium text-gray-900">{r.ressursTittel} · </span>}
          <span className="text-sm text-gray-700">{r.beskrivelse || '—'}</span>
        </span>
        <span className="text-xs text-gray-400 shrink-0">{apen ? '▲' : '▼'}</span>
      </button>

      {apen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {r.kompetansemaal && (
            <p className="text-sm text-gray-700">
              <span className="font-mono text-xs text-gray-500">{r.kompetansemaal.kode}</span> {r.kompetansemaal.tekst}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* Rediger-lenke: aktiv for ressurs (D3), «kommer» for dokument/samling (D5/D6). */}
            {maal.aktiv ? (
              <Link to={maal.to} className="text-sm border border-petrol text-petrol px-4 py-2 rounded-full hover:bg-petrol hover:text-white transition">
                {t('ko.rediger')}
              </Link>
            ) : (
              <span className="text-sm border border-dashed border-gray-300 text-gray-400 px-4 py-2 rounded-full cursor-default"
                title={maal.grunn ? t('ko.redigerKommerGrunn', { grunn: maal.grunn }) : ''}>
                {t('ko.redigerKommer')}
              </span>
            )}

            {/* Tildeling (ansvarlig = profil-uuid; «meg») */}
            {!lukket && (
              mittAnsvar ? (
                <button disabled={jobber} onClick={() => handling(() => tildelRad(r.id, null))}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">{t('ko.fjernTildeling')}</button>
              ) : (
                <button disabled={jobber} onClick={() => handling(() => tildelRad(r.id, bruker?.id), t('ko.tildelt'))}
                  className="text-sm text-orange-ink hover:underline px-3 py-2">{t('ko.tildelMeg')}</button>
              )
            )}
            {r.ansvarlig && !mittAnsvar && <span className="text-xs text-gray-400">{t('ko.tildeltAnnen')}</span>}

            {/* Blokkert bekreft (usikker_maalkobling) — vises, men handlingen kommer (krever migrasjon). */}
            {blokkert && (
              <span className="text-sm border border-dashed border-gray-300 text-gray-400 px-4 py-2 rounded-full cursor-default" title={t('ko.bekreftKommerGrunn')}>
                {t('ko.bekreftKommer')}
              </span>
            )}

            {/* Lukk / avvis */}
            {!lukket ? (
              <>
                <button disabled={jobber} onClick={() => handling(() => lukkRad(r.id, 'lost', bruker?.id), t('ko.lukket'))}
                  className="text-sm bg-petrol text-white px-4 py-2 rounded-full hover:bg-petrol/90 transition disabled:opacity-50">{t('ko.lost')}</button>
                <button disabled={jobber} onClick={() => handling(() => lukkRad(r.id, 'avvist', bruker?.id), t('ko.avvistOk'))}
                  className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-full hover:border-tlred hover:text-tlred transition disabled:opacity-50">{t('ko.avvist')}</button>
              </>
            ) : (
              <span className="text-xs text-gray-400">{t('ko.erLukket', { status: t('ko.status.' + r.status) })}</span>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
