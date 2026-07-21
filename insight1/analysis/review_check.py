"""Validation layer: recompute the key metrics on the raw review-count
observations (SteamSpy/Steam pipeline, data/games.csv) and store them next to
the sales-based main results for side-by-side agreement checks.

Also measures the review-to-sales multiplier by joining Gamalytic copiesSold
onto the review dataset."""
import json
import os

os.environ["INSIGHT1_MODE"] = "reviews"  # must precede the common import

import numpy as np
import pandas as pd
import powerlaw
import warnings

from common import (CSV, MIDDLE_HI, MIDDLE_LO, MIN_REVIEWS, RESULTS, ROOT,
                    gini, load, top_share)

warnings.filterwarnings("ignore")


def main():
    full, main_df = load()
    out = {"n_total": int(len(full)),
           "note": "raw review counts; collection may still be in progress"}
    for c in ["A", "R", "B"]:
        g = full[full.cohort == c]
        x = main_df[main_df.cohort == c].total_reviews.values
        if len(x) < 30:
            continue
        f = powerlaw.Fit(x, discrete=True, verbose=False)
        out[c] = {
            "n_full": int(len(g)), "n": int(len(x)),
            "early_death_rate": float((g.total_reviews < MIN_REVIEWS).mean()),
            "middle_share": float(((x >= MIDDLE_LO) & (x <= MIDDLE_HI)).mean()),
            "median": float(np.median(x)),
            "geomean": float(np.exp(np.mean(np.log(x)))),
            "gini": float(gini(x)),
            "top1_share": float(top_share(x, 0.01)),
            "alpha": float(f.power_law.alpha),
        }

    # review-to-sales multiplier via Gamalytic join
    src = ROOT / "data" / "gamalytic.jsonl"
    if src.exists():
        sold = {}
        for line in src.open():
            for g in json.loads(line)["games"]:
                if g.get("copiesSold"):
                    sold[int(g["steamId"])] = g["copiesSold"]
        mult = {}
        for c in ["A", "R", "B"]:
            r = [sold[a] / t for a, t in
                 zip(main_df[main_df.cohort == c].appid,
                     main_df[main_df.cohort == c].total_reviews) if a in sold]
            if r:
                mult[c] = {"n": len(r), "median": float(np.median(r))}
        out["sales_per_review"] = mult

    data = json.loads(RESULTS.read_text()) if RESULTS.exists() else {}
    data.pop("external", None)  # superseded by the sales-based main analysis
    data["review_check"] = out
    RESULTS.write_text(json.dumps(data, indent=2, default=float))
    for c in ["A", "R", "B"]:
        if c in out:
            m = out[c]
            print(f"{c}: n={m['n']} early={m['early_death_rate']:.1%} "
                  f"mid={m['middle_share']:.1%} gini={m['gini']:.3f} "
                  f"alpha={m['alpha']:.2f}")


if __name__ == "__main__":
    main()
