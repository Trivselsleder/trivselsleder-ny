const BASE_URL = 'https://api.hubapi.com'

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
  }
}

// Egendefinerte egenskaper som må finnes i HubSpot Companies
const EGENSKAPER = [
  { name: 'organisasjonsnummer',  label: 'Organisasjonsnummer' },
  { name: 'rektor_navn',          label: 'Rektors navn' },
  { name: 'rektor_epost',         label: 'Rektors e-post' },
  { name: 'htla_navn',            label: 'HTLA navn' },
  { name: 'htla_epost',           label: 'HTLA e-post' },
  { name: 'trivselsleder_status', label: 'Trivselsleder-status' },
]

async function opprettEgenskaper() {
  await Promise.all(
    EGENSKAPER.map(e =>
      fetch(`${BASE_URL}/crm/v3/properties/companies`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name:       e.name,
          label:      e.label,
          type:       'string',
          fieldType:  'text',
          groupName:  'companyinformation',
        }),
      })
      // 409 = egenskap finnes allerede, ignorer
    )
  )
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
    ...(p.kontortelefon  ? { phone:   p.kontortelefon } : {}),
    ...(p.hjemmeside     ? { website: p.hjemmeside }    : {}),
    organisasjonsnummer:  p.organisasjonsnummer ?? '',
    rektor_navn:          p.rektor_navn ?? '',
    rektor_epost:         p.rektor_epost ?? '',
    htla_navn:            p.htla_navn ?? '',
    htla_epost:           p.htla_epost ?? '',
    trivselsleder_status: 'Påmeldt',
  }

  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ properties: egenskaper }),
  })

  if (res.ok) return (await res.json()).id

  const feil = await res.json()

  // Første gang: egendefinerte egenskaper mangler → opprett dem og prøv igjen
  const manglerEgenskap =
    feil.category === 'VALIDATION_ERROR' ||
    feil.errors?.some(e => e.error === 'PROPERTY_DOESNT_EXIST')

  if (manglerEgenskap) {
    await opprettEgenskaper()
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
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: navn }] }],
      properties: ['name'],
      limit: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.id ?? null
}

// Oppdaterer vilkårlige felter på et Company
export async function oppdaterSelskapFelter(hubspotId, felter) {
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/${hubspotId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties: felter }),
  })
  if (!res.ok) {
    const feil = await res.json()
    throw new Error(feil.message ?? 'HubSpot PATCH-feil')
  }
}

function splitNavn(navn) {
  const deler = (navn ?? '').trim().split(/\s+/)
  if (deler.length <= 1) return { firstname: deler[0] ?? '', lastname: '' }
  return { firstname: deler.slice(0, -1).join(' '), lastname: deler[deler.length - 1] }
}

// Oppretter eller oppdaterer en Contact basert på e-post, returnerer kontakt-ID
export async function oppdaterEllerOpprettKontakt({ navn, epost, tittel }) {
  const { firstname, lastname } = splitNavn(navn)

  // Søk på e-post
  const soekRes = await fetch(`${BASE_URL}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: epost }] }],
      properties: ['email'],
      limit: 1,
    }),
  })
  const soekData = await soekRes.json()
  const eksisterende = soekData.results?.[0]

  const kontaktData = { firstname, lastname, email: epost, ...(tittel ? { jobtitle: tittel } : {}) }

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
