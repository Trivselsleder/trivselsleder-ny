import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const PRIS_PER_KORT = 40
const VEKT_PER_KORT = 6
const EMBALLASJE_GRENSE = 36
const VEKT_EMBALLASJE_LITEN = 9
const VEKT_EMBALLASJE_STOR = 34

function beregnPorto(vektG) {
  if (vektG <= 50) return 28
  if (vektG <= 100) return 46
  if (vektG <= 350) return 69
  return 99
}

function beregnPris(antall) {
  if (!antall || antall < 1) return null
  const emballasje = antall <= EMBALLASJE_GRENSE ? VEKT_EMBALLASJE_LITEN : VEKT_EMBALLASJE_STOR
  const totalVekt = antall * VEKT_PER_KORT + emballasje
  const porto = beregnPorto(totalVekt)
  const kortpris = antall * PRIS_PER_KORT
  return { kortpris, porto, total: kortpris + porto }
}

export default function KulturkortBestill() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    skolenavn: '',
    antallKort: '',
    kontaktperson: '',
    epost: '',
    gate: '',
    postnummer: '',
    poststed: '',
    melding: '',
  })
  const [sendt, setSendt] = useState(false)
  const [sender, setSender] = useState(false)
  const [feil, setFeil] = useState('')

  const pris = useMemo(() => beregnPris(parseInt(form.antallKort, 10)), [form.antallKort])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFeil('')
    setSender(true)

    try {
      const res = await fetch('/api/send-bestilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skolenavn: form.skolenavn,
          antallKort: form.antallKort,
          kontaktperson: form.kontaktperson,
          epost: form.epost,
          gate: form.gate,
          postnummer: form.postnummer,
          poststed: form.poststed,
          melding: form.melding,
          kortpris: pris?.kortpris ?? 0,
          porto: pris?.porto ?? 0,
          total: pris?.total ?? 0,
        }),
      })
      if (!res.ok) throw new Error()
      const bestilling = {
        id: Date.now(),
        dato: new Date().toISOString(),
        ...form,
        kortpris: pris?.kortpris ?? 0,
        porto: pris?.porto ?? 0,
        total: pris?.total ?? 0,
        status: 'Ny',
      }
      const eksisterende = JSON.parse(localStorage.getItem('kulturkort_bestillinger') || '[]')
      localStorage.setItem('kulturkort_bestillinger', JSON.stringify([bestilling, ...eksisterende]))
      setSendt(true)
    } catch {
      setFeil(t('bestill.feilmelding'))
    } finally {
      setSender(false)
    }
  }

  if (sendt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('bestill.takkTitle')}</h2>
          <p
            className="text-gray-600 mb-6"
            dangerouslySetInnerHTML={{ __html: t('bestill.takkIngress', { navn: form.kontaktperson, epost: form.epost }) }}
          />
          <Link
            to="/kulturkortet"
            className="inline-block bg-[#F47920] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#d4681a] transition-colors"
          >
            {t('bestill.takkKnapp')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link to="/kulturkortet" className="text-[#F47920] text-sm hover:underline">
            {t('bestill.tilbake')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">{t('bestill.title')}</h1>
          <p className="text-gray-600">{t('bestill.ingress')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

          {/* Skolenavn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('bestill.skolenavnLabel')} <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="skolenavn"
              type="text"
              required
              value={form.skolenavn}
              onChange={handleChange}
              placeholder={t('bestill.skolenavnPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          {/* Antall + prisutregning */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('bestill.antallLabel')} <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="antallKort"
              type="number"
              required
              min="1"
              value={form.antallKort}
              onChange={handleChange}
              placeholder={t('bestill.antallPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
            {pris && (
              <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>{t('bestill.prisKort', { antall: form.antallKort })}</span>
                  <span>{pris.kortpris} kr</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('bestill.prisPorto')}</span>
                  <span>{pris.porto} kr</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                  <span>{t('bestill.prisTotal')}</span>
                  <span className="text-[#F47920]">
                    {pris.total} kr
                    <span className="font-normal text-gray-400 text-xs ml-1">({t('bestill.prisEksMva')})</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Kontaktperson */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('bestill.kontaktpersonLabel')} <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="kontaktperson"
              type="text"
              required
              value={form.kontaktperson}
              onChange={handleChange}
              placeholder={t('bestill.kontaktpersonPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          {/* E-post */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('bestill.epostLabel')} <span className="text-[#D6006E]">*</span>
            </label>
            <input
              name="epost"
              type="email"
              required
              value={form.epost}
              onChange={handleChange}
              placeholder={t('bestill.epostPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
          </div>

          {/* Leveringsadresse */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700">
              {t('bestill.adresseTitle')} <span className="text-[#D6006E]">*</span>
            </legend>
            <input
              name="gate"
              type="text"
              required
              value={form.gate}
              onChange={handleChange}
              placeholder={t('bestill.gatePlaceholder')}
              aria-label={t('bestill.gateLabel')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="postnummer"
                type="text"
                required
                inputMode="numeric"
                maxLength={4}
                value={form.postnummer}
                onChange={handleChange}
                placeholder={t('bestill.postnummerPlaceholder')}
                aria-label={t('bestill.postnummerLabel')}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
              />
              <input
                name="poststed"
                type="text"
                required
                value={form.poststed}
                onChange={handleChange}
                placeholder={t('bestill.poststedPlaceholder')}
                aria-label={t('bestill.poststedLabel')}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]"
              />
            </div>
          </fieldset>

          {/* Tilleggsinfo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('bestill.tilleggsinfoLabel')} <span className="text-gray-400 font-normal">{t('bestill.tilleggsinfoValgfritt')}</span>
            </label>
            <textarea
              name="melding"
              rows={3}
              value={form.melding}
              onChange={handleChange}
              placeholder={t('bestill.tilleggsinfoPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920] resize-none"
            />
          </div>

          {/* Prissammendrag */}
          {pris && (
            <div className="rounded-xl bg-gradient-to-r from-[#F47920]/10 to-[#D6006E]/10 border border-[#F47920]/20 px-4 py-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('bestill.prisKort', { antall: form.antallKort })}</span>
                <span>{pris.kortpris} kr</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t('bestill.prisPorto')}</span>
                <span>{pris.porto} kr</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-[#F47920]/20 pt-2 mt-1">
                <span>{t('bestill.prisTotal')}</span>
                <span className="text-[#F47920] text-base">
                  {pris.total} kr
                  <span className="font-normal text-gray-400 text-xs ml-1">({t('bestill.prisEksMva')})</span>
                </span>
              </div>
            </div>
          )}

          {feil && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{feil}</p>
          )}

          <button
            type="submit"
            disabled={sender}
            className="w-full bg-gradient-to-r from-[#F47920] to-[#D6006E] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 text-base"
          >
            {sender ? t('bestill.senderKnapp') : t('bestill.sendKnapp')}
          </button>

          <p className="text-xs text-gray-400 text-center">{t('bestill.mottakerInfo')}</p>
        </form>
      </div>
    </div>
  )
}
