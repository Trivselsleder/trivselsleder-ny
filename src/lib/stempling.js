// Ren avgjørelse: hvilken skole_id skal stemples på et brukssignal (visning/
// video_spilt/pdf_nedlastet/favoritt) i bruk_hendelse, slik at «Månedens lek»
// (migr 120) kan telle distinkte skoler per lek.
//
// INTERNE ROLLER (profiles.rolle 'superadmin'/'ansatt') stemples ALDRI: når de
// tester/simulerer en skole (Demoskolen, testkontoer) skal det ikke telle som ekte
// skolebruk. Uten skole → null (raden lagres fortsatt, men bidrar 0 skoler siden
// migr 120 filtrerer `skole_id is not null`).
//
// Skilt ut som REN funksjon (ingen supabase-/nettverksavhengighet) så avgjørelsen
// kan enhetstestes uten base — jf. scripts/test-stempling.mjs.
export function velgStemplingsSkole(rolle, skoleId) {
  const intern = rolle === 'superadmin' || rolle === 'ansatt'
  if (intern) return null
  return skoleId ?? null
}
