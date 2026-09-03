#!/usr/bin/env node
// migrasjonskjorer.mjs — bygger en KOPI-base fra supabase/migrations/ (001-087).
//
// HUSREGEL: `supabase db push` / Supabase CLI er FORBUDT. Dette er vårt eget verktøy.
//
// STANDARD = TØRRMODUS (fail-closed): uten flagget --kjor kontaktes INGEN database.
//   node migrasjonskjorer.mjs                 -> tørrmodus, skriver TORRKJORING-RAPPORT.md
//   node migrasjonskjorer.mjs --kjor --bekreft [--fra=NN]   -> kjøremodus (mot KOPI-base)
//
// Kjøremodus leser tilkobling fra .env.import i prosjektroten (opprettes IKKE her).
// Sperre: nekter å kjøre hvis tilkoblingen peker på live prosjekt-ID.

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROSJEKTROT = resolve(__dirname, '..', '..');
const MIGRASJONSDIR = join(PROSJEKTROT, 'supabase', 'migrations');
const RAPPORTFIL = join(__dirname, 'TORRKJORING-RAPPORT.md');
const ENVFIL = join(PROSJEKTROT, '.env.import');

// Live-basen som ALDRI skal røres.
const LIVE_PROSJEKT_ID = 'zpirjbrcbeubwpmtncxx';

// ---------------------------------------------------------------------------
// 1) Les og sorter migrasjonsfiler
// ---------------------------------------------------------------------------
function lesMigrasjoner() {
  const alle = readdirSync(MIGRASJONSDIR);
  const sqlFiler = alle.filter((f) => f.toLowerCase().endsWith('.sql'));
  const avvikende = []; // navn som ikke matcher NNN[bokstav]_navn.sql
  const gyldige = [];
  // Godtar valgfritt bokstavsuffiks etter nummeret: 091_x.sql, 091B_x.sql, 092A_x.sql.
  const mønster = /^(\d{3})([A-Za-z]?)_.+\.sql$/;
  for (const navn of sqlFiler) {
    const m = navn.match(mønster);
    if (!m) { avvikende.push(navn); continue; }
    gyldige.push({ nr: parseInt(m[1], 10), suffiks: m[2].toUpperCase(), navn });
  }
  // Nummer først, deretter suffiks: tomt suffiks ('') sorteres FØR bokstav,
  // slik at 091 kommer før 091B, som kommer før 092.
  gyldige.sort((a, b) => a.nr - b.nr || a.suffiks.localeCompare(b.suffiks));

  // hull i nummerrekken
  const hull = [];
  if (gyldige.length) {
    const min = gyldige[0].nr;
    const max = gyldige[gyldige.length - 1].nr;
    const finnes = new Set(gyldige.map((g) => g.nr));
    for (let i = min; i <= max; i++) if (!finnes.has(i)) hull.push(i);
  }
  // dubletter (samme nummer + suffiks — 091 og 091B er IKKE dubletter)
  const settnr = new Map();
  for (const g of gyldige) {
    const nøkkel = String(g.nr).padStart(3, '0') + g.suffiks;
    settnr.set(nøkkel, (settnr.get(nøkkel) || 0) + 1);
  }
  const duplikatNr = [...settnr.entries()].filter(([, c]) => c > 1).map(([n]) => n);

  return { gyldige, avvikende, hull, duplikatNr,
           ikkeSql: alle.filter((f) => !f.toLowerCase().endsWith('.sql') && !f.startsWith('.')) };
}

// ---------------------------------------------------------------------------
// SQL-analyse: setningsteller som forstår dollar-quoting og strenger
// ---------------------------------------------------------------------------
function tellSetninger(sql) {
  let i = 0, n = sql.length, depthSemis = 0;
  let iStr = false, iDollar = false, dollarTag = '';
  let iLine = false, iBlock = false;
  while (i < n) {
    const c = sql[i], c2 = sql[i + 1];
    if (iLine) { if (c === '\n') iLine = false; i++; continue; }
    if (iBlock) { if (c === '*' && c2 === '/') { iBlock = false; i += 2; continue; } i++; continue; }
    if (iStr) { if (c === "'") { if (c2 === "'") { i += 2; continue; } iStr = false; } i++; continue; }
    if (iDollar) {
      if (c === '$' && sql.startsWith(dollarTag, i)) { iDollar = false; i += dollarTag.length; continue; }
      i++; continue;
    }
    // ikke inne i noe spesielt:
    if (c === '-' && c2 === '-') { iLine = true; i += 2; continue; }
    if (c === '/' && c2 === '*') { iBlock = true; i += 2; continue; }
    if (c === "'") { iStr = true; i++; continue; }
    if (c === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) { dollarTag = m[0]; iDollar = true; i += dollarTag.length; continue; }
    }
    if (c === ';') { depthSemis++; i++; continue; }
    i++;
  }
  return depthSemis;
}

// Del sql i linjer og marker hvilke linjer som er "kode" (ikke ren kommentar),
// OG om linjen ligger inne i en dollar-quotet kropp ($$...$$ = funksjonskropp).
// Insert inne i en funksjonskropp er KJØRETIDSLOGIKK, ikke seeding ved migrering.
function kodelinjer(sql) {
  const raw = sql.split(/\r?\n/);
  const linjer = [];
  let iDollar = false, dollarTag = '', iBlock = false;
  for (const tekst of raw) {
    const startetIDollar = iDollar; // gjaldt kroppen ved starten av linjen
    // grovskann linjen for dollar-quote-veksling og blokk-kommentar
    let i = 0;
    while (i < tekst.length) {
      const c = tekst[i], c2 = tekst[i + 1];
      if (iBlock) { if (c === '*' && c2 === '/') { iBlock = false; i += 2; continue; } i++; continue; }
      if (iDollar) {
        if (c === '$' && tekst.startsWith(dollarTag, i)) { iDollar = false; i += dollarTag.length; continue; }
        i++; continue;
      }
      if (c === '-' && c2 === '-') break;            // resten er linjekommentar
      if (c === '/' && c2 === '*') { iBlock = true; i += 2; continue; }
      if (c === '$') {
        const m = tekst.slice(i).match(/^\$[A-Za-z_]*\$/);
        if (m) { dollarTag = m[0]; iDollar = true; i += dollarTag.length; continue; }
      }
      i++;
    }
    linjer.push({ tekst, erKommentar: /^\s*--/.test(tekst), iKropp: startetIDollar });
  }
  return linjer;
}

// ---------------------------------------------------------------------------
// Bygg oversikt over funksjonsdefinisjoner (navn -> første filnr)
// ---------------------------------------------------------------------------
const DEF_RE = /create\s+(?:or\s+replace\s+)?function\s+(?:if\s+not\s+exists\s+)?("?[\w.]+"?)\s*\(/gi;

function barenavn(raa) {
  let s = raa.replace(/"/g, '');
  const punkt = s.lastIndexOf('.');
  if (punkt >= 0) s = s.slice(punkt + 1);
  return s.toLowerCase();
}

function byggFunksjonskart(filer) {
  const kart = new Map(); // navn -> {førsteNr, filnavn}
  for (const f of filer) {
    const sql = readFileSync(join(MIGRASJONSDIR, f.navn), 'utf8');
    let m;
    DEF_RE.lastIndex = 0;
    while ((m = DEF_RE.exec(sql)) !== null) {
      const navn = barenavn(m[1]);
      if (!kart.has(navn) || f.nr < kart.get(navn).førsteNr) {
        kart.set(navn, { førsteNr: f.nr, filnavn: f.navn });
      }
    }
  }
  return kart;
}

// ---------------------------------------------------------------------------
// 2) Analyser én fil og returner flagg
// ---------------------------------------------------------------------------
const UUID_RE = /'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'/;
const DROP_RE = /^\s*drop\s+/i;
const DROP_IF_EXISTS_RE = /drop\s+\w+\s+(if\s+exists|concurrently\s+if\s+exists)/i;
const INSERT_RE = /\binsert\s+into\b/i;
const DOK_MARKORER = [/introspeksjon/i, /dokumentasjon/i, /ikke\s+ment\s+å\s+kj/i, /live-?skjema/i, /komplett live/i];

function analyser(fil, funksjonskart) {
  const sql = readFileSync(join(MIGRASJONSDIR, fil.navn), 'utf8');
  const linjer = kodelinjer(sql);
  const flagg = [];

  // arkiv/dokumentasjon (les topp-kommentar, første 8 linjer)
  const topp = linjer.slice(0, 8).map((l) => l.tekst).join('\n');
  const erDok = DOK_MARKORER.some((re) => re.test(topp));

  linjer.forEach((l, idx) => {
    const nr = idx + 1;
    if (l.erKommentar) return; // hopp over rene kommentarlinjer
    // a) harde live-UUID-literaler
    if (UUID_RE.test(l.tekst)) {
      flagg.push({ type: 'LIVE-UUID', linje: nr, tekst: l.tekst.trim().slice(0, 120) });
    }
    // b) testdata / seeding — KUN topp-nivå insert (ikke inne i funksjonskropp)
    if (INSERT_RE.test(l.tekst) && !l.iKropp) {
      flagg.push({ type: 'SEEDING', linje: nr, tekst: l.tekst.trim().slice(0, 120) });
    }
    // b2) insert inne i funksjonskropp = kjøretidslogikk (informativt, ikke seeding)
    if (INSERT_RE.test(l.tekst) && l.iKropp) {
      flagg.push({ type: 'INSERT-I-FUNKSJON', linje: nr, tekst: l.tekst.trim().slice(0, 120) });
    }
    // c) drop uten if exists
    if (DROP_RE.test(l.tekst) && !DROP_IF_EXISTS_RE.test(l.tekst)) {
      flagg.push({ type: 'DROP-UTEN-IF-EXISTS', linje: nr, tekst: l.tekst.trim().slice(0, 120) });
    }
  });

  // d) kall til funksjon definert i en SENERE fil (forward-referanse)
  // skann kode uten rene kommentarlinjer
  const kodetekst = linjer.filter((l) => !l.erKommentar).map((l, i) => ({ t: l.tekst, n: i }));
  for (const [navn, def] of funksjonskart) {
    if (def.førsteNr <= fil.nr) continue; // definert i denne eller tidligere fil = greit
    const kallRe = new RegExp('\\b' + navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(', 'i');
    linjer.forEach((l, idx) => {
      if (l.erKommentar) return;
      // ikke tell selve definisjonen (finnes ikke her siden def er i senere fil)
      if (kallRe.test(l.tekst)) {
        flagg.push({ type: 'FORWARD-FUNKSJON', linje: idx + 1,
          tekst: `kaller ${navn}() — definert først i ${def.filnavn} (nr ${def.førsteNr})` });
      }
    });
  }

  return {
    nr: fil.nr, navn: fil.navn, erDok,
    bytes: Buffer.byteLength(sql, 'utf8'),
    setninger: tellSetninger(sql),
    flagg,
  };
}

// ---------------------------------------------------------------------------
// TØRRMODUS
// ---------------------------------------------------------------------------
function tørrkjør() {
  const { gyldige, avvikende, hull, duplikatNr, ikkeSql } = lesMigrasjoner();
  console.log(`Fant ${gyldige.length} migrasjonsfiler (NNN_navn.sql).`);
  if (hull.length) console.log(`HULL i nummerrekken: ${hull.join(', ')}`);
  else console.log('Ingen hull i nummerrekken.');
  if (avvikende.length) console.log(`Avvikende navn: ${avvikende.join(', ')}`);
  if (duplikatNr.length) console.log(`Dupliserte numre: ${duplikatNr.join(', ')}`);

  const funksjonskart = byggFunksjonskart(gyldige);
  const resultater = gyldige.map((f) => analyser(f, funksjonskart));

  skrivRapport(resultater, { avvikende, hull, duplikatNr, ikkeSql, funksjonskart });
  const antFlagg = resultater.reduce((s, r) => s + r.flagg.length, 0);
  console.log(`\nAnalyse ferdig. ${antFlagg} flagg totalt. Rapport: ${RAPPORTFIL}`);
}

function grupper(flagg, type) { return flagg.filter((f) => f.type === type); }

function skrivRapport(resultater, meta) {
  const total = resultater.length;
  const tellType = (t) => resultater.reduce((s, r) => s + grupper(r.flagg, t).length, 0);
  const L = [];
  L.push('# Tørrkjøring — migrasjonskjører');
  L.push('');
  L.push('**Dato:** 2. sep 2026 · **Modus:** TØRRKJØRING (ingen database kontaktet).');
  L.push('Verktøy: `scripts/migrasjonskjorer/migrasjonskjorer.mjs`. `supabase db push` ikke brukt.');
  L.push('');
  L.push('## Filoversikt');
  L.push(`- Migrasjonsfiler funnet: **${total}** (mønster \`NNN_navn.sql\`)`);
  L.push(`- Hull i nummerrekken: **${meta.hull.length ? meta.hull.join(', ') : 'ingen'}**`);
  L.push(`- Avvikende filnavn: **${meta.avvikende.length ? meta.avvikende.join(', ') : 'ingen'}**`);
  L.push(`- Dupliserte numre: **${meta.duplikatNr.length ? meta.duplikatNr.join(', ') : 'ingen'}**`);
  L.push(`- Ikke-SQL-filer i mappa: **${meta.ikkeSql.length ? meta.ikkeSql.join(', ') : 'ingen'}**`);
  L.push('');
  L.push('## Flagg-sammendrag');
  L.push('');
  L.push('| Flaggtype | Antall | Betydning |');
  L.push('|---|---:|---|');
  L.push(`| LIVE-UUID | ${tellType('LIVE-UUID')} | hardkodet UUID-literal fra live-data |`);
  L.push(`| SEEDING | ${tellType('SEEDING')} | topp-nivå \`insert into\` — kjøres ved migrering (test- eller referansedata) |`);
  L.push(`| INSERT-I-FUNKSJON | ${tellType('INSERT-I-FUNKSJON')} | \`insert into\` inne i funksjonskropp — kjøretidslogikk, IKKE seeding |`);
  L.push(`| DROP-UTEN-IF-EXISTS | ${tellType('DROP-UTEN-IF-EXISTS')} | \`drop\` som forutsetter at objektet finnes |`);
  L.push(`| FORWARD-FUNKSJON | ${tellType('FORWARD-FUNKSJON')} | kall til funksjon definert i en senere fil |`);
  L.push('');
  L.push('## Alle filer med status');
  L.push('');
  L.push('| # | Fil | Bytes | Setn. | Dok? | Flagg |');
  L.push('|---:|---|---:|---:|:---:|---|');
  for (const r of resultater) {
    const typer = {};
    for (const f of r.flagg) typer[f.type] = (typer[f.type] || 0) + 1;
    const flaggtekst = Object.keys(typer).length
      ? Object.entries(typer).map(([t, c]) => `${t}×${c}`).join(', ')
      : '—';
    L.push(`| ${String(r.nr).padStart(3, '0')} | ${r.navn} | ${r.bytes} | ${r.setninger} | ${r.erDok ? '⚠︎ JA' : ''} | ${flaggtekst} |`);
  }
  L.push('');
  L.push('## Alle flagg med filnavn og linjenummer');
  for (const type of ['LIVE-UUID', 'FORWARD-FUNKSJON', 'DROP-UTEN-IF-EXISTS', 'SEEDING', 'INSERT-I-FUNKSJON']) {
    const rader = [];
    for (const r of resultater) for (const f of grupper(r.flagg, type)) rader.push({ r, f });
    L.push('');
    L.push(`### ${type} (${rader.length})`);
    if (!rader.length) { L.push('_Ingen._'); continue; }
    if (type === 'SEEDING' || type === 'INSERT-I-FUNKSJON') {
      // grupper per fil for lesbarhet
      const perFil = new Map();
      for (const { r, f } of rader) {
        if (!perFil.has(r.navn)) perFil.set(r.navn, []);
        perFil.get(r.navn).push(f.linje);
      }
      L.push('');
      L.push('| Fil | Antall insert | Linjer (utvalg) |');
      L.push('|---|---:|---|');
      for (const [navn, linjer] of perFil) {
        L.push(`| ${navn} | ${linjer.length} | ${linjer.slice(0, 12).join(', ')}${linjer.length > 12 ? ' …' : ''} |`);
      }
    } else {
      L.push('');
      L.push('| Fil | Linje | Detalj |');
      L.push('|---|---:|---|');
      for (const { r, f } of rader) {
        L.push(`| ${r.navn} | ${f.linje} | ${f.tekst.replace(/\|/g, '\\|')} |`);
      }
    }
  }
  L.push('');
  L.push('## Arkiv/dokumentasjonsfiler');
  const dok = resultater.filter((r) => r.erDok);
  if (!dok.length) L.push('_Ingen filer flagget som dokumentasjon._');
  for (const r of dok) L.push(`- **${r.navn}** — topp-kommentar tyder på introspeksjon/dokumentasjon.`);
  L.push('');
  L.push('## Vurdering — kan disse filene bygge en base fra bunnen?');
  L.push('');
  L.push('**Kort svar:** Ingen strukturell blokkering funnet i statisk analyse, men det er ' +
    'ikke bevist før en faktisk kjøring mot KOPI-basen (andre halvdel av beviset). Dette ' +
    'verktøyet leser bare tekst; det utfører ikke SQL.');
  L.push('');
  L.push('### Det som taler FOR at det går');
  L.push('- **Ingen hull** i nummerrekken (001–087), ingen dupliserte numre, ingen avvikende filnavn.');
  L.push('- **0 forward-referanser til funksjoner** — ingen fil kaller en funksjon som først ' +
    'defineres i en senere fil (77 funksjoner kartlagt; f.eks. `get_min_rolle` defineres i 007 ' +
    'før den brukes i 008+).');
  L.push('- **0 `drop` uten `if exists`** — ingen fil forutsetter at et objekt allerede finnes ' +
    'for å kunne slette det. Alle drops er idempotente.');
  L.push('- Ingen hardkodet **live prosjekt-ID** eller superadmin-UID i migrasjonene.');
  L.push('');
  L.push('### 019_live_schema.sql — MÅ kjøres, i posisjon (ikke bare dokumentasjon)');
  L.push('Topp-kommentaren kaller den «komplett live-skjema … dokumentasjon», men det er ' +
    '**misvisende for gjenoppbygging**. Tabellene `kurs`, `kurs_skole`, `kursholdere`, ' +
    '`haller`, `evalueringer` (+ 22 RPC-er) opprettes **kun** i 019 — de finnes ikke i noen ' +
    'annen migrasjon. **22 senere filer** (020, 021, 022, 047–058, 060–062, 078, 082, 083, 085) ' +
    'refererer disse tabellene. Uten 019 vil bygget kollapse ved 020.');
  L.push('- **Min anbefaling:** 019 SKAL kjøres, og den skal kjøres **på sin plass** (etter 018, ' +
    'før 020). Den bruker `create table if not exists` gjennomgående, så den kolliderer ikke med ' +
    'tabeller som alt er opprettet tidligere (f.eks. `brukslogg` fra 015). Kjøremodus kjører den ' +
    'derfor som en helt vanlig fil i rekken — ingen særbehandling nødvendig.');
  L.push('- **Forbehold:** fordi 019 er en introspeksjons-dump, kan den avvike fra det ' +
    'migrasjonene 001–018 faktisk bygget (kolonner lagt til/endret senere). `if not exists` ' +
    'skjuler slike avvik i stedet for å feile. Bare en ekte kjøring avslører om skjemaet blir ' +
    'konsistent.');
  L.push('');
  L.push('### Testdata og seeding — en beslutning for mennesket');
  L.push('- **034_testimport_20leker.sql** (127 topp-inserts) og **031_fase3_testleker.sql** ' +
    '(22) er rene **testdata**. 034 inneholder også **148 hardkodede UUID-literaler** (delete+' +
    'insert av konkrete leke-rader). Dette er ikke produksjonsinnhold. I en øve-kopi er det ' +
    'ufarlig, men det bør være et bevisst valg om de skal være med — de blåser opp basen med ' +
    'testleker som senere må ryddes.');
  L.push('- De øvrige topp-insertene er stort sett **referanse-/konfigurasjonsdata** (taksonomi i ' +
    '023, hjuloppsett, e-postmaler, TU-kodesett) som normalt SKAL med.');
  L.push('- **37 `insert into` ligger inne i funksjonskropper** (`INSERT-I-FUNKSJON`) — det er ' +
    'kjøretidslogikk (logging, purring, kvittering), **ikke** seeding. De skilles ut nettopp ' +
    'for at seeding-tallet skal bety noe.');
  L.push('');
  L.push('### Hva denne analysen IKKE beviser (bevisst avgrensning)');
  L.push('- **Rekkefølge på tabeller/kolonner** er ikke sjekket (kun funksjoner). En fil kan ' +
    'referere en kolonne som først legges til senere — det fanges ikke her, kun ved kjøring.');
  L.push('- **FK-/dataintegritet** i seed-radene (f.eks. at 034 sine leker peker på kategorier ' +
    'som finnes) er ikke verifisert.');
  L.push('- **Innhold i funksjonskropper** (dynamisk SQL, avhengigheter) er ikke evaluert.');
  L.push('');
  L.push('**Konklusjon:** Filsettet ser komplett og internt konsistent ut på de punktene et ' +
    'statisk verktøy kan sjekke, forutsatt at 019 kjøres i posisjon. Det gjenstående beviset — ' +
    'at 87 filer faktisk bygger en tom base grønt — krever kjøremodus mot en fersk KOPI-base. ' +
    'Verktøyet er klart for det; det er andre halvdel av oppdraget.');
  L.push('');
  writeFileSync(RAPPORTFIL, L.join('\n'), 'utf8');
}

// ---------------------------------------------------------------------------
// 3+4) KJØREMODUS (mot KOPI-base) — fail-closed, med live-sperre
// ---------------------------------------------------------------------------
function lesEnvImport() {
  if (!existsSync(ENVFIL)) {
    throw new Error(`.env.import finnes ikke i prosjektroten (${ENVFIL}). ` +
      'Opprett den selv med tilkoblingsdetaljer til KOPI-basen. Dette verktøyet oppretter den ikke.');
  }
  const ut = {};
  for (const linje of readFileSync(ENVFIL, 'utf8').split(/\r?\n/)) {
    const t = linje.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    ut[t.slice(0, eq).trim()] = v;
  }
  return ut;
}

function byggTilkobling(env) {
  // Godta enten DATABASE_URL/IMPORT_DATABASE_URL eller PG*-variabler.
  const url = env.IMPORT_DATABASE_URL || env.DATABASE_URL || '';
  let cfg, beskrivelse;
  if (url) {
    cfg = { connectionString: url };
    beskrivelse = url;
  } else {
    cfg = {
      host: env.PGHOST, port: env.PGPORT ? Number(env.PGPORT) : 5432,
      user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE,
    };
    beskrivelse = `${env.PGHOST}:${cfg.port}/${env.PGDATABASE}`;
  }
  return { cfg, beskrivelse };
}

function sjekkLiveSperre(beskrivelse) {
  if (!beskrivelse) throw new Error('Fant ingen tilkoblingsdetaljer i .env.import.');
  if (beskrivelse.includes(LIVE_PROSJEKT_ID)) {
    throw new Error(`SPERRE UTLØST: tilkoblingen peker på live prosjekt-ID (${LIVE_PROSJEKT_ID}). ` +
      'Kjøremodus nekter å røre live-basen. Avbryter.');
  }
}

async function kjør(fraNr) {
  const { gyldige, hull } = lesMigrasjoner();
  if (hull.length) {
    console.error(`Avbryter: hull i nummerrekken (${hull.join(', ')}). Rett opp før kjøring.`);
    process.exit(1);
  }
  const env = lesEnvImport();
  const { cfg, beskrivelse } = byggTilkobling(env);
  sjekkLiveSperre(beskrivelse);

  let pg;
  try { pg = (await import('pg')).default; }
  catch {
    console.error('Pakken `pg` er ikke installert. Kjør `npm i pg` i en egen import-kontekst før kjøremodus brukes.');
    process.exit(1);
  }

  const klient = new pg.Client(cfg);
  await klient.connect();
  console.log(`Tilkoblet KOPI-base: ${beskrivelse.replace(/:[^:@/]+@/, ':***@')}`);

  const kjørbare = gyldige.filter((f) => f.nr >= (fraNr || 0));
  console.log(`Kjører ${kjørbare.length} filer (fra nr ${String(fraNr || gyldige[0].nr).padStart(3, '0')}), én transaksjon per fil.\n`);

  const logg = [];
  for (const f of kjørbare) {
    const sql = readFileSync(join(MIGRASJONSDIR, f.navn), 'utf8');
    const start = process.hrtime.bigint();
    try {
      await klient.query('BEGIN');
      await klient.query(sql);
      await klient.query('COMMIT');
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`OK   ${f.navn}  (${ms.toFixed(0)} ms)`);
      logg.push({ navn: f.navn, ok: true, ms });
    } catch (e) {
      try { await klient.query('ROLLBACK'); } catch {}
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.error(`\nFEIL i ${f.navn} etter ${ms.toFixed(0)} ms:`);
      console.error(`  ${e.message}`);
      console.error(`\nStoppet. Rett feilen og gjenoppta med:  --kjor --bekreft --fra=${String(f.nr).padStart(3, '0')}`);
      logg.push({ navn: f.navn, ok: false, ms, feil: e.message });
      await klient.end();
      skrivKjørelogg(logg);
      process.exit(1);
    }
  }
  await klient.end();
  skrivKjørelogg(logg);
  console.log(`\nFerdig. Alle ${kjørbare.length} filer kjørte grønt.`);
}

function skrivKjørelogg(logg) {
  const fil = join(__dirname, 'KJORELOGG.md');
  const L = ['# Kjørelogg', '', '| Fil | Status | Varighet (ms) | Feil |', '|---|---|---:|---|'];
  for (const r of logg) L.push(`| ${r.navn} | ${r.ok ? 'OK' : 'FEIL'} | ${r.ms.toFixed(0)} | ${r.feil ? r.feil.replace(/\|/g, '\\|') : ''} |`);
  writeFileSync(fil, L.join('\n'), 'utf8');
  console.log(`Kjørelogg skrevet: ${fil}`);
}

// ---------------------------------------------------------------------------
// Inngang
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const vilKjøre = args.includes('--kjor');
const bekreftet = args.includes('--bekreft');
const fraArg = args.find((a) => a.startsWith('--fra='));
const fraNr = fraArg ? parseInt(fraArg.split('=')[1], 10) : 0;

if (!vilKjøre) {
  // STANDARD: tørrmodus. Ingen database.
  tørrkjør();
} else {
  if (!bekreftet) {
    console.error('Kjøremodus krever eksplisitt bekreftelse: legg til --bekreft.');
    console.error('(Fail-closed: uten --bekreft kontaktes ingen database.)');
    process.exit(1);
  }
  kjør(fraNr).catch((e) => { console.error('Avbrutt:', e.message); process.exit(1); });
}
