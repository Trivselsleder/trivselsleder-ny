import { useState, useMemo } from 'react'
import initialData from '../data/kulturkort-partnere.json'

const TOMPARTNER = {
  navn: '', kommune: '', fylke: '', type: '', epost: '', nettside: '', beskrivelse: '', published: true,
}

export default function AdminKulturkort() {
  const [partnere, setPartnere] = useState(initialData)
  const [søk, setSøk] = useState('')
  const [filterPublished, setFilterPublished] = useState('alle')
  const [redigerer, setRedigerer] = useState(null) // { id } eller null
  const [nyForm, setNyForm] = useState(null)       // objekt eller null
  const [bekreftSlett, setBekreftSlett] = useState(null) // id

  const filtrert = useMemo(() => partnere
    .filter(p => filterPublished === 'alle' || (filterPublished === 'aktive' ? p.published : !p.published))
    .filter(p => !søk || p.navn.toLowerCase().includes(søk.toLowerCase()) || p.kommune.toLowerCase().includes(søk.toLowerCase()))
  , [partnere, søk, filterPublished])

  function togglePublished(id) {
    setPartnere(prev => prev.map(p => p.id === id ? { ...p, published: !p.published } : p))
  }

  function slettPartner(id) {
    setPartnere(prev => prev.filter(p => p.id !== id))
    setBekreftSlett(null)
  }

  function lagreRedigering(oppdatert) {
    setPartnere(prev => prev.map(p => p.id === oppdatert.id ? oppdatert : p))
    setRedigerer(null)
  }

  function lagreNy(partner) {
    const nyId = Math.max(...partnere.map(p => p.id)) + 1
    setPartnere(prev => [...prev, { ...partner, id: nyId, innleggsdato: new Date().toLocaleDateString('no'), oppdatert: '' }])
    setNyForm(null)
  }

  const aktive = partnere.filter(p => p.published).length
  const inaktive = partnere.length - aktive

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin – Kulturkort-partnere</h1>
            <p className="text-sm text-gray-500 mt-1">
              {aktive} aktive · {inaktive} inaktive · {partnere.length} totalt
            </p>
          </div>
          <button
            onClick={() => setNyForm({ ...TOMPARTNER })}
            className="bg-[#F47920] text-white font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4681a] transition-colors text-sm flex items-center gap-2 self-start sm:self-auto"
          >
            + Legg til partner
          </button>
        </div>

        {/* Statistikk-chips */}
        <div className="flex gap-3 flex-wrap mb-5">
          {['alle', 'aktive', 'inaktive'].map(v => (
            <button
              key={v}
              onClick={() => setFilterPublished(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterPublished === v
                  ? 'bg-[#D6006E] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#D6006E]'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <input
            type="search"
            placeholder="Søk etter navn eller kommune..."
            value={søk}
            onChange={e => setSøk(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] flex-1 min-w-48"
          />
        </div>

        <p className="text-xs text-gray-400 mb-4">Viser {filtrert.length} partnere</p>

        {/* Tabell */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Navn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kommune</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fylke</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">E-post</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nettside</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrert.map(partner => (
                  <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-48">
                      <span className="truncate block" title={partner.navn}>{partner.navn}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{partner.kommune}</td>
                    <td className="px-4 py-3 text-gray-600">{partner.fylke}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {partner.type && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#F47920]/10 text-[#F47920] font-medium">
                          {partner.type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-36">
                      <span className="truncate block" title={partner.epost}>{partner.epost || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-36">
                      {partner.nettside
                        ? <a href={partner.nettside} target="_blank" rel="noopener noreferrer" className="text-[#D6006E] hover:underline truncate block" title={partner.nettside}>Besøk →</a>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublished(partner.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          partner.published
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${partner.published ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {partner.published ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRedigerer(partner)}
                          className="text-xs text-[#F47920] hover:underline font-medium"
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => setBekreftSlett(partner.id)}
                          className="text-xs text-red-500 hover:underline font-medium"
                        >
                          Slett
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Rediger */}
      {redigerer && (
        <PartnerModal
          tittel="Rediger partner"
          initial={redigerer}
          onLagre={lagreRedigering}
          onAvbryt={() => setRedigerer(null)}
        />
      )}

      {/* Modal: Ny partner */}
      {nyForm && (
        <PartnerModal
          tittel="Legg til ny partner"
          initial={nyForm}
          onLagre={lagreNy}
          onAvbryt={() => setNyForm(null)}
          erNy
        />
      )}

      {/* Bekreft slett */}
      {bekreftSlett && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Slette partner?</h3>
            <p className="text-gray-600 text-sm mb-6">
              {partnere.find(p => p.id === bekreftSlett)?.navn} vil bli permanent slettet.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => slettPartner(bekreftSlett)}
                className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-full hover:bg-red-600 transition-colors"
              >
                Slett
              </button>
              <button
                onClick={() => setBekreftSlett(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerModal({ tittel, initial, onLagre, onAvbryt, erNy }) {
  const [form, setForm] = useState(initial)

  function handleChange(e) {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [e.target.name]: val }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onLagre(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-5">{tittel}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Navn" name="navn" value={form.navn} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kommune" name="kommune" value={form.kommune} onChange={handleChange} required />
            <Field label="Fylke" name="fylke" value={form.fylke} onChange={handleChange} required />
          </div>
          <Field label="Type (f.eks. Kino, Bowling)" name="type" value={form.type} onChange={handleChange} />
          <Field label="E-post kontaktperson" name="epost" type="email" value={form.epost} onChange={handleChange} />
          <Field label="Nettside (URL)" name="nettside" type="url" value={form.nettside || ''} onChange={handleChange} placeholder="https://eksempel.no" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
            <textarea
              name="beskrivelse"
              rows={3}
              value={form.beskrivelse}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="published"
              checked={form.published}
              onChange={handleChange}
              className="w-4 h-4 accent-[#F47920]"
            />
            <span className="text-sm font-medium text-gray-700">Aktiv (vises på partnersiden)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#F47920] to-[#D6006E] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              {erNy ? 'Legg til' : 'Lagre endringer'}
            </button>
            <button
              type="button"
              onClick={onAvbryt}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-full hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-[#D6006E]">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
      />
    </div>
  )
}
