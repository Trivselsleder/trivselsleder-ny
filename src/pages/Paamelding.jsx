import { useState } from 'react'

// Alle påkrevde felt med norsk etikett — brukes av vår egen validering.
// Skjemaet har noValidate, så nettleserens engelske HTML5-meldinger vises aldri;
// listen her MÅ holdes i takt med required-markeringene i feltene under.
const PAKREVDE_FELT = [
  ['skolenavn', 'Skolenavn'],
  ['type', 'Type'],
  ['gateadresse', 'Gateadresse'],
  ['postnummer', 'Postnummer'],
  ['poststed', 'Poststed'],
  ['kommune', 'Kommune'],
  ['fylke', 'Fylke'],
  ['organisasjonsnummer', 'Organisasjonsnummer'],
  ['rektor_navn', 'Rektor: navn'],
  ['rektor_epost', 'Rektor: e-post'],
  // F10/#3 (17.–18. sep): Hovedkontakt TL (htla_*) blir skolens hovedkontakt ved
  // godkjenning (skoler.hktl_*), så navn + e-post er påkrevd. Telefon er OGSÅ påkrevd
  // (Kjartans beslutning 18. sep): dette er personen RA ringer — regionansvarlig
  // trenger et nummer. htla er derfor det ENESTE kontaktfeltet der telefon kreves.
  ['htla_navn', 'Hovedkontakt TL: navn'],
  ['htla_epost', 'Hovedkontakt TL: e-post'],
  ['htla_telefon', 'Hovedkontakt TL: telefon'],
  ['tla_navn', 'TL-ansvarlig (TLA): navn'],
  ['tla_epost', 'TL-ansvarlig (TLA): e-post'],
]

// Felter der en UTFYLT verdi i tillegg må ha gyldig e-postform.
const EPOST_FELT = [
  ['rektor_epost', 'Rektor: e-post'],
  ['htla_epost', 'Hovedkontakt TL: e-post'],
  ['tla_epost', 'TL-ansvarlig (TLA): e-post'],
]

const EPOST_MONSTER = /^\S+@\S+\.\S+$/

const TOM_FORM = {
  skolenavn: '', type: '', antall_elever: '',
  gateadresse: '', postnummer: '', poststed: '', kommune: '', fylke: '', hjemmeside: '',
  fakturaadresse: '', organisasjonsnummer: '', fakturareferanse: '', kontortelefon: '',
  rektor_navn: '', rektor_epost: '', rektor_telefon: '',
  htla_navn: '', htla_epost: '', htla_telefon: '',
  tla_navn: '', tla_epost: '', tla_telefon: '',
  merknader: '',
}

function Felt({ label, name, type = 'text', required, value, onChange, placeholder, hint, feilmelding }) {
  // WCAG: feil knyttes programmatisk til feltet (aria-invalid + aria-describedby),
  // ikke bare med rød farge; påkrevd markeres med `required`/`aria-required` på selve
  // input-elementet, ikke bare med en stjerne i etiketten (stjernen er aria-hidden).
  const feilId = feilmelding ? `${name}-feil` : undefined
  const hintId = hint ? `${name}-hint` : undefined
  const describedBy = [feilId, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        aria-required={required || undefined}
        aria-invalid={feilmelding ? 'true' : undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31] ${feilmelding ? 'border-red-400' : 'border-gray-300'}`}
      />
      {feilmelding && <p id={feilId} className="text-xs text-red-600 mt-1">{feilmelding}</p>}
      {hint && <p id={hintId} className="text-xs text-gray-400 mt-1">{hint}</p>}
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

function KontaktSeksjon({ tittel, prefix, form, onChange, required, telefonPaakrevd, beskrivelse, feilFelter = {} }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
        <h2 className="font-semibold text-gray-800">{tittel}</h2>
        {beskrivelse && <p className="text-xs text-gray-500 mt-1">{beskrivelse}</p>}
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Felt label="Navn" name={`${prefix}_navn`} value={form[`${prefix}_navn`]} onChange={onChange} required={required} feilmelding={feilFelter[`${prefix}_navn`]} />
        <Felt label="E-post" name={`${prefix}_epost`} type="email" value={form[`${prefix}_epost`]} onChange={onChange} required={required} feilmelding={feilFelter[`${prefix}_epost`]} />
        {/* telefonPaakrevd settes kun for htla (RA-kontakt) — ellers valgfritt. */}
        <Felt label="Telefon" name={`${prefix}_telefon`} type="tel" value={form[`${prefix}_telefon`]} onChange={onChange} required={telefonPaakrevd} feilmelding={feilFelter[`${prefix}_telefon`]} />
      </div>
    </div>
  )
}

export default function Paamelding() {
  const [form, setForm] = useState(TOM_FORM)
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')
  const [feilFelter, setFeilFelter] = useState({})
  const [sendt, setSendt] = useState(false)

  function onChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setFeil('')
    // Fjern feilmarkeringen på feltet som rettes.
    setFeilFelter(prev => {
      if (!prev[name]) return prev
      const neste = { ...prev }; delete neste[name]; return neste
    })
  }

  // Returnerer { feilFelter: {navn: melding}, labels: [etiketter i rekkefølge] }.
  function validerSkjema() {
    const nyeFeil = {}
    const labels = []
    for (const [felt, etikett] of PAKREVDE_FELT) {
      if (!String(form[felt] ?? '').trim()) {
        nyeFeil[felt] = 'Må fylles ut.'
        labels.push(etikett)
      }
    }
    for (const [felt, etikett] of EPOST_FELT) {
      const verdi = String(form[felt] ?? '').trim()
      if (verdi && !EPOST_MONSTER.test(verdi) && !nyeFeil[felt]) {
        nyeFeil[felt] = 'Må være en gyldig e-postadresse (f.eks. navn@skole.no).'
        if (!labels.includes(etikett)) labels.push(etikett)
      }
    }
    return { feilFelter: nyeFeil, labels }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { feilFelter: nyeFeil, labels } = validerSkjema()
    if (labels.length > 0) {
      setFeilFelter(nyeFeil)
      setFeil('Følgende påkrevde felt mangler eller er ugyldige: ' + labels.join(', ') + '. Se de markerte feltene under.')
      // WCAG: flytt fokus til FØRSTE felt med feil (rekkefølge = skjemaets rekkefølge).
      const rekkefolge = [...PAKREVDE_FELT.map(f => f[0]), ...EPOST_FELT.map(f => f[0])]
      const forste = rekkefolge.find(n => nyeFeil[n]) ?? Object.keys(nyeFeil)[0]
      const el = forste && document.getElementById(forste)
      if (el) el.focus()
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setFeilFelter({})
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

        {/* noValidate: vår egen norske validering (validerSkjema) tar over for
            nettleserens innebygde HTML5-meldinger, som følger nettleserspråket.
            required-attributtene beholdes for stjernemarkering og tilgjengelighet. */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Skoleinformasjon */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">Skoleinformasjon</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Felt label="Skolenavn" name="skolenavn" value={form.skolenavn} onChange={onChange} required feilmelding={feilFelter.skolenavn} />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type<span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  required
                  aria-required="true"
                  aria-invalid={feilFelter.type ? 'true' : undefined}
                  aria-describedby={feilFelter.type ? 'type-feil' : undefined}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31] bg-white ${feilFelter.type ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Velg type</option>
                  <option value="barnehage">Barnehage</option>
                  <option value="barnetrinn">Barnetrinn</option>
                  <option value="ungdomstrinn">Ungdomstrinn</option>
                  <option value="kombinert">Kombinert skole</option>
                  <option value="SFO">SFO</option>
                </select>
                {feilFelter.type && <p id="type-feil" className="text-xs text-red-600 mt-1">Må velges.</p>}
              </div>
              <Felt label="Antall elever" name="antall_elever" type="number" value={form.antall_elever} onChange={onChange} placeholder="f.eks. 250" />
              <Felt label="Hjemmeside" name="hjemmeside" type="url" value={form.hjemmeside} onChange={onChange} placeholder="https://" />
            </div>
          </div>

          {/* Adresse */}
          <Seksjon tittel="Adresse">
            <div className="sm:col-span-2">
              <Felt label="Gateadresse" name="gateadresse" value={form.gateadresse} onChange={onChange} required feilmelding={feilFelter.gateadresse} />
            </div>
            <Felt label="Postnummer" name="postnummer" value={form.postnummer} onChange={onChange} required feilmelding={feilFelter.postnummer} />
            <Felt label="Poststed" name="poststed" value={form.poststed} onChange={onChange} required feilmelding={feilFelter.poststed} />
            <Felt label="Kommune" name="kommune" value={form.kommune} onChange={onChange} required feilmelding={feilFelter.kommune} />
            <Felt label="Fylke" name="fylke" value={form.fylke} onChange={onChange} required feilmelding={feilFelter.fylke} />
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
              feilmelding={feilFelter.organisasjonsnummer}
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
          <KontaktSeksjon tittel="Rektor" prefix="rektor" form={form} onChange={onChange} required feilFelter={feilFelter} />
          {/* F10/#3: Hovedkontakt TL (htla_*) blir skolens faste hovedkontakt ved
              godkjenning (skoler.hktl_*) — derfor påkrevd (navn + e-post). Kolonnenavnene
              i basen er uendret. */}
          <KontaktSeksjon
            tittel="Hovedkontakt TL"
            prefix="htla"
            form={form}
            onChange={onChange}
            required
            telefonPaakrevd
            beskrivelse="Hovedkontakt TL blir skolens faste kontaktperson for Trivselsleder-programmet."
            feilFelter={feilFelter}
          />
          <KontaktSeksjon
            tittel="TL-ansvarlig (TLA)"
            prefix="tla"
            form={form}
            onChange={onChange}
            required
            beskrivelse="TL-ansvarlig er skolens Trivselsleder-ansvarlige og får tilgang som skoleansatt."
            feilFelter={feilFelter}
          />

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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31] resize-none"
              />
            </div>
          </div>

          {feil && (
            <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-red-600 text-sm">{feil}</div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Påkrevde felter</p>
            <button
              type="submit"
              disabled={laster}
              className="bg-[#FF7B31] text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-[#d4681a] transition-colors disabled:opacity-60 text-sm"
            >
              {laster ? 'Sender…' : 'Send påmelding'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
