export interface NativeRadialControlDescriptor {
  /** The exact native chart prop edited by the control. */
  key: string;
  label: string;
  type: "boolean" | "color" | "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
}

export interface NativeRadialCatalogEntry {
  id: "pie-chart" | "ring-chart" | "gauge-chart" | "radar-chart";
  title: string;
  description: string;
  /** Chart records, kept separate so the editor can change data independently of props. */
  data?: unknown;
  /** Serializable props passed to the chart component. Composable layers are supplied by the catalog renderer. */
  defaultProps: Readonly<Record<string, unknown>>;
  controls: readonly NativeRadialControlDescriptor[];
}

export const nativeRadialCatalog: readonly NativeRadialCatalogEntry[] = [
  {
    id: "pie-chart",
    title: "Pie chart",
    description:
      "Compare category shares and tap a slice to inspect its value.",
    data: [
      { label: "Rent", value: 38, color: "#397db5" },
      { label: "Food", value: 24, color: "#e5985d" },
      { label: "Transport", value: 14, color: "#4f9b73" },
      { label: "Savings", value: 12, color: "#9b77c6" },
      { label: "Other", value: 12, color: "#dc6f7f" },
    ],
    defaultProps: {
      size: 260,
      innerRadius: 68,
      padAngle: 0.012,
      cornerRadius: 3,
      startAngle: -Math.PI / 2,
      endAngle: (3 * Math.PI) / 2,
      hoverOffset: 8,
    },
    controls: [
      {
        key: "innerRadius",
        label: "Center radius",
        type: "number",
        min: 0,
        max: 110,
        step: 2,
      },
      {
        key: "padAngle",
        label: "Slice gap",
        type: "number",
        min: 0,
        max: 0.12,
        step: 0.004,
      },
      {
        key: "cornerRadius",
        label: "Corner radius",
        type: "number",
        min: 0,
        max: 16,
        step: 1,
      },
      {
        key: "hoverOffset",
        label: "Selection offset",
        type: "number",
        min: 0,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    id: "ring-chart",
    title: "Ring chart",
    description:
      "Compare several independent progress totals; tap a ring for its center readout.",
    data: [
      { label: "Design", value: 72, maxValue: 100, color: "#397db5" },
      { label: "Build", value: 48, maxValue: 60, color: "#e5985d" },
      { label: "Ship", value: 15, maxValue: 30, color: "#4f9b73" },
      { label: "Review", value: 22, maxValue: 40, color: "#9b77c6" },
    ],
    defaultProps: {
      size: 270,
      strokeWidth: 13,
      ringGap: 7,
      baseInnerRadius: 34,
      animationDuration: 1100,
      startAngle: -Math.PI / 2,
      endAngle: (3 * Math.PI) / 2,
    },
    controls: [
      {
        key: "strokeWidth",
        label: "Ring thickness",
        type: "number",
        min: 4,
        max: 24,
        step: 1,
      },
      {
        key: "ringGap",
        label: "Ring gap",
        type: "number",
        min: 0,
        max: 20,
        step: 1,
      },
      {
        key: "baseInnerRadius",
        label: "Center radius",
        type: "number",
        min: 12,
        max: 80,
        step: 2,
      },
      {
        key: "animationDuration",
        label: "Animation duration",
        type: "number",
        min: 0,
        max: 3000,
        step: 100,
      },
    ],
  },
  {
    id: "gauge-chart",
    title: "Gauge",
    description: "Show a compact progress value with arc or linear notches.",
    defaultProps: {
      value: 68,
      orientation: "arc",
      totalNotches: 36,
      spacing: 25,
      notchCornerRadius: 2,
      uniformWidth: false,
      startAngle: 135,
      endAngle: 405,
      useGradient: false,
      centerValue: 68,
      defaultLabel: "Capacity",
      notchLengthPercent: 100,
      notchWidthPercent: 80,
      linearHeight: 24,
    },
    controls: [
      {
        key: "value",
        label: "Progress",
        type: "number",
        min: 0,
        max: 100,
        step: 1,
      },
      {
        key: "orientation",
        label: "Orientation",
        type: "select",
        options: ["arc", "linear"],
      },
      {
        key: "totalNotches",
        label: "Notches",
        type: "number",
        min: 4,
        max: 80,
        step: 1,
      },
      {
        key: "spacing",
        label: "Spacing",
        type: "number",
        min: 0,
        max: 70,
        step: 1,
      },
      {
        key: "notchLengthPercent",
        label: "Notch length",
        type: "number",
        min: 5,
        max: 100,
        step: 5,
      },
      {
        key: "notchWidthPercent",
        label: "Notch width",
        type: "number",
        min: 10,
        max: 100,
        step: 5,
      },
      { key: "uniformWidth", label: "Uniform notches", type: "boolean" },
      { key: "useGradient", label: "Gradient fill", type: "boolean" },
    ],
  },
  {
    id: "radar-chart",
    title: "Radar chart",
    description:
      "Compare two normalized profiles and tap a shape to emphasize that series.",
    data: [
      {
        label: "Current",
        color: "#397db5",
        values: {
          speed: 82,
          quality: 74,
          focus: 91,
          reliability: 68,
          support: 77,
        },
      },
      {
        label: "Target",
        color: "#e5985d",
        values: {
          speed: 74,
          quality: 90,
          focus: 76,
          reliability: 88,
          support: 82,
        },
      },
    ],
    defaultProps: {
      metrics: [
        { key: "speed", label: "Speed" },
        { key: "quality", label: "Quality" },
        { key: "focus", label: "Focus" },
        { key: "reliability", label: "Reliability" },
        { key: "support", label: "Support" },
      ],
      size: 280,
      levels: 5,
      margin: 62,
      animate: true,
      enterDurationMs: 1100,
      staggerScale: 1,
    },
    controls: [
      {
        key: "levels",
        label: "Grid levels",
        type: "number",
        min: 2,
        max: 10,
        step: 1,
      },
      {
        key: "margin",
        label: "Chart margin",
        type: "number",
        min: 24,
        max: 100,
        step: 2,
      },
      { key: "animate", label: "Animate entrance", type: "boolean" },
      {
        key: "enterDurationMs",
        label: "Animation duration",
        type: "number",
        min: 0,
        max: 3000,
        step: 100,
      },
      {
        key: "staggerScale",
        label: "Animation stagger",
        type: "number",
        min: 0,
        max: 2,
        step: 0.1,
      },
    ],
  },
] as const;

/** Initial controlled values for documenting and previewing tap-selection states. */
export const nativeRadialSelectionExamples = {
  "pie-chart": { hoveredIndex: 1, label: "Food", value: 24 },
  "ring-chart": { hoveredIndex: 1, label: "Build", value: 48, maxValue: 60 },
  "radar-chart": { hoveredIndex: 0, label: "Current" },
} as const;
