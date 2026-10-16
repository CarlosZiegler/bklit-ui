import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { G } from "react-native-svg";
import { useChartTheme } from "../theme";
import {
  type RadarData,
  type RadarMetric,
  RadarProvider,
} from "./radar-context";

export interface RadarChartProps {
  data: readonly RadarData[];
  metrics: readonly RadarMetric[];
  size?: number;
  levels?: number;
  margin?: number;
  animate?: boolean;
  enterDurationMs?: number;
  staggerScale?: number;
  motionReplayKey?: string;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  children?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function RadarChart({
  data,
  metrics,
  size: fixedSize,
  levels = 5,
  margin = 60,
  animate = true,
  enterDurationMs = 1100,
  staggerScale = 1,
  motionReplayKey = "",
  hoveredIndex,
  onHoverChange,
  children,
  accessibilityLabel = "Radar chart",
  style,
}: RadarChartProps) {
  const theme = useChartTheme();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<
    number | null
  >(null);
  const size = Math.max(0, fixedSize ?? measuredWidth);
  const radius = Math.max(0, (size - Math.max(0, margin) * 2) / 2);
  const activeIndex =
    hoveredIndex === undefined ? internalHoveredIndex : hoveredIndex;
  const setHoveredIndex = useCallback(
    (index: number | null) => {
      if (hoveredIndex === undefined) {
        setInternalHoveredIndex(index);
      }
      onHoverChange?.(index);
    },
    [hoveredIndex, onHoverChange]
  );
  const getColor = useCallback(
    (index: number) =>
      data[index]?.color ??
      theme.seriesColors[index % theme.seriesColors.length] ??
      theme.color,
    [data, theme.color, theme.seriesColors]
  );
  const getAngle = useCallback(
    (index: number) =>
      metrics.length > 0
        ? (index * 2 * Math.PI) / metrics.length - Math.PI / 2
        : 0,
    [metrics.length]
  );
  const getPointPosition = useCallback(
    (metricIndex: number, value: number) => {
      const angle = getAngle(metricIndex);
      const distance =
        (radius *
          Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))) /
        100;
      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
    },
    [getAngle, radius]
  );
  const contextValue = useMemo(
    () => ({
      data,
      metrics,
      size,
      radius,
      levels: Math.max(1, Math.floor(levels)),
      hoveredIndex: activeIndex,
      setHoveredIndex,
      animate,
      enterDurationMs: Math.max(0, enterDurationMs),
      staggerScale: Math.max(0, staggerScale),
      motionReplayKey,
      getColor,
      getAngle,
      getPointPosition,
    }),
    [
      activeIndex,
      animate,
      data,
      enterDurationMs,
      getAngle,
      getColor,
      getPointPosition,
      levels,
      metrics,
      motionReplayKey,
      radius,
      setHoveredIndex,
      size,
      staggerScale,
    ]
  );
  const onLayout = (event: LayoutChangeEvent) =>
    setMeasuredWidth(event.nativeEvent.layout.width);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (data.length === 0) {
      return;
    }
    let direction = 0;
    if (event.nativeEvent.actionName === "increment") {
      direction = 1;
    } else if (event.nativeEvent.actionName === "decrement") {
      direction = -1;
    }
    if (direction === 0) {
      return;
    }
    const current = activeIndex ?? (direction > 0 ? -1 : data.length);
    setHoveredIndex(
      Math.max(0, Math.min(data.length - 1, current + direction))
    );
  };
  const selected = activeIndex === null ? undefined : data[activeIndex];

  return (
    <RadarProvider value={contextValue}>
      <View
        accessibilityActions={[
          { name: "increment", label: "Select next radar series" },
          { name: "decrement", label: "Select previous radar series" },
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: 0,
          max: Math.max(0, data.length - 1),
          now: activeIndex ?? 0,
          text: selected?.label ?? "No series selected",
        }}
        accessible
        onAccessibilityAction={onAccessibilityAction}
        onLayout={onLayout}
        style={[
          styles.root,
          fixedSize
            ? { width: fixedSize, height: fixedSize }
            : styles.responsive,
          style,
        ]}
      >
        {size > 0 && (
          <Svg height={size} style={styles.svg} width={size}>
            <G x={size / 2} y={size / 2}>
              {children}
            </G>
          </Svg>
        )}
      </View>
    </RadarProvider>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "center", overflow: "visible" },
  responsive: { aspectRatio: 1, width: "100%" },
  svg: { overflow: "visible" },
});
