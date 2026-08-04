// Plassholder-maskineri for tekster som redigeres i innstillinger-tabellen.
//
// SØSTERKODE: api/kurs/send-invitasjon.js og api/kurs/send-oppfolging.js har
// de samme to funksjonene for e-post. De MÅ oppføre seg likt, ellers ser en
// skole én ting i e-posten og noe annet på kursinformasjonssiden.
// Endres reglene her, endres de samme stedene i api/ i SAMME operasjon.
//
// Regel 1 — fyllPlassholdere: {navn} byttes ut med verdien. Er nøkkelen ukjent,
//           blir {navn} stående, så en skrivefeil i malen synes med én gang.
// Regel 2 — fjernTommePlassholderLinjer: er en KJENT plassholder tom, fjernes
//           HELE linja. «Oppmøte: » uten klokkeslett er verre enn ingen linje.

export function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}

export function fjernTommePlassholderLinjer(mal, verdier) {
  return String(mal || '')
    .split('\n')
    .filter(linje => {
      const tokens = linje.match(/\{(\w+)\}/g) || []
      return !tokens.some(t => {
        const nokkel = t.slice(1, -1)
        return nokkel in verdier && (verdier[nokkel] === '' || verdier[nokkel] == null)
      })
    })
    .join('\n')
}
