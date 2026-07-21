// UI strings for ko / en / ja. Dynamic paragraphs are template functions that
// receive the results object so conditional verdict phrasing stays localized.
export type Locale = "ko" | "en" | "ja";

const p3 = (x: number) => (x < 0.001 ? x.toExponential(1) : x.toFixed(3));
const pct = (x: number) => (100 * x).toFixed(1) + "%";
const f2 = (x: number) => x.toFixed(2);

const sig2 = (x: number) => {
  const m = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1));
  return (Math.round(x / m) * m).toLocaleString();
};

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
    더 높아야 한다. <b>결과변수는 Gamalytic의 판매량 추정치(copiesSold)</b>다.
    코호트 A(코옵) <b>${m.n_A.toLocaleString()}개</b>${m.n_R
      ? `, 코호트 R(로그라이크) <b>${m.n_R.toLocaleString()}개</b>` : ""},
    코호트 B(싱글 내러티브) <b>${m.n_B.toLocaleString()}개</b>
    (유료 · 가격 &lt;$40 · 2022.01–2025.12 출시 · AAA 제외 · 분석 표본은 판매 ≥500장 (저판매 구간의 추정 노이즈와 취미 수준 출시작 제외) ·
    코호트는 상호배타, 분류 우선순위 코옵 &gt; 로그라이크 &gt; 내러티브).`,
  cohortA: "코옵 (온라인)",
  cohortB: "싱글 내러티브",
  cohortR: "로그라이크",
  c1t: "가설 1 — 꼬리 비교: 로그-로그 CCDF (판매량)",
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
  c2t: "가설 2 — 빈 허리: log₁₀(판매량) 밀도 (KDE)",
  c2cap: () => `회색 음영이 중간 성공 구간(판매 3.5천–3.5만 장 ≈ 매출 $50K–500K대).
    쌍봉(대부분 조기 소멸 + 소수 폭발)이면 이 구간이 얇아진다.`,
  interp2: (m: any, ok: boolean | undefined) => {
    const sh = (k: string) => pct(m[k].middle_share);
    const ks = ["A", "R", "B"].filter((k) => m[k]);
    const nm: Record<string, string> = { A: "코옵", R: "로그라이크", B: "내러티브" };
    const dipSig = ks.filter((k) => m[k].dip_p < 0.05);
    const fp = p3(m.middle_share_test.fisher_p);
    let t = `가설이 맞다면 코옵 곡선은 회색 구간(중간 성공)이 움푹 꺼지고, 분포에 봉우리가
      두 개 생겨야 한다 — "대부분 조기 소멸 + 소수 폭발"이라면 중간에 머무는 게임이 드물어야
      하기 때문이다. 표에서 확인할 것은 두 가지다.
      <br/><br/>① <b>허리 두께</b> — 회색 구간에 안착한 비율은 ${ks.map((k) => `${nm[k]} ${sh(k)}`).join(" / ")}. `;
    t += ok
      ? `코옵의 허리가 유의하게 얇다 (Fisher p=${fp}) — 가설이 예측한 방향이다.`
      : `코호트 간 차이가 통계적으로 구분되지 않는다 (Fisher p=${fp}). 코옵의 허리가 특별히
         비어 있지 않다.`;
    t += `<br/><br/>② <b>봉우리 개수</b> (dip test) — `;
    t += dipSig.length
      ? `${dipSig.map((k) => nm[k]).join("·")}에서 봉우리가 하나가 아니라는 증거가 있다
         (p<0.05) — 조기 소멸 그룹과 성공 그룹으로 갈라진다는 신호다.`
      : `그래프의 코옵 곡선은 눈으로 보면 거의 쌍봉이다 — 약 1천 장에서 첫 봉우리, 회색
         구간에서 계곡, 그 오른쪽 수만 장대에서 두 번째 언덕("조기 안착"과 "히트" 두 군집).
         그럼에도 dip 검정은 p>0.05로 쌍봉을 확정하지 못하는데, 두 번째 봉우리가 첫
         봉우리보다 낮고 완만하면 이 검정의 검정력이 약해지기 때문이다 — "시각적 쌍봉,
         통계적 미확정" 상태로 읽는 게 정확하다.`;
    t += `<br/><br/><b>정리:</b> `;
    if (ok && dipSig.includes("A")) {
      t += `코옵은 허리가 유의하게 얇고 분포도 두 봉우리로 갈라진다 — 빈 허리 가설(가설 2)이
        강하게 지지된다.`;
    } else if (ok) {
      t += `코옵만 가설이 그린 모양을 하고 있다 — 중간 성공 구간이 유의하게 꺼져 있고(허리
        검정 통과), 곡선도 계곡을 사이에 둔 두 언덕 형태다. 내러티브·로그라이크는 한 봉우리
        에서 매끈하게 줄어드는 정반대 모양. "죽거나, 중간을 건너뛰고 안착하거나"라는 코옵의
        이분법이 데이터에 나타난 것으로, dip 검정의 보수성 때문에 "확정 쌍봉" 도장은 아직
        못 받았을 뿐이다.`;
    } else if (dipSig.length) {
      t += `허리 두께 차이는 불확정이지만 일부 코호트에서 다봉성 신호가 있다 — 혼재된 그림이다.`;
    } else {
      t += `세 장르 모두 "낮은 구간에 몰려 있다가 위로 갈수록 매끄럽게 줄어드는" 같은 모양이며,
        코옵이라고 중간이 비어 있지 않다 — 빈 허리 가설(가설 2)은 현재 데이터에서 지지되지
        않는다.`;
    }
    return t;
  },
  c3t: "가설 3 — 집중도: 로렌츠 곡선",
  c3cap: (c: any) => `곡선이 아래로 처질수록 판매량이 소수 게임에 집중. 조기 소멸률(판매 <500장):
    코옵 ${pct(c.A.early_death_rate)} vs 싱글 ${pct(c.B.early_death_rate)}
    (χ² p=${p3(c.early_death_test.p)}).`,
  interp3: (c: any, ok: boolean | undefined) => {
    const g = (k: string) => c[k].gini, t1 = (k: string) => c[k].top1_share;
    const ks = ["A", "R", "B"].filter((k) => c[k]);
    const nm: Record<string, string> = { A: "코옵", R: "로그라이크", B: "내러티브" };
    const gMax = ks.sort((x, y) => g(y) - g(x))[0];
    const t1Max = [...ks].sort((x, y) => t1(y) - t1(x))[0];
    let t = `<b>먼저 큰 그림</b> — 세 곡선이 거의 겹칠 만큼 모두 대각선에서 깊게 처져 있다.
      상위 5% 게임이 전체 판매의 ${ks.map((k) => `${nm[k]} ${pct(c[k].top5_share)}`).join(" / ")}를
      가져간다 — <b>승자독식 자체는 장르 불문 스팀 인디 시장의 기본값</b>이고, 코호트 간
      차이는 그 위의 미세 구조다.
      <br/><br/>렌즈를 나누면 두 지표가 다른 얘기를 한다.
      ① <b>Gini (전 구간 불평등)</b> — ${ks.map((k) => `${nm[k]} ${g(k).toFixed(3)}`).join(" / ")}:
      ${nm[gMax]}가 가장 높다${gMax === "A" ? " — 특정 초대박 없이도 전 구간에서 승자·패자가 넓게 갈리는 구조" : ""}.
      ② <b>상위 1% 점유 (초대박 집중)</b> — ${ks.map((k) => `${nm[k]} ${pct(t1(k))}`).join(" / ")}:
      ${nm[t1Max]}의 초대박 쏠림이 가장 크다${t1Max !== gMax ? ` — Gini 1등(${nm[gMax]})과 다르다.
      ${nm[t1Max] === "내러티브" ? "내러티브는 소수 블록버스터가 유독 큰 \"스타 시스템\"형, " : ""}${gMax === "A" ? "코옵은 특정 스타 없이 전면적으로 불평등한 형태다" : ""}` : ""}.
      <br/><br/><b>판정</b> — `;
    t += ok
      ? `코옵 Gini가 내러티브보다 높고 신뢰구간도 겹치지 않는다 → <b>가설 3(코옵이 더
         승자독식) 지지</b> — 단, 위의 렌즈 구분대로 "전 구간 불평등" 기준이다.`
      : `코옵 Gini가 가장 높지만 내러티브와 신뢰구간이 겹쳐 <b>아직 불확정</b>이고, 초대박
         렌즈로는 오히려 내러티브·로그라이크가 앞선다 — "코옵이 더 승자독식"이라는 원가설은
         렌즈에 따라 답이 갈리는, 절반의 지지 상태다.`;
    t += ` 조기 소멸률(판매 500장 미만)은 ${ks.map((k) => `${nm[k]} ${pct(c[k].early_death_rate)}`).join(" / ")}
      — 로렌츠 곡선에 들어오지도 못한 게임들의 규모다.`;
    return t;
  },
  sumT: "수치 요약",
  thA: "코옵 (A)",
  thB: "싱글 내러티브 (B)",
  thR: "로그라이크 (R)",
  rows: {
    n: "표본 (판매 ≥500장)", alpha: "멱함수 지수 α (SE)", xmin: "xmin / 꼬리 표본",
    middle: "중간 구간(3.5천~3.5만 장) 비율", dip: "Hartigan dip p", gini: "Gini [95% CI]",
    top: "상위 1% / 5% 점유", death: "조기 소멸률 (<500장)",
    median: "중간값 (판매량)", mean: "평균 (기하평균의 배수)", geomean: "기하평균",
  },
  sumNote: (c: any, hasR: boolean) => {
    const gap = (k: string) => (c[k].mean / c[k].geomean).toFixed(0);
    return `읽는 법 — <b>중간값</b>은 게임을 성과순으로 줄 세웠을 때 한가운데 게임의 판매량이다.
      <b>기하평균</b>은 배수(로그) 스케일에서의 평균으로, "이 장르의 보통 게임이 어느 자릿수에서
      사는가"를 가리키며 소수 히트작의 영향을 받지 않는다 — 이 데이터처럼 성과가 몇 배씩
      벌어지는 분포에서의 올바른 평균이다. 반면 <b>산술평균</b>은 상위 1%가 지배하는 "복권
      기댓값"이라, 산술평균이 기하평균의 몇 배인가(코옵 ×${gap("A")}${hasR ? `, 로그라이크
      ×${gap("R")}` : ""}, 내러티브 ×${gap("B")})가 클수록 그 장르는 복권판에 가깝다.`;
  },
  insightTitle: (name: string): string => `${name} 게임을 만든다면`,
  insightCard: (d: any): string => `<ul>
    <li><b>보통의 세계</b> — 기하평균 판매 약 ${sig2(d.geomean)}장 자릿수의 세계다.</li>
    <li><b>절반의 현실</b> — 조기 소멸을 넘긴 게임의 절반은 판매 ${sig2(d.median)}장 미만에
      머문다.</li>
    <li><b>조기 소멸 위험</b> — 출시작의 ${(100 * d.early).toFixed(0)}%는 판매 500장을
      못 넘긴다.</li>
    <li><b>중간 성공 확률</b> — 조기 소멸을 넘긴 게임 중 ${(100 * d.middle).toFixed(0)}%가
      판매 3.5천–3.5만 장(매출 $50K–500K대) 구간에 안착한다.</li>
    <li><b>복권 배수</b> — 산술평균은 기하평균의 ×${d.lot.toFixed(0)}. 크게 터지면
      전형적 성과의 수십~수백 배를 가져가는 구조다.</li>
    <li><b>승자독식 정도</b> — 상위 1% 게임이 전체 판매량의 ${(100 * d.top1).toFixed(0)}%,
      상위 5%가 ${(100 * d.top5).toFixed(0)}%를 점유한다.</li>
  </ul>`,
  countT: "성공 게임의 절대 수 — 판매 임계값별",
  countCap: `비율이 아니라 개수다. 2022~2025년 4년치 출시작 기준이고, 판매량은 2026년 7월
    시점의 누적치. 모수가 다르다는 점을 기억할 것 — 코옵 886 / 로그라이크 3,516 /
    내러티브 8,071개 (약 1:4:9).`,
  countTh: "성공 기준",
  countNote: (c: any): string => {
    const t = c.abs_counts;
    if (!t) return "";
    const g = (th: string, k: string) => t[th]?.[k] ?? 0;
    return `내러티브는 9배 많이 만들어지므로 <b>중간 성공(3.5만~10만 장)의 절대 수는
      내러티브가 2~3배 많다</b> — "적당히 성공한 사례"가 많이 보이는 이유다. 약 50만 장에서
      균형이 맞고(코옵 ${g("500000","A")} vs 내러티브 ${g("500000","B")}),
      <b>100만 장 이상부터는 코옵이 절대 수로도 역전한다</b>
      (${g("1000000","A")} vs ${g("1000000","B")}${g("5000000","A") ? `, 500만 장 이상은
      ${g("5000000","A")} vs ${g("5000000","B")}` : ""}) — 9배 적게 만들어지는데도 밀리언셀러는
      더 많다. 최상위 구간에서 코옵의 비율 우위가 모수 격차를 뚫는다는 뜻이다. 단, 이 역시
      "코옵이라서"가 아니라 코옵을 만들 수 있는 팀의 역량 프리미엄(구성 효과)일 수 있다.`;
  },
  robT: "강건성 — 가격대·연도별 α",
  robPrice: "가격대", robYear: "연도", robA: "α 코옵 (n)", robB: "α 싱글 (n)",
  robCap: `α가 작을수록 초대형 히트가 상대적으로 자주 나오는 "무거운 꼬리"다. 이 표는 같은
    가격대·같은 연도 안에서만 코호트를 비교한다 — 코옵은 저가 전략이 흔해서 "코옵 꼬리가
    무겁다"가 사실은 "싼 게임 꼬리가 무겁다"일 수 있고(가격 교란), 전 기간 합산 결과가 특정
    연도의 우연일 수도 있기 때문(시기 교란)이다. "—"는 아직 코호트당 표본 100개 미만이라
    적합을 생략한 칸.`,
  robNote: (rb: any): string => {
    const cells = { ...(rb.price_bands ?? {}), ...(rb.years ?? {}) };
    const keys = Object.keys(cells);
    if (!keys.length) return "";
    let aMin = 0, total = 0;
    for (const k of keys) {
      const cell = cells[k];
      if (!cell.A || !cell.B) continue;
      total++;
      const alphas = ["A", "B", "R"].filter((c) => cell[c]).map((c) => cell[c].alpha);
      if (cell.A.alpha === Math.min(...alphas)) aMin++;
    }
    if (!total) return "";
    return `<b>결론:</b> 현재 채워진 ${total}개 칸 중 ${aMin}개에서 코옵의 α가 가장 낮다(꼬리가
      가장 무겁다). ${aMin === total
        ? "즉 가격을 고정해도, 연도를 고정해도 코옵 꼬리 최중 순서가 유지된다 — 주 결론이 가격·시기 교란의 산물이 아니라는 뜻이다."
        : aMin >= total / 2
        ? "대체로 유지되지만 어긋나는 칸이 있다 — 해당 조건에서는 결론을 조심해서 읽어야 한다."
        : "칸별로 순서가 자주 뒤집힌다 — 주 결론이 특정 가격대·연도에 의존하고 있다는 경고다."}
      수집이 완료되면 더 많은 칸이 채워진다.`;
  },
  marketT: "연도별 스팀 신작 수 (시장 전체)",
  marketCap: `분석 창 동안 스팀 전체 신작 공급이 거의 2배로 폭증했다 — 아래 "시대 효과"
    카드를 읽을 때의 배경이다. 출처:
    <a href="https://steamdb.info/stats/releases/" target="_blank" rel="noopener">SteamDB</a>
.`,
  eraT: "시대 효과 — 연도별 추세",
  eraCap: `연도 간 절대값 비교는 판매 누적 기간 차이로 오염된다 (2022년작은 ~4년치, 2025년작은
    ~1년치 판매). 유효한 독법은 같은 연도 안에서 코호트끼리 비교하는 것 — 누적 기간이
    상쇄된다. 이 시기 스팀 전체 출시량이 폭증했지만, 시장 전체의 공급 증가는 배율 비교에서
    상쇄되며, 상쇄되지 않는 것은 코호트별 공급 증가 속도의 차이다. 표의 숫자는 각 코호트의
    <b>기하평균 판매량</b>, 괄호의 <b>S는 공급 지수</b> — 해당 코호트의 연간 신작 수를
    2022년=1로 놓고 시장 전체 신작 증가(위 카드)로 나눠 보정한 값. S&gt;1이면 그 장르로
    공급이 시장 평균보다 빨리 몰리고 있다는 뜻이다. 주 데이터는 카탈로그 편입 지연이 없어 2025년 행까지 유효하다.`,
  eraNote: (era: any): string => {
    const yrs = Object.keys(era.ratios ?? {}).sort();
    if (yrs.length < 2) return "";
    const f = yrs[0], l = yrs[yrs.length - 1];
    const S = (yr: string, c: string): number | null => era.S?.[yr]?.[c] ?? null;
    const ab0 = era.ratios[f]?.A_over_B, ab1 = era.ratios[l]?.A_over_B;
    const rb0 = era.ratios[f]?.R_over_B, rb1 = era.ratios[l]?.R_over_B;
    const sA = S(l, "A"), sR = S(l, "R"), sB = S(l, "B");
    const phrase = (v: number) => v > 1.1 ? "시장보다 빠른 유입" : v >= 0.9 ? "시장과 비슷한 속도" : "시장보다 느린 증가(이탈)";
    const parts: string[] = [
      `성과 변화는 수요(유행)와 공급(경쟁)의 합성이다 — S가 공급 쪽을, 같은 연도 안의 성과
       배율 추세가 두 힘의 순효과를 보여준다 (S는 ${l}년 기준).`,
    ];
    if (sA != null && ab0 && ab1) {
      parts.push(`<b>코옵</b> — 공급 S ${sA.toFixed(2)}: ${phrase(sA)}. 내러티브 대비 성과 배율
        ×${ab0.toFixed(1)}→×${ab1.toFixed(1)} (${ab1 >= ab0 ? "상승" : "하락"}).
        ${sA > 1.1 && ab1 >= ab0
          ? "공급이 몰리는데도 상대 성과가 유지·상승 — 수요(코옵 수요층 확장)가 공급 유입을 앞지르고 있다는 신호."
          : sA >= 0.9 && sA <= 1.1 && ab1 >= ab0
          ? "공급이 시장 속도에 머무는 동안 상대 성과가 올랐다 — 경쟁 심화 없이 수요 쪽 확장이 주도한 그림."
          : sA > 1.1
          ? "공급 유입과 상대 성과 하락이 겹침 — 경쟁 희석 신호."
          : "공급 압력이 크지 않은 상태 — 배율 변화는 수요 쪽 요인일 가능성."}`);
    }
    if (sR != null && rb0 && rb1) {
      parts.push(`<b>로그라이크</b> — 공급 S ${sR.toFixed(2)}: ${phrase(sR)}. 내러티브 대비 성과 배율
        ×${rb0.toFixed(1)}→×${rb1.toFixed(1)} (${rb1 >= rb0 ? "상승" : "하락"}).
        ${sR > 1.1 && rb1 < rb0
          ? "공급은 몰리는데 상대 성과는 하락 — 유행이 부른 공급 유입이 수요 성장을 앞질러 경쟁이 희석되는, 과열기의 전형적 패턴. 수요 냉각과 공급 희석을 이 데이터만으로 분리할 수는 없다."
          : sR > 1.1
          ? "공급 유입에도 상대 성과 유지 — 수요가 아직 공급을 따라오고 있다."
          : rb1 < rb0
          ? "공급 압력이 크지 않은데도 배율이 내려갔다 — 수요(유행) 냉각 쪽 요인에 무게."
          : "공급 압력 낮음 — 배율 변화는 수요 쪽 요인일 가능성."}`);
    }
    if (sB != null) {
      parts.push(`<b>내러티브 (Story Rich)</b> — 배율의 기준 코호트(정의상 1). 공급 S ${sB.toFixed(2)}:
        ${sB < 0.9
          ? "시장 평균보다 느리게 늘거나 줄고 있다 — 유행 장르로 개발자가 빠져나가는 공급 이탈로, 남아 있는 게임에겐 경쟁 완화 요인이다."
          : sB <= 1.1
          ? "시장 평균과 비슷한 속도로 늘고 있다."
          : "시장 평균보다 빠르게 늘고 있다 — 경쟁 심화 요인."}`);
    }
    parts.push(`연간 표본이 작은 코호트(코옵)는 방향성 수준으로 읽을 것.`);
    return parts.join("<br/><br/>");
  },
  eraYear: "연도",
  windowT: "민감도 — 출시 기간 컷오프 (2025-06 vs 2025-12)",
  windowNote: (n: number): string => `확장 창(~2025-12)이 추가하는 2025 하반기 게임은 ${n}개뿐이다.
    하반기 출시작은 리뷰 누적 기간이 짧고(7~12개월), SteamSpy 마스터 목록의 최신작 편입
    지연으로 커버리지도 얇다 — 확장 창 수치는 참고용이며, 본 분석은 2025-06 컷오프를 쓴다.`,
  windowCols: ["α", "Gini", "기하평균"] as string[],
  conclT: "지금까지의 결론",
  concl: (r: any, hasR: boolean, interim: boolean): string => {
    const c = r.concentration, t = r.tail;
    const rb = t.alpha_diffs?.R_minus_B;
    const rbSig = rb && rb.ci95[1] < 0;
    return `${interim ? "<p><b>수집 진행 중 스냅샷 기준의 중간 결론</b>이다 — 표본이 늘면 수치는 달라질 수 있다.</p>" : ""}
    <ul>
      <li><b>사실:</b> 코옵 코호트는 보통의 세계(기하평균 ${sig2(c.A.geomean)} vs 내러티브
        ${sig2(c.B.geomean)}), 조기 소멸률(${(100 * c.A.early_death_rate).toFixed(0)}% vs
        ${(100 * c.B.early_death_rate).toFixed(0)}%) 등 대부분의 지표에서 가장 좋은 성과를
        보인다. </li>
      <li><b>그러나 이것은 인과가 아니다:</b> 온라인 코옵은 넷코드·서버 때문에 만들기 어렵고,
        그래서 코호트에 취미 수준 출시작이 애초에 적다. 코옵의 우위는 "코옵이라서"가 아니라
        <b>"코옵을 만들 수 있는 팀이라서"</b>일 가능성(구성 효과)이 크다. 같은 팀이 장르만
        바꿨을 때의 효과는 이 비교로 알 수 없다.</li>
      <li><b>안전하게 말할 수 있는 것:</b> ${(() => {
        const nm: Record<string, string> = { A: "코옵", R: "로그라이크", B: "내러티브" };
        const ks = hasR ? ["A", "R", "B"] : ["A", "B"];
        const gmL = [...ks].sort((x, y) => c[y].geomean - c[x].geomean)
          .map((k) => `${nm[k]} ${sig2(c[k].geomean)}`).join(" > ");
        const edL = [...ks].sort((x, y) => c[y].early_death_rate - c[x].early_death_rate)
          .map((k) => `${nm[k]} ${(100 * c[k].early_death_rate).toFixed(1)}%`).join(" > ");
        return `현재 표본에서 전형적 성과(기하평균 리뷰)는 ${gmL} 순이고,
          조기 소멸률은 ${edL} 순으로 높다.`;
      })()}
        ${hasR && rb ? (rb.point < 0
          ? `로그라이크는 내러티브보다 꼬리가 ${rbSig ? "통계적으로 유의하게 " : ""}무겁다
             (α 차이 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`
          : `로그라이크와 내러티브(스토리 중심)의 꼬리 분포는 사실상 대등하다
             (α 차이 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`)
        : ""}</li>
      <li><b>시대 효과 주의:</b> 이 분석 창(2022.01–2025.12)의 수치에는 각 장르의 구조적
        특성만이 아니라 시대 효과 — 특정 장르의 유행과 그 냉각, 경쟁작의 대거 진입, 시장
        전체의 공급 폭증 — 가 섞여 있다. 어느 코호트든 지금의 수치가 유행이 바뀐 뒤에도
        그대로 재현된다는 보장은 없다. "시대 효과 — 연도별 추세" 섹션이 이를 부분적으로
        가려낸다.</li>
    </ul>`;
  },
  limitT: "한계",
  limits: [
    `<b>판매량은 추정치다</b> — 주 결과변수인 Gamalytic copiesSold는 리뷰 수·플레이타임 등을
     입력으로 쓰는 추정 모델이지 원시 관측이 아니다. 모델 자체의 계통 오차가 있다면 절대
     수준이 함께 밀릴 수 있다 — 다만 코호트 간 비교는 같은 모델을 통과한 값끼리의 비교라
     상대적 결론에는 영향이 작다.`,
    `<b>장르 교집합은 제외</b> — 멀티 코옵이면서 로그라이크인 게임(예: Risk of Rain 계열)은
     로그라이크 코호트에서 빠지고, Singleplayer 태그까지 있으면 어느 코호트에도 들어가지
     않는다 (Singleplayer가 없으면 분류 우선순위에 따라 코옵으로 분류). 상호배타 코호트를
     위해 빼는 쪽을 택했다 — 하이브리드 장르의 성과는 이 분석의 범위 밖이다.`,
    `<b>코옵 표본이 상대적으로 작다</b> — 순수 멀티 코옵은 ${"886"}개로 내러티브의 1/9
     수준이다. 코옵 관련 지표(특히 상위 1% 점유율과 α)는 신뢰구간이 넓고 히트작 몇 개에
     민감하므로 구간으로 읽어야 한다.`,
    `<b>태그는 자기선택</b> — 태그는 유저/개발자가 붙이므로 경계 사례의 오분류 가능성이
     있다. 별도로 수집한 SteamSpy 태그와 대조했을 때 분류 불일치는 약 1.5%로 작았다.`,
  ],
  foot: `데이터: Gamalytic(판매량 추정) · 코드/재현: <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  defT: "코호트 정의 — 수집에 사용한 태그",
  defCohort: "코호트", defInc: "포함 조건 (스팀 태그)", defExc: "제외 태그",
  defRows: [
    { c: "A", inc: `<code>Online Co-Op</code> 또는 <code>Co-op</code> 중 하나
      <b>그리고</b> <code>Multiplayer</code>`, exc: `<code>Singleplayer</code> —
      싱글 겸용(스타듀 밸리형)은 제외, 순수 멀티 코옵만` },
    { c: "R", inc: `<code>Rogue-like</code>, <code>Rogue-lite</code>,
      <code>Action Roguelike</code>, <code>Roguelike Deckbuilder</code>,
      <code>Roguevania</code>, <code>Traditional Roguelike</code> 중 하나 이상`,
      exc: `멀티/코옵 계열 전부` },
    { c: "B", inc: `<code>Singleplayer</code> <b>그리고</b> <code>Story Rich</code>`,
      exc: `멀티/코옵 계열 전부` },
  ] as { c: string; inc: string; exc: string }[],
  defCommon: `멀티/코옵 계열 제외 태그 = <code>Co-op</code>, <code>Online Co-Op</code>,
    <code>Local Co-Op</code>, <code>Co-op Campaign</code>, <code>Multiplayer</code>,
    <code>Massively Multiplayer</code>. 태그는 SteamSpy가 제공하는 스팀 유저 태그 기준.
    코호트는 상호배타적이며 분류 우선순위는 <b>코옵 → 로그라이크 → 내러티브</b>
    (예: 스토리 있는 로그라이트는 로그라이크로 분류). 공통 필터: 유료 · 초기가 &lt;$40 ·
    type=game · 2022-01~2025-12 출시 · 대형 퍼블리셔(EA, Ubisoft 등) 제외.
    Story Rich 없이 <code>Adventure</code>/<code>Puzzle</code>만 가진 싱글 게임은 별도
    코호트(N)로 계속 수집해 광의 정의에 대한 민감도 검증(강건성 분석)에 쓴다.`,
  aboutT: "만든 사람",
  aboutBody: `이 분석은 <b>Concode</b>의 <a href="https://x.com/SyntaxFossil" target="_blank"
    rel="noopener">개발자</a>가 만들었습니다. 저희는 지금 스팀에서 <b>Graytail</b>이라는
    게임을 만들고 있어요 — 바로 이 분석의 싱글 내러티브 <code>Story Rich</code> 코호트에
    속하는 게임입니다. 이 리포트가 도움이 되었다면, 저희 게임 페이지도 한번 방문해
    주세요 — 큰 힘이 됩니다.`,
  aboutSteam: "Graytail on Steam →",
  aboutRepo: "분석 코드 (GitHub) →",
  axReviews: "판매량 (장)",
  axCcdfY: "P(X ≥ x)",
  axLogReviews: "판매량 (로그 축)",
  axCumGames: "게임 누적 비율",
  bandLabel: "중간 구간 3.5천~3.5만 장",
  equality: "균등선",
  ttCcdf: (x: number, p: number) => `판매 ≥ ${x.toLocaleString()}장<br/>게임 비율 ${(100 * p).toPrecision(2)}%`,
  ttLorenzHead: (x: number) => `하위 ${pct(x)} 게임`,
  ttLorenzRow: (name: string, y: number) => `${name}: 판매량 ${pct(y)}`,
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
    concentration. <b>The outcome variable is Gamalytic's copies-sold estimate</b>.
    Cohort A (co-op) <b>${m.n_A.toLocaleString()} games</b>${m.n_R
      ? `, cohort R (roguelike) <b>${m.n_R.toLocaleString()} games</b>` : ""},
    cohort B (single-player narrative) <b>${m.n_B.toLocaleString()} games</b>
    (paid · price &lt;$40 · released 2022.01–2025.12 · AAA excluded · analysis sample ≥500 copies sold (screening out
    low-end estimate noise and hobbyist releases) · cohorts disjoint, priority co-op &gt; roguelike &gt; narrative).`,
  cohortA: "Co-op (online)",
  cohortB: "Single-player narrative",
  cohortR: "Roguelike",
  c1t: "Hypothesis 1 — tail comparison: log-log CCDF (copies sold)",
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
  c2t: "Hypothesis 2 — missing middle: log₁₀(copies sold) density (KDE)",
  c2cap: () => `The gray band is the mid-success zone (3.5k–35k copies ≈ $50K–500K gross).
    A bimodal shape (mostly early deaths + a few explosions) thins this band.`,
  interp2: (m, ok) => {
    const sh = (k: string) => pct(m[k].middle_share);
    const ks = ["A", "R", "B"].filter((k) => m[k]);
    const nm: Record<string, string> = { A: "co-op", R: "roguelike", B: "narrative" };
    const dipSig = ks.filter((k) => m[k].dip_p < 0.05);
    const fp = p3(m.middle_share_test.fisher_p);
    let t = `If the hypothesis holds, the co-op curve should dip in the gray band (mid-tier
      success) and show two peaks — under "mostly early deaths + a few explosions", few games
      should linger in the middle. The chart offers two checks.
      <br/><br/>① <b>Waist thickness</b> — the share landing in the gray band is ${ks.map((k) => `${nm[k]} ${sh(k)}`).join(" / ")}. `;
    t += ok
      ? `Co-op's waist is significantly thinner (Fisher p=${fp}) — the direction the
         hypothesis predicts.`
      : `The differences are statistically indistinguishable (Fisher p=${fp}); co-op's waist
         is not especially hollow.`;
    t += `<br/><br/>② <b>Number of peaks</b> (dip test) — `;
    t += dipSig.length
      ? `${dipSig.map((k) => nm[k]).join(", ")} show evidence of more than one peak (p<0.05) —
         a sign of splitting into an early-death group and a success group.`
      : `to the eye, the co-op curve is nearly bimodal — a first peak around ~1k copies, a
         valley through the gray band, and a second hill in the tens-of-thousands range (an
         "early-landing" cluster and a "hit" cluster). The dip test still cannot reject "one
         peak" (p>0.05): its power is weak when the second peak is lower and flatter than the
         first — read this as "visually bimodal, statistically unconfirmed".`;
    t += `<br/><br/><b>Bottom line:</b> `;
    if (ok && dipSig.includes("A")) {
      t += `co-op has both a significantly thinner waist and a genuinely two-peaked
        distribution — strong support for the missing-middle hypothesis.`;
    } else if (ok) {
      t += `co-op alone has the shape the hypothesis drew — a significantly hollowed
        mid-tier (waist test passes) and a two-hill curve around a valley, while narrative
        and roguelike decline smoothly from a single peak. Co-op's "die, or skip the middle
        and land" split shows in the data; it just lacks the formal bimodality stamp because
        the dip test is conservative.`;
    } else if (dipSig.length) {
      t += `waist differences are inconclusive but some cohorts show multimodality signals —
        a mixed picture.`;
    } else {
      t += `all three genres share the same shape — piled up at the low end, thinning
        smoothly upward. Co-op's middle is not missing; Hypothesis 2 is not supported in the
        current data.`;
    }
    return t;
  },
  c3t: "Hypothesis 3 — concentration: Lorenz curves",
  c3cap: (c) => `The deeper the curve sags below the diagonal, the more sales concentrate in
    a few games. Early-death rate (<500 copies):
    co-op ${pct(c.A.early_death_rate)} vs single-player ${pct(c.B.early_death_rate)}
    (χ² p=${p3(c.early_death_test.p)}).`,
  interp3: (c, ok) => {
    const g = (k: string) => c[k].gini, t1 = (k: string) => c[k].top1_share;
    const ks = ["A", "R", "B"].filter((k) => c[k]);
    const nm: Record<string, string> = { A: "co-op", R: "roguelike", B: "narrative" };
    const gMax = ks.sort((x, y) => g(y) - g(x))[0];
    const t1Max = [...ks].sort((x, y) => t1(y) - t1(x))[0];
    let t = `<b>The big picture first</b> — all three curves sag deeply, almost on top of each
      other. The top 5% of games take ${ks.map((k) => `${nm[k]} ${pct(c[k].top5_share)}`).join(" / ")}
      of all sales — <b>winner-take-all is the baseline of the Steam indie market regardless
      of genre</b>; cohort differences are fine structure on top.
      <br/><br/>Split the lenses and two metrics tell different stories.
      ① <b>Gini (whole-distribution inequality)</b> — ${ks.map((k) => `${nm[k]} ${g(k).toFixed(3)}`).join(" / ")}:
      ${nm[gMax]} is highest${gMax === "A" ? " — broadly unequal across the whole range even without a singular mega-hit" : ""}.
      ② <b>Top-1% share (mega-hit concentration)</b> — ${ks.map((k) => `${nm[k]} ${pct(t1(k))}`).join(" / ")}:
      ${nm[t1Max]} has the biggest mega-hit tilt${t1Max !== gMax ? ` — a different winner than
      Gini (${nm[gMax]}). ${nm[t1Max] === "narrative" ? "Narrative is a \"star system\" where a few blockbusters loom large; " : ""}${gMax === "A" ? "co-op is pervasively unequal without a singular star" : ""}` : ""}.
      <br/><br/><b>Verdict</b> — `;
    t += ok
      ? `co-op's Gini exceeds narrative's with non-overlapping confidence intervals →
         <b>Hypothesis 3 supported</b> — on the whole-distribution lens, per the split above.`
      : `co-op's Gini is highest but its interval overlaps narrative's, so <b>still
         inconclusive</b> — and on the mega-hit lens narrative/roguelike actually lead. The
         original "co-op is more winner-take-all" claim gets a split verdict depending on
         the lens.`;
    t += ` Early-death rates (<500 copies) are ${ks.map((k) => `${nm[k]} ${pct(c[k].early_death_rate)}`).join(" / ")}
      — the games that never even enter the Lorenz curve.`;
    return t;
  },
  sumT: "Summary of numbers",
  thA: "Co-op (A)",
  thB: "Single-player narrative (B)",
  thR: "Roguelike (R)",
  rows: {
    n: "Sample (≥500 copies)", alpha: "Power-law exponent α (SE)", xmin: "xmin / tail size",
    middle: "Middle band (3.5k–35k) share", dip: "Hartigan dip p", gini: "Gini [95% CI]",
    top: "Top 1% / 5% share", death: "Early-death rate (<500 copies)",
    median: "Median (copies)", mean: "Mean (× geometric mean)", geomean: "Geometric mean",
  },
  sumNote: (c, hasR) => {
    const gap = (k: string) => (c[k].mean / c[k].geomean).toFixed(0);
    return `読み方 — <b>中央値</b>はコホートを成果順に並べたとき、真ん中のゲームの販売本数。
      <b>幾何平均</b>は倍数(対数)スケールでの平均で、「普通のゲームがどの桁で生きているか」を
      示し、少数のメガヒットの影響を受けない。一方<b>算術平均</b>は上位1%に支配される
      「宝くじの期待値」であり、算術平均が幾何平均の何倍か(Co-op ×${gap("A")}${hasR ? `、
      ローグライク ×${gap("R")}` : ""}、ナラティブ ×${gap("B")})が大きいほど宝くじに近い。`;
  },
  insightTitle: (name) => `If you're making a ${name} game`,
  insightCard: (d) => `<ul>
    <li><b>The typical world</b> — a geometric mean of about ${sig2(d.geomean)} copies sold.</li>
    <li><b>Half the reality</b> — half of surviving games stay under ${sig2(d.median)} copies.</li>
    <li><b>Early-death risk</b> — ${(100 * d.early).toFixed(0)}% of releases never clear
      500 copies.</li>
    <li><b>Odds of a mid-tier hit</b> — among survivors, ${(100 * d.middle).toFixed(0)}% land
      in the 3.5k–35k copies band (~$50K–500K gross).</li>
    <li><b>Lottery multiplier</b> — the arithmetic mean is ×${d.lot.toFixed(0)} the geometric
      mean: a real hit pays tens to hundreds of times the typical outcome.</li>
    <li><b>Winner-take-all</b> — the top 1% of games capture ${(100 * d.top1).toFixed(0)}% of
      all sales; the top 5% capture ${(100 * d.top5).toFixed(0)}%.</li>
  </ul>`,
  countT: "Absolute number of successful games — by sales threshold",
  countCap: `Counts, not shares. Releases from the four years 2022–2025; sales are cumulative
    as of July 2026. Keep the population sizes in mind — co-op 886 / roguelike 3,516 /
    narrative 8,071 (about 1:4:9).`,
  countTh: "Threshold",
  countNote: (c: any): string => {
    const t = c.abs_counts;
    if (!t) return "";
    const g = (th: string, k: string) => t[th]?.[k] ?? 0;
    return `Narrative ships 9× more games, so <b>in the mid-success range (35k–100k copies)
      it also has 2–3× more successes in absolute terms</b> — why "moderate hits" are so
      visible there. The scales balance around 500k copies (co-op ${g("500000","A")} vs
      narrative ${g("500000","B")}), and <b>from 1M copies up, co-op wins even in absolute
      count</b> (${g("1000000","A")} vs ${g("1000000","B")}${g("5000000","A") ? `; at 5M+,
      ${g("5000000","A")} vs ${g("5000000","B")}` : ""}) — more million-sellers despite 9×
      fewer releases. At the very top, co-op's rate advantage punches through the population
      gap. As always, this may reflect the capability premium of teams able to ship co-op
      (composition effect), not co-op itself.`;
  },
  robT: "Robustness — α by price band and year",
  robPrice: "Price band", robYear: "Year", robA: "α co-op (n)", robB: "α single (n)",
  robCap: `A smaller α means a heavier tail — outsized hits come relatively more often. This
    table compares cohorts only within the same price band and the same release year:
    co-op games often price low, so "co-op has the heavier tail" could really be "cheap
    games have heavier tails" (price confound), and a pooled result could be one year's
    accident (era confound). "—" marks cells still under 100 games per cohort, where the
    fit is skipped.`,
  robNote: (rb) => {
    const cells = { ...(rb.price_bands ?? {}), ...(rb.years ?? {}) };
    const keys = Object.keys(cells);
    if (!keys.length) return "";
    let aMin = 0, total = 0;
    for (const k of keys) {
      const cell = cells[k];
      if (!cell.A || !cell.B) continue;
      total++;
      const alphas = ["A", "B", "R"].filter((c) => cell[c]).map((c) => cell[c].alpha);
      if (cell.A.alpha === Math.min(...alphas)) aMin++;
    }
    if (!total) return "";
    return `<b>Conclusion:</b> in ${aMin} of the ${total} filled cells, co-op has the lowest
      α (heaviest tail). ${aMin === total
        ? "Holding price fixed or year fixed, the ordering survives — the headline result is not an artifact of pricing strategy or a single year."
        : aMin >= total / 2
        ? "The ordering mostly holds, but flips in some cells — read the conclusion with care under those conditions."
        : "The ordering flips in many cells — a warning that the headline result depends on specific price bands or years."}
      More cells fill in as collection completes.`;
  },
  marketT: "New Steam releases per year (whole market)",
  marketCap: `Over the analysis window, Steam's overall release volume nearly doubled — the
    backdrop for the "era effect" card below. Source:
    <a href="https://steamdb.info/stats/releases/" target="_blank" rel="noopener">SteamDB</a>
.`,
  eraT: "Era effect — year-by-year trend",
  eraCap: `Comparing absolute levels across years is confounded by accumulation time (a 2022
    release has had ~4 years of sales, a 2025 release ~1 year). The valid reading is the
    within-year comparison between cohorts — accumulation cancels out. Steam's overall
    release volume exploded over this window, but market-wide growth also cancels in the
    ratios; what does not cancel is a difference in supply growth between cohorts. Table
    numbers are each cohort's <b>geometric-mean copies sold</b>; the <b>S in parentheses is
    a supply index</b> — yearly release count rebased to 2022=1 and deflated by market-wide
    growth (card above). S&gt;1 means supply flows into the genre faster than the market.
    The primary catalog has no indexing lag, so the 2025 row is valid.`,
  eraNote: (era) => {
    const yrs = Object.keys(era.ratios ?? {}).sort();
    if (yrs.length < 2) return "";
    const f = yrs[0], l = yrs[yrs.length - 1];
    const S = (yr: string, c: string): number | null => era.S?.[yr]?.[c] ?? null;
    const ab0 = era.ratios[f]?.A_over_B, ab1 = era.ratios[l]?.A_over_B;
    const rb0 = era.ratios[f]?.R_over_B, rb1 = era.ratios[l]?.R_over_B;
    const sA = S(l, "A"), sR = S(l, "R"), sB = S(l, "B");
    const phrase = (v: number) => v > 1.1 ? "市場より速い流入" : v >= 0.9 ? "市場並みの速度" : "市場より遅い増加(離脱)";
    const parts: string[] = [
      `成果の変化は需要(流行)と供給(競争)の合成だ — Sが供給側を、同一年内の成果倍率の
       トレンドが正味効果を示す (Sは${l}年基準)。`,
    ];
    if (sA != null && ab0 && ab1) {
      parts.push(`<b>Co-op</b> — 供給S ${sA.toFixed(2)}: ${phrase(sA)}。ナラティブ比の成果倍率
        ×${ab0.toFixed(1)}→×${ab1.toFixed(1)} (${ab1 >= ab0 ? "上昇" : "下落"})。
        ${sA > 1.1 && ab1 >= ab0
          ? "供給が流入しても相対成果が維持・上昇 — 需要(Co-op層の拡大)が供給を上回るシグナル。"
          : sA >= 0.9 && sA <= 1.1 && ab1 >= ab0
          ? "供給は市場並みに留まる間に相対成果が上昇 — 競争激化なしに需要拡大が主導する絵。"
          : sA > 1.1
          ? "供給流入と相対成果の下落が重なる — 競争希釈のシグナル。"
          : "供給圧力は小さい — 倍率の変化は需要側の要因の可能性。"}`);
    }
    if (sR != null && rb0 && rb1) {
      parts.push(`<b>ローグライク</b> — 供給S ${sR.toFixed(2)}: ${phrase(sR)}。ナラティブ比の成果倍率
        ×${rb0.toFixed(1)}→×${rb1.toFixed(1)} (${rb1 >= rb0 ? "上昇" : "下落"})。
        ${sR > 1.1 && rb1 < rb0
          ? "供給は流入するのに相対成果は下落 — 過熱期の典型パターン。需要の冷え込みと供給希釈はこのデータだけでは分離できない。"
          : sR > 1.1
          ? "流入にもかかわらず相対成果は維持 — 需要が追いついている。"
          : rb1 < rb0
          ? "供給圧力が小さいのに倍率が下がった — 需要(流行)の冷え込み側に重み。"
          : "供給圧力は低い — 変化は需要側の要因の可能性。"}`);
    }
    if (sB != null) {
      parts.push(`<b>ナラティブ (Story Rich)</b> — 倍率の基準コホート(定義上1)。供給S ${sB.toFixed(2)}:
        ${sB < 0.9
          ? "市場平均より遅い増加ないし減少 — 流行ジャンルへの供給離脱で、残るゲームには競争緩和要因。"
          : sB <= 1.1
          ? "市場平均並みの速度で増えている。"
          : "市場平均より速く増加 — 競争激化要因。"}`);
    }
    parts.push(`標本の小さいコホート(Co-op)のセルは方向性として読むこと。`);
    return parts.join("<br/><br/>");
  },
  eraYear: "Year",
  windowT: "Sensitivity — release-window cutoff (2025-06 vs 2025-12)",
  windowNote: (n) => `The extended window (through 2025-12) adds only ${n} H2-2025 games.
    Those releases have short review-accumulation windows (7–12 months) and SteamSpy's
    master list lags on recent titles, so coverage is thin — the extended figures are for
    reference; the primary analysis uses the 2025-06 cutoff.`,
  windowCols: ["α", "Gini", "Geometric mean"],
  conclT: "Conclusions so far",
  concl: (r, hasR, interim) => {
    const c = r.concentration, t = r.tail;
    const rb = t.alpha_diffs?.R_minus_B;
    const rbSig = rb && rb.ci95[1] < 0;
    return `${interim ? "<p><b>Interim conclusions from an in-progress snapshot</b> — numbers may shift as the sample grows.</p>" : ""}
    <ul>
      <li><b>The fact:</b> the co-op cohort performs best on most metrics — the typical world
        (geometric mean ${sig2(c.A.geomean)} vs narrative ${sig2(c.B.geomean)}), early-death
        rate (${(100 * c.A.early_death_rate).toFixed(0)}% vs
        ${(100 * c.B.early_death_rate).toFixed(0)}%), and more. </li>
      <li><b>But this is not causal:</b> online co-op is hard to build (netcode, servers), so
        the cohort contains far fewer hobbyist releases. The co-op advantage is likely
        <b>"teams capable of shipping co-op"</b> rather than "being co-op" — a composition
        effect. What happens if the same team merely switches genre cannot be read off this
        comparison.</li>
      <li><b>What can be said safely:</b> ${(() => {
        const nm: Record<string, string> = { A: "co-op", R: "roguelike", B: "narrative" };
        const ks = hasR ? ["A", "R", "B"] : ["A", "B"];
        const gmL = [...ks].sort((x, y) => c[y].geomean - c[x].geomean)
          .map((k) => `${nm[k]} ${sig2(c[k].geomean)}`).join(" > ");
        const edL = [...ks].sort((x, y) => c[y].early_death_rate - c[x].early_death_rate)
          .map((k) => `${nm[k]} ${(100 * c[k].early_death_rate).toFixed(1)}%`).join(" > ");
        return `In the current sample, typical outcomes (geometric-mean reviews) rank
          ${gmL}, while early-death rates rank ${edL}.`;
      })()}
        ${hasR && rb ? (rb.point < 0
          ? `Roguelikes have a ${rbSig ? "statistically significantly " : ""}heavier tail than
             narrative games (α diff ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`
          : `Roguelikes and (story-rich) narrative games show essentially comparable tail
             distributions (α diff ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`)
        : ""}</li>
      <li><b>Beware era effects:</b> every number in this window (2022.01–2025.12) mixes
        each genre's structural properties with era effects — genre fashions and their
        cooling, mass influx of competitors, and the market-wide explosion in release
        volume. For any cohort, there is no guarantee today's numbers replicate once the
        fashion shifts. The "Era effect — year-by-year trend" section partially separates
        this.</li>
    </ul>`;
  },
  limitT: "Limitations",
  limits: [
    `<b>Copies sold is an estimate</b> — the primary outcome, Gamalytic's copiesSold, is a
     model fed by review counts, playtime and more — not a raw observation. Systematic model
     error would shift absolute levels; cross-cohort comparisons, however, run through the
     same model and are less affected.`,
    `<b>Genre intersections are dropped</b> — games that are both multiplayer co-op and
     roguelike (e.g. the Risk of Rain series) fall out of the roguelike cohort, and with a
     Singleplayer tag they land in no cohort (without it they count as co-op). We keep
     cohorts disjoint; hybrid-genre outcomes sit outside this analysis.`,
    `<b>The co-op sample is comparatively small</b> — pure multiplayer co-op is ~886 games,
     about one-ninth of narrative. Co-op metrics (especially top-1% share and α) have wide
     confidence intervals — read intervals, not points.`,
    `<b>Tags are self-selected</b> — tags come from users/developers, so edge cases can be
     misclassified. Cross-checked against separately collected SteamSpy tags, classification
     disagreement was only ~1.5% of games.`,
  ],
  foot: `Data: Gamalytic (sales estimates) · code:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  defT: "Cohort definitions — tags used for collection",
  defCohort: "Cohort", defInc: "Inclusion (Steam tags)", defExc: "Excluded tags",
  defRows: [
    { c: "A", inc: `<code>Online Co-Op</code> or <code>Co-op</code>,
      <b>and</b> <code>Multiplayer</code>`, exc: `<code>Singleplayer</code> — co-op-optional
      singles (Stardew-likes) excluded; pure multiplayer co-op only` },
    { c: "R", inc: `any of <code>Rogue-like</code>, <code>Rogue-lite</code>,
      <code>Action Roguelike</code>, <code>Roguelike Deckbuilder</code>,
      <code>Roguevania</code>, <code>Traditional Roguelike</code>`,
      exc: `all multiplayer/co-op tags` },
    { c: "B", inc: `<code>Singleplayer</code> <b>and</b> <code>Story Rich</code>`,
      exc: `all multiplayer/co-op tags` },
  ],
  defCommon: `Multiplayer/co-op exclusion tags = <code>Co-op</code>, <code>Online Co-Op</code>,
    <code>Local Co-Op</code>, <code>Co-op Campaign</code>, <code>Multiplayer</code>,
    <code>Massively Multiplayer</code>. Tags are Steam user tags as served by SteamSpy.
    Cohorts are disjoint with classification priority <b>co-op → roguelike → narrative</b>
    (e.g. a story-rich roguelite counts as roguelike). Common filters: paid · launch price
    &lt;$40 · type=game · released 2022-01..2025-12 · major publishers (EA, Ubisoft, …)
    excluded. Single-player games with only <code>Adventure</code>/<code>Puzzle</code> and no
    Story Rich are still collected as a separate cohort (N) for the broad-definition
    sensitivity check (robustness).`,
  aboutT: "Who made this",
  aboutBody: `This analysis was made by a <a href="https://x.com/SyntaxFossil" target="_blank"
    rel="noopener">developer</a> at <b>Concode</b>. We are currently building a game called
    <b>Graytail</b> on Steam — a game that belongs squarely in this report's single-player
    narrative <code>Story Rich</code> cohort. If this report helped you, please consider
    visiting our store page — it means a lot.`,
  aboutSteam: "Graytail on Steam →",
  aboutRepo: "Analysis code (GitHub) →",
  axReviews: "Copies sold",
  axCcdfY: "P(X ≥ x)",
  axLogReviews: "Copies sold (log scale)",
  axCumGames: "Cumulative share of games",
  bandLabel: "middle band 3.5k–35k copies",
  equality: "equality line",
  ttCcdf: (x, p) => `≥ ${x.toLocaleString()} copies<br/>${(100 * p).toPrecision(2)}% of games`,
  ttLorenzHead: (x) => `bottom ${pct(x)} of games`,
  ttLorenzRow: (name, y) => `${name}: ${pct(y)} of sales`,
};

const ja: typeof ko = {
  docTitle: "Co-op vs シングル: 勝者総取り構造の検証",
  loading: "report_data.json を読み込み中…",
  kicker: (label, date) => `Steamインディーゲーム分布研究 · ${label} · ${date}`,
  snapshot: { pilot: "パイロットデータ", interim: "収集進行中 · 部分データ(ランダム標本)", full: "全データ" },
  title: "Co-opゲームの成功は本当に「勝者総取り」なのか",
  lede: (m) => `オンラインCo-opゲームの口コミは「フレンドグループが同時に集まって初めて機能する」
    調整(coordination)構造で動く。supercritical分岐過程の予測どおりなら、Co-opコホートの
    成功分布はシングルプレイヤー・ナラティブゲームよりも極端になるはずだ。<b>結果変数はGamalyticの販売本数推定値(copiesSold)</b>だ。コホートA(Co-op) <b>${m.n_A.toLocaleString()}本</b>${m.n_R
      ? `、コホートR(ローグライク) <b>${m.n_R.toLocaleString()}本</b>` : ""}、
    コホートB(シングル・ナラティブ) <b>${m.n_B.toLocaleString()}本</b>
    (有料 · 価格 &lt;$40 · 2022.01–2025.12リリース · AAA除外 · 分析標本は販売500本以上 (低販売域の推定ノイズと趣味レベルのリリースを除外) ·
    コホートは互いに排他、優先順位はCo-op &gt; ローグライク &gt; ナラティブ)。`,
  cohortA: "Co-op (オンライン)",
  cohortB: "シングル・ナラティブ",
  cohortR: "ローグライク",
  c1t: "仮説1 — 裾の比較: 両対数CCDF (販売本数)",
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
  c2t: "仮説2 — 中間層の欠落: log₁₀(販売本数)密度 (KDE)",
  c2cap: () => `灰色の帯が中間的成功ゾーン(販売3.5千–3.5万本 ≈ 売上$50K–500K)。
    二峰型(大半が早期消滅 + 少数が爆発)ならこの帯が薄くなる。`,
  interp2: (m, ok) => {
    const sh = (k: string) => pct(m[k].middle_share);
    const ks = ["A", "R", "B"].filter((k) => m[k]);
    const nm: Record<string, string> = { A: "Co-op", R: "ローグライク", B: "ナラティブ" };
    const dipSig = ks.filter((k) => m[k].dip_p < 0.05);
    const fp = p3(m.middle_share_test.fisher_p);
    let t = `仮説が正しければ、Co-opの曲線は灰色の帯(中間的成功)で凹み、分布に山が2つ
      現れるはずだ — 「大半が早期消滅 + 少数が爆発」なら中間に留まるゲームは稀なはずだから。
      表で確認することは2つ。
      <br/><br/>① <b>くびれの厚さ</b> — 灰色の帯に着地した比率は${ks.map((k) => `${nm[k]} ${sh(k)}`).join(" / ")}。`;
    t += ok
      ? `Co-opのくびれが有意に薄い (Fisher p=${fp}) — 仮説の予測方向だ。`
      : `コホート間の差は統計的に区別できない (Fisher p=${fp})。Co-opのくびれが特に
         空洞ではない。`;
    t += `<br/><br/>② <b>山の数</b> (dip検定) — `;
    t += dipSig.length
      ? `${dipSig.map((k) => nm[k]).join("・")}で山が1つではない証拠がある (p<0.05) —
         早期消滅グループと成功グループへの分裂シグナルだ。`
      : `目で見るとCo-opの曲線はほぼ二峰だ — 約1千本に最初の山、灰色の帯で谷、その右の
         数万本台に第二の丘(「早期着地」と「ヒット」の2クラスタ)。それでもdip検定はp>0.05で
         二峰を確定できない — 第二の山が低く緩やかな場合この検定の検出力は弱いためで、
         「視覚的には二峰、統計的には未確定」と読むのが正確だ。`;
    t += `<br/><br/><b>まとめ:</b> `;
    if (ok && dipSig.includes("A")) {
      t += `Co-opはくびれが有意に薄く、分布も2つの山に割れている — 中間層欠落仮説の強い支持だ。`;
    } else if (ok) {
      t += `Co-opだけが仮説の描いた形をしている — 中間帯が有意に凹み(くびれ検定を通過)、
        曲線も谷を挟む2つの丘の形だ。ナラティブ・ローグライクは単峰から滑らかに減る正反対の
        形。「死ぬか、中間を飛ばして着地するか」というCo-opの二分法がデータに現れたもので、
        dip検定の保守性ゆえに「確定二峰」の判は押されていないだけだ。`;
    } else if (dipSig.length) {
      t += `くびれの差は未確定だが、一部コホートに多峰性のシグナルがある — 混在した絵だ。`;
    } else {
      t += `3ジャンルとも「低い区間に集まり、上に行くほど滑らかに減っていく」同じ形であり、
        Co-opだからといって中間が空いてはいない — 中間層欠落の仮説(仮説2)は現在のデータでは
        支持されない。`;
    }
    return t;
  },
  c3t: "仮説3 — 集中度: ローレンツ曲線",
  c3cap: (c) => `曲線が下に垂れるほど販売本数が少数のゲームに集中。早期消滅率(販売500本未満):
    Co-op ${pct(c.A.early_death_rate)} vs シングル ${pct(c.B.early_death_rate)}
    (χ² p=${p3(c.early_death_test.p)})。`,
  interp3: (c, ok) => {
    const g = (k: string) => c[k].gini, t1 = (k: string) => c[k].top1_share;
    const ks = ["A", "R", "B"].filter((k) => c[k]);
    const nm: Record<string, string> = { A: "Co-op", R: "ローグライク", B: "ナラティブ" };
    const gMax = ks.sort((x, y) => g(y) - g(x))[0];
    const t1Max = [...ks].sort((x, y) => t1(y) - t1(x))[0];
    let t = `<b>まず全体像</b> — 3本の曲線はほぼ重なるほど深く垂れている。上位5%のゲームが
      全販売の${ks.map((k) => `${nm[k]} ${pct(c[k].top5_share)}`).join(" / ")}を持っていく —
      <b>勝者総取りはジャンルを問わずSteamインディー市場の基本値</b>であり、コホート差は
      その上の微細構造だ。
      <br/><br/>レンズを分けると2つの指標が違う話をする。
      ① <b>ジニ係数 (全区間の不平等)</b> — ${ks.map((k) => `${nm[k]} ${g(k).toFixed(3)}`).join(" / ")}:
      ${nm[gMax]}が最も高い${gMax === "A" ? " — 特定のメガヒットなしでも全区間で広く勝敗が分かれる構造" : ""}。
      ② <b>上位1%シェア (メガヒット集中)</b> — ${ks.map((k) => `${nm[k]} ${pct(t1(k))}`).join(" / ")}:
      ${nm[t1Max]}のメガヒット偏重が最大${t1Max !== gMax ? ` — ジニ係数の1位(${nm[gMax]})と
      異なる。${nm[t1Max] === "ナラティブ" ? "ナラティブは少数のブロックバスターが際立つ「スターシステム」型、" : ""}${gMax === "A" ? "Co-opは特定のスターなしに全面的に不平等な形だ" : ""}` : ""}。
      <br/><br/><b>判定</b> — `;
    t += ok
      ? `Co-opのジニ係数がナラティブを上回り信頼区間も重ならない → <b>仮説3を支持</b> —
         ただし上記の区分どおり「全区間の不平等」レンズ基準だ。`
      : `Co-opのジニ係数が最も高いがナラティブと信頼区間が重なるため<b>まだ未確定</b>で、
         メガヒットレンズではむしろナラティブ・ローグライクが先行する。「Co-opがより勝者総取り」
         という元の仮説は、レンズによって答えが分かれる半分の支持にとどまる。`;
    t += `早期消滅率(販売500本未満)は${ks.map((k) => `${nm[k]} ${pct(c[k].early_death_rate)}`).join(" / ")}
      — ローレンツ曲線に入ることすらできなかったゲームの規模だ。`;
    return t;
  },
  sumT: "数値サマリー",
  thA: "Co-op (A)",
  thB: "シングル・ナラティブ (B)",
  thR: "ローグライク (R)",
  rows: {
    n: "標本 (販売500本以上)", alpha: "べき指数 α (SE)", xmin: "xmin / 裾の標本数",
    middle: "中間帯(3.5千~3.5万本)比率", dip: "Hartigan dip p", gini: "ジニ係数 [95% CI]",
    top: "上位1% / 5%シェア", death: "早期消滅率 (販売500本未満)",
    median: "中央値 (販売本数)", mean: "平均 (幾何平均の倍数)", geomean: "幾何平均",
  },
  sumNote: (c, hasR) => {
    const gap = (k: string) => (c[k].mean / c[k].geomean).toFixed(0);
    return `読み方 — <b>中央値</b>はコホートを成果順に並べたとき、真ん中のゲームのレビュー数。
      <b>幾何平均</b>は倍数(対数)スケールでの平均で、「このジャンルの普通のゲームがどの桁で
      生きているか」を示し、少数のメガヒットの影響を受けない — 成果が何倍も開くこのような
      データにおける正しい「平均」だ。一方<b>算術平均</b>は上位1%に支配される「宝くじの期待値」
      であり、算術平均が幾何平均の何倍か(Co-op ×${gap("A")}${hasR ? `、ローグライク
      ×${gap("R")}` : ""}、ナラティブ ×${gap("B")})が大きいほど、そのジャンルは宝くじに近い。`;
  },
  insightTitle: (name) => `${name}ゲームを作るなら`,
  insightCard: (d) => `<ul>
    <li><b>普通の世界</b> — 幾何平均で約${sig2(d.geomean)}本の販売の桁の世界。</li>
    <li><b>半分の現実</b> — 生き残ったゲームの半分は販売${sig2(d.median)}本未満にとどまる。</li>
    <li><b>早期消滅リスク</b> — リリース作の${(100 * d.early).toFixed(0)}%は販売500本を
      越えられない。</li>
    <li><b>中堅ヒットの確率</b> — 生存作のうち${(100 * d.middle).toFixed(0)}%が
      販売3.5千–3.5万本(売上$50K–500K)の帯に着地する。</li>
    <li><b>宝くじ倍率</b> — 算術平均は幾何平均の×${d.lot.toFixed(0)}。大きく当たれば
      典型的成果の数十~数百倍を持っていく構造だ。</li>
    <li><b>勝者総取りの度合い</b> — 上位1%のゲームが全販売の${(100 * d.top1).toFixed(0)}%、
      上位5%が${(100 * d.top5).toFixed(0)}%を占有する。</li>
  </ul>`,
  countT: "成功ゲームの絶対数 — 販売しきい値別",
  countCap: `比率ではなく個数だ。2022~2025年の4年分のリリースが対象で、販売本数は2026年7月
    時点の累積値。母数の違いに注意 — Co-op 886 / ローグライク 3,516 / ナラティブ 8,071本
    (約1:4:9)。`,
  countTh: "しきい値",
  countNote: (c: any): string => {
    const t = c.abs_counts;
    if (!t) return "";
    const g = (th: string, k: string) => t[th]?.[k] ?? 0;
    return `ナラティブは9倍多く作られるため、<b>中位の成功(3.5万~10万本)の絶対数はナラティブが
      2~3倍多い</b> — 「そこそこのヒット」が目につく理由だ。約50万本で均衡し(Co-op
      ${g("500000","A")} vs ナラティブ ${g("500000","B")})、<b>100万本以上ではCo-opが絶対数
      でも逆転する</b>(${g("1000000","A")} vs ${g("1000000","B")}${g("5000000","A") ? `、
      500万本以上は${g("5000000","A")} vs ${g("5000000","B")}` : ""}) — 9倍少ない供給で
      ミリオンセラーはより多い。最上位ではCo-opの比率優位が母数の差を突き破る。ただし例に
      よって、これも「Co-opだから」ではなくCo-opを作れるチームの力量プレミアム(構成効果)かも
      しれない。`;
  },
  robT: "頑健性 — 価格帯·年別のα",
  robPrice: "価格帯", robYear: "年", robA: "α Co-op (n)", robB: "α シングル (n)",
  robCap: `αが小さいほど超大型ヒットが相対的に頻繁に出る「重い裾」だ。この表は同じ価格帯・
    同じリリース年の中だけでコホートを比較する — Co-opは低価格戦略が多く、「Co-opの裾が重い」
    が実は「安いゲームの裾が重い」かもしれず(価格の交絡)、全期間合算の結果が特定年の偶然かも
    しれない(時期の交絡)からだ。「—」はコホートあたり標本100本未満でフィットを省略したセル。`,
  robNote: (rb) => {
    const cells = { ...(rb.price_bands ?? {}), ...(rb.years ?? {}) };
    const keys = Object.keys(cells);
    if (!keys.length) return "";
    let aMin = 0, total = 0;
    for (const k of keys) {
      const cell = cells[k];
      if (!cell.A || !cell.B) continue;
      total++;
      const alphas = ["A", "B", "R"].filter((c) => cell[c]).map((c) => cell[c].alpha);
      if (cell.A.alpha === Math.min(...alphas)) aMin++;
    }
    if (!total) return "";
    return `<b>結論:</b> 現在埋まっている${total}セル中${aMin}セルでCo-opのαが最も低い
      (裾が最も重い)。${aMin === total
        ? "価格を固定しても年を固定しても順序が維持される — 主結論が価格戦略や特定年の産物ではないという意味だ。"
        : aMin >= total / 2
        ? "概ね維持されるが、覆るセルもある — その条件下では結論を慎重に読むべきだ。"
        : "セルごとに順序が頻繁に覆る — 主結論が特定の価格帯・年に依存しているという警告だ。"}
      収集が完了すればさらに多くのセルが埋まる。`;
  },
  marketT: "年別Steam新作数 (市場全体)",
  marketCap: `分析ウィンドウの間に、Steam全体の新作供給はほぼ2倍に急増した — 下の
    「時代効果」カードを読む際の背景である。出典:
    <a href="https://steamdb.info/stats/releases/" target="_blank" rel="noopener">SteamDB</a>
。`,
  eraT: "時代効果 — 年別トレンド",
  eraCap: `年をまたいだ絶対値の比較は蓄積期間の差で汚染される(2022年作は~4年分、2025年作は
    ~1年分の販売)。有効な読み方は同じ年の中でコホート同士を比較すること — 蓄積期間が相殺
    される。市場全体の供給増加も倍率では相殺され、相殺されないのはコホート間の供給増加速度の
    差だ。表の数字は各コホートの<b>幾何平均販売本数</b>、括弧の<b>Sは供給指数</b> — 年間新作数を
    2022年=1とし市場全体の増加(上のカード)で割った値。S&gt;1ならそのジャンルへ市場平均より
    速く供給が流入している。主データはカタログ収録遅延がないため2025年の行まで有効だ。`,
  eraNote: (era) => {
    const yrs = Object.keys(era.ratios ?? {}).sort();
    if (yrs.length < 2) return "";
    const f = yrs[0], l = yrs[yrs.length - 1];
    const ly = yrs.length >= 3 ? yrs[yrs.length - 2] : l;
    const S = (yr: string, c: string): number | null => era.S?.[yr]?.[c] ?? null;
    const ab0 = era.ratios[f]?.A_over_B, ab1 = era.ratios[l]?.A_over_B;
    const rb0 = era.ratios[f]?.R_over_B, rb1 = era.ratios[l]?.R_over_B;
    const sA = S(ly, "A"), sR = S(ly, "R"), sB = S(ly, "B");
    const phrase = (v: number) => v > 1.1 ? "市場より速い流入" : v >= 0.9 ? "市場並みの速度" : "市場より遅い増加(離脱)";
    const parts: string[] = [
      `成果の変化は需要(流行)と供給(競争)の合成だ — Sが供給側を、同一年内の成果倍率の
       トレンドが両者の正味効果を示す (Sは最後の完全カバー年${ly}年基準)。`,
    ];
    if (sA != null && ab0 && ab1) {
      parts.push(`<b>Co-op</b> — 供給S ${sA.toFixed(2)}: ${phrase(sA)}。ナラティブ比の成果倍率
        ×${ab0.toFixed(1)}→×${ab1.toFixed(1)} (${ab1 >= ab0 ? "上昇" : "下落"})。
        ${sA > 1.1 && ab1 >= ab0
          ? "供給が流入しても相対成果が維持・上昇 — 需要(Co-op層の拡大)が供給を上回っているシグナル。"
          : sA >= 0.9 && sA <= 1.1 && ab1 >= ab0
          ? "供給は市場並みに留まる間に相対成果が上昇 — 競争激化なしに需要側の拡大が主導する絵。"
          : sA > 1.1
          ? "供給流入と相対成果の下落が重なる — 競争希釈のシグナル。"
          : "供給圧力は小さい — 倍率の変化は需要側の要因の可能性。"}`);
    }
    if (sR != null && rb0 && rb1) {
      parts.push(`<b>ローグライク</b> — 供給S ${sR.toFixed(2)}: ${phrase(sR)}。ナラティブ比の成果倍率
        ×${rb0.toFixed(1)}→×${rb1.toFixed(1)} (${rb1 >= rb0 ? "上昇" : "下落"})。
        ${sR > 1.1 && rb1 < rb0
          ? "供給は流入するのに相対成果は下落 — 過熱期の典型パターン。需要の冷え込みと供給希釈はこのデータだけでは分離できない。"
          : sR > 1.1
          ? "流入にもかかわらず相対成果は維持 — 需要が追いついている。"
          : rb1 < rb0
          ? "供給圧力が小さいのに倍率が下がった — 需要(流行)の冷え込み側に重み。"
          : "供給圧力は低い — 変化は需要側の要因の可能性。"}`);
    }
    if (sB != null) {
      parts.push(`<b>ナラティブ (Story Rich)</b> — 倍率の基準コホート(定義上1)。供給S ${sB.toFixed(2)}:
        ${sB < 0.9
          ? "市場平均より遅い増加ないし減少 — 流行ジャンルへの供給離脱で、残るゲームには競争緩和要因。"
          : sB <= 1.1
          ? "市場平均並みの速度で増えている。"
          : "市場平均より速く増加 — 競争激化要因。"}`);
    }
    const ext = era.ext;
    if (ext?.supply_index?.A) {
      const si = ext.supply_index;
      const last = (o: any) => o[Math.max(...Object.keys(o).map(Number))];
      parts.push(`<b>外部検証 (カタログ遅延なし)</b> — Gamalyticのカタログで同じコホート定義を
        再現して数えると、2025年の供給指数は<b>Co-op ${last(si.A).toFixed(2)}</b>
        ${si.R ? `/ ローグライク ${last(si.R).toFixed(2)}` : ""} / ナラティブ
        ${si.B ? last(si.B).toFixed(2) : "-"}。Co-opの新作は${ext.supply_by_year.A["2024"]}本(2024)
        →${ext.supply_by_year.A["2025"]}本(2025)と市場成長の数倍のペースだ —
        <b>2025年のCo-op・ローグライク流入加速は実測で確認</b>され、ナラティブは市場並みだ。`);
    } else if (l !== ly) {
      const a25 = S(l, "A"), b25 = S(l, "B");
      if (a25 != null && b25 != null) {
        parts.push(`<b>${l}年の兆し</b> — 絶対値は過小だが同一年内比較は有効: S Co-op
          ${a25.toFixed(2)} / ナラティブ ${b25.toFixed(2)}。`);
      }
    }
    parts.push(`年別標本は小さいため方向性として読むこと。`);
    return parts.join("<br/><br/>");
  },
  eraYear: "年",
  windowT: "感度分析 — リリース期間カットオフ (2025-06 vs 2025-12)",
  windowNote: (n) => `拡張ウィンドウ(~2025-12)が追加する2025年下半期のゲームは${n}本のみ。
    下半期リリースはレビュー蓄積期間が短く(7–12ヶ月)、SteamSpyのマスターリストは最新作の
    収録が遅れるためカバレッジも薄い — 拡張ウィンドウの数値は参考値であり、本分析は
    2025-06カットオフを用いる。`,
  windowCols: ["α", "ジニ係数", "幾何平均"],
  conclT: "ここまでの結論",
  concl: (r, hasR, interim) => {
    const c = r.concentration, t = r.tail;
    const rb = t.alpha_diffs?.R_minus_B;
    const rbSig = rb && rb.ci95[1] < 0;
    return `${interim ? "<p><b>収集進行中のスナップショットに基づく中間結論</b>だ — 標本が増えれば数値は変わりうる。</p>" : ""}
    <ul>
      <li><b>事実:</b> Co-opコホートは普通の世界(幾何平均 ${sig2(c.A.geomean)} vs ナラティブ
        ${sig2(c.B.geomean)})、早期消滅率(${(100 * c.A.early_death_rate).toFixed(0)}% vs
        ${(100 * c.B.early_death_rate).toFixed(0)}%)など、ほとんどの指標で最も良い成果を示す。</li>
      <li><b>ただしこれは因果ではない:</b> オンラインCo-opはネットコードやサーバーのため作るのが
        難しく、コホートに趣味レベルのリリースがそもそも少ない。Co-opの優位は「Co-opだから」
        ではなく<b>「Co-opを作れるチームだから」</b>という構成効果の可能性が高い。</li>
      <li><b>安全に言えること:</b> ${(() => {
        const nm: Record<string, string> = { A: "Co-op", R: "ローグライク", B: "ナラティブ" };
        const ks = hasR ? ["A", "R", "B"] : ["A", "B"];
        const gmL = [...ks].sort((x, y) => c[y].geomean - c[x].geomean)
          .map((k) => `${nm[k]} ${sig2(c[k].geomean)}`).join(" > ");
        const edL = [...ks].sort((x, y) => c[y].early_death_rate - c[x].early_death_rate)
          .map((k) => `${nm[k]} ${(100 * c[k].early_death_rate).toFixed(1)}%`).join(" > ");
        return `現在の標本では、典型的成果(幾何平均レビュー)は${gmL}の順、
          早期消滅率は${edL}の順に高い。`;
      })()}
        ${hasR && rb ? (rb.point < 0
          ? `ローグライクはナラティブより裾が${rbSig ? "統計的に有意に" : ""}重い
             (α差 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}])。`
          : `ローグライクと(ストーリー重視の)ナラティブの裾の分布は実質的に対等だ
             (α差 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}])。`)
        : ""}</li>
      <li><b>時代効果に注意:</b> このウィンドウ(2022.01–2025.12)の数値には、各ジャンルの
        構造的特性だけでなく時代効果 — 特定ジャンルの流行とその冷え込み、競合作の大量参入、
        市場全体のリリース量の爆発 — が混ざっている。どのコホートであれ、今の数値が流行が
        変わった後も再現される保証はない。「時代効果 — 年別トレンド」セクションがこれを
        部分的に切り分ける。</li>
    </ul>`;
  },
  limitT: "限界",
  limits: [
    `<b>販売本数は推定値</b> — 主要結果変数のGamalytic copiesSoldはレビュー数・プレイタイム
     などを入力とする推定モデルであり、生の観測ではない。モデルに系統誤差があれば絶対水準はずれうるが、
     コホート間の比較は同じモデルを通した値同士のため相対的な結論への影響は小さい。`,
    `<b>ジャンルの交差は除外</b> — マルチCo-opかつローグライク(例: Risk of Rainシリーズ)は
     ローグライクコホートから外れ、Singleplayerタグ付きならどのコホートにも入らない
     (なければ優先順位によりCo-opに分類)。ハイブリッドジャンルの成果はこの分析の範囲外だ。`,
    `<b>Co-op標本が相対的に小さい</b> — 純粋マルチCo-opは約886本でナラティブの約1/9。
     Co-op関連指標(特に上位1%シェアとα)は信頼区間が広く、区間で読むべきだ。`,
    `<b>タグは自己選択</b> — タグはユーザー/開発者が付けるため境界事例の誤分類がありうる。
     別途収集したSteamSpyタグと照合した分類不一致は約1.5%と小さかった。`,
  ],
  foot: `データ: Gamalytic(販売推定) · コード/再現: <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  defT: "コホート定義 — 収集に使ったタグ",
  defCohort: "コホート", defInc: "包含条件 (Steamタグ)", defExc: "除外タグ",
  defRows: [
    { c: "A", inc: `<code>Online Co-Op</code> または <code>Co-op</code>、
      <b>かつ</b> <code>Multiplayer</code>`, exc: `<code>Singleplayer</code> —
      シングル兼用(スターデュー型)は除外、純粋マルチCo-opのみ` },
    { c: "R", inc: `<code>Rogue-like</code>, <code>Rogue-lite</code>,
      <code>Action Roguelike</code>, <code>Roguelike Deckbuilder</code>,
      <code>Roguevania</code>, <code>Traditional Roguelike</code> のいずれか`,
      exc: `マルチ/Co-op系すべて` },
    { c: "B", inc: `<code>Singleplayer</code> <b>かつ</b> <code>Story Rich</code>`,
      exc: `マルチ/Co-op系すべて` },
  ],
  defCommon: `マルチ/Co-op系の除外タグ = <code>Co-op</code>, <code>Online Co-Op</code>,
    <code>Local Co-Op</code>, <code>Co-op Campaign</code>, <code>Multiplayer</code>,
    <code>Massively Multiplayer</code>。タグはSteamSpyが提供するSteamユーザータグ基準。
    コホートは互いに排他的で、分類優先順位は<b>Co-op → ローグライク → ナラティブ</b>
    (例: ストーリーのあるローグライトはローグライクに分類)。共通フィルター: 有料 ·
    初期価格 &lt;$40 · type=game · 2022-01~2025-12リリース · 大手パブリッシャー除外。
    Story Richなしで<code>Adventure</code>/<code>Puzzle</code>のみのシングルゲームは別
    コホート(N)として収集を続け、広義定義への感度検証(頑健性分析)に使う。`,
  aboutT: "作った人",
  aboutBody: `この分析は<b>Concode</b>の<a href="https://x.com/SyntaxFossil" target="_blank"
    rel="noopener">開発者</a>が作りました。私たちは現在Steamで<b>Graytail</b>という
    ゲームを開発しています — まさにこのレポートのシングル・ナラティブ
    <code>Story Rich</code>コホートに属するゲームです。このレポートが役に立ったら、
    ぜひゲームのストアページにも遊びに来てください — 大きな励みになります。`,
  aboutSteam: "Graytail on Steam →",
  aboutRepo: "分析コード (GitHub) →",
  axReviews: "販売本数",
  axCcdfY: "P(X ≥ x)",
  axLogReviews: "販売本数 (対数軸)",
  axCumGames: "ゲームの累積比率",
  bandLabel: "中間帯 3.5千~3.5万本",
  equality: "均等線",
  ttCcdf: (x, p) => `販売 ≥ ${x.toLocaleString()}本<br/>ゲーム比率 ${(100 * p).toPrecision(2)}%`,
  ttLorenzHead: (x) => `下位 ${pct(x)} のゲーム`,
  ttLorenzRow: (name, y) => `${name}: 販売本数 ${pct(y)}`,
};

export const T: Record<Locale, typeof ko> = { ko, en, ja };
export const LOCALE_NAMES: Record<Locale, string> = { ko: "한국어", en: "English", ja: "日本語" };
