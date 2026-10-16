import { type CurveFactory, curveMonotoneX } from "d3-shape";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Line as SvgLine,
  Text as SvgText,
} from "react-native-svg";
import {
  ChartTooltip,
  type ChartTooltipProps,
  Grid,
  type GridProps,
} from "../cartesian-chart";
import { createCartesianModel } from "../cartesian-model";
import type { PlotPadding } from "../geometry";
import { createSeriesGeometry } from "../geometry";
import { useChartTheme } from "../theme";
import {
  buildLinePath,
  format24HourTime,
  isHorizontalPan,
  resolveRatioTextAnchor,
  resolveTickCountForWidth,
} from "./geometry";

export type Momentum = "up" | "down" | "flat";
export interface MomentumColors {
  up: string;
  down: string;
  flat: string;
}

export interface LiveLinePoint {
  time: number;
  value: number;
}

export interface LiveLineProps {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveFactory;
  fill?: boolean;
  pulse?: boolean;
  dotSize?: number;
  badge?: boolean;
  formatValue?: (value: number) => string;
  momentumColors?: MomentumColors;
}

export interface LiveXAxisProps {
  numTicks?: number;
  formatTime?: (timeMs: number) => string;
}

export interface LiveYAxisProps {
  minGap?: number;
  position?: "left" | "right";
  formatValue?: (value: number) => string;
  allowDecimals?: boolean;
}

export interface LiveLineChartProps {
  data: readonly LiveLinePoint[];
  value: number;
  dataKey?: string;
  window?: number;
  numXTicks?: number;
  nowOffsetUnits?: number;
  exaggerate?: boolean;
  lerpSpeed?: number;
  margin?: PlotPadding;
  paused?: boolean;
  children?: ReactNode;
  height?: number;
  selectedTime?: number;
  onSelectTime?: (time: number) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function LiveLine(_props: LiveLineProps): null {
  return null;
}
LiveLine.displayName = "LiveLine";

export function LiveXAxis(_props: LiveXAxisProps): null {
  return null;
}
LiveXAxis.displayName = "LiveXAxis";

export function LiveYAxis(_props: LiveYAxisProps): null {
  return null;
}
LiveYAxis.displayName = "LiveYAxis";

export function detectMomentum(
  data: readonly Record<string, unknown>[],
  dataKey: string,
  lookback = 20
): Momentum {
  if (data.length < 5) {
    return "flat";
  }
  const start = Math.max(0, data.length - lookback);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = start; index < data.length; index += 1) {
    const value = data[index]?.[dataKey];
    if (typeof value === "number" && Number.isFinite(value)) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }
  const range = maximum - minimum;
  if (!(range > 0)) {
    return "flat";
  }
  const tailStart = Math.max(start, data.length - 5);
  const first = data[tailStart]?.[dataKey];
  const last = data.at(-1)?.[dataKey];
  if (typeof first !== "number" || typeof last !== "number") {
    return "flat";
  }
  const change = last - first;
  if (change > range * 0.12) {
    return "up";
  }
  if (change < -range * 0.12) {
    return "down";
  }
  return "flat";
}

interface LiveFrame {
  now: number;
  value: number;
  points: readonly LiveLinePoint[];
}

function clampUnit(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.08;
}

function formatValue(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    value
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type Element = React.ReactElement<Record<string, unknown>>;
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

function resolveTargetRange(
  data: readonly LiveLinePoint[],
  value: number,
  exaggerate: boolean
): readonly [number, number] {
  let minimum = value;
  let maximum = value;
  for (const point of data) {
    minimum = Math.min(minimum, point.value);
    maximum = Math.max(maximum, point.value);
  }
  const range = maximum - minimum;
  const pad = range * (exaggerate ? 0.03 : 0.15) || (exaggerate ? 0.04 : 10);
  return [minimum - pad, maximum + pad];
}

function PulseDot({
  x,
  y,
  color,
  radius,
  enabled,
}: {
  x: number;
  y: number;
  color: string;
  radius: number;
  enabled: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const props = useAnimatedProps(() => ({
    opacity: reduceMotion || !enabled ? 0 : 0.35 * (1 - pulse.value),
    r: radius * (1 + pulse.value * 1.2),
  }));
  useEffect(() => {
    if (enabled && !reduceMotion) {
      pulse.value = withRepeat(
        withTiming(1, {
          duration: 1000,
          easing: Easing.out(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        false
      );
    } else {
      pulse.value = 0;
    }
  }, [enabled, pulse, reduceMotion]);
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={x}
      cy={y}
      fill={color}
      pointerEvents="none"
    />
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the native live chart owns stream updates, plotting, and time-based selection in one surface.
export function LiveLineChart({
  data,
  value,
  dataKey = "value",
  window: windowSeconds = 30,
  numXTicks = 5,
  nowOffsetUnits = 0,
  exaggerate = false,
  lerpSpeed = 0.08,
  margin: marginProp,
  paused = false,
  children,
  height = 300,
  selectedTime,
  onSelectTime,
  accessibilityLabel = "Live line chart",
  style,
}: LiveLineChartProps) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const [internalSelectedTime, setInternalSelectedTime] = useState<
    number | null
  >(null);
  const selectedMs = selectedTime ?? internalSelectedTime;
  const elements = useMemo(() => flatten(children), [children]);
  const lineProps = elements.find((element) => element.type === LiveLine)
    ?.props as LiveLineProps | undefined;
  const grid = elements.find((element) => element.type === Grid)?.props as
    | GridProps
    | undefined;
  const xAxis = elements.find((element) => element.type === LiveXAxis)?.props as
    | LiveXAxisProps
    | undefined;
  const yAxis = elements.find((element) => element.type === LiveYAxis)?.props as
    | LiveYAxisProps
    | undefined;
  const tooltip = elements.find((element) => element.type === ChartTooltip)
    ?.props as ChartTooltipProps | undefined;
  const resolvedDataKey = lineProps?.dataKey ?? dataKey;
  const margin = useMemo(
    () => ({
      top: marginProp?.top ?? 24,
      right: marginProp?.right ?? 16,
      bottom: marginProp?.bottom ?? 32,
      left: marginProp?.left ?? (yAxis?.position === "right" ? 12 : 48),
    }),
    [
      marginProp?.bottom,
      marginProp?.left,
      marginProp?.right,
      marginProp?.top,
      yAxis?.position,
    ]
  );
  const [frame, setFrame] = useState<LiveFrame>(() => ({
    now: Date.now() / 1000,
    value,
    points: data.slice(-800),
  }));
  useEffect(() => {
    setFrame((current) => ({ ...current, points: data.slice(-800) }));
  }, [data]);
  useEffect(() => {
    if (paused) {
      return undefined;
    }
    const timer = setInterval(() => {
      setFrame((current) => {
        const now = Date.now() / 1000;
        const nextValue =
          current.value + (value - current.value) * clampUnit(lerpSpeed);
        const nextPoints = [
          ...current.points,
          { time: now, value: nextValue },
        ].filter(
          (point) => point.time >= now - Math.max(windowSeconds * 2, 60)
        );
        return { now, value: nextValue, points: nextPoints.slice(-800) };
      });
    }, 120);
    return () => clearInterval(timer);
  }, [lerpSpeed, paused, value, windowSeconds]);
  const timeWindow = Math.max(1, windowSeconds);
  const requestedTickCount = Math.max(2, xAxis?.numTicks ?? numXTicks);
  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const tickCount = resolveTickCountForWidth(requestedTickCount, plotWidth);
  const leadingSeconds =
    (timeWindow / Math.max(1, tickCount - 1)) * Math.max(0, nowOffsetUnits);
  const domainEnd = frame.now + leadingSeconds;
  const domainStart = domainEnd - timeWindow;
  const visible = frame.points.filter(
    (point) => point.time >= domainStart && point.time <= domainEnd
  );
  const displayPoints = [
    ...visible,
    { time: frame.now, value: frame.value },
    {
      time: Math.min(
        domainEnd,
        frame.now + timeWindow / Math.max(1, tickCount - 1)
      ),
      value: frame.value,
    },
  ];
  const plot = {
    left: margin.left,
    top: margin.top,
    width: Math.max(0, width - margin.left - margin.right),
    height: Math.max(0, height - margin.top - margin.bottom),
  };
  const modelRows = displayPoints.map((point) => ({
    timeMs: point.time * 1000,
    [resolvedDataKey]: point.value,
  }));
  const requestedYDomain = resolveTargetRange(
    displayPoints,
    frame.value,
    exaggerate
  );
  const model = useMemo(
    () =>
      createCartesianModel({
        data: modelRows,
        dataKeys: [resolvedDataKey],
        height,
        margin,
        width,
        xDataKey: "timeMs",
        xScale: "time",
        yDomain: requestedYDomain,
      }),
    [height, margin, modelRows, requestedYDomain, resolvedDataKey, width]
  );
  const yDomain = model.yDomain ?? requestedYDomain;
  const xRatios = displayPoints.map((point) =>
    domainEnd === domainStart
      ? 0.5
      : (point.time - domainStart) / (domainEnd - domainStart)
  );
  const geometry = createSeriesGeometry(
    displayPoints.map((point) => point.value),
    xRatios,
    width,
    height,
    margin,
    yDomain
  );
  const path = buildLinePath(
    geometry.points,
    lineProps?.curve ?? curveMonotoneX
  );
  const fillPath = geometry.areaPath;
  const momentum = detectMomentum(
    displayPoints.map((point) => ({ [resolvedDataKey]: point.value })),
    resolvedDataKey
  );
  const momentumColors = lineProps?.momentumColors;
  const stroke = momentumColors?.[momentum] ?? lineProps?.stroke ?? theme.color;
  const latest = geometry.points.at(-1);
  const yTickCount = Math.max(
    2,
    Math.floor(plot.height / Math.max(20, yAxis?.minGap ?? 36))
  );
  const yTicks = Array.from(
    { length: yTickCount + 1 },
    (_, index) =>
      yDomain[1] - (index / Math.max(1, yTickCount)) * (yDomain[1] - yDomain[0])
  );
  const xTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / Math.max(1, tickCount - 1);
    const time = (domainStart + ratio * timeWindow) * 1000;
    return {
      ratio,
      time,
      label: xAxis?.formatTime?.(time) ?? format24HourTime(time),
    };
  });
  const selectedPoint =
    selectedMs === null || selectedMs === undefined
      ? undefined
      : displayPoints.reduce<LiveLinePoint | undefined>(
          (best, point) =>
            !best ||
            Math.abs(point.time * 1000 - selectedMs) <
              Math.abs(best.time * 1000 - selectedMs)
              ? point
              : best,
          undefined
        );
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const recordTouchStart = (event: GestureResponderEvent) => {
    touchOrigin.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
    return false;
  };
  const hasHorizontalIntent = (event: GestureResponderEvent) => {
    const origin = touchOrigin.current;
    return (
      origin !== null &&
      isHorizontalPan(
        event.nativeEvent.pageX - origin.x,
        event.nativeEvent.pageY - origin.y
      )
    );
  };
  const clearTouchOrigin = () => {
    touchOrigin.current = null;
  };
  const onTouch = (event: GestureResponderEvent) => {
    const ratio = Math.max(
      0,
      Math.min(
        1,
        (event.nativeEvent.locationX - margin.left) / Math.max(1, plot.width)
      )
    );
    const nextTime = (domainStart + ratio * timeWindow) * 1000;
    setInternalSelectedTime(nextTime);
    onSelectTime?.(nextTime);
  };
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const delta = (timeWindow / Math.max(1, tickCount - 1)) * 1000;
    const direction = event.nativeEvent.actionName === "increment" ? 1 : -1;
    const current = selectedMs ?? domainEnd * 1000;
    const next = Math.min(
      domainEnd * 1000,
      Math.max(domainStart * 1000, current + direction * delta)
    );
    setInternalSelectedTime(next);
    onSelectTime?.(next);
  };
  const valueFormatter = lineProps?.formatValue ?? formatValue;
  const pulseEnabled = lineProps?.pulse !== false;

  return (
    <View
      accessibilityActions={[
        { name: "increment", label: "Move live chart selection forward" },
        { name: "decrement", label: "Move live chart selection back" },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: domainStart * 1000,
        max: domainEnd * 1000,
        now: selectedMs ?? domainEnd * 1000,
        text: `${valueFormatter(frame.value)} at ${format24HourTime(frame.now * 1000)}`,
      }}
      accessible
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      onMoveShouldSetResponderCapture={hasHorizontalIntent}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
      onResponderRelease={clearTouchOrigin}
      onResponderTerminate={clearTouchOrigin}
      onResponderTerminationRequest={(event) => !hasHorizontalIntent(event)}
      onStartShouldSetResponderCapture={recordTouchStart}
      style={[styles.root, { height }, style]}
    >
      {width > 0 && (
        <Svg height={height} width={width}>
          <Defs>
            <LinearGradient id="live-area-gradient" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor={stroke} stopOpacity={0.24} />
              <Stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {grid?.horizontal !== false &&
            yTicks.map((tick) => {
              const ratio = (yDomain[1] - tick) / (yDomain[1] - yDomain[0]);
              const y = margin.top + ratio * plot.height;
              return (
                <Fragment key={`grid-${tick}`}>
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
                      fill={theme.textColor}
                      fontSize={10}
                      textAnchor={yAxis.position === "right" ? "start" : "end"}
                      x={
                        yAxis.position === "right"
                          ? width - margin.right + 4
                          : margin.left - 7
                      }
                      y={y + 3}
                    >
                      {(yAxis.formatValue ?? valueFormatter)(tick)}
                    </SvgText>
                  )}
                </Fragment>
              );
            })}
          {xAxis &&
            xTicks.map((tick) => (
              <SvgText
                fill={theme.textColor}
                fontSize={10}
                key={`time-${tick.ratio}`}
                textAnchor={resolveRatioTextAnchor(tick.ratio)}
                x={margin.left + tick.ratio * plot.width}
                y={height - margin.bottom + 18}
              >
                {tick.label}
              </SvgText>
            ))}
          {lineProps?.fill !== false && fillPath && (
            <Path d={fillPath} fill="url(#live-area-gradient)" />
          )}
          <Path
            d={path}
            fill="none"
            stroke={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={lineProps?.strokeWidth ?? 2}
          />
          {latest && pulseEnabled && (
            <PulseDot
              color={stroke}
              enabled
              radius={lineProps?.dotSize ?? 4}
              x={latest.x}
              y={latest.y}
            />
          )}
          {latest && (
            <Circle
              cx={latest.x}
              cy={latest.y}
              fill={stroke}
              r={lineProps?.dotSize ?? 4}
            />
          )}
          {selectedPoint && tooltip?.showCrosshair !== false && (
            <SvgLine
              stroke={theme.textColor}
              strokeDasharray="3,3"
              strokeOpacity={0.65}
              x1={
                margin.left +
                ((selectedPoint.time - domainStart) / timeWindow) * plot.width
              }
              x2={
                margin.left +
                ((selectedPoint.time - domainStart) / timeWindow) * plot.width
              }
              y1={margin.top}
              y2={height - margin.bottom}
            />
          )}
        </Svg>
      )}
      {lineProps?.badge !== false && latest && (
        <View
          pointerEvents="none"
          style={[
            styles.badge,
            {
              backgroundColor: stroke,
              right: margin.right + 3,
              top: Math.max(
                margin.top,
                Math.min(height - margin.bottom - 24, latest.y - 11)
              ),
            },
          ]}
        >
          <Text style={styles.badgeText}>{valueFormatter(frame.value)}</Text>
        </View>
      )}
      {selectedPoint && tooltip && (
        <View pointerEvents="none" style={styles.tooltip}>
          <Text style={[styles.tooltipText, { color: theme.textColor }]}>
            {format24HourTime(selectedPoint.time * 1000)} ·{" "}
            {valueFormatter(selectedPoint.value)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "visible", position: "relative", width: "100%" },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  tooltip: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 8,
    bottom: 6,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  tooltipText: { fontSize: 11, fontVariant: ["tabular-nums"] },
});
