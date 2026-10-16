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
import { createArcPath } from "./geometry";
import { usePieNative } from "./pie-context";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export type PieSliceHoverEffect = "translate" | "grow" | "none";

export interface PieSliceProps {
  index: number;
  color?: string;
  fill?: string;
  animate?: boolean;
  showGlow?: boolean;
  hoverEffect?: PieSliceHoverEffect;
  hoverOffset?: number;
}

export function PieSlice({
  index,
  color: colorProp,
  fill: fillProp,
  animate = true,
  hoverEffect = "translate",
  hoverOffset,
}: PieSliceProps) {
  const {
    arcs,
    data,
    hoveredIndex,
    innerRadius,
    outerRadius,
    cornerRadius,
    hoverOffset: chartHoverOffset,
    enterStaggerScale,
    animationKey,
    setHoveredIndex,
    getColor,
    getFill,
  } = usePieNative();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const faded = hoveredIndex !== null && hoveredIndex !== index;
  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value * (faded ? 0.42 : 1),
  }));
  const translateProgress = useSharedValue(0);
  const translateProps = useAnimatedProps(() => {
    const arc = arcs[index];
    const angle = arc ? (arc.startAngle + arc.endAngle) / 2 : 0;
    const distance =
      hoveredIndex === index && hoverEffect === "translate"
        ? (hoverOffset ?? chartHoverOffset)
        : 0;
    return {
      translateX: Math.cos(angle) * distance * translateProgress.value,
      translateY: Math.sin(angle) * distance * translateProgress.value,
    };
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey is an intentional replay trigger from Studio.
  useEffect(() => {
    if (animate && !reduceMotion) {
      progress.value = 0;
      progress.value = withDelay(
        Math.max(0, (100 + index * 80) * enterStaggerScale),
        withTiming(1, {
          duration: 550,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );
    } else {
      progress.value = 1;
    }
  }, [animate, animationKey, enterStaggerScale, index, progress, reduceMotion]);
  useEffect(() => {
    translateProgress.value = withTiming(hoveredIndex === index ? 1 : 0, {
      duration: reduceMotion ? 0 : 140,
      reduceMotion: ReduceMotion.System,
    });
  }, [hoveredIndex, index, reduceMotion, translateProgress]);

  const arc = arcs[index];
  const item = data[index];
  if (!(arc && item)) {
    return null;
  }
  const selected = hoveredIndex === index;
  const outer =
    outerRadius +
    (selected && hoverEffect === "grow"
      ? (hoverOffset ?? chartHoverOffset)
      : 0);
  const d = createArcPath(
    innerRadius,
    outer,
    arc.startAngle,
    arc.endAngle,
    cornerRadius,
    arc.padAngle
  );
  const fill =
    fillProp ?? item.fill ?? colorProp ?? getColor(index) ?? getFill(index);

  return (
    <AnimatedG animatedProps={translateProps}>
      <AnimatedPath
        animatedProps={animatedProps}
        d={d}
        fill={fill || colorProp || getColor(index)}
        onPress={() => setHoveredIndex(selected ? null : index)}
        stroke={selected ? (colorProp ?? getColor(index)) : "transparent"}
        strokeWidth={selected ? 2 : 0}
      />
    </AnimatedG>
  );
}

PieSlice.displayName = "PieSlice";
