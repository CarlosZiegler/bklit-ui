import { type CurveFactory, curveLinear, curveMonotoneX, line } from "d3-shape";
import type { CartesianXScale } from "../cartesian-model";

export type BarOrientation = "vertical" | "horizontal";

export interface NativeChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type NativeTextAnchor = "end" | "middle" | "start";

/** Insets an x scale so boundary glyphs keep their full width inside the plot. */
export function insetPlotRatio(
  ratio: number,
  plotWidth: number,
  padding: number
): number {
  const inset =
    plotWidth > 0 ? Math.min(0.5, Math.max(0, padding) / plotWidth) : 0.5;
  return inset + ratio * (1 - inset * 2);
}

/** Keeps boundary tick labels inside the plot while centering interior labels. */
export function resolveEndpointTextAnchor(
  index: number,
  count: number
): NativeTextAnchor {
  if (count <= 1) {
    return "middle";
  }
  if (index <= 0) {
    return "start";
  }
  if (index >= count - 1) {
    return "end";
  }
  return "middle";
}

/** Uses inward anchors for numeric axes whose first and last ticks touch edges. */
export function resolveRatioTextAnchor(ratio: number): NativeTextAnchor {
  if (ratio <= 0) {
    return "start";
  }
  if (ratio >= 1) {
    return "end";
  }
  return "middle";
}

/** Selects evenly spaced samples for category/date labels without crowding. */
export function selectTickIndices(length: number, maxTicks = 5): number[] {
  if (length <= 0 || maxTicks <= 0) {
    return [];
  }
  const count = Math.min(length, Math.floor(maxTicks));
  if (count === 1) {
    return [0];
  }
  return Array.from({ length: count }, (_, tick) =>
    Math.round((tick * (length - 1)) / (count - 1))
  );
}

export interface NativeDomainTick {
  ratio: number;
  value: number;
}

/** Builds evenly spaced numeric ticks from the chart's resolved x domain. */
export function buildDomainTicks(
  domain: readonly [number, number] | null,
  requestedCount = 5
): NativeDomainTick[] {
  if (!domain?.every(Number.isFinite)) {
    return [];
  }
  const [minimum, maximum] = domain;
  if (minimum === maximum) {
    return [{ ratio: 0.5, value: minimum }];
  }
  const count = Number.isFinite(requestedCount)
    ? Math.max(2, Math.floor(requestedCount))
    : 5;
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    return {
      ratio,
      value: minimum + (maximum - minimum) * ratio,
    };
  });
}

function estimateSvgTextWidth(
  label: string,
  fontSize: number,
  fontScale: number
): number {
  const glyphUnits = Array.from(label).reduce((width, character) => {
    if (" ilI1.,:;!'|".includes(character)) {
      return width + 0.32;
    }
    if ("MW@%&".includes(character)) {
      return width + 0.86;
    }
    if (character === " ") {
      return width + 0.3;
    }
    return width + 0.56;
  }, 0);
  return glyphUnits * fontSize * Math.max(0.75, fontScale);
}

/**
 * Selects endpoint-preserving data ticks that fit their formatted labels into
 * the measured plot width. Positions are normalized x coordinates from the
 * chart's actual scale, so irregular date spacing is handled naturally.
 */
export function selectReadableTickIndices(
  labels: readonly string[],
  positions: readonly (number | null | undefined)[],
  plotWidth: number,
  requestedCount = 5,
  fontScale = 1,
  fontSize = 10,
  gap = 6
): number[] {
  const length = Math.min(labels.length, positions.length);
  if (length <= 0 || !(plotWidth > 0)) {
    return [];
  }
  const candidates = Array.from({ length }, (_, index) => index).filter(
    (index) => {
      const position = positions[index];
      return typeof position === "number" && Number.isFinite(position);
    }
  );
  if (candidates.length <= 1) {
    return candidates;
  }

  const tickLimit = Math.min(
    candidates.length,
    Number.isFinite(requestedCount)
      ? Math.max(1, Math.floor(requestedCount))
      : 5
  );
  const first = candidates.at(0);
  const last = candidates.at(-1);
  if (first === undefined || last === undefined) {
    return [];
  }
  if (tickLimit === 1) {
    return [first];
  }

  const widthByIndex = new Map(
    candidates.map((index) => [
      index,
      estimateSvgTextWidth(labels[index] ?? "", fontSize, fontScale),
    ])
  );
  const bounds = (index: number) => {
    const x = (positions[index] ?? 0) * plotWidth;
    const labelWidth = widthByIndex.get(index) ?? 0;
    if (index === first) {
      return { left: x, right: x + labelWidth };
    }
    if (index === last) {
      return { left: x - labelWidth, right: x };
    }
    return { left: x - labelWidth / 2, right: x + labelWidth / 2 };
  };
  const fits = (index: number, selected: readonly number[]) => {
    const candidateBounds = bounds(index);
    return selected.every((selectedIndex) => {
      const selectedBounds = bounds(selectedIndex);
      return (
        candidateBounds.right + gap <= selectedBounds.left ||
        selectedBounds.right + gap <= candidateBounds.left
      );
    });
  };

  if (!fits(last, [first])) {
    return [first];
  }
  const selected = [first, last];
  const firstPosition = positions[first] ?? 0;
  const lastPosition = positions[last] ?? 1;
  const interiorCount = tickLimit - 2;
  for (let tick = 1; tick <= interiorCount; tick += 1) {
    const target =
      firstPosition +
      ((lastPosition - firstPosition) * tick) / (interiorCount + 1);
    const nearby = candidates
      .filter(
        (index) =>
          index !== first && index !== last && !selected.includes(index)
      )
      .sort(
        (a, b) =>
          Math.abs((positions[a] ?? 0) - target) -
          Math.abs((positions[b] ?? 0) - target)
      );
    const next = nearby.find((index) => fits(index, selected));
    if (next !== undefined) {
      selected.push(next);
    }
  }
  return selected.sort((a, b) => (positions[a] ?? 0) - (positions[b] ?? 0));
}

/** Caps time-axis density to the horizontal room available on a phone. */
export function resolveTickCountForWidth(
  requestedCount: number,
  plotWidth: number,
  minimumSpacing = 64
): number {
  const requested = Math.max(2, Math.floor(requestedCount));
  const spacing = Math.max(1, minimumSpacing);
  const available = Math.max(
    2,
    Math.floor(Math.max(0, plotWidth) / spacing) + 1
  );
  return Math.min(requested, available);
}

/** Claims intentional horizontal chart scrubs while leaving vertical drags to scrolling. */
export function isHorizontalPan(
  dx: number,
  dy: number,
  threshold = 8,
  dominance = 1.15
): boolean {
  const horizontalDistance = Math.abs(dx);
  return (
    horizontalDistance >= threshold &&
    horizontalDistance > Math.abs(dy) * Math.max(1, dominance)
  );
}

/** Formats local time as a compact 24-hour clock without locale AM/PM suffixes. */
export function format24HourTime(timeMs: number): string {
  const date = new Date(timeMs);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export interface NativeBarRect {
  dataIndex: number;
  dataKey: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  seriesIndex: number;
}

export interface NativeNumericTick {
  ratio: number;
  value: number;
}

export interface BarRectOptions<T extends object> {
  data: readonly T[];
  dataKeys: readonly string[];
  plot: { left: number; top: number; width: number; height: number };
  domain: readonly [number, number];
  orientation?: BarOrientation;
  stacked?: boolean;
  barGap?: number;
  barWidth?: number;
  maxBarWidth?: number;
  stackGap?: number;
  groupGaps?: readonly number[];
  stackGaps?: readonly number[];
}

function rowValue(row: object, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function resolveOneSidedDomain(
  minimum: number,
  maximum: number
): readonly [number, number] | null {
  if (minimum === 0 && maximum > 0) {
    return [0, maximum * 1.1];
  }
  if (maximum === 0 && minimum < 0) {
    return [minimum * 1.1, 0];
  }
  return null;
}

export function resolveValueDomain<T extends object>(
  data: readonly T[],
  dataKeys: readonly string[],
  stacked = false
): readonly [number, number] {
  let minimum = 0;
  let maximum = 0;
  for (const row of data) {
    let positiveTotal = 0;
    let negativeTotal = 0;
    for (const key of dataKeys) {
      const value = rowValue(row, key);
      if (value === null) {
        continue;
      }
      if (stacked) {
        if (value >= 0) {
          positiveTotal += value;
        } else {
          negativeTotal += value;
        }
      } else {
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    }
    if (stacked) {
      minimum = Math.min(minimum, negativeTotal);
      maximum = Math.max(maximum, positiveTotal);
    }
  }
  if (minimum === maximum) {
    return minimum === 0 ? [0, 1] : [minimum - 1, maximum + 1];
  }
  // Match the web BarChart's zero baseline for one-sided data. For the
  // positive-only case, its value scale is `[0, max * 1.1]`; mirror that
  // behavior while keeping negative-only samples visible on the other side.
  const oneSidedDomain = resolveOneSidedDomain(minimum, maximum);
  if (oneSidedDomain) {
    return oneSidedDomain;
  }
  const padding = (maximum - minimum) * 0.06;
  return [minimum - padding, maximum + padding];
}

function niceStep(target: number): number {
  if (!(target > 0 && Number.isFinite(target))) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(target));
  const error = target / power;
  let multiplier = 1;
  if (error >= Math.sqrt(50)) {
    multiplier = 10;
  } else if (error >= Math.sqrt(10)) {
    multiplier = 5;
  } else if (error >= Math.sqrt(2)) {
    multiplier = 2;
  }
  return multiplier * power;
}

/** Builds readable bar-axis ticks, using the web chart's zero baseline. */
export function buildBarNumericTicks(
  domain: readonly [number, number],
  count: number,
  orientation: BarOrientation
): NativeNumericTick[] {
  const tickCount = Math.max(2, Math.floor(count));
  const [minimum, maximum] = domain;
  if (minimum === 0 && maximum > 0 && Number.isFinite(maximum)) {
    const step = niceStep(maximum / tickCount);
    const values: number[] = [];
    for (let value = 0; value <= maximum + step * 1e-9; value += step) {
      values.push(Number(value.toPrecision(12)));
    }
    if (orientation === "vertical") {
      values.reverse();
    }
    return values.map((value) => ({
      ratio:
        orientation === "vertical"
          ? (maximum - value) / maximum
          : value / maximum,
      value,
    }));
  }
  return Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const value =
      orientation === "vertical"
        ? maximum - ratio * (maximum - minimum)
        : minimum + ratio * (maximum - minimum);
    return { ratio, value };
  });
}

export function projectBarRectangles<T extends object>(
  options: BarRectOptions<T>
): NativeBarRect[] {
  const {
    data,
    dataKeys,
    plot,
    domain,
    orientation = "vertical",
    stacked = false,
    barGap = 0.2,
    barWidth,
    maxBarWidth = Number.POSITIVE_INFINITY,
    stackGap = 0,
    groupGaps,
    stackGaps,
  } = options;
  if (data.length === 0 || dataKeys.length === 0) {
    return [];
  }
  const horizontal = orientation === "horizontal";
  const primaryLength = horizontal ? plot.height : plot.width;
  const bandLength = primaryLength / data.length;
  const sidePadding = (bandLength * Math.max(0, Math.min(0.9, barGap))) / 2;
  const availableBand = Math.max(0, bandLength - sidePadding * 2);
  const groupCount = stacked ? 1 : dataKeys.length;
  const requestedGaps = Array.from(
    { length: Math.max(0, groupCount - 1) },
    (_, index) => Math.max(0, groupGaps?.[index] ?? groupGaps?.[0] ?? 4)
  );
  const requestedGapsWidth = requestedGaps.reduce((sum, gap) => sum + gap, 0);
  const gapScale =
    requestedGapsWidth > availableBand && requestedGapsWidth > 0
      ? availableBand / requestedGapsWidth
      : 1;
  const resolvedGaps = requestedGaps.map((gap) => gap * gapScale);
  const gapsWidth = resolvedGaps.reduce((sum, gap) => sum + gap, 0);
  const naturalSize = Math.max(
    0,
    (availableBand - gapsWidth) / Math.max(1, groupCount)
  );
  const size = Math.min(
    naturalSize,
    Math.max(0, barWidth ?? naturalSize),
    Math.max(0, maxBarWidth)
  );
  const groupSize = groupCount * size + gapsWidth;
  const [minimum, maximum] = domain;
  const valueCoordinate = (value: number) => {
    const ratio = (value - minimum) / (maximum - minimum || 1);
    return horizontal
      ? plot.left + ratio * plot.width
      : plot.top + plot.height - ratio * plot.height;
  };
  const bars: NativeBarRect[] = [];
  for (let dataIndex = 0; dataIndex < data.length; dataIndex += 1) {
    const row = data[dataIndex];
    if (!row) {
      continue;
    }
    const stack = { positive: 0, negative: 0 };
    for (let seriesIndex = 0; seriesIndex < dataKeys.length; seriesIndex += 1) {
      const dataKey = dataKeys[seriesIndex];
      if (!dataKey) {
        continue;
      }
      const value = rowValue(row, dataKey);
      if (value === null) {
        continue;
      }
      const start = getStackStart(value, stacked, stack);
      const end = start + value;
      updateStack(value, stacked, end, stack);
      bars.push(
        projectOneBar({
          dataIndex,
          dataKey,
          value,
          seriesIndex,
          seriesCount: dataKeys.length,
          stacked,
          horizontal,
          plot,
          bandLength,
          groupSize,
          size,
          stackGap: stackGaps?.[seriesIndex] ?? stackGap,
          groupGaps: resolvedGaps,
          start,
          end,
          valueCoordinate,
        })
      );
    }
  }
  return bars;
}

function getStackStart(
  value: number,
  stacked: boolean,
  stack: { positive: number; negative: number }
): number {
  if (!stacked) {
    return 0;
  }
  return value >= 0 ? stack.positive : stack.negative;
}

function updateStack(
  value: number,
  stacked: boolean,
  end: number,
  stack: { positive: number; negative: number }
): void {
  if (!stacked) {
    return;
  }
  if (value >= 0) {
    stack.positive = end;
  } else {
    stack.negative = end;
  }
}

function projectOneBar(input: {
  dataIndex: number;
  dataKey: string;
  value: number;
  seriesIndex: number;
  seriesCount: number;
  stacked: boolean;
  horizontal: boolean;
  plot: BarRectOptions<object>["plot"];
  bandLength: number;
  groupSize: number;
  size: number;
  stackGap: number;
  groupGaps: readonly number[];
  start: number;
  end: number;
  valueCoordinate: (value: number) => number;
}): NativeBarRect {
  const {
    dataIndex,
    dataKey,
    value,
    seriesIndex,
    seriesCount,
    stacked,
    horizontal,
    plot,
    bandLength,
    groupSize,
    size,
    stackGap,
    groupGaps,
    start,
    end,
    valueCoordinate,
  } = input;
  const startCoordinate = valueCoordinate(start);
  const endCoordinate = valueCoordinate(end);
  const segmentStart = Math.min(startCoordinate, endCoordinate);
  const segmentSize = Math.abs(endCoordinate - startCoordinate);
  const visibleSize =
    stacked && seriesCount > 1
      ? Math.max(0, segmentSize - Math.max(0, stackGap))
      : segmentSize;
  const categoryStart =
    (horizontal ? plot.top : plot.left) + dataIndex * bandLength;
  const groupStart = categoryStart + (bandLength - groupSize) / 2;
  const gapBefore = groupGaps
    .slice(0, seriesIndex)
    .reduce((sum, gap) => sum + gap, 0);
  const position = stacked
    ? groupStart
    : groupStart + seriesIndex * size + gapBefore;
  if (horizontal) {
    return {
      dataIndex,
      dataKey,
      value,
      x: segmentStart,
      y: position,
      width: visibleSize,
      height: size,
      seriesIndex,
    };
  }
  return {
    dataIndex,
    dataKey,
    value,
    x: position,
    y:
      segmentStart +
      (visibleSize < segmentSize ? segmentSize - visibleSize : 0),
    width: size,
    height: visibleSize,
    seriesIndex,
  };
}

export interface CandleDatum {
  date?: Date | string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  [key: string]: unknown;
}

export interface CandleGlyph {
  index: number;
  x: number;
  bodyTop: number;
  bodyBottom: number;
  wickTop: number;
  wickBottom: number;
  width: number;
  open: number;
  close: number;
  positive: boolean;
}

export function projectCandles<T extends CandleDatum>(options: {
  data: readonly T[];
  xPositions: readonly (number | null | undefined)[];
  plot: { left: number; top: number; width: number; height: number };
  domain: readonly [number, number];
  candleGap?: number;
  candleWidth?: number;
}): CandleGlyph[] {
  const {
    data,
    xPositions,
    plot,
    domain,
    candleGap = 0.2,
    candleWidth,
  } = options;
  const [minimum, maximum] = domain;
  const coordinate = (value: number) =>
    plot.top + ((maximum - value) / (maximum - minimum || 1)) * plot.height;
  const slotWidth = plot.width / Math.max(1, data.length);
  const width = Math.min(
    slotWidth,
    Math.max(1, candleWidth ?? slotWidth * (1 - candleGap))
  );
  return data.flatMap((datum, index) => {
    const xRatio = xPositions[index];
    if (
      xRatio === null ||
      xRatio === undefined ||
      ![datum.open, datum.high, datum.low, datum.close].every(Number.isFinite)
    ) {
      return [];
    }
    const openY = coordinate(datum.open);
    const closeY = coordinate(datum.close);
    const highY = coordinate(datum.high);
    const lowY = coordinate(datum.low);
    return [
      {
        index,
        x: plot.left + xRatio * plot.width,
        bodyTop: Math.min(openY, closeY),
        bodyBottom: Math.max(openY, closeY),
        wickTop: Math.min(highY, lowY),
        wickBottom: Math.max(highY, lowY),
        width,
        open: datum.open,
        close: datum.close,
        positive: datum.close >= datum.open,
      },
    ];
  });
}

export function buildLinePath(
  points: readonly { x: number; y: number }[],
  curve: CurveFactory | "linear" | "monotone" = "monotone"
): string {
  if (points.length === 0) {
    return "";
  }
  let resolvedCurve: CurveFactory;
  if (typeof curve !== "string") {
    resolvedCurve = curve;
  } else if (curve === "linear") {
    resolvedCurve = curveLinear;
  } else {
    resolvedCurve = curveMonotoneX;
  }
  const generator = line<{ x: number; y: number }>()
    .x((point) => point.x)
    .y((point) => point.y)
    .curve(resolvedCurve);
  return generator(points) ?? "";
}

interface SeriesPathPoint {
  index?: number;
  x: number;
  y: number;
}

function splitSeriesPathPoints(points: readonly SeriesPathPoint[]) {
  const segments: SeriesPathPoint[][] = [];
  for (const point of points) {
    const current = segments.at(-1);
    const previous = current?.at(-1);
    if (
      !current ||
      (point.index !== undefined &&
        previous?.index !== undefined &&
        point.index !== previous.index + 1)
    ) {
      segments.push([point]);
    } else {
      current.push(point);
    }
  }
  return segments;
}

/** Applies a d3 curve to each finite segment without connecting data gaps. */
export function buildSeriesLinePath(
  points: readonly SeriesPathPoint[],
  curve: CurveFactory
): string {
  return splitSeriesPathPoints(points)
    .map((segment) => buildLinePath(segment, curve))
    .filter(Boolean)
    .join(" ");
}

/** Closes each curved segment to the chart baseline for an area fill. */
export function buildSeriesAreaPath(
  points: readonly SeriesPathPoint[],
  baselineY: number,
  curve: CurveFactory
): string {
  return splitSeriesPathPoints(points)
    .map((segment) => {
      const first = segment[0];
      const last = segment.at(-1);
      if (!(first && last)) {
        return "";
      }
      return `${buildLinePath(segment, curve)} L${last.x} ${baselineY} L${first.x} ${baselineY} Z`;
    })
    .filter(Boolean)
    .join(" ");
}

export function readNativeX(value: unknown, scale: CartesianXScale): number {
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
