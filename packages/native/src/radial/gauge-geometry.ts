import { clamp } from "./geometry";

export interface GaugePoint {
  x: number;
  y: number;
}

export interface GaugeNotch {
  index: number;
  active: boolean;
  points: readonly GaugePoint[];
  path: string;
}

export interface GaugeNotchOptions {
  width: number;
  height: number;
  value: number;
  totalNotches?: number;
  spacing?: number;
  notchCornerRadius?: number;
  uniformWidth?: boolean;
  startAngle?: number;
  endAngle?: number;
  orientation?: "arc" | "linear";
  notchLengthPercent?: number;
  notchWidthPercent?: number;
}

const format = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : "0";
const HEX_COLOR = /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function createRoundedPolygonPath(
  points: readonly GaugePoint[],
  radius = 0
): string {
  if (points.length < 3) {
    return "";
  }
  const safeRadius = Math.max(0, Number.isFinite(radius) ? radius : 0);
  if (safeRadius === 0) {
    const first = points[0];
    if (!first) {
      return "";
    }
    return `M ${format(first.x)} ${format(first.y)} ${points
      .slice(1)
      .map((point) => `L ${format(point.x)} ${format(point.y)}`)
      .join(" ")} Z`;
  }
  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    if (!(previous && next)) {
      return { before: point, corner: point, after: point };
    }
    const previousLength = Math.hypot(
      previous.x - point.x,
      previous.y - point.y
    );
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y);
    const cut = Math.min(safeRadius, previousLength / 2, nextLength / 2);
    const before = {
      x:
        point.x +
        ((previous.x - point.x) / Math.max(previousLength, 0.001)) * cut,
      y:
        point.y +
        ((previous.y - point.y) / Math.max(previousLength, 0.001)) * cut,
    };
    const after = {
      x: point.x + ((next.x - point.x) / Math.max(nextLength, 0.001)) * cut,
      y: point.y + ((next.y - point.y) / Math.max(nextLength, 0.001)) * cut,
    };
    return { before, corner: point, after };
  });
  const first = corners[0];
  if (!first) {
    return "";
  }
  let path = `M ${format(first.after.x)} ${format(first.after.y)}`;
  for (let index = 1; index < corners.length; index += 1) {
    const current = corners[index];
    if (!current) {
      continue;
    }
    path += ` L ${format(current.before.x)} ${format(current.before.y)} Q ${format(current.corner.x)} ${format(current.corner.y)} ${format(current.after.x)} ${format(current.after.y)}`;
  }
  path += ` L ${format(first.before.x)} ${format(first.before.y)} Q ${format(first.corner.x)} ${format(first.corner.y)} ${format(first.after.x)} ${format(first.after.y)} Z`;
  return path;
}

export function createGaugeNotches(options: GaugeNotchOptions): GaugeNotch[] {
  const width = Math.max(0, Number.isFinite(options.width) ? options.width : 0);
  const height = Math.max(
    0,
    Number.isFinite(options.height) ? options.height : 0
  );
  const totalNotches = Math.floor(clamp(options.totalNotches ?? 40, 1, 240));
  const spacing = clamp(options.spacing ?? 25, 0, 95) / 100;
  const depthFactor = clamp(options.notchLengthPercent ?? 100, 5, 100) / 100;
  const widthFactor = clamp(options.notchWidthPercent ?? 80, 10, 100) / 100;
  const activeNotches = Math.round(
    (clamp(options.value, 0, 100) * totalNotches) / 100
  );
  const round = Math.max(
    0,
    Number.isFinite(options.notchCornerRadius)
      ? (options.notchCornerRadius as number)
      : 0
  );
  const uniform = options.uniformWidth ?? false;

  if (width <= 0 || height <= 0) {
    return [];
  }

  if (options.orientation === "linear") {
    const centerY = height / 2;
    const outerOffset = (height / 2) * depthFactor;
    const innerOffset = uniform ? outerOffset : outerOffset * (28 / 42);
    const notchDepth = uniform ? outerOffset * 2 : outerOffset - innerOffset;
    const availableWidth = width * (1 - spacing);
    const slotWidth = availableWidth / totalNotches;
    const gapWidth = (width * spacing) / Math.max(1, totalNotches - 1);
    return Array.from({ length: totalNotches }, (_, index) => {
      const centerX = index * (slotWidth + gapWidth) + slotWidth / 2;
      const halfWidth = (slotWidth * widthFactor) / 2;
      const points = uniform
        ? [
            { x: centerX - halfWidth, y: centerY - notchDepth / 2 },
            { x: centerX + halfWidth, y: centerY - notchDepth / 2 },
            { x: centerX + halfWidth, y: centerY + notchDepth / 2 },
            { x: centerX - halfWidth, y: centerY + notchDepth / 2 },
          ]
        : [
            { x: centerX - halfWidth, y: centerY - outerOffset },
            { x: centerX + halfWidth, y: centerY - outerOffset },
            {
              x:
                centerX +
                halfWidth * (innerOffset / Math.max(outerOffset, 0.001)),
              y: centerY + outerOffset,
            },
            {
              x:
                centerX -
                halfWidth * (innerOffset / Math.max(outerOffset, 0.001)),
              y: centerY + outerOffset,
            },
          ];
      return {
        index,
        active: index < activeNotches,
        points,
        path: createRoundedPolygonPath(points, round),
      };
    });
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height);
  const outerRadius = size * 0.42;
  const innerRadiusBase = size * 0.28;
  const depth = (outerRadius - innerRadiusBase) * depthFactor;
  const innerRadius = outerRadius - depth;
  const startAngle = Number.isFinite(options.startAngle)
    ? (options.startAngle as number)
    : 135;
  const endAngle = Number.isFinite(options.endAngle)
    ? (options.endAngle as number)
    : 405;
  const totalAngle = endAngle - startAngle;
  const notchAngle = (totalAngle * (1 - spacing)) / totalNotches;
  const gapAngle = (totalAngle * spacing) / Math.max(1, totalNotches - 1);
  return Array.from({ length: totalNotches }, (_, index) => {
    const angle =
      ((startAngle + index * (notchAngle + gapAngle) + notchAngle / 2) *
        Math.PI) /
      180;
    const halfWidth = (notchAngle * 0.8 * Math.PI) / 180 / 2;
    const pointAt = (r: number, a: number) => ({
      x: centerX + Math.cos(a) * r,
      y: centerY + Math.sin(a) * r,
    });
    const outerLeft = pointAt(outerRadius, angle - halfWidth);
    const outerRight = pointAt(outerRadius, angle + halfWidth);
    const innerRight = uniform
      ? {
          x: outerRight.x - Math.cos(angle) * depth,
          y: outerRight.y - Math.sin(angle) * depth,
        }
      : pointAt(innerRadius, angle + halfWidth);
    const innerLeft = uniform
      ? {
          x: outerLeft.x - Math.cos(angle) * depth,
          y: outerLeft.y - Math.sin(angle) * depth,
        }
      : pointAt(innerRadius, angle - halfWidth);
    const points = [outerLeft, outerRight, innerRight, innerLeft];
    return {
      index,
      active: index < activeNotches,
      points,
      path: createRoundedPolygonPath(points, round),
    };
  });
}

export function interpolateGaugeColor(
  start: string,
  end: string,
  amount: number
): string {
  const parse = (color: string) => {
    const normalized = color.replace("#", "");
    if (!HEX_COLOR.test(normalized)) {
      return null;
    }
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((character) => character + character)
            .join("")
        : normalized;
    return [0, 2, 4].map((offset) =>
      Number.parseInt(full.slice(offset, offset + 2), 16)
    );
  };
  const from = parse(start);
  const to = parse(end);
  if (!(from && to)) {
    return amount < 0.5 ? start : end;
  }
  const t = clamp(amount, 0, 1);
  return `#${from
    .map((channel, index) =>
      Math.round(channel + ((to[index] ?? channel) - channel) * t)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}
