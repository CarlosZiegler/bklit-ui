import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createGaugeNotches,
  createRoundedPolygonPath,
  interpolateGaugeColor,
} from "../gauge-geometry.ts";
import {
  clamp,
  createArcPath,
  createPieArcs,
  createRadarAreaPath,
} from "../geometry.ts";

const PATH_START = /^M/;
const PATH_ARC = /A/;
const PATH_CLOSE = /Z$/;
const PATH_QUADRATIC = /Q/;

describe("native radial geometry", () => {
  it("keeps pie arcs in input order and spans the requested angle", () => {
    const arcs = createPieArcs([
      { label: "first", value: 1 },
      { label: "second", value: 3 },
    ]);
    assert.deepEqual(
      arcs.map((arc) => arc.data.label),
      ["first", "second"]
    );
    assert.equal(arcs[0]?.startAngle, -Math.PI / 2);
    assert.equal(arcs[1]?.endAngle, (3 * Math.PI) / 2);
  });

  it("returns no slices for an all-zero pie", () => {
    assert.deepEqual(createPieArcs([{ label: "empty", value: 0 }]), []);
  });

  it("creates a padded rounded annular path", () => {
    const path = createArcPath(20, 50, -Math.PI / 2, Math.PI / 2, 4, 0.04);
    assert.match(path, PATH_START);
    assert.match(path, PATH_ARC);
    assert.match(path, PATH_CLOSE);
  });

  it("closes radar polygons and rejects fewer than three points", () => {
    assert.equal(
      createRadarAreaPath([
        { x: 0, y: -1 },
        { x: 1, y: 0 },
      ]),
      ""
    );
    assert.match(
      createRadarAreaPath([
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]),
      PATH_CLOSE
    );
  });

  it("clamps invalid and out-of-range progress values", () => {
    assert.equal(clamp(Number.NaN, 0, 1), 0);
    assert.equal(clamp(1.2, 0, 1), 1);
    assert.equal(clamp(-0.2, 0, 1), 0);
  });

  it("builds arc and linear gauge ticks with the expected active count", () => {
    const arc = createGaugeNotches({
      width: 280,
      height: 210,
      value: 50,
      totalNotches: 8,
    });
    const linear = createGaugeNotches({
      width: 240,
      height: 24,
      value: 25,
      totalNotches: 8,
      orientation: "linear",
    });
    assert.equal(arc.length, 8);
    assert.equal(arc.filter((notch) => notch.active).length, 4);
    assert.equal(linear.filter((notch) => notch.active).length, 2);
    assert.ok(
      arc.every(
        (notch) => notch.path.startsWith("M") && notch.path.endsWith("Z")
      )
    );
  });

  it("rounds notch corners and interpolates gradient endpoint colors", () => {
    const path = createRoundedPolygonPath(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 0, y: 10 },
      ],
      2
    );
    assert.match(path, PATH_QUADRATIC);
    assert.equal(interpolateGaugeColor("#000000", "#ffffff", 0.5), "#808080");
  });
});
