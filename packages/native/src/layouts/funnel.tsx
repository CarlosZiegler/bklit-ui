import { useEffect, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useChartTheme } from "../theme";
import {
  createFunnelSegments,
  type FunnelOrientation,
  type FunnelSegmentGeometry,
  type FunnelStage,
  funnelSegmentPath,
} from "./funnel-geometry";

export type {
  FunnelGradientStop,
  FunnelOrientation,
  FunnelStage,
} from "./funnel-geometry";

export interface FunnelChartProps {
  data: FunnelStage[];
  orientation?: FunnelOrientation;
  color?: string;
  layers?: number;
  style?: StyleProp<ViewStyle>;
  showPercentage?: boolean;
  showValues?: boolean;
  showLabels?: boolean;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  onSelectStage?: (stage: FunnelStage, index: number) => void;
  formatPercentage?: (percentage: number) => string;
  formatValue?: (value: number) => string;
  gap?: number;
  edges?: "curved" | "straight";
  labelLayout?: "spread" | "grouped";
  labelOrientation?: "vertical" | "horizontal";
  labelAlign?: "center" | "start" | "end";
  grid?:
    | boolean
    | {
        bands?: boolean;
        bandColor?: string;
        lines?: boolean;
        lineColor?: string;
        lineOpacity?: number;
        lineWidth?: number;
      };
  aspectRatio?: string;
  accessibilityLabel?: string;
  animationKey?: string | number;
  animate?: boolean;
  animationDuration?: number;
}

function aspectValue(orientation: FunnelOrientation, ratio?: string): number {
  if (ratio) {
    const [a, b] = ratio.split("/").map((part) => Number(part.trim()));
    if (a && b) {
      return a / b;
    }
  }
  return orientation === "horizontal" ? 2.2 : 1 / 1.8;
}

const intFmt = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

type FunnelLabelKind = "value" | "percentage" | "label";
interface FunnelLabelPosition {
  x: number;
  y: number;
}

function spreadLabelPosition(
  index: number,
  count: number,
  segment: FunnelSegmentGeometry,
  orientation: FunnelOrientation
): FunnelLabelPosition {
  const fraction = count < 2 ? 0.5 : index / (count - 1);
  if (orientation === "horizontal") {
    return {
      x: segment.width / 2,
      y: segment.height * (0.22 + fraction * 0.56),
    };
  }
  return {
    x: segment.width * (0.22 + fraction * 0.56),
    y: segment.height / 2,
  };
}

function groupedLabelPosition(
  index: number,
  count: number,
  segment: FunnelSegmentGeometry,
  orientation: FunnelOrientation,
  groupOrientation: "vertical" | "horizontal",
  alignFraction: number
): FunnelLabelPosition {
  const centeredIndex = index - (count - 1) / 2;
  const centerX = segment.width / 2;
  const centerY = segment.height / 2;
  if (groupOrientation === "vertical") {
    const y =
      orientation === "horizontal" ? segment.height * alignFraction : centerY;
    return { x: centerX, y: y + centeredIndex * 12 };
  }
  const x =
    orientation === "vertical" ? segment.width * alignFraction : centerX;
  const y =
    orientation === "horizontal" ? segment.height * alignFraction : centerY;
  return { x: x + centeredIndex * 38, y };
}

function getFunnelLabelPositions(
  segment: FunnelSegmentGeometry,
  orientation: FunnelOrientation,
  labelKinds: FunnelLabelKind[],
  labelLayout: "spread" | "grouped",
  labelOrientation: "vertical" | "horizontal" | undefined,
  labelAlign: "center" | "start" | "end"
): Map<FunnelLabelKind, FunnelLabelPosition> {
  const positions = new Map<FunnelLabelKind, FunnelLabelPosition>();
  const groupOrientation =
    labelOrientation ??
    (orientation === "horizontal" ? "vertical" : "horizontal");
  let alignFraction = 0.5;
  if (labelAlign === "start") {
    alignFraction = 0.2;
  }
  if (labelAlign === "end") {
    alignFraction = 0.8;
  }

  labelKinds.forEach((kind, index) => {
    const position =
      labelLayout === "spread"
        ? spreadLabelPosition(index, labelKinds.length, segment, orientation)
        : groupedLabelPosition(
            index,
            labelKinds.length,
            segment,
            orientation,
            groupOrientation,
            alignFraction
          );
    positions.set(kind, position);
  });
  return positions;
}

export function FunnelChart({
  data,
  orientation = "horizontal",
  color,
  layers = 3,
  style,
  showPercentage = true,
  showValues = true,
  showLabels = true,
  hoveredIndex: controlledIndex,
  onHoverChange,
  onSelectStage,
  formatPercentage = (percentage) => `${Math.round(percentage)}%`,
  formatValue = intFmt,
  gap = 4,
  edges = "curved",
  labelLayout = "spread",
  labelOrientation,
  labelAlign = "center",
  grid = false,
  aspectRatio,
  accessibilityLabel = "Conversion funnel",
  animationKey,
  animate = true,
  animationDuration = 440,
}: FunnelChartProps) {
  const theme = useChartTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [internalIndex, setInternalIndex] = useState<number | null>(null);
  const isControlled = controlledIndex !== undefined;
  const selectedIndex = isControlled ? controlledIndex : internalIndex;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const opacityStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const segments = useMemo(
    () => createFunnelSegments(data, size.width, size.height, orientation, gap),
    [data, gap, orientation, size.height, size.width]
  );
  const ratio = aspectValue(orientation, aspectRatio);
  const gridConfig = typeof grid === "object" ? grid : {};
  const showBands = grid !== false && (gridConfig.bands ?? true);
  const showLines = grid !== false && (gridConfig.lines ?? true);
  const segmentGap = Math.max(0, gap);
  const layerCount = Math.max(1, Math.floor(layers));

  // animationKey is a deliberate replay trigger for native opacity entry.
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey restarts the entry reveal.
  useEffect(() => {
    if (!animate || reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: Math.max(0, animationDuration),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [animate, animationDuration, animationKey, progress, reduceMotion]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };
  const chartColor = color ?? theme.color;
  const maxValue = data[0]?.value ?? 0;

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      onLayout={onLayout}
      style={[styles.root, { aspectRatio: ratio }, style, opacityStyle]}
    >
      {size.width > 0 && size.height > 0 && (
        <Svg
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          width="100%"
        >
          <Defs>
            {data.map((stage, index) =>
              stage.gradient?.length ? (
                <LinearGradient
                  id={`funnel-gradient-${index}`}
                  key={`gradient:${stage.label}`}
                  x1="0%"
                  x2={orientation === "horizontal" ? "100%" : "0%"}
                  y1="0%"
                  y2={orientation === "horizontal" ? "0%" : "100%"}
                >
                  {stage.gradient.map((stop) => (
                    <Stop
                      key={`${stop.offset}:${stop.color}`}
                      offset={stop.offset}
                      stopColor={stop.color}
                    />
                  ))}
                </LinearGradient>
              ) : null
            )}
          </Defs>
          {showBands &&
            segments.map((segment) =>
              segment.index % 2 === 0 ? (
                <Rect
                  fill={gridConfig.bandColor ?? theme.gridColor}
                  height={segment.height}
                  key={`band-${segment.index}`}
                  opacity={0.22}
                  width={segment.width}
                  x={segment.x}
                  y={segment.y}
                />
              ) : null
            )}
          {segments.map(
            // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one stage owns its layered fill, labels and press target.
            (segment) => {
              const stage = data[segment.index];
              if (!stage) {
                return null;
              }
              const selected = selectedIndex === segment.index;
              const dimmed = selectedIndex != null && !selected;
              const segmentColor =
                stage.gradient?.[0]?.color ?? stage.color ?? chartColor;
              const fill = stage.gradient?.length
                ? `url(#funnel-gradient-${segment.index})`
                : segmentColor;
              const pct = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
              const stageValue = stage.displayValue ?? formatValue(stage.value);
              const labelKinds: FunnelLabelKind[] = [];
              if (showValues) {
                labelKinds.push("value");
              }
              if (showPercentage) {
                labelKinds.push("percentage");
              }
              if (showLabels) {
                labelKinds.push("label");
              }
              const labelPositions = getFunnelLabelPositions(
                segment,
                orientation,
                labelKinds,
                labelLayout,
                labelOrientation,
                labelAlign
              );
              const textAnchor = "middle" as const;
              return (
                <G
                  key={`${stage.label}:${segment.index}`}
                  opacity={dimmed ? 0.4 : 1}
                  transform={`translate(${segment.x},${segment.y})`}
                >
                  {Array.from({ length: layerCount }, (_, layerIndex) => {
                    const scale = 1 - (layerIndex / layerCount) * 0.35;
                    const opacity =
                      0.18 + (layerIndex / Math.max(1, layerCount - 1)) * 0.65;
                    return (
                      <Path
                        d={funnelSegmentPath(
                          segment.normStart,
                          segment.normEnd,
                          segment.width,
                          segment.height,
                          orientation,
                          scale,
                          edges === "straight"
                        )}
                        fill={
                          layerIndex === layerCount - 1 ? fill : segmentColor
                        }
                        fillOpacity={
                          layerIndex === layerCount - 1 ? 1 : opacity
                        }
                        key={`layer-${scale.toFixed(3)}`}
                      />
                    );
                  })}
                  {showValues && (
                    <SvgText
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight="700"
                      textAnchor={textAnchor}
                      x={labelPositions.get("value")?.x ?? segment.width / 2}
                      y={labelPositions.get("value")?.y ?? segment.height / 2}
                    >
                      {stageValue}
                    </SvgText>
                  )}
                  {showLabels && (
                    <SvgText
                      fill="#ffffff"
                      fontSize={10}
                      fontWeight="600"
                      textAnchor={textAnchor}
                      x={labelPositions.get("label")?.x ?? segment.width / 2}
                      y={labelPositions.get("label")?.y ?? segment.height / 2}
                    >
                      {stage.label}
                    </SvgText>
                  )}
                  {showPercentage && (
                    <SvgText
                      fill="#ffffff"
                      fontSize={9}
                      opacity={0.9}
                      textAnchor={textAnchor}
                      x={
                        labelPositions.get("percentage")?.x ?? segment.width / 2
                      }
                      y={
                        labelPositions.get("percentage")?.y ??
                        segment.height / 2
                      }
                    >
                      {formatPercentage(pct)}
                    </SvgText>
                  )}
                  <Path
                    accessibilityLabel={`${stage.label}: ${stageValue}${showPercentage ? `, ${formatPercentage(pct)}` : ""}`}
                    d={funnelSegmentPath(
                      segment.normStart,
                      segment.normEnd,
                      segment.width,
                      segment.height,
                      orientation,
                      1,
                      edges === "straight"
                    )}
                    fill="transparent"
                    onPress={() => {
                      const next = selected ? null : segment.index;
                      if (!isControlled) {
                        setInternalIndex(next);
                      }
                      onHoverChange?.(next);
                      if (next != null) {
                        onSelectStage?.(stage, segment.index);
                      }
                    }}
                  />
                </G>
              );
            }
          )}
          {showLines &&
            segments.slice(0, -1).map((segment) => {
              const position =
                orientation === "horizontal"
                  ? segment.x + segment.width + segmentGap / 2
                  : segment.y + segment.height + segmentGap / 2;
              return (
                <Path
                  d={
                    orientation === "horizontal"
                      ? `M ${position} 0 V ${size.height}`
                      : `M 0 ${position} H ${size.width}`
                  }
                  fill="none"
                  key={`separator-${position}`}
                  stroke={gridConfig.lineColor ?? theme.gridColor}
                  strokeOpacity={gridConfig.lineOpacity ?? 0.75}
                  strokeWidth={gridConfig.lineWidth ?? 1}
                />
              );
            })}
        </Svg>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "stretch", overflow: "visible", width: "100%" },
});
