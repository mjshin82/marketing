<script lang="ts">
  import EChart from "./lib/EChart.svelte";
  import type { EChartsOption } from "echarts";

  let data = $state<any>(null);
  let mode = $state<"light" | "dark">(
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  $effect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => (mode = mq.matches ? "dark" : "light");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  });
  $effect(() => {
    fetch(import.meta.env.BASE_URL + "report_data.json")
      .then((r) => r.json())
      .then((d) => (data = d));
  });

  const TOK = {
    light: { a: "#eb6834", b: "#2a78d6", ink: "#0b0b0b", ink2: "#52514e",
             muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7",
             surface: "#fcfcfb", band: "rgba(137,135,129,0.10)" },
    dark:  { a: "#d95926", b: "#3987e5", ink: "#ffffff", ink2: "#c3c2b7",
             muted: "#898781", grid: "#2c2c2a", axis: "#383835",
             surface: "#1a1a19", band: "rgba(137,135,129,0.14)" },
  };
  const t = $derived(TOK[mode]);
  const LABELS = { A: "코옵 (온라인)", B: "싱글 내러티브" } as const;

  const p3 = (x: number) => (x < 0.001 ? x.toExponential(1) : x.toFixed(3));
  const pct = (x: number) => (100 * x).toFixed(1) + "%";
  const logTick = (v: number) =>
    ({ 0: "1", 1: "10", 2: "100", 3: "1k", 4: "10k", 5: "100k", 6: "1M" })[v] ?? "";

  const R = $derived(data?.results);
  const verdicts = $derived(
    !R ? null : {
      h1: R.tail.alpha_diff_A_minus_B.ci95[1] < 0,
      h2: R.middle.A.middle_share < R.middle.B.middle_share &&
          R.middle.middle_share_test.chi2_p < 0.05,
      h3: R.concentration.A.gini > R.concentration.B.gini &&
          R.concentration.A.gini_ci[0] > R.concentration.B.gini_ci[1],
    },
  );

  function axisCommon(tk: typeof TOK.light) {
    return {
      axisLine: { lineStyle: { color: tk.axis } },
      axisLabel: { color: tk.muted },
      splitLine: { lineStyle: { color: tk.grid } },
      nameTextStyle: { color: tk.ink2 },
    };
  }
  function legendCommon(tk: typeof TOK.light) {
    return { top: 0, right: 0, textStyle: { color: tk.ink2 }, itemWidth: 14, itemHeight: 9 };
  }
  function tooltipCommon(tk: typeof TOK.light) {
    return {
      backgroundColor: tk.surface, borderColor: tk.grid,
      textStyle: { color: tk.ink },
    };
  }

  const ccdfOption = $derived.by<EChartsOption | null>(() => {
    if (!data) return null;
    const s = data.series;
    return {
      backgroundColor: "transparent",
      legend: legendCommon(t),
      tooltip: {
        ...tooltipCommon(t), trigger: "item",
        formatter: (p: any) => Array.isArray(p.value)
          ? `리뷰 ≥ ${p.value[0].toLocaleString()}<br/>게임 비율 ${(100 * p.value[1]).toPrecision(2)}%`
          : "",
      },
      grid: { left: 56, right: 16, top: 34, bottom: 44 },
      xAxis: { type: "log", name: "리뷰 수", nameLocation: "middle", nameGap: 30, ...axisCommon(t) },
      yAxis: { type: "log", name: "P(X ≥ x)", nameLocation: "middle", nameGap: 44, ...axisCommon(t) },
      series: [
        { name: `${LABELS.A} α=${R.tail.A.alpha.toFixed(2)}`, type: "scatter", color: t.a,
          data: s.A.ccdf, symbolSize: 5, itemStyle: { opacity: 0.5 } },
        { name: `${LABELS.B} α=${R.tail.B.alpha.toFixed(2)}`, type: "scatter", color: t.b,
          data: s.B.ccdf, symbolSize: 5, itemStyle: { opacity: 0.5 } },
        { type: "line", data: s.A.fit, showSymbol: false, silent: true, color: t.a,
          lineStyle: { width: 2, type: "dashed" }, tooltip: { show: false } },
        { type: "line", data: s.B.fit, showSymbol: false, silent: true, color: t.b,
          lineStyle: { width: 2, type: "dashed" }, tooltip: { show: false } },
      ],
    } as EChartsOption;
  });

  const middleOption = $derived.by<EChartsOption | null>(() => {
    if (!data) return null;
    const s = data.series;
    return {
      backgroundColor: "transparent",
      legend: legendCommon(t),
      tooltip: {
        ...tooltipCommon(t), trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: t.axis } },
        valueFormatter: (v: any) => Number(v).toFixed(2),
      },
      grid: { left: 56, right: 16, top: 34, bottom: 44 },
      xAxis: { type: "value", min: 1, max: 6, interval: 1, name: "리뷰 수 (로그 축)",
               nameLocation: "middle", nameGap: 30,
               axisLabel: { color: t.muted, formatter: logTick },
               axisLine: { lineStyle: { color: t.axis } },
               splitLine: { lineStyle: { color: t.grid } } },
      yAxis: { type: "value", ...axisCommon(t) },
      series: [
        { name: LABELS.A, type: "line", data: s.A.kde, showSymbol: false, smooth: true, color: t.a,
          lineStyle: { width: 2 }, areaStyle: { opacity: 0.14 },
          markArea: {
            silent: true, itemStyle: { color: t.band },
            label: { color: t.ink2, position: "insideTop" },
            data: [[{ name: "중간 구간 100–1k", xAxis: 2 }, { xAxis: 3 }]],
          } },
        { name: LABELS.B, type: "line", data: s.B.kde, showSymbol: false, smooth: true, color: t.b,
          lineStyle: { width: 2 }, areaStyle: { opacity: 0.14 } },
      ],
    } as EChartsOption;
  });

  const lorenzOption = $derived.by<EChartsOption | null>(() => {
    if (!data) return null;
    const s = data.series;
    const C = R.concentration;
    return {
      backgroundColor: "transparent",
      legend: legendCommon(t),
      tooltip: {
        ...tooltipCommon(t), trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: t.axis } },
        formatter: (ps: any[]) => {
          const rows = ps.filter((p) => p.seriesName !== "균등선").map((p) =>
            `${p.marker} ${p.seriesName}: 리뷰 ${pct(p.value[1])}`);
          return `하위 ${pct(ps[0].value[0])} 게임<br/>` + rows.join("<br/>");
        },
      },
      grid: { left: 56, right: 16, top: 34, bottom: 44 },
      xAxis: { type: "value", min: 0, max: 1, name: "게임 누적 비율", nameLocation: "middle",
               nameGap: 30, axisLabel: { color: t.muted, formatter: pct },
               axisLine: { lineStyle: { color: t.axis } },
               splitLine: { lineStyle: { color: t.grid } } },
      yAxis: { type: "value", min: 0, max: 1,
               axisLabel: { color: t.muted, formatter: pct },
               axisLine: { lineStyle: { color: t.axis } },
               splitLine: { lineStyle: { color: t.grid } } },
      series: [
        { name: `${LABELS.A} Gini ${C.A.gini.toFixed(2)}`, type: "line", data: s.A.lorenz,
          showSymbol: false, color: t.a, lineStyle: { width: 2 } },
        { name: `${LABELS.B} Gini ${C.B.gini.toFixed(2)}`, type: "line", data: s.B.lorenz,
          showSymbol: false, color: t.b, lineStyle: { width: 2 } },
        { name: "균등선", type: "line", data: [[0, 0], [1, 1]], showSymbol: false,
          silent: true, color: t.muted, lineStyle: { width: 1, type: "dashed" },
          tooltip: { show: false } },
      ],
    } as EChartsOption;
  });
</script>

{#if !data}
  <main class="wrap"><p class="muted">report_data.json 로딩 중…</p></main>
{:else}
  <main class="wrap">
    <header>
      <p class="kicker">Steam 인디게임 분포 연구 · {data.meta.label === "pilot" ? "파일럿 데이터" : "전체 데이터"} · {data.meta.generated.slice(0, 10)}</p>
      <h1>코옵 게임의 성공은 정말 더 승자독식인가</h1>
      <p class="lede">
        온라인 코옵 게임의 입소문은 "친구 그룹이 동시에 모여야 작동하는" 조정(coordination)
        구조다. supercritical 분기 과정이 예측하는 대로라면 코옵 코호트의 성공 분포는 싱글
        내러티브 게임보다 더 극단적이어야 한다 — 꼬리는 더 무겁고, 중간은 비어 있고, 집중도는
        더 높아야 한다. 스팀 리뷰 수(판매량 대리변수)로 세 가설을 검증했다.
        코호트 A(코옵) <b>{data.meta.n_A.toLocaleString()}개</b>,
        코호트 B(싱글 내러티브) <b>{data.meta.n_B.toLocaleString()}개</b>
        (유료 · 초기가 &lt;$40 · 2022.01–2025.06 출시 · 리뷰 ≥10).
      </p>
    </header>

    <section class="tiles">
      <div class="tile">
        <p class="tile-k">H1 · 더 무거운 꼬리</p>
        <p class="tile-v">α {R.tail.A.alpha.toFixed(2)} <span class="vs">vs</span> {R.tail.B.alpha.toFixed(2)}</p>
        <p class="tile-s">차이 {R.tail.alpha_diff_A_minus_B.point.toFixed(2)}
          [{R.tail.alpha_diff_A_minus_B.ci95[0].toFixed(2)}, {R.tail.alpha_diff_A_minus_B.ci95[1].toFixed(2)}]
          · <b class={verdicts?.h1 ? "ok" : "na"}>{verdicts?.h1 ? "지지" : "불확정"}</b></p>
      </div>
      <div class="tile">
        <p class="tile-k">H2 · 빈 허리 (리뷰 100–1k 비율)</p>
        <p class="tile-v">{pct(R.middle.A.middle_share)} <span class="vs">vs</span> {pct(R.middle.B.middle_share)}</p>
        <p class="tile-s">Fisher p={p3(R.middle.middle_share_test.fisher_p)}
          · dip p {p3(R.middle.A.dip_p)} / {p3(R.middle.B.dip_p)}
          · <b class={verdicts?.h2 ? "ok" : "na"}>{verdicts?.h2 ? "지지" : "불확정"}</b></p>
      </div>
      <div class="tile">
        <p class="tile-k">H3 · 집중도 (Gini)</p>
        <p class="tile-v">{R.concentration.A.gini.toFixed(2)} <span class="vs">vs</span> {R.concentration.B.gini.toFixed(2)}</p>
        <p class="tile-s">상위 1% 점유 {pct(R.concentration.A.top1_share)} / {pct(R.concentration.B.top1_share)}
          · <b class={verdicts?.h3 ? "ok" : "na"}>{verdicts?.h3 ? "지지" : "불확정"}</b></p>
      </div>
    </section>

    <section class="card">
      <h3>가설 1 — 꼬리 비교: 로그-로그 CCDF</h3>
      <p class="cap">점은 관측 CCDF, 점선은 xmin 이상 구간의 멱함수 적합. 기울기가 완만할수록(α 작을수록)
        상위권으로 갈수록 확률이 천천히 줄어드는 무거운 꼬리.
        PL vs lognormal 우도비: A R={R.tail.A.LR_powerlaw_vs_lognormal.toFixed(2)} (p={p3(R.tail.A.p_powerlaw_vs_lognormal)}),
        B R={R.tail.B.LR_powerlaw_vs_lognormal.toFixed(2)} (p={p3(R.tail.B.p_powerlaw_vs_lognormal)})
        — p가 크면 멱함수/로그정규 판별 불가이므로 "무거운 꼬리"로만 해석.</p>
      {#if ccdfOption}<EChart option={ccdfOption} height={360} />{/if}
      <div class="interp">
        <p class="interp-t">이 결과가 뜻하는 것</p>
        <p>α는 "성공이 위로 갈수록 얼마나 빨리 희귀해지는가"를 재는 값이다.
          <b>α가 작을수록 초대형 히트가 상대적으로 자주 나오는, 더 극단적인 구조</b>다.
          현재 코옵 α={R.tail.A.alpha.toFixed(2)}, 싱글 α={R.tail.B.alpha.toFixed(2)}로
          {#if R.tail.A.alpha < R.tail.B.alpha}코옵 쪽 꼬리가 더 무겁다 —
            그래프에서도 코옵 점선의 기울기가 더 완만해서, 오른쪽 끝(초대형 히트 구간)에서
            코옵 곡선이 싱글 위에 있다.{:else}예상과 달리 코옵 꼬리가 더 무겁지 않다.{/if}
          {#if verdicts?.h1}
            부트스트랩 95% 신뢰구간 [{R.tail.alpha_diff_A_minus_B.ci95[0].toFixed(2)},
            {R.tail.alpha_diff_A_minus_B.ci95[1].toFixed(2)}]이 0을 제외하므로
            이 차이는 우연으로 보기 어렵다 → <b>가설 1 지지</b>.
          {:else}
            다만 차이의 95% 신뢰구간 [{R.tail.alpha_diff_A_minus_B.ci95[0].toFixed(2)},
            {R.tail.alpha_diff_A_minus_B.ci95[1].toFixed(2)}]이 0을 포함한다 —
            즉 "차이가 없다"는 가능성을 아직 배제할 수 없어 <b>통계적으로는 불확정</b>이다.
            표본이 커지면 구간이 좁아진다.
          {/if}</p>
      </div>
    </section>

    <section class="card">
      <h3>가설 2 — 빈 허리: log₁₀(리뷰) 밀도 (KDE)</h3>
      <p class="cap">회색 음영이 중간 성공 구간(리뷰 100–1,000개 ≈ 판매 3.5천–3.5만 장, Boxleiter ×35).
        쌍봉(대부분 조기 소멸 + 소수 폭발)이면 이 구간이 얇아진다.</p>
      {#if middleOption}<EChart option={middleOption} height={340} />{/if}
      <div class="interp">
        <p class="interp-t">이 결과가 뜻하는 것</p>
        <p>가설이 맞다면 코옵은 "적당히 성공"(회색 구간)이 드물어야 한다 —
          친구 그룹이 모이지 못하면 조기 소멸하고, 모이기 시작하면 폭발하기 때문에
          중간에 머물 이유가 없다는 논리다.
          실제 중간 구간 비율은 코옵 {pct(R.middle.A.middle_share)} vs
          싱글 {pct(R.middle.B.middle_share)}
          {#if verdicts?.h2}로 코옵이 유의하게 얇다 (Fisher p={p3(R.middle.middle_share_test.fisher_p)})
            → <b>가설 2 지지</b>.{:else}이며, 이 차이는 아직 통계적으로 유의하지 않다
            (Fisher p={p3(R.middle.middle_share_test.fisher_p)}) → <b>불확정</b>.{/if}
          쌍봉성(dip test)은 코옵 p={p3(R.middle.A.dip_p)}, 싱글 p={p3(R.middle.B.dip_p)} —
          {#if R.middle.A.dip_p < 0.05}코옵 분포는 봉우리가 하나가 아니라는 증거가 있다
            (조기 소멸 그룹과 폭발 그룹으로 갈라짐).{:else}p가 0.05보다 크면 "봉우리가
            하나뿐"이라는 가설을 기각하지 못한다는 뜻이다.{/if}</p>
      </div>
    </section>

    <section class="card">
      <h3>가설 3 — 집중도: 로렌츠 곡선</h3>
      <p class="cap">곡선이 아래로 쳐질수록 리뷰(≈판매)가 소수 게임에 집중.
        조기 소멸률(리뷰 &lt;10): 코옵 {pct(R.concentration.A.early_death_rate)}
        vs 싱글 {pct(R.concentration.B.early_death_rate)}
        (χ² p={p3(R.concentration.early_death_test.p)}).</p>
      {#if lorenzOption}<EChart option={lorenzOption} height={380} />{/if}
      <div class="interp">
        <p class="interp-t">이 결과가 뜻하는 것</p>
        <p>로렌츠 곡선이 대각선(균등선)에서 멀수록 성공이 소수에 집중된 시장이다.
          지금 수치로는 <b>코옵 상위 1% 게임이 코호트 전체 리뷰의
          {pct(R.concentration.A.top1_share)}</b>를 가져가는 반면, 싱글 상위 1%는
          {pct(R.concentration.B.top1_share)}에 그친다. Gini 계수(0=완전 균등, 1=완전 독식)도
          코옵 {R.concentration.A.gini.toFixed(2)} vs 싱글 {R.concentration.B.gini.toFixed(2)}.
          {#if verdicts?.h3}
            두 Gini의 신뢰구간이 겹치지 않으므로 <b>가설 3 지지</b> — 코옵 시장이
            구조적으로 더 승자독식이다.
          {:else}
            다만 두 Gini의 신뢰구간이 겹쳐 <b>아직 불확정</b> — 방향은 가설과 일치하지만
            표본이 더 필요하다.
          {/if}
          조기 소멸률(리뷰 10개 미만)은 코옵 {pct(R.concentration.A.early_death_rate)} vs
          싱글 {pct(R.concentration.B.early_death_rate)}로, "대부분 조기 소멸 + 소수 폭발"
          구조의 앞부분을 보여준다.</p>
      </div>
    </section>

    <section class="card">
      <h3>수치 요약</h3>
      <table>
        <thead><tr><th></th><th><span class="dot da"></span>코옵 (A)</th><th><span class="dot db"></span>싱글 내러티브 (B)</th></tr></thead>
        <tbody>
          <tr><td>표본 (리뷰 ≥10)</td><td>{R.tail.A.n.toLocaleString()}</td><td>{R.tail.B.n.toLocaleString()}</td></tr>
          <tr><td>멱함수 지수 α (SE)</td><td>{R.tail.A.alpha.toFixed(3)} ({R.tail.A.alpha_se.toFixed(3)})</td><td>{R.tail.B.alpha.toFixed(3)} ({R.tail.B.alpha_se.toFixed(3)})</td></tr>
          <tr><td>xmin / 꼬리 표본</td><td>{R.tail.A.xmin.toLocaleString()} / {R.tail.A.n_tail}</td><td>{R.tail.B.xmin.toLocaleString()} / {R.tail.B.n_tail}</td></tr>
          <tr><td>중간 구간(100–1k) 비율</td><td>{pct(R.middle.A.middle_share)}</td><td>{pct(R.middle.B.middle_share)}</td></tr>
          <tr><td>Hartigan dip p</td><td>{p3(R.middle.A.dip_p)}</td><td>{p3(R.middle.B.dip_p)}</td></tr>
          <tr><td>Gini [95% CI]</td><td>{R.concentration.A.gini.toFixed(3)} [{R.concentration.A.gini_ci[0].toFixed(3)}, {R.concentration.A.gini_ci[1].toFixed(3)}]</td><td>{R.concentration.B.gini.toFixed(3)} [{R.concentration.B.gini_ci[0].toFixed(3)}, {R.concentration.B.gini_ci[1].toFixed(3)}]</td></tr>
          <tr><td>상위 1% / 5% 점유</td><td>{pct(R.concentration.A.top1_share)} / {pct(R.concentration.A.top5_share)}</td><td>{pct(R.concentration.B.top1_share)} / {pct(R.concentration.B.top5_share)}</td></tr>
          <tr><td>조기 소멸률 (&lt;10 리뷰)</td><td>{pct(R.concentration.A.early_death_rate)}</td><td>{pct(R.concentration.B.early_death_rate)}</td></tr>
        </tbody>
      </table>
    </section>

    {#if R.robustness?.price_bands && Object.keys(R.robustness.price_bands).length}
      <section class="card">
        <h3>강건성 — 가격대·연도별 α</h3>
        <div class="two-col">
          <table>
            <thead><tr><th>가격대</th><th><span class="dot da"></span>α 코옵 (n)</th><th><span class="dot db"></span>α 싱글 (n)</th></tr></thead>
            <tbody>
              {#each Object.entries(R.robustness.price_bands) as [band, cell]}
                <tr><td>{band}</td>
                  <td>{(cell as any).A.alpha.toFixed(2)} ({(cell as any).A.n})</td>
                  <td>{(cell as any).B.alpha.toFixed(2)} ({(cell as any).B.n})</td></tr>
              {/each}
            </tbody>
          </table>
          <table>
            <thead><tr><th>연도</th><th><span class="dot da"></span>α 코옵 (n)</th><th><span class="dot db"></span>α 싱글 (n)</th></tr></thead>
            <tbody>
              {#each Object.entries(R.robustness.years) as [yr, cell]}
                <tr><td>{yr}</td>
                  <td>{(cell as any).A.alpha.toFixed(2)} ({(cell as any).A.n})</td>
                  <td>{(cell as any).B.alpha.toFixed(2)} ({(cell as any).B.n})</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    <section class="card">
      <h3>한계</h3>
      <ul class="limits">
        <li><b>리뷰-판매 배수의 장르 차이</b> — Boxleiter 배수는 장르·가격·연도에 따라 다르다.
          분포 형태 비교는 배수가 코호트 내에서 리뷰 수와 독립일 때만 완전히 안전하다.</li>
        <li><b>스트리밍 노출 교란</b> — 코옵 히트작은 트위치/유튜브 노출과 상호작용한다.
          관측된 집중도를 "친구 조정" 메커니즘만으로 귀속할 수 없다.</li>
        <li><b>SteamSpy 신선도</b> — 태그·가격은 SteamSpy 캐시 기준. 리뷰 수는 가능한 한
          스팀 공식 appreviews로 대체했다.</li>
        <li><b>생존 편향</b> — 상장폐지된 게임은 스팀 API에서 빠져 조기 소멸률이 과소추정될 수 있다.</li>
      </ul>
      <p class="muted foot">데이터: SteamSpy + Steam 공식 API · 코드: collect/pipeline.py, analysis/ · 리뷰 수는 판매량의 대리변수</p>
    </section>
  </main>
{/if}

<style>
  .wrap { max-width: 880px; margin: 0 auto; padding: 40px 20px 80px; }
  header h1 { font-size: 1.7rem; margin: 4px 0 12px; }
  .kicker { color: var(--text-muted); font-size: 0.82rem; letter-spacing: 0.04em;
            text-transform: uppercase; margin: 0; }
  .lede { color: var(--text-secondary); margin: 0 0 8px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
           gap: 12px; margin: 20px 0; }
  .tile { background: var(--surface-1); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px 16px; }
  .tile-k { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
  .tile-v { margin: 4px 0; font-size: 1.5rem; font-weight: 650; }
  .tile-v .vs { font-size: 0.85rem; font-weight: 400; color: var(--text-muted); }
  .tile-s { margin: 0; font-size: 0.8rem; color: var(--text-secondary); }
  .ok { color: var(--good); }
  .na { color: var(--text-muted); }
  .card { background: var(--surface-1); border: 1px solid var(--border);
          border-radius: 10px; padding: 18px 20px; margin: 16px 0; }
  .card h3 { margin: 0 0 6px; font-size: 1.05rem; }
  .cap { color: var(--text-secondary); font-size: 0.86rem; margin: 0 0 10px; }
  .interp { border-top: 1px solid var(--grid); margin-top: 12px; padding-top: 10px; }
  .interp-t { margin: 0 0 4px; font-size: 0.78rem; font-weight: 650; color: var(--text-muted);
              letter-spacing: 0.03em; text-transform: uppercase; }
  .interp p:not(.interp-t) { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--grid);
           font-variant-numeric: tabular-nums; }
  th:first-child, td:first-child { text-align: left; color: var(--text-secondary); }
  thead th { color: var(--text-muted); font-weight: 600; }
  th .dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px;
            margin-right: 6px; vertical-align: baseline; }
  th .dot.da { background: var(--series-a); }
  th .dot.db { background: var(--series-b); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }
  .limits { color: var(--text-secondary); font-size: 0.9rem; padding-left: 18px; }
  .limits li { margin-bottom: 6px; }
  .muted { color: var(--text-muted); }
  .foot { font-size: 0.78rem; margin: 12px 0 0; }
</style>
