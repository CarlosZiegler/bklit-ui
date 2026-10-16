import type { ReactElement } from "react";
import { useId } from "react";
import { Defs, G, LinearGradient, Mask, Rect, Stop } from "react-native-svg";
import { useChart } from "../chart-context";
import { NativePatternDefinition, type PatternPresetId } from "./patterns";

export type BackgroundPatternPreset = PatternPresetId;

export interface BackgroundProps {
  pattern?: BackgroundPatternPreset;
  color?: string;
  scale?: number;
  strokeWidth?: number;
  radius?: number;
  complement?: boolean;
  fill?: string;
  dotFill?: boolean;
  tileBackground?: string;
  showFill?: boolean;
  opacity?: number;
  fadeHorizontal?: boolean;
  fadeVertical?: boolean;
  fadeHorizontalLength?: number;
  fadeVerticalLength?: number;
}

function clampFadeLength(length: number): number {
  return Math.min(45, Math.max(0, length));
}

function createFadeStops(length: number): ReactElement[] {
  const fade = clampFadeLength(length);
  return [
    <Stop key="start" offset="0%" stopColor="white" stopOpacity={0} />,
    <Stop
      key="fade-in"
      offset={`${fade}%`}
      stopColor="white"
      stopOpacity={1}
    />,
    <Stop
      key="fade-out"
      offset={`${100 - fade}%`}
      stopColor="white"
      stopOpacity={1}
    />,
    <Stop key="end" offset="100%" stopColor="white" stopOpacity={0} />,
  ];
}

/** Patterned plot backdrop. Render it before data and axis layers. */
export function Background({
  pattern = "diagonal",
  color,
  scale = 1,
  strokeWidth,
  radius,
  complement,
  fill,
  dotFill,
  tileBackground,
  showFill = true,
  opacity = 1,
  fadeHorizontal = true,
  fadeVertical = true,
  fadeHorizontalLength = 10,
  fadeVerticalLength = 10,
}: BackgroundProps) {
  const { margins, plotHeight, plotWidth, status, theme } = useChart();
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = `native-chart-background-${rawId}`;
  const horizontalMask = `${id}-h-mask`;
  const verticalMask = `${id}-v-mask`;
  const combinedMask = `${id}-combined-mask`;
  const horizontalGradient = `${id}-h-gradient`;
  const verticalGradient = `${id}-v-gradient`;
  const x = margins.left;
  const y = margins.top;
  const isVisible =
    showFill &&
    pattern !== "none" &&
    plotWidth > 0 &&
    plotHeight > 0 &&
    status !== "error";
  if (!isVisible) {
    return null;
  }

  const resolvedColor = color ?? theme.gridColor;
  let mask: string | undefined;
  if (fadeHorizontal && fadeVertical) {
    mask = `url(#${combinedMask})`;
  } else if (fadeHorizontal) {
    mask = `url(#${horizontalMask})`;
  } else if (fadeVertical) {
    mask = `url(#${verticalMask})`;
  }
  const patternOptions = {
    color: resolvedColor,
    scale,
    strokeWidth,
    radius,
    complement,
    fill,
    dotFill,
    tileBackground,
  };

  return (
    <G
      opacity={Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1}
    >
      <Defs>
        <NativePatternDefinition
          id={id}
          options={patternOptions}
          preset={pattern}
        />
        {fadeHorizontal ? (
          <>
            <LinearGradient
              id={horizontalGradient}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              {createFadeStops(fadeHorizontalLength)}
            </LinearGradient>
            <Mask
              height={plotHeight}
              id={horizontalMask}
              maskContentUnits="userSpaceOnUse"
              maskUnits="userSpaceOnUse"
              width={plotWidth}
              x={x}
              y={y}
            >
              <Rect
                fill={`url(#${horizontalGradient})`}
                height={plotHeight}
                width={plotWidth}
                x={x}
                y={y}
              />
            </Mask>
          </>
        ) : null}
        {fadeVertical ? (
          <>
            <LinearGradient
              id={verticalGradient}
              x1="0%"
              x2="0%"
              y1="0%"
              y2="100%"
            >
              {createFadeStops(fadeVerticalLength)}
            </LinearGradient>
            <Mask
              height={plotHeight}
              id={verticalMask}
              maskContentUnits="userSpaceOnUse"
              maskUnits="userSpaceOnUse"
              width={plotWidth}
              x={x}
              y={y}
            >
              <Rect
                fill={`url(#${verticalGradient})`}
                height={plotHeight}
                width={plotWidth}
                x={x}
                y={y}
              />
            </Mask>
          </>
        ) : null}
        {fadeHorizontal && fadeVertical ? (
          <Mask
            height={plotHeight}
            id={combinedMask}
            maskContentUnits="userSpaceOnUse"
            maskUnits="userSpaceOnUse"
            width={plotWidth}
            x={x}
            y={y}
          >
            <G mask={`url(#${horizontalMask})`}>
              <Rect
                fill={`url(#${verticalGradient})`}
                height={plotHeight}
                width={plotWidth}
                x={x}
                y={y}
              />
            </G>
          </Mask>
        ) : null}
      </Defs>
      <Rect
        fill={`url(#${id})`}
        height={plotHeight}
        mask={mask}
        width={plotWidth}
        x={x}
        y={y}
      />
    </G>
  );
}

Background.displayName = "Background";
