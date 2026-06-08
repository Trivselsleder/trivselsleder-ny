/**
 * Oppretter testbruker kjartaneide@me.com som skoleadmin på "Kjartans Trivselsskole"
 * Kjør: SUPABASE_SERVICE_ROLE_KEY=<nøkkel> node scripts/seed-testbruker.js
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zpirjbrcbeubwpmtncxx.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) {
  console.error('Mangler SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EPOST = 'kjartaneide@me.com'
const NAVN = 'Kjartan Eide (test)'
const ROLLE = 'skoleadmin'
const SKOLENAVN = 'Kjartans Trivselsskole'

async function main() {
  // 1. Opprett eller hent Auth-bruker
  console.log(`Oppretter bruker ${EPOST}...`)
  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.createUser({
    email: EPOST,
    email_confirm: true,
    password: 'TestPassord123!',
    user_metadata: { navn: NAVN },
  })

  let userId
  if (inviteErr) {
    // Supabase returnerer "User already registered" (ikke "already been registered")
    if (!inviteErr.message.toLowerCase().includes('already')) {
      throw new Error(`Auth-feil: ${inviteErr.message}`)
    }
    console.log('Bruker finnes allerede, henter ID og oppdaterer passord...')
    // Hent eksisterende bruker og oppdater passord
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) throw new Error(`Kunne ikke liste brukere: ${listErr.message}`)
    const existing = listData.users.find(u => u.email === EPOST)
    if (!existing) throw new Error(`Fant ikke eksisterende bruker med e-post ${EPOST}`)
    userId = existing.id
    // Oppdater passord så vi vet hva det er
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: 'TestPassord123!',
      email_confirm: true,
    })
    if (updateErr) throw new Error(`Passordoppdatering feilet: ${updateErr.message}`)
  } else {
    userId = inviteData.user.id
  }
  console.log(`Bruker-ID: ${userId}`)

  // 2. Opprett profil
  console.log('Oppretter profil...')
  const { error: profilErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, navn: NAVN, rolle: ROLLE, epost: EPOST, aktiv: true }, { onConflict: 'id' })
  if (profilErr) throw new Error(`Profil-feil: ${profilErr.message}`)

  // 3. Opprett skole hvis den ikke finnes
  console.log(`Sjekker om "${SKOLENAVN}" finnes...`)
  let { data: skole } = await supabase
    .from('skoler')
    .select('id, navn')
    .eq('navn', SKOLENAVN)
    .maybeSingle()

  if (!skole) {
    console.log(`Oppretter skole "${SKOLENAVN}"...`)
    const { data: nySkole, error: skoleErr } = await supabase
      .from('skoler')
      .insert({ navn: SKOLENAVN })
      .select('id, navn')
      .single()
    if (skoleErr) throw new Error(`Skole-feil: ${skoleErr.message}`)
    skole = nySkole
  }
  console.log(`Skole-ID: ${skole.id}`)

  // 4. Knytt bruker til skole
  console.log('Knytter bruker til skole...')
  const { error: bsErr } = await supabase
    .from('bruker_skole')
    .upsert(
      { bruker_id: userId, skole_id: skole.id, rolle: ROLLE, aktiv: true },
      { onConflict: 'bruker_id,skole_id' }
    )
  if (bsErr) throw new Error(`bruker_skole-feil: ${bsErr.message}`)

  console.log('\nFerdig!')
  console.log(`  E-post:    ${EPOST}`)
  console.log(`  Passord:   TestPassord123!`)
  console.log(`  Rolle:     ${ROLLE}`)
  console.log(`  Skole:     ${SKOLENAVN} (${skole.id})`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
