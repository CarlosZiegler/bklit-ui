import {
  Area,
  AreaChart,
  ChartStatFlow,
  ChartThemeProvider,
  Line,
  LineChart,
} from "@bklitui/native";
import { curveBasis, curveCardinal } from "d3-shape";
import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "../lib/theme";

const revenueSeries = [
  { date: new Date("2024-01-01"), value: 5200 },
  { date: new Date("2024-02-01"), value: 6100 },
  { date: new Date("2024-03-01"), value: 5400 },
  { date: new Date("2024-04-01"), value: 4700 },
  { date: new Date("2024-05-01"), value: 5100 },
  { date: new Date("2024-06-01"), value: 6800 },
  { date: new Date("2024-07-01"), value: 6400 },
  { date: new Date("2024-08-01"), value: 7200 },
  { date: new Date("2024-09-01"), value: 6900 },
  { date: new Date("2024-10-01"), value: 8100 },
  { date: new Date("2024-11-01"), value: 7600 },
  { date: new Date("2024-12-01"), value: 8800 },
] as const;

const sessionsSeries = [
  { date: new Date("2024-06-03"), value: 920 },
  { date: new Date("2024-06-04"), value: 1380 },
  { date: new Date("2024-06-05"), value: 1120 },
  { date: new Date("2024-06-06"), value: 1580 },
  { date: new Date("2024-06-07"), value: 1240 },
  { date: new Date("2024-06-08"), value: 1710 },
  { date: new Date("2024-06-09"), value: 1460 },
] as const;

const revenueAverage =
  revenueSeries.reduce((sum, point) => sum + point.value, 0) /
  revenueSeries.length;
const sessionsAverage = Math.round(
  sessionsSeries.reduce((sum, point) => sum + point.value, 0) /
    sessionsSeries.length
);
const HEX_COLOR_PATTERN = /^[\da-f]{6}$/i;

function isDarkSurface(color: string): boolean {
  const hex = color.replace("#", "");
  if (!HEX_COLOR_PATTERN.test(hex)) {
    return false;
  }
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255 < 0.4;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function weekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

function periodTrend(
  data: readonly { value: number }[],
  index: number
): number | null {
  const previous = data[index - 1]?.value;
  const current = data[index]?.value;
  if (
    index <= 0 ||
    previous === undefined ||
    current === undefined ||
    previous === 0
  ) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function TrendBadge({ palette, value }: { palette: Palette; value: number }) {
  const positive = value >= 0;
  const dark = isDarkSurface(palette.page);
  let color = "#dc2626";
  let background = "#fef2f2";
  if (positive && dark) {
    color = "#34d399";
    background = "#12312b";
  } else if (positive) {
    color = "#059669";
    background = "#ecfdf5";
  } else if (dark) {
    color = "#f87171";
    background = "#3b2022";
  }
  const label = `${positive ? "Up" : "Down"} ${Math.abs(value).toFixed(1)} percent`;

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.trendBadge,
        {
          backgroundColor: background,
          borderColor: positive
            ? "rgba(16,185,129,0.2)"
            : "rgba(239,68,68,0.2)",
        },
      ]}
    >
      <Text style={[styles.trendIcon, { color }]}>{positive ? "↑" : "↓"}</Text>
      <Text style={[styles.trendValue, { color }]}>
        {positive ? "+" : ""}
        {value.toFixed(1)}%
      </Text>
    </View>
  );
}

function MetricReadout({
  align = "flex-start",
  label,
  palette,
  value,
  formatOptions,
}: {
  align?: "flex-end" | "flex-start";
  label: string;
  palette: Palette;
  value: number;
  formatOptions?: Intl.NumberFormatOptions;
}) {
  return (
    <ChartStatFlow
      animated
      formatOptions={formatOptions}
      label={label}
      labelStyle={{
        color: palette.secondary,
        textAlign: align === "flex-end" ? "right" : "left",
      }}
      style={[styles.metricReadout, { alignItems: align }]}
      value={value}
      valueStyle={{
        color: palette.text,
        textAlign: align === "flex-end" ? "right" : "left",
      }}
    />
  );
}

function BlockCard({
  children,
  palette,
  title,
  trend,
}: {
  children: ReactNode;
  palette: Palette;
  title: string;
  trend: number;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>
        <TrendBadge palette={palette} value={trend} />
      </View>
      {children}
    </View>
  );
}

function StatCardArea({
  chartHeight,
  palette,
}: {
  chartHeight: number;
  palette: Palette;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const selected =
    selectedIndex === undefined ? undefined : revenueSeries[selectedIndex];
  const selectedTrend =
    selectedIndex === undefined
      ? null
      : periodTrend(revenueSeries, selectedIndex);
  const displayTrend = selectedTrend ?? 12.4;
  const dark = isDarkSurface(palette.page);
  const areaColor = dark ? "#27272a" : "#44403c";
  const chartTheme = {
    color: areaColor,
    gridColor: palette.grid,
    seriesColors: [areaColor],
    surfaceColor: palette.surface,
    textColor: palette.secondary,
    trackColor: palette.track,
  } as const;

  return (
    <BlockCard palette={palette} title="Total Revenue" trend={displayTrend}>
      <View style={styles.areaContent}>
        <MetricReadout
          formatOptions={{
            currency: "USD",
            maximumFractionDigits: 0,
            style: "currency",
          }}
          label={selected ? monthLabel(selected.date) : "Avg"}
          palette={palette}
          value={selected?.value ?? revenueAverage}
        />
        <View style={[styles.chartBleed, { height: chartHeight }]}>
          <ChartThemeProvider theme={chartTheme}>
            <AreaChart
              accessibilityLabel="Total revenue by month. Swipe across the chart to inspect a month."
              animationDuration={750}
              data={revenueSeries}
              height={chartHeight}
              margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
              onSelectIndex={setSelectedIndex}
              selectedIndex={selectedIndex}
              xDataKey="date"
              xScale="time"
            >
              <Area
                curve={curveCardinal.tension(0.65)}
                dataKey="value"
                fill={areaColor}
                fillOpacity={0.45}
                gradientToOpacity={0}
                stroke={areaColor}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartThemeProvider>
        </View>
      </View>
    </BlockCard>
  );
}

function StatCardLine({
  chartHeight,
  palette,
}: {
  chartHeight: number;
  palette: Palette;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const selected =
    selectedIndex === undefined ? undefined : sessionsSeries[selectedIndex];
  const selectedTrend =
    selectedIndex === undefined
      ? null
      : periodTrend(sessionsSeries, selectedIndex);
  const displayTrend = selectedTrend ?? 8.2;
  const dark = isDarkSurface(palette.page);
  const lineColor = dark ? "#71717a" : "#a8a29e";
  const chartTheme = {
    color: lineColor,
    gridColor: palette.grid,
    seriesColors: [lineColor],
    surfaceColor: palette.surface,
    textColor: palette.secondary,
    trackColor: palette.track,
  } as const;

  return (
    <BlockCard palette={palette} title="Active Sessions" trend={displayTrend}>
      <View style={styles.lineContent}>
        <View style={[styles.chartBleed, { height: chartHeight }]}>
          <ChartThemeProvider theme={chartTheme}>
            <LineChart
              accessibilityLabel="Active sessions by day. Swipe across the chart to inspect a day."
              animationDuration={750}
              data={sessionsSeries}
              height={chartHeight}
              margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
              onSelectIndex={setSelectedIndex}
              selectedIndex={selectedIndex}
              xDataKey="date"
              xScale="time"
            >
              <Line
                curve={curveBasis}
                dataKey="value"
                fadeEdges={true}
                stroke={lineColor}
              />
            </LineChart>
          </ChartThemeProvider>
          <View pointerEvents="none" style={styles.lineMetricOverlay}>
            <MetricReadout
              align="flex-end"
              label={selected ? weekdayLabel(selected.date) : "Avg"}
              palette={palette}
              value={selected?.value ?? sessionsAverage}
            />
          </View>
        </View>
      </View>
    </BlockCard>
  );
}

/** Native adaptations of stat-card-area-01 and stat-card-line-01. */
export function NativeBlocks({
  palette,
  width,
}: {
  palette: Palette;
  width: number;
}) {
  const chartHeight = Math.max(124, Math.min(176, (width - 36) / 2.5));
  return (
    <View style={styles.blockList}>
      <StatCardArea chartHeight={chartHeight} palette={palette} />
      <StatCardLine chartHeight={chartHeight} palette={palette} />
    </View>
  );
}

const styles = StyleSheet.create({
  areaContent: {
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  blockList: { gap: 14 },
  card: {
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  chartBleed: {
    marginBottom: -12,
    marginHorizontal: -16,
    overflow: "hidden",
  },
  lineContent: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  lineMetricOverlay: {
    bottom: 16,
    position: "absolute",
    right: 16,
  },
  metricLabel: { fontSize: 12, lineHeight: 16 },
  metricReadout: { alignItems: "flex-start", gap: 1 },
  metricValue: {
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    letterSpacing: -1.1,
    lineHeight: 34,
  },
  trendBadge: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendIcon: { fontSize: 12, fontWeight: "700", lineHeight: 14 },
  trendValue: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
});
