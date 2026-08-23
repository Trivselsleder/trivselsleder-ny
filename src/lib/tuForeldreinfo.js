// Avhengighetsfritt, nedlastbart foreldreinfo-skriv (TU beslutning D, 21. aug).
// Samme mønster som periodeplanPdf: bygg et rent dokument og åpne nettleserens
// «Lagre som PDF»-dialog. Teksten er E.2-malen (TU-morgenpakke) koblet til
// B1-språket — JURISTEN godkjenner ordlyden før ekte elever (byggeplanen).
// All tekst hentes via i18n (no + sv) — ingen hardkodede strenger her.

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// t = i18next-oversetter, skoleNavn = settes inn der malen sier [skole].
export function byggForeldreinfoHtml(t, skoleNavn, { print = false } = {}) {
  const skole = skoleNavn || t('tu.laerer.foreldreinfo.skolePlassholder')
  const tittel = t('tu.laerer.foreldreinfo.tittel', { skole })
  const avsnitt1 = t('tu.laerer.foreldreinfo.avsnitt1', { skole })
  const anonymTittel = t('tu.laerer.foreldreinfo.anonymTittel')
  const anonymTekst = t('tu.laerer.foreldreinfo.anonymTekst')
  const frivilligTittel = t('tu.laerer.foreldreinfo.frivilligTittel')
  const frivilligTekst = t('tu.laerer.foreldreinfo.frivilligTekst')
  const kontakt = t('tu.laerer.foreldreinfo.kontakt')

  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${esc(tittel)}</title>
<style>
  @page { size: A4 portrait; margin: 22mm; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;margin:0;line-height:1.6;font-size:13px}
  header{border-bottom:3px solid #FF7B31;padding-bottom:10px;margin-bottom:18px}
  h1{margin:0;font-size:20px;color:#111827}
  h2{font-size:14px;margin:18px 0 4px;color:#111827}
  p{margin:8px 0}
  footer{margin-top:28px;padding-top:10px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:10px}
</style></head><body${print ? ' onload="window.focus(); window.print();"' : ''}>
  <header><h1>${esc(tittel)}</h1></header>
  <p>${esc(avsnitt1)}</p>
  <h2>${esc(anonymTittel)}</h2>
  <p>${esc(anonymTekst)}</p>
  <h2>${esc(frivilligTittel)}</h2>
  <p>${esc(frivilligTekst)}</p>
  <p>${esc(kontakt)}</p>
  <footer>Trivselsleder AS · trivselsleder.no</footer>
</body></html>`
}

export function lastNedForeldreinfo(t, skoleNavn) {
  const vindu = window.open('', '_blank')
  if (!vindu) return false
  vindu.document.write(byggForeldreinfoHtml(t, skoleNavn, { print: true }))
  vindu.document.close()
  return true
}
