import { type GeoProjection, geoGraticule, geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

export function choroplethValueDomain(
  values: readonly unknown[]
): readonly [number, number] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null;
}

export function choroplethScaleLevel(
  value: number,
  min: number,
  max: number,
  levelCount: number
): number {
  const count = Math.max(1, Math.floor(levelCount));
  if (
    !(Number.isFinite(value) && Number.isFinite(min) && Number.isFinite(max))
  ) {
    return -1;
  }
  if (max <= min) {
    return Math.floor(count / 2);
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.min(count - 1, Math.floor(ratio * count));
}

export function choroplethValueColor(
  value: unknown,
  domain: readonly [number, number] | null,
  colors: readonly string[],
  fallback: string
): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !domain ||
    colors.length === 0
  ) {
    return fallback;
  }
  const level = choroplethScaleLevel(
    value,
    domain[0],
    domain[1],
    colors.length
  );
  return colors[level] ?? fallback;
}

export interface ChoroplethProjectionOptions {
  center?: [number, number];
  scale?: number;
  translate?: [number, number];
  data?: FeatureCollection<Geometry>;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export function createChoroplethProjection(
  width: number,
  height: number,
  options: ChoroplethProjectionOptions = {}
): GeoProjection {
  const margin = options.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  const projection = geoMercator().center(options.center ?? [0, 20]);
  if (options.scale === undefined && options.translate === undefined) {
    return projection.fitExtent(
      [
        [margin.left + 4, margin.top + 4],
        [width - margin.right - 4, height - margin.bottom - 4],
      ],
      options.data ?? { type: "Sphere" }
    );
  }
  return projection
    .scale(options.scale ?? (innerWidth / 630) * 100)
    .translate(
      options.translate ?? [
        margin.left + innerWidth / 2,
        margin.top + innerHeight / 2,
      ]
    );
}

export function createChoroplethPaths(
  data: FeatureCollection<Geometry>,
  projection: GeoProjection
): string[] {
  const path = geoPath(projection);
  return data.features.map((feature) => path(feature) ?? "");
}

export function createChoroplethGraticulePath(
  projection: GeoProjection,
  step: [number, number] = [20, 20]
): string {
  return geoPath(projection)(geoGraticule().step(step)()) ?? "";
}
