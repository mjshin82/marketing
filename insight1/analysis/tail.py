"""Analysis 1 — tail comparison across cohorts: power-law alpha per cohort,
bootstrap CIs for pairwise alpha differences (shared per-cohort replicates),
power law vs lognormal likelihood-ratio test, log-log CCDF plot."""
import sys
import warnings

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import powerlaw

from common import (COHORTS, COHORT_COLORS, COHORT_LABELS, FIG, load,
                    save_results)

warnings.filterwarnings("ignore")

PAIRS = [("A", "B"), ("A", "R"), ("R", "B")]


def main(n_boot=1000):
    _, main_df = load()
    out = {}
    fits = {}
    xs = {}
    for c in COHORTS:
        x = main_df[main_df.cohort == c].total_reviews.values
        if len(x) < 30:
            print(f"cohort {c}: n={len(x)} too small, skipped")
            continue
        f = powerlaw.Fit(x, discrete=True, verbose=False)
        R_ln, p_ln = f.distribution_compare("power_law", "lognormal",
                                            normalized_ratio=True)
        R_te, p_te = f.distribution_compare("power_law", "truncated_power_law",
                                            nested=True)
        fits[c] = f
        xs[c] = x
        out[c] = {
            "n": int(len(x)),
            "alpha": f.power_law.alpha,
            "alpha_se": f.power_law.sigma,
            "xmin": float(f.power_law.xmin),
            "n_tail": int((x >= f.power_law.xmin).sum()),
            "LR_powerlaw_vs_lognormal": R_ln,
            "p_powerlaw_vs_lognormal": p_ln,
            "LR_pl_vs_truncated_pl": R_te,
            "p_pl_vs_truncated_pl": p_te,
        }
        print(f"cohort {c}: n={len(x)} alpha={f.power_law.alpha:.3f}"
              f"±{f.power_law.sigma:.3f} xmin={f.power_law.xmin:.0f}"
              f" ntail={out[c]['n_tail']} | PL-vs-LN R={R_ln:.2f} p={p_ln:.3f}")

    # one bootstrap alpha array per cohort; pairwise diffs share replicates
    rng = np.random.default_rng(42)
    boot = {}
    for c in xs:
        vals = []
        for i in range(n_boot):
            try:
                fb = powerlaw.Fit(rng.choice(xs[c], len(xs[c]), True),
                                  discrete=True, verbose=False)
                vals.append(fb.power_law.alpha)
            except Exception:
                continue
        boot[c] = np.array(vals)
        print(f"  bootstrap {c}: {len(vals)}/{n_boot}", flush=True)

    out["alpha_diffs"] = {}
    for a, b in PAIRS:
        if a not in boot or b not in boot:
            continue
        n = min(len(boot[a]), len(boot[b]))
        diffs = boot[a][:n] - boot[b][:n]
        lo, hi = np.percentile(diffs, [2.5, 97.5])
        entry = {"point": out[a]["alpha"] - out[b]["alpha"],
                 "ci95": [lo, hi], "n_boot": int(n)}
        out["alpha_diffs"][f"{a}_minus_{b}"] = entry
        print(f"alpha_{a} - alpha_{b} = {entry['point']:.3f} [{lo:.3f}, {hi:.3f}]")
    if "A_minus_B" in out["alpha_diffs"]:
        out["alpha_diff_A_minus_B"] = out["alpha_diffs"]["A_minus_B"]  # back-compat

    fig, ax = plt.subplots(figsize=(7, 5.2))
    for c in xs:
        x = np.sort(xs[c])
        ccdf = 1.0 - np.arange(len(x)) / len(x)
        ax.loglog(x, ccdf, ".", ms=3, alpha=0.5, color=COHORT_COLORS[c],
                  label=f"{COHORT_LABELS[c]} (α={out[c]['alpha']:.2f})")
        fits[c].power_law.plot_ccdf(ax=ax, color=COHORT_COLORS[c], ls="--", lw=1.2)
    ax.set_xlabel("Total reviews")
    ax.set_ylabel("CCDF  P(X ≥ x)")
    ax.set_title("Review-count CCDF by cohort (log-log)")
    ax.legend()
    ax.grid(True, which="both", alpha=0.2)
    FIG.mkdir(exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIG / "ccdf_comparison.png", dpi=150)
    save_results("tail", out)


if __name__ == "__main__":
    main(n_boot=int(sys.argv[1]) if len(sys.argv) > 1 else 1000)
