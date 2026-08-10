// FELLES VAKT for endepunkter som bruker service-nøkkelen.
//
// Et endepunkt med SUPABASE_SERVICE_ROLE_KEY går utenom alle sperrer i basen.
// Da må det selv sjekke hvem som ringer på — ellers står det åpent for hele
// internett. ProtectedRoute i frontenden skjuler bare knappene; den stopper
// ingen som skriver adressen rett inn.
//
// Mønsteret er hentet ordrett fra api/auth/inviter-bruker.js og api/admin/*,
// men samlet ett sted så det ikke kan gå i utakt neste gang.
//
// BEVIS PÅ AT DETTE TRENGTES (5. august 2026): et åpent GET-kall mot
// /api/kurs/hvem-star-for-tur returnerte skolenavn, kontaktnavn, e-postadresser
// og kursdatoer for hele basen, uten innlogging. Nødbremsen hjelper ikke der —
// den stopper utsending, ikke lesing.

const ANSATTROLLER = ['superadmin', 'ansatt']

// Returnerer null når kallet er i orden, ellers { status, error }.
// Kall den FØR du validerer req.body — en fremmed skal få 401, ikke 400.
export async function krevAnsatt(req, supabase) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { status: 401, error: 'Ikke autentisert.' }
  }
  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!caller) {
    return { status: 401, error: 'Ugyldig sesjon — last inn siden på nytt.' }
  }
  // profiles.aktiv finnes igjen etter at migrasjon 005 ble kjørt 10. aug (den
  // var skrevet, men aldri kjørt mot live-basen). Vi velger derfor 'rolle,
  // aktiv' og håndhever begge: feil rolle → 403, og en deaktivert ansatt
  // (aktiv = false) → 403 selv om sesjonen ennå lever.
  //
  // HISTORIKK: 5.–10. aug valgte denne 'rolle, aktiv' mot en base som IKKE hadde
  // aktiv-kolonnen → spørringen feilet → profil ble null → ALLE innloggede
  // ansatte fikk 403. (Cron slapp gjennom fordi CRON_SECRET sjekkes FØR denne
  // funksjonen.) Nå finnes kolonnen; alle eksisterende profiler har aktiv = TRUE
  // (default), så ingen låses ute.
  const { data: profil } = await supabase
    .from('profiles').select('rolle, aktiv').eq('id', caller.id).single()
  if (!ANSATTROLLER.includes(profil?.rolle)) {
    return { status: 403, error: 'Ingen tilgang.' }
  }
  if (profil?.aktiv === false) {
    return { status: 403, error: 'Kontoen er deaktivert.' }
  }
  return null
}

// TRYGG ORIGIN.
// Flere endepunkter bygger lenker som sendes på e-post (invitasjon, sett
// passord, tilbakestill passord). Tok de `req.headers.origin` rått, kunne hvem
// som helst be om en tilbakestillingslenke som pekte på sin EGEN side — og
// e-posten ville komme fra trivselsleder.no. Det er kontokapring i to steg.
//
// Lista er HARDKODET med vilje. Dette er et forsvar, ikke en innstilling: den
// skal ikke kunne endres fra admin-siden, og ikke av den som ringer.
const TILLATTE_ORIGIN = [
  'https://trivselsleder.no',
  'https://www.trivselsleder.no',
  'https://trivselsleder-ny.vercel.app',
]
const STANDARD_ORIGIN = 'https://trivselsleder.no'

export function trygtOrigin(req) {
  const onsket = req.headers?.origin
  return TILLATTE_ORIGIN.includes(onsket) ? onsket : STANDARD_ORIGIN
}

// For endepunkter som BÅDE kjøres av Vercel-cron og av en ansatt som trykker
// en knapp. Vercel sender selv «Authorization: Bearer <CRON_SECRET>» til
// cron-stier — men KUN hvis miljøvariabelen CRON_SECRET finnes i prosjektet.
// Er den ikke satt, slipper ingen cron gjennom. Det er med vilje: da stopper
// den daglige jobben synlig, i stedet for at endepunktet står åpent i stillhet.
export async function krevCronEllerAnsatt(req, supabase) {
  const hemmelighet = process.env.CRON_SECRET
  if (hemmelighet && req.headers.authorization === `Bearer ${hemmelighet}`) {
    return null
  }
  return krevAnsatt(req, supabase)
}
