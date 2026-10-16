import {
  Legend,
  LegendItemComponent,
  type LegendItemData,
  LegendLabel,
  LegendMarker,
  LegendProgress,
  LegendValue,
} from "@bklitui/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "../lib/theme";

const items: LegendItemData[] = [
  { label: "Organic", value: 4250, maxValue: 5000, color: "#0ea5e9" },
  { label: "Paid", value: 3120, maxValue: 5000, color: "#a855f7" },
  { label: "Email", value: 2100, maxValue: 5000, color: "#f59e0b" },
  { label: "Social", value: 1580, maxValue: 5000, color: "#10b981" },
];

export function LegendExamples({
  palette,
  width,
}: {
  palette: Palette;
  width: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [progressIndex, setProgressIndex] = useState<number | null>(null);
  return (
    <View style={[styles.section, { width }]}>
      <Text style={[styles.heading, { color: palette.text }]}>Legend</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          Traffic sources
        </Text>
        <Text style={[styles.caption, { color: palette.secondary }]}>
          Tap an item to select it and fade the others.
        </Text>
        <Legend
          hoveredIndex={selectedIndex}
          items={items}
          onHoverChange={setSelectedIndex}
        >
          <LegendItemComponent style={styles.itemRow}>
            <LegendMarker />
            <LegendLabel style={styles.flexLabel} />
            <LegendValue showPercentage />
          </LegendItemComponent>
        </Legend>
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          Sessions by channel
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.caption, { color: palette.secondary }]}
        >
          {progressIndex === null
            ? "Tap a channel to select it."
            : `${items[progressIndex]?.label ?? "Channel"} selected`}
        </Text>
        <Legend
          hoveredIndex={progressIndex}
          items={items}
          onHoverChange={setProgressIndex}
          title="Progress toward monthly goal"
        >
          <LegendItemComponent style={styles.progressItem}>
            <View style={styles.itemRow}>
              <LegendMarker />
              <LegendLabel style={styles.flexLabel} />
              <LegendValue showPercentage />
            </View>
            <LegendProgress trackStyle={{ backgroundColor: palette.track }} />
          </LegendItemComponent>
        </Legend>
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          Compact markers
        </Text>
        <Legend items={items} style={styles.horizontal}>
          <LegendItemComponent style={styles.horizontalItem}>
            <LegendMarker size={8} />
            <LegendLabel style={styles.compactLabel} />
          </LegendItemComponent>
        </Legend>
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
  itemRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  flexLabel: { flex: 1 },
  progressItem: { alignItems: "stretch", flexDirection: "column", gap: 8 },
  horizontal: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  horizontalItem: { flexDirection: "row", gap: 8, minHeight: 44 },
  compactLabel: { fontSize: 12 },
});
