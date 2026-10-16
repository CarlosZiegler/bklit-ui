type ObjectValue = Record<string, unknown>;

const object = (value: unknown): value is ObjectValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const text = (value: unknown): value is string => typeof value === "string";
const boolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
const nonnegative = (value: unknown) => finite(value) && value >= 0;
const integer = (value: unknown) => finite(value) && Number.isInteger(value);
const optional = (
  value: ObjectValue,
  key: string,
  check: (item: unknown) => boolean
) => value[key] === undefined || check(value[key]);
const choice =
  (...values: readonly unknown[]) =>
  (value: unknown) =>
    values.includes(value);
const pair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(finite);

function optionsValid(options: ObjectValue): boolean {
  const sizes = [
    "size",
    "innerRadius",
    "cornerRadius",
    "padAngle",
    "hoverOffset",
    "enterStaggerScale",
    "baseInnerRadius",
    "ringGap",
    "strokeWidth",
    "linearHeight",
    "notchLengthPercent",
    "notchWidthPercent",
    "spacing",
    "totalNotches",
    "levels",
    "enterDurationMs",
    "staggerScale",
    "binSize",
    "gap",
    "layers",
    "nodePadding",
    "nodeWidth",
    "hoverPop",
    "padding",
    "barWidth",
    "barSize",
    "barGap",
    "maxBarSize",
    "stackGap",
    "candleWidth",
    "candleGap",
    "window",
    "radius",
    "numTicks",
  ];
  const flags = [
    "animate",
    "uniformWidth",
    "useGradient",
    "showLabels",
    "showValues",
    "showPercentage",
    "zoomEnabled",
    "stacked",
    "paused",
    "pulse",
    "fadeEdges",
    "xAxisEnabled",
    "yAxisEnabled",
  ];
  if (
    !(
      sizes.every((key) => optional(options, key, nonnegative)) &&
      flags.every((key) => optional(options, key, boolean))
    )
  ) {
    return false;
  }
  return (
    optional(options, "valueDataKey", text) &&
    ["startAngle", "endAngle", "centerValue", "scale"].every((key) =>
      optional(options, key, finite)
    ) &&
    optional(options, "center", pair) &&
    optional(
      options,
      "margin",
      (value) =>
        nonnegative(value) ||
        (object(value) &&
          ["top", "right", "bottom", "left"].every((key) =>
            optional(value, key, nonnegative)
          ))
    ) &&
    ["xAxis", "yAxis"].every((axis) =>
      optional(
        options,
        axis,
        (value) =>
          object(value) &&
          boolean(value.enabled) &&
          optional(value, "numTicks", nonnegative)
      )
    ) &&
    optional(options, "weekStartDay", choice(0, 1, 2, 3, 4, 5, 6)) &&
    optional(options, "layout", choice("fill", "fluid")) &&
    optional(options, "edges", choice("curved", "straight")) &&
    optional(options, "yDomain", (value) => pair(value) && value[0] < value[1])
  );
}

function labelledValues(data: unknown, ring = false): boolean {
  return (
    Array.isArray(data) &&
    data.every(
      (row) =>
        object(row) &&
        text(row.label) &&
        finite(row.value) &&
        (!ring || (finite(row.maxValue) && row.maxValue > 0))
    )
  );
}

function hierarchyValid(value: unknown, depth = 0): boolean {
  return (
    depth < 128 &&
    object(value) &&
    text(value.name) &&
    optional(value, "value", nonnegative) &&
    optional(
      value,
      "children",
      (children) =>
        Array.isArray(children) &&
        children.every((child) => hierarchyValid(child, depth + 1))
    )
  );
}

function sankeyValid(data: unknown): boolean {
  if (
    !(
      object(data) &&
      Array.isArray(data.nodes) &&
      Array.isArray(data.links) &&
      data.nodes.every((node) => object(node) && text(node.name))
    )
  ) {
    return false;
  }
  const adjacency: number[][] = data.nodes.map(() => []);
  const degree: number[] = data.nodes.map(() => 0);
  for (const link of data.links) {
    if (
      !(
        object(link) &&
        integer(link.source) &&
        integer(link.target) &&
        finite(link.source) &&
        finite(link.target) &&
        nonnegative(link.value)
      ) ||
      link.source < 0 ||
      link.target < 0 ||
      link.source >= data.nodes.length ||
      link.target >= data.nodes.length
    ) {
      return false;
    }
    adjacency[link.source]?.push(link.target);
    degree[link.target] = (degree[link.target] ?? 0) + 1;
  }
  // d3-sankey rejects cycles; validate before replacing the current preview.
  const queue = degree.flatMap((count, index) => (count === 0 ? [index] : []));
  for (const source of queue) {
    for (const target of adjacency[source] ?? []) {
      degree[target] = (degree[target] ?? 0) - 1;
      if (degree[target] === 0) {
        queue.push(target);
      }
    }
  }
  return queue.length === data.nodes.length;
}

function geometryValid(value: unknown, depth = 0): boolean {
  if (!object(value) || depth >= 128) {
    return false;
  }
  if (value.type === "GeometryCollection") {
    return (
      Array.isArray(value.geometries) &&
      value.geometries.every((item) => geometryValid(item, depth + 1))
    );
  }
  const nesting: Record<string, number> = {
    Point: 0,
    MultiPoint: 1,
    LineString: 1,
    MultiLineString: 2,
    Polygon: 2,
    MultiPolygon: 3,
  };
  if (!(text(value.type) && Object.hasOwn(nesting, value.type))) {
    return false;
  }
  const coordinates = (input: unknown, level: number): boolean =>
    Array.isArray(input) &&
    (level === 0
      ? input.length >= 2 && input.every(finite)
      : input.every((item) => coordinates(item, level - 1)));
  return coordinates(value.coordinates, nesting[value.type] ?? 0);
}

function geoJsonValid(data: unknown): boolean {
  return (
    object(data) &&
    data.type === "FeatureCollection" &&
    Array.isArray(data.features) &&
    data.features.every(
      (feature) =>
        object(feature) &&
        feature.type === "Feature" &&
        (feature.geometry === null || geometryValid(feature.geometry)) &&
        (feature.properties === null || object(feature.properties))
    )
  );
}

/** Checks family contracts at the JSON editor/transport boundary, before rendering. */
export function validateChartFamily(
  chart: string,
  data: unknown,
  options: ObjectValue,
  layers: readonly unknown[] = []
): boolean {
  if (!optionsValid(options)) {
    return false;
  }
  switch (chart) {
    case "pie-chart":
      return labelledValues(data) && radialLayers(layers, "pie-slice");
    case "ring-chart":
      return labelledValues(data, true) && radialLayers(layers, "ring");
    case "gauge-chart":
      return (
        finite(options.value) &&
        optional(options, "orientation", choice("arc", "linear")) &&
        Array.isArray(data) &&
        layers.length === 0
      );
    case "radar-chart":
      return (
        Array.isArray(options.metrics) &&
        options.metrics.every(
          (metric) => object(metric) && text(metric.key) && text(metric.label)
        ) &&
        Array.isArray(data) &&
        data.every(
          (row) =>
            object(row) &&
            text(row.label) &&
            object(row.values) &&
            Object.values(row.values).every(finite)
        ) &&
        radialLayers(layers, "radar-area")
      );
    case "heatmap-chart":
      return (
        Array.isArray(data) &&
        data.every(
          (column) =>
            object(column) &&
            finite(column.bin) &&
            Array.isArray(column.bins) &&
            column.bins.every(
              (bin) =>
                object(bin) &&
                finite(bin.bin) &&
                finite(bin.count) &&
                text(bin.date) &&
                Number.isFinite(Date.parse(bin.date))
            )
        ) &&
        layoutLayers(layers, "cells")
      );
    case "funnel-chart":
      return (
        labelledValues(data) &&
        optional(options, "orientation", choice("horizontal", "vertical")) &&
        layoutLayers(layers, "stage")
      );
    case "sankey-chart":
      return sankeyValid(data) && layoutLayers(layers, "flow");
    case "sunburst-chart":
      return hierarchyValid(data) && layoutLayers(layers, "segment");
    case "choropleth-chart":
      return geoJsonValid(data) && layoutLayers(layers, "feature");
    case "candlestick-chart":
      return (
        Array.isArray(data) &&
        data.every(
          (row) =>
            object(row) &&
            ["open", "high", "low", "close"].every((key) => finite(row[key]))
        )
      );
    case "live-line-chart":
      return (
        Array.isArray(data) &&
        data.every(
          (row) => object(row) && finite(row.time) && finite(row.value)
        )
      );
    case "line-chart":
    case "area-chart":
    case "composed-chart":
    case "bar-chart":
    case "scatter-chart":
    case "profit-loss-line":
      return Array.isArray(data) && data.every(object);
    default:
      return false;
  }
}

function radialLayers(layers: readonly unknown[], type: string): boolean {
  return layers.every(
    (layer) =>
      object(layer) &&
      layer.type === type &&
      integer(layer.index) &&
      finite(layer.index) &&
      layer.index >= 0
  );
}

function layoutLayers(layers: readonly unknown[], type: string): boolean {
  return layers.every((layer) => object(layer) && layer.type === type);
}
