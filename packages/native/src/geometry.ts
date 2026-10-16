import { createSmoothPaths } from "./geometry-paths";

export interface ChartPoint {
  index: number;
  value: number;
  x: number;
  y: number;
}

export interface LineGeometry {
  areaPath: string;
  max: number | null;
  min: number | null;
  path: string;
  pathLength: number;
  points: ChartPoint[];
}

export interface PlotPadding {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
}

const DEFAULT_PADDING: Required<PlotPadding> = {
  bottom: 8,
  left: 4,
  right: 4,
  top: 8,
};

/**
 * Turns a numeric series into SVG coordinates. Invalid values are skipped,
 * while their original x positions are kept as real breaks in the line.
 */
export function createLineGeometry(
  values: readonly number[],
  width: number,
  height: number,
  padding: PlotPadding = DEFAULT_PADDING
): LineGeometry {
  const xRatios = values.map((_, index) =>
    values.length === 1 ? 0.5 : index / (values.length - 1)
  );
  return createSeriesGeometry(values, xRatios, width, height, padding);
}

/**
 * Maps one numeric series using caller-resolved x positions and a shared y domain.
 * Null, missing, or non-finite positions split the line instead of bridging gaps.
 */
export function createSeriesGeometry(
  values: readonly number[],
  xRatios: readonly (number | null | undefined)[],
  width: number,
  height: number,
  padding: PlotPadding = DEFAULT_PADDING,
  domain?: readonly [number, number]
): LineGeometry {
  const empty: LineGeometry = {
    areaPath: "",
    max: null,
    min: null,
    path: "",
    pathLength: 0,
    points: [],
  };

  if (
    values.length === 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return empty;
  }

  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const resolvePadding = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) ? Math.max(0, value as number) : fallback;
  const resolvedPadding = {
    bottom: resolvePadding(padding.bottom, DEFAULT_PADDING.bottom),
    left: resolvePadding(padding.left, DEFAULT_PADDING.left),
    right: resolvePadding(padding.right, DEFAULT_PADDING.right),
    top: resolvePadding(padding.top, DEFAULT_PADDING.top),
  };
  const plotWidth = Math.max(
    0,
    safeWidth - resolvedPadding.left - resolvedPadding.right
  );
  const plotHeight = Math.max(
    0,
    safeHeight - resolvedPadding.top - resolvedPadding.bottom
  );
  const finite = values.flatMap((value, index) => {
    const xRatio = xRatios[index];
    return Number.isFinite(value) && Number.isFinite(xRatio)
      ? [{ index, value, xRatio: xRatio as number }]
      : [];
  });

  if (finite.length === 0) {
    return empty;
  }

  const domainIsValid =
    domain !== undefined &&
    Number.isFinite(domain[0]) &&
    Number.isFinite(domain[1]) &&
    domain[1] > domain[0];
  let min: number;
  let max: number;
  if (domainIsValid && domain) {
    [min, max] = domain;
  } else {
    min = Number.POSITIVE_INFINITY;
    max = Number.NEGATIVE_INFINITY;
    for (const { value } of finite) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    if (min === max) {
      const pad = Math.max(Math.abs(min) * 0.05, 1);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.08;
      min -= pad;
      max += pad;
    }
  }

  const points = finite.map(({ index, value, xRatio }): ChartPoint => {
    const yRatio = (max - value) / (max - min);
    return {
      index,
      value,
      x: resolvedPadding.left + xRatio * plotWidth,
      y: resolvedPadding.top + yRatio * plotHeight,
    };
  });

  const smoothPaths = createSmoothPaths(
    points,
    safeHeight - resolvedPadding.bottom
  );
  return {
    areaPath: smoothPaths.areaPath,
    max,
    min,
    path: smoothPaths.path,
    pathLength: smoothPaths.pathLength,
    points,
  };
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
