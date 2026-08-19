# BYGGELISTE — kursplanleggeren etter høringen (17. aug 2026)
Grunnlag: claude_HORING-analyse-alle-seks.md. Svarmail SENDT til teamet 17. aug
(seks ansatte). Denne lista = det Kjartan har LOVET dem + rekkefølge.
Arbeidsform: ett punkt om gangen i Claude Code, stopp før push, ingenting
hukes av uten bevis. Test alltid på https://trivselsleder-ny.vercel.app

## SLIK STARTER DU EN ØKT
«Les STATUS.md, vi fortsetter med kursplanleggeren.» — så åpner Claude denne
lista, ser første uhakede punkt og foreslår det.

## A — TEKSTRETTELSER (raske, tas først)
[ ] A1 Vertskapstekst rettes: Ordbok, steg 4 og 6 i forklaringen + teksten
       skolen ser i svarskjemaet. Vertskap rigger IKKE — møter tidligere for å
       lære lekene av kursholder og leder øvrige deltakere. Hall ≠ vertskap.
[ ] A2 Rødt varsel omformuleres: «Vertskap sa NEI — pek ut nytt vertskap»
       (ikke «kurset kan stå uten hall»). Alvorlighet = bemanning, ikke krise.
[ ] A3 Evalueringsskjema: «Gullkorn» deles i to felt — «Gullkorn fra dagen» +
       «Noe som kunne vært bedre, eller annet dere vil si?»
[ ] A4 «Ca. hvor mange trivselsledere?» gjøres OBLIGATORISK (ca.-tall, +/-5).
[ ] A5 Ordbok: skjerp skillet purring (ikke svart) vs påminnelse (svart ja).
[ ] A6 Forklaringen steg 1: stryk «fem–seks skoler»-formuleringen.

## B — BYGGING (prioritert rekkefølge)
[ ] B1 «Purr alle ubesvarte»-knapp, med avhukbar liste for skjerming.
[ ] B2 Automatisk gjentakende purring innenfor trinnene: av/på per kurs,
       intervall i innstillinger-tabellen, skjermliste per skole, stopper ved
       svar eller passert kursdato. (LOVET: purringene gjentar seg automatisk
       til skolen svarer; RA setter politikk én gang.)
[ ] B3 Én automatisk evalueringspurring, noen dager etter kursdag, dager i
       innstillinger. Aldri mer enn én.
[ ] B4 Ønske-fritekstfelt i svarskjema når «åpen for annet kurs» hukes av.
       + egen invitasjonsvariant for flyttede skoler («dere er flyttet fra X»).
       Ubrukt felt onsket_kurs_id utgår.
[ ] B5 Kapasitetsvisning i flyttedialogen: «X av Y skoler svart ja, ca. Z TL
       (maks N)» fra levende tall (årets påmeldinger). Vises alltid, sperrer ALDRI.
[ ] B6 Kvitteringsmail etter innsendt svar: kurs, dato, hall, oppmøtetid +
       varig lenke til kursinfosiden. (Julies punkt.)
[ ] B7 Levende svarlenke: skolen kan åpne lenken igjen, se sitt svar og
       justere antall. Endring logges som i dag.
[ ] B8 «Allerede besvart»-visning i svarskjemaet: «[Navn] har allerede svart
       på vegne av [skole]» når lenke åpnes etter at svar finnes.
[ ] B9 Sendelogg per skole (hva, til hvilken adresse, når) + «Send på nytt»
       til enkeltskole + åpnet-status (sendt/levert/åpnet; «åpnet» er
       indikasjon, ikke bevis — gjelder e-post generelt).
[ ] B10 «Mine kurs» som standardvisning. FORUTSETNING: RA kobles til
        brukerkonto (fritekst-RA-feltet ryddes). + filter på kursholder og
        fylke i filterraden.
[ ] B11 Live per-skole-tabell på tvers av kurs: alle skoler, svar, antall,
        vertskap, trappstatus — filtrerbar. Eksportknapp = utskrift av
        visningen. (Erstatter Marielles QB/Forms-savn. Per-skole- og
        evaluerings-eksporten fra steg 12 bygges som del av dette.)
[ ] B12 RA-varsel (e-post el. daglig oppsummering) ved nei+«åpen for annet»
        og vertskaps-nei.
[ ] B13 Hallregister: adressefelt + søk på navn/sted/adresse.
[ ] B14 Skolenotater (f.eks. «kan ikke være vertskap, lang reisevei») +
        vertskapshistorikk som ren logg (hvem var vert på hvilke kurs når).
        IKKE noe «står for tur»-forslag.
[ ] B15 Omsorgs-mailmal «vi savnet dere» til nei-skoler (Ylvas skisse): leker
        som slo an, kurshefte, nominasjonslapper, evt. mildt forslag om å
        holde kurset lokalt DENNE gangen — MEN UTEN full bruksanvisning
        (bevisst, jf. churn-risiko). Peker mot neste kurs. Sendes manuelt av RA.

## HUBSPOT-SYNK — LOVET I TO STEG (viktig, se STATUS.md)
[ ] H1 STEG 1 (énveis, nettsiden -> HubSpot): skole endrer kontakt på nettsiden
        -> synkes automatisk til HubSpot. Løser Karis dobbeltføring. Praktisk
        regel til teamet: kontaktendringer gjøres PÅ NETTSIDEN.
        (Grunnbygget i Fase 2 — verifiser at det dekker det lovede: hvilke felt
        for rektor, hovedkontakt og TLA synker faktisk. Se STATUS.)
[ ] H2 STEG 2 (TOVEIS) — LOVET teamet i svarmailen: ansatte skal etter hvert
        også kunne endre kontakt i HubSpot og få det tilbakeført til nettsiden.
        Krever: konfliktregler (hva vinner ved samtidig endring begge steder),
        endringshistorikk, dublett-/løkkevern. Bygges robust, ikke hastverk.
        Hører til HubSpot-jobben mot slutten.
[ ] H3 «Send svar til skolen»-knapp — bygges KUN med HubSpot-logging (del av
        H1/H2-arbeidet). Delt team; logging er betingelsen. Venter.

## C — VENTER (besluttet, men senere)
[ ] C1 Kursholder-visning/eksport (Marielle + Tommy).
[ ] C2 Kalenderkobling, ics-feed per RA/kursholder. LOVET: etter lansering,
        behov først mot jul 2026 / jan 2027 for nye kurs.
[ ] C3 Kommune-filter i kurslisten.

## D — DROPPET (med begrunnelse i analysen)
- Skolen velger kurs selv. Bekreftelsesknapp på påminnelse. To evaluerings-
  purringer. «Slik holder du lokalt kurs selv»-oppskriften (full bruksanvisning).
  Smart rulleringsforslag for vertskap. Bredde-utsending av invitasjon som standard.

## HUSK
- Runde to kan komme fra Kari/Marielle — forklaringstekster låses ikke ennå.
- FØR mer bygging: verifiser (a) samme skole på to kurs, (b) at kontakt-synk
  nettside->HubSpot faktisk dekker rektor/hovedkontakt/TLA-feltene (begge lovet).
- Alt testes i tørrkjøring; motor forblir av til lansering.
