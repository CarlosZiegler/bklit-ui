import { type ReactNode, useContext, useEffect, useState } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
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
import { Circle, Rect } from "react-native-svg";
import { NativeChartContext } from "./chart-context";

export interface TooltipRow {
  color: string;
  label: string;
  value: string | number;
}

export interface TooltipBoxProps {
  animate?: boolean;
  backgroundColor: string;
  children: ReactNode;
  containerHeight: number;
  containerWidth: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
  x: number;
  y: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

/** Native, bounded tooltip panel positioned beside the active chart point. */
export function TooltipBox({
  animate = true,
  backgroundColor,
  children,
  containerHeight,
  containerWidth,
  offset = 12,
  style,
  x,
  y,
}: TooltipBoxProps) {
  const chart = useContext(NativeChartContext);
  const [panelHeight, setPanelHeight] = useState(116);
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const scale = useSharedValue(animate && !reduceMotion ? 0.96 : 1);
  useEffect(() => {
    const shouldAnimate = animate && !reduceMotion;
    opacity.value = shouldAnimate ? 0 : 1;
    scale.value = shouldAnimate ? 0.96 : 1;
    if (shouldAnimate) {
      opacity.value = withTiming(1, {
        duration: 120,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      });
      scale.value = withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [animate, opacity, reduceMotion, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const left = Math.max(
    8,
    Math.min(
      x + 204 + offset > containerWidth ? x - 204 - offset : x + offset,
      containerWidth - 212
    )
  );
  const top = Math.max(
    8,
    Math.min(y - panelHeight / 2, containerHeight - panelHeight - 8)
  );

  return (
    <AnimatedView
      onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
      pointerEvents="none"
      style={[
        styles.panel,
        {
          backgroundColor,
          borderColor: chart?.theme.gridColor ?? "rgba(127, 140, 150, 0.2)",
          left,
          top,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </AnimatedView>
  );
}

export interface TooltipContentProps {
  children?: ReactNode;
  rows: readonly TooltipRow[];
  title?: string;
}

export function TooltipContent({ title, rows, children }: TooltipContentProps) {
  const chart = useContext(NativeChartContext);
  return (
    <View>
      {title ? (
        <TooltipHeader style={{ color: chart?.theme.textColor ?? "#52606d" }}>
          {title}
        </TooltipHeader>
      ) : null}
      {rows.length > 0 || children ? (
        <View style={styles.content}>
          {rows.map((row, index) => (
            <View key={`${row.label}:${index}`} style={styles.row}>
              <View style={styles.labelGroup}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.rowLabel,
                    { color: chart?.theme.textColor ?? "#65717b" },
                  ]}
                >
                  {row.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.rowValue,
                  { color: chart?.theme.textColor ?? "#20282e" },
                ]}
              >
                {typeof row.value === "number"
                  ? new Intl.NumberFormat(undefined, {
                      maximumFractionDigits: 2,
                    }).format(row.value)
                  : row.value}
              </Text>
            </View>
          ))}
          {children}
        </View>
      ) : null}
    </View>
  );
}

export interface TooltipHeaderProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

export function TooltipHeader({ children, style }: TooltipHeaderProps) {
  const chart = useContext(NativeChartContext);
  return (
    <Text
      style={[
        styles.header,
        {
          borderBottomColor:
            chart?.theme.gridColor ?? "rgba(127, 140, 150, 0.2)",
          color: chart?.theme.textColor ?? "#52606d",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export interface TooltipDotProps {
  color: string;
  haloOpacity?: number;
  haloScale?: number;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
  variant?: "dot" | "ring";
  cornerRadiusFraction?: number;
  x: number;
  y: number;
}

/** SVG mark used by native chart tooltips and custom SVG layers. */
export function TooltipDot({
  color,
  haloOpacity = 0.3,
  haloScale = 2.6,
  size = 5,
  strokeColor = "transparent",
  strokeWidth = 0,
  variant = "dot",
  cornerRadiusFraction = 0.25,
  x,
  y,
}: TooltipDotProps) {
  return (
    <>
      {variant === "dot" && haloScale > 1 && haloOpacity > 0 ? (
        <Circle
          cx={x}
          cy={y}
          fill={color}
          fillOpacity={haloOpacity}
          r={size * haloScale}
        />
      ) : null}
      {variant === "ring" ? (
        <Rect
          fill="transparent"
          height={size * 2}
          rx={size * 2 * Math.max(0, Math.min(0.5, cornerRadiusFraction))}
          ry={size * 2 * Math.max(0, Math.min(0.5, cornerRadiusFraction))}
          stroke={color}
          strokeWidth={Math.max(1, strokeWidth || 1.5)}
          width={size * 2}
          x={x - size}
          y={y - size}
        />
      ) : (
        <Circle
          cx={x}
          cy={y}
          fill={color}
          r={size}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
    </>
  );
}

export interface DateTickerProps {
  currentIndex: number;
  labels: readonly string[];
  visible: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Compact date pill that follows the selected point, with reduced-motion support. */
export function DateTicker({
  currentIndex,
  labels,
  visible,
  style,
}: DateTickerProps) {
  const chart = useContext(NativeChartContext);
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
    } else if (reduceMotion) {
      opacity.value = 1;
    } else {
      opacity.value = withTiming(1, {
        duration: 100,
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [opacity, reduceMotion, visible]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!visible) {
    return null;
  }
  return (
    <AnimatedView
      style={[
        styles.datePill,
        {
          backgroundColor: chart?.theme.textColor ?? "#1f2937",
        },
        animatedStyle,
        style,
      ]}
    >
      <Text
        style={[
          styles.dateText,
          { color: chart?.theme.surfaceColor ?? "#ffffff" },
        ]}
      >
        {labels[currentIndex] ?? labels[0] ?? ""}
      </Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderColor: "rgba(127, 140, 150, 0.2)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    maxWidth: 204,
    minWidth: 156,
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    zIndex: 20,
  },
  content: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePill: {
    alignSelf: "center",
    backgroundColor: "#1f2937",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    position: "absolute",
  },
  dateText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  header: {
    borderBottomColor: "rgba(127, 140, 150, 0.2)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: "#52606d",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  labelGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    minWidth: 0,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  rowLabel: {
    color: "#65717b",
    flexShrink: 1,
    fontSize: 12,
  },
  rowValue: {
    color: "#20282e",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    textAlign: "right",
  },
});
