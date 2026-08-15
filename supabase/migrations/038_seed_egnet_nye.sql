-- 038 — Nye «egnet for»-verdier fra Min side-hero (15. aug 2026)
-- UTKAST til gjennomgang med Kjartan. Kjøres i Supabase SQL-editor FØR/sammen med
-- frontend-pushen som viser de 12 inngangene. Idempotent (on conflict do nothing) —
-- trygt å kjøre flere ganger.
--
-- Bakgrunn: Min side-hero + «Egnet for»-filteret i Finn en lek viser nå 12 innganger.
-- De 8 første finnes fra før (migr. 023). Disse fire er lagt til i frontend og må også
-- finnes som kategori i basen, ellers gir valg av dem 0 treff selv etter at leker merkes.
--
-- MERK (til avklaring):
--  * «Sosial kompetanse», «TL-Mester» og «Leker for 100+ elever» er egentlig «Tipslister»
--    (kuraterte samlinger) på dagens side. Vi legger dem her som egnet_kategori fordi
--    frontend behandler dem som egnet-verdier. Alternativ modell: legg dem i `kategorier`
--    (samlinger) i stedet. Lett å flytte senere.
--  * «Barnehage» finnes ALLEREDE som trinn ('bhg','Barnehage', migr. 023). Vi legger den
--    også som egnet_kategori her for at hero-boksen/​filteret skal virke uniformt — men
--    vurder å heller la Barnehage-boksen peke på trinn=bhg (frontend-fiks), så unngår vi
--    at samme begrep finnes to steder. Ta stilling til dette før leker merkes.

insert into egnet_kategori (navn, rekkefolge) values
  ('Sosial kompetanse', 9),
  ('TL-Mester', 10),
  ('Leker for 100+ elever', 11),
  ('Barnehage', 12)
on conflict (navn) do nothing;

-- Kontroll (kjør etterpå og verifiser 12 rader):
--   select navn, rekkefolge from egnet_kategori order by rekkefolge;
