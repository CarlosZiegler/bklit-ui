# Native chart utilities

These components mirror the public web utilities in `packages/ui/src/charts/` and render with `react-native-svg` inside a native `CartesianChart`. Their data coordinates, SVG geometry, pattern presets, and literal theme colors follow the web source; only touch and accessibility surfaces adapt to React Native.

## Supported exports

- `Background` draws the plot-area pattern presets `none`, `diagonal`, `horizontal`, `vertical`, `cross`, `dots`, `circles`, and `accent`. It supports the web options `color`, `scale`, `strokeWidth`, `radius`, `complement`, `fill`, `dotFill`, `tileBackground`, `showFill`, `opacity`, `fadeHorizontal`, `fadeVertical`, and the two fade lengths. Edge masks use native SVG masks and gradients.
- `ReferenceArea` maps `x1`, `x2`, `y1`, and `y2` through the active Cartesian model. It supports solid or patterned fill (the default is the web's muted foreground at 12% opacity), pattern options, dashed or solid top/bottom edges, edge fading, bracket markers, and `hidden` / `visible` / `discard` overflow behavior.
- `ProjectionLine` accepts explicit `{ date: Date, value: number }` points, solid or path-aligned gradient stroke, dash/opacity/width, linear or horizontal-tangent Bézier paths, and a `d3-shape` curve factory. `ProjectionLineEndMarker` renders the separate horizon dot, matching the web layer API.
- `TooltipIndicator` supports web width presets, span/column width, fade modes, dashed strokes, and position springs. Spring motion follows the system reduced-motion setting. The native package does not have the web `ChartConfigProvider` tooltip spring override.
- `ChartBrush` is a declarative layer marker. The chart integration renders `ChartBrushOverlay` above its plot as an accessible, horizontal touch selection surface. Dragging creates/replaces the range; the two visible handle pills are not independently draggable. It supports controlled/initial selection, change callbacks, selection-box fill/stroke, selected-area pattern, and outer-edge fade. Time scales emit `Date` bounds; numeric and category scales emit numeric domain values.
- `useChart` and `NativeChartContextValue` are provided by the shared native Cartesian context and re-exported by the package root.

## Deliberate platform gaps

The native Cartesian model currently has one y scale. `ReferenceArea.yAxisId` and projection `yAxisId` are retained for web-shaped props, but do not select a second axis. `ReferenceArea.axisLabelColor`, web-only `className`, and the web reference-area registration that tints axis labels are not supported. The brush is horizontal because the shared selection context stores an x-domain range only; its `selectedBoxStyle` is a native fill/stroke subset. Web `blurPx` backdrop filtering and `useWindowMoveEvents` have no native equivalent: outside panes use a subtle surface tint with optional edge fades, and touch movement stays local to the chart. The indicator has no `springConfig` override because native charts have no matching chart-config provider.

The brush capture surface owns touches while a `ChartBrush` layer is present, so point-selection gestures beneath it are not active at the same time. Keep the brush as the final interaction layer in a composed chart. The layer parser in the Cartesian integration places `Background` below data, `ReferenceArea` before series, projections and indicators after series, and the brush overlay last.
