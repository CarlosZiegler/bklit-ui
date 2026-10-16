import { type GeoProjection, geoCentroid } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  choroplethValueColor,
  choroplethValueDomain,
  createChoroplethGraticulePath,
  createChoroplethPaths,
  createChoroplethProjection,
} from "./choropleth-geometry";

export interface ChoroplethFeatureProperties {
  name?: string;
  id?: string | number;
  [key: string]: unknown;
}
export type ChoroplethFeatureDatum = Feature<
  Geometry,
  ChoroplethFeatureProperties
>;
export type ChoroplethFeature = ChoroplethFeatureDatum;
export type ChoroplethGeoJson = FeatureCollection<
  Geometry,
  ChoroplethFeatureProperties
>;

export interface ChoroplethMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface ChoroplethZoomTransform {
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  skewX?: number;
  skewY?: number;
}
export interface ChoroplethChartProps {
  data: ChoroplethGeoJson;
  margin?: Partial<ChoroplethMargin>;
  animationDuration?: number;
  revealSignature?: string;
  aspectRatio?: string;
  scale?: number;
  center?: [number, number];
  translate?: [number, number];
  zoomEnabled?: boolean;
  zoomMin?: number;
  zoomMax?: number;
  initialZoom?: ChoroplethZoomTransform;
  style?: StyleProp<ViewStyle>;
  selectedFeatureIndex?: number | null;
  onFeatureSelect?: (feature: ChoroplethFeatureDatum, index: number) => void;
  accessibilityLabel?: string;
  animate?: boolean;
  children?: ReactNode;
}

export interface ChoroplethTooltipData {
  featureIndex: number;
  feature: ChoroplethFeatureDatum;
  x: number;
  y: number;
}

interface ChoroplethContextValue {
  data: ChoroplethGeoJson;
  paths: string[];
  projection: GeoProjection;
  selected: number | null;
  setSelected: (index: number | null) => void;
  width: number;
  height: number;
  themeColors: readonly string[];
  scaleColors: readonly string[];
  neutralColor: string;
  textColor: string;
  gridColor: string;
  onFeatureSelect?: ChoroplethChartProps["onFeatureSelect"];
}

const ChoroplethContext = createContext<ChoroplethContextValue | null>(null);
function useChoropleth() {
  const context = useContext(ChoroplethContext);
  if (!context) {
    throw new Error("Choropleth layers must be used inside ChoroplethChart.");
  }
  return context;
}

function parseAspectRatio(value: string): number {
  const [width, height] = value.split("/").map((part) => Number(part.trim()));
  return width && height ? width / height : 16 / 9;
}

export function ChoroplethChart({
  data,
  margin: marginProp,
  animationDuration = 800,
  revealSignature,
  aspectRatio = "16 / 9",
  scale,
  center = [0, 20],
  translate,
  zoomEnabled = false,
  zoomMin = 0.5,
  zoomMax = 4,
  initialZoom,
  style,
  selectedFeatureIndex: controlledSelectedIndex,
  onFeatureSelect,
  accessibilityLabel = "Geographic data map",
  animate = true,
  children,
}: ChoroplethChartProps) {
  const theme = useChartTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<
    number | null
  >(null);
  const selected =
    controlledSelectedIndex === undefined
      ? internalSelectedIndex
      : controlledSelectedIndex;
  const setSelected = useCallback(
    (index: number | null) => {
      if (controlledSelectedIndex === undefined) {
        setInternalSelectedIndex(index);
      }
    },
    [controlledSelectedIndex]
  );
  const margin = useMemo<ChoroplethMargin>(
    () => ({
      top: marginProp?.top ?? 0,
      right: marginProp?.right ?? 0,
      bottom: marginProp?.bottom ?? 0,
      left: marginProp?.left ?? 0,
    }),
    [marginProp?.bottom, marginProp?.left, marginProp?.right, marginProp?.top]
  );
  const projection = useMemo(
    () =>
      createChoroplethProjection(size.width, size.height, {
        center,
        data,
        margin,
        scale,
        translate,
      }),
    [center, data, margin, scale, size.height, size.width, translate]
  );
  const paths = useMemo(
    () => createChoroplethPaths(data, projection),
    [data, projection]
  );
  const reduceMotion = useReducedMotion();
  const reveal = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const opacityStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const zoomScale = useSharedValue(initialZoom?.scaleX ?? 1);
  const zoomScaleY = useSharedValue(
    initialZoom?.scaleY ?? initialZoom?.scaleX ?? 1
  );
  const offsetX = useSharedValue(initialZoom?.translateX ?? 0);
  const offsetY = useSharedValue(initialZoom?.translateY ?? 0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);
  const transformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      ...(initialZoom?.skewX === undefined
        ? []
        : [{ skewX: `${initialZoom.skewX}deg` as const }]),
      ...(initialZoom?.skewY === undefined
        ? []
        : [{ skewY: `${initialZoom.skewY}deg` as const }]),
      { scaleX: zoomScale.value },
      { scaleY: zoomScaleY.value },
    ],
  }));
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(8)
        .onBegin(() => {
          panStartX.value = offsetX.value;
          panStartY.value = offsetY.value;
        })
        .onUpdate((event) => {
          offsetX.value = panStartX.value + event.translationX;
          offsetY.value = panStartY.value + event.translationY;
        }),
    [offsetX, offsetY, panStartX, panStartY]
  );
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          pinchStartScale.value = zoomScale.value;
          pinchStartX.value = offsetX.value;
          pinchStartY.value = offsetY.value;
        })
        .onUpdate((event) => {
          const nextScale = Math.min(
            zoomMax,
            Math.max(zoomMin, pinchStartScale.value * event.scale)
          );
          const ratio = nextScale / Math.max(pinchStartScale.value, 0.001);
          zoomScale.value = nextScale;
          zoomScaleY.value = nextScale;
          offsetX.value = pinchStartX.value + event.focalX * (1 - ratio);
          offsetY.value = pinchStartY.value + event.focalY * (1 - ratio);
        }),
    [
      offsetX,
      offsetY,
      pinchStartScale,
      pinchStartX,
      pinchStartY,
      zoomMax,
      zoomMin,
      zoomScale,
      zoomScaleY,
    ]
  );
  const zoomGesture = useMemo(
    () => Gesture.Simultaneous(pan, pinch),
    [pan, pinch]
  );
  const context = useMemo<ChoroplethContextValue>(
    () => ({
      data,
      paths,
      projection,
      selected,
      setSelected,
      width: size.width,
      height: size.height,
      themeColors: theme.seriesColors,
      scaleColors: theme.scaleColors,
      neutralColor: theme.surfaceColor,
      textColor: theme.textColor,
      gridColor: theme.gridColor,
      onFeatureSelect,
    }),
    [
      data,
      onFeatureSelect,
      paths,
      projection,
      selected,
      size.height,
      size.width,
      theme.gridColor,
      theme.scaleColors,
      theme.seriesColors,
      theme.surfaceColor,
      theme.textColor,
      setSelected,
    ]
  );
  const layers =
    Children.count(children) > 0 ? (
      children
    ) : (
      <>
        <ChoroplethGraticule />
        <ChoroplethFeature />
        <ChoroplethTooltip />
      </>
    );

  // A changed signature intentionally replays the geographic reveal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: revealSignature restarts the enter animation.
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
  }, [animate, animationDuration, reduceMotion, reveal, revealSignature]);

  const onLayout = (event: LayoutChangeEvent) =>
    setSize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  const map = (
    <Animated.View style={[styles.map, transformStyle]}>
      {size.width > 0 && size.height > 0 && (
        <Svg
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          width="100%"
        >
          {layers}
        </Svg>
      )}
    </Animated.View>
  );
  const frame = (
    <Animated.View
      accessibilityLabel={
        selected == null
          ? accessibilityLabel
          : `${accessibilityLabel}. ${data.features[selected]?.properties?.name ?? `Region ${selected + 1}`} selected`
      }
      accessibilityRole="image"
      accessible
      onLayout={onLayout}
      style={[
        styles.root,
        { aspectRatio: parseAspectRatio(aspectRatio) },
        style,
        opacityStyle,
      ]}
    >
      {map}
    </Animated.View>
  );

  return (
    <ChoroplethContext.Provider value={context}>
      {zoomEnabled ? (
        <GestureDetector gesture={zoomGesture}>{frame}</GestureDetector>
      ) : (
        frame
      )}
    </ChoroplethContext.Provider>
  );
}

export interface ChoroplethFeatureProps {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fadedOpacity?: number;
  valueDataKey?: string;
  getFeatureColor?: (feature: ChoroplethFeatureDatum, index: number) => string;
}

export function ChoroplethFeature({
  fill,
  stroke,
  strokeWidth = 0.5,
  fadedOpacity = 0.4,
  valueDataKey,
  getFeatureColor,
}: ChoroplethFeatureProps) {
  const {
    data,
    paths,
    selected,
    setSelected,
    onFeatureSelect,
    themeColors,
    scaleColors,
    neutralColor,
    gridColor,
  } = useChoropleth();
  const valueDomain = useMemo(
    () =>
      valueDataKey
        ? choroplethValueDomain(
            data.features.map((feature) => feature.properties?.[valueDataKey])
          )
        : null,
    [data.features, valueDataKey]
  );
  return (
    <G>
      {data.features.map((feature, index) => {
        const path = paths[index];
        if (!path) {
          return null;
        }
        const propertyValue = valueDataKey
          ? feature.properties?.[valueDataKey]
          : undefined;
        const valueColor = valueDataKey
          ? choroplethValueColor(
              propertyValue,
              valueDomain,
              scaleColors,
              neutralColor
            )
          : null;
        const color =
          fill ??
          getFeatureColor?.(feature, index) ??
          valueColor ??
          themeColors[index % themeColors.length] ??
          neutralColor;
        const dimmed = selected != null && selected !== index;
        const name =
          feature.properties?.name ??
          String(feature.id ?? `Region ${index + 1}`);
        return (
          <Path
            accessibilityLabel={name}
            accessible
            d={path}
            fill={color}
            fillOpacity={dimmed ? fadedOpacity : 1}
            key={String(feature.id ?? index)}
            onPress={() => {
              const next = selected === index ? null : index;
              setSelected(next);
              if (next != null) {
                onFeatureSelect?.(feature, index);
              }
            }}
            stroke={stroke ?? gridColor}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </G>
  );
}

export interface ChoroplethGraticuleProps {
  stroke?: string;
  strokeWidth?: number;
  step?: [number, number];
}

export function ChoroplethGraticule({
  stroke,
  strokeWidth = 0.5,
  step = [20, 20],
}: ChoroplethGraticuleProps) {
  const { projection } = useChoropleth();
  const d = useMemo(
    () => createChoroplethGraticulePath(projection, step),
    [projection, step]
  );
  return (
    <Path
      d={d}
      fill="none"
      pointerEvents="none"
      stroke={stroke ?? "rgba(128, 140, 150, 0.22)"}
      strokeWidth={strokeWidth}
    />
  );
}

export interface ChoroplethTooltipProps {
  formatLabel?: (feature: ChoroplethFeatureDatum, index: number) => string;
  backgroundColor?: string;
  color?: string;
}

export function ChoroplethTooltip({
  formatLabel = (feature, index) =>
    feature.properties?.name ?? `Region ${index + 1}`,
  backgroundColor = "#17202c",
  color = "#ffffff",
}: ChoroplethTooltipProps) {
  const { data, projection, selected, width, height } = useChoropleth();
  if (selected == null) {
    return null;
  }
  const feature = data.features[selected];
  if (!feature) {
    return null;
  }
  const projected = projection(geoCentroid(feature) as [number, number]);
  const [px, py] = projected ?? [width / 2, height / 2];
  const x = Math.max(4, Math.min(width - 130, px - 60));
  const y = Math.max(28, Math.min(height - 8, py - 9));
  return (
    <G pointerEvents="none">
      <Rect
        fill={backgroundColor}
        height={26}
        rx={5}
        width={126}
        x={x}
        y={y - 18}
      />
      <SvgText fill={color} fontSize={10} fontWeight="600" x={x + 8} y={y}>
        {formatLabel(feature, selected)}
      </SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  map: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
});
