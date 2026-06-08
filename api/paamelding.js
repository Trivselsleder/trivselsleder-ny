import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { opprettSelskap } from './_hubspot.js'

const resend = new Resend(process.env.RESEND_API_KEY)

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const typeLabel = {
  barnehage: 'Barnehage', barnetrinn: 'Barnetrinn', ungdomstrinn: 'Ungdomstrinn',
  kombinert: 'Kombinert skole', SFO: 'SFO',
}

function rad(label, verdi) {
  if (!verdi) return ''
  return `<tr>
    <td style="padding:7px 12px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:7px 12px;color:#111;font-size:13px;">${esc(verdi)}</td>
  </tr>`
}

function seksjon(tittel, rader) {
  const innhold = rader.join('')
  if (!innhold) return ''
  return `
  <h3 style="font-size:13px;font-weight:700;color:#F47920;text-transform:uppercase;letter-spacing:.5px;margin:24px 0 4px;">${tittel}</h3>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    ${innhold}
  </table>`
}

function epostHtml(d) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <div style="background:#F47920;padding:24px 32px;">
    <span style="color:#fff;font-size:20px;font-weight:700;">Trivselsleder</span>
  </div>
  <div style="padding:32px;">
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 4px;">Ny påmelding</h1>
    <p style="font-size:14px;color:#888;margin:0 0 24px;">${esc(d.skolenavn)} · ${esc(typeLabel[d.type] ?? d.type)}</p>

    ${seksjon('Skoleinformasjon', [
      rad('Skolenavn', d.skolenavn),
      rad('Type', typeLabel[d.type] ?? d.type),
      rad('Antall elever', d.antall_elever),
      rad('Hjemmeside', d.hjemmeside),
    ])}

    ${seksjon('Adresse', [
      rad('Gateadresse', d.gateadresse),
      rad('Postnummer / poststed', `${d.postnummer} ${d.poststed}`),
      rad('Kommune', d.kommune),
      rad('Fylke', d.fylke),
    ])}

    ${seksjon('Faktura', [
      rad('Organisasjonsnummer', d.organisasjonsnummer),
      rad('Fakturaadresse', d.fakturaadresse),
      rad('Fakturareferanse', d.fakturareferanse),
      rad('Kontortelefon', d.kontortelefon),
    ])}

    ${seksjon('Rektor', [
      rad('Navn', d.rektor_navn),
      rad('E-post', d.rektor_epost),
      rad('Telefon', d.rektor_telefon),
    ])}

    ${d.htla_navn ? seksjon('Hoved-TL-ansvarlig (HTLA)', [
      rad('Navn', d.htla_navn),
      rad('E-post', d.htla_epost),
      rad('Telefon', d.htla_telefon),
    ]) : ''}

    ${d.tla_navn ? seksjon('TL-ansvarlig (TLA)', [
      rad('Navn', d.tla_navn),
      rad('E-post', d.tla_epost),
      rad('Telefon', d.tla_telefon),
    ]) : ''}

    ${d.merknader ? seksjon('Merknader', [
      rad('', d.merknader),
    ]) : ''}
  </div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
  <p style="font-size:12px;color:#aaa;text-align:center;padding:16px;">Trivselsleder · trivselsleder.no</p>
</div>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const d = req.body

  const påkrevde = ['skolenavn', 'type', 'gateadresse', 'postnummer', 'poststed', 'kommune', 'fylke', 'organisasjonsnummer', 'rektor_navn', 'rektor_epost']
  const mangler = påkrevde.filter(f => !d[f])
  if (mangler.length) return res.status(400).json({ error: `Mangler påkrevde felter: ${mangler.join(', ')}` })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Mangler env-var:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey })
    return res.status(500).json({ error: 'Serverkonfigurasjon mangler (SUPABASE_SERVICE_ROLE_KEY).' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: nyRad, error: dbError } = await supabase
    .from('paameldinger')
    .insert({
      status: 'påmeldt',
      skolenavn: d.skolenavn,
      type: d.type,
      antall_elever: d.antall_elever ? Number(d.antall_elever) : null,
      gateadresse: d.gateadresse,
      postnummer: d.postnummer,
      poststed: d.poststed,
      kommune: d.kommune,
      fylke: d.fylke,
      hjemmeside: d.hjemmeside || null,
      fakturaadresse: d.fakturaadresse || null,
      organisasjonsnummer: d.organisasjonsnummer,
      fakturareferanse: d.fakturareferanse || null,
      kontortelefon: d.kontortelefon || null,
      rektor_navn: d.rektor_navn,
      rektor_epost: d.rektor_epost,
      rektor_telefon: d.rektor_telefon || null,
      htla_navn: d.htla_navn || null,
      htla_epost: d.htla_epost || null,
      htla_telefon: d.htla_telefon || null,
      tla_navn: d.tla_navn || null,
      tla_epost: d.tla_epost || null,
      tla_telefon: d.tla_telefon || null,
      merknader: d.merknader || null,
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('DB-feil:', dbError)
    return res.status(500).json({ error: `DB-feil: ${dbError.message} (kode: ${dbError.code})` })
  }

  // HubSpot: opprett Company (ikke-kritisk – logger feil men stopper ikke innsending)
  if (process.env.HUBSPOT_API_KEY) {
    try {
      const hubspotId = await opprettSelskap(d)
      await supabase
        .from('paameldinger')
        .update({ hubspot_company_id: hubspotId })
        .eq('id', nyRad.id)
    } catch (e) {
      console.error('HubSpot-feil ved påmelding:', e.message)
    }
  }

  await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: 'post@trivselsleder.no',
    replyTo: d.rektor_epost,
    subject: `Ny påmelding: ${d.skolenavn}`,
    html: epostHtml(d),
  })

  return res.status(200).json({ ok: true })
}
