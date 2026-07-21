"""Era-effect analysis: per-year cohort stats and within-year ratios.

Cross-year absolute levels are confounded by review-accumulation time (a 2022
release has had ~4 years to gather reviews, a 2025 release ~1 year), so the
meaningful signal is the WITHIN-year comparison between cohorts — the
accumulation window cancels out. The trend of those ratios across years shows
whether a genre's edge is structural or a fading fashion tailwind."""
import numpy as np
import pandas as pd

from common import COHORTS, MIN_REVIEWS, load, save_results

MIN_CELL = 10  # min surviving games per cohort-year cell


def main():
    full, _ = load()
    full = full.copy()
    full["year"] = pd.to_datetime(full.release_date).dt.year
    years = {}
    ratios = {}
    for yr, sub in full.groupby("year"):
        cell = {}
        for c in COHORTS:
            g = sub[sub.cohort == c]
            live = g[g.total_reviews >= MIN_REVIEWS]
            if len(live) < MIN_CELL:
                continue
            cell[c] = {
                "n_full": int(len(g)), "n": int(len(live)),
                "median": float(live.total_reviews.median()),
                "geomean": float(np.exp(np.log(live.total_reviews).mean())),
                "early_death_rate": float((g.total_reviews < MIN_REVIEWS).mean()),
            }
        if "B" not in cell:
            continue
        years[int(yr)] = cell
        ratios[int(yr)] = {
            f"{c}_over_B": cell[c]["geomean"] / cell["B"]["geomean"]
            for c in cell if c != "B"
        }
        line = " ".join(f"{c}:gm={cell[c]['geomean']:.0f}" for c in cell)
        print(f"{yr}: {line} | ratios {ratios[int(yr)]}")
    save_results("era", {"years": years, "ratios": ratios})


if __name__ == "__main__":
    main()
