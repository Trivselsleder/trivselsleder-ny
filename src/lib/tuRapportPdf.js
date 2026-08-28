// Avhengighetsfri PDF/utskrift av skolens TU-resultatrapport (steg 5).
// Bygger et rent dokument (A4 stående) og åpner nettleserens «Lagre som PDF».
// Samme mønster som periodeplanPdf.js — INGEN ny PDF-stack.
//
// ⛔ §1: `skjult_aarsak` er allerede kastet i datalaget (tu.js/mapKjonn). Denne
// fila mottar den ALDRI og skriver den ALDRI. Vi leser KUN `skjult` (boolean).
//
// All lesbar tekst kommer inn via `oversett`-funksjonen (i18next `t`), så
// dokumentet finnes på både norsk og svensk uten hardkodet tekst. Kun rent
// tekniske ting (fargekoder, css) er «hardkodet» — det er ikke leserrettet tekst.

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Husrød og «lavere er bedre» — speiler tu.js, men holdt lokalt så PDF-bygg er selvstendig.
const HUSROD = ['mobbing', 'alenegang']

// Desimaler — ÉN plass å endre (retting etter Fable-kontroll 28. aug, funn 1):
//   Hovedbildet: én desimal (QuestBack-formen «22,2 %»), totalen n=43 er kjent uansett.
//   Kjønnsdelt: HELTALL. Med én desimal kan gruppestørrelsen regnes ut bakover
//   fra prosenten (27,8 % = 5 av 18) — og dermed størrelsen på en skjermet gruppe.
const DESIMALER_HOVED = 1
const DESIMALER_KJONN = 0

function fmtProsent(andel /* 0..1 */, oversett, desimaler = DESIMALER_HOVED) {
  const pct = andel * 100
  const tekst = pct.toFixed(desimaler).replace('.', ',')
  return oversett('tu.rapport.prosent', { verdi: tekst })   // «{{verdi}} %»
}

function datoTekst(iso, sprak) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const locale = sprak === 'sv' ? 'sv-SE' : 'nb-NO'
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Én søylerad for ett svaralternativ. `andel` = antall/total (0..1).
// `husrod` styrer fast farge (temaet, ikke alvorsgraden — ingen eskalering).
// ---------------------------------------------------------------------------
function svarSoyle({ tekst, andel, husrod, oversett, desimaler = DESIMALER_HOVED }) {
  const bredde = Math.max(0, Math.min(100, andel * 100))
  const farge = husrod ? 'var(--tlred)' : 'var(--petrol)'
  const pct = fmtProsent(andel, oversett, desimaler)
  return `<div class="soyle-rad">
    <div class="soyle-tekst">${esc(tekst)}</div>
    <div class="soyle-spor" role="img" aria-label="${esc(tekst)}: ${esc(pct)}">
      <div class="soyle-fyll" style="width:${bredde.toFixed(2)}%;background:${farge}"></div>
    </div>
    <div class="soyle-pct">${esc(pct)}</div>
  </div>`
}

// Den LÅSTE terskelmeldingen (§5) — ordrett, samme overalt (via i18n-nøkkel).
function terskelmelding(oversett) {
  return `<p class="terskel">${esc(oversett('tu.rapport.terskelmelding'))}</p>`
}

// Homogen-visning (§2): «nesten alle svarte likt» — vis som rolig band, ALDRI
// eksakt tall. Vi kjenner ikke dominansverdien fra utgang-1 (fordeling=null),
// så meldingen er kvalitativ, ikke et tall.
function homogenMelding(oversett) {
  return `<p class="homogen">${esc(oversett('tu.rapport.homogenMelding'))}</p>`
}

// ---------------------------------------------------------------------------
// Ett spørsmål i hovedbildet (§2). Viser ALLE svaralternativer (QuestBack).
//   meta   = { nummer, kategori, antallAlternativer }
//   rad    = { antall, fordeling, homogen, skjult } (fra tu_skole_resultat)
// ---------------------------------------------------------------------------
function hovedSporsmal({ meta, rad, oversett }) {
  const nr = meta.nummer
  const husrod = HUSROD.includes(meta.kategori)
  const laagBra = HUSROD.includes(meta.kategori) // samme sett: lav % er bra
  const tittel = `<h3 class="sp-tittel">${esc(oversett(`tu.sp.${nr}.tekst`))}</h3>`

  let kropp
  if (!rad || rad.skjult) {
    kropp = terskelmelding(oversett)
  } else if (rad.homogen || !rad.fordeling) {
    kropp = homogenMelding(oversett)
  } else {
    const total = rad.antall || 0
    // Rendrer ALLE alternativer 0..(antallAlternativer-1), også skjermede/nullceller.
    const rader = []
    for (let i = 0; i < meta.antallAlternativer; i++) {
      const harCelle = Object.prototype.hasOwnProperty.call(rad.fordeling, String(i))
      const antallCelle = harCelle ? rad.fordeling[String(i)] : null
      const svartekst = oversett(`tu.sp.${nr}.svar.${i}`)
      if (antallCelle === null) {
        // Cellen er skjermet bort (celle-skjerming) ELLER hadde 0 svar.
        // Vi viser alternativet med en diskret «for få / ingen»-strek, aldri et tall.
        rader.push(`<div class="soyle-rad">
          <div class="soyle-tekst">${esc(svartekst)}</div>
          <div class="soyle-spor"><div class="soyle-fyll soyle-tom" style="width:0%"></div></div>
          <div class="soyle-pct soyle-strek">–</div>
        </div>`)
      } else {
        const andel = total > 0 ? antallCelle / total : 0
        rader.push(svarSoyle({ tekst: svartekst, andel, husrod, oversett }))
      }
    }
    const retning = laagBra
      ? `<p class="retning">${esc(oversett('tu.rapport.lavereBedre'))}</p>`
      : ''
    kropp = `<div class="soyler">${rader.join('')}</div>${retning}
      <p class="antall-note">${esc(oversett('tu.rapport.antallSvar', { antall: total }))}</p>`
  }

  return `<section class="sp-blokk${husrod ? ' sp-husrod' : ''}">
    ${tittel}
    ${kropp}
  </section>`
}

// ---------------------------------------------------------------------------
// Kjønnsdelt side (§3). Per spørsmål: jente/gutt/annet side om side. Rad-
// eskalering (073): én gruppe kan vise fordeling mens en annen viser terskel-
// meldingen PÅ SAMME spørsmål. Layouten tåler begge deler.
// ---------------------------------------------------------------------------
const KJONN_REKKE = ['jente', 'gutt', 'annet']

function kjonnGruppe({ nr, meta, rad, oversett }) {
  const husrod = HUSROD.includes(meta.kategori)
  const grEtikett = oversett(`tu.rapport.gruppe.${rad ? rad.gruppe : 'ukjent'}`)
  let kropp
  if (!rad || rad.skjult) {
    kropp = terskelmelding(oversett)
  } else if (rad.homogen || !rad.fordeling) {
    kropp = homogenMelding(oversett)
  } else {
    const total = rad.antall || 0
    const rader = []
    for (let i = 0; i < meta.antallAlternativer; i++) {
      const harCelle = Object.prototype.hasOwnProperty.call(rad.fordeling, String(i))
      const svartekst = oversett(`tu.sp.${nr}.svar.${i}`)
      if (!harCelle) {
        rader.push(`<div class="soyle-rad">
          <div class="soyle-tekst">${esc(svartekst)}</div>
          <div class="soyle-spor"><div class="soyle-fyll soyle-tom" style="width:0%"></div></div>
          <div class="soyle-pct soyle-strek">–</div>
        </div>`)
      } else {
        const andel = total > 0 ? rad.fordeling[String(i)] / total : 0
        rader.push(svarSoyle({ tekst: svartekst, andel, husrod, oversett, desimaler: DESIMALER_KJONN }))
      }
    }
    // Retting funn 1 (Fable 28. aug): INGEN «N svar» per gruppe her. Hovedbildets
    // total minus synlige gruppestørrelser ville ellers røpe størrelsen på den
    // skjermede gruppen (43 − 20 − 18 = 5), som skjermingen bevisst gir som null.
    kropp = `<div class="soyler">${rader.join('')}</div>`
  }
  return `<div class="kjonn-kort">
    <h4 class="kjonn-tittel">${esc(grEtikett)}</h4>
    ${kropp}
  </div>`
}

function kjonnSporsmal({ meta, kjonnRader, oversett }) {
  const nr = meta.nummer
  const husrod = HUSROD.includes(meta.kategori)
  const tittel = `<h3 class="sp-tittel">${esc(oversett(`tu.sp.${nr}.tekst`))}</h3>`
  const kort = KJONN_REKKE.map((g) => {
    const rad = kjonnRader.find((r) => r.gruppe === g) || null
    // Finnes ikke gruppen i data i det hele tatt (ingen svar), vis som terskel.
    return kjonnGruppe({ nr, meta, rad, oversett })
  }).join('')
  return `<section class="sp-blokk${husrod ? ' sp-husrod' : ''}">
    ${tittel}
    <div class="kjonn-rad">${kort}</div>
  </section>`
}

// ---------------------------------------------------------------------------
// Utvikling over tid (§4). Første gang (ingen arkiv) → vennlig tom-linje.
// Fra runde 2+: enkel liste av tidligere runder (ren tekst, respekterer
// skjerming — vi viser bare antall_totalt + skoleår/semester, ikke celletall).
// ---------------------------------------------------------------------------
function utviklingSeksjon({ utvikling, oversett }) {
  if (!utvikling || utvikling.length < 2) {
    return `<section class="sp-blokk">
      <h3 class="sp-tittel">${esc(oversett('tu.rapport.utvikling.tittel'))}</h3>
      <p class="tom-utvikling">${esc(oversett('tu.rapport.utvikling.tom'))}</p>
    </section>`
  }
  const rader = utvikling.map((u) => {
    const sem = oversett(`tu.rapport.semester.${u.semester}`)
    return `<li>${esc(u.skoleaar)} · ${esc(sem)} — ${esc(oversett('tu.rapport.antallSvar', { antall: u.antall_totalt }))}</li>`
  }).join('')
  return `<section class="sp-blokk">
    <h3 class="sp-tittel">${esc(oversett('tu.rapport.utvikling.tittel'))}</h3>
    <ul class="utvikling-liste">${rader}</ul>
  </section>`
}

// ---------------------------------------------------------------------------
// Hele dokumentet.
//   data   = { runde, sporsmalMeta, hoved, kjonn, utvikling }
//   ctx    = { skoleNavn, oversett, sprak }
// ---------------------------------------------------------------------------
export function byggRapportHtml(data, { skoleNavn, oversett, sprak = 'no', print = false } = {}) {
  const { runde, sporsmalMeta, hoved, kjonn, utvikling } = data
  const hovedByNr = Object.fromEntries(hoved.map((r) => [r.sporsmal, r]))

  // Hovedbilde: ett spørsmål av gangen, i nummerrekkefølge.
  const hovedHtml = sporsmalMeta.map((meta) =>
    hovedSporsmal({ meta, rad: hovedByNr[meta.nummer], oversett })
  ).join('\n')

  // Kjønnsdelt: grupper rader per spørsmål (hopp over 'total' — den er hovedbildet).
  const kjonnPerSp = {}
  for (const r of kjonn) {
    if (r.gruppe === 'total') continue
    ;(kjonnPerSp[r.sporsmal] = kjonnPerSp[r.sporsmal] || []).push(r)
  }
  const kjonnHtml = sporsmalMeta.map((meta) =>
    kjonnSporsmal({ meta, kjonnRader: kjonnPerSp[meta.nummer] || [], oversett })
  ).join('\n')

  const gruppeNavn = runde.gruppe_navn
    ? oversett('tu.rapport.forside.gruppe', { gruppe: runde.gruppe_navn, trinn: runde.trinn })
    : oversett('tu.rapport.forside.heleTrinnet', { trinn: runde.trinn })
  const rundedato = datoTekst(runde.startdato || runde.frist, sprak)

  return `<!doctype html><html lang="${sprak === 'sv' ? 'sv' : 'nb'}"><head><meta charset="utf-8">
<title>${esc(oversett('tu.rapport.doktittel', { skole: skoleNavn }))}</title>
<style>
  :root{
    --orange:#FF7B31; --orange-ink:#B5560F; --petrol:#106C75; --tlred:#CF442F;
    --blekk:#1f2937; --grunn:#6b7280; --strek:#e5e7eb; --lys:#faf7f5;
  }
  @page { size: A4 portrait; margin: 16mm; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--blekk);margin:0;line-height:1.5}

  /* Forside */
  .forside{min-height:calc(100vh - 40mm);display:flex;flex-direction:column;justify-content:center;page-break-after:always}
  .forside img{height:56px;width:auto;margin-bottom:28px}
  .forside h1{font-size:30px;margin:0 0 6px;color:var(--blekk)}
  .forside .under{font-size:17px;color:var(--grunn);margin:2px 0}
  .forside .dato{font-size:15px;color:var(--orange-ink);font-weight:600;margin-top:10px}

  /* Seksjonsoverskrift */
  .del-tittel{font-size:20px;border-bottom:3px solid var(--orange);padding-bottom:6px;margin:0 0 14px;page-break-after:avoid}
  .del-intro{font-size:13px;color:var(--grunn);margin:-8px 0 16px}

  /* Spørsmålsblokk */
  .sp-blokk{border:1px solid var(--strek);border-radius:12px;padding:14px 16px;margin:0 0 12px;page-break-inside:avoid}
  .sp-husrod{border-left:4px solid var(--tlred)}
  .sp-tittel{font-size:15px;margin:0 0 10px}

  /* Søyler */
  .soyler{display:flex;flex-direction:column;gap:7px}
  .soyle-rad{display:grid;grid-template-columns:minmax(120px,40%) 1fr 58px;align-items:center;gap:10px}
  .soyle-tekst{font-size:12px;color:var(--blekk)}
  .soyle-spor{background:var(--strek);border-radius:6px;height:16px;overflow:hidden}
  .soyle-fyll{height:100%;border-radius:6px}
  .soyle-tom{background:transparent}
  .soyle-pct{font-size:12px;font-weight:600;text-align:right;color:var(--blekk)}
  .soyle-strek{color:var(--grunn);font-weight:400}
  .antall-note{font-size:11px;color:var(--grunn);margin:8px 0 0}
  .retning{font-size:11px;color:var(--grunn);margin:6px 0 0;font-style:italic}

  /* Terskel + homogen */
  .terskel{font-size:13px;color:var(--blekk);background:var(--lys);border:1px solid var(--strek);border-radius:8px;padding:10px 12px;margin:2px 0}
  .homogen{font-size:12px;color:var(--grunn);margin:2px 0}

  /* Kjønnsdelt */
  .kjonn-rad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .kjonn-kort{border:1px solid var(--strek);border-radius:10px;padding:10px}
  .kjonn-tittel{font-size:13px;margin:0 0 8px;color:var(--petrol)}
  .kjonn-kort .soyle-rad{grid-template-columns:1fr 40px}
  .kjonn-kort .soyle-spor{display:none}
  .kjonn-kort .soyle-tekst{font-size:11px}

  /* Utvikling */
  .utvikling-liste{margin:0;padding-left:18px;font-size:13px}
  .tom-utvikling{font-size:13px;color:var(--grunn);background:var(--lys);border-radius:8px;padding:12px}

  /* Metodefotnote */
  .metode{page-break-before:always;font-size:12px;color:var(--grunn);border-top:2px solid var(--strek);padding-top:14px;margin-top:20px;line-height:1.7}
  .metode h2{font-size:15px;color:var(--blekk);margin:0 0 8px}
  footer{margin-top:16px;color:var(--grunn);font-size:11px;text-align:right} /* #6b7280 = 4,8:1 (WCAG AA) */
</style></head><body${print ? ' onload="window.focus(); window.print();"' : ''}>

  <!-- §6 FORSIDE -->
  <div class="forside">
    <img src="/tl-logo.png" alt="Trivselsleder">
    <h1>${esc(oversett('tu.rapport.forside.tittel'))}</h1>
    <div class="under">${esc(skoleNavn)}</div>
    <div class="under">${esc(gruppeNavn)}</div>
    <div class="dato">${esc(oversett('tu.rapport.forside.dato', { dato: rundedato }))}</div>
  </div>

  <!-- §2 HOVEDBILDE -->
  <h2 class="del-tittel">${esc(oversett('tu.rapport.hoved.tittel'))}</h2>
  <p class="del-intro">${esc(oversett('tu.rapport.hoved.intro'))}</p>
  ${hovedHtml}

  <!-- §3 KJØNNSDELT -->
  <h2 class="del-tittel" style="page-break-before:always">${esc(oversett('tu.rapport.kjonn.tittel'))}</h2>
  <p class="del-intro">${esc(oversett('tu.rapport.kjonn.intro'))}</p>
  ${kjonnHtml}

  <!-- §4 UTVIKLING -->
  <h2 class="del-tittel" style="page-break-before:always">${esc(oversett('tu.rapport.utvikling.deltittel'))}</h2>
  ${utviklingSeksjon({ utvikling, oversett })}

  <!-- §6 METODEFOTNOTE -->
  <div class="metode">
    <h2>${esc(oversett('tu.rapport.metode.tittel'))}</h2>
    <p>${esc(oversett('tu.rapport.metode.tekst'))}</p>
  </div>

  <footer>${esc(oversett('tu.rapport.bunntekst'))}</footer>
</body></html>`
}

// Åpner et rent utskriftsvindu (samme mønster som skrivUtPlan i periodeplanPdf.js).
export function skrivUtRapport(data, ctx) {
  const vindu = window.open('', '_blank')
  if (!vindu) {
    return false   // pop-up blokkert — kalleren viser vennlig melding
  }
  vindu.document.open()
  vindu.document.write(byggRapportHtml(data, { ...ctx, print: true }))
  vindu.document.close()
  return true
}
