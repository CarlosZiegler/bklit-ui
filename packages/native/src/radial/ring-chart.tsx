import {
  isValidElement,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
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
import { partitionChartChildren } from "./children";
import { type RingData, RingProvider } from "./ring-context";

export interface RingChartProps {
  data: readonly RingData[];
  size?: number;
  strokeWidth?: number;
  ringGap?: number;
  baseInnerRadius?: number;
  animationDuration?: number;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  startAngle?: number;
  endAngle?: number;
  enterStaggerScale?: number;
  animationKey?: string | number;
  children?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

function childName(child: ReactNode): string | null {
  if (!isValidElement(child)) {
    return null;
  }
  const type = child.type as { displayName?: string; name?: string };
  return type.displayName ?? type.name ?? null;
}

export function RingChart({
  data,
  size: fixedSize,
  strokeWidth: requestedStrokeWidth = 12,
  ringGap: requestedRingGap = 6,
  baseInnerRadius: requestedBaseInnerRadius = 60,
  animationDuration = 1100,
  hoveredIndex,
  onHoverChange,
  startAngle = -Math.PI / 2,
  endAngle = (3 * Math.PI) / 2,
  enterStaggerScale = 1,
  animationKey,
  children,
  accessibilityLabel = "Ring chart",
  style,
}: RingChartProps) {
  const theme = useChartTheme();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<
    number | null
  >(null);
  const size = Math.max(0, fixedSize ?? measuredWidth);
  const activeIndex =
    hoveredIndex === undefined ? internalHoveredIndex : hoveredIndex;
  const requestedOuterRadius =
    Math.max(0, requestedBaseInnerRadius) +
    Math.max(0, data.length - 1) *
      (Math.max(0, requestedStrokeWidth) + Math.max(0, requestedRingGap)) +
    Math.max(0, requestedStrokeWidth);
  const scale =
    requestedOuterRadius > 0
      ? Math.min(1, Math.max(0, size / 2 - 8) / requestedOuterRadius)
      : 1;
  const strokeWidth = Math.max(0, requestedStrokeWidth) * scale;
  const ringGap = Math.max(0, requestedRingGap) * scale;
  const baseInnerRadius = Math.max(0, requestedBaseInnerRadius) * scale;
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
  const getRingRadii = useCallback(
    (index: number) => {
      const innerRadius = baseInnerRadius + index * (strokeWidth + ringGap);
      return { innerRadius, outerRadius: innerRadius + strokeWidth };
    },
    [baseInnerRadius, ringGap, strokeWidth]
  );
  const totalValue = useMemo(
    () =>
      data.reduce(
        (sum, ring) => sum + (Number.isFinite(ring.value) ? ring.value : 0),
        0
      ),
    [data]
  );
  const value = useMemo(
    () => ({
      data,
      size,
      hoveredIndex: activeIndex,
      setHoveredIndex,
      strokeWidth,
      ringGap,
      baseInnerRadius,
      startAngle,
      endAngle,
      totalValue,
      animationDuration: Math.max(0, animationDuration),
      enterStaggerScale: Math.max(0, enterStaggerScale),
      animationKey,
      getColor,
      getRingRadii,
    }),
    [
      activeIndex,
      animationDuration,
      animationKey,
      baseInnerRadius,
      data,
      endAngle,
      enterStaggerScale,
      getColor,
      getRingRadii,
      ringGap,
      setHoveredIndex,
      size,
      startAngle,
      strokeWidth,
      totalValue,
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
  const { chartChildren: svgChildren, overlayChildren: overlays } =
    partitionChartChildren(
      children,
      (child) => childName(child) === "RingCenter"
    );

  return (
    <RingProvider value={value}>
      <View
        accessibilityActions={[
          { name: "increment", label: "Select next ring" },
          { name: "decrement", label: "Select previous ring" },
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: 0,
          max: Math.max(0, data.length - 1),
          now: activeIndex ?? 0,
          text: selected
            ? `${selected.label}: ${selected.value} of ${selected.maxValue}`
            : `Total ${totalValue}`,
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
          <Svg height={size} width={size}>
            <G x={size / 2} y={size / 2}>
              {svgChildren}
            </G>
          </Svg>
        )}
        {overlays.length > 0 && (
          <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, styles.centerOverlay]}
          >
            {overlays}
          </View>
        )}
      </View>
    </RingProvider>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "center", overflow: "visible", position: "relative" },
  responsive: { aspectRatio: 1, width: "100%" },
  centerOverlay: { alignItems: "center", justifyContent: "center" },
});
