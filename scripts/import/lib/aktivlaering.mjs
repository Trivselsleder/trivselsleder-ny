// AKTIV LÆRING-PASSET (skrivelaget) — steg A–D fra byggeoppdraget 4. sep.
// Alt besluttet; ingenting velges her. Grunnlag: migr 090/092, claude_KONTROLL-fable-090-2sep.md
// (Udir-importregelen, ordrett), data/fagmapping/*.csv, data/udir/*.
//
//   A) Udir-målene inn:   1410 nye kompetansemaal-rader (uri, LK20, læreplankode, målformer,
//      samme_som/gjenbruk_av) + kompetansemaal_trinn (aarstrinn1–10; vg/påbygning droppes).
//      De gamle merkelappene får ALDRI uri: 200 treff → erstattet_av, 65 utgåtte → utgatt=true
//      + laereplanversjon='LK06', 37 overskrifter forkastes.
//   B) 280 publiserte opplegg inn (289 − 9 avpubliserte). Trinn fra field_school_year.
//   C) Fag via arveregelen (fagmapping.mjs): opplegg → underterm-tid → gruppe-tid → fag.
//   D) Kompetansemål-kobling (092): satt_av='maskin' + tillit; terskel 0,90 → koblingstabell,
//      ellers forslag + kø. LUKKET SETT: bruker det ferdig-klassifiserte kobling-forslag.csv
//      (udir_uri per merkelapp) — ALDRI fri tekstmatching mot alle 1410.
//
// Kalleren styrer én transaksjon (begin/commit eller rollback). Ingen egen kontrollrunde.

import { readFileSync } from 'node:fs'
import { parseCsvObjekter } from './csv.mjs'
import { fagForOpplegg, lastLaereplankodeFag } from './fagmapping.mjs'
import { detUuid } from './uuid.mjs'
import * as R from './regler.mjs'
import { krevKjoringId, krevKlient, krevArray, krevMap, krevObjekt } from './vakt.mjs'

export const TILLIT_TERSKEL = 0.90   // Kjartan 4. sep (SPEC §5.2 P)

// Tekst-normalisering for join merkelapp↔kobling-forslag (samme metode som UDIR-KOBLING-RAPPORT:
// små bokstaver, uten tegnsetting, kollapsede mellomrom). Fanger «- »-prefiks, sluttpunktum,
// bokmål/nynorsk-tegnsetting og de 12 dublettgruppene.
export const normTekst = (s) =>
  (s == null ? '' : String(s)).toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')

// URI-utdrag for Udirs relasjonsfelt (gjenbruk-av er en URI-streng når fylt; samme-som er tom).
function relasjonUri(v) {
  if (!v) return null
  if (Array.isArray(v)) {
    const u = v.map(x => (typeof x === 'string' ? x : (x?.uri || x?.kode || ''))).filter(Boolean)
    return u.length ? u.join('; ') : null
  }
  return String(v)
}

export function lastKoblingForslag(sti = 'data/udir/kobling-forslag.csv') {
  return parseCsvObjekter(readFileSync(sti, 'utf8'))
}

// ── STEG A: Udir-målene inn ──────────────────────────────────────────────────
export async function seedUdirMaal(k, lk20json, koblingForslag) {
  // DESIGNEDE VAKTER (OPPGAVE C): navngitt hard stopp, aldri TypeError.
  krevKlient(k, 'aktiv læring (seedUdirMaal)')
  krevObjekt(lk20json, 'lk20json', 'aktiv læring (seedUdirMaal)', 'kompetansemaal')
  krevArray(koblingForslag, 'koblingForslag', 'aktiv læring (seedUdirMaal)')
  const maal = lk20json.kompetansemaal || []
  const trinnKode = new Map(
    (await k.query("select id, kode from trinn where land='NO'")).rows.map(r => [String(r.kode), r.id]))

  const uriTilId = new Map()
  let innsatt = 0, trinnRader = 0

  for (const m of maal) {
    const tByLang = {}
    for (const t of (m.tekst || [])) tByLang[t.spraak] = t.verdi
    const tekst_nb = tByLang['nob'] ?? null
    const tekst_nn = tByLang['nno'] ?? null
    const tekst_default = tByLang['default'] ?? null
    const tekst = tekst_nb ?? tekst_default ?? tekst_nn ?? ''   // bokmåls-coalesce (090)

    const rad = await k.query(
      `insert into kompetansemaal
         (uri, kode, laereplanversjon, laereplan_kode, utgatt,
          tekst, tekst_nb, tekst_nn, tekst_default, samme_som, gjenbruk_av)
       values ($1,$2,'LK20',$3,false, $4,$5,$6,$7,$8,$9)
       on conflict (uri) where uri is not null
         do update set kode=excluded.kode, laereplan_kode=excluded.laereplan_kode,
                       tekst=excluded.tekst, tekst_nb=excluded.tekst_nb,
                       tekst_nn=excluded.tekst_nn, tekst_default=excluded.tekst_default,
                       samme_som=excluded.samme_som, gjenbruk_av=excluded.gjenbruk_av
       returning id`,
      [m.uri, m.kode, m.laereplan?.kode_full ?? null,
       tekst, tekst_nb, tekst_nn, tekst_default,
       relasjonUri(m['samme-som']), relasjonUri(m['gjenbruk-av'])])
    const id = rad.rows[0].id
    uriTilId.set(m.uri, id)
    innsatt++

    // kompetansemaal_trinn: kun aarstrinn1–10 (vg/påbygning droppes, funn 6).
    for (const a of (m.aarstrinn || [])) {
      const mt = String(a.kode).match(/^aarstrinn(\d+)$/)
      if (!mt) continue
      const tid = trinnKode.get(mt[1])
      if (tid == null) continue
      const r = await k.query(
        'insert into kompetansemaal_trinn (kompetansemaal_id, trinn_id) values ($1,$2) on conflict do nothing',
        [id, tid])
      trinnRader += r.rowCount
    }
  }

  // ── De ~302 gamle merkelappene (uri IS NULL): erstattet_av / utgatt — matchet på tekst ──
  // F1-retting (4. sep): kartet holder en LISTE av id-er per normalisert tekst. De 21
  // bokmål/nynorsk-dublettgruppene (65 rader) har flere gamle rader med samme normaliserte
  // tekst; med «siste vinner» (én id) ble bare ÉN rad per gruppe flagget, og 21 gamle rader
  // (12 A/B + 9 D) sto urørt — uten uri, uten erstattet_av, uten utgatt — og så ut som
  // gjeldende mål. Nå oppdateres ALLE id-ene i lista (id = any($2)).
  const gamle = (await k.query('select id, tekst from kompetansemaal where uri is null')).rows
  const gamleByNorm = new Map()
  for (const g of gamle) {
    const n = normTekst(g.tekst)
    if (!gamleByNorm.has(n)) gamleByNorm.set(n, [])
    gamleByNorm.get(n).push(g.id)
  }

  let gamle_erstattet = 0, gamle_utgatt = 0
  for (const kf of koblingForslag) {
    const gids = gamleByNorm.get(normTekst(kf.vaar_tekst))
    if (!gids || !gids.length) continue
    if ((kf.bunke === 'A' || kf.bunke === 'B') && kf.udir_uri && uriTilId.has(kf.udir_uri)) {
      const r = await k.query(
        'update kompetansemaal set erstattet_av=$1 where id = any($2) and erstattet_av is distinct from $1',
        [uriTilId.get(kf.udir_uri), gids])
      gamle_erstattet += r.rowCount
    } else if (kf.bunke === 'D') {
      const r = await k.query(
        "update kompetansemaal set utgatt=true, laereplanversjon='LK06' where id = any($1) and (utgatt is distinct from true)",
        [gids])
      gamle_utgatt += r.rowCount
    }
  }

  return { uriTilId, telling: { innsatt, trinnRader, gamle_funnet: gamle.length, gamle_erstattet, gamle_utgatt } }
}

// ── STEG B–D: oppleggene, fag og kompetansemål-kobling ───────────────────────
export async function byggOgSkrivAktivLaering(k, noder, vokab, fagmap, koblingForslag, uriTilId, kjoringId) {
  // DESIGNEDE VAKTER (N4 + OPPGAVE C, 5. sep): hver forutsetning navngitt. kjoringId er obligatorisk —
  // uten den ble radene skrevet med import_kjoring_id = NULL (usporbare, bryter stoppregelen).
  krevKlient(k, 'aktiv læring')
  krevArray(noder, 'noder (atlu-noder)', 'aktiv læring')
  krevMap(vokab, 'vokab (learning_objectives)', 'aktiv læring')
  krevObjekt(fagmap, 'fagmap', 'aktiv læring', 'gruppeTilFag', 'undertermTilGruppe', 'fagloese')
  krevArray(koblingForslag, 'koblingForslag', 'aktiv læring')
  krevMap(uriTilId, 'uriTilId', 'aktiv læring')
  krevKjoringId(kjoringId, 'aktiv læring')
  // Oppslag fra basen.
  const fagNavnTilId = new Map(
    (await k.query('select id, navn from fag')).rows.map(r => [r.navn, r.id]))
  const trinnKode = new Map(
    (await k.query("select id, kode from trinn where land='NO'")).rows.map(r => [String(r.kode), r.id]))

  // F2 (fag/trinn-sjekk for maskinkobling): målets fag via læreplankode-prefikset, målets
  // årstrinn via kompetansemaal_trinn. Begge slås opp per udir_uri i steg D.
  const laereplankodeFag = lastLaereplankodeFag()
  const uriTilMaalFag = new Map(
    (await k.query("select uri, laereplan_kode from kompetansemaal where uri is not null")).rows
      .map(r => [r.uri, laereplankodeFag.get(String(r.laereplan_kode || '').split('-')[0]) ?? null]))
  // M3 (Kjartans endelige beslutning 5. sep): trinn-overlapp regnes BAND-BASERT. Udirs «etter X. trinn»
  // er sluttpunktet på en periode som starter der forrige band sluttet; et mål «etter 5. trinn» gjelder
  // hele strekket 3.–5. Overlapp måles mot HELE bandet (ikke mot X alene og ikke mot X−1).
  // Band-endene LESES FRA DATA per læreplan (kode_full), aldri hardkodet: hver distinkt aarstrinn på en
  // læreplans mål er et band-sluttpunkt (Udir tagger mål kun med sluttpunktet). NAT01-05 → {2,5,7,10}
  // gir band 5 = [3,5]; MAT01-06 → {2,3,4,5,6,7,8,9,10} (årlige band) gir band 10 = [10].
  const bandEnds = new Map()   // laereplan_kode (kode_full) → sortert int[] av band-sluttpunkter
  for (const r of (await k.query(
    `select k.laereplan_kode lp, array_agg(distinct t.kode::int order by t.kode::int) ends
       from kompetansemaal k
       join kompetansemaal_trinn kt on kt.kompetansemaal_id = k.id
       join trinn t on t.id = kt.trinn_id
      where k.uri is not null and k.laereplan_kode is not null
      group by k.laereplan_kode`)).rows)
    bandEnds.set(r.lp, r.ends.map(Number))

  const bandForSluttpunkt = (lp, X) => {   // [forrige_slutt+1 .. X] som Set av trinn-strenger
    const ends = bandEnds.get(lp) || []
    let forrige = 0
    for (const e of ends) if (e < X && e > forrige) forrige = e
    const s = new Set()
    for (let g = forrige + 1; g <= X; g++) s.add(String(g))
    return s
  }

  const uriTilMaalTrinn = new Map()   // uri → Set av band-SLUTTPUNKT (for kø-melding/diagnostikk)
  const uriTilMaalSpan = new Map()    // uri → Set av HELE trinn-bandet (brukt i overlapp-sjekken)
  for (const r of (await k.query(
    `select k.uri, k.laereplan_kode lp, t.kode from kompetansemaal k
       join kompetansemaal_trinn kt on kt.kompetansemaal_id = k.id
       join trinn t on t.id = kt.trinn_id
      where k.uri is not null`)).rows) {
    if (!uriTilMaalTrinn.has(r.uri)) { uriTilMaalTrinn.set(r.uri, new Set()); uriTilMaalSpan.set(r.uri, new Set()) }
    uriTilMaalTrinn.get(r.uri).add(String(r.kode))
    for (const g of bandForSluttpunkt(r.lp, Number(r.kode))) uriTilMaalSpan.get(r.uri).add(g)
  }

  // Kobling-forslag indeksert på normalisert merkelapp-tekst.
  const koblingByNorm = new Map()
  let dublettKollisjon = 0
  for (const kf of koblingForslag) {
    const n = normTekst(kf.vaar_tekst)
    if (koblingByNorm.has(n)) dublettKollisjon++
    koblingByNorm.set(n, kf)
  }

  const publiserte = noder.filter(n => n.status === 1 || n.status === '1')

  // Tellinger (innebygd kontroll).
  const t = {
    opplegg: 0, ressurs_innhold: 0, ressurs_trinn: 0, ressurs_fag: 0,
    km_maskin: 0, km_forslag: 0, km_fagtrinn_avvist: 0,
    fagPerOpplegg: {},                       // fag → antall distinkte opplegg
    utenFag: 0, utenKompetansemaal: 0,
    ukjenteTermer: 0, normBom: 0,
    fagloese_verifisert: 0, fagloese_uventet_fag: 0, uventet_uten_fag: 0,
    ko: {},
  }
  const køTell = (type) => { t.ko[type] = (t.ko[type] || 0) + 1 }

  const køRad = async ({ type, ressurs_id, kompetansemaal_id = null, beskrivelse, forslag = null }) => {
    const nøkkel = `${kjoringId}-${type}-${ressurs_id || ''}-${kompetansemaal_id || ''}-${(beskrivelse || '').slice(0, 40)}`
    await k.query(
      `insert into redaksjonell_ko (id, type, ressurs_id, kompetansemaal_id, import_kjoring_id, beskrivelse, forslag, status)
       values ($1,$2,$3,$4,$5,$6,$7,'ny') on conflict (id) do nothing`,
      [detUuid('ko', nøkkel), type, ressurs_id, kompetansemaal_id, kjoringId, beskrivelse || null, forslag])
    køTell(type)
  }

  for (const node of publiserte) {
    const nid = node.nid
    const rid = detUuid('atlu', nid)

    // ── STEG B: ressurser + ressurs_innhold ──
    await k.query(
      `insert into ressurser (id, kilde_nid, import_kjoring_id, ressurstype, status)
       values ($1,$2,$3,'aktiv_laering','publisert')
       on conflict (id) do update set kilde_nid=excluded.kilde_nid, import_kjoring_id=excluded.import_kjoring_id`,
      [rid, String(nid), kjoringId])
    t.opplegg++

    const beskrivelse = R.rensBeskrivelse(node.field_description?.[0]?.safe_value || '')
    const språk = (node.field_lang || []).map(l => l.value)
    const primær = språk[0] || 'nb'
    await k.query(
      `insert into ressurs_innhold (ressurs_id, sprak, tittel, beskrivelse, ferskhet)
       values ($1,$2,$3,$4,'gjeldende')
       on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, beskrivelse=excluded.beskrivelse`,
      [rid, primær, node.title || null, beskrivelse || null])
    t.ressurs_innhold++
    if (språk.includes('nn') && primær !== 'nn') {
      await k.query(
        `insert into ressurs_innhold (ressurs_id, sprak, tittel, beskrivelse, ferskhet)
         values ($1,'nn',null,null,'mangler') on conflict (ressurs_id, sprak) do nothing`, [rid])
      t.ressurs_innhold++
    }

    // ── STEG B: trinn fra school_year (hus-liste → hard stopp ved ukjent kode) ──
    const oppleggTrinn = new Set()                 // F2: oppleggets trinn-koder, brukt i steg D
    for (const kode of R.regelTrinnFraSchoolYear(node.field_school_year)) {
      oppleggTrinn.add(String(kode))
      const tid = trinnKode.get(String(kode))
      if (tid == null) throw new Error(`HARD STOPP: skoletrinn «${kode}» (fra field_school_year, opplegg nid ${nid}) finnes ikke i trinn-tabellen — grunnmursfeil.`)
      const r = await k.query(
        'insert into ressurs_trinn (ressurs_id, trinn_id) values ($1,$2) on conflict do nothing', [rid, tid])
      t.ressurs_trinn += r.rowCount
    }

    // ── STEG C: fag via arveregelen ──
    const termTids = (node.field_atlu_topic || []).map(x => x.tid).filter(x => x != null)
    const { fag, ukjenteTermer } = fagForOpplegg(termTids, fagmap)
    t.ukjenteTermer += ukjenteTermer.length
    const erFagloes = fagmap.fagloese.has(String(nid))
    // Kryssjekk mot fil e (fagløse): rapporter avvik, ikke juster.
    if (erFagloes && fag.length) t.fagloese_uventet_fag++
    if (!erFagloes && fag.length === 0) t.uventet_uten_fag++
    if (erFagloes && fag.length === 0) t.fagloese_verifisert++
    if (fag.length === 0) t.utenFag++
    for (const navn of fag) {
      const fagId = fagNavnTilId.get(navn)
      if (fagId == null) throw new Error(`HARD STOPP: fagnavn «${navn}» (arveregel, opplegg nid ${nid}) finnes ikke i fag-tabellen.`)
      const r = await k.query(
        'insert into ressurs_fag (ressurs_id, fag_id) values ($1,$2) on conflict do nothing', [rid, fagId])
      t.ressurs_fag += r.rowCount
      if (r.rowCount) t.fagPerOpplegg[navn] = (t.fagPerOpplegg[navn] || 0) + 1
    }

    // ── STEG D: kompetansemål-kobling (092-modellen, lukket sett via kobling-forslag) ──
    const objTids = [...new Set((node.field_atlu_objective || []).map(o => String(o.target_id)))]
    if (objTids.length === 0) { await køRad({ type: 'manglende_maal', ressurs_id: rid, beskrivelse: 'Opplegget har ingen kompetansemål (field_atlu_objective tomt).' }); t.utenKompetansemaal++; continue }

    for (const otid of objTids) {
      const navn = vokab.get(String(otid))
      if (!navn) { await køRad({ type: 'annet', ressurs_id: rid, beskrivelse: `Objective-tid ${otid} finnes ikke i learning_objectives-vokabularet.` }); continue }
      const kf = koblingByNorm.get(normTekst(navn))
      if (!kf) { t.normBom++; await køRad({ type: 'annet', ressurs_id: rid, beskrivelse: `Merkelapp «${navn}» ikke funnet i kobling-forslag (normaliserings-bom).` }); continue }

      if (kf.bunke === 'C') { await køRad({ type: 'ikke_et_maal', ressurs_id: rid, beskrivelse: `«${navn}» er en overskrift (${kf.c_grunn || 'trinn-overskrift'}), ikke et mål.` }); continue }
      if (kf.bunke === 'D') { await køRad({ type: 'utgatt_fjernet', ressurs_id: rid, beskrivelse: `Utgått mål (ingen LK20-treff): «${navn}» — ikke koblet.` }); continue }

      // Bunke A/B → koble mot den nye Udir-raden via uri.
      const kmId = kf.udir_uri ? uriTilId.get(kf.udir_uri) : null
      if (kmId == null) { await køRad({ type: 'annet', ressurs_id: rid, beskrivelse: `Bunke ${kf.bunke}: udir_uri «${kf.udir_uri || '—'}» ikke funnet blant de innsatte Udir-målene.` }); continue }
      const tillit = kf.likhetsskaar !== '' && kf.likhetsskaar != null ? parseFloat(kf.likhetsskaar) : 1.0

      // F2-retting (4. sep, Kjartans valg ii): en kobling blir maskinkobling KUN hvis målets
      // læreplan-fag er blant oppleggets fag (arveregelen) OG målets årstrinn overlapper
      // oppleggets trinn. kobling-forslag.csv ble laget 2. sep med FRI nær-match mot alle 1410
      // uten fag/trinn-grense; uten denne sjekken ble 7 B-rader (skår 0,905–0,992) maskinkoblet
      // på tvers av fag/trinn. Alt som ikke består går til forslag med flagg — ALDRI maskin.
      const maalFag = uriTilMaalFag.get(kf.udir_uri)
      const fagOk = maalFag != null && fag.includes(maalFag)
      const maalTrinn = uriTilMaalTrinn.get(kf.udir_uri) || new Set()   // band-sluttpunkt (diagnostikk)
      const maalSpan = uriTilMaalSpan.get(kf.udir_uri) || new Set()      // HELE bandet (overlapp-sjekk)
      // M3 (Kjartans endelige beslutning 5. sep): BAND-BASERT overlapp. Målet «etter X. trinn» dekker
      // hele bandet [forrige_band+1 .. X]. Et opplegg overlapper hvis noe av oppleggets trinnspenn
      // ligger inne i det bandet. Dermed kobler et 3.-4.-opplegg til et NAT-mål «etter 5.» (band 3–5),
      // mens et opplegg utenfor bandet ikke gjør det. FAGREGELEN (fagOk over) er URØRT.
      const trinnOk = [...oppleggTrinn].some(g => maalSpan.has(g))
      const naaddeTerskel = tillit >= TILLIT_TERSKEL

      if (naaddeTerskel && fagOk && trinnOk) {
        // UBEKREFTET maskinkobling (bekreftet_av/at NULL). Triggeren tillater ny Udir-rad.
        await k.query(
          `insert into ressurs_kompetansemaal (ressurs_id, kompetansemaal_id, satt_av, tillit, import_kjoring_id)
           values ($1,$2,'maskin',$3,$4)
           on conflict (ressurs_id, kompetansemaal_id) do update set tillit=excluded.tillit, satt_av='maskin', import_kjoring_id=excluded.import_kjoring_id`,
          [rid, kmId, tillit, kjoringId])
        t.km_maskin++
      } else {
        await k.query(
          `insert into ressurs_kompetansemaal_forslag (ressurs_id, kompetansemaal_id, skaar, import_kjoring_id, status)
           values ($1,$2,$3,$4,'ny')
           on conflict (ressurs_id, kompetansemaal_id) do update set skaar=excluded.skaar, import_kjoring_id=excluded.import_kjoring_id`,
          [rid, kmId, tillit, kjoringId])
        t.km_forslag++
        let grunn
        if (!naaddeTerskel) {
          grunn = `Tillit ${tillit} < ${TILLIT_TERSKEL}`
        } else {
          const mangler = []
          if (!fagOk) mangler.push(`fag (mål «${maalFag || '—'}» ∉ opplegg [${fag.join(', ') || 'ingen'}])`)
          if (!trinnOk) mangler.push(`trinn (mål-band [${[...maalSpan].map(Number).sort((a, b) => a - b).join(',') || '—'}] fra sluttpunkt [${[...maalTrinn].join(',') || '—'}] ∩ opplegg [${[...oppleggTrinn].join(',') || '—'}] = ∅)`)
          grunn = `Tillit ${tillit} ≥ ${TILLIT_TERSKEL} men mangler ${mangler.join(' og ')}`
          t.km_fagtrinn_avvist++
        }
        await køRad({ type: 'usikker_maalkobling', ressurs_id: rid, kompetansemaal_id: kmId, beskrivelse: `${grunn} — lagt i forslag, ikke koblingstabellen.` })
      }
    }
  }

  t.dublettKollisjon = dublettKollisjon
  return t
}
