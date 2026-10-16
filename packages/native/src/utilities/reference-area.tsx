import { useId } from "react";
import {
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { useChart } from "../chart-context";
import {
  type NativeDomainEndpoint,
  resolveReferenceAreaRect,
} from "./geometry";
import { NativePatternDefinition, type PatternPresetId } from "./patterns";

export type ReferenceAreaStrokeStyle = "solid" | "dashed";
export type ReferenceAreaIfOverflow = "hidden" | "visible" | "discard";

export interface ReferenceAreaProps {
  y1?: number;
  y2?: number;
  x1?: NativeDomainEndpoint;
  x2?: NativeDomainEndpoint;
  yAxisId?: string | number;
  fill?: string;
  fillOpacity?: number;
  pattern?: PatternPresetId;
  patternColor?: string;
  patternScale?: number;
  patternStrokeWidth?: number;
  patternRadius?: number;
  patternComplement?: boolean;
  patternFill?: string;
  patternDotFill?: boolean;
  patternTileBackground?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: ReferenceAreaStrokeStyle;
  strokeDasharray?: string;
  fadeEdges?: boolean;
  fadeEdgesLength?: number;
  showMarkers?: boolean;
  markerColor?: string;
  markerSize?: number;
  ifOverflow?: ReferenceAreaIfOverflow;
}

function clampFadeLength(length: number): number {
  return Math.min(45, Math.max(0, length));
}

function bracketMarkerPath(
  centerX: number,
  edgeY: number,
  size: number,
  direction: "down" | "up"
): string {
  const half = size / 2;
  const tipY = direction === "down" ? edgeY + size : edgeY - size;
  return `M ${centerX - half} ${edgeY} L ${centerX + half} ${edgeY} L ${centerX} ${tipY} Z`;
}

/** Data-bounded band matching the web ReferenceArea geometry and pattern API. */
export function ReferenceArea({
  y1,
  y2,
  x1,
  x2,
  fill,
  fillOpacity,
  pattern = "none",
  patternColor,
  patternScale = 1,
  patternStrokeWidth,
  patternRadius,
  patternComplement,
  patternFill,
  patternDotFill,
  patternTileBackground,
  stroke,
  strokeWidth = 1,
  strokeStyle = "dashed",
  strokeDasharray = "4,4",
  fadeEdges = true,
  fadeEdgesLength = 10,
  showMarkers = false,
  markerColor,
  markerSize = 6,
  ifOverflow = "hidden",
}: ReferenceAreaProps) {
  const { height, margins, model, plotHeight, plotWidth, theme, width } =
    useChart();
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const patternId = `native-reference-area-pattern-${rawId}`;
  const fadeMaskId = `native-reference-area-fade-${rawId}`;
  const fadeGradientId = `${fadeMaskId}-gradient`;
  const rect = resolveReferenceAreaRect({
    width,
    height,
    margins,
    model,
    x1,
    x2,
    y1,
    y2,
    ifOverflow,
  });
  if (!rect || plotWidth <= 0 || plotHeight <= 0) {
    return null;
  }

  const usePattern = pattern !== "none";
  const areaFill = usePattern
    ? `url(#${patternId})`
    : (fill ?? theme.textColor);
  const areaFillOpacity =
    fillOpacity ?? (fill === undefined && !usePattern ? 0.12 : 1);
  const fade = clampFadeLength(fadeEdgesLength);
  const mask = fadeEdges ? `url(#${fadeMaskId})` : undefined;
  const dashArray = strokeStyle === "dashed" ? strokeDasharray : undefined;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const resolvedStroke = stroke ?? theme.textColor;
  const resolvedMarker = markerColor ?? theme.seriesColors[0] ?? theme.color;

  return (
    <G>
      <Defs>
        {usePattern ? (
          <NativePatternDefinition
            id={patternId}
            options={{
              color: patternColor ?? theme.textColor,
              scale: patternScale,
              strokeWidth: patternStrokeWidth,
              radius: patternRadius,
              complement: patternComplement,
              fill: patternFill,
              dotFill: patternDotFill,
              tileBackground: patternTileBackground,
            }}
            preset={pattern}
          />
        ) : null}
        {fadeEdges ? (
          <>
            <LinearGradient
              id={fadeGradientId}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              <Stop offset="0%" stopColor="white" stopOpacity={0} />
              <Stop offset={`${fade}%`} stopColor="white" stopOpacity={1} />
              <Stop
                offset={`${100 - fade}%`}
                stopColor="white"
                stopOpacity={1}
              />
              <Stop offset="100%" stopColor="white" stopOpacity={0} />
            </LinearGradient>
            <Mask
              height={plotHeight}
              id={fadeMaskId}
              maskContentUnits="userSpaceOnUse"
              maskUnits="userSpaceOnUse"
              width={plotWidth}
              x={margins.left}
              y={margins.top}
            >
              <Rect
                fill={`url(#${fadeGradientId})`}
                height={plotHeight}
                width={plotWidth}
                x={margins.left}
                y={margins.top}
              />
            </Mask>
          </>
        ) : null}
      </Defs>
      <Rect
        fill={areaFill}
        fillOpacity={Math.min(1, Math.max(0, areaFillOpacity))}
        height={rect.height}
        mask={mask}
        width={rect.width}
        x={rect.x}
        y={rect.y}
      />
      <G mask={mask}>
        <Path
          d={`M ${rect.x} ${top} H ${rect.x + rect.width}`}
          fill="none"
          stroke={resolvedStroke}
          strokeDasharray={dashArray}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M ${rect.x} ${bottom} H ${rect.x + rect.width}`}
          fill="none"
          stroke={resolvedStroke}
          strokeDasharray={dashArray}
          strokeWidth={strokeWidth}
        />
      </G>
      {showMarkers ? (
        <>
          <Path
            d={bracketMarkerPath(centerX, top, markerSize, "down")}
            fill={resolvedMarker}
          />
          <Path
            d={bracketMarkerPath(centerX, bottom, markerSize, "up")}
            fill={resolvedMarker}
          />
        </>
      ) : null}
    </G>
  );
}

ReferenceArea.displayName = "ReferenceArea";
