import type { CurveFactory } from "d3-shape";

export const PROFIT_LOSS_POSITIVE_COLOR = "#16a34a";
export const PROFIT_LOSS_NEGATIVE_COLOR = "#dc2626";

export type NativeFadeEdges = boolean | "left" | "right";

/** Props shared with the web `ProfitLossLine` compositional marker. */
export interface ProfitLossLineProps {
  dataKey: string;
  xDataKey?: string;
  strokeWidth?: number;
  positiveColor?: string;
  negativeColor?: string;
  curve?: CurveFactory;
  fadeEdges?: NativeFadeEdges;
}

/**
 * Composable marker. CartesianChart recognizes its identity and paints the
 * sign-split paths in its plot coordinate space.
 */
export function ProfitLossLine(_props: ProfitLossLineProps): null {
  return null;
}

ProfitLossLine.displayName = "ProfitLossLine";

export interface ProfitLossPoint {
  index: number;
  x: number;
  value: number;
}

export interface ProfitLossSegment {
  isPositive: boolean;
  points: readonly ProfitLossPoint[];
}

/** Split finite samples around zero, inserting an interpolated zero crossing. */
export function splitProfitLossSegments(
  values: readonly number[],
  xPositions: readonly (number | null | undefined)[]
): ProfitLossSegment[] {
  const segments: ProfitLossSegment[] = [];
  let current: ProfitLossPoint[] = [];
  let sign: boolean | null = null;
  let previous: ProfitLossPoint | undefined;

  const flush = () => {
    if (current.length > 0) {
      segments.push({ isPositive: sign ?? true, points: current });
    }
    current = [];
    sign = null;
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const x = xPositions[index];
    if (
      value === undefined ||
      x === null ||
      x === undefined ||
      !Number.isFinite(value) ||
      !Number.isFinite(x)
    ) {
      flush();
      previous = undefined;
      continue;
    }
    const point = { index, x, value };
    if (!previous) {
      sign = value >= 0;
      current.push(point);
      previous = point;
      continue;
    }

    const isPositive = value >= 0;
    if (previous.value === 0 && sign !== null && isPositive !== sign) {
      const crossing = { ...previous };
      flush();
      current.push(crossing, point);
      sign = isPositive;
    } else if (sign !== null && isPositive !== sign && value !== 0) {
      const fraction = previous.value / (previous.value - value);
      const crossing = {
        index,
        x: previous.x + (x - previous.x) * fraction,
        value: 0,
      };
      current.push(crossing);
      flush();
      current.push(crossing, point);
      sign = isPositive;
    } else {
      if (value !== 0) {
        sign = isPositive;
      }
      current.push(point);
    }
    previous = point;
  }
  flush();
  return segments;
}
