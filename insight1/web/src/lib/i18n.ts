// UI strings for ko / en / ja. Dynamic paragraphs are template functions that
// receive the results object so conditional verdict phrasing stays localized.
export type Locale = "ko" | "en" | "ja";

const p3 = (x: number) => (x < 0.001 ? x.toExponential(1) : x.toFixed(3));
const pct = (x: number) => (100 * x).toFixed(1) + "%";
const f2 = (x: number) => x.toFixed(2);

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem("insight1-lang");
    if (saved === "ko" || saved === "en" || saved === "ja") return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("ja")) return "ja";
  return "en";
}

const ko = {
  docTitle: "코옵 vs 싱글 vs 로그라이크: 승자독식 구조 검증" as string,
  loading: "report_data.json 로딩 중…",
  kicker: (label: string, date: string) => `Steam 인디게임 분포 연구 · ${label} · ${date}`,
  snapshot: { pilot: "파일럿 데이터", interim: "수집 진행 중 · 부분 데이터(무작위 표본)", full: "전체 데이터" } as Record<string, string>,
  title: "코옵 게임의 성공은 정말 더 승자독식인가" as string,
  lede: (m: any) => `온라인 코옵 게임의 입소문은 "친구 그룹이 동시에 모여야 작동하는" 조정(coordination)
    구조다. supercritical 분기 과정이 예측하는 대로라면 코옵 코호트의 성공 분포는 싱글
    내러티브 게임보다 더 극단적이어야 한다 — 꼬리는 더 무겁고, 중간은 비어 있고, 집중도는
    더 높아야 한다. 스팀 리뷰 수(판매량 대리변수)로 세 가설을 검증했다.
    코호트 A(코옵) <b>${m.n_A.toLocaleString()}개</b>,
    코호트 B(싱글 내러티브) <b>${m.n_B.toLocaleString()}개</b>${m.n_R
      ? `, 코호트 R(로그라이크) <b>${m.n_R.toLocaleString()}개</b>` : ""}
    (유료 · 초기가 &lt;$40 · 2022.01–2025.06 출시 · 리뷰 ≥10 · 코호트는 상호배타,
    분류 우선순위 코옵 &gt; 로그라이크 &gt; 내러티브).`,
  cohortA: "코옵 (온라인)",
  cohortB: "싱글 내러티브",
  cohortR: "로그라이크",
  verdict: (ok: boolean | undefined): string => (ok ? "지지" : "불확정"),
  tile1k: "H1 · 더 무거운 꼬리",
  tile1s: (d: any) => `차이 ${f2(d.point)} [${f2(d.ci95[0])}, ${f2(d.ci95[1])}]`,
  tile2k: "H2 · 빈 허리 (리뷰 100–1k 비율)",
  tile2s: (m: any) => `Fisher p=${p3(m.middle_share_test.fisher_p)} · dip p ${p3(m.A.dip_p)} / ${p3(m.B.dip_p)}`,
  tile3k: "H3 · 집중도 (Gini)",
  tile3s: (c: any) => `상위 1% 점유 ${pct(c.A.top1_share)} / ${pct(c.B.top1_share)}`,
  c1t: "가설 1 — 꼬리 비교: 로그-로그 CCDF",
  c1cap: (t: any) => `점은 관측 CCDF, 점선은 xmin 이상 구간의 멱함수 적합. 기울기가 완만할수록(α 작을수록)
    상위권으로 갈수록 확률이 천천히 줄어드는 무거운 꼬리.
    PL vs lognormal 우도비: A R=${f2(t.A.LR_powerlaw_vs_lognormal)} (p=${p3(t.A.p_powerlaw_vs_lognormal)}),
    B R=${f2(t.B.LR_powerlaw_vs_lognormal)} (p=${p3(t.B.p_powerlaw_vs_lognormal)})
    — p가 크면 멱함수/로그정규 판별 불가이므로 "무거운 꼬리"로만 해석.`,
  interpT: "이 결과가 뜻하는 것",
  interp1: (t: any, ok: boolean | undefined) => {
    const d = t.alpha_diff_A_minus_B;
    let s = `α는 "성공이 위로 갈수록 얼마나 빨리 희귀해지는가"를 재는 값이다.
      <b>α가 작을수록 초대형 히트가 상대적으로 자주 나오는, 더 극단적인 구조</b>다.
      현재 코옵 α=${f2(t.A.alpha)}, 싱글 α=${f2(t.B.alpha)}로 `;
    s += t.A.alpha < t.B.alpha
      ? `코옵 쪽 꼬리가 더 무겁다 — 그래프에서도 코옵 점선의 기울기가 더 완만해서,
         오른쪽 끝(초대형 히트 구간)에서 코옵 곡선이 싱글 위에 있다. `
      : `예상과 달리 코옵 꼬리가 더 무겁지 않다. `;
    s += ok
      ? `부트스트랩 95% 신뢰구간 [${f2(d.ci95[0])}, ${f2(d.ci95[1])}]이 0을 제외하므로
         이 차이는 우연으로 보기 어렵다 → <b>가설 1 지지</b>.`
      : `다만 차이의 95% 신뢰구간 [${f2(d.ci95[0])}, ${f2(d.ci95[1])}]이 0을 포함한다 —
         즉 "차이가 없다"는 가능성을 아직 배제할 수 없어 <b>통계적으로는 불확정</b>이다.
         표본이 커지면 구간이 좁아진다.`;
    return s;
  },
  c2t: "가설 2 — 빈 허리: log₁₀(리뷰) 밀도 (KDE)",
  c2cap: () => `회색 음영이 중간 성공 구간(리뷰 100–1,000개 ≈ 판매 3.5천–3.5만 장, Boxleiter ×35).
    쌍봉(대부분 조기 소멸 + 소수 폭발)이면 이 구간이 얇아진다.`,
  interp2: (m: any, ok: boolean | undefined) => {
    let s = `가설이 맞다면 코옵은 "적당히 성공"(회색 구간)이 드물어야 한다 —
      친구 그룹이 모이지 못하면 조기 소멸하고, 모이기 시작하면 폭발하기 때문에
      중간에 머물 이유가 없다는 논리다. 실제 중간 구간 비율은 코옵 ${pct(m.A.middle_share)} vs
      싱글 ${pct(m.B.middle_share)}`;
    s += ok
      ? `로 코옵이 유의하게 얇다 (Fisher p=${p3(m.middle_share_test.fisher_p)}) → <b>가설 2 지지</b>. `
      : `이며, 이 차이는 아직 통계적으로 유의하지 않다
         (Fisher p=${p3(m.middle_share_test.fisher_p)}) → <b>불확정</b>. `;
    s += `쌍봉성(dip test)은 코옵 p=${p3(m.A.dip_p)}, 싱글 p=${p3(m.B.dip_p)} — `;
    s += m.A.dip_p < 0.05
      ? `코옵 분포는 봉우리가 하나가 아니라는 증거가 있다 (조기 소멸 그룹과 폭발 그룹으로 갈라짐).`
      : `p가 0.05보다 크면 "봉우리가 하나뿐"이라는 가설을 기각하지 못한다는 뜻이다.`;
    return s;
  },
  c3t: "가설 3 — 집중도: 로렌츠 곡선",
  c3cap: (c: any) => `곡선이 아래로 처질수록 리뷰(≈판매)가 소수 게임에 집중. 조기 소멸률(리뷰 <10):
    코옵 ${pct(c.A.early_death_rate)} vs 싱글 ${pct(c.B.early_death_rate)}
    (χ² p=${p3(c.early_death_test.p)}).`,
  interp3: (c: any, ok: boolean | undefined) => {
    let s = `로렌츠 곡선이 대각선(균등선)에서 멀수록 성공이 소수에 집중된 시장이다.
      지금 수치로는 <b>코옵 상위 1% 게임이 코호트 전체 리뷰의 ${pct(c.A.top1_share)}</b>를
      가져가는 반면, 싱글 상위 1%는 ${pct(c.B.top1_share)}에 그친다.
      Gini 계수(0=완전 균등, 1=완전 독식)도 코옵 ${f2(c.A.gini)} vs 싱글 ${f2(c.B.gini)}. `;
    s += ok
      ? `두 Gini의 신뢰구간이 겹치지 않으므로 <b>가설 3 지지</b> — 코옵 시장이 구조적으로 더 승자독식이다. `
      : `다만 두 Gini의 신뢰구간이 겹쳐 <b>아직 불확정</b> — 방향은 가설과 일치하지만 표본이 더 필요하다. `;
    s += `조기 소멸률(리뷰 10개 미만)은 코옵 ${pct(c.A.early_death_rate)} vs
      싱글 ${pct(c.B.early_death_rate)}로, "대부분 조기 소멸 + 소수 폭발" 구조의 앞부분을 보여준다.`;
    return s;
  },
  sumT: "수치 요약",
  thA: "코옵 (A)",
  thB: "싱글 내러티브 (B)",
  thR: "로그라이크 (R)",
  rows: {
    n: "표본 (리뷰 ≥10)", alpha: "멱함수 지수 α (SE)", xmin: "xmin / 꼬리 표본",
    middle: "중간 구간(100–1k) 비율", dip: "Hartigan dip p", gini: "Gini [95% CI]",
    top: "상위 1% / 5% 점유", death: "조기 소멸률 (<10 리뷰)",
    median: "중간값 (리뷰)", mean: "평균 (중간값의 배수)", geomean: "기하평균",
  },
  robT: "강건성 — 가격대·연도별 α",
  robPrice: "가격대", robYear: "연도", robA: "α 코옵 (n)", robB: "α 싱글 (n)",
  limitT: "한계",
  limits: [
    `<b>리뷰-판매 배수의 장르 차이</b> — Boxleiter 배수는 장르·가격·연도에 따라 다르다.
     분포 형태 비교는 배수가 코호트 내에서 리뷰 수와 독립일 때만 완전히 안전하다.`,
    `<b>스트리밍 노출 교란</b> — 코옵 히트작은 트위치/유튜브 노출과 상호작용한다.
     관측된 집중도를 "친구 조정" 메커니즘만으로 귀속할 수 없다.`,
    `<b>SteamSpy 신선도</b> — 태그·가격은 SteamSpy 캐시 기준. 리뷰 수는 가능한 한
     스팀 공식 appreviews로 대체했다.`,
    `<b>생존 편향</b> — 상장폐지된 게임은 스팀 API에서 빠져 조기 소멸률이 과소추정될 수 있다.`,
  ],
  foot: `데이터: SteamSpy + Steam 공식 API · 리뷰 수는 판매량의 대리변수 · 코드/재현:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  aboutT: "만든 사람",
  aboutBody: `이 분석은 <b>Concode</b>의 개발자가 만들었습니다. 저희는 지금 스팀에서
    <b>Graytail</b>이라는 게임을 만들고 있어요. 이 리포트가 도움이 되었다면,
    저희 게임 페이지도 한번 방문해 주세요 — 큰 힘이 됩니다.`,
  aboutSteam: "Graytail on Steam →",
  aboutRepo: "분석 코드 (GitHub) →",
  axReviews: "리뷰 수",
  axCcdfY: "P(X ≥ x)",
  axLogReviews: "리뷰 수 (로그 축)",
  axCumGames: "게임 누적 비율",
  bandLabel: "중간 구간 100–1k",
  equality: "균등선",
  ttCcdf: (x: number, p: number) => `리뷰 ≥ ${x.toLocaleString()}<br/>게임 비율 ${(100 * p).toPrecision(2)}%`,
  ttLorenzHead: (x: number) => `하위 ${pct(x)} 게임`,
  ttLorenzRow: (name: string, y: number) => `${name}: 리뷰 ${pct(y)}`,
};

const en: typeof ko = {
  docTitle: "Co-op vs Single-player: testing winner-take-all",
  loading: "Loading report_data.json…",
  kicker: (label, date) => `Steam indie-game distribution study · ${label} · ${date}`,
  snapshot: { pilot: "Pilot data", interim: "Collection in progress · partial data (random sample)", full: "Full data" },
  title: "Is co-op success really more winner-take-all?",
  lede: (m) => `Word of mouth for online co-op games runs on a coordination structure —
    a friend group has to converge at the same time. If the supercritical branching-process
    prediction holds, the co-op cohort's success distribution should be more extreme than
    single-player narrative games: a heavier tail, a hollowed-out middle, and higher
    concentration. We test three hypotheses using Steam review counts (a sales proxy).
    Cohort A (co-op) <b>${m.n_A.toLocaleString()} games</b>,
    cohort B (single-player narrative) <b>${m.n_B.toLocaleString()} games</b>${m.n_R
      ? `, cohort R (roguelike) <b>${m.n_R.toLocaleString()} games</b>` : ""}
    (paid · launch price &lt;$40 · released 2022.01–2025.06 · ≥10 reviews · cohorts are
    disjoint, classification priority co-op &gt; roguelike &gt; narrative).`,
  cohortA: "Co-op (online)",
  cohortB: "Single-player narrative",
  cohortR: "Roguelike",
  verdict: (ok) => (ok ? "supported" : "inconclusive"),
  tile1k: "H1 · Heavier tail",
  tile1s: (d) => `diff ${f2(d.point)} [${f2(d.ci95[0])}, ${f2(d.ci95[1])}]`,
  tile2k: "H2 · Missing middle (share at 100–1k reviews)",
  tile2s: (m) => `Fisher p=${p3(m.middle_share_test.fisher_p)} · dip p ${p3(m.A.dip_p)} / ${p3(m.B.dip_p)}`,
  tile3k: "H3 · Concentration (Gini)",
  tile3s: (c) => `top-1% share ${pct(c.A.top1_share)} / ${pct(c.B.top1_share)}`,
  c1t: "Hypothesis 1 — tail comparison: log-log CCDF",
  c1cap: (t) => `Dots are the observed CCDF; dashed lines are the power-law fit above xmin.
    A flatter slope (smaller α) means a heavier tail — probability decays slowly toward
    mega-hits. Power law vs lognormal likelihood ratio:
    A R=${f2(t.A.LR_powerlaw_vs_lognormal)} (p=${p3(t.A.p_powerlaw_vs_lognormal)}),
    B R=${f2(t.B.LR_powerlaw_vs_lognormal)} (p=${p3(t.B.p_powerlaw_vs_lognormal)}) —
    when p is large the two are indistinguishable, so read this as "heavy tail" rather
    than a strict power law.`,
  interpT: "What this means",
  interp1: (t, ok) => {
    const d = t.alpha_diff_A_minus_B;
    let s = `α measures how quickly success becomes rare as you move up the ranks.
      <b>The smaller the α, the more often outsized hits occur — a more extreme structure.</b>
      Currently co-op α=${f2(t.A.alpha)} vs single-player α=${f2(t.B.alpha)}, so `;
    s += t.A.alpha < t.B.alpha
      ? `the co-op tail is heavier — you can see it in the chart: the co-op dashed line is
         flatter, sitting above the single-player line at the far right (mega-hit zone). `
      : `contrary to the hypothesis, the co-op tail is not heavier. `;
    s += ok
      ? `The bootstrap 95% CI [${f2(d.ci95[0])}, ${f2(d.ci95[1])}] excludes 0, so this
         difference is unlikely to be chance → <b>Hypothesis 1 supported</b>.`
      : `However, the 95% CI of the difference [${f2(d.ci95[0])}, ${f2(d.ci95[1])}] includes 0 —
         we cannot yet rule out "no difference", so this is <b>statistically inconclusive</b>.
         The interval narrows as the sample grows.`;
    return s;
  },
  c2t: "Hypothesis 2 — missing middle: log₁₀(reviews) density (KDE)",
  c2cap: () => `The gray band is the mid-success zone (100–1,000 reviews ≈ 3.5k–35k copies,
    Boxleiter ×35). A bimodal shape (mostly early deaths + a few explosions) thins this band.`,
  interp2: (m, ok) => {
    let s = `If the hypothesis holds, "moderate success" (the gray band) should be rare for
      co-op — when the friend group fails to converge the game dies early, and once it
      converges it explodes, so there is little reason to sit in the middle. The observed
      middle share is co-op ${pct(m.A.middle_share)} vs single-player ${pct(m.B.middle_share)}`;
    s += ok
      ? `, significantly thinner for co-op (Fisher p=${p3(m.middle_share_test.fisher_p)})
         → <b>Hypothesis 2 supported</b>. `
      : `, and the difference is not yet statistically significant
         (Fisher p=${p3(m.middle_share_test.fisher_p)}) → <b>inconclusive</b>. `;
    s += `Bimodality (dip test): co-op p=${p3(m.A.dip_p)}, single-player p=${p3(m.B.dip_p)} — `;
    s += m.A.dip_p < 0.05
      ? `there is evidence the co-op distribution has more than one peak (an early-death
         group and an explosion group).`
      : `p above 0.05 means we cannot reject "a single peak".`;
    return s;
  },
  c3t: "Hypothesis 3 — concentration: Lorenz curves",
  c3cap: (c) => `The deeper the curve sags below the diagonal, the more reviews (≈sales)
    concentrate in a few games. Early-death rate (<10 reviews):
    co-op ${pct(c.A.early_death_rate)} vs single-player ${pct(c.B.early_death_rate)}
    (χ² p=${p3(c.early_death_test.p)}).`,
  interp3: (c, ok) => {
    let s = `The farther a Lorenz curve sits from the diagonal (equality line), the more
      winner-take-all the market. Right now <b>the top 1% of co-op games take
      ${pct(c.A.top1_share)} of all cohort reviews</b>, versus ${pct(c.B.top1_share)} for
      single-player. Gini (0=perfect equality, 1=total monopoly):
      co-op ${f2(c.A.gini)} vs single-player ${f2(c.B.gini)}. `;
    s += ok
      ? `The two Gini confidence intervals do not overlap → <b>Hypothesis 3 supported</b> —
         the co-op market is structurally more winner-take-all. `
      : `However the two Gini confidence intervals overlap, so this is <b>still
         inconclusive</b> — the direction matches the hypothesis but more data is needed. `;
    s += `Early-death rates (fewer than 10 reviews) are co-op ${pct(c.A.early_death_rate)} vs
      single-player ${pct(c.B.early_death_rate)} — the front half of the
      "mostly die early + a few explode" structure.`;
    return s;
  },
  sumT: "Summary of numbers",
  thA: "Co-op (A)",
  thB: "Single-player narrative (B)",
  thR: "Roguelike (R)",
  rows: {
    n: "Sample (≥10 reviews)", alpha: "Power-law exponent α (SE)", xmin: "xmin / tail size",
    middle: "Middle band (100–1k) share", dip: "Hartigan dip p", gini: "Gini [95% CI]",
    top: "Top 1% / 5% share", death: "Early-death rate (<10 reviews)",
    median: "Median (reviews)", mean: "Mean (× median)", geomean: "Geometric mean",
  },
  robT: "Robustness — α by price band and year",
  robPrice: "Price band", robYear: "Year", robA: "α co-op (n)", robB: "α single (n)",
  limitT: "Limitations",
  limits: [
    `<b>Genre differences in the review-to-sales multiplier</b> — the Boxleiter multiplier
     varies by genre, price, and year. Shape comparisons are fully safe only if the
     multiplier is independent of review count within each cohort.`,
    `<b>Streaming-exposure confound</b> — co-op hits interact with Twitch/YouTube exposure.
     The observed concentration cannot be attributed to the "friend coordination"
     mechanism alone.`,
    `<b>SteamSpy freshness</b> — tags and prices come from SteamSpy's cache. Review counts
     were replaced with official Steam appreviews data wherever possible.`,
    `<b>Survivorship bias</b> — delisted games disappear from the Steam API, so early-death
     rates may be underestimated.`,
  ],
  foot: `Data: SteamSpy + official Steam API · review count is a sales proxy · code:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  aboutT: "Who made this",
  aboutBody: `This analysis was made by a developer at <b>Concode</b>. We are currently
    building a game called <b>Graytail</b> on Steam. If this report helped you, please
    consider visiting our store page — it means a lot.`,
  aboutSteam: "Graytail on Steam →",
  aboutRepo: "Analysis code (GitHub) →",
  axReviews: "Review count",
  axCcdfY: "P(X ≥ x)",
  axLogReviews: "Review count (log scale)",
  axCumGames: "Cumulative share of games",
  bandLabel: "middle band 100–1k",
  equality: "equality line",
  ttCcdf: (x, p) => `≥ ${x.toLocaleString()} reviews<br/>${(100 * p).toPrecision(2)}% of games`,
  ttLorenzHead: (x) => `bottom ${pct(x)} of games`,
  ttLorenzRow: (name, y) => `${name}: ${pct(y)} of reviews`,
};

const ja: typeof ko = {
  docTitle: "Co-op vs シングル: 勝者総取り構造の検証",
  loading: "report_data.json を読み込み中…",
  kicker: (label, date) => `Steamインディーゲーム分布研究 · ${label} · ${date}`,
  snapshot: { pilot: "パイロットデータ", interim: "収集進行中 · 部分データ(ランダム標本)", full: "全データ" },
  title: "Co-opゲームの成功は本当に「勝者総取り」なのか",
  lede: (m) => `オンラインCo-opゲームの口コミは「フレンドグループが同時に集まって初めて機能する」
    調整(coordination)構造で動く。supercritical分岐過程の予測どおりなら、Co-opコホートの
    成功分布はシングルプレイヤー・ナラティブゲームよりも極端になるはずだ — 裾はより重く、
    中間層は空洞化し、集中度はより高くなる。Steamレビュー数(販売量の代理変数)で3つの
    仮説を検証した。コホートA(Co-op) <b>${m.n_A.toLocaleString()}本</b>、
    コホートB(シングル・ナラティブ) <b>${m.n_B.toLocaleString()}本</b>${m.n_R
      ? `、コホートR(ローグライク) <b>${m.n_R.toLocaleString()}本</b>` : ""}
    (有料 · 初期価格 &lt;$40 · 2022.01–2025.06リリース · レビュー10件以上 ·
    コホートは互いに排他的、分類優先順位はCo-op &gt; ローグライク &gt; ナラティブ)。`,
  cohortA: "Co-op (オンライン)",
  cohortB: "シングル・ナラティブ",
  cohortR: "ローグライク",
  verdict: (ok) => (ok ? "支持" : "未確定"),
  tile1k: "H1 · より重い裾",
  tile1s: (d) => `差 ${f2(d.point)} [${f2(d.ci95[0])}, ${f2(d.ci95[1])}]`,
  tile2k: "H2 · 中間層の欠落 (レビュー100–1k比率)",
  tile2s: (m) => `Fisher p=${p3(m.middle_share_test.fisher_p)} · dip p ${p3(m.A.dip_p)} / ${p3(m.B.dip_p)}`,
  tile3k: "H3 · 集中度 (ジニ係数)",
  tile3s: (c) => `上位1%シェア ${pct(c.A.top1_share)} / ${pct(c.B.top1_share)}`,
  c1t: "仮説1 — 裾の比較: 両対数CCDF",
  c1cap: (t) => `点は観測CCDF、破線はxmin以上の区間のべき乗則フィット。傾きが緩やかなほど(αが小さいほど)
    上位に行っても確率がゆっくり減る「重い裾」。べき乗則 vs 対数正規の尤度比:
    A R=${f2(t.A.LR_powerlaw_vs_lognormal)} (p=${p3(t.A.p_powerlaw_vs_lognormal)}),
    B R=${f2(t.B.LR_powerlaw_vs_lognormal)} (p=${p3(t.B.p_powerlaw_vs_lognormal)})
    — pが大きい場合は両者を判別できないため、厳密な「べき乗則」ではなく「重い裾」として解釈する。`,
  interpT: "この結果が意味すること",
  interp1: (t, ok) => {
    const d = t.alpha_diff_A_minus_B;
    let s = `αは「上位に行くほど成功がどれだけ速く希少になるか」を測る値だ。
      <b>αが小さいほど超大型ヒットが相対的に頻繁に出る、より極端な構造</b>になる。
      現在Co-op α=${f2(t.A.alpha)}、シングル α=${f2(t.B.alpha)}で、`;
    s += t.A.alpha < t.B.alpha
      ? `Co-op側の裾がより重い — グラフでもCo-opの破線の傾きがより緩やかで、
         右端(超大型ヒット領域)でCo-op曲線がシングルの上にある。`
      : `予想に反してCo-opの裾は重くない。`;
    s += ok
      ? `ブートストラップ95%信頼区間 [${f2(d.ci95[0])}, ${f2(d.ci95[1])}] が0を含まないため、
         この差は偶然とは考えにくい → <b>仮説1を支持</b>。`
      : `ただし差の95%信頼区間 [${f2(d.ci95[0])}, ${f2(d.ci95[1])}] は0を含む —
         つまり「差がない」可能性をまだ排除できず、<b>統計的には未確定</b>だ。
         標本が増えれば区間は狭まる。`;
    return s;
  },
  c2t: "仮説2 — 中間層の欠落: log₁₀(レビュー数)密度 (KDE)",
  c2cap: () => `灰色の帯が中間的成功ゾーン(レビュー100–1,000件 ≈ 販売3.5千–3.5万本、Boxleiter ×35)。
    二峰型(大半が早期消滅 + 少数が爆発)ならこの帯が薄くなる。`,
  interp2: (m, ok) => {
    let s = `仮説が正しければ、Co-opでは「そこそこの成功」(灰色の帯)が稀になるはずだ —
      フレンドグループが集まらなければ早期に消滅し、集まり始めれば爆発するため、
      中間に留まる理由がないという論理だ。実際の中間帯比率はCo-op ${pct(m.A.middle_share)} vs
      シングル ${pct(m.B.middle_share)}`;
    s += ok
      ? `で、Co-opが有意に薄い (Fisher p=${p3(m.middle_share_test.fisher_p)})
         → <b>仮説2を支持</b>。`
      : `で、この差はまだ統計的に有意ではない
         (Fisher p=${p3(m.middle_share_test.fisher_p)}) → <b>未確定</b>。`;
    s += `二峰性(dip検定)はCo-op p=${p3(m.A.dip_p)}、シングル p=${p3(m.B.dip_p)} — `;
    s += m.A.dip_p < 0.05
      ? `Co-opの分布はピークが1つではないという証拠がある(早期消滅グループと爆発グループに分裂)。`
      : `pが0.05より大きい場合、「ピークは1つだけ」という仮説を棄却できないという意味だ。`;
    return s;
  },
  c3t: "仮説3 — 集中度: ローレンツ曲線",
  c3cap: (c) => `曲線が下に垂れるほどレビュー(≈販売)が少数のゲームに集中。早期消滅率(レビュー10件未満):
    Co-op ${pct(c.A.early_death_rate)} vs シングル ${pct(c.B.early_death_rate)}
    (χ² p=${p3(c.early_death_test.p)})。`,
  interp3: (c, ok) => {
    let s = `ローレンツ曲線が対角線(均等線)から遠いほど、成功が少数に集中した市場だ。
      現在の数値では<b>Co-op上位1%のゲームがコホート全体レビューの ${pct(c.A.top1_share)}</b>を
      持っていくのに対し、シングル上位1%は ${pct(c.B.top1_share)}にとどまる。
      ジニ係数(0=完全均等、1=完全独占)もCo-op ${f2(c.A.gini)} vs シングル ${f2(c.B.gini)}。`;
    s += ok
      ? `2つのジニ係数の信頼区間が重ならないため<b>仮説3を支持</b> — Co-op市場は構造的に
         より勝者総取りだ。`
      : `ただし2つのジニ係数の信頼区間が重なるため<b>まだ未確定</b> — 方向は仮説と一致するが、
         より多くの標本が必要だ。`;
    s += `早期消滅率(レビュー10件未満)はCo-op ${pct(c.A.early_death_rate)} vs
      シングル ${pct(c.B.early_death_rate)}で、「大半が早期消滅 + 少数が爆発」構造の
      前半部分を示している。`;
    return s;
  },
  sumT: "数値サマリー",
  thA: "Co-op (A)",
  thB: "シングル・ナラティブ (B)",
  thR: "ローグライク (R)",
  rows: {
    n: "標本 (レビュー10件以上)", alpha: "べき指数 α (SE)", xmin: "xmin / 裾の標本数",
    middle: "中間帯(100–1k)比率", dip: "Hartigan dip p", gini: "ジニ係数 [95% CI]",
    top: "上位1% / 5%シェア", death: "早期消滅率 (レビュー10件未満)",
    median: "中央値 (レビュー)", mean: "平均 (中央値の倍数)", geomean: "幾何平均",
  },
  robT: "頑健性 — 価格帯·年別のα",
  robPrice: "価格帯", robYear: "年", robA: "α Co-op (n)", robB: "α シングル (n)",
  limitT: "限界",
  limits: [
    `<b>レビュー→販売倍率のジャンル差</b> — Boxleiter倍率はジャンル·価格·年によって異なる。
     分布形状の比較が完全に安全なのは、倍率がコホート内でレビュー数と独立な場合のみ。`,
    `<b>配信露出の交絡</b> — Co-opのヒット作はTwitch/YouTube露出と相互作用する。観測された
     集中度を「フレンド調整」メカニズムだけに帰属することはできない。`,
    `<b>SteamSpyの鮮度</b> — タグ·価格はSteamSpyのキャッシュ基準。レビュー数は可能な限り
     Steam公式appreviewsで置き換えた。`,
    `<b>生存バイアス</b> — ストアから削除されたゲームはSteam APIから消えるため、
     早期消滅率は過小推定される可能性がある。`,
  ],
  foot: `データ: SteamSpy + Steam公式API · レビュー数は販売量の代理変数 · コード/再現:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  aboutT: "作った人",
  aboutBody: `この分析は<b>Concode</b>の開発者が作りました。私たちは現在Steamで
    <b>Graytail</b>というゲームを開発しています。このレポートが役に立ったら、
    ぜひゲームのストアページにも遊びに来てください — 大きな励みになります。`,
  aboutSteam: "Graytail on Steam →",
  aboutRepo: "分析コード (GitHub) →",
  axReviews: "レビュー数",
  axCcdfY: "P(X ≥ x)",
  axLogReviews: "レビュー数 (対数軸)",
  axCumGames: "ゲームの累積比率",
  bandLabel: "中間帯 100–1k",
  equality: "均等線",
  ttCcdf: (x, p) => `レビュー ≥ ${x.toLocaleString()}<br/>ゲーム比率 ${(100 * p).toPrecision(2)}%`,
  ttLorenzHead: (x) => `下位 ${pct(x)} のゲーム`,
  ttLorenzRow: (name, y) => `${name}: レビュー ${pct(y)}`,
};

export const T: Record<Locale, typeof ko> = { ko, en, ja };
export const LOCALE_NAMES: Record<Locale, string> = { ko: "한국어", en: "English", ja: "日本語" };
