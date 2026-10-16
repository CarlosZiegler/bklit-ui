import { useEffect } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { G, Path } from "react-native-svg";
import { useChartTheme } from "../theme";
import { clamp, createArcPath } from "./geometry";
import { useRingNative } from "./ring-context";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export type RingLineCap = "round" | "butt";

export interface RingProps {
  index: number;
  color?: string;
  animate?: boolean;
  showGlow?: boolean;
  lineCap?: RingLineCap;
}

export function Ring({
  index,
  color: colorProp,
  animate = true,
  lineCap = "round",
}: RingProps) {
  const {
    data,
    hoveredIndex,
    setHoveredIndex,
    getColor,
    getRingRadii,
    startAngle,
    endAngle,
    animationDuration,
    enterStaggerScale,
    animationKey,
  } = useRingNative();
  const theme = useChartTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const faded = hoveredIndex !== null && hoveredIndex !== index;
  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value * (faded ? 0.45 : 1),
  }));
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey is an intentional replay trigger from Studio.
  useEffect(() => {
    if (animate && !reduceMotion) {
      progress.value = 0;
      const delay = Math.max(0, index * 80 * enterStaggerScale);
      progress.value = withDelay(
        delay,
        withTiming(1, {
          duration: Math.max(120, animationDuration * 0.48),
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );
    } else {
      progress.value = 1;
    }
  }, [
    animationDuration,
    animationKey,
    animate,
    enterStaggerScale,
    index,
    progress,
    reduceMotion,
  ]);

  const ringData = data[index];
  if (!ringData) {
    return null;
  }
  const radii = getRingRadii(index);
  if (radii.outerRadius <= 0) {
    return null;
  }
  const color = colorProp ?? getColor(index);
  const fraction =
    ringData.maxValue > 0 ? clamp(ringData.value / ringData.maxValue, 0, 1) : 0;
  const progressEnd = startAngle + (endAngle - startAngle) * fraction;
  const corner =
    lineCap === "round" ? (radii.outerRadius - radii.innerRadius) / 2 : 0;
  const track = createArcPath(
    radii.innerRadius,
    radii.outerRadius,
    startAngle,
    endAngle,
    corner
  );
  const fill =
    fraction > 0
      ? createArcPath(
          radii.innerRadius,
          radii.outerRadius,
          startAngle,
          progressEnd,
          corner
        )
      : "";
  const selected = hoveredIndex === index;

  return (
    <AnimatedG animatedProps={animatedProps}>
      <AnimatedPath
        animatedProps={animatedProps}
        d={track}
        fill={theme.trackColor}
        onPress={() => setHoveredIndex(selected ? null : index)}
        stroke={selected ? color : "transparent"}
        strokeWidth={selected ? 1.5 : 0}
      />
      {fill.length > 0 && (
        <AnimatedPath
          animatedProps={animatedProps}
          d={fill}
          fill={color}
          pointerEvents="none"
        />
      )}
    </AnimatedG>
  );
}

Ring.displayName = "Ring";
