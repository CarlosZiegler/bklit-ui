import {
  Area,
  type ChartMarker,
  ChartMarkers,
  ChartTooltip,
  Grid,
  Line,
  LineChart,
  MarkerTooltipContent,
  useActiveMarkers,
  XAxis,
} from "@bklitui/native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Palette } from "../lib/theme";

const values = [28, 35, 31, 43, 39, 49, 45];
const dates = values.map((_, index) => new Date(2026, 9, 7 + index));
const data = values.map((value, index) => ({ date: dates[index], value }));

function MarkerTooltip({ markers }: { markers: readonly ChartMarker[] }) {
  const activeMarkers = useActiveMarkers(markers);
  return <MarkerTooltipContent markers={activeMarkers} />;
}

/** Demonstrates native tap-to-expand markers and chart-linked tooltip content. */
export function MarkerExamples({
  palette,
  width,
}: {
  palette: Palette;
  width: number;
}) {
  const [notice, setNotice] = useState(
    "Tap the grouped badge to inspect both events."
  );
  const markers = useMemo<ChartMarker[]>(
    () => [
      {
        date: new Date(2026, 9, 9),
        description: "A product milestone",
        icon: "↗",
        onClick: () => setNotice("Release notes opened from the chart marker."),
        title: "Release",
      },
      {
        date: new Date(2026, 9, 9, 16),
        description: "Web link opens only after you tap its fanned marker",
        href: "https://bklit.com",
        icon: "!",
        target: "_blank",
        title: "Incident report",
      },
      {
        date: new Date(2026, 9, 12),
        description: "A single date marker selects its nearest point",
        icon: "•",
        title: "Review",
      },
    ],
    []
  );

  return (
    <View style={[styles.section, { width }]}>
      <Text style={[styles.heading, { color: palette.text }]}>
        Date markers
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          Events on a trend
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.caption, { color: palette.secondary }]}
        >
          {notice}
        </Text>
        <LineChart
          accessibilityLabel="Revenue trend with date markers"
          data={data}
          height={242}
          margin={{ bottom: 30, left: 38, right: 16, top: 40 }}
          xDataKey="date"
          xScale="time"
        >
          <Grid horizontal numTicksRows={3} />
          <Area
            dataKey="value"
            fill={palette.accent}
            fillOpacity={0.16}
            showLine={false}
          />
          <Line dataKey="value" stroke={palette.accent} strokeWidth={2.5} />
          <XAxis
            formatTick={(value) =>
              value instanceof Date
                ? value.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })
                : String(value)
            }
            numTicks={3}
          />
          <ChartTooltip>
            <MarkerTooltip markers={markers} />
          </ChartTooltip>
          <ChartMarkers items={markers} />
        </LineChart>
        <Pressable
          accessibilityRole="button"
          onPress={() => setNotice("Tap a badge to open marker details.")}
          style={[styles.button, { borderColor: palette.border }]}
        >
          <Text style={[styles.buttonText, { color: palette.accent }]}>
            Reset hint
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  buttonText: { fontSize: 13, fontWeight: "600" },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  caption: { fontSize: 12, lineHeight: 18 },
  heading: { fontSize: 18, fontWeight: "600" },
  section: { gap: 12, paddingTop: 12 },
  title: { fontSize: 15, fontWeight: "600" },
});
