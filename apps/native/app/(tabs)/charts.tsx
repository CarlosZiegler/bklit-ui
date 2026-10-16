import type { ChartSpec } from "@bklitui/chart-spec";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LegendExamples } from "../../components/legend-examples";
import { MarkerExamples } from "../../components/marker-examples";
import { NativeBlocks } from "../../components/native-blocks";
import { UtilityExamples } from "../../components/utility-examples";
import {
  createNativeChartSpec,
  type NativeChartEntry,
  nativeChartCatalog,
} from "../../lib/native-catalog";
import { NativeChartPreview } from "../../lib/native-chart-preview";
import { darkPalette, lightPalette, type Palette } from "../../lib/theme";

const familyOrder = ["Cartesian", "Radial", "Layout"] as const;

function staticExample(slug: NativeChartEntry["slug"]): ChartSpec {
  const base = createNativeChartSpec(slug);
  const options = { ...base.options } as Record<string, unknown>;
  if (slug === "live-line-chart") {
    options.paused = true;
  }
  return {
    ...base,
    height: 132,
    motion: { enabled: false, duration: 0 },
    options,
  } as ChartSpec;
}

function ChartExampleCard({
  entry,
  onOpen,
  palette,
  pageWidth,
  width,
}: {
  entry: NativeChartEntry;
  onOpen: () => void;
  pageWidth: number;
  palette: Palette;
  width: number;
}) {
  const [spec] = useState(() => staticExample(entry.slug));
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          width: pageWidth,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {entry.title}
          </Text>
          <Text style={[styles.cardDescription, { color: palette.secondary }]}>
            {entry.description}
          </Text>
        </View>
        <Text
          style={[
            styles.familyPill,
            { color: palette.accent, backgroundColor: palette.accentSoft },
          ]}
        >
          {entry.family}
        </Text>
      </View>
      <View style={styles.chartFrame}>
        <NativeChartPreview frameWidth={width} spec={spec} />
      </View>
      <Pressable
        accessibilityHint="Opens the live example with data, layers, appearance, and motion controls"
        accessibilityLabel={`Edit ${entry.title} in Studio`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.openButton,
          {
            backgroundColor: pressed
              ? palette.accentSoft
              : palette.surfaceMuted,
            borderColor: palette.border,
          },
        ]}
      >
        <Text style={[styles.openButtonText, { color: palette.accent }]}>
          View and edit in Studio
        </Text>
        <Text style={[styles.chevron, { color: palette.accent }]}>›</Text>
      </Pressable>
    </View>
  );
}

export default function ChartsScreen() {
  const router = useRouter();
  const dark = useColorScheme() === "dark";
  const palette = dark ? darkPalette : lightPalette;
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.min(720, windowWidth - 36);
  const exampleWidth = Math.max(240, pageWidth - 32);
  const sections = useMemo(
    () =>
      familyOrder.map((family) => ({
        title: family,
        data: nativeChartCatalog.filter((entry) => entry.family === family),
      })),
    []
  );
  const openStudio = (entry: NativeChartEntry) => {
    router.push({ pathname: "/(tabs)/studio", params: { chart: entry.slug } });
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: palette.page }]}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <SectionList
        contentContainerStyle={styles.listContent}
        initialNumToRender={2}
        keyExtractor={(entry) => entry.slug}
        ListFooterComponent={
          <View style={{ alignSelf: "center", width: pageWidth }}>
            <UtilityExamples palette={palette} width={pageWidth} />
            <MarkerExamples palette={palette} width={pageWidth} />
            <LegendExamples palette={palette} width={pageWidth} />
            <NativeBlocks palette={palette} width={pageWidth} />
            <Text style={[styles.footer, { color: palette.muted }]}>
              The examples are virtualized as you browse. Live data stays paused
              here and can be resumed in Studio.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={[styles.header, { width: pageWidth }]}>
            <Text style={[styles.eyebrow, { color: palette.muted }]}>
              BK LIT · NATIVE CATALOG
            </Text>
            <Text style={[styles.title, { color: palette.text }]}>Charts</Text>
            <Text style={[styles.subtitle, { color: palette.secondary }]}>
              Seventeen chart families, each rendered with the same native
              components and web-matched visual language. Open an example to
              change its data and layers.
            </Text>
          </View>
        }
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <ChartExampleCard
            entry={item}
            onOpen={() => openStudio(item)}
            pageWidth={pageWidth}
            palette={palette}
            width={exampleWidth}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              { backgroundColor: palette.page, width: pageWidth },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.count, { color: palette.muted }]}>
              {section.data.length}
            </Text>
          </View>
        )}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 18,
  },
  header: { gap: 8, paddingBottom: 22, paddingTop: 20, width: "100%" },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  title: { fontSize: 32, fontWeight: "700", letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 21, maxWidth: 560 },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  count: { fontSize: 12, fontVariant: ["tabular-nums"] },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    maxWidth: 720,
    overflow: "hidden",
    padding: 14,
    width: "100%",
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardDescription: { fontSize: 11, lineHeight: 16 },
  familyPill: {
    borderRadius: 8,
    fontSize: 10,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chartFrame: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 134,
    overflow: "hidden",
    paddingTop: 6,
    width: "100%",
  },
  openButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  openButtonText: { fontSize: 12, fontWeight: "600" },
  chevron: { fontSize: 21, lineHeight: 24 },
  footer: { fontSize: 11, lineHeight: 17, paddingBottom: 8, paddingTop: 4 },
});
