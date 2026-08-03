import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// «Send invitasjoner» for ett kurs. Hovedhandlingen er automatisk utsending via
// api/kurs/send-invitasjon (torrkjoring:false), som sender kursinvitasjonen til
// hovedkontakten (htla) på hver skole. Kopier-lenke beholdes som reserveløsning
// når RA vil sende manuelt.
//
// motor_aktiv (nødbremsen) hentes slik Oppfølging gjør det: fra svaret på en
// tørrkjøring mot send-invitasjon ved åpning. Står bremsen på, deaktiveres
// hovedknappen og et rolig banner forklarer hvorfor. Serveren håndhever bremsen
// uansett — knappen er bare den synlige delen.

const ORANSJE = '#F47920'

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function SendLenker({ kurs, onLukk }) {
  const [rader, setRader] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [kopiert, setKopiert] = useState(null)

  const [motorAktiv, setMotorAktiv] = useState(null)
  const [sender, setSender] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [bekreftSend, setBekreftSend] = useState(false)

  const basis = window.location.origin

  // Henter både status per skole (fra kurs_skole) og motor_aktiv (fra en
  // tørrkjøring mot send-invitasjon). To kilder, men hver gjør én ting godt:
  // tabellen viser status/lenker, tørrkjøringen gir nødbremsens tilstand.
  async function last() {
    setLaster(true)
    setFeil(null)

    const { data, error } = await supabase
      .from('kurs_skole')
      .select('id, lenke_token, svart, forste_utsending_at, skole:skole_id ( navn )')
      .eq('kurs_id', kurs.id)
      .range(0, 9999)

    if (error) {
      setFeil(error.message)
      setLaster(false)
      return
    }
    setRader(data ?? [])

    // Tørrkjøring: nekter aldri, returnerer motor_aktiv. Feiler den, lar vi
    // knappen stå på — serveren stopper uansett en ekte sending når bremsen er på.
    try {
      const res = await fetch('/api/kurs/send-invitasjon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kurs_id: kurs.id, torrkjoring: true }),
      })
      const d = await res.json()
      if (res.ok) setMotorAktiv(d.motor_aktiv ?? null)
    } catch {
      // stille: motorAktiv forblir null (knapp aktiv, server verner)
    }

    setLaster(false)
  }

  useEffect(() => { last() }, [kurs.id])

  function lenkeFor(token) {
    return `${basis}/svar/${token}`
  }

  async function kopier(token, id) {
    try {
      await navigator.clipboard.writeText(lenkeFor(token))
      setKopiert(id)
      setTimeout(() => setKopiert(null), 1500)
    } catch {
      alert('Kunne ikke kopiere automatisk. Marker lenken og kopier manuelt.')
    }
  }

  async function kopierAlle() {
    const tekst = rader
      .filter(r => r.lenke_token)
      .map(r => `${r.skole?.navn || 'Skole'}: ${lenkeFor(r.lenke_token)}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(tekst)
      setKopiert('alle')
      setTimeout(() => setKopiert(null), 1500)
    } catch {
      alert('Kunne ikke kopiere automatisk.')
    }
  }

  async function utforSend() {
    setBekreftSend(false)
    setSender(true)
    setResultat(null)
    try {
      const res = await fetch('/api/kurs/send-invitasjon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kurs_id: kurs.id, torrkjoring: false }),
      })
      const d = await res.json()
      if (!res.ok) {
        setResultat({ feil: d.error || 'Ukjent feil ved sending.' })
        setSender(false)
        return
      }
      setResultat(d)
      setSender(false)
      await last() // status oppdateres: sendte skoler får «Sendt»
    } catch (e) {
      setResultat({ feil: 'Nettverksfeil: ' + e.message })
      setSender(false)
    }
  }

  const motorOff = motorAktiv === 'nei'
  const antallASende = rader.filter(r => !r.forste_utsending_at).length
  const knappAv = motorOff || sender || antallASende === 0

  function statusCelle(r) {
    if (r.forste_utsending_at) {
      return <span className="text-gray-700">Sendt {formaterDato(r.forste_utsending_at)}</span>
    }
    if (r.svart) return <span className="text-green-700">Svart</span>
    return <span className="text-gray-400">Ikke sendt</span>
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Send invitasjoner</h3>
            <p className="text-gray-500 text-sm">{kurs.navn || 'Kurs'} — kursinvitasjon per skole</p>
          </div>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {laster && <p className="text-gray-400">Laster …</p>}
        {feil && <p className="text-red-600">Feil: {feil}</p>}

        {!laster && !feil && rader.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            Ingen skoler er koblet til dette kurset ennå. Bruk «Skoler» først.
          </div>
        )}

        {!laster && rader.length > 0 && (
          <>
            {/* Nødbrems (motor_aktiv=nei): rolig, informativt banner — samme ordlyd
                og farge som Oppfølging-siden. Dette er en normaltilstand mens vi tester. */}
            {motorOff && (
              <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="font-semibold text-sky-900">Automatisk utsending er ikke skrudd på ennå</p>
                <p className="text-sm text-sky-800 mt-1">
                  Du kan forberede, men ingen e-post sendes nå. Dette er normalt mens vi tester —
                  utsending skrus på når alt er klart. Du kan fortsatt kopiere lenkene manuelt under.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="text-sm text-gray-500">
                {antallASende > 0
                  ? `${antallASende} ${antallASende === 1 ? 'skole' : 'skoler'} har ikke fått invitasjon ennå.`
                  : 'Alle skoler har fått invitasjon.'}
              </div>
              <div className="text-right">
                <button
                  onClick={() => setBekreftSend(true)}
                  disabled={knappAv}
                  className="text-sm text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: ORANSJE }}
                >
                  {sender ? 'Sender …' : `Send invitasjoner til ${antallASende} ${antallASende === 1 ? 'skole' : 'skoler'}`}
                </button>
                {motorOff && (
                  <p className="text-xs text-gray-400 mt-1">Utsending er satt på pause</p>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2">Skole</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rader.map(r => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium">{r.skole?.navn || '—'}</td>
                      <td className="px-4 py-2">{statusCelle(r)}</td>
                      <td className="px-4 py-2 text-right">
                        {r.lenke_token
                          ? <button onClick={() => kopier(r.lenke_token, r.id)} className="text-orange hover:underline">
                              {kopiert === r.id ? 'Kopiert!' : 'Kopier lenke'}
                            </button>
                          : <span className="text-red-500 text-xs">mangler token</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-3">
              <button onClick={kopierAlle} className="text-sm text-gray-600 hover:text-gray-900">
                {kopiert === 'alle' ? 'Kopiert!' : 'Kopier alle lenker'}
              </button>
            </div>

            {/* Resultat etter ekte sending — samme mønster som Oppfølging-siden.
                Rødt er kun for feil; «hoppet over» (bl.a. allerede sendt) vises rolig. */}
            {resultat && (
              <div className={`mt-4 rounded-lg border p-4 text-sm ${resultat.feil ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                {resultat.feil ? (
                  <p className="text-red-700">Feil: {resultat.feil}</p>
                ) : (
                  <>
                    <p className="text-green-800 font-medium">
                      Sendt til {resultat.sendt_antall ?? 0} {(resultat.sendt_antall ?? 0) === 1 ? 'skole' : 'skoler'}.
                    </p>
                    {resultat.hoppet_over?.length > 0 && (
                      <div className="text-gray-600 mt-2">
                        <p>Hoppet over ({resultat.hoppet_over.length}):</p>
                        <ul className="list-disc ml-5 mt-1">
                          {resultat.hoppet_over.map((h, i) => (
                            <li key={i}>{h.skole || h.kurs_skole_id}: {h.grunn}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {resultat.feilet?.length > 0 && (
                      <div className="text-red-700 mt-2">
                        <p className="font-medium">Feilet ({resultat.feilet.length}):</p>
                        <ul className="list-disc ml-5 mt-1">
                          {resultat.feilet.map((f, i) => (
                            <li key={i}>{f.skole || f.kurs_skole_id}: {f.grunn}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bekreftelse — innebygd modal i samme stil som «Fjerne skole fra kurset?»,
          ikke window.confirm. */}
      {bekreftSend && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Send invitasjoner nå?</h3>
            <p className="text-gray-600 mb-6">
              Dette sender kursinvitasjon på e-post til hovedkontakten ved {antallASende}{' '}
              {antallASende === 1 ? 'skole' : 'skoler'} som ikke har fått den ennå.
              Skoler som allerede har fått, hoppes over automatisk.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBekreftSend(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button
                onClick={utforSend}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: ORANSJE }}
              >
                Send invitasjoner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
