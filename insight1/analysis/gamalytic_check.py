"""External cross-checks from the Gamalytic harvest (data/gamalytic.jsonl):

1. Lag-free yearly supply counts per cohort (Gamalytic's catalog has no
   SteamSpy-style indexing lag), rebased into a market-adjusted supply index.
2. Review-to-sales multiplier per cohort by joining copiesSold onto our
   dataset — a direct check on the Boxleiter-proxy limitation.

Writes results.json section "external"."""
import datetime
import json
from collections import defaultdict

import numpy as np
import pandas as pd

from common import CSV, MIN_REVIEWS, ROOT, save_results

SRC = ROOT / "data" / "gamalytic.jsonl"
MARKET = {2022: 12249, 2023: 14038, 2024: 18496, 2025: 21382}  # SteamDB
W0, W1 = 1640995200000, 1767225599000  # 2022-01-01 .. 2025-12-31 (ms)


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
    cohorts = {"A": GA, "R": GR, "B": GB}

    def ok(sid):
        g = games[sid]
        p = g.get("price") or 0
        return (0 < p < 40 and g.get("publisherClass") != "AAA"
                and g.get("releaseDate") and W0 <= g["releaseDate"] <= W1)

    supply = {}
    for c, S in cohorts.items():
        by_year = defaultdict(int)
        for sid in S:
            if ok(sid):
                yr = datetime.datetime.utcfromtimestamp(
                    games[sid]["releaseDate"] / 1000).year
                by_year[yr] += 1
        supply[c] = dict(sorted(by_year.items()))
    s_index = {}
    for c, by in supply.items():
        base = by.get(2022)
        if base:
            s_index[c] = {yr: round((n / base) / (MARKET[yr] / MARKET[2022]), 2)
                          for yr, n in by.items() if yr in MARKET}

    df = pd.read_csv(CSV)
    df = df[df.total_reviews >= MIN_REVIEWS]
    mult = {}
    for c in ["A", "R", "B"]:
        rows = []
        for _, r in df[df.cohort == c].iterrows():
            g = games.get(int(r.appid))
            if g and g.get("copiesSold"):
                rows.append(g["copiesSold"] / r.total_reviews)
        if rows:
            rows = np.array(rows)
            mult[c] = {"n": int(len(rows)),
                       "median": float(np.median(rows)),
                       "geomean": float(np.exp(np.mean(np.log(rows))))}

    # full sales-based replication of the distribution metrics (copiesSold as
    # the outcome variable; early death = < 300 copies ~ 10 reviews x multiplier)
    import warnings
    warnings.filterwarnings("ignore")
    import powerlaw

    def gini(x):
        x = np.sort(np.asarray(x, float))
        n = len(x)
        cum = np.cumsum(x)
        return float((n + 1 - 2 * (cum / cum[-1]).sum()) / n)

    replication = {}
    for c, S in cohorts.items():
        pool = [games[s] for s in S if ok(s)
                and games[s].get("copiesSold") is not None]
        sold = np.array([g["copiesSold"] for g in pool], float)
        if len(sold) < 50:
            continue
        live = sold[sold >= 300]
        fit = powerlaw.Fit(live, discrete=True, verbose=False)
        top1 = float(np.sort(live)[::-1][:max(1, int(np.ceil(len(live) * .01)))].sum()
                     / live.sum())
        replication[c] = {
            "n_full": int(len(sold)),
            "early_death_lt300": float((sold < 300).mean()),
            "n": int(len(live)),
            "median": float(np.median(live)),
            "geomean": float(np.exp(np.mean(np.log(live)))),
            "gini": gini(live),
            "top1_share": top1,
            "middle_share_3500_35000": float(((live >= 3500) & (live <= 35000)).mean()),
            "alpha": float(fit.power_law.alpha),
        }

    out = {"source": "gamalytic.com free API (harvested 2026-07-21)",
           "supply_by_year": supply, "supply_index": s_index,
           "sales_per_review": mult, "replication": replication}
    for c in ["A", "R", "B"]:
        print(c, "supply:", supply.get(c), "| S:", s_index.get(c),
              "| mult:", {k: round(v, 1) if isinstance(v, float) else v
                          for k, v in (mult.get(c) or {}).items()})
    save_results("external", out)


if __name__ == "__main__":
    main()
