# STATUS — Kursplanlegger (trivselsleder.no)

_Sist oppdatert: 17. juni 2026_

## Hvor vi er
**3,5 av 5 steg ferdige.** QuestBack-erstatteren (skolens svar-skjema) er ferdig, testet og live. RA sin live svar-oversikt (detaljnivå) er bygd og bekreftet.

## Ferdig og pushet
- **Datamodell**: tabeller for haller, kursholdere, kurs, kurs_skole. Tre registre med søk/rediger/slett.
- **Steg 1 — Opprett kurs**: smart skjema (søkbar nettverk-/hall-velger, auto-RA, auto-uke, default-tid 09:00–13:00, auto-kursnavn, auto-telling av skoler).
- **Steg 2 — Koble skoler til kurs**: auto-forslag fra nettverket.
- **Steg 3 — Skolens svar-skjema (QuestBack-erstatter)**: FERDIG OG TESTET.
  - Hver kobling har hemmelig token (lenke_token) = garderobelappen.
  - Sikkert oppslag via databasefunksjoner (Monster B): hent_kurs_skole_via_token og lagre_skole_svar. Anon kan IKKE rore tabellen direkte, kun kalle funksjonene.
  - Skjema: src/pages/SvarSkjema.jsx, rute /svar/:token (apen, ingen innlogging).
  - Sporsmal folger konseptdokumentet pkt. 14: Kommer? (alle) -> antall TL + annen info (kun ja) -> vertskap (kun er_vertskap OG ja) -> arsak (kun nei). Pluss avkrysning "apen for annet kurs" ved nei (lagres i apen_for_annet_kurs).
  - Testet ende-til-ende: svar lagres, takk-side vises, RA ser det i oversikten.
- **Steg 4 (delvis) — RA live svar-oversikt, detaljniva**: FERDIG OG TESTET.
  - src/pages/SvarOversikt.jsx, apnes som modal via "Se svar"-knapp i kursplanleggeren.
  - Viser tellere (X av Y svart / kommer / kommer ikke) + kort per skole med svarene.

## Gjenstar
- **Steg 4 (resten av RA-admin)**:
  - Metaoversikt / dashboard: totaltall pa tvers + filter "mine nettverk / alle".
  - "Melding fra skole" vist pa kurskort med handtert-avkryssing.
  - Send lenker-knapp (henger sammen med Resend = steg 5).
  - Flytteforesporsler: skolen soker om annet kurs (geografisk naerhet via nettverk + uke, IKKE koordinater), RA godkjenner/avslar/svarer. "Apen for annet kurs"-signalet er allerede fanget.
- **Steg 5 — Purringer + paminnelser**: Resend + cron.

## Senere (fra konseptdokumentet)
- Kursinformasjonsside skolen sendes til etter send (pkt. 4).
- Kortberegning til Camilla: antall_tl + 10 % rundet opp (pkt. 11).
- Churn-flagg pa nei-svar (varsel, ikke automatikk) (pkt. 8).
- Kopier kursplan sesong-til-sesong (pkt. 6).
- Evaluering etter kurs (Fase 2, pkt. 10).

## Tekniske notater
- Stack: React + Vite + Tailwind pa Vercel. Supabase (zpirjbrcbeubwpmtncxx). GitHub: Trivselsleder/trivselsleder-ny.
- Arbeidsflyt: SQL i Supabase FOR kode pushes.
- Brandfarger: oransje #F47920, magenta #D6006E.
- Vite kan bytte port (5173 -> 5174). Rydd med pkill -f vite. Innlogging folger ikke med ved portbytte.
- kurs_skole-relasjon: .select('... skoler(navn, kommunenavn)').

## Neste handling
Bygge metaoversikten (dashboard med totaltall + mine/alle-filter) som toppniva over "Se svar"-detaljvisningen.
