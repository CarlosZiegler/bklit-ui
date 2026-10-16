import { createContext, useContext } from "react";
import type { CartesianChartStatus } from "./cartesian-chart";
import type { CartesianModel, CartesianXScale } from "./cartesian-model";
import type { PlotPadding } from "./geometry";
import type { ChartTheme } from "./theme";

export interface NativeChartRange {
  start: Date | number;
  end: Date | number;
}

/** Hovered Cartesian datum; x and y positions are relative to the plot area. */
export interface NativeChartTooltipData {
  point: Record<string, unknown>;
  index: number;
  x: number;
  yPositions: Record<string, number>;
  xPositions?: Record<string, number>;
}

export interface NativeChartContextValue {
  data: readonly object[];
  selectedIndex: number | undefined;
  setSelectedIndex: (index: number | null) => void;
  tooltipData: NativeChartTooltipData | null;
  xDataKey: string;
  height: number;
  margins: Required<PlotPadding>;
  model: CartesianModel;
  plotHeight: number;
  plotWidth: number;
  range: NativeChartRange | null;
  setRange: (range: NativeChartRange | null) => void;
  xDomainSlotCount?: number;
  status: CartesianChartStatus;
  theme: Readonly<ChartTheme>;
  width: number;
  xDomain: readonly [number, number] | null;
  xScale: CartesianXScale;
}

export const NativeChartContext = createContext<NativeChartContextValue | null>(
  null
);

/** Reads the active CartesianChart's data, scales, dimensions, and selection. */
export function useChart(): NativeChartContextValue {
  const context = useContext(NativeChartContext);
  if (!context) {
    throw new Error(
      "useChart() must be called inside a native CartesianChart."
    );
  }
  return context;
}
