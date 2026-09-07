// Delt kø-rad-bygger for skrivelagets pass (redaksjonell_ko, migr 093).
// Kolonner: beskrivelse/forslag (IKKE forklaring — G3). Typene må matche rk_type_gyldig
// EKSAKT (ren ASCII). id inkluderer type + alle subjekt-pekere (A5: medie_id må med, ellers
// overskriver to avvik på samme lek hverandre stille).
import { detUuid } from './uuid.mjs'

export function køRad(kjoringId, {
  type, beskrivelse, forslag = null,
  ressurs_id = null, dokument_id = null, medie_id = null, samling_id = null, kompetansemaal_id = null,
}) {
  const nøkkel = [kjoringId, type, ressurs_id, dokument_id, medie_id, samling_id, kompetansemaal_id,
    (beskrivelse || '').slice(0, 40)].join('|')
  return {
    id: detUuid('ko', nøkkel), type,
    ressurs_id, dokument_id, medie_id, samling_id, kompetansemaal_id,
    import_kjoring_id: kjoringId,
    beskrivelse: beskrivelse || null, forslag, status: 'ny',
  }
}
