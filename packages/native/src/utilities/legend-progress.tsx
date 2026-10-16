import { useEffect } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useChartTheme } from "../theme";
import { useLegendItem } from "./legend-context";
import { resolveLegendProgressMetrics } from "./legend-values";

export interface LegendProgressProps {
  trackStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  height?: number;
}

export function LegendProgress({
  trackStyle,
  indicatorStyle,
  height = 6,
}: LegendProgressProps) {
  const { item } = useLegendItem();
  const theme = useChartTheme();
  const reduceMotion = useReducedMotion();
  const metrics = resolveLegendProgressMetrics(item.value, item.maxValue);
  const animatedProgress = useSharedValue(metrics?.ratio ?? 0);
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  useEffect(() => {
    if (reduceMotion) {
      animatedProgress.value = metrics?.ratio ?? 0;
      return;
    }
    animatedProgress.value = withTiming(metrics?.ratio ?? 0, {
      duration: 500,
      reduceMotion: ReduceMotion.System,
    });
  }, [animatedProgress, metrics?.ratio, reduceMotion]);

  if (!metrics) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`${item.label} progress`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: metrics.maxValue,
        now: metrics.value,
      }}
      style={[
        styles.track,
        { backgroundColor: theme.trackColor, height },
        trackStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: item.color },
          animatedStyle,
          indicatorStyle,
        ]}
      />
    </View>
  );
}

LegendProgress.displayName = "LegendProgress";

const styles = StyleSheet.create({
  track: { borderRadius: 999, overflow: "hidden", width: "100%" },
  indicator: { borderRadius: 999, height: "100%" },
});
