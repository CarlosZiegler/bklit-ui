export interface NativeCartesianControlDescriptor {
  /** Exact chart prop edited by the mobile control. */
  key: string;
  label: string;
  type: "boolean" | "color" | "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
}

export interface NativeCartesianLayerDescriptor {
  id: string;
  type: string;
  dataKey?: string;
  visible?: boolean;
  [property: string]: unknown;
}

export interface NativeCartesianCatalogEntry {
  id:
    | "bar-chart"
    | "composed-chart"
    | "scatter-chart"
    | "candlestick-chart"
    | "live-line-chart"
    | "profit-loss-line";
  title: string;
  description: string;
  /** Renderer and layers are plain descriptors so mobile Studio can compose child markers. */
  renderer:
    | "BarChart"
    | "ComposedChart"
    | "ScatterChart"
    | "CandlestickChart"
    | "LiveLineChart";
  data: readonly Record<string, unknown>[];
  defaultProps: Readonly<Record<string, unknown>>;
  layers: readonly NativeCartesianLayerDescriptor[];
  controls: readonly NativeCartesianControlDescriptor[];
}

const monthlyData = [
  {
    month: "Jan",
    date: "2026-01-01T12:00:00.000Z",
    revenue: 28,
    target: 32,
    profit: 8,
    margin: 12,
  },
  {
    month: "Feb",
    date: "2026-02-01T12:00:00.000Z",
    revenue: 35,
    target: 34,
    profit: 12,
    margin: 15,
  },
  {
    month: "Mar",
    date: "2026-03-01T12:00:00.000Z",
    revenue: 31,
    target: 36,
    profit: -3,
    margin: 11,
  },
  {
    month: "Apr",
    date: "2026-04-01T12:00:00.000Z",
    revenue: 42,
    target: 38,
    profit: 14,
    margin: 18,
  },
  {
    month: "May",
    date: "2026-05-01T12:00:00.000Z",
    revenue: 48,
    target: 41,
    profit: 17,
    margin: 21,
  },
  {
    month: "Jun",
    date: "2026-06-01T12:00:00.000Z",
    revenue: 45,
    target: 44,
    profit: -5,
    margin: 19,
  },
];

const scatterData = [
  { date: "2026-10-09T12:00:00.000Z", response: 142, throughput: 42 },
  { date: "2026-10-10T12:00:00.000Z", response: 116, throughput: 51 },
  { date: "2026-10-11T12:00:00.000Z", response: 171, throughput: 38 },
  { date: "2026-10-12T12:00:00.000Z", response: 96, throughput: 62 },
  { date: "2026-10-13T12:00:00.000Z", response: 125, throughput: 56 },
  { date: "2026-10-14T12:00:00.000Z", response: 88, throughput: 73 },
  { date: "2026-10-15T12:00:00.000Z", response: 108, throughput: 68 },
];

const candleData = [
  { date: "2026-10-09T12:00:00.000Z", open: 54, high: 62, low: 51, close: 59 },
  { date: "2026-10-10T12:00:00.000Z", open: 59, high: 64, low: 55, close: 57 },
  { date: "2026-10-11T12:00:00.000Z", open: 57, high: 61, low: 49, close: 52 },
  { date: "2026-10-12T12:00:00.000Z", open: 52, high: 60, low: 50, close: 59 },
  { date: "2026-10-13T12:00:00.000Z", open: 59, high: 67, low: 56, close: 64 },
  { date: "2026-10-14T12:00:00.000Z", open: 64, high: 70, low: 60, close: 68 },
  { date: "2026-10-15T12:00:00.000Z", open: 68, high: 72, low: 63, close: 66 },
];

const latestLiveTime = Math.floor(Date.now() / 1000);
const liveData = Array.from({ length: 24 }, (_, index) => ({
  time: latestLiveTime - (23 - index) * 0.35,
  value: 52 + Math.sin(index / 2.8) * 2 + index * 0.1,
}));

const chartLayers = (
  entries: readonly NativeCartesianLayerDescriptor[]
): NativeCartesianLayerDescriptor[] =>
  entries.map((entry) => ({ ...entry, visible: true }));

export const nativeCartesianCatalog: readonly NativeCartesianCatalogEntry[] = [
  {
    id: "bar-chart",
    title: "Bar chart",
    description:
      "Compare grouped or stacked values across discrete categories.",
    renderer: "BarChart",
    data: monthlyData.map(({ month, revenue, target }) => ({
      month,
      revenue,
      target,
    })),
    defaultProps: {
      xDataKey: "month",
      height: 248,
      orientation: "vertical",
      barGap: 0.2,
      maxBarSize: 52,
      stacked: false,
      stackGap: 0,
    },
    layers: chartLayers([
      { id: "revenue", type: "Bar", dataKey: "revenue", fill: "#397db5" },
      { id: "target", type: "Bar", dataKey: "target", fill: "#e5985d" },
      { id: "category-axis", type: "BarXAxis" },
      { id: "value-axis", type: "BarYAxis" },
    ]),
    controls: [
      {
        key: "orientation",
        label: "Orientation",
        type: "select",
        options: ["vertical", "horizontal"],
      },
      {
        key: "barGap",
        label: "Category gap",
        type: "number",
        min: 0,
        max: 0.6,
        step: 0.05,
      },
      {
        key: "barWidth",
        label: "Bar width",
        type: "number",
        min: 8,
        max: 48,
        step: 2,
      },
      { key: "stacked", label: "Stack series", type: "boolean" },
      {
        key: "stackGap",
        label: "Stack gap",
        type: "number",
        min: 0,
        max: 8,
        step: 1,
      },
    ],
  },
  {
    id: "composed-chart",
    title: "Composed chart",
    description: "Combine time-scaled columns, areas, and lines on one plot.",
    renderer: "ComposedChart",
    data: monthlyData,
    defaultProps: {
      xDataKey: "date",
      height: 248,
      barSize: 20,
      maxBarSize: 48,
      barGap: 4,
      stacked: false,
      stackGap: 0,
    },
    layers: chartLayers([
      { id: "grid", type: "Grid", horizontal: true },
      { id: "date-axis", type: "XAxis", numTicks: 4 },
      { id: "value-axis", type: "YAxis", numTicks: 4 },
      {
        id: "revenue-bars",
        type: "SeriesBar",
        dataKey: "revenue",
        fill: "#397db5",
      },
      {
        id: "target-line",
        type: "Line",
        dataKey: "target",
        stroke: "#e5985d",
        strokeWidth: 2.5,
      },
      {
        id: "profit-area",
        type: "Area",
        dataKey: "profit",
        fill: "#4f9b73",
        fillOpacity: 0.14,
      },
      { id: "tooltip", type: "ChartTooltip" },
    ]),
    controls: [
      {
        key: "barSize",
        label: "Column width",
        type: "number",
        min: 8,
        max: 40,
        step: 2,
      },
      {
        key: "barGap",
        label: "Column gap",
        type: "number",
        min: 0,
        max: 14,
        step: 1,
      },
      { key: "stacked", label: "Stack columns", type: "boolean" },
      {
        key: "stackGap",
        label: "Stack gap",
        type: "number",
        min: 0,
        max: 8,
        step: 1,
      },
    ],
  },
  {
    id: "scatter-chart",
    title: "Scatter chart",
    description:
      "Inspect paired values across a continuous time or numeric scale.",
    renderer: "ScatterChart",
    data: scatterData,
    defaultProps: {
      xDataKey: "date",
      xScale: "time",
      height: 248,
      aspectRatio: 2,
    },
    layers: chartLayers([
      { id: "grid", type: "Grid", horizontal: true, vertical: true },
      { id: "date-axis", type: "XAxis", numTicks: 4 },
      { id: "value-axis", type: "YAxis", numTicks: 4 },
      {
        id: "response",
        type: "Scatter",
        dataKey: "response",
        fill: "#397db5",
        radius: 5,
        yGradient: true,
      },
      {
        id: "throughput",
        type: "Scatter",
        dataKey: "throughput",
        fill: "#e5985d",
        radius: 4,
      },
      { id: "tooltip", type: "ChartTooltip" },
    ]),
    controls: [
      {
        key: "xScale",
        label: "X scale",
        type: "select",
        options: ["time", "linear", "category"],
      },
      {
        key: "animationDuration",
        label: "Reveal duration",
        type: "number",
        min: 0,
        max: 2400,
        step: 100,
      },
    ],
  },
  {
    id: "candlestick-chart",
    title: "Candlestick chart",
    description:
      "Read open, high, low, and close values for each time interval.",
    renderer: "CandlestickChart",
    data: candleData,
    defaultProps: { xDataKey: "date", height: 258, candleGap: 0.2 },
    layers: chartLayers([
      { id: "grid", type: "Grid", horizontal: true },
      { id: "date-axis", type: "XAxis", numTicks: 4 },
      { id: "value-axis", type: "YAxis", numTicks: 4 },
      {
        id: "candles",
        type: "Candlestick",
        positiveFill: "#16a34a",
        negativeFill: "#dc2626",
      },
      { id: "tooltip", type: "ChartTooltip" },
    ]),
    controls: [
      {
        key: "candleGap",
        label: "Candle gap",
        type: "number",
        min: 0,
        max: 0.65,
        step: 0.05,
      },
      {
        key: "candleWidth",
        label: "Candle width",
        type: "number",
        min: 6,
        max: 30,
        step: 1,
      },
    ],
  },
  {
    id: "live-line-chart",
    title: "Live line chart",
    description: "Follow a smoothed value as a rolling time window updates.",
    renderer: "LiveLineChart",
    data: liveData,
    defaultProps: {
      value: liveData.at(-1)?.value ?? 52,
      dataKey: "value",
      window: 20,
      numXTicks: 5,
      nowOffsetUnits: 0,
      exaggerate: false,
      lerpSpeed: 0.08,
      paused: false,
      height: 284,
    },
    layers: chartLayers([
      { id: "grid", type: "Grid", horizontal: true },
      { id: "time-axis", type: "LiveXAxis", numTicks: 5 },
      { id: "value-axis", type: "LiveYAxis", position: "left" },
      {
        id: "live-value",
        type: "LiveLine",
        dataKey: "value",
        stroke: "#397db5",
        fill: true,
        pulse: true,
        badge: true,
      },
      { id: "tooltip", type: "ChartTooltip" },
    ]),
    controls: [
      {
        key: "window",
        label: "Time window",
        type: "number",
        min: 8,
        max: 60,
        step: 4,
      },
      {
        key: "lerpSpeed",
        label: "Value smoothing",
        type: "number",
        min: 0.02,
        max: 0.3,
        step: 0.02,
      },
      { key: "exaggerate", label: "Tight value range", type: "boolean" },
      { key: "paused", label: "Pause stream", type: "boolean" },
    ],
  },
  {
    id: "profit-loss-line",
    title: "Profit and loss line",
    description:
      "Color a trend by sign and split its path at each zero crossing.",
    renderer: "ComposedChart",
    data: monthlyData.map(({ date, profit }) => ({ date, profit })),
    defaultProps: { xDataKey: "date", height: 248 },
    layers: chartLayers([
      { id: "grid", type: "Grid", horizontal: true },
      { id: "date-axis", type: "XAxis", numTicks: 4 },
      { id: "value-axis", type: "YAxis", numTicks: 4 },
      {
        id: "profit",
        type: "ProfitLossLine",
        dataKey: "profit",
        positiveColor: "#16a34a",
        negativeColor: "#dc2626",
        strokeWidth: 2.5,
      },
      { id: "tooltip", type: "ChartTooltip" },
    ]),
    controls: [
      {
        key: "animationDuration",
        label: "Reveal duration",
        type: "number",
        min: 0,
        max: 2400,
        step: 100,
      },
    ],
  },
];
