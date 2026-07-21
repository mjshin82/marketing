"""One-shot Gamalytic harvest: cohort candidate sets via tag-filter queries.

Free tier: 250 requests/day, 1000 items/page, AND-semantics comma tag filter.
Response fields available on the free tier include steamId, name, releaseDate,
copiesSold, price, publisherClass — enough to (a) cross-validate the
review-to-sales multiplier per cohort and (b) patch H2-2025 supply coverage
that SteamSpy's catalog lag misses.

Cohort set algebra (mirrors collect/pipeline.py classify()):
  A = U(inc queries) - U(inc+Singleplayer)            [pure multi co-op]
  B = (Singleplayer & Story Rich) - U(B & excl_tag)   [story-rich single]
  R = U(rogue_tag) - U(rogue_tag & excl_tag)          [roguelike, no MP]

Output: data/gamalytic.jsonl (one record per query page) — set algebra is done
offline in analysis so raw pulls are never re-fetched.
"""
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "gamalytic.jsonl"
BASE = "https://api.gamalytic.com/steam-games/list"
FIELDS = ("steamId,name,releaseDate,firstReleaseDate,copiesSold,price,"
          "publisherClass,earlyAccess,reviewScore")
EXCL = ["Co-op", "Online Co-Op", "Local Co-Op", "Co-op Campaign",
        "Multiplayer", "Massively Multiplayer"]
ROGUE = ["Rogue-like", "Rogue-lite", "Action Roguelike",
         "Roguelike Deckbuilder", "Roguevania", "Traditional Roguelike"]

QUERIES = {}
for inc in ["Online Co-Op,Multiplayer", "Co-op,Multiplayer"]:
    QUERIES[f"A_inc|{inc}"] = inc
    QUERIES[f"A_exc|{inc},Singleplayer"] = f"{inc},Singleplayer"
QUERIES["B_inc|Singleplayer,Story Rich"] = "Singleplayer,Story Rich"
for t in EXCL:
    QUERIES[f"B_exc|SP,SR,{t}"] = f"Singleplayer,Story Rich,{t}"
for r in ROGUE:
    QUERIES[f"R_inc|{r}"] = r
    for t in EXCL:
        QUERIES[f"R_exc|{r},{t}"] = f"{r},{t}"

MAX_CALLS = 200


def main():
    session = requests.Session()
    session.headers["User-Agent"] = "insight1-research/0.1 (dev@concode.co)"
    calls = 0
    OUT.parent.mkdir(exist_ok=True)
    with OUT.open("w") as fh:
        for label, tags in QUERIES.items():
            page = 0
            while True:
                if calls >= MAX_CALLS:
                    print(f"call budget {MAX_CALLS} reached, stopping")
                    return
                r = session.get(BASE, params={
                    "limit": 1000, "page": page, "tags": tags,
                    "release_status": "released", "fields": FIELDS,
                }, timeout=30)
                calls += 1
                time.sleep(1.0)
                if r.status_code != 200:
                    print(f"[{label}] p{page} http {r.status_code}, skipping query")
                    break
                d = r.json()
                games = d.get("result") or []
                fh.write(json.dumps({"label": label, "tags": tags, "page": page,
                                     "total": d.get("total"), "games": games}) + "\n")
                if page == 0:
                    print(f"[{label}] total={d.get('total')} "
                          f"pages={d.get('pages')}", flush=True)
                page += 1
                if page * 1000 >= (d.get("total") or 0):
                    break
    print(f"done: {calls} calls -> {OUT}")


if __name__ == "__main__":
    main()
