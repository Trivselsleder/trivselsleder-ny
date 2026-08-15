// Avhengighetsfri PDF/utskrift av en periodeplan som UKERUTENETT.
// Bygger et rent dokument (liggende/stående) og åpner nettleserens «Lagre som PDF».
import { lekEmoji, lekFarge } from './lekIkon'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function ukeTekst(plan) {
  const u = (plan.uker || []).join(', ')
  return [u ? `Uke ${u}` : '', plan.aar].filter(Boolean).join(' · ')
}

export function byggHtml(plan, { print = false } = {}) {
  const dager = plan.dager || []
  const ansv = plan.ansvarlige || {}
  const landscape = (plan.orientering || 'landscape') === 'landscape'

  const kolonnehoder = dager.map((d) => `<th>${esc(d)}</th>`).join('')
  const ansvRad =
    `<tr class="ans"><th class="lek">Ansvarlig</th>` +
    dager.map((d) => `<td class="ans">${esc(ansv[d]) || '—'}</td>`).join('') +
    `</tr>`

  const rader = (plan.rader || [])
    .map((r) => {
      const emoji = r.lek ? lekEmoji(r.lek) : '🎈'
      const farge = r.lek ? lekFarge(r.lek) : '#9ca3af'
      const celler = dager
        .map((d) => `<td class="tl">${esc((r.celler || {})[d]) || ''}</td>`)
        .join('')
      const sted = (r.celler || {})._sted
      return `<tr>
        <th class="lek"><span class="ikon" style="background:${farge}">${emoji}</span>${esc(r.lek?.tittel)}${sted ? `<div class="sted">📍 ${esc(sted)}</div>` : ''}</th>
        ${celler}
      </tr>`
    })
    .join('\n')

  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${esc(plan.navn)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 12mm; }
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;margin:0}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #FF7B31;padding-bottom:8px;margin-bottom:12px}
  h1{margin:0;font-size:20px} .uke{font-size:14px;color:#6b7280;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
  th,td{border:1px solid #d1d5db;padding:5px 6px;vertical-align:top}
  thead th{background:#FF7B31;color:#fff;text-align:center;font-size:12px}
  th.lek{background:#fff;color:#111827;text-align:left;width:190px;font-weight:600}
  th.lek .ikon{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;margin-right:6px;font-size:12px;vertical-align:middle}
  th.lek .sted{font-weight:400;font-size:9px;color:#6b7280;margin-top:2px}
  tr.ans td.ans, tr.ans th{background:#fde9dc;font-weight:600;text-align:center}
  td.tl{text-align:center;font-size:10px;color:#374151}
  tbody tr:nth-child(even) td.tl{background:#faf7f5}
  footer{margin-top:14px;color:#9ca3af;font-size:9px;text-align:right}
</style></head><body${print ? ' onload="window.focus(); window.print();"' : ''}>
  <header><h1>${esc(plan.navn)}</h1><div class="uke">${esc(ukeTekst(plan))}</div></header>
  <table>
    <thead><tr><th class="lek">Lek</th>${kolonnehoder}</tr></thead>
    <tbody>${ansvRad}${rader || `<tr><td colspan="${dager.length + 1}">Ingen leker lagt til.</td></tr>`}</tbody>
  </table>
  <footer>Skrevet ut fra trivselsleder.no</footer>
</body></html>`
}

export function skrivUtPlan(plan) {
  const vindu = window.open('', '_blank')
  if (!vindu) {
    alert('Kunne ikke åpne utskriftsvindu. Tillat pop-up-vinduer for denne siden og prøv igjen.')
    return
  }
  vindu.document.open()
  vindu.document.write(byggHtml(plan, { print: true }))
  vindu.document.close()
}
