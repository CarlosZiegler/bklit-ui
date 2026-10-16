# Web reference and native coverage

The reference catalog is `packages/studio/src/chart-slugs.ts`. The native catalog test compares against that file, round-trips every default configuration, and compiles generated examples against the native public API.

## Chart families

The Expo Charts screen and mobile Studio include all 17 reference families:

| Family | Native implementation |
| --- | --- |
| Area, line, composed, profit/loss | Shared Cartesian scales with native SVG layers |
| Bar | Grouped/stacked, horizontal/vertical columns |
| Scatter | Time, numeric and category point series |
| Candlestick | OHLC bodies and wicks |
| Live line | Rolling time window, incoming values and pause |
| Pie, ring | Composable slices/rings and center content |
| Gauge | Arc/linear ticks and value |
| Radar | Metrics, axes, labels and multiple areas |
| Heatmap | Calendar bins and sequential intensity colors |
| Funnel | Sequential conversion stages |
| Sankey | D3 node and flow layout |
| Sunburst | Hierarchy, drilldown, center and breadcrumbs |
| Choropleth | Offline geographic data, projection, numeric colors and gestures |

## Documented utilities

The reference pages are `apps/web/content/docs/utility/`.

| Web resource | Native composition |
| --- | --- |
| Legend | `Legend`, `LegendItemComponent`, `LegendMarker`, `LegendLabel`, `LegendValue`, `LegendProgress`, context hooks |
| Grid | `Grid` on shared plot coordinates |
| Background | Native SVG pattern presets |
| Reference area | `ReferenceArea`, bounds and overflow handling |
| Projection line | `ProjectionLine`, endpoint marker and pure forecast builders |
| Markers | Date grouping, count badges, tap expansion, marker details and callbacks |
| Tooltip | `ChartTooltip`, native content/header/box/dot/date components and custom React Native content |
| Brush | `ChartBrushLayout`, controlled main-chart domain, resize handles and window pan |
| Axis | Time/numeric/category X axis and Y labels |
| useChart | Native data, geometry, theme, selection and tooltip context |
| Custom indicator | Native SVG layer composition with `useChart` and `TooltipIndicator` |

`ChartStatFlow` supplies the formatted value/label stack used by the two mobile stat-card blocks. Their source references are `apps/web/blocks/stat-card-area-01` and `stat-card-line-01`; the map block is excluded.

## Platform contracts

Touch selection replaces browser hover. Marker groups expand on tap and choose an arc that fits the native viewport. Native styles use `style`, `valueStyle` and `labelStyle`; colors are literal values resolved before rendering. SVG curve factories can be passed to `Line` and `Area`, including the Cardinal and Basis curves used by the web stat cards.

Portable Studio JSON holds data, layers, chart settings, motion and literal theme tokens. Callbacks, SVG React elements and custom tooltip content remain application code. The example app exposes family controls, editable data/spec JSON, layer selection/visibility/style, replay and native code generation.

This source package currently uses one shared Y scale. Browser CSS variables, DOM nodes, portals, CSS filters, perspective/glass bar effects, browser Motion objects and NumberFlow's browser digit animation require native adaptations. `ChartStatFlow` uses a reduced-motion-aware native value transition. Brush interaction is horizontal. See the family READMEs for individual effect and animation differences, and the verification notes in `artifacts/bklit-native` for tested platforms and remaining checks.
