# insight1 — Co-op vs Single-player: testing the winner-take-all structure

Tests the hypothesis that "the coordinated word-of-mouth of online co-op games
produces a more extreme winner-take-all distribution" using Steam indie game
review counts as a sales proxy.

**Live report**: https://marketing-insight-1.mjshin82.workers.dev/

## Structure

- `collect/pipeline.py` — collection pipeline (SQLite checkpointing, safe to interrupt/resume)
  - `master`: SteamSpy `request=all` paging (1 request per 60s)
  - `enrich`: 3 worker threads
    - SteamSpy `appdetails` (tags -> cohort candidate classification, ~1 req/s)
    - Official Steam `appdetails` (release date/type/categories, 1.6s interval + backoff on 429)
    - Steam `appreviews` (official review totals for fully qualified games)
  - `build`: applies final filters and writes `data/games.csv`
  - `status`: prints progress
  - `retry-errors`: resets errored rows to pending for retry
- `analysis/` — tail.py (power law), middle.py (missing middle), concentration.py
  (Gini/top shares), robustness.py, export_web.py, run_all.py (runs everything and
  regenerates REPORT.md + web data)
- `data/collect.sqlite` — collection checkpoint DB (not committed)
- `data/games.csv` — final dataset
- `web/` — single-page report (Svelte 5 + Vite + ECharts 6, deployed to Cloudflare
  Workers as `marketing-insight-1`)
- `REPORT.md` — results summary

## Design notes

- The SteamSpy bulk `request=tag` endpoint only returns `{}` as of 2026-07
  (effectively dead), so tags are fetched per game via `appdetails`.
- Games are processed in a deterministic pseudo-random order
  (`appid × 2654435761 mod 2^32`, Knuth multiplicative hash), so whatever has been
  processed at any point is always a uniform random sample of the pool — partial
  data supports unbiased interim analysis.
- Review counts prefer the official Steam `appreviews` endpoint, falling back to
  SteamSpy positive+negative (see the `review_source` column).
- Cohort A: tags ("Online Co-Op" ∨ "Co-op") ∧ "Multiplayer" ∧ ¬"Singleplayer" —
  pure multiplayer co-op; co-op-optional single-player games (Stardew-likes) excluded
- Cohort B: "Singleplayer" ∧ "Story Rich" ∧ ¬(any co-op/multiplayer tag)
- Cohort R: any roguelike tag ∧ ¬(any co-op/multiplayer tag)
- Cohort N (alt-definition only): "Singleplayer" ∧ ("Adventure" ∨ "Puzzle") without
  "Story Rich" — kept to test sensitivity to the broad narrative definition
- Cohorts are disjoint; classification priority A > R > B > N
- Common filters: paid, initial price < $40, type=game, released 2022-01-01 to
  2025-12-31, major publishers excluded. Games with <10 reviews stay in the CSV
  but are used only for the early-death-rate comparison.
- Excluded publishers (case-insensitive substring match on the publisher name;
  the < $40 price filter is the primary AAA defense, this list is the backstop):
  Electronic Arts, Ubisoft, Activision, Bethesda, 2K / 2K Games, Square Enix,
  Capcom, Bandai Namco, SEGA, Warner Bros, Xbox Game Studios, Sony Interactive,
  Rockstar, Take-Two, CD Projekt Red, Blizzard. Mid-size publishers (Devolver,
  Team17, Paradox, …) are intentionally NOT excluded — the comparison covers the
  indie-to-mid-size market, not self-published games only.

## Usage

```bash
.venv/bin/python collect/pipeline.py master            # full master list
.venv/bin/python collect/pipeline.py enrich            # full enrichment (hours to ~a day)
.venv/bin/python collect/pipeline.py build
.venv/bin/python analysis/run_all.py                   # analyses + REPORT.md + web data
```

Pilot mode: `enrich --target-per-cohort 200`

Web report:

```bash
cd web && npm install && npm run dev                   # local
npm run build && npx wrangler deploy                   # deploy
```
