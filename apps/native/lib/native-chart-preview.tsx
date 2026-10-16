import type { ChartSpec, JsonValue } from "@bklitui/chart-spec";
import {
  Area,
  Bar,
  BarChart,
  BarXAxis,
  BarYAxis,
  Candlestick,
  CandlestickChart,
  CartesianChart,
  ChartLegend,
  type ChartScaleColors,
  ChartThemeProvider,
  ChartTooltip,
  ChoroplethChart,
  ChoroplethFeature,
  type ChoroplethGeoJson,
  ChoroplethGraticule,
  ChoroplethTooltip,
  ComposedChart,
  darkChartTheme,
  FunnelChart,
  Grid,
  HeatmapChart,
  type HeatmapColumn,
  Line,
  LiveLine,
  LiveLineChart,
  type LiveLinePoint,
  LiveXAxis,
  LiveYAxis,
  lightChartTheme,
  ProfitLossLine,
  SankeyChart,
  SankeyLink,
  SankeyNode,
  SankeyTooltip,
  Scatter,
  ScatterChart,
  SeriesBar,
  SunburstBreadcrumb,
  SunburstCenter,
  SunburstChart,
  SunburstHint,
  SunburstLabels,
  SunburstSegment,
  XAxis,
  YAxis,
} from "@bklitui/native";
import {
  HeatmapCells,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from "@bklitui/native/layouts";
import {
  Gauge,
  PieCenter,
  PieChart,
  PieSlice,
  RadarArea,
  RadarAxis,
  RadarChart,
  RadarGrid,
  RadarLabels,
  Ring,
  RingCenter,
  RingChart,
} from "@bklitui/native/radial";
import {
  type ComponentType,
  createElement,
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

type UnknownProps = Record<string, unknown>;
const make = (
  component: unknown,
  props: UnknownProps = {},
  children?: ReactNode
) => createElement(component as ComponentType<UnknownProps>, props, children);

function record(value: JsonValue): Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : {};
}

function paletteData(data: readonly unknown[], colors: readonly string[]) {
  return data.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }
    const item = row as Record<string, unknown>;
    if ("color" in item || "fill" in item) {
      const color = colors[index % colors.length];
      return {
        ...item,
        ...(color ? { color, fill: color } : {}),
      };
    }
    return item;
  });
}

function reviveHeatmap(data: JsonValue): HeatmapColumn[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((column) => {
    const value = record(column);
    const bins = Array.isArray(value.bins) ? value.bins : [];
    return {
      bin: Number(value.bin ?? 0),
      bins: bins.map((rawBin) => {
        const bin = record(rawBin);
        return {
          bin: Number(bin.bin ?? 0),
          count: Number(bin.count ?? 0),
          date: new Date(String(bin.date ?? "")),
        };
      }),
    };
  });
}

function LiveLinePreview({
  data,
  height,
  paused,
  pulse,
  lerpSpeed,
  value,
  windowSeconds,
}: {
  data: readonly LiveLinePoint[];
  height: number;
  paused: boolean;
  pulse: boolean;
  lerpSpeed: number;
  value: number;
  windowSeconds: number;
}) {
  const [liveValue, setLiveValue] = useState(value);

  useEffect(() => {
    setLiveValue(value);
  }, [value]);

  useEffect(() => {
    if (paused) {
      return undefined;
    }
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      const amplitude = Math.max(0.8, Math.abs(value) * 0.045);
      setLiveValue(value + Math.sin(tick * 1.15) * amplitude);
    }, 1500);
    return () => clearInterval(timer);
  }, [paused, value]);

  return make(
    LiveLineChart,
    {
      data,
      height,
      lerpSpeed,
      numXTicks: 4,
      paused,
      value: liveValue,
      window: windowSeconds,
    },
    createElement(
      Fragment,
      null,
      make(Grid, { horizontal: true }),
      make(LiveXAxis, { numTicks: 4 }),
      make(LiveYAxis, {}),
      make(LiveLine, {
        dataKey: "value",
        pulse,
        fill: true,
        badge: true,
      }),
      make(ChartTooltip, {})
    )
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter maps serializable layer variants to their actual native marker components and props.
function layerElement(
  layer: ChartSpec["layers"][number],
  index: number,
  animate = true,
  globalOptions: UnknownProps = {}
) {
  const key = `${layer.id}:${index}`;
  if (layer.type === "area") {
    return make(Area, {
      key,
      dataKey: "dataKey" in layer ? layer.dataKey : "revenue",
      fill: "fill" in layer ? layer.fill : undefined,
      fillOpacity:
        "fillOpacity" in layer ? layer.fillOpacity : globalOptions.fillOpacity,
      fadeEdges:
        "fadeEdges" in layer ? layer.fadeEdges : globalOptions.fadeEdges,
      gradientSpan:
        "gradientSpan" in layer
          ? layer.gradientSpan
          : globalOptions.gradientSpan,
      gradientToOpacity:
        "gradientToOpacity" in layer
          ? layer.gradientToOpacity
          : globalOptions.gradientToOpacity,
      label: "label" in layer ? layer.label : undefined,
      stroke: "stroke" in layer ? layer.stroke : undefined,
      strokeWidth:
        "strokeWidth" in layer ? layer.strokeWidth : globalOptions.strokeWidth,
      animate,
    });
  }
  if (layer.type === "line") {
    return make(Line, {
      key,
      dataKey: "dataKey" in layer ? layer.dataKey : "revenue",
      fadeEdges:
        "fadeEdges" in layer ? layer.fadeEdges : globalOptions.fadeEdges,
      label: "label" in layer ? layer.label : undefined,
      stroke: "stroke" in layer ? layer.stroke : undefined,
      strokeWidth:
        "strokeWidth" in layer ? layer.strokeWidth : globalOptions.strokeWidth,
      animate,
    });
  }
  if (layer.type === "series-bar") {
    return make(SeriesBar, {
      key,
      dataKey: "dataKey" in layer ? layer.dataKey : "revenue",
      fill: "fill" in layer ? layer.fill : undefined,
      stroke: "stroke" in layer ? layer.stroke : undefined,
      radius: "radius" in layer ? layer.radius : undefined,
      animate: "animate" in layer ? layer.animate : undefined,
    });
  }
  if (layer.type === "profit-loss-line") {
    return make(ProfitLossLine, {
      key,
      dataKey: "dataKey" in layer ? layer.dataKey : "profit",
      positiveColor: "positiveColor" in layer ? layer.positiveColor : undefined,
      negativeColor: "negativeColor" in layer ? layer.negativeColor : undefined,
      strokeWidth:
        "strokeWidth" in layer ? layer.strokeWidth : globalOptions.strokeWidth,
      fadeEdges:
        "fadeEdges" in layer ? layer.fadeEdges : globalOptions.fadeEdges,
    });
  }
  if (layer.type === "pie-slice") {
    return make(PieSlice, { key, index: layer.index, animate });
  }
  if (layer.type === "ring") {
    return make(Ring, { key, index: layer.index, animate });
  }
  if (layer.type === "radar-area") {
    return make(RadarArea, { key, index: layer.index });
  }
  if (layer.type === "cells") {
    return make(HeatmapCells, { key });
  }
  if (layer.type === "feature") {
    return make(ChoroplethFeature, {
      key,
      valueDataKey:
        typeof globalOptions.valueDataKey === "string"
          ? globalOptions.valueDataKey
          : undefined,
    });
  }
  if (layer.type === "stage") {
    return undefined;
  }
  if (layer.type === "flow") {
    return make(SankeyLink, { key });
  }
  return make(SunburstSegment, { key });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This discriminated family dispatch shares one theme, animation, and measured-frame context for all catalog previews.
function ChartRenderer({
  spec,
  selectedIndex,
  onSelectIndex,
  frameWidth,
  animationKey,
}: {
  spec: ChartSpec;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  frameWidth?: number;
  animationKey: string | number;
}) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const previewWidth = Math.min(Math.max(240, frameWidth ?? width - 48), 600);
  const options = spec.options as unknown as UnknownProps;
  const data = useMemo(
    () => (Array.isArray(spec.data) ? [...spec.data] : []),
    [spec.data]
  );
  const seriesColors =
    spec.theme.seriesColors ??
    (colorScheme === "dark"
      ? darkChartTheme.seriesColors
      : lightChartTheme.seriesColors);
  const scaleColors: ChartScaleColors =
    spec.theme.scaleColors ??
    (colorScheme === "dark"
      ? darkChartTheme.scaleColors
      : lightChartTheme.scaleColors);
  const chartData = useMemo(
    () => paletteData(data, seriesColors),
    [data, seriesColors]
  );
  const duration = spec.motion.enabled ? spec.motion.duration : 0;
  const visibleLayers = spec.layers.filter((layer) => layer.visible);
  const hasLayer = (type: string) =>
    visibleLayers.some((layer) => layer.type === type);
  const composition = visibleLayers
    .map((layer, index) =>
      layerElement(layer, index, spec.motion.enabled, options)
    )
    .filter(Boolean);

  if (
    spec.chart === "line-chart" ||
    spec.chart === "area-chart" ||
    spec.chart === "composed-chart" ||
    spec.chart === "profit-loss-line"
  ) {
    const Component =
      spec.chart === "composed-chart" || spec.chart === "profit-loss-line"
        ? ComposedChart
        : CartesianChart;
    const layers = composition;
    const xAxisOptions = record(options.xAxis as JsonValue);
    const yAxisOptions = record(options.yAxis as JsonValue);
    const children = [
      make(Grid, { horizontal: true, numTicksRows: 4 }),
      options.yAxisEnabled === false || yAxisOptions.enabled === false
        ? null
        : make(YAxis, {
            numTicks: Number(yAxisOptions.numTicks) || 4,
            formatLargeNumbers: yAxisOptions.formatLargeNumbers !== false,
          }),
      options.xAxisEnabled === false || xAxisOptions.enabled === false
        ? null
        : make(XAxis, {
            numTicks: Number(xAxisOptions.numTicks ?? options.numTicks ?? 4),
            tickMode: xAxisOptions.tickMode === "domain" ? "domain" : "data",
          }),
      make(ChartTooltip, {
        formatValue: (value: number) =>
          `$${Math.round(value).toLocaleString()}`,
      }),
      ...layers,
      make(ChartLegend, {}),
    ].filter(Boolean);
    const child = createElement(Fragment, null, children);
    const props: UnknownProps = {
      accessibilityLabel: spec.chart,
      animationDuration: duration,
      animationKey,
      barGap: options.barGap,
      barSize: options.barSize,
      data: chartData,
      height: spec.height,
      margin: options.margin,
      maxBarSize: options.maxBarSize,
      onSelectIndex,
      selectedIndex,
      stackGap: options.stackGap,
      status: options.status,
      statusLabel: options.statusLabel,
      stacked: options.stacked,
      xDataKey: options.xDataKey ?? "date",
      xScale: options.xScale ?? "time",
      yDomain: options.yDomain,
    };
    return (
      <View style={[styles.cartesianFrame, { width: previewWidth }]}>
        {make(Component, props, child)}
      </View>
    );
  }

  if (spec.chart === "bar-chart") {
    const children = createElement(
      Fragment,
      null,
      make(BarXAxis, {}),
      make(BarYAxis, {}),
      ...visibleLayers
        .filter((layer) => layer.type === "series-bar")
        .map((layer, index) =>
          make(Bar, {
            key: `${layer.id}:${index}`,
            dataKey: "dataKey" in layer ? layer.dataKey : "revenue",
            fill: "fill" in layer ? layer.fill : undefined,
            stroke: "stroke" in layer ? layer.stroke : undefined,
            radius: "radius" in layer ? layer.radius : undefined,
            animate: "animate" in layer ? layer.animate : spec.motion.enabled,
          })
        )
    );
    return make(
      BarChart,
      {
        accessibilityLabel: "Bar chart",
        animationDuration: duration,
        animationKey,
        barGap: Number(options.barGap ?? 0.22),
        barWidth: Number(options.barWidth ?? 30),
        data: chartData,
        height: spec.height,
        margin: options.margin,
        maxBarSize: Number(options.maxBarSize ?? 52),
        orientation:
          options.orientation === "horizontal" ? "horizontal" : "vertical",
        onSelectIndex,
        selectedIndex,
        stackGap: Number(options.stackGap ?? 0),
        stacked: Boolean(options.stacked),
        xDataKey: String(options.xDataKey ?? "name"),
      },
      children
    );
  }

  if (spec.chart === "scatter-chart") {
    const children = createElement(
      Fragment,
      null,
      make(Grid, { horizontal: true }),
      make(XAxis, { numTicks: 4 }),
      make(YAxis, { numTicks: 4 }),
      make(ChartTooltip, {}),
      ...visibleLayers
        .filter((layer) => "dataKey" in layer)
        .map((layer, index) =>
          make(Scatter, {
            key: `${layer.id}:${index}`,
            dataKey: "dataKey" in layer ? layer.dataKey : "revenue",
            radius: Number(options.radius ?? 5),
            ringGap: Number(options.ringGap ?? 2),
          })
        )
    );
    return make(
      ScatterChart,
      {
        animationDuration: duration,
        animationKey,
        data: chartData,
        height: spec.height,
        margin: options.margin,
        aspectRatio: Number(options.aspectRatio ?? 1.7),
        onSelectIndex,
        selectedIndex,
        xDataKey: String(options.xDataKey ?? "date"),
        xScale: options.xScale === "linear" ? "linear" : "time",
      },
      children
    );
  }

  if (spec.chart === "candlestick-chart") {
    const children = createElement(
      Fragment,
      null,
      make(Grid, { horizontal: true }),
      make(XAxis, { numTicks: 4 }),
      make(YAxis, { numTicks: 4 }),
      make(ChartTooltip, {}),
      hasLayer("line")
        ? make(Candlestick, { animate: spec.motion.enabled })
        : null
    );
    return make(
      CandlestickChart,
      {
        animationDuration: duration,
        animationKey,
        candleGap: Number(options.candleGap ?? 0.24),
        candleWidth: Number(options.candleWidth ?? 18),
        data: hasLayer("line") ? chartData : [],
        height: spec.height,
        margin: options.margin,
        aspectRatio: Number(options.aspectRatio ?? 1.7),
        onSelectIndex,
        selectedIndex,
        xDataKey: String(options.xDataKey ?? "date"),
      },
      children
    );
  }

  if (spec.chart === "live-line-chart") {
    const pointData = hasLayer("line")
      ? data.map((item) => item as unknown as { time: number; value: number })
      : [];
    return (
      <LiveLinePreview
        data={pointData}
        height={spec.height}
        lerpSpeed={spec.motion.enabled ? 0.08 : 1}
        paused={Boolean(options.paused) || !hasLayer("line")}
        pulse={spec.motion.enabled && options.pulse !== false}
        value={Number(options.value ?? 24)}
        windowSeconds={Number(options.window ?? 18)}
      />
    );
  }

  if (spec.chart === "pie-chart") {
    return make(
      PieChart,
      {
        ...options,
        animate: spec.motion.enabled,
        animationDuration: duration,
        animationKey,
        data: chartData,
        size: Math.min(previewWidth, Number(options.size ?? 280)),
      },
      createElement(
        Fragment,
        null,
        ...visibleLayers
          .map((layer, index) =>
            layerElement(layer, index, spec.motion.enabled)
          )
          .filter(Boolean),
        make(PieCenter, {
          defaultLabel: "Total",
          prefix: "$",
          formatValue: (value: number) => Math.round(value).toLocaleString(),
        })
      )
    );
  }

  if (spec.chart === "ring-chart") {
    return make(
      RingChart,
      {
        ...options,
        animate: spec.motion.enabled,
        animationDuration: duration,
        animationKey,
        data: chartData,
        size: Math.min(previewWidth, Number(options.size ?? 280)),
      },
      createElement(
        Fragment,
        null,
        ...visibleLayers
          .map((layer, index) =>
            layerElement(layer, index, spec.motion.enabled)
          )
          .filter(Boolean),
        make(RingCenter, {
          defaultLabel: "Tracked",
          formatValue: (value: number) => Math.round(value).toLocaleString(),
        })
      )
    );
  }

  if (spec.chart === "gauge-chart") {
    return make(Gauge, {
      ...options,
      animate: spec.motion.enabled,
      animationDuration: duration,
      animationKey,
      height: Number(options.height ?? 210),
      width: previewWidth,
      value: Number(options.value ?? 68),
    });
  }

  if (spec.chart === "radar-chart") {
    const children = createElement(
      Fragment,
      null,
      make(RadarGrid, {}),
      make(RadarAxis, {}),
      make(RadarLabels, {}),
      ...visibleLayers
        .map((layer, index) => layerElement(layer, index, spec.motion.enabled))
        .filter(Boolean)
    );
    return make(
      RadarChart,
      {
        ...options,
        animate: spec.motion.enabled,
        data: chartData,
        enterDurationMs: duration,
        metrics: options.metrics,
        motionReplayKey: String(animationKey),
        size: Math.min(previewWidth, Number(options.size ?? 280)),
      },
      children
    );
  }

  if (spec.chart === "heatmap-chart") {
    const children = createElement(
      Fragment,
      null,
      ...visibleLayers
        .map((layer, index) => layerElement(layer, index, spec.motion.enabled))
        .filter(Boolean),
      make(HeatmapXAxis, {}),
      make(HeatmapYAxis, {}),
      make(HeatmapTooltip, {}),
      make(HeatmapLegend, {})
    );
    return make(
      HeatmapChart,
      {
        ...options,
        animate: spec.motion.enabled,
        animationDuration: duration,
        animationKey,
        data: hasLayer("cells") ? reviveHeatmap(spec.data) : [],
        height: spec.height,
        levelColors: scaleColors,
      },
      children
    );
  }

  if (spec.chart === "funnel-chart") {
    return make(FunnelChart, {
      ...options,
      animate: spec.motion.enabled,
      animationDuration: duration,
      animationKey,
      data: hasLayer("stage") ? chartData : [],
    });
  }

  if (spec.chart === "sankey-chart") {
    return make(
      SankeyChart,
      {
        ...options,
        animate: spec.motion.enabled,
        animationDuration: duration,
        data: hasLayer("flow")
          ? spec.data
          : { ...record(spec.data), links: [] },
        revealSignature: String(animationKey),
      },
      createElement(
        Fragment,
        null,
        make(SankeyLink, {}),
        make(SankeyNode, {}),
        make(SankeyTooltip, {})
      )
    );
  }

  if (spec.chart === "sunburst-chart") {
    return make(
      SunburstChart,
      {
        ...options,
        animate: spec.motion.enabled,
        animationDuration: duration,
        data: spec.data,
        playKey: animationKey,
      },
      createElement(
        Fragment,
        null,
        hasLayer("segment") ? make(SunburstSegment, {}) : null,
        make(SunburstLabels, {}),
        make(SunburstCenter, {}),
        make(SunburstBreadcrumb, {}),
        make(SunburstHint, {})
      )
    );
  }

  return make(
    ChoroplethChart,
    {
      ...options,
      animate: spec.motion.enabled,
      animationDuration: duration,
      data: spec.data as unknown as ChoroplethGeoJson,
      height: spec.height,
      revealSignature: String(animationKey),
      width: previewWidth,
    },
    createElement(
      Fragment,
      null,
      make(ChoroplethGraticule, {}),
      ...visibleLayers
        .map((layer, index) =>
          layerElement(layer, index, spec.motion.enabled, options)
        )
        .filter(Boolean),
      make(ChoroplethTooltip, {})
    )
  );
}

export function NativeChartPreview(props: {
  spec: ChartSpec;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  frameWidth?: number;
  animationKey?: string | number;
}) {
  return (
    <ChartThemeProvider theme={props.spec.theme}>
      <ChartRenderer
        {...props}
        animationKey={
          props.animationKey ??
          `${props.spec.chart}:${props.spec.motion.duration}`
        }
      />
    </ChartThemeProvider>
  );
}

const styles = StyleSheet.create({
  cartesianFrame: {
    alignSelf: "center",
  },
});
