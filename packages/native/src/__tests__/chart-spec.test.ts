import assert from "node:assert/strict";
import test from "node:test";
import {
  type CartesianChartSpec,
  type ChartSpec,
  generateNativeCode,
  isChartSpec,
  parseChartSpec,
  toJsonValue,
} from "../../../chart-spec/src/index";

const lineSpec: CartesianChartSpec = {
  chart: "line-chart",
  data: [
    { date: "2026-01-01T00:00:00.000Z", revenue: 14 },
    { date: "2026-01-02T00:00:00.000Z", revenue: 22 },
  ],
  height: 220,
  layers: [
    {
      dataKey: "revenue",
      id: "revenue-line",
      stroke: "#7657e8",
      type: "line",
      visible: true,
    },
  ],
  motion: { duration: 450, enabled: true },
  options: {
    xDataKey: "date",
    xScale: "time",
    xAxis: { enabled: true, numTicks: 4, tickMode: "data" },
  },
  theme: {
    color: "#7657e8",
    scaleColors: ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"],
    seriesColors: ["#7657e8"],
  },
  version: 1,
};

test("portable specs normalize Date values and round trip through the protocol shape", () => {
  const data = toJsonValue([
    { when: new Date("2026-04-09T00:00:00Z"), value: 8 },
  ]);
  assert.deepEqual(data, [{ when: "2026-04-09T00:00:00.000Z", value: 8 }]);
  assert.equal(isChartSpec(lineSpec), true);
  assert.deepEqual(parseChartSpec(JSON.stringify(lineSpec)), lineSpec);
});

test("spec validation rejects non-finite data and invalid cartesian layers", () => {
  assert.throws(
    () => toJsonValue({ value: Number.NaN }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("non-finite")
  );
  assert.equal(
    isChartSpec({
      ...lineSpec,
      layers: [{ id: "bad", type: "script", visible: true }],
    }),
    false
  );
  assert.equal(
    isChartSpec({
      ...lineSpec,
      theme: { scaleColors: ["#111", "#222", "#333", "#444"] },
    }),
    false
  );
});

test("native codegen emits compositional source from serializable settings", () => {
  const code = generateNativeCode(lineSpec);
  assert.ok(code.includes("LineChart"));
  assert.ok(code.includes('from "@bklitui/native"'));
  assert.ok(code.includes('xScale={"time"}'));
  assert.ok(
    code.includes(
      '"scaleColors":["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899"]'
    )
  );
  assert.ok(code.includes('<Line dataKey={"revenue"}'));
  assert.equal(code.includes("eval("), false);
});

test("choropleth codegen preserves the feature value key", () => {
  const spec = {
    chart: "choropleth-chart",
    data: { type: "FeatureCollection", features: [] },
    height: 320,
    layers: [{ id: "features", type: "feature", visible: true }],
    motion: { duration: 600, enabled: true },
    options: { valueDataKey: "populationDensity" },
    theme: {},
    version: 1,
  } satisfies ChartSpec;
  const code = generateNativeCode(spec);
  assert.ok(
    code.includes('<ChoroplethFeature valueDataKey={"populationDensity"} />')
  );
});

test("Gauge codegen forwards the Studio motion duration", () => {
  const spec = {
    chart: "gauge-chart",
    data: [],
    height: 240,
    layers: [],
    motion: { duration: 640, enabled: true },
    options: { value: 72 },
    theme: {},
    version: 1,
  } satisfies ChartSpec;
  const code = generateNativeCode(spec);
  assert.ok(code.includes("animationDuration={640}"));
});

test("Live line codegen disables smoothing without pausing the stream", () => {
  const spec = {
    chart: "live-line-chart",
    data: [{ time: 1, value: 12 }],
    height: 240,
    layers: [{ dataKey: "value", id: "live", type: "line", visible: true }],
    motion: { duration: 640, enabled: false },
    options: { paused: false, pulse: true, xDataKey: "time", xScale: "linear" },
    theme: {},
    version: 1,
  } satisfies ChartSpec;
  const code = generateNativeCode(spec);
  assert.ok(code.includes("lerpSpeed={1}"));
  assert.ok(code.includes("paused={false}"));
  assert.ok(code.includes("pulse={false}"));
});
