// Avhengighetsfri PDF/utskrift av én lek (8-punktsmalen). Browserens «Lagre som PDF».
const PUNKTER = [
  ['formaal', 'Formålet'],
  ['forberedelse', 'Forberedelse'],
  ['inndeling', 'Inndeling'],
  ['utgangsposisjon', 'Utgangsposisjon'],
  ['kronologi', 'Slik gjør dere det'],
  ['regler', 'Regler'],
  ['variasjoner', 'Variasjoner og tilpasninger'],
  ['instruktoernotat', 'Notat til den voksne'],
]

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function byggLekHtml(lek) {
  const t = lek.tekst || {}
  const meta = [
    lek.sted && `<b>Sted:</b> ${esc(lek.sted)}`,
    (lek.antallMin != null || lek.antallMaks != null) && `<b>Antall:</b> ${esc(lek.antallMin)}–${esc(lek.antallMaks)}`,
    lek.trinn?.length && `<b>Trinn:</b> ${esc(lek.trinn.map((x) => x.navn).join(', '))}`,
    lek.utstyr?.length ? `<b>Utstyr:</b> ${esc(lek.utstyr.join(', '))}` : `<b>Utstyr:</b> Ingen`,
  ].filter(Boolean).join('<br>')

  const seksjoner = PUNKTER
    .filter(([k]) => t[k])
    .map(([k, label]) => `<section><h2>${label}</h2><p>${esc(t[k]).replace(/\n/g, '<br>')}</p></section>`)
    .join('')

  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${esc(lek.tittel)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;margin:0;line-height:1.5}
  header{border-bottom:3px solid #F47920;padding-bottom:10px;margin-bottom:14px}
  h1{margin:0;font-size:24px}
  .meta{font-size:12px;color:#374151;margin-top:8px}
  h2{font-size:14px;color:#111827;margin:14px 0 2px}
  p{margin:0;font-size:12px;white-space:pre-line}
  footer{margin-top:22px;color:#9ca3af;font-size:10px;text-align:right}
</style></head><body onload="window.focus(); window.print();">
  <header><h1>${esc(lek.tittel)}</h1><div class="meta">${meta}</div></header>
  ${seksjoner || '<p>Ingen beskrivelse.</p>'}
  <footer>Skrevet ut fra trivselsleder.no</footer>
</body></html>`
}

export function skrivUtLek(lek) {
  const vindu = window.open('', '_blank')
  if (!vindu) { alert('Tillat pop-up-vinduer for å laste ned PDF.'); return }
  vindu.document.open()
  vindu.document.write(byggLekHtml(lek))
  vindu.document.close()
}
