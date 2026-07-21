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
    더 높아야 한다. 스팀 리뷰 수(판매량 대리변수)로 세 가설을 검증했다.
    코호트 A(코옵) <b>${m.n_A.toLocaleString()}개</b>${m.n_R
      ? `, 코호트 R(로그라이크) <b>${m.n_R.toLocaleString()}개</b>` : ""},
    코호트 B(싱글 내러티브) <b>${m.n_B.toLocaleString()}개</b>
    (유료 · 초기가 &lt;$40 · 2022.01–2025.12 출시 · 리뷰 ≥10 · 코호트는 상호배타,
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
  sumNote: (c: any, hasR: boolean) => {
    const gap = (k: string) => (c[k].mean / c[k].geomean).toFixed(0);
    return `읽는 법 — <b>중간값</b>은 게임을 성과순으로 줄 세웠을 때 한가운데 게임의 리뷰 수다.
      <b>기하평균</b>은 배수(로그) 스케일에서의 평균으로, "이 장르의 보통 게임이 어느 자릿수에서
      사는가"를 가리키며 소수 히트작의 영향을 받지 않는다 — 이 데이터처럼 성과가 몇 배씩
      벌어지는 분포에서의 올바른 평균이다. 반면 <b>산술평균</b>은 상위 1%가 지배하는 "복권
      기댓값"이라, 산술평균이 기하평균의 몇 배인가(코옵 ×${gap("A")}${hasR ? `, 로그라이크
      ×${gap("R")}` : ""}, 내러티브 ×${gap("B")})가 클수록 그 장르는 복권판에 가깝다.`;
  },
  insightTitle: (name: string): string => `${name} 게임을 만든다면`,
  insightCard: (d: any): string => `<ul>
    <li><b>보통의 세계</b> — 기하평균 리뷰 ${sig2(d.geomean)}개, 판매로 치면 약
      ${sig2(d.geomean * 35)}장 자릿수의 세계다 (Boxleiter ×35 기준).</li>
    <li><b>절반의 현실</b> — 살아남은 게임의 절반은 리뷰 ${sig2(d.median)}개 미만에 머문다.</li>
    <li><b>조기 소멸 위험</b> — 출시작의 ${(100 * d.early).toFixed(0)}%는 리뷰 10개도 못 모은다.</li>
    <li><b>중간 성공 확률</b> — 조기 소멸을 넘긴 게임 중 ${(100 * d.middle).toFixed(0)}%가
      리뷰 100–1,000개(판매 약 3.5천–3.5만 장) 구간에 안착한다.</li>
    <li><b>복권 배수</b> — 산술평균은 기하평균의 ×${d.lot.toFixed(0)}. 크게 터지면
      전형적 성과의 수십~수백 배를 가져가는 구조다.</li>
    <li><b>승자독식 정도</b> — 상위 1% 게임이 전체 리뷰의 ${(100 * d.top1).toFixed(0)}%,
      상위 5%가 ${(100 * d.top5).toFixed(0)}%를 점유한다.</li>
  </ul>`,
  robT: "강건성 — 가격대·연도별 α",
  robPrice: "가격대", robYear: "연도", robA: "α 코옵 (n)", robB: "α 싱글 (n)",
  eraT: "시대 효과 — 연도별 추세",
  eraCap: `연도 간 절대값 비교는 리뷰 누적 기간 차이로 오염된다 (2022년작은 ~4년치, 2025년작은
    ~1년치 리뷰). 유효한 독법은 같은 연도 안에서 코호트끼리 비교하는 것 — 누적 기간이
    상쇄된다. 이 시기 스팀 전체 출시량이 폭증했지만, 시장 전체의 공급 증가는 같은 시장을
    공유하는 두 코호트의 배율에서 상쇄된다. 상쇄되지 않는 것은 코호트별 공급 증가 속도의
    차이다 — 그래서 각 칸에 표본 출시작 수(n)를 함께 표시한다.`,
  eraNote: (era: any): string => {
    const ratios = era.ratios;
    const yrs = Object.keys(ratios).sort();
    if (yrs.length < 2) return "";
    const f = yrs[0], l = yrs[yrs.length - 1];
    const rb0 = ratios[f]?.R_over_B, rb1 = ratios[l]?.R_over_B;
    if (!rb0 || !rb1) return "";
    const fading = rb1 < rb0;
    const ly = yrs.length >= 3 ? yrs[yrs.length - 2] : l;  // last full-coverage year
    const sup = (c: string) => {
      const a = era.years[f]?.[c]?.n_full, b = era.years[ly]?.[c]?.n_full;
      return a && b ? (b / a).toFixed(1) : null;
    };
    const sR = sup("R"), sB = sup("B");
    let supTxt = "";
    if (sR && sB) {
      supTxt = ` 표본 기준 연간 출시작 수는 ${f}→${ly}년 사이 로그라이크 ×${sR},
        내러티브 ×${sB}로 변했다 — ${parseFloat(sR) > parseFloat(sB) ? `로그라이크 쪽 공급이 더 빨리 불어났으므로,
        배율 하락에는 수요(유행) 냉각만이 아니라 <b>공급 유입에 의한 경쟁 희석</b>이 섞여 있다.
        이 데이터로는 두 효과를 분리할 수 없다` : `공급 증가 속도는 비슷해서, 배율 변화는
        공급 희석보다 수요 쪽 요인일 가능성이 높다`}.`;
    }
    return `로그라이크의 내러티브 대비 기하평균 배율은 ${f}년 ×${rb0.toFixed(1)} →
      ${l}년 ×${rb1.toFixed(1)}로 ${fading ? `매년 줄고 있다 — 우위의 일부가 유행 순풍이었고
      그 순풍이 식어가는 중이라는 신호다` : `유지되고 있다 — 유행보다는 구조적 우위에
      가깝다는 신호다`}.${supTxt} 연간 표본이 작아 아직 방향성 수준으로 읽어야 한다.`;
  },
  eraYear: "연도",
  eraRatioA: "코옵÷내러",
  eraRatioR: "로그÷내러",
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
        보인다.</li>
      <li><b>그러나 이것은 인과가 아니다:</b> 온라인 코옵은 넷코드·서버 때문에 만들기 어렵고,
        그래서 코호트에 취미 수준 출시작이 애초에 적다. 코옵의 우위는 "코옵이라서"가 아니라
        <b>"코옵을 만들 수 있는 팀이라서"</b>일 가능성(구성 효과)이 크다. 같은 팀이 장르만
        바꿨을 때의 효과는 이 비교로 알 수 없다.</li>
      <li><b>비용은 데이터에 없다:</b> 코옵의 기대 성과가 몇 배 높아도 개발·운영 비용이 그만큼
        크면 비용 대비로는 뒤집힐 수 있다. 또한 코옵의 복권 배수(×${(c.A.mean / c.A.geomean).toFixed(0)})가
        가장 크고 상위 1% 점유(${(100 * c.A.top1_share).toFixed(0)}%)는 소표본에서 히트작 몇
        개가 만든 수치라 아직 흔들린다.</li>
      <li><b>안전하게 말할 수 있는 것:</b> 싱글 내러티브는 진입은 쉽지만 기대값이 가장 낮고
        조기 소멸(${(100 * c.B.early_death_rate).toFixed(0)}%)이 가장 흔한 세계다.
        ${hasR && rb ? (rb.point < 0
          ? `로그라이크는 내러티브보다 꼬리가 ${rbSig ? "통계적으로 유의하게 " : ""}무겁다
             (α 차이 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`
          : `로그라이크와 내러티브(스토리 중심)의 분포는 사실상 대등하다
             (α 차이 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`)
        : ""}</li>
      <li><b>시대 효과 주의:</b> 분석 창(2022.01–2025.12)은 로그라이크 대유행기와 겹친다.
        로그라이크의 좋은 수치에는 장르의 구조적 특성만이 아니라 유행의 순풍이 섞여 있을 수
        있다 — 유행이 식으면 재현되지 않을 수 있는 부분이다. 연도별 강건성 분석(2022→2025
        추세)이 이 효과를 부분적으로 가려낼 수 있다.</li>
    </ul>`;
  },
  limitT: "한계",
  limits: [
    `<b>리뷰-판매 배수의 장르 차이</b> — Boxleiter 배수는 장르·가격·연도에 따라 다르다.
     분포 형태 비교는 배수가 코호트 내에서 리뷰 수와 독립일 때만 완전히 안전하다.`,
    `<b>스트리밍 노출 교란</b> — 코옵 히트작은 트위치/유튜브 노출과 상호작용한다.
     관측된 집중도를 "친구 조정" 메커니즘만으로 귀속할 수 없다.`,
    `<b>SteamSpy 신선도</b> — 태그·가격은 SteamSpy 캐시 기준. 리뷰 수는 가능한 한
     스팀 공식 appreviews로 대체했다.`,
    `<b>생존 편향</b> — 상장폐지된 게임은 스팀 API에서 빠져 조기 소멸률이 과소추정될 수 있다.`,
    `<b>2025 하반기 커버리지</b> — 하반기 출시작은 리뷰 누적 기간이 짧고(7–12개월) SteamSpy
     목록 편입 지연으로 표본이 얇다. 컷오프를 2025-06으로 좁혀도 결과는 사실상 동일했다
     (민감도 확인 완료).`,
  ],
  foot: `데이터: SteamSpy + Steam 공식 API · 리뷰 수는 판매량의 대리변수 · 코드/재현:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  defT: "코호트 정의 — 수집에 사용한 태그",
  defCohort: "코호트", defInc: "포함 조건 (스팀 태그)", defExc: "제외 태그",
  defRows: [
    { c: "A", inc: `<code>Online Co-Op</code> 또는 <code>Co-op</code> 중 하나
      <b>그리고</b> <code>Multiplayer</code>`, exc: `—` },
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
    Cohort A (co-op) <b>${m.n_A.toLocaleString()} games</b>${m.n_R
      ? `, cohort R (roguelike) <b>${m.n_R.toLocaleString()} games</b>` : ""},
    cohort B (single-player narrative) <b>${m.n_B.toLocaleString()} games</b>
    (paid · launch price &lt;$40 · released 2022.01–2025.12 · ≥10 reviews · cohorts are
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
  sumNote: (c, hasR) => {
    const gap = (k: string) => (c[k].mean / c[k].geomean).toFixed(0);
    return `How to read — the <b>median</b> is the review count of the middle game when you
      line the cohort up by outcome. The <b>geometric mean</b> is the average on a
      multiplicative (log) scale: it tells you what order of magnitude a typical game in the
      genre lives at, and is immune to a few mega-hits — the right notion of "average" for
      data that spreads by multiples. The <b>arithmetic mean</b>, by contrast, is a
      lottery-style expected value dominated by the top 1%; the wider the gap between
      arithmetic and geometric mean (co-op ×${gap("A")}${hasR ? `, roguelike ×${gap("R")}` : ""},
      narrative ×${gap("B")}), the more lottery-like the genre.`;
  },
  insightTitle: (name) => `If you're making a ${name} game`,
  insightCard: (d) => `<ul>
    <li><b>The typical world</b> — geometric mean of ${sig2(d.geomean)} reviews, i.e. on the
      order of ${sig2(d.geomean * 35)} copies sold (Boxleiter ×35).</li>
    <li><b>Half the reality</b> — half of surviving games stay under ${sig2(d.median)} reviews.</li>
    <li><b>Early-death risk</b> — ${(100 * d.early).toFixed(0)}% of releases never reach even
      10 reviews.</li>
    <li><b>Odds of a mid-tier hit</b> — among games that survive early death,
      ${(100 * d.middle).toFixed(0)}% land in the 100–1,000 review band (~3.5k–35k copies).</li>
    <li><b>Lottery multiplier</b> — the arithmetic mean is ×${d.lot.toFixed(0)} the geometric
      mean: a real hit pays tens to hundreds of times the typical outcome.</li>
    <li><b>Winner-take-all</b> — the top 1% of games capture ${(100 * d.top1).toFixed(0)}% of
      all reviews; the top 5% capture ${(100 * d.top5).toFixed(0)}%.</li>
  </ul>`,
  robT: "Robustness — α by price band and year",
  robPrice: "Price band", robYear: "Year", robA: "α co-op (n)", robB: "α single (n)",
  eraT: "Era effect — year-by-year trend",
  eraCap: `Comparing absolute levels across years is confounded by review-accumulation time
    (a 2022 release has had ~4 years of reviews, a 2025 release ~1 year). The valid reading
    is the within-year comparison between cohorts — accumulation cancels out. Steam's overall
    release volume exploded over this period, but market-wide supply growth also cancels in
    the ratio, since both cohorts share the same market. What does NOT cancel is a
    difference in supply growth between cohorts — hence each cell also shows the sample
    release count (n).`,
  eraNote: (era) => {
    const ratios = era.ratios;
    const yrs = Object.keys(ratios).sort();
    if (yrs.length < 2) return "";
    const f = yrs[0], l = yrs[yrs.length - 1];
    const rb0 = ratios[f]?.R_over_B, rb1 = ratios[l]?.R_over_B;
    if (!rb0 || !rb1) return "";
    const fading = rb1 < rb0;
    const ly = yrs.length >= 3 ? yrs[yrs.length - 2] : l;  // last full-coverage year
    const sup = (c: string) => {
      const a = era.years[f]?.[c]?.n_full, b = era.years[ly]?.[c]?.n_full;
      return a && b ? (b / a).toFixed(1) : null;
    };
    const sR = sup("R"), sB = sup("B");
    let supTxt = "";
    if (sR && sB) {
      supTxt = ` Between ${f} and ${ly}, yearly release counts in our sample changed ×${sR}
        for roguelikes vs ×${sB} for narrative — ${parseFloat(sR) > parseFloat(sB)
        ? `roguelike supply grew faster, so the falling ratio mixes demand (fashion) cooling
        with <b>competitive dilution from supply influx</b>; the two cannot be separated in
        this data`
        : `supply grew at a similar pace, so the ratio change is more likely demand-side`}.`;
    }
    return `The roguelike-to-narrative geometric-mean ratio moved from ×${rb0.toFixed(1)} in
      ${f} to ×${rb1.toFixed(1)} in ${l}${fading ? ` — shrinking every year, a sign that part
      of the genre's edge was a fashion tailwind that is cooling` : ` — holding steady,
      suggesting a structural rather than fashion-driven edge`}.${supTxt} Per-year samples
      are small, so read this as a direction, not a verdict.`;
  },
  eraYear: "Year",
  eraRatioA: "Co-op ÷ narrative",
  eraRatioR: "Roguelike ÷ narrative",
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
        ${(100 * c.B.early_death_rate).toFixed(0)}%), and more.</li>
      <li><b>But this is not causal:</b> online co-op is hard to build (netcode, servers), so
        the cohort contains far fewer hobbyist releases. The co-op advantage is likely
        <b>"teams capable of shipping co-op"</b> rather than "being co-op" — a composition
        effect. What happens if the same team merely switches genre cannot be read off this
        comparison.</li>
      <li><b>Costs are not in the data:</b> even a several-fold higher expected outcome can
        flip once development and live-ops costs are counted. Co-op also has the largest
        lottery multiplier (×${(c.A.mean / c.A.geomean).toFixed(0)}) and its top-1% share
        (${(100 * c.A.top1_share).toFixed(0)}%) rests on a few hits in a small sample.</li>
      <li><b>What can be said safely:</b> single-player narrative is the easiest world to
        enter but has the lowest expectations and the highest early-death rate
        (${(100 * c.B.early_death_rate).toFixed(0)}%).
        ${hasR && rb ? (rb.point < 0
          ? `Roguelikes have a ${rbSig ? "statistically significantly " : ""}heavier tail than
             narrative games (α diff ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`
          : `Roguelikes and (story-rich) narrative games show essentially comparable
             distributions (α diff ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}]).`)
        : ""}</li>
      <li><b>Beware the era effect:</b> the analysis window (2022.01–2025.12) overlaps with
        the roguelike boom. The genre's strong numbers may mix a structural property with a
        fashion tailwind — a part that may not replicate once the trend cools. The by-year
        robustness analysis (2022→2025 trend) can partially separate this.</li>
    </ul>`;
  },
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
    `<b>H2-2025 coverage</b> — late-2025 releases have short review-accumulation windows
     (7–12 months) and SteamSpy lags on recent titles, so that slice is thin. Narrowing the
     cutoff to 2025-06 left the results essentially unchanged (sensitivity checked).`,
  ],
  foot: `Data: SteamSpy + official Steam API · review count is a sales proxy · code:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  defT: "Cohort definitions — tags used for collection",
  defCohort: "Cohort", defInc: "Inclusion (Steam tags)", defExc: "Excluded tags",
  defRows: [
    { c: "A", inc: `<code>Online Co-Op</code> or <code>Co-op</code>,
      <b>and</b> <code>Multiplayer</code>`, exc: `—` },
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
    (有料 · 初期価格 &lt;$40 · 2022.01–2025.12リリース · レビュー10件以上 ·
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
    <li><b>普通の世界</b> — 幾何平均レビュー${sig2(d.geomean)}件、販売に換算すると約
      ${sig2(d.geomean * 35)}本の桁の世界 (Boxleiter ×35基準)。</li>
    <li><b>半分の現実</b> — 生き残ったゲームの半分はレビュー${sig2(d.median)}件未満にとどまる。</li>
    <li><b>早期消滅リスク</b> — リリース作の${(100 * d.early).toFixed(0)}%はレビュー10件も集められない。</li>
    <li><b>中堅ヒットの確率</b> — 早期消滅を越えたゲームのうち${(100 * d.middle).toFixed(0)}%が
      レビュー100–1,000件(販売約3.5千–3.5万本)の帯に着地する。</li>
    <li><b>宝くじ倍率</b> — 算術平均は幾何平均の×${d.lot.toFixed(0)}。大きく当たれば
      典型的成果の数十~数百倍を持っていく構造だ。</li>
    <li><b>勝者総取りの度合い</b> — 上位1%のゲームが全レビューの${(100 * d.top1).toFixed(0)}%、
      上位5%が${(100 * d.top5).toFixed(0)}%を占有する。</li>
  </ul>`,
  robT: "頑健性 — 価格帯·年別のα",
  robPrice: "価格帯", robYear: "年", robA: "α Co-op (n)", robB: "α シングル (n)",
  eraT: "時代効果 — 年別トレンド",
  eraCap: `年をまたいだ絶対値の比較はレビュー蓄積期間の差で汚染される(2022年作は~4年分、
    2025年作は~1年分)。有効な読み方は同じ年の中でコホート同士を比較すること — 蓄積期間が
    相殺される。この期間、Steam全体のリリース数は爆発的に増えたが、市場全体の供給増加は
    同じ市場を共有する両コホートの倍率では相殺される。相殺されないのはコホート間の供給
    増加速度の差だ — そのため各セルに標本リリース数(n)も併記する。`,
  eraNote: (era) => {
    const ratios = era.ratios;
    const yrs = Object.keys(ratios).sort();
    if (yrs.length < 2) return "";
    const f = yrs[0], l = yrs[yrs.length - 1];
    const rb0 = ratios[f]?.R_over_B, rb1 = ratios[l]?.R_over_B;
    if (!rb0 || !rb1) return "";
    const fading = rb1 < rb0;
    const ly = yrs.length >= 3 ? yrs[yrs.length - 2] : l;  // last full-coverage year
    const sup = (c: string) => {
      const a = era.years[f]?.[c]?.n_full, b = era.years[ly]?.[c]?.n_full;
      return a && b ? (b / a).toFixed(1) : null;
    };
    const sR = sup("R"), sB = sup("B");
    let supTxt = "";
    if (sR && sB) {
      supTxt = `${f}→${ly}年の間、標本ベースの年間リリース数はローグライク×${sR}、
        ナラティブ×${sB}に変化した — ${parseFloat(sR) > parseFloat(sB) ? `ローグライク側の供給がより速く膨らんだため、
        倍率低下には需要(流行)の冷え込みだけでなく<b>供給流入による競争希釈</b>が混ざっている。
        このデータでは両者を分離できない` : `供給の増加速度は同程度で、倍率の変化は需要側の
        要因である可能性が高い`}。`;
    }
    return `ローグライクのナラティブ比幾何平均倍率は${f}年の×${rb0.toFixed(1)}から${l}年の
      ×${rb1.toFixed(1)}へ${fading ? `毎年縮小している — 優位の一部が流行の追い風であり、
      その追い風が冷めつつあるというシグナルだ` : `維持されている — 流行ではなく構造的優位に
      近いというシグナルだ`}。${supTxt}年別標本は小さく、まだ方向性として読むべきだ。`;
  },
  eraYear: "年",
  eraRatioA: "Co-op÷ナラティブ",
  eraRatioR: "ローグライク÷ナラティブ",
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
      <li><b>コストはデータにない:</b> 期待成果が数倍高くても、開発・運営コストがそれだけ大きければ
        コスト対比では逆転しうる。またCo-opの宝くじ倍率(×${(c.A.mean / c.A.geomean).toFixed(0)})は
        最大で、上位1%占有(${(100 * c.A.top1_share).toFixed(0)}%)は小標本の数本のヒットが
        作った数値でまだ不安定だ。</li>
      <li><b>安全に言えること:</b> シングル・ナラティブは参入は簡単だが期待値が最も低く、
        早期消滅(${(100 * c.B.early_death_rate).toFixed(0)}%)が最も多い世界だ。
        ${hasR && rb ? (rb.point < 0
          ? `ローグライクはナラティブより裾が${rbSig ? "統計的に有意に" : ""}重い
             (α差 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}])。`
          : `ローグライクと(ストーリー重視の)ナラティブの分布は実質的に対等だ
             (α差 ${rb.point.toFixed(2)} [${rb.ci95[0].toFixed(2)}, ${rb.ci95[1].toFixed(2)}])。`)
        : ""}</li>
      <li><b>時代効果に注意:</b> 分析ウィンドウ(2022.01–2025.12)はローグライク大流行期と重なる。
        ローグライクの良い数値には、ジャンルの構造的特性だけでなく流行の追い風が混ざっている
        可能性がある — 流行が冷めれば再現しない部分かもしれない。年別の頑健性分析(2022→2025の
        トレンド)がこの効果を部分的に切り分けられる。</li>
    </ul>`;
  },
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
    `<b>2025年下半期のカバレッジ</b> — 下半期リリースはレビュー蓄積期間が短く(7–12ヶ月)、
     SteamSpyの収録遅延で標本が薄い。カットオフを2025-06に狭めても結果は実質同じだった
     (感度確認済み)。`,
  ],
  foot: `データ: SteamSpy + Steam公式API · レビュー数は販売量の代理変数 · コード/再現:
    <a class="repo" href="https://github.com/mjshin82/marketing" target="_blank" rel="noopener">github.com/mjshin82/marketing</a>`,
  defT: "コホート定義 — 収集に使ったタグ",
  defCohort: "コホート", defInc: "包含条件 (Steamタグ)", defExc: "除外タグ",
  defRows: [
    { c: "A", inc: `<code>Online Co-Op</code> または <code>Co-op</code>、
      <b>かつ</b> <code>Multiplayer</code>`, exc: `—` },
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
