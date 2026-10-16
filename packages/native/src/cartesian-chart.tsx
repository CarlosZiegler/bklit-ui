import { type CurveFactory, curveMonotoneX } from "d3-shape";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  type AccessibilityActionEvent,
  ActivityIndicator,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Line as SvgLine,
} from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import {
  type FadeEdges,
  NativeAreaFill,
  NativeStrokeGradient,
} from "./area-fill";
import {
  buildDomainTicks,
  buildLinePath,
  buildSeriesAreaPath,
  buildSeriesLinePath,
} from "./cartesian/geometry";
import {
  ProfitLossLine as ProfitLossLayer,
  type ProfitLossLineProps,
  splitProfitLossSegments,
} from "./cartesian/profit-loss-line";
import {
  SeriesBar as SeriesBarLayer,
  type SeriesBarProps,
} from "./cartesian/series-bar";
import {
  type CartesianXScale,
  createCartesianModel,
  readCartesianX,
} from "./cartesian-model";
import type { NativeChartTooltipData } from "./chart-context";
import { NativeChartContext, type NativeChartRange } from "./chart-context";
import type { ChartPoint, LineGeometry, PlotPadding } from "./geometry";
import { type ChartTheme, useChartTheme } from "./theme";
import { DateTicker, TooltipBox, TooltipContent, TooltipDot } from "./tooltip";
import { ChartBrushOverlay, type ChartBrushProps } from "./utilities";
import { TooltipIndicator } from "./utilities/tooltip-indicator";

declare const __DEV__: boolean;

export type { CartesianXScale } from "./cartesian-model";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(SvgLine);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type CartesianChartStatus = "ready" | "loading" | "empty" | "error";

export interface CartesianChartProps<T extends object> {
  accessibilityLabel?: string;
  animationDuration?: number;
  animationKey?: string | number;
  barGap?: number;
  barSize?: number;
  children?: ReactNode;
  data: readonly T[];
  height?: number;
  margin?: PlotPadding;
  maxBarSize?: number;
  onSelectIndex?: (index: number) => void;
  selectedIndex?: number;
  stackGap?: number;
  stacked?: boolean;
  status?: CartesianChartStatus;
  statusLabel?: string;
  style?: StyleProp<ViewStyle>;
  xDataKey?: keyof T & string;
  xDomain?: readonly [number | Date, number | Date];
  xDomainSlotCount?: number;
  xScale?: CartesianXScale;
  yDomain?: readonly [number, number];
}

export interface LineLayerProps {
  animate?: boolean;
  curve?: CurveFactory;
  dataKey: string;
  fadeEdges?: FadeEdges;
  label?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface AreaLayerProps {
  animate?: boolean;
  curve?: CurveFactory;
  dataKey: string;
  fadeEdges?: FadeEdges;
  fill?: string;
  fillOpacity?: number;
  gradientSpan?: number;
  gradientToOpacity?: number;
  label?: string;
  showLine?: boolean;
  stroke?: string;
  strokeWidth?: number;
}

export interface GridProps {
  horizontal?: boolean;
  numTicksColumns?: number;
  numTicksRows?: number;
  stroke?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
  vertical?: boolean;
}

export interface XAxisProps {
  formatTick?: (value: unknown) => string;
  numTicks?: number;
  tickMode?: "data" | "domain";
  textColor?: string;
}

export interface YAxisProps {
  formatLargeNumbers?: boolean;
  formatValue?: (value: number) => string;
  numTicks?: number;
  textColor?: string;
  width?: number;
}

export interface ChartTooltipProps {
  backgroundColor?: string;
  content?: (props: {
    point: Record<string, unknown>;
    index: number;
  }) => ReactNode;
  dotColor?:
    | string
    | ((point: Record<string, unknown>, layer: { dataKey: string }) => string);
  dotHaloOpacity?: number;
  dotHaloScale?: number;
  dotRadiusFraction?: number;
  dotScale?: number;
  dotSize?: number;
  dotStrokeWidth?: number;
  dotVariant?: "dot" | "ring";
  children?: ReactNode;
  formatValue?: (value: number) => string;
  indicatorColor?: string | ((point: Record<string, unknown>) => string);
  indicatorDasharray?: string;
  indicatorFadeEdges?: "both" | "none" | "top" | "bottom";
  indicatorFadeLength?: number;
  rows?: (point: Record<string, unknown>) => readonly NativeTooltipRow[];
  panelStyle?: StyleProp<ViewStyle>;
  showCrosshair?: boolean;
  showDatePill?: boolean;
  showDots?: boolean;
}

export interface NativeTooltipRow {
  color: string;
  label: string;
  value: string | number;
}

export interface ChartLegendProps {
  items?: readonly { color: string; label: string; value?: number }[];
  showMarker?: boolean;
  textColor?: string;
  title?: string;
}

// These zero-render components describe the chart tree, as in the web API.
export function Line(_props: LineLayerProps): null {
  return null;
}
Line.displayName = "BklitNativeLineLayer";
export function Area(_props: AreaLayerProps): null {
  return null;
}
Area.displayName = "BklitNativeAreaLayer";
export function Grid(_props: GridProps): null {
  return null;
}
Grid.displayName = "BklitNativeGridLayer";
export function XAxis(_props: XAxisProps): null {
  return null;
}
XAxis.displayName = "BklitNativeXAxisLayer";
export function YAxis(_props: YAxisProps): null {
  return null;
}
YAxis.displayName = "BklitNativeYAxisLayer";
export function ChartTooltip(_props: ChartTooltipProps): null {
  return null;
}
ChartTooltip.displayName = "BklitNativeTooltipLayer";
export function ChartLegend(_props: ChartLegendProps): null {
  return null;
}
ChartLegend.displayName = "BklitNativeLegendLayer";

type Layer =
  | AreaLayerProps
  | LineLayerProps
  | ProfitLossLineProps
  | SeriesBarProps;
type ElementProps = Record<string, unknown> & { children?: ReactNode };

function typeName(type: unknown): string | undefined {
  if (typeof type === "function") {
    const component = type as { displayName?: string; name?: string };
    return component.displayName ?? component.name;
  }
  if (typeof type === "object" && type !== null) {
    const component = type as {
      displayName?: string;
      render?: { displayName?: string; name?: string };
    };
    return (
      component.displayName ??
      component.render?.displayName ??
      component.render?.name
    );
  }
  return undefined;
}

function isMarker<TProps>(
  element: ReactElement<ElementProps>,
  component: (props: TProps) => null
): boolean {
  return (
    element.type === component || typeName(element.type) === typeName(component)
  );
}

function isPostOverlay(element: ReactElement<ElementProps>): boolean {
  return Boolean(
    (element.type as { __isPostOverlay?: unknown }).__isPostOverlay
  );
}

function flattenChildren(children: ReactNode): ReactElement<ElementProps>[] {
  const result: ReactElement<ElementProps>[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      continue;
    }
    if (child.type === Fragment) {
      result.push(
        ...flattenChildren((child.props as { children?: ReactNode }).children)
      );
    } else {
      result.push(child as ReactElement<ElementProps>);
    }
  }
  return result;
}

function childProps<TProps>(
  elements: readonly ReactElement<ElementProps>[],
  component: (props: TProps) => null
): TProps | undefined {
  return elements.find((element) => isMarker(element, component))?.props as
    | TProps
    | undefined;
}

function allChildProps<TProps>(
  elements: readonly ReactElement<ElementProps>[],
  component: (props: TProps) => null
): TProps[] {
  return elements
    .filter((element) => isMarker(element, component))
    .map((element) => element.props as TProps);
}

function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

function formatX(value: unknown, scale: CartesianXScale): string {
  if (scale === "time") {
    const timestamp = readCartesianX(value, scale);
    return Number.isFinite(timestamp)
      ? new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "short",
        }).format(timestamp)
      : "";
  }
  return String(value ?? "");
}

function formatY(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function sampleIndices(length: number, count: number): number[] {
  if (length <= 0) {
    return [];
  }
  if (length === 1 || count <= 1) {
    return [0];
  }
  return [
    ...new Set(
      Array.from({ length: count }, (_, tick) =>
        Math.round((tick * (length - 1)) / (count - 1))
      )
    ),
  ];
}

interface Tick {
  label: string;
  ratio: number;
}

function makeXTicks<T extends object>(
  data: readonly T[],
  key: keyof T & string,
  scale: CartesianXScale,
  xPositions: readonly (number | null)[],
  domain: readonly [number, number] | null,
  axis: XAxisProps
): Tick[] {
  const count = Math.max(1, Math.floor(axis.numTicks ?? 5));
  if (scale === "category" || axis.tickMode !== "domain") {
    return sampleIndices(data.length, count).flatMap((index) => {
      const ratio = xPositions[index];
      if (
        ratio === null ||
        ratio === undefined ||
        (scale !== "category" && (ratio < 0 || ratio > 1))
      ) {
        return [];
      }
      const value = data[index]?.[key];
      return [
        { label: axis.formatTick?.(value) ?? formatX(value, scale), ratio },
      ];
    });
  }
  return buildDomainTicks(domain, count).map(({ ratio, value: numeric }) => {
    const value = scale === "time" ? new Date(numeric) : numeric;
    return { label: axis.formatTick?.(value) ?? formatX(value, scale), ratio };
  });
}

function makeYTicks(
  axis: YAxisProps | undefined,
  domain: readonly [number, number] | null
): Tick[] {
  if (!(axis && domain)) {
    return [];
  }
  const count = Math.max(2, Math.floor(axis.numTicks ?? 5));
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    const value = domain[1] - (domain[1] - domain[0]) * ratio;
    return {
      label:
        axis.formatValue?.(value) ??
        (axis.formatLargeNumbers === false
          ? String(Number(value.toFixed(2)))
          : formatY(value)),
      ratio,
    };
  });
}

function AnimatedSeriesPath({
  animate,
  animationDuration,
  animationKey,
  color,
  geometry,
  strokeWidth,
}: {
  animate: boolean;
  animationDuration: number;
  animationKey?: string | number;
  color: string;
  geometry: LineGeometry;
  strokeWidth: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(animate && !reduceMotion ? 0 : 1);
  // Only this scalar belongs on the UI thread, not all points and SVG paths.
  const pathLength = geometry.pathLength;
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));
  useEffect(() => {
    const shouldAnimate =
      animate &&
      !reduceMotion &&
      (geometry.path.length > 0 || animationKey !== undefined);
    progress.value = shouldAnimate ? 0 : 1;
    if (shouldAnimate) {
      progress.value = withTiming(1, {
        duration: Math.max(0, animationDuration),
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [
    animate,
    animationDuration,
    animationKey,
    geometry.path,
    progress,
    reduceMotion,
  ]);
  if (!geometry.path) {
    return null;
  }
  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={geometry.path}
      fill="none"
      stroke={color}
      strokeDasharray={[
        Math.max(geometry.pathLength, 1),
        Math.max(geometry.pathLength, 1),
      ]}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
}

interface ChartChildren {
  areas: AreaLayerProps[];
  bars: SeriesBarProps[];
  brush?: ChartBrushProps;
  customLayers: ReactElement<ElementProps>[];
  grid?: GridProps;
  legend?: ChartLegendProps;
  lines: LineLayerProps[];
  profitLossLines: ProfitLossLineProps[];
  tooltip?: ChartTooltipProps;
  unsupported: string[];
  xAxis?: XAxisProps;
  yAxis?: YAxisProps;
}

interface ChartModel {
  geometries: ReadonlyMap<string, LineGeometry>;
  layers: Layer[];
  margins: Required<PlotPadding>;
  model: ReturnType<typeof createCartesianModel>;
  xPositions: Array<number | null>;
  xTicks: Tick[];
  yTicks: Tick[];
}

function stackedBarDomainValues(
  data: readonly object[],
  bars: readonly SeriesBarProps[],
  xDataKey: string,
  xScale: CartesianXScale,
  xDomain: readonly [number, number] | undefined
): number[] {
  const values: number[] = [];
  for (const row of data) {
    const x = (row as Record<string, unknown>)[xDataKey];
    const numericX = readCartesianX(x, xScale);
    if (
      xScale !== "category" &&
      (!Number.isFinite(numericX) ||
        (xDomain && (numericX < xDomain[0] || numericX > xDomain[1])))
    ) {
      continue;
    }
    let positive = 0;
    let negative = 0;
    for (const bar of bars) {
      const value = asNumber((row as Record<string, unknown>)[bar.dataKey]);
      if (Number.isFinite(value)) {
        if (value >= 0) {
          positive += value;
        } else {
          negative += value;
        }
      }
    }
    values.push(positive, negative);
  }
  return values;
}

function projectionYValues(
  points: readonly unknown[],
  xDataKey: string,
  xScale: CartesianXScale,
  xDomain: readonly [number, number] | undefined
): number[] {
  return points.flatMap((point) => {
    if (!point || typeof point !== "object") {
      return [];
    }
    const record = point as Record<string, unknown>;
    const x = readCartesianX(record.date ?? record[xDataKey], xScale);
    if (
      xScale !== "category" &&
      xDomain &&
      !(Number.isFinite(x) && x >= xDomain[0] && x <= xDomain[1])
    ) {
      return [];
    }
    const value = record.value;
    return typeof value === "number" && Number.isFinite(value) ? [value] : [];
  });
}

function resolveNumericXDomain(
  domain: readonly [number | Date, number | Date] | undefined,
  scale: CartesianXScale
): readonly [number, number] | undefined {
  if (!domain || scale === "category") {
    return undefined;
  }
  const start = readCartesianX(domain[0], scale);
  const end = readCartesianX(domain[1], scale);
  return Number.isFinite(start) && Number.isFinite(end) && start < end
    ? [start, end]
    : undefined;
}

function createTooltipData(
  currentPoint: ChartPoint | undefined,
  data: readonly object[],
  geometries: ReadonlyMap<string, LineGeometry>,
  layers: readonly Layer[],
  margins: Required<PlotPadding>
): NativeChartTooltipData | null {
  if (!currentPoint) {
    return null;
  }
  const point = data[currentPoint.index] as Record<string, unknown> | undefined;
  if (!point) {
    return null;
  }
  const yPositions: Record<string, number> = {};
  const xPositions: Record<string, number> = {};
  for (const layer of layers) {
    if (yPositions[layer.dataKey] !== undefined) {
      continue;
    }
    const seriesPoint = geometries
      .get(layer.dataKey)
      ?.points.find((candidate) => candidate.index === currentPoint.index);
    if (seriesPoint) {
      yPositions[layer.dataKey] = seriesPoint.y - margins.top;
      xPositions[layer.dataKey] = seriesPoint.x - margins.left;
    }
  }
  return {
    index: currentPoint.index,
    point,
    x: currentPoint.x - margins.left,
    xPositions,
    yPositions,
  };
}

interface ChartAccessibilityProps {
  accessibilityActions?: AccessibilityActionEvent["nativeEvent"] extends never
    ? never
    : { name: "increment" | "decrement"; label: string }[];
  accessibilityLabel?: string;
  accessibilityRole?: "adjustable";
  accessibilityValue?: { min: number; max: number; now: number; text: string };
  accessible: boolean;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

function chartAccessibilityProps(
  enabled: boolean,
  label: string,
  valueText: string,
  currentPosition: number,
  length: number,
  point: ChartPoint | undefined,
  onAction: (event: AccessibilityActionEvent) => void
): ChartAccessibilityProps {
  if (!enabled) {
    return { accessible: false };
  }
  return {
    accessibilityActions: [
      { label: "Next data point", name: "increment" },
      { label: "Previous data point", name: "decrement" },
    ],
    accessibilityLabel: label,
    accessibilityRole: "adjustable",
    accessibilityValue: {
      max: Math.max(0, length - 1),
      min: 0,
      now: currentPosition,
      text: point ? valueText : "No data points",
    },
    accessible: true,
    onAccessibilityAction: onAction,
  };
}

function useChartModel<T extends object>(
  data: readonly T[],
  parsed: ChartChildren,
  key: keyof T & string,
  xScale: CartesianXScale,
  margin: PlotPadding | undefined,
  width: number,
  height: number,
  yDomain: readonly [number, number] | undefined,
  stacked: boolean,
  xDomain: readonly [number, number] | undefined
): ChartModel {
  const layers = useMemo(
    () => [
      ...parsed.areas,
      ...parsed.bars,
      ...parsed.profitLossLines,
      ...parsed.lines,
    ],
    [parsed.areas, parsed.bars, parsed.lines, parsed.profitLossLines]
  );
  const margins = useMemo<Required<PlotPadding>>(
    () => ({
      bottom: Math.max(0, margin?.bottom ?? (parsed.xAxis ? 25 : 8)),
      left: Math.max(
        0,
        margin?.left ?? (parsed.yAxis ? (parsed.yAxis.width ?? 42) : 4)
      ),
      right: Math.max(0, margin?.right ?? 8),
      top: Math.max(0, margin?.top ?? 8),
    }),
    [margin, parsed.xAxis, parsed.yAxis]
  );
  const projectionPoints = useMemo(
    () =>
      parsed.customLayers.flatMap((element) => {
        if (typeName(element.type) !== "ProjectionLine") {
          return [];
        }
        const points = element.props.data;
        return Array.isArray(points) ? points : [];
      }),
    [parsed.customLayers]
  );
  const additionalYValues = useMemo(() => {
    return [
      ...(stacked && parsed.bars.length > 0
        ? stackedBarDomainValues(data, parsed.bars, key, xScale, xDomain)
        : []),
      ...projectionYValues(projectionPoints, key, xScale, xDomain),
    ];
  }, [data, key, parsed.bars, projectionPoints, stacked, xDomain, xScale]);
  const additionalXValues = useMemo(
    () =>
      xScale === "category"
        ? []
        : projectionPoints.flatMap((point) => {
            if (!point || typeof point !== "object") {
              return [];
            }
            const date = (point as { date?: unknown }).date;
            const value = readCartesianX(date, xScale);
            return Number.isFinite(value) ? [value] : [];
          }),
    [projectionPoints, xScale]
  );
  const model = useMemo(
    () =>
      createCartesianModel({
        additionalYValues,
        additionalXValues,
        categoryBandCenter: parsed.bars.length > 0,
        data,
        dataKeys: layers.map((layer) => layer.dataKey),
        height,
        margin: margins,
        width,
        xDataKey: key,
        xDomain,
        xScale,
        yDomain,
      }),
    [
      additionalXValues,
      additionalYValues,
      data,
      height,
      key,
      layers,
      margins,
      parsed.bars,
      width,
      xScale,
      xDomain,
      yDomain,
    ]
  );
  const xTicks = useMemo(
    () =>
      parsed.xAxis
        ? makeXTicks(
            data,
            key,
            xScale,
            model.xPositions,
            model.xDomain,
            parsed.xAxis
          )
        : [],
    [data, key, model.xDomain, model.xPositions, parsed.xAxis, xScale]
  );
  const yTicks = useMemo(
    () => makeYTicks(parsed.yAxis, model.yDomain),
    [model.yDomain, parsed.yAxis]
  );
  return {
    geometries: model.geometries,
    layers,
    margins,
    model,
    xPositions: [...model.xPositions],
    xTicks,
    yTicks,
  };
}

interface ChartSelection {
  accessiblePoint?: ChartPoint;
  accessiblePosition: number;
  cursorDotProps: ReturnType<typeof useAnimatedProps>;
  cursorLineProps: ReturnType<typeof useAnimatedProps>;
  cursorVisible: { value: number };
  gesture: ReturnType<typeof Gesture.Pan>;
  markerProps: ReturnType<typeof useAnimatedProps>;
  onAccessibilityAction: (event: AccessibilityActionEvent) => void;
  point?: ChartPoint;
  selectedIndex: number | undefined;
  setSelectedIndex: (index: number | null) => void;
}

function useChartSelection(
  points: readonly ChartPoint[],
  selectedIndex: number | undefined,
  onSelectIndex: ((index: number) => void) | undefined,
  inspectionEnabled = true
): ChartSelection {
  const [gestureIndex, setGestureIndex] = useState<number | null>(null);
  const cursorX = useSharedValue(0);
  const cursorY = useSharedValue(0);
  const cursorVisible = useSharedValue(0);
  const inspectionActive = useSharedValue(false);
  const reportedIndex = useSharedValue(-1);
  const currentIndex = selectedIndex ?? gestureIndex ?? -1;
  const pointPosition = points.findIndex(
    (point) => point.index === currentIndex
  );
  const point = pointPosition >= 0 ? points[pointPosition] : undefined;
  const accessiblePosition =
    pointPosition >= 0 ? pointPosition : Math.max(0, points.length - 1);
  const accessiblePoint = points[accessiblePosition];
  const setSelectedPoint = useCallback(
    (index: number | null) => {
      setGestureIndex(index);
      if (index === null) {
        cursorVisible.value = 0;
        reportedIndex.value = -1;
        return;
      }
      cursorVisible.value = 0;
      onSelectIndex?.(index);
    },
    [cursorVisible, onSelectIndex, reportedIndex]
  );
  const markerProps = useAnimatedProps(() => ({
    opacity: 1 - cursorVisible.value,
  }));
  const cursorLineProps = useAnimatedProps(() => ({
    opacity: cursorVisible.value,
    x1: cursorX.value,
    x2: cursorX.value,
  }));
  const cursorDotProps = useAnimatedProps(() => ({
    cx: cursorX.value,
    cy: cursorY.value,
    opacity: cursorVisible.value,
  }));
  const updateCursor = useCallback(
    (touchX: number) => {
      "worklet";
      let nearest: ChartPoint | null = null;
      let distance = Number.POSITIVE_INFINITY;
      for (const candidate of points) {
        const currentDistance = Math.abs(candidate.x - touchX);
        if (currentDistance < distance) {
          nearest = candidate;
          distance = currentDistance;
        }
      }
      if (!nearest) {
        return;
      }
      cursorX.value = nearest.x;
      cursorY.value = nearest.y;
      cursorVisible.value = 1;
      if (reportedIndex.value !== nearest.index) {
        reportedIndex.value = nearest.index;
        scheduleOnRN(setGestureIndex, nearest.index);
      }
    },
    [cursorVisible, cursorX, cursorY, points, reportedIndex]
  );
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(inspectionEnabled)
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .onStart((event) => {
          inspectionActive.value = true;
          reportedIndex.value = -1;
          updateCursor(event.x);
        })
        .onUpdate((event) => updateCursor(event.x))
        .onEnd(() => {
          if (onSelectIndex && reportedIndex.value >= 0) {
            scheduleOnRN(onSelectIndex, reportedIndex.value);
          }
        })
        .onFinalize((_event, success) => {
          if (!success && inspectionActive.value) {
            cursorVisible.value = 0;
            scheduleOnRN(setGestureIndex, null);
          }
          inspectionActive.value = false;
        }),
    [
      cursorVisible,
      inspectionEnabled,
      inspectionActive,
      onSelectIndex,
      reportedIndex,
      updateCursor,
    ]
  );
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    let direction = 0;
    if (event.nativeEvent.actionName === "increment") {
      direction = 1;
    } else if (event.nativeEvent.actionName === "decrement") {
      direction = -1;
    }
    if (direction === 0 || points.length === 0) {
      return;
    }
    const nextPosition = Math.max(
      0,
      Math.min(points.length - 1, accessiblePosition + direction)
    );
    const nextPoint = points[nextPosition];
    if (!nextPoint || nextPosition === accessiblePosition) {
      return;
    }
    setGestureIndex(nextPoint.index);
    cursorVisible.value = 0;
    onSelectIndex?.(nextPoint.index);
  };
  return {
    accessiblePoint,
    accessiblePosition,
    cursorDotProps,
    cursorLineProps,
    cursorVisible,
    gesture,
    markerProps,
    onAccessibilityAction,
    point,
    selectedIndex: currentIndex >= 0 ? currentIndex : undefined,
    setSelectedIndex: setSelectedPoint,
  };
}

function parseChildren(children: ReactNode): ChartChildren {
  const elements = flattenChildren(children);
  const utilityNames = new Set([
    "Background",
    "ChartBrush",
    "ProjectionLine",
    "ProjectionLineEndMarker",
    "ReferenceArea",
    "TooltipIndicator",
  ]);
  const supportedComponents = new Set([
    typeName(Area),
    typeName(ChartLegend),
    typeName(ChartTooltip),
    typeName(Grid),
    typeName(Line),
    typeName(XAxis),
    typeName(YAxis),
    typeName(SeriesBarLayer),
    typeName(ProfitLossLayer),
    ...utilityNames,
  ]);
  const extensionComponents = elements.filter((element) => {
    const elementType = element.type;
    const name = typeName(elementType);
    if (supportedComponents.has(name ?? "")) {
      return false;
    }
    return (
      typeof elementType === "function" ||
      (typeof elementType === "object" && elementType !== null)
    );
  });
  return {
    areas: allChildProps(elements, Area),
    bars: allChildProps(elements, SeriesBarLayer),
    brush: elements.find((element) => typeName(element.type) === "ChartBrush")
      ?.props as ChartBrushProps | undefined,
    customLayers: elements.filter((element) => {
      const name = typeName(element.type);
      return (
        (utilityNames.has(name ?? "") && name !== "ChartBrush") ||
        extensionComponents.includes(element)
      );
    }),
    grid: childProps(elements, Grid),
    legend: childProps(elements, ChartLegend),
    lines: allChildProps(elements, Line),
    profitLossLines: allChildProps(elements, ProfitLossLayer),
    tooltip: childProps(elements, ChartTooltip),
    unsupported: elements
      .filter(
        (element) =>
          !supportedComponents.has(typeName(element.type) ?? "") &&
          typeof element.type === "string"
      )
      .map((element) => {
        return String(element.type);
      }),
    xAxis: childProps(elements, XAxis),
    yAxis: childProps(elements, YAxis),
  };
}

interface ChartCanvasProps {
  areas: readonly AreaLayerProps[];
  animationDuration: number;
  animationKey?: string | number;
  barGap: number;
  barSize?: number;
  bars: readonly SeriesBarProps[];
  brush?: ChartBrushProps;
  currentPoint?: ChartPoint;
  customLayers: readonly ReactElement<ElementProps>[];
  data: readonly object[];
  geometries: ReadonlyMap<string, LineGeometry>;
  gesture: ReturnType<typeof Gesture.Pan>;
  grid?: GridProps;
  height: number;
  layers: readonly Layer[];
  lines: readonly LineLayerProps[];
  margins: Required<PlotPadding>;
  maxBarSize: number;
  model: ReturnType<typeof createCartesianModel>;
  onLayout: (event: LayoutChangeEvent) => void;
  onSelectIndex?: (index: number) => void;
  profitLossLines: readonly ProfitLossLineProps[];
  range: NativeChartRange | null;
  selection: ChartSelection;
  setRange: (range: NativeChartRange | null) => void;
  setSelectedIndex: (index: number | null) => void;
  selectedIndex?: number;
  stackGap: number;
  stacked: boolean;
  status: CartesianChartStatus;
  statusLabel?: string;
  theme: Readonly<ChartTheme>;
  tooltip?: ChartTooltipProps;
  tooltipData: NativeChartTooltipData | null;
  width: number;
  xDataKey: string;
  xDomainSlotCount?: number;
  xScale: CartesianXScale;
  xTicks: readonly Tick[];
  yAxis?: YAxisProps;
  yTicks: readonly Tick[];
}

function ChartCanvas({
  areas,
  animationDuration,
  animationKey,
  barGap,
  barSize,
  bars,
  brush,
  currentPoint,
  customLayers,
  data,
  geometries,
  gesture,
  grid,
  height,
  layers,
  lines,
  margins,
  maxBarSize,
  model,
  onLayout,
  onSelectIndex,
  profitLossLines,
  range,
  selection,
  setRange,
  setSelectedIndex,
  selectedIndex,
  stackGap,
  stacked,
  status,
  statusLabel,
  theme,
  tooltip,
  tooltipData,
  width,
  xDataKey,
  xDomainSlotCount,
  xScale,
  xTicks,
  yAxis,
  yTicks,
}: ChartCanvasProps) {
  const resolvedStatus =
    status === "ready" && width > 0 && geometries.size === 0 ? "empty" : status;
  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const plotHeight = Math.max(0, height - margins.top - margins.bottom);
  return (
    <NativeChartContext.Provider
      value={{
        data,
        selectedIndex,
        setSelectedIndex,
        tooltipData,
        xDataKey,
        height,
        margins,
        model,
        plotHeight,
        plotWidth,
        range,
        setRange,
        status: resolvedStatus,
        theme,
        width,
        xDomain: model.xDomain,
        xDomainSlotCount,
        xScale,
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          collapsable={false}
          onLayout={onLayout}
          style={[styles.plot, { height }]}
        >
          {width > 0 && (
            <ChartSvg
              animationDuration={animationDuration}
              animationKey={animationKey}
              areas={areas}
              barGap={barGap}
              barSize={barSize}
              bars={bars}
              currentPoint={currentPoint}
              customLayers={customLayers}
              data={data}
              geometries={geometries}
              grid={grid}
              height={height}
              layers={layers}
              lines={lines}
              margins={margins}
              maxBarSize={maxBarSize}
              model={model}
              onSelectIndex={onSelectIndex}
              profitLossLines={profitLossLines}
              selectedIndex={selectedIndex}
              selection={selection}
              stacked={stacked}
              stackGap={stackGap}
              theme={theme}
              tooltip={tooltip}
              tooltipData={tooltipData}
              width={width}
              xScale={xScale}
              xTicks={xTicks}
            />
          )}
          {brush && width > 0 && <ChartBrushOverlay props={brush} />}
          {yAxis && (
            <AxisY
              axis={yAxis}
              color={theme.textColor}
              height={height}
              margins={margins}
              ticks={yTicks}
            />
          )}
          {tooltip && tooltipData && currentPoint && (
            <>
              {tooltip.showDatePill !== false && (
                <DateTicker
                  currentIndex={tooltipData.index}
                  labels={data.map((row) =>
                    formatX((row as Record<string, unknown>)[xDataKey], xScale)
                  )}
                  style={{
                    bottom: 1,
                    left:
                      Math.max(40, Math.min(width - 40, currentPoint.x)) - 36,
                  }}
                  visible
                />
              )}
              <TooltipBox
                animate
                backgroundColor={tooltip.backgroundColor ?? theme.surfaceColor}
                containerHeight={height}
                containerWidth={width}
                style={tooltip.panelStyle}
                x={currentPoint.x}
                y={currentPoint.y}
              >
                {tooltip.content ? (
                  <>
                    {tooltip.content({
                      point: tooltipData.point,
                      index: tooltipData.index,
                    })}
                    {tooltip.children}
                  </>
                ) : (
                  <TooltipContent
                    rows={
                      tooltip.rows?.(tooltipData.point) ??
                      tooltipRowsForPoint(
                        tooltipData.point,
                        layers,
                        theme.seriesColors,
                        tooltip.formatValue
                      )
                    }
                    title={formatX(tooltipData.point[xDataKey], xScale)}
                  >
                    {tooltip.children}
                  </TooltipContent>
                )}
              </TooltipBox>
            </>
          )}
          {resolvedStatus !== "ready" && (
            <View pointerEvents="none" style={styles.statusOverlay}>
              {resolvedStatus === "loading" && (
                <ActivityIndicator color={theme.textColor} />
              )}
              <Text style={[styles.statusText, { color: theme.textColor }]}>
                {statusLabel ?? getStatusMessage(resolvedStatus)}
              </Text>
            </View>
          )}
        </View>
      </GestureDetector>
    </NativeChartContext.Provider>
  );
}

function getStatusMessage(status: CartesianChartStatus): string {
  switch (status) {
    case "loading":
      return "Loading chart…";
    case "error":
      return "Chart unavailable";
    default:
      return "No chart data";
  }
}

function ChartSvg({
  animationDuration,
  animationKey,
  areas,
  barGap,
  barSize,
  bars,
  currentPoint,
  customLayers,
  data,
  geometries,
  grid,
  height,
  layers,
  lines,
  margins,
  maxBarSize,
  model,
  onSelectIndex,
  profitLossLines,
  selectedIndex,
  selection,
  stackGap,
  stacked,
  theme,
  tooltip,
  tooltipData,
  width,
  xTicks,
  xScale,
}: Omit<
  ChartCanvasProps,
  | "gesture"
  | "onLayout"
  | "status"
  | "statusLabel"
  | "range"
  | "setRange"
  | "setSelectedIndex"
  | "xDataKey"
  | "xDomainSlotCount"
  | "yAxis"
  | "yTicks"
>) {
  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const clipId = `native-cartesian-plot-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tooltipIndicatorColor =
    typeof tooltip?.indicatorColor === "function"
      ? tooltip.indicatorColor(tooltipData?.point ?? {})
      : (tooltip?.indicatorColor ??
        layersColor(layers[0], layers, theme.seriesColors));
  const tooltipSeries = Array.from(
    new Map(layers.map((layer) => [layer.dataKey, layer])).values()
  );
  return (
    <Svg height={height} width="100%">
      <Defs>
        <ClipPath id={clipId}>
          <Rect
            height={Math.max(0, height - margins.top - margins.bottom)}
            width={plotWidth}
            x={margins.left}
            y={margins.top}
          />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {customLayers.filter(
          (element) => typeName(element.type) === "Background"
        )}
        {customLayers.filter(
          (element) => typeName(element.type) === "ReferenceArea"
        )}
        {grid && (
          <GridLines
            color={grid.stroke ?? theme.gridColor}
            grid={grid}
            height={height}
            margins={margins}
            width={width}
            xTicks={xTicks}
          />
        )}
        {areas.map((area, index) => {
          const geometry = geometries.get(area.dataKey);
          const color =
            area.fill ?? layersColor(area, layers, theme.seriesColors);
          if (!geometry?.areaPath) {
            return null;
          }
          const areaGeometry = area.curve
            ? {
                ...geometry,
                areaPath: buildSeriesAreaPath(
                  geometry.points,
                  height - margins.bottom,
                  area.curve
                ),
                path: buildSeriesLinePath(geometry.points, area.curve),
              }
            : geometry;
          return (
            <Fragment key={`area:${area.dataKey}:${index}`}>
              <NativeAreaFill
                animate={area.animate !== false}
                animationDuration={animationDuration}
                animationKey={animationKey}
                d={areaGeometry.areaPath}
                fadeEdges={area.fadeEdges ?? false}
                fill={color}
                fillOpacity={area.fillOpacity ?? 0.4}
                gradientSpan={area.gradientSpan ?? 1}
                gradientToOpacity={area.gradientToOpacity ?? 0}
                height={height}
                plotLeft={margins.left}
                plotWidth={plotWidth}
                width={width}
              >
                {area.showLine !== false && (
                  <AnimatedSeriesPath
                    animate={area.animate !== false}
                    animationDuration={animationDuration}
                    animationKey={animationKey}
                    color={area.stroke ?? color}
                    geometry={areaGeometry}
                    strokeWidth={area.strokeWidth ?? 2}
                  />
                )}
              </NativeAreaFill>
            </Fragment>
          );
        })}
        <ComposedBars
          animationDuration={animationDuration}
          animationKey={animationKey}
          barGap={barGap}
          barSize={barSize}
          bars={bars}
          data={data}
          height={height}
          layers={layers}
          margins={margins}
          maxBarSize={maxBarSize}
          model={model}
          onSelectIndex={onSelectIndex}
          selectedIndex={selectedIndex}
          stacked={stacked}
          stackGap={stackGap}
          theme={theme}
          width={width}
          xScale={xScale}
        />
        {profitLossLines.map((line, index) => (
          <ProfitLossPaths
            animationDuration={animationDuration}
            animationKey={animationKey}
            data={data}
            height={height}
            index={index}
            key={`profit-loss:${line.dataKey}:${index}`}
            layer={line}
            margins={margins}
            model={model}
            width={width}
          />
        ))}
        {lines.map((line, index) => {
          const geometry = geometries.get(line.dataKey);
          if (!geometry) {
            return null;
          }
          const lineGeometry = line.curve
            ? {
                ...geometry,
                path: buildSeriesLinePath(geometry.points, line.curve),
              }
            : geometry;
          const color =
            line.stroke ?? layersColor(line, layers, theme.seriesColors);
          return (
            <NativeStrokeGradient
              color={color}
              fadeEdges={line.fadeEdges ?? true}
              key={`line:${line.dataKey}:${index}`}
              plotLeft={margins.left}
              plotWidth={plotWidth}
            >
              {(stroke) => (
                <AnimatedSeriesPath
                  animate={line.animate !== false}
                  animationDuration={animationDuration}
                  animationKey={animationKey}
                  color={stroke}
                  geometry={lineGeometry}
                  strokeWidth={line.strokeWidth ?? 2.5}
                />
              )}
            </NativeStrokeGradient>
          );
        })}
        {customLayers.filter((element) =>
          [
            "ProjectionLine",
            "ProjectionLineEndMarker",
            "TooltipIndicator",
          ].includes(typeName(element.type) ?? "")
        )}
        {customLayers.filter((element) => {
          const name = typeName(element.type);
          return !(
            isPostOverlay(element) ||
            [
              "Background",
              "ChartBrush",
              "ProjectionLine",
              "ProjectionLineEndMarker",
              "ReferenceArea",
              "TooltipIndicator",
            ].includes(name ?? "")
          );
        })}
        {currentPoint && (
          <SelectedPoint
            guideColor={theme.gridColor}
            height={height}
            margins={margins}
            point={currentPoint}
            selectedIndex={selectedIndex}
            selection={selection}
            seriesColor={layersColor(layers[0], layers, theme.seriesColors)}
            showGuide={!tooltip}
            showMarker={!tooltip}
            surfaceColor={theme.surfaceColor}
            tooltip={tooltip}
          />
        )}
        {tooltip && currentPoint && tooltip.showCrosshair !== false ? (
          <TooltipIndicator
            animate
            colorEdge={tooltipIndicatorColor}
            colorMid={tooltipIndicatorColor}
            fadeEdges={tooltip.indicatorFadeEdges ?? "both"}
            fadeLength={tooltip.indicatorFadeLength}
            height={Math.max(0, height - margins.top - margins.bottom)}
            strokeDasharray={tooltip.indicatorDasharray}
            visible
            x={currentPoint.x - margins.left}
          />
        ) : null}
        {tooltip && (
          <Cursor
            guideColor={theme.gridColor}
            height={height}
            margins={margins}
            selection={selection}
            seriesColor={tooltipIndicatorColor}
            showCrosshair={false}
            showDots={false}
            surfaceColor={theme.surfaceColor}
          />
        )}
        {tooltip && currentPoint && tooltip.showDots !== false
          ? tooltipSeries.map((layer) => {
              const point = geometries
                .get(layer.dataKey)
                ?.points.find(
                  (candidate) => candidate.index === currentPoint.index
                );
              if (!point) {
                return null;
              }
              const color =
                typeof tooltip.dotColor === "function"
                  ? tooltip.dotColor(tooltipData?.point ?? {}, layer)
                  : (tooltip.dotColor ??
                    layersColor(layer, layers, theme.seriesColors));
              return (
                <TooltipDot
                  color={color}
                  cornerRadiusFraction={tooltip.dotRadiusFraction}
                  haloOpacity={tooltip.dotHaloOpacity}
                  haloScale={tooltip.dotHaloScale}
                  key={`tooltip-dot:${layer.dataKey}`}
                  size={(tooltip.dotSize ?? 5) * (tooltip.dotScale ?? 1)}
                  strokeColor={theme.surfaceColor}
                  strokeWidth={tooltip.dotStrokeWidth}
                  variant={tooltip.dotVariant}
                  x={point.x}
                  y={point.y}
                />
              );
            })
          : null}
      </G>
      {customLayers.filter(isPostOverlay)}
    </Svg>
  );
}

function composedBarVerticalSpan(
  value: number,
  stack: { positive: number; negative: number },
  {
    model,
    stacked,
    stackGap,
    top,
    bottom,
    zeroY,
  }: {
    model: ReturnType<typeof createCartesianModel>;
    stacked: boolean;
    stackGap: number;
    top: number;
    bottom: number;
    zeroY: number;
  }
) {
  let start = 0;
  if (stacked) {
    start = value >= 0 ? stack.positive : stack.negative;
  }
  const end = start + value;
  if (stacked) {
    if (value >= 0) {
      stack.positive = end;
    } else {
      stack.negative = end;
    }
  }
  const startY = Math.max(
    top,
    Math.min(bottom, model.yToCoordinate(start) ?? zeroY)
  );
  const endY = Math.max(
    top,
    Math.min(bottom, model.yToCoordinate(end) ?? zeroY)
  );
  return {
    height: Math.max(0, Math.abs(endY - startY) - (stacked ? stackGap : 0)),
    startY,
    targetY: Math.min(startY, endY),
  };
}

function ComposedBars({
  animationDuration,
  animationKey,
  barGap,
  barSize,
  bars,
  data,
  height,
  layers,
  margins,
  maxBarSize,
  model,
  onSelectIndex,
  selectedIndex,
  stackGap,
  stacked,
  theme,
  width,
  xScale,
}: {
  animationDuration: number;
  animationKey?: string | number;
  barGap: number;
  barSize?: number;
  bars: readonly SeriesBarProps[];
  data: readonly object[];
  height: number;
  layers: readonly Layer[];
  margins: Required<PlotPadding>;
  maxBarSize: number;
  model: ReturnType<typeof createCartesianModel>;
  onSelectIndex?: (index: number) => void;
  selectedIndex?: number;
  stackGap: number;
  stacked: boolean;
  theme: Readonly<ChartTheme>;
  width: number;
  xScale: CartesianXScale;
}) {
  if (bars.length === 0 || data.length === 0 || !model.yDomain) {
    return null;
  }

  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const plotBottom = height - margins.bottom;
  const validX = model.xPositions.flatMap((ratio) =>
    ratio === null ? [] : [margins.left + ratio * plotWidth]
  );
  const distances = validX
    .slice(1)
    .map((x, index) => x - (validX[index] ?? x))
    .filter((distance) => distance > 0);
  let bandWidth = plotWidth / Math.max(1, data.length);
  if (xScale !== "category" && distances.length > 0) {
    bandWidth = Math.min(...distances);
  }
  const groupCount = stacked ? 1 : bars.length;
  const resolvedBarGap = Number.isFinite(barGap) ? Math.max(0, barGap) : 0;
  const requestedWidth =
    barSize === undefined || !Number.isFinite(barSize)
      ? (bandWidth * 0.64 - resolvedBarGap * (groupCount - 1)) / groupCount
      : barSize;
  const rectWidth = Math.max(
    1,
    Math.min(
      Math.max(1, maxBarSize),
      Math.max(1, bandWidth / groupCount),
      requestedWidth
    )
  );
  const groupWidth =
    rectWidth * groupCount + resolvedBarGap * Math.max(0, groupCount - 1);
  const zeroY = Math.max(
    margins.top,
    Math.min(plotBottom, model.yToCoordinate(0) ?? plotBottom)
  );
  const stacks = data.map(() => ({ positive: 0, negative: 0 }));

  return (
    <>
      {data.flatMap((row, dataIndex) => {
        const ratio = model.xPositions[dataIndex];
        if (ratio === null || ratio === undefined) {
          return [];
        }
        const centerX = margins.left + ratio * plotWidth;
        const groupStart = centerX - groupWidth / 2;
        const stack = stacks[dataIndex];
        if (!stack) {
          return [];
        }

        return bars.flatMap((bar, seriesIndex) => {
          const raw = (row as Record<string, unknown>)[bar.dataKey];
          const value = asNumber(raw);
          if (!Number.isFinite(value)) {
            return [];
          }
          const span = composedBarVerticalSpan(value, stack, {
            model,
            stacked,
            stackGap,
            top: margins.top,
            bottom: plotBottom,
            zeroY,
          });
          const rectX = stacked
            ? centerX - rectWidth / 2
            : groupStart + seriesIndex * (rectWidth + resolvedBarGap);
          return [
            <AnimatedBarMark
              animate={bar.animate !== false}
              animationDuration={animationDuration}
              animationKey={`${animationKey ?? "chart"}:${dataIndex}:${bar.dataKey}`}
              dataIndex={dataIndex}
              fadedOpacity={bar.fadedOpacity ?? 0.22}
              fill={bar.fill ?? layersColor(bar, layers, theme.seriesColors)}
              height={span.height}
              key={`${bar.dataKey}:${dataIndex}:${seriesIndex}`}
              onSelect={() => onSelectIndex?.(dataIndex)}
              radius={Math.max(0, bar.radius ?? 2)}
              selected={
                selectedIndex === undefined || selectedIndex === dataIndex
              }
              startY={span.startY}
              targetY={span.targetY}
              width={rectWidth}
              x={rectX}
            />,
          ];
        });
      })}
    </>
  );
}

function AnimatedBarMark({
  animate,
  animationDuration,
  animationKey,
  dataIndex,
  fadedOpacity,
  fill,
  height,
  onSelect,
  radius,
  selected,
  startY,
  targetY,
  width,
  x,
}: {
  animate: boolean;
  animationDuration: number;
  animationKey: string;
  dataIndex: number;
  fadedOpacity: number;
  fill: string;
  height: number;
  onSelect: () => void;
  radius: number;
  selected: boolean;
  startY: number;
  targetY: number;
  width: number;
  x: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(!animate || reduceMotion ? 1 : 0);
  const animatedProps = useAnimatedProps(() => ({
    height: height * progress.value,
    opacity: progress.value * (selected ? 1 : clampOpacity(fadedOpacity)),
    y: startY + (targetY - startY) * progress.value,
  }));
  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing a bar's stable row identity or chart replay key intentionally restarts its entrance animation.
  useEffect(() => {
    if (animate && !reduceMotion) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: Math.max(0, animationDuration),
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    } else {
      progress.value = 1;
    }
  }, [
    animate,
    animationDuration,
    animationKey,
    dataIndex,
    progress,
    reduceMotion,
  ]);
  return (
    <AnimatedRect
      animatedProps={animatedProps}
      fill={fill}
      height={height}
      onPress={onSelect}
      rx={radius}
      ry={radius}
      width={width}
      x={x}
      y={targetY}
    />
  );
}

function ProfitLossPaths({
  data,
  index,
  layer,
  margins,
  model,
  width,
}: {
  animationDuration: number;
  animationKey?: string | number;
  data: readonly object[];
  index: number;
  layer: ProfitLossLineProps;
  margins: Required<PlotPadding>;
  model: ReturnType<typeof createCartesianModel>;
  height: number;
  width: number;
}) {
  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const segments = splitProfitLossSegments(
    data.map((row) =>
      asNumber((row as Record<string, unknown>)[layer.dataKey])
    ),
    data.map((row, rowIndex) => {
      const ratio = layer.xDataKey
        ? model.xToRatio((row as Record<string, unknown>)[layer.xDataKey])
        : model.xPositions[rowIndex];
      return ratio === null || ratio === undefined
        ? null
        : margins.left + ratio * plotWidth;
    })
  );
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `bklit-profit-loss-${instanceId}-${index}`;
  const fade = layer.fadeEdges ?? false;
  const positive = layer.positiveColor ?? "#16a34a";
  const negative = layer.negativeColor ?? "#dc2626";
  const opacityAt = (end: boolean) => {
    if (fade === true) {
      return end ? 0 : 0;
    }
    if (fade === "left") {
      return end ? 1 : 0;
    }
    if (fade === "right") {
      return end ? 0 : 1;
    }
    return 1;
  };
  return (
    <>
      {fade && (
        <Defs>
          {[
            { key: "positive", color: positive },
            { key: "negative", color: negative },
          ].map(({ key, color }) => (
            <LinearGradient
              gradientUnits="userSpaceOnUse"
              id={`${gradientId}-${key}`}
              key={`${gradientId}-${key}`}
              x1={margins.left}
              x2={width - margins.right}
              y1={0}
              y2={0}
            >
              {[
                <Stop
                  key="start"
                  offset="0%"
                  stopColor={color}
                  stopOpacity={opacityAt(false)}
                />,
                ...(fade === true
                  ? [
                      <Stop
                        key="inner-start"
                        offset="12%"
                        stopColor={color}
                        stopOpacity={1}
                      />,
                      <Stop
                        key="inner-end"
                        offset="88%"
                        stopColor={color}
                        stopOpacity={1}
                      />,
                    ]
                  : []),
                <Stop
                  key="end"
                  offset="100%"
                  stopColor={color}
                  stopOpacity={opacityAt(true)}
                />,
              ]}
            </LinearGradient>
          ))}
        </Defs>
      )}
      {segments.map((segment) => {
        const firstIndex = segment.points[0]?.index;
        if (firstIndex === undefined) {
          return null;
        }
        const color = segment.isPositive ? positive : negative;
        const segmentKey = `${segment.isPositive ? "positive" : "negative"}:${firstIndex}`;
        const points = segment.points.flatMap((point) => {
          const y = model.yToCoordinate(point.value);
          return y === null ? [] : [{ x: point.x, y }];
        });
        if (points.length === 0) {
          return null;
        }
        if (points.length === 1) {
          return (
            <Circle
              cx={points[0]?.x}
              cy={points[0]?.y}
              fill={color}
              key={`profit-point:${segmentKey}`}
              r={Math.max(1, (layer.strokeWidth ?? 2.5) / 2)}
            />
          );
        }
        const path = buildLinePath(points, layer.curve ?? curveMonotoneX);
        return (
          <Path
            d={path}
            fill="none"
            key={`profit-path:${segmentKey}`}
            stroke={
              fade
                ? `url(#${gradientId}-${segment.isPositive ? "positive" : "negative"})`
                : color
            }
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={layer.strokeWidth ?? 2.5}
          />
        );
      })}
    </>
  );
}

function SelectedPoint({
  height,
  margins,
  point,
  selectedIndex,
  selection,
  seriesColor,
  surfaceColor,
  tooltip,
  guideColor,
  showGuide: showGuideOverride,
  showMarker,
}: {
  height: number;
  margins: Required<PlotPadding>;
  point: ChartPoint;
  selectedIndex?: number;
  selection: ChartSelection;
  seriesColor: string;
  surfaceColor: string;
  tooltip?: ChartTooltipProps;
  guideColor: string;
  showGuide?: boolean;
  showMarker?: boolean;
}) {
  const showGuide =
    showGuideOverride ??
    (tooltip ? tooltip.showCrosshair !== false : selectedIndex !== undefined);
  return (
    <>
      {showGuide && (
        <SvgLine
          stroke={guideColor}
          strokeDasharray="3 4"
          strokeWidth={1}
          x1={point.x}
          x2={point.x}
          y1={margins.top}
          y2={height - margins.bottom}
        />
      )}
      {showMarker === false ? null : (
        <AnimatedCircle
          animatedProps={selection.markerProps}
          cx={point.x}
          cy={point.y}
          fill={seriesColor}
          r={4.5}
          stroke={surfaceColor}
          strokeWidth={2}
        />
      )}
    </>
  );
}

function Cursor({
  height,
  margins,
  selection,
  seriesColor,
  surfaceColor,
  guideColor,
  showCrosshair,
  showDots,
}: {
  height: number;
  margins: Required<PlotPadding>;
  selection: ChartSelection;
  seriesColor: string;
  surfaceColor: string;
  guideColor: string;
  showCrosshair: boolean;
  showDots: boolean;
}) {
  return (
    <>
      {showCrosshair && (
        <AnimatedLine
          animatedProps={selection.cursorLineProps}
          stroke={guideColor}
          strokeDasharray="3 4"
          strokeWidth={1}
          x1={0}
          x2={0}
          y1={margins.top}
          y2={height - margins.bottom}
        />
      )}
      {showDots && (
        <AnimatedCircle
          animatedProps={selection.cursorDotProps}
          fill={seriesColor}
          r={4.5}
          stroke={surfaceColor}
          strokeWidth={2}
        />
      )}
    </>
  );
}

export function CartesianChart<T extends object>({
  accessibilityLabel = "Cartesian chart",
  animationDuration = 560,
  animationKey,
  barGap = 4,
  barSize,
  children,
  data,
  height = 240,
  margin,
  maxBarSize = 56,
  onSelectIndex,
  selectedIndex,
  stackGap = 0,
  stacked = false,
  status = "ready",
  statusLabel,
  style,
  xDataKey,
  xDomain,
  xDomainSlotCount,
  xScale = "time",
  yDomain,
}: CartesianChartProps<T>) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<NativeChartRange | null>(null);
  const parsed = useMemo(() => parseChildren(children), [children]);
  const unsupportedSignature = parsed.unsupported.join(", ");
  useEffect(() => {
    if (__DEV__ && unsupportedSignature) {
      console.warn(
        `[bklitui/native] The native Cartesian renderer does not implement: ${unsupportedSignature}.`
      );
    }
  }, [unsupportedSignature]);
  const key = (xDataKey ?? "date") as keyof T & string;
  const resolvedXDomain = useMemo(
    () => resolveNumericXDomain(xDomain, xScale),
    [xDomain, xScale]
  );
  const { geometries, layers, margins, model, xTicks, yTicks } = useChartModel(
    data,
    parsed,
    key,
    xScale,
    margin,
    width,
    height,
    yDomain,
    stacked,
    resolvedXDomain
  );
  const points = useMemo(
    () =>
      (geometries.get(layers[0]?.dataKey ?? "")?.points ?? []).filter(
        (point) =>
          point.x >= margins.left - 0.01 &&
          point.x <= width - margins.right + 0.01
      ),
    [geometries, layers, margins.left, margins.right, width]
  );
  const selection = useChartSelection(
    points,
    selectedIndex,
    onSelectIndex,
    !parsed.brush
  );
  const {
    accessiblePoint,
    accessiblePosition,
    gesture,
    onAccessibilityAction,
    point: currentPoint,
    selectedIndex: activeSelectedIndex,
    setSelectedIndex,
  } = selection;
  const tooltipData = useMemo(
    () => createTooltipData(currentPoint, data, geometries, layers, margins),
    [currentPoint, data, geometries, layers, margins]
  );
  const dataLabel = accessiblePoint
    ? (parsed.xAxis?.formatTick?.(data[accessiblePoint.index]?.[key]) ??
      formatX(data[accessiblePoint.index]?.[key], xScale))
    : "No data points";
  const valueFormatter =
    parsed.tooltip?.formatValue ?? ((value: number) => String(value));
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const chartAccessibility = accessiblePoint
    ? `${accessibilityLabel}. ${dataLabel}, ${valueFormatter(accessiblePoint.value)}. Use increment or decrement to inspect points.`
    : `${accessibilityLabel}. No data points.`;
  const hasInteractiveLayers =
    parsed.brush === undefined && parsed.customLayers.length === 0;
  const accessibilityProps = chartAccessibilityProps(
    hasInteractiveLayers,
    chartAccessibility,
    accessiblePoint
      ? `${dataLabel}, ${valueFormatter(accessiblePoint.value)}`
      : "No data points",
    accessiblePosition,
    points.length,
    accessiblePoint,
    onAccessibilityAction
  );

  return (
    <View {...accessibilityProps} style={[styles.root, style]}>
      <ChartCanvas
        animationDuration={animationDuration}
        animationKey={animationKey}
        areas={parsed.areas}
        barGap={barGap}
        barSize={barSize}
        bars={parsed.bars}
        brush={parsed.brush}
        currentPoint={currentPoint}
        customLayers={parsed.customLayers}
        data={data}
        geometries={geometries}
        gesture={gesture}
        grid={parsed.grid}
        height={height}
        layers={layers}
        lines={parsed.lines}
        margins={margins}
        maxBarSize={maxBarSize}
        model={model}
        onLayout={onLayout}
        onSelectIndex={onSelectIndex}
        profitLossLines={parsed.profitLossLines}
        range={range}
        selectedIndex={activeSelectedIndex}
        selection={selection}
        setRange={setRange}
        setSelectedIndex={setSelectedIndex}
        stacked={stacked}
        stackGap={stackGap}
        status={status}
        statusLabel={statusLabel}
        theme={theme}
        tooltip={parsed.tooltip}
        tooltipData={tooltipData}
        width={width}
        xDataKey={key}
        xDomainSlotCount={xDomainSlotCount}
        xScale={xScale}
        xTicks={xTicks}
        yAxis={parsed.yAxis}
        yTicks={yTicks}
      />
      {parsed.xAxis && (
        <AxisX
          color={parsed.xAxis.textColor ?? theme.textColor}
          margins={margins}
          ticks={xTicks}
          width={width}
        />
      )}
      {parsed.legend && (
        <Legend
          config={parsed.legend}
          data={data}
          layers={layers}
          themeColors={theme.seriesColors}
        />
      )}
    </View>
  );
}

function clampOpacity(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.18;
}

function layersColor(
  layer: Layer | undefined,
  layers: readonly Layer[],
  colors: readonly string[]
): string {
  const seriesKeys = [...new Set(layers.map((item) => item.dataKey))];
  const index = layer ? seriesKeys.indexOf(layer.dataKey) : 0;
  return colors[Math.max(0, index) % colors.length] ?? "#397db5";
}

function tooltipRowsForPoint(
  point: Record<string, unknown>,
  layers: readonly Layer[],
  colors: readonly string[],
  formatValue?: (value: number) => string
): NativeTooltipRow[] {
  const seen = new Set<string>();
  return layers.flatMap((layer) => {
    if (seen.has(layer.dataKey)) {
      return [];
    }
    seen.add(layer.dataKey);
    const rawValue = point[layer.dataKey];
    const numericValue = asNumber(rawValue);
    if (!Number.isFinite(numericValue)) {
      return [];
    }
    const color =
      ("stroke" in layer ? layer.stroke : undefined) ??
      ("fill" in layer ? layer.fill : undefined) ??
      layersColor(layer, layers, colors);
    return [
      {
        color,
        label: ("label" in layer ? layer.label : undefined) ?? layer.dataKey,
        value: formatValue?.(numericValue) ?? numericValue,
      },
    ];
  });
}

function GridLines({
  color,
  grid,
  height,
  margins,
  width,
  xTicks,
}: {
  color: string;
  grid: GridProps;
  height: number;
  margins: Required<PlotPadding>;
  width: number;
  xTicks: readonly Tick[];
}) {
  const plotHeight = Math.max(0, height - margins.top - margins.bottom);
  const rows = Math.max(0, Math.floor(grid.numTicksRows ?? 5));
  const rowLines = Array.from(
    { length: rows },
    (_, index) => (index + 1) / (rows + 1)
  );
  const columns = Math.max(0, Math.floor(grid.numTicksColumns ?? 10));
  const columnLines =
    columns > 0
      ? Array.from(
          { length: columns },
          (_, index) => (index + 1) / (columns + 1)
        )
      : xTicks.map((tick) => tick.ratio);
  return (
    <>
      {grid.horizontal !== false &&
        rowLines.map((ratio) => {
          const y = margins.top + ratio * plotHeight;
          return (
            <SvgLine
              key={`row:${ratio}`}
              stroke={grid.stroke ?? color}
              strokeDasharray={grid.strokeDasharray ?? "4,4"}
              strokeWidth={grid.strokeWidth ?? 1}
              x1={margins.left}
              x2={width - margins.right}
              y1={y}
              y2={y}
            />
          );
        })}
      {grid.vertical &&
        columnLines.map((ratio) => {
          const x =
            margins.left + ratio * (width - margins.left - margins.right);
          return (
            <SvgLine
              key={`col:${ratio}`}
              stroke={grid.stroke ?? color}
              strokeDasharray={grid.strokeDasharray ?? "4,4"}
              strokeWidth={grid.strokeWidth ?? 1}
              x1={x}
              x2={x}
              y1={margins.top}
              y2={height - margins.bottom}
            />
          );
        })}
    </>
  );
}

function AxisY({
  axis,
  color,
  height,
  margins,
  ticks,
}: {
  axis: YAxisProps;
  color: string;
  height: number;
  margins: Required<PlotPadding>;
  ticks: readonly Tick[];
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ticks.map((tick) => {
        const y =
          margins.top + tick.ratio * (height - margins.top - margins.bottom);
        return (
          <Text
            key={`${tick.ratio}:${tick.label}`}
            numberOfLines={1}
            style={{
              position: "absolute",
              left: 0,
              top: y - 7,
              width: margins.left - 6,
              color: axis.textColor ?? color,
              fontSize: 10,
              textAlign: "right",
            }}
          >
            {tick.label}
          </Text>
        );
      })}
    </View>
  );
}

function AxisX({
  color,
  margins,
  ticks,
  width,
}: {
  color: string;
  margins: Required<PlotPadding>;
  ticks: readonly Tick[];
  width: number;
}) {
  const { fontScale } = useWindowDimensions();
  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const labelWidth = Math.max(48, Math.round(48 * fontScale));
  const labelLeft = (ratio: number, index: number) => {
    const lastPosition = Math.max(0, plotWidth - labelWidth);
    if (index === 0) {
      return 0;
    }
    if (index === ticks.length - 1) {
      return lastPosition;
    }
    return Math.max(
      0,
      Math.min(lastPosition, ratio * plotWidth - labelWidth / 2)
    );
  };
  return (
    <View
      style={[
        styles.axisX,
        { marginLeft: margins.left, marginRight: margins.right },
      ]}
    >
      {ticks.map((tick, index) => (
        <Text
          key={`${tick.ratio}:${tick.label}`}
          numberOfLines={1}
          style={[
            styles.axisTick,
            {
              color,
              left: labelLeft(tick.ratio, index),
              width: labelWidth,
              textAlign: getTickAlignment(index, ticks.length),
            },
          ]}
        >
          {tick.label}
        </Text>
      ))}
    </View>
  );
}

function getTickAlignment(
  index: number,
  count: number
): "left" | "center" | "right" {
  if (index === 0) {
    return "left";
  }
  if (index === count - 1) {
    return "right";
  }
  return "center";
}

function Legend<T extends object>({
  config,
  data,
  layers,
  themeColors,
}: {
  config: ChartLegendProps;
  data: readonly T[];
  layers: readonly Layer[];
  themeColors: readonly string[];
}) {
  const items = config.items ?? [
    ...new Map(
      layers.map((layer) => [
        layer.dataKey,
        {
          color:
            ("stroke" in layer ? layer.stroke : undefined) ??
            ("fill" in layer ? layer.fill : undefined) ??
            layersColor(layer, layers, themeColors),
          label: ("label" in layer ? layer.label : undefined) ?? layer.dataKey,
          value:
            data.length > 0
              ? asNumber(
                  (data.at(-1) as Record<string, unknown>)[layer.dataKey]
                )
              : undefined,
        },
      ])
    ).values(),
  ];
  return (
    <View style={styles.legend}>
      {config.title && (
        <Text
          style={[styles.legendTitle, { color: config.textColor ?? "#71717a" }]}
        >
          {config.title}
        </Text>
      )}
      <View style={styles.legendItems}>
        {items.map((item, index) => (
          <View key={`${item.label}:${index}`} style={styles.legendItem}>
            {config.showMarker !== false && (
              <View
                style={[styles.legendMark, { backgroundColor: item.color }]}
              />
            )}
            <Text
              style={[
                styles.legendLabel,
                { color: config.textColor ?? "#71717a" },
              ]}
            >
              {item.label}
            </Text>
            {item.value !== undefined && Number.isFinite(item.value) && (
              <Text
                style={[
                  styles.legendValue,
                  { color: config.textColor ?? "#71717a" },
                ]}
              >
                {formatY(item.value)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "visible", width: "100%" },
  plot: { overflow: "hidden", position: "relative", width: "100%" },
  tooltip: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: "absolute",
  },
  tooltipText: {
    color: "#fff",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  statusOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(127,127,127,0.10)",
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  statusText: { fontSize: 12, fontWeight: "500" },
  axisX: { height: 24, position: "relative" },
  axisTick: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    position: "absolute",
    top: 2,
    width: 48,
  },
  legend: { gap: 6, paddingTop: 10 },
  legendTitle: { fontSize: 11, fontWeight: "600" },
  legendItems: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 24,
  },
  legendMark: { borderRadius: 4, height: 8, width: 8 },
  legendLabel: { fontSize: 11 },
  legendValue: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
});

export const AreaChart = CartesianChart;
