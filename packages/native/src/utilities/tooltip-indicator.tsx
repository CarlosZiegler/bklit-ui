import { useEffect, useId } from "react";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Defs, G, Line, LinearGradient, Rect, Stop } from "react-native-svg";
import { useChart } from "../chart-context";

export type IndicatorWidth = number | "line" | "thin" | "medium" | "thick";
export type IndicatorFadeEdges = "both" | "none" | "top" | "bottom";

export interface TooltipIndicatorProps {
  x: number;
  height: number;
  visible: boolean;
  width?: IndicatorWidth;
  span?: number;
  columnWidth?: number;
  colorEdge?: string;
  colorMid?: string;
  fadeEdges?: IndicatorFadeEdges | boolean;
  fadeLength?: number;
  animate?: boolean;
  gradientId?: string;
  strokeDasharray?: string;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);

function resolveWidth(width: IndicatorWidth): number {
  if (typeof width === "number") {
    return Math.max(0, width);
  }
  switch (width) {
    case "thin":
      return 2;
    case "medium":
      return 4;
    case "thick":
      return 8;
    default:
      return 1;
  }
}

function resolveFadeSides(fade: IndicatorFadeEdges | boolean) {
  if (fade === false || fade === "none") {
    return { top: false, bottom: false };
  }
  if (fade === "top") {
    return { top: true, bottom: false };
  }
  if (fade === "bottom") {
    return { top: false, bottom: true };
  }
  return { top: true, bottom: true };
}

/** Responsive chart crosshair band with web-compatible width and fade presets. */
export function TooltipIndicator(props: TooltipIndicatorProps) {
  return props.visible ? <TooltipIndicatorVisible {...props} /> : null;
}

function TooltipIndicatorVisible({
  x,
  height,
  width = "line",
  span,
  columnWidth,
  colorEdge,
  colorMid,
  fadeEdges = "both",
  fadeLength = 10,
  animate = true,
  gradientId,
  strokeDasharray,
}: TooltipIndicatorProps) {
  const { margins, theme } = useChart();
  const reducedMotion = useReducedMotion();
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rawId = gradientId ?? `native-tooltip-indicator-${generatedId}`;
  const resolvedWidth =
    span !== undefined && columnWidth !== undefined
      ? Math.max(0, span * columnWidth)
      : resolveWidth(width);
  const resolvedColor = colorMid ?? colorEdge ?? theme.color;
  const localX = margins.left + x;
  const rectX = localX - resolvedWidth / 2;
  const lineX = localX;
  const lineY1 = margins.top;
  const indicatorHeight = Math.max(0, height);
  const rectXValue = useSharedValue(rectX);
  const lineXValue = useSharedValue(lineX);
  const rectProps = useAnimatedProps(() => ({ x: rectXValue.value }));
  const lineProps = useAnimatedProps(() => ({
    x1: lineXValue.value,
    x2: lineXValue.value,
  }));
  useEffect(() => {
    if (animate && !reducedMotion) {
      rectXValue.value = withSpring(rectX);
      lineXValue.value = withSpring(lineX);
    } else {
      rectXValue.value = rectX;
      lineXValue.value = lineX;
    }
  }, [animate, lineX, lineXValue, rectX, rectXValue, reducedMotion]);

  if (strokeDasharray) {
    return (
      <AnimatedLine
        animatedProps={lineProps}
        stroke={resolvedColor}
        strokeDasharray={strokeDasharray}
        strokeWidth={Math.max(1, resolvedWidth)}
        x1={lineX}
        x2={lineX}
        y1={lineY1}
        y2={lineY1 + indicatorHeight}
      />
    );
  }

  const sides = resolveFadeSides(fadeEdges);
  if (!(sides.top || sides.bottom)) {
    return (
      <AnimatedRect
        animatedProps={rectProps}
        fill={resolvedColor}
        height={indicatorHeight}
        width={resolvedWidth}
        x={rectX}
        y={lineY1}
      />
    );
  }

  const fade = Math.min(40, Math.max(2, fadeLength));
  let stops: { offset: string; opacity: number }[];
  if (sides.top && sides.bottom) {
    stops = [
      { offset: "0%", opacity: 0 },
      { offset: `${fade}%`, opacity: 1 },
      { offset: "50%", opacity: 1 },
      { offset: `${100 - fade}%`, opacity: 1 },
      { offset: "100%", opacity: 0 },
    ];
  } else if (sides.top) {
    stops = [
      { offset: "0%", opacity: 0 },
      { offset: `${fade}%`, opacity: 1 },
      { offset: "100%", opacity: 1 },
    ];
  } else {
    stops = [
      { offset: "0%", opacity: 1 },
      { offset: `${100 - fade}%`, opacity: 1 },
      { offset: "100%", opacity: 0 },
    ];
  }

  return (
    <G>
      <Defs>
        <LinearGradient id={rawId} x1="0%" x2="0%" y1="0%" y2="100%">
          {stops.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={resolvedColor}
              stopOpacity={stop.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>
      <AnimatedRect
        animatedProps={rectProps}
        fill={`url(#${rawId})`}
        height={indicatorHeight}
        width={resolvedWidth}
        x={rectX}
        y={lineY1}
      />
    </G>
  );
}

TooltipIndicator.displayName = "TooltipIndicator";
