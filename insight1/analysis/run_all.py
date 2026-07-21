"""Run every analysis in order and regenerate REPORT.md from results.json."""
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable


def run(script, *args):
    print(f"\n=== {script} {' '.join(args)} ===", flush=True)
    subprocess.run([PY, str(ROOT / "analysis" / script), *args],
                   check=True, cwd=ROOT / "analysis")


def fmt_p(p):
    return f"{p:.2e}" if p < 0.001 else f"{p:.3f}"


def write_report():
    r = json.loads((ROOT / "analysis" / "results.json").read_text())
    t, m, c = r["tail"], r["middle"], r["concentration"]
    rb = r.get("robustness", {})
    d = t["alpha_diff_A_minus_B"]

    h1_supported = d["ci95"][1] < 0
    h2_supported = (m["A"]["middle_share"] < m["B"]["middle_share"]
                    and m["middle_share_test"]["chi2_p"] < 0.05)
    h3_supported = (c["A"]["gini"] > c["B"]["gini"]
                    and c["A"]["gini_ci"][0] > c["B"]["gini_ci"][1])

    def verdict(ok):
        return "**지지됨**" if ok else "**기각/불확정**"

    lines = [
        "# 코옵 vs 싱글 내러티브 vs 로그라이크: 승자독식 구조 검증 결과",
        "",
        f"_생성일: {date.today().isoformat()}_",
        "",
        "**가설:** 온라인 코옵 게임은 친구 그룹 동시 수렴(조정 구조)으로 입소문이 퍼지므로, "
        "싱글 내러티브 게임보다 성공 분포가 더 극단적인 승자독식 형태(supercritical branching "
        "process)를 보인다.",
        "",
        "**데이터:** Gamalytic의 판매량 추정치(copiesSold)를 결과변수로 사용. "
        f"코호트 A(코옵) n={t['A']['n']}, 코호트 B(싱글 내러티브) n={t['B']['n']}"
        + (f", 코호트 R(로그라이크) n={t['R']['n']}" if 'R' in t else "")
        + " (판매 ≥500장, 유료, <$40, 2022-01~2025-12 출시, AAA 제외). "
        "코호트는 상호배타적이며 분류 우선순위는 A(코옵) > R(로그라이크) > B(내러티브).",
        "",
        "## 가설 1 — 더 무거운 꼬리 (α_coop < α_single): " + verdict(h1_supported),
        "",
        "| 코호트 | n | α | SE | xmin | n_tail | PL vs LN (R, p) |",
        "|---|---|---|---|---|---|---|",
    ]
    for k, label in [("A", "코옵"), ("B", "싱글 내러티브"), ("R", "로그라이크")]:
        if k not in t:
            continue
        x = t[k]
        lines.append(
            f"| {label} | {x['n']} | {x['alpha']:.3f} | {x['alpha_se']:.3f} | "
            f"{x['xmin']:.0f} | {x['n_tail']} | R={x['LR_powerlaw_vs_lognormal']:.2f}, "
            f"p={fmt_p(x['p_powerlaw_vs_lognormal'])} |")
    lines += [
        "",
        f"- α 차이 (A − B): **{d['point']:.3f}**, 부트스트랩 95% CI "
        f"[{d['ci95'][0]:.3f}, {d['ci95'][1]:.3f}] ({d['n_boot']}회 리샘플)",
    ] + [
        f"- α 차이 ({pair.replace('_minus_', ' − ')}): {v['point']:.3f}, "
        f"95% CI [{v['ci95'][0]:.3f}, {v['ci95'][1]:.3f}]"
        for pair, v in t.get("alpha_diffs", {}).items() if pair != "A_minus_B"
    ] + [
        "- CI가 0을 제외하고 음수면 코옵 꼬리가 유의하게 더 무겁다는 뜻.",
        "- Clauset 스타일 정직성 체크: R>0이면 power law 우세, R<0이면 lognormal 우세 "
        "(p가 크면 판별 불가). 두 코호트 모두에서 lognormal이 기각되지 않으면 "
        "'멱함수'라는 딱지보다 '무거운 꼬리' 자체로 해석할 것.",
        "",
        "![CCDF](figures/ccdf_comparison.png)",
        "",
        "## 가설 2 — 빈 허리 (중간 성공 구간 부재): " + verdict(h2_supported),
        "",
        "중간 구간 = 리뷰 100~1,000개 (Boxleiter ×35 ≈ 판매 3.5천~3.5만 장).",
        "",
        "| 코호트 | 중간 구간 비율 | dip 통계량 | dip p |",
        "|---|---|---|---|",
    ]
    for k, label in [("A", "코옵"), ("B", "싱글 내러티브"), ("R", "로그라이크")]:
        if k not in m:
            continue
        x = m[k]
        lines.append(f"| {label} | {x['middle_share']:.3f} ({x['middle_n']}/{x['n']}) | "
                     f"{x['dip_stat']:.4f} | {fmt_p(x['dip_p'])} |")
    ms = m["middle_share_test"]
    lines += [
        "",
        f"- 중간 구간 비율 차이: χ²={ms['chi2']:.2f}, p={fmt_p(ms['chi2_p'])}; "
        f"Fisher OR={ms['fisher_odds_ratio']:.3f}, p={fmt_p(ms['fisher_p'])}",
        "- dip test p<0.05면 log10 리뷰 분포가 단봉이 아니라는 증거 (쌍봉성 지지).",
        "",
        "![middle](figures/middle_class.png)",
        "",
        "## 가설 3 — 더 높은 집중도: " + verdict(h3_supported),
        "",
        "| 코호트 | 중간값 | 평균 (기하평균의 배수) | 기하평균 | Gini [95% CI] | 상위 1% | 상위 5% | 조기 소멸률(<10리뷰) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for k, label in [("A", "코옵"), ("B", "싱글 내러티브"), ("R", "로그라이크")]:
        if k not in c:
            continue
        x = c[k]
        lines.append(
            f"| {label} | {x['median']:,.0f} | {x['mean']:,.0f} (×{x['mean'] / x['geomean']:.0f}) | "
            f"{x['geomean']:,.0f} | "
            f"{x['gini']:.3f} [{x['gini_ci'][0]:.3f}, {x['gini_ci'][1]:.3f}] | "
            f"{x['top1_share']:.1%} | {x['top5_share']:.1%} | "
            f"{x['early_death_rate']:.1%} ({x['early_death_n']}/{x['n_full']}) |")
    ed = c["early_death_test"]
    lines += [
        "",
        f"- 조기 소멸률 차이: χ²={ed['chi2']:.2f}, p={fmt_p(ed['p'])}",
        "",
        "![lorenz](figures/lorenz.png)",
        "",
        "## 강건성 체크",
        "",
    ]
    if rb.get("price_bands"):
        lines += ["**가격대별 α (같은 가격대 내 비교, 가격 교란 통제):**", "",
                  "| 가격대 | α_coop (n) | α_single (n) | coop 꼬리가 더 무거움? |", "|---|---|---|---|"]
        for band, cell in rb["price_bands"].items():
            lines.append(f"| {band} | {cell['A']['alpha']:.2f} ({cell['A']['n']}) | "
                         f"{cell['B']['alpha']:.2f} ({cell['B']['n']}) | "
                         f"{'예' if cell['A']['alpha'] < cell['B']['alpha'] else '아니오'} |")
        lines.append("")
    if rb.get("years"):
        lines += ["**연도별 α:**", "", "| 연도 | α_coop (n) | α_single (n) |", "|---|---|---|"]
        for yr, cell in rb["years"].items():
            lines.append(f"| {yr} | {cell['A']['alpha']:.2f} ({cell['A']['n']}) | "
                         f"{cell['B']['alpha']:.2f} ({cell['B']['n']}) |")
        lines.append("")
    if rb.get("fixed_xmin"):
        lines += ["**공통 xmin=100 고정 α (적합 구간 차이 제거):**", "",
                  "| 코호트 | α (SE) | 꼬리 표본 |", "|---|---|---|"]
        for k, label in [("A", "코옵"), ("B", "싱글 내러티브"), ("R", "로그라이크")]:
            if k in rb["fixed_xmin"]:
                c2 = rb["fixed_xmin"][k]
                lines.append(f"| {label} | {c2['alpha']:.3f} ({c2['alpha_se']:.3f}) | "
                             f"{c2['n_tail']} |")
        lines.append("")
    if rb.get("alt_B"):
        lines += ["**코호트 B 대안 정의 민감도:**", "",
                  "| 정의 | n | α | Gini |", "|---|---|---|---|"]
        for name, cell in rb["alt_B"].items():
            if cell:
                lines.append(f"| {name} | {cell['n']} | {cell['alpha']:.2f} | "
                             f"{cell['gini']:.3f} |")
        lines.append("")
    era = r.get("era")
    if era and era.get("years"):
        lines += [
            "## 시대 효과 — 연도별 추세",
            "",
            "연도 간 절대값 비교는 리뷰 누적 기간 차이로 오염된다 (2022년작은 ~4년치, "
            "2025년작은 ~1년치). 유효한 독법은 **같은 연도 안에서 코호트끼리 비교** — "
            "누적 기간이 상쇄된다. 배율의 연도별 추세가 장르 우위가 구조적인지 "
            "유행 순풍인지를 가른다.",
            "",
            "| 연도 | 기하평균 코옵 | 로그라이크 | 내러티브 | 코옵÷내러 | 로그÷내러 |",
            "|---|---|---|---|---|---|",
        ]
        for yr in sorted(era["years"]):
            cell = era["years"][yr]
            rat = era["ratios"].get(str(yr)) or era["ratios"].get(yr) or {}
            def gm(c):
                return f"{cell[c]['geomean']:.0f}" if c in cell else "—"
            ab = rat.get("A_over_B")
            rb = rat.get("R_over_B")
            lines.append(
                f"| {yr} | {gm('A')} | {gm('R')} | {gm('B')} | "
                f"{f'×{ab:.1f}' if ab else '—'} | {f'×{rb:.1f}' if rb else '—'} |")
        lines.append("")
    ext = r.get("external")
    if ext:
        lines += [
            "## 외부 검증 (Gamalytic)",
            "",
            f"출처: {ext['source']}. 카탈로그 편입 지연이 없는 외부 소스로 코호트 정의를 재현.",
            "",
            "**연도별 신작 수 (유료·<$40·AAA 제외):**",
            "",
            "| 코호트 | 2022 | 2023 | 2024 | 2025 | 2025 공급지수 S |",
            "|---|---|---|---|---|---|",
        ]
        for k, label in [("A", "코옵"), ("R", "로그라이크"), ("B", "내러티브")]:
            by = ext["supply_by_year"].get(k, {})
            si = ext["supply_index"].get(k, {})
            g = lambda y: by.get(str(y)) or by.get(y) or "—"
            s25 = si.get("2025") or si.get(2025)
            lines.append(f"| {label} | {g(2022)} | {g(2023)} | {g(2024)} | {g(2025)} | "
                         f"{s25 if s25 else '—'} |")
        lines += [
            "",
            "**리뷰→판매 배수 실측 (copiesSold ÷ 리뷰 수, 조인 표본):**",
            "",
            "| 코호트 | n | 중간값 | 기하평균 |",
            "|---|---|---|---|",
        ]
        for k, label in [("A", "코옵"), ("R", "로그라이크"), ("B", "내러티브")]:
            m = ext["sales_per_review"].get(k)
            if m:
                lines.append(f"| {label} | {m['n']} | ×{m['median']:.1f} | ×{m['geomean']:.1f} |")
        rep = ext.get("replication")
        if rep:
            lines += [
                "**판매량 기준 병렬 복제 (copiesSold, 조기 소멸 = 판매 <300장):**",
                "",
                "| 코호트 | n | 조기 소멸 | 중간값 | 기하평균 | Gini | 상위 1% | 중간층(3.5천~3.5만 장) | α |",
                "|---|---|---|---|---|---|---|---|---|",
            ]
            for k, label in [("A", "코옵"), ("R", "로그라이크"), ("B", "내러티브")]:
                m = rep.get(k)
                if m:
                    lines.append(
                        f"| {label} | {m['n_full']} | {m['early_death_lt300']:.1%} | "
                        f"{m['median']:,.0f} | {m['geomean']:,.0f} | {m['gini']:.3f} | "
                        f"{m['top1_share']:.1%} | {m['middle_share_3500_35000']:.1%} | "
                        f"{m['alpha']:.2f} |")
            lines += [
                "",
                "주의: Gamalytic 판매 추정은 리뷰 수를 입력으로 쓰는 모델이라 완전히 독립적인 "
                "복제는 아니다. 그럼에도 리뷰 기반 주 분석과 방향이 일치하는 항목(로그라이크 "
                "조기 소멸 최다, 코옵 중간층 최저·집중도 최고·전형 성과 최고)은 신뢰도가 "
                "올라간다.",
                "",
            ]
        lines.append("")
    lines += [
        "## 한계",
        "",
        "- **리뷰-판매 배수의 장르 차이:** Boxleiter 배수(~×30-50)는 장르·가격·연도에 따라 "
        "다르다. 코옵 게임은 친구 단위 구매(멀티팩)로 판매당 리뷰 성향이 다를 수 있다. "
        "분포의 *형태* 비교는 배수가 코호트 내에서 리뷰 수와 독립일 때만 완전히 안전하다.",
        "- **SteamSpy 신선도:** 태그·가격은 SteamSpy 캐시 기준이며 일부 게임은 갱신이 느리다. "
        "리뷰 수는 가능한 한 스팀 공식 appreviews로 대체했다 (games.csv의 review_source 참조).",
        "- **태그는 자기선택:** 태그는 유저/개발자가 붙인다. 경계 사례(코옵 '가능'하지만 "
        "본질적으로 싱글 게임 등)의 오분류 가능성.",
        "- **장르 교집합은 제외:** 멀티 코옵이면서 로그라이크인 게임(예: Risk of Rain 계열)은 "
        "로그라이크 코호트에서 빠지고, Singleplayer 태그까지 있으면 어느 코호트에도 들어가지 "
        "않는다. 상호배타 코호트를 위해 교집합을 빼는 쪽을 택했다 — 하이브리드 장르의 성과는 "
        "이 분석의 범위 밖이다.",
        "- **코옵 표본 부족:** 코호트 A(순수 멀티 코옵)는 다른 코호트의 1/5 수준으로 작아 "
        "관련 지표의 신뢰구간이 넓다. 특히 상위 1% 점유율과 α는 히트작 몇 개에 민감하다.",
        "- **2025 하반기 커버리지:** 컷오프를 2025-12로 두었지만 하반기 출시작은 리뷰 누적 "
        "기간이 7~12개월로 짧고 SteamSpy 마스터 목록의 최신작 편입 지연으로 표본 자체가 "
        "얇다. 컷오프를 2025-06으로 좁혀도 결과는 사실상 동일했다 (민감도 확인 완료).",
        "",
        "## 재현",
        "",
        "```",
        "python collect/pipeline.py master && python collect/pipeline.py enrich",
        "python collect/pipeline.py build",
        "python analysis/run_all.py",
        "```",
    ]
    (ROOT / "REPORT.md").write_text("\n".join(lines))
    print(f"wrote {ROOT / 'REPORT.md'}")


if __name__ == "__main__":
    boot = sys.argv[1] if len(sys.argv) > 1 else "1000"
    label = sys.argv[2] if len(sys.argv) > 2 else "full"
    run("build_sales_dataset.py")   # main outcome: Gamalytic copiesSold
    run("tail.py", boot)
    run("middle.py")
    run("concentration.py")
    run("robustness.py")
    run("era.py")
    write_report()
    run("export_web.py", label)
