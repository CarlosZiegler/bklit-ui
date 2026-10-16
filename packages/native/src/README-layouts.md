# Native layout charts

`layouts/index.ts` exports five React Native chart families for the Expo app. They render with `react-native-svg`, use `useChartTheme()` literal colors, and use Reanimated timing that stops when the system requests reduced motion. Touch replaces mouse hover. Pass real component props and GeoJSON; browser-only chart code is not part of this entry.

```tsx
import { FunnelChart, HeatmapChart, SankeyChart, SunburstChart, ChoroplethChart } from "@bklitui/native/layouts";
import { sampleFunnelData, sampleHeatmapData, sampleSankeyData, sampleSunburstData, sampleChoroplethData } from "@bklitui/native/layouts/samples";

<HeatmapChart data={sampleHeatmapData} />
<FunnelChart data={sampleFunnelData} />
<SankeyChart data={sampleSankeyData} />
<SunburstChart data={sampleSunburstData} />
<ChoroplethChart data={sampleChoroplethData} />
```

`samples.ts` is intentionally separate from the chart barrel so importing a chart does not bundle the example world geometry. The samples are also indexed by slug in `nativeLayoutSampleData`. Mobile editor metadata is exported as `nativeLayoutControls`, keyed by `heatmap-chart`, `funnel-chart`, `sankey-chart`, `sunburst-chart`, and `choropleth-chart`. Each descriptor names the actual component `prop`; `defaultValue: null` means leave the prop unset to inherit its component default. `valueTransform: "auto-number"` maps the choropleth's `"auto"` choice to an unset scale and numeric choices to numbers. `"coordinate-pair"` maps the center strings to `[longitude, latitude]`. Heatmap weekday options are numbers already.

## Families

| Component | Data contract | Main native behavior |
| --- | --- | --- |
| `HeatmapChart` | `HeatmapColumn[]`; each column has `bin` and `bins: { bin, count, date: Date }[]` | Weekday rotation, inclusive date-window filtering, variable cell sizing, the shared five-step theme scale, tap-to-select tooltip, axes and legend. `layout="fluid"` derives height from cells; `"fill"` respects `height` as a minimum. |
| `FunnelChart` | `FunnelStage[]`; each stage has `label`, `value`, and optional `displayValue`, `color`, or gradient stops | Horizontal or vertical tapered stages, curved or straight edges, layered depth, gradient fill, percentage/value/label layouts, grid bands and lines, tap selection and callbacks. This chart is a single component and has no layer children. |
| `SankeyChart` | `SankeyData` with `nodes: { name, ... }[]` and `links: { source: number, target: number, value: number, ... }[]` | d3-sankey node placement and link geometry, source node colors, touchable nodes/links, selected value tooltip, optional controlled node highlight. Link indexes refer to the original node array. |
| `SunburstChart` | `SunburstNode` with `name`, optional `value`, `color`/`fill`, and recursive `children` | d3-hierarchy partition layout, tap-to-drill, center-to-parent and breadcrumb navigation, label/hint layers, selected-path emphasis and touch expansion. IDs are slash-delimited name paths, for example `Revenue / Enterprise`. |
| `ChoroplethChart` | GeoJSON `FeatureCollection` with geographic coordinates and optional feature properties | d3-geo Mercator projection and SVG paths, optional graticule, region color callback, touch selection and tooltip, pinch zoom/pan. The default projection fits the supplied geometry inside the measured view; explicit `scale`/`translate` override auto fit. |

The chart props intentionally retain the web component names where the behavior carries over. `HeatmapChart` supports `xDomain`, `sizingColumnCount`, `layout`, `margin`, `binSize`, `gap`, `colorScale`, `levelColors`, `status`, `loadingLabel`, `animationKey`, `weekStartDay`, `columnSeparators`, `height`, and `onSelectBin`. `columnSeparators={{ every, spacing }}` inserts native gaps between column groups and keeps the month-axis labels aligned. Heatmap axes expose `tickFilter`, `labelFormat`, `fontSize`, and `color`; cells expose `cornerRadius`, `interactive`, `colorScale`, and `selectedStroke`; tooltip and legend expose formatting, labels, size, gap, and color props.

`FunnelChart` supports `orientation`, `color`, `layers`, the `show*` label toggles, `hoveredIndex`, `onHoverChange`, `onSelectStage`, `formatPercentage`, `formatValue`, `gap`, `edges`, `labelLayout`, `labelOrientation`, `labelAlign`, `grid`, `aspectRatio`, and `animationKey`. Its `grid` object retains `bands`, `bandColor`, `lines`, `lineColor`, `lineOpacity`, and `lineWidth`. `SankeyChart` supports `margin`, `revealSignature`, `aspectRatio`, `nodeWidth`, `nodePadding`, `hoveredNodeIndex`, `onNodeHoverChange`, `onNodeSelect`, and `onLinkSelect`; its `SankeyNode` layer exposes node color, labels, value formatting, and label orientation, while `SankeyLink` and `SankeyTooltip` expose stroke/opacity and tooltip formatting.

`SunburstChart` supports `size`, `playKey`, controlled `focusId` / `onFocusChange`, controlled `hoveredIndex` / `onHoverChange`, `hoverPop`, `padding`, and animation props. Its `SunburstSegment`, `SunburstLabels`, `SunburstCenter`, `SunburstBreadcrumb`, and `SunburstHint` layers accept native styles and their documented text/color/formatting props. `ChoroplethChart` supports `margin`, `revealSignature`, `aspectRatio`, `scale`, `center`, `translate`, `zoomEnabled`, `zoomMin`, `zoomMax`, `initialZoom`, controlled `selectedFeatureIndex`, and `onFeatureSelect`; `ChoroplethFeature` accepts `fill`, `stroke`, `strokeWidth`, `fadedOpacity`, `getFeatureColor`, and `valueDataKey`. With `valueDataKey`, finite numeric properties are binned over the feature collection’s min/max into the five theme scale colors; missing or nonnumeric values use the neutral surface color. Graticule and tooltip props control their native SVG marks.

Heatmap layer exports are `HeatmapCells`, `HeatmapXAxis`, `HeatmapYAxis`, `HeatmapTooltip`, and `HeatmapLegend`. Sankey layers are `SankeyLink`, `SankeyNode`, and `SankeyTooltip`. Sunburst layers are `SunburstSegment`, `SunburstLabels`, `SunburstCenter`, `SunburstBreadcrumb`, and `SunburstHint`. Choropleth layers are `ChoroplethFeature`, `ChoroplethGraticule`, and `ChoroplethTooltip`. Each compositional chart supplies its default layers when `children` is omitted; passing children replaces those defaults. Keep SVG layers inside their corresponding chart. Heatmap places `HeatmapLegend` in a native row below the SVG grid; Sunburst renders Breadcrumb and Hint as React Native views outside the SVG.

All layout charts expose `animate` and `animationDuration`, with family defaults of 480 ms (heatmap), 440 ms (funnel), 1100 ms (Sankey), 650 ms (sunburst), and 800 ms (choropleth). Charts use accessible summaries; data marks expose labels and native press handlers. Funnel, Sankey, Sunburst, and Choropleth also emit their family selection callbacks. Heatmap emits `onSelectBin`. Controlled indices/focus props are documented on the component prop types.

## Port boundaries

Native `style` props use React Native style objects. Color props and callbacks must return valid React Native / SVG color strings; CSS variables, CSS classes and DOM style objects are not resolved. Funnel gradients are native SVG gradients. Funnel `renderPattern`, web `enterTransition` and per-stage `staggerDelay` are omitted. Heatmap supports simple `{ every, spacing }` column separators; the web fiscal/quarter separator definitions, pattern layers, per-cell reveal choreography, and skeleton generator are not included. `status="loading"` and `status="error"` show accessible text over the chart rather than a web skeleton.

Sankey, Sunburst, and Choropleth use one Reanimated opacity reveal rather than the web's motion-driven enter choreography. Sunburst retains touch-based selected-path expansion and drilldown but does not morph old/new partitions. Mouse hover is unavailable on all families. Choropleth supports the native Mercator projection and pinch/pan; region pattern fills and web transition objects are omitted. These omissions are deliberate, so the mobile editor does not present unsupported browser effects as working native controls.

The offline choropleth example converts `world-atlas@2.0.2/countries-110m.json` to GeoJSON with `topojson-client`. The package describes the boundaries as Natural Earth Admin 0 country data, 1:110m scale. The `world-atlas` redistribution code is ISC-licensed; the underlying Natural Earth data is public domain. The chart accepts user-provided GeoJSON and does not fetch map data.
