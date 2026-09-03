# Arkiv: SQL før uavhengig kontroll

Filene her (`*.FØR-KONTROLL.sql.bak`) er migrasjons-SQL slik den så ut **før** den
uavhengige Fable-kontrollen — utkastet, ikke fasiten.

- **De er IKKE migrasjoner og skal ALDRI kjøres.** Den kjørte, godkjente versjonen ligger
  i `supabase/migrations/` (089, 090).
- De ligger her for at en fremtidig leser skal kunne se **hva kontrollen fanget**: diff en
  `.bak`-fil mot den tilsvarende ekte migrasjonen i `supabase/migrations/`.
- Migrasjonskjøreren (`scripts/migrasjonskjorer/`) ignorerer dem automatisk fordi den
  filtrerer på `.sql`-endelse — disse ender på `.sql.bak`.
