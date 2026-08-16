import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { hentSatser, lagreSatser, STANDARD_SATSER } from '../utils/satser'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STATUSER = ['Ny', 'Fakturert', 'Levert']

function nestStatus(gjeldende) {
  return STATUSER[(STATUSER.indexOf(gjeldende) + 1) % STATUSER.length]
}

function statusFarge(status) {
  if (status === 'Ny') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
  if (status === 'Fakturert') return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  return 'bg-green-100 text-green-600 hover:bg-green-200'
}

function formaterDato(iso) {
  return new Date(iso).toLocaleString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminBestillinger() {
  const { t } = useTranslation()
  const { loggUt } = useAuth()
  const navigate = useNavigate()
  const [bestillinger, setBestillinger] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    supabase
      .from('kulturkort_bestillinger')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 9999)
      .then(({ data, error }) => {
        if (error) setFeil(error.message)
        else setBestillinger(data ?? [])
        setLaster(false)
      })
  }, [])
  const [filter, setFilter] = useState('Alle')
  const [satser, setSatser] = useState(hentSatser)
  const [satserLagret, setSatserLagret] = useState(false)

  const filtrerte = useMemo(() => {
    if (filter === 'Alle') return bestillinger
    return bestillinger.filter(b => b.status === filter)
  }, [bestillinger, filter])

  const antallPrStatus = useMemo(() => ({
    Ny: bestillinger.filter(b => b.status === 'Ny').length,
    Fakturert: bestillinger.filter(b => b.status === 'Fakturert').length,
    Levert: bestillinger.filter(b => b.status === 'Levert').length,
  }), [bestillinger])

  async function byttStatus(id) {
    const forrige = bestillinger
    const rad = bestillinger.find(b => b.id === id)
    const nyStatus = nestStatus(rad.status)
    setBestillinger(bestillinger.map(b => b.id === id ? { ...b, status: nyStatus } : b))
    const { error } = await supabase
      .from('kulturkort_bestillinger').update({ status: nyStatus }).eq('id', id)
    if (error) {
      setBestillinger(forrige) // rull tilbake om lagring feilet
      alert('Kunne ikke lagre status. Prøv igjen.')
    }
  }

  async function handleLoggUt() {
    await loggUt()
    navigate('/logg-inn')
  }

  const filterKnapper = [
    { key: 'Alle', label: t('adminBestillinger.filtreAlle') },
    { key: 'Ny', label: t('adminBestillinger.statusNy') },
    { key: 'Fakturert', label: t('adminBestillinger.statusFakturert') },
    { key: 'Levert', label: t('adminBestillinger.statusLevert') },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('adminBestillinger.title')}</h1>
            <div className="flex gap-3 mt-2 flex-wrap">
              <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
                {antallPrStatus.Ny} {t('adminBestillinger.statusNy')}
              </span>
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                {antallPrStatus.Fakturert} {t('adminBestillinger.statusFakturert')}
              </span>
              <span className="text-sm bg-green-100 text-green-600 px-3 py-1 rounded-full font-medium">
                {antallPrStatus.Levert} {t('adminBestillinger.statusLevert')}
              </span>
              <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                {bestillinger.length} totalt
              </span>
            </div>
          </div>
          <button
            onClick={handleLoggUt}
            className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            {t('adminBestillinger.loggUt')}
          </button>
        </div>

        {/* Filterknapper */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {filterKnapper.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-[#106C75] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#106C75] hover:text-[#106C75]'
              }`}
            >
              {label}
              {key !== 'Alle' && (
                <span className="ml-1.5 opacity-70">({antallPrStatus[key] ?? bestillinger.length})</span>
              )}
              {key === 'Alle' && (
                <span className="ml-1.5 opacity-70">({bestillinger.length})</span>
              )}
            </button>
          ))}
        </div>

        {laster && <p className="text-gray-400 mb-4">Laster …</p>}
        {feil && <p className="text-red-600 mb-4">Feil: {feil}</p>}

        {/* Tabell */}
        {filtrerte.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
            {bestillinger.length === 0
              ? t('adminBestillinger.ingenBestillinger')
              : 'Ingen bestillinger med valgt filter.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">{t('adminBestillinger.kolDato')}</th>
                    <th className="text-left px-4 py-3">{t('adminBestillinger.kolSkole')}</th>
                    <th className="text-left px-4 py-3">{t('adminBestillinger.kolKontakt')}</th>
                    <th className="text-left px-4 py-3">{t('adminBestillinger.kolEpost')}</th>
                    <th className="text-right px-4 py-3">{t('adminBestillinger.kolAntall')}</th>
                    <th className="text-left px-4 py-3">{t('adminBestillinger.kolAdresse')}</th>
                    <th className="text-right px-4 py-3">{t('adminBestillinger.kolKortpris')}</th>
                    <th className="text-right px-4 py-3">{t('adminBestillinger.kolPorto')}</th>
                    <th className="text-right px-4 py-3">{t('adminBestillinger.kolTotal')}</th>
                    <th className="text-center px-4 py-3">{t('adminBestillinger.kolStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrerte.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formaterDato(b.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {b.skolenavn}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{b.kontaktperson}</td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${b.epost}`} className="text-[#B5560F] hover:underline">
                          {b.epost}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{b.antall_kort}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {b.gate}, {b.postnummer} {b.poststed}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.kortpris} kr</td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.porto} kr</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#B5560F]">
                        {b.total} kr
                        <span className="block text-[10px] font-normal text-gray-400">
                          {t('adminBestillinger.eksMva')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => byttStatus(b.id)}
                          title="Klikk for å bytte status"
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFarge(b.status)}`}
                        >
                          {t(`adminBestillinger.status${b.status}`)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtrerte.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Viser {filtrerte.length} av {bestillinger.length} bestillinger · Klikk på status for å endre
          </p>
        )}

        {/* Innstillinger */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-800 text-base">Prisinnstillinger</h2>
            <p className="text-xs text-gray-500 mt-0.5">Endringer lagres i nettleseren og påvirker bestillingsskjemaet umiddelbart.</p>
          </div>
          <div className="p-6 space-y-6">

            {/* Kortpris */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kortpris per stk (kr)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={satser.kortpris}
                  onChange={e => setSatser(s => ({ ...s, kortpris: Number(e.target.value) }))}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]"
                />
                <span className="text-sm text-gray-500">kr / kort</span>
              </div>
            </div>

            {/* Portotrapper */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Portotrapper (basert på antall kort)</label>
                <button
                  type="button"
                  onClick={() => setSatser(s => ({
                    ...s,
                    portoSatser: [...s.portoSatser, { fraAntall: (s.portoSatser.at(-1)?.tilAntall ?? 0) + 1, tilAntall: null, porto: 99 }]
                  }))}
                  className="text-xs text-[#B5560F] hover:underline"
                >
                  + Legg til trinn
                </button>
              </div>
              <div className="space-y-2">
                {satser.portoSatser.map((trinn, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 w-6 text-right">{i + 1}.</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={trinn.fraAntall}
                        onChange={e => setSatser(s => {
                          const ny = [...s.portoSatser]
                          ny[i] = { ...ny[i], fraAntall: Number(e.target.value) }
                          return { ...s, portoSatser: ny }
                        })}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]"
                      />
                      <span className="text-xs text-gray-400">–</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="∞"
                        value={trinn.tilAntall ?? ''}
                        onChange={e => setSatser(s => {
                          const ny = [...s.portoSatser]
                          ny[i] = { ...ny[i], tilAntall: e.target.value === '' ? null : Number(e.target.value) }
                          return { ...s, portoSatser: ny }
                        })}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]"
                      />
                      <span className="text-xs text-gray-500">kort</span>
                    </div>
                    <span className="text-xs text-gray-400">→</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={trinn.porto}
                        onChange={e => setSatser(s => {
                          const ny = [...s.portoSatser]
                          ny[i] = { ...ny[i], porto: Number(e.target.value) }
                          return { ...s, portoSatser: ny }
                        })}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B31]"
                      />
                      <span className="text-xs text-gray-500">kr porto</span>
                    </div>
                    {satser.portoSatser.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSatser(s => ({ ...s, portoSatser: s.portoSatser.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600 text-xs ml-1"
                      >
                        Slett
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Handlinger */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  lagreSatser(satser)
                  setSatserLagret(true)
                  setTimeout(() => setSatserLagret(false), 2500)
                }}
                className="bg-[#FF7B31] text-gray-900 font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4681a] transition-colors text-sm"
              >
                {satserLagret ? 'Lagret!' : 'Lagre innstillinger'}
              </button>
              <button
                type="button"
                onClick={() => setSatser(STANDARD_SATSER)}
                className="border border-gray-300 text-gray-600 px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors text-sm"
              >
                Tilbakestill til standard
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
