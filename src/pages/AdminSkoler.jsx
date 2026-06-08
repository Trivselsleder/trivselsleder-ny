import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ALLE_FYLKER, FYLKER_KOMMUNER, ALLE_KOMMUNER } from '../data/norgeKommuner'

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
  const kolonner = ['Skolenavn', 'Kommune', 'Fylke', 'Type', 'Status', 'Ansvarlig']
  const rader = skoler.map(s => [
    s.navn ?? '',
    s.kommunenavn ?? '',
    s.fylke ?? '',
    s.type ? (TYPE_LABEL[s.type] ?? s.type) : '',
    s.status ?? '',
    s.ansvarlig ?? '',
  ])
  const csv = [kolonner, ...rader]
    .map(rad => rad.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skoler-${new Date().toISOString().slice(0, 10)}.csv`
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

export default function AdminSkoler() {
  const [skoler, setSkoler] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')

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
                    <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
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
    </div>
  )
}
