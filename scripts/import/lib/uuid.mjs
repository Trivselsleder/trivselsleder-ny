// Deterministisk UUID fra Drupal-node (mønster fra migr 034, verifisert):
//   uuid = md5("<nodetype>-<nid>") formatert 8-4-4-4-12.
// Bevist: md5("game-1422") = 3820b754-2bc0-a877-c52f-0a1c45d313ed (= raden i migr 034).
// MERK: dette er IKKE en RFC-4122 v4/v5-UUID (versjons-/variantbitene settes ikke) — det er
// et md5-avtrykk formatert som UUID, med vilje likt migr 034 så prøveimport-radene er de samme.
import { createHash } from 'node:crypto'

export function detUuid(nodetype, nid) {
  const h = createHash('md5').update(`${nodetype}-${nid}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// Deterministisk UUID for en medie-rad (flere medier per ressurs): salt med fid + type.
export function detMedieUuid(nodetype, nid, fid, medietype) {
  const h = createHash('md5').update(`${nodetype}-${nid}-medie-${medietype}-${fid}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}
