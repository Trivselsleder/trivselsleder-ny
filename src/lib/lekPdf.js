// Avhengighetsfri PDF/utskrift av én lek (8-punktsmalen). Browserens «Lagre som PDF».
import { formaterAntall } from './leker'
import { beskrivelseTilBlokker } from './beskrivelse'

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
  const antall = formaterAntall(lek.antallMin, lek.antallMaks, lek.antallRaatekst)
  const meta = [
    lek.sted && `<b>Sted:</b> ${esc(lek.sted)}`,
    antall && `<b>Antall:</b> ${esc(antall)}`,
    lek.trinn?.length && `<b>Trinn:</b> ${esc(lek.trinn.map((x) => x.navn).join(', '))}`,
    lek.utstyr?.length ? `<b>Utstyr:</b> ${esc(lek.utstyr.join(', '))}` : `<b>Utstyr:</b> Ingen`,
  ].filter(Boolean).join('<br>')

  // Beskrivelsen (importert HTML) → enkle blokker → PDF-HTML. Avsnitt som tekst,
  // overskrift uthevet (h3), punkt med «• » foran.
  const blokker = beskrivelseTilBlokker(t.beskrivelse)
  const beskrivelseHtml = blokker
    ? blokker
        .map((b) => {
          const tx = esc(b.tekst).replace(/\n/g, '<br>')
          if (b.type === 'overskrift') return `<h3>${tx}</h3>`
          if (b.type === 'punkt') return `<p class="punkt">• ${tx}</p>`
          return `<p>${tx}</p>`
        })
        .join('')
    : ''

  const seksjoner = PUNKTER
    .filter(([k]) => t[k])
    .map(([k, label]) => `<section><h2>${label}</h2><p>${esc(t[k]).replace(/\n/g, '<br>')}</p></section>`)
    .join('')

  const omLeken = beskrivelseHtml ? `<section><h2>Om leken</h2>${beskrivelseHtml}</section>` : ''
  // «Ingen beskrivelse» KUN når både beskrivelsen og alle 8-punktene er tomme.
  const innhold = (omLeken + seksjoner) || '<p>Ingen beskrivelse.</p>'

  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${esc(lek.tittel)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;margin:0;line-height:1.5}
  header{border-bottom:3px solid #FF7B31;padding-bottom:10px;margin-bottom:14px}
  h1{margin:0;font-size:24px}
  .meta{font-size:12px;color:#374151;margin-top:8px}
  h2{font-size:14px;color:#111827;margin:14px 0 2px}
  h3{font-size:13px;color:#111827;margin:10px 0 2px;font-weight:bold}
  p{margin:0;font-size:12px;white-space:pre-line}
  p.punkt{margin-left:6px}
  footer{margin-top:22px;color:#9ca3af;font-size:10px;text-align:right}
</style></head><body onload="window.focus(); window.print();">
  <header><h1>${esc(lek.tittel)}</h1><div class="meta">${meta}</div></header>
  ${innhold}
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
