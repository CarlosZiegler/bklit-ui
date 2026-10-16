import { type ReactNode, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { clampProgress } from "./geometry";
import { useChartTheme } from "./theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingChartProps {
  accessibilityLabel?: string;
  animate?: boolean;
  animationKey?: string | number;
  children?: ReactNode;
  color?: string;
  endAngle?: number;
  maxValue: number;
  size?: number;
  startAngle?: number;
  strokeWidth?: number;
  trackColor?: string;
  value: number;
}

export function RingChart({
  accessibilityLabel = "Progress",
  animate = true,
  animationKey,
  children,
  color,
  endAngle = 360,
  maxValue,
  size = 132,
  startAngle = 0,
  strokeWidth = 10,
  trackColor,
  value,
}: RingChartProps) {
  const theme = useChartTheme();
  const ringColor = color ?? theme.color;
  const resolvedTrackColor = trackColor ?? theme.trackColor;
  const reduceMotion = useReducedMotion();
  const rawProgress =
    maxValue > 0 && Number.isFinite(value) ? value / maxValue : 0;
  const progress = clampProgress(rawProgress);
  const safeSize = Number.isFinite(size) ? Math.max(1, size) : 1;
  const requestedStroke = Number.isFinite(strokeWidth) ? strokeWidth : 1;
  const safeStroke = Math.max(1, Math.min(requestedStroke, safeSize));
  const radius = Math.max(0.5, (safeSize - safeStroke) / 2);
  const circumference = 2 * Math.PI * radius;
  const safeStartAngle = Number.isFinite(startAngle) ? startAngle : 0;
  const safeEndAngle = Number.isFinite(endAngle)
    ? endAngle
    : safeStartAngle + 360;
  const rawSpan = safeEndAngle - safeStartAngle;
  const span = Math.max(0, Math.min(360, rawSpan));
  const sweep = circumference * (span / 360);
  const animatedValue = useSharedValue(animate && !reduceMotion ? 0 : progress);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: sweep * (1 - animatedValue.value),
  }));

  useEffect(() => {
    const shouldAnimate =
      animate && !reduceMotion && (progress > 0 || animationKey !== undefined);
    if (shouldAnimate) {
      animatedValue.value = 0;
      animatedValue.value = withTiming(progress, {
        duration: 720,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
      return;
    }
    animatedValue.value = progress;
  }, [animate, animationKey, animatedValue, progress, reduceMotion]);

  const dashArray = `${Math.max(sweep, 0.001)} ${Math.max(circumference, 0.001)}`;
  const percent = Math.round(progress * 100);

  return (
    <View
      accessibilityLabel={`${accessibilityLabel}: ${percent}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessible
      style={[styles.root, { height: safeSize, width: safeSize }]}
    >
      <Svg height={safeSize} width={safeSize}>
        <Circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          fill="none"
          originX={safeSize / 2}
          originY={safeSize / 2}
          r={radius}
          rotation={safeStartAngle - 90}
          stroke={resolvedTrackColor}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeWidth={safeStroke}
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={safeSize / 2}
          cy={safeSize / 2}
          fill="none"
          originX={safeSize / 2}
          originY={safeSize / 2}
          r={radius}
          rotation={safeStartAngle - 90}
          stroke={ringColor}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeWidth={safeStroke}
        />
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
