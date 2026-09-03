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
    const url = env.IMPORT_DATABASE_URL
    if (!url) throw new Error('IMPORT_DATABASE_URL mangler i .env.import — skriving avbrutt (fail-closed).')
    if (/supabase\.co|prod/i.test(url) && !env.IMPORT_TILLAT_IKKE_KOPI) {
      throw new Error('IMPORT_DATABASE_URL ser ut som prod/Supabase-direkte. Sett IMPORT_TILLAT_IKKE_KOPI=1 kun hvis du VIRKELIG mener kopi-basen.')
    }
    let pg
    try { pg = await import('pg') } catch {
      throw new Error('Pakken «pg» er ikke installert. Kjør: npm i pg   (kun nødvendig for --skriv, ikke for tørrmodus).')
    }
    this.klient = new pg.default.Client({ connectionString: url })
    await this.klient.connect()
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
  async slettKjøring(kjøringId) {
    if (this.dryRun) throw new Error('slettKjøring skal aldri kalles i tørrmodus.')
    await this.klient.query('begin')
    try {
      // Barn først; men FK-ene er ON DELETE CASCADE fra ressurser/dokumenter (025/026),
      // så det holder å slette eierne + selve kjøringsraden. import_kjoring_id finnes fra migr 091.
      for (const t of ['medier', 'dokumenter', 'ressurser']) {
        await this.klient.query(`delete from ${t} where import_kjoring_id = $1`, [kjøringId])
      }
      await this.klient.query(`update import_kjoring set status='rullet_tilbake', ferdig_at=now() where id=$1`, [kjøringId])
      await this.klient.query('commit')
    } catch (e) {
      await this.klient.query('rollback'); throw e
    }
  }

  async ferdig() { if (this.klient) await this.klient.end() }
}
