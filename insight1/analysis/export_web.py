"""Export analysis results + chart series to web/src/public/report_data.json."""
import json
import sys
from datetime import datetime, timezone

import numpy as np
from scipy import stats

from common import (CSV, LOG_HI, LOG_LO, MIDDLE_HI, MIDDLE_LO, MODE,
                    RESULTS, ROOT, load)

OUT = ROOT / "web" / "src" / "public" / "report_data.json"


def downsample_ccdf(x):
    """CCDF points, log-spaced thinning to <= ~350 points."""
    x = np.sort(x)
    n = len(x)
    ccdf = 1.0 - np.arange(n) / n
    if n <= 350:
        idx = np.arange(n)
    else:
        idx = np.unique(np.geomspace(1, n, 350).astype(int) - 1)
    return [[int(x[i]), float(ccdf[i])] for i in idx]


def fit_line(x, alpha, xmin):
    """Fitted power-law CCDF anchored at empirical P(X >= xmin)."""
    x = np.asarray(x)
    p_tail = (x >= xmin).mean()
    grid = np.geomspace(xmin, x.max(), 50)
    return [[float(g), float(p_tail * (g / xmin) ** (-(alpha - 1)))] for g in grid]


def main(label="full"):
    full, main_df = load()
    r = json.loads(RESULTS.read_text())
    edges = np.linspace(LOG_LO, LOG_HI, 41)
    centers = (edges[:-1] + edges[1:]) / 2
    kde_grid = np.linspace(LOG_LO, LOG_HI, 240)
    series = {}
    for c in ["A", "B", "R"]:
        x = main_df[main_df.cohort == c].total_reviews.values
        if len(x) < 30 or c not in r["tail"]:
            continue
        lx = np.log10(x)
        hist, _ = np.histogram(lx, bins=edges, density=True)
        kde = stats.gaussian_kde(lx)(kde_grid)
        xs = np.sort(x.astype(float))
        cum = np.cumsum(xs) / xs.sum()
        pop = np.arange(1, len(xs) + 1) / len(xs)
        step = max(1, len(xs) // 200)
        lorenz = [[0.0, 0.0]] + [[float(pop[i]), float(cum[i])]
                                 for i in range(0, len(xs), step)] + [[1.0, 1.0]]
        series[c] = {
            "ccdf": downsample_ccdf(x),
            "fit": fit_line(x, r["tail"][c]["alpha"], r["tail"][c]["xmin"]),
            "hist": [[float(centers[i]), float(hist[i])] for i in range(len(hist))],
            "kde": [[float(kde_grid[i]), float(kde[i])] for i in range(len(kde_grid))],
            "lorenz": lorenz,
        }
    payload = {
        "meta": {
            "label": label,
            "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "n_A": int((main_df.cohort == "A").sum()),
            "n_B": int((main_df.cohort == "B").sum()),
            "n_R": int((main_df.cohort == "R").sum()),
            "n_full_A": int((full.cohort == "A").sum()),
            "n_full_B": int((full.cohort == "B").sum()),
            "n_full_R": int((full.cohort == "R").sum()),
            "middle_band": [MIDDLE_LO, MIDDLE_HI],
            "mode": MODE,
            "log_range": [LOG_LO, LOG_HI],
        },
        "results": r,
        "series": series,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload))
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "full")
