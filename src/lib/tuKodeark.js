// Avhengighetsfritt, utskrivbart KODEARK for Trivselsundersøkelsen (steg 4.3).
// Samme mønster som periodeplanPdf/tuForeldreinfo: bygg et rent dokument og
// åpne nettleserens «Lagre som PDF»/utskrift-dialog.
//
// Ett ark (dvs. én seksjon med sideskift) PER GRUPPE. Én rad per kode:
// QR + koden i stor skrift + kort instruks. INGEN radnummer, INGEN navn —
// radene er klippelapper, én til hver elev, og skal ikke kunne knyttes til
// noen. Topp/bunn er merket med skole, gruppe, runde/trinn, svar-adresse og
// frist (byggeplan 4.3).
//
// QR-bildene lages av kalleren (qrcode-biblioteket, allerede en avhengighet)
// og sendes inn som data-URL-er — denne fila bygger bare dokumentet.
// All synlig tekst via i18n (no + sv). Rå-kodene finnes kun i minnet.

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function datoTekst(iso, spraak) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(spraak === 'sv' ? 'sv-SE' : 'nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// t = i18next-oversetter. Data:
//   skoleNavn, svarUrl (menneskelig adresse som vises/tastes),
//   grupper: [{ gruppeNavn, trinn, frist, koder: [{ kode, qrDataUrl }] }]
export function byggKodearkHtml(t, { skoleNavn, svarUrl, grupper, spraak }, { print = false } = {}) {
  const sider = (grupper || [])
    .map((g) => {
      const gruppeTekst = g.gruppeNavn
        ? t('tu.ark.gruppe', { gruppe: g.gruppeNavn, trinn: g.trinn })
        : t('tu.ark.heleTrinnet', { trinn: g.trinn })
      const rader = (g.koder || [])
        .map(({ kode, qrDataUrl }) => `
      <div class="lapp">
        ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="" />` : '<span class="qr qr-tom"></span>'}
        <div class="lapp-tekst">
          <div class="kode">${esc(kode)}</div>
          <div class="instruks">${esc(t('tu.ark.instruks', { url: svarUrl }))}</div>
          <div class="frist">${esc(t('tu.ark.frist', { dato: datoTekst(g.frist, spraak) }))}</div>
        </div>
      </div>`)
        .join('\n')

      return `
  <section class="ark">
    <header>
      <div>
        <h1>${esc(t('tu.ark.tittel'))}</h1>
        <p class="meta"><strong>${esc(skoleNavn || '')}</strong> · ${esc(gruppeTekst)}</p>
      </div>
      <div class="hoyre">
        <p class="meta">${esc(t('tu.ark.adresse', { url: svarUrl }))}</p>
        <p class="meta">${esc(t('tu.ark.frist', { dato: datoTekst(g.frist, spraak) }))}</p>
      </div>
    </header>
    <p class="klipp">✂ ${esc(t('tu.ark.klipp'))}</p>
    <div class="lapper">${rader}</div>
    <footer>${esc(t('tu.ark.bunn', { skole: skoleNavn || '' }))} · ${esc(gruppeTekst)}</footer>
  </section>`
    })
    .join('\n')

  return `<!doctype html><html lang="${spraak === 'sv' ? 'sv' : 'nb'}"><head><meta charset="utf-8"><title>${esc(t('tu.ark.tittel'))}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;margin:0;font-size:12px}
  section.ark{page-break-after:always}
  section.ark:last-child{page-break-after:auto}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:3px solid #FF7B31;padding-bottom:8px}
  h1{margin:0;font-size:17px;color:#111827}
  .meta{margin:2px 0 0;font-size:11px;color:#374151}
  .hoyre{text-align:right}
  .klipp{color:#6b7280;font-size:10px;margin:6px 0 2px}
  .lapper{display:block}
  .lapp{display:flex;align-items:center;gap:10px;border-bottom:1.5px dashed #9ca3af;padding:7px 2px;break-inside:avoid}
  .qr{width:21mm;height:21mm;flex:0 0 auto}
  .qr-tom{display:inline-block;border:1px dashed #d1d5db}
  .lapp-tekst{min-width:0}
  .kode{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:3px;color:#111827}
  .instruks{font-size:10.5px;color:#374151;margin-top:2px}
  .frist{font-size:10.5px;color:#6b7280;margin-top:1px}
  footer{margin-top:10px;color:#9ca3af;font-size:9px;text-align:right}
</style></head><body${print ? ' onload="window.focus(); window.print();"' : ''}>
${sider}
</body></html>`
}

// Åpner utskriftsvinduet. Returnerer false hvis nettleseren blokkerte pop-up
// (samme kontrakt som lastNedForeldreinfo — kalleren viser vennlig beskjed).
export function skrivUtKodeark(t, data) {
  const vindu = window.open('', '_blank')
  if (!vindu) return false
  vindu.document.open()
  vindu.document.write(byggKodearkHtml(t, data, { print: true }))
  vindu.document.close()
  return true
}
