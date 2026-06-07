import { createClient } from '@supabase/supabase-js'

const FEIDE_TOKEN_URL = 'https://auth.dataporten.no/oauth/token'
const FEIDE_USERINFO_URL = 'https://auth.dataporten.no/openid/userinfo'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, redirectUri } = req.body
  if (!code || !redirectUri) return res.status(400).json({ error: 'Mangler code eller redirectUri' })

  const clientId = process.env.FEIDE_CLIENT_ID
  const clientSecret = process.env.FEIDE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Feide-konfigurasjon mangler på server' })
  }

  // Bytt code mot tokens
  const tokenRes = await fetch(FEIDE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const tekst = await tokenRes.text()
    console.error('Feide token-feil:', tekst)
    return res.status(400).json({ error: 'Token-utveksling mot Feide feilet' })
  }

  const { access_token } = await tokenRes.json()

  // Hent brukerinfo fra Feide
  const userinfoRes = await fetch(FEIDE_USERINFO_URL, {
    headers: { 'Authorization': `Bearer ${access_token}` },
  })

  if (!userinfoRes.ok) {
    return res.status(400).json({ error: 'Kunne ikke hente brukerinfo fra Feide' })
  }

  const userinfo = await userinfoRes.json()
  const email = userinfo.email

  if (!email) {
    return res.status(400).json({ error: 'Feide returnerte ingen e-postadresse' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Generer magic link (oppretter brukeren i Supabase hvis de ikke finnes)
  let { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${new URL(redirectUri).origin}/min-side` },
  })

  // Hvis brukeren ikke finnes ennå, opprett den og prøv igjen
  if (linkError) {
    console.error('generateLink feil (forsøker å opprette bruker):', linkError.message)
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { navn: userinfo.name ?? '', feide_id: userinfo.sub },
    })
    if (createError) {
      console.error('createUser feil:', createError.message)
      return res.status(500).json({ error: 'Kunne ikke opprette bruker' })
    }
    ;({ data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${new URL(redirectUri).origin}/min-side` },
    }))
  }

  if (linkError || !linkData?.properties?.action_link) {
    console.error('Magic link feil:', linkError?.message)
    return res.status(500).json({ error: 'Kunne ikke opprette innloggingslenke' })
  }

  return res.status(200).json({ actionLink: linkData.properties.action_link })
}
