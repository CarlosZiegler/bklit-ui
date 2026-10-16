import {
  Bar,
  BarChart,
  BarXAxis,
  BarYAxis,
  CartesianChart,
  ChartTooltip,
  Grid,
  HeatmapCells,
  HeatmapChart,
  HeatmapLegend,
  Line,
  LiveLineChart,
  Scatter,
  ScatterChart,
  XAxis,
} from "@bklitui/native";
import { useLocalSearchParams } from "expo-router";
import {
  Profiler,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollView, Text, View } from "react-native";
import {
  type FrameInfo,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

declare const __DEV__: boolean;

const cases = [
  { name: "line-100-static", kind: "line", count: 100, inspect: false },
  { name: "line-1000-selection", kind: "line", count: 1000, inspect: true },
  { name: "line-10000-selection", kind: "line", count: 10_000, inspect: true },
  { name: "bar-100-selection", kind: "bar", count: 100, inspect: true },
  { name: "scatter-300-selection", kind: "scatter", count: 300, inspect: true },
  { name: "heatmap-364-static", kind: "heatmap", count: 364, inspect: false },
  { name: "live-120", kind: "live", count: 120, inspect: false },
] as const;
const smallCases = [
  { name: "line-100-selection", kind: "line", count: 100, inspect: true },
  { name: "bar-12-selection", kind: "bar", count: 12, inspect: true },
  { name: "scatter-50-selection", kind: "scatter", count: 50, inspect: true },
] as const;
const freshFrames = () => ({
  lastTimestamp: 0,
  count: 0,
  totalMs: 0,
  maxMs: 0,
  over25ms: 0,
  over50ms: 0,
});
const percentile = (values: number[], ratio: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Number(
    (sorted[Math.floor((sorted.length - 1) * ratio)] ?? 0).toFixed(2)
  );
};

/** Developer audit route. Expo Go timings are not release-device certification. */
export default function PerformanceAudit() {
  const { suite } = useLocalSearchParams<{ suite?: string }>();
  const [caseIndex, setCaseIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const current = (suite === "small" ? smallCases : cases)[caseIndex];
  const frames = useSharedValue(freshFrames());
  const sampling = useSharedValue(false);
  const commits = useRef<{ name: string; values: number[] }>({
    name: "",
    values: [],
  });
  const sampleFrame = useCallback(
    ({ timestamp }: FrameInfo) => {
      "worklet";
      if (!sampling.value) {
        return;
      }
      frames.modify((value) => {
        if (value.lastTimestamp === 0) {
          value.lastTimestamp = timestamp;
          return value;
        }
        const delta = timestamp - value.lastTimestamp;
        value.lastTimestamp = timestamp;
        value.count += 1;
        value.totalMs += delta;
        value.maxMs = Math.max(value.maxMs, delta);
        if (delta > 25) {
          value.over25ms += 1;
        }
        if (delta > 50) {
          value.over50ms += 1;
        }
        return value;
      });
    },
    [frames, sampling]
  );
  useFrameCallback(sampleFrame);
  const data = useMemo(
    () =>
      Array.from({ length: current?.count ?? 0 }, (_, i) => ({
        x: i,
        a: 20 + Math.sin(i / 9) * 8,
        b: 18 + Math.cos(i / 13) * 6,
      })),
    [current]
  );
  const lineLayers = useMemo(
    () => (
      <>
        <Grid horizontal />
        <Line animate={false} dataKey="a" />
        <Line animate={false} dataKey="b" />
        <XAxis numTicks={3} />
        <ChartTooltip />
      </>
    ),
    []
  );
  const heatmap = useMemo(
    () =>
      Array.from({ length: 52 }, (_, week) => ({
        bin: week,
        bins: Array.from({ length: 7 }, (_, day) => ({
          bin: day,
          count: (week + day * 3) % 5,
          date: new Date(2026, 0, 4 + week * 7 + day),
        })),
      })),
    []
  );
  const liveData = useMemo(() => {
    const now = Date.now() / 1000;
    return data.map((row, i) => ({
      time: now - (data.length - i) * 0.12,
      value: row.a,
    }));
  }, [data]);
  useEffect(() => {
    if (!current) {
      return;
    }
    let ticker: ReturnType<typeof setInterval> | undefined;
    let finish: ReturnType<typeof setTimeout> | undefined;
    const drift: number[] = [];
    const warmup = setTimeout(() => {
      frames.value = freshFrames();
      sampling.value = true;
      let previous = performance.now();
      ticker = setInterval(() => {
        const now = performance.now();
        drift.push(Math.max(0, now - previous - 32));
        previous = now;
        if (current.inspect) {
          setSelectedIndex((value) => (value + 17) % current.count);
        }
      }, 32);
      finish = setTimeout(() => {
        clearInterval(ticker);
        sampling.value = false;
        // One read at the end; never synchronize the UI value on each JS tick.
        const ui = frames.value;
        const summary = JSON.stringify({
          name: current.name,
          environment: __DEV__ ? "development" : "production",
          windowMs: 5000,
          selectionIntervalMs: current.inspect ? 32 : null,
          ui: {
            ...ui,
            meanFrameMs: Number(
              (ui.totalMs / Math.max(1, ui.count)).toFixed(2)
            ),
          },
          jsTimerDriftP95Ms: percentile(drift, 0.95),
          react: {
            commits: commits.current.values.length,
            p95Ms: percentile(commits.current.values, 0.95),
            maxMs: percentile(commits.current.values, 1),
          },
        });
        console.info(`[BKLIT_PERF]${summary}`);
        setResults((previousResults) => [...previousResults, summary]);
        setCaseIndex((value) => value + 1);
        setSelectedIndex(0);
      }, 5000);
    }, 1500);
    return () => {
      clearTimeout(warmup);
      clearTimeout(finish);
      clearInterval(ticker);
      sampling.value = false;
    };
  }, [current, frames, sampling]);

  let chart: ReactNode = null;
  if (current?.kind === "line") {
    chart = (
      <CartesianChart
        data={data}
        height={240}
        selectedIndex={selectedIndex}
        xDataKey="x"
        xScale="linear"
      >
        {lineLayers}
      </CartesianChart>
    );
  }
  if (current?.kind === "scatter") {
    chart = (
      <ScatterChart
        data={data}
        height={240}
        selectedIndex={selectedIndex}
        xDataKey="x"
        xScale="linear"
      >
        <Scatter animate={false} dataKey="a" />
        <XAxis numTicks={3} />
      </ScatterChart>
    );
  }
  if (current?.kind === "bar") {
    chart = (
      <BarChart
        animationDuration={0}
        data={data}
        height={240}
        selectedIndex={selectedIndex}
        xDataKey="x"
      >
        <Bar animate={false} dataKey="a" />
        <Bar animate={false} dataKey="b" />
        <BarXAxis />
        <BarYAxis />
      </BarChart>
    );
  }
  if (current?.kind === "heatmap") {
    chart = (
      <HeatmapChart animate={false} data={heatmap}>
        <HeatmapCells />
        <HeatmapLegend />
      </HeatmapChart>
    );
  }
  if (current?.kind === "live") {
    chart = (
      <LiveLineChart data={liveData} height={240} value={25} window={18} />
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 24, color: "#111" }}>
          Native performance audit
        </Text>
        <Text style={{ color: "#444" }}>
          Simulator / Expo Go. UI frame intervals, JS timer drift and React
          development commits. 1.5s warmup + 5s per case. Selection updates are
          synthetic, not a touch-latency measurement.
        </Text>
        <Text style={{ color: "#111" }}>{current?.name ?? "Complete"}</Text>
        <View style={{ minHeight: 260 }}>
          <Profiler
            id={current?.name ?? "done"}
            onRender={(name, _phase, duration) => {
              if (commits.current.name !== name) {
                commits.current = { name, values: [] };
              }
              commits.current.values.push(duration);
            }}
          >
            {chart}
          </Profiler>
        </View>
        {results.map((result) => (
          <Text key={result} selectable style={{ color: "#111", fontSize: 11 }}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
