"""Analysis 1 — tail comparison: power-law alpha per cohort, bootstrap CI of the
difference, power law vs lognormal likelihood-ratio test, log-log CCDF plot."""
import sys
import warnings

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import powerlaw

from common import (COHORT_COLORS, COHORT_LABELS, FIG, load, save_results)

warnings.filterwarnings("ignore")


def fit_alpha(x, xmin=None):
    f = powerlaw.Fit(x, discrete=True, xmin=xmin, verbose=False)
    return f


def main(n_boot=1000):
    _, main_df = load()
    out = {}
    fits = {}
    for c in ["A", "B"]:
        x = main_df[main_df.cohort == c].total_reviews.values
        f = fit_alpha(x)
        R_ln, p_ln = f.distribution_compare("power_law", "lognormal",
                                            normalized_ratio=True)
        R_te, p_te = f.distribution_compare("power_law", "truncated_power_law",
                                            nested=True)
        fits[c] = f
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

    # bootstrap CI for alpha_A - alpha_B (refit xmin each resample)
    rng = np.random.default_rng(42)
    xa = main_df[main_df.cohort == "A"].total_reviews.values
    xb = main_df[main_df.cohort == "B"].total_reviews.values
    diffs = []
    for i in range(n_boot):
        try:
            fa = powerlaw.Fit(rng.choice(xa, len(xa), True), discrete=True, verbose=False)
            fb = powerlaw.Fit(rng.choice(xb, len(xb), True), discrete=True, verbose=False)
            diffs.append(fa.power_law.alpha - fb.power_law.alpha)
        except Exception:
            continue
        if (i + 1) % 100 == 0:
            print(f"  bootstrap {i + 1}/{n_boot}", flush=True)
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    out["alpha_diff_A_minus_B"] = {
        "point": out["A"]["alpha"] - out["B"]["alpha"],
        "ci95": [lo, hi], "n_boot": len(diffs),
    }
    print(f"alpha_A - alpha_B = {out['alpha_diff_A_minus_B']['point']:.3f} "
          f"[{lo:.3f}, {hi:.3f}]")

    # CCDF plot
    fig, ax = plt.subplots(figsize=(7, 5.2))
    for c in ["A", "B"]:
        x = np.sort(main_df[main_df.cohort == c].total_reviews.values)
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
