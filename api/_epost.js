// Delte e-posthjelpere for alle Resend-rutene.
//
// Bakgrunn (14. sep 2026): seks ruter sendte ekte e-post uten å sjekke nødbremsen, og seks
// manglet logging til epost_logg. Det fantes INGEN delt hjelpefunksjon fra før — de 20 rutene som
// sjekket motor_aktiv kopierte samme blokk, og den var dessuten fail-OPEN (blokkerte kun på den
// eksplisitte verdien 'nei'). Denne fila samler begge delene ETT sted, fail-CLOSED.

// NØDBREMS — fail-closed. Ekte e-post går KUN ut når innstillinger.motor_aktiv === 'ja'.
// Er innstillingen fraværende, tom, uleselig, eller feiler oppslaget → INGEN e-post (arbeidsregel).
// Returnerer null når sending er tillatt, ellers { status, error } (samme form som vaktene i
// _vakt.js) som ruten kan sende rett ut.
export async function krevMotorAktiv(supabase) {
  const { data, error } = await supabase
    .from('innstillinger')
    .select('verdi')
    .eq('nokkel', 'motor_aktiv')
    .maybeSingle()
  const verdi = (data?.verdi ?? '').trim().toLowerCase()
  if (error || verdi !== 'ja') {
    return {
      status: 409,
      error: 'Nødbremsen er på: ekte e-postutsending er stanset (motor_aktiv må stå på «ja»).',
    }
  }
  return null
}

// Logg ETT e-postforsøk til epost_logg. Awaiter ALLTID (28.-aug-lærdommen: en insert uten await
// eller .then() blir aldri sendt — det holdt brukslogg tom i tre uker). Velter ALDRI utsendingen:
// feiler skrivingen, logges den i konsollen og e-posten regnes fortsatt som sendt. Ingen
// personopplysninger utover mottakerens navn/e-post — samme som det eksisterende mønsteret;
// mottakeren er alltid en voksen kontaktperson, aldri elevdata.
export async function loggEpost(supabase, { type, mottaker_epost, mottaker_navn = null, status, resend_id = null, feilmelding = null }) {
  try {
    const { error } = await supabase.from('epost_logg').insert({
      type,
      mottaker_epost,
      mottaker_navn,
      status,
      resend_id,
      feilmelding,
    })
    if (error) console.error(`[epost_logg] insert feilet (${type} → ${mottaker_epost}):`, error.message)
  } catch (e) {
    console.error(`[epost_logg] insert kastet (${type} → ${mottaker_epost}):`, e?.message || e)
  }
}
