import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetch } from '../lib/adminFetch'

// Steg 3d: samlet oppfølgingsside som erstattet den gamle mailto-løsningen.
// Kaller hvem-star-for-tur for listene og send-oppfolging for utsendingen.
// Trappetrinnet er hele poenget: hver seksjon forklarer seg selv med én setning,
// så en RA som aldri har sett dette forstår hvorfor en skole står der den står.

// Alle sendeknapper bruker samme farge. Fargeforskjell bør bety noe; i én samlet
// visning gjorde arvet petrol/oransje det ikke, så alt er oransje nå.
const ORANSJE = '#FF7B31'

function formaterDager(n) {
  if (n == null) return '—'
  return n === 1 ? '1 dag' : `${n} dager`
}

// Én valgbar seksjon (purring, ikke-hørt, påminnelse) med avkryssing og knapp.
function Seksjon({ tittel, forklaring, farge, knappeverb, rader, valgt, settValgt, onSend, sender, motorOff, resultat, ekstraValg }) {
  const alleIder = rader.map(r => r.kurs_skole_id)
  const valgteIder = alleIder.filter(id => valgt.has(id))
  const alleValgt = rader.length > 0 && valgteIder.length === rader.length

  function toggle(id) {
    const ny = new Set(valgt)
    if (ny.has(id)) ny.delete(id)
    else ny.add(id)
    settValgt(ny)
  }
  function toggleAlle() {
    settValgt(alleValgt ? new Set() : new Set(alleIder))
  }

  const knappAv = motorOff || sender || valgteIder.length === 0

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="max-w-2xl min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{tittel}</h2>
          <p className="text-sm text-gray-500 mt-1">{forklaring}</p>
          {ekstraValg}
        </div>
        <div className="text-right flex-shrink-0">
          <button
            onClick={() => onSend(valgteIder)}
            disabled={knappAv}
            className="text-sm text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: farge }}
          >
            {sender ? 'Sender …' : `${knappeverb} til ${valgteIder.length} ${valgteIder.length === 1 ? 'skole' : 'skoler'}`}
          </button>
          {motorOff && (
            <p className="text-xs text-gray-400 mt-1">Utsending er satt på pause</p>
          )}
        </div>
      </div>

      {rader.length === 0 ? (
        <p className="text-gray-400 mt-4">Ingen skoler i denne listen nå.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={alleValgt}
                    onChange={toggleAlle}
                    aria-label="Velg alle"
                  />
                </th>
                <th className="text-left px-4 py-2">Skole</th>
                <th className="text-left px-4 py-2">Kurs</th>
                <th className="text-left px-4 py-2">Dato</th>
                <th className="text-left px-4 py-2">Mottaker</th>
                <th className="text-left px-4 py-2">Ventet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rader.map(r => (
                <tr key={r.kurs_skole_id}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={valgt.has(r.kurs_skole_id)}
                      onChange={() => toggle(r.kurs_skole_id)}
                      aria-label={`Velg ${r.skole}`}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{r.skole}</td>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.kurs || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">{r.kursdato || '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{r.mottakerCelle}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">{formaterDager(r.dager)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultat && (
        <div className={`mt-4 rounded-lg border p-4 text-sm ${resultat.feil ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {resultat.feil ? (
            <p className="text-red-700">Feil: {resultat.feil}</p>
          ) : (
            <>
              <p className="text-green-800 font-medium">
                Sendt til {resultat.sendt_antall ?? 0} {(resultat.sendt_antall ?? 0) === 1 ? 'mottaker' : 'mottakere'}.
              </p>
              {resultat.hoppet_over?.length > 0 && (
                <p className="text-gray-600 mt-1">Hoppet over: {resultat.hoppet_over.length}.</p>
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
    </section>
  )
}

// innebygd=true når siden vises som fane i kursplanleggeren (uten egen side-ramme,
// tilbakeknapp og stor overskrift, siden kursplanleggeren allerede gir det).
// innebygd=false (standard) er den frittstående ruten /admin/oppfolging.
export default function AdminOppfolging({ innebygd = false }) {
  const navigate = useNavigate()
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [data, setData] = useState(null)

  const [valgtPurring, setValgtPurring] = useState(new Set())
  const [valgtTrinn3, setValgtTrinn3] = useState(new Set())
  const [valgtPaaminnelse, setValgtPaaminnelse] = useState(new Set())

  const [sender, setSender] = useState(null) // hvilken type som sendes nå
  const [resultat, setResultat] = useState({}) // { purring: {...}, ... }

  // FELLE 2: RA kan velge å ta MED øvrige TL-ansvarlige når påminnelsen sendes.
  const [taMedTlaPaam, setTaMedTlaPaam] = useState(false)

  async function hentLister() {
    setLaster(true)
    setFeil(null)
    try {
      const res = await adminFetch('/api/kurs/hvem-star-for-tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await res.json()
      if (!res.ok) {
        setFeil(d.error || 'Ukjent feil ved henting av lister.')
        setLaster(false)
        return
      }
      setData(d)
      // Alle huket av som standard
      setValgtPurring(new Set((d.purring || []).map(r => r.kurs_skole_id)))
      setValgtPaaminnelse(new Set((d.paaminnelse || []).map(r => r.kurs_skole_id)))
      setValgtTrinn3(new Set((d.trinn3 || []).map(r => r.kurs_skole_id))) // Set dedupliserer selv
    } catch (e) {
      setFeil('Nettverksfeil: ' + e.message)
    }
    setLaster(false)
  }

  useEffect(() => { hentLister() }, [])

  async function send(type, ids, label, extra = {}) {
    if (ids.length === 0) return
    if (!window.confirm(`${label} til ${ids.length} ${ids.length === 1 ? 'skole' : 'skoler'}? Dette sender e-post nå.`)) return
    setSender(type)
    setResultat(prev => ({ ...prev, [type]: null }))
    try {
      const res = await adminFetch('/api/kurs/send-oppfolging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, kurs_skole_ids: ids, torrkjoring: false, ...extra }),
      })
      const d = await res.json()
      if (!res.ok) {
        setResultat(prev => ({ ...prev, [type]: { feil: d.error || 'Ukjent feil ved sending.' } }))
        setSender(null)
        return
      }
      setResultat(prev => ({ ...prev, [type]: d }))
      setSender(null)
      await hentLister() // sendte skoler forsvinner fra listene
    } catch (e) {
      setResultat(prev => ({ ...prev, [type]: { feil: 'Nettverksfeil: ' + e.message } }))
      setSender(null)
    }
  }

  const terskler = data?.terskler || { purring_dager: '…', trinn3_dager: '…' }
  const motorOff = data?.motor_aktiv === 'nei'

  // Seksjon 1 og 3: én mottaker (htla) per skole → én rad per skole.
  const radPurring = (data?.purring || []).map(r => ({
    kurs_skole_id: r.kurs_skole_id,
    skole: r.skole,
    kurs: r.kurs,
    kursdato: r.kursdato,
    dager: r.dager_siden_forste_utsending,
    mottakerCelle: (
      <span>{r.mottaker_navn ? `${r.mottaker_navn} · ` : ''}{r.mottaker_epost}</span>
    ),
  }))

  const radPaaminnelse = (data?.paaminnelse || []).map(r => ({
    kurs_skole_id: r.kurs_skole_id,
    skole: r.skole,
    kurs: r.kurs,
    kursdato: r.kursdato,
    dager: r.dager_siden_forste_utsending,
    mottakerCelle: (
      <span>{r.mottaker_navn ? `${r.mottaker_navn} · ` : ''}{r.mottaker_epost}</span>
    ),
  }))

  // Seksjon 2: grupper per skole (send-oppfolging sender til ALLE tla for en
  // kurs_skole_id, så én hake = én skole).
  const trinn3Gruppert = (() => {
    const kart = new Map()
    for (const r of (data?.trinn3 || [])) {
      if (!kart.has(r.kurs_skole_id)) {
        kart.set(r.kurs_skole_id, {
          kurs_skole_id: r.kurs_skole_id,
          skole: r.skole,
          kurs: r.kurs,
          kursdato: r.kursdato,
          dager: r.dager_siden_forste_utsending,
          mottakere: [],
        })
      }
      kart.get(r.kurs_skole_id).mottakere.push({ navn: r.mottaker_navn, epost: r.mottaker_epost })
    }
    return [...kart.values()].map(g => ({
      ...g,
      mottakerCelle: (
        <div>
          <div className="text-xs text-gray-400">{g.mottakere.length} TL-ansvarlige</div>
          {g.mottakere.map((m, i) => (
            <div key={i}>{m.navn ? `${m.navn} · ` : ''}{m.epost}</div>
          ))}
        </div>
      ),
    }))
  })()

  const manglerEpost = data?.mangler_epost || []

  return (
    <div className={innebygd ? '' : 'max-w-5xl mx-auto px-4 py-12'}>
      {!innebygd && (
        <>
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:text-[#FF7B31] mb-4">
            ← Tilbake til admin
          </button>
          <h1 className="text-3xl font-bold mb-2" style={{ color: ORANSJE }}>Oppfølging</h1>
        </>
      )}
      <p className="text-gray-500 mb-6 max-w-2xl">
        Systemet finner hvem som står for tur i trappetrinnet — du bestemmer når det sendes.
        Listene oppdaterer seg etter hver utsending. Evaluering sendes automatisk og vises ikke her.
      </p>

      {/* Nødbrems (motor_aktiv=nei): rolig, informativt banner — dette er en
          normaltilstand som kan vare i uker, ikke en alarm. */}
      {motorOff && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="font-semibold text-sky-900">Automatisk utsending er ikke skrudd på ennå</p>
          <p className="text-sm text-sky-800 mt-1">
            Systemet viser hvem som står for tur, men sender ingen e-post. Dette er normalt mens vi
            tester — utsending skrus på når alt er klart.
          </p>
        </div>
      )}

      {laster && <p className="text-gray-400">Laster …</p>}
      {feil && <p className="text-red-600">Feil: {feil}</p>}

      {!laster && !feil && data && (
        <>
          <Seksjon
            tittel="Purring — ikke svart"
            forklaring={`Skoler som ikke har svart innen ${terskler.purring_dager} dager. Går til hovedkontakten (Hovedkontakt TL) som en vennlig påminnelse.`}
            farge={ORANSJE}
            knappeverb="Send purring"
            rader={radPurring}
            valgt={valgtPurring}
            settValgt={setValgtPurring}
            onSend={(ids) => send('purring', ids, 'Send purring')}
            sender={sender === 'purring'}
            motorOff={motorOff}
            resultat={resultat.purring}
          />

          <Seksjon
            tittel="Ikke hørt fra skolen"
            forklaring={`Fortsatt ingen svar etter ${terskler.trinn3_dager} dager. Nå går invitasjonen også til skolens øvrige TL-ansvarlige — invitasjoner drukner fort i en travel innboks.`}
            farge={ORANSJE}
            knappeverb="Send til øvrige TL-ansvarlige"
            rader={trinn3Gruppert}
            valgt={valgtTrinn3}
            settValgt={setValgtTrinn3}
            onSend={(ids) => send('trinn3', ids, 'Send til øvrige TL-ansvarlige')}
            sender={sender === 'trinn3'}
            motorOff={motorOff}
            resultat={resultat.trinn3}
          />

          <Seksjon
            tittel="Påminnelse — har svart JA"
            forklaring="Skoler som har svart JA. Send en påminnelse før kursdato så de husker oppmøtet."
            farge={ORANSJE}
            knappeverb="Send påminnelse"
            rader={radPaaminnelse}
            valgt={valgtPaaminnelse}
            settValgt={setValgtPaaminnelse}
            onSend={(ids) => send('paaminnelse', ids, 'Send påminnelse', { ta_med_tla: taMedTlaPaam })}
            sender={sender === 'paaminnelse'}
            motorOff={motorOff}
            resultat={resultat.paaminnelse}
            ekstraValg={
              <label className="mt-3 flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taMedTlaPaam}
                  onChange={(e) => setTaMedTlaPaam(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Ta også med øvrige TL-ansvarlige (TLA)
                  <span className="block text-xs text-gray-400">
                    Påminnelsen går normalt bare til hovedkontakten. Kryss av her for å sende den til
                    skolens øvrige TL-ansvarlige også.
                  </span>
                </span>
              </label>
            }
          />

          {/* Seksjon 4: ingen knapp — bare oversikt over hvem som mangler kontaktinfo */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Mangler e-post</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Disse ville stått på en av listene over, men mangler gyldig e-post til rett mottaker.
              Legg inn kontaktinfo på skolen, så dukker de opp igjen.
            </p>
            {manglerEpost.length === 0 ? (
              <p className="text-gray-400 mt-4">Ingen skoler mangler e-post nå.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Skole</th>
                      <th className="text-left px-4 py-2">Kurs</th>
                      <th className="text-left px-4 py-2">Gjelder</th>
                      <th className="text-left px-4 py-2">Grunn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {manglerEpost.map((r, i) => (
                      <tr key={`${r.kurs_skole_id}-${i}`}>
                        <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{r.skole}</td>
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.kurs || '—'}</td>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{r.liste}</td>
                        <td className="px-4 py-2 text-red-600">{r.grunn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
