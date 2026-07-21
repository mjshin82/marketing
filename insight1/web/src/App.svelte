<script lang="ts">
  import EChart from "./lib/EChart.svelte";
  import type { EChartsOption } from "echarts";
  import { T, LOCALE_NAMES, detectLocale, type Locale } from "./lib/i18n";

  let data = $state<any>(null);
  let locale = $state<Locale>(detectLocale());
  let mode = $state<"light" | "dark">(
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  const L = $derived(T[locale]);

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
  $effect(() => {
    document.documentElement.lang = locale;
    document.title = L.docTitle;
    try { localStorage.setItem("insight1-lang", locale); } catch { /* ignore */ }
  });

  const TOK = {
    light: { a: "#eb6834", b: "#2a78d6", r: "#1baf7a", ink: "#0b0b0b", ink2: "#52514e",
             muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7",
             surface: "#fcfcfb", band: "rgba(137,135,129,0.10)" },
    dark:  { a: "#d95926", b: "#3987e5", r: "#199e70", ink: "#ffffff", ink2: "#c3c2b7",
             muted: "#898781", grid: "#2c2c2a", axis: "#383835",
             surface: "#1a1a19", band: "rgba(137,135,129,0.14)" },
  };
  const t = $derived(TOK[mode]);

  const p3 = (x: number) => (x < 0.001 ? x.toExponential(1) : x.toFixed(3));
  const pct = (x: number) => (100 * x).toFixed(1) + "%";
  const logTick = (v: number) =>
    ({ 0: "1", 1: "10", 2: "100", 3: "1k", 4: "10k", 5: "100k", 6: "1M" })[v] ?? "";

  const R = $derived(data?.results);
  const hasR = $derived(!!(data?.series?.R && R?.tail?.R && R?.middle?.R && R?.concentration?.R));
  const COLS = $derived(hasR ? ["A", "R", "B"] : ["A", "B"]);  // co-op / roguelike / narrative
  const DOT: Record<string, string> = { A: "da", R: "dr", B: "db" };
  const cohortName = (c: string) => (c === "A" ? L.cohortA : c === "R" ? L.cohortR : L.cohortB);
  // Steam-wide yearly release counts (SteamDB, rounded; methodology varies)
  const MARKET: [string, number][] = [
    ["2022", 11100], ["2023", 14500], ["2024", 18500], ["2025", 20000],
  ];
  const marketOption = $derived.by<EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipCommon(t), trigger: "item",
      formatter: (p: any) => `${p.name}: ${Number(p.value).toLocaleString()}`,
    },
    grid: { left: 56, right: 16, top: 20, bottom: 28 },
    xAxis: { type: "category", data: MARKET.map((m) => m[0]),
             axisLine: { lineStyle: { color: t.axis } },
             axisLabel: { color: t.muted }, axisTick: { show: false } },
    yAxis: { type: "value", axisLabel: { color: t.muted },
             splitLine: { lineStyle: { color: t.grid } } },
    series: [{
      type: "bar", data: MARKET.map((m) => m[1]), barWidth: "45%",
      color: t.muted, itemStyle: { borderRadius: [4, 4, 0, 0], opacity: 0.75 },
      label: { show: true, position: "top", color: t.ink2,
               formatter: (p: any) => Number(p.value).toLocaleString() },
    }],
  } as EChartsOption));

  const insightOf = (c: string) => ({
    geomean: R.concentration[c].geomean,
    median: R.concentration[c].median,
    lot: R.concentration[c].mean / R.concentration[c].geomean,
    early: R.concentration[c].early_death_rate,
    middle: R.middle[c].middle_share,
    top1: R.concentration[c].top1_share,
    top5: R.concentration[c].top5_share,
  });
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
        formatter: (p: any) => Array.isArray(p.value) ? L.ttCcdf(p.value[0], p.value[1]) : "",
      },
      grid: { left: 56, right: 16, top: 34, bottom: 44 },
      xAxis: { type: "log", name: L.axReviews, nameLocation: "middle", nameGap: 30, ...axisCommon(t) },
      yAxis: { type: "log", name: L.axCcdfY, nameLocation: "middle", nameGap: 44, ...axisCommon(t) },
      series: [
        { name: `${L.cohortA} α=${R.tail.A.alpha.toFixed(2)}`, type: "scatter", color: t.a,
          data: s.A.ccdf, symbolSize: 5, itemStyle: { opacity: 0.5 } },
        ...(hasR ? [{ name: `${L.cohortR} α=${R.tail.R.alpha.toFixed(2)}`, type: "scatter",
          color: t.r, data: s.R.ccdf, symbolSize: 5, itemStyle: { opacity: 0.5 } }] : []),
        { name: `${L.cohortB} α=${R.tail.B.alpha.toFixed(2)}`, type: "scatter", color: t.b,
          data: s.B.ccdf, symbolSize: 5, itemStyle: { opacity: 0.5 } },
        { type: "line", data: s.A.fit, showSymbol: false, silent: true, color: t.a,
          lineStyle: { width: 2, type: "dashed" }, tooltip: { show: false } },
        ...(hasR ? [{ type: "line", data: s.R.fit, showSymbol: false, silent: true, color: t.r,
          lineStyle: { width: 2, type: "dashed" }, tooltip: { show: false } }] : []),
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
      xAxis: { type: "value", min: 1, max: 6, interval: 1, name: L.axLogReviews,
               nameLocation: "middle", nameGap: 30,
               axisLabel: { color: t.muted, formatter: logTick },
               axisLine: { lineStyle: { color: t.axis } },
               splitLine: { lineStyle: { color: t.grid } } },
      yAxis: { type: "value", ...axisCommon(t) },
      series: [
        { name: L.cohortA, type: "line", data: s.A.kde, showSymbol: false, smooth: true, color: t.a,
          lineStyle: { width: 2 }, areaStyle: { opacity: 0.14 },
          markArea: {
            silent: true, itemStyle: { color: t.band },
            label: { color: t.ink2, position: "insideTop" },
            data: [[{ name: L.bandLabel, xAxis: 2 }, { xAxis: 3 }]],
          } },
        ...(hasR ? [{ name: L.cohortR, type: "line", data: s.R.kde, showSymbol: false,
          smooth: true, color: t.r, lineStyle: { width: 2 }, areaStyle: { opacity: 0.14 } }] : []),
        { name: L.cohortB, type: "line", data: s.B.kde, showSymbol: false, smooth: true, color: t.b,
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
          const rows = ps.filter((p) => p.seriesName !== L.equality).map((p) =>
            `${p.marker} ${L.ttLorenzRow(p.seriesName, p.value[1])}`);
          return `${L.ttLorenzHead(ps[0].value[0])}<br/>` + rows.join("<br/>");
        },
      },
      grid: { left: 56, right: 16, top: 34, bottom: 44 },
      xAxis: { type: "value", min: 0, max: 1, name: L.axCumGames, nameLocation: "middle",
               nameGap: 30, axisLabel: { color: t.muted, formatter: pct },
               axisLine: { lineStyle: { color: t.axis } },
               splitLine: { lineStyle: { color: t.grid } } },
      yAxis: { type: "value", min: 0, max: 1,
               axisLabel: { color: t.muted, formatter: pct },
               axisLine: { lineStyle: { color: t.axis } },
               splitLine: { lineStyle: { color: t.grid } } },
      series: [
        { name: `${L.cohortA} Gini ${C.A.gini.toFixed(2)}`, type: "line", data: s.A.lorenz,
          showSymbol: false, color: t.a, lineStyle: { width: 2 } },
        ...(hasR ? [{ name: `${L.cohortR} Gini ${C.R.gini.toFixed(2)}`, type: "line",
          data: s.R.lorenz, showSymbol: false, color: t.r, lineStyle: { width: 2 } }] : []),
        { name: `${L.cohortB} Gini ${C.B.gini.toFixed(2)}`, type: "line", data: s.B.lorenz,
          showSymbol: false, color: t.b, lineStyle: { width: 2 } },
        { name: L.equality, type: "line", data: [[0, 0], [1, 1]], showSymbol: false,
          silent: true, color: t.muted, lineStyle: { width: 1, type: "dashed" },
          tooltip: { show: false } },
      ],
    } as EChartsOption;
  });
</script>

{#if !data}
  <main class="wrap"><p class="muted">{L.loading}</p></main>
{:else}
  <main class="wrap">
    <header>
      <div class="kicker-row">
        <p class="kicker">{L.kicker(L.snapshot[data.meta.label] ?? data.meta.label, data.meta.generated.slice(0, 10))}</p>
        <nav class="langs">
          {#each Object.entries(LOCALE_NAMES) as [code, name]}
            <button class:active={locale === code} onclick={() => (locale = code as Locale)}>{name}</button>
          {/each}
        </nav>
      </div>
      <h1>{L.title}</h1>
      <p class="lede">{@html L.lede(data.meta)}</p>
    </header>


    <section class="card">
      <h3>{L.c1t}</h3>
      <p class="cap">{L.c1cap(R.tail)}</p>
      {#if ccdfOption}<EChart option={ccdfOption} height={360} />{/if}
      <div class="interp">
        <p class="interp-t">{L.interpT}</p>
        <p>{@html L.interp1(R.tail, verdicts?.h1)}</p>
      </div>
    </section>

    <section class="card">
      <h3>{L.c2t}</h3>
      <p class="cap">{L.c2cap()}</p>
      {#if middleOption}<EChart option={middleOption} height={340} />{/if}
      <div class="interp">
        <p class="interp-t">{L.interpT}</p>
        <p>{@html L.interp2(R.middle, verdicts?.h2)}</p>
      </div>
    </section>

    <section class="card">
      <h3>{L.c3t}</h3>
      <p class="cap">{L.c3cap(R.concentration)}</p>
      {#if lorenzOption}<EChart option={lorenzOption} height={380} />{/if}
      <div class="interp">
        <p class="interp-t">{L.interpT}</p>
        <p>{@html L.interp3(R.concentration, verdicts?.h3)}</p>
      </div>
    </section>

    <section class="card">
      <h3>{L.sumT}</h3>
      <table>
        <thead><tr><th></th>{#each COLS as c}<th><span class="dot {DOT[c]}"></span>{c === "A" ? L.thA : c === "R" ? L.thR : L.thB}</th>{/each}</tr></thead>
        <tbody>
          <tr><td>{L.rows.n}</td>{#each COLS as c}<td>{R.tail[c].n.toLocaleString()}</td>{/each}</tr>
          <tr><td>{L.rows.alpha}</td>{#each COLS as c}<td>{R.tail[c].alpha.toFixed(3)} ({R.tail[c].alpha_se.toFixed(3)})</td>{/each}</tr>
          <tr><td>{L.rows.xmin}</td>{#each COLS as c}<td>{R.tail[c].xmin.toLocaleString()} / {R.tail[c].n_tail}</td>{/each}</tr>
          <tr><td>{L.rows.median}</td>{#each COLS as c}<td>{R.concentration[c].median.toLocaleString()}</td>{/each}</tr>
          <tr><td>{L.rows.mean}</td>{#each COLS as c}<td>{Math.round(R.concentration[c].mean).toLocaleString()} (×{R.concentration[c].mean_over_median.toFixed(0)})</td>{/each}</tr>
          <tr><td>{L.rows.geomean}</td>{#each COLS as c}<td>{Math.round(R.concentration[c].geomean).toLocaleString()}</td>{/each}</tr>
          <tr><td>{L.rows.middle}</td>{#each COLS as c}<td>{pct(R.middle[c].middle_share)}</td>{/each}</tr>
          <tr><td>{L.rows.dip}</td>{#each COLS as c}<td>{p3(R.middle[c].dip_p)}</td>{/each}</tr>
          <tr><td>{L.rows.gini}</td>{#each COLS as c}<td>{R.concentration[c].gini.toFixed(3)} [{R.concentration[c].gini_ci[0].toFixed(3)}, {R.concentration[c].gini_ci[1].toFixed(3)}]</td>{/each}</tr>
          <tr><td>{L.rows.top}</td>{#each COLS as c}<td>{pct(R.concentration[c].top1_share)} / {pct(R.concentration[c].top5_share)}</td>{/each}</tr>
          <tr><td>{L.rows.death}</td>{#each COLS as c}<td>{pct(R.concentration[c].early_death_rate)}</td>{/each}</tr>
        </tbody>
      </table>
      <div class="interp">
        <p class="interp-t">{L.interpT}</p>
        <p>{@html L.sumNote(R.concentration, hasR)}</p>
      </div>
      <div class="insight-grid">
        {#each COLS as c}
          <div class="insight">
            <p class="insight-t"><span class="dot {DOT[c]}"></span>{L.insightTitle(cohortName(c))}</p>
            {@html L.insightCard(insightOf(c))}
          </div>
        {/each}
      </div>
    </section>

    {#if R.robustness?.price_bands && Object.keys(R.robustness.price_bands).length}
      <section class="card">
        <h3>{L.robT}</h3>
        <div class="two-col">
          <table>
            <thead><tr><th>{L.robYear}</th>{#each COLS as c}<th><span class="dot {DOT[c]}"></span>α {cohortName(c)}</th>{/each}</tr></thead>
            <tbody>
              {#each Object.entries(R.robustness.years) as [yr, cell]}
                <tr><td>{yr}</td>
                  {#each COLS as c}<td>{(cell as any)[c] ? `${(cell as any)[c].alpha.toFixed(2)} (${(cell as any)[c].n})` : "—"}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
          <table>
            <thead><tr><th>{L.robYear}</th><th><span class="dot da"></span>{L.robA}</th><th><span class="dot db"></span>{L.robB}</th>{#if hasR}<th><span class="dot dr"></span>{L.cohortR}</th>{/if}</tr></thead>
            <tbody>
              {#each Object.entries(R.robustness.years) as [yr, cell]}
                <tr><td>{yr}</td>
                  <td>{(cell as any).A.alpha.toFixed(2)} ({(cell as any).A.n})</td>
                  <td>{(cell as any).B.alpha.toFixed(2)} ({(cell as any).B.n})</td>
                  {#if hasR}<td>{(cell as any).R ? `${(cell as any).R.alpha.toFixed(2)} (${(cell as any).R.n})` : "—"}</td>{/if}</tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    <section class="card">
      <h3>{L.marketT}</h3>
      <p class="cap">{@html L.marketCap}</p>
      <EChart option={marketOption} height={220} />
    </section>

    {#if R.era?.years && Object.keys(R.era.years).length >= 2}
      <section class="card">
        <h3>{L.eraT}</h3>
        <p class="cap">{@html L.eraCap}</p>
        <table>
          <thead><tr><th>{L.eraYear}</th>{#each COLS as c}<th><span class="dot {DOT[c]}"></span>{cohortName(c)}</th>{/each}<th>{L.eraRatioA}</th><th>{L.eraRatioR}</th></tr></thead>
          <tbody>
            {#each Object.keys(R.era.years).sort() as yr}
              <tr>
                <td>{yr}</td>
                {#each COLS as c}
                  <td>{R.era.years[yr][c] ? `${Math.round(R.era.years[yr][c].geomean).toLocaleString()} (n${R.era.years[yr][c].n_full})` : "—"}</td>
                {/each}
                <td>{R.era.ratios[yr]?.A_over_B ? `×${R.era.ratios[yr].A_over_B.toFixed(1)}` : "—"}</td>
                <td>{R.era.ratios[yr]?.R_over_B ? `×${R.era.ratios[yr].R_over_B.toFixed(1)}` : "—"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <div class="interp">
          <p class="interp-t">{L.interpT}</p>
          <p>{@html L.eraNote(R.era)}</p>
        </div>
      </section>
    {/if}

    <section class="card">
      <h3>{L.conclT}</h3>
      <div class="concl">{@html L.concl(R, hasR, data.meta.label !== "full")}</div>
    </section>

    <section class="card">
      <h3>{L.limitT}</h3>
      <ul class="limits">
        {#each L.limits as item}<li>{@html item}</li>{/each}
      </ul>
      <p class="muted foot">{@html L.foot}</p>
    </section>

    <section class="card">
      <h3>{L.defT}</h3>
      <table class="def-table">
        <thead><tr><th>{L.defCohort}</th><th>{L.defInc}</th><th>{L.defExc}</th></tr></thead>
        <tbody>
          {#each L.defRows as row}
            <tr>
              <td><span class="dot {DOT[row.c]}"></span>{cohortName(row.c)}</td>
              <td>{@html row.inc}</td>
              <td>{@html row.exc}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="cap def-common">{@html L.defCommon}</p>
    </section>

    <section class="card about">
      <h3>{L.aboutT}</h3>
      <p class="about-p">{@html L.aboutBody}</p>
      <p class="about-links">
        <a href="https://store.steampowered.com/app/2888960/Graytail/" target="_blank"
           rel="noopener">{L.aboutSteam}</a>
        <a href="https://github.com/mjshin82/marketing" target="_blank"
           rel="noopener">{L.aboutRepo}</a>
      </p>
    </section>
  </main>
{/if}

<style>
  .wrap { max-width: 880px; margin: 0 auto; padding: 40px 20px 80px; }
  header h1 { font-size: 1.7rem; margin: 4px 0 12px; }
  .kicker-row { display: flex; align-items: baseline; justify-content: space-between;
                gap: 12px; flex-wrap: wrap; }
  .kicker { color: var(--text-muted); font-size: 0.82rem; letter-spacing: 0.04em;
            text-transform: uppercase; margin: 0; }
  .langs { display: flex; gap: 4px; }
  .langs button { background: none; border: 1px solid var(--border); border-radius: 6px;
                  color: var(--text-secondary); font-size: 0.75rem; padding: 2px 8px;
                  cursor: pointer; font-family: inherit; }
  .langs button.active { color: var(--text-primary); border-color: var(--text-muted);
                         font-weight: 650; }
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
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px;
         margin-right: 6px; vertical-align: baseline; }
  .dot.da { background: var(--series-a); }
  .dot.db { background: var(--series-b); }
  .dot.dr { background: var(--series-r); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }
  .def-table th, .def-table td { text-align: left; font-variant-numeric: normal; }
  .def-table td { color: var(--text-secondary); font-size: 0.86rem; }
  .def-table :global(code) { background: var(--page); border: 1px solid var(--grid);
    border-radius: 4px; padding: 1px 5px; font-size: 0.8rem; color: var(--text-primary); }
  .def-common { margin-top: 10px; }
  .concl { color: var(--text-secondary); font-size: 0.9rem; }
  .concl :global(p) { margin: 0 0 8px; }
  .concl :global(ul) { margin: 0; padding-left: 18px; }
  .concl :global(li) { margin-bottom: 8px; }
  .limits { color: var(--text-secondary); font-size: 0.9rem; padding-left: 18px; }
  .limits li { margin-bottom: 6px; }
  .muted { color: var(--text-muted); }
  .foot { font-size: 0.78rem; margin: 12px 0 0; }
  .foot :global(a), .about-p :global(b) { color: inherit; }
  .insight-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 14px; margin-top: 14px; }
  .insight { border: 1px solid var(--grid); border-radius: 8px; padding: 12px 14px; }
  .insight-t { margin: 0 0 6px; font-weight: 650; font-size: 0.92rem; }
  .insight :global(ul) { margin: 0; padding-left: 16px; color: var(--text-secondary);
                         font-size: 0.85rem; }
  .insight :global(li) { margin-bottom: 6px; }
  .insight :global(li:last-child) { margin-bottom: 0; }
  .about-p { color: var(--text-secondary); font-size: 0.92rem; margin: 0 0 10px; }
  .about-p :global(a) { color: inherit; text-decoration: underline; }
  .about-p :global(code) { background: var(--page); border: 1px solid var(--grid);
    border-radius: 4px; padding: 1px 5px; font-size: 0.8rem; color: var(--text-primary); }
  .about-links { display: flex; gap: 18px; flex-wrap: wrap; margin: 0; font-size: 0.9rem; }
  .about-links a { color: var(--series-b); text-decoration: none; font-weight: 600; }
  .about-links a:hover { text-decoration: underline; }
</style>
