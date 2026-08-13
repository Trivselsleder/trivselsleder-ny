import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { hentDeltPlan } from '../lib/periodeplan'
import { byggHtml, skrivUtPlan } from '../lib/periodeplanPdf'

// Offentlig, skrivebeskyttet visning av en delt periodeplan (via delingstoken).
export default function DeltPeriodeplan() {
  const { token } = useParams()
  const [plan, setPlan] = useState(null)
  const [feil, setFeil] = useState(null)
  const [laster, setLaster] = useState(true)

  useEffect(() => {
    hentDeltPlan(token)
      .then((data) => {
        if (!data) { setFeil('Fant ingen plan for denne lenken.'); return }
        // tilpass RPC-formen til byggHtml (rader.lek for ikon/tittel)
        setPlan({
          navn: data.navn, aar: data.aar, uker: data.uker || [],
          dager: data.dager || [], ansvarlige: data.ansvarlige || {},
          orientering: data.orientering || 'landscape',
          rader: (data.rader || []).map((r) => ({
            celler: r.celler || {},
            lek: { tittel: r.tittel || 'Slettet lek', utstyr: [], egnet: [] },
          })),
        })
      })
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false))
  }, [token])

  const srcDoc = useMemo(() => (plan ? byggHtml(plan) : ''), [plan])

  if (laster) return <div className="max-w-4xl mx-auto px-4 py-16 text-gray-400 text-center">Laster …</div>
  if (feil) return <div className="max-w-4xl mx-auto px-4 py-16 text-gray-500 text-center">{feil}</div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{plan.navn}</h1>
          <p className="text-sm text-gray-400">Delt periodeplan · skrivebeskyttet</p>
        </div>
        <button onClick={() => skrivUtPlan(plan)} className="text-sm bg-orange text-white px-4 py-2 rounded-full hover:bg-orange/90">
          Skriv ut / PDF
        </button>
      </div>
      <iframe title={plan.navn} srcDoc={srcDoc} className="w-full border border-gray-200 rounded-xl bg-white" style={{ height: '75vh' }} />
    </div>
  )
}
