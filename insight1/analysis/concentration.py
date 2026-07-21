"""Analysis 3 — concentration: Gini, top-1%/top-5% review share with bootstrap
CIs, early-death (<10 reviews) rate comparison, Lorenz curves."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy import stats

from common import (COHORT_COLORS, COHORT_LABELS, FIG, MIN_REVIEWS,
                    bootstrap_ci, gini, load, save_results, top_share)


def lorenz(x):
    x = np.sort(np.asarray(x, dtype=float))
    cum = np.cumsum(x) / x.sum()
    return np.insert(np.arange(1, len(x) + 1) / len(x), 0, 0), np.insert(cum, 0, 0)


def main():
    full, main_df = load()
    out = {}
    death_table = []
    for c in ["A", "B"]:
        x = main_df[main_df.cohort == c].total_reviews.values
        g, g_lo, g_hi = bootstrap_ci(x, gini)
        t1, t1_lo, t1_hi = bootstrap_ci(x, lambda v: top_share(v, 0.01))
        t5, t5_lo, t5_hi = bootstrap_ci(x, lambda v: top_share(v, 0.05))
        xf = full[full.cohort == c].total_reviews.values
        dead = (xf < MIN_REVIEWS).sum()
        death_table.append([dead, len(xf) - dead])
        out[c] = {"n": int(len(x)),
                  "gini": g, "gini_ci": [g_lo, g_hi],
                  "top1_share": t1, "top1_ci": [t1_lo, t1_hi],
                  "top5_share": t5, "top5_ci": [t5_lo, t5_hi],
                  "n_full": int(len(xf)), "early_death_n": int(dead),
                  "early_death_rate": dead / len(xf) if len(xf) else float("nan")}
        print(f"cohort {c}: gini={g:.3f} [{g_lo:.3f},{g_hi:.3f}] "
              f"top1%={t1:.3f} [{t1_lo:.3f},{t1_hi:.3f}] "
              f"top5%={t5:.3f} early-death={out[c]['early_death_rate']:.3f}")

    chi2, p, _, _ = stats.chi2_contingency(death_table)
    out["early_death_test"] = {"chi2": chi2, "p": p}
    print(f"early-death rate difference: chi2={chi2:.2f} p={p:.2e}")

    fig, ax = plt.subplots(figsize=(6, 6))
    for c in ["A", "B"]:
        p_pop, p_rev = lorenz(main_df[main_df.cohort == c].total_reviews.values)
        ax.plot(p_pop, p_rev, color=COHORT_COLORS[c], lw=2,
                label=f"{COHORT_LABELS[c]} (Gini={out[c]['gini']:.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.5)
    ax.set_xlabel("cumulative share of games")
    ax.set_ylabel("cumulative share of reviews")
    ax.set_title("Lorenz curves of review counts")
    ax.legend()
    FIG.mkdir(exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIG / "lorenz.png", dpi=150)
    save_results("concentration", out)


if __name__ == "__main__":
    main()
