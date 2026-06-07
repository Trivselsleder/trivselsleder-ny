import { useState } from 'react'

const TOM_FORM = {
  skolenavn: '', type: '', antall_elever: '',
  gateadresse: '', postnummer: '', poststed: '', kommune: '', fylke: '', hjemmeside: '',
  fakturaadresse: '', organisasjonsnummer: '', fakturareferanse: '', kontortelefon: '',
  rektor_navn: '', rektor_epost: '', rektor_telefon: '',
  htla_navn: '', htla_epost: '', htla_telefon: '',
  tla_navn: '', tla_epost: '', tla_telefon: '',
  merknader: '',
}

function Felt({ label, name, type = 'text', required, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Seksjon({ tittel, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
        <h2 className="font-semibold text-gray-800">{tittel}</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function KontaktSeksjon({ tittel, prefix, form, onChange, required }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
        <h2 className="font-semibold text-gray-800">{tittel}</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Felt label="Navn" name={`${prefix}_navn`} value={form[`${prefix}_navn`]} onChange={onChange} required={required} />
        <Felt label="E-post" name={`${prefix}_epost`} type="email" value={form[`${prefix}_epost`]} onChange={onChange} required={required} />
        <Felt label="Telefon" name={`${prefix}_telefon`} type="tel" value={form[`${prefix}_telefon`]} onChange={onChange} />
      </div>
    </div>
  )
}

export default function Paamelding() {
  const [form, setForm] = useState(TOM_FORM)
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')
  const [sendt, setSendt] = useState(false)

  function onChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setFeil('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLaster(true)
    setFeil('')
    try {
      const res = await fetch('/api/paamelding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFeil(data.error ?? 'Noe gikk galt. Prøv igjen.'); return }
      setSendt(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setFeil('Noe gikk galt. Prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  if (sendt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Påmelding mottatt!</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Takk for at dere ønsker å bli med på Trivselsleder-programmet.
            Vi tar kontakt med <strong>{form.rektor_epost}</strong> så snart vi har behandlet påmeldingen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Påmelding til Trivselsleder</h1>
          <p className="text-gray-500 mt-2">Fyll inn informasjon om skolen for å starte oppstart av Trivselsleder-programmet.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Skoleinformasjon */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">Skoleinformasjon</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Felt label="Skolenavn" name="skolenavn" value={form.skolenavn} onChange={onChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type<span className="text-red-400 ml-0.5">*</span>
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] bg-white"
                >
                  <option value="">Velg type</option>
                  <option value="barnehage">Barnehage</option>
                  <option value="barnetrinn">Barnetrinn</option>
                  <option value="ungdomstrinn">Ungdomstrinn</option>
                  <option value="kombinert">Kombinert skole</option>
                  <option value="SFO">SFO</option>
                </select>
              </div>
              <Felt label="Antall elever" name="antall_elever" type="number" value={form.antall_elever} onChange={onChange} placeholder="f.eks. 250" />
              <Felt label="Hjemmeside" name="hjemmeside" type="url" value={form.hjemmeside} onChange={onChange} placeholder="https://" />
            </div>
          </div>

          {/* Adresse */}
          <Seksjon tittel="Adresse">
            <div className="sm:col-span-2">
              <Felt label="Gateadresse" name="gateadresse" value={form.gateadresse} onChange={onChange} required />
            </div>
            <Felt label="Postnummer" name="postnummer" value={form.postnummer} onChange={onChange} required />
            <Felt label="Poststed" name="poststed" value={form.poststed} onChange={onChange} required />
            <Felt label="Kommune" name="kommune" value={form.kommune} onChange={onChange} required />
            <Felt label="Fylke" name="fylke" value={form.fylke} onChange={onChange} required />
          </Seksjon>

          {/* Faktura */}
          <Seksjon tittel="Fakturainformasjon">
            <Felt
              label="Organisasjonsnummer"
              name="organisasjonsnummer"
              value={form.organisasjonsnummer}
              onChange={onChange}
              required
              placeholder="9 siffer"
              hint="Brukes for fakturering"
            />
            <Felt label="Kontortelefon" name="kontortelefon" type="tel" value={form.kontortelefon} onChange={onChange} />
            <div className="sm:col-span-2">
              <Felt
                label="Fakturaadresse"
                name="fakturaadresse"
                value={form.fakturaadresse}
                onChange={onChange}
                placeholder="La stå tom hvis samme som gateadresse"
              />
            </div>
            <Felt label="Fakturareferanse / EHF-referanse" name="fakturareferanse" value={form.fakturareferanse} onChange={onChange} />
          </Seksjon>

          {/* Kontaktpersoner */}
          <KontaktSeksjon tittel="Rektor" prefix="rektor" form={form} onChange={onChange} required />
          <KontaktSeksjon tittel="Hoved-TL-ansvarlig (HTLA)" prefix="htla" form={form} onChange={onChange} required={false} />
          <KontaktSeksjon tittel="TL-ansvarlig (TLA)" prefix="tla" form={form} onChange={onChange} required={false} />

          {/* Merknader */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">Merknader</h2>
            </div>
            <div className="p-6">
              <textarea
                name="merknader"
                value={form.merknader}
                onChange={onChange}
                rows={4}
                placeholder="Andre opplysninger eller spørsmål…"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] resize-none"
              />
            </div>
          </div>

          {feil && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-red-600 text-sm">{feil}</div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Påkrevde felter</p>
            <button
              type="submit"
              disabled={laster}
              className="bg-[#F47920] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#d4681a] transition-colors disabled:opacity-60 text-sm"
            >
              {laster ? 'Sender…' : 'Send påmelding'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
