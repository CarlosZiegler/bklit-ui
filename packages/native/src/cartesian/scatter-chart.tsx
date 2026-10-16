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
  Text,
  useWindowDimensions,
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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line as SvgLine,
  Text as SvgText,
} from "react-native-svg";
import {
  ChartTooltip,
  type ChartTooltipProps,
  Grid,
  type GridProps,
  XAxis,
  type XAxisProps,
  YAxis,
  type YAxisProps,
} from "../cartesian-chart";
import { type CartesianXScale, createCartesianModel } from "../cartesian-model";
import type { PlotPadding } from "../geometry";
import { useChartTheme } from "../theme";
import {
  insetPlotRatio,
  resolveEndpointTextAnchor,
  selectReadableTickIndices,
} from "./geometry";

export interface ScatterProps {
  dataKey: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  ringGap?: number;
  outlineWidth?: number;
  outlineColor?: string;
  radius?: number;
  yAxisId?: string | number;
  animate?: boolean;
  fadeOnHover?: boolean;
  inactiveOpacity?: number;
  inactiveBlur?: number;
  enterBlur?: number;
  showActiveHighlight?: boolean;
  yGradient?: boolean | { from?: string; to?: string };
}

export interface ScatterChartProps<T extends object> {
  data: readonly T[];
  xDataKey?: keyof T & string;
  xScale?: CartesianXScale;
  margin?: PlotPadding;
  animationDuration?: number;
  animationKey?: string | number;
  height?: number;
  aspectRatio?: number;
  children?: ReactNode;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Scatter(_props: ScatterProps): null {
  return null;
}
Scatter.displayName = "Scatter";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DEFAULT_GRADIENT_FROM = "#dc2626";
const DEFAULT_GRADIENT_TO = "#16a34a";

type Element = ReactElement<Record<string, unknown>>;
function flatten(children: ReactNode): Element[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) {
      return [];
    }
    if (child.type === Fragment) {
      return flatten((child.props as { children?: ReactNode }).children);
    }
    return [child as Element];
  });
}

function formatX(value: unknown, scale: CartesianXScale): string {
  if (scale === "time") {
    const time =
      value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(time)
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(time)
      : "";
  }
  return String(value ?? "");
}

function formatY(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function ScatterPoint({
  cx,
  cy,
  radius,
  fill,
  stroke,
  strokeWidth,
  ringGap,
  outlineWidth,
  outlineColor,
  selected,
  fadedOpacity,
  activeHighlight,
  animate,
  animationDuration,
  animationKey,
  ordinal,
  onSelect,
}: {
  cx: number;
  cy: number;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  ringGap: number;
  outlineWidth: number;
  outlineColor: string;
  selected: boolean;
  fadedOpacity: number;
  activeHighlight: boolean;
  animate: boolean;
  animationDuration: number;
  animationKey?: string | number;
  ordinal: number;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(!animate || reduceMotion ? 1 : 0);
  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value * (selected ? 1 : fadedOpacity),
    r: Math.max(0, radius * progress.value),
  }));
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey is a replay token that intentionally restarts this entrance effect.
  useEffect(() => {
    if (animate && !reduceMotion) {
      progress.value = 0;
      progress.value = withDelay(
        ordinal * 20,
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
  ]);
  return (
    <>
      {selected && activeHighlight && (
        <Circle
          cx={cx}
          cy={cy}
          fill="none"
          r={radius * 1.6}
          stroke={fill}
          strokeOpacity={0.32}
          strokeWidth={2}
        />
      )}
      {ringGap > 0 && (
        <Circle
          cx={cx}
          cy={cy}
          fill={fill}
          opacity={selected ? 1 : fadedOpacity}
          r={radius + ringGap}
          stroke={outlineColor}
          strokeWidth={outlineWidth > 0 ? outlineWidth : ringGap}
        />
      )}
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={cx}
        cy={cy}
        fill={fill}
        onPress={onSelect}
        r={radius}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </>
  );
}

export function ScatterChart<T extends object>({
  data,
  xDataKey = "date" as keyof T & string,
  xScale = "time",
  margin: marginProp,
  animationDuration = 900,
  animationKey,
  height: fixedHeight,
  aspectRatio = 2,
  children,
  selectedIndex,
  onSelectIndex,
  accessibilityLabel = "Scatter chart",
  style,
}: ScatterChartProps<T>) {
  const theme = useChartTheme();
  const { fontScale } = useWindowDimensions();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const width = layout.width;
  const height = fixedHeight ?? (layout.height || 248);
  const [internalIndex, setInternalIndex] = useState<number | null>(null);
  const index = selectedIndex ?? internalIndex;
  const elements = useMemo(() => flatten(children), [children]);
  const series = useMemo(
    () =>
      elements
        .filter((element) => element.type === Scatter)
        .map((element) => element.props as unknown as ScatterProps),
    [elements]
  );
  const grid = elements.find((element) => element.type === Grid)?.props as
    | GridProps
    | undefined;
  const xAxis = elements.find((element) => element.type === XAxis)?.props as
    | XAxisProps
    | undefined;
  const yAxis = elements.find((element) => element.type === YAxis)?.props as
    | YAxisProps
    | undefined;
  const tooltip = elements.find((element) => element.type === ChartTooltip)
    ?.props as ChartTooltipProps | undefined;
  const keys = useMemo(() => series.map((item) => item.dataKey), [series]);
  const margin = useMemo(
    () => ({
      top: marginProp?.top ?? 16,
      right: marginProp?.right ?? 12,
      bottom: marginProp?.bottom ?? (xAxis ? 32 : 12),
      left: marginProp?.left ?? (yAxis ? (yAxis.width ?? 48) : 12),
    }),
    [
      marginProp?.bottom,
      marginProp?.left,
      marginProp?.right,
      marginProp?.top,
      xAxis,
      yAxis,
    ]
  );
  const model = useMemo(
    () =>
      createCartesianModel({
        data,
        dataKeys: keys,
        height,
        margin,
        width,
        xDataKey,
        xScale,
      }),
    [data, height, keys, margin, width, xDataKey, xScale]
  );
  const selected = index === null ? undefined : data[index];
  const selectedRecord = selected as Record<string, unknown> | undefined;
  const selectionText = selectedRecord
    ? `${formatX(selectedRecord[xDataKey], xScale)} · ${series
        .map(
          (item) =>
            `${item.dataKey}: ${String(selectedRecord[item.dataKey] ?? "—")}`
        )
        .join(", ")}`
    : `${data.length} points across ${series.length} series`;
  const onLayout = (event: LayoutChangeEvent) =>
    setLayout({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    let step = 0;
    if (event.nativeEvent.actionName === "increment") {
      step = 1;
    } else if (event.nativeEvent.actionName === "decrement") {
      step = -1;
    }
    if (step === 0 || data.length === 0) {
      return;
    }
    const next = Math.max(
      0,
      Math.min(data.length - 1, (index ?? (step > 0 ? -1 : data.length)) + step)
    );
    setInternalIndex(next);
    onSelectIndex?.(next);
  };
  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const plotHeight = Math.max(0, height - margin.top - margin.bottom);
  const pointInset = Math.max(
    0,
    ...series.map((item) => {
      const radius = item.radius ?? 5;
      return (
        Math.max(
          radius * 1.6 + 1,
          radius + (item.ringGap ?? 2) + (item.outlineWidth ?? 0) / 2,
          radius + (item.strokeWidth ?? 2) / 2
        ) + 2
      );
    })
  );
  const xCoordinate = (ratio: number) =>
    margin.left + insetPlotRatio(ratio, plotWidth, pointInset) * plotWidth;
  const yDomain = model.yDomain ?? [0, 1];
  const yTickCount = Math.max(2, Math.floor(yAxis?.numTicks ?? 5));
  const yFormat = yAxis?.formatValue ?? formatY;
  const xFormat =
    xAxis?.formatTick ?? ((value: unknown) => formatX(value, xScale));
  const xTickIndices = selectReadableTickIndices(
    data.map((row) => xFormat(row[xDataKey])),
    model.xPositions,
    plotWidth,
    xAxis?.numTicks ?? 5,
    fontScale
  );
  const xAxisFontSize = 10 * fontScale;

  return (
    <View
      accessibilityActions={[
        { name: "increment", label: "Select next point" },
        { name: "decrement", label: "Select previous point" },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: Math.max(0, data.length - 1),
        now: Math.max(0, index ?? 0),
        text: selectionText,
      }}
      accessible
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      style={[
        styles.root,
        fixedHeight === undefined ? { aspectRatio } : { height: fixedHeight },
        style,
      ]}
    >
      {width > 0 && (
        <Svg
          fontFamily={
            Platform.OS === "web" ? "system-ui, sans-serif" : undefined
          }
          height={height}
          width={width}
        >
          {grid?.horizontal !== false &&
            Array.from({ length: yTickCount }, (_, tick) => {
              const ratio = tick / (yTickCount - 1);
              const y = margin.top + ratio * plotHeight;
              const value = yDomain[1] - ratio * (yDomain[1] - yDomain[0]);
              return (
                <Fragment key={`y-${ratio}`}>
                  <SvgLine
                    stroke={grid?.stroke ?? theme.gridColor}
                    strokeDasharray={grid?.strokeDasharray ?? "3,4"}
                    strokeWidth={grid?.strokeWidth ?? 1}
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={y}
                    y2={y}
                  />
                  {yAxis && (
                    <SvgText
                      fill={yAxis.textColor ?? theme.textColor}
                      fontSize={10}
                      textAnchor="end"
                      x={margin.left - 7}
                      y={y + 3}
                    >
                      {yFormat(value)}
                    </SvgText>
                  )}
                </Fragment>
              );
            })}
          {grid?.vertical &&
            xTickIndices.map((dataIndex) => {
              const ratio = model.xPositions[dataIndex] ?? 0;
              const x = xCoordinate(ratio);
              return (
                <SvgLine
                  key={`x-grid-${dataIndex}`}
                  stroke={grid.stroke ?? theme.gridColor}
                  strokeDasharray={grid.strokeDasharray ?? "3,4"}
                  strokeWidth={grid.strokeWidth ?? 1}
                  x1={x}
                  x2={x}
                  y1={margin.top}
                  y2={height - margin.bottom}
                />
              );
            })}
          {xAxis &&
            xTickIndices.map((dataIndex) => {
              const ratio = model.xPositions[dataIndex] ?? 0;
              const row = data[dataIndex];
              if (!row) {
                return null;
              }
              return (
                <SvgText
                  fill={xAxis.textColor ?? theme.textColor}
                  fontSize={xAxisFontSize}
                  key={`x-label-${dataIndex}`}
                  textAnchor={resolveEndpointTextAnchor(dataIndex, data.length)}
                  x={xCoordinate(ratio)}
                  y={height - margin.bottom + 18}
                >
                  {xFormat(row[xDataKey])}
                </SvgText>
              );
            })}
          {series.flatMap((item, seriesIndex) => {
            const geometry = model.geometries.get(item.dataKey);
            if (!geometry) {
              return [];
            }
            const fallback =
              theme.seriesColors[seriesIndex % theme.seriesColors.length] ??
              theme.color;
            const fill = item.fill ?? fallback;
            const gradientId = `scatter-${seriesIndex}-y-gradient`;
            let gradient: { from: string; to: string } | undefined;
            if (item.yGradient === true) {
              gradient = {
                from: DEFAULT_GRADIENT_FROM,
                to: DEFAULT_GRADIENT_TO,
              };
            } else if (item.yGradient) {
              gradient = {
                from: item.yGradient.from ?? DEFAULT_GRADIENT_FROM,
                to: item.yGradient.to ?? DEFAULT_GRADIENT_TO,
              };
            }
            return [
              <Fragment key={`scatter-${seriesIndex}-${item.dataKey}`}>
                {gradient && (
                  <Defs>
                    <LinearGradient
                      gradientUnits="userSpaceOnUse"
                      id={gradientId}
                      x1={0}
                      x2={0}
                      y1={height - margin.bottom}
                      y2={margin.top}
                    >
                      <Stop offset="0%" stopColor={gradient.from} />
                      <Stop offset="100%" stopColor={gradient.to} />
                    </LinearGradient>
                  </Defs>
                )}
                {geometry.points.map((point, ordinal) => (
                  <ScatterPoint
                    activeHighlight={item.showActiveHighlight !== false}
                    animate={item.animate !== false}
                    animationDuration={animationDuration}
                    animationKey={animationKey}
                    cx={xCoordinate(
                      plotWidth > 0 ? (point.x - margin.left) / plotWidth : 0.5
                    )}
                    cy={point.y}
                    fadedOpacity={
                      item.fadeOnHover === false
                        ? 1
                        : (item.inactiveOpacity ?? 0.5)
                    }
                    fill={gradient ? `url(#${gradientId})` : fill}
                    key={`scatter-point-${seriesIndex}-${point.index}`}
                    onSelect={() => {
                      setInternalIndex(point.index);
                      onSelectIndex?.(point.index);
                    }}
                    ordinal={ordinal}
                    outlineColor={item.outlineColor ?? theme.surfaceColor}
                    outlineWidth={item.outlineWidth ?? 0}
                    radius={item.radius ?? 5}
                    ringGap={item.ringGap ?? 2}
                    selected={index === null || index === point.index}
                    stroke={item.stroke ?? fill}
                    strokeWidth={item.strokeWidth ?? 2}
                  />
                ))}
              </Fragment>,
            ];
          })}
        </Svg>
      )}
      {tooltip && selected && (
        <View pointerEvents="none" style={styles.readout}>
          <Text style={[styles.readoutText, { color: theme.textColor }]}>
            {selectionText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 150,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  readout: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 8,
    bottom: 6,
    left: 8,
    maxWidth: "92%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  readoutText: { fontSize: 11, fontVariant: ["tabular-nums"] },
});
