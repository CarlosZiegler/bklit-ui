import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
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
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Path } from "react-native-svg";
import { useChartTheme } from "../theme";
import { createGaugeNotches, interpolateGaugeColor } from "./gauge-geometry";
import { clamp } from "./geometry";

export type GaugeOrientation = "arc" | "linear";
export type GaugeLabelPlacement = "top" | "bottom" | "left" | "right";
export type GaugeLabelAlign = "start" | "center" | "end";

export interface GaugeProps {
  animate?: boolean;
  animationDuration?: number;
  animationKey?: string | number;
  orientation?: GaugeOrientation;
  value: number;
  totalNotches?: number;
  spacing?: number;
  notchCornerRadius?: number;
  uniformWidth?: boolean;
  startAngle?: number;
  endAngle?: number;
  useGradient?: boolean;
  activeGradient?: readonly [string, string];
  inactiveGradient?: readonly [string, string];
  centerValue?: number;
  defaultLabel?: string;
  prefix?: string;
  suffix?: string;
  formatOptions?: Intl.NumberFormatOptions;
  labelPlacement?: GaugeLabelPlacement;
  labelAlign?: GaugeLabelAlign;
  inactiveFill?: string;
  activeFill?: string;
  inactiveFillOpacity?: number;
  activeFillOpacity?: number;
  children?: ReactNode;
  width?: number;
  height?: number;
  minWidth?: number;
  notchLengthPercent?: number;
  notchWidthPercent?: number;
  linearHeight?: number;
  enterStaggerScale?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  valueStyle?: TextStyle;
  labelStyle?: TextStyle;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const LABEL_TEXT_ALIGN: Record<GaugeLabelAlign, TextStyle["textAlign"]> = {
  start: "left",
  center: "center",
  end: "right",
};
const LABEL_ITEMS_ALIGN: Record<GaugeLabelAlign, ViewStyle["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
};

function GaugeLabel({
  value,
  label,
  prefix,
  suffix,
  formatOptions,
  align,
  valueStyle,
  labelStyle,
}: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  formatOptions?: Intl.NumberFormatOptions;
  align: GaugeLabelAlign;
  valueStyle?: TextStyle;
  labelStyle?: TextStyle;
}) {
  const theme = useChartTheme();
  const textAlign = LABEL_TEXT_ALIGN[align];
  const formatted = new Intl.NumberFormat(
    undefined,
    formatOptions ?? { maximumFractionDigits: 2 }
  ).format(value);
  return (
    <View
      style={[
        styles.labelBlock,
        {
          alignItems: LABEL_ITEMS_ALIGN[align],
        },
      ]}
    >
      <Text
        numberOfLines={1}
        selectable
        style={[
          styles.valueText,
          { color: theme.color, textAlign },
          valueStyle,
        ]}
      >
        {prefix}
        {formatted}
        {suffix}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.labelText,
          { color: theme.textColor, textAlign },
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

interface GaugeTrackProps {
  width: number;
  height: number;
  children?: ReactNode;
  notches: ReturnType<typeof createGaugeNotches>;
  inactiveFill?: string;
  activeFill?: string;
  useGradient: boolean;
  activeStart: string;
  activeEnd: string;
  inactiveStart: string;
  inactiveEnd: string;
  activeFillOpacity: number;
  inactiveFillOpacity: number;
  color: string;
  trackColor: string;
}

function getNotchFill(
  index: number,
  count: number,
  isActive: boolean,
  props: GaugeTrackProps
) {
  const amount = count > 1 ? index / (count - 1) : 1;
  if (isActive) {
    return (
      props.activeFill ??
      (props.useGradient
        ? interpolateGaugeColor(props.activeStart, props.activeEnd, amount)
        : props.color)
    );
  }
  return (
    props.inactiveFill ??
    (props.inactiveStart === props.inactiveEnd
      ? props.trackColor
      : interpolateGaugeColor(props.inactiveStart, props.inactiveEnd, amount))
  );
}

function GaugeTrack(props: GaugeTrackProps) {
  const { width, height, children, notches } = props;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return (
    <Svg height={height} width={width}>
      {children ? <Defs>{children}</Defs> : null}
      {notches.map((notch) => (
        <Path
          d={notch.path}
          fill={getNotchFill(notch.index, notches.length, notch.active, props)}
          fillOpacity={clamp(
            notch.active ? props.activeFillOpacity : props.inactiveFillOpacity,
            0,
            1
          )}
          key={`gauge-notch-${notch.index}`}
        />
      ))}
    </Svg>
  );
}

interface GaugePresentationProps {
  orientation: GaugeOrientation;
  fixedWidth?: number;
  fixedHeight?: number;
  minWidth?: number;
  linearHeight: number;
  style?: StyleProp<ViewStyle>;
  entranceStyle: ReturnType<typeof useAnimatedStyle>;
  accessibilityLabel: string;
  safeValue: number;
  label: ReactNode;
  hasLabel: boolean;
  labelPlacement: GaugeLabelPlacement;
  onLayout: (event: LayoutChangeEvent) => void;
  onTrackLayout: (event: LayoutChangeEvent) => void;
  track: ReactNode;
  linearTrack: ReactNode;
}

function GaugePresentation({
  orientation,
  fixedWidth,
  fixedHeight,
  minWidth,
  linearHeight,
  style,
  entranceStyle,
  accessibilityLabel,
  safeValue,
  label,
  hasLabel,
  labelPlacement,
  onLayout,
  onTrackLayout,
  track,
  linearTrack,
}: GaugePresentationProps) {
  const accessibilityValue = {
    min: 0,
    max: 100,
    now: Math.round(safeValue),
    text: `${Math.round(safeValue)}%`,
  };
  if (orientation === "arc") {
    return (
      <AnimatedView
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="progressbar"
        accessibilityValue={accessibilityValue}
        onLayout={onLayout}
        style={[
          entranceStyle,
          styles.arcRoot,
          {
            width: fixedWidth ?? "100%",
            height: fixedHeight,
            aspectRatio: fixedHeight ? undefined : 21 / 16,
            minWidth,
          },
          style,
        ]}
      >
        {track}
        {label && (
          <View pointerEvents="none" style={styles.centerOverlay}>
            {label}
          </View>
        )}
      </AnimatedView>
    );
  }

  const trackStyle: ViewStyle = {
    height: fixedHeight ?? linearHeight,
    flex: 1,
    minWidth: 0,
  };
  const labelBefore = labelPlacement === "top" || labelPlacement === "left";
  const labelOnSide = labelPlacement === "left" || labelPlacement === "right";
  return (
    <AnimatedView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={accessibilityValue}
      onLayout={onLayout}
      style={[
        entranceStyle,
        styles.linearRoot,
        {
          width: fixedWidth ?? "100%",
          minWidth,
          flexDirection: labelOnSide ? "row" : "column",
          gap: hasLabel ? 12 : 0,
        },
        style,
      ]}
    >
      {label && labelBefore ? label : null}
      <View onLayout={onTrackLayout} style={trackStyle}>
        {linearTrack}
      </View>
      {label && !labelBefore ? label : null}
    </AnimatedView>
  );
}

export function Gauge({
  animate = true,
  animationDuration = 320,
  animationKey,
  orientation = "arc",
  value,
  totalNotches = 40,
  spacing = 25,
  notchCornerRadius = 0,
  uniformWidth = false,
  startAngle = 135,
  endAngle = 405,
  useGradient = false,
  activeGradient,
  inactiveGradient,
  centerValue,
  defaultLabel = "Total",
  prefix,
  suffix,
  formatOptions,
  labelPlacement = "bottom",
  labelAlign = "center",
  inactiveFill,
  activeFill,
  inactiveFillOpacity = 0.8,
  activeFillOpacity = 1,
  children,
  width: fixedWidth,
  height: fixedHeight,
  minWidth,
  notchLengthPercent = 100,
  notchWidthPercent = 80,
  linearHeight = 24,
  enterStaggerScale = 1,
  accessibilityLabel = "Gauge",
  style,
  valueStyle,
  labelStyle,
}: GaugeProps) {
  const theme = useChartTheme();
  const reduceMotion = useReducedMotion();
  const entrance = useSharedValue(!animate || reduceMotion ? 1 : 0);
  const entranceStyle = useAnimatedStyle(() => ({ opacity: entrance.value }));
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey intentionally replays the gauge entrance.
  useEffect(() => {
    if (!animate || reduceMotion) {
      entrance.value = 1;
    } else {
      entrance.value = 0;
      entrance.value = withDelay(
        Math.max(0, (enterStaggerScale - 1) * 100),
        withTiming(1, {
          duration: Math.max(0, animationDuration),
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );
    }
  }, [
    animate,
    animationDuration,
    animationKey,
    enterStaggerScale,
    entrance,
    reduceMotion,
  ]);
  const [layout, setLayout] = useState({
    width: fixedWidth ?? 0,
    height: fixedHeight ?? 0,
  });
  const [trackSize, setTrackSize] = useState({
    width: fixedWidth ?? 0,
    height: fixedHeight ?? linearHeight,
  });
  const width = fixedWidth ?? layout.width;
  const height = fixedHeight ?? layout.height;
  const geometryWidth = orientation === "arc" ? width : trackSize.width;
  const geometryHeight = orientation === "arc" ? height : trackSize.height;
  const safeValue = clamp(value, 0, 100);
  const notches = useMemo(
    () =>
      createGaugeNotches({
        width: geometryWidth,
        height: geometryHeight,
        value: safeValue,
        totalNotches,
        spacing,
        notchCornerRadius,
        uniformWidth,
        startAngle,
        endAngle,
        orientation,
        notchLengthPercent,
        notchWidthPercent,
      }),
    [
      endAngle,
      geometryHeight,
      geometryWidth,
      notchCornerRadius,
      notchLengthPercent,
      notchWidthPercent,
      orientation,
      safeValue,
      spacing,
      startAngle,
      totalNotches,
      uniformWidth,
    ]
  );
  const paletteStart = theme.seriesColors[0] ?? theme.color;
  const paletteEnd = theme.seriesColors.at(-1) ?? theme.color;
  const activeStart = activeGradient?.[0] ?? paletteStart;
  const activeEnd = activeGradient?.[1] ?? paletteEnd;
  const inactiveStart = inactiveGradient?.[0] ?? theme.trackColor;
  const inactiveEnd = inactiveGradient?.[1] ?? theme.trackColor;
  const hasLabel = centerValue !== undefined;
  const label =
    centerValue === undefined ? null : (
      <GaugeLabel
        align={labelAlign}
        formatOptions={formatOptions}
        label={defaultLabel}
        labelStyle={labelStyle}
        prefix={prefix}
        suffix={suffix}
        value={centerValue ?? 0}
        valueStyle={valueStyle}
      />
    );
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout;
    setLayout({ width: next.width, height: next.height });
  };
  const trackProps = {
    children,
    notches,
    inactiveFill,
    activeFill,
    useGradient,
    activeStart,
    activeEnd,
    inactiveStart,
    inactiveEnd,
    activeFillOpacity,
    inactiveFillOpacity,
    color: theme.color,
    trackColor: theme.trackColor,
  };
  const chart = <GaugeTrack height={height} width={width} {...trackProps} />;
  const linearChart = (
    <GaugeTrack
      height={trackSize.height}
      width={trackSize.width}
      {...trackProps}
    />
  );
  const onTrackLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setTrackSize({ width: nextWidth, height: nextHeight });
  };
  return (
    <GaugePresentation
      accessibilityLabel={accessibilityLabel}
      entranceStyle={entranceStyle}
      fixedHeight={fixedHeight}
      fixedWidth={fixedWidth}
      hasLabel={hasLabel}
      label={label}
      labelPlacement={labelPlacement}
      linearHeight={linearHeight}
      linearTrack={linearChart}
      minWidth={minWidth}
      onLayout={onLayout}
      onTrackLayout={onTrackLayout}
      orientation={orientation}
      safeValue={safeValue}
      style={style}
      track={chart}
    />
  );
}

const styles = StyleSheet.create({
  arcRoot: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  linearRoot: { alignItems: "center", justifyContent: "center" },
  labelBlock: { flexShrink: 1, justifyContent: "center", minWidth: 0 },
  valueText: {
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    maxWidth: "100%",
  },
  labelText: { fontSize: 11, marginTop: 2, maxWidth: "100%" },
});
