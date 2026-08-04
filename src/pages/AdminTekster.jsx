import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// A6 — «Tekster og maler».
//
// Alle tekstene systemet sender ut ligger i innstillinger-tabellen. Fram til nå
// har de bare kunnet redigeres i Supabase SQL-editor. Denne siden gir de
// ansatte samme redigering uten å gå veien om databasen.
//
// TRE PRINSIPPER:
//  1. Ingen tom mal. Mangler en e-postmal, AVBRYTER utsendingen (bevisst
//     sikkerhetsventil i api/kurs/*). En side som lot noen lagre tomt ville
//     dermed stanset all utsending. Derfor blokkeres tomme maler her.
//  2. Ukjente plassholdere advares om. Skriver noen {oppmøtetid} i stedet for
//     {oppmotetid}, blir teksten stående ORDRETT i e-posten til skolen. Vi
//     viser hvilke som finnes, og sier fra før lagring.
//  3. Nødbremsen er IKKE en knapp her. motor_aktiv styres bevisst i basen —
//     den skal ikke kunne skrus av ved et uhell. Vi viser bare tilstanden.

const PH_UTSENDING = ['skolenavn', 'kursnavn', 'kursdato', 'hall', 'oppmotetid', 'vertskapsnotat', 'mottaker_navn', 'kursinfolenke']
const PH_OPPFOLGING = [...PH_UTSENDING, 'antall_tl']

const MALER = [
  {
    id: 'invitasjon',
    tittel: '1. Kursinvitasjon',
    naar: 'Sendes når RA trykker «Send invitasjoner» på et kurs.',
    mottaker: 'Hovedkontakt TL (HTLA)',
    emne: 'epost_invitasjon_emne',
    tekst: 'epost_invitasjon_tekst',
    plassholdere: PH_UTSENDING,
  },
  {
    id: 'purring',
    tittel: '2. Purring',
    naar: 'Sendes når RA trykker purring — tidligst etter «Dager før purring».',
    mottaker: 'Hovedkontakt TL (HTLA)',
    emne: 'epost_purring_emne',
    tekst: 'epost_purring_tekst',
    plassholdere: PH_OPPFOLGING,
  },
  {
    id: 'trinn3',
    tittel: '3. Ikke hørt fra skolen',
    naar: 'Sendes når RA trykker trinn 3 — tidligst etter «Dager før trinn 3».',
    mottaker: 'Øvrige TL-ansvarlige (TLA)',
    emne: 'epost_trinn3_emne',
    tekst: 'epost_trinn3_tekst',
    plassholdere: PH_OPPFOLGING,
  },
  {
    id: 'paaminnelse',
    tittel: '4. Påminnelse før kurset',
    naar: 'Sendes når RA trykker påminnelse. Går kun til skoler som har svart ja. Knappen i e-posten fører til kursinformasjonssiden.',
    mottaker: 'Hovedkontakt TL (HTLA)',
    emne: 'epost_paaminnelse_emne',
    tekst: 'epost_paaminnelse_tekst',
    plassholdere: PH_OPPFOLGING,
  },
  {
    id: 'evaluering',
    tittel: '5. Evaluering etter kurset',
    naar: 'Sendes automatisk på kursdagen, rundt klokkeslettet under.',
    mottaker: 'Hovedkontakt TL (HTLA)',
    emne: 'epost_evaluering_emne',
    tekst: 'epost_evaluering_tekst',
    plassholdere: ['skolenavn', 'kursnavn', 'kursdato', 'mottaker_navn'],
  },
  {
    id: 'eivind',
    tittel: '6. Varsel om kjøpsinteresse',
    naar: 'Sendes automatisk når en skole krysser av for kjøpsinteresse i evalueringen. Selve innholdet er en faktaliste bygget av systemet — bare emnefeltet kan redigeres.',
    mottaker: 'Adressen under «Varsel om kjøpsinteresse går til»',
    emne: 'epost_eivind_emne',
    tekst: null,
    plassholdere: ['skolenavn', 'kursnavn', 'kursdato', 'pakkevalg'],
  },
]

const ANDRE_TEKSTER = [
  {
    nokkel: 'kursinfo_tekst',
    tittel: 'Kursinformasjonssiden',
    hjelp: 'Én felles tekst for ALLE skoler. Vises under faktaboksen på kursinformasjonssiden. Kursets egne opplysninger (dato, sted, oppmøte) står allerede i boksen over og trenger ikke gjentas.',
    plassholdere: ['skolenavn', 'kursnavn', 'kursdato', 'hall', 'oppmotetid', 'sluttid', 'vertskapsnotat'],
    rader: 20,
    kanVaereTom: false,
  },
  {
    nokkel: 'epost_vertskap_notat',
    tittel: 'Vertskapsnotatet',
    hjelp: 'Én setning som fylles inn i {vertskapsnotat} — men BARE for skoler som er vertskap. For alle andre blir plassholderen tom, og hele linjen forsvinner fra e-posten.',
    plassholdere: [],
    rader: 3,
    kanVaereTom: true,
  },
]

const ADRESSER = [
  { nokkel: 'avsender_navn', tittel: 'Avsendernavn', hjelp: 'Navnet mottakeren ser i innboksen.' },
  { nokkel: 'avsender_epost', tittel: 'Avsenderadresse', hjelp: 'Må være en adresse Resend har fått lov til å sende fra.' },
  { nokkel: 'svar_til_epost', tittel: 'Svar går til', hjelp: 'Trykker mottakeren «svar», havner e-posten her.' },
  { nokkel: 'eivind_epost', tittel: 'Varsel om kjøpsinteresse går til', hjelp: 'Én adresse.' },
  { nokkel: 'nettsted_url', tittel: 'Nettadressen systemet bygger lenker fra', hjelp: 'Uten skråstrek til slutt. Endres denne feil, slutter alle lenker i alle e-poster å virke.' },
]

const TERSKLER = [
  { nokkel: 'purring_dager', tittel: 'Dager før purring kan sendes', type: 'heltall', hjelp: 'Telles fra invitasjonen gikk ut.' },
  { nokkel: 'trinn3_dager', tittel: 'Dager før trinn 3 kan sendes', type: 'heltall', hjelp: 'Telles fra invitasjonen gikk ut. Bør være høyere enn tallet over.' },
  { nokkel: 'evaluering_klokkeslett', tittel: 'Klokkeslett for evalueringen', type: 'klokke', hjelp: 'Norsk tid. Sendes automatisk på kursdagen, innenfor en halvtime rundt dette tidspunktet.' },
]

const ALLE_NOKLER = [
  ...MALER.flatMap(m => [m.emne, m.tekst].filter(Boolean)),
  ...ANDRE_TEKSTER.map(t => t.nokkel),
  ...ADRESSER.map(a => a.nokkel),
  ...TERSKLER.map(t => t.nokkel),
  'motor_aktiv',
]

// Finn {plassholdere} i en tekst som IKKE står på listen over lovlige.
function ukjentePlassholdere(tekst, lovlige) {
  const funnet = String(tekst || '').match(/\{(\w+)\}/g) || []
  const unike = [...new Set(funnet.map(t => t.slice(1, -1)))]
  return unike.filter(p => !lovlige.includes(p))
}

function Plassholderliste({ plassholdere }) {
  if (!plassholdere || plassholdere.length === 0) return null
  return (
    <p className="text-xs text-gray-500 mt-1.5">
      Plassholdere du kan bruke:{' '}
      {plassholdere.map((p, i) => (
        <span key={p}>
          {i > 0 && ' '}
          <code className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-gray-700">{'{' + p + '}'}</code>
        </span>
      ))}
    </p>
  )
}

function Felt({ etikett, hjelp, verdi, onEndre, rader, type, plassholdere }) {
  const flerlinje = rader && rader > 1
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-800 mb-1">{etikett}</label>
      {hjelp && <p className="text-xs text-gray-500 mb-1.5">{hjelp}</p>}
      {flerlinje ? (
        <textarea
          rows={rader}
          value={verdi ?? ''}
          onChange={e => onEndre(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm leading-relaxed focus:border-orange focus:outline-none"
        />
      ) : (
        <input
          type={type === 'klokke' ? 'time' : type === 'heltall' ? 'number' : 'text'}
          min={type === 'heltall' ? '1' : undefined}
          value={verdi ?? ''}
          onChange={e => onEndre(e.target.value)}
          className={`${type === 'heltall' || type === 'klokke' ? 'w-40' : 'w-full'} border border-gray-300 rounded-lg px-3 py-2 focus:border-orange focus:outline-none`}
        />
      )}
      <Plassholderliste plassholdere={plassholdere} />
    </div>
  )
}

export default function AdminTekster() {
  const navigate = useNavigate()
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [lagrer, setLagrer] = useState(false)
  const [lagret, setLagret] = useState('')
  const [advarsler, setAdvarsler] = useState([])
  const [original, setOriginal] = useState({})
  const [verdier, setVerdier] = useState({})
  const [apen, setApen] = useState('invitasjon')

  useEffect(() => {
    let aktiv = true
    async function hent() {
      setLaster(true)
      setFeil('')
      const { data, error } = await supabase
        .from('innstillinger')
        .select('nokkel, verdi')
        .in('nokkel', ALLE_NOKLER)
      if (!aktiv) return
      if (error) {
        setFeil('Kunne ikke hente tekstene: ' + error.message)
        setLaster(false)
        return
      }
      const kart = Object.fromEntries((data || []).map(r => [r.nokkel, r.verdi ?? '']))
      setOriginal(kart)
      setVerdier(kart)
      setLaster(false)
    }
    hent()
    return () => { aktiv = false }
  }, [])

  const settVerdi = (nokkel, v) => {
    setVerdier(f => ({ ...f, [nokkel]: v }))
    setLagret('')
    setAdvarsler([])
  }

  const endredeNokler = Object.keys(verdier).filter(
    k => k !== 'motor_aktiv' && (verdier[k] ?? '') !== (original[k] ?? '')
  )

  // Harde feil — blokkerer lagring.
  function finnFeil() {
    const f = []
    for (const m of MALER) {
      const emne = (verdier[m.emne] ?? '').trim()
      if (emne === '') f.push(`${m.tittel}: emnefeltet kan ikke være tomt. En tom mal stopper hele utsendingen.`)
      if (m.tekst) {
        const tekst = (verdier[m.tekst] ?? '').trim()
        if (tekst === '') f.push(`${m.tittel}: teksten kan ikke være tom. En tom mal stopper hele utsendingen.`)
      }
    }
    for (const t of ANDRE_TEKSTER) {
      if (!t.kanVaereTom && (verdier[t.nokkel] ?? '').trim() === '') {
        f.push(`${t.tittel}: kan ikke være tom.`)
      }
    }
    for (const a of ADRESSER) {
      if ((verdier[a.nokkel] ?? '').trim() === '') f.push(`${a.tittel}: kan ikke være tom.`)
    }
    if ((verdier.avsender_epost ?? '').includes('@') === false) f.push('Avsenderadressen ser ikke ut som en e-postadresse.')
    if ((verdier.nettsted_url ?? '').startsWith('http') === false) f.push('Nettadressen må begynne med http:// eller https://.')
    if ((verdier.nettsted_url ?? '').endsWith('/')) f.push('Nettadressen skal ikke slutte med skråstrek.')
    for (const t of TERSKLER) {
      const v = (verdier[t.nokkel] ?? '').trim()
      if (v === '') { f.push(`${t.tittel}: kan ikke være tom.`); continue }
      if (t.type === 'heltall' && !(Number.parseInt(v, 10) > 0)) f.push(`${t.tittel}: må være et tall større enn 0.`)
      if (t.type === 'klokke' && !/^\d{2}:\d{2}(:\d{2})?$/.test(v)) f.push(`${t.tittel}: må være et klokkeslett, for eksempel 13:30.`)
    }
    const p = Number.parseInt(verdier.purring_dager, 10)
    const t3 = Number.parseInt(verdier.trinn3_dager, 10)
    if (p > 0 && t3 > 0 && t3 <= p) {
      f.push('Trinn 3 må komme SENERE enn purringen. Sett «Dager før trinn 3» høyere enn «Dager før purring».')
    }
    return f
  }

  // Myke advarsler — kan overstyres med ett klikk til.
  function finnAdvarsler() {
    const a = []
    const sjekk = (tittel, tekst, lovlige) => {
      for (const p of ukjentePlassholdere(tekst, lovlige)) {
        a.push(`${tittel}: {${p}} finnes ikke. Den blir stående ORDRETT i e-posten. Sjekk skrivemåten mot listen under feltet.`)
      }
    }
    for (const m of MALER) {
      sjekk(m.tittel + ' (emne)', verdier[m.emne], m.plassholdere)
      if (m.tekst) sjekk(m.tittel + ' (tekst)', verdier[m.tekst], m.plassholdere)
    }
    for (const t of ANDRE_TEKSTER) {
      if (t.plassholdere.length > 0) sjekk(t.tittel, verdier[t.nokkel], t.plassholdere)
    }
    return a
  }

  async function lagre({ overstyrAdvarsler = false } = {}) {
    setFeil('')
    setLagret('')
    const harde = finnFeil()
    if (harde.length > 0) {
      setAdvarsler([])
      setFeil(harde.join('\n'))
      return
    }
    const myke = finnAdvarsler()
    if (myke.length > 0 && !overstyrAdvarsler) {
      setAdvarsler(myke)
      return
    }
    if (endredeNokler.length === 0) {
      setLagret('Ingenting var endret.')
      return
    }

    setLagrer(true)
    const feilet = []
    for (const nokkel of endredeNokler) {
      const verdi = verdier[nokkel] ?? ''
      // Alle nøklene finnes fra før, men vi håndterer begge tilfeller så en
      // ny nøkkel ikke stilltiende forsvinner.
      if (nokkel in original) {
        const { error } = await supabase.from('innstillinger').update({ verdi }).eq('nokkel', nokkel)
        if (error) feilet.push(`${nokkel}: ${error.message}`)
      } else {
        const { error } = await supabase.from('innstillinger').insert([{ nokkel, verdi }])
        if (error) feilet.push(`${nokkel}: ${error.message}`)
      }
    }
    setLagrer(false)
    setAdvarsler([])

    if (feilet.length > 0) {
      setFeil(
        'Kunne ikke lagre alt:\n' + feilet.join('\n') +
        '\n\nFår du «permission denied» eller «row-level security», mangler innlogget bruker skriverett på innstillinger-tabellen. Det rettes i Supabase, ikke her.'
      )
      return
    }
    setOriginal({ ...verdier })
    setLagret(`Lagret ${endredeNokler.length} ${endredeNokler.length === 1 ? 'endring' : 'endringer'}.`)
  }

  if (laster) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-600">Laster tekstene …</div>
  }

  const motor = (verdier.motor_aktiv ?? '').trim().toLowerCase()

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button onClick={() => navigate('/admin')} className="text-sm text-gray-500 hover:text-orange mb-4">
        ← Tilbake til admin
      </button>
      <h1 className="text-3xl font-bold text-orange mb-2">Tekster og maler</h1>
      <p className="text-gray-500 mb-6">
        Alt systemet sender ut. Endringer gjelder fra neste utsending — det som alt er sendt, endres ikke.
      </p>

      {/* Nødbremsen vises, men styres ikke herfra. */}
      <div className={`mb-8 rounded-xl px-4 py-3 text-sm border ${motor === 'ja' ? 'border-green-200 bg-green-50 text-green-900' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
        {motor === 'ja'
          ? 'Utsending er PÅ. E-poster går ut på ekte.'
          : 'Utsending er AV. Ingenting sendes ut, uansett hva som trykkes.'}
        <span className="block text-xs mt-0.5 opacity-75">
          Denne bryteren styres bevisst i databasen, ikke herfra — så den ikke kan skrus av ved et uhell.
        </span>
      </div>

      {/* Slik skriver du */}
      <div className="mb-8 rounded-xl border-l-4 border-orange bg-orange-50 px-4 py-3">
        <h2 className="font-semibold text-gray-900 mb-1.5">Slik skriver du</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          <li><code className="bg-white border border-gray-200 rounded px-1">{'{skolenavn}'}</code> settes inn automatisk. Under hvert felt står de som finnes akkurat der.</li>
          <li>Tom linje gir nytt avsnitt.</li>
          <li>Er en plassholder tom for én skole, forsvinner HELE linjen for den skolen. Skriv derfor «Oppmøte: {'{oppmotetid}'}» på sin egen linje.</li>
          <li>Kursinformasjonssiden forstår i tillegg <code className="bg-white border border-gray-200 rounded px-1">## Overskrift</code>, <code className="bg-white border border-gray-200 rounded px-1">- punkt</code> og <code className="bg-white border border-gray-200 rounded px-1">[tekst](/min-side)</code>. E-postene gjør ikke det.</li>
        </ul>
      </div>

      {/* De seks e-postene */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">De seks e-postene</h2>
      <div className="mb-10 border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
        {MALER.map(m => (
          <div key={m.id}>
            <button
              onClick={() => setApen(apen === m.id ? '' : m.id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
              aria-expanded={apen === m.id}
            >
              <span>
                <span className="font-semibold text-gray-900">{m.tittel}</span>
                <span className="block text-xs text-gray-500 mt-0.5">Til: {m.mottaker}</span>
              </span>
              <span className="text-gray-400 text-sm">{apen === m.id ? 'Skjul' : 'Vis'}</span>
            </button>
            {apen === m.id && (
              <div className="px-4 pb-5 pt-1 bg-gray-50">
                <p className="text-sm text-gray-600 mb-4">{m.naar}</p>
                <Felt
                  etikett="Emne"
                  verdi={verdier[m.emne]}
                  onEndre={v => settVerdi(m.emne, v)}
                  plassholdere={m.plassholdere}
                />
                {m.tekst && (
                  <Felt
                    etikett="Tekst"
                    verdi={verdier[m.tekst]}
                    onEndre={v => settVerdi(m.tekst, v)}
                    rader={12}
                    plassholdere={m.plassholdere}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Andre tekster */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">Andre tekster</h2>
      <div className="mb-10 border border-gray-200 rounded-xl p-4">
        {ANDRE_TEKSTER.map(t => (
          <Felt
            key={t.nokkel}
            etikett={t.tittel}
            hjelp={t.hjelp}
            verdi={verdier[t.nokkel]}
            onEndre={v => settVerdi(t.nokkel, v)}
            rader={t.rader}
            plassholdere={t.plassholdere}
          />
        ))}
      </div>

      {/* Avsender og adresser */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">Avsender og adresser</h2>
      <div className="mb-10 border border-gray-200 rounded-xl p-4">
        {ADRESSER.map(a => (
          <Felt
            key={a.nokkel}
            etikett={a.tittel}
            hjelp={a.hjelp}
            verdi={verdier[a.nokkel]}
            onEndre={v => settVerdi(a.nokkel, v)}
          />
        ))}
      </div>

      {/* Terskler */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">Når ting skal skje</h2>
      <div className="mb-10 border border-gray-200 rounded-xl p-4">
        {TERSKLER.map(t => (
          <Felt
            key={t.nokkel}
            etikett={t.tittel}
            hjelp={t.hjelp}
            verdi={verdier[t.nokkel]}
            onEndre={v => settVerdi(t.nokkel, v)}
            type={t.type}
          />
        ))}
      </div>

      {feil && (
        <div className="mb-4 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-pink-800 whitespace-pre-line" role="alert">
          {feil}
        </div>
      )}

      {advarsler.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900" role="alert">
          <p className="font-semibold mb-1">Sjekk dette før du lagrer</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {advarsler.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
          <button
            onClick={() => lagre({ overstyrAdvarsler: true })}
            className="mt-3 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:opacity-90"
          >
            Jeg vet hva jeg gjør — lagre likevel
          </button>
        </div>
      )}

      {lagret && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900" role="status">
          {lagret}
        </div>
      )}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <span className="text-sm text-gray-600">
          {endredeNokler.length === 0
            ? 'Ingen endringer'
            : `${endredeNokler.length} ${endredeNokler.length === 1 ? 'endring' : 'endringer'} ikke lagret`}
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => { setVerdier(original); setFeil(''); setAdvarsler([]); setLagret('') }}
            disabled={endredeNokler.length === 0 || lagrer}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40"
          >
            Forkast
          </button>
          <button
            onClick={() => lagre()}
            disabled={endredeNokler.length === 0 || lagrer}
            className="px-5 py-2 bg-orange text-white rounded-lg hover:opacity-90 disabled:opacity-40"
          >
            {lagrer ? 'Lagrer …' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  )
}
