import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  Platform,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Rect, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { useChartTheme } from "../theme";
import {
  type BarOrientation,
  buildBarNumericTicks,
  type NativeChartMargin,
  projectBarRectangles,
  resolveEndpointTextAnchor,
  resolveRatioTextAnchor,
  resolveValueDomain,
} from "./geometry";

export type { BarOrientation } from "./geometry";
export type BarLineCap = "round" | "butt" | number;
export type BarAnimationType = "grow" | "fade";

function barTickAnchor(
  orientation: BarOrientation,
  ratio: number
): "end" | "middle" | "start" {
  return orientation === "vertical" ? "end" : resolveRatioTextAnchor(ratio);
}

export interface BarProps {
  dataKey: string;
  yAxisId?: string | number;
  fill?: string;
  stroke?: string;
  lineCap?: BarLineCap;
  animate?: boolean;
  animationType?: BarAnimationType;
  fadedOpacity?: number;
  staggerDelay?: number;
  stackGap?: number;
  groupGap?: number;
  perspective?: boolean;
  minBarHeight?: number;
}

export interface BarXAxisProps {
  formatTick?: (value: unknown) => string;
  textColor?: string;
}

export interface BarYAxisProps {
  formatValue?: (value: number) => string;
  numTicks?: number;
  textColor?: string;
  width?: number;
}

export interface BarChartProps<T extends object> {
  data: readonly T[];
  xDataKey?: keyof T & string;
  margin?: Partial<NativeChartMargin>;
  animationDuration?: number;
  animationKey?: string | number;
  barGap?: number;
  barWidth?: number;
  maxBarSize?: number;
  orientation?: BarOrientation;
  stacked?: boolean;
  stackGap?: number;
  height?: number;
  children?: ReactNode;
  onSelectIndex?: (index: number) => void;
  selectedIndex?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Bar(_props: BarProps): null {
  return null;
}
Bar.displayName = "Bar";

export function BarXAxis(_props: BarXAxisProps): null {
  return null;
}
BarXAxis.displayName = "BarXAxis";

export function BarYAxis(_props: BarYAxisProps): null {
  return null;
}
BarYAxis.displayName = "BarYAxis";

type LayerElement = ReactElement<Record<string, unknown>>;

function flattenChildren(children: ReactNode): LayerElement[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) {
      return [];
    }
    if (child.type === Fragment) {
      return flattenChildren(
        (child.props as { children?: ReactNode }).children
      );
    }
    return [child as LayerElement];
  });
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function AnimatedBar({
  x,
  y,
  width,
  height,
  fill,
  radius,
  selected,
  fadedOpacity,
  animationType,
  animate,
  animationDuration,
  animationKey,
  ordinal,
  staggerDelayMs,
  onSelect,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  radius: number;
  selected: boolean;
  fadedOpacity: number;
  animationType: BarAnimationType;
  animate: boolean;
  animationDuration: number;
  animationKey?: string | number;
  ordinal: number;
  staggerDelayMs: number;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && animationDuration > 0;
  const selectedOpacity = selected ? 1 : fadedOpacity;
  const progress = useSharedValue(shouldAnimate ? 0 : 1);
  const animatedProps = useAnimatedProps(() => {
    const amount = progress.value;
    const renderedHeight = Math.max(0, height * amount);
    return {
      opacity:
        (animationType === "fade" ? amount : 1) * (selected ? 1 : fadedOpacity),
      y: animationType === "fade" ? y : y + height - renderedHeight,
      height: animationType === "fade" ? height : renderedHeight,
    };
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey deliberately retriggers native chart entrance.
  useEffect(() => {
    if (shouldAnimate) {
      progress.value = 0;
      progress.value = withDelay(
        Math.max(0, ordinal * staggerDelayMs),
        withTiming(1, {
          duration: Math.max(0, animationDuration),
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );
    } else {
      progress.value = 1;
    }
  }, [
    animate,
    animationDuration,
    animationKey,
    ordinal,
    progress,
    reduceMotion,
    shouldAnimate,
    staggerDelayMs,
  ]);
  return (
    <AnimatedRect
      animatedProps={animatedProps}
      fill={fill}
      // Web also needs valid static geometry when no shared value changes.
      height={shouldAnimate && animationType === "grow" ? 0 : height}
      onPress={onSelect}
      opacity={shouldAnimate && animationType === "fade" ? 0 : selectedOpacity}
      rx={radius}
      ry={radius}
      width={width}
      x={x}
      y={shouldAnimate && animationType === "grow" ? y + height : y}
    />
  );
}

function resolveLeftMargin(
  orientation: BarOrientation,
  hasYAxis: boolean
): number {
  if (orientation === "horizontal") {
    return 86;
  }
  return hasYAxis ? 48 : 12;
}

function resolveBarRadius(
  layer: BarProps | undefined,
  bandSize: number
): number {
  if (typeof layer?.lineCap === "number") {
    return layer.lineCap;
  }
  if (layer?.lineCap === "butt") {
    return 0;
  }
  return Math.min(bandSize / 2, 8);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this chart boundary combines marker parsing, native selection, responsive layout, and SVG axis/mark rendering.
export function BarChart<T extends object>({
  data,
  xDataKey = "name" as keyof T & string,
  margin: marginProp,
  animationDuration = 1100,
  animationKey,
  barGap = 0.22,
  barWidth,
  maxBarSize = 52,
  orientation = "vertical",
  stacked = false,
  stackGap = 0,
  height = 248,
  children,
  onSelectIndex,
  selectedIndex,
  accessibilityLabel = "Bar chart",
  style,
}: BarChartProps<T>) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const [internalIndex, setInternalIndex] = useState<number | null>(null);
  const currentIndex = selectedIndex ?? internalIndex;
  const elements = useMemo(() => flattenChildren(children), [children]);
  const bars = useMemo(
    () =>
      elements
        .filter((element) => element.type === Bar)
        .map((element) => element.props as unknown as BarProps),
    [elements]
  );
  const xAxis = elements.find((element) => element.type === BarXAxis)?.props as
    | BarXAxisProps
    | undefined;
  const yAxis = elements.find((element) => element.type === BarYAxis)?.props as
    | BarYAxisProps
    | undefined;
  const keys = useMemo(() => bars.map((bar) => bar.dataKey), [bars]);
  const margin: NativeChartMargin = {
    bottom:
      marginProp?.bottom ?? (orientation === "vertical" && xAxis ? 34 : 14),
    left: marginProp?.left ?? resolveLeftMargin(orientation, Boolean(yAxis)),
    right: marginProp?.right ?? 12,
    top: marginProp?.top ?? 12,
  };
  const plot = useMemo(
    () => ({
      left: margin.left,
      top: margin.top,
      width: Math.max(0, width - margin.left - margin.right),
      height: Math.max(0, height - margin.top - margin.bottom),
    }),
    [height, margin.bottom, margin.left, margin.right, margin.top, width]
  );
  const domain = useMemo(
    () => resolveValueDomain(data, keys, stacked),
    [data, keys, stacked]
  );
  const ticks = useMemo(
    () => buildBarNumericTicks(domain, yAxis?.numTicks ?? 5, orientation),
    [domain, orientation, yAxis?.numTicks]
  );
  const rectangles = useMemo(
    () =>
      projectBarRectangles({
        data,
        dataKeys: keys,
        plot,
        domain,
        orientation,
        stacked,
        barGap,
        barWidth,
        maxBarWidth: maxBarSize,
        stackGap,
        groupGaps: bars
          .slice(1)
          .map((bar) => bar.groupGap ?? bars[0]?.groupGap ?? 4),
        stackGaps: bars.map((bar) => bar.stackGap ?? stackGap),
      }),
    [
      barGap,
      barWidth,
      bars,
      data,
      domain,
      maxBarSize,
      orientation,
      plot,
      stackGap,
      stacked,
      keys,
    ]
  );
  const visibleRectangles = useMemo(
    () =>
      rectangles.map((rect) => {
        const minHeight = bars[rect.seriesIndex]?.minBarHeight ?? 0;
        if (
          stacked ||
          orientation !== "vertical" ||
          rect.value < 0 ||
          minHeight <= rect.height
        ) {
          return rect;
        }
        const baselineY =
          plot.top + ((domain[1] - 0) / (domain[1] - domain[0])) * plot.height;
        return {
          ...rect,
          y: baselineY - minHeight,
          height: minHeight,
        };
      }),
    [bars, domain, orientation, plot, rectangles, stacked]
  );
  const selectionText =
    currentIndex === null || !data[currentIndex]
      ? `Select a category from ${data.length} bars`
      : `${String(data[currentIndex]?.[xDataKey] ?? "Category")}: ${keys
          .map(
            (key) =>
              `${key} ${String((data[currentIndex] as Record<string, unknown>)[key] ?? "—")}`
          )
          .join(", ")}`;
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") {
      setInternalIndex((current) => {
        const next = Math.min(data.length - 1, (current ?? -1) + 1);
        onSelectIndex?.(next);
        return next;
      });
    } else if (event.nativeEvent.actionName === "decrement") {
      setInternalIndex((current) => {
        const next = Math.max(0, (current ?? data.length) - 1);
        onSelectIndex?.(next);
        return next;
      });
    }
  };
  const baseline =
    orientation === "vertical"
      ? margin.top + ((domain[1] - 0) / (domain[1] - domain[0])) * plot.height
      : margin.left + ((0 - domain[0]) / (domain[1] - domain[0])) * plot.width;
  const xTickLabel =
    xAxis?.formatTick ?? ((value: unknown) => String(value ?? ""));
  const yTickLabel = yAxis?.formatValue ?? formatCompact;

  return (
    <View
      accessibilityActions={[
        { name: "increment", label: "Select next category" },
        { name: "decrement", label: "Select previous category" },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: Math.max(0, data.length - 1),
        now: Math.max(0, currentIndex ?? 0),
        text: selectionText,
      }}
      accessible
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      style={[styles.root, { height }, style]}
    >
      {width > 0 && (
        <Svg
          fontFamily={
            Platform.OS === "web" ? "system-ui, sans-serif" : undefined
          }
          height={height}
          width={width}
        >
          {ticks.map((tick) => {
            const y = margin.top + tick.ratio * plot.height;
            const x = margin.left + tick.ratio * plot.width;
            const tickAnchor = barTickAnchor(orientation, tick.ratio);
            return (
              <Fragment key={`tick-${tick.value}`}>
                <SvgLine
                  stroke={theme.gridColor}
                  strokeDasharray="3,4"
                  strokeWidth={1}
                  x1={orientation === "vertical" ? margin.left : x}
                  x2={orientation === "vertical" ? width - margin.right : x}
                  y1={orientation === "vertical" ? y : margin.top}
                  y2={orientation === "vertical" ? y : height - margin.bottom}
                />
                <SvgText
                  fill={yAxis?.textColor ?? theme.textColor}
                  fontSize={10}
                  textAnchor={tickAnchor}
                  x={orientation === "vertical" ? margin.left - 7 : x}
                  y={
                    orientation === "vertical"
                      ? y + 3
                      : height - margin.bottom + 16
                  }
                >
                  {yTickLabel(tick.value)}
                </SvgText>
              </Fragment>
            );
          })}
          <SvgLine
            stroke={theme.gridColor}
            strokeWidth={1}
            x1={orientation === "vertical" ? margin.left : baseline}
            x2={orientation === "vertical" ? width - margin.right : baseline}
            y1={orientation === "vertical" ? baseline : margin.top}
            y2={orientation === "vertical" ? baseline : height - margin.bottom}
          />
          {orientation === "vertical" &&
            xAxis &&
            data.map((row, index) => (
              <SvgText
                fill={xAxis.textColor ?? theme.textColor}
                fontSize={10}
                key={`category-${String(row[xDataKey])}:${index}`}
                textAnchor={resolveEndpointTextAnchor(index, data.length)}
                x={
                  margin.left +
                  ((index + 0.5) * plot.width) / Math.max(1, data.length)
                }
                y={height - margin.bottom + 17}
              >
                {xTickLabel(row[xDataKey])}
              </SvgText>
            ))}
          {orientation === "horizontal" &&
            data.map((row, index) => (
              <SvgText
                fill={xAxis?.textColor ?? theme.textColor}
                fontSize={10}
                key={`category-${String(row[xDataKey])}:${index}`}
                textAnchor="end"
                x={margin.left - 8}
                y={
                  margin.top +
                  ((index + 0.5) * plot.height) / Math.max(1, data.length) +
                  3
                }
              >
                {xTickLabel(row[xDataKey])}
              </SvgText>
            ))}
          {visibleRectangles.map((rect) => {
            const layer = bars[rect.seriesIndex];
            const color =
              layer?.fill ??
              theme.seriesColors[
                rect.seriesIndex % theme.seriesColors.length
              ] ??
              theme.color;
            const selected =
              currentIndex === null || currentIndex === rect.dataIndex;
            const radius = resolveBarRadius(
              layer,
              orientation === "vertical" ? rect.width : rect.height
            );
            let staggerDelayMs = 0;
            if (typeof layer?.staggerDelay === "number") {
              staggerDelayMs = Math.max(0, layer.staggerDelay * 1000);
            } else if (data.length > 1) {
              staggerDelayMs = (animationDuration * 0.4) / data.length;
            }
            return (
              <AnimatedBar
                animate={layer?.animate !== false}
                animationDuration={animationDuration}
                animationKey={animationKey}
                animationType={layer?.animationType ?? "grow"}
                fadedOpacity={layer?.fadedOpacity ?? 0.3}
                fill={color}
                height={rect.height}
                key={`${rect.dataKey}:${rect.dataIndex}:${rect.seriesIndex}`}
                onSelect={() => {
                  setInternalIndex(rect.dataIndex);
                  onSelectIndex?.(rect.dataIndex);
                }}
                ordinal={rect.dataIndex}
                radius={radius}
                selected={selected}
                staggerDelayMs={staggerDelayMs}
                width={rect.width}
                x={rect.x}
                y={rect.y}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "visible", width: "100%" },
});
