// RESEND-WEBHOOK for kontakt-hendelser (Broadcasts-fundamentet).
//
// Hensikt: melder noen seg av via Resend sine egne flater (f.eks. en fremtidig
// {{{RESEND_UNSUBSCRIBE_URL}}} eller manuell endring i dashbordet), skal VÅR
// samtykkebase speile det umiddelbart. Vår egen avmeldingslenke går motsatt vei
// (basen først, så Resend) — sammen holder de to basene seg synkront avmeldt.
//
// Sikkerhet: Resend signerer webhooks med svix. Vi verifiserer signaturen med
// RESEND_WEBHOOK_SECRET (whsec_…). Mangler hemmeligheten, svarer vi 500 og
// behandler INGENTING — fail closed, synlig i Resend-dashbordets leveringslogg.
//
// Vi behandler kun contact.updated/contact.deleted, og vi setter BARE avmeldt_at
// (aldri motsatt vei): en webhook skal aldri kunne melde noen PÅ igjen.

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }   // rå kropp trengs til signatursjekk

function lesRaaKropp(req) {
  return new Promise((resolve, reject) => {
    const biter = []
    req.on('data', (b) => biter.push(b))
    req.on('end', () => resolve(Buffer.concat(biter).toString('utf8')))
    req.on('error', reject)
  })
}

export function verifiserSvix(hemmelighet, id, tidsstempel, signaturHeader, kropp) {
  // svix: signert innhold er "<id>.<timestamp>.<body>", HMAC-SHA256 med
  // base64-dekodet hemmelighet (etter «whsec_»), base64-kodet resultat.
  const noekkel = Buffer.from(hemmelighet.replace(/^whsec_/, ''), 'base64')
  const ventet = crypto.createHmac('sha256', noekkel)
    .update(`${id}.${tidsstempel}.${kropp}`).digest('base64')
  // Headeren kan liste flere: "v1,<sig> v1,<sig2>"
  return (signaturHeader || '').split(' ').some((del) => {
    const sig = del.split(',')[1] || ''
    try {
      return sig.length > 0 && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ventet))
    } catch { return false }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const hemmelighet = process.env.RESEND_WEBHOOK_SECRET
  if (!hemmelighet) {
    return res.status(500).json({ error: 'RESEND_WEBHOOK_SECRET mangler — webhook avvist (fail closed).' })
  }

  const kropp = await lesRaaKropp(req)
  const svixId = req.headers['svix-id']
  const svixTid = req.headers['svix-timestamp']
  const svixSig = req.headers['svix-signature']
  if (!svixId || !svixTid || !svixSig) return res.status(400).json({ error: 'Mangler svix-headere.' })

  // Aldersvern mot replay (svix-standard: 5 minutter)
  const alder = Math.abs(Date.now() / 1000 - Number(svixTid))
  if (!Number.isFinite(alder) || alder > 300) return res.status(400).json({ error: 'Utdatert tidsstempel.' })

  if (!verifiserSvix(hemmelighet, svixId, svixTid, svixSig, kropp)) {
    return res.status(401).json({ error: 'Ugyldig signatur.' })
  }

  let hendelse
  try { hendelse = JSON.parse(kropp) } catch { return res.status(400).json({ error: 'Ugyldig JSON.' }) }

  const type = hendelse?.type || ''
  const data = hendelse?.data || {}
  const epost = (data.email || '').trim().toLowerCase()

  // Kun avmeldings-relevante hendelser. Alt annet kvitteres OK uten handling.
  const avmeldt = (type === 'contact.updated' && data.unsubscribed === true)
    || type === 'contact.deleted'
  if (!avmeldt || !epost) return res.status(200).json({ ok: true, handling: 'ingen' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Idempotent: sett avmeldt_at kun der den ikke alt står.
  const { error } = await supabase
    .from('nyhetsbrev_mottakere')
    .update({ avmeldt_at: new Date().toISOString(), endret_at: new Date().toISOString() })
    .ilike('epost', epost)
    .is('avmeldt_at', null)
  if (error) {
    console.error('webhook: kunne ikke sette avmeldt_at:', error.message)
    return res.status(500).json({ error: 'Basefeil — Resend prøver igjen.' })
  }

  return res.status(200).json({ ok: true, handling: 'avmeldt', epost })
}
