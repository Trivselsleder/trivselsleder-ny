import { useEffect, useState } from 'react'
import { hentOffentligeSkoler } from '../lib/offentligeSkoler'

// Nedtrekksliste for aa velge en NABOSKOLE (annen aktiv medlemsskole).
// Fylles fra hent_offentlige_skoler() (ingen PII). Egen skole utelates via
// `ekskluderId`. Kaller onVelg(id, skoleObjekt|null) ved endring.
export default function NaboskoleVelger({ verdi, onVelg, ekskluderId, disabled = false, className = '' }) {
  const [skoler, setSkoler] = useState([])
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState('')

  useEffect(() => {
    let aktiv = true
    hentOffentligeSkoler()
      .then((liste) => { if (aktiv) setSkoler(liste) })
      .catch((e) => { if (aktiv) setFeil(e.message || 'Ukjent feil') })
      .finally(() => { if (aktiv) setLaster(false) })
    return () => { aktiv = false }
  }, [])

  const valg = skoler.filter((s) => s.id !== ekskluderId)

  if (feil) {
    return <p className="text-sm text-red-600">Kunne ikke hente skolelista: {feil}</p>
  }

  return (
    <select
      value={verdi || ''}
      disabled={disabled || laster}
      onChange={(e) => {
        const id = e.target.value
        onVelg(id, valg.find((s) => s.id === id) || null)
      }}
      aria-label="Velg naboskole"
      className={className || 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:border-orange disabled:bg-gray-50 disabled:text-gray-400'}
    >
      <option value="">
        {laster ? 'Laster skoler …' : valg.length ? 'Velg naboskole …' : 'Ingen andre skoler tilgjengelig'}
      </option>
      {valg.map((s) => (
        <option key={s.id} value={s.id}>
          {s.navn}{s.kommune ? ` – ${s.kommune}` : ''}
        </option>
      ))}
    </select>
  )
}
