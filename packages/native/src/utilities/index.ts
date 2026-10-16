// biome-ignore-all lint/performance/noBarrelFile: public native utility subpath.

export type {
  BackgroundPatternPreset,
  BackgroundProps,
} from "./background";
export { Background } from "./background";
export type {
  ChartBrushProps,
  ChartBrushSelection,
  ChartBrushSelectionPattern,
  NativeBrushSelectedBoxStyle,
} from "./chart-brush";
export { ChartBrush, ChartBrushOverlay } from "./chart-brush";
export type {
  ChartBrushLayoutProps,
  ChartBrushLayoutState,
} from "./chart-brush-layout";
export { ChartBrushLayout } from "./chart-brush-layout";
export type {
  ChartMarker,
  ChartMarkersProps,
  MarkerGroupProps,
  MarkerTooltipContentProps,
} from "./chart-markers";
export {
  ChartMarkers,
  MarkerGroup,
  MarkerTooltipContent,
  useActiveMarkers,
} from "./chart-markers";
export type {
  NativeDomainEndpoint,
  NativeDomainRange,
  NativeReferenceAreaRect,
  ResolveReferenceAreaRectOptions,
} from "./geometry";
export {
  buildHorizontalTangentBezierPath,
  domainValueToRatio,
  normalizeDomainRange,
  ratioToDomainValue,
  resolveReferenceAreaRect,
} from "./geometry";
export type { LegendProps } from "./legend";
export { Legend } from "./legend";
export type {
  LegendContextValue,
  LegendItemContextValue,
  LegendItemData,
} from "./legend-context";
export type { LegendItemProps } from "./legend-item";
export { LegendItem as LegendItemComponent } from "./legend-item";
export type { LegendLabelProps } from "./legend-label";
export { LegendLabel } from "./legend-label";
export type { LegendMarkerProps } from "./legend-marker";
export { LegendMarker } from "./legend-marker";
export type { LegendProgressProps } from "./legend-progress";
export { LegendProgress } from "./legend-progress";
export type { LegendValueProps } from "./legend-value";
export { LegendValue } from "./legend-value";
export type {
  PatternPresetId,
  PatternPresetOptions,
} from "./patterns";
export { PATTERN_PRESET_IDS, patternPresetTileSize } from "./patterns";
export type {
  ProjectionCurveKind,
  ProjectionLineEndMarkerProps,
  ProjectionLineProps,
  ProjectionPoint,
  ProjectionStrokeStyle,
} from "./projection-line";
export { ProjectionLine, ProjectionLineEndMarker } from "./projection-line";
export type {
  BuildProjectionPathOptions,
  ProjectionAutoMethod,
  ProjectionMode,
  ProjectionPathDensity,
} from "./projection-utils";
export {
  buildProjectionPath,
  computeProjectionAnchorTangentSlope,
  projectionDateExtents,
  projectionValueExtents,
} from "./projection-utils";
export type {
  ReferenceAreaIfOverflow,
  ReferenceAreaProps,
  ReferenceAreaStrokeStyle,
} from "./reference-area";
export { ReferenceArea } from "./reference-area";
export type {
  IndicatorFadeEdges,
  IndicatorWidth,
  TooltipIndicatorProps,
} from "./tooltip-indicator";
export { TooltipIndicator } from "./tooltip-indicator";
