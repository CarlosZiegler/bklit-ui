import type {
  CartesianChartSpec,
  CartesianLayerSpec,
  ChartSpec,
  JsonValue,
  PortableChartTheme,
} from "./index";

const NATIVE_PACKAGE = "@bklitui/native";

interface GeneratedNode {
  tag: string | null;
  props?: Readonly<Record<string, unknown>>;
  children?: readonly GeneratedNode[];
}

interface GeneratedExpression {
  readonly expression: string;
}

interface CodegenContext {
  imports: Set<string>;
}

const node = (
  tag: string,
  props?: Readonly<Record<string, unknown>>,
  children?: readonly GeneratedNode[]
): GeneratedNode => ({ tag, props, children });

const fragment = (children: readonly GeneratedNode[]): GeneratedNode => ({
  tag: null,
  children,
});

const expression = (value: string): GeneratedExpression => ({
  expression: value,
});

function add(context: CodegenContext, ...names: string[]) {
  for (const name of names) {
    context.imports.add(name);
  }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pick(
  source: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      output[key] = value;
    }
  }
  return output;
}

function jsxValue(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "expression" in value &&
    typeof value.expression === "string"
  ) {
    return value.expression;
  }
  return JSON.stringify(value);
}

function renderNode(value: GeneratedNode, depth = 0): string {
  const indent = "  ".repeat(depth);
  if (value.tag === null) {
    if (!value.children?.length) {
      return `${indent}<></>`;
    }
    return `${indent}<>\n${value.children
      .map((child) => renderNode(child, depth + 1))
      .join("\n")}\n${indent}</>`;
  }
  const props = Object.entries(value.props ?? {})
    .filter(([, prop]) => prop !== undefined && prop !== null)
    .map(([key, prop]) => `${key}={${jsxValue(prop)}}`)
    .join(" ");
  const head = props ? `<${value.tag} ${props}` : `<${value.tag}`;
  if (!value.children) {
    return `${indent}${head} />`;
  }
  return `${indent}${head}>\n${value.children
    .map((child) => renderNode(child, depth + 1))
    .join("\n")}\n${indent}</${value.tag}>`;
}

function themeNode(
  context: CodegenContext,
  theme: PortableChartTheme,
  child: GeneratedNode
) {
  add(context, "ChartThemeProvider");
  return node("ChartThemeProvider", { theme }, [child]);
}

function visibleCartesianLayers(
  layers: readonly CartesianLayerSpec[]
): CartesianLayerSpec[] {
  return layers.filter((layer) => layer.visible);
}

function motionForLayer(
  spec: CartesianChartSpec,
  layer: CartesianLayerSpec
): boolean {
  return spec.motion.enabled && layer.animate !== false;
}

function cartesianLayerNodes(
  context: CodegenContext,
  spec: CartesianChartSpec,
  layers = visibleCartesianLayers(spec.layers)
): GeneratedNode[] {
  const nodes: GeneratedNode[] = [];
  for (const layer of layers) {
    const animate = motionForLayer(spec, layer);
    if (layer.type === "line") {
      add(context, "Line");
      nodes.push(
        node("Line", {
          dataKey: layer.dataKey,
          animate,
          label: layer.label,
          stroke: layer.stroke,
          strokeWidth: layer.strokeWidth,
        })
      );
    } else if (layer.type === "area") {
      add(context, "Area");
      nodes.push(
        node("Area", {
          dataKey: layer.dataKey,
          animate,
          fadeEdges: layer.fadeEdges ?? spec.options.fadeEdges,
          fill: layer.fill,
          fillOpacity: layer.fillOpacity,
          gradientSpan: layer.gradientSpan,
          gradientToOpacity: layer.gradientToOpacity,
          label: layer.label,
          stroke: layer.stroke,
          strokeWidth: layer.strokeWidth,
        })
      );
    } else if (layer.type === "series-bar") {
      add(context, "SeriesBar");
      nodes.push(
        node("SeriesBar", {
          animate,
          dataKey: layer.dataKey,
          fill: layer.fill,
          radius: layer.radius,
          stroke: layer.stroke,
        })
      );
    } else {
      add(context, "ProfitLossLine");
      nodes.push(
        node("ProfitLossLine", {
          dataKey: layer.dataKey,
          fadeEdges: layer.fadeEdges ?? spec.options.fadeEdges,
          negativeColor: layer.negativeColor,
          positiveColor: layer.positiveColor,
          strokeWidth: layer.strokeWidth,
        })
      );
    }
  }
  return nodes;
}

function cartesianDecorationNodes(
  context: CodegenContext,
  spec: CartesianChartSpec
): GeneratedNode[] {
  const options = spec.options;
  const nodes: GeneratedNode[] = [];
  add(context, "Grid", "ChartTooltip");
  nodes.push(node("Grid"), node("ChartTooltip"));
  if (options.xAxis?.enabled !== false) {
    add(context, "XAxis");
    nodes.push(
      node("XAxis", {
        numTicks: options.xAxis?.numTicks,
        tickMode: options.xAxis?.tickMode,
      })
    );
  }
  if (options.yAxis?.enabled !== false) {
    add(context, "YAxis");
    nodes.push(
      node("YAxis", {
        formatLargeNumbers: options.yAxis?.formatLargeNumbers,
        numTicks: options.yAxis?.numTicks,
      })
    );
  }
  return nodes;
}

function genericCartesian(
  context: CodegenContext,
  spec: CartesianChartSpec,
  chartName: string
): GeneratedNode {
  add(context, chartName);
  const children = [
    ...cartesianDecorationNodes(context, spec),
    ...cartesianLayerNodes(context, spec),
  ];
  return node(
    chartName,
    {
      data: expression("data"),
      ...pick(spec.options as unknown as Record<string, unknown>, [
        "accessibilityLabel",
        "margin",
        "status",
        "xDataKey",
        "xScale",
        "yDomain",
      ]),
      animationDuration: spec.motion.duration,
      height: spec.height,
    },
    children
  );
}

function barChart(
  context: CodegenContext,
  spec: CartesianChartSpec
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  add(context, "BarChart", "Bar", "BarXAxis", "BarYAxis");
  const bars = visibleCartesianLayers(spec.layers).map((layer) =>
    node("Bar", {
      animate: motionForLayer(spec, layer),
      dataKey: layer.dataKey,
      fill: layer.fill ?? layer.stroke,
      stroke: layer.stroke,
    })
  );
  bars.push(node("BarXAxis"), node("BarYAxis"));
  return node(
    "BarChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animationDuration: spec.motion.duration,
      barGap: options.barGap,
      barWidth: options.barSize,
      data: expression("data"),
      height: spec.height,
      margin: options.margin,
      maxBarSize: options.maxBarSize,
      orientation: options.orientation,
      stacked: options.stacked,
      stackGap: options.stackGap,
      xDataKey: options.xDataKey,
    },
    bars
  );
}

function scatterChart(
  context: CodegenContext,
  spec: CartesianChartSpec
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  const markers = visibleCartesianLayers(spec.layers).map((layer) => {
    add(context, "Scatter");
    return node("Scatter", {
      animate: motionForLayer(spec, layer),
      dataKey: layer.dataKey,
      fill: layer.fill,
      radius: layer.radius ?? options.radius,
      stroke: layer.stroke,
      strokeWidth: layer.strokeWidth ?? options.strokeWidth,
    });
  });
  const children = [...cartesianDecorationNodes(context, spec), ...markers];
  add(context, "ScatterChart");
  return node(
    "ScatterChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animationDuration: spec.motion.duration,
      data: expression("data"),
      height: spec.height,
      margin: options.margin,
      xDataKey: options.xDataKey,
      xScale: options.xScale,
    },
    children
  );
}

function candlestickChart(
  context: CodegenContext,
  spec: CartesianChartSpec
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  const visible =
    spec.layers.length === 0 || spec.layers.some((layer) => layer.visible);
  if (visible) {
    add(context, "Candlestick");
  }
  const children = [
    ...cartesianDecorationNodes(context, spec),
    ...(visible
      ? [
          node("Candlestick", {
            animate: spec.motion.enabled,
            negativeFill: spec.layers.find((layer) => layer.visible)
              ?.negativeColor,
            positiveFill: spec.layers.find((layer) => layer.visible)
              ?.positiveColor,
          }),
        ]
      : []),
  ];
  add(context, "CandlestickChart");
  return node(
    "CandlestickChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animationDuration: spec.motion.duration,
      candleGap: options.candleGap,
      candleWidth: options.candleWidth,
      data: expression("data"),
      height: spec.height,
      margin: options.margin,
      xDataKey: options.xDataKey,
    },
    children
  );
}

function liveLineChart(
  context: CodegenContext,
  spec: CartesianChartSpec
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  const visible = visibleCartesianLayers(spec.layers);
  const layer = visible[0];
  add(
    context,
    "LiveLineChart",
    "LiveLine",
    "LiveXAxis",
    "LiveYAxis",
    "Grid",
    "ChartTooltip"
  );
  const children: GeneratedNode[] = [
    node("Grid"),
    node("ChartTooltip"),
    node(
      "LiveXAxis",
      options.numXTicks === undefined
        ? undefined
        : { numTicks: options.numXTicks }
    ),
    node(
      "LiveYAxis",
      pick(record(options.yAxis), ["allowDecimals", "minGap", "position"])
    ),
    ...(layer
      ? [
          node("LiveLine", {
            dataKey: layer.dataKey,
            fill: options.fill,
            pulse: spec.motion.enabled && options.pulse !== false,
            stroke: layer.stroke ?? layer.fill,
            strokeWidth: layer.strokeWidth,
          }),
        ]
      : []),
  ];
  const lastValue = record(spec.data.at(-1))[
    layer?.dataKey ??
      (typeof options.dataKey === "string" ? options.dataKey : "value")
  ];
  const fallbackValue = typeof lastValue === "number" ? lastValue : 0;
  return node(
    "LiveLineChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      data: expression("data"),
      dataKey: layer?.dataKey ?? options.dataKey,
      height: spec.height,
      lerpSpeed: spec.motion.enabled ? (options.lerpSpeed ?? 0.08) : 1,
      margin: options.margin,
      nowOffsetUnits: options.nowOffsetUnits,
      numXTicks: options.numXTicks,
      paused: options.paused === true,
      value: typeof options.value === "number" ? options.value : fallbackValue,
      window: options.window,
      ...pick(options, ["exaggerate"]),
    },
    children
  );
}

function radialLayerIndexes(
  layers: readonly { type: string; index: number; visible: boolean }[],
  type: string,
  dataCount: number
): number[] {
  const visible = layers.filter(
    (layer) => layer.type === type && layer.visible
  );
  if (visible.length > 0) {
    return visible.map((layer) => layer.index);
  }
  if (layers.length === 0) {
    return Array.from({ length: dataCount }, (_, index) => index);
  }
  return [];
}

function pieChart(
  context: CodegenContext,
  spec: Extract<ChartSpec, { chart: "pie-chart" }>
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  add(context, "PieChart", "PieSlice", "PieCenter");
  const children = radialLayerIndexes(
    spec.layers,
    "pie-slice",
    spec.data.length
  ).map((index) => node("PieSlice", { animate: spec.motion.enabled, index }));
  if (typeof options.innerRadius === "number" && options.innerRadius > 0) {
    children.push(node("PieCenter"));
  }
  return node(
    "PieChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animationKey: options.animationKey,
      cornerRadius: options.cornerRadius,
      data: expression("data"),
      endAngle: options.endAngle,
      enterStaggerScale: spec.motion.enabled ? options.enterStaggerScale : 0,
      hoverOffset: options.hoverOffset,
      innerRadius: options.innerRadius,
      padAngle: options.padAngle,
      size: options.size ?? spec.height,
      startAngle: options.startAngle,
    },
    children
  );
}

function ringChart(
  context: CodegenContext,
  spec: Extract<ChartSpec, { chart: "ring-chart" }>
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  add(context, "RingChart", "Ring", "RingCenter");
  const children = radialLayerIndexes(
    spec.layers,
    "ring",
    spec.data.length
  ).map((index) => node("Ring", { animate: spec.motion.enabled, index }));
  children.push(node("RingCenter"));
  return node(
    "RingChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animationDuration: spec.motion.duration,
      baseInnerRadius: options.baseInnerRadius,
      data: expression("data"),
      endAngle: options.endAngle,
      enterStaggerScale: spec.motion.enabled ? options.enterStaggerScale : 0,
      ringGap: options.ringGap,
      size: options.size ?? spec.height,
      startAngle: options.startAngle,
      strokeWidth: options.strokeWidth,
    },
    children
  );
}

function radarChart(
  context: CodegenContext,
  spec: Extract<ChartSpec, { chart: "radar-chart" }>
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  add(
    context,
    "RadarChart",
    "RadarGrid",
    "RadarAxis",
    "RadarLabels",
    "RadarArea"
  );
  const indices = radialLayerIndexes(
    spec.layers,
    "radar-area",
    spec.data.length
  );
  return node(
    "RadarChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animate: spec.motion.enabled && options.animate !== false,
      data: expression("data"),
      enterDurationMs: spec.motion.duration,
      levels: options.levels,
      margin: options.margin,
      metrics: options.metrics,
      size: options.size ?? spec.height,
      staggerScale: options.staggerScale,
    },
    [
      node("RadarGrid"),
      node("RadarAxis"),
      node("RadarLabels"),
      ...indices.map((index) => node("RadarArea", { index })),
    ]
  );
}

function radialChart(
  context: CodegenContext,
  spec: Extract<
    ChartSpec,
    { chart: "pie-chart" | "ring-chart" | "radar-chart" }
  >
): GeneratedNode {
  if (spec.chart === "pie-chart") {
    return pieChart(context, spec);
  }
  if (spec.chart === "ring-chart") {
    return ringChart(context, spec);
  }
  return radarChart(context, spec);
}

function gaugeChart(
  context: CodegenContext,
  spec: Extract<ChartSpec, { chart: "gauge-chart" }>
): GeneratedNode {
  add(context, "Gauge");
  const options = spec.options as unknown as Record<string, unknown>;
  return node("Gauge", {
    ...pick(options, [
      "activeFill",
      "activeFillOpacity",
      "activeGradient",
      "centerValue",
      "defaultLabel",
      "endAngle",
      "formatOptions",
      "inactiveFill",
      "inactiveFillOpacity",
      "inactiveGradient",
      "labelAlign",
      "labelPlacement",
      "linearHeight",
      "minWidth",
      "notchCornerRadius",
      "notchLengthPercent",
      "notchWidthPercent",
      "orientation",
      "prefix",
      "spacing",
      "startAngle",
      "suffix",
      "totalNotches",
      "uniformWidth",
      "useGradient",
      "value",
      "width",
    ]),
    animate: spec.motion.enabled,
    animationDuration: spec.motion.duration,
    enterStaggerScale: spec.motion.enabled ? options.enterStaggerScale : 0,
    height: options.height ?? spec.height,
  });
}

function layoutChart(
  context: CodegenContext,
  spec: Extract<
    ChartSpec,
    {
      chart:
        | "heatmap-chart"
        | "funnel-chart"
        | "sankey-chart"
        | "sunburst-chart"
        | "choropleth-chart";
    }
  >
): GeneratedNode {
  const options = spec.options as unknown as Record<string, unknown>;
  if (spec.chart === "heatmap-chart") {
    add(
      context,
      "HeatmapChart",
      "HeatmapCells",
      "HeatmapXAxis",
      "HeatmapYAxis",
      "HeatmapTooltip",
      "HeatmapLegend"
    );
    const cellsVisible =
      spec.layers.length === 0 ||
      spec.layers.some((layer) => layer.type === "cells" && layer.visible);
    const children = cellsVisible
      ? [
          node("HeatmapCells"),
          node("HeatmapXAxis"),
          node("HeatmapYAxis"),
          node("HeatmapTooltip"),
          node("HeatmapLegend"),
        ]
      : [fragment([])];
    return node(
      "HeatmapChart",
      {
        animate: spec.motion.enabled,
        animationDuration: spec.motion.duration,
        binSize: options.binSize,
        data: expression("heatmapData"),
        gap: options.gap,
        height: spec.height,
        layout: options.layout,
        weekStartDay: options.weekStartDay,
      },
      children
    );
  }
  if (spec.chart === "funnel-chart") {
    add(context, "FunnelChart");
    const stagesVisible =
      spec.layers.length === 0 ||
      spec.layers.some((layer) => layer.type === "stage" && layer.visible);
    return node("FunnelChart", {
      accessibilityLabel: options.accessibilityLabel,
      animate: spec.motion.enabled,
      animationDuration: spec.motion.duration,
      aspectRatio: options.aspectRatio,
      color: options.color,
      data: expression(stagesVisible ? "data" : "[]"),
      edges: options.edges,
      gap: options.gap,
      grid: options.grid,
      labelAlign: options.labelAlign,
      labelLayout: options.labelLayout,
      labelOrientation: options.labelOrientation,
      layers: options.layers,
      orientation: options.orientation,
      showLabels: options.showLabels,
      showPercentage: options.showPercentage,
      showValues: options.showValues,
      style: { height: spec.height },
    });
  }
  if (spec.chart === "sankey-chart") {
    add(
      context,
      "SankeyChart",
      "SankeyLink",
      "SankeyNode",
      "SankeyTooltip",
      "type SankeyData"
    );
    const flowsVisible =
      spec.layers.length === 0 ||
      spec.layers.some((layer) => layer.type === "flow" && layer.visible);
    const children = [
      ...(flowsVisible ? [node("SankeyLink")] : []),
      node("SankeyNode"),
      node("SankeyTooltip"),
    ];
    return node(
      "SankeyChart",
      {
        accessibilityLabel: options.accessibilityLabel,
        animate: spec.motion.enabled,
        animationDuration: spec.motion.duration,
        aspectRatio: options.aspectRatio,
        data: expression("data"),
        nodePadding: options.nodePadding,
        nodeWidth: options.nodeWidth,
        style: { height: spec.height },
      },
      children
    );
  }
  if (spec.chart === "sunburst-chart") {
    add(
      context,
      "SunburstChart",
      "SunburstSegment",
      "SunburstLabels",
      "SunburstCenter",
      "SunburstBreadcrumb",
      "SunburstHint"
    );
    const segmentVisible =
      spec.layers.length === 0 ||
      spec.layers.some((layer) => layer.type === "segment" && layer.visible);
    return node(
      "SunburstChart",
      {
        animate: spec.motion.enabled,
        animationDuration: spec.motion.duration,
        data: expression("data"),
        hoverPop: options.hoverPop,
        padding: options.padding,
        playKey: 0,
        size: options.size ?? spec.height,
      },
      [
        ...(segmentVisible ? [node("SunburstSegment")] : []),
        node("SunburstLabels"),
        node("SunburstCenter"),
        node("SunburstBreadcrumb"),
        node("SunburstHint"),
      ]
    );
  }
  add(
    context,
    "ChoroplethChart",
    "ChoroplethFeature",
    "ChoroplethGraticule",
    "ChoroplethTooltip",
    "type ChoroplethGeoJson"
  );
  const featuresVisible =
    spec.layers.length === 0 ||
    spec.layers.some((layer) => layer.type === "feature" && layer.visible);
  return node(
    "ChoroplethChart",
    {
      accessibilityLabel: options.accessibilityLabel,
      animate: spec.motion.enabled,
      animationDuration: spec.motion.duration,
      center: options.center,
      data: expression("geoJson"),
      scale: options.scale,
      style: { height: spec.height },
      zoomEnabled: options.zoomEnabled,
    },
    [
      node("ChoroplethGraticule"),
      ...(featuresVisible
        ? [node("ChoroplethFeature", { valueDataKey: options.valueDataKey })]
        : []),
      node("ChoroplethTooltip"),
    ]
  );
}

function json(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}

function generatedSource(
  context: CodegenContext,
  theme: PortableChartTheme,
  chart: GeneratedNode,
  data: JsonValue,
  chartSlug: ChartSpec["chart"]
): string {
  add(context, "ChartThemeProvider");
  const imports = [...context.imports].sort((a, b) => a.localeCompare(b));
  const importText = imports.join(", ");
  const sourceLines: string[] = [];
  if (chartSlug === "choropleth-chart") {
    sourceLines.push(
      `const geoJson = ${json(data)} as unknown as ChoroplethGeoJson;`
    );
  } else if (chartSlug === "heatmap-chart") {
    sourceLines.push(
      `const serializedHeatmapData = ${json(data)};`,
      "const heatmapData = serializedHeatmapData.map((column) => ({",
      "  ...column,",
      "  bins: column.bins.map((bin) => ({ ...bin, date: new Date(String(bin.date)) })),",
      "}));"
    );
  } else if (chartSlug === "sankey-chart") {
    sourceLines.push(`const data: SankeyData = ${json(data)};`);
  } else if (chartSlug === "funnel-chart") {
    sourceLines.push(`const data = ${json(data)};`);
  } else if (chartSlug !== "gauge-chart") {
    sourceLines.push(`const data = ${json(data)};`);
  }
  const provider = renderNode(themeNode(context, theme, chart), 2);
  return [
    `import { ${importText} } from ${JSON.stringify(NATIVE_PACKAGE)};`,
    ...sourceLines,
    "",
    "export function GeneratedNativeChart() {",
    "  return (",
    provider,
    "  );",
    "}",
  ].join("\n");
}

/** Emits standalone compositional React Native JSX for a serialized chart spec. */
export function generateNativeCode(spec: ChartSpec): string {
  const context: CodegenContext = { imports: new Set() };
  let chart: GeneratedNode;

  if (spec.chart === "line-chart") {
    chart = genericCartesian(context, spec, "LineChart");
  } else if (spec.chart === "area-chart") {
    chart = genericCartesian(context, spec, "AreaChart");
  } else if (spec.chart === "bar-chart") {
    chart = barChart(context, spec);
  } else if (spec.chart === "composed-chart") {
    const children = [
      ...cartesianDecorationNodes(context, spec),
      ...cartesianLayerNodes(context, spec),
    ];
    chart = node(
      "ComposedChart",
      {
        accessibilityLabel: spec.options.accessibilityLabel,
        animationDuration: spec.motion.duration,
        barGap: spec.options.barGap,
        barSize: spec.options.barSize,
        data: expression("data"),
        height: spec.height,
        margin: spec.options.margin,
        maxBarSize: spec.options.maxBarSize,
        stacked: spec.options.stacked,
        stackGap: spec.options.stackGap,
        xDataKey: spec.options.xDataKey,
        xScale: spec.options.xScale,
      },
      children
    );
    add(context, "ComposedChart");
  } else if (spec.chart === "profit-loss-line") {
    const layer = visibleCartesianLayers(spec.layers).find(
      (item) => item.type === "profit-loss-line"
    );
    const children = [
      ...cartesianDecorationNodes(context, spec),
      ...(layer ? cartesianLayerNodes(context, spec, [layer]) : []),
    ];
    chart = node(
      "ComposedChart",
      {
        accessibilityLabel: spec.options.accessibilityLabel,
        animationDuration: spec.motion.duration,
        data: expression("data"),
        height: spec.height,
        margin: spec.options.margin,
        xDataKey: spec.options.xDataKey,
        xScale: spec.options.xScale,
      },
      children
    );
    add(context, "ComposedChart");
  } else if (spec.chart === "scatter-chart") {
    chart = scatterChart(context, spec);
  } else if (spec.chart === "candlestick-chart") {
    chart = candlestickChart(context, spec);
  } else if (spec.chart === "live-line-chart") {
    chart = liveLineChart(context, spec);
  } else if (
    spec.chart === "pie-chart" ||
    spec.chart === "ring-chart" ||
    spec.chart === "radar-chart"
  ) {
    chart = radialChart(context, spec);
  } else if (spec.chart === "gauge-chart") {
    chart = gaugeChart(context, spec);
  } else {
    chart = layoutChart(
      context,
      spec as Extract<
        ChartSpec,
        {
          chart:
            | "heatmap-chart"
            | "funnel-chart"
            | "sankey-chart"
            | "sunburst-chart"
            | "choropleth-chart";
        }
      >
    );
  }

  // Keep the generated data expression separate so hostile keys/labels remain
  // JSON string literals instead of being interpolated into JSX syntax.
  return generatedSource(context, spec.theme, chart, spec.data, spec.chart);
}
