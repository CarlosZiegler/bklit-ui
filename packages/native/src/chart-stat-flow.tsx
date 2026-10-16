import { type ReactNode, useEffect, useRef } from "react";
import {
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
  withTiming,
} from "react-native-reanimated";
import { useChartTheme } from "./theme";

export type ChartStatFlowFormat = Intl.NumberFormatOptions;

export interface ChartStatFlowProps {
  value: number;
  label: string;
  formatOptions?: ChartStatFlowFormat;
  prefix?: string;
  suffix?: string;
  valueStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  animated?: boolean;
}

/**
 * Native formatted metric stack. Value changes ease in with a short opacity
 * transition; digit layout stays stable and respects the system Reduce Motion
 * setting instead of depending on the browser-only NumberFlow custom element.
 */
export function ChartStatFlow({
  value,
  label,
  formatOptions,
  prefix = "",
  suffix = "",
  valueStyle,
  labelStyle,
  style,
  icon,
  animated = true,
}: ChartStatFlowProps) {
  const theme = useChartTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const previousValue = useRef(value);
  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }
    previousValue.current = value;
    if (!animated || reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = 0.5;
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [animated, opacity, reduceMotion, value]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const formatted = Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
        ...formatOptions,
      }).format(value)
    : "—";

  return (
    <View style={[styles.root, style]}>
      {icon}
      <Animated.Text
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        numberOfLines={1}
        selectable
        style={[
          styles.value,
          { color: theme.textColor },
          animatedStyle,
          valueStyle,
        ]}
      >
        {`${prefix}${formatted}${suffix}`}
      </Animated.Text>
      <Text
        numberOfLines={1}
        style={[styles.label, { color: theme.textColor }, labelStyle]}
      >
        {label}
      </Text>
    </View>
  );
}

ChartStatFlow.displayName = "ChartStatFlow";

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  root: {
    alignItems: "flex-start",
    minWidth: 0,
  },
  value: {
    fontSize: 26,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    lineHeight: 32,
  },
});
