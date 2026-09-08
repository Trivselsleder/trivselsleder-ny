import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hentUtkast } from '../../lib/leker'
import { useAuth } from '../../contexts/AuthContext'

// Utkast-inngang (D3, punkt 5). Interne finner ikke sine upubliserte leker i biblioteket, fordi
// sok_leker har et HARDT publisert-filter (bevisst — 089s SIKKERHET-seksjon, DEFINER omgår RLS).
// hentUtkast() går DIREKTE mot ressurser, beskyttet av RLS (status='publisert' OR fase3_intern()):
// interne ser utkast/arkivert, andre ser ingenting. Ingen ny sok_leker-parameter, publisert-filteret urørt.
export default function SkoleUtkast() {
  const { t } = useTranslation()
  const { bruker } = useAuth()
  const intern = ['superadmin', 'ansatt'].includes(bruker?.rolle)
  const [rader, setRader] = useState(null)
  const [feil, setFeil] = useState(null)

  useEffect(() => {
    if (!intern) return
    hentUtkast().then(setRader).catch((e) => setFeil(e.message))
  }, [intern])

  if (!intern) return <div className="max-w-3xl mx-auto px-4 py-12 text-gray-500">{t('utkast.ingenTilgang')}</div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('utkast.tittel')}</h1>
      <p className="text-gray-500 text-sm mt-1">{t('utkast.undertittel')}</p>

      {feil && <p className="text-red-600 text-sm mt-4">{feil}</p>}
      {rader === null && !feil && <p className="text-gray-400 mt-6">{t('utkast.laster')}</p>}
      {rader !== null && rader.length === 0 && (
        <div className="text-center text-gray-500 py-16">{t('utkast.tomt')}</div>
      )}

      {rader !== null && rader.length > 0 && (
        <ul className="mt-5 divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {rader.map((r) => (
            <li key={r.id}>
              <Link to={`/min-side/aktiviteter/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-orange/5">
                <span className="min-w-0">
                  <span className="font-medium text-gray-900 truncate block">{r.tittel}</span>
                  <span className="text-xs text-gray-500">
                    {r.ressurstype === 'aktiv_laering' ? t('utkast.aktivLaering') : t('utkast.lek')}
                  </span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-orange-ink bg-orange/10 px-2 py-1 rounded-full shrink-0">
                  {t('utkast.status.' + r.status, r.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
