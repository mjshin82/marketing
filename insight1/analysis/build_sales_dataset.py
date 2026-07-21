"""Build the main (sales-based) dataset from the Gamalytic harvest.

Cohorts via tag-set algebra (mirrors collect/pipeline.py priorities):
  A = pure multiplayer co-op, R = roguelike (no MP), B = story-rich single - R.
Filters: paid, price < $40, publisherClass != AAA, released 2022-01..2026-06.

Output: data/games_sales.csv with the same column layout the analysis suite
expects — `total` is copiesSold (the outcome variable in sales mode)."""
import datetime
import json
from collections import defaultdict

import pandas as pd

from common import ROOT

SRC = ROOT / "data" / "gamalytic.jsonl"
OUT = ROOT / "data" / "games_sales.csv"
W0, W1 = 1640995200000, 1782863999000  # 2022-01-01 .. 2026-06-30 (ms, UTC)


def main():
    sets = defaultdict(set)
    games = {}
    for line in SRC.open():
        rec = json.loads(line)
        for g in rec["games"]:
            sid = int(g["steamId"])
            games[sid] = g
            sets[rec["label"].split("|")[0]].add(sid)

    GR = sets["R_inc"] - sets["R_exc"]
    GA = sets["A_inc"] - sets["A_exc"]
    GB = (sets["B_inc"] - sets["B_exc"]) - GR

    rows = []
    for cohort, S in [("A", GA), ("R", GR), ("B", GB)]:
        for sid in S:
            g = games[sid]
            price = g.get("price") or 0
            if not (0 < price < 40):
                continue
            if g.get("publisherClass") == "AAA":
                continue
            rd = g.get("releaseDate")
            if not rd or not (W0 <= rd <= W1):
                continue
            if g.get("copiesSold") is None:
                continue
            rows.append({
                "appid": sid,
                "name": g.get("name"),
                "release_date": datetime.datetime.utcfromtimestamp(rd / 1000)
                                .strftime("%Y-%m-%d"),
                "price": price,
                "tags": "[]",  # tag lists unavailable on the free tier
                "total_reviews": int(g["copiesSold"]),  # outcome = copies sold
                "review_source": "gamalytic",
                "cohort": cohort,
            })
    df = pd.DataFrame(rows)
    df.to_csv(OUT, index=False)
    print(f"wrote {OUT}: {len(df)} games "
          + str({c: int((df.cohort == c).sum()) for c in ['A', 'R', 'B']}))


if __name__ == "__main__":
    main()
