import {
  Area,
  Background,
  ChartBrush,
  ChartBrushLayout,
  ChartTooltip,
  Grid,
  Line,
  LineChart,
  type NativeChartRange,
  ProjectionLine,
  ReferenceArea,
  TooltipIndicator,
  useChart,
  XAxis,
  YAxis,
} from "@bklitui/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Palette } from "../lib/theme";

const values = [22, 28, 25, 36, 32, 39, 44];
const data = values.map((value, index) => ({
  date: new Date(Date.UTC(2026, 9, 1 + index)),
  value,
}));
const projection = [
  { date: new Date(Date.UTC(2026, 9, 7)), value: 44 },
  { date: new Date(Date.UTC(2026, 9, 10)), value: 53 },
];

/** Custom native SVG layers can read the same scale context as built-in utilities. */
function CustomIndicator({ index }: { index: number }) {
  const { margins, model, plotHeight, theme } = useChart();
  const point = model.geometries
    .get("value")
    ?.points.find((item) => item.index === index);
  return (
    <TooltipIndicator
      colorEdge={theme.color}
      colorMid={theme.color}
      fadeEdges="both"
      height={plotHeight}
      visible={point !== undefined}
      width="thick"
      x={point ? point.x - margins.left : 0}
    />
  );
}

function rangeLabel(range: NativeChartRange | null): string {
  if (!range) {
    return "Full date range shown.";
  }
  const format = (value: number | Date) =>
    value instanceof Date
      ? value.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : String(Math.round(value));
  return `${format(range.start)} – ${format(range.end)}`;
}

export function UtilityExamples({
  palette,
  width,
}: {
  palette: Palette;
  width: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState(3);
  const [range, setRange] = useState<NativeChartRange | null>(null);
  return (
    <View style={[styles.section, { width }]}>
      <Text style={[styles.heading, { color: palette.text }]}>Utilities</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          Annotations and custom layers
        </Text>
        <Text style={[styles.caption, { color: palette.secondary }]}>
          Background, ReferenceArea and ProjectionLine share the series scales.
          Drag to move a custom indicator built with useChart.
        </Text>
        <LineChart
          accessibilityLabel="Annotated revenue chart"
          data={data}
          height={174}
          onSelectIndex={setSelectedIndex}
          selectedIndex={selectedIndex}
          xDataKey="date"
          xScale="time"
        >
          <Background opacity={0.1} pattern="diagonal" />
          <Grid horizontal numTicksRows={3} />
          <ReferenceArea
            fillOpacity={0.1}
            showMarkers
            x1={data[2]?.date}
            x2={data[4]?.date}
            y1={24}
            y2={42}
          />
          <Area
            dataKey="value"
            fill={palette.accent}
            fillOpacity={0.18}
            showLine={false}
          />
          <Line dataKey="value" stroke={palette.accent} />
          <ProjectionLine
            curveKind="bezier"
            data={projection}
            showEndMarker
            stroke={palette.accent}
          />
          <CustomIndicator index={selectedIndex} />
          <XAxis numTicks={3} tickMode="domain" />
          <YAxis numTicks={3} />
          <ChartTooltip />
        </LineChart>
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>Brush zoom</Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.caption, { color: palette.secondary }]}
        >
          {rangeLabel(range)}
        </Text>
        <Text style={[styles.caption, { color: palette.secondary }]}>
          Drag either handle in the overview to resize the range, then drag the
          selected window to move it. The main chart follows the same dates.
        </Text>
        <ChartBrushLayout
          brushStrip={(layout) => (
            <LineChart
              accessibilityLabel="Full date range overview"
              data={data}
              height={110}
              margin={{ top: 8 }}
              xDataKey="date"
              xScale="time"
            >
              <Area
                dataKey="value"
                fill={palette.accent}
                fillOpacity={0.15}
                showLine={false}
              />
              <Line dataKey="value" stroke={palette.accent} />
              <XAxis numTicks={3} />
              <ChartBrush
                onSelectionChange={(next) => {
                  setRange(next);
                  layout.onBrushSelectionChange(next);
                }}
                selection={layout.brushSelection}
              />
            </LineChart>
          )}
          data={data}
          enabled
          fitMainContent
          height={110}
          xDataKey="date"
        >
          {(layout) => (
            <View style={styles.zoomMain}>
              <LineChart
                accessibilityLabel="Zoomed revenue chart"
                data={data}
                height={158}
                xDataKey="date"
                xDomain={layout.xDomain}
                xDomainSlotCount={layout.xDomainSlotCount}
                xScale="time"
              >
                <Grid horizontal numTicksRows={3} />
                <Area
                  dataKey="value"
                  fill={palette.accent}
                  fillOpacity={0.15}
                  showLine={false}
                />
                <Line dataKey="value" stroke={palette.accent} />
                <XAxis numTicks={3} tickMode="domain" />
              </LineChart>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRange(null);
                  layout.onBrushSelectionChange(null);
                }}
                style={[styles.button, { borderColor: palette.border }]}
              >
                <Text style={[styles.buttonText, { color: palette.accent }]}>
                  Reset zoom
                </Text>
              </Pressable>
            </View>
          )}
        </ChartBrushLayout>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingTop: 12 },
  heading: { fontSize: 18, fontWeight: "600" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  title: { fontSize: 15, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 18 },
  zoomMain: { gap: 10 },
  button: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  buttonText: { fontSize: 13, fontWeight: "600" },
});
