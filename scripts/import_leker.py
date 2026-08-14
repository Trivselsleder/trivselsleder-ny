#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prøveimport (Steg 6): 20 leker fra Ramsalt game-nodes -> SQL for testbasen.
Parser metadata (Sted/Antall/Utstyr) fra fettekst, rydder brødtekst -> kronologi,
kobler utstyr + kategori (taksonomi), og peker på bilder (field_image/icon).
Media-binærfiler lastes IKKE opp her (egne steg: bilder->Storage, video->Bunny).
"""
import json, re, html, uuid, hashlib, sys, io, os

# Sti til Ramsalt-eksporten. Overstyr med argv[1] eller miljøvariabel RAMSALT_BASE.
# På Kjartans Mac: ~/Desktop/Min nettside/Ramsalt-eksport
BASE = (sys.argv[1] if len(sys.argv) > 1
        else os.environ.get("RAMSALT_BASE",
             os.path.expanduser("~/Desktop/Min nettside/Ramsalt-eksport")))
games = json.load(open(f"{BASE}/Content/game-nodes.json"))["items"]
eq_terms = json.load(open(f"{BASE}/Vocabularies/game_equipment-terms.json"))
eq_terms = eq_terms["items"] if isinstance(eq_terms, dict) and "items" in eq_terms else eq_terms
EQ = {int(t["tid"]): t["name"].strip() for t in eq_terms}

avvik = []  # (nid, tittel, melding)

def rid(nid):
    return str(uuid.UUID(hashlib.md5(f"game-{nid}".encode()).hexdigest()))

def strip_html(s):
    s = re.sub(r"\[\[\{.*?\}\]\]", " ", s, flags=re.S)   # media-embeds
    s = re.sub(r"(?i)</p\s*>", "\n\n", s)
    s = re.sub(r"(?i)<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n\s*\n+", "\n\n", s)
    return s.strip()

def between(a, b, s):
    m = re.search(re.escape(a) + r"\s*(.*?)\s*" + re.escape(b), s, re.S | re.I)
    return m.group(1).strip() if m else None

STED_UTE = ["ute", "skolegård", "skolegard", "uteområde", "utendørs", "friluft", "gress", "snø", "uteareal", "grus", "asfalt"]
STED_INNE = ["gymsal", "inne", "klasserom", "innendørs", "sal", "hall", "aula", "gymnastikksal"]

def parse_sted(t):
    if not t: return None
    low = t.lower()
    ute = any(w in low for w in STED_UTE)
    inne = any(w in low for w in STED_INNE)
    if ute and inne: return "begge"
    if ute: return "ute"
    if inne: return "inne"
    return None

def parse_antall(t):
    if not t: return (None, None, "antall tomt")
    s = t.lower().replace("–", "-").replace("—", "-")
    m = re.search(r"(\d+)\s*-\s*(\d+)", s)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return (min(a, b), max(a, b), None)
    open_words = ["flere", "oppover", "ubegrenset", "mange", "eller mer", "+"]
    nums = re.findall(r"\d+", s)
    if nums and any(w in s for w in open_words):
        return (int(nums[0]), None, None)
    if len(nums) == 1:
        return (int(nums[0]), int(nums[0]), None)
    if len(nums) >= 2:
        vals = [int(x) for x in nums]
        return (min(vals), max(vals), "flere tall – tolket som min/max")
    return (None, None, f"antall ikke tolket: {t!r}")

def split_body(flat):
    # fjern ledende metadata (Sted: … Antall: … Utstyr: <verdi>) uansett markup
    m = re.search(r"Sted:.*?Utstyr:\s*(.*?)(?:\n\n|\Z)", flat, re.S | re.I)
    return flat[m.end():].strip() if m else flat.strip()

def sqlstr(s):
    return "$lek$" + (s or "") + "$lek$"

# ---- utvalg: 20 leker fra dem med ren Sted/Antall/Utstyr-blokk ----
def has_meta(n):
    v = (n.get("field_description") or [{}])[0].get("value", "")
    return "Sted:" in v and "Antall:" in v and "Utstyr:" in v

kandidater = [n for n in games if has_meta(n)]
med_bilde = [n for n in kandidater if n.get("field_image") or n.get("field_icon")]
valgt = []
seen = set()
for n in med_bilde + kandidater:           # prioriter noen med bilde
    if n["nid"] in seen: continue
    seen.add(n["nid"]); valgt.append(n)
    if len(valgt) >= 20: break

# ---- generer SQL ----
out = io.StringIO()
w = out.write
w("-- 034_testimport_20leker.sql — PRØVEIMPORT (Steg 6). Idempotent (deterministiske uuid fra nid).\n")
w("-- Kilde: Ramsalt game-nodes (26. juni-eksport, utviklingsdatasett). Kun testbasen.\n")
w("-- Media-binærfiler er IKKE lastet opp; bilder ligger som pekere (storage_sti), video kommer senere.\n")
w("begin;\n\n")

ids = [rid(n["nid"]) for n in valgt]
w("-- rydd tidligere prøveimport for disse (idempotens)\n")
for i in ids:
    w(f"delete from medier where ressurs_id='{i}';\n")
    w(f"delete from ressurs_utstyr where ressurs_id='{i}';\n")
    w(f"delete from ressurs_kategori where ressurs_id='{i}';\n")
w("\n")

for n in valgt:
    nid = n["nid"]; rid_ = rid(nid)
    tittel = (n.get("title") or "").strip()
    value = (n.get("field_description") or [{}])[0].get("value", "")
    flat = strip_html(value)
    sted_t = between("Sted:", "Antall:", flat)
    antall_t = between("Antall:", "Utstyr:", flat)
    sted = parse_sted(sted_t)
    amin, amaks, aavvik = parse_antall(antall_t)
    body = split_body(flat)
    if not body:
        avvik.append((nid, tittel, "tom brødtekst etter rydding"))
    if sted is None:
        avvik.append((nid, tittel, f"sted ikke tolket: {sted_t!r}"))
    if aavvik:
        avvik.append((nid, tittel, aavvik))

    sted_sql = f"'{sted}'" if sted else "null"
    amin_sql = str(amin) if amin is not None else "null"
    amaks_sql = str(amaks) if amaks is not None else "null"

    w(f"-- nid {nid}: {tittel}\n")
    w("insert into ressurser (id, ressurstype, sted, antall_min, antall_maks, status)\n")
    w(f"values ('{rid_}','lek',{sted_sql},{amin_sql},{amaks_sql},'publisert')\n")
    w("on conflict (id) do update set sted=excluded.sted, antall_min=excluded.antall_min, "
      "antall_maks=excluded.antall_maks, status=excluded.status, endret_at=now();\n")
    w("insert into ressurs_innhold (ressurs_id, sprak, tittel, kronologi, ferskhet)\n")
    w(f"values ('{rid_}','nb',{sqlstr(tittel)},{sqlstr(body)},'gjeldende')\n")
    w("on conflict (ressurs_id, sprak) do update set tittel=excluded.tittel, "
      "kronologi=excluded.kronologi, ferskhet='gjeldende';\n")

    # utstyr (taksonomi via target_id)
    eqs = []
    for e in (n.get("field_game_equipment") or []):
        tid = int(e.get("target_id"))
        navn = EQ.get(tid)
        if navn: eqs.append(navn)
        else: avvik.append((nid, tittel, f"ukjent utstyr-tid {tid}"))
    for navn in dict.fromkeys(eqs):
        w(f"insert into utstyr (navn) values ({sqlstr(navn)}) on conflict (navn) do nothing;\n")
        w(f"insert into ressurs_utstyr (ressurs_id, utstyr_id) select '{rid_}', id from utstyr where navn={sqlstr(navn)} on conflict do nothing;\n")

    # kategori: IKKE koblet i prototypen (game_category vs vår kategori-modell er en
    # taksonomi-vask-beslutning for den store importen) – logges kun.
    for c in (n.get("field_game_category") or []):
        navn = (c.get("name") or "").strip()
        if navn:
            avvik.append((nid, tittel, f"game_category «{navn}» ikke koblet (taksonomikartlegging gjenstår)"))

    # bilder (pekere)
    rekkef = 0
    for fld, mtype in (("field_image", "bilde"), ("field_icon", "bilde")):
        for m in (n.get(fld) or []):
            uri = m.get("uri") or ""
            fn = m.get("filename") or ""
            w(f"insert into medier (ressurs_id, type, storage_sti, original_filnavn, rekkefolge) "
              f"values ('{rid_}','{mtype}',{sqlstr(uri)},{sqlstr(fn)},{rekkef});\n")
            rekkef += 1

    if n.get("field_contains_video"):
        avvik.append((nid, tittel, "har video-flagg – avventer Bunny-opplasting (ingen medier-rad laget)"))
    # inline media-fids som ikke er løst
    inline = re.findall(r'\[\[\{.*?"fid":"?(\d+)"?.*?\}\]\]', value, re.S)
    if inline:
        avvik.append((nid, tittel, f"inline bilde-fids ikke løst: {', '.join(inline)}"))
    w("\n")

w("commit;\n")

open("/home/claude/import/034_testimport_20leker.sql", "w").write(out.getvalue())

# ---- avvikslogg ----
log = io.StringIO()
log.write(f"PRØVEIMPORT – {len(valgt)} leker valgt (av {len(kandidater)} med ren metadatablokk).\n")
log.write("Valgte nid+tittel:\n")
for n in valgt:
    log.write(f"  {n['nid']}: {n.get('title','').strip()}\n")
log.write(f"\nAVVIK ({len(avvik)}):\n")
for nid, tit, m in avvik:
    log.write(f"  nid {nid} «{tit}»: {m}\n")
open("/home/claude/import/avvikslogg.txt", "w").write(log.getvalue())

print(f"OK: {len(valgt)} leker, SQL {len(out.getvalue())} tegn, {len(avvik)} avvik.")
print("--- avvikslogg ---")
print(log.getvalue())
