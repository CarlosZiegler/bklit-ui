import { type CurveFactory, curveLinear, line } from "d3-shape";
import { useId, useMemo } from "react";
import { Circle, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { useChart } from "../chart-context";
import { buildHorizontalTangentBezierPath } from "./geometry";
import type { ProjectionCurveKind, ProjectionPoint } from "./projection-utils";

export type { ProjectionCurveKind, ProjectionPoint } from "./projection-utils";
export type ProjectionStrokeStyle = "solid" | "gradient";

export interface ProjectionLineProps {
  data: ProjectionPoint[];
  yAxisId?: string | number;
  stroke?: string;
  strokeStyle?: ProjectionStrokeStyle;
  gradientStart?: string;
  gradientEnd?: string;
  strokeWidth?: number;
  curveKind?: ProjectionCurveKind;
  curve?: CurveFactory;
  strokeDasharray?: string;
  strokeOpacity?: number;
  showEndMarker?: boolean;
  /** @deprecated Use showEndMarker. */
  showEndpoints?: boolean;
  endpointRadius?: number;
}

export interface ProjectionLineEndMarkerProps {
  data: ProjectionPoint[];
  yAxisId?: string | number;
  stroke?: string;
  strokeOpacity?: number;
  radius?: number;
}

function coordinatesFor(
  point: ProjectionPoint,
  xRatio: (value: unknown) => number | null,
  yValue: (value: number) => number | null,
  margins: { left: number },
  plotWidth: number
): [number, number] | null {
  const ratio = xRatio(point.date);
  const y = yValue(point.value);
  if (ratio === null || y === null) {
    return null;
  }
  return [margins.left + ratio * plotWidth, y];
}

function clampEndX(
  x: number,
  width: number,
  radius: number,
  strokeWidth: number
): number {
  return Math.min(x, Math.max(0, width - radius - strokeWidth * 0.5 - 1));
}

/** Projection path in the chart's shared coordinates and reveal order. */
export function ProjectionLine({
  data,
  stroke,
  strokeStyle = "solid",
  gradientStart,
  gradientEnd,
  strokeWidth = 2,
  curveKind = "linear",
  curve,
  strokeDasharray = "6,4",
  strokeOpacity = 1,
  showEndMarker,
  showEndpoints,
  endpointRadius = 5,
}: ProjectionLineProps) {
  const { margins, model, plotWidth, status, theme } = useChart();
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `native-projection-gradient-${rawId}`;
  const resolvedStroke = stroke ?? theme.seriesColors[2] ?? theme.color;
  const resolvedGradientStart = gradientStart ?? resolvedStroke;
  const resolvedGradientEnd =
    gradientEnd ?? theme.seriesColors[4] ?? resolvedStroke;
  const showMarkerSpace = showEndMarker ?? showEndpoints ?? true;
  const points = data
    .map((point) =>
      coordinatesFor(
        point,
        model.xToRatio,
        model.yToCoordinate,
        margins,
        plotWidth
      )
    )
    .filter((point): point is [number, number] => point !== null);

  const start = points[0];
  const last = points.at(-1);
  const end =
    last && start
      ? ([
          clampEndX(
            last[0],
            plotWidth + margins.left,
            showMarkerSpace ? endpointRadius : 0,
            strokeWidth
          ),
          last[1],
        ] as [number, number])
      : undefined;

  const pathData = useMemo(() => {
    if (points.length < 2 || !start || !end) {
      return null;
    }
    if (curveKind === "bezier") {
      return buildHorizontalTangentBezierPath(
        start[0],
        start[1],
        end[0],
        end[1]
      );
    }
    if (curveKind === "linear" && !curve) {
      return `M ${start[0]},${start[1]} L ${end[0]},${end[1]}`;
    }
    const generator = line<[number, number]>()
      .x((point) => point[0])
      .y((point) => point[1])
      .curve(curve ?? curveLinear);
    const pathPoints = [...points.slice(0, -1), end];
    return generator(pathPoints);
  }, [curve, curveKind, end, points, start]);

  if (status !== "ready" || !pathData || !start || !end) {
    return null;
  }
  const color =
    strokeStyle === "gradient" ? `url(#${gradientId})` : resolvedStroke;
  return (
    <G>
      {strokeStyle === "gradient" ? (
        <Defs>
          <LinearGradient
            gradientUnits="userSpaceOnUse"
            id={gradientId}
            x1={start[0]}
            x2={end[0]}
            y1={start[1]}
            y2={end[1]}
          >
            <Stop offset="0%" stopColor={resolvedGradientStart} />
            <Stop offset="100%" stopColor={resolvedGradientEnd} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Path
        d={pathData}
        fill="none"
        stroke={color}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeOpacity={Math.min(1, Math.max(0, strokeOpacity))}
        strokeWidth={strokeWidth}
      />
    </G>
  );
}

ProjectionLine.displayName = "ProjectionLine";

/** Horizon dot kept as a separate post-series layer, matching the web API. */
export function ProjectionLineEndMarker({
  data,
  stroke,
  strokeOpacity = 1,
  radius = 5,
}: ProjectionLineEndMarkerProps) {
  const { margins, model, plotWidth, status, theme } = useChart();
  const point = data.at(-1);
  if (status !== "ready" || !point) {
    return null;
  }
  const coords = coordinatesFor(
    point,
    model.xToRatio,
    model.yToCoordinate,
    margins,
    plotWidth
  );
  if (!coords) {
    return null;
  }
  const x = clampEndX(coords[0], plotWidth + margins.left, radius, 0);
  return (
    <Circle
      cx={x}
      cy={coords[1]}
      fill={stroke ?? theme.seriesColors[2] ?? theme.color}
      fillOpacity={Math.min(1, Math.max(0, strokeOpacity))}
      r={radius * 0.85}
    />
  );
}

ProjectionLineEndMarker.displayName = "ProjectionLineEndMarker";
