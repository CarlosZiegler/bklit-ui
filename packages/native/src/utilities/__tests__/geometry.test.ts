import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCartesianModel } from "../../cartesian-model";
import {
  buildHorizontalTangentBezierPath,
  domainValueToRatio,
  ratioToDomainValue,
  resolveReferenceAreaRect,
} from "../geometry";

const margins = { top: 10, right: 20, bottom: 10, left: 10 };

function model() {
  const chartModel = createCartesianModel({
    data: [
      { x: 0, value: 0 },
      { x: 10, value: 10 },
    ],
    dataKeys: ["value"],
    height: 120,
    margin: margins,
    width: 220,
    xDataKey: "x",
    xScale: "linear",
    yDomain: [0, 10],
  });
  return {
    ...chartModel,
    xToRatio: (value: unknown) => {
      const numeric = typeof value === "number" ? value : Number.NaN;
      return Number.isFinite(numeric) ? numeric / 10 : null;
    },
  };
}

describe("native utility geometry", () => {
  it("maps x and y data bounds to full chart SVG coordinates", () => {
    assert.deepEqual(
      resolveReferenceAreaRect({
        width: 220,
        height: 120,
        margins,
        model: model(),
        x1: 2.5,
        x2: 7.5,
        y1: 2.5,
        y2: 7.5,
      }),
      { x: 57.5, y: 35, width: 95, height: 50 }
    );
  });

  it("normalizes reversed reference bounds without changing coverage", () => {
    const geometry = model();
    assert.deepEqual(
      resolveReferenceAreaRect({
        width: 220,
        height: 120,
        margins,
        model: geometry,
        x1: 7.5,
        x2: 2.5,
        y1: 7.5,
        y2: 2.5,
      }),
      { x: 57.5, y: 35, width: 95, height: 50 }
    );
  });

  it("clips hidden reference areas to the plot bounds", () => {
    assert.deepEqual(
      resolveReferenceAreaRect({
        width: 220,
        height: 120,
        margins,
        model: model(),
        x1: -10,
        x2: 4,
        y1: 5,
        ifOverflow: "hidden",
      }),
      { x: 10, y: 60, width: 76, height: 50 }
    );
  });

  it("discards overflow only when the entire area fits", () => {
    const options = {
      width: 220,
      height: 120,
      margins,
      model: model(),
      x1: 1,
      x2: 9,
      y1: 2,
      y2: 8,
    } as const;
    assert.ok(resolveReferenceAreaRect({ ...options, ifOverflow: "discard" }));
    assert.equal(
      resolveReferenceAreaRect({ ...options, x1: -1, ifOverflow: "discard" }),
      null
    );
  });

  it("keeps visible reference areas outside plot bounds", () => {
    const result = resolveReferenceAreaRect({
      width: 220,
      height: 120,
      margins,
      model: model(),
      x1: -2,
      x2: 2,
      y1: 2,
      y2: 8,
      ifOverflow: "visible",
    });
    assert.ok(result);
    assert.ok(result.x < margins.left);
  });

  it("maps category indices and snaps brush pixels to categories", () => {
    const domain = [0, 4] as const;
    assert.equal(domainValueToRatio(2, domain, "category"), 0.5);
    assert.equal(domainValueToRatio(2.5, domain, "category"), null);
    assert.equal(ratioToDomainValue(0.63, domain, "category", 5), 3);
  });

  it("keeps numeric brush endpoints on the domain and preserves time values", () => {
    assert.equal(ratioToDomainValue(-1, [10, 30], "linear", 0), 10);
    assert.equal(ratioToDomainValue(1.5, [10, 30], "linear", 0), 30);
    const time = new Date("2025-01-01T00:00:00Z");
    assert.equal(
      domainValueToRatio(time, [time.getTime(), time.getTime() + 1000], "time"),
      0
    );
  });

  it("builds the web-compatible horizontal-tangent Bézier path", () => {
    assert.equal(
      buildHorizontalTangentBezierPath(10, 20, 110, 40),
      "M 10,20 C 55,20 65,40 110,40"
    );
    assert.equal(buildHorizontalTangentBezierPath(5, 8, 5, 12), "M 5,8 L 5,12");
  });
});
