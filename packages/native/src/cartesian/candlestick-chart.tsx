import {
  Children,
  Fragment,
  isValidElement,
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
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Rect,
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
import { createCartesianModel } from "../cartesian-model";
import type { PlotPadding } from "../geometry";
import { useChartTheme } from "../theme";
import {
  type CandleDatum,
  insetPlotRatio,
  projectCandles,
  resolveEndpointTextAnchor,
  selectReadableTickIndices,
} from "./geometry";

export interface OHLCDataPoint extends CandleDatum {
  date: Date | string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandlestickProps {
  animate?: boolean;
  positiveFill?: string;
  negativeFill?: string;
  bodyPatternPositive?: string;
  bodyPatternNegative?: string;
  insideStrokeWidth?: number;
  fadedOpacity?: number;
  showHoverFade?: boolean;
}

export interface CandlestickChartProps<T extends OHLCDataPoint> {
  data: readonly T[];
  xDataKey?: keyof T & string;
  margin?: PlotPadding;
  animationDuration?: number;
  animationKey?: string | number;
  height?: number;
  aspectRatio?: number;
  candleGap?: number;
  candleWidth?: number;
  xDomain?: readonly [Date, Date];
  xDomainSlotCount?: number;
  children?: ReactNode;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Candlestick(_props: CandlestickProps): null {
  return null;
}
Candlestick.displayName = "Candlestick";

const AnimatedG = Animated.createAnimatedComponent(G);
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

function CandleMark({
  x,
  bodyTop,
  bodyBottom,
  wickTop,
  wickBottom,
  width,
  fill,
  bodyPattern,
  insideStrokeWidth,
  bodyStroke,
  opacity,
  animate,
  animationDuration,
  animationKey,
  onPress,
}: {
  x: number;
  bodyTop: number;
  bodyBottom: number;
  wickTop: number;
  wickBottom: number;
  width: number;
  fill: string;
  bodyPattern?: string;
  insideStrokeWidth: number;
  bodyStroke: string;
  opacity: number;
  animate: boolean;
  animationDuration: number;
  animationKey?: string | number;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value * opacity,
  }));
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey deliberately replays candle entrance when requested.
  useEffect(() => {
    if (animate && !reduceMotion) {
      progress.value = withTiming(1, {
        duration: Math.max(0, animationDuration),
        reduceMotion: ReduceMotion.System,
      });
    } else {
      progress.value = 1;
    }
    return undefined;
  }, [animate, animationDuration, animationKey, progress, reduceMotion]);
  return (
    <AnimatedG animatedProps={animatedProps}>
      <SvgLine
        stroke={fill}
        strokeWidth={1.5}
        x1={x}
        x2={x}
        y1={wickTop}
        y2={wickBottom}
      />
      <Rect
        fill={fill}
        height={bodyHeight}
        onPress={onPress}
        rx={1.5}
        width={width}
        x={x - width / 2}
        y={bodyTop}
      />
      {bodyPattern && (
        <Rect
          fill={bodyPattern}
          height={bodyHeight}
          pointerEvents="none"
          rx={1.5}
          width={width}
          x={x - width / 2}
          y={bodyTop}
        />
      )}
      {insideStrokeWidth > 0 && (
        <Rect
          fill="none"
          height={bodyHeight}
          pointerEvents="none"
          rx={1.5}
          stroke={bodyStroke}
          strokeWidth={insideStrokeWidth}
          width={width}
          x={x - width / 2}
          y={bodyTop}
        />
      )}
    </AnimatedG>
  );
}

function formatDate(value: unknown): string {
  const time =
    value instanceof Date
      ? value.getTime()
      : new Date(value as string | number).getTime();
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(time)
    : "";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    value
  );
}

export function CandlestickChart<T extends OHLCDataPoint>({
  data,
  xDataKey = "date" as keyof T & string,
  margin: marginProp,
  animationDuration = 950,
  animationKey,
  height: fixedHeight,
  aspectRatio = 2,
  candleGap = 0.2,
  candleWidth,
  xDomain,
  xDomainSlotCount,
  children,
  selectedIndex,
  onSelectIndex,
  accessibilityLabel = "Candlestick chart",
  style,
}: CandlestickChartProps<T>) {
  const theme = useChartTheme();
  const { fontScale } = useWindowDimensions();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const width = layout.width;
  const height = fixedHeight ?? (layout.height || 258);
  const [internalIndex, setInternalIndex] = useState<number | null>(null);
  const index = selectedIndex ?? internalIndex;
  const elements = useMemo(() => flatten(children), [children]);
  const candleProps = elements.find((element) => element.type === Candlestick)
    ?.props as CandlestickProps | undefined;
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
  const margin = useMemo(
    () => ({
      top: marginProp?.top ?? 12,
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
        dataKeys: ["low", "high"],
        height,
        margin,
        width,
        xDataKey,
        xScale: "time",
      }),
    [data, height, margin, width, xDataKey]
  );
  const plot = useMemo(
    () => ({
      left: margin.left,
      top: margin.top,
      width: Math.max(0, width - margin.left - margin.right),
      height: Math.max(0, height - margin.top - margin.bottom),
    }),
    [height, margin, width]
  );
  const xPositions = useMemo(
    () =>
      (xDomain
        ? data.map((row) => {
            const raw = row[xDataKey];
            const value =
              raw instanceof Date
                ? raw.getTime()
                : new Date(raw as string | number).getTime();
            const start = xDomain[0].getTime();
            const end = xDomain[1].getTime();
            const ratio = end === start ? 0.5 : (value - start) / (end - start);
            return ratio;
          })
        : model.xPositions
      ).map((ratio) =>
        ratio === null
          ? null
          : insetPlotRatio(
              ratio,
              plot.width,
              plot.width / (2 * Math.max(1, xDomainSlotCount ?? data.length))
            )
      ),
    [data, model.xPositions, plot.width, xDataKey, xDomain, xDomainSlotCount]
  );
  const candles = useMemo(
    () =>
      projectCandles({
        data,
        xPositions,
        plot,
        domain: model.yDomain ?? [0, 1],
        candleGap,
        candleWidth,
      }),
    [candleGap, candleWidth, data, model.yDomain, plot, xPositions]
  );
  const selected = index === null ? undefined : data[index];
  const text = selected
    ? `${formatDate(selected[xDataKey])} · O ${formatNumber(selected.open)} H ${formatNumber(selected.high)} L ${formatNumber(selected.low)} C ${formatNumber(selected.close)}`
    : `${data.length} OHLC candles`;
  const onLayout = (event: LayoutChangeEvent) =>
    setLayout({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") {
      const next = Math.min(data.length - 1, (index ?? -1) + 1);
      setInternalIndex(next);
      onSelectIndex?.(next);
    } else if (event.nativeEvent.actionName === "decrement") {
      const next = Math.max(0, (index ?? data.length) - 1);
      setInternalIndex(next);
      onSelectIndex?.(next);
    }
  };
  const yDomain = model.yDomain ?? [0, 1];
  const yTicks = Array.from(
    { length: Math.max(2, yAxis?.numTicks ?? 5) },
    (_, tick) => {
      const ratio = tick / (Math.max(2, yAxis?.numTicks ?? 5) - 1);
      return { ratio, value: yDomain[1] - ratio * (yDomain[1] - yDomain[0]) };
    }
  );
  const positive = candleProps?.positiveFill ?? "#16a34a";
  const negative = candleProps?.negativeFill ?? "#dc2626";
  const positivePattern = candleProps?.bodyPatternPositive;
  const negativePattern = candleProps?.bodyPatternNegative;
  const xTickIndices = selectReadableTickIndices(
    data.map(
      (row) => xAxis?.formatTick?.(row[xDataKey]) ?? formatDate(row[xDataKey])
    ),
    xPositions,
    plot.width,
    xAxis?.numTicks ?? 5,
    fontScale
  );
  const xAxisFontSize = 10 * fontScale;

  return (
    <View
      accessibilityActions={[
        { name: "increment", label: "Select next candle" },
        { name: "decrement", label: "Select previous candle" },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: Math.max(0, data.length - 1),
        now: Math.max(0, index ?? 0),
        text,
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
          <Defs>
            <LinearGradient
              id="candle-positive-gradient"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <Stop offset="0%" stopColor={positive} stopOpacity={1} />
              <Stop offset="100%" stopColor={positive} stopOpacity={0.75} />
            </LinearGradient>
            <LinearGradient
              id="candle-negative-gradient"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <Stop offset="0%" stopColor={negative} stopOpacity={1} />
              <Stop offset="100%" stopColor={negative} stopOpacity={0.75} />
            </LinearGradient>
          </Defs>
          {grid?.horizontal !== false &&
            yTicks.map(({ ratio, value }) => {
              const y = margin.top + ratio * plot.height;
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
                      {yAxis.formatValue?.(value) ?? formatNumber(value)}
                    </SvgText>
                  )}
                </Fragment>
              );
            })}
          {xAxis &&
            xTickIndices.map((dataIndex) => {
              const row = data[dataIndex];
              if (!row) {
                return null;
              }
              const ratio = xPositions[dataIndex] ?? 0;
              const raw = row[xDataKey];
              return (
                <SvgText
                  fill={xAxis.textColor ?? theme.textColor}
                  fontSize={xAxisFontSize}
                  key={`x-${dataIndex}`}
                  textAnchor={resolveEndpointTextAnchor(dataIndex, data.length)}
                  x={margin.left + ratio * plot.width}
                  y={height - margin.bottom + 18}
                >
                  {xAxis.formatTick?.(raw) ?? formatDate(raw)}
                </SvgText>
              );
            })}
          {candles.map((candle) => {
            const item = data[candle.index];
            const fill = candle.positive ? positive : negative;
            const pattern = candle.positive ? positivePattern : negativePattern;
            const selectedOpacity =
              candleProps?.showHoverFade !== false &&
              index !== null &&
              index !== candle.index
                ? (candleProps?.fadedOpacity ?? 0.3)
                : 1;
            return (
              <CandleMark
                animate={candleProps?.animate !== false}
                animationDuration={animationDuration}
                animationKey={animationKey}
                bodyBottom={candle.bodyBottom}
                bodyPattern={pattern}
                bodyStroke={theme.surfaceColor}
                bodyTop={candle.bodyTop}
                fill={fill}
                insideStrokeWidth={candleProps?.insideStrokeWidth ?? 0}
                key={`candle-${String(item?.[xDataKey])}-${candle.index}`}
                onPress={() => {
                  setInternalIndex(candle.index);
                  onSelectIndex?.(candle.index);
                }}
                opacity={selectedOpacity}
                wickBottom={candle.wickBottom}
                wickTop={candle.wickTop}
                width={candle.width}
                x={candle.x}
              />
            );
          })}
        </Svg>
      )}
      {tooltip && selected && (
        <View pointerEvents="none" style={styles.readout}>
          <Text style={[styles.readoutText, { color: theme.textColor }]}>
            {text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 160,
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
