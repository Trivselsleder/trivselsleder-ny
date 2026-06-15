import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import initialData from '../data/kulturkort-partnere.json'

const TOMPARTNER = {
  navn: '', kommune: '', fylke: '', type: '', epost: '', nettside: '', beskrivelse: '', published: true,
}

export default function AdminKulturkort() {
  const { t } = useTranslation()
  const [partnere, setPartnere] = useState(initialData)
  const [søk, setSøk] = useState('')
  const [filterPublished, setFilterPublished] = useState('alle')
  const [redigerer, setRedigerer] = useState(null)
  const [nyForm, setNyForm] = useState(null)
  const [bekreftSlett, setBekreftSlett] = useState(null)
  const [valgte, setValgte] = useState(new Set())

  const filtrert = useMemo(() => partnere
    .filter(p => filterPublished === 'alle' || (filterPublished === 'aktive' ? p.published : !p.published))
    .filter(p => !søk || p.navn.toLowerCase().includes(søk.toLowerCase()) || p.kommune.toLowerCase().includes(søk.toLowerCase()))
  , [partnere, søk, filterPublished])

  useEffect(() => { setValgte(new Set()) }, [søk, filterPublished])

  const alleFiltrertValgt = filtrert.length > 0 && filtrert.every(p => valgte.has(p.id))
  const noenValgt = filtrert.some(p => valgte.has(p.id))

  function toggleVelgAlle() {
    if (alleFiltrertValgt) {
      setValgte(new Set())
    } else {
      setValgte(new Set(filtrert.map(p => p.id)))
    }
  }

  function toggleVelgEn(id) {
    setValgte(prev => {
      const neste = new Set(prev)
      neste.has(id) ? neste.delete(id) : neste.add(id)
      return neste
    })
  }

  const valgteAdresser = useMemo(() =>
    filtrert.filter(p => valgte.has(p.id)).map(p => p.epost).filter(Boolean)
  , [valgte, filtrert])

  function sendEpost() {
    window.location.href = `mailto:?bcc=${valgteAdresser.join(',')}`
  }

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

  const filterLabels = {
    alle: t('admin.alle'),
    aktive: t('admin.aktivFilter'),
    inaktive: t('admin.inaktivFilter'),
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 px-4 ${valgte.size > 0 ? 'pb-24' : ''}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {aktive} {t('admin.aktive')} · {inaktive} {t('admin.inaktive')} · {partnere.length} {t('admin.totalt')}
            </p>
          </div>
          <button
            onClick={() => setNyForm({ ...TOMPARTNER })}
            className="bg-[#F47920] text-white font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4681a] transition-colors text-sm flex items-center gap-2 self-start sm:self-auto"
          >
            {t('admin.leggTilKnapp')}
          </button>
        </div>

        <div className="flex gap-3 flex-wrap mb-5">
          {Object.entries(filterLabels).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterPublished(val)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterPublished === val
                  ? 'bg-[#D6006E] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#D6006E]'
              }`}
            >
              {label}
            </button>
          ))}
          <input
            type="search"
            placeholder={t('admin.sokPlaceholder')}
            value={søk}
            onChange={e => setSøk(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] flex-1 min-w-48"
          />
        </div>

        <p className="text-xs text-gray-400 mb-4">{t('admin.viser', { antall: filtrert.length })}</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={alleFiltrertValgt}
                      ref={el => { if (el) el.indeterminate = noenValgt && !alleFiltrertValgt }}
                      onChange={toggleVelgAlle}
                      className="w-4 h-4 accent-[#F47920] cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolNavn')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolKommune')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolFylke')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolType')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolEpost')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolNettside')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolStatus')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.kolHandlinger')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrert.map(partner => (
                  <tr key={partner.id} className={`hover:bg-gray-50 transition-colors ${valgte.has(partner.id) ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={valgte.has(partner.id)}
                        onChange={() => toggleVelgEn(partner.id)}
                        className="w-4 h-4 accent-[#F47920] cursor-pointer"
                      />
                    </td>
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
                    <td className="px-4 py-3 text-xs max-w-36">
                      {partner.epost
                        ? <a href={`mailto:${partner.epost}`} className="text-gray-500 hover:text-[#F47920] hover:underline truncate block" title={partner.epost}>{partner.epost}</a>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs max-w-36">
                      {partner.nettside
                        ? <a href={partner.nettside} target="_blank" rel="noopener noreferrer" className="text-[#D6006E] hover:underline truncate block" title={partner.nettside}>{t('admin.besok')}</a>
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
                        {partner.published ? t('admin.statusAktiv') : t('admin.statusInaktiv')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setRedigerer(partner)} className="text-xs text-[#F47920] hover:underline font-medium">
                          {t('admin.rediger')}
                        </button>
                        <button onClick={() => setBekreftSlett(partner.id)} className="text-xs text-red-500 hover:underline font-medium">
                          {t('admin.slett')}
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

      {redigerer && (
        <PartnerModal
          tittel={t('admin.redigerTitle')}
          initial={redigerer}
          onLagre={lagreRedigering}
          onAvbryt={() => setRedigerer(null)}
          lagreLabel={t('admin.lagreKnapp')}
          avbrytLabel={t('admin.avbrytKnapp')}
          feltLabels={t}
        />
      )}

      {nyForm && (
        <PartnerModal
          tittel={t('admin.nyTitle')}
          initial={nyForm}
          onLagre={lagreNy}
          onAvbryt={() => setNyForm(null)}
          erNy
          lagreLabel={t('admin.leggTilModalKnapp')}
          avbrytLabel={t('admin.avbrytKnapp')}
          feltLabels={t}
        />
      )}

      {valgte.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">
              {valgte.size} {valgte.size === 1 ? 'partner' : 'partnere'} valgt
            </span>
            {valgteAdresser.length > 50 && (
              <span className="text-xs text-amber-600 font-medium">
                ⚠ Over 50 adresser — Gmail støtter maks 50 i BCC
              </span>
            )}
            <button
              onClick={sendEpost}
              disabled={valgteAdresser.length === 0 || valgteAdresser.length > 50}
              className="flex items-center gap-1.5 bg-[#F47920] text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-[#e06910] transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send e-post{valgteAdresser.length > 0 ? ` (${valgteAdresser.length})` : ''}
            </button>
            <button
              onClick={() => setValgte(new Set())}
              className="text-sm text-gray-400 hover:text-gray-700 underline"
            >
              Fjern valg
            </button>
          </div>
        </div>
      )}

      {bekreftSlett && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('admin.bekreftSlettTitle')}</h3>
            <p className="text-gray-600 text-sm mb-6">
              {t('admin.bekreftSlettIngress', { navn: partnere.find(p => p.id === bekreftSlett)?.navn })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => slettPartner(bekreftSlett)} className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-full hover:bg-red-600 transition-colors">
                {t('admin.slettKnapp')}
              </button>
              <button onClick={() => setBekreftSlett(null)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-full hover:bg-gray-50 transition-colors">
                {t('admin.avbrytKnapp')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerModal({ tittel, initial, onLagre, onAvbryt, erNy, lagreLabel, avbrytLabel, feltLabels: t }) {
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
          <Field label={t('admin.feltNavn')} name="navn" value={form.navn} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('admin.feltKommune')} name="kommune" value={form.kommune} onChange={handleChange} required />
            <Field label={t('admin.feltFylke')} name="fylke" value={form.fylke} onChange={handleChange} required />
          </div>
          <Field label={t('admin.feltType')} name="type" value={form.type} onChange={handleChange} />
          <Field label={t('admin.feltEpost')} name="epost" type="email" value={form.epost} onChange={handleChange} />
          <Field label={t('admin.feltNettside')} name="nettside" type="url" value={form.nettside || ''} onChange={handleChange} placeholder="https://eksempel.no" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.feltBeskrivelse')}</label>
            <textarea
              name="beskrivelse"
              rows={3}
              value={form.beskrivelse}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="published" checked={form.published} onChange={handleChange} className="w-4 h-4 accent-[#F47920]" />
            <span className="text-sm font-medium text-gray-700">{t('admin.feltAktiv')}</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-gradient-to-r from-[#F47920] to-[#D6006E] text-white font-bold py-2.5 rounded-full hover:opacity-90 transition-opacity">
              {lagreLabel}
            </button>
            <button type="button" onClick={onAvbryt} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-full hover:bg-gray-50 transition-colors">
              {avbrytLabel}
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
