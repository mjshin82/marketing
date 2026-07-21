# marketing

A collection of experiment tools for marketing insight. These projects collect and
analyze game-market data directly, so marketing decisions can be grounded in data
rather than conventional wisdom.

## Projects

### insight1 — Co-op vs Single-player: testing the winner-take-all structure

Word of mouth for online co-op games works through a coordination structure — a
friend group has to converge at the same time — so their success distribution
should be more extreme and winner-take-all than that of single-player narrative
games. insight1 tests this hypothesis on Steam review data (~80k games) along
three lines: power-law tail exponent, the missing middle, and concentration
(Gini coefficient, top-share).

- **Live report**: https://marketing-insight-1.mjshin82.workers.dev/
- Collection pipeline: `insight1/collect/` (SteamSpy + official Steam API, resumable checkpointing)
- Analysis: `insight1/analysis/` (powerlaw, dip test, bootstrap)
- Web report: `insight1/web/` (Svelte 5 + ECharts 6, deployed on Cloudflare Workers)

## Author

Developer at Concode, currently building **Graytail** on Steam.

- Graytail on Steam: https://store.steampowered.com/app/2888960/Graytail/
