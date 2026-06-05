import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function KulturkortBestill() {
  const [form, setForm] = useState({
    skolenavn: '',
    antallKort: '',
    kontaktperson: '',
    epost: '',
    melding: '',
  })
  const [sendt, setSendt] = useState(false)
  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFeil('')
    setSender(true)

    try {
      const res = await fetch('https://formsubmit.co/ajax/kulturkort@trivselsleder.no', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Kulturkort-bestilling fra ${form.skolenavn}`,
          Skolenavn: form.skolenavn,
          'Antall kort': form.antallKort,
          Kontaktperson: form.kontaktperson,
          Epost: form.epost,
          Melding: form.melding || '(ingen)',
          _replyto: form.epost,
        }),
      })
      if (!res.ok) throw new Error()
      setSendt(true)
    } catch {
      setFeil('Noe gikk galt. Prøv igjen eller send e-post direkte til kulturkort@trivselsleder.no')
    } finally {
      setSender(false)
    }
  }

  if (sendt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bestilling mottatt!</h2>
          <p className="text-gray-600 mb-6">
            Takk, <strong>{form.kontaktperson}</strong>! Vi sender en bekreftelse til{' '}
            <strong>{form.epost}</strong> og tar kontakt innen kort tid.
          </p>
          <Link
            to="/kulturkortet"
            className="inline-block bg-[#F47920] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#d4681a] transition-colors"
          >
            Tilbake til partneroversikten
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/kulturkortet" className="text-[#F47920] text-sm hover:underline">
            ← Tilbake til Kulturkortet
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Bestill Kulturkort</h1>
          <p className="text-gray-600">
            Fyll ut skjemaet så tar vi kontakt for å sette i gang.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skolenavn <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="skolenavn"
              type="text"
              required
              value={form.skolenavn}
              onChange={handleChange}
              placeholder="f.eks. Ås ungdomsskole"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antall kort <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="antallKort"
              type="number"
              required
              min="1"
              value={form.antallKort}
              onChange={handleChange}
              placeholder="f.eks. 200"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kontaktperson <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="kontaktperson"
              type="text"
              required
              value={form.kontaktperson}
              onChange={handleChange}
              placeholder="Navn"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-postadresse <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="epost"
              type="email"
              required
              value={form.epost}
              onChange={handleChange}
              placeholder="din@skole.no"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tilleggsinfo <span className="text-gray-400 font-normal">(valgfritt)</span>
            </label>
            <textarea
              name="melding"
              rows={3}
              value={form.melding}
              onChange={handleChange}
              placeholder="Spørsmål, ønsker eller annen info..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] resize-none"
            />
          </div>

          {feil && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{feil}</p>
          )}

          <button
            type="submit"
            disabled={sender}
            className="w-full bg-gradient-to-r from-[#F47920] to-[#D6006E] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 text-base"
          >
            {sender ? 'Sender...' : 'Send bestilling'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Bestillingen sendes til kulturkort@trivselsleder.no
          </p>
        </form>
      </div>
    </div>
  )
}
