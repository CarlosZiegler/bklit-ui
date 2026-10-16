import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Svg,
  Text as SvgText,
} from "react-native-svg";
import { useChart } from "../chart-context";
import {
  groupMarkersByDate,
  type MarkerFanLayout,
  type MarkerTouchTargetOffset,
  markerDate,
  markerDateKey,
  markerFanOffset,
  nearestMarkerDataIndex,
  resolveMarkerFanLayout,
  resolveMarkerTouchTargetOffset,
} from "./marker-geometry";

export interface ChartMarker {
  /** Date for this marker; markers on the same local calendar day are grouped. */
  date: Date;
  /** String/number icons become native SVG text; SVG elements are also accepted. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Native React content rendered in the tooltip in place of title/description. */
  content?: ReactNode;
  color?: string;
  onClick?: () => void;
  href?: string;
  /** Native links open through the system URL handler after a user tap. */
  target?: "_blank" | "_self";
}

export interface ChartMarkersProps {
  items: readonly ChartMarker[];
  size?: number;
  showLines?: boolean;
  animate?: boolean;
}

export interface MarkerGroupProps {
  x: number;
  y: number;
  markers: readonly ChartMarker[];
  isActive?: boolean;
  size?: number;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  lineHeight?: number;
  showLine?: boolean;
  animate?: boolean;
  /** Delay before this group enters, in seconds (matching the web utility). */
  animationDelay?: number;
  markerBackground?: string;
  markerBorder?: string;
  markerForeground?: string;
  badgeBackground?: string;
  badgeForeground?: string;
  /** Optional fitted fan position; omitted to keep standalone web-style placement. */
  fanLayout?: MarkerFanLayout;
  /** Offset applied only to the collapsed marker's transparent 44pt hit box. */
  collapsedHitOffset?: MarkerTouchTargetOffset;
  onMarkerPress?: (marker: ChartMarker) => void;
}

export interface MarkerTooltipContentProps {
  markers: readonly ChartMarker[];
}

const FAN_RADIUS = 50;
const FAN_ANGLE = 160;
const TARGET_SIZE = 44;
const MAX_TOOLTIP_MARKERS = 2;
const AnimatedG = Animated.createAnimatedComponent(G);
const SVG_ICON_TYPES = new Set<unknown>([
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Svg,
  SvgText,
]);

function iconAsText(icon: ReactNode): string | null {
  if (typeof icon === "string" || typeof icon === "number") {
    return String(icon);
  }
  return null;
}

function isNativeSvgIcon(icon: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode }>(icon)) {
    return false;
  }
  if (icon.type === Fragment) {
    return Children.toArray(icon.props.children).every(isNativeSvgIcon);
  }
  return SVG_ICON_TYPES.has(icon.type);
}

function MarkerIcon({
  icon,
  title,
  size,
  color,
}: {
  icon: ReactNode;
  title: string;
  size: number;
  color: string;
}) {
  const text = iconAsText(icon) ?? title.slice(0, 1).toUpperCase();
  const nativeSvgElement = isNativeSvgIcon(icon);
  if (nativeSvgElement) {
    return <G>{icon}</G>;
  }
  return (
    <SvgText
      fill={color}
      fontSize={size * 0.48}
      fontWeight="600"
      textAnchor="middle"
      x={0}
      y={size * 0.17}
    >
      {text}
    </SvgText>
  );
}

function markerLabel(marker: ChartMarker, date: Date): string {
  const formatted = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${marker.title}, ${formatted}`;
}

function chartDateValue(
  data: readonly object[],
  index: number,
  key: string
): unknown {
  return (data[index] as Record<string, unknown> | undefined)?.[key];
}

function pressMarker(marker: ChartMarker): void {
  if (marker.onClick) {
    marker.onClick();
  } else if (marker.href) {
    // Native apps have one system URL handler; `_blank` is kept API-compatible
    // but cannot request a browser tab in the way the web target can.
    Linking.openURL(marker.href).catch(() => undefined);
  }
}

function ExpandedFan({
  markers,
  date,
  size,
  border,
  background,
  foreground,
  onMarkerPress,
  onCollapse,
  radius,
  orientation,
}: {
  markers: readonly ChartMarker[];
  date: Date;
  size: number;
  border: string;
  background: string;
  foreground: string;
  onMarkerPress?: (marker: ChartMarker) => void;
  onCollapse: () => void;
  radius: number;
  orientation: "up" | "down";
}) {
  return (
    <>
      {markers.map((marker, index) => {
        const offset = markerFanOffset(
          index,
          markers.length,
          radius,
          FAN_ANGLE,
          orientation
        );
        return (
          <G
            key={`${marker.title}-${index}`}
            transform={`translate(${offset.x} ${offset.y})`}
          >
            <Circle
              cx={0}
              cy={0}
              fill={marker.color ?? background}
              r={size / 2}
              stroke={border}
              strokeWidth={1.5}
            />
            <MarkerIcon
              color={foreground}
              icon={marker.icon}
              size={size}
              title={marker.title}
            />
            <Rect
              accessibilityLabel={markerLabel(marker, date)}
              accessible
              fill="transparent"
              height={TARGET_SIZE}
              onPress={() => onMarkerPress?.(marker)}
              rx={TARGET_SIZE / 2}
              width={TARGET_SIZE}
              x={-TARGET_SIZE / 2}
              y={-TARGET_SIZE / 2}
            />
          </G>
        );
      })}
      <Circle cx={0} cy={0} fill={border} opacity={0.5} r={size * 0.24} />
      <Rect
        accessibilityLabel={`Close ${markers.length} markers on ${date.toLocaleDateString()}`}
        accessible
        fill="transparent"
        height={TARGET_SIZE}
        onPress={onCollapse}
        rx={TARGET_SIZE / 2}
        width={TARGET_SIZE}
        x={-TARGET_SIZE / 2}
        y={-TARGET_SIZE / 2}
      />
    </>
  );
}

function CollapsedMarker({
  first,
  count,
  date,
  size,
  active,
  background,
  border,
  foreground,
  badgeBackground,
  badgeForeground,
  hitOffset,
  onPress,
}: {
  first: ChartMarker;
  count: number;
  date: Date;
  size: number;
  active: boolean;
  background: string;
  border: string;
  foreground: string;
  badgeBackground: string;
  badgeForeground: string;
  hitOffset: MarkerTouchTargetOffset;
  onPress: () => void;
}) {
  const hasMultiple = count > 1;
  const label = hasMultiple
    ? `${count} markers on ${date.toLocaleDateString()}. Tap to expand.`
    : markerLabel(first, date);
  return (
    <>
      <Circle cx={0} cy={2} fill="#000000" opacity={0.12} r={size / 2} />
      <Circle
        cx={0}
        cy={0}
        fill={first.color ?? background}
        r={size / 2}
        stroke={active ? foreground : border}
        strokeWidth={active ? 2 : 1.5}
      />
      <MarkerIcon
        color={foreground}
        icon={first.icon}
        size={size}
        title={first.title}
      />
      {hasMultiple ? (
        <>
          <Circle
            cx={size / 2 + 2}
            cy={-size / 2 - 2}
            fill={badgeBackground}
            r={9}
          />
          <SvgText
            alignmentBaseline="central"
            fill={badgeForeground}
            fontSize={11}
            fontWeight="600"
            textAnchor="middle"
            x={size / 2 + 2}
            y={-size / 2 - 2}
          >
            {count}
          </SvgText>
        </>
      ) : null}
      <Rect
        accessibilityLabel={label}
        accessible
        fill="transparent"
        height={TARGET_SIZE}
        onPress={onPress}
        rx={TARGET_SIZE / 2}
        width={TARGET_SIZE}
        x={-TARGET_SIZE / 2 + hitOffset.x}
        y={(hasMultiple ? -size / 2 - 16 : -TARGET_SIZE / 2) + hitOffset.y}
      />
    </>
  );
}

/** One date cluster, with a tap-to-fan layout in place of web hover. */
export function MarkerGroup({
  x,
  y,
  markers,
  isActive = false,
  size = 28,
  expanded: controlledExpanded,
  onExpandedChange,
  lineHeight = 0,
  showLine = true,
  animate = true,
  animationDelay = 0,
  markerBackground = "#ffffff",
  markerBorder = "#cbd5d1",
  markerForeground = "#26332e",
  badgeBackground = "#26332e",
  badgeForeground = "#ffffff",
  fanLayout,
  collapsedHitOffset = { x: 0, y: 0 },
  onMarkerPress,
}: MarkerGroupProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlledExpanded ?? localExpanded;
  const reduceMotion = useReducedMotion();
  const entrance = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const entranceProps = useAnimatedProps(() => ({ opacity: entrance.value }));
  const reveal = useSharedValue(expanded ? 1 : 0);
  const revealProps = useAnimatedProps(() => ({ opacity: reveal.value }));

  useEffect(() => {
    if (!animate || reduceMotion) {
      entrance.value = 1;
    } else {
      entrance.value = 0;
      entrance.value = withDelay(
        Math.max(0, animationDelay * 1000),
        withSpring(1, {
          damping: 25,
          reduceMotion: ReduceMotion.System,
          stiffness: 300,
        })
      );
    }
  }, [animate, animationDelay, entrance, reduceMotion]);

  useEffect(() => {
    if (!animate || reduceMotion) {
      reveal.value = expanded ? 1 : 0;
    } else if (expanded) {
      reveal.value = 0;
      reveal.value = withSpring(1, {
        damping: 22,
        reduceMotion: ReduceMotion.System,
        stiffness: 300,
      });
    } else {
      reveal.value = withTiming(0, {
        duration: 140,
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [animate, expanded, reduceMotion, reveal]);

  if (markers.length === 0) {
    return null;
  }

  const first = markers[0];
  if (!first) {
    return null;
  }
  const hasMultiple = markers.length > 1;
  const isFanOpen = expanded && hasMultiple;
  const handleExpand = () => {
    const next = !expanded;
    if (onExpandedChange) {
      onExpandedChange(next);
    } else {
      setLocalExpanded(next);
    }
  };
  const pressSingle = () => {
    const marker = markers[0];
    if (marker) {
      onMarkerPress?.(marker);
    }
  };
  const date = markerDate(first.date) ?? first.date;

  return (
    <AnimatedG animatedProps={entranceProps} transform={`translate(${x} ${y})`}>
      {showLine && lineHeight > 0 && (
        <Line
          opacity={isActive ? 0 : 0.6}
          pointerEvents="none"
          stroke={markerBorder}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeWidth={1}
          x1={0}
          x2={0}
          y1={size / 2 + 4}
          y2={lineHeight - y}
        />
      )}

      {isFanOpen ? (
        <AnimatedG
          animatedProps={revealProps}
          transform={`translate(${(fanLayout?.x ?? x) - x} ${(fanLayout?.y ?? y) - y})`}
        >
          <ExpandedFan
            background={markerBackground}
            border={markerBorder}
            date={date}
            foreground={markerForeground}
            markers={markers}
            onCollapse={handleExpand}
            onMarkerPress={onMarkerPress}
            orientation={fanLayout?.orientation ?? "up"}
            radius={fanLayout?.radius ?? FAN_RADIUS}
            size={size}
          />
        </AnimatedG>
      ) : (
        <CollapsedMarker
          active={isActive}
          background={markerBackground}
          badgeBackground={badgeBackground}
          badgeForeground={badgeForeground}
          border={markerBorder}
          count={markers.length}
          date={date}
          first={first}
          foreground={markerForeground}
          hitOffset={collapsedHitOffset}
          onPress={hasMultiple ? handleExpand : pressSingle}
          size={size}
        />
      )}
    </AnimatedG>
  );
}

/** Date-grouped markers aligned with the containing Cartesian chart's x scale. */
export function ChartMarkers({
  items,
  size = 28,
  showLines = true,
  animate = true,
}: ChartMarkersProps) {
  const {
    data,
    margins,
    model,
    height,
    plotHeight,
    plotWidth,
    selectedIndex,
    setSelectedIndex,
    status,
    theme,
    tooltipData,
    width,
    xDataKey,
  } = useChart();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const groups = useMemo(() => groupMarkersByDate(items), [items]);
  let activeDateKey: string | null = null;
  if (tooltipData) {
    activeDateKey = markerDateKey(tooltipData.point[xDataKey]);
  } else if (selectedIndex !== undefined) {
    activeDateKey = markerDateKey(
      chartDateValue(data, selectedIndex, xDataKey)
    );
  }
  useEffect(() => {
    if (activeDateKey !== null && activeDateKey !== expandedKey) {
      setExpandedKey(null);
    }
  }, [activeDateKey, expandedKey]);

  if (status !== "ready" || plotWidth <= 0 || plotHeight <= 0) {
    return null;
  }

  const handleMarkerPress = (marker: ChartMarker) => {
    const nearestIndex = nearestMarkerDataIndex(
      data as readonly Record<string, unknown>[],
      xDataKey,
      marker.date
    );
    if (nearestIndex !== null) {
      setSelectedIndex(nearestIndex);
    }
    pressMarker(marker);
    setExpandedKey(null);
  };

  return (
    <>
      {groups.map((group, groupIndex) => {
        const ratio = model.xToRatio(group.date);
        if (ratio === null) {
          return null;
        }
        const x = margins.left + ratio * plotWidth;
        const y = Math.max(
          margins.top - 8,
          group.markers.length > 1 ? size / 2 + 11 : size / 2
        );
        const bounds = { bottom: height, left: 0, right: width, top: 0 };
        const fanLayout =
          group.markers.length > 1
            ? resolveMarkerFanLayout(x, y, bounds, {
                count: group.markers.length,
                hitSize: TARGET_SIZE,
              })
            : undefined;
        const collapsedHitOffset = resolveMarkerTouchTargetOffset(
          x,
          y,
          -TARGET_SIZE / 2,
          group.markers.length > 1 ? -size / 2 - 16 : -TARGET_SIZE / 2,
          TARGET_SIZE,
          bounds
        );
        return (
          <MarkerGroup
            animate={animate}
            animationDelay={groupIndex * 0.1}
            badgeBackground={theme.color}
            badgeForeground={theme.surfaceColor}
            collapsedHitOffset={collapsedHitOffset}
            expanded={expandedKey === group.dateKey}
            fanLayout={fanLayout}
            isActive={activeDateKey === group.dateKey}
            key={group.dateKey}
            lineHeight={height - margins.bottom}
            markerBackground={theme.surfaceColor}
            markerBorder={theme.gridColor}
            markerForeground={theme.color}
            markers={group.markers}
            onExpandedChange={(expanded) => {
              setExpandedKey(expanded ? group.dateKey : null);
              const nearestIndex = nearestMarkerDataIndex(
                data as readonly Record<string, unknown>[],
                xDataKey,
                group.date
              );
              if (nearestIndex !== null) {
                setSelectedIndex(nearestIndex);
              }
            }}
            onMarkerPress={handleMarkerPress}
            showLine={showLines}
            size={size}
            x={x}
            y={y}
          />
        );
      })}
    </>
  );
}

/** Returns the markers matching the date currently selected in the chart. */
export function useActiveMarkers(items: readonly ChartMarker[]): ChartMarker[] {
  const { selectedIndex, data, tooltipData, xDataKey } = useChart();
  let currentValue: unknown;
  if (tooltipData) {
    currentValue = tooltipData.point[xDataKey];
  } else if (selectedIndex !== undefined) {
    currentValue = chartDateValue(data, selectedIndex, xDataKey);
  }
  const activeKey = markerDateKey(currentValue);
  return useMemo(
    () =>
      activeKey === null
        ? []
        : items.filter((marker) => markerDateKey(marker.date) === activeKey),
    [activeKey, items]
  );
}

/** Native tooltip rows corresponding to the currently active date markers. */
export function MarkerTooltipContent({ markers }: MarkerTooltipContentProps) {
  const { theme } = useChart();
  const visibleMarkers = markers.slice(0, MAX_TOOLTIP_MARKERS);
  const hiddenCount = markers.length - visibleMarkers.length;

  if (markers.length === 0) {
    return null;
  }

  return (
    <View style={[styles.tooltip, { borderTopColor: theme.gridColor }]}>
      {visibleMarkers.map((marker, index) => {
        const customContent = marker.content;
        const isClickable = Boolean(marker.onClick || marker.href);
        return (
          <View key={`${marker.title}-${index}`} style={styles.tooltipRow}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: marker.color ?? theme.surfaceColor,
                  borderColor: theme.gridColor,
                },
              ]}
            >
              {typeof marker.icon === "string" ||
              typeof marker.icon === "number" ? (
                <Text style={[styles.iconText, { color: theme.color }]}>
                  {String(marker.icon)}
                </Text>
              ) : (
                marker.icon
              )}
            </View>
            <View style={styles.tooltipText}>
              {typeof customContent === "string" ||
              typeof customContent === "number" ? (
                <Text style={[styles.markerTitle, { color: theme.textColor }]}>
                  {String(customContent)}
                </Text>
              ) : (
                (customContent ?? (
                  <>
                    <Text
                      numberOfLines={1}
                      style={[styles.markerTitle, { color: theme.textColor }]}
                    >
                      {marker.title}
                      {isClickable ? "  ↗" : ""}
                    </Text>
                    {marker.description ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.markerDescription,
                          { color: theme.textColor },
                        ]}
                      >
                        {marker.description}
                      </Text>
                    ) : null}
                  </>
                ))
              )}
            </View>
          </View>
        );
      })}
      {hiddenCount > 0 ? (
        <Text style={[styles.more, { color: theme.textColor }]}>
          +{hiddenCount} more…
        </Text>
      ) : null}
    </View>
  );
}

ChartMarkers.displayName = "ChartMarkers";
MarkerGroup.displayName = "MarkerGroup";
MarkerTooltipContent.displayName = "MarkerTooltipContent";
const chartMarkersComponent = ChartMarkers as typeof ChartMarkers & {
  __isChartMarkers?: boolean;
  __isPostOverlay?: boolean;
};
chartMarkersComponent.__isChartMarkers = true;
chartMarkersComponent.__isPostOverlay = true;

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  iconText: { fontSize: 11, fontWeight: "600" },
  markerDescription: { fontSize: 11, lineHeight: 16 },
  markerTitle: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
  more: { fontSize: 11, lineHeight: 16, paddingLeft: 28 },
  tooltip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
  },
  tooltipRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  tooltipText: { flex: 1, minWidth: 0 },
});
