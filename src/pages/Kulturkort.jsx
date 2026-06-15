import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
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

export default function Kulturkort() {
  const { t } = useTranslation()
  const [aktive, setAktive] = useState([])
  const [laster, setLaster] = useState(true)

  useEffect(() => {
    supabase
      .from('kulturkort_partnere')
      .select('*')
      .eq('kategori', 'aktiv')
      .order('navn', { ascending: true })
      .then(({ data }) => {
        setAktive(data ?? [])
        setLaster(false)
      })
  }, [])

  const fylker = useMemo(() => [t('kulturkort.alleFylker'), ...Array.from(new Set(aktive.map(p => p.fylke))).sort()], [aktive, t])
  const [valgtFylke, setValgtFylke] = useState('')

  const kommunerIFylke = useMemo(() => {
    const base = !valgtFylke || valgtFylke === t('kulturkort.alleFylker') ? aktive : aktive.filter(p => p.fylke === valgtFylke)
    return [t('kulturkort.alleKommuner'), ...Array.from(new Set(base.map(p => p.kommune))).sort()]
  }, [aktive, valgtFylke, t])

  const [valgtKommune, setValgtKommune] = useState('')

  const typer = useMemo(() => {
    const base = aktive
      .filter(p => !valgtFylke || valgtFylke === t('kulturkort.alleFylker') || p.fylke === valgtFylke)
      .filter(p => !valgtKommune || valgtKommune === t('kulturkort.alleKommuner') || p.kommune === valgtKommune)
    return [t('kulturkort.alleTyper'), ...Array.from(new Set(base.map(p => p.type).filter(Boolean))).sort()]
  }, [aktive, valgtFylke, valgtKommune, t])

  const [valgtType, setValgtType] = useState('')
  const [søk, setSøk] = useState('')

  function handleFylke(e) {
    setValgtFylke(e.target.value)
    setValgtKommune('')
    setValgtType('')
  }
  function handleKommune(e) {
    setValgtKommune(e.target.value)
    setValgtType('')
  }

  const alleFylkerVal = t('kulturkort.alleFylker')
  const alleKommunerVal = t('kulturkort.alleKommuner')
  const alleTyperVal = t('kulturkort.alleTyper')

  const filtrert = useMemo(() => aktive
    .filter(p => !valgtFylke || valgtFylke === alleFylkerVal || p.fylke === valgtFylke)
    .filter(p => !valgtKommune || valgtKommune === alleKommunerVal || p.kommune === valgtKommune)
    .filter(p => !valgtType || valgtType === alleTyperVal || p.type === valgtType)
    .filter(p => !søk || p.navn.toLowerCase().includes(søk.toLowerCase()) || p.kommune.toLowerCase().includes(søk.toLowerCase()))
  , [aktive, valgtFylke, valgtKommune, valgtType, søk, alleFylkerVal, alleKommunerVal, alleTyperVal])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#F47920] to-[#D6006E] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('kulturkort.title')}</h1>
          <p className="text-xl md:text-2xl opacity-90 mb-2">
            {t('kulturkort.ingress', { count: aktive.length })}
          </p>
          <p className="opacity-80 text-lg">{t('kulturkort.underingress')}</p>
          <Link
            to="/kulturkortet/bestill"
            className="inline-block mt-8 bg-white text-[#D6006E] font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors text-lg shadow-lg"
          >
            {t('kulturkort.bestillKnapp')}
          </Link>
        </div>
      </div>

      {/* Filtre */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <input
              type="search"
              placeholder={t('kulturkort.sokPlaceholder')}
              value={søk}
              onChange={e => setSøk(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            />
            <select
              value={valgtFylke || alleFylkerVal}
              onChange={handleFylke}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            >
              {fylker.map(f => <option key={f}>{f}</option>)}
            </select>
            <select
              value={valgtKommune || alleKommunerVal}
              onChange={handleKommune}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            >
              {kommunerIFylke.map(k => <option key={k}>{k}</option>)}
            </select>
            <select
              value={valgtType || alleTyperVal}
              onChange={e => setValgtType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F47920]"
            >
              {typer.map(tv => <option key={tv}>{tv}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-2"
            dangerouslySetInnerHTML={{ __html: t('kulturkort.viser', { antall: filtrert.length, totalt: aktive.length }) }}
          />
        </div>
      </div>

      {/* Partnerkort */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {laster ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#F47920] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrert.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg">{t('kulturkort.ingenFunnet')}</p>
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
                    {partner.beskrivelse && (
                      <p className="mt-2 text-xs text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-line">
                        {partner.beskrivelse}
                      </p>
                    )}
                    {partner.nettside && (
                      <a
                        href={partner.nettside}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-[#D6006E] hover:underline font-medium"
                      >
                        {t('kulturkort.besokNettside')}
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
