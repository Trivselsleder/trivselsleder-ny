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

// SIKKER FALLBACK (testperioden). Havner vi utenfor headeren OG basen ikke gir
// et gyldig svar, skal lenken ALDRI peke på gamle trivselsleder.no — da ville
// konto-e-postene sendt brukeren til feil plattform. Vi faller derfor tilbake
// til den nye plattformen. Ved go-live settes nettsted_url i basen til
// produksjonsdomenet; denne konstanten er bare et siste sikkerhetsnett.
const SIKKER_FALLBACK = 'https://trivselsleder-ny.vercel.app'

// SYNKRON header-vakt. Beholdt uendret som forsvar mot kontokapring: den som
// ringer kan ikke få lenken til å peke på sin egen side, for origin-headeren
// valideres mot den hardkodede lista. Brukes fortsatt der vi bare trenger å
// vurdere headeren.
export function trygtOrigin(req) {
  const onsket = req.headers?.origin
  return TILLATTE_ORIGIN.includes(onsket) ? onsket : SIKKER_FALLBACK
}

// ASYNC origin med base-fallback. Rekkefølge:
//   1) Gyldig origin-header (på tillatt-lista) → bruk den. Forsvaret består:
//      en fremmed kan fortsatt ikke peke lenken mot sin egen side.
//   2) Ellers: les nettsted_url fra innstillinger — men KUN hvis verdien også
//      står på tillatt-lista. Basen kan altså ikke sette lenken til et vilkårlig
//      domene; forsvaret gjelder base-verdien like strengt som headeren.
//   3) Ellers (base nede, rad mangler, eller ugyldig verdi) → SIKKER_FALLBACK.
//      ALDRI gamle trivselsleder.no.
export async function trygFallbackOrigin(req, supabase) {
  const fraHeader = req.headers?.origin
  if (TILLATTE_ORIGIN.includes(fraHeader)) return fraHeader

  try {
    const { data } = await supabase
      .from('innstillinger')
      .select('verdi')
      .eq('nokkel', 'nettsted_url')
      .maybeSingle()
    const fraBase = (data?.verdi || '').trim().replace(/\/+$/, '')
    if (TILLATTE_ORIGIN.includes(fraBase)) return fraBase
  } catch (e) {
    console.error('trygFallbackOrigin: kunne ikke lese nettsted_url:', e.message)
  }

  return SIKKER_FALLBACK
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
