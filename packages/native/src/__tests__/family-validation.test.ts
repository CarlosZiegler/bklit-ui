import assert from "node:assert/strict";
import test from "node:test";
import { validateChartFamily } from "../../../chart-spec/src/validate";

test("portable heatmap dates must be valid ISO-compatible strings", () => {
  const columns = [
    { bin: 1, bins: [{ bin: 2, count: 3, date: "2026-10-15T00:00:00Z" }] },
  ];
  assert.equal(validateChartFamily("heatmap-chart", columns, {}), true);
  assert.equal(
    validateChartFamily(
      "heatmap-chart",
      [{ bin: 1, bins: [{ bin: 2, count: 3, date: "not a date" }] }],
      {}
    ),
    false
  );
});

test("Sankey transport rejects invalid indexes, negative flows and cycles before d3 layout", () => {
  const nodes = [{ name: "Visit" }, { name: "Paid" }];
  assert.equal(
    validateChartFamily(
      "sankey-chart",
      {
        nodes,
        links: [{ source: 0, target: 1, value: 5 }],
      },
      {}
    ),
    true
  );
  for (const links of [
    [{ source: 0, target: 7, value: 1 }],
    [{ source: 0, target: 1, value: -1 }],
    [
      { source: 0, target: 1, value: 1 },
      { source: 1, target: 0, value: 1 },
    ],
    [{ source: 0, target: 0, value: 1 }],
  ]) {
    assert.equal(
      validateChartFamily("sankey-chart", { nodes, links }, {}),
      false
    );
  }
});

test("radial and hierarchy specs require their actual native data contracts", () => {
  assert.equal(
    validateChartFamily("pie-chart", [{ label: "Mobile", value: 42 }], {}),
    true
  );
  assert.equal(
    validateChartFamily("ring-chart", [{ label: "Mobile", value: 42 }], {}),
    false
  );
  assert.equal(
    validateChartFamily(
      "radar-chart",
      [{ label: "Mobile", values: { speed: 42 } }],
      {
        metrics: [{ key: "speed", label: "Speed" }],
      }
    ),
    true
  );
  assert.equal(validateChartFamily("gauge-chart", [], { value: "42" }), false);
  assert.equal(
    validateChartFamily(
      "sunburst-chart",
      { name: "Total", children: [{ name: "Paid", value: 42 }] },
      {}
    ),
    true
  );
  assert.equal(
    validateChartFamily(
      "sunburst-chart",
      { name: "Total", children: [null] },
      {}
    ),
    false
  );
  assert.equal(
    validateChartFamily("pie-chart", [], {}, [{ type: "ring", index: 0 }]),
    false
  );
});

test("GeoJSON and OHLC specs reject malformed geometry and values", () => {
  const map = (coordinates: unknown) => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Example" },
        geometry: { type: "Polygon", coordinates },
      },
    ],
  });
  assert.equal(
    validateChartFamily(
      "choropleth-chart",
      map([
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ]),
      {}
    ),
    true
  );
  assert.equal(
    validateChartFamily("choropleth-chart", map(["invalid"]), {}),
    false
  );
  assert.equal(
    validateChartFamily(
      "candlestick-chart",
      [{ date: "2026-10-15", open: 5, close: 6, low: 4, high: 7 }],
      {}
    ),
    true
  );
  assert.equal(
    validateChartFamily(
      "candlestick-chart",
      [{ date: "2026-10-15", open: "5" }],
      {}
    ),
    false
  );
});
