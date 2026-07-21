"""Sensitivity analysis: primary release window (2022-01 ~ 2025-06) vs extended
window (~ 2025-12). Same metrics per cohort on both datasets.

Caveats recorded alongside: (1) H2-2025 releases have only ~7-12 months of
review accumulation; (2) SteamSpy's master list lags for recent releases, so
H2-2025 is under-covered regardless of the cutoff."""
import json
import warnings

import numpy as np
import pandas as pd
import powerlaw

from common import (COHORTS, CSV, MIDDLE_HI, MIDDLE_LO, MIN_REVIEWS, ROOT,
                    gini, save_results)

warnings.filterwarnings("ignore")

CSV_EXT = ROOT / "data" / "games_ext.csv"


def metrics(df):
    out = {}
    for c in COHORTS:
        full = df[df.cohort == c]
        x = full[full.total_reviews >= MIN_REVIEWS].total_reviews.values
        if len(x) < 30:
            continue
        m = {
            "n": int(len(x)), "n_full": int(len(full)),
            "median": float(np.median(x)),
            "geomean": float(np.exp(np.mean(np.log(x)))),
            "gini": float(gini(x)),
            "middle_share": float(((x >= MIDDLE_LO) & (x <= MIDDLE_HI)).mean()),
            "early_death_rate": float((full.total_reviews < MIN_REVIEWS).mean()),
        }
        f = powerlaw.Fit(x, discrete=True, verbose=False)
        m["alpha"] = f.power_law.alpha
        m["alpha_se"] = f.power_law.sigma
        out[c] = m
    return out


def main():
    primary = metrics(pd.read_csv(CSV))
    dfe = pd.read_csv(CSV_EXT)
    extended = metrics(dfe)
    h2_2025 = int(((dfe.release_date >= "2025-07-01")
                   & (dfe.release_date <= "2025-12-31")).sum())
    out = {"primary_window": "2022-01-01..2025-06-30",
           "extended_window": "2022-01-01..2025-12-31",
           "h2_2025_games": h2_2025,
           "primary": primary, "extended": extended}
    for c in primary:
        if c in extended:
            print(f"cohort {c}: alpha {primary[c]['alpha']:.2f} -> "
                  f"{extended[c]['alpha']:.2f} | gini {primary[c]['gini']:.3f} -> "
                  f"{extended[c]['gini']:.3f} | geomean {primary[c]['geomean']:.0f} -> "
                  f"{extended[c]['geomean']:.0f}")
    print(f"H2-2025 games added by extension: {h2_2025}")
    save_results("window_sensitivity", out)


if __name__ == "__main__":
    main()
