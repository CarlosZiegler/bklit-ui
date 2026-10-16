import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  Pressable,
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
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { useChartTheme } from "../theme";
import {
  buildSunburstArcs,
  type SunburstArc,
  type SunburstArcGeometry,
  type SunburstFocus,
  type SunburstNode,
  sunburstArcPath,
  sunburstHoverGeometryFor,
  sunburstHoverPadding,
  sunburstLabelRotation,
  sunburstRingOptions,
} from "./sunburst-geometry";

export type {
  SunburstArc,
  SunburstArcGeometry,
  SunburstFocus,
  SunburstNode,
} from "./sunburst-geometry";

export interface SunburstHintContext {
  hintText: string;
  hoveredArc: SunburstArc | null;
  focus: SunburstFocus;
}
export interface SunburstChartProps {
  data: SunburstNode;
  size?: number;
  playKey?: number;
  focusId?: string;
  onFocusChange?: (focusId: string) => void;
  style?: StyleProp<ViewStyle>;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  hoverPop?: number;
  padding?: number;
  animationDuration?: number;
  animate?: boolean;
  children?: ReactNode;
}

interface SunburstContextValue {
  data: SunburstNode;
  arcs: SunburstArc[];
  focusById: Map<string, SunburstFocus>;
  rootId: string;
  maxDepth: number;
  focus: SunburstFocus;
  radius: number;
  size: number;
  hoveredArc: SunburstArc | null;
  selectedArc: SunburstArc | null;
  setHoveredIndex: (index: number | null) => void;
  setSelectedIndex: (index: number | null) => void;
  setFocus: (id: string) => void;
  getArcGeometry: (arc: SunburstArc) => SunburstArcGeometry | null;
  getColor: (arc: SunburstArc) => string;
  textColor: string;
  ringColor: string;
}

const SunburstContext = createContext<SunburstContextValue | null>(null);
function useSunburst() {
  const context = useContext(SunburstContext);
  if (!context) {
    throw new Error("Sunburst layers must be used inside SunburstChart.");
  }
  return context;
}

function isViewLayer(child: ReactNode): boolean {
  if (!isValidElement(child)) {
    return false;
  }
  return child.type === SunburstBreadcrumb || child.type === SunburstHint;
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

export function SunburstChart({
  data,
  size = 520,
  playKey = 0,
  focusId: controlledFocusId,
  onFocusChange,
  style,
  hoveredIndex: controlledHoveredIndex,
  onHoverChange,
  hoverPop = 8,
  padding,
  animationDuration = 650,
  animate = true,
  children,
}: SunburstChartProps) {
  const theme = useChartTheme();
  const layout = useMemo(() => buildSunburstArcs(data), [data]);
  const [width, setWidth] = useState(0);
  const [internalFocusId, setInternalFocusId] = useState(layout.rootId);
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<
    number | null
  >(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const focusId = controlledFocusId ?? internalFocusId;
  const focus = layout.focusById.get(focusId) ??
    layout.focusById.get(layout.rootId) ?? {
      id: layout.rootId,
      name: data.name,
      depth: 0,
      parentId: null,
      categoryIndex: 0,
      a0: -Math.PI / 2,
      a1: Math.PI * 1.5,
    };
  const hoveredIndex =
    controlledHoveredIndex === undefined
      ? internalHoveredIndex
      : controlledHoveredIndex;
  const hoveredArc =
    hoveredIndex == null ? null : (layout.arcs[hoveredIndex] ?? null);
  const selectedArc =
    selectedIndex == null ? null : (layout.arcs[selectedIndex] ?? null);
  const diameter = Math.min(Math.max(1, width), Math.max(1, size));
  const radius = Math.max(
    8,
    diameter / 2 -
      (padding ?? sunburstHoverPadding(layout.maxDepth, size, hoverPop))
  );
  const reduceMotion = useReducedMotion();
  const reveal = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const opacityStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const setHoveredIndex = useCallback(
    (index: number | null) => {
      if (controlledHoveredIndex === undefined) {
        setInternalHoveredIndex(index);
      }
      onHoverChange?.(index);
    },
    [controlledHoveredIndex, onHoverChange]
  );
  const setFocus = useCallback(
    (id: string) => {
      if (!layout.focusById.has(id)) {
        return;
      }
      if (controlledFocusId === undefined) {
        setInternalFocusId(id);
      }
      onFocusChange?.(id);
    },
    [controlledFocusId, layout.focusById, onFocusChange]
  );
  const getArcGeometry = useCallback(
    (arc: SunburstArc) =>
      sunburstHoverGeometryFor(
        arc,
        focus,
        hoveredArc,
        layout.maxDepth,
        radius,
        hoverPop
      ),
    [focus, hoverPop, hoveredArc, layout.maxDepth, radius]
  );
  const getColor = useCallback(
    (arc: SunburstArc) =>
      arc.color ??
      theme.seriesColors[arc.categoryIndex % theme.seriesColors.length] ??
      theme.color,
    [theme.color, theme.seriesColors]
  );
  const context = useMemo<SunburstContextValue>(
    () => ({
      data,
      arcs: layout.arcs,
      focusById: layout.focusById,
      rootId: layout.rootId,
      maxDepth: layout.maxDepth,
      focus,
      radius,
      size: diameter,
      hoveredArc,
      selectedArc,
      setHoveredIndex,
      setSelectedIndex,
      setFocus,
      getArcGeometry,
      getColor,
      textColor: theme.textColor,
      ringColor: theme.surfaceColor,
    }),
    [
      data,
      diameter,
      focus,
      hoveredArc,
      layout.arcs,
      layout.focusById,
      layout.maxDepth,
      layout.rootId,
      radius,
      selectedArc,
      theme,
      getArcGeometry,
      getColor,
      setFocus,
      setHoveredIndex,
    ]
  );
  const suppliedLayers = flattenLayerChildren(children);
  const svgChildren = suppliedLayers.length
    ? suppliedLayers.filter((child) => !isViewLayer(child))
    : [
        <SunburstSegment key="segments" />,
        <SunburstLabels key="labels" />,
        <SunburstCenter key="center" />,
      ];
  const viewChildren = suppliedLayers.length
    ? suppliedLayers.filter(isViewLayer)
    : [<SunburstBreadcrumb key="breadcrumb" />, <SunburstHint key="hint" />];

  // Recreate the native entry fade when the caller bumps playKey or replaces data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: playKey and hierarchy changes are replay triggers.
  useEffect(() => {
    if (!animate || reduceMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = 0;
    reveal.value = withTiming(1, {
      duration: Math.max(0, animationDuration),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [animate, animationDuration, layout.arcs, playKey, reduceMotion, reveal]);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const content = (
    <View style={styles.frame}>
      <Svg
        height="100%"
        viewBox={`${-diameter / 2} ${-diameter / 2} ${diameter} ${diameter}`}
        width="100%"
      >
        {svgChildren}
      </Svg>
    </View>
  );

  return (
    <SunburstContext.Provider value={context}>
      <Animated.View
        accessibilityLabel={`${data.name} sunburst, focused on ${focus.name}`}
        accessibilityRole="image"
        accessible
        onLayout={onLayout}
        style={[styles.root, { maxWidth: size }, style, opacityStyle]}
      >
        {content}
      </Animated.View>
      {viewChildren}
    </SunburstContext.Provider>
  );
}

export interface SunburstSegmentProps {
  index?: number;
  color?: string;
  fill?: string;
  fillOpacity?: number;
}
export function SunburstSegment({
  index,
  color,
  fill,
  fillOpacity = 1,
}: SunburstSegmentProps) {
  const {
    arcs,
    getArcGeometry,
    getColor,
    hoveredArc,
    selectedArc,
    setHoveredIndex,
    setSelectedIndex,
    setFocus,
    ringColor,
  } = useSunburst();
  const visibleArcs =
    index == null
      ? arcs
      : [arcs[index]].filter((arc): arc is SunburstArc => Boolean(arc));
  return (
    <G>
      {visibleArcs.map((arc) => {
        const geometry = getArcGeometry(arc);
        if (
          !geometry ||
          geometry.a1 - geometry.a0 < 0.001 ||
          geometry.outerR - geometry.innerR < 0.5
        ) {
          return null;
        }
        const active =
          hoveredArc?.arcIndex === arc.arcIndex ||
          selectedArc?.arcIndex === arc.arcIndex;
        const related =
          !(hoveredArc || selectedArc) ||
          active ||
          (hoveredArc?.id.startsWith(`${arc.id} / `) ?? false) ||
          (selectedArc?.id.startsWith(`${arc.id} / `) ?? false) ||
          (arc.id.startsWith(`${hoveredArc?.id} / `) ?? false) ||
          (arc.id.startsWith(`${selectedArc?.id} / `) ?? false);
        return (
          <Path
            accessibilityLabel={`${arc.trail.join(", ")}, ${arc.value}`}
            accessible
            d={sunburstArcPath(geometry)}
            fill={fill ?? arc.fill ?? color ?? getColor(arc)}
            fillOpacity={fillOpacity * (related ? 1 : 0.3)}
            key={arc.id}
            onPress={() => {
              setHoveredIndex(arc.arcIndex);
              setSelectedIndex(arc.arcIndex);
              if (arc.hasChildren) {
                setFocus(arc.id);
              }
            }}
            stroke={ringColor}
            strokeWidth={1}
          />
        );
      })}
    </G>
  );
}

export interface SunburstLabelsProps {
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}
export function SunburstLabels({
  fontSize = 11,
  fill,
  stroke,
  strokeWidth = 2,
}: SunburstLabelsProps) {
  const { arcs, getArcGeometry, textColor, ringColor } = useSunburst();
  return (
    <G pointerEvents="none">
      {arcs.map((arc) => {
        const geometry = getArcGeometry(arc);
        if (
          !geometry ||
          (geometry.a1 - geometry.a0) *
            ((geometry.innerR + geometry.outerR) / 2) <
            26 ||
          geometry.outerR - geometry.innerR < 16
        ) {
          return null;
        }
        const angle = (geometry.a0 + geometry.a1) / 2;
        const radius = (geometry.innerR + geometry.outerR) / 2;
        const x = Math.sin(angle) * radius;
        const y = -Math.cos(angle) * radius;
        const rotation = sunburstLabelRotation(angle);
        const outlineColor = stroke ?? ringColor;
        return (
          <G key={`label:${arc.id}`}>
            {strokeWidth > 0 && (
              <SvgText
                fill={outlineColor}
                fontSize={fontSize}
                fontWeight="600"
                origin={`${x}, ${y}`}
                rotation={rotation}
                stroke={outlineColor}
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
                textAnchor="middle"
                x={x}
                y={y + fontSize * 0.35}
              >
                {arc.name}
              </SvgText>
            )}
            <SvgText
              fill={fill ?? textColor}
              fontSize={fontSize}
              fontWeight="600"
              origin={`${x}, ${y}`}
              rotation={rotation}
              stroke="none"
              strokeWidth={0}
              textAnchor="middle"
              x={x}
              y={y + fontSize * 0.35}
            >
              {arc.name}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

export interface SunburstCenterProps {
  fill?: string;
  labelColor?: string;
}
export function SunburstCenter({ fill, labelColor }: SunburstCenterProps) {
  const { focus, maxDepth, radius, focusById, setFocus, textColor, ringColor } =
    useSunburst();
  const centerR = sunburstRingOptions(focus.depth, maxDepth, radius).centerR;
  const parentId = focus.parentId;
  if (centerR <= 1 || !parentId) {
    return null;
  }
  return (
    <G>
      <Circle
        accessibilityLabel={`Back to ${focusById.get(parentId)?.name ?? "parent"}`}
        accessible
        cx={0}
        cy={0}
        fill={fill ?? ringColor}
        onPress={() => setFocus(parentId)}
        r={centerR - 1}
        stroke={fill ?? ringColor}
        strokeWidth={1}
      />
      <SvgText
        fill={labelColor ?? textColor}
        fontSize={11}
        fontWeight="600"
        pointerEvents="none"
        textAnchor="middle"
        x={0}
        y={-2}
      >
        {focus.name}
      </SvgText>
      <SvgText
        fill={labelColor ?? textColor}
        fontSize={9}
        opacity={0.8}
        pointerEvents="none"
        textAnchor="middle"
        x={0}
        y={13}
      >
        Tap center to go back
      </SvgText>
    </G>
  );
}

export interface SunburstBreadcrumbItem {
  id: string;
  label: string;
  isCurrent: boolean;
}
export interface SunburstBreadcrumbProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}
export function SunburstBreadcrumb({
  style,
  children,
}: SunburstBreadcrumbProps) {
  const {
    data,
    focus,
    focusById,
    rootId,
    setFocus,
    textColor,
    selectedArc,
    hoveredArc,
  } = useSunburst();
  const crumbs: SunburstFocus[] = [];
  let current: SunburstFocus | undefined = focus;
  while (current) {
    crumbs.unshift(current);
    current = current.parentId ? focusById.get(current.parentId) : undefined;
  }
  return (
    <View
      accessibilityLabel="Drill-down path"
      style={[styles.breadcrumb, style]}
    >
      {children ??
        crumbs.map((crumb, index) => (
          <View key={crumb.id} style={styles.crumbWrap}>
            {index > 0 && (
              <Text style={[styles.crumbDivider, { color: textColor }]}>›</Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={index === crumbs.length - 1}
              onPress={() => setFocus(crumb.id)}
              style={styles.crumbPressable}
            >
              <Text
                style={[
                  styles.crumb,
                  {
                    color: textColor,
                    opacity: index === crumbs.length - 1 ? 1 : 0.68,
                  },
                ]}
              >
                {crumb.id === rootId ? data.name : crumb.name}
              </Text>
            </Pressable>
          </View>
        ))}
      {(hoveredArc ?? selectedArc) && (
        <Text style={[styles.crumbDetail, { color: textColor }]}>
          {(hoveredArc ?? selectedArc)?.trail.join(" · ")}
        </Text>
      )}
    </View>
  );
}

export interface SunburstHintProps {
  style?: StyleProp<TextStyle>;
  children?: ReactNode | ((context: SunburstHintContext) => ReactNode);
}
export function SunburstHint({ style, children }: SunburstHintProps) {
  const { focus, hoveredArc, textColor } = useSunburst();
  let hintText = "Tap a segment to explore";
  if (hoveredArc) {
    hintText = hoveredArc.trail.join("  ›  ");
  } else if (focus.depth > 0) {
    hintText = "Tap the center to go back";
  }
  const content =
    typeof children === "function"
      ? children({ hintText, hoveredArc, focus })
      : (children ?? hintText);
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.hint, { color: textColor }, style]}
    >
      {content}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "center", aspectRatio: 1, width: "100%" },
  frame: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: "100%",
  },
  breadcrumb: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 8,
  },
  crumbWrap: { alignItems: "center", flexDirection: "row", gap: 4 },
  crumbPressable: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  crumb: { fontSize: 12, fontWeight: "600" },
  crumbDivider: { fontSize: 15 },
  crumbDetail: { fontSize: 11, marginLeft: 6 },
  hint: {
    fontSize: 12,
    minHeight: 20,
    paddingHorizontal: 8,
    textAlign: "center",
  },
});
