import {
  Children,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
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
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg";
import { useChartTheme } from "../theme";
import {
  createSankeyLayout,
  type LaidOutSankeyGraph,
  type SankeyData,
  type SankeyLinkDatum,
  type SankeyNodeDatum,
  sankeyLinkPath,
} from "./sankey-geometry";

export type {
  SankeyData,
  SankeyLinkDatum,
  SankeyNodeDatum,
} from "./sankey-geometry";

export interface SankeyMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface SankeyTooltipData {
  type: "node" | "link";
  nodeIndex?: number;
  linkIndex?: number;
  x: number;
  y: number;
  data: SankeyNodeDatum | SankeyLinkDatum;
}

export interface SankeyChartProps {
  data: SankeyData;
  margin?: Partial<SankeyMargin>;
  animationDuration?: number;
  revealSignature?: string;
  aspectRatio?: string;
  nodeWidth?: number;
  nodePadding?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  hoveredNodeIndex?: number | null;
  onNodeHoverChange?: (index: number | null) => void;
  onNodeSelect?: (node: SankeyNodeDatum, index: number) => void;
  onLinkSelect?: (link: SankeyLinkDatum, index: number) => void;
  accessibilityLabel?: string;
  animate?: boolean;
}

interface SankeyContextValue {
  graph: LaidOutSankeyGraph;
  innerWidth: number;
  innerHeight: number;
  width: number;
  height: number;
  margin: SankeyMargin;
  selected: SankeyTooltipData | null;
  setSelected: (value: SankeyTooltipData | null) => void;
  hoveredNodeIndex: number | null;
  setHoveredNodeIndex: (index: number | null) => void;
  onNodeSelect?: SankeyChartProps["onNodeSelect"];
  onLinkSelect?: SankeyChartProps["onLinkSelect"];
  textColor: string;
  nodeColor: (index: number) => string;
}

const SankeyContext = createContext<SankeyContextValue | null>(null);
function useSankey() {
  const value = useContext(SankeyContext);
  if (!value) {
    throw new Error("Sankey layers must be used inside SankeyChart.");
  }
  return value;
}

function compact(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function aspectValue(ratio: string): number {
  const [a, b] = ratio.split("/").map((part) => Number(part.trim()));
  return a && b ? a / b : 2;
}

export function SankeyChart({
  data,
  margin: marginProp,
  animationDuration = 1100,
  revealSignature,
  aspectRatio = "2 / 1",
  nodeWidth = 16,
  nodePadding = 24,
  style,
  children,
  hoveredNodeIndex: controlledHoveredIndex,
  onNodeHoverChange,
  onNodeSelect,
  onLinkSelect,
  accessibilityLabel = "Sankey flow diagram",
  animate = true,
}: SankeyChartProps) {
  const theme = useChartTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState<SankeyTooltipData | null>(null);
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<
    number | null
  >(null);
  const isControlled = controlledHoveredIndex !== undefined;
  const hoveredNodeIndex = isControlled
    ? controlledHoveredIndex
    : internalHoveredIndex;
  const setHoveredNodeIndex = useCallback(
    (index: number | null) => {
      if (!isControlled) {
        setInternalHoveredIndex(index);
      }
      onNodeHoverChange?.(index);
    },
    [isControlled, onNodeHoverChange]
  );
  const margin = useMemo<SankeyMargin>(
    () => ({
      top: marginProp?.top ?? 24,
      right: marginProp?.right ?? 56,
      bottom: marginProp?.bottom ?? 24,
      left: marginProp?.left ?? 56,
    }),
    [marginProp?.bottom, marginProp?.left, marginProp?.right, marginProp?.top]
  );
  const innerWidth = Math.max(0, size.width - margin.left - margin.right);
  const innerHeight = Math.max(0, size.height - margin.top - margin.bottom);
  const graph = useMemo(
    () =>
      createSankeyLayout(data, innerWidth, innerHeight, nodeWidth, nodePadding),
    [data, innerHeight, innerWidth, nodePadding, nodeWidth]
  );
  const progress = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const opacityStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const context = useMemo<SankeyContextValue>(
    () => ({
      graph,
      innerWidth,
      innerHeight,
      width: size.width,
      height: size.height,
      margin,
      selected,
      setSelected,
      hoveredNodeIndex,
      setHoveredNodeIndex,
      onNodeSelect,
      onLinkSelect,
      textColor: theme.textColor,
      nodeColor: (index) =>
        theme.seriesColors[index % theme.seriesColors.length] ?? theme.color,
    }),
    [
      graph,
      hoveredNodeIndex,
      innerHeight,
      innerWidth,
      margin,
      onLinkSelect,
      onNodeSelect,
      selected,
      size.height,
      size.width,
      theme,
      setHoveredNodeIndex,
    ]
  );
  const layers =
    Children.count(children) > 0 ? (
      children
    ) : (
      <>
        <SankeyLink />
        <SankeyNode />
        <SankeyTooltip />
      </>
    );

  // biome-ignore lint/correctness/useExhaustiveDependencies: revealSignature is a caller-controlled replay key.
  useEffect(() => {
    if (!animate || reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: Math.max(0, animationDuration),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [animate, animationDuration, progress, reduceMotion, revealSignature]);

  const onLayout = (event: LayoutChangeEvent) =>
    setSize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });

  return (
    <SankeyContext.Provider value={context}>
      <Animated.View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        accessible
        onLayout={onLayout}
        style={[
          styles.root,
          { aspectRatio: aspectValue(aspectRatio) },
          style,
          opacityStyle,
        ]}
      >
        {size.width > 0 &&
          size.height > 0 &&
          innerWidth > 0 &&
          innerHeight > 0 && (
            <Svg
              height="100%"
              viewBox={`0 0 ${size.width} ${size.height}`}
              width="100%"
            >
              <G x={margin.left} y={margin.top}>
                {layers}
              </G>
            </Svg>
          )}
      </Animated.View>
    </SankeyContext.Provider>
  );
}

export type SankeyLabelOrientation = "horizontal" | "vertical";
export interface SankeyNodeProps {
  fill?: string;
  lineCap?: number;
  fadedOpacity?: number;
  showLabels?: boolean;
  showValueLabels?: boolean;
  labelOrientation?: SankeyLabelOrientation;
  getNodeColor?: (
    node: LaidOutSankeyGraph["nodes"][number],
    index: number
  ) => string;
  formatValue?: (value: number) => string;
}

// Node geometry, state and labels share the same tap target and coordinates.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one node mark keeps its visual and accessible interaction in sync.
function SankeyNodeMark({
  node,
  index,
  fill,
  lineCap,
  fadedOpacity,
  showLabels,
  showValueLabels,
  labelOrientation,
  getNodeColor,
  formatValue,
}: SankeyNodeProps & {
  node: LaidOutSankeyGraph["nodes"][number];
  index: number;
}) {
  const {
    innerWidth,
    selected,
    hoveredNodeIndex,
    setSelected,
    setHoveredNodeIndex,
    onNodeSelect,
    textColor,
    nodeColor,
  } = useSankey();
  const valueFormatter = formatValue ?? compact;
  const dimOpacity = fadedOpacity ?? 0.4;
  const cornerRadius = lineCap ?? 4;
  const hasSelection = selected !== null || hoveredNodeIndex !== null;
  const active =
    (selected?.type === "node" && selected.nodeIndex === index) ||
    hoveredNodeIndex === index;
  const dim = hasSelection && !active;
  const color = fill ?? getNodeColor?.(node, index) ?? nodeColor(index);
  const labelOnLeft = ((node.x0 ?? 0) + (node.x1 ?? 0)) / 2 > innerWidth / 2;
  let labelX: number;
  let anchor: "start" | "middle" | "end";
  let rotation = 0;
  if (labelOrientation === "vertical") {
    labelX = ((node.x0 ?? 0) + (node.x1 ?? 0)) / 2;
    anchor = "middle";
    rotation = labelOnLeft ? -90 : 90;
  } else if (labelOnLeft) {
    labelX = (node.x0 ?? 0) - 10;
    anchor = "end";
  } else {
    labelX = (node.x1 ?? 0) + 10;
    anchor = "start";
  }
  const labelY = ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2;
  return (
    <G opacity={dim ? dimOpacity : 1}>
      <Rect
        accessibilityLabel={`${node.name}, ${valueFormatter(node.value ?? 0)}`}
        accessible
        fill={color}
        height={Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0))}
        onPress={() => {
          setSelected({
            type: "node",
            nodeIndex: index,
            x: (node.x0 ?? 0) + 8,
            y: labelY,
            data: node,
          });
          setHoveredNodeIndex(index);
          onNodeSelect?.(node, index);
        }}
        rx={Math.max(0, cornerRadius)}
        width={Math.max(1, (node.x1 ?? 0) - (node.x0 ?? 0))}
        x={node.x0 ?? 0}
        y={node.y0 ?? 0}
      />
      {showLabels && (
        <SvgText
          fill={textColor}
          fontSize={10}
          fontWeight="600"
          origin={`${labelX}, ${labelY}`}
          rotation={rotation}
          textAnchor={anchor}
          x={labelX}
          y={labelY - (showValueLabels ? 3 : -3)}
        >
          {node.name}
        </SvgText>
      )}
      {showValueLabels && (
        <SvgText
          fill={textColor}
          fontSize={9}
          opacity={0.8}
          textAnchor={anchor}
          x={labelX}
          y={labelY + 12}
        >
          {valueFormatter(node.value ?? 0)}
        </SvgText>
      )}
    </G>
  );
}

export function SankeyNode(props: SankeyNodeProps) {
  const { graph } = useSankey();
  return (
    <G>
      {graph.nodes.map((node, index) => (
        <SankeyNodeMark
          {...props}
          fadedOpacity={props.fadedOpacity ?? 0.4}
          fill={props.fill}
          formatValue={props.formatValue ?? compact}
          index={index}
          key={node.index ?? node.name}
          labelOrientation={props.labelOrientation ?? "horizontal"}
          lineCap={props.lineCap ?? 4}
          node={node}
          showLabels={props.showLabels ?? true}
          showValueLabels={props.showValueLabels ?? true}
        />
      ))}
    </G>
  );
}

export interface SankeyLinkProps {
  stroke?: string;
  fadedOpacity?: number;
}

export function SankeyLink({ stroke, fadedOpacity = 0.16 }: SankeyLinkProps) {
  const {
    graph,
    selected,
    hoveredNodeIndex,
    setSelected,
    onLinkSelect,
    nodeColor,
  } = useSankey();
  const activeLinkIndex = selected?.type === "link" ? selected.linkIndex : null;
  // Each link's visual stroke and touch target share one resolved D3 path.
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keep per-link hit targets and selection state together.
  const linkMarks = graph.links.map((link, index) => {
    const path = sankeyLinkPath(link);
    if (!path) {
      return null;
    }
    const sourceValue = link.source as unknown;
    const targetValue = link.target as unknown;
    const source =
      typeof sourceValue === "object" && sourceValue !== null
        ? ((sourceValue as { index?: number }).index ?? 0)
        : Number(sourceValue);
    const target =
      typeof targetValue === "object" && targetValue !== null
        ? ((targetValue as { index?: number }).index ?? 0)
        : Number(targetValue);
    const active =
      activeLinkIndex === index ||
      (hoveredNodeIndex != null &&
        (source === hoveredNodeIndex || target === hoveredNodeIndex));
    let opacity = 0.38;
    if (selected || hoveredNodeIndex != null) {
      opacity = active ? 0.7 : fadedOpacity;
    }
    const color = stroke ?? nodeColor(source);
    return (
      <G key={link.index}>
        <Path
          d={path}
          fill="none"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={Math.max(1, link.width ?? 1)}
        />
        <Path
          d={path}
          fill="none"
          onPress={() => {
            const sourceNode =
              sourceValue && typeof sourceValue === "object"
                ? (sourceValue as { x1?: number })
                : undefined;
            setSelected({
              type: "link",
              linkIndex: index,
              x: sourceNode?.x1 ?? 0,
              y: (link as unknown as { y0?: number }).y0 ?? 0,
              data: link as unknown as SankeyLinkDatum,
            });
            onLinkSelect?.(link, index);
          }}
          stroke="transparent"
          strokeWidth={Math.max(12, link.width ?? 1)}
        />
      </G>
    );
  });

  return <G>{linkMarks}</G>;
}

export interface SankeyTooltipProps {
  backgroundColor?: string;
  formatValue?: (value: number) => string;
}

export function SankeyTooltip({
  backgroundColor = "#17202c",
  formatValue = compact,
}: SankeyTooltipProps) {
  const { selected, innerWidth, textColor } = useSankey();
  if (!selected) {
    return null;
  }
  const rawValue = (selected.data as { value?: unknown }).value;
  const value = typeof rawValue === "number" ? rawValue : 0;
  const title =
    selected.type === "node"
      ? (selected.data as SankeyNodeDatum).name
      : (() => {
          const link = selected.data as unknown as {
            source: number | SankeyNodeDatum;
            target: number | SankeyNodeDatum;
          };
          const source =
            typeof link.source === "number"
              ? String(link.source)
              : link.source.name;
          const target =
            typeof link.target === "number"
              ? String(link.target)
              : link.target.name;
          return `${source} → ${target}`;
        })();
  const x = Math.min(
    Math.max(2, selected.x + 12),
    Math.max(2, innerWidth - 112)
  );
  const y = Math.min(Math.max(30, selected.y + 16), 200);
  return (
    <G pointerEvents="none">
      <Rect
        fill={backgroundColor}
        height={40}
        rx={6}
        width={112}
        x={x}
        y={y - 26}
      />
      <SvgText
        fill={textColor === "#878e92" ? "#ffffff" : textColor}
        fontSize={10}
        fontWeight="600"
        x={x + 8}
        y={y - 10}
      >
        {title}
      </SvgText>
      <SvgText
        fill={textColor === "#878e92" ? "#d8dee9" : textColor}
        fontSize={9}
        x={x + 8}
        y={y + 5}
      >{`Value ${formatValue(value)}`}</SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "stretch", overflow: "hidden", width: "100%" },
});
