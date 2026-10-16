import { type ReactNode, useEffect, useId } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

export type FadeEdges = boolean | "left" | "right";

interface NativeAreaFillProps {
  animate?: boolean;
  animationDuration?: number;
  animationKey?: string | number;
  children?: ReactNode;
  d: string;
  fadeEdges?: FadeEdges;
  fill: string;
  fillOpacity?: number;
  gradientSpan?: number;
  gradientToOpacity?: number;
  height: number;
  plotLeft: number;
  plotWidth: number;
  width: number;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const opacity = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** Viewport-pinned stroke fade, matching web Line's default edge treatment. */
export function NativeStrokeGradient({
  children,
  color,
  fadeEdges = true,
  plotLeft,
  plotWidth,
}: {
  children: (stroke: string) => ReactNode;
  color: string;
  fadeEdges?: FadeEdges;
  plotLeft: number;
  plotWidth: number;
}) {
  const id = `native-stroke-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (fadeEdges === false || color.trim().startsWith("url(")) {
    return <>{children(color)}</>;
  }
  return (
    <>
      <Defs>
        <LinearGradient
          gradientUnits="userSpaceOnUse"
          id={id}
          x1={plotLeft}
          x2={plotLeft + plotWidth}
          y1={0}
          y2={0}
        >
          <Stop
            offset="0%"
            stopColor={color}
            stopOpacity={fadeEdges === true || fadeEdges === "left" ? 0 : 1}
          />
          <Stop offset="15%" stopColor={color} stopOpacity={1} />
          <Stop offset="85%" stopColor={color} stopOpacity={1} />
          <Stop
            offset="100%"
            stopColor={color}
            stopOpacity={fadeEdges === true || fadeEdges === "right" ? 0 : 1}
          />
        </LinearGradient>
      </Defs>
      {children(`url(#${id})`)}
    </>
  );
}

/** Native equivalent of web AreaGradientDefs: same gradient and 0/15/85/100 edge stops. */
export function NativeAreaFill({
  animate = true,
  animationDuration = 1100,
  animationKey,
  children,
  d,
  fadeEdges = false,
  fill,
  fillOpacity = 0.4,
  gradientSpan = 1,
  gradientToOpacity = 0,
  height,
  plotLeft,
  plotWidth,
  width,
}: NativeAreaFillProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `native-area-${id}`;
  const edgeId = `native-area-edge-${id}`;
  const maskId = `native-area-mask-${id}`;
  const clipId = `native-area-clip-${id}`;
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(animate && !reducedMotion ? 0 : 1);
  const duration = Number.isFinite(animationDuration)
    ? Math.max(0, animationDuration)
    : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey and d restart the reveal when replay or geometry changes.
  useEffect(() => {
    if (!animate || reducedMotion || duration === 0) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [animate, animationKey, d, duration, progress, reducedMotion]);
  const clipProps = useAnimatedProps(() => ({
    width: Math.max(0, plotWidth) * progress.value,
  }));
  const span = Math.max(0.01, opacity(gradientSpan, 1));
  const pattern = fill.trim().startsWith("url(");
  const fadeLeft = fadeEdges === true || fadeEdges === "left";
  const fadeRight = fadeEdges === true || fadeEdges === "right";
  const fade = (fadeLeft || fadeRight) && !pattern;

  return (
    <>
      <Defs>
        {!pattern && (
          <LinearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <Stop
              offset="0%"
              stopColor={fill}
              stopOpacity={opacity(fillOpacity, 0.4)}
            />
            <Stop
              offset={`${span * 100}%`}
              stopColor={fill}
              stopOpacity={opacity(gradientToOpacity, 0)}
            />
            <Stop
              offset="100%"
              stopColor={fill}
              stopOpacity={opacity(gradientToOpacity, 0)}
            />
          </LinearGradient>
        )}
        <ClipPath id={clipId}>
          <AnimatedRect
            animatedProps={clipProps}
            height={height}
            x={plotLeft}
            y={0}
          />
        </ClipPath>
        {fade && (
          <>
            <LinearGradient
              gradientUnits="userSpaceOnUse"
              id={edgeId}
              x1={plotLeft}
              x2={plotLeft + plotWidth}
              y1={0}
              y2={0}
            >
              <Stop
                offset="0%"
                stopColor="white"
                stopOpacity={fadeLeft ? 0 : 1}
              />
              <Stop offset="15%" stopColor="white" stopOpacity={1} />
              <Stop offset="85%" stopColor="white" stopOpacity={1} />
              <Stop
                offset="100%"
                stopColor="white"
                stopOpacity={fadeRight ? 0 : 1}
              />
            </LinearGradient>
            <Mask
              height={height}
              id={maskId}
              maskUnits="userSpaceOnUse"
              width={width}
              x={0}
              y={0}
            >
              <Rect
                fill={`url(#${edgeId})`}
                height={height}
                width={width}
                x={0}
                y={0}
              />
            </Mask>
          </>
        )}
      </Defs>
      <G mask={fade ? `url(#${maskId})` : undefined}>
        <G clipPath={`url(#${clipId})`}>
          <Path d={d} fill={pattern ? fill : `url(#${gradientId})`} />
        </G>
        {children}
      </G>
    </>
  );
}
