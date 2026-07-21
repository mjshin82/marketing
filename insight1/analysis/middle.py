"""Analysis 2 — missing middle: share of games in the 100-1,000 review band,
chi-square/Fisher test on the share difference, Hartigan's dip test on
log10(reviews), overlaid histogram/KDE figure."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from diptest import diptest
from scipy import stats

from common import (COHORT_COLORS, COHORT_LABELS, FIG, MIDDLE_HI, MIDDLE_LO,
                    load, save_results)


def main():
    _, main_df = load()
    out = {}
    table = []
    for c in ["A", "B"]:
        x = main_df[main_df.cohort == c].total_reviews.values
        mid = ((x >= MIDDLE_LO) & (x <= MIDDLE_HI)).sum()
        table.append([mid, len(x) - mid])
        lx = np.log10(x)
        dip, dip_p = diptest(lx)
        out[c] = {"n": int(len(x)), "middle_n": int(mid),
                  "middle_share": mid / len(x),
                  "dip_stat": dip, "dip_p": dip_p}
        print(f"cohort {c}: middle({MIDDLE_LO}-{MIDDLE_HI}) share="
              f"{mid / len(x):.3f} ({mid}/{len(x)}) dip={dip:.4f} p={dip_p:.4f}")

    chi2, chi_p, _, _ = stats.chi2_contingency(table)
    fisher_or, fisher_p = stats.fisher_exact(table)
    out["middle_share_test"] = {"chi2": chi2, "chi2_p": chi_p,
                                "fisher_odds_ratio": fisher_or, "fisher_p": fisher_p}
    print(f"middle-share difference: chi2={chi2:.2f} p={chi_p:.2e} "
          f"fisher OR={fisher_or:.3f} p={fisher_p:.2e}")

    fig, ax = plt.subplots(figsize=(7.5, 5))
    bins = np.linspace(1, 6, 41)
    for c in ["A", "B"]:
        lx = np.log10(main_df[main_df.cohort == c].total_reviews.values)
        ax.hist(lx, bins=bins, density=True, alpha=0.35, color=COHORT_COLORS[c],
                label=COHORT_LABELS[c])
        kde = stats.gaussian_kde(lx)
        grid = np.linspace(1, 6, 300)
        ax.plot(grid, kde(grid), color=COHORT_COLORS[c], lw=2)
    ax.axvspan(np.log10(MIDDLE_LO), np.log10(MIDDLE_HI), color="gray", alpha=0.12,
               label=f"middle band ({MIDDLE_LO}-{MIDDLE_HI} reviews)")
    ax.set_xlabel("log10(total reviews)")
    ax.set_ylabel("density")
    ax.set_title("Where is the middle class? log-review distributions")
    ax.legend()
    FIG.mkdir(exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIG / "middle_class.png", dpi=150)
    save_results("middle", out)


if __name__ == "__main__":
    main()
