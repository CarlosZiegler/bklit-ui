import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveBrushTimeExtent,
  resolveBrushTimeSelection,
} from "../brush-layout-geometry";

test("brush overview preserves full time extent including a projection horizon", () => {
  const data = [
    { date: "2026-10-05" },
    { date: "invalid" },
    { date: new Date("2026-10-01") },
  ];
  const horizon = new Date("2026-10-10");
  const extent = resolveBrushTimeExtent(data, "date", horizon);
  assert.deepEqual(extent, [Date.parse("2026-10-01"), horizon.getTime()]);
  assert.deepEqual(resolveBrushTimeSelection(null, extent), {
    start: new Date("2026-10-01"),
    end: horizon,
  });
  assert.equal(
    resolveBrushTimeExtent([{ date: "invalid" }], "date", horizon),
    null
  );
});

test("brush zoom normalizes and clamps gestures without reversing the domain", () => {
  const extent = [1000, 5000] as const;
  assert.deepEqual(
    resolveBrushTimeSelection(
      { start: new Date(9000), end: new Date(3000) },
      extent
    ),
    {
      start: new Date(3000),
      end: new Date(5000),
    }
  );
  assert.deepEqual(
    resolveBrushTimeSelection({ start: Number.NaN, end: 3000 }, extent),
    {
      start: new Date(1000),
      end: new Date(5000),
    }
  );
  assert.equal(resolveBrushTimeSelection(null, null), null);
});
