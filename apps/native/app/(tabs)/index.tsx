import { LineChart, ProgressRing } from "@bklitui/native";
import { Host, Picker, Switch } from "@expo/ui";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  currentRevenue,
  monthlyTarget,
  type RevenuePoint,
  recentRevenue,
  revenueByRange,
} from "../../lib/revenue-data";
import { darkPalette, lightPalette, type Palette } from "../../lib/theme";

const money = (amount: number) =>
  `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
const compactMoney = (amount: number) =>
  `$${Number((amount / 1000).toFixed(1))}k`;

function ActionButton({
  label,
  onPress,
  palette,
}: {
  label: string;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border,
          opacity: pressed ? 0.68 : 1,
        },
      ]}
    >
      <Text style={[styles.actionButtonText, { color: palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function LegendRow({
  amount,
  color,
  label,
  palette,
}: {
  amount: string;
  color: string;
  label: string;
  palette: Palette;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: palette.secondary }]}>
        {label}
      </Text>
      <Text style={[styles.legendAmount, { color: palette.text }]}>
        {amount}
      </Text>
    </View>
  );
}

function ActivityRow({
  amount,
  date,
  label,
  palette,
}: {
  amount: number;
  date: string;
  label: string;
  palette: Palette;
}) {
  return (
    <View style={[styles.activityRow, { borderTopColor: palette.border }]}>
      <View
        style={[styles.activityMark, { backgroundColor: palette.accentSoft }]}
      >
        <View
          style={[
            styles.activityMarkInner,
            { backgroundColor: palette.accent },
          ]}
        />
      </View>
      <View style={styles.activityCopy}>
        <Text style={[styles.activityName, { color: palette.text }]}>
          {label}
        </Text>
        <Text style={[styles.activityDate, { color: palette.muted }]}>
          {date} · Today
        </Text>
      </View>
      <Text style={[styles.activityAmount, { color: palette.text }]}>
        +{money(amount)}
      </Text>
    </View>
  );
}

export default function OverviewScreen() {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");
  const [range, setRange] = useState("7d");
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [replayKey, setReplayKey] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const palette = isDark ? darkPalette : lightPalette;
  const series = useMemo(() => {
    const base = revenueByRange[range] ?? revenueByRange["7d"];
    const nudge = refreshCount % 4;
    return base.map(
      (point, index): RevenuePoint => ({
        ...point,
        amount:
          point.amount +
          (nudge === 0 ? 0 : (index % 2 === 0 ? 1 : -1) * nudge * 115),
      })
    );
  }, [range, refreshCount]);
  const revenue = currentRevenue + refreshCount * 184;
  const remaining = Math.max(0, monthlyTarget - revenue);
  const percent = Math.min(100, Math.round((revenue / monthlyTarget) * 100));
  const compact = windowWidth < 680;

  const setTimeRange = (nextRange: string | number) => {
    const resolved = String(nextRange);
    setRange(resolved);
    setSelectedIndex((revenueByRange[resolved]?.length ?? 1) - 1);
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: palette.page }]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.topBar}>
            <View style={styles.brandLockup}>
              <Text style={[styles.wordmark, { color: palette.text }]}>
                bklit
              </Text>
              <View
                style={[
                  styles.nativeBadge,
                  { backgroundColor: palette.accentSoft },
                ]}
              >
                <Text
                  style={[styles.nativeBadgeText, { color: palette.accent }]}
                >
                  Native
                </Text>
              </View>
            </View>
            <Host
              accessibilityLabel="Appearance"
              colorScheme={isDark ? "dark" : "light"}
              matchContents
            >
              <Switch
                label={isDark ? "Dark" : "Light"}
                onValueChange={setIsDark}
                value={isDark}
              />
            </Host>
          </View>

          <View style={styles.heading}>
            <Text style={[styles.eyebrow, { color: palette.muted }]}>
              THURSDAY, OCTOBER 15
            </Text>
            <Text style={[styles.screenTitle, { color: palette.text }]}>
              Overview
            </Text>
            <Text style={[styles.screenSubtitle, { color: palette.secondary }]}>
              Revenue performance at a glance
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  Revenue
                </Text>
                <Text style={[styles.cardKicker, { color: palette.muted }]}>
                  OCTOBER TO DATE
                </Text>
              </View>
              <ActionButton
                label="Update"
                onPress={() => {
                  setRefreshCount((count) => count + 1);
                  setSelectedIndex(series.length - 1);
                }}
                palette={palette}
              />
            </View>

            <View style={styles.metricRow}>
              <Text
                selectable
                style={[styles.metricValue, { color: palette.text }]}
              >
                {money(revenue)}
              </Text>
              <View
                style={[
                  styles.changePill,
                  { backgroundColor: palette.accentSoft },
                ]}
              >
                <Text style={[styles.changeValue, { color: palette.accent }]}>
                  +12.8%
                </Text>
              </View>
            </View>
            <Text style={[styles.metricCaption, { color: palette.secondary }]}>
              <Text style={{ color: palette.accent, fontWeight: "600" }}>
                ↑ 12.8%
              </Text>
              {"  "}compared with September
            </Text>

            <View
              style={[styles.chartDivider, { backgroundColor: palette.border }]}
            />
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: palette.secondary }]}>
                Daily revenue
              </Text>
              <Host
                accessibilityLabel="Chart date range"
                colorScheme={isDark ? "dark" : "light"}
                matchContents
              >
                <Picker onValueChange={setTimeRange} selectedValue={range}>
                  <Picker.Item label="Last 7 days" value="7d" />
                  <Picker.Item label="Last 30 days" value="30d" />
                </Picker>
              </Host>
            </View>
            <LineChart
              accessibilityLabel="Daily revenue"
              animationKey={`${range}:${String(replayKey)}:${String(refreshCount)}`}
              color={palette.accent}
              data={series}
              dataKey="amount"
              formatLabel={(value) => String(value ?? "")}
              formatValue={compactMoney}
              gridColor={palette.grid}
              height={168}
              onSelectIndex={setSelectedIndex}
              selectedIndex={selectedIndex}
              surfaceColor={palette.surface}
              textColor={palette.muted}
              xKey="date"
            />
            <View
              style={[styles.chartFooter, { borderTopColor: palette.border }]}
            >
              <View>
                <Text style={[styles.footerLabel, { color: palette.muted }]}>
                  {selectedIndex === undefined
                    ? "Latest day"
                    : (series[selectedIndex]?.date ?? "Selected day")}
                </Text>
                <Text style={[styles.footerValue, { color: palette.text }]}>
                  {compactMoney(
                    series[selectedIndex ?? series.length - 1]?.amount ?? 0
                  )}
                  <Text
                    style={[styles.footerContext, { color: palette.secondary }]}
                  >
                    {" "}
                    · Sample data
                  </Text>
                </Text>
              </View>
              <ActionButton
                label="Replay"
                onPress={() => setReplayKey((key) => key + 1)}
                palette={palette}
              />
            </View>
          </View>

          <View style={compact ? styles.stackedCards : styles.sideBySide}>
            <View
              style={[
                styles.targetCard,
                styles.card,
                !compact && styles.columnCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.targetHeading}>
                <View>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>
                    Monthly target
                  </Text>
                  <Text style={[styles.cardKicker, { color: palette.muted }]}>
                    OCTOBER 2026
                  </Text>
                </View>
                <Text style={[styles.targetPercent, { color: palette.accent }]}>
                  {percent}%
                </Text>
              </View>
              <View style={styles.targetContent}>
                <ProgressRing
                  accessibilityLabel="October revenue target"
                  animationKey={String(refreshCount)}
                  color={palette.accent}
                  maxValue={monthlyTarget}
                  size={128}
                  strokeWidth={10}
                  trackColor={palette.track}
                  value={revenue}
                >
                  <Text style={[styles.ringAmount, { color: palette.text }]}>
                    {compactMoney(revenue)}
                  </Text>
                  <Text style={[styles.ringSubline, { color: palette.muted }]}>
                    of {compactMoney(monthlyTarget)}
                  </Text>
                </ProgressRing>
                <View style={styles.legend}>
                  <LegendRow
                    amount={money(revenue)}
                    color={palette.accent}
                    label="Booked"
                    palette={palette}
                  />
                  <LegendRow
                    amount={money(remaining)}
                    color={palette.track}
                    label="Remaining"
                    palette={palette}
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.comparisonCard,
                styles.card,
                !compact && styles.columnCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Compared with September
              </Text>
              <Text style={[styles.comparisonValue, { color: palette.accent }]}>
                +12.8%
              </Text>
              <Text
                style={[styles.comparisonCopy, { color: palette.secondary }]}
              >
                Revenue is trending ahead of last month. You have{" "}
                {money(remaining)} left to reach this month’s target.
              </Text>
              <View
                style={[
                  styles.comparisonRule,
                  { backgroundColor: palette.border },
                ]}
              />
              <Text style={[styles.updatedAt, { color: palette.muted }]}>
                {refreshCount === 0
                  ? "Last updated 2 minutes ago"
                  : "Updated just now"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.activityCard,
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.activityHeader}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Recent activity
              </Text>
              <Text style={[styles.activityCount, { color: palette.muted }]}>
                TODAY · 3
              </Text>
            </View>
            {recentRevenue.map((item) => (
              <ActivityRow key={item.id} {...item} palette={palette} />
            ))}
          </View>

          <Text style={[styles.disclaimer, { color: palette.muted }]}>
            Demo dashboard · Revenue figures are illustrative
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    paddingBottom: 28,
  },
  page: {
    alignSelf: "center",
    gap: 18,
    maxWidth: 760,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: "100%",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  brandLockup: { alignItems: "center", flexDirection: "row", gap: 10 },
  wordmark: { fontSize: 21, fontWeight: "800", letterSpacing: -0.8 },
  nativeBadge: {
    borderCurve: "continuous",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  nativeBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.25 },
  heading: { gap: 5, paddingBottom: 2, paddingTop: 4 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.15 },
  screenTitle: { fontSize: 31, fontWeight: "700", letterSpacing: -1.1 },
  screenSubtitle: { fontSize: 14, lineHeight: 19 },
  card: {
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  cardKicker: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.95,
    marginTop: 5,
  },
  actionButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 68,
    paddingHorizontal: 12,
  },
  actionButtonText: { fontSize: 12, fontWeight: "600" },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 20,
  },
  metricValue: {
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    letterSpacing: -1.45,
  },
  changePill: {
    borderCurve: "continuous",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  changeValue: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  metricCaption: { fontSize: 12, marginTop: 4 },
  chartDivider: { height: 1, marginBottom: 10, marginTop: 18 },
  chartHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
    paddingBottom: 2,
  },
  chartTitle: { fontSize: 12, fontWeight: "600" },
  chartFooter: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 12,
  },
  footerLabel: { fontSize: 10, marginBottom: 3 },
  footerValue: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  footerContext: { fontSize: 10, fontWeight: "400" },
  stackedCards: { gap: 14 },
  sideBySide: { flexDirection: "row", gap: 14 },
  columnCard: { flex: 1 },
  targetCard: { paddingBottom: 17 },
  targetHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  targetPercent: {
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  targetContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginTop: 18,
  },
  ringAmount: {
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    letterSpacing: -0.55,
  },
  ringSubline: { fontSize: 9, marginTop: 2 },
  legend: { flex: 1, gap: 14, minWidth: 122 },
  legendRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  legendDot: {
    borderCurve: "continuous",
    borderRadius: 3,
    height: 8,
    width: 8,
  },
  legendLabel: { flex: 1, fontSize: 11 },
  legendAmount: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  comparisonCard: { justifyContent: "center" },
  comparisonValue: {
    fontSize: 29,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    letterSpacing: -0.8,
    marginTop: 18,
  },
  comparisonCopy: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  comparisonRule: { height: StyleSheet.hairlineWidth, marginTop: 18 },
  updatedAt: { fontSize: 10, marginTop: 10 },
  activityCard: { paddingBottom: 8 },
  activityHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  activityCount: { fontSize: 9, fontWeight: "700", letterSpacing: 0.9 },
  activityRow: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 62,
    paddingVertical: 8,
  },
  activityMark: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    marginRight: 11,
    width: 36,
  },
  activityMarkInner: {
    borderCurve: "continuous",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  activityCopy: { flex: 1, gap: 3 },
  activityName: { fontSize: 12, fontWeight: "600" },
  activityDate: { fontSize: 10 },
  activityAmount: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  disclaimer: { fontSize: 10, paddingBottom: 8, textAlign: "center" },
});
