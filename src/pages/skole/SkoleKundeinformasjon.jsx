import { useEffect, useState } from 'react'
import { hentMinSkole, hentSkole, lagreSkole } from '../../lib/skole'
import { SkoleRedigerForm } from '../../components/SkoleRedigerForm'

function tilForm(skole) {
  return {
    navn: skole?.navn ?? '',
    gateadresse: skole?.gateadresse ?? '',
    postnummer: skole?.postnummer ?? '',
    poststed: skole?.poststed ?? '',
    telefon: skole?.telefon ?? '',
    antall_elever: skole?.antall_elever ?? '',
    type: skole?.type ?? '',
    nettverk: skole?.nettverk ?? '',
    rektor_navn: skole?.rektor_navn ?? '',
    rektor_epost: skole?.rektor_epost ?? '',
    rektor_telefon: skole?.rektor_telefon ?? '',
    hktl_navn: skole?.hktl_navn ?? '',
    hktl_epost: skole?.hktl_epost ?? '',
    hktl_telefon: skole?.hktl_telefon ?? '',
    tla_kontakter: (skole?.tla_kontakter ?? []).length > 0
      ? skole.tla_kontakter
      : [{ navn: '', epost: '', telefon: '' }],
  }
}

export default function SkoleKundeinformasjon() {
  const [skoleId, setSkoleId] = useState(null)
  const [form, setForm] = useState(null)
  const [original, setOriginal] = useState(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState(null)
  const [lagrer, setLagrer] = useState(false)
  const [lagreFeil, setLagreFeil] = useState('')
  const [lagret, setLagret] = useState(false)

  useEffect(() => {
    let aktiv = true
    ;(async () => {
      try {
        const sid = await hentMinSkole()
        if (!aktiv) return
        setSkoleId(sid)
        if (!sid) { setLaster(false); return }
        const skole = await hentSkole(sid)
        if (!aktiv) return
        if (!skole) { setFeil('Fant ikke skolen din. Kontakt Trivselsleder hvis dette vedvarer.'); return }
        const f = tilForm(skole)
        setForm(f); setOriginal(f)
      } catch (e) {
        if (aktiv) setFeil(e.message)
      } finally {
        if (aktiv) setLaster(false)
      }
    })()
    return () => { aktiv = false }
  }, [])

  function felt(key, val) { setForm((f) => ({ ...f, [key]: val })); setLagret(false) }
  function settTla(i, key, val) {
    setForm((f) => ({ ...f, tla_kontakter: f.tla_kontakter.map((t, idx) => (idx === i ? { ...t, [key]: val } : t)) }))
    setLagret(false)
  }
  function fjernTla(i) { setForm((f) => ({ ...f, tla_kontakter: f.tla_kontakter.filter((_, idx) => idx !== i) })) }
  function leggTilTla() { setForm((f) => ({ ...f, tla_kontakter: [...f.tla_kontakter, { navn: '', epost: '', telefon: '' }] })) }

  async function lagre(e) {
    e.preventDefault()
    setLagreFeil(''); setLagret(false); setLagrer(true)
    try {
      await lagreSkole(skoleId, form)
      // Re-hent så skjemaet viser faktisk lagret tilstand (avslører evt. avvik).
      const skole = await hentSkole(skoleId).catch(() => null)
      if (skole) { const f = tilForm(skole); setForm(f); setOriginal(f) }
      setLagret(true)
    } catch (err) {
      setLagreFeil(err.message)
    } finally {
      setLagrer(false)
    }
  }

  // Tilbakestill til sist innlastede verdier (aldri blank ut skjemaet).
  function avbryt() {
    setLagreFeil(''); setLagret(false)
    if (original) setForm(original)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Kundeinformasjon</h1>
      <p className="text-gray-500 text-sm mt-1">Skolens kontakt- og avtaleinformasjon. Husk å lagre etter endringer.</p>

      {laster && <p className="text-gray-500 mt-8">Laster skoleinformasjon …</p>}
      {feil && <p role="alert" className="text-red-600 mt-8">Kunne ikke hente skolen: {feil}</p>}

      {!laster && !feil && !skoleId && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-gray-500 py-12 px-6 text-center">
          Brukeren din er ikke koblet til en skole, så det er ingen kundeinformasjon å vise her.
        </div>
      )}

      {!laster && !feil && skoleId && form && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          {lagret && (
            <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-petrol/5 border border-petrol/15 px-4 py-3 text-petrol">
              <span aria-hidden="true">✓</span> Lagret.
            </div>
          )}
          <SkoleRedigerForm
            form={form}
            felt={felt}
            settTla={settTla}
            fjernTla={fjernTla}
            leggTilTla={leggTilTla}
            onSubmit={lagre}
            onAvbryt={avbryt}
            lagrer={lagrer}
            lagreFeil={lagreFeil}
          />
        </div>
      )}
    </div>
  )
}
