import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// MODUL «Spørreundersøkelse til skolene» — byggetrinn 2, DEL D + E:
// OFFENTLIG svarskjema (identifisert per skole). Speiler EvalueringSkjema.jsx,
// men rendrer DYNAMISK fra spørsmålssettet som RPC-en returnerer.
//
// Skolen åpner sin personlige lenke: /skoleundersokelse/:token
//   - hent_skoleus_via_token(p_token): runde + skole + spørsmål (blokk/rekkefolge)
//     + tidligere svar (levende lenke). Stempler apnet_at (første åpning).
//   - lever_skoleus_svar(p_token, p_svar): server-side validering + upsert.
//
// To-lags-validering: skjemaet gir vennlige feil FØR innsending; RPC-en er den
// harde sperren. WCAG: skala-knapper har tekst-etikett (tall), er tastaturnavigerbare
// (ekte <button>), og valgt-tilstand markeres med aria-pressed (ikke bare farge).

const BLOKK_ETIKETT = {
  rolle: 'Din rolle',
  effekt: 'Effekt av programmet',
  drift: 'Drift',
  plattform: 'Plattformen',
  aapent: 'Til slutt',
}

// Én skala-knapperad. Leser min..max fra spørsmålet (skalaene varierer: 1–6, 1–5, 0–4).
function Skala({ min, max, verdi, settVerdi, idBase }) {
  const tall = []
  for (let n = min; n <= max; n++) tall.push(n)
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Velg verdi på skalaen">
      {tall.map((n) => {
        const valgt = verdi === n
        return (
          <button
            key={n}
            id={`${idBase}-${n}`}
            type="button"
            onClick={() => settVerdi(valgt ? null : n)}
            aria-pressed={valgt}
            className={
              valgt
                ? 'min-w-[3rem] flex-1 py-3 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 font-semibold text-lg'
                : 'min-w-[3rem] flex-1 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-gray-300 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/40'
            }
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

// «Ikke aktuelt»-knapp (vises kun der tillatt). Tekst-etikett, ikke bare farge.
function IkkeAktueltKnapp({ aktiv, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={
        (aktiv
          ? 'border-gray-500 bg-gray-100 text-gray-800 font-semibold'
          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300') +
        ' mt-2 px-3 py-2 rounded-xl border-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/40'
      }
    >
      Ikke aktuelt
    </button>
  )
}

export default function SkoleundersokelseSkjema() {
  const { token } = useParams()

  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')
  const [stengt, setStengt] = useState(false)
  const [runde, setRunde] = useState(null)
  const [skole, setSkole] = useState(null)
  const [sporsmal, setSporsmal] = useState([])
  const [sender, setSender] = useState(false)
  const [ferdig, setFerdig] = useState(false)

  // Svar-state: nøkkel = sporsmal_id (ikke-matrise) eller `${sporsmal_id}:${matriserad_id}` (matrise).
  // Verdi = { verdi_tall|null, verdi_tekst|null, ikke_aktuelt:boolean }.
  const [svar, setSvar] = useState({})

  const svarNokkel = (sporsmalId, matriseradId) =>
    matriseradId ? `${sporsmalId}:${matriseradId}` : sporsmalId

  useEffect(() => {
    let aktiv = true
    async function hent() {
      setLaster(true)
      setFeil('')
      const { data, error } = await supabase.rpc('hent_skoleus_via_token', { p_token: token })
      if (!aktiv) return
      if (error) {
        setFeil('Noe gikk galt da vi hentet skjemaet. Prøv igjen, eller ta kontakt med oss.')
        setLaster(false)
        return
      }
      const rad = Array.isArray(data) ? data[0] : data
      if (!rad) {
        setFeil('Vi fant ikke undersøkelsen. Sjekk at du har brukt hele lenken fra e-posten.')
        setLaster(false)
        return
      }
      setRunde(rad.runde || null)
      setSkole(rad.skole || null)
      if (rad.stengt) {
        setStengt(true)
        setLaster(false)
        return
      }
      const sp = Array.isArray(rad.sporsmal) ? rad.sporsmal : []
      setSporsmal(sp)

      // Forhåndsutfyll fra tidligere svar (levende lenke).
      const tidligere = Array.isArray(rad.tidligere_svar) ? rad.tidligere_svar : []
      const init = {}
      tidligere.forEach((t) => {
        const n = t.matriserad_id ? `${t.sporsmal_id}:${t.matriserad_id}` : t.sporsmal_id
        init[n] = {
          verdi_tall: t.verdi_tall ?? null,
          verdi_tekst: t.verdi_tekst ?? null,
          ikke_aktuelt: !!t.ikke_aktuelt,
        }
      })
      setSvar(init)
      setLaster(false)
    }
    hent()
    return () => { aktiv = false }
  }, [token])

  // Grupper spørsmål på blokk, i mottatt rekkefølge (RPC-en sorterer allerede).
  const blokker = useMemo(() => {
    const rekke = []
    const indeks = {}
    sporsmal.forEach((s) => {
      if (!(s.blokk in indeks)) {
        indeks[s.blokk] = rekke.length
        rekke.push({ blokk: s.blokk, sporsmal: [] })
      }
      rekke[indeks[s.blokk]].sporsmal.push(s)
    })
    return rekke
  }, [sporsmal])

  function settTall(sporsmalId, matriseradId, tall) {
    const n = svarNokkel(sporsmalId, matriseradId)
    setSvar((prev) => ({
      ...prev,
      [n]: tall == null
        ? { verdi_tall: null, verdi_tekst: null, ikke_aktuelt: false }
        : { verdi_tall: tall, verdi_tekst: null, ikke_aktuelt: false },
    }))
  }
  function settTekst(sporsmalId, tekst) {
    const n = svarNokkel(sporsmalId, null)
    setSvar((prev) => ({
      ...prev,
      [n]: { verdi_tall: null, verdi_tekst: tekst, ikke_aktuelt: false },
    }))
  }
  function veksleIkkeAktuelt(sporsmalId, matriseradId) {
    const n = svarNokkel(sporsmalId, matriseradId)
    setSvar((prev) => {
      const na = !prev[n]?.ikke_aktuelt
      // «ikke aktuelt» valgt → nullstill tallverdi for den cellen.
      return { ...prev, [n]: { verdi_tall: null, verdi_tekst: null, ikke_aktuelt: na } }
    })
  }

  // Bygg p_svar-arrayet av alt som faktisk er besvart (tomme celler sendes ikke med).
  function byggPSvar() {
    const ut = []
    sporsmal.forEach((s) => {
      if (s.type === 'matrise') {
        (s.matriserader || []).forEach((rad) => {
          const v = svar[`${s.id}:${rad.id}`]
          if (!v) return
          if (v.ikke_aktuelt) ut.push({ sporsmal_id: s.id, matriserad_id: rad.id, verdi_tall: null, verdi_tekst: null, ikke_aktuelt: true })
          else if (v.verdi_tall != null) ut.push({ sporsmal_id: s.id, matriserad_id: rad.id, verdi_tall: v.verdi_tall, verdi_tekst: null, ikke_aktuelt: false })
        })
      } else if (s.type === 'fritekst') {
        const v = svar[s.id]
        if (v && v.verdi_tekst != null && String(v.verdi_tekst).trim() !== '') {
          ut.push({ sporsmal_id: s.id, matriserad_id: null, verdi_tall: null, verdi_tekst: String(v.verdi_tekst).trim(), ikke_aktuelt: false })
        }
      } else { // enkeltvalg
        const v = svar[s.id]
        if (!v) return
        if (v.ikke_aktuelt) ut.push({ sporsmal_id: s.id, matriserad_id: null, verdi_tall: null, verdi_tekst: null, ikke_aktuelt: true })
        else if (v.verdi_tall != null) ut.push({ sporsmal_id: s.id, matriserad_id: null, verdi_tall: v.verdi_tall, verdi_tekst: null, ikke_aktuelt: false })
      }
    })
    return ut
  }

  async function sendInn() {
    setFeil('')
    const pSvar = byggPSvar()
    // Lett frontend-validering (RPC-en er den harde sperren): minst ett svar.
    if (pSvar.length === 0) {
      setFeil('Svar på minst ett spørsmål før du sender.')
      return
    }
    setSender(true)
    const { error } = await supabase.rpc('lever_skoleus_svar', { p_token: token, p_svar: pSvar })
    setSender(false)
    if (error) {
      setFeil('Noe gikk galt da vi lagret svaret: ' + (error.message || 'ukjent feil') + '. Sjekk svarene og prøv igjen.')
      return
    }
    setFerdig(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (laster) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-gray-600">Laster skjemaet …</p>
      </main>
    )
  }

  if (feil && sporsmal.length === 0 && !stengt) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-lg text-gray-800">{feil}</p>
        </div>
      </main>
    )
  }

  if (stengt) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Denne undersøkelsen er avsluttet</h1>
          <p className="text-gray-700">
            {runde?.navn ? `«${runde.navn}» ` : 'Undersøkelsen '}tar ikke lenger imot svar. Ta gjerne kontakt med oss om du har spørsmål.
          </p>
        </div>
      </main>
    )
  }

  if (ferdig) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4" aria-hidden="true">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Takk – svaret er lagret</h1>
          <p className="text-gray-700">
            Du kan når som helst åpne lenken igjen og endre svaret så lenge undersøkelsen er åpen.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{runde?.navn || 'Spørreundersøkelse'}</h1>
        {skole?.navn && <p className="text-gray-600 mb-8">{skole.navn}</p>}

        {blokker.map((b) => (
          <section key={b.blokk} className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-700 mb-4">
              {BLOKK_ETIKETT[b.blokk] || b.blokk}
            </h2>

            {b.sporsmal.map((s) => {
              if (s.type === 'fritekst') {
                const v = svar[s.id]
                return (
                  <div key={s.id} className="mb-8">
                    <label htmlFor={`sp-${s.id}`} className="block text-lg font-semibold text-gray-900 mb-2">
                      {s.sporsmaltekst}
                    </label>
                    <textarea
                      id={`sp-${s.id}`}
                      rows="3"
                      value={v?.verdi_tekst ?? ''}
                      onChange={(e) => settTekst(s.id, e.target.value)}
                      className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                )
              }

              if (s.type === 'enkeltvalg') {
                const v = svar[s.id]
                return (
                  <fieldset key={s.id} className="mb-8">
                    <legend className="text-lg font-semibold text-gray-900 mb-3">
                      {s.sporsmaltekst}
                      <span className="block text-sm font-normal text-gray-500 mt-1">
                        {s.skala_min} = lav, {s.skala_max} = høy
                      </span>
                    </legend>
                    <Skala
                      min={s.skala_min}
                      max={s.skala_max}
                      verdi={v?.ikke_aktuelt ? null : (v?.verdi_tall ?? null)}
                      settVerdi={(n) => settTall(s.id, null, n)}
                      idBase={`sk-${s.id}`}
                    />
                    {s.tillat_ikke_aktuelt && (
                      <IkkeAktueltKnapp aktiv={!!v?.ikke_aktuelt} onClick={() => veksleIkkeAktuelt(s.id, null)} />
                    )}
                  </fieldset>
                )
              }

              if (s.type === 'matrise') {
                return (
                  <fieldset key={s.id} className="mb-8">
                    <legend className="text-lg font-semibold text-gray-900 mb-1">{s.sporsmaltekst}</legend>
                    <p className="text-sm text-gray-500 mb-4">{s.skala_min} = lav, {s.skala_max} = høy</p>
                    <div className="space-y-6">
                      {(s.matriserader || []).map((rad) => {
                        const v = svar[`${s.id}:${rad.id}`]
                        return (
                          <div key={rad.id}>
                            <p className="text-base font-medium text-gray-800 mb-2">{rad.radtekst}</p>
                            <Skala
                              min={s.skala_min}
                              max={s.skala_max}
                              verdi={v?.ikke_aktuelt ? null : (v?.verdi_tall ?? null)}
                              settVerdi={(n) => settTall(s.id, rad.id, n)}
                              idBase={`sk-${s.id}-${rad.id}`}
                            />
                            {rad.tillat_ikke_aktuelt && (
                              <IkkeAktueltKnapp aktiv={!!v?.ikke_aktuelt} onClick={() => veksleIkkeAktuelt(s.id, rad.id)} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                )
              }

              return null
            })}
          </section>
        ))}

        {feil && <p className="mb-4 text-sm text-pink-700" role="alert">{feil}</p>}

        <button
          type="button"
          onClick={sendInn}
          disabled={sender}
          className="w-full py-4 rounded-xl bg-orange-500 text-white text-lg font-semibold hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          {sender ? 'Sender …' : 'Send svar'}
        </button>
        <p className="mt-3 text-xs text-gray-500 text-center">
          Lenken er personlig for din skole. Du kan åpne den igjen og endre svaret så lenge undersøkelsen er åpen.
        </p>
      </div>
    </main>
  )
}
