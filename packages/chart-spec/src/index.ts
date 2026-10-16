// biome-ignore-all lint/performance/noBarrelFile: public portable-spec API entry point.

import { validateChartFamily } from "./validate";

export { generateNativeCode } from "./codegen";

export const chartSlugs = [
  "area-chart",
  "bar-chart",
  "candlestick-chart",
  "choropleth-chart",
  "composed-chart",
  "funnel-chart",
  "gauge-chart",
  "heatmap-chart",
  "line-chart",
  "profit-loss-line",
  "live-line-chart",
  "pie-chart",
  "radar-chart",
  "ring-chart",
  "scatter-chart",
  "sankey-chart",
  "sunburst-chart",
] as const;

export type ChartSlug = (typeof chartSlugs)[number];
export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
export interface ChartDataRow {
  [key: string]: JsonValue;
}
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface PortableChartTheme {
  color?: string;
  gridColor?: string;
  scaleColors?: readonly [string, string, string, string, string];
  seriesColors?: readonly string[];
  surfaceColor?: string;
  textColor?: string;
  trackColor?: string;
}

export interface ChartMotionSpec {
  duration: number;
  enabled: boolean;
}

export interface CartesianLayerSpec {
  animate?: boolean;
  dataKey: string;
  fadeEdges?: boolean | "left" | "right";
  fill?: string;
  fillOpacity?: number;
  gradientSpan?: number;
  gradientToOpacity?: number;
  id: string;
  label?: string;
  negativeColor?: string;
  positiveColor?: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  type: "area" | "line" | "profit-loss-line" | "series-bar";
  visible: boolean;
}

export interface RadialLayerSpec {
  id: string;
  index: number;
  type: "pie-slice" | "ring" | "radar-area";
  visible: boolean;
}

export interface LayoutLayerSpec {
  id: string;
  type: "cells" | "feature" | "stage" | "segment" | "flow";
  visible: boolean;
}

export interface CartesianChartSettings {
  accessibilityLabel?: string;
  barGap?: number;
  barSize?: number;
  maxBarSize?: number;
  stacked?: boolean;
  stackGap?: number;
  candleGap?: number;
  candleWidth?: number;
  fillOpacity?: number;
  fadeEdges?: boolean | "left" | "right";
  numTicks?: number;
  paused?: boolean;
  pulse?: boolean;
  radius?: number;
  ringGap?: number;
  strokeWidth?: number;
  value?: number;
  window?: number;
  margin?: { bottom?: number; left?: number; right?: number; top?: number };
  status?: "empty" | "error" | "loading" | "ready";
  xAxis?: { enabled: boolean; numTicks: number; tickMode: "data" | "domain" };
  xDataKey: string;
  xScale: "category" | "linear" | "time";
  yAxis?: { enabled: boolean; numTicks: number; formatLargeNumbers: boolean };
  yDomain?: readonly [number, number];
}

export interface PieChartOptions {
  cornerRadius?: number;
  endAngle?: number;
  enterStaggerScale?: number;
  hoverOffset?: number;
  innerRadius?: number;
  padAngle?: number;
  size?: number;
  startAngle?: number;
}

export interface RingChartOptions {
  baseInnerRadius?: number;
  endAngle?: number;
  enterStaggerScale?: number;
  ringGap?: number;
  size?: number;
  startAngle?: number;
  strokeWidth?: number;
}

export interface GaugeChartOptions {
  activeFill?: string;
  centerValue?: number;
  defaultLabel?: string;
  endAngle?: number;
  linearHeight?: number;
  notchLengthPercent?: number;
  notchWidthPercent?: number;
  orientation?: "arc" | "linear";
  spacing?: number;
  startAngle?: number;
  totalNotches?: number;
  uniformWidth?: boolean;
  useGradient?: boolean;
  value: number;
}

export interface RadarChartOptions {
  animate?: boolean;
  enterDurationMs?: number;
  levels?: number;
  margin?: number;
  metrics: readonly { key: string; label: string }[];
  size?: number;
  staggerScale?: number;
}

export interface HeatmapChartOptions {
  binSize?: number;
  gap?: number;
  layout?: "fill" | "fluid";
  weekStartDay?: number;
}

export interface FunnelChartOptions {
  color?: string | null;
  edges?: "curved" | "straight";
  gap?: number;
  layers?: number;
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
  showPercentage?: boolean;
  showValues?: boolean;
  labelLayout?: "spread" | "grouped";
  labelOrientation?: "vertical" | "horizontal" | null;
  labelAlign?: "center" | "start" | "end";
}

export interface SankeyChartOptions {
  aspectRatio?: string;
  nodePadding?: number;
  nodeWidth?: number;
}

export interface SunburstChartOptions {
  hoverPop?: number;
  padding?: number;
  size?: number;
}

export interface ChoroplethChartOptions {
  center?: readonly [number, number];
  scale?: number;
  valueDataKey?: string;
  zoomEnabled?: boolean;
}

interface ChartSpecBase<
  C extends ChartSlug,
  D extends JsonValue,
  L extends CartesianLayerSpec | RadialLayerSpec | LayoutLayerSpec,
  O extends object,
> {
  chart: C;
  data: D;
  height: number;
  layers: readonly L[];
  motion: ChartMotionSpec;
  options: O;
  theme: PortableChartTheme;
  version: 1;
}

export type CartesianChartSlug =
  | "area-chart"
  | "bar-chart"
  | "candlestick-chart"
  | "composed-chart"
  | "line-chart"
  | "live-line-chart"
  | "profit-loss-line"
  | "scatter-chart";

export type CartesianChartSpec = ChartSpecBase<
  CartesianChartSlug,
  readonly ChartDataRow[],
  CartesianLayerSpec,
  CartesianChartSettings
>;

export type RadialChartSpec =
  | ChartSpecBase<
      "pie-chart",
      readonly ChartDataRow[],
      RadialLayerSpec,
      PieChartOptions
    >
  | ChartSpecBase<
      "ring-chart",
      readonly ChartDataRow[],
      RadialLayerSpec,
      RingChartOptions
    >
  | ChartSpecBase<
      "gauge-chart",
      readonly ChartDataRow[],
      RadialLayerSpec,
      GaugeChartOptions
    >
  | ChartSpecBase<
      "radar-chart",
      readonly ChartDataRow[],
      RadialLayerSpec,
      RadarChartOptions
    >;

export type LayoutChartSpec =
  | ChartSpecBase<
      "heatmap-chart",
      JsonValue,
      LayoutLayerSpec,
      HeatmapChartOptions
    >
  | ChartSpecBase<
      "funnel-chart",
      JsonValue,
      LayoutLayerSpec,
      FunnelChartOptions
    >
  | ChartSpecBase<
      "sankey-chart",
      JsonValue,
      LayoutLayerSpec,
      SankeyChartOptions
    >
  | ChartSpecBase<
      "sunburst-chart",
      JsonValue,
      LayoutLayerSpec,
      SunburstChartOptions
    >
  | ChartSpecBase<
      "choropleth-chart",
      JsonValue,
      LayoutLayerSpec,
      ChoroplethChartOptions
    >;

export type ChartSpec = CartesianChartSpec | RadialChartSpec | LayoutChartSpec;

export interface ChartCapability {
  chart: ChartSlug;
  features: readonly string[];
  status: "available" | "partial" | "pending";
}

/** Capabilities describe rendered native behavior, not just matching names. */
export const nativeChartCapabilities: Readonly<
  Record<ChartSlug, ChartCapability>
> = {
  "area-chart": {
    chart: "area-chart",
    features: [
      "time-scale",
      "linear-scale",
      "category-scale",
      "multiple-series",
      "gap-handling",
      "axes",
      "grid",
      "tooltip",
      "legend",
    ],
    status: "partial",
  },
  "bar-chart": {
    chart: "bar-chart",
    features: [
      "grouped-bars",
      "stacked-bars",
      "horizontal-layout",
      "selection",
      "accessibility-adjustable",
    ],
    status: "partial",
  },
  "candlestick-chart": {
    chart: "candlestick-chart",
    features: ["ohlc", "time-scale", "crosshair-selection", "entry-motion"],
    status: "partial",
  },
  "choropleth-chart": {
    chart: "choropleth-chart",
    features: [
      "geojson",
      "world-atlas-sample",
      "projection",
      "pinch-zoom",
      "feature-selection",
    ],
    status: "partial",
  },
  "composed-chart": {
    chart: "composed-chart",
    features: [
      "line",
      "area",
      "grouped-bars",
      "stacked-bars",
      "shared-time-scale",
      "zero-crossing-profit-loss",
    ],
    status: "partial",
  },
  "funnel-chart": {
    chart: "funnel-chart",
    features: [
      "horizontal-layout",
      "vertical-layout",
      "stage-labels",
      "selection",
    ],
    status: "partial",
  },
  "gauge-chart": {
    chart: "gauge-chart",
    features: ["arc", "linear", "notch-style", "motion", "reduce-motion"],
    status: "partial",
  },
  "heatmap-chart": {
    chart: "heatmap-chart",
    features: ["calendar-grid", "week-start", "cell-size", "tooltip", "legend"],
    status: "partial",
  },
  "line-chart": {
    chart: "line-chart",
    features: [
      "time-scale",
      "linear-scale",
      "category-scale",
      "multiple-series",
      "gap-handling",
      "axes",
      "grid",
      "tooltip",
      "legend",
    ],
    status: "partial",
  },
  "profit-loss-line": {
    chart: "profit-loss-line",
    features: [
      "zero-crossings",
      "separate-gain-loss-colors",
      "curve-factory",
      "edge-fade",
    ],
    status: "partial",
  },
  "live-line-chart": {
    chart: "live-line-chart",
    features: [
      "rolling-window",
      "live-updates",
      "momentum",
      "selection",
      "reduce-motion",
    ],
    status: "partial",
  },
  "pie-chart": {
    chart: "pie-chart",
    features: ["category-slices", "selection", "center-label", "entry-motion"],
    status: "partial",
  },
  "radar-chart": {
    chart: "radar-chart",
    features: ["multi-series", "metric-axes", "selection", "entry-motion"],
    status: "partial",
  },
  "ring-chart": {
    chart: "ring-chart",
    features: ["multi-ring", "independent-maxima", "selection", "center-label"],
    status: "partial",
  },
  "scatter-chart": {
    chart: "scatter-chart",
    features: ["time-scale", "multiple-series", "selection", "value-axis"],
    status: "partial",
  },
  "sankey-chart": {
    chart: "sankey-chart",
    features: [
      "directed-flows",
      "node-labels",
      "selection",
      "cycle-validation",
    ],
    status: "partial",
  },
  "sunburst-chart": {
    chart: "sunburst-chart",
    features: [
      "hierarchical-rings",
      "focus-drilldown",
      "selection",
      "breadcrumb",
    ],
    status: "partial",
  },
};

export interface NativePreviewRequest {
  protocol: "bklit-native-preview";
  revision: number;
  spec: ChartSpec;
  type: "render";
  version: 1;
}

export type NativePreviewResponse =
  | {
      protocol: "bklit-native-preview";
      revision: number;
      type: "ready";
      version: 1;
    }
  | {
      protocol: "bklit-native-preview";
      revision: number;
      type: "rendered";
      version: 1;
    }
  | {
      message: string;
      protocol: "bklit-native-preview";
      revision: number;
      type: "error";
      version: 1;
    };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isChartSlug(value: unknown): value is ChartSlug {
  return (
    typeof value === "string" &&
    (chartSlugs as readonly string[]).includes(value)
  );
}

export function isCartesianChartSlug(
  chart: ChartSlug
): chart is CartesianChartSlug {
  return (
    chart === "area-chart" ||
    chart === "bar-chart" ||
    chart === "candlestick-chart" ||
    chart === "composed-chart" ||
    chart === "line-chart" ||
    chart === "live-line-chart" ||
    chart === "profit-loss-line" ||
    chart === "scatter-chart"
  );
}

export function isJsonValue(
  value: unknown,
  active = new Set<object>()
): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (!(Array.isArray(value) || record(value))) {
    return false;
  }
  if (active.has(value)) {
    return false;
  }
  active.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, active))
    : Object.values(value).every((item) => isJsonValue(item, active));
  active.delete(value);
  return valid;
}

/** Converts Date objects in chart samples to ISO strings for transport/storage. */
export function toJsonValue(value: unknown): JsonValue {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new Error("Cannot serialize an invalid Date.");
    }
    return value.toISOString();
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Chart specs cannot contain non-finite numbers.");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (record(value)) {
    const output: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) {
        continue;
      }
      output[key] = toJsonValue(item);
    }
    return output;
  }
  throw new Error("Chart specs must contain only JSON values and Dates.");
}

export function isChartSpec(value: unknown): value is ChartSpec {
  if (!record(value) || value.version !== 1 || !isChartSlug(value.chart)) {
    return false;
  }
  if (!record(value.theme)) {
    return false;
  }
  const scaleColors = value.theme.scaleColors;
  if (
    scaleColors !== undefined &&
    !(
      Array.isArray(scaleColors) &&
      scaleColors.length === 5 &&
      scaleColors.every((color) => typeof color === "string")
    )
  ) {
    return false;
  }
  if (!Number.isFinite(value.height) || (value.height as number) <= 0) {
    return false;
  }
  if (
    !record(value.motion) ||
    typeof value.motion.enabled !== "boolean" ||
    !Number.isFinite(value.motion.duration) ||
    (value.motion.duration as number) < 0
  ) {
    return false;
  }
  if (
    !(
      record(value.theme) &&
      Object.values(value.theme).every(
        (token) =>
          typeof token === "string" ||
          (Array.isArray(token) &&
            token.every((color) => typeof color === "string"))
      ) &&
      isJsonValue(value.data) &&
      Array.isArray(value.layers) &&
      value.layers.every(
        (layer) =>
          record(layer) &&
          typeof layer.id === "string" &&
          typeof layer.type === "string" &&
          typeof layer.visible === "boolean"
      ) &&
      record(value.options) &&
      isJsonValue(value.options)
    )
  ) {
    return false;
  }

  if (isCartesianChartSlug(value.chart)) {
    const cartesianValid =
      Array.isArray(value.data) &&
      value.data.every(record) &&
      typeof value.options.xDataKey === "string" &&
      (value.options.xScale === "category" ||
        value.options.xScale === "linear" ||
        value.options.xScale === "time") &&
      value.layers.every(
        (layer) =>
          record(layer) &&
          ["area", "line", "profit-loss-line", "series-bar"].includes(
            String(layer.type)
          ) &&
          typeof layer.dataKey === "string"
      );
    return (
      cartesianValid &&
      validateChartFamily(value.chart, value.data, value.options, value.layers)
    );
  }
  return validateChartFamily(
    value.chart,
    value.data,
    value.options,
    value.layers
  );
}

export function parseChartSpec(input: string): ChartSpec {
  const parsed: unknown = JSON.parse(input);
  if (!isChartSpec(parsed)) {
    throw new Error("Unsupported or invalid native chart spec v1.");
  }
  return parsed;
}
