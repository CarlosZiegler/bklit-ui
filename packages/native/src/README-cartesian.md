# Native Cartesian charts

The native Cartesian family lives under `src/cartesian/` and uses React Native
SVG, the shared `createCartesianModel` coordinate system, the active chart
theme, accessible native containers, and touch selection. Composable children
remain identity markers, matching the web component tree.

```tsx
import {
  Bar,
  BarChart,
  BarXAxis,
  BarYAxis,
} from "@bklitui/native/cartesian";

<BarChart data={data} xDataKey="month" orientation="vertical">
  <Bar dataKey="revenue" fill="#397db5" />
  <Bar dataKey="target" fill="#e5985d" />
  <BarXAxis />
  <BarYAxis />
</BarChart>;
```

`ComposedChart` shares the existing `Line`, `Area`, `Grid`, axes, and tooltip
markers from the native Cartesian renderer. It also accepts `SeriesBar` and
`ProfitLossLine`. `BarChart` supports grouped and stacked bars in vertical or
horizontal orientation. `ScatterChart` maps time, linear, or category x values
to one or more point series. `CandlestickChart` renders OHLC bodies and wicks.
`LiveLineChart` appends a smoothed value to a rolling time window and honors
`paused`, `lerpSpeed`, and reduced-motion settings.

`src/cartesian/samples.ts` exports `nativeCartesianCatalog`: JSON-like sample
records, default chart props, serializable layer descriptors, and control
descriptors for the six native chart entries. This file is separate from the
component entry point so importing the chart components does not bundle sample
data.

The native ports cover the data and interaction paths used by mobile Studio:
literal theme colors and SVG gradients, chart axes/labels, point/bar/candle
selection, accessible increment/decrement selection, and native text readouts.
Browser hover, CSS filters/blur, DOM transitions, CSS-variable fills, and
arbitrary SVG pattern definitions are not emulated. Candlestick body pattern
props render only when their values are valid native SVG fills. Web-only
perspective bar trim and browser lifecycle effects also remain unsupported.
