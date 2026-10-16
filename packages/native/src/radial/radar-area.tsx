import { useEffect, useMemo } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Circle, Path } from "react-native-svg";
import { useChartTheme } from "../theme";
import { createRadarAreaPath } from "./geometry";
import { useRadarNative } from "./radar-context";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface RadarAreaProps {
  index: number;
  color?: string;
  showPoints?: boolean;
  showStroke?: boolean;
  showGlow?: boolean;
}

export function RadarArea({
  index,
  color: colorProp,
  showPoints = true,
  showStroke = true,
}: RadarAreaProps) {
  const {
    data,
    metrics,
    levels,
    animate,
    enterDurationMs,
    staggerScale,
    motionReplayKey,
    hoveredIndex,
    setHoveredIndex,
    getColor,
    getPointPosition,
  } = useRadarNative();
  const theme = useChartTheme();
  const reduceMotion = useReducedMotion();
  const mount = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const faded = hoveredIndex !== null && hoveredIndex !== index;
  const animatedProps = useAnimatedProps(() => ({
    opacity: mount.value * (faded ? 0.3 : 1),
  }));
  const item = data[index];
  const positions = useMemo(
    () =>
      item
        ? metrics.map((metric, metricIndex) =>
            getPointPosition(metricIndex, item.values[metric.key] ?? 0)
          )
        : [],
    [getPointPosition, item, metrics]
  );
  const path = useMemo(() => createRadarAreaPath(positions), [positions]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: motionReplayKey is an intentional replay trigger from Studio.
  useEffect(() => {
    if (animate && !reduceMotion) {
      mount.value = 0;
      const delay = (levels * 80 + 200 + index * 150) * staggerScale;
      mount.value = withDelay(
        Math.max(0, delay),
        withTiming(1, {
          duration: Math.max(180, enterDurationMs * 0.45),
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );
    } else {
      mount.value = 1;
    }
  }, [
    animate,
    enterDurationMs,
    index,
    levels,
    mount,
    motionReplayKey,
    reduceMotion,
    staggerScale,
  ]);
  if (!item || path.length === 0) {
    return null;
  }
  const selected = hoveredIndex === index;
  const color = colorProp ?? getColor(index);
  return (
    <>
      <AnimatedPath
        animatedProps={animatedProps}
        d={path}
        fill={color}
        fillOpacity={selected ? 0.3 : 0.15}
        onPress={() => setHoveredIndex(selected ? null : index)}
        pointerEvents="auto"
        stroke={showStroke ? color : "none"}
        strokeLinejoin="round"
        strokeWidth={selected ? 3 : 2}
      />
      {showPoints &&
        positions.map((point, pointIndex) => {
          const metric = metrics[pointIndex];
          if (!metric) {
            return null;
          }
          return (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={color}
              key={`radar-point-${index}-${pointIndex}-${metric.key}`}
              pointerEvents="none"
              r={selected ? 5 : 4}
              stroke={theme.surfaceColor}
              strokeWidth={2}
            />
          );
        })}
    </>
  );
}

RadarArea.displayName = "RadarArea";
