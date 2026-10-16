import { useEffect } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
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
import { useChartTheme } from "../theme";
import { useLegend, useLegendItem } from "./legend-context";

export interface LegendItemProps {
  /** Layout and visual style for the composed item content. */
  style?: StyleProp<ViewStyle>;
  /** Optional style for the outer accessible touch target. */
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function LegendItem({
  style,
  containerStyle,
  children,
}: LegendItemProps) {
  const { setHoveredIndex } = useLegend();
  const { item, index, isHovered, isFaded, percentage } = useLegendItem();
  const theme = useChartTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(isFaded ? 0.48 : 1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    const target = isFaded ? 0.48 : 1;
    if (reduceMotion) {
      opacity.value = target;
      return;
    }
    opacity.value = withTiming(target, {
      duration: 140,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [isFaded, opacity, reduceMotion]);

  const valueLabel = item.value.toLocaleString();
  const accessibilityLabel =
    item.maxValue !== undefined &&
    Number.isFinite(item.maxValue) &&
    item.maxValue > 0
      ? `${item.label}, ${valueLabel}, ${percentage.toFixed(0)} percent`
      : `${item.label}, ${valueLabel}`;
  const backgroundColor = isHovered ? theme.gridColor : "transparent";

  return (
    <Pressable
      accessibilityHint="Tap to select this series and fade the others. Tap again to clear."
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isHovered }}
      onPress={() => setHoveredIndex(isHovered ? null : index)}
      style={({ pressed }) => [
        styles.pressable,
        {
          backgroundColor:
            pressed && !isHovered ? theme.trackColor : backgroundColor,
        },
        containerStyle,
      ]}
    >
      <Animated.View style={[styles.content, style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

LegendItem.displayName = "LegendItem";

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "stretch",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  content: { alignItems: "center", flexDirection: "row", gap: 12 },
});
