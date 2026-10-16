import type { CartesianModel, CartesianXScale } from "../cartesian-model";
import type { PlotPadding } from "../geometry";

export type NativeDomainEndpoint = Date | number;

export interface NativeDomainRange {
  start: NativeDomainEndpoint;
  end: NativeDomainEndpoint;
}

export interface NativeReferenceAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolveReferenceAreaRectOptions {
  width: number;
  height: number;
  margins: Required<PlotPadding>;
  model: CartesianModel;
  x1?: NativeDomainEndpoint;
  x2?: NativeDomainEndpoint;
  y1?: number;
  y2?: number;
  ifOverflow?: "hidden" | "visible" | "discard";
}

function numberValue(value: NativeDomainEndpoint): number {
  return value instanceof Date ? value.getTime() : value;
}

function clampRect(
  rect: NativeReferenceAreaRect,
  bounds: NativeReferenceAreaRect
): NativeReferenceAreaRect | null {
  const left = Math.max(rect.x, bounds.x);
  const top = Math.max(rect.y, bounds.y);
  const right = Math.min(rect.x + rect.width, bounds.x + bounds.width);
  const bottom = Math.min(rect.y + rect.height, bounds.y + bounds.height);
  if (right <= left || bottom <= top) {
    return null;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function containsRect(
  rect: NativeReferenceAreaRect,
  bounds: NativeReferenceAreaRect
): boolean {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.width <= bounds.x + bounds.width &&
    rect.y + rect.height <= bounds.y + bounds.height
  );
}

/**
 * Maps reference-area data bounds into the chart's full SVG coordinate space.
 * This follows the web helper's hidden/visible/discard overflow semantics.
 */
export function resolveReferenceAreaRect({
  width,
  height,
  margins,
  model,
  x1,
  x2,
  y1,
  y2,
  ifOverflow = "hidden",
}: ResolveReferenceAreaRectOptions): NativeReferenceAreaRect | null {
  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const plotHeight = Math.max(0, height - margins.top - margins.bottom);
  if (plotWidth <= 0 || plotHeight <= 0) {
    return null;
  }

  const leftRatio = x1 === undefined ? 0 : model.xToRatio(x1);
  const rightRatio = x2 === undefined ? 1 : model.xToRatio(x2);
  const firstY = y1 === undefined ? margins.top : model.yToCoordinate(y1);
  const secondY =
    y2 === undefined ? height - margins.bottom : model.yToCoordinate(y2);
  if (
    leftRatio === null ||
    rightRatio === null ||
    firstY === null ||
    secondY === null
  ) {
    return null;
  }

  const left = margins.left + leftRatio * plotWidth;
  const right = margins.left + rightRatio * plotWidth;
  const rect: NativeReferenceAreaRect = {
    x: Math.min(left, right),
    y: Math.min(firstY, secondY),
    width: Math.abs(right - left),
    height: Math.abs(secondY - firstY),
  };
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const bounds: NativeReferenceAreaRect = {
    x: margins.left,
    y: margins.top,
    width: plotWidth,
    height: plotHeight,
  };
  if (ifOverflow === "visible") {
    return rect;
  }
  if (ifOverflow === "discard") {
    return containsRect(rect, bounds) ? rect : null;
  }
  return clampRect(rect, bounds);
}

/** Ratio along a native x domain, matching CartesianModel's category positions. */
export function domainValueToRatio(
  value: NativeDomainEndpoint,
  domain: readonly [number, number] | null,
  xScale: CartesianXScale
): number | null {
  if (!domain) {
    return null;
  }
  const numeric = numberValue(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (domain[0] === domain[1]) {
    return 0.5;
  }
  if (xScale === "category" && !Number.isInteger(numeric)) {
    return null;
  }
  return (numeric - domain[0]) / (domain[1] - domain[0]);
}

/** Converts a plot-relative ratio into the chart's x-domain value. */
export function ratioToDomainValue(
  ratio: number,
  domain: readonly [number, number] | null,
  xScale: CartesianXScale,
  categoryCount: number
): number | null {
  if (!(domain && Number.isFinite(ratio))) {
    return null;
  }
  const clamped = Math.min(1, Math.max(0, ratio));
  const value = domain[0] + clamped * (domain[1] - domain[0]);
  if (xScale === "category") {
    return Math.min(Math.max(0, categoryCount - 1), Math.round(value));
  }
  return value;
}

/** Horizontal-tangent S-curve used by web ProjectionLine's bezier mode. */
export function buildHorizontalTangentBezierPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tension = 0.45
): string {
  const dx = x1 - x0;
  if (Math.abs(dx) < 1e-6) {
    return `M ${x0},${y0} L ${x1},${y1}`;
  }
  const safeTension = Math.min(0.5, Math.max(0.05, tension));
  return `M ${x0},${y0} C ${x0 + dx * safeTension},${y0} ${x1 - dx * safeTension},${y1} ${x1},${y1}`;
}

/** Converts Date/numeric brush endpoints to monotonically ordered values. */
export function normalizeDomainRange<T extends NativeDomainEndpoint>(
  start: T,
  end: T
): { start: T; end: T } {
  return numberValue(start) <= numberValue(end)
    ? { start, end }
    : { start: end, end: start };
}
