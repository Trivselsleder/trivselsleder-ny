import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ALLE_FYLKER, FYLKER_KOMMUNER, ALLE_KOMMUNER } from '../data/norgeKommuner'
import { SkoleRedigerForm } from '../components/SkoleRedigerForm'

const TYPE_LABEL = {
  barnehage:    'Barnehage',
  barnetrinn:   'Barnetrinn',
  ungdomstrinn: 'Ungdomstrinn',
  kombinert:    'Kombinertskole',
  SFO:          'SFO',
}
const TYPE_VALG = ['barnehage', 'barnetrinn', 'ungdomstrinn', 'kombinert', 'SFO']

const STATUS_VALG = ['Påmeldt', 'Aktiv', 'Aktiv sagt opp', 'Pause', 'Tidligere', 'Potensielle']

const STATUS_STIL = {
  'Påmeldt':        'bg-yellow-100 text-yellow-700',
  'Aktiv':          'bg-green-100 text-green-700',
  'Aktiv sagt opp': 'bg-orange-100 text-orange-700',
  'Pause':          'bg-blue-100 text-blue-700',
  'Tidligere':      'bg-gray-100 text-gray-600',
  'Potensielle':    'bg-purple-100 text-purple-700',
}

function eksporterCSV(skoler) {
  const tlaKol = [1, 2, 3, 4, 5].flatMap(n => [
    `TL-ansvarlig ${n} Navn`,
    `TL-ansvarlig ${n} E-post`,
    `TL-ansvarlig ${n} Telefon`,
  ])
  const kolonner = [
    'Skolenavn', 'Org.nr', 'Gateadresse', 'Postnummer', 'Poststed', 'Kommune', 'Fylke',
    'Type', 'Status', 'Nettverk', 'Ansvarlig RA', 'Antall elever',
    'Rektor navn', 'Rektor e-post', 'Rektor telefon',
    'Hovedkontakt TL navn', 'Hovedkontakt TL e-post', 'Hovedkontakt TL telefon',
    ...tlaKol,
  ]
  const rader = skoler.map(s => {
    const tla = s.tla_kontakter ?? []
    const tlaFelter = [0, 1, 2, 3, 4].flatMap(i => [
      tla[i]?.navn     ?? '',
      tla[i]?.epost    ?? '',
      tla[i]?.telefon  ?? '',
    ])
    return [
      s.navn           ?? '',
      s.org_nr         ?? '',
      s.gateadresse    ?? '',
      s.postnummer     ?? '',
      s.poststed       ?? '',
      s.kommunenavn    ?? '',
      s.fylke          ?? '',
      s.type ? (TYPE_LABEL[s.type] ?? s.type) : '',
      s.status         ?? '',
      s.nettverk       ?? '',
      s.ansvarlig      ?? '',
      s.antall_elever  ?? '',
      s.rektor_navn    ?? '',
      s.rektor_epost   ?? '',
      s.rektor_telefon ?? '',
      s.hktl_navn      ?? '',
      s.hktl_epost     ?? '',
      s.hktl_telefon   ?? '',
      ...tlaFelter,
    ]
  })
  const csv = [kolonner, ...rader]
    .map(rad => rad.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skoler-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Multiselect for Type med chips
function TypeMultiselect({ value, onChange }) {
  const [aapen, setAapen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleKlikk(e) {
      if (ref.current && !ref.current.contains(e.target)) setAapen(false)
    }
    document.addEventListener('mousedown', handleKlikk)
    return () => document.removeEventListener('mousedown', handleKlikk)
  }, [])

  function toggle(type) {
    onChange(value.includes(type) ? value.filter(t => t !== type) : [...value, type])
  }

  const triggerLabel =
    value.length === 0 ? 'Alle'
    : value.length === TYPE_VALG.length ? 'Alle valgt'
    : `${value.length} valgt`

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-xs font-medium text-gray-500">Type</label>
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="relative">
          <button
            onMouseDown={() => setAapen(v => !v)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white hover:border-[#F47920] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#F47920]/30"
          >
            {triggerLabel}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={aapen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          </button>
          {aapen && (
            <ul className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-44">
              {TYPE_VALG.map(t => (
                <li key={t}>
                  <button
                    onMouseDown={() => toggle(t)}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      value.includes(t) ? 'bg-[#F47920] border-[#F47920]' : 'border-gray-300'
                    }`}>
                      {value.includes(t) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {TYPE_LABEL[t]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F47920]/10 text-[#F47920] border border-[#F47920]/20">
            {TYPE_LABEL[t]}
            <button
              onClick={() => onChange(value.filter(v => v !== t))}
              className="text-[#F47920]/60 hover:text-[#F47920] ml-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

// Søkbar combobox-komponent
function Combobox({ label, value, onChange, alternativer, labelFn, disabled = false }) {
  const [aapen, setAapen] = useState(false)
  const [soek, setSoek] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handleKlikk(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAapen(false)
        setSoek('')
      }
    }
    document.addEventListener('mousedown', handleKlikk)
    return () => document.removeEventListener('mousedown', handleKlikk)
  }, [])

  const visNavn = value ? (labelFn ? labelFn(value) : value) : ''

  const filtrerte = soek
    ? alternativer.filter(a =>
        (labelFn ? labelFn(a) : a).toLowerCase().includes(soek.toLowerCase())
      )
    : alternativer

  function velg(v) {
    onChange(v)
    setAapen(false)
    setSoek('')
  }

  function nullstill(e) {
    e.preventDefault()
    e.stopPropagation()
    onChange('')
    setAapen(false)
    setSoek('')
  }

  return (
    <div className={`flex flex-col gap-1 min-w-44 ${disabled ? 'opacity-40 pointer-events-none' : ''}`} ref={ref}>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={aapen ? soek : visNavn}
          placeholder="Alle"
          onFocus={() => { setAapen(true); setSoek('') }}
          onChange={e => { setSoek(e.target.value); setAapen(true) }}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920] cursor-pointer"
        />
        {value && !aapen ? (
          <button
            onMouseDown={nullstill}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={aapen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        )}

        {aapen && (
          <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {filtrerte.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">Ingen treff</li>
            ) : (
              filtrerte.map(a => (
                <li key={a}>
                  <button
                    onMouseDown={() => velg(a)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      value === a
                        ? 'bg-[#F47920]/10 text-[#F47920] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {labelFn ? labelFn(a) : a}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

const RESULTAT_LABEL = {
  invitert:   { tekst: 'invitert',                              stil: 'text-green-600' },
  eksisterer: { tekst: 'allerede registrert – knyttet til skolen', stil: 'text-blue-600' },
  feil:       { tekst: 'feil ved invitasjon',                   stil: 'text-red-600' },
}

const TOM_FORM = {
  navn: '', orgNr: '', fylke: '', kommunenavn: '', type: '', status: 'Aktiv', ansvarlig: '',
  htlaNavn: '', htlaEpost: '', tlaNavn: '', tlaEpost: '',
}

function InputFelt({ label, type = 'text', value, onChange, required = false, placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
      />
    </div>
  )
}

function OpprettSkoleModal({ onLukk, onOpprettet }) {
  const [form, setForm] = useState(TOM_FORM)
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')
  const [resultat, setResultat] = useState(null)

  function felt(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function settFylke(v) {
    setForm(f => {
      const kommunerIFylke = FYLKER_KOMMUNER[v] ?? []
      return {
        ...f,
        fylke: v,
        kommunenavn: kommunerIFylke.includes(f.kommunenavn) ? f.kommunenavn : '',
      }
    })
  }

  const kommuneAlternativer = form.fylke ? (FYLKER_KOMMUNER[form.fylke] ?? []) : ALLE_KOMMUNER

  async function send(e) {
    e.preventDefault()
    setFeil('')
    setLaster(true)
    try {
      const res = await fetch('/api/admin/opprett-skole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data.error || 'Noe gikk galt.'); return }
      setResultat(data)
      onOpprettet(data.skole)
    } catch {
      setFeil('Noe gikk galt.')
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Ny skole</h2>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {resultat ? (
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-gray-900">Skole opprettet: {resultat.skole?.navn}</p>
            </div>
            {(resultat.resultater?.htla || resultat.resultater?.tla) && (
              <ul className="text-sm space-y-1 pl-7">
                {resultat.resultater.htla && (
                  <li>
                    <span className="text-gray-500">HTLA ({form.htlaEpost}): </span>
                    <span className={RESULTAT_LABEL[resultat.resultater.htla.status]?.stil ?? ''}>
                      {RESULTAT_LABEL[resultat.resultater.htla.status]?.tekst ?? resultat.resultater.htla.status}
                    </span>
                  </li>
                )}
                {resultat.resultater.tla && (
                  <li>
                    <span className="text-gray-500">TLA ({form.tlaEpost}): </span>
                    <span className={RESULTAT_LABEL[resultat.resultater.tla.status]?.stil ?? ''}>
                      {RESULTAT_LABEL[resultat.resultater.tla.status]?.tekst ?? resultat.resultater.tla.status}
                    </span>
                  </li>
                )}
              </ul>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={onLukk}
                className="bg-[#F47920] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e06910] transition-colors"
              >
                Lukk
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={send} className="px-6 py-5 space-y-5">

            {/* Skoleinfo */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide">Skole</p>
              <InputFelt label="Skolenavn" value={form.navn} onChange={v => felt('navn', v)} required placeholder="Bakke barneskole" />
              <div className="grid grid-cols-2 gap-3">
                <InputFelt label="Org.nr" value={form.orgNr} onChange={v => felt('orgNr', v)} placeholder="123 456 789" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => felt('type', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
                  >
                    <option value="">–</option>
                    {TYPE_VALG.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => felt('status', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
                  >
                    {STATUS_VALG.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <InputFelt label="Ansvarlig" value={form.ansvarlig} onChange={v => felt('ansvarlig', v)} placeholder="Fornavn Etternavn" />
              </div>
            </div>

            {/* Plassering */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide">Plassering</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fylke</label>
                  <select
                    value={form.fylke}
                    onChange={e => settFylke(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
                  >
                    <option value="">–</option>
                    {ALLE_FYLKER.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kommune</label>
                  <select
                    value={form.kommunenavn}
                    onChange={e => felt('kommunenavn', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
                  >
                    <option value="">–</option>
                    {kommuneAlternativer.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Kontakter */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide">
                Kontakter <span className="text-gray-400 font-normal normal-case tracking-normal">– inviteres automatisk</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InputFelt label="HTLA navn" value={form.htlaNavn} onChange={v => felt('htlaNavn', v)} placeholder="Fornavn Etternavn" />
                <InputFelt label="HTLA e-post" type="email" value={form.htlaEpost} onChange={v => felt('htlaEpost', v)} placeholder="htla@skole.no" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputFelt label="TLA navn" value={form.tlaNavn} onChange={v => felt('tlaNavn', v)} placeholder="Fornavn Etternavn" />
                <InputFelt label="TLA e-post" type="email" value={form.tlaEpost} onChange={v => felt('tlaEpost', v)} placeholder="tla@skole.no" />
              </div>
            </div>

            {feil && <p className="text-sm text-red-500">{feil}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onLukk} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Avbryt
              </button>
              <button
                type="submit"
                disabled={laster}
                className="bg-[#F47920] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e06910] transition-colors disabled:opacity-50"
              >
                {laster ? 'Oppretter…' : 'Opprett skole'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function RedigerSkoleModal({ skole, onLukk, onLagret }) {
  const [form, setForm] = useState({
    navn:           skole.navn           ?? '',
    gateadresse:    skole.gateadresse    ?? '',
    postnummer:     skole.postnummer     ?? '',
    poststed:       skole.poststed       ?? '',
    telefon:        skole.telefon        ?? '',
    antall_elever:  skole.antall_elever  ?? '',
    type:           skole.type           ?? '',
    nettverk:       skole.nettverk       ?? '',
    rektor_navn:    skole.rektor_navn    ?? '',
    rektor_epost:   skole.rektor_epost   ?? '',
    rektor_telefon: skole.rektor_telefon ?? '',
    hktl_navn:      skole.hktl_navn      ?? '',
    hktl_epost:     skole.hktl_epost     ?? '',
    hktl_telefon:   skole.hktl_telefon   ?? '',
    tla_kontakter:  (skole.tla_kontakter ?? []).length > 0
      ? skole.tla_kontakter
      : [{ navn: '', epost: '', telefon: '' }],
  })
  const [lagrer, setLagrer] = useState(false)
  const [lagreFeil, setLagreFeil] = useState('')

  function felt(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function settTla(index, felt, val) {
    setForm(f => {
      const liste = f.tla_kontakter.map((t, i) => i === index ? { ...t, [felt]: val } : t)
      return { ...f, tla_kontakter: liste }
    })
  }

  function fjernTla(index) {
    setForm(f => ({ ...f, tla_kontakter: f.tla_kontakter.filter((_, i) => i !== index) }))
  }

  function leggTilTla() {
    setForm(f => ({ ...f, tla_kontakter: [...f.tla_kontakter, { navn: '', epost: '', telefon: '' }] }))
  }

  async function lagreEndringer(e) {
    e.preventDefault()
    setLagreFeil('')
    setLagrer(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setLagreFeil('Sesjonen er utløpt — last inn siden på nytt.'); return }
      const res = await fetch('/api/skole/oppdater-skole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          skoleId: skole.id,
          ...form,
          antall_elever: form.antall_elever !== '' ? Number(form.antall_elever) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setLagreFeil(data.error || 'Noe gikk galt.'); return }
      onLagret({ ...skole, ...form, antall_elever: form.antall_elever !== '' ? Number(form.antall_elever) : null })
    } catch {
      setLagreFeil('Noe gikk galt.')
    } finally {
      setLagrer(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{skole.navn}</h2>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <SkoleRedigerForm
            form={form}
            felt={felt}
            settTla={settTla}
            fjernTla={fjernTla}
            leggTilTla={leggTilTla}
            onSubmit={lagreEndringer}
            onAvbryt={onLukk}
            lagrer={lagrer}
            lagreFeil={lagreFeil}
          />
        </div>
      </div>
    </div>
  )
}

export default function AdminSkoler() {
  const [skoler, setSkoler] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [visOpprett, setVisOpprett] = useState(false)
  const [redigerSkole, setRedigerSkole] = useState(null)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterFylke, setFilterFylke] = useState('')
  const [filterKommune, setFilterKommune] = useState('')
  const [filterType, setFilterType] = useState([])
  const [filterAnsvarlig, setFilterAnsvarlig] = useState('')

  useEffect(() => {
    supabase
      .from('skoler')
      .select('*')
      .order('navn', { ascending: true })
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setSkoler(data ?? [])
        setLaster(false)
      })
  }, [])

  // Kommuneliste: alle kommuner i valgt fylke, eller alle norske kommuner
  const kommuneAlternativer = useMemo(() =>
    filterFylke ? (FYLKER_KOMMUNER[filterFylke] ?? []) : ALLE_KOMMUNER,
    [filterFylke]
  )

  // Ansvarlig-alternativer fra databasedata
  const ansvarligAlternativer = useMemo(() =>
    [...new Set(skoler.map(s => s.ansvarlig).filter(Boolean))].sort(),
    [skoler]
  )

  function settFylke(v) {
    setFilterFylke(v)
    // Tilbakestill kommune hvis den ikke finnes i nytt fylke
    if (v && filterKommune && !(FYLKER_KOMMUNER[v] ?? []).includes(filterKommune)) {
      setFilterKommune('')
    }
  }

  const filtrerte = useMemo(() => skoler.filter(s => {
    if (filterStatus    && s.status     !== filterStatus)    return false
    if (filterFylke     && s.fylke      !== filterFylke)     return false
    if (filterKommune   && s.kommunenavn !== filterKommune)  return false
    if (filterType.length > 0 && !filterType.includes(s.type)) return false
    if (filterAnsvarlig && s.ansvarlig  !== filterAnsvarlig) return false
    return true
  }), [skoler, filterStatus, filterFylke, filterKommune, filterType, filterAnsvarlig])

  const harFilter = filterStatus || filterFylke || filterKommune || filterType.length > 0 || filterAnsvarlig

  function nullstillFiltre() {
    setFilterStatus('')
    setFilterFylke('')
    setFilterKommune('')
    setFilterType([])
    setFilterAnsvarlig('')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skoleregister</h1>
            <p className="text-sm text-gray-500 mt-1">
              {laster ? '…' : `${filtrerte.length} av ${skoler.length} skoler`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => eksporterCSV(filtrerte)}
              disabled={laster || filtrerte.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-[#F47920] hover:text-[#F47920] transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Eksporter CSV
            </button>
            <button
              onClick={() => setVisOpprett(true)}
              className="flex items-center gap-2 bg-[#F47920] text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-[#e06910] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ny skole
            </button>
          </div>
        </div>

        {/* Filtre */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <Combobox
              label="Status"
              value={filterStatus}
              onChange={setFilterStatus}
              alternativer={STATUS_VALG}
            />
            <Combobox
              label="Fylke"
              value={filterFylke}
              onChange={settFylke}
              alternativer={ALLE_FYLKER}
            />
            <Combobox
              label="Kommune"
              value={filterKommune}
              onChange={setFilterKommune}
              alternativer={kommuneAlternativer}
              disabled={false}
            />
            <TypeMultiselect
              value={filterType}
              onChange={setFilterType}
            />
            <Combobox
              label="Ansvarlig"
              value={filterAnsvarlig}
              onChange={setFilterAnsvarlig}
              alternativer={ansvarligAlternativer}
            />
            {harFilter && (
              <button
                onClick={nullstillFiltre}
                className="self-end pb-2 text-sm text-gray-400 hover:text-gray-700 underline"
              >
                Nullstill
              </button>
            )}
          </div>
        </div>

        {/* Tabell */}
        {laster ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feil ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-600 text-sm">{feil}</div>
        ) : filtrerte.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
            {skoler.length === 0 ? 'Ingen skoler registrert ennå.' : 'Ingen skoler matcher filteret.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Skolenavn</th>
                    <th className="text-left px-4 py-3">Kommune</th>
                    <th className="text-left px-4 py-3">Fylke</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Ansvarlig</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrerte.map(s => (
                    <tr key={s.id} onClick={() => setRedigerSkole(s)} className="hover:bg-gray-50/70 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.navn}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.kommunenavn ?? '–'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.fylke ?? '–'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {s.type ? (TYPE_LABEL[s.type] ?? s.type) : '–'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.status ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STIL[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {s.status}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.ansvarlig ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!laster && !feil && filtrerte.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Viser {filtrerte.length} av {skoler.length} skoler
          </p>
        )}
      </div>

      {visOpprett && (
        <OpprettSkoleModal
          onLukk={() => setVisOpprett(false)}
          onOpprettet={nySkole => {
            setSkoler(prev => [nySkole, ...prev])
          }}
        />
      )}

      {redigerSkole && (
        <RedigerSkoleModal
          skole={redigerSkole}
          onLukk={() => setRedigerSkole(null)}
          onLagret={oppdatert => {
            setSkoler(prev => prev.map(s => s.id === oppdatert.id ? oppdatert : s))
            setRedigerSkole(null)
          }}
        />
      )}
    </div>
  )
}
