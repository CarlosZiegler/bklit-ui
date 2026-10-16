import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveLegendPercentage,
  resolveLegendProgressMetrics,
} from "../legend-values";

describe("legend values", () => {
  it("calculates the web-shaped percentage for a positive maximum", () => {
    assert.equal(resolveLegendPercentage(25, 100), 25);
  });

  it("returns zero percentage when the maximum is missing or nonpositive", () => {
    assert.equal(resolveLegendPercentage(10), 0);
    assert.equal(resolveLegendPercentage(10, 0), 0);
    assert.equal(resolveLegendPercentage(10, -1), 0);
    assert.equal(resolveLegendPercentage(10, Number.POSITIVE_INFINITY), 0);
  });

  it("clamps progress to its accessible maximum and visible range", () => {
    assert.deepEqual(resolveLegendProgressMetrics(120, 100), {
      maxValue: 100,
      ratio: 1,
      value: 100,
    });
    assert.deepEqual(resolveLegendProgressMetrics(-5, 100), {
      maxValue: 100,
      ratio: 0,
      value: 0,
    });
  });

  it("omits progress when maximum or value is invalid", () => {
    assert.equal(resolveLegendProgressMetrics(10), null);
    assert.equal(resolveLegendProgressMetrics(10, 0), null);
    assert.equal(resolveLegendProgressMetrics(10, -1), null);
    assert.equal(
      resolveLegendProgressMetrics(10, Number.POSITIVE_INFINITY),
      null
    );
    assert.equal(resolveLegendProgressMetrics(Number.NaN, 100), null);
  });
});
