"""Robustness checks: alpha by $5 price band, by release year, and alternative
cohort-B definitions (Story Rich only, Puzzle only)."""
import warnings

import numpy as np
import pandas as pd
import powerlaw

from common import COHORTS, gini, load, save_results

warnings.filterwarnings("ignore")

MIN_FIT_N = 100  # skip cells with too few games for a meaningful fit


def alpha_of(x):
    if len(x) < MIN_FIT_N:
        return None
    f = powerlaw.Fit(x, discrete=True, verbose=False)
    return {"n": int(len(x)), "alpha": f.power_law.alpha,
            "alpha_se": f.power_law.sigma, "xmin": float(f.power_law.xmin),
            "gini": gini(x)}


def main():
    _, df = load()
    out = {"price_bands": {}, "years": {}, "alt_B": {}}

    df["price_band"] = (df.price // 5 * 5).clip(upper=35)
    for band, sub in df.groupby("price_band"):
        cell = {}
        for c in COHORTS:
            r = alpha_of(sub[sub.cohort == c].total_reviews.values)
            if r:
                cell[c] = r
        if len(cell) >= 2 and "A" in cell and "B" in cell:
            out["price_bands"][f"${int(band)}-{int(band) + 5}"] = cell
            print(f"price ${int(band):>2}-{int(band) + 5}: "
                  f"aA={cell['A']['alpha']:.2f}(n={cell['A']['n']}) "
                  f"aB={cell['B']['alpha']:.2f}(n={cell['B']['n']})")

    df["year"] = pd.to_datetime(df.release_date).dt.year
    for yr, sub in df.groupby("year"):
        cell = {}
        for c in COHORTS:
            r = alpha_of(sub[sub.cohort == c].total_reviews.values)
            if r:
                cell[c] = r
        if len(cell) >= 2 and "A" in cell and "B" in cell:
            out["years"][int(yr)] = cell
            print(f"year {yr}: aA={cell['A']['alpha']:.2f}(n={cell['A']['n']}) "
                  f"aB={cell['B']['alpha']:.2f}(n={cell['B']['n']})")

    b = df[df.cohort == "B"]
    for name, tag in [("story_rich_only", "Story Rich"), ("puzzle_only", "Puzzle")]:
        x = b[b.tags.apply(lambda t: tag in t)].total_reviews.values
        r = alpha_of(x)
        if r:
            out["alt_B"][name] = r
            print(f"alt B ({name}): alpha={r['alpha']:.2f} n={r['n']} gini={r['gini']:.3f}")

    a = alpha_of(df[df.cohort == "A"].total_reviews.values)
    out["alt_B"]["A_reference"] = a
    save_results("robustness", out)


if __name__ == "__main__":
    main()
