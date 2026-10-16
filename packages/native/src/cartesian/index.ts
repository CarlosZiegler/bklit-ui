// biome-ignore-all lint/performance/noBarrelFile: this is the native Cartesian chart entry point.

export type {
  BarAnimationType,
  BarChartProps,
  BarLineCap,
  BarOrientation,
  BarProps,
  BarXAxisProps,
  BarYAxisProps,
} from "./bar-chart";
export { Bar, BarChart, BarXAxis, BarYAxis } from "./bar-chart";
export type {
  CandlestickChartProps,
  CandlestickProps,
  OHLCDataPoint,
} from "./candlestick-chart";
export { Candlestick, CandlestickChart } from "./candlestick-chart";
export type { ComposedChartProps } from "./composed-chart";
export { ComposedChart } from "./composed-chart";
export type {
  CandleDatum,
  CandleGlyph,
  NativeBarRect,
  NativeChartMargin,
} from "./geometry";
export {
  buildLinePath,
  projectBarRectangles,
  projectCandles,
  readNativeX,
  resolveValueDomain,
} from "./geometry";
export type {
  LiveLineChartProps,
  LiveLinePoint,
  LiveLineProps,
  LiveXAxisProps,
  LiveYAxisProps,
  Momentum,
  MomentumColors,
} from "./live-line-chart";
export {
  detectMomentum,
  LiveLine,
  LiveLineChart,
  LiveXAxis,
  LiveYAxis,
} from "./live-line-chart";
export type {
  NativeFadeEdges,
  ProfitLossLineProps,
  ProfitLossPoint,
  ProfitLossSegment,
} from "./profit-loss-line";
export {
  PROFIT_LOSS_NEGATIVE_COLOR,
  PROFIT_LOSS_POSITIVE_COLOR,
  ProfitLossLine,
  splitProfitLossSegments,
} from "./profit-loss-line";
export type { ScatterChartProps, ScatterProps } from "./scatter-chart";
export { Scatter, ScatterChart } from "./scatter-chart";
export type { SeriesBarProps } from "./series-bar";
export { SeriesBar } from "./series-bar";
