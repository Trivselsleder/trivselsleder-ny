import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const TYPE_LABEL = {
  barnehage: 'Barnehage',
  barnetrinn: 'Barnetrinn',
  ungdomstrinn: 'Ungdomstrinn',
  kombinert: 'Kombinert',
  SFO: 'SFO',
}

const STATUS_STIL = {
  'Påmeldt':        'bg-yellow-100 text-yellow-700',
  'Aktiv':          'bg-green-100 text-green-700',
  'Aktiv sagt opp': 'bg-orange-100 text-orange-700',
  'Pause':          'bg-blue-100 text-blue-700',
  'Tidligere':      'bg-gray-100 text-gray-600',
  'Potensielle':    'bg-purple-100 text-purple-700',
}

const STATUS_VALG = ['Påmeldt', 'Aktiv', 'Aktiv sagt opp', 'Pause', 'Tidligere', 'Potensielle']

function unike(liste, felt) {
  return [...new Set(liste.map(r => r[felt]).filter(Boolean))].sort()
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
  const csvInnhold = [kolonner, ...rader]
    .map(rad => rad.map(celle => `"${String(celle).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + csvInnhold], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skoler-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminSkoler() {
  const [skoler, setSkoler] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')

  const [filterStatus, setFilterStatus] = useState('')
  const [filterFylke, setFilterFylke] = useState('')
  const [filterKommune, setFilterKommune] = useState('')
  const [filterType, setFilterType] = useState('')
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

  const filtrerte = useMemo(() => skoler.filter(s => {
    if (filterStatus && s.status !== filterStatus) return false
    if (filterFylke && s.fylke !== filterFylke) return false
    if (filterKommune && s.kommunenavn !== filterKommune) return false
    if (filterType && s.type !== filterType) return false
    if (filterAnsvarlig && s.ansvarlig !== filterAnsvarlig) return false
    return true
  }), [skoler, filterStatus, filterFylke, filterKommune, filterType, filterAnsvarlig])

  const fylker = useMemo(() => unike(skoler, 'fylke'), [skoler])
  const kommuner = useMemo(() => {
    const base = filterFylke ? skoler.filter(s => s.fylke === filterFylke) : skoler
    return unike(base, 'kommunenavn')
  }, [skoler, filterFylke])
  const typer = useMemo(() => unike(skoler, 'type'), [skoler])
  const ansvarlige = useMemo(() => unike(skoler, 'ansvarlig'), [skoler])

  function nullstillFiltre() {
    setFilterStatus('')
    setFilterFylke('')
    setFilterKommune('')
    setFilterType('')
    setFilterAnsvarlig('')
  }

  const harFilter = filterStatus || filterFylke || filterKommune || filterType || filterAnsvarlig

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

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
            <FilterSelect
              label="Status"
              value={filterStatus}
              onChange={v => setFilterStatus(v)}
              alternativer={STATUS_VALG}
            />
            <FilterSelect
              label="Fylke"
              value={filterFylke}
              onChange={v => { setFilterFylke(v); setFilterKommune('') }}
              alternativer={fylker}
            />
            <FilterSelect
              label="Kommune"
              value={filterKommune}
              onChange={v => setFilterKommune(v)}
              alternativer={kommuner}
            />
            <FilterSelect
              label="Type"
              value={filterType}
              onChange={v => setFilterType(v)}
              alternativer={typer}
              labelFn={t => TYPE_LABEL[t] ?? t}
            />
            <FilterSelect
              label="Ansvarlig"
              value={filterAnsvarlig}
              onChange={v => setFilterAnsvarlig(v)}
              alternativer={ansvarlige}
            />
            {harFilter && (
              <button
                onClick={nullstillFiltre}
                className="text-sm text-gray-400 hover:text-gray-700 underline pb-0.5"
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

        {!laster && filtrerte.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Viser {filtrerte.length} av {skoler.length} skoler
          </p>
        )}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, alternativer, labelFn }) {
  return (
    <div className="flex flex-col gap-1 min-w-36">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
      >
        <option value="">Alle</option>
        {alternativer.map(a => (
          <option key={a} value={a}>{labelFn ? labelFn(a) : a}</option>
        ))}
      </select>
    </div>
  )
}
