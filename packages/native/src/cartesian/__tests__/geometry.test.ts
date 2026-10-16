import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { curveBasis } from "d3-shape";
import {
  buildBarNumericTicks,
  buildLinePath,
  buildSeriesAreaPath,
  buildSeriesLinePath,
  format24HourTime,
  insetPlotRatio,
  isHorizontalPan,
  projectBarRectangles,
  projectCandles,
  readNativeX,
  resolveEndpointTextAnchor,
  resolveRatioTextAnchor,
  resolveTickCountForWidth,
  resolveValueDomain,
  selectReadableTickIndices,
  selectTickIndices,
} from "../geometry";
import { splitProfitLossSegments } from "../profit-loss-line";

const LINEAR_PATH = /^M0,2L4,1$/;

describe("native Cartesian geometry", () => {
  it("keeps full candle bodies and scatter highlight rings inside both plot edges", () => {
    const plot = { left: 48, top: 12, width: 240, height: 120 };
    const data = [
      { open: 4, high: 6, low: 2, close: 5 },
      { open: 5, high: 7, low: 3, close: 4 },
    ];
    const candles = projectCandles({
      data,
      xPositions: [0, 1].map((ratio) =>
        insetPlotRatio(ratio, plot.width, plot.width / 4)
      ),
      plot,
      domain: [0, 8],
    });
    for (const candle of candles) {
      assert.ok(candle.x - candle.width / 2 >= plot.left);
      assert.ok(candle.x + candle.width / 2 <= plot.left + plot.width);
    }
    const radius = 10;
    const left = insetPlotRatio(0, plot.width, radius + 2) * plot.width;
    const right = insetPlotRatio(1, plot.width, radius + 2) * plot.width;
    assert.ok(left - radius >= 2);
    assert.ok(right + radius <= plot.width - 2 + 1e-9);
    assert.equal(insetPlotRatio(0.5, 0, radius), 0.5);
  });
  it("pads domains around mixed positive and negative values", () => {
    const domain = resolveValueDomain(
      [{ gain: 10, loss: -5 }],
      ["gain", "loss"]
    );
    assert.ok(domain[0] < -5);
    assert.ok(domain[1] > 10);
  });

  it("keeps one-sided positive bar domains anchored at zero like the web chart", () => {
    assert.deepEqual(
      resolveValueDomain(
        [
          { revenue: 26, target: 31 },
          { revenue: 47, target: 37 },
        ],
        ["revenue", "target"]
      ),
      [0, 51.7]
    );
    assert.deepEqual(resolveValueDomain([{ value: 0 }], ["value"]), [0, 1]);
  });

  it("places grouped columns in separate bands and maps value height", () => {
    const bars = projectBarRectangles({
      data: [{ a: 5, b: 10 }],
      dataKeys: ["a", "b"],
      plot: { left: 0, top: 0, width: 100, height: 80 },
      domain: [0, 10],
      barGap: 0,
      barWidth: 20,
      groupGaps: [4],
    });
    assert.equal(bars.length, 2);
    assert.equal(bars[0]?.x, 28);
    assert.equal(bars[1]?.x, 52);
    assert.equal(bars[0]?.height, 40);
    assert.equal(bars[1]?.height, 80);
  });

  it("clamps requested grouped-bar widths to narrow category slots", () => {
    const data = Array.from({ length: 6 }, (_, index) => ({
      a: 20 + index,
      b: 25 + index,
    }));
    const plot = { left: 48, top: 12, width: 260, height: 200 };
    const barGap = 0.22;
    const groupGap = 4;
    const bandWidth = plot.width / data.length;
    const sidePadding = (bandWidth * barGap) / 2;
    const bars = projectBarRectangles({
      data,
      dataKeys: ["a", "b"],
      plot,
      domain: [0, 40],
      barGap,
      barWidth: 30,
      maxBarWidth: 52,
      groupGaps: [groupGap],
    });

    assert.equal(bars.length, data.length * 2);
    for (let index = 0; index < data.length; index += 1) {
      const group = bars.filter((bar) => bar.dataIndex === index);
      const first = group.find((bar) => bar.seriesIndex === 0);
      const second = group.find((bar) => bar.seriesIndex === 1);
      const slotStart = plot.left + index * bandWidth;
      assert.ok(first && second);
      assert.ok(first.x >= slotStart + sidePadding - 1e-8);
      assert.ok(
        second.x + second.width <= slotStart + bandWidth - sidePadding + 1e-8
      );
      assert.ok(Math.abs(second.x - (first.x + first.width) - groupGap) < 1e-8);
    }
  });

  it("projects horizontal bars from the value baseline", () => {
    const [bar] = projectBarRectangles({
      data: [{ value: 5 }],
      dataKeys: ["value"],
      plot: { left: 10, top: 4, width: 100, height: 60 },
      domain: [0, 10],
      orientation: "horizontal",
      barGap: 0,
    });
    assert.deepEqual(
      { x: bar?.x, y: bar?.y, width: bar?.width, height: bar?.height },
      { x: 10, y: 4, width: 50, height: 60 }
    );
  });

  it("stacks mixed signs independently and creates segment gaps", () => {
    const bars = projectBarRectangles({
      data: [{ positive: 5, negative: -3, next: 4 }],
      dataKeys: ["positive", "negative", "next"],
      plot: { left: 0, top: 0, width: 60, height: 100 },
      domain: [-5, 10],
      stacked: true,
      barGap: 0,
      barWidth: 20,
      stackGap: 2,
    });
    assert.equal(bars.length, 3);
    assert.equal(bars[0]?.x, bars[2]?.x);
    assert.ok((bars[0]?.height ?? 0) < (5 / 15) * 100);
    assert.ok((bars[1]?.height ?? 0) < (3 / 15) * 100);
  });

  it("skips malformed OHLC records and keeps candle width bounded to a slot", () => {
    const candles = projectCandles({
      data: [
        { date: "2026-01-01", open: 4, high: 8, low: 2, close: 6 },
        { date: "2026-01-02", open: 2, high: 1, low: 0, close: Number.NaN },
      ],
      xPositions: [0.5, 1],
      plot: { left: 10, top: 10, width: 80, height: 100 },
      domain: [0, 10],
      candleWidth: 50,
    });
    assert.equal(candles.length, 1);
    assert.equal(candles[0]?.width, 40);
    assert.equal(candles[0]?.positive, true);
  });

  it("splits profit/loss paths at interpolated crossings and exact zeroes", () => {
    const crossing = splitProfitLossSegments([2, -2], [0, 10]);
    assert.equal(crossing.length, 2);
    assert.equal(crossing[0]?.isPositive, true);
    assert.equal(crossing[0]?.points.at(-1)?.x, 5);
    assert.equal(crossing[1]?.isPositive, false);

    const zeroAndGap = splitProfitLossSegments(
      [2, 0, -3, Number.NaN, 4],
      [0, 1, 2, 3, 4]
    );
    assert.deepEqual(
      zeroAndGap.map((segment) => segment.isPositive),
      [true, false, true]
    );
  });

  it("accepts time and numeric x values and builds native SVG paths", () => {
    assert.equal(
      readNativeX("2026-01-01T00:00:00Z", "time"),
      Date.parse("2026-01-01T00:00:00Z")
    );
    assert.equal(readNativeX("3.5", "linear"), 3.5);
    assert.match(
      buildLinePath(
        [
          { x: 0, y: 2 },
          { x: 4, y: 1 },
        ],
        "linear"
      ),
      LINEAR_PATH
    );
  });

  it("applies web-compatible curves without bridging missing-data gaps", () => {
    const points = [
      { index: 0, x: 0, y: 10 },
      { index: 1, x: 10, y: 20 },
      { index: 3, x: 30, y: 12 },
      { index: 4, x: 40, y: 18 },
    ];
    const line = buildSeriesLinePath(points, curveBasis);
    const area = buildSeriesAreaPath(points, 30, curveBasis);

    assert.equal((line.match(/M/g) ?? []).length, 2);
    assert.equal((area.match(/Z/g) ?? []).length, 2);
  });

  it("keeps first and last axis labels inside the plot bounds", () => {
    assert.equal(resolveEndpointTextAnchor(0, 8), "start");
    assert.equal(resolveEndpointTextAnchor(7, 8), "end");
    assert.equal(resolveEndpointTextAnchor(3, 8), "middle");
    assert.equal(resolveEndpointTextAnchor(0, 1), "middle");
    assert.equal(resolveRatioTextAnchor(0), "start");
    assert.equal(resolveRatioTextAnchor(1), "end");
    assert.equal(resolveRatioTextAnchor(0.5), "middle");
  });

  it("selects readable endpoint-preserving ticks for longer date series", () => {
    assert.deepEqual(selectTickIndices(7), [0, 2, 3, 5, 6]);
    assert.deepEqual(selectTickIndices(3), [0, 1, 2]);
    assert.deepEqual(selectTickIndices(0), []);
  });

  it("honors requested date-axis tick counts while preserving both endpoints", () => {
    const indices = selectReadableTickIndices(
      Array.from({ length: 7 }, (_, index) => `Oct ${9 + index}`),
      Array.from({ length: 7 }, (_, index) => index / 6),
      260,
      3
    );
    assert.deepEqual(indices, [0, 3, 6]);
  });

  it("skips labels whose real time positions would overlap near the endpoint", () => {
    const indices = selectReadableTickIndices(
      Array.from({ length: 7 }, (_, index) => `Oct ${9 + index}`),
      [0, 0.2, 0.4, 0.6, 0.8, 0.88, 1],
      260,
      7
    );
    assert.equal(indices[0], 0);
    assert.equal(indices.at(-1), 6);
    assert.ok(!indices.includes(5));
  });

  it("reduces date-axis density as accessible font scale grows", () => {
    const labels = Array.from({ length: 7 }, () => "October 15");
    const positions = Array.from({ length: 7 }, (_, index) => index / 6);
    const regular = selectReadableTickIndices(labels, positions, 260, 5, 1);
    const enlarged = selectReadableTickIndices(labels, positions, 260, 5, 1.5);
    assert.ok(enlarged.length < regular.length);
  });

  it("formats live time labels compactly and adapts tick count to plot width", () => {
    const localTime = new Date(2026, 0, 1, 22, 57, 6).getTime();
    assert.equal(format24HourTime(localTime), "22:57:06");
    assert.equal(format24HourTime(Number.NaN), "");
    assert.equal(resolveTickCountForWidth(5, 244), 4);
    assert.equal(resolveTickCountForWidth(5, 150), 3);
    assert.equal(resolveTickCountForWidth(2, 320), 2);
  });

  it("claims horizontal chart scrubs but leaves vertical movement to scroll", () => {
    assert.equal(isHorizontalPan(2, 0), false);
    assert.equal(isHorizontalPan(24, 10), true);
    assert.equal(isHorizontalPan(-24, 10), true);
    assert.equal(isHorizontalPan(10, 24), false);
    assert.equal(isHorizontalPan(20, 20), false);
  });

  it("uses clean zero-based value ticks for positive bar domains", () => {
    const ticks = buildBarNumericTicks([0, 51.7], 5, "vertical");
    assert.deepEqual(
      ticks.map((tick) => tick.value),
      [50, 40, 30, 20, 10, 0]
    );
    assert.ok(ticks.every((tick) => tick.ratio >= 0 && tick.ratio <= 1));
  });
});
