<script lang="ts">
  import * as echarts from "echarts";
  let { option, height = 320 }: { option: echarts.EChartsOption; height?: number } = $props();
  let el: HTMLDivElement;
  let chart = $state<echarts.ECharts | undefined>(undefined);

  $effect(() => {
    const c = echarts.init(el);
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el);
    chart = c;
    return () => { ro.disconnect(); c.dispose(); chart = undefined; };
  });
  $effect(() => { if (chart) chart.setOption(option, true); });
</script>

<div bind:this={el} style="width:100%;height:{height}px"></div>
