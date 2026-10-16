import assert from "node:assert/strict";
import test from "node:test";
import {
  choroplethScaleLevel,
  choroplethValueColor,
  choroplethValueDomain,
  createChoroplethGraticulePath,
  createChoroplethPaths,
  createChoroplethProjection,
} from "../choropleth-geometry";
import { createFunnelSegments, funnelSegmentPath } from "../funnel-geometry";
import {
  addHeatmapColumnSeparators,
  createHeatmapGeometry,
  filterHeatmapColumns,
  type HeatmapColumn,
  heatmapColumnSeparatorOffset,
  heatmapContributionLevel,
} from "../heatmap-geometry";
import { sampleChoroplethData, sampleHeatmapData } from "../samples";
import { createSankeyLayout, sankeyLinkPath } from "../sankey-geometry";
import {
  buildSunburstArcs,
  sunburstArcPath,
  sunburstGeometryFor,
  sunburstHoverGeometryFor,
  sunburstHoverPadding,
  sunburstLabelRotation,
} from "../sunburst-geometry";

const FUNNEL_PATH_START = /^M 0 /;
const CLOSED_PATH_END = / Z$/;
const SANKEY_PATH_START = /^M[\d.-]+,[\d.-]+C/;
const SVG_PATH_START = /^M /;
const SVG_PATH_ANY_START = /^M/;

test("the heatmap gallery sample exercises every contribution intensity", () => {
  const levels = new Set(
    sampleHeatmapData.flatMap((column) =>
      column.bins.map((bin) => heatmapContributionLevel(bin.count))
    )
  );
  assert.deepEqual([...levels].sort(), [0, 1, 2, 3, 4]);
});

function heatmapColumn(
  bin: number,
  firstDay: string,
  counts: number[]
): HeatmapColumn {
  const first = new Date(`${firstDay}T00:00:00.000Z`);
  return {
    bin,
    bins: counts.map((count, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      return { bin: index, count, date };
    }),
  };
}

test("heatmap contribution levels are capped and treat absent values as empty", () => {
  assert.deepEqual(
    [undefined, null, 0, 1, 2.4, 9].map(heatmapContributionLevel),
    [0, 0, 0, 1, 3, 4]
  );
});

test("heatmap range filtering includes boundary weeks and geometry rotates the weekday order", () => {
  const columns = [
    heatmapColumn(0, "2026-01-04", [1, 2, 3, 4, 5, 6, 7]),
    heatmapColumn(1, "2026-01-11", [8, 9, 10, 11, 12, 13, 14]),
    heatmapColumn(2, "2026-01-18", [15, 16, 17, 18, 19, 20, 21]),
  ];
  const filtered = filterHeatmapColumns(columns, [
    new Date("2026-01-10T00:00:00Z"),
    new Date("2026-01-12T00:00:00Z"),
  ]);
  assert.deepEqual(
    filtered.map((column) => column.bin),
    [0, 1]
  );
  const geometry = createHeatmapGeometry(filtered, 240, {
    gap: 2,
    weekStartDay: 1,
  });
  assert.equal(geometry.cells[0]?.bin.count, 2);
  assert.equal(geometry.cells[0]?.row, 0);
  assert.equal(geometry.cells[1]?.bin.count, 3);
  assert.equal(geometry.cells[0]?.width, geometry.cellSize - 2);
});

test("heatmap column separators add only interior group spacing and align month labels", () => {
  const columns = Array.from({ length: 5 }, (_, column) =>
    heatmapColumn(column, "2026-01-04", [1])
  );
  const base = createHeatmapGeometry(columns, 240, { gap: 2 });
  const spaced = addHeatmapColumnSeparators(base, columns.length, 2, 6);
  assert.equal(spaced.width, base.width + 12);
  assert.equal(spaced.cells[1]?.x, base.cells[1]?.x);
  assert.equal(spaced.cells[2]?.x, (base.cells[2]?.x ?? 0) + 6);
  assert.equal(spaced.cells[4]?.x, (base.cells[4]?.x ?? 0) + 12);
  assert.equal(heatmapColumnSeparatorOffset(4, 2, 6), 12);
  assert.equal(addHeatmapColumnSeparators(base, columns.length, 0.5, 6), base);
});

test("funnel segment geometry preserves the value taper in horizontal and vertical layouts", () => {
  const data = [
    { label: "Visits", value: 100 },
    { label: "Trials", value: 40 },
    { label: "Paid", value: 10 },
  ];
  const horizontal = createFunnelSegments(data, 300, 120, "horizontal", 6);
  const vertical = createFunnelSegments(data, 180, 240, "vertical", 6);
  assert.deepEqual(
    horizontal.map((segment) => [segment.x, segment.width]),
    [
      [0, 96],
      [102, 96],
      [204, 96],
    ]
  );
  assert.deepEqual(
    horizontal.map((segment) => [segment.normStart, segment.normEnd]),
    [
      [1, 0.4],
      [0.4, 0.1],
      [0.1, 0.1],
    ]
  );
  const firstVerticalSegment = vertical[0];
  assert.ok(firstVerticalSegment);
  assert.equal(vertical[1]?.y, firstVerticalSegment.height + 6);
  assert.match(
    funnelSegmentPath(1, 0.4, 96, 120, "horizontal"),
    FUNNEL_PATH_START
  );
  assert.match(
    funnelSegmentPath(1, 0.4, 180, 76, "vertical", 1, true),
    CLOSED_PATH_END
  );
});

test("Sankey uses d3-sankey node placement and creates link paths from resolved nodes", () => {
  const graph = createSankeyLayout(
    {
      nodes: [{ name: "Input" }, { name: "Review" }, { name: "Done" }],
      links: [
        { source: 0, target: 1, value: 12 },
        { source: 1, target: 2, value: 7 },
      ],
    },
    240,
    120,
    14,
    10
  );
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.links.length, 2);
  const firstNode = graph.nodes[0];
  const secondNode = graph.nodes[1];
  const thirdNode = graph.nodes[2];
  const firstLink = graph.links[0];
  assert.ok(firstNode && secondNode && thirdNode && firstLink);
  assert.ok(
    (firstNode.x0 ?? Number.NEGATIVE_INFINITY) <
      (secondNode.x0 ?? Number.NEGATIVE_INFINITY)
  );
  assert.ok(
    (secondNode.x0 ?? Number.NEGATIVE_INFINITY) <
      (thirdNode.x0 ?? Number.NEGATIVE_INFINITY)
  );
  assert.ok((firstLink.width ?? 0) > 0);
  assert.match(sankeyLinkPath(firstLink), SANKEY_PATH_START);
});

test("sunburst hierarchy values, drilldown focus, and arc paths remain internally consistent", () => {
  const layout = buildSunburstArcs({
    name: "Portfolio",
    children: [
      {
        name: "A",
        children: [
          { name: "A1", value: 6 },
          { name: "A2", value: 4 },
        ],
      },
      { name: "B", value: 10 },
    ],
  });
  assert.equal(layout.total, 20);
  assert.deepEqual(
    layout.arcs.map((arc) => arc.name),
    ["A", "A1", "A2", "B"]
  );
  assert.equal(layout.arcs[0]?.value, 10);
  const focus = layout.focusById.get("Portfolio / A");
  const arc = layout.arcs[1];
  assert.ok(focus);
  assert.ok(arc);
  const geometry = sunburstGeometryFor(arc, focus, layout.maxDepth, 90);
  assert.ok(geometry);
  assert.ok(geometry.innerR < geometry.outerR);
  assert.match(sunburstArcPath(geometry), SVG_PATH_START);
});

test("sunburst touch focus expands the selected path and reserves view-box padding", () => {
  const layout = buildSunburstArcs({
    name: "Portfolio",
    children: [
      {
        name: "A",
        children: [
          { name: "A1", value: 6 },
          { name: "A2", value: 4 },
        ],
      },
    ],
  });
  const focus = layout.focusById.get("Portfolio");
  const ancestor = layout.arcs.find((arc) => arc.id === "Portfolio / A");
  const hovered = layout.arcs.find((arc) => arc.id === "Portfolio / A / A1");
  const sibling = layout.arcs.find((arc) => arc.id === "Portfolio / A / A2");
  assert.ok(focus && ancestor && hovered && sibling);
  const baseHover = sunburstGeometryFor(hovered, focus, layout.maxDepth, 90);
  assert.ok(baseHover);
  const grownHover = sunburstHoverGeometryFor(
    hovered,
    focus,
    hovered,
    layout.maxDepth,
    90,
    8
  );
  assert.ok(grownHover);
  const baseSibling = sunburstGeometryFor(sibling, focus, layout.maxDepth, 90);
  assert.ok(baseSibling);
  const shiftedSibling = sunburstHoverGeometryFor(
    sibling,
    focus,
    hovered,
    layout.maxDepth,
    90,
    8
  );
  assert.ok(shiftedSibling);
  assert.ok(grownHover.outerR > baseHover.outerR);
  assert.ok(shiftedSibling.innerR > baseSibling.innerR);
  assert.equal(sunburstHoverPadding(layout.maxDepth, 520, 8), 16);
});

test("sunburst label rotation keeps labels upright in both left and right quadrants", () => {
  assert.equal(sunburstLabelRotation((-135 * Math.PI) / 180), -45);
  assert.equal(sunburstLabelRotation((-45 * Math.PI) / 180), 45);
  assert.equal(sunburstLabelRotation((45 * Math.PI) / 180), -45);
  assert.equal(sunburstLabelRotation((135 * Math.PI) / 180), 45);
});

test("Choropleth projects real Natural Earth countries to SVG paths offline", () => {
  assert.ok(sampleChoroplethData.features.length > 100);
  const projection = createChoroplethProjection(360, 203);
  const paths = createChoroplethPaths(sampleChoroplethData, projection);
  assert.equal(paths.length, sampleChoroplethData.features.length);
  assert.ok(paths.filter(Boolean).length > 100);
  assert.match(createChoroplethGraticulePath(projection), SVG_PATH_ANY_START);
});

test("Choropleth sequential bins span the feature value domain and center constants", () => {
  const domain = choroplethValueDomain([null, "n/a", 5, 10, 20]);
  assert.deepEqual(domain, [5, 20]);
  assert.equal(choroplethScaleLevel(5, 5, 20, 5), 0);
  assert.equal(choroplethScaleLevel(10, 5, 20, 5), 1);
  assert.equal(choroplethScaleLevel(20, 5, 20, 5), 4);
  assert.equal(choroplethScaleLevel(99, 5, 20, 5), 4);
  assert.equal(choroplethScaleLevel(3, 3, 3, 5), 2);
  assert.equal(choroplethValueDomain([null, Number.NaN, "10"]), null);
  assert.equal(
    choroplethValueColor(
      5,
      domain,
      ["lowest", "low", "mid", "high", "top"],
      "neutral"
    ),
    "lowest"
  );
  assert.equal(
    choroplethValueColor(
      20,
      domain,
      ["lowest", "low", "mid", "high", "top"],
      "neutral"
    ),
    "top"
  );
  assert.equal(
    choroplethValueColor(undefined, domain, ["low"], "neutral"),
    "neutral"
  );
  assert.equal(choroplethValueColor(5, null, ["low"], "neutral"), "neutral");
});
