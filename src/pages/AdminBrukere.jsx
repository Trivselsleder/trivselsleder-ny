import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const ROLLE_VALG = ['superadmin', 'ansatt', 'skoleadmin', 'skoleansatt', 'feide']

const ROLLE_LABEL = {
  superadmin:  'Superadmin',
  ansatt:      'Ansatt (TL AS)',
  skoleadmin:  'Skoleadmin',
  skoleansatt: 'Skoleansatt',
  feide:       'Feide',
}

const ROLLE_STIL = {
  superadmin:  'bg-red-100 text-red-700',
  ansatt:      'bg-orange-100 text-orange-700',
  skoleadmin:  'bg-blue-100 text-blue-700',
  skoleansatt: 'bg-gray-100 text-gray-600',
  feide:       'bg-teal-100 text-teal-700',
}

function formaterDato(iso) {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function InviterModal({ skoler, onLukk, onInvitert }) {
  const [form, setForm] = useState({ epost: '', navn: '', rolle: 'skoleansatt', skoleId: '' })
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')

  function felt(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function send(e) {
    e.preventDefault()
    setFeil('')
    if (['skoleadmin', 'skoleansatt'].includes(form.rolle) && !form.skoleId) {
      return setFeil('Velg en skole for denne rollen.')
    }
    setLaster(true)
    try {
      const res = await fetch('/api/auth/inviter-bruker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epost: form.epost,
          navn:  form.navn,
          rolle: form.rolle,
          skoleId: form.skoleId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) return setFeil(data.error || 'Noe gikk galt.')
      onInvitert()
    } catch {
      setFeil('Noe gikk galt.')
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Inviter bruker</h2>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={send} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-postadresse *</label>
            <input
              type="email"
              value={form.epost}
              onChange={e => felt('epost', e.target.value)}
              required
              placeholder="navn@skole.no"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn *</label>
            <input
              type="text"
              value={form.navn}
              onChange={e => felt('navn', e.target.value)}
              required
              placeholder="Fornavn Etternavn"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle *</label>
            <select
              value={form.rolle}
              onChange={e => { felt('rolle', e.target.value); felt('skoleId', '') }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            >
              {ROLLE_VALG.map(r => (
                <option key={r} value={r}>{ROLLE_LABEL[r]}</option>
              ))}
            </select>
          </div>

          {['skoleadmin', 'skoleansatt'].includes(form.rolle) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skole *</label>
              <select
                value={form.skoleId}
                onChange={e => felt('skoleId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
              >
                <option value="">Velg skole…</option>
                {skoler.map(s => (
                  <option key={s.id} value={s.id}>{s.navn}</option>
                ))}
              </select>
            </div>
          )}

          {feil && <p className="text-sm text-red-500">{feil}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onLukk}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={laster}
              className="bg-[#F47920] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e06910] transition-colors disabled:opacity-50"
            >
              {laster ? 'Sender…' : 'Send invitasjon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminBrukere() {
  const [brukere, setBrukere] = useState([])
  const [skoler, setSkoler] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [filterRolle, setFilterRolle] = useState('')
  const [visInviter, setVisInviter] = useState(false)

  async function hentBrukere() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, bruker_skole(rolle, aktiv, skoler(id, navn))')
      .order('created_at', { ascending: false })
    if (error) setFeil(error.message)
    else setBrukere(data ?? [])
    setLaster(false)
  }

  useEffect(() => {
    hentBrukere()
    supabase
      .from('skoler')
      .select('id, navn')
      .order('navn')
      .then(({ data }) => setSkoler(data ?? []))
  }, [])

  async function oppdaterRolle(id, nyRolle) {
    const forrige = brukere
    setBrukere(prev => prev.map(b => b.id === id ? { ...b, rolle: nyRolle } : b))
    const { error } = await supabase.from('profiles').update({ rolle: nyRolle }).eq('id', id)
    if (error) { setBrukere(forrige); console.error('Rolleendring feilet:', error.message) }
  }

  async function toggleAktiv(id, gjeldende) {
    const forrige = brukere
    setBrukere(prev => prev.map(b => b.id === id ? { ...b, aktiv: !gjeldende } : b))
    const { error } = await supabase.from('profiles').update({ aktiv: !gjeldende }).eq('id', id)
    if (error) { setBrukere(forrige); console.error('Aktiv-toggle feilet:', error.message) }
  }

  const filtrerte = useMemo(() =>
    filterRolle ? brukere.filter(b => b.rolle === filterRolle) : brukere,
    [brukere, filterRolle]
  )

  const filterKnapper = [
    { key: '', label: 'Alle', count: brukere.length },
    ...ROLLE_VALG.map(r => ({
      key: r,
      label: ROLLE_LABEL[r],
      count: brukere.filter(b => b.rolle === r).length,
    })),
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brukere</h1>
            <p className="text-sm text-gray-500 mt-1">
              {laster ? '…' : `${filtrerte.length} av ${brukere.length} brukere`}
            </p>
          </div>
          <button
            onClick={() => setVisInviter(true)}
            className="flex items-center gap-2 bg-[#F47920] text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-[#e06910] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Inviter bruker
          </button>
        </div>

        {/* Rollefilter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {filterKnapper.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterRolle(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filterRolle === key
                  ? 'bg-[#D6006E] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#D6006E] hover:text-[#D6006E]'
              }`}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {laster ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feil ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-600 text-sm">{feil}</div>
        ) : filtrerte.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
            {brukere.length === 0 ? 'Ingen brukere ennå.' : 'Ingen brukere med valgt filter.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Navn</th>
                    <th className="text-left px-4 py-3">E-post</th>
                    <th className="text-left px-4 py-3">Rolle</th>
                    <th className="text-left px-4 py-3">Skole(r)</th>
                    <th className="text-left px-4 py-3">Opprettet</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrerte.map(b => {
                    const skolenavn = b.bruker_skole
                      ?.map(bs => bs.skoler?.navn)
                      .filter(Boolean)
                      .join(', ') || '–'
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {b.navn ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {b.epost ?? '–'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={b.rolle}
                            onChange={e => oppdaterRolle(b.id, e.target.value)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 ${ROLLE_STIL[b.rolle] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {ROLLE_VALG.map(r => (
                              <option key={r} value={r}>{ROLLE_LABEL[r]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-48 truncate">
                          {skolenavn}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                          {formaterDato(b.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAktiv(b.id, b.aktiv !== false)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              b.aktiv !== false
                                ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-500'
                                : 'bg-red-100 text-red-600 hover:bg-green-50 hover:text-green-600'
                            }`}
                          >
                            {b.aktiv !== false ? 'Aktiv' : 'Inaktiv'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!laster && !feil && filtrerte.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Viser {filtrerte.length} av {brukere.length} brukere
          </p>
        )}
      </div>

      {visInviter && (
        <InviterModal
          skoler={skoler}
          onLukk={() => setVisInviter(false)}
          onInvitert={() => { setVisInviter(false); hentBrukere() }}
        />
      )}
    </div>
  )
}
