import { CartesianChart, type CartesianChartProps } from "../cartesian-chart";

export interface ComposedChartProps<T extends object>
  extends CartesianChartProps<T> {
  /** Web-compatible x key (time values use Date, ISO strings, or milliseconds). */
  xDataKey?: keyof T & string;
  /** Reveal reset token from the web API. */
  revealSignature?: string;
  barSize?: number;
  maxBarSize?: number;
  barGap?: number;
  stacked?: boolean;
  stackGap?: number;
}

/**
 * Native composed charts share CartesianChart's coordinate model and layers.
 * `SeriesBar` and `ProfitLossLine` are identity markers consumed by that
 * renderer; Line and Area remain the same exported markers used elsewhere.
 */
export function ComposedChart<T extends object>({
  data,
  xDataKey = "date" as keyof T & string,
  xScale = "time",
  margin,
  animationDuration = 1100,
  animationKey,
  revealSignature,
  barSize,
  maxBarSize,
  barGap,
  stacked,
  stackGap,
  height = 240,
  onSelectIndex,
  selectedIndex,
  accessibilityLabel = "Composed chart",
  status,
  statusLabel,
  style,
  children,
}: ComposedChartProps<T>) {
  return (
    <CartesianChart
      accessibilityLabel={accessibilityLabel}
      animationDuration={animationDuration}
      animationKey={animationKey ?? revealSignature}
      barGap={barGap}
      barSize={barSize}
      data={data}
      height={height}
      margin={margin}
      maxBarSize={maxBarSize}
      onSelectIndex={onSelectIndex}
      selectedIndex={selectedIndex}
      stacked={stacked}
      stackGap={stackGap}
      status={status}
      statusLabel={statusLabel}
      style={style}
      xDataKey={xDataKey}
      xScale={xScale}
    >
      {children}
    </CartesianChart>
  );
}

ComposedChart.displayName = "ComposedChart";
