import { arc, pie } from "d3-shape";

export interface RadialDatum {
  label: string;
  value: number;
  color?: string;
  fill?: string;
}

export interface PieArc {
  data: RadialDatum;
  index: number;
  startAngle: number;
  endAngle: number;
  padAngle: number;
  value: number;
}

export interface PolarPoint {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function createPieArcs<T extends RadialDatum>(
  data: readonly T[],
  startAngle = -Math.PI / 2,
  endAngle = (3 * Math.PI) / 2,
  padAngle = 0
): PieArc[] {
  if (data.length === 0) {
    return [];
  }
  const safeValues = data.map((item) =>
    Number.isFinite(item.value) ? Math.max(0, item.value) : 0
  );
  if (safeValues.every((value) => value === 0)) {
    return [];
  }
  const arcs = pie<T>()
    .value((_item, index) => safeValues[index] ?? 0)
    .startAngle(Number.isFinite(startAngle) ? startAngle : -Math.PI / 2)
    .endAngle(Number.isFinite(endAngle) ? endAngle : (3 * Math.PI) / 2)
    .padAngle(Math.max(0, Number.isFinite(padAngle) ? padAngle : 0))
    .sort(null)(data as T[]);
  return arcs.map((item, index) => ({
    data: item.data,
    index,
    startAngle: item.startAngle,
    endAngle: item.endAngle,
    padAngle: item.padAngle,
    value: item.value,
  }));
}

export function createArcPath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  cornerRadius = 0,
  padAngle = 0
): string {
  const inner = Math.max(0, Number.isFinite(innerRadius) ? innerRadius : 0);
  const outer = Math.max(inner, Number.isFinite(outerRadius) ? outerRadius : 0);
  const start = Number.isFinite(startAngle) ? startAngle : 0;
  const end = Number.isFinite(endAngle) ? endAngle : start;
  if (outer <= 0 || end <= start) {
    return "";
  }
  return (
    arc<{
      startAngle: number;
      endAngle: number;
    }>()
      .innerRadius(inner)
      .outerRadius(outer)
      .cornerRadius(
        Math.max(0, Number.isFinite(cornerRadius) ? cornerRadius : 0)
      )
      .padAngle(Math.max(0, Number.isFinite(padAngle) ? padAngle : 0))({
      startAngle: start,
      endAngle: end,
    }) ?? ""
  );
}

export function radialPoint(angle: number, radius: number): PolarPoint {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function createRadarAreaPath(positions: readonly PolarPoint[]): string {
  if (positions.length < 3) {
    return "";
  }
  const first = positions[0];
  if (!first) {
    return "";
  }
  const format = (value: number) =>
    Number.isFinite(value) ? value.toFixed(2) : "0";
  return `M ${format(first.x)} ${format(first.y)} ${positions
    .slice(1)
    .map((point) => `L ${format(point.x)} ${format(point.y)}`)
    .join(" ")} Z`;
}
