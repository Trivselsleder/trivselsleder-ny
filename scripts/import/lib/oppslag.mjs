// OPPSLAGSLAGET (skrivelagets steg 3) — navn/tid → id for HVER taksonomi.
// Spesifikasjon: claude_SKRIVELAG-SPESIFIKASJON-3sep.md §1.0–1.5.
//
// PRINSIPP (§1.0): to slags lister.
//   - IMPORTEN FYLLER (kategorier, utstyr): opprett-eller-gjenbruk. Bom er umulig.
//   - HUS-LISTER (trinn, egnet_kategori, sesong, fag, kompetansemaal, dokument_type):
//     bare KOBLE. Et bom er et signal → HARD STOPP eller KØ, aldri gjett/opprett.
//
// MEKANIKK (§1.1): alle kart bygges FØRST, i minnet, i SAMME transaksjon som skrivingen.
// Deretter slår koblingsradene (steg 6) opp og produserer *_id — aldri *_navn (lukker G1).
//
// BESKYTTEDE NAVN (§1.5): oppslag/dedup skjer på lower(navn), men det som LAGRES er husets
// eksakte skrivemåte. Move It-normaliseringen (regler.mjs) er allerede rettet til «Move It».
//
// Bruk (i skrivelaget, inne i begin/commit):
//   const o = new Oppslag(klient)
//   await o.lesFaste()
//   await o.opprettEllerGjenbruk(kategoriTermer, utstyrTermer)   // [{tid,name,parents}], [{tid,name}]
//   const kid = o.kategoriId(navn)   // → id
//   const uid = o.utstyrId(navn)     // → id
//   const tid = o.trinnId('3')       // → id, HARD STOPP ved bom
//   ... o.telling / o.bom for kontrolltall.

import * as R from './regler.mjs'

// «Uten utstyr» (Drupal-tid 428) skal ALDRI opprettes/kobles (U1, slettet i 094B).
const UTEN_UTSTYR_TID = 428

// Egen feilklasse så kalleren kan skille en grunnmursfeil (hard stopp) fra vanlige feil.
export class HardStopp extends Error {
  constructor(liste, verdi) {
    super(`HARD STOPP (oppslag): «${verdi}» finnes ikke i hus-lista «${liste}». ` +
      `Dette er en grunnmursfeil (seed ikke kjørt) — ikke et datahull. Importen stoppes.`)
    this.name = 'HardStopp'; this.liste = liste; this.verdi = verdi
  }
}

// O1: navneoppslag på et navn som finnes på FLERE rader. Dagens fallback (Map.set)
// tar «siste vinner» og returnerer én tilfeldig rad. Et tvetydig navn skal i stedet
// NEKTE med hard stopp — feilmeldingen sier navnet og hvor mange rader det traff.
export class TvetydigNavn extends Error {
  constructor(liste, verdi, antall) {
    super(`HARD STOPP (oppslag): navnet «${verdi}» finnes på ${antall} rader i hus-lista «${liste}». ` +
      `Navneoppslag kan ikke velge én av flere entydig — importen stoppes (ingen «siste vinner»-gjetting).`)
    this.name = 'TvetydigNavn'; this.liste = liste; this.verdi = verdi; this.antall = antall
  }
}

// O3: en kilde_tid er allerede stemplet på en rad med et ANNET navn enn termen forventer.
// Fordi oppslag ellers skjer på navn, ville dette forgiftet basen stille. Hard stopp.
export class TidNavnKonflikt extends Error {
  constructor(liste, tid, forventet, funnet) {
    super(`HARD STOPP (oppslag): kilde_tid ${tid} i «${liste}» er stemplet på en rad med navn ` +
      `«${funnet}», men termen forventer «${forventet}». Ulikt navn på samme tid — importen stoppes ` +
      `for ikke å forgifte basen.`)
    this.name = 'TidNavnKonflikt'; this.liste = liste; this.tid = tid
    this.forventet = forventet; this.funnet = funnet
  }
}

const lav = (s) => String(s == null ? '' : s).toLowerCase()

export class Oppslag {
  constructor(klient) {
    this.k = klient
    // Kart (alle bygges av lesFaste / opprettEllerGjenbruk):
    this.kategoriTid = new Map()   // kilde_tid  → id
    this.kategoriTidNavn = new Map() // kilde_tid → navn (O3: hva tiden er stemplet på)
    this.kategoriNavn = new Map()  // lower(navn) → id
    this.utstyrTid = new Map()     // kilde_tid  → id
    this.utstyrTidNavn = new Map() // kilde_tid → navn (O3)
    this.utstyrNavn = new Map()    // lower(navn) → id
    this.trinn = new Map()         // 'NO|kode'  → id   (kun land='NO', §1.1)
    this.egnet = new Map()         // lower(navn) → id
    this.sesong = new Map()        // lower(navn) → id   (ubrukt fase 1, bygges for komplethet)
    this.fag = new Map()           // lower(navn) → id   (ubrukt fase 1)
    this.kompUri = new Map()       // uri        → id
    this.kompStatus = new Map()    // id → { utgatt, erstattet_av }  (steg 6 vet hva triggeren avviser)
    this.dokTypeTid = new Map()    // kilde_tid  → id
    this.dokTypeNavn = new Map()   // lower(navn) → id

    // Kontrolltall (§4): hvor mange nye termer laget denne kjøringen, og hvordan gjenbruk skjedde.
    this.telling = {
      kategorier: { gjenbruk_tid: 0, gjenbruk_navn_stemplet: 0, ny_opprettet: 0 },
      utstyr: { gjenbruk_tid: 0, gjenbruk_navn_stemplet: 0, ny_opprettet: 0 },
    }
    // Bom i hus-lister som KØES (ikke hard stopp): fanges her så kalleren kan lage kø-rader.
    this.bom = { egnet_ko: [], dokument_type: [], kompetansemaal: [] }

    // O1: navn som finnes på FLERE rader per liste → lower(navn) → antall rader (≥2).
    // Bygges i lesFaste. Et oppslag på et slikt navn kaster TvetydigNavn.
    this.dupNavn = {
      kategorier: new Map(), utstyr: new Map(), egnet: new Map(),
      sesong: new Map(), fag: new Map(), dokument_type: new Map(),
    }

    // O2: termer hoppet over uten å bli opprettet/koblet — nå TELT og rapportert.
    this.hoppet = { kategori_tomt_navn: 0, utstyr_tomt_navn: 0, utstyr_uten_utstyr_428: 0 }
  }

  // O1: sett navn→id, og TELL kollisjoner (samme lower(navn) på flere rader).
  _settNavn(kart, dupKart, navn, id) {
    const n = lav(navn)
    if (kart.has(n)) dupKart.set(n, (dupKart.get(n) || 1) + 1)
    kart.set(n, id)
  }
  // O1: kast hard stopp hvis navnet er tvetydig (finnes på flere rader).
  _sjekkTvetydig(liste, dupKart, navn, nøkkel) {
    if (dupKart.has(nøkkel)) throw new TvetydigNavn(liste, navn, dupKart.get(nøkkel))
  }

  // ── STEG 1 (§1.1): les ALLE eksisterende rader i hver oppslagstabell inn i minnet ──
  async lesFaste() {
    const q = (sql) => this.k.query(sql).then(r => r.rows)

    for (const r of await q('select id, navn, kilde_tid from kategorier')) {
      if (r.kilde_tid != null) { this.kategoriTid.set(String(r.kilde_tid), r.id); this.kategoriTidNavn.set(String(r.kilde_tid), r.navn) }
      this._settNavn(this.kategoriNavn, this.dupNavn.kategorier, r.navn, r.id)
    }
    for (const r of await q('select id, navn, kilde_tid from utstyr')) {
      if (r.kilde_tid != null) { this.utstyrTid.set(String(r.kilde_tid), r.id); this.utstyrTidNavn.set(String(r.kilde_tid), r.navn) }
      this._settNavn(this.utstyrNavn, this.dupNavn.utstyr, r.navn, r.id)
    }
    for (const r of await q("select id, kode from trinn where land='NO'"))
      this.trinn.set('NO|' + r.kode, r.id)
    for (const r of await q('select id, navn from egnet_kategori'))
      this._settNavn(this.egnet, this.dupNavn.egnet, r.navn, r.id)
    for (const r of await q('select id, navn from sesong'))
      this._settNavn(this.sesong, this.dupNavn.sesong, r.navn, r.id)
    for (const r of await q('select id, navn from fag'))
      this._settNavn(this.fag, this.dupNavn.fag, r.navn, r.id)
    for (const r of await q('select id, uri, utgatt, erstattet_av from kompetansemaal')) {
      if (r.uri) this.kompUri.set(r.uri, r.id)
      this.kompStatus.set(r.id, { utgatt: r.utgatt === true, erstattet_av: r.erstattet_av })
    }
    for (const r of await q('select id, navn, kilde_tid from dokument_type')) {
      if (r.kilde_tid != null) this.dokTypeTid.set(String(r.kilde_tid), r.id)
      this._settNavn(this.dokTypeNavn, this.dupNavn.dokument_type, r.navn, r.id)
    }
  }

  // ── STEG 2 (§1.2): opprett-eller-gjenbruk for de to listene importen FYLLER ──
  // kategoriTermer: [{ tid, name, parents:[tid,...] }]   utstyrTermer: [{ tid, name }]
  async opprettEllerGjenbruk(kategoriTermer, utstyrTermer) {
    // Kategorier: forelder før barn (§1.2 hierarki). Sorter topologisk på parents.
    for (const t of sorterForeldreFørst(kategoriTermer || []))
      await this._kategori(t)
    // Utstyr: ingen hierarki. Dropp «Uten utstyr» (428) — U1. O2: tell droppet.
    for (const t of (utstyrTermer || [])) {
      if (String(t.tid) === String(UTEN_UTSTYR_TID)) { this.hoppet.utstyr_uten_utstyr_428++; continue }
      await this._utstyr(t)
    }
  }

  async _kategori(term) {
    const tid = String(term.tid)
    const navn = R.normaliserKategori(term.name || '')   // §1.5: «Move It» (stor I), sammenslåing
    if (!navn) { this.hoppet.kategori_tomt_navn++; return }   // O2: tom-navn-term telles
    // 1) treff på kilde_tid — O3: navnet på den stemplede raden MÅ stemme med termen.
    if (this.kategoriTid.has(tid)) {
      const eks = this.kategoriTidNavn.get(tid)
      if (eks != null && lav(eks) !== lav(navn)) throw new TidNavnKonflikt('kategorier', tid, navn, eks)
      this.telling.kategorier.gjenbruk_tid++; return
    }
    // 2) bom på tid → fallback lower(navn); treff = entydig (unique(navn), 032). Stemple tid.
    const eks = this.kategoriNavn.get(lav(navn))
    if (eks != null) {
      // Stemple KUN hvis raden ikke alt har en kilde_tid (sammenslåing: bare ÉN tid, §1.2).
      const oppdatert = await this.k.query(
        'update kategorier set kilde_tid=$1 where id=$2 and kilde_tid is null', [tid, eks])
      if (oppdatert.rowCount > 0) this.kategoriTid.set(tid, eks)
      this.telling.kategorier.gjenbruk_navn_stemplet++
      return
    }
    // 3) bom på begge → opprett ny rad; forelder_id fra forelderens tilbakeleste id.
    const forelderId = velgForelderId(term, this.kategoriTid)
    const ny = await this.k.query(
      'insert into kategorier (navn, forelder_id, kilde_tid) values ($1,$2,$3) returning id',
      [navn, forelderId, tid])
    const id = ny.rows[0].id
    this.kategoriTid.set(tid, id)
    this.kategoriNavn.set(lav(navn), id)
    this.telling.kategorier.ny_opprettet++
  }

  async _utstyr(term) {
    const tid = String(term.tid)
    const navn = (term.name || '').trim()
    if (!navn) { this.hoppet.utstyr_tomt_navn++; return }   // O2: tom-navn-term telles
    if (this.utstyrTid.has(tid)) {
      const eks = this.utstyrTidNavn.get(tid)   // O3: samme navn på samme tid?
      if (eks != null && lav(eks) !== lav(navn)) throw new TidNavnKonflikt('utstyr', tid, navn, eks)
      this.telling.utstyr.gjenbruk_tid++; return
    }
    const eks = this.utstyrNavn.get(lav(navn))
    if (eks != null) {
      const oppdatert = await this.k.query(
        'update utstyr set kilde_tid=$1 where id=$2 and kilde_tid is null', [tid, eks])
      if (oppdatert.rowCount > 0) this.utstyrTid.set(tid, eks)
      this.telling.utstyr.gjenbruk_navn_stemplet++
      return
    }
    const ny = await this.k.query(
      'insert into utstyr (navn, kilde_tid) values ($1,$2) returning id', [navn, tid])
    const id = ny.rows[0].id
    this.utstyrTid.set(tid, id)
    this.utstyrNavn.set(lav(navn), id)
    this.telling.utstyr.ny_opprettet++
  }

  // ── STEG 6-resolverne: navn/tid → id, med bom-oppførsel per §1.3 ──

  // kategorier/utstyr: opprettet over → skal ALLTID treffe. Null = intern feil.
  kategoriId(navn) {
    const n = lav(R.normaliserKategori(navn))
    this._sjekkTvetydig('kategorier', this.dupNavn.kategorier, navn, n)   // O1
    const id = this.kategoriNavn.get(n)
    if (id == null) throw new Error(`Intern feil: kategori «${navn}» ikke i kartet etter opprett-eller-gjenbruk.`)
    return id
  }
  utstyrId(navn) {
    const n = lav(navn)
    this._sjekkTvetydig('utstyr', this.dupNavn.utstyr, navn, n)   // O1
    const id = this.utstyrNavn.get(n)
    if (id == null) throw new Error(`Intern feil: utstyr «${navn}» ikke i kartet etter opprett-eller-gjenbruk.`)
    return id
  }

  // trinn: HARD STOPP ved bom (§1.3 — grunnmursfeil, ikke datahull).
  trinnId(kode) {
    const id = this.trinn.get('NO|' + kode)
    if (id == null) throw new HardStopp('trinn', kode)
    return id
  }

  // egnet_kategori: SFO/AKS o.l. sådde verdier → HARD STOPP; boks-merking → KØ (§1.3).
  //   hard=true (standard, S→SFO/AKS): bom = seed ikke kjørt = grunnmursfeil.
  //   hard=false (boks-merking fra samlinger): bom = tom boks → kø, aldri opprett.
  egnetId(navn, { hard = true } = {}) {
    const n = lav(navn)
    this._sjekkTvetydig('egnet_kategori', this.dupNavn.egnet, navn, n)   // O1
    const id = this.egnet.get(n)
    if (id != null) return id
    if (hard) throw new HardStopp('egnet_kategori', navn)
    this.bom.egnet_ko.push(navn)
    return null
  }

  // sesong/fag: ubrukt i fase 1. sesong = hus-sett (hard ved bom om den brukes senere).
  sesongId(navn) {
    const n = lav(navn)
    this._sjekkTvetydig('sesong', this.dupNavn.sesong, navn, n)   // O1
    const id = this.sesong.get(n)
    if (id == null) throw new HardStopp('sesong', navn)
    return id
  }
  fagId(navn) {
    const n = lav(navn)
    this._sjekkTvetydig('fag', this.dupNavn.fag, navn, n)   // O1
    return this.fag.get(n) ?? null   // 097-mapping styrer atlu-fag, ikke dette
  }

  // kompetansemaal (atlu): koble på uri. Bom → kø (håndteres i steg 6 med 092-tilstander).
  //   Returnerer { id, utgatt, erstattet_av } eller null. NB: tabellen har INGEN kilde_tid-
  //   kolonne (målt i base) — fallbacken «kilde_tid» i §1.3 finnes ikke; kun uri brukes.
  kompetansemaalViaUri(uri) {
    if (!uri) { this.bom.kompetansemaal.push(uri); return null }
    const id = this.kompUri.get(uri)
    if (id == null) { this.bom.kompetansemaal.push(uri); return null }
    return { id, ...(this.kompStatus.get(id) || { utgatt: false, erstattet_av: null }) }
  }

  // dokument_type (steg 9): tid → fallback lower(navn). Bom → KØ «dokumenttype_uavklart».
  dokumentTypeId(tid, navn) {
    if (tid != null && this.dokTypeTid.has(String(tid))) return this.dokTypeTid.get(String(tid))
    const n = lav(navn)
    this._sjekkTvetydig('dokument_type', this.dupNavn.dokument_type, navn, n)   // O1
    const id = this.dokTypeNavn.get(n)
    if (id != null) return id
    this.bom.dokument_type.push({ tid, navn })
    return null
  }
}

// ── Hjelpere for kategorihierarki (§1.2) ─────────────────────────────────────
// Sorter så en term med forelder kommer ETTER forelderen (forelder opprettes først).
function sorterForeldreFørst(termer) {
  const perTid = new Map(termer.map(t => [String(t.tid), t]))
  const sett = new Set(), ut = []
  const besøk = (t) => {
    if (!t || sett.has(String(t.tid))) return
    sett.add(String(t.tid))
    for (const p of (t.parents || [])) if (perTid.has(String(p))) besøk(perTid.get(String(p)))
    ut.push(t)
  }
  for (const t of termer) besøk(t)
  return ut
}
// Velg forelderens DB-id fra første kjente parent-tid (om noen).
function velgForelderId(term, kategoriTidKart) {
  for (const p of (term.parents || [])) {
    const id = kategoriTidKart.get(String(p))
    if (id != null) return id
  }
  return null
}
