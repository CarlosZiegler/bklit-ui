import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProjectionPath,
  computeProjectionAnchorTangentSlope,
  projectionDateExtents,
  projectionValueExtents,
} from "../projection-utils";

const day = 86_400_000;
const start = Date.UTC(2026, 9, 1);
const sourceData = [10, 12, 14].map((value, index) => ({
  date: new Date(start + index * day).toISOString(),
  value,
}));

test("forecast modes preserve the historical anchor and cadence", () => {
  const auto = buildProjectionPath({
    sourceData,
    seriesKey: "value",
    mode: "auto",
    horizonPoints: 3,
  });
  assert.deepEqual(
    auto.map((point) => [point.date.getTime(), point.value]),
    [
      [start + 2 * day, 14],
      [start + 5 * day, 20],
    ]
  );
  const target = buildProjectionPath({
    sourceData,
    seriesKey: "value",
    mode: "target",
    endValue: 30,
    horizonPoints: 2,
  });
  assert.equal(target.at(-1)?.value, 30);
  assert.deepEqual(projectionDateExtents([auto, target]), {
    minTime: start + 2 * day,
    maxTime: start + 5 * day,
  });
  assert.deepEqual(projectionValueExtents([auto, target]), {
    minValue: 14,
    maxValue: 30,
  });
  assert.equal(
    computeProjectionAnchorTangentSlope(sourceData, "value") * day,
    2
  );
});

test("manual forecasts copy dates and early anchors exclude later history", () => {
  const points = [
    { date: new Date(start), value: 1 },
    { date: new Date(start + day), value: 4 },
  ];
  const manual = buildProjectionPath({
    sourceData: [],
    seriesKey: "value",
    mode: "manual",
    points,
  });
  assert.deepEqual(manual, points);
  assert.notEqual(manual[0]?.date, points[0]?.date);
  const forecast = buildProjectionPath({
    sourceData: [
      ...sourceData,
      { date: new Date(start + 3 * day).toISOString(), value: 500 },
    ],
    seriesKey: "value",
    mode: "auto",
    autoMethod: "lastSegment",
    startIndex: 1,
    horizonPoints: 1,
  });
  assert.equal(forecast.at(-1)?.value, 14);
  assert.deepEqual(
    buildProjectionPath({ sourceData: [], seriesKey: "value", mode: "auto" }),
    []
  );
});
