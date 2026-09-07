// EKTE CSV-PARSER (RFC 4180-nær). Kravet fra Fable-kontrollen av fagmapping-filene:
// ALDRI split('\n') — CSV-ene har CRLF, og «Matematikk\r» er ikke byte-lik «Matematikk»,
// så en naiv splitt gir null treff UTEN feilmelding. Denne parseren:
//   - håndterer både CRLF og LF som radskille (og svelger \r foran \n),
//   - respekterer siterte felt ("..."), komma inni sitat, og "" som escaped anførselstegn.
//
// Returnerer rader som string-arrayer. parseCsvObjekter gir rad-objekter med header som nøkler.

export function parseCsv(tekst) {
  const rader = []
  let felt = '', rad = [], iSitat = false
  const t = tekst == null ? '' : String(tekst)
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (iSitat) {
      if (c === '"') {
        if (t[i + 1] === '"') { felt += '"'; i++ }   // "" → literal "
        else iSitat = false
      } else felt += c
    } else {
      if (c === '"') iSitat = true
      else if (c === ',') { rad.push(felt); felt = '' }
      else if (c === '\n') { rad.push(felt); rader.push(rad); rad = []; felt = '' }
      else if (c === '\r') {                          // CRLF: svelg \r, la \n avslutte raden.
        if (t[i + 1] === '\n') { /* svelg — \n-grenen pusher raden */ }
        else { rad.push(felt); rader.push(rad); rad = []; felt = '' }   // ensom \r = radskille
      } else felt += c
    }
  }
  if (felt !== '' || rad.length) { rad.push(felt); rader.push(rad) }
  return rader
}

// Header-rad → liste med objekter. Tomme haleliner droppes.
export function parseCsvObjekter(tekst) {
  const rader = parseCsv(tekst).filter(r => !(r.length === 1 && r[0] === ''))
  if (!rader.length) return []
  const hdr = rader[0].map(h => h.trim())
  return rader.slice(1).map(r => Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? ''])))
}
