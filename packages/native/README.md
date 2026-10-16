# `@bklitui/native`

A React Native renderer for Bklit chart patterns, with an Expo example in [apps/native](../../apps/native). It uses `react-native-svg`, Reanimated and Gesture Handler. The native package does not import the browser renderer or require Skia.

This is a **private workspace package**, consumed directly from TypeScript source. It is not a published npm release. Run the example from this repository; see [the Expo README](../../apps/native/README.md) for commands.

## Familiar composition

```tsx
import {
  ChartThemeProvider, LineChart, Area, Line,
  Grid, XAxis, YAxis, ChartTooltip, ChartLegend,
} from "@bklitui/native";

const revenue = [
  { date: "2026-10-01", actual: 42, forecast: 45 },
  { date: "2026-10-02", actual: 58, forecast: 52 },
  { date: "2026-10-03", actual: 51, forecast: 57 },
];

export function RevenueChart() {
  return (
    <ChartThemeProvider theme={{ seriesColors: ["#6549e8", "#df9256"] }}>
      <LineChart data={revenue} xDataKey="date" xScale="time" height={240}>
        <Grid horizontal />
        <Area dataKey="actual" fill="#6549e8" fillOpacity={0.12} />
        <Line dataKey="actual" stroke="#6549e8" strokeWidth={2.5} />
        <Line dataKey="forecast" label="Forecast" stroke="#df9256" />
        <XAxis numTicks={3} />
        <YAxis numTicks={4} formatLargeNumbers />
        <ChartTooltip />
        <ChartLegend />
      </LineChart>
    </ChartThemeProvider>
  );
}
```

Time, numeric and category axes share a Cartesian model across series. Missing/non-finite values create gaps. Selection uses touch and accessibility actions. Components accept React Native `style` objects; SVG layers use native SVG props.

## Styling

`ChartThemeProvider` follows the system light/dark appearance. Set `colorScheme` to override it, or supply partial `theme` tokens: `color`, `seriesColors`, `scaleColors`, `gridColor`, `surfaceColor`, `textColor`, and `trackColor`. Explicit layer colors take precedence over the palette. `seriesColors` distinguishes categories; `scaleColors` is a five-color tuple for increasing intensity in heatmaps and numeric choropleths.

Use native color strings such as hex and `rgb()`. CSS variables, DOM styles, CSS classes and browser color functions do not transfer directly. A browser integration must resolve CSS theme values before sending a portable spec to the native renderer.

## Catalog and API boundaries

The target catalog matches the 17 web chart families. See the source contracts and family notes for the implemented native behavior:

- [Cartesian composition](src/cartesian-chart.tsx) and [Cartesian model](src/cartesian-model.ts).
- [Radial charts](src/README-radial.md): pie, multi-ring, gauge and radar.
- [Layout charts](src/README-layouts.md): heatmap, funnel, Sankey, sunburst and choropleth.

The public names and data-key composition follow Bklit web where practical. This is not an assertion that every web prop has identical behavior. Touch replaces hover; React Native content replaces DOM nodes; native motion replaces browser Motion objects. Family READMEs describe remaining effect and animation differences.

The [coverage guide](PARITY.md) maps all 17 reference families and the documented utilities to their native components, including composable legends, event markers, custom tooltips, brush zoom and formatted metric stacks.

`RingChart` is the web-like multi-ring API (`data` plus `Ring` children), with angles in **radians**. The original prototype single progress gauge is available as `ProgressRing`, with angles in **degrees**. The original `LineChart` single-series `dataKey` / `xKey` props remain supported through a compatibility adapter.

## Portable Studio state

[`@bklitui/chart-spec`](../chart-spec/src/index.ts) holds JSON chart configuration independently of React and either renderer. Dates serialize as ISO strings. Native chart adapters revive dates where a family requires `Date` objects. Configuration contains data, layers, chart options, motion and literal theme tokens; callbacks and arbitrary JSX are application code, not serializable Studio state.

## Verification

The [architecture and performance audit](AUDIT.md) records measured workloads, remaining API mismatches and release gates. Dense interactive SVG charts are not yet performance-certified; family coverage is not prop-by-prop parity.

From the repository root:

```sh
pnpm --filter @bklitui/native check-types
pnpm --filter @bklitui/native test
pnpm native-demo:check-types
pnpm native-demo:build
```

Pure geometry/spec tests complement simulator review. A browser export or an Expo Go run does not establish Android device behavior or release-build frame rates.
