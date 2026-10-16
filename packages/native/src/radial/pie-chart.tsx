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
import { createPieArcs, type RadialDatum } from "./geometry";
import { PieProvider } from "./pie-context";

export interface PieData extends RadialDatum {}

export interface PieChartProps {
  data: readonly PieData[];
  size?: number;
  innerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  hoverOffset?: number;
  children?: ReactNode;
  enterStaggerScale?: number;
  animationKey?: string | number;
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

export function PieChart({
  data,
  size: fixedSize,
  innerRadius = 0,
  padAngle = 0,
  cornerRadius = 0,
  startAngle = -Math.PI / 2,
  endAngle = (3 * Math.PI) / 2,
  hoveredIndex,
  onHoverChange,
  hoverOffset = 10,
  children,
  enterStaggerScale = 1,
  animationKey,
  accessibilityLabel = "Pie chart",
  style,
}: PieChartProps) {
  const theme = useChartTheme();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<
    number | null
  >(null);
  const chartSize = Math.max(0, fixedSize ?? measuredWidth);
  const activeIndex =
    hoveredIndex === undefined ? internalHoveredIndex : hoveredIndex;
  const arcs = useMemo(
    () => createPieArcs(data, startAngle, endAngle, padAngle),
    [data, endAngle, padAngle, startAngle]
  );
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
  const getFill = useCallback(
    (index: number) => data[index]?.fill ?? getColor(index),
    [data, getColor]
  );
  const totalValue = useMemo(
    () =>
      data.reduce(
        (sum, item) =>
          sum + (Number.isFinite(item.value) ? Math.max(0, item.value) : 0),
        0
      ),
    [data]
  );
  const value = useMemo(
    () => ({
      arcs,
      data,
      hoveredIndex: activeIndex,
      innerRadius: Math.max(0, innerRadius),
      outerRadius: Math.max(0, chartSize / 2 - Math.max(0, hoverOffset)),
      cornerRadius: Math.max(0, cornerRadius),
      padAngle: Math.max(0, padAngle),
      hoverOffset: Math.max(0, hoverOffset),
      enterStaggerScale: Math.max(0, enterStaggerScale),
      animationKey,
      setHoveredIndex,
      totalValue,
      getColor,
      getFill,
    }),
    [
      activeIndex,
      arcs,
      animationKey,
      chartSize,
      cornerRadius,
      data,
      enterStaggerScale,
      getColor,
      getFill,
      hoverOffset,
      innerRadius,
      padAngle,
      setHoveredIndex,
      totalValue,
    ]
  );
  const onLayout = (event: LayoutChangeEvent) =>
    setMeasuredWidth(event.nativeEvent.layout.width);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (arcs.length === 0) {
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
    const current = activeIndex ?? (direction > 0 ? -1 : arcs.length);
    setHoveredIndex(
      Math.max(0, Math.min(arcs.length - 1, current + direction))
    );
  };
  const selected = activeIndex === null ? undefined : data[activeIndex];
  const { chartChildren: svgChildren, overlayChildren } =
    partitionChartChildren(
      children,
      (child) => childName(child) === "PieCenter"
    );

  return (
    <PieProvider value={value}>
      <View
        accessibilityActions={[
          { name: "increment", label: "Select next pie slice" },
          { name: "decrement", label: "Select previous pie slice" },
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: 0,
          max: Math.max(0, arcs.length - 1),
          now: activeIndex ?? 0,
          text: selected
            ? `${selected.label}: ${selected.value}`
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
        {chartSize > 0 && (
          <Svg height={chartSize} width={chartSize}>
            <G x={chartSize / 2} y={chartSize / 2}>
              {svgChildren}
            </G>
          </Svg>
        )}
        {overlayChildren.length > 0 && (
          <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, styles.centerOverlay]}
          >
            {overlayChildren}
          </View>
        )}
      </View>
    </PieProvider>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "center", overflow: "visible", position: "relative" },
  responsive: { aspectRatio: 1, width: "100%" },
  centerOverlay: { alignItems: "center", justifyContent: "center" },
});
