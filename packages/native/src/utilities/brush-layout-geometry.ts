import type { NativeChartRange } from "../chart-context";

function timestamp(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  return typeof value === "string" || typeof value === "number"
    ? new Date(value).getTime()
    : Number.NaN;
}

/** Full calendar extent shared by the overview brush and zoomed chart. */
export function resolveBrushTimeExtent(
  data: readonly object[],
  xDataKey: string,
  xExtentMax?: Date
): readonly [number, number] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const row of data) {
    const time = timestamp((row as Record<string, unknown>)[xDataKey]);
    if (Number.isFinite(time)) {
      min = Math.min(min, time);
      max = Math.max(max, time);
    }
  }
  if (!Number.isFinite(min)) {
    return null;
  }
  const horizon = xExtentMax?.getTime();
  if (horizon !== undefined && Number.isFinite(horizon)) {
    max = Math.max(max, horizon);
  }
  return [min, max];
}

/** Clamp a reversed or out-of-bounds gesture to the available overview data. */
export function resolveBrushTimeSelection(
  selection: NativeChartRange | null,
  extent: readonly [number, number] | null
): NativeChartRange | null {
  if (!extent) {
    return null;
  }
  const first = selection ? timestamp(selection.start) : extent[0];
  const second = selection ? timestamp(selection.end) : extent[1];
  if (!(Number.isFinite(first) && Number.isFinite(second))) {
    return { start: new Date(extent[0]), end: new Date(extent[1]) };
  }
  return {
    start: new Date(
      Math.max(extent[0], Math.min(extent[1], Math.min(first, second)))
    ),
    end: new Date(
      Math.max(extent[0], Math.min(extent[1], Math.max(first, second)))
    ),
  };
}
