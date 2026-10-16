import {
  type ChartSlug,
  type ChartSpec,
  type JsonValue,
  toJsonValue,
} from "@bklitui/chart-spec";
import { nativeLayoutControls } from "@bklitui/native/layouts/controls";
import { nativeLayoutSampleData } from "@bklitui/native/layouts/samples";
import type { NativeRadialCatalogEntry } from "@bklitui/native/radial/samples";
import { nativeRadialCatalog as radialSamples } from "@bklitui/native/radial/samples";

export interface NativeControl {
  key: string;
  label: string;
  type: "boolean" | "color" | "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly (string | number)[];
  section?: string;
  unit?: string;
  valueTransform?: "auto-number" | "coordinate-pair";
}

export interface NativeChartEntry {
  slug: ChartSlug;
  title: string;
  family: "Cartesian" | "Radial" | "Layout";
  description: string;
  controls: readonly NativeControl[];
}

const cartesianData = [
  { date: "2026-10-09T12:00:00.000Z", revenue: 9200, target: 8800, margin: 13 },
  {
    date: "2026-10-10T12:00:00.000Z",
    revenue: 10_450,
    target: 9300,
    margin: 16,
  },
  { date: "2026-10-11T12:00:00.000Z", revenue: 9760, target: 9600, margin: 12 },
  {
    date: "2026-10-12T12:00:00.000Z",
    revenue: 11_480,
    target: 10_100,
    margin: 18,
  },
  {
    date: "2026-10-13T12:00:00.000Z",
    revenue: 10_830,
    target: 10_500,
    margin: 15,
  },
  {
    date: "2026-10-14T12:00:00.000Z",
    revenue: 12_610,
    target: 11_200,
    margin: 21,
  },
  {
    date: "2026-10-15T12:00:00.000Z",
    revenue: 13_710,
    target: 11_800,
    margin: 24,
  },
];

const monthlyData = [
  { name: "Jan", revenue: 26, target: 31, profit: 8 },
  { name: "Feb", revenue: 34, target: 31, profit: 12 },
  { name: "Mar", revenue: 30, target: 32, profit: -3 },
  { name: "Apr", revenue: 42, target: 35, profit: 14 },
  { name: "May", revenue: 47, target: 37, profit: 17 },
  { name: "Jun", revenue: 44, target: 40, profit: -5 },
];

function createLiveSampleData() {
  const now = Date.now() / 1000;
  const span = 18;
  const lastIndex = 31;
  return Array.from({ length: lastIndex + 1 }, (_, index) => ({
    time: now - ((lastIndex - index) / lastIndex) * span,
    value: 22 + Math.sin(index / 3) * 1.8 + index * 0.07,
  }));
}

export const nativeCartesianSamples = {
  "area-chart": cartesianData,
  "line-chart": cartesianData,
  "composed-chart": monthlyData,
  "profit-loss-line": monthlyData,
  "bar-chart": monthlyData,
  "scatter-chart": cartesianData,
  "candlestick-chart": [
    {
      date: "2026-10-09T12:00:00.000Z",
      open: 54,
      high: 62,
      low: 51,
      close: 59,
      volume: 320,
    },
    {
      date: "2026-10-10T12:00:00.000Z",
      open: 59,
      high: 64,
      low: 55,
      close: 57,
      volume: 280,
    },
    {
      date: "2026-10-11T12:00:00.000Z",
      open: 57,
      high: 61,
      low: 49,
      close: 52,
      volume: 410,
    },
    {
      date: "2026-10-12T12:00:00.000Z",
      open: 52,
      high: 60,
      low: 50,
      close: 59,
      volume: 370,
    },
    {
      date: "2026-10-13T12:00:00.000Z",
      open: 59,
      high: 67,
      low: 56,
      close: 64,
      volume: 520,
    },
    {
      date: "2026-10-14T12:00:00.000Z",
      open: 64,
      high: 70,
      low: 60,
      close: 68,
      volume: 460,
    },
    {
      date: "2026-10-15T12:00:00.000Z",
      open: 68,
      high: 72,
      low: 63,
      close: 66,
      volume: 340,
    },
  ],
  "live-line-chart": Array.from({ length: 32 }, (_, index) => ({
    time: Date.now() / 1000 - (31 - index) * 0.2,
    value: 22 + Math.sin(index / 3) * 1.8 + index * 0.07,
  })),
} as const;

const cartesianControlSets: Partial<
  Record<ChartSlug, readonly NativeControl[]>
> = {
  "area-chart": [
    {
      key: "fillOpacity",
      label: "Area fill",
      type: "number",
      min: 0,
      max: 0.8,
      step: 0.05,
      section: "Style",
    },
    {
      key: "gradientToOpacity",
      label: "Gradient end",
      type: "number",
      min: 0,
      max: 0.4,
      step: 0.05,
      section: "Style",
    },
    {
      key: "strokeWidth",
      label: "Line width",
      type: "number",
      min: 1,
      max: 5,
      step: 0.5,
      section: "Style",
    },
    {
      key: "numTicks",
      label: "Date labels",
      type: "number",
      min: 2,
      max: 5,
      step: 1,
      section: "Axes",
    },
  ],
  "line-chart": [
    {
      key: "strokeWidth",
      label: "Line width",
      type: "number",
      min: 1,
      max: 5,
      step: 0.5,
      section: "Style",
    },
    {
      key: "numTicks",
      label: "Date labels",
      type: "number",
      min: 2,
      max: 5,
      step: 1,
      section: "Axes",
    },
  ],
  "bar-chart": [
    {
      key: "barWidth",
      label: "Bar width",
      type: "number",
      min: 8,
      max: 48,
      step: 2,
      unit: "px",
      section: "Bars",
    },
    {
      key: "barGap",
      label: "Bar gap",
      type: "number",
      min: 0,
      max: 0.6,
      step: 0.05,
      section: "Bars",
    },
    { key: "stacked", label: "Stack series", type: "boolean", section: "Bars" },
  ],
  "composed-chart": [
    {
      key: "barSize",
      label: "Bar size",
      type: "number",
      min: 8,
      max: 40,
      step: 2,
      unit: "px",
      section: "Bars",
    },
    {
      key: "barGap",
      label: "Bar gap",
      type: "number",
      min: 0,
      max: 12,
      step: 1,
      unit: "px",
      section: "Bars",
    },
    { key: "stacked", label: "Stack bars", type: "boolean", section: "Bars" },
  ],
  "profit-loss-line": [
    {
      key: "strokeWidth",
      label: "Line width",
      type: "number",
      min: 1,
      max: 5,
      step: 0.5,
      section: "Style",
    },
    {
      key: "fadeEdges",
      label: "Fade line edges",
      type: "boolean",
      section: "Style",
    },
  ],
  "scatter-chart": [
    {
      key: "radius",
      label: "Point radius",
      type: "number",
      min: 2,
      max: 12,
      step: 1,
      section: "Points",
    },
    {
      key: "ringGap",
      label: "Outline gap",
      type: "number",
      min: 0,
      max: 5,
      step: 1,
      section: "Points",
    },
  ],
  "candlestick-chart": [
    {
      key: "candleWidth",
      label: "Candle width",
      type: "number",
      min: 8,
      max: 28,
      step: 1,
      unit: "px",
      section: "Candles",
    },
    {
      key: "candleGap",
      label: "Candle gap",
      type: "number",
      min: 0,
      max: 0.65,
      step: 0.05,
      section: "Candles",
    },
  ],
  "live-line-chart": [
    {
      key: "window",
      label: "Time window",
      type: "number",
      min: 8,
      max: 60,
      step: 4,
      unit: "s",
      section: "Window",
    },
    {
      key: "paused",
      label: "Pause live feed",
      type: "boolean",
      section: "Motion",
    },
    { key: "pulse", label: "Pulse marker", type: "boolean", section: "Style" },
  ],
};

const radialTitles: Record<string, string> = {
  "pie-chart": "Pie chart",
  "ring-chart": "Ring chart",
  "gauge-chart": "Gauge",
  "radar-chart": "Radar chart",
};

const layoutTitles: Record<string, string> = {
  "heatmap-chart": "Heatmap",
  "funnel-chart": "Funnel",
  "sankey-chart": "Sankey",
  "sunburst-chart": "Sunburst",
  "choropleth-chart": "Choropleth",
};

const descriptions: Record<ChartSlug, string> = {
  "area-chart": "Track a value over time with a filled series.",
  "bar-chart": "Compare discrete values across categories.",
  "candlestick-chart": "Inspect open, high, low, and close intervals.",
  "choropleth-chart": "Compare geographic regions by a numeric measure.",
  "composed-chart": "Combine grouped bars and trend lines on shared scales.",
  "funnel-chart": "Show conversion volume across sequential stages.",
  "gauge-chart": "Communicate a single progress value at a glance.",
  "heatmap-chart": "Explore activity intensity across a calendar grid.",
  "line-chart": "Follow one or more series along a continuous scale.",
  "profit-loss-line": "Compare gains and losses around a zero baseline.",
  "live-line-chart": "Watch a short rolling window update in real time.",
  "pie-chart": "Compare how categories contribute to a whole.",
  "radar-chart": "Compare multiple profiles across shared dimensions.",
  "ring-chart": "Track multiple independent progress totals.",
  "scatter-chart": "Inspect relationships between paired values.",
  "sankey-chart": "Trace flow volume between connected stages.",
  "sunburst-chart": "Explore hierarchical totals by drilling into segments.",
};

const chartOrder: readonly ChartSlug[] = [
  "line-chart",
  "area-chart",
  "bar-chart",
  "composed-chart",
  "scatter-chart",
  "candlestick-chart",
  "live-line-chart",
  "profit-loss-line",
  "pie-chart",
  "ring-chart",
  "gauge-chart",
  "radar-chart",
  "heatmap-chart",
  "funnel-chart",
  "sankey-chart",
  "sunburst-chart",
  "choropleth-chart",
];

const radialEntries = new Map(radialSamples.map((entry) => [entry.id, entry]));
const radialSlugs = new Set<string>(radialSamples.map((entry) => entry.id));
const layoutSlugs = new Set<string>(Object.keys(nativeLayoutControls));

export const nativeChartCatalog: readonly NativeChartEntry[] = chartOrder.map(
  (slug) => {
    if (radialSlugs.has(slug)) {
      const entry = radialEntries.get(slug as NativeRadialCatalogEntry["id"]);
      return {
        slug,
        title: radialTitles[slug] ?? slug,
        family: "Radial",
        description: descriptions[slug],
        controls: (entry?.controls ?? []).map((control) => ({
          key: control.key,
          label: control.label,
          type: control.type,
          min: control.min,
          max: control.max,
          step: control.step,
          options: control.options,
          section: "Chart",
        })),
      };
    }
    if (layoutSlugs.has(slug)) {
      const controls =
        nativeLayoutControls[slug as keyof typeof nativeLayoutControls];
      return {
        slug,
        title: layoutTitles[slug] ?? slug,
        family: "Layout",
        description: descriptions[slug],
        controls: controls.map((control) => ({
          key: control.prop,
          label: control.label,
          type: control.type,
          min: control.min,
          max: control.max,
          step: control.step,
          options: control.options,
          section: control.section,
          unit: control.unit,
          valueTransform: control.valueTransform,
        })),
      };
    }
    return {
      slug,
      title: slug
        .split("-")
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(" "),
      family: "Cartesian",
      description: descriptions[slug],
      controls: cartesianControlSets[slug] ?? [],
    };
  }
);

export const chartTitle = (slug: ChartSlug) =>
  nativeChartCatalog.find((item) => item.slug === slug)?.title ?? slug;

const defaultTheme = {} as const;

const layer = (
  id: string,
  type: "area" | "line" | "profit-loss-line" | "series-bar",
  dataKey: string,
  extra: Record<string, JsonValue> = {}
) => ({ id, type, dataKey, visible: true, ...extra });

function radialLayerType(
  chart: NativeRadialCatalogEntry["id"]
): "pie-slice" | "ring" | "radar-area" {
  if (chart === "pie-chart") {
    return "pie-slice";
  }
  if (chart === "ring-chart") {
    return "ring";
  }
  return "radar-area";
}

function layoutLayer(slug: ChartSlug) {
  switch (slug) {
    case "heatmap-chart":
      return { id: "cells", type: "cells", visible: true };
    case "funnel-chart":
      return { id: "stages", type: "stage", visible: true };
    case "sankey-chart":
      return { id: "flows", type: "flow", visible: true };
    case "sunburst-chart":
      return { id: "segments", type: "segment", visible: true };
    default:
      return { id: "features", type: "feature", visible: true };
  }
}

function nativeFamilyDefaults(slug: ChartSlug): {
  data: unknown;
  options: Record<string, JsonValue>;
  layers: Record<string, JsonValue>[];
} {
  const radial = radialEntries.get(slug as NativeRadialCatalogEntry["id"]);
  if (radial) {
    const radialLayers = Array.isArray(radial.data)
      ? radial.data.map((_, index) => ({
          id: `${radial.id}-${index}`,
          index,
          type: radialLayerType(radial.id),
          visible: true,
        }))
      : [];
    return {
      data: radial.data ?? [],
      options: toJsonValue(radial.defaultProps) as Record<string, JsonValue>,
      layers: radialLayers,
    };
  }
  if (slug in layoutTitles) {
    const samples = nativeLayoutSampleData as Record<string, unknown>;
    const data = samples[slug];
    const dataLayers = [layoutLayer(slug)];
    const controls =
      nativeLayoutControls[slug as keyof typeof nativeLayoutControls];
    const options = Object.fromEntries(
      controls.flatMap((control) => {
        const value = control.defaultValue;
        if (
          value === null ||
          (control.valueTransform === "auto-number" && value === "auto")
        ) {
          return [];
        }
        if (control.valueTransform === "auto-number") {
          return [[control.prop, Number(value)]];
        }
        if (control.valueTransform === "coordinate-pair") {
          const pair = String(value).split(",").map(Number);
          return pair.length === 2 && pair.every(Number.isFinite)
            ? [[control.prop, pair]]
            : [];
        }
        return [[control.prop, toJsonValue(value)]];
      })
    ) as Record<string, JsonValue>;
    if (slug === "choropleth-chart") {
      options.valueDataKey = "activity";
    }
    return {
      data,
      options,
      layers: dataLayers,
    };
  }

  switch (slug) {
    case "area-chart":
      return {
        data: cartesianData,
        options: {
          xDataKey: "date",
          xScale: "time",
          xAxisEnabled: true,
          yAxisEnabled: false,
          numTicks: 3,
          fillOpacity: 0.18,
          strokeWidth: 2.5,
        },
        layers: [layer("revenue-area", "area", "revenue")],
      };
    case "line-chart":
      return {
        data: cartesianData,
        options: {
          xDataKey: "date",
          xScale: "time",
          xAxisEnabled: true,
          yAxisEnabled: false,
          numTicks: 3,
          strokeWidth: 2.5,
        },
        layers: [layer("revenue", "line", "revenue")],
      };
    case "bar-chart":
      return {
        data: monthlyData,
        options: {
          xDataKey: "name",
          xScale: "category",
          barWidth: 30,
          barGap: 0.22,
          maxBarSize: 52,
          stacked: false,
          stackGap: 0,
          orientation: "vertical",
        },
        layers: [
          layer("revenue", "series-bar", "revenue"),
          layer("target", "series-bar", "target"),
        ],
      };
    case "composed-chart":
      return {
        data: monthlyData,
        options: {
          xDataKey: "name",
          xScale: "category",
          barSize: 22,
          barGap: 5,
          maxBarSize: 48,
          stacked: false,
          stackGap: 0,
          strokeWidth: 2.5,
        },
        layers: [
          layer("revenue-bars", "series-bar", "revenue"),
          layer("target-line", "line", "target"),
          layer("profit-area", "area", "profit", { fillOpacity: 0.16 }),
        ],
      };
    case "profit-loss-line":
      return {
        data: monthlyData,
        options: {
          xDataKey: "name",
          xScale: "category",
          strokeWidth: 2.5,
          fadeEdges: true,
        },
        layers: [
          layer("profit", "profit-loss-line", "profit", {
            positiveColor: "#16a34a",
            negativeColor: "#dc2626",
            strokeWidth: 2.5,
          }),
        ],
      };
    case "scatter-chart":
      return {
        data: cartesianData,
        options: { xDataKey: "date", xScale: "time", radius: 5, ringGap: 2 },
        layers: [layer("revenue-points", "line", "revenue")],
      };
    case "candlestick-chart":
      return {
        data: nativeCartesianSamples["candlestick-chart"],
        options: {
          xDataKey: "date",
          xScale: "time",
          candleGap: 0.24,
          candleWidth: 18,
        },
        layers: [
          { id: "candles", type: "line", dataKey: "close", visible: true },
        ],
      };
    case "live-line-chart":
      return {
        data: createLiveSampleData(),
        options: {
          xDataKey: "time",
          xScale: "linear",
          value: 24,
          window: 18,
          paused: false,
          pulse: true,
        },
        layers: [
          { id: "live-value", type: "line", dataKey: "value", visible: true },
        ],
      };
    default:
      return { data: [], options: {}, layers: [] };
  }
}

export function createNativeChartSpec(slug: ChartSlug): ChartSpec {
  const defaults = nativeFamilyDefaults(slug);
  return {
    chart: slug,
    data: toJsonValue(defaults.data),
    height: 280,
    layers: defaults.layers,
    motion: { duration: 900, enabled: true },
    options: defaults.options,
    theme: defaultTheme,
    version: 1,
  } as unknown as ChartSpec;
}

export function scaleSampleData(value: unknown, multiplier: number): unknown {
  const valueKeys = new Set([
    "value",
    "count",
    "activity",
    "amount",
    "revenue",
    "target",
    "profit",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "speed",
    "quality",
    "focus",
    "reliability",
    "support",
  ]);
  const walk = (item: unknown, key?: string): unknown => {
    if (typeof item === "number" && key && valueKeys.has(key)) {
      return Number((item * multiplier).toFixed(2));
    }
    if (Array.isArray(item)) {
      return item.map((child) => walk(child, key));
    }
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item).map(([childKey, child]) => [
          childKey,
          walk(child, childKey),
        ])
      );
    }
    return item;
  };
  return walk(value);
}

export function cycleSampleData(value: unknown, revision: number): unknown {
  return scaleSampleData(value, revision % 2 === 0 ? 1.12 : 0.9);
}

export function jsonData(data: unknown): JsonValue {
  return toJsonValue(data);
}
