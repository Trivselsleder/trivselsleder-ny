import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function SvarOversikt({ kurs, onLukk }) {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [andreKurs, setAndreKurs] = useState([])
  const [flytterRad, setFlytterRad] = useState(null)
  // Påminnelse etter flytting: skolen sitter igjen med invitasjon om gammel hall
  // og dato, så den MÅ inviteres på nytt. Banneret har med vilje ikke kryss — det
  // er en oppgave, ikke en kvittering — og står til modalen lukkes.
  const [flyttetTil, setFlyttetTil] = useState(null) // { skole, kursNavn }

  // Registrere/endre svar på vegne av en skole (telefon/e-post-svar). Gjenbruker
  // NØYAKTIG samme lagringsvei som skolens eget skjema (lagre_skole_svar), så
  // purring/påminnelse leser de samme feltene. p_pa_vegne_av=true får funksjonen
  // til å stemple svar_registrert_av/at; skolens eget svar (default false) lar dem stå null.
  const [redigerRad, setRedigerRad] = useState(null) // kurs_skole-raden som redigeres
  const [navnMap, setNavnMap] = useState({})         // svar_registrert_av (uuid) → navn
  const [kommer, setKommer] = useState(null)
  const [antallTl, setAntallTl] = useState('')
  const [arsakIkkeKomme, setArsakIkkeKomme] = useState('')
  const [vertskapBekreftet, setVertskapBekreftet] = useState(null)
  const [arsakIkkeVertskap, setArsakIkkeVertskap] = useState('')
  const [kommentar, setKommentar] = useState('')
  const [apenForAnnet, setApenForAnnet] = useState(false)
  const [lagrer, setLagrer] = useState(false)
  const [skjemaFeil, setSkjemaFeil] = useState('')

  async function hent() {
    setLaster(true)
    const { data } = await supabase
      .from('kurs_skole')
      .select('id, skole_id, kommer, antall_tl, er_vertskap, vertskap_bekreftet, arsak_ikke_komme, arsak_ikke_vertskap, kommentar, apen_for_annet_kurs, svart, melding_handtert, lenke_token, svar_registrert_av, svar_registrert_at, skoler(navn, kommunenavn)')
      .eq('kurs_id', kurs.id)
      .order('svart', { ascending: false })
      .range(0, 9999)
    const rader = data ?? []
    setRader(rader)
    setLaster(false)

    // Slå opp navn på de ansatte som har ført inn svar (for «Registrert av …»).
    const ider = [...new Set(rader.map(r => r.svar_registrert_av).filter(Boolean))]
    if (ider.length > 0) {
      const { data: profiler } = await supabase.from('profiles').select('id, navn').in('id', ider)
      setNavnMap(Object.fromEntries((profiler ?? []).map(p => [p.id, p.navn])))
    }
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
    // Slå opp navnene FØR hent() fjerner raden fra denne lista (den hører nå til
    // det nye kurset), så banneret kan navngi både skolen og målkurset.
    const skoleNavn = rader.find(r => r.id === id)?.skoler?.navn || 'Skolen'
    const kursNavn = andreKurs.find(k => k.id === nyttKursId)?.navn || 'det nye kurset'
    setFlytterRad(null)
    setFlyttetTil({ skole: skoleNavn, kursNavn })
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

  // Kort dato «4.8.» til «Registrert av …»-linja.
  function kortDato(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getDate()}.${d.getMonth() + 1}.`
  }

  // Åpne skjemaet for én skole. Forhåndsfyller fra eksisterende svar (endre),
  // eller blankt (registrere for første gang) — samme betingede logikk som
  // SvarSkjema.jsx som skolen selv fyller ut.
  function apneRediger(r) {
    setSkjemaFeil('')
    setRedigerRad(r)
    setKommer(r.svart ? r.kommer : null)
    setAntallTl(r.antall_tl ?? '')
    setArsakIkkeKomme(r.arsak_ikke_komme ?? '')
    setVertskapBekreftet(r.vertskap_bekreftet)
    setArsakIkkeVertskap(r.arsak_ikke_vertskap ?? '')
    setKommentar(r.kommentar ?? '')
    setApenForAnnet(r.apen_for_annet_kurs ?? false)
  }

  // Vises kun når skolen er utpekt vertskap og kommer — samme betingelse som SvarSkjema.jsx.
  const visVertskap = redigerRad?.er_vertskap === true && kommer === true

  async function lagreSvar() {
    setSkjemaFeil('')
    if (kommer === null) { setSkjemaFeil('Velg om skolen kommer eller ikke.'); return }
    if (kommer === true && (antallTl === '' || Number(antallTl) < 0)) {
      setSkjemaFeil('Fyll inn hvor mange trivselsledere som kommer.'); return
    }
    if (kommer === false && arsakIkkeKomme.trim() === '') {
      setSkjemaFeil('Skriv kort hvorfor skolen ikke kommer.'); return
    }
    if (visVertskap && vertskapBekreftet === null) {
      setSkjemaFeil('Velg om skolen kan være vertskap.'); return
    }

    setLagrer(true)
    // Samme RPC og samme parametre som skolens eget skjema — eneste tillegg er
    // p_pa_vegne_av=true, som stempler hvem som registrerte.
    //
    // VERTSKAP: p_er_vertskap skriver kolonnen vertskap_bekreftet DIREKTE. Sender vi
    // null når feltet er skjult, ville vi stille slette en bekreftelse skolen har gitt.
    // Derfor: vis feltet → bruk valget; skjult felt → send GJELDENDE verdi uendret.
    const { error } = await supabase.rpc('lagre_skole_svar', {
      token: redigerRad.lenke_token,
      p_kommer: kommer,
      p_antall_tl: kommer ? Number(antallTl) : null,
      p_er_vertskap: visVertskap ? vertskapBekreftet : (redigerRad.vertskap_bekreftet ?? null),
      p_arsak_ikke_komme: kommer ? null : arsakIkkeKomme.trim(),
      p_arsak_ikke_vertskap: visVertskap
        ? (vertskapBekreftet === false && arsakIkkeVertskap.trim() !== '' ? arsakIkkeVertskap.trim() : null)
        : (redigerRad.arsak_ikke_vertskap ?? null),
      p_kommentar: kommentar.trim() === '' ? null : kommentar.trim(),
      p_apen_for_annet_kurs: kommer === false ? apenForAnnet : false,
      p_pa_vegne_av: true,
    })
    setLagrer(false)
    if (error) {
      setSkjemaFeil('Kunne ikke lagre svaret: ' + error.message)
      return
    }
    setRedigerRad(null)
    hent()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full my-8">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold">Svar fra skolene</h3>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{kurs.navn} — nettverk: {kurs.nettverk || '—'}</p>

        {/* Påminnelse etter flytting — bevisst uten lukkekryss (oppgave, ikke
            kvittering). Står til modalen lukkes. */}
        {flyttetTil && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              «{flyttetTil.skole}» er flyttet til «{flyttetTil.kursNavn}»
            </p>
            <p className="text-sm text-amber-800 mt-1">
              Hall og dato er nye, så invitasjonen skolen allerede fikk er utdatert. Skolen står nå
              som «Ikke sendt» på det nye kurset.
            </p>
            <p className="text-sm font-medium text-amber-900 mt-2">
              → Gå til «{flyttetTil.kursNavn}» og trykk «Send invitasjoner» for å sende oppdatert invitasjon.
            </p>
          </div>
        )}

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
                    <div className="flex flex-col items-end gap-1">
                      <span className={'px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap ' + statusKlasse(r)}>
                        {statusTekst(r)}
                      </span>
                      <button onClick={() => apneRediger(r)} className="text-xs text-orange hover:underline whitespace-nowrap">
                        {r.svart ? 'Endre svar' : 'Registrer svar'}
                      </button>
                    </div>
                  </div>

                  {r.svar_registrert_av && (
                    <p className="mt-2 text-xs text-gray-400">
                      Registrert av {navnMap[r.svar_registrert_av] || 'en ansatt'} {kortDato(r.svar_registrert_at)}
                    </p>
                  )}

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

      {/* Skjema for å registrere/endre svar på vegne av skolen — husets egen modal,
          ikke window.confirm. Samme felter og betingede logikk som SvarSkjema.jsx. */}
      {redigerRad && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-[60] overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full my-8">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-lg font-semibold">
                {redigerRad.svart ? 'Endre svar' : 'Registrer svar'} på vegne av skolen
              </h3>
              <button onClick={() => setRedigerRad(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-5">{redigerRad.skoler?.navn || 'Skolen'} — {kurs.navn}</p>

            <div className="mb-5">
              <p className="text-sm font-medium text-gray-800 mb-2">Kommer trivselslederne på kurs?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setKommer(true)}
                  className={kommer === true
                    ? 'flex-1 py-2.5 px-4 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                    : 'flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-gray-300'}
                >
                  Ja, kommer
                </button>
                <button
                  type="button"
                  onClick={() => setKommer(false)}
                  className={kommer === false
                    ? 'flex-1 py-2.5 px-4 rounded-xl border-2 border-pink-600 bg-pink-50 text-pink-700 font-semibold'
                    : 'flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-gray-300'}
                >
                  Nei, kommer ikke
                </button>
              </div>
            </div>

            {kommer === true && (
              <div className="mb-5">
                <label htmlFor="ra-antallTl" className="block text-sm font-medium text-gray-800 mb-1">Ca. hvor mange trivselsledere?</label>
                <input
                  id="ra-antallTl"
                  type="number"
                  min="0"
                  value={antallTl}
                  onChange={e => setAntallTl(e.target.value)}
                  className="w-32 py-2.5 px-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}

            {visVertskap && (
              <div className="mb-5">
                <p className="text-sm font-medium text-gray-800 mb-2">Kan skolen være vertskap kursdagen?</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setVertskapBekreftet(true)}
                    className={vertskapBekreftet === true
                      ? 'flex-1 py-2.5 px-4 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                      : 'flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-gray-300'}
                  >
                    Ja, kan være vertskap
                  </button>
                  <button
                    type="button"
                    onClick={() => setVertskapBekreftet(false)}
                    className={vertskapBekreftet === false
                      ? 'flex-1 py-2.5 px-4 rounded-xl border-2 border-pink-600 bg-pink-50 text-pink-700 font-semibold'
                      : 'flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-gray-300'}
                  >
                    Nei
                  </button>
                </div>
                {vertskapBekreftet === false && (
                  <div className="mt-3">
                    <label htmlFor="ra-arsakVertskap" className="block text-sm font-medium text-gray-700 mb-1">Hvorfor ikke? (valgfritt)</label>
                    <input
                      id="ra-arsakVertskap"
                      type="text"
                      value={arsakIkkeVertskap}
                      onChange={e => setArsakIkkeVertskap(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {kommer === false && (
              <div className="mb-5">
                <label htmlFor="ra-arsak" className="block text-sm font-medium text-gray-800 mb-1">Hvorfor kommer de ikke?</label>
                <textarea
                  id="ra-arsak"
                  rows="3"
                  value={arsakIkkeKomme}
                  onChange={e => setArsakIkkeKomme(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border-2 border-gray-200 focus:border-pink-600 focus:outline-none"
                />
              </div>
            )}

            {kommer === false && (
              <label className="flex items-start gap-3 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={apenForAnnet}
                  onChange={e => setApenForAnnet(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-800">Åpen for et annet lekekurs i nærheten, hvis mulig.</span>
              </label>
            )}

            {kommer === true && (
              <div className="mb-5">
                <label htmlFor="ra-kommentar" className="block text-sm font-medium text-gray-800 mb-1">
                  Melding til kursholder <span className="font-normal text-gray-500">(valgfritt)</span>
                </label>
                <textarea
                  id="ra-kommentar"
                  rows="3"
                  value={kommentar}
                  onChange={e => setKommentar(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}

            {skjemaFeil && (
              <p className="mb-4 text-sm text-pink-700 bg-pink-50 border border-pink-200 rounded-xl py-2.5 px-3">{skjemaFeil}</p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setRedigerRad(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button
                onClick={lagreSvar}
                disabled={lagrer}
                className="px-4 py-2 bg-orange text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {lagrer ? 'Lagrer …' : 'Lagre svar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
