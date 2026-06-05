import { useState, useMemo } from 'react'
import partnereData from '../data/kulturkort-partnere.json'
import { Link } from 'react-router-dom'

const TYPE_IKONER = {
  Kino: '🎬', Bowling: '🎳', Museum: '🏛️', Fotball: '⚽', Ishockey: '🏒',
  Svømmehall: '🏊', Svømming: '🏊', Badeland: '🏊', 'Badeland/svømmehall': '🏊',
  Klatring: '🧗', Klatrepark: '🧗', Høydepark: '🧗', Trampolinepark: '🤸',
  Hoppepark: '🤸', Hopping: '🤸', Lekeland: '🎠',
  Teater: '🎭', 'Kino/Teater': '🎭', 'Kino/forestillinger': '🎬',
  Alpint: '⛷️', Ski: '⛷️', Skitrekk: '⛷️', 'Skitrekk / Bading': '⛷️',
  'Snowboard / Alpin': '🏂', Golf: '⛳', Minigolf: '⛳', Fotballgolf: '⛳',
  Lasertag: '🔫', Paintball: '🔫', Gokarting: '🏎️', 'Escape room': '🔐',
  Dyrepark: '🦁', Gårdsbesøk: '🐄', Besøksgård: '🐄', Hest: '🐴',
  Riding: '🐴', Ridetur: '🐴', Padel: '🎾', Basketball: '🏀',
  Håndball: '🤾', Hockey: '🏒', Boksing: '🥊', Taekwondo: '🥋',
  Dansing: '💃', Ballett: '🩰', Musikkskole: '🎵', Vitensenter: '🔬',
  Opplevelse: '✨', Opplevelsessenter: '✨', Aktivitetspark: '🎯',
  Aktivitetssenter: '🎯', Kultursenter: '🏛️', Kulturpark: '🌳',
  Fritidsklubb: '🎉', 'E-sport': '🎮', Curling: '🥌', Skøyter: '⛸️',
  Surfing: '🏄', Padling: '🚣', SUP: '🏄', Båt: '⛵', Bueskyting: '🏹',
  Discgolf: '🥏', Motorsport: '🏁', Grottevandring: '🦇',
  Trening: '💪', Bad: '🛁', Bading: '🏊', Cafe: '☕', Pizza: '🍕',
  Putball: '🎯',
}

function typeIkon(type) {
  return TYPE_IKONER[type] || '🎟️'
}

function normaliserType(type) {
  if (!type) return 'Annet'
  if (type.includes(',') || type.includes('/') || type.toLowerCase().includes(' og ')) return 'Kombinert'
  return type
}

export default function Kulturkort() {
  const aktive = useMemo(() => partnereData.filter(p => p.published), [])

  const fylker = useMemo(() => ['Alle fylker', ...Array.from(new Set(aktive.map(p => p.fylke))).sort()], [aktive])
  const [valgtFylke, setValgtFylke] = useState('Alle fylker')

  const kommunerIFylke = useMemo(() => {
    const base = valgtFylke === 'Alle fylker' ? aktive : aktive.filter(p => p.fylke === valgtFylke)
    return ['Alle kommuner', ...Array.from(new Set(base.map(p => p.kommune))).sort()]
  }, [aktive, valgtFylke])

  const [valgtKommune, setValgtKommune] = useState('Alle kommuner')

  const typer = useMemo(() => {
    const base = aktive
      .filter(p => valgtFylke === 'Alle fylker' || p.fylke === valgtFylke)
      .filter(p => valgtKommune === 'Alle kommuner' || p.kommune === valgtKommune)
    return ['Alle typer', ...Array.from(new Set(base.map(p => p.type).filter(Boolean))).sort()]
  }, [aktive, valgtFylke, valgtKommune])

  const [valgtType, setValgtType] = useState('Alle typer')
  const [søk, setSøk] = useState('')

  function handleFylke(e) {
    setValgtFylke(e.target.value)
    setValgtKommune('Alle kommuner')
    setValgtType('Alle typer')
  }
  function handleKommune(e) {
    setValgtKommune(e.target.value)
    setValgtType('Alle typer')
  }

  const filtrert = useMemo(() => aktive
    .filter(p => valgtFylke === 'Alle fylker' || p.fylke === valgtFylke)
    .filter(p => valgtKommune === 'Alle kommuner' || p.kommune === valgtKommune)
    .filter(p => valgtType === 'Alle typer' || p.type === valgtType)
    .filter(p => !søk || p.navn.toLowerCase().includes(søk.toLowerCase()) || p.kommune.toLowerCase().includes(søk.toLowerCase()))
  , [aktive, valgtFylke, valgtKommune, valgtType, søk])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#F47920] to-[#D6006E] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Kulturkortet</h1>
          <p className="text-xl md:text-2xl opacity-90 mb-2">
            Over {aktive.length} samarbeidspartnere over hele Norge
          </p>
          <p className="opacity-80 text-lg">
            Med Kulturkortet får elever rabatt hos disse aktørene
          </p>
          <Link
            to="/kulturkortet/bestill"
            className="inline-block mt-8 bg-white text-[#D6006E] font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors text-lg shadow-lg"
          >
            Bestill Kulturkort til din skole
          </Link>
        </div>
      </div>

      {/* Filtre */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <input
              type="search"
              placeholder="Søk etter navn eller sted..."
              value={søk}
              onChange={e => setSøk(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
            <select
              value={valgtFylke}
              onChange={handleFylke}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            >
              {fylker.map(f => <option key={f}>{f}</option>)}
            </select>
            <select
              value={valgtKommune}
              onChange={handleKommune}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            >
              {kommunerIFylke.map(k => <option key={k}>{k}</option>)}
            </select>
            <select
              value={valgtType}
              onChange={e => setValgtType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            >
              {typer.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Viser <span className="font-semibold text-[#F47920]">{filtrert.length}</span> av {aktive.length} partnere
          </p>
        </div>
      </div>

      {/* Partnerkort */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {filtrert.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg">Ingen partnere funnet med disse filtrene.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtrert.map(partner => (
              <div
                key={partner.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{typeIkon(partner.type)}</span>
                  <div className="min-w-0 w-full">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate" title={partner.navn}>
                      {partner.navn}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{partner.kommune}</p>
                    {partner.type && (
                      <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-[#F47920]/10 text-[#F47920]">
                        {partner.type}
                      </span>
                    )}
                    {partner.nettside && (
                      <a
                        href={partner.nettside}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-[#D6006E] hover:underline font-medium"
                      >
                        Besøk nettside →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
