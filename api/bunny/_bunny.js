// FELLES BUNNY-HJELPERE for video-endepunktene (opprett-opplasting, slett-video, status).
//
// API-NØKKELEN FORLATER ALDRI SERVEREN. Nettleseren laster opp direkte til Bunny med en
// kortlivet TUS-signatur som utstedes her — selve AccessKey-en brukes bare i server→Bunny-kall.
//
// Miljøvariabler (samme navn som .env.import og importskriptet bruker):
//   BUNNY_API_KEY      — bibliotekets AccessKey (hemmelig, kun server).
//   BUNNY_LIBRARY_ID   — Stream-bibliotek-ID (727245 i dag; samme lib LekVisning bygger embed mot).

import crypto from 'node:crypto'

// Bunny Stream sitt API-vertsnavn (både video-CRUD og TUS-opplasting bor under dette domenet).
export const BUNNY_BASE = 'https://video.bunnycdn.com'

// Leser og validerer konfigurasjonen. Returnerer { apiKey, libraryId } eller { feil }.
// Mangler noe, feiler vi synlig (500) i stedet for å sende halvferdige Bunny-kall.
export function lesBunnyKonfig() {
  const apiKey = process.env.BUNNY_API_KEY
  const libraryId = process.env.BUNNY_LIBRARY_ID
  if (!apiKey || !libraryId) {
    return { feil: 'Bunny er ikke konfigurert (mangler BUNNY_API_KEY / BUNNY_LIBRARY_ID).' }
  }
  return { apiKey, libraryId: String(libraryId) }
}

// TUS-opplastingssignaturen Bunny krever: sha256(libraryId + apiKey + expire + videoId).
// Alle fire settes sammen som rene strenger i nøyaktig denne rekkefølgen; expire er unix-tid
// (sekunder). Ren funksjon (ingen env, ingen nettverk) — derfor enhetstestbar.
export function tusSignatur(libraryId, apiKey, expire, videoId) {
  return crypto
    .createHash('sha256')
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest('hex')
}
