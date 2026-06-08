import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const TYPE_LABEL = {
  barnehage: 'Barnehage', barnetrinn: 'Barnetrinn', ungdomstrinn: 'Ungdomstrinn',
  kombinert: 'Kombinert', SFO: 'SFO',
}

const STATUS_STIL = {
  påmeldt:  'bg-yellow-100 text-yellow-700',
  godkjent: 'bg-green-100 text-green-700',
  avvist:   'bg-red-100 text-red-600',
}

function formaterDato(iso) {
  return new Date(iso).toLocaleString('nb-NO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function InfoRad({ label, verdi }) {
  if (!verdi) return null
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{verdi}</span>
    </div>
  )
}

function KontaktBlokk({ tittel, navn, epost, telefon }) {
  if (!navn && !epost) return null
  return (
    <div>
      <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide mb-1">{tittel}</p>
      <InfoRad label="Navn" verdi={navn} />
      <InfoRad label="E-post" verdi={epost && <a href={`mailto:${epost}`} className="text-[#F47920] hover:underline">{epost}</a>} />
      <InfoRad label="Telefon" verdi={telefon} />
    </div>
  )
}

const RESULTAT_LABEL = {
  invitert:   { tekst: 'invitert', stil: 'text-green-600' },
  eksisterer: { tekst: 'allerede registrert – knyttet til skolen', stil: 'text-blue-600' },
  feil:       { tekst: 'feil ved invitasjon', stil: 'text-red-600' },
}

function Modal({ p, onLukk, onOppdaterStatus }) {
  const [laster, setLaster] = useState(false)
  const [godkjentResultat, setGodkjentResultat] = useState(null)

  async function settStatus(nyStatus) {
    setLaster(true)

    if (nyStatus === 'godkjent') {
      try {
        const res = await fetch('/api/admin/godkjenn-paamelding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paameldinId: p.id }),
        })
        const data = await res.json()
        if (!res.ok) {
          console.error('Godkjenning feilet:', data.error)
          setLaster(false)
          return
        }
        onOppdaterStatus(p.id, 'godkjent')
        setGodkjentResultat(data)
      } catch (e) {
        console.error('Nettverksfeil:', e)
      }
      setLaster(false)
      return
    }

    await onOppdaterStatus(p.id, nyStatus)
    setLaster(false)
    onLukk()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{p.skolenavn}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {TYPE_LABEL[p.type] ?? p.type} · {p.kommune} · {formaterDato(p.created_at)}
            </p>
          </div>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Innhold */}
        <div className="px-6 py-5 space-y-5">

          <div>
            <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide mb-1">Skole</p>
            <InfoRad label="Skolenavn" verdi={p.skolenavn} />
            <InfoRad label="Type" verdi={TYPE_LABEL[p.type] ?? p.type} />
            <InfoRad label="Antall elever" verdi={p.antall_elever} />
            <InfoRad label="Hjemmeside" verdi={p.hjemmeside && <a href={p.hjemmeside} target="_blank" rel="noreferrer" className="text-[#F47920] hover:underline">{p.hjemmeside}</a>} />
          </div>

          <div>
            <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide mb-1">Adresse</p>
            <InfoRad label="Gateadresse" verdi={p.gateadresse} />
            <InfoRad label="Postnr / poststed" verdi={`${p.postnummer} ${p.poststed}`} />
            <InfoRad label="Kommune" verdi={p.kommune} />
            <InfoRad label="Fylke" verdi={p.fylke} />
          </div>

          <div>
            <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide mb-1">Faktura</p>
            <InfoRad label="Org.nr" verdi={p.organisasjonsnummer} />
            <InfoRad label="Fakturaadresse" verdi={p.fakturaadresse} />
            <InfoRad label="Fakturareferanse" verdi={p.fakturareferanse} />
            <InfoRad label="Kontortelefon" verdi={p.kontortelefon} />
          </div>

          <KontaktBlokk tittel="Rektor" navn={p.rektor_navn} epost={p.rektor_epost} telefon={p.rektor_telefon} />
          <KontaktBlokk tittel="Hoved-TL-ansvarlig (HTLA)" navn={p.htla_navn} epost={p.htla_epost} telefon={p.htla_telefon} />
          <KontaktBlokk tittel="TL-ansvarlig (TLA)" navn={p.tla_navn} epost={p.tla_epost} telefon={p.tla_telefon} />

          {p.merknader && (
            <div>
              <p className="text-xs font-semibold text-[#F47920] uppercase tracking-wide mb-1">Merknader</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.merknader}</p>
            </div>
          )}
        </div>

        {/* Handlinger */}
        {godkjentResultat ? (
          <div className="px-6 py-5 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-gray-900">
                Skole aktivert: {godkjentResultat.skole?.navn}
              </p>
            </div>
            {(godkjentResultat.resultater?.htla || godkjentResultat.resultater?.tla) && (
              <ul className="text-sm space-y-1 pl-7">
                {godkjentResultat.resultater.htla && (
                  <li>
                    <span className="text-gray-500">HTLA ({p.htla_epost}): </span>
                    <span className={RESULTAT_LABEL[godkjentResultat.resultater.htla.status]?.stil ?? ''}>
                      {RESULTAT_LABEL[godkjentResultat.resultater.htla.status]?.tekst ?? godkjentResultat.resultater.htla.status}
                    </span>
                  </li>
                )}
                {godkjentResultat.resultater.tla && (
                  <li>
                    <span className="text-gray-500">TLA ({p.tla_epost}): </span>
                    <span className={RESULTAT_LABEL[godkjentResultat.resultater.tla.status]?.stil ?? ''}>
                      {RESULTAT_LABEL[godkjentResultat.resultater.tla.status]?.tekst ?? godkjentResultat.resultater.tla.status}
                    </span>
                  </li>
                )}
              </ul>
            )}
            <div className="flex justify-end pt-1">
              <button
                onClick={onLukk}
                className="bg-[#F47920] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e06910] transition-colors"
              >
                Lukk
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STIL[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {p.status}
            </span>
            <div className="flex gap-2">
              {p.status !== 'avvist' && (
                <button
                  onClick={() => settStatus('avvist')}
                  disabled={laster}
                  className="border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Avvis
                </button>
              )}
              {p.status !== 'godkjent' && (
                <button
                  onClick={() => settStatus('godkjent')}
                  disabled={laster}
                  className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {laster ? 'Godkjenner…' : 'Godkjenn og aktiver skole'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function AdminPaameldinger() {
  const [paameldinger, setPaameldinger] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [filter, setFilter] = useState('Alle')
  const [valgt, setValgt] = useState(null)

  useEffect(() => {
    supabase
      .from('paameldinger')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setFeil(error.message); }
        else setPaameldinger(data ?? [])
        setLaster(false)
      })
  }, [])

  async function oppdaterStatus(id, nyStatus) {
    const forrige = paameldinger
    setPaameldinger(prev => prev.map(p => p.id === id ? { ...p, status: nyStatus } : p))
    const { error } = await supabase.from('paameldinger').update({ status: nyStatus }).eq('id', id)
    if (error) {
      console.error('Statusoppdatering feilet:', error.message)
      setPaameldinger(forrige)
    }
  }

  const antall = useMemo(() => ({
    påmeldt:  paameldinger.filter(p => p.status === 'påmeldt').length,
    godkjent: paameldinger.filter(p => p.status === 'godkjent').length,
    avvist:   paameldinger.filter(p => p.status === 'avvist').length,
  }), [paameldinger])

  const filtrerte = useMemo(() =>
    filter === 'Alle' ? paameldinger : paameldinger.filter(p => p.status === filter.toLowerCase()),
    [paameldinger, filter]
  )

  const filterKnapper = [
    { key: 'Alle', label: 'Alle', count: paameldinger.length },
    { key: 'Påmeldt', label: 'Påmeldt', count: antall.påmeldt },
    { key: 'Godkjent', label: 'Godkjent', count: antall.godkjent },
    { key: 'Avvist', label: 'Avvist', count: antall.avvist },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Påmeldinger</h1>
          <div className="flex gap-3 mt-2 flex-wrap">
            <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
              {antall.påmeldt} påmeldt
            </span>
            <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              {antall.godkjent} godkjent
            </span>
            <span className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-full font-medium">
              {antall.avvist} avvist
            </span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {filterKnapper.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-[#D6006E] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#D6006E] hover:text-[#D6006E]'
              }`}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {/* Innhold */}
        {laster ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : feil ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-600 text-sm">{feil}</div>
        ) : filtrerte.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
            {paameldinger.length === 0 ? 'Ingen påmeldinger ennå.' : 'Ingen påmeldinger med valgt filter.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Dato</th>
                    <th className="text-left px-4 py-3">Skolenavn</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Kommune</th>
                    <th className="text-left px-4 py-3">Rektor</th>
                    <th className="text-left px-4 py-3">E-post</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrerte.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => setValgt(p)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {formaterDato(p.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.skolenavn}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{TYPE_LABEL[p.type] ?? p.type}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.kommune}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{p.rektor_navn}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${p.rektor_epost}`}
                          onClick={e => e.stopPropagation()}
                          className="text-[#F47920] hover:underline"
                        >
                          {p.rektor_epost}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STIL[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
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
            Viser {filtrerte.length} av {paameldinger.length} påmeldinger · Klikk på en rad for detaljer
          </p>
        )}
      </div>

      {valgt && (
        <Modal
          p={valgt}
          onLukk={() => setValgt(null)}
          onOppdaterStatus={async (id, status) => {
            await oppdaterStatus(id, status)
            setValgt(prev => prev?.id === id ? { ...prev, status } : prev)
          }}
        />
      )}
    </div>
  )
}
