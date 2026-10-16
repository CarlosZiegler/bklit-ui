export interface NativeLayoutControlDescriptor {
  /** Exact component prop name consumed by the native editor. */
  prop: string;
  label: string;
  type: "boolean" | "color" | "number" | "select";
  defaultValue: string | number | boolean | null;
  section?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: "px" | "ms";
  options?: readonly (string | number)[];
  /** Converts editor values into the exact React prop type when they need parsing. */
  valueTransform?: "auto-number" | "coordinate-pair";
}

const motionControls = (
  duration: number
): readonly NativeLayoutControlDescriptor[] => [
  {
    prop: "animate",
    label: "Animate",
    type: "boolean",
    defaultValue: true,
    section: "Motion",
  },
  {
    prop: "animationDuration",
    label: "Duration",
    type: "number",
    defaultValue: duration,
    min: 0,
    max: 3000,
    step: 50,
    unit: "ms",
    section: "Motion",
  },
];

export const heatmapLayoutControls: readonly NativeLayoutControlDescriptor[] = [
  {
    prop: "layout",
    label: "Layout",
    type: "select",
    defaultValue: "fluid",
    options: ["fluid", "fill"],
    section: "Layout",
  },
  {
    prop: "binSize",
    label: "Cell size",
    type: "number",
    defaultValue: 0,
    min: 0,
    max: 40,
    step: 1,
    unit: "px",
    section: "Cells",
  },
  {
    prop: "gap",
    label: "Cell gap",
    type: "number",
    defaultValue: 2,
    min: 0,
    max: 12,
    step: 1,
    unit: "px",
    section: "Cells",
  },
  {
    prop: "weekStartDay",
    label: "Week starts",
    type: "select",
    defaultValue: 0,
    options: [0, 1, 2, 3, 4, 5, 6],
    section: "Data",
  },
  ...motionControls(480),
];

export const funnelLayoutControls: readonly NativeLayoutControlDescriptor[] = [
  {
    prop: "orientation",
    label: "Orientation",
    type: "select",
    defaultValue: "horizontal",
    options: ["horizontal", "vertical"],
    section: "Layout",
  },
  {
    prop: "color",
    label: "Color",
    type: "color",
    defaultValue: null,
    section: "Style",
  },
  {
    prop: "layers",
    label: "Depth layers",
    type: "number",
    defaultValue: 3,
    min: 1,
    max: 6,
    step: 1,
    section: "Style",
  },
  {
    prop: "gap",
    label: "Stage gap",
    type: "number",
    defaultValue: 4,
    min: 0,
    max: 20,
    step: 1,
    unit: "px",
    section: "Layout",
  },
  {
    prop: "edges",
    label: "Edges",
    type: "select",
    defaultValue: "curved",
    options: ["curved", "straight"],
    section: "Style",
  },
  {
    prop: "showPercentage",
    label: "Show percentages",
    type: "boolean",
    defaultValue: true,
    section: "Labels",
  },
  {
    prop: "showValues",
    label: "Show values",
    type: "boolean",
    defaultValue: true,
    section: "Labels",
  },
  {
    prop: "showLabels",
    label: "Show stage labels",
    type: "boolean",
    defaultValue: true,
    section: "Labels",
  },
  {
    prop: "labelLayout",
    label: "Label layout",
    type: "select",
    defaultValue: "spread",
    options: ["spread", "grouped"],
    section: "Labels",
  },
  {
    prop: "labelOrientation",
    label: "Grouped label direction",
    type: "select",
    defaultValue: null,
    options: ["vertical", "horizontal"],
    section: "Labels",
  },
  {
    prop: "labelAlign",
    label: "Label position",
    type: "select",
    defaultValue: "center",
    options: ["center", "start", "end"],
    section: "Labels",
  },
  ...motionControls(440),
];

export const sankeyLayoutControls: readonly NativeLayoutControlDescriptor[] = [
  {
    prop: "nodeWidth",
    label: "Node width",
    type: "number",
    defaultValue: 16,
    min: 4,
    max: 40,
    step: 1,
    unit: "px",
    section: "Nodes",
  },
  {
    prop: "nodePadding",
    label: "Node spacing",
    type: "number",
    defaultValue: 24,
    min: 0,
    max: 60,
    step: 2,
    unit: "px",
    section: "Nodes",
  },
  {
    prop: "aspectRatio",
    label: "Aspect ratio",
    type: "select",
    defaultValue: "2 / 1",
    options: ["2 / 1", "3 / 2", "1 / 1"],
    section: "Layout",
  },
  ...motionControls(1100),
];

export const sunburstLayoutControls: readonly NativeLayoutControlDescriptor[] =
  [
    {
      prop: "size",
      label: "Maximum size",
      type: "number",
      defaultValue: 520,
      min: 160,
      max: 520,
      step: 16,
      unit: "px",
      section: "Layout",
    },
    {
      prop: "padding",
      label: "Edge inset",
      type: "number",
      defaultValue: null,
      min: 0,
      max: 28,
      step: 1,
      unit: "px",
      section: "Layout",
    },
    {
      prop: "hoverPop",
      label: "Selected segment expansion",
      type: "number",
      defaultValue: 8,
      min: 0,
      max: 24,
      step: 1,
      unit: "px",
      section: "Interaction",
    },
    ...motionControls(650),
  ];

export const choroplethLayoutControls: readonly NativeLayoutControlDescriptor[] =
  [
    {
      prop: "zoomEnabled",
      label: "Pinch to zoom",
      type: "boolean",
      defaultValue: false,
      section: "Interaction",
    },
    {
      prop: "scale",
      label: "Projection scale",
      type: "select",
      defaultValue: "auto",
      options: ["auto", "70", "100", "140"],
      valueTransform: "auto-number",
      section: "Projection",
    },
    {
      prop: "center",
      label: "Map center",
      type: "select",
      defaultValue: "0,20",
      options: ["0,20", "-98,39", "10,50"],
      valueTransform: "coordinate-pair",
      section: "Projection",
    },
    ...motionControls(800),
  ];

export const nativeLayoutControls = {
  "heatmap-chart": heatmapLayoutControls,
  "funnel-chart": funnelLayoutControls,
  "sankey-chart": sankeyLayoutControls,
  "sunburst-chart": sunburstLayoutControls,
  "choropleth-chart": choroplethLayoutControls,
} as const;
