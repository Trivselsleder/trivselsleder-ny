import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ROLLE_LABEL = {
  superadmin:  'Superadmin (Trivselsleder AS)',
  ansatt:      'Ansatt (Trivselsleder AS)',
  skoleadmin:  'Skoleadmin',
  skoleansatt: 'Skoleansatt',
  feide:       'Feide-bruker',
}

const ROLLE_STIL = {
  skoleadmin:  'bg-blue-100 text-blue-700',
  skoleansatt: 'bg-gray-100 text-gray-600',
  feide:       'bg-teal-100 text-teal-700',
}

function AdminLenke({ to, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-5 py-3 rounded-xl border border-gray-200 hover:border-[#F47920] hover:bg-[#F47920]/5 transition-colors group"
    >
      <span className="font-medium text-gray-700 group-hover:text-[#F47920]">{label}</span>
      <svg className="w-4 h-4 text-gray-400 group-hover:text-[#F47920]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function InviterSkolebrukerModal({ skoleId, skolenavn, onLukk, onInvitert }) {
  const { session } = useAuth()
  const [form, setForm] = useState({ epost: '', navn: '', rolle: 'skoleansatt' })
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState('')

  function felt(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function send(e) {
    e.preventDefault()
    setFeil('')
    setLaster(true)
    try {
      const res = await fetch('/api/auth/inviter-bruker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ epost: form.epost, navn: form.navn, rolle: form.rolle, skoleId }),
      })
      const data = await res.json()
      if (!res.ok) return setFeil(data.error || 'Noe gikk galt.')
      onInvitert()
    } catch {
      setFeil('Noe gikk galt.')
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Inviter skolebruker</h2>
            <p className="text-sm text-gray-400 mt-0.5">{skolenavn}</p>
          </div>
          <button onClick={onLukk} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={send} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-postadresse *</label>
            <input
              type="email" required value={form.epost}
              onChange={e => felt('epost', e.target.value)}
              placeholder="navn@skole.no"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn *</label>
            <input
              type="text" required value={form.navn}
              onChange={e => felt('navn', e.target.value)}
              placeholder="Fornavn Etternavn"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle *</label>
            <select
              value={form.rolle} onChange={e => felt('rolle', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47920]/30 focus:border-[#F47920]"
            >
              <option value="skoleansatt">Skoleansatt</option>
              <option value="skoleadmin">Skoleadmin</option>
            </select>
          </div>
          {feil && <p className="text-sm text-red-500">{feil}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onLukk} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Avbryt
            </button>
            <button
              type="submit" disabled={laster}
              className="bg-[#F47920] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#e06910] transition-colors disabled:opacity-50"
            >
              {laster ? 'Sender…' : 'Send invitasjon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SkoleadminSeksjon({ brukerId }) {
  const [skoleLink, setSkoleLink] = useState(null)
  const [ansatte, setAnsatte] = useState([])
  const [laster, setLaster] = useState(true)
  const [visInviter, setVisInviter] = useState(false)

  useEffect(() => {
    supabase
      .from('bruker_skole')
      .select('rolle, skoler(id, navn, kommunenavn, fylke)')
      .eq('bruker_id', brukerId)
      .limit(1)
      .single()
      .then(({ data }) => {
        setSkoleLink(data ?? null)
        if (data?.skoler?.id) hentAnsatte(data.skoler.id)
        else setLaster(false)
      })
  }, [brukerId])

  async function hentAnsatte(skoleId) {
    const { data } = await supabase
      .from('bruker_skole')
      .select('rolle, aktiv, profiles(id, navn, epost, rolle)')
      .eq('skole_id', skoleId)
    setAnsatte(data ?? [])
    setLaster(false)
  }

  const skole = skoleLink?.skoler
  const andreAnsatte = ansatte.filter(a => a.profiles?.id !== brukerId)

  return (
    <>
      {/* Skoleinfo-kort */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Min skole</h2>
        {laster ? (
          <div className="h-12 flex items-center">
            <div className="w-5 h-5 border-2 border-[#F47920] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : skole ? (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{skole.navn}</p>
            <p className="text-sm text-gray-500">
              {[skole.kommunenavn, skole.fylke].filter(Boolean).join(' · ')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-600">Ingen skole er knyttet til denne brukeren ennå.</p>
        )}
      </div>

      {/* Ansatte */}
      {skole && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Ansatte på skolen</h2>
            <button
              onClick={() => setVisInviter(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#F47920] hover:text-[#e06910] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Inviter
            </button>
          </div>

          {laster ? (
            <div className="py-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-[#F47920] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : andreAnsatte.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Ingen andre ansatte registrert ennå.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {andreAnsatte.map((a, i) => (
                <li key={a.profiles?.id ?? i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.profiles?.navn ?? '–'}</p>
                    <p className="text-xs text-gray-400">{a.profiles?.epost ?? '–'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLLE_STIL[a.rolle] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLLE_LABEL[a.rolle] ?? a.rolle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {visInviter && skole && (
        <InviterSkolebrukerModal
          skoleId={skole.id}
          skolenavn={skole.navn}
          onLukk={() => setVisInviter(false)}
          onInvitert={() => {
            setVisInviter(false)
            hentAnsatte(skole.id)
          }}
        />
      )}
    </>
  )
}

function SkoleansattSeksjon({ brukerId }) {
  const [skoleLink, setSkoleLink] = useState(null)
  const [laster, setLaster] = useState(true)

  useEffect(() => {
    supabase
      .from('bruker_skole')
      .select('skoler(id, navn, kommunenavn, fylke)')
      .eq('bruker_id', brukerId)
      .limit(1)
      .single()
      .then(({ data }) => { setSkoleLink(data ?? null); setLaster(false) })
  }, [brukerId])

  const skole = skoleLink?.skoler

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-800 mb-3">Min skole</h2>
      {laster ? (
        <div className="h-12 flex items-center">
          <div className="w-5 h-5 border-2 border-[#F47920] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : skole ? (
        <div className="space-y-0.5">
          <p className="font-medium text-gray-900">{skole.navn}</p>
          <p className="text-sm text-gray-500">
            {[skole.kommunenavn, skole.fylke].filter(Boolean).join(' · ')}
          </p>
        </div>
      ) : (
        <p className="text-sm text-amber-600">Ingen skole er knyttet til denne brukeren ennå.</p>
      )}
    </div>
  )
}

export default function MinSide() {
  const { bruker, session, loggUt } = useAuth()
  const navigate = useNavigate()
  const [lokalProfil, setLokalProfil] = useState(null)
  const [profilFeil, setProfilFeil] = useState(null)

  useEffect(() => {
    if (bruker || !session) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error('MinSide profil-feil:', error.message); setProfilFeil(error.message) }
        else setLokalProfil(data)
      })
  }, [bruker, session])

  const profil = bruker ?? lokalProfil
  const navn = profil?.navn ?? session?.user?.email ?? 'Bruker'
  const rolle = profil?.rolle
  const brukerId = session?.user?.id

  async function handleLoggUt() {
    await loggUt()
    navigate('/logg-inn')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Velkomstkort */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Velkommen, {profil?.navn ? profil.navn.split(' ')[0] : navn}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {rolle ? (
                  <>
                    Du er innlogget som{' '}
                    <span className="font-medium text-[#F47920]">
                      {ROLLE_LABEL[rolle] ?? rolle}
                    </span>
                  </>
                ) : profilFeil ? (
                  <span className="text-red-500">Kunne ikke hente profil: {profilFeil}</span>
                ) : (
                  <span className="text-amber-600">
                    Profil ikke funnet — kjør INSERT i Supabase SQL Editor.
                  </span>
                )}
              </p>
            </div>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 ${rolle ? 'bg-green-100' : 'bg-amber-100'}`}>
              {rolle ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Superadmin / ansatt: admin-lenker */}
        {['superadmin', 'ansatt'].includes(rolle) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Admin</h2>
            <div className="flex flex-col gap-3">
              {rolle === 'superadmin' && <AdminLenke to="/admin/brukere" label="Brukere" />}
              <AdminLenke to="/admin/skoler"       label="Skoleregister" />
              <AdminLenke to="/admin/paameldinger"  label="Påmeldinger" />
              <AdminLenke to="/admin/bestillinger"  label="Kulturkort-bestillinger" />
              <AdminLenke to="/admin/kulturkort"    label="Kulturkort-partnere" />
            </div>
          </div>
        )}

        {/* Skoleadmin: min skole + ansatte */}
        {rolle === 'skoleadmin' && brukerId && (
          <SkoleadminSeksjon brukerId={brukerId} />
        )}

        {/* Skoleansatt / feide: min skole, kun lese */}
        {['skoleansatt', 'feide'].includes(rolle) && brukerId && (
          <SkoleansattSeksjon brukerId={brukerId} />
        )}

        <button
          onClick={handleLoggUt}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          Logg ut
        </button>

      </div>
    </div>
  )
}
