/* global process */
import { createClient } from '@supabase/supabase-js'
import { tjenerKlient } from './_kode.js'
import { formaterKode, lagKodesett } from './_kodesett.js'

// POST /api/tu/opprett-koder
// Header: Authorization: Bearer <lærerens Supabase-token>
// Body:   { rundeId: "<uuid>" }
//
// Genererer kodesettet for ÉN runde/gruppe (steg 4.3): elevtall + 2 koder,
// setter HMAC-ene inn i tu_koder og åpner runden — alt atomisk via RPC
// tu_generer_kodesett (migr 066). Returnerer RÅKODENE til lærerens ark.
//
// Sikkerhet/personvern:
//  - Rå-kodene finnes KUN i dette svaret og på papirarket. De lagres aldri
//    (kun HMAC via RPC-en), og de logges aldri — hverken her eller i RPC.
//  - Endepunktet krever gyldig innlogging + rolle skoleadmin/superadmin
//    (samme grense som kanOpprette i frontenden og RLS-en for tu_runder).
//  - Selve autorisasjonen på SKOLEN gjøres av RPC-en (tu_har_tilgang_skole
//    på auth.uid()) — derfor kalles den med BRUKERENS token, ikke
//    service-nøkkelen. Endepunktet er altså aldri åpnere enn databasen.
//  - Engangsgaranti: RPC-en nekter hvis runden alt har koder eller ikke er
//    utkast — et nytt kall kan aldri lage «kode-ark nummer to».

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ feil: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ feil: 'IKKE_INNLOGGET' })
  const token = authHeader.slice(7)

  const rundeId = String(req.body?.rundeId || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(rundeId)) return res.status(400).json({ feil: 'UGYLDIG_RUNDE' })

  // --- 1) Hvem er kalleren? (service-klient kun til token-validering + rolle)
  let service
  try {
    service = tjenerKlient()
  } catch (e) {
    console.error('TU opprett-koder konfig-feil:', e.kode || e.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }
  const { data: { user: kaller } = {} } = await service.auth.getUser(token)
  if (!kaller) return res.status(401).json({ feil: 'IKKE_INNLOGGET' })

  const { data: profil } = await service
    .from('profiles')
    .select('rolle')
    .eq('id', kaller.id)
    .maybeSingle()
  if (!['skoleadmin', 'superadmin'].includes(profil?.rolle)) {
    return res.status(403).json({ feil: 'INGEN_TILGANG' })
  }

  // --- 2) Klient MED brukerens identitet: RLS + tu_har_tilgang_skole gjelder.
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!anonKey) {
    console.error('TU opprett-koder konfig-feil: mangler VITE_SUPABASE_ANON_KEY')
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }
  const somBruker = createClient(process.env.VITE_SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // --- 3) Runden (RLS avgjør synlighet): elevtall gir antallet.
  const { data: runde, error: rundeFeil } = await somBruker
    .from('tu_runder')
    .select('id, gruppe_navn, trinn, skoleaar, semester, status, elevtall, startdato, frist')
    .eq('id', rundeId)
    .maybeSingle()
  if (rundeFeil) {
    console.error('TU opprett-koder DB-feil (runde):', rundeFeil.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }
  if (!runde) return res.status(404).json({ feil: 'UKJENT_RUNDE' })
  if (runde.status === 'apen') return res.status(409).json({ feil: 'ALLEREDE_GENERERT' })
  if (runde.status !== 'utkast') return res.status(409).json({ feil: 'FEIL_STATUS' })
  if (!Number.isInteger(runde.elevtall) || runde.elevtall < 1) {
    return res.status(400).json({ feil: 'MANGLER_ELEVTALL' })
  }

  // Byggeplan 4.3: elevtall + 2 ekstra koder per gruppe.
  const antall = runde.elevtall + 2

  // --- 4) Generer → HMAC → atomisk RPC (med kollisjonshåndtering i _kodesett).
  let koder
  try {
    koder = await lagKodesett({
      antall,
      rpcKall: (hmacs, n) =>
        somBruker.rpc('tu_generer_kodesett', {
          p_runde: rundeId,
          p_hmacs: hmacs,
          p_antall: n,
        }),
    })
  } catch (e) {
    const melding = String(e?.message || '')
    if (e?.kode === 'MANGLER_NOKKEL') {
      // TU_KODE_HMAC_KEY er ikke satt i Vercel — klar, menneskelig beskjed.
      return res.status(500).json({ feil: 'MANGLER_NOKKEL' })
    }
    if (/TU_KODER_FINNES|TU_FEIL_STATUS/.test(melding)) {
      return res.status(409).json({ feil: 'ALLEREDE_GENERERT' })
    }
    if (/Ingen tilgang/i.test(melding)) return res.status(403).json({ feil: 'INGEN_TILGANG' })
    if (/Ukjent runde/i.test(melding)) return res.status(404).json({ feil: 'UKJENT_RUNDE' })
    if (e?.kode === 'KOLLISJON_MAKS') {
      console.error('TU opprett-koder: ga opp etter gjentatte kollisjoner')
      return res.status(500).json({ feil: 'KOLLISJON' })
    }
    // Logg ALDRI innhold som kan romme koder — kun feilmelding/kode.
    console.error('TU opprett-koder feil:', e?.kode || melding)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }

  // --- 5) Råkodene til arket — vises én gang, lagres aldri, logges aldri.
  // Formatert XXXX-XXXX for lesbarhet fra papir; bindestreken fjernes av
  // normaliserKode ved innsending, så HMAC-en er upåvirket.
  return res.status(200).json({
    koder: koder.map(formaterKode),
    runde: {
      id: runde.id,
      gruppeNavn: runde.gruppe_navn,
      trinn: runde.trinn,
      skoleaar: runde.skoleaar,
      semester: runde.semester,
      startdato: runde.startdato,
      frist: runde.frist,
    },
  })
}
