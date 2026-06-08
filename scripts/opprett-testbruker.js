import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Les .env.local manuelt (ingen dotenv-avhengighet)
const envPath = resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Mangler VITE_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local')
  process.exit(1)
}

const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const EPOST    = 'kjartaneide@me.com'
const PASSORD  = 'TestPassord123!'
const NAVN     = 'Kjartan Eide (test)'
const ROLLE    = 'skoleadmin'
const SKOLE    = 'Kjartans Trivselsskole'

async function run() {
  // 1. Auth-bruker
  let userId
  const { data: nyBruker, error: createErr } = await sb.auth.admin.createUser({
    email: EPOST, password: PASSORD, email_confirm: true,
  })
  if (createErr) {
    if (!createErr.message.toLowerCase().includes('already')) throw createErr
    console.log('Bruker finnes — oppdaterer passord...')
    const { data: liste } = await sb.auth.admin.listUsers({ perPage: 1000 })
    const funnet = liste.users.find(u => u.email === EPOST)
    if (!funnet) throw new Error('Fant ikke eksisterende bruker')
    userId = funnet.id
    const { error: updErr } = await sb.auth.admin.updateUserById(userId, {
      password: PASSORD, email_confirm: true,
    })
    if (updErr) throw updErr
  } else {
    userId = nyBruker.user.id
  }
  console.log(`Auth OK  — id: ${userId}`)

  // Sørg for at service_role har tilgang til tabellene (mangler i rå SQL-migrasjoner)
  await fetch(`${URL}/rest/v1/rpc/`, { method: 'HEAD' }) // warm-up ignorert
  const grantRes = await fetch(`${URL}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!grantRes.ok) throw new Error('Klarte ikke nå Supabase REST API')

  // 2. Profil — direkte via REST med service_role
  const pRes = await fetch(`${URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ id: userId, navn: NAVN, rolle: ROLLE }),
  })
  if (!pRes.ok) {
    const body = await pRes.text()
    if (body.includes('permission denied')) {
      console.error('\nMangler GRANT på profiles-tabellen.')
      console.error('Kjør dette i Supabase SQL Editor og prøv igjen:\n')
      console.error('  GRANT ALL ON public.profiles, public.skoler, public.bruker_skole TO service_role;\n')
      process.exit(1)
    }
    throw new Error(`Profil feilet: ${body}`)
  }
  console.log('Profil OK')

  // 3. Skole
  await fetch(`${URL}/rest/v1/skoler`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({ navn: SKOLE }),
  })
  const sRes = await fetch(`${URL}/rest/v1/skoler?navn=eq.${encodeURIComponent(SKOLE)}&select=id`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  const [skole] = await sRes.json()
  if (!skole?.id) throw new Error('Fant ikke skolen etter insert')
  console.log(`Skole OK — id: ${skole.id}`)

  // 4. Knytt bruker til skole
  const bsRes = await fetch(`${URL}/rest/v1/bruker_skole`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ bruker_id: userId, skole_id: skole.id, rolle: ROLLE, aktiv: true }),
  })
  if (!bsRes.ok) throw new Error(`bruker_skole feilet: ${await bsRes.text()}`)
  console.log('Tilknytning OK')

  console.log(`\nKlar! Logg inn med:\n  E-post:  ${EPOST}\n  Passord: ${PASSORD}`)
}

run().catch(e => { console.error('FEIL:', e.message ?? e); process.exit(1) })
