import type { ChartPoint } from "./geometry";

interface SmoothSegment {
  areaPath: string;
  path: string;
  pathLength: number;
}

interface SmoothPaths extends SmoothSegment {}

function clampBetween(value: number, a: number, b: number) {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), value));
}

function cubicPoint(a: number, b: number, c: number, d: number, t: number) {
  const inverse = 1 - t;
  return (
    inverse * inverse * inverse * a +
    3 * inverse * inverse * t * b +
    3 * inverse * t * t * c +
    t * t * t * d
  );
}

function splitAtGaps(points: readonly ChartPoint[]) {
  const segments: ChartPoint[][] = [];
  for (const point of points) {
    const segment = segments.at(-1);
    if (!segment || segment.at(-1)?.index !== point.index - 1) {
      segments.push([point]);
    } else {
      segment.push(point);
    }
  }
  return segments;
}

function createSmoothSegment(
  points: readonly ChartPoint[],
  baselineY: number
): SmoothSegment {
  const first = points[0];
  const last = points.at(-1);
  if (!(first && last)) {
    return { areaPath: "", path: "", pathLength: 0 };
  }

  const format = (value: number) => value.toFixed(2);
  let path = `M${format(first.x)} ${format(first.y)}`;
  let pathLength = 0;
  const samples = 12;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!(current && next)) {
      continue;
    }
    const previous = points[Math.max(0, index - 1)] ?? current;
    const following = points[Math.min(points.length - 1, index + 2)] ?? next;
    const control1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: clampBetween(current.y + (next.y - previous.y) / 6, current.y, next.y),
    };
    const control2 = {
      x: next.x - (following.x - current.x) / 6,
      y: clampBetween(
        next.y - (following.y - current.y) / 6,
        current.y,
        next.y
      ),
    };

    path += ` C${format(control1.x)} ${format(control1.y)} ${format(control2.x)} ${format(control2.y)} ${format(next.x)} ${format(next.y)}`;

    let previousSample = { x: current.x, y: current.y };
    for (let step = 1; step <= samples; step += 1) {
      const t = step / samples;
      const sample = {
        x: cubicPoint(current.x, control1.x, control2.x, next.x, t),
        y: cubicPoint(current.y, control1.y, control2.y, next.y, t),
      };
      pathLength += Math.hypot(
        sample.x - previousSample.x,
        sample.y - previousSample.y
      );
      previousSample = sample;
    }
  }

  const areaPath = `${path} L${format(last.x)} ${format(baselineY)} L${format(first.x)} ${format(baselineY)} Z`;
  return { areaPath, path, pathLength };
}

export function createSmoothPaths(
  points: readonly ChartPoint[],
  baselineY: number
): SmoothPaths {
  const segments = splitAtGaps(points).map((segment) =>
    createSmoothSegment(segment, baselineY)
  );
  return {
    areaPath: segments.map((segment) => segment.areaPath).join(" "),
    path: segments.map((segment) => segment.path).join(" "),
    pathLength: segments.reduce(
      (total, segment) => total + segment.pathLength,
      0
    ),
  };
}
