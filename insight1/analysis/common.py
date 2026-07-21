"""Shared helpers for the co-op vs singleplayer distribution study."""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
FIG = ROOT / "figures"
RESULTS = ROOT / "analysis" / "results.json"

# analysis mode: "sales" (main, Gamalytic copiesSold) or "reviews" (validation)
import os
MODE = os.environ.get("INSIGHT1_MODE", "sales")
if MODE == "sales":
    CSV = ROOT / "data" / "games_sales.csv"
    MIN_REVIEWS = 500            # early-death / analysis floor (copies sold):
                                 # estimate noise is worst at the low end, and
                                 # this also screens out hobbyist releases
    MIDDLE_LO, MIDDLE_HI = 3500, 35000  # mid-success band (copies ~ $50K-500K)
    FIXED_XMIN = 3500
    LOG_LO, LOG_HI = 2, 8        # log10 axis range for density plots
else:
    CSV = ROOT / "data" / "games.csv"
    MIN_REVIEWS = 10
    MIDDLE_LO, MIDDLE_HI = 100, 1000
    FIXED_XMIN = 100
    LOG_LO, LOG_HI = 1, 6
COHORTS = ["A", "B", "R"]
PAIRS = [("A", "B"), ("A", "R"), ("R", "B")]
COHORT_LABELS = {"A": "Co-op (online)", "B": "Single-player narrative", "R": "Roguelike"}
COHORT_COLORS = {"A": "#eb6834", "B": "#2a78d6", "R": "#1baf7a"}

rng = np.random.default_rng(42)


def load(min_reviews=MIN_REVIEWS):
    df = pd.read_csv(CSV)
    df["tags"] = df.tags.apply(lambda t: json.loads(t) if isinstance(t, str) else [])
    full = df.copy()  # includes <10-review games (early-death metric)
    main = df[df.total_reviews >= min_reviews].copy()
    return full, main


def gini(x):
    x = np.sort(np.asarray(x, dtype=float))
    n = len(x)
    if n == 0 or x.sum() == 0:
        return np.nan
    cum = np.cumsum(x)
    return (n + 1 - 2 * (cum / cum[-1]).sum()) / n


def top_share(x, frac):
    x = np.sort(np.asarray(x, dtype=float))[::-1]
    k = max(1, int(np.ceil(len(x) * frac)))
    return x[:k].sum() / x.sum()


def bootstrap_ci(x, stat, n_boot=1000, alpha=0.05, seed=42):
    r = np.random.default_rng(seed)
    x = np.asarray(x)
    vals = [stat(r.choice(x, size=len(x), replace=True)) for _ in range(n_boot)]
    lo, hi = np.percentile(vals, [100 * alpha / 2, 100 * (1 - alpha / 2)])
    return stat(x), lo, hi


def bootstrap_diff_ci(xa, xb, stat, n_boot=1000, alpha=0.05, seed=42):
    r = np.random.default_rng(seed)
    xa, xb = np.asarray(xa), np.asarray(xb)
    diffs = [stat(r.choice(xa, len(xa), True)) - stat(r.choice(xb, len(xb), True))
             for _ in range(n_boot)]
    lo, hi = np.percentile(diffs, [100 * alpha / 2, 100 * (1 - alpha / 2)])
    return stat(xa) - stat(xb), lo, hi


def save_results(section, payload):
    RESULTS.parent.mkdir(exist_ok=True)
    data = {}
    if RESULTS.exists():
        data = json.loads(RESULTS.read_text())
    data[section] = payload
    RESULTS.write_text(json.dumps(data, indent=2, default=float))
    print(f"[results] wrote section '{section}'")
