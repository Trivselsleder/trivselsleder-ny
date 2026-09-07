// DOKUMENT-PASSET (skrivelagets steg 9) — dokumenter + dokumenttype/språk/fag.
// Spesifikasjon: claude_SKRIVELAG-SPESIFIKASJON-3sep.md steg 9 + claude_TOPIC-VOKABULAR-KARTLAGT.
//
// BYGGBART mot 001→103-basen (F2 rettet 5. sep — begge koblingstabellene finnes nå, migr 103):
//   - `dokumenter` (id=detUuid('document',nid), tittel, type, storage_sti, status='publisert',
//      ressurs_id=NULL (091B), kilde_nid, import_kjoring_id).
//   - `dokument_dokumenttype` (field_type_document → dokument_type_id via tid-kart). HUS-liste: bom = kø.
//   - `dokument_sprak` (field_lang → sprakkode). 103-CHECK tillater KUN 'nb'/'nn' — se SPRAK nedenfor.
//   - `dokument_fag` (via field_topic → fag.navn → fag_id). fag er hus-liste: bom = IKKE ny rad.
//
// FAIL-CLOSED (prinsipp beholdt, F2): mangler en av koblingstabellene i basen, STOPPER passet HARDT
//   (skrivDokumentPass sjekker to_regclass før skriving) — det hopper ALDRI stille over. Det var riktig
//   oppførsel mot 001→102; nå er tabellene der, så passet skriver dem.
//
// SPRAK (F2-funn 5. sep): field_lang på de 536 publiserte har verdiene nb (486), nn (125), en (90) = 701.
//   103s `dokument_sprak_sprak_check` tillater bare 'nb'/'nn'. De 90 'en'-kodene kan derfor IKKE skrives
//   (103 sier selv: «ukjent sprak skal ikke skli inn stille — stopper importen paa CHECK»). Vi hopper
//   dem ALDRI stille: hver ikke-nb/nn-kode KØES (type 'annet') og telles. Skrevne rader blir 611, ikke
//   701. Differansen (90) er en ÅPEN BESLUTNING for Kjartan: utvid 103-CHECK til 'en' (ny migrasjon) om
//   engelske dokumenter skal ha egen språk-rad, ellers forblir de kø. Se rapporten.
//
// Kø-typer (2B): dokumenttype_uavklart (tid ikke i dokument_type-kartet), 'annet' (ukjent språkkode).
//   Avpublisert dokument importeres IKKE (FLAGG D) — filtreres av kalleren.

import { detUuid } from './uuid.mjs'
import { køRad } from './ko.mjs'
import { krevKjoringId, krevOppslag, krevArray, krevKlient, krevPlan } from './vakt.mjs'

export const DOKUMENTPASS_REKKEFOLGE = ['dokumenter', 'dokument_dokumenttype', 'dokument_sprak', 'dokument_fag', 'redaksjonell_ko']
const KONFLIKT = {
  dokumenter: ['id'],
  dokument_dokumenttype: ['dokument_id', 'dokument_type_id'],
  dokument_sprak: ['dokument_id', 'sprak'],
  dokument_fag: ['dokument_id', 'fag_id'],
  redaksjonell_ko: ['id'],
}

// Språk-koder 103-CHECK tillater. Andre koder KØES (aldri stille skrevet/droppet). Utvides KUN
// sammen med en migrasjon som utvider dokument_sprak_sprak_check — ellers stopper importen på CHECK.
const TILLATTE_SPRAK = new Set(['nb', 'nn'])

// public://X → 'public/X' (samme skjema-konvensjon som medier bruker for storage_sti).
function filStorage(uri) { return uri ? String(uri).replace(/^public:\/\//, 'public/') : null }
function filExt(filnavn) { const m = String(filnavn || '').match(/\.([a-z0-9]+)$/i); return m ? m[1].toLowerCase() : null }

// Bygg dokument-passet over PUBLISERTE document-noder.
// oppslag: Oppslag-instans (dokument_type-kart + fag-kart). Returnerer plan + resolvering-tellinger.
export function byggDokumentPass(docs, kjoringId, oppslag) {
  // DESIGNEDE VAKTER (OPPGAVE C): navngitt hard stopp, aldri TypeError.
  krevArray(docs, 'docs (document-noder)', 'dokument-passet')
  krevKjoringId(kjoringId, 'dokument-passet')
  krevOppslag(oppslag, 'oppslag', 'dokument-passet', 'dokumentTypeId')
  const plan = { dokumenter: [], dokument_dokumenttype: [], dokument_sprak: [], dokument_fag: [], redaksjonell_ko: [] }
  const res = {
    dokumenttype_lost: 0, dokumenttype_bom: 0,        // → dokument_dokumenttype vs. dokumenttype_uavklart
    sprak_nb_nn: 0, sprak_ukjent: 0,                  // dokument_sprak (skrives) vs. kø (utenfor 103-CHECK)
    fag_lost: 0, fag_bom: 0,                          // dokument_fag: løst vs. fag mangler i tabellen
    flere_filer: 0,
  }
  const fagMangler = new Set()
  const sprakUkjent = {}                              // kode → antall (rapport)

  for (const d of docs) {
    const did = detUuid('document', d.nid)
    const filer = d.field_document_files || []
    if (filer.length > 1) res.flere_filer++
    const fil = filer[0] || null

    plan.dokumenter.push({
      id: did, tittel: d.title || '(uten tittel)', type: filExt(fil?.filename),
      storage_sti: filStorage(fil?.uri), status: 'publisert', ressurs_id: null,
      kilde_nid: String(d.nid), import_kjoring_id: kjoringId,
      // opprettet_av: steg 1 (import-bruker) — ikke bygget; kolonnen er nullbar.
    })

    // dokumenttype: resolver hver referert type-tid → dokument_dokumenttype. Bom = kø (hus-liste).
    for (const t of (d.field_type_document || [])) {
      const id = oppslag.dokumentTypeId(t.tid, t.name)
      if (id != null) { plan.dokument_dokumenttype.push({ dokument_id: did, dokument_type_id: id }); res.dokumenttype_lost++ }
      else { res.dokumenttype_bom++; plan.redaksjonell_ko.push(køRad(kjoringId, { type: 'dokumenttype_uavklart', dokument_id: did, beskrivelse: `Dokumenttype tid ${t.tid} «${t.name}» ikke i dokument_type-kartet.` })) }
    }

    // språk → dokument_sprak. KUN 'nb'/'nn' (103-CHECK); annet KØES loud, aldri stille droppet (F2).
    for (const l of (d.field_lang || [])) {
      const kode = l.value
      if (!kode) continue
      if (TILLATTE_SPRAK.has(kode)) { plan.dokument_sprak.push({ dokument_id: did, sprak: kode }); res.sprak_nb_nn++ }
      else {
        res.sprak_ukjent++; sprakUkjent[kode] = (sprakUkjent[kode] || 0) + 1
        plan.redaksjonell_ko.push(køRad(kjoringId, { type: 'annet', dokument_id: did, beskrivelse: `Språkkode «${kode}» er utenfor 103-CHECK (nb/nn) — dokument_sprak ikke skrevet; krever migrasjon for å utvide CHECK.` }))
      }
    }

    // fag via topic → fag_id (fag er hus-liste; bom = seed mangler → IKKE ny rad).
    for (const tp of (d.field_topic || [])) {
      const navn = tp.name || ''
      if (/^\.?\s*Månedens Aktiv læring/i.test(navn)) continue   // ubrukt topic-term (0 docs), ikke et fag
      const fagId = oppslag.fagId(navn)
      if (fagId != null) { plan.dokument_fag.push({ dokument_id: did, fag_id: fagId }); res.fag_lost++ }
      else { fagMangler.add(navn); res.fag_bom++; plan.redaksjonell_ko.push(køRad(kjoringId, { type: 'annet', dokument_id: did, beskrivelse: `Fag «${navn}» finnes ikke i fag-tabellen — dokument_fag ikke skrevet.` })) }
    }
  }

  const køTyper = {}
  for (const r of plan.redaksjonell_ko) køTyper[r.type] = (køTyper[r.type] || 0) + 1
  return { plan, res, køTyper, fagMangler: [...fagMangler], sprakUkjent }
}

// Skriv planen. FAIL-CLOSED: mangler en koblingstabell i basen, STOPP HARDT (aldri stille hopp).
export async function skrivDokumentPass(klient, plan) {
  krevKlient(klient, 'dokument-passet (skriv)')
  krevPlan(plan, 'dokument-passet (skriv)')
  // Preflight: hver tabell som skal skrives MÅ finnes. Ellers hard stopp med tydelig melding.
  for (const tabell of DOKUMENTPASS_REKKEFOLGE) {
    const rader = plan[tabell]; if (!rader || !rader.length) continue
    const r = await klient.query('select to_regclass($1) as reg', [`public.${tabell}`])
    if (r.rows[0].reg == null) {
      throw new Error(`FAIL-CLOSED (dokument-passet): tabellen «${tabell}» finnes ikke i basen. ` +
        `Passet stopper hardt i stedet for å hoppe stille over ${rader.length} rader. Kjør migrasjonen som lager tabellen først.`)
    }
  }
  for (const tabell of DOKUMENTPASS_REKKEFOLGE) {
    const rader = plan[tabell]; if (!rader || !rader.length) continue
    const kols = Object.keys(rader[0])
    const konflikt = KONFLIKT[tabell] || ['id']
    const oppdater = kols.filter(k => !konflikt.includes(k))
    const setDel = oppdater.length ? ` do update set ${oppdater.map(k => `${k}=excluded.${k}`).join(', ')}` : ' do nothing'
    for (const rad of rader) {
      const verdier = kols.map(k => rad[k])
      const ph = kols.map((_, i) => `$${i + 1}`).join(', ')
      await klient.query(`insert into ${tabell} (${kols.join(', ')}) values (${ph}) on conflict (${konflikt.join(', ')})${setDel}`, verdier)
    }
  }
}
