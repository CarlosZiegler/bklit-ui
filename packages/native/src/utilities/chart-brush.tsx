import { useEffect, useRef } from "react";
import { type GestureResponderEvent, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { type NativeChartRange, useChart } from "../chart-context";
import {
  type BrushDragMode,
  brushDragMode,
  dragBrushPixels,
} from "./brush-drag";
import {
  domainValueToRatio,
  normalizeDomainRange,
  ratioToDomainValue,
} from "./geometry";
import {
  NativePatternDefinition,
  type PatternPresetId,
  type PatternPresetOptions,
} from "./patterns";

export interface ChartBrushSelectionPattern extends PatternPresetOptions {
  preset: PatternPresetId;
  color: string;
  opacity?: number;
}

export interface NativeBrushSelectedBoxStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface ChartBrushProps {
  onSelectionChange?: (domain: NativeChartRange | null) => void;
  /** The native chart context tracks one x-domain range, so only horizontal is supported. */
  brushDirection?: "horizontal";
  selectedBoxStyle?: NativeBrushSelectedBoxStyle;
  initialSelection?: NativeChartRange | null;
  selection?: NativeChartRange | null;
  fadeOuterEdges?: boolean;
  selectionPattern?: ChartBrushSelectionPattern;
}

export type ChartBrushSelection = NativeChartRange;

/** Declarative marker consumed by CartesianChart; native uses its context-backed overlay. */
export function ChartBrush(_props: ChartBrushProps): null {
  return null;
}

ChartBrush.displayName = "ChartBrush";

function toDisplayValue(value: Date | number): string {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(Number(value.toPrecision(5)));
}

function sameRange(
  first: NativeChartRange | null,
  second: NativeChartRange | null
): boolean {
  if (!(first && second)) {
    return first === second;
  }
  const firstStart =
    first.start instanceof Date ? first.start.getTime() : first.start;
  const firstEnd = first.end instanceof Date ? first.end.getTime() : first.end;
  const secondStart =
    second.start instanceof Date ? second.start.getTime() : second.start;
  const secondEnd =
    second.end instanceof Date ? second.end.getTime() : second.end;
  return firstStart === secondStart && firstEnd === secondEnd;
}

function rangeToPixels(
  range: NativeChartRange | null,
  xDomain: readonly [number, number] | null,
  xScale: ReturnType<typeof useChart>["xScale"],
  plotWidth: number
): [number, number] | null {
  if (!range || plotWidth <= 0) {
    return null;
  }
  const start = domainValueToRatio(range.start, xDomain, xScale);
  const end = domainValueToRatio(range.end, xDomain, xScale);
  if (start === null || end === null) {
    return null;
  }
  const left = Math.max(0, Math.min(plotWidth, start * plotWidth));
  const right = Math.max(0, Math.min(plotWidth, end * plotWidth));
  return [Math.min(left, right), Math.max(left, right)];
}

function rangeAtPixels(
  first: number,
  second: number,
  context: ReturnType<typeof useChart>
): NativeChartRange | null {
  const { data, plotWidth, xDomain, xScale } = context;
  if (!xDomain || plotWidth <= 0) {
    return null;
  }
  const low = Math.min(first, second) / plotWidth;
  const high = Math.max(first, second) / plotWidth;
  const firstValue = ratioToDomainValue(low, xDomain, xScale, data.length);
  const secondValue = ratioToDomainValue(high, xDomain, xScale, data.length);
  if (
    firstValue === null ||
    secondValue === null ||
    firstValue === secondValue
  ) {
    return null;
  }
  const ordered = normalizeDomainRange(firstValue, secondValue);
  return xScale === "time"
    ? { start: new Date(ordered.start), end: new Date(ordered.end) }
    : ordered;
}

function useBrushRange(
  props: ChartBrushProps,
  context: ReturnType<typeof useChart>
) {
  const initialized = useRef(false);
  const { initialSelection, onSelectionChange, selection } = props;
  const { plotWidth, range, setRange, xDomain, xScale } = context;

  useEffect(() => {
    if (selection !== undefined && !sameRange(selection, range)) {
      setRange(selection);
    }
  }, [range, selection, setRange]);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;
    if (selection === undefined && range === null && initialSelection) {
      setRange(initialSelection);
    }
  }, [initialSelection, range, selection, setRange]);

  const visibleRange = selection === undefined ? range : selection;
  const pixels = rangeToPixels(visibleRange, xDomain, xScale, plotWidth);
  const updateRange = (next: NativeChartRange | null) => {
    if (selection === undefined) {
      setRange(next);
    }
    onSelectionChange?.(next);
  };

  return {
    currentLabel:
      pixels && visibleRange
        ? `Selected from ${toDisplayValue(visibleRange.start)} to ${toDisplayValue(visibleRange.end)}`
        : "No range selected",
    pixels,
    updateRange,
    visibleRange,
  };
}

function BrushArtwork({
  fadeOuterEdges,
  height,
  pixelSelection,
  plotWidth,
  selectionEnd,
  selectionPattern,
  selectionStart,
  selectedBoxStyle,
  theme,
}: {
  fadeOuterEdges: boolean;
  height: number;
  pixelSelection: [number, number] | null;
  plotWidth: number;
  selectionEnd: number;
  selectionPattern?: ChartBrushSelectionPattern;
  selectionStart: number;
  selectedBoxStyle?: NativeBrushSelectedBoxStyle;
  theme: ReturnType<typeof useChart>["theme"];
}) {
  const selectionWidth = Math.max(0, selectionEnd - selectionStart);
  const leftWidth = pixelSelection ? selectionStart : 0;
  const rightStart = pixelSelection ? selectionEnd : plotWidth;
  const rightWidth = Math.max(0, plotWidth - rightStart);
  const fill = selectedBoxStyle?.fill ?? "transparent";
  const fillOpacity = Math.min(
    1,
    Math.max(0, selectedBoxStyle?.fillOpacity ?? 0)
  );
  const stroke = selectedBoxStyle?.stroke ?? theme.color;
  const strokeWidth = selectedBoxStyle?.strokeWidth ?? 1;
  const patternId = "native-chart-brush-selection-pattern";
  const leftGradientId = "native-chart-brush-left-fade";
  const rightGradientId = "native-chart-brush-right-fade";
  const renderPane = (x: number, width: number, side: "left" | "right") => {
    if (!(pixelSelection && width > 0)) {
      return null;
    }
    const gradientId = side === "left" ? leftGradientId : rightGradientId;
    return (
      <Rect
        fill={fadeOuterEdges ? `url(#${gradientId})` : theme.surfaceColor}
        fillOpacity={fadeOuterEdges ? 1 : 0.24}
        height={height}
        key={side}
        width={width}
        x={x}
        y={0}
      />
    );
  };
  const renderPattern =
    Boolean(selectionPattern && selectionPattern.preset !== "none") &&
    Boolean(pixelSelection && selectionWidth > 0);
  const renderSelection = Boolean(pixelSelection && selectionWidth > 0);

  return (
    <Svg height={height} pointerEvents="none" width={plotWidth}>
      <Defs>
        {fadeOuterEdges ? (
          <>
            <LinearGradient
              id={leftGradientId}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              <Stop
                offset="0%"
                stopColor={theme.surfaceColor}
                stopOpacity={0}
              />
              <Stop
                offset="15%"
                stopColor={theme.surfaceColor}
                stopOpacity={0.32}
              />
              <Stop
                offset="100%"
                stopColor={theme.surfaceColor}
                stopOpacity={0.32}
              />
            </LinearGradient>
            <LinearGradient
              id={rightGradientId}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              <Stop
                offset="0%"
                stopColor={theme.surfaceColor}
                stopOpacity={0.32}
              />
              <Stop
                offset="85%"
                stopColor={theme.surfaceColor}
                stopOpacity={0.32}
              />
              <Stop
                offset="100%"
                stopColor={theme.surfaceColor}
                stopOpacity={0}
              />
            </LinearGradient>
          </>
        ) : null}
        {renderPattern && selectionPattern ? (
          <NativePatternDefinition
            id={patternId}
            options={selectionPattern}
            preset={selectionPattern.preset}
          />
        ) : null}
      </Defs>
      {renderPane(0, leftWidth, "left")}
      {renderPane(rightStart, rightWidth, "right")}
      {renderPattern && selectionPattern ? (
        <Rect
          fill={`url(#${patternId})`}
          fillOpacity={selectionPattern.opacity ?? 1}
          height={height}
          width={selectionWidth}
          x={selectionStart}
          y={0}
        />
      ) : null}
      {renderSelection ? (
        <>
          <Rect
            fill={fill}
            fillOpacity={fillOpacity}
            height={height}
            stroke={stroke}
            strokeWidth={strokeWidth}
            width={selectionWidth}
            x={selectionStart}
            y={0}
          />
          {[selectionStart, selectionEnd].map((edge) => (
            <Rect
              fill={theme.color}
              height={24}
              key={edge}
              rx={2}
              width={4}
              x={edge - 2}
              y={(height - 24) / 2}
            />
          ))}
        </>
      ) : null}
    </Svg>
  );
}

function useBrushResponderHandlers({
  context,
  range,
  onUpdate,
}: {
  context: ReturnType<typeof useChart>;
  range: NativeChartRange | null;
  onUpdate: (next: NativeChartRange | null) => void;
}) {
  const gesture = useRef<{
    mode: BrushDragMode;
    pageX: number;
    pageY: number;
    selection: [number, number] | null;
    startX: number;
  } | null>(null);
  const moved = useRef(false);
  const eventX = (event: GestureResponderEvent) =>
    Math.min(context.plotWidth, Math.max(0, event.nativeEvent.locationX));
  const onTouchStart = (event: GestureResponderEvent) => {
    const selection = rangeToPixels(
      range,
      context.xDomain,
      context.xScale,
      context.plotWidth
    );
    const startX = eventX(event);
    gesture.current = {
      mode: brushDragMode(startX, selection),
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      selection,
      startX,
    };
    moved.current = false;
  };
  const onMoveShouldSetResponder = (event: GestureResponderEvent) => {
    const current = gesture.current;
    if (!current) {
      return false;
    }
    const dx = Math.abs(event.nativeEvent.pageX - current.pageX);
    const dy = Math.abs(event.nativeEvent.pageY - current.pageY);
    return dx > 6 && dx > dy * 1.15;
  };
  const updateAt = (currentX: number) => {
    const current = gesture.current;
    if (!current) {
      return;
    }
    const [start, end] = dragBrushPixels(
      current.mode,
      current.startX,
      currentX,
      current.selection,
      context.plotWidth
    );
    onUpdate(rangeAtPixels(start, end, context));
  };
  const onResponderMove = (event: GestureResponderEvent) => {
    const current = gesture.current;
    if (!current) {
      return;
    }
    const x = eventX(event);
    if (Math.abs(x - current.startX) < 2) {
      return;
    }
    moved.current = true;
    updateAt(x);
  };
  const onResponderRelease = (event: GestureResponderEvent) => {
    if (gesture.current && moved.current) {
      updateAt(eventX(event));
    }
    gesture.current = null;
    moved.current = false;
  };
  const onAccessibilityAction = (event: {
    nativeEvent: { actionName: string };
  }) => {
    if (!(range && context.xDomain)) {
      return;
    }
    const step =
      Math.abs(context.xDomain[1] - context.xDomain[0]) /
      Math.max(1, context.data.length - 1);
    const sign = event.nativeEvent.actionName === "increment" ? 1 : -1;
    const start =
      range.start instanceof Date ? range.start.getTime() : range.start;
    const end = range.end instanceof Date ? range.end.getTime() : range.end;
    const candidate = Math.min(
      context.xDomain[1],
      Math.max(start, end + sign * step)
    );
    onUpdate(
      context.xScale === "time"
        ? { start: range.start, end: new Date(candidate) }
        : { start: range.start, end: candidate }
    );
  };
  return {
    onAccessibilityAction,
    onMoveShouldSetResponder,
    onResponderMove,
    onResponderRelease,
    onResponderTerminate: () => {
      gesture.current = null;
    },
    onTouchStart,
  };
}

/**
 * Touch surface rendered above the SVG by CartesianChart when it sees a
 * ChartBrush marker. It keeps selections in the chart's real domain.
 */
export function ChartBrushOverlay({ props }: { props: ChartBrushProps }) {
  const { selectedBoxStyle, fadeOuterEdges = true, selectionPattern } = props;
  const context = useChart();
  const { margins, plotHeight, plotWidth, theme, width } = context;
  const brush = useBrushRange(props, context);
  const responderHandlers = useBrushResponderHandlers({
    context,
    range: brush.visibleRange,
    onUpdate: brush.updateRange,
  });
  const [selectionStart, selectionEnd] = brush.pixels ?? [0, 0];
  const currentLabel = brush.currentLabel;

  if (width <= 0 || plotWidth <= 0 || plotHeight <= 0) {
    return null;
  }

  return (
    <View
      accessibilityActions={[
        { name: "increment", label: "Extend selected range" },
        { name: "decrement", label: "Reduce selected range" },
      ]}
      accessibilityLabel={`Chart range selection. ${currentLabel}. Drag horizontally to choose dates or values.`}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: plotWidth,
        now: brush.pixels ? (selectionStart + selectionEnd) / 2 : 0,
        text: currentLabel,
      }}
      accessible
      onAccessibilityAction={responderHandlers.onAccessibilityAction}
      onMoveShouldSetResponder={responderHandlers.onMoveShouldSetResponder}
      onResponderMove={responderHandlers.onResponderMove}
      onResponderRelease={responderHandlers.onResponderRelease}
      onResponderTerminate={responderHandlers.onResponderTerminate}
      onStartShouldSetResponder={() => false}
      onTouchStart={responderHandlers.onTouchStart}
      style={{
        height: plotHeight,
        left: margins.left,
        position: "absolute",
        top: margins.top,
        width: plotWidth,
        zIndex: 20,
      }}
    >
      <BrushArtwork
        fadeOuterEdges={fadeOuterEdges}
        height={plotHeight}
        pixelSelection={brush.pixels}
        plotWidth={plotWidth}
        selectedBoxStyle={selectedBoxStyle}
        selectionEnd={selectionEnd}
        selectionPattern={selectionPattern}
        selectionStart={selectionStart}
        theme={theme}
      />
    </View>
  );
}
