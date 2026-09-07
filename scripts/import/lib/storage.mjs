// FILOPPLASTER (etappe 6, bilder + dokumenter) — kopierer en fil UT AV eksport-zip-en og legger
// den i Supabase Storage under prefikset import/<kjørings-id>/…, og oppdaterer så medier-/dokumenter-
// raden slik at storage_sti peker på en URL en nettleser faktisk kan hente. Video → Bunny (egen jobb).
//
// GJENBRUKER pakkebilder-oppskriften fra src/pages/AdminEvaluering.jsx:
//   supabase.storage.from(<bøtte>).upload(...) → getPublicUrl(...)  (offentlig bøtte, ingen signering).
// KJARTANS AVKLARING 6. sep: importerte bilder og dokumenter legges OFFENTLIG, som i dag på gammel side.
//
// SPERRE: Storage-målet utledes fra databasens EGEN kopi-markør (import_kopi_identitet), IKKE fra en
// klientstreng — nøyaktig samme identitet som db.mjs-sperren alt har godkjent. Da kan opplasteren
// aldri treffe et annet prosjekt enn det DB-tilkoblingen gikk gjennom sperren mot. Prod-ref → hard stopp.
//
// ORIGINALBILDE-REGELEN er alt avgjort i passene (regelMedier i regler.mjs): storage_sti peker på
// originalen når den finnes, ellers derivatet med kø-avviket «kun_skjermkvalitet». Opplasteren laster
// opp DET storage_sti peker på — den re-implementerer ikke regelen, den stoler på den.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { PROD_REFERANSE, IMPORT_KOPI_TABELL } from './db.mjs'
import { detUuid } from './uuid.mjs'

// Innholdstype fra filendelse (så nettleseren viser bildet/PDF-en i stedet for å laste den ned).
const INNHOLDSTYPER = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv', zip: 'application/zip',
}
export function innholdstype(sti) {
  const e = (String(sti).split('.').pop() || '').toLowerCase()
  return INNHOLDSTYPER[e] || 'application/octet-stream'
}

// Strøm ETT binært medlem ut av zip-en (unzip -p — ingen full utpakking, samme prinsipp som kilde.mjs).
// Returnerer Buffer, eller null hvis medlemmet ikke finnes. Kaster ALDRI på «finnes ikke» — en
// manglende fil skal håndteres av kalleren, ikke velte hele kjøringen.
export function streamBinaerFraZip(zipSti, medlem) {
  if (!zipSti) throw new Error('IMPORT_ZIP mangler — vet ikke hvilken zip filene skal hentes fra.')
  if (!existsSync(zipSti)) throw new Error(`Fant ikke eksport-zip: ${zipSti}. Sett IMPORT_ZIP i .env.import.`)
  let buf
  try {
    buf = execFileSync('unzip', ['-p', zipSti, medlem], { maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null   // medlem ikke funnet (unzip exit != 0) → null, ikke kast
  }
  if (!buf || buf.length === 0) return null
  return buf
}

// Les databasens EGEN kopi-referanse fra markørtabellen (samme kilde db.mjs-sperren bruker). Binder
// Storage-målet til den validerte identiteten. Prod har ALDRI markøren → der kommer vi uansett ikke hit.
export async function hentKopiRef(klient) {
  const r = await klient.query(`select ref from public.${IMPORT_KOPI_TABELL} limit 1`)
  const ref = r.rows[0]?.ref ?? null
  if (!ref) throw new Error('Storage-sperre: markørtabellen oppgir ingen kopi-referanse — kan ikke utlede Storage-mål. Ingen opplasting.')
  if (ref === PROD_REFERANSE) throw new Error(`Storage-sperre: markøren oppgir PROD (${PROD_REFERANSE}) — opplasteren nekter HARDT. Ingen opplasting.`)
  return ref
}

const TABELLER = new Set(['medier', 'dokumenter'])

export class FilOpplaster {
  // ref: validert kopi-referanse (fra hentKopiRef). storageKey: IMPORT_STORAGE_KEY fra .env.import.
  constructor({ ref, storageKey, bucket, zipSti }) {
    if (!ref) throw new Error('FilOpplaster: mangler ref (kall hentKopiRef først).')
    if (ref === PROD_REFERANSE) throw new Error(`FilOpplaster: ref er PROD (${PROD_REFERANSE}) — nekter.`)
    if (!storageKey) throw new Error('IMPORT_STORAGE_KEY mangler i .env.import — Storage-opplasting avbrutt (fail-closed). Legg inn øvingskopiens service_role-nøkkel.')
    this.ref = ref
    this.bucket = bucket || 'importfiler'
    this.zipSti = zipSti
    this.baseUrl = `https://${ref}.supabase.co`
    this.klient = createClient(this.baseUrl, storageKey, { auth: { persistSession: false } })
  }

  publicUrl(objektnokkel) {
    return this.klient.storage.from(this.bucket).getPublicUrl(objektnokkel).data.publicUrl
  }

  // Objektnøkkel: import/<kjørings-id>/<storage_sti>. «Slett prefikset import/<id>/» = hele opprydningen.
  objektnokkel(kjoringId, storageSti) {
    return `import/${kjoringId}/${storageSti}`
  }

  // Opprett bøtten om den ikke finnes (offentlig, som pakkebilder). Idempotent.
  async sikreBotte() {
    const { data } = await this.klient.storage.getBucket(this.bucket)
    if (data) return { opprettet: false, bucket: this.bucket }
    const { error } = await this.klient.storage.createBucket(this.bucket, { public: true })
    if (error && !/exist/i.test(error.message || '')) {
      throw new Error(`Kunne ikke opprette bøtte «${this.bucket}»: ${error.message}`)
    }
    return { opprettet: true, bucket: this.bucket }
  }

  // Ligger objektet der alt? (gjenopptaking) — list mappa og søk på filnavnet.
  async objektFinnes(objektnokkel) {
    const i = objektnokkel.lastIndexOf('/')
    const mappe = i >= 0 ? objektnokkel.slice(0, i) : ''
    const navn = i >= 0 ? objektnokkel.slice(i + 1) : objektnokkel
    const { data, error } = await this.klient.storage.from(this.bucket).list(mappe, { limit: 100, search: navn })
    if (error) return false
    return (data || []).some(o => o.name === navn)
  }

  // Last opp ÉN rad (medie eller dokument). Returnerer et status-objekt — kaster kun ved EKTE feil
  // (ikke ved «fil mangler» og ikke ved «allerede der»; begge er normale, håndterte utfall).
  //   status: 'lastet' | 'hoppet' (lå der) | 'allerede' (raden peker alt på URL) | 'mangler' | 'tom_sti'
  async lastOppRad(dbKlient, tabell, rad, kjoringId) {
    if (!TABELLER.has(tabell)) throw new Error(`FilOpplaster: ukjent tabell «${tabell}».`)
    const sti = rad.storage_sti
    if (!sti) return { status: 'tom_sti', id: rad.id }
    if (/^https?:\/\//i.test(sti)) return { status: 'allerede', id: rad.id, url: sti }   // gjenopptaking (rad)
    const nokkel = this.objektnokkel(kjoringId, sti)
    const url = this.publicUrl(nokkel)
    // Gjenopptaking (Storage): ligger objektet der alt → last IKKE opp på nytt, bare pek raden dit.
    if (await this.objektFinnes(nokkel)) {
      await this._oppdaterRad(dbKlient, tabell, rad.id, url)
      return { status: 'hoppet', id: rad.id, url }
    }
    const medlem = `Files/${sti}`   // storage_sti «public/…» ⇒ zip-medlem «Files/public/…» (bekreftet mapping)
    const bytes = streamBinaerFraZip(this.zipSti, medlem)
    if (bytes == null) {
      // FIL MANGLER i zip → håndteres, krasjer ikke: kø-rad (fil_mangler) + fortsett med neste.
      await this._koManglendeFil(dbKlient, tabell, rad, kjoringId, medlem)
      return { status: 'mangler', id: rad.id, medlem }
    }
    const { error } = await this.klient.storage.from(this.bucket)
      .upload(nokkel, bytes, { contentType: innholdstype(sti), upsert: false })
    if (error && this._erForStor(error)) {
      // FIL FOR STOR for Storage-grensen → kø som avvik + FORTSETT (samme mønster som fil_mangler).
      // Raden røres IKKE (storage_sti forblir «public/…»), så en senere kjøring tar den PÅ NYTT hvis
      // grensen heves. Sikkerhetsnett, ikke løsningen — grensen heves parallelt.
      await this._koForStor(dbKlient, tabell, rad, kjoringId, bytes.length)
      return { status: 'for_stor', id: rad.id, storrelse: bytes.length }
    }
    if (error && !/exist|dupli|already/i.test(error.message || '')) {
      throw new Error(`Opplasting feilet (${nokkel}): ${error.message}`)
    }
    await this._oppdaterRad(dbKlient, tabell, rad.id, url)
    return { status: 'lastet', id: rad.id, url, storrelse: bytes.length }
  }

  async _oppdaterRad(dbKlient, tabell, id, url) {
    await dbKlient.query(`update ${tabell} set storage_sti=$1 where id=$2`, [url, id])
  }

  // Deterministisk kø-id (kjøring+rad) ⇒ re-kjøring lager ikke dubletter (on conflict do nothing).
  async _koManglendeFil(dbKlient, tabell, rad, kjoringId, medlem) {
    const subjekt = tabell === 'medier' ? 'medie_id' : 'dokument_id'
    const koId = detUuid('ko-filmangler', `${kjoringId}-${rad.id}`)
    // Kolonnen i redaksjonell_ko (migr 093) heter «beskrivelse» (lest fra basen, ikke antatt).
    await dbKlient.query(
      `insert into redaksjonell_ko (id, type, status, beskrivelse, ${subjekt}, import_kjoring_id)
       values ($1,'fil_mangler','ny',$2,$3,$4) on conflict (id) do nothing`,
      [koId, `Fil mangler i eksport-zip: ${medlem} (${tabell}-rad ${rad.id}).`, rad.id, kjoringId])
  }

  // Storage avviste fila på størrelse? (Supabase: «exceeded the maximum allowed size», HTTP 413.)
  _erForStor(error) {
    const m = `${error?.message || ''} ${error?.error || ''} ${error?.statusCode || ''} ${error?.status || ''}`
    return /exceeded the maximum allowed size|maximum allowed size|payload too large|entity too large|\b413\b/i.test(m)
  }

  // Kø-rad for en fil som er FOR STOR for Storage-grensen. Ingen egen «for stor»-kø-type finnes blant de 22
  // fra migr 093 (en ny type ville krevd en migrasjon), så vi bruker fil_mangler med en beskrivelse som sier
  // at fila var for stor — og hvor stor. Egen id-salt så den ikke kolliderer med en evt. manglende-fil-kø for
  // samme rad. Raden er IKKE oppdatert (storage_sti forblir «public/…») ⇒ gjenopptaking tar den ved høyere grense.
  async _koForStor(dbKlient, tabell, rad, kjoringId, storrelse) {
    const subjekt = tabell === 'medier' ? 'medie_id' : 'dokument_id'
    const koId = detUuid('ko-forstor', `${kjoringId}-${rad.id}`)
    const mb = (storrelse / 1e6).toFixed(1)
    await dbKlient.query(
      `insert into redaksjonell_ko (id, type, status, beskrivelse, ${subjekt}, import_kjoring_id)
       values ($1,'fil_mangler','ny',$2,$3,$4) on conflict (id) do nothing`,
      [koId, `Fil for stor for Storage (${mb} MB > gjeldende grense): ${rad.storage_sti} (${tabell}-rad ${rad.id}). Kan lastes opp på nytt hvis grensen heves.`, rad.id, kjoringId])
  }

  // Rydd Storage for én kjøring: slett hele prefikset import/<kjørings-id>/ (rekursivt).
  // Speiler slettKjøring i db.mjs (som rydder RADENE) — dette rydder BYTENE.
  async slettPrefiks(kjoringId) {
    const rot = `import/${kjoringId}`
    const alle = await this._listRekursivt(rot)
    if (alle.length) {
      for (let i = 0; i < alle.length; i += 100) {
        const { error } = await this.klient.storage.from(this.bucket).remove(alle.slice(i, i + 100))
        if (error) throw new Error(`Kunne ikke slette Storage-prefiks: ${error.message}`)
      }
    }
    return alle.length
  }

  async _listRekursivt(mappe) {
    const ut = []
    const { data, error } = await this.klient.storage.from(this.bucket).list(mappe, { limit: 1000 })
    if (error || !data) return ut
    for (const o of data) {
      const full = `${mappe}/${o.name}`
      if (o.id === null || o.metadata == null) ut.push(...await this._listRekursivt(full))  // undermappe
      else ut.push(full)
    }
    return ut
  }
}
