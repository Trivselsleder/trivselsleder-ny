const BASE_URL = 'https://api.hubapi.com'

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
  }
}

// Returnerer HubSpot Company-ID (string), eller kaster Error ved feil
export async function opprettSelskap(p) {
  const egenskaper = {
    name:                 p.skolenavn,
    address:              p.gateadresse,
    zip:                  p.postnummer,
    city:                 p.poststed,
    state:                p.fylke,
    country:              'Norge',
    ...(p.telefon          ? { phone:           p.telefon }          : {}),
    ...(p.kontortelefon    ? { phone:           p.kontortelefon }    : {}),
    ...(p.hjemmeside       ? { website:         p.hjemmeside }       : {}),
    ...(p.kommunenavn      ? { municipality:    p.kommunenavn }      : {}),
    ...(p.antall_elever    ? { number_of_pupils: String(p.antall_elever) } : {}),
    ...(p.type             ? { school_type:     p.type }             : {}),
    ...(p.nettverk         ? { nettverk:        p.nettverk }         : {}),
    organisasjonsnummer:  p.organisasjonsnummer ?? '',
    trivselsleder_status: 'Påmeldt',
  }

  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ properties: egenskaper }),
  })

  if (res.ok) return (await res.json()).id

  const feil = await res.json()

  // Første gang: trivselsleder_status mangler → opprett og prøv igjen
  const manglerEgenskap =
    feil.category === 'VALIDATION_ERROR' ||
    feil.errors?.some(e => e.error === 'PROPERTY_DOESNT_EXIST')

  if (manglerEgenskap) {
    await fetch(`${BASE_URL}/crm/v3/properties/companies`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'trivselsleder_status', label: 'Trivselsleder-status',
        type: 'string', fieldType: 'text', groupName: 'companyinformation',
      }),
    })
    const retry = await fetch(`${BASE_URL}/crm/v3/objects/companies`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ properties: egenskaper }),
    })
    if (!retry.ok) {
      const retryFeil = await retry.json()
      throw new Error(retryFeil.message ?? 'HubSpot-feil ved retry')
    }
    return (await retry.json()).id
  }

  throw new Error(feil.message ?? 'HubSpot-feil')
}

// Oppdaterer trivselsleder_status på et eksisterende Company
export async function oppdaterStatus(hubspotId, status) {
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/${hubspotId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties: { trivselsleder_status: status } }),
  })
  if (!res.ok) {
    const feil = await res.json()
    throw new Error(feil.message ?? 'HubSpot PATCH-feil')
  }
}

// Søker etter Company på navn, returnerer HubSpot-ID eller null
export async function finnSelskapIdPaaNavn(navn) {
  console.log('[HubSpot] finnSelskapIdPaaNavn: søker på navn:', JSON.stringify(navn))
  const payload = {
    filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: navn }] }],
    properties: ['name'],
    limit: 1,
  }
  console.log('[HubSpot] finnSelskapIdPaaNavn: payload:', JSON.stringify(payload))
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  const rawBody = await res.text()
  console.log('[HubSpot] finnSelskapIdPaaNavn: HTTP-status:', res.status, '| rårespons:', rawBody)
  if (!res.ok) {
    console.error('[HubSpot] finnSelskapIdPaaNavn: søk feilet')
    return null
  }
  const data = JSON.parse(rawBody)
  console.log('[HubSpot] finnSelskapIdPaaNavn: total:', data.total, '| treff:', data.results?.map(r => `${r.id} (${r.properties?.name})`).join(', ') || 'ingen')
  return data.results?.[0]?.id ?? null
}

// Oppdaterer vilkårlige felter på et Company
export async function oppdaterSelskapFelter(hubspotId, felter) {
  console.log('[HubSpot] oppdaterSelskapFelter: PATCH company', hubspotId, JSON.stringify(felter))
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/${hubspotId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties: felter }),
  })
  console.log('[HubSpot] oppdaterSelskapFelter: HTTP-status:', res.status)
  if (!res.ok) {
    const feil = await res.json()
    console.error('[HubSpot] oppdaterSelskapFelter: feil:', JSON.stringify(feil))
    throw new Error(feil.message ?? 'HubSpot PATCH-feil')
  }
  console.log('[HubSpot] oppdaterSelskapFelter: OK')
}

function splitNavn(navn) {
  const deler = (navn ?? '').trim().split(/\s+/)
  if (deler.length <= 1) return { firstname: deler[0] ?? '', lastname: '' }
  return { firstname: deler.slice(0, -1).join(' '), lastname: deler[deler.length - 1] }
}

// Oppretter eller oppdaterer en Contact basert på e-post, returnerer kontakt-ID
export async function oppdaterEllerOpprettKontakt({ navn, epost, tittel, telefon }) {
  const { firstname, lastname } = splitNavn(navn)
  console.log('[HubSpot] oppdaterEllerOpprettKontakt: søker kontakt epost:', epost, '| tittel:', tittel)

  const soekRes = await fetch(`${BASE_URL}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: epost }] }],
      properties: ['email'],
      limit: 1,
    }),
  })
  console.log('[HubSpot] oppdaterEllerOpprettKontakt: søk HTTP-status:', soekRes.status)
  const soekData = await soekRes.json()
  const eksisterende = soekData.results?.[0]
  console.log('[HubSpot] oppdaterEllerOpprettKontakt: eksisterende kontakt-ID:', eksisterende?.id ?? 'ingen — oppretter ny')

  const kontaktData = {
    firstname,
    lastname,
    email: epost,
    ...(tittel   ? { jobtitle:    tittel }   : {}),
    ...(telefon  ? { mobilephone: telefon }  : {}),
  }

  if (eksisterende) {
    await fetch(`${BASE_URL}/crm/v3/objects/contacts/${eksisterende.id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ properties: kontaktData }),
    })
    return eksisterende.id
  }

  const opprettRes = await fetch(`${BASE_URL}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ properties: kontaktData }),
  })
  if (!opprettRes.ok) {
    const feil = await opprettRes.json()
    throw new Error(feil.message ?? 'HubSpot kontakt-feil')
  }
  return (await opprettRes.json()).id
}

// Knytter en Contact til et Company (standardtilknytning)
export async function knyttKontaktTilSelskap(selskapId, kontaktId) {
  await fetch(
    `${BASE_URL}/crm/v4/objects/companies/${selskapId}/associations/default/contacts/${kontaktId}`,
    { method: 'PUT', headers: headers() }
  )
}
