// Tynt lag mot Resend sitt REST-API for BROADCASTS-delene (segmenter, kontakter,
// kontaktegenskaper, broadcasts). SDK-en («resend» npm) brukes ellers i repoet for
// enkelt-e-post; Broadcasts-endepunktene kalles her direkte med fetch, så vi ikke
// er avhengige av at SDK-versjonen har rukket å få dem.
//
// Alle funksjoner kaster ved feil — kallstedet fanger og rapporterer.

const BASE = 'https://api.resend.com'

async function kall(sti, metode = 'GET', body = undefined) {
  const res = await fetch(BASE + sti, {
    method: metode,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  let json = null
  try { json = await res.json() } catch { /* tomt svar er ok */ }
  if (!res.ok) {
    const melding = json?.message || json?.error?.message || `HTTP ${res.status}`
    const feil = new Error(melding)
    feil.status = res.status
    throw feil
  }
  return json
}

// Kontaktegenskapen som bærer den personlige avmeldingslenken. Opprettes
// idempotent: «finnes fra før» er suksess. fallback-siden (uten token) viser en
// forklaring og manuell avmeldingsmulighet — aldri en død lenke.
export async function sikreAvmeldingEgenskap(nettsted) {
  try {
    await kall('/contact-properties', 'POST', {
      key: 'avmelding_url',
      type: 'string',
      fallback_value: `${nettsted}/api/nyhetsbrev/avmeld`,
    })
  } catch (e) {
    // 409/422 = finnes allerede → helt fint. Alt annet er ekte feil.
    if (e.status !== 409 && e.status !== 422 && !/exist/i.test(e.message)) throw e
  }
}

export async function opprettSegment(navn) {
  const svar = await kall('/segments', 'POST', { name: navn })
  const id = svar?.id || svar?.data?.id
  if (!id) throw new Error('Resend ga ingen segment-id.')
  return id
}

// Opprett-eller-oppdater kontakt, og legg den i segmentet. POST er førstevalg;
// finnes kontakten fra før (409) prøver vi PATCH på e-postadressen. Feiler PATCH
// med segments (eldre API-oppførsel), prøves PATCH uten — da rapporteres
// kontakten som IKKE med i segmentet, slik at den telles som synk-feil og
// aldri later som den får utsendingen.
export async function upsertKontakt({ epost, fornavn, avmeldingUrl, segmentId }) {
  const felles = { properties: { avmelding_url: avmeldingUrl } }
  try {
    const svar = await kall('/contacts', 'POST', {
      email: epost,
      ...(fornavn ? { first_name: fornavn } : {}),
      ...felles,
      segments: [{ id: segmentId }],
    })
    return { ok: true, id: svar?.id || svar?.data?.id || null }
  } catch (e) {
    if (e.status !== 409 && !/exist/i.test(e.message)) throw e
  }
  try {
    const svar = await kall(`/contacts/${encodeURIComponent(epost)}`, 'PATCH', {
      ...felles,
      segments: [{ id: segmentId }],
    })
    return { ok: true, id: svar?.id || svar?.data?.id || null }
  } catch (e) {
    // Siste utvei: oppdater egenskapene, men meld fra at segment-plassering glapp.
    await kall(`/contacts/${encodeURIComponent(epost)}`, 'PATCH', felles)
    return { ok: false, id: null, grunn: 'kontakt oppdatert, men kom ikke inn i segmentet: ' + e.message }
  }
}

// Meld kontakten av globalt hos Resend (belte + bukseseler i tillegg til vår base).
export async function avmeldKontakt(epost) {
  await kall(`/contacts/${encodeURIComponent(epost)}`, 'PATCH', { unsubscribed: true })
}

export async function opprettBroadcast({ segmentId, fra, emne, html, svarTil, navn }) {
  const svar = await kall('/broadcasts', 'POST', {
    segment_id: segmentId,
    from: fra,
    subject: emne,
    html,
    ...(svarTil ? { reply_to: svarTil } : {}),
    ...(navn ? { name: navn } : {}),
  })
  const id = svar?.id || svar?.data?.id
  if (!id) throw new Error('Resend ga ingen broadcast-id.')
  return id
}

export async function sendBroadcast(broadcastId, planlagtAt) {
  return kall(`/broadcasts/${broadcastId}/send`, 'POST',
    planlagtAt ? { scheduled_at: planlagtAt } : {})
}
