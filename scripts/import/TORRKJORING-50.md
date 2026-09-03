# Tørrkjøring — 50 tilfeldige leker (skjelettets selvtest)

**Generert av:** `node scripts/import/import.mjs --antall 50 --rapport ...` (TØRRMODUS — ingenting skrevet til noen base).
**Kjøring-id (deterministisk fra «torrkjoring-50»):** `1638ea43-5219-3b37-b118-c6d7a265d4af`
**Utvalg:** 50 leker, valgt reproduserbart ved stabil hash-sortering av nid (ingen Math.random).
**Kilde:** /Users/kjartaneide/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip (kun JSON-medlemmer lest via vakt; ingen binær-utpakking).
**Tid:** 293 ms.

## Hopp over
- Upubliserte leker hoppet over (globalt i eksporten): **15**. (wheel/play_schedule/advantages leses aldri.)

## Rader per tabell (i FK-skriverekkefølge)
| Tabell | Rader |
|---|---:|
| `import_kjoring` | 1 |
| `ressurser` | 50 |
| `ressurs_innhold` | 54 |
| `ressurs_kategori` | 49 |
| `ressurs_utstyr` | 72 |
| `ressurs_trinn` | 507 |
| `ressurs_egnet` | 4 |
| `medier` | 27 |
| `ressurs_dokument` | 10 |
| `redaksjonell_ko` | 15 |

## Antall-regel som traff (R1–R8)
| Regel | Leker |
|---|---:|
| R2 | 24 |
| R1 | 15 |
| mangler | 7 |
| R7 | 2 |
| utolkbar | 1 |
| R8 | 1 |

## Medier (safe_value file-div)
- Bilde: **3** · Video: **24** (video får `bunny_video_id=NULL` — fylles i fase 2).

## Avvik (redaksjonell_ko) per type
| Type | Antall |
|---|---:|
| annet | 12 |
| manglende_alttekst | 3 |

## Merknader
- `manglende_alttekst` = én per medie (eksporten har ingen alt-tekst på embeds) → tittel brukt som fallback, `alt_tekst_kilde='fallback'`, kø-rad opprettet. WCAG-kravet er dermed dekket midlertidig og synlig for redaksjonen.
- `annet` dekker bl.a. R5-usikkerhet, utolkbart antall, tom nynorsk-rad, YouTube-embed, og `field_icon`/`field_image` (strukturerte felt uten importregel — flagget, ikke gjettet).
- `ressurs_trinn` er mange rader fordi skoletype→trinn ekspanderer (B→1–7, U→8–10, K→1–10, BH→bhg); S→`ressurs_egnet` «SFO/AKS».
- Ingen `ressurs_kompetansemaal`-rader: kompetansemål hører til atlu (aktiv læring), ikke game-leker.
- `kan_ledes_av_elever` skrives ALDRI (ingen kilde) — utelatt fra insert, DB-default gjelder.

