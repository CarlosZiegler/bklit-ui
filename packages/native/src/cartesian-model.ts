import {
  createSeriesGeometry,
  type LineGeometry,
  type PlotPadding,
} from "./geometry";

/** X values supported by the native cartesian scale resolver. */
export type CartesianXScale = "category" | "linear" | "time";

export interface CartesianModelOptions<T extends object> {
  data: readonly T[];
  dataKeys: readonly string[];
  height: number;
  margin?: PlotPadding;
  width: number;
  xDataKey: keyof T & string;
  xScale: CartesianXScale;
  xDomain?: readonly [number, number];
  categoryBandCenter?: boolean;
  yDomain?: readonly [number, number];
  additionalYValues?: readonly number[];
  additionalXValues?: readonly number[];
}

/**
 * Immutable scale and geometry result shared by native cartesian renderers.
 * Every series receives the same x positions and y domain, so overlays remain
 * aligned even when their values or timestamps contain gaps.
 */
export interface CartesianModel {
  geometries: ReadonlyMap<string, LineGeometry>;
  margins: Required<PlotPadding>;
  xDomain: readonly [number, number] | null;
  xPositions: readonly (number | null)[];
  xToRatio: (value: unknown) => number | null;
  yDomain: readonly [number, number] | null;
  yToCoordinate: (value: number) => number | null;
}

export function readCartesianX(value: unknown, scale: CartesianXScale): number {
  if (scale === "time") {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return Date.parse(value);
    }
    return Number.NaN;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

function deriveDomain(
  values: readonly number[]
): readonly [number, number] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (!Number.isFinite(min)) {
    return null;
  }
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, 1);
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

function xExtent(
  groups: readonly (readonly number[])[]
): readonly [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const values of groups) {
    for (const value of values) {
      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }
  return [min, max];
}

function categoryRatio(index: number, count: number, bandCenter: boolean) {
  if (bandCenter) {
    return (index + 0.5) / Math.max(1, count);
  }
  return count < 2 ? 0.5 : index / (count - 1);
}

function resolveYDomain(
  values: readonly number[],
  requested: readonly [number, number] | undefined
): readonly [number, number] | null {
  if (
    requested &&
    Number.isFinite(requested[0]) &&
    Number.isFinite(requested[1]) &&
    requested[0] < requested[1]
  ) {
    return requested;
  }
  return deriveDomain(values);
}

function resolveMargins(
  margin: PlotPadding | undefined
): Required<PlotPadding> {
  const read = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) ? Math.max(0, value as number) : fallback;
  return {
    bottom: read(margin?.bottom, 8),
    left: read(margin?.left, 4),
    right: read(margin?.right, 4),
    top: read(margin?.top, 8),
  };
}

function readValue(row: object, key: string): number {
  const value = (row as Record<string, unknown>)[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

function isValidDomain(
  domain: readonly [number, number] | undefined
): domain is readonly [number, number] {
  return Boolean(
    domain &&
      Number.isFinite(domain[0]) &&
      Number.isFinite(domain[1]) &&
      domain[0] < domain[1]
  );
}

function resolveXDomain(
  scale: CartesianXScale,
  requested: readonly [number, number] | undefined
): readonly [number, number] | undefined {
  if (scale === "category" || !isValidDomain(requested)) {
    return undefined;
  }
  return requested;
}

function visibleIndicesForDomain(
  values: readonly number[],
  domain: readonly [number, number] | undefined
): Set<number> {
  const visible = new Set<number>();
  if (!domain) {
    values.forEach((_value, index) => {
      visible.add(index);
    });
    return visible;
  }

  let before: { index: number; value: number } | undefined;
  let after: { index: number; value: number } | undefined;
  for (const [index, value] of values.entries()) {
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value >= domain[0] && value <= domain[1]) {
      visible.add(index);
    } else if (value < domain[0] && (!before || value > before.value)) {
      before = { index, value };
    } else if (value > domain[1] && (!after || value < after.value)) {
      after = { index, value };
    }
  }
  if (before) {
    visible.add(before.index);
  }
  if (after) {
    visible.add(after.index);
  }
  return visible;
}

function visibleValuesForDomain<T extends object>(
  data: readonly T[],
  dataKeys: readonly string[],
  xPositions: readonly (number | null)[],
  visibleIndices: ReadonlySet<number>,
  additionalYValues: readonly number[]
): number[] {
  const values: number[] = [...additionalYValues];
  data.forEach((row, index) => {
    if (xPositions[index] === null || !visibleIndices.has(index)) {
      return;
    }
    for (const key of dataKeys) {
      values.push(readValue(row, key));
    }
  });
  return values;
}

export function createCartesianModel<T extends object>(
  options: CartesianModelOptions<T>
): CartesianModel {
  const {
    additionalYValues = [],
    additionalXValues = [],
    categoryBandCenter = false,
    data,
    dataKeys,
    height,
    margin,
    width,
    xDataKey,
    xScale,
    xDomain: requestedXDomain,
    yDomain,
  } = options;
  const margins = resolveMargins(margin);
  const rawXValues = data.map((row) => readCartesianX(row[xDataKey], xScale));
  const effectiveXDomain = resolveXDomain(xScale, requestedXDomain);
  let xDomain: readonly [number, number] | null = null;
  let xPositions: Array<number | null>;

  if (xScale === "category") {
    xPositions = data.map((_, index) =>
      categoryRatio(index, data.length, categoryBandCenter)
    );
    xDomain = data.length === 0 ? null : [0, Math.max(0, data.length - 1)];
  } else {
    // A one-point or flat domain remains centered. The public domain retains
    // the original value so formatter and inspection APIs stay intuitive.
    // Avoid argument-spread limits on large input arrays (also engine-specific).
    const [min, max] = xExtent([rawXValues, additionalXValues]);
    let resolvedDomain: readonly [number, number] | undefined;
    if (effectiveXDomain) {
      resolvedDomain = effectiveXDomain;
    } else if (Number.isFinite(min) && Number.isFinite(max)) {
      resolvedDomain = [min, max];
    }
    xDomain = resolvedDomain ?? null;
    const domainMin = resolvedDomain?.[0] ?? min;
    const domainMax = resolvedDomain?.[1] ?? max;
    xPositions = rawXValues.map((value) => {
      if (
        !(
          Number.isFinite(value) &&
          Number.isFinite(domainMin) &&
          Number.isFinite(domainMax)
        )
      ) {
        return null;
      }
      if (domainMin === domainMax) {
        return 0.5;
      }
      return (value - domainMin) / (domainMax - domainMin);
    });
  }

  const visibleIndices = visibleIndicesForDomain(rawXValues, effectiveXDomain);

  const valuesForDomain = visibleValuesForDomain(
    data,
    dataKeys,
    xPositions,
    visibleIndices,
    additionalYValues
  );
  const resolvedYDomain = resolveYDomain(valuesForDomain, yDomain);
  const geometries = new Map<string, LineGeometry>();
  if (resolvedYDomain) {
    for (const key of dataKeys) {
      geometries.set(
        key,
        createSeriesGeometry(
          data.map((row) => readValue(row, key)),
          xPositions,
          width,
          height,
          margins,
          resolvedYDomain
        )
      );
    }
  }

  const xToRatio = (value: unknown): number | null => {
    if (xScale === "category") {
      const index = readCartesianX(value, "linear");
      if (!(Number.isInteger(index) && index >= 0 && index < data.length)) {
        return null;
      }
      return categoryRatio(index, data.length, categoryBandCenter);
    }
    const numeric = readCartesianX(value, xScale);
    if (!(Number.isFinite(numeric) && xDomain)) {
      return null;
    }
    if (xDomain[0] === xDomain[1]) {
      return 0.5;
    }
    return (numeric - xDomain[0]) / (xDomain[1] - xDomain[0]);
  };
  const yToCoordinate = (value: number): number | null => {
    if (!(Number.isFinite(value) && resolvedYDomain)) {
      return null;
    }
    const plotHeight = Math.max(0, height - margins.top - margins.bottom);
    const [min, max] = resolvedYDomain;
    return margins.top + ((max - value) / (max - min)) * plotHeight;
  };

  return {
    geometries,
    margins,
    xDomain,
    xPositions,
    xToRatio,
    yDomain: resolvedYDomain,
    yToCoordinate,
  };
}
