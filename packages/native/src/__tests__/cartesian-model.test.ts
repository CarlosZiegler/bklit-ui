import assert from "node:assert/strict";
import test from "node:test";
import { buildDomainTicks } from "../cartesian/geometry";
import { createCartesianModel } from "../cartesian-model";

test("large x domains avoid JavaScript argument-count limits", () => {
  const model = createCartesianModel({
    data: Array.from({ length: 200_000 }, (_, x) => ({ x })),
    dataKeys: [],
    width: 350,
    height: 240,
    xDataKey: "x",
    xScale: "linear",
  });
  assert.deepEqual(model.xDomain, [0, 199_999]);
  assert.equal(model.xPositions.at(-1), 1);
});

test("time scales place irregular dates by elapsed time and accept Date values", () => {
  const model = createCartesianModel({
    data: [
      { date: new Date("2026-01-01T00:00:00Z"), value: 10 },
      { date: "2026-01-03T00:00:00Z", value: 20 },
      { date: 1_767_916_800_000, value: 15 },
    ],
    dataKeys: ["value"],
    height: 100,
    width: 200,
    xDataKey: "date",
    xScale: "time",
  });

  assert.deepEqual(model.xPositions, [0, 0.25, 1]);
  assert.equal(model.xToRatio(new Date("2026-01-03T00:00:00Z")), 0.25);
});

test("domain ticks include projected x values beyond the plotted data", () => {
  const start = Date.parse("2026-10-01T00:00:00Z");
  const dataEnd = Date.parse("2026-10-07T00:00:00Z");
  const projectionEnd = Date.parse("2026-10-10T00:00:00Z");
  const model = createCartesianModel({
    additionalXValues: [projectionEnd],
    data: [
      { date: new Date(start), value: 10 },
      { date: new Date(dataEnd), value: 16 },
    ],
    dataKeys: ["value"],
    height: 100,
    width: 200,
    xDataKey: "date",
    xScale: "time",
  });

  const ticks = buildDomainTicks(model.xDomain, 4);
  assert.deepEqual(
    ticks.map((tick) => tick.value),
    [
      start,
      start + (projectionEnd - start) / 3,
      start + (2 * (projectionEnd - start)) / 3,
      projectionEnd,
    ]
  );
  assert.deepEqual(
    ticks.map((tick) => tick.ratio),
    [0, 1 / 3, 2 / 3, 1]
  );
});

test("an explicit time domain includes the segment crossing a window with no rows", () => {
  const start = Date.parse("2026-10-01T00:00:00Z");
  const end = Date.parse("2026-10-03T00:00:00Z");
  const domainStart = Date.parse("2026-10-02T00:00:00Z");
  const domainEnd = Date.parse("2026-10-02T12:00:00Z");
  const model = createCartesianModel({
    data: [
      { date: new Date(start), value: 10 },
      { date: new Date(end), value: 30 },
    ],
    dataKeys: ["value"],
    height: 120,
    width: 240,
    xDataKey: "date",
    xDomain: [domainStart, domainEnd],
    xScale: "time",
  });

  assert.deepEqual(model.xDomain, [domainStart, domainEnd]);
  assert.ok((model.xPositions[0] ?? 0) < 0);
  assert.ok((model.xPositions[1] ?? 1) > 1);
  assert.equal(model.xToRatio(domainStart), 0);
  assert.equal(model.xToRatio(domainEnd), 1);
  assert.deepEqual(model.yDomain, [8.4, 31.6]);
  assert.equal(model.geometries.get("value")?.points.length, 2);
});

test("invalid explicit domains fall back to the data extent", () => {
  const model = createCartesianModel({
    data: [
      { date: "2026-01-01T00:00:00Z", value: 10 },
      { date: "2026-01-02T00:00:00Z", value: 20 },
    ],
    dataKeys: ["value"],
    height: 100,
    width: 200,
    xDataKey: "date",
    xDomain: [Number.NaN, 0],
    xScale: "time",
  });

  assert.deepEqual(model.xPositions, [0, 1]);
  assert.deepEqual(model.yDomain, [9.2, 20.8]);
});

test("all requested series share a y domain while invalid values split geometry", () => {
  const model = createCartesianModel({
    data: [
      { date: "2026-01-01", a: 10, b: 100 },
      { date: "2026-01-02", a: Number.NaN, b: 80 },
      { date: "2026-01-03", a: 30, b: 60 },
      { date: "invalid", a: 1000, b: 1000 },
    ],
    dataKeys: ["a", "b"],
    height: 120,
    width: 240,
    xDataKey: "date",
    xScale: "time",
  });

  assert.deepEqual(model.xPositions, [0, 0.5, 1, null]);
  assert.deepEqual(model.yDomain, [2.8, 107.2]);
  assert.deepEqual(
    model.geometries.get("a")?.points.map(({ index }) => index),
    [0, 2]
  );
  assert.deepEqual(
    model.geometries.get("b")?.points.map(({ index }) => index),
    [0, 1, 2]
  );
});

test("empty rows and one-value domains return stable coordinate results", () => {
  const empty = createCartesianModel({
    data: [],
    dataKeys: ["value"],
    height: 80,
    width: 140,
    xDataKey: "date",
    xScale: "time",
  });
  assert.equal(empty.xDomain, null);
  assert.equal(empty.yDomain, null);
  assert.equal(empty.geometries.size, 0);
  assert.equal(empty.xToRatio("2026-01-01"), null);

  const flat = createCartesianModel({
    data: [{ date: "2026-01-01", value: 12 }],
    dataKeys: ["value"],
    height: 80,
    width: 140,
    xDataKey: "date",
    xScale: "time",
  });
  assert.deepEqual(flat.xPositions, [0.5]);
  assert.deepEqual(
    flat.geometries.get("value")?.points.map(({ x }) => x),
    [70]
  );
  assert.equal(flat.yToCoordinate(12), 40);
});

test("category positions are evenly spaced and x lookup uses original row index", () => {
  const model = createCartesianModel({
    data: [
      { label: "first", value: 3 },
      { label: "second", value: 5 },
      { label: "third", value: 4 },
    ],
    dataKeys: ["value"],
    height: 100,
    width: 210,
    xDataKey: "label",
    xScale: "category",
  });

  assert.deepEqual(model.xPositions, [0, 0.5, 1]);
  assert.equal(model.xToRatio(2), 1);
  assert.equal(model.xToRatio(3), null);
});

test("composed category series share inset band centers for bars and lines", () => {
  const model = createCartesianModel({
    categoryBandCenter: true,
    data: Array.from({ length: 6 }, (_, index) => ({
      label: `Month ${index + 1}`,
      revenue: index + 2,
      target: index + 3,
    })),
    dataKeys: ["revenue", "target"],
    height: 120,
    margin: { left: 8, right: 12 },
    width: 240,
    xDataKey: "label",
    xScale: "category",
  });

  const plotWidth = 240 - 8 - 12;
  const firstLinePoint = model.geometries.get("target")?.points[0];
  const lastLinePoint = model.geometries.get("target")?.points.at(-1);
  assert.equal(firstLinePoint?.x, 8 + plotWidth / 12);
  assert.equal(lastLinePoint?.x, 8 + (plotWidth * 11) / 12);
  assert.equal(model.xToRatio(0), 1 / 12);
  assert.equal(model.xToRatio(5), 11 / 12);
});
