import type { ReactNode } from "react";
import {
  Area,
  CartesianChart,
  type CartesianChartProps,
  ChartTooltip,
  Grid,
  Line,
  type LineLayerProps,
  XAxis,
} from "./cartesian-chart";
import { ChartThemeProvider } from "./theme";

export interface LegacyLineChartProps<T extends object> {
  accessibilityLabel?: string;
  animate?: boolean;
  animationKey?: string | number;
  area?: boolean;
  color?: string;
  data: readonly T[];
  dataKey: keyof T & string;
  formatLabel?: (value: unknown) => string;
  formatValue?: (value: number) => string;
  gridColor?: string;
  height?: number;
  onSelectIndex?: (index: number) => void;
  selectedIndex?: number;
  surfaceColor?: string;
  strokeWidth?: number;
  textColor?: string;
  xKey: keyof T & string;
}

export type LineChartProps<T extends object> =
  | LegacyLineChartProps<T>
  | (CartesianChartProps<T> & { children?: ReactNode });

/**
 * Uses the compositional web-like API by default. The earlier single-series
 * props remain as an adapter so the first native prototype stays source
 * compatible.
 */
export function LineChart<T extends object>(props: LineChartProps<T>) {
  if (!("xKey" in props)) {
    return <CartesianChart {...props} />;
  }

  const {
    accessibilityLabel,
    animate,
    animationKey,
    area = true,
    color,
    data,
    dataKey,
    formatLabel,
    formatValue,
    gridColor,
    height,
    onSelectIndex,
    selectedIndex,
    surfaceColor,
    strokeWidth,
    textColor,
    xKey,
  } = props;
  const line: LineLayerProps = {
    animate,
    dataKey,
    stroke: color,
    strokeWidth,
  };
  const theme = {
    ...(color ? { color, seriesColors: [color] } : {}),
    ...(gridColor ? { gridColor } : {}),
    ...(surfaceColor ? { surfaceColor } : {}),
    ...(textColor ? { textColor } : {}),
  };

  return (
    <ChartThemeProvider theme={theme}>
      <CartesianChart
        accessibilityLabel={accessibilityLabel}
        animationKey={animationKey}
        data={data}
        height={height}
        onSelectIndex={onSelectIndex}
        selectedIndex={selectedIndex}
        xDataKey={xKey}
        xScale="category"
      >
        <Grid horizontal stroke={gridColor} />
        {area && (
          <Area
            animate={animate}
            dataKey={dataKey}
            fill={color}
            fillOpacity={0.1}
            showLine={false}
            stroke={color}
          />
        )}
        <Line {...line} />
        <XAxis formatTick={formatLabel} numTicks={3} />
        <ChartTooltip formatValue={formatValue} />
      </CartesianChart>
    </ChartThemeProvider>
  );
}
