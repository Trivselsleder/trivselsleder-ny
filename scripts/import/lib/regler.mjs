// ALLE IMPORTREGLENE på ett sted, hver med et navn som matcher dokumentasjonen:
//   - R1–R8 + U1: data/analyse/IMPORTREGLER-UTSTYR-ANTALL.md
//   - Sted / skoletype / Move it / «Uten utstyr»: claude_ETAPPE5-SPESIFIKASJON-v2 (pkt 11–13)
//   - Medier (safe_value file-div, original vs derivat): data/analyse/MEDIEKOBLING-DIAGNOSE.md
//   - Tall (H3/H4/H5/H7): claude_TELLINGER-FOR-090-2sep.md
// Ingen regel gjetter: der en verdi ikke lar seg avgjøre, returneres et avvik (→ redaksjonell_ko).

// ── HTML-normalisering (delt av antall/utstyr/sted-parsing) ──────────────────
export function normHtml(html) {
  let h = (html || '').replace(/&nbsp;/gi, ' ').replace(/ /g, ' ')
  h = h.replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*[^>]*>/gi, '\n').replace(/<\s*(p|div|li|h[1-6])\s*[^>]*>/gi, '\n')
  h = h.replace(/<\/?(strong|b|em|i|span|u)\s*[^>]*>/gi, '').replace(/<[^>]+>/g, ' ')
  h = h.replace(/&amp;/gi, '&').replace(/&oslash;/gi, 'ø').replace(/&aring;/gi, 'å').replace(/&aelig;/gi, 'æ')
  return h
}
const STOPP = 'Utstyr|Sted|Gjennomføring|Beskrivelse|Forarbeid|Regler|Variasjon|Tips|Mål|Formål|Antall|Læringsmål'
export function etikettVerdi(nh, etikett) {
  const re = new RegExp(etikett + '\\s*:\\s*([^\\n]*?)(?:\\s*(?:' + STOPP + ')\\s*:|\\n|$)', 'i')
  const m = nh.match(re)
  return m ? (m[1].replace(/\s+/g, ' ').trim() || null) : null
}

// ── R1–R8: ANTALL ────────────────────────────────────────────────────────────
// Returnerer { regel, min, max, raatekst, avvik? }. R5 GJETTER ALDRI — den flagger.
export function regelAntall(raw) {
  if (raw == null) return { regel: 'mangler', min: null, max: null, raatekst: null }
  const dash = '[-–—]'
  const orig = raw.trim()
  // R8: «N per lag/gruppe/sett/spill/bane» = per-enhet, IKKE total → fang råtekst, ingen min/maks.
  if (/\b(per|pr\.?)\b|\bhvert lag\b|\d+\s*lag\s*[aà]\s*\d/i.test(orig) && /lag|gruppe|sett|spill|bane|ball|rockering|dommer/i.test(orig))
    return { regel: 'R8', min: null, max: null, raatekst: orig }
  let v = orig.replace(/\([^)]*\)/g, ' ').replace(/,.*$/, '').replace(/[.!]+$/, '')
  v = v.replace(/\b(ca|anbefalt|omtrent)\b\.?/gi, ' ').replace(/\b(deltagere|deltakere|deltager|stk|elever|spillere|personer|barn|stykker)\b/gi, ' ')
       .replace(/\s+/g, ' ').replace(/^[\s.\-–—]+/, '').trim()
  let m = v.match(new RegExp('^(\\d+)\\s*(?:' + dash + '|til)\\s*(?:ca\\.?\\s*)?(\\d+)$', 'i'))
  if (m) return { regel: 'R1', min: +m[1], max: +m[2], raatekst: orig }               // N-M
  m = v.match(/^(\d+)\s*eller\s*(flere|mer|mange)$/i)
  if (m) return { regel: 'R2', min: +m[1], max: null, raatekst: orig }                 // N eller flere
  m = v.match(new RegExp('^(\\d+)\\s*(?:\\+|' + dash + ')$'))
  if (m) return { regel: 'R3', min: +m[1], max: null, raatekst: orig }                 // N+ / N-
  m = v.match(/^(?:minst|minimum|fra|over|mer enn)\s*(\d+)$/i)
  if (m) return { regel: 'R4', min: +m[1], max: null, raatekst: orig }                 // minst N
  if (/^mange$/i.test(v)) return { regel: 'R6', min: null, max: null, raatekst: orig } // Mange
  m = v.match(/^(\d+)\s*til\s*mange$/i); if (m) return { regel: 'R6', min: +m[1], max: null, raatekst: orig }
  if (/mange/i.test(v)) { const mm = v.match(/(\d+)/); return { regel: 'R6', min: mm ? +mm[1] : null, max: null, raatekst: orig } }
  m = v.match(/^(\d+)$/); if (m) return { regel: 'R7', min: +m[1], max: +m[1], raatekst: orig } // enkelttall
  m = v.match(/^(\d+)\s*eller\s*(\d+)$/i)
  if (m) return { regel: 'R5', min: Math.min(+m[1], +m[2]), max: Math.max(+m[1], +m[2]), raatekst: orig,
                  avvik: { type: 'annet', forklaring: `R5 USIKKER: «${orig}» kan bety intervall ELLER enten/eller — importert som intervall, må bekreftes.` } }
  return { regel: 'utolkbar', min: null, max: null, raatekst: orig,
           avvik: { type: 'annet', forklaring: `Antall utolkbart: «${orig}» — må settes manuelt.` } }
}

// ── U1: UTSTYR — «Uten utstyr» (tid 428) DROPPES, fravær er svaret ───────────
export const UTEN_UTSTYR_TID = 428
export function regelUtstyr(equipmentRefs, eqNameByTid) {
  const tids = (equipmentRefs || []).map(e => String(e.target_id))
  const kun428 = tids.length > 0 && tids.every(t => t === String(UTEN_UTSTYR_TID))
  const beholdte = tids.filter(t => t !== String(UTEN_UTSTYR_TID))
  const feltHadde428 = tids.includes(String(UTEN_UTSTYR_TID))
  return {
    utstyrsnavn: beholdte.map(t => eqNameByTid[t] || `?tid${t}`),   // → ressurs_utstyr (via navn→utstyr.id)
    droppet428: feltHadde428,
    kun428,                                                          // ren «uten utstyr»
  }
}

// ── STED (H4): kun de 146 mappbare av 199; resten tomt, INGEN kø-rad ─────────
export function regelSted(nh) {
  const raw = etikettVerdi(nh, 'Sted')
  if (!raw) return { sted: null, raatekst: null }                   // 683 uten etikett → tomt, ingen kø
  const s = raw.toLowerCase()
  const harInne = /\binne\b|innendørs|gymsal|gymnastikksal|klasserom/.test(s)
  const harUte = /\bute\b|utendørs|skolegård|skoleplass|uteområde/.test(s)
  if ((harInne && harUte) || /begge/.test(s)) return { sted: 'begge', raatekst: raw }
  if (harUte) return { sted: 'ute', raatekst: raw }
  if (harInne) return { sted: 'inne', raatekst: raw }
  return { sted: null, raatekst: raw }                              // underlag/terreng (49) + tomme (4) → tomt, INGEN kø (mengderegel)
}

// ── SKOLETYPE → TRINN + EGNET (alle fem importeres, Kjartans beslutning) ─────
//   BH→trinn 'bhg' · B→1–7 · U→8–10 · K→1–10 · S→egnet «SFO/AKS» (IKKE trinn)
export function regelTrinn(schoolTypeRefs) {
  const koder = (schoolTypeRefs || []).map(v => (v.value || '').toUpperCase())
  const trinn = new Set()
  const egnet = new Set()
  // A1 (låst, SPES steg 6/5A): K er BETINGET. K→8–10 KUN når verken B eller U er satt;
  // er B eller U satt, gir de allerede sine trinn og K legger ingenting til. Den gamle
  // ubetingede K→1–10 var feil.
  const harB = koder.includes('B'), harU = koder.includes('U')
  for (const k of koder) {
    if (k === 'BH') trinn.add('bhg')
    else if (k === 'B') for (let i = 1; i <= 7; i++) trinn.add(String(i))
    else if (k === 'U') for (let i = 8; i <= 10; i++) trinn.add(String(i))
    else if (k === 'K') { if (!harB && !harU) for (let i = 8; i <= 10; i++) trinn.add(String(i)) }
    else if (k === 'S') egnet.add('SFO/AKS')
    // ukjent kode: flagges av kalleren (avvik), aldri gjettet
  }
  const ukjente = koder.filter(k => !['BH', 'B', 'U', 'K', 'S'].includes(k))
  return { trinnKoder: [...trinn], egnetNavn: [...egnet], ukjenteKoder: ukjente }
}

// atlu bruker field_school_year (ekte årstrinn) — direkte, ingen skoletype-gjetting.
export function regelTrinnFraSchoolYear(schoolYearRefs) {
  const koder = new Set()
  for (const y of (schoolYearRefs || [])) {
    const m = String(y.name || '').match(/(\d+)\.?\s*trinn/i)
    if (m) koder.add(m[1])
    else if (/barnehage/i.test(y.name || '')) koder.add('bhg')
  }
  return [...koder]
}

// ── MOVE IT: normaliser «Move It»/«Aktive pauser» → husets «Move It» (stor I), gjenbruk seed-raden ─
export function normaliserKategori(navn) {
  if (/^move it$/i.test(navn)) return 'Move It'
  if (/^aktive pauser$/i.test(navn)) return 'Move It'   // Kjartans beslutning: samles under «Move It» (stor I, 092)
  return navn
}

// ── BESKRIVELSE: renset HTML → ressurs_innhold.beskrivelse. Media-tokener UT.
//   Google Docs-støy vaskes. formaal fylles ALDRI her (skjer aldri maskinelt).
const TILLATTE_TAGGER = /^(p|br|ul|ol|li|strong|b|em|i|h3)$/i
export function rensBeskrivelse(safeValue) {
  let h = safeValue || ''
  // 1) fjern Drupal media-token-blokker (file-div) — de blir medier-rader, ikke prosa.
  h = h.replace(/<div[^>]*id=["']file-\d+["'][\s\S]*?<\/div>\s*/gi, ' ')
  // 2) fjern gjenværende rå media-tokener [[{...}]] (verdi-varianten, om noen henger igjen).
  h = h.replace(/\[\[\{[\s\S]*?\}\]\]/g, ' ')
  // 3) Google Docs-støy: id="docs-internal-guid-...", tomme dir-div-er, style-attributter.
  h = h.replace(/\s(id|style|dir|class)="[^"]*"/gi, '')
  h = h.replace(/<span[^>]*>|<\/span>/gi, '')
  // 4) fjern alle tagger som ikke er på hvitelista (behold innholdet).
  h = h.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (full, tag) => TILLATTE_TAGGER.test(tag) ? `<${full.startsWith('</') ? '/' : ''}${tag.toLowerCase()}>` : ' ')
  // 5) rydd tomme avsnitt og whitespace.
  h = h.replace(/<p>\s*<\/p>/gi, ' ').replace(/[ \t]+/g, ' ').replace(/(\s*\n\s*){2,}/g, '\n').trim()
  return h
}

// ── MEDIER: fid → fil via safe_value file-div (IKKE value). Original vs derivat.
//   Returnerer liste { fid, type, storage_sti, original_filnavn, er_original, youtube_id, avvik? }.
export function regelMedier(safeValue, finnesISti) {
  const ut = []
  const divs = [...(safeValue || '').matchAll(/<div[^>]*id=["']file-(\d+)["'][^>]*>([\s\S]*?)(?=<div[^>]*id=["']file-|$)/gi)]
  for (const dv of divs) {
    const fid = dv[1], blk = dv[2]
    const yt = (blk.match(/youtube\.com\/embed\/([\w-]+)/i) || blk.match(/youtu\.be\/([\w-]+)/i))
    if (/file-video-youtube|media-youtube/i.test(blk) || yt) {
      ut.push({ fid, type: 'video', youtube_id: yt ? yt[1] : null, storage_sti: null, er_original: true }); continue
    }
    const src = (blk.match(/(?:src|href)=["']([^"']*\/sites\/default\/files\/[^"']+)["']/i) || [])[1]
    const erVideo = /\.(mp4|mov|webm|m4v)(\?|"|$)/i.test(src || '') || /<video/i.test(blk)
    const type = erVideo ? 'video' : 'bilde'
    if (!src) { ut.push({ fid, type, storage_sti: null, er_original: false, avvik: { type: 'annet', forklaring: `file-${fid}: fant ingen filsti i safe_value.` } }); continue }
    const m = src.match(/\/sites\/default\/files\/(.+?)(?:\?.*)?$/)
    let rel = decodeURIComponent(m[1])
    const varDerivat = /styles\/[^/]+\/public\//.test(rel)
    const relOrig = rel.replace(/styles\/[^/]+\/public\//, '')
    const stiOrig = 'Files/public/' + relOrig
    const filnavn = relOrig.split('/').pop()
    // ORIGINALBILDE-REGEL: verifiser at originalen finnes; ellers fall tilbake på derivatet + avvik.
    if (type === 'bilde') {
      if (finnesISti(stiOrig)) ut.push({ fid, type, storage_sti: 'public/' + relOrig, original_filnavn: filnavn, er_original: true })
      else if (varDerivat && finnesISti('Files/public/' + rel)) ut.push({ fid, type, storage_sti: 'public/' + rel, original_filnavn: rel.split('/').pop(), er_original: false, avvik: { type: 'kun_skjermkvalitet', forklaring: `file-${fid}: original mangler, bruker derivat (${rel}).` } })
      else ut.push({ fid, type, storage_sti: 'public/' + relOrig, original_filnavn: filnavn, er_original: true, avvik: { type: 'annet', forklaring: `file-${fid}: verken original eller derivat funnet på ${stiOrig}.` } })
    } else {
      // video: filsti (mp4). bunny_video_id fylles i FASE 2, ikke nå.
      const finnes = finnesISti(stiOrig)
      ut.push({ fid, type, storage_sti: 'public/' + relOrig, original_filnavn: filnavn, er_original: true,
                ...(finnes ? {} : { avvik: { type: 'annet', forklaring: `file-${fid}: videofil ikke funnet på ${stiOrig}.` } }) })
    }
  }
  return ut
}

// ── ALT-TEKST: mangler → lekens tittel som fallback + kø-rad ─────────────────
export function regelAltTekst(altFraKilde, tittel) {
  if (altFraKilde && altFraKilde.trim()) return { alt_tekst: altFraKilde.trim(), alt_tekst_kilde: 'menneske', avvik: null }
  return { alt_tekst: tittel, alt_tekst_kilde: 'fallback',
           avvik: { type: 'manglende_alttekst', forklaring: `Alt-tekst manglet — satt til tittel «${tittel}» som midlertidig fallback.` } }
}

// ── KOMPETANSEMÅL (atlu): overskrifter forkastes; utgåtte kobles ikke; maskinsatt merkes ──
//   status ∈ {A,B,C,D} fra kobling-forslag; c_grunn «trinn-overskrift» → ikke et mål.
export function regelKompetansemaal(objective) {
  // objective: { tid, navn, bunke, c_grunn, udir_uri }
  if (/^etter\s+\d+\.?\s*(års)?trinn/i.test(objective.navn || '') || /trinn-overskrift/i.test(objective.c_grunn || '')) {
    return { handling: 'forkast', kø: { type: 'ikke_et_maal', forklaring: `«${objective.navn}» er en trinn-overskrift, ikke et mål.` } }
  }
  if (objective.bunke === 'D') {
    return { handling: 'utgatt', kø: { type: 'utgatt_fjernet', forklaring: `Utgått LK06-mål: «${objective.navn}» — ikke koblet.`, tekst: objective.navn } }
  }
  // A/B/C med gyldig udir-uri → kobling. (Maskinsatt erstatning merkes satt_av='maskin' av kalleren.)
  return { handling: 'kobles', uri: objective.udir_uri || null, tekst: objective.navn }
}
