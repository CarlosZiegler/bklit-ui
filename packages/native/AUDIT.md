# Native architecture and performance audit

Reviewed 2026-10-16 against the web renderer, Studio catalog, native public components, portable spec/code generation and Expo example.

## Verdict

**Technically viable for mobile dashboards with bounded data. Not yet a production-stable, fully web-equivalent public library.** Keep the current SVG/Reanimated architecture for the next iteration. The measurements do not justify rewriting every chart with Skia. Dense interactive plots need optimization and device profiling before choosing a different renderer.

The geometry/model separation, compositional chart layers, literal theme provider and renderer-independent chart spec are useful foundations. All 17 web families exist, but family presence and generated-example compilation do not establish prop-by-prop behavioral parity.

## Findings still open

### P1 — Dense interaction exceeds the UI scheduling budget

The production-JavaScript simulator run measured mean UI callback intervals of **36.50 ms** for two 1,000-point lines with synthetic selection, and **41.42 ms** for 300 scatter points. A 60 Hz frame has a 16.67 ms budget. The 10,000-point case did not produce enough UI callbacks to calculate a valid interval; its zero fields must not be interpreted as zero cost or certified FPS.

`src/cartesian-chart.tsx` still scans every point in `useChartSelection.updateCursor` on gesture updates and reconciles the chart tree when selection changes. `src/cartesian/scatter-chart.tsx` creates point/highlight nodes and animation hooks per point. There is no native equivalent of the web renderer's decimation path (`packages/ui/src/charts/chart-context.tsx` documents the decimated render data).

Next: share a pure point-reduction algorithm with the web renderer while retaining original data for inspection; avoid full-series reconciliation for cursor movement; use ordered-x lookup for sorted data with an unsorted fallback. Measure SVG paint/native commits separately before proposing Skia. The benchmark uses synthetic controlled selection, so it does not measure actual gesture latency.

### P1 — Some Studio props do not reach a matching public contract

`apps/native/lib/native-chart-preview.tsx` passes `animationDuration` to PieChart, but `src/radial/pie-chart.tsx` does not accept it and `pie-slice.tsx` uses a fixed 550 ms duration. The corresponding Studio duration control cannot have the promised effect on that family.

The standalone bar adapter passes `radius`, while `src/cartesian/bar-chart.tsx` accepts `lineCap`. BarProps also declares `stroke`, `yAxisId` and `perspective`, but its glyph rendering does not implement those effects. A single Y scale and missing perspective effects are documented adaptations; silently accepted props still make the interface misleading.

The generic `make(component: unknown, props: Record<string, unknown>)` adapter suppresses the type checking that would expose these mismatches. Generated examples compiling is useful but cannot validate the Studio adapter's behavior. Replace the unchecked family dispatch with typed adapters and explicitly hide, reject or implement unsupported controls. This audit does not claim to enumerate every unsupported prop.

### P1 — Published peer compatibility would be overstated

`package.json` currently allows React Native >=0.74, Reanimated >=4.0 and Worklets >=0.8 independently. Those combinations are not mutually compatible. Reanimated 4 requires New Architecture, and the upstream compatibility table associates each Reanimated minor with specific RN and Worklets versions.

Validated here: Expo 56, RN 0.85.3, React 19.2.3, Reanimated 4.3.1 and Worklets 0.8.3. Before publishing, choose and test the supported combinations and narrow the peer contract accordingly. The packages remain private; no npm support promise was added during this review.

### P2 — Remaining repeated work and lifecycle risks

`createCartesianModel` generates geometry for every requested data key, including duplicates from area/line layers sharing one field. Curved area/profit paths and broad selection contexts can cause additional work on selection. Pie arcs are cached, but every slice consumes the selection context and rebuilds its SVG arc path. These are code observations requiring targeted profiling before broad memoization or context refactors.

LiveLineChart has a bounded 800-point buffer, a 120 ms update interval and interval cleanup on pause/unmount. It does not itself observe navigation focus or AppState: consumers must pause retained, offscreen charts. Energy use and background behavior were not measured here.

### P1 release gate — Device certification is still missing

No custom release binary, physical-device GPU profile, Android execution, cold-start TTI or repeated-navigation heap/leak profile was collected. The commit validation initially exposed conflicting React/CSS declaration versions across workspaces. Aligning all direct `@types/react` dependencies to 19.2.18 resolved the conflict; the full monorepo production build now passes, including web, Studio docs and the nine-route Expo export. No type-check bypass was added. This review is a viability decision with explicit follow-up gates, not a production certification.

## Fixes applied during the audit

- Replaced `Math.min(...largeArray)` / `Math.max(...largeArray)` domain resolution with iteration. A 200,000-point input previously threw `RangeError`; it now completes. Added a regression test using a large x domain without allocating SVG paths.
- Kept the visible inspection points stable while geometry is unchanged, avoiding repeated gesture/worklet replacement on selection.
- Captured only the scalar path length in the path-animation worklet instead of the complete geometry containing points and SVG strings.
- Deduplicated the Studio color-picker choices after the runtime emitted duplicate-key warnings for repeated series colors.

The dense line test improved on the same development-mode protocol:

| Case | React commit p95 before → after | JS timer drift p95 before → after |
| --- | --- | --- |
| Two 1,000-point lines, selection every 32 ms | 5.70 → 4.71 ms | 2.61 → 1.67 ms |
| Two 10,000-point lines, selection every 32 ms | 25.66 → 6.72 ms | 109.18 → 1.71 ms |

These are single runs on a shared development host, not a statistically established speedup. React timings include phase mounting/warmup as well as interaction commits. Improvements in JavaScript do not eliminate the UI-thread bottleneck above.

## Measurements

### Pure geometry on Node

Apple M4 Pro / arm64 / Node 24.22.0. Five warmups and 40 samples for normal cases. Dataset preparation is outside timed sections; no React, native SVG or Hermes rendering is included.

| Workload | Median | p95 |
| --- | --- | --- |
| 100 points × 3 series | 0.27 ms | 0.49 ms |
| 1,000 points × 3 series | 1.89 ms | 2.47 ms |
| 10,000 points × 3 series | 19.36 ms | 23.64 ms |
| 100 bar categories × 3 series, rectangle calculation only | 0.05 ms | 0.06 ms |
| 140 heatmap cells, geometry only | 0.005 ms | 0.019 ms |

The 200,000-point end-to-end model stress case changed from a crash to roughly 220 ms. That demonstrates robustness, not suitability for interactive raw-data rendering.

### Production JavaScript in Expo Go

Original iPhone 16e / iOS 26.3 simulator, Expo Go, Metro `--no-dev --minify`. Each case has a 1.5 s warmup and a 5 s sampling window. Selection cases update controlled selection every 32 ms. UI timestamps are collected on Reanimated's UI runtime; JS drift is lateness of the 32 ms timer. Neither is a hardware presentation-frame or touch-latency measurement. This is **not a custom native release build**.

| Case | Mean UI callback interval | JS timer drift p95 |
| --- | --- | --- |
| Two 100-point lines, static | 16.72 ms | 1.51 ms |
| Two 100-point lines, selection (small suite) | 16.95 ms | 1.86 ms |
| 12 categories × 2 bars, selection (small suite) | 16.67 ms | 1.82 ms |
| 50 scatter points, selection (small suite) | 16.67 ms | 1.42 ms |
| Two 1,000-point lines, selection | 36.50 ms | 1.58 ms |
| Two 10,000-point lines, selection | Insufficient callbacks | 1.70 ms |
| 100 categories × 2 bars, selection | 16.67 ms | 14.50 ms |
| 300 scatter points, selection | 41.42 ms | 25.69 ms |
| 364-cell heatmap, static | 16.67 ms | 1.64 ms |
| Live line, initial 120 points | 16.67 ms | 1.48 ms |

The small suite was a separate run with the same warmup, sampling window and selection interval. Its results support continuing with SVG for bounded dashboard data, rather than treating the dense-case failures as evidence that the entire approach is unworkable. They do not establish a universal safe point limit.

The early development-run UI counters could include an interval carried between cases. Those UI totals are excluded from comparison; the production collector resets its timestamp per case. React Profiler is disabled in production: its zero-valued fields mean unavailable data, not zero render time.

### Bundle check

Tree-shaken esbuild estimates, with React and native peers external, including internal D3 dependencies:

| Import surface | Minified | gzip |
| --- | --- | --- |
| LineChart from the public entry | 55,034 bytes | 19,231 bytes |
| All public exports | 222,817 bytes | 76,161 bytes |

Neither retained world-atlas. The sample map is a separate entry. This is a useful dependency/tree-shaking check, not Metro/Hermes application size; the full Expo web demo bundle is about 3 MB and includes the app/runtime/all families.

## Reproduce

```sh
pnpm --filter @bklitui/native benchmark
pnpm --filter web exec node scripts/bench-native-bundle.mjs
pnpm --filter @bklitui/native test
pnpm --filter @bklitui/native check-types
pnpm native-demo:check-types
```

With the Expo example running, open `/performance` (or `/performance?suite=small` for 100-point line, 12-category bar and 50-point scatter selection) in Expo Router (for example `exp://127.0.0.1:8087/--/performance`). Results appear as selectable JSON and development logs prefixed with `[BKLIT_PERF]`. An Overview replay and touch-selection regression pass also succeeded after the hot-path changes (`artifacts/bklit-native/performance-regression.mov`). The route is a developer lab in the example app, not part of the library's public interface. Run it with the simulator idle and record the exact runtime/build mode. Use the production route's JSON, not screenshot appearance, for analysis.

Raw evidence is in `artifacts/bklit-native/performance-*.json`. The UI collector was corrected between the development and production runs, so only JS/React fields are compared between the development before/after files.

## Recommended order

1. Make Studio controls and native prop contracts agree, including supported dependency versions.
2. Optimize cursor isolation and dense rendering; add point reduction and profile allocation/paint.
3. Validate the target data sizes in a custom release app on a slower physical iPhone and Android device, including actual gestures, startup and memory growth.
4. Publish only after those gates pass; retain documented platform differences instead of claiming every browser effect is identical.

## Primary references

- [React Native performance overview](https://reactnative.dev/docs/performance): frame budgets and release-mode testing.
- [Reanimated performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/): thread crossings and animation cost.
- [Reanimated worklets](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/): large captured objects and thread behavior.
- [Reanimated compatibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/): New Architecture and compatible versions.
