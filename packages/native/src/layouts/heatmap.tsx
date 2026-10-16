import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  Platform,
  type StyleProp,
  StyleSheet,
  Text,
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
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { useChartTheme } from "../theme";
import {
  addHeatmapColumnSeparators,
  createHeatmapGeometry,
  filterHeatmapColumns,
  type HeatmapBin,
  type HeatmapColumn,
  type HeatmapGeometry,
  type HeatmapMargin,
  type HeatmapWeekStartDay,
  heatmapColumnSeparatorOffset,
  heatmapContributionLevel,
} from "./heatmap-geometry";

export type {
  HeatmapBin,
  HeatmapCellGeometry,
  HeatmapColumn,
  HeatmapGeometry,
  HeatmapMargin,
  HeatmapWeekStartDay,
} from "./heatmap-geometry";
export type HeatmapLevelColors = readonly [
  string,
  string,
  string,
  string,
  string,
];
export type HeatmapStatus = "ready" | "loading" | "error";

export interface HeatmapChartProps {
  data: HeatmapColumn[];
  xDomain?: [Date, Date];
  sizingColumnCount?: number;
  layout?: "fluid" | "fill";
  margin?: Partial<HeatmapMargin>;
  binSize?: number;
  gap?: number;
  colorScale?: (count: number | null | undefined) => string;
  levelColors?: HeatmapLevelColors;
  aspectRatio?: string;
  style?: StyleProp<ViewStyle>;
  status?: HeatmapStatus;
  loadingLabel?: string;
  animate?: boolean;
  animationDuration?: number;
  animationKey?: string | number;
  weekStartDay?: HeatmapWeekStartDay;
  columnSeparators?: { every?: number; spacing?: number };
  height?: number;
  accessibilityLabel?: string;
  onSelectBin?: (bin: HeatmapBin, column: number, row: number) => void;
  children?: ReactNode;
}

interface SelectedHeatmapCell {
  bin: HeatmapBin;
  column: number;
  row: number;
  x: number;
  y: number;
}

interface HeatmapContextValue {
  data: HeatmapColumn[];
  geometry: HeatmapGeometry;
  selected: SelectedHeatmapCell | null;
  setSelected: (cell: SelectedHeatmapCell | null) => void;
  colorScale: (count: number | null | undefined) => string;
  gridColor: string;
  textColor: string;
  width: number;
  weekStartDay: HeatmapWeekStartDay;
  margin: HeatmapMargin;
  columnSeparators?: { every?: number; spacing?: number };
  onSelectBin?: HeatmapChartProps["onSelectBin"];
}

const HeatmapContext = createContext<HeatmapContextValue | null>(null);

function useHeatmap(): HeatmapContextValue {
  const context = useContext(HeatmapContext);
  if (!context) {
    throw new Error("Heatmap layers must be used inside HeatmapChart.");
  }
  return context;
}

function flattenLayerChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== Fragment) {
      return [child];
    }
    return flattenLayerChildren(
      (child.props as { children?: ReactNode }).children
    );
  });
}

function isLegendLayer(child: ReactNode): boolean {
  return isValidElement(child) && child.type === HeatmapLegend;
}

function parseAspectRatio(ratio?: string): number | undefined {
  if (!ratio) {
    return undefined;
  }
  const [width, height] = ratio.split("/").map((part) => Number(part.trim()));
  return width && height ? width / height : undefined;
}

export function HeatmapChart({
  data,
  xDomain,
  sizingColumnCount,
  layout = "fluid",
  margin,
  binSize = 0,
  gap = 2,
  colorScale,
  levelColors,
  aspectRatio,
  style,
  status = "ready",
  loadingLabel = "Loading chart",
  animate = true,
  animationDuration = 480,
  animationKey,
  weekStartDay = 0,
  height = 160,
  accessibilityLabel = "Activity heatmap",
  columnSeparators,
  onSelectBin,
  children,
}: HeatmapChartProps) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<SelectedHeatmapCell | null>(null);
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const opacityStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const columns = useMemo(
    () => filterHeatmapColumns(data, xDomain),
    [data, xDomain]
  );
  const resolvedMargin = useMemo<HeatmapMargin>(
    () => ({
      top: margin?.top ?? 28,
      right: margin?.right ?? 16,
      bottom: margin?.bottom ?? 0,
      left: margin?.left ?? 40,
    }),
    [margin]
  );
  const cellCount = sizingColumnCount ?? columns.length;
  const geometry = useMemo(() => {
    const base = createHeatmapGeometry(columns, width, {
      binSize,
      fixedHeight: height,
      gap,
      layout,
      margin: resolvedMargin,
      sizingColumnCount: cellCount,
      weekStartDay,
    });
    return addHeatmapColumnSeparators(
      base,
      columns.length,
      columnSeparators?.every,
      columnSeparators?.spacing
    );
  }, [
    binSize,
    cellCount,
    columnSeparators,
    columns,
    gap,
    height,
    layout,
    resolvedMargin,
    weekStartDay,
    width,
  ]);
  const colors = levelColors ?? theme.scaleColors;
  const resolvedColorScale =
    colorScale ??
    ((count: number | null | undefined) =>
      colors[heatmapContributionLevel(count)] ?? colors[0]);
  const context = useMemo<HeatmapContextValue>(
    () => ({
      data: columns,
      geometry,
      selected,
      setSelected,
      colorScale: resolvedColorScale,
      gridColor: theme.gridColor,
      textColor: theme.textColor,
      width: geometry.width,
      weekStartDay,
      margin: resolvedMargin,
      columnSeparators,
      onSelectBin,
    }),
    [
      columns,
      geometry,
      onSelectBin,
      resolvedColorScale,
      resolvedMargin,
      selected,
      theme.gridColor,
      theme.textColor,
      columnSeparators,
      weekStartDay,
    ]
  );
  const suppliedLayers = flattenLayerChildren(children);
  const hasSuppliedLayers = suppliedLayers.length > 0;
  const chartLayers = hasSuppliedLayers
    ? suppliedLayers.filter((child) => !isLegendLayer(child))
    : [
        <HeatmapCells key="cells" />,
        <HeatmapXAxis key="x-axis" />,
        <HeatmapYAxis key="y-axis" />,
        <HeatmapTooltip key="tooltip" />,
      ];
  const legendLayers = hasSuppliedLayers
    ? suppliedLayers.filter(isLegendLayer)
    : [<HeatmapLegend key="legend" />];
  const aspect = parseAspectRatio(aspectRatio);
  const viewHeight =
    layout === "fluid" ? geometry.height : Math.max(height, geometry.height);

  // animationKey is the public replay trigger for entering heatmap data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: animationKey restarts the enter animation.
  useEffect(() => {
    const shouldAnimate = animate && !reduceMotion;
    if (!shouldAnimate) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withTiming(1, {
      duration: Math.max(0, animationDuration),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [animate, animationDuration, animationKey, enter, reduceMotion]);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  let statusLabel: string | undefined;
  if (status === "loading") {
    statusLabel = loadingLabel;
  } else if (status === "error") {
    statusLabel = "Chart data could not be loaded";
  }
  const selectedLabel = selected
    ? `${selected.bin.date.toLocaleDateString()}, ${selected.bin.count} contributions`
    : undefined;

  return (
    <HeatmapContext.Provider value={context}>
      <View style={styles.container}>
        <Animated.View
          accessibilityLabel={
            selectedLabel
              ? `${accessibilityLabel}. ${selectedLabel}`
              : accessibilityLabel
          }
          accessibilityRole="image"
          accessible
          onLayout={onLayout}
          style={[
            styles.root,
            aspect
              ? { aspectRatio: aspect }
              : { height: Math.max(1, viewHeight) },
            style,
            opacityStyle,
          ]}
        >
          {width > 0 && geometry.width > 0 && (
            <Svg
              fontFamily={
                Platform.OS === "web" ? "system-ui, sans-serif" : undefined
              }
              height={aspect ? "100%" : viewHeight}
              viewBox={`0 0 ${geometry.width} ${viewHeight}`}
              width="100%"
            >
              {chartLayers}
            </Svg>
          )}
          {statusLabel && (
            <View pointerEvents="none" style={styles.status}>
              <Animated.Text
                style={[styles.statusText, { color: theme.textColor }]}
              >
                {statusLabel}
              </Animated.Text>
            </View>
          )}
        </Animated.View>
        {legendLayers}
      </View>
    </HeatmapContext.Provider>
  );
}

export interface HeatmapCellsProps {
  cornerRadius?: number;
  colorScale?: (count: number | null | undefined) => string;
  interactive?: boolean;
  selectedStroke?: string;
}

export function HeatmapCells({
  cornerRadius = 2,
  colorScale,
  interactive = true,
  selectedStroke,
}: HeatmapCellsProps) {
  const {
    geometry,
    selected,
    setSelected,
    colorScale: chartColorScale,
    gridColor,
    onSelectBin,
  } = useHeatmap();
  const resolvedColorScale = colorScale ?? chartColorScale;
  return (
    <G>
      {geometry.cells.map((cell) => {
        const active =
          selected?.column === cell.column && selected.row === cell.row;
        const label = `${cell.bin.date.toLocaleDateString()}, ${cell.bin.count} contributions`;
        return (
          <Rect
            accessibilityLabel={label}
            accessible={interactive}
            fill={resolvedColorScale(cell.bin.count)}
            height={cell.height}
            key={`${cell.column}:${cell.row}:${cell.bin.date.getTime()}`}
            onPress={
              interactive
                ? () => {
                    const next = active ? null : { ...cell };
                    setSelected(next);
                    if (next) {
                      onSelectBin?.(cell.bin, cell.column, cell.row);
                    }
                  }
                : undefined
            }
            rx={cornerRadius}
            stroke={active ? (selectedStroke ?? gridColor) : "none"}
            strokeWidth={active ? 2 : 0}
            width={cell.width}
            x={cell.x}
            y={cell.y}
          />
        );
      })}
    </G>
  );
}

export interface HeatmapXAxisProps {
  className?: string;
  fontSize?: number;
  color?: string;
}
export function HeatmapXAxis({ fontSize = 10, color }: HeatmapXAxisProps) {
  const { data, geometry, margin, textColor, columnSeparators } = useHeatmap();
  const monthFormat = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "short" }),
    []
  );
  let previous = "";
  const labels = data.flatMap((column, index) => {
    const date = column.bins[0]?.date;
    if (!date) {
      return [];
    }
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (key === previous) {
      return [];
    }
    previous = key;
    return [
      {
        label: monthFormat.format(date),
        x:
          margin.left +
          index * (geometry.cellSize || 0) +
          heatmapColumnSeparatorOffset(
            index,
            columnSeparators?.every,
            columnSeparators?.spacing
          ),
      },
    ];
  });
  return (
    <G>
      {labels.map((tick) => (
        <SvgText
          fill={color ?? textColor}
          fontSize={fontSize}
          key={`${tick.label}:${tick.x}`}
          x={tick.x}
          y={14}
        >
          {tick.label}
        </SvgText>
      ))}
    </G>
  );
}

export interface HeatmapYAxisProps {
  className?: string;
  tickFilter?: "all" | "odd" | "even";
  labelFormat?: "full" | "initial";
  color?: string;
  fontSize?: number;
}

export function HeatmapYAxis({
  tickFilter = "odd",
  labelFormat = "full",
  color,
  fontSize = 9,
}: HeatmapYAxisProps) {
  const { geometry, margin, textColor, weekStartDay } = useHeatmap();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const labels = Array.from({ length: 7 }, (_, row) => ({
    row,
    label: weekdays[(row + weekStartDay) % 7] ?? "",
  })).filter(
    ({ row }) =>
      tickFilter === "all" ||
      (tickFilter === "odd" ? row % 2 === 1 : row % 2 === 0)
  );
  return (
    <G>
      {labels.map(({ row, label }) => {
        const shown = labelFormat === "initial" ? label.slice(0, 1) : label;
        return (
          <SvgText
            fill={color ?? textColor}
            fontSize={fontSize}
            key={row}
            textAnchor="end"
            x={Math.max(5, margin.left - 6)}
            y={
              margin.top +
              row * geometry.cellSize +
              Math.max(0, geometry.cellSize - 2) / 2
            }
          >
            {shown}
          </SvgText>
        );
      })}
    </G>
  );
}

export interface HeatmapTooltipProps {
  formatLabel?: (count: number, date: Date) => string;
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
}

export function HeatmapTooltip({
  formatLabel = (count) =>
    `${count} ${count === 1 ? "contribution" : "contributions"}`,
  backgroundColor,
  color,
  fontSize = 10,
}: HeatmapTooltipProps) {
  const { selected, width, geometry } = useHeatmap();
  if (!selected) {
    return null;
  }
  const label = formatLabel(selected.bin.count, selected.bin.date);
  const x = Math.min(Math.max(4, selected.x - 12), Math.max(4, width - 110));
  const y =
    selected.y > 40 ? selected.y - 30 : selected.y + geometry.cellSize + 10;
  return (
    <G pointerEvents="none">
      <Rect
        fill={backgroundColor ?? "#17202c"}
        height={22}
        rx={5}
        width={108}
        x={x}
        y={y - 15}
      />
      <SvgText
        fill={color ?? "#ffffff"}
        fontSize={fontSize}
        x={x + 7}
        y={y}
      >{`${selected.bin.date.toLocaleDateString()} · ${label}`}</SvgText>
    </G>
  );
}

export interface HeatmapLegendProps {
  lessLabel?: string;
  moreLabel?: string;
  cellSize?: number;
  gap?: number;
  colorScale?: (count: number | null | undefined) => string;
  color?: string;
  fontSize?: number;
}

export function HeatmapLegend({
  lessLabel = "Less",
  moreLabel = "More",
  cellSize = 9,
  gap = 2,
  colorScale,
  color,
  fontSize = 9,
}: HeatmapLegendProps) {
  const { colorScale: chartColorScale, textColor } = useHeatmap();
  const resolved = colorScale ?? chartColorScale;
  return (
    <View
      accessibilityLabel={`${lessLabel}, five contribution intensity levels, ${moreLabel}`}
      accessibilityRole="image"
      accessible
      style={styles.legend}
    >
      <Text
        style={{
          color: color ?? textColor,
          flexShrink: 1,
          fontSize,
          maxWidth: "100%",
        }}
      >
        {lessLabel}
      </Text>
      <View style={{ flexDirection: "row", flexShrink: 0, gap }}>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={{
              backgroundColor: resolved(level),
              borderRadius: 2,
              height: cellSize,
              width: cellSize,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          color: color ?? textColor,
          flexShrink: 1,
          fontSize,
          maxWidth: "100%",
        }}
      >
        {moreLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: "stretch", width: "100%" },
  legend: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
    marginTop: 8,
    maxWidth: "100%",
    paddingHorizontal: 4,
  },
  root: {
    alignSelf: "stretch",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  status: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  statusText: { fontSize: 13, fontWeight: "500" },
});
