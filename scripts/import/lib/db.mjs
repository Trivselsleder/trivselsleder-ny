// SKRIVELAG. Implementert, men kjøres ALDRI i tørrmodus (standard). Skriving krever
// eksplisitt --skriv OG en gyldig .env.import. Feiler TYDELIG hvis nøkler mangler.
// Ingen nøkler i koden — alt fra .env.import.
import { readFileSync, existsSync } from 'node:fs'

// Enkel .env-parser (ingen dotenv-avhengighet). KEY=VALUE, # kommentar, valgfrie anførselstegn.
export function lesEnv(sti) {
  if (!existsSync(sti)) {
    throw new Error(
      `Fant ikke ${sti}. Skriving krever en .env.import med IMPORT_DATABASE_URL (peker på KOPI-basen, aldri prod).\n` +
      `Lag den slik:\n  IMPORT_DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAVN\n` +
      `Uten fila skrives INGENTING (fail-closed).`)
  }
  const ut = {}
  for (const linje of readFileSync(sti, 'utf8').split('\n')) {
    const l = linje.trim(); if (!l || l.startsWith('#')) continue
    const i = l.indexOf('='); if (i < 0) continue
    ut[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return ut
}

// ── IMPORTSPERRE (claude_IMPORTSPERRE-SPEC-5sep.md) ─────────────────────────────────────────────
// Allowlist på prosjektreferanse, IKKE fritekst-denylist. Alt her er RENE, synkrone tekstfunksjoner
// uten fs/pg/nettverk — fysisk ute av stand til å åpne en socket. Det er selve konstruksjonsregelen
// (spec punkt 1): sperren KAN ikke nå prod eller øvingskopien for å «sjekke», den avgjør på tekst alene.

// Prod-prosjektet importen ALDRI skal skrive mot (Kjartans beslutning 4. sep).
export const PROD_REFERANSE = 'zpirjbrcbeubwpmtncxx'

// Markørtabell som ligger i ØVINGSKOPIEN (og ALDRI i prod). Databasen oppgir sin egen kopi-referanse
// herfra — en verdi klienten IKKE kan forfalske fra tilkoblingsstrengen (rev 2). Oppsett-SQL for
// øvingskopien: se claude_IMPORTSPERRE-IDENTITET-5sep.md. Prod har ikke tabellen → hard stopp der.
export const IMPORT_KOPI_TABELL = 'import_kopi_identitet'

// Trekk ut Supabase-prosjektreferansen (fast 20-tegns [a-z0-9]-kode) fra VERTEN pg FAKTISK kobler til.
// A-retting (5. sep): tidligere regex mot HELE strengen kunne treffe en referanse i passord/query/path
// mens pg koblet til en ANNEN vert (bl.a. via `?host=`). Nå parses URL-en STRUKTURELT (new URL), og:
//   - ref tas KUN fra hostname (direkte: db.<ref>.supabase.co) eller username (pooler: postgres.<ref>),
//     aldri fra passord, sti eller query.
//   - enhver query-parameter som kan overstyre verten (host/hostaddr/port) → TVETYDIG → null (FORBUDT).
//   - alt som ikke er en gyldig postgres-URL med gjenkjennelig vert → null (FORBUDT, fail-closed).
export function hentProsjektRef(tilkoblingsstreng) {
  let u
  try { u = new URL(String(tilkoblingsstreng || '')) } catch { return null }
  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') return null
  // Kun `sslmode` tillates som query. ENHVER annen (host/hostaddr/port/user/options/…) kan overstyre
  // verten eller brukeren pg faktisk bruker → tvetydig → forbudt. (Lukker ?user=-omgåelsen billig.)
  for (const [nokkel] of u.searchParams) if (nokkel.toLowerCase() !== 'sslmode') return null
  const host = u.hostname.toLowerCase()
  let bruker = ''
  try { bruker = decodeURIComponent(u.username || '').toLowerCase() } catch { return null }
  // Kontrolltegn (NUL-trunkering) eller «%» i vert/bruker → forbudt.
  if (/[\x00-\x1f%]/.test(u.hostname) || /[\x00-\x1f%]/.test(host) ||
      /[\x00-\x1f%]/.test(u.username) || /[\x00-\x1f]/.test(bruker)) return null
  // Direkte tilkobling: hostname er NØYAKTIG db.<ref>.supabase.co
  const d = host.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)
  if (d) return d[1]
  // Session pooler: FULL match på pooler-verten (ikke endsWith), username NØYAKTIG postgres.<ref>.
  if (/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host)) {
    const p = bruker.match(/^postgres\.([a-z0-9]{20})$/)
    if (p) return p[1]
  }
  return null
}

// Parse IMPORT_TILLATTE_REF (kommaseparert) → array. Tom/mangler = [] (= ingenting tillatt).
export function lesTillatteRef(verdi) {
  return String(verdi || '').split(',').map(s => s.trim()).filter(Boolean)
}

const formatTillatt = (liste) => (liste && liste.length) ? liste.join(', ') : '(tom — ingenting er tillatt ennå)'

// ALLOWLIST-SJEKK (spec punkt 1–3). Tekst inn → godkjent (retur ref) eller HARD STOPP (throw).
// Tre distinkte avvisningsmeldinger; hver navngir det som ble funnet og hva som er tillatt.
// FAIL-CLOSED: en streng den ikke kjenner igjen er FORBUDT, ikke trygg.
export function sjekkAllowlist(tilkoblingsstreng, tillatteReferanser) {
  const tillatte = Array.isArray(tillatteReferanser) ? tillatteReferanser : lesTillatteRef(tillatteReferanser)
  const ref = hentProsjektRef(tilkoblingsstreng)
  if (!ref) {
    throw new Error(`SPERRE: fant ingen gjenkjennelig Supabase-prosjektreferanse i IMPORT_DATABASE_URL. Importen skriver kun mot eksplisitt tillatte referanser (IMPORT_TILLATTE_REF: ${formatTillatt(tillatte)}); en tilkoblingsstreng som ikke kan tolkes regnes som IKKE tillatt. Avbrutt før tilkobling ble forsøkt.`)
  }
  if (tillatte.includes(ref)) return ref                 // godkjent — eneste veien videre
  // Avvist fordi ref ikke står på allowlisten. Prod får sin egen, ekstra alvorlige melding.
  if (ref === PROD_REFERANSE) {
    throw new Error(`SPERRE: tilkoblingen peker på PROD (referanse ${PROD_REFERANSE}). Importen nekter HARDT å skrive mot prod. Avbrutt før tilkobling ble forsøkt.`)
  }
  throw new Error(`SPERRE: prosjekt-referansen "${ref}" står ikke i IMPORT_TILLATTE_REF (tillatt: ${formatTillatt(tillatte)}). Importen skriver ALDRI mot en referanse som ikke er eksplisitt tillatt. Rett IMPORT_DATABASE_URL, eller legg referansen til i IMPORT_TILLATTE_REF i .env.import hvis dette er en ny, godkjent kopi-base.`)
}

// FORGIFTET-KONFIG-SJEKK (spec punkt 5). Ren funksjon på RÅ filtekst: prod-referansen skal ALDRI
// forekomme i .env.import — heller ikke utkommentert. Egen sjekk fordi ett tastetrykk (fjern «#»)
// ellers gjør en «husk: aldri denne»-kommentar aktiv. Throw hvis den finnes NOE sted i teksten.
export function sjekkKonfigIkkeForgiftet(raaKonfigTekst) {
  // toLowerCase: fanges uansett bokstavstørrelse. Dekodet tekst i tillegg: fanger prosent-kodet prod-ref
  // (rev 2 NY-2, f.eks. %7apirj…) i råteksten. Begge former sjekkes.
  const t = String(raaKonfigTekst || '')
  let dekodet = t
  try { dekodet = decodeURIComponent(t) } catch { /* ugyldig %-sekvens → bruk råteksten */ }
  if (t.toLowerCase().includes(PROD_REFERANSE) || dekodet.toLowerCase().includes(PROD_REFERANSE)) {
    throw new Error(`SPERRE: .env.import inneholder prod-referansen ${PROD_REFERANSE} — også hvis den bare står i en kommentar eller er prosent-kodet. Denne referansen skal ALDRI forekomme i importens konfigurasjon i noen form. Fjern den fullstendig fra .env.import før importen kan kjøre igjen.`)
  }
}

// IDENTITETSSJEKK (rev 2, den nye mekanikken): SPØR DATABASEN, ikke strengen. Etter tilkobling —
// før noen skriveoperasjon — leser vi databasens EGEN kopi-referanse fra markørtabellen
// public.import_kopi_identitet. Den verdien kan IKKE forfalskes fra klientsiden (den bor i basen,
// ikke i tilkoblingsstrengen). Er referansen ikke i IMPORT_TILLATTE_REF, eller mangler markøren
// (som i prod), kaster vi — kalleren lukker forbindelsen. Ingen skriv. Ren les-spørring.
export async function bekreftKopiIdentitet(klient, tillatteReferanser) {
  const tillatte = Array.isArray(tillatteReferanser) ? tillatteReferanser : lesTillatteRef(tillatteReferanser)
  let fantes = false, ref = null
  try {
    const r = await klient.query(`select ref from public.${IMPORT_KOPI_TABELL} limit 1`)
    fantes = true
    ref = r.rows[0]?.ref ?? null
  } catch { fantes = false }   // tabell mangler (typisk prod) → ukjent identitet → forbudt
  if (!fantes) {
    throw new Error(`SPERRE (identitet): databasen mangler markørtabellen public.${IMPORT_KOPI_TABELL} — kan ikke bekrefte at dette er en godkjent kopi-base (prod har den ALDRI). Ingen skriv; forbindelsen lukkes. Kjør oppsett-SQL i øvingskopien (claude_IMPORTSPERRE-IDENTITET-5sep.md).`)
  }
  if (ref == null || !tillatte.includes(ref)) {
    throw new Error(`SPERRE (identitet): databasen oppgir SELV kopi-referanse ${ref ? `"${ref}"` : '(tom markør)'}, som IKKE er i IMPORT_TILLATTE_REF (${formatTillatt(tillatte)}). Denne sjekken spør databasen, ikke tilkoblingsstrengen — den kan ikke omgås fra klientsiden. Ingen skriv; forbindelsen lukkes.`)
  }
  return ref
}

// FK-trygg skriverekkefølge (fra data/analyse/TORRKJORING-EN-LEK.md §F).
export const SKRIVEREKKEFOLGE = [
  // oppslag (må finnes før koblinger); ressurser før innhold/koblinger/medier/dokumenter
  'fag', 'trinn', 'kategorier', 'utstyr', 'kompetansemaal',
  'import_kjoring',
  'ressurser', 'ressurs_innhold',
  'ressurs_kategori', 'ressurs_utstyr', 'ressurs_trinn', 'ressurs_egnet', 'ressurs_fag', 'ressurs_kompetansemaal',
  'ressurs_trinn_innhold',
  'medier',
  'dokumenter', 'ressurs_dokument',
  'redaksjonell_ko',
]

// Konfliktnøkler per tabell (for idempotent upsert). Deterministisk id gjør re-import trygt.
const KONFLIKT = {
  ressurser: ['id'], ressurs_innhold: ['ressurs_id', 'sprak'],
  ressurs_kategori: ['ressurs_id', 'kategori_id'], ressurs_utstyr: ['ressurs_id', 'utstyr_id'],
  ressurs_trinn: ['ressurs_id', 'trinn_id'], ressurs_egnet: ['ressurs_id', 'egnet_id'],
  ressurs_fag: ['ressurs_id', 'fag_id'], ressurs_kompetansemaal: ['ressurs_id', 'kompetansemaal_id'],
  ressurs_trinn_innhold: ['ressurs_id', 'trinn_id', 'sprak'],
  medier: ['id'], dokumenter: ['id'], ressurs_dokument: ['ressurs_id', 'dokument_id'],
  kategorier: ['navn'], utstyr: ['navn'], fag: ['navn'], trinn: ['land', 'kode'],
  kompetansemaal: ['uri'], import_kjoring: ['id'], redaksjonell_ko: ['id'],
}

export class Skriver {
  constructor({ dryRun, envSti }) {
    this.dryRun = dryRun
    this.envSti = envSti
    this.klient = null
  }

  async koble() {
    if (this.dryRun) return
    const env = lesEnv(this.envSti)
    // Spec punkt 5: forgiftet-konfig-sjekk på RÅ filtekst (fanger prod-ref også utkommentert) — FØR
    // og UAVHENGIG av per-kjørings-vurderingen under, og lenge før noe nettverkskall.
    sjekkKonfigIkkeForgiftet(readFileSync(this.envSti, 'utf8'))
    const url = env.IMPORT_DATABASE_URL
    if (!url) throw new Error('IMPORT_DATABASE_URL mangler i .env.import — skriving avbrutt (fail-closed).')
    // Spec punkt 1–3: allowlist-sjekk på uttrukket prosjektreferanse. Ren, uten nettverk. Kalt FØR
    // «pg» importeres og lenge før new Client()/connect() — sperren biter per konstruksjon.
    sjekkAllowlist(url, lesTillatteRef(env.IMPORT_TILLATTE_REF))
    let pg
    try { pg = await import('pg') } catch {
      throw new Error('Pakken «pg» er ikke installert. Kjør: npm i pg   (kun nødvendig for --skriv, ikke for tørrmodus).')
    }
    this.klient = new pg.default.Client({ connectionString: url })
    await this.klient.connect()
    // NY MEKANIKK (rev 2): forbindelsen er åpnet (akseptert av Kjartan — en åpen forbindelse uten
    // skriving gjør ingen skade). FØR noen skriveoperasjon spør vi databasen om dens EGEN identitet.
    // Strengsjekkene over er nå bare et billig FØRSTE filter; DETTE er beviset. Feiler den → lukk + kast.
    try {
      await bekreftKopiIdentitet(this.klient, lesTillatteRef(env.IMPORT_TILLATTE_REF))
    } catch (e) {
      await this.klient.end().catch(() => {})
      this.klient = null
      throw e
    }
  }

  // Skriv hele planen i FK-rekkefølge, i ÉN transaksjon (hard stoppregel: én feil → rollback).
  async skrivPlan(plan) {
    if (this.dryRun) throw new Error('skrivPlan skal aldri kalles i tørrmodus.')
    await this.klient.query('begin')
    try {
      for (const tabell of SKRIVEREKKEFOLGE) {
        const rader = plan[tabell]
        if (!rader || !rader.length) continue
        await this._upsert(tabell, rader)
      }
      await this.klient.query('commit')
    } catch (e) {
      await this.klient.query('rollback')
      throw new Error(`Import rullet tilbake (stoppregel). Feil ved skriving: ${e.message}`)
    }
  }

  async _upsert(tabell, rader) {
    const kols = Object.keys(rader[0])
    const konflikt = KONFLIKT[tabell] || ['id']
    const oppdater = kols.filter(k => !konflikt.includes(k))
    for (const rad of rader) {
      const verdier = kols.map(k => rad[k])
      const ph = kols.map((_, i) => `$${i + 1}`).join(', ')
      const setDel = oppdater.length ? ` do update set ${oppdater.map(k => `${k}=excluded.${k}`).join(', ')}` : ' do nothing'
      const sql = `insert into ${tabell} (${kols.join(', ')}) values (${ph}) on conflict (${konflikt.join(', ')})${setDel}`
      // Kolonnene fra migr 090–093 finnes ennå ikke → Postgres feiler TYDELIG her. Det er meningen.
      await this.klient.query(sql, verdier)
    }
  }

  // «Slett alt fra kjøring X» — én operasjon (importvern, pkt 3/pkt 4 i spesifikasjonen).
  // Rull tilbake ÉN kjøring (Kjartans stoppregel). Spesifikasjon: claude_TILBAKERULLING-SPEC-5sep.md.
  // FIRE eiere med egen import_kjoring_id må slettes eksplisitt — ingenting cascader TIL dem:
  //   ressurser, dokumenter, medier, samlinger. (samlinger manglet før — samling_innhold/-medie og
  //   kryss-kjørings samling_ressurs/-dokument overlevde da en «tilbakerulling».)
  // Rene cascade-barn (gruppe C: ressurs_*, dokument_*, samling_innhold/-ressurs/-dokument) forsvinner
  //   AUTOMATISK via ON DELETE CASCADE fra eierne — slettes ALDRI eksplisitt.
  // Gruppe B har egen import_kjoring_id OG cascader vanligvis fra en eier, men ikke garantert (kryss-
  //   kjørings-koblinger, subjektløs kø) — derfor et eksplisitt SIKKERHETSNETT på import_kjoring_id
  //   ETTER eierne: redaksjonell_ko, ressurs_kompetansemaal, ressurs_kompetansemaal_forslag, samling_medie.
  // IKKE rørt: kompetansemaal / kompetansemaal_trinn (delt referansedata, ingen import_kjoring_id;
  //   håndteres av migrasjon 104 — se spec punkt 6b). ALT i ÉN transaksjon (som skrivPlan).
  async slettKjøring(kjøringId) {
    if (this.dryRun) throw new Error('slettKjøring skal aldri kalles i tørrmodus.')
    await this.klient.query('begin')
    try {
      // 1) De fire eierne — cascade tar gruppe C + det meste av gruppe B automatisk.
      for (const t of ['medier', 'dokumenter', 'ressurser', 'samlinger']) {
        await this.klient.query(`delete from ${t} where import_kjoring_id = $1`, [kjøringId])
      }
      // 2) Sikkerhetsnett for gruppe B — rader cascade IKKE nådde (subjektløs kø, kryss-kjøring).
      for (const t of ['redaksjonell_ko', 'ressurs_kompetansemaal', 'ressurs_kompetansemaal_forslag', 'samling_medie']) {
        await this.klient.query(`delete from ${t} where import_kjoring_id = $1`, [kjøringId])
      }
      // 3) Merk kjøringsraden (selve import_kjoring-raden slettes aldri).
      await this.klient.query(`update import_kjoring set status='rullet_tilbake', ferdig_at=now() where id=$1`, [kjøringId])
      await this.klient.query('commit')
    } catch (e) {
      await this.klient.query('rollback'); throw e
    }
  }

  async ferdig() { if (this.klient) await this.klient.end() }
}
