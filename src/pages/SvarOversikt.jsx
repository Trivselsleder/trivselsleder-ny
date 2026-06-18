import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function SvarOversikt({ kurs, onLukk }) {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [andreKurs, setAndreKurs] = useState([])
  const [flytterRad, setFlytterRad] = useState(null)

  async function hent() {
    setLaster(true)
    const { data } = await supabase
      .from('kurs_skole')
      .select('id, skole_id, kommer, antall_tl, er_vertskap, vertskap_bekreftet, arsak_ikke_komme, arsak_ikke_vertskap, kommentar, apen_for_annet_kurs, svart, melding_handtert, skoler(navn, kommunenavn)')
      .eq('kurs_id', kurs.id)
      .order('svart', { ascending: false })
      .range(0, 9999)
    setRader(data ?? [])
    setLaster(false)
  }

  async function hentAndreKurs() {
    const { data } = await supabase
      .from('kurs')
      .select('id, navn, dato, nettverk')
      .neq('id', kurs.id)
      .order('dato', { ascending: true })
      .range(0, 9999)
    setAndreKurs(data ?? [])
  }

  useEffect(() => { hent(); hentAndreKurs() }, [])

  async function settHandtert(id, verdi) {
    setRader(rader.map(r => r.id === id ? { ...r, melding_handtert: verdi } : r))
    const { error } = await supabase.rpc('sett_melding_handtert', { p_id: id, p_handtert: verdi })
    if (error) {
      setRader(rader.map(r => r.id === id ? { ...r, melding_handtert: !verdi } : r))
      alert('Kunne ikke lagre. Prøv igjen.')
    }
  }

  async function flyttSkole(id, nyttKursId) {
    const { error } = await supabase.rpc('flytt_skole_til_kurs', { p_id: id, p_nytt_kurs_id: nyttKursId })
    if (error) {
      alert('Kunne ikke flytte skolen. Prøv igjen.')
      return
    }
    setFlytterRad(null)
    hent()
  }

  const antall = rader.length
  const harSvart = rader.filter(r => r.svart).length
  const ja = rader.filter(r => r.svart && r.kommer === true).length
  const nei = rader.filter(r => r.svart && r.kommer === false).length

  function statusTekst(r) {
    if (!r.svart) return 'Ikke svart'
    return r.kommer ? 'Kommer' : 'Kommer ikke'
  }

  function statusKlasse(r) {
    if (!r.svart) return 'bg-gray-100 text-gray-500'
    return r.kommer ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'
  }

  function harMelding(r) {
    return !!(r.kommentar || r.arsak_ikke_komme || r.arsak_ikke_vertskap || r.apen_for_annet_kurs)
  }

  function formaterDato(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full my-8">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold">Svar fra skolene</h3>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{kurs.navn} — nettverk: {kurs.nettverk || '—'}</p>

        {laster && <p className="text-gray-400">Laster …</p>}

        {!laster && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                {harSvart} av {antall} har svart
              </span>
              <span className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-sm font-medium">
                {ja} kommer
              </span>
              <span className="px-3 py-1 rounded-lg bg-pink-100 text-pink-700 text-sm font-medium">
                {nei} kommer ikke
              </span>
            </div>

            {antall === 0 && (
              <p className="text-gray-400">Ingen skoler er koblet til dette kurset ennå.</p>
            )}

            <div className="space-y-3">
              {rader.map(r => (
                <div key={r.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{r.skoler?.navn || 'Ukjent skole'}</p>
                      <p className="text-sm text-gray-500">{r.skoler?.kommunenavn || ''}</p>
                    </div>
                    <span className={'px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap ' + statusKlasse(r)}>
                      {statusTekst(r)}
                    </span>
                  </div>

                  {r.svart && r.kommer && (
                    <div className="mt-3 text-sm text-gray-700 space-y-1">
                      <p>Antall trivselsledere: <span className="font-medium">{r.antall_tl ?? '—'}</span></p>
                      {r.er_vertskap && (
                        <p>
                          Vertskap:{' '}
                          <span className="font-medium">
                            {r.vertskap_bekreftet === true ? 'Bekreftet' : r.vertskap_bekreftet === false ? 'Kan ikke' : '—'}
                          </span>
                          {r.vertskap_bekreftet === false && r.arsak_ikke_vertskap && (
                            <span className="text-gray-500"> ({r.arsak_ikke_vertskap})</span>
                          )}
                        </p>
                      )}
                      {r.kommentar && (
                        <p className="text-gray-600">Melding: «{r.kommentar}»</p>
                      )}
                    </div>
                  )}

                  {r.svart && r.kommer === false && (
                    <div className="mt-3 text-sm text-gray-700 space-y-1">
                      {r.arsak_ikke_komme && <p className="text-gray-600">Årsak: «{r.arsak_ikke_komme}»</p>}
                      {r.apen_for_annet_kurs && (
                        <p className="text-orange-700 font-medium">Åpen for et annet kurs i nærheten</p>
                      )}
                    </div>
                  )}

                  {r.svart && r.kommer === false && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {flytterRad === r.id ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Flytt til hvilket kurs?</p>
                          {andreKurs.length === 0 && (
                            <p className="text-sm text-gray-400">Ingen andre kurs å flytte til.</p>
                          )}
                          {andreKurs.map(k => (
                            <button
                              key={k.id}
                              onClick={() => flyttSkole(r.id, k.id)}
                              className="block w-full text-left text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
                            >
                              {k.navn || 'Kurs'} — {formaterDato(k.dato)} {k.nettverk ? '(' + k.nettverk + ')' : ''}
                            </button>
                          ))}
                          <button onClick={() => setFlytterRad(null)} className="text-sm text-gray-500 hover:underline">
                            Avbryt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setFlytterRad(r.id)}
                          className="text-sm text-orange hover:underline"
                        >
                          Flytt til annet kurs
                        </button>
                      )}
                    </div>
                  )}

                  {r.svart && harMelding(r) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      {r.melding_handtert ? (
                        <span className="text-sm text-green-700 font-medium">✓ Håndtert</span>
                      ) : (
                        <span className="text-sm text-gray-400">Ikke håndtert</span>
                      )}
                      <button
                        onClick={() => settHandtert(r.id, !r.melding_handtert)}
                        className={
                          r.melding_handtert
                            ? 'text-sm text-gray-500 hover:underline'
                            : 'text-sm bg-orange text-white px-3 py-1.5 rounded-lg hover:opacity-90'
                        }
                      >
                        {r.melding_handtert ? 'Angre' : 'Marker som håndtert'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
