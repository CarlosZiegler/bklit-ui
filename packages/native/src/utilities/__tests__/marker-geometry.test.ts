import assert from "node:assert/strict";
import test from "node:test";
import {
  groupMarkersByDate,
  markerDateKey,
  markerFanOffset,
  nearestMarkerDataIndex,
  resolveMarkerFanLayout,
  resolveMarkerTouchTargetOffset,
} from "../marker-geometry";

test("marker groups retain order and combine timestamps on a local calendar day", () => {
  const first = { date: new Date(2026, 9, 9, 9), title: "Release" };
  const sameDay = { date: new Date(2026, 9, 9, 18), title: "Incident" };
  const nextDay = { date: new Date(2026, 9, 10, 10), title: "Report" };

  const groups = groupMarkersByDate([first, sameDay, nextDay]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0]?.markers, [first, sameDay]);
  assert.equal(groups[0]?.dateKey, first.date.toDateString());
  assert.deepEqual(groups[1]?.markers, [nextDay]);
});

test("invalid x values do not create marker groups", () => {
  assert.equal(markerDateKey("not-a-date"), null);
  assert.deepEqual(groupMarkersByDate([{ date: new Date(Number.NaN) }]), []);
});

test("fan offsets match the left-to-right upward arc and stay finite", () => {
  const offsets = [0, 1, 2].map((index) => markerFanOffset(index, 3));

  assert.ok((offsets[0]?.x ?? 0) < 0);
  assert.ok((offsets[2]?.x ?? 0) > 0);
  assert.ok(offsets.every(({ y }) => y < 0));
  assert.equal(markerFanOffset(0, 1).y, -50);
});

test("fan layout keeps edge groups on-screen and flips down when the top is tight", () => {
  const bounds = { bottom: 242, left: 0, right: 320, top: 0 };
  const left = resolveMarkerFanLayout(38, 32, bounds, { count: 3 });
  const right = resolveMarkerFanLayout(302, 32, bounds, { count: 3 });
  const spacious = resolveMarkerFanLayout(120, 80, bounds, { count: 3 });

  assert.equal(left.orientation, "down");
  assert.equal(right.orientation, "down");
  assert.equal(spacious.orientation, "up");
  assert.equal(spacious.y, 80);
  assert.ok(left.x >= 72);
  assert.ok(right.x <= 248);

  for (const layout of [left, right, spacious]) {
    for (let index = 0; index < 3; index += 1) {
      const offset = markerFanOffset(
        index,
        3,
        layout.radius,
        160,
        layout.orientation
      );
      assert.ok(layout.x + offset.x - 22 >= bounds.left - 0.01);
      assert.ok(layout.x + offset.x + 22 <= bounds.right + 0.01);
      assert.ok(layout.y + offset.y - 22 >= bounds.top - 0.01);
      assert.ok(layout.y + offset.y + 22 <= bounds.bottom + 0.01);
    }
  }
});

test("fan radius adapts to a narrow chart viewport", () => {
  const layout = resolveMarkerFanLayout(
    50,
    32,
    { bottom: 220, left: 0, right: 100, top: 0 },
    { count: 3 }
  );

  assert.equal(layout.x, 50);
  assert.equal(layout.radius, 28);
  assert.equal(layout.orientation, "down");
});

test("collapsed marker hit targets shift inside the top and right chart edges", () => {
  const offset = resolveMarkerTouchTargetOffset(304, 25, -22, -30, 44, {
    bottom: 242,
    left: 0,
    right: 320,
    top: 0,
  });

  assert.equal(offset.x, -6);
  assert.equal(offset.y, 5);
});

test("marker taps select the closest valid chart row by date", () => {
  const data = [
    { date: new Date(2026, 9, 8) },
    { date: new Date(2026, 9, 10) },
    { date: new Date(Number.NaN) },
  ];

  assert.equal(
    nearestMarkerDataIndex(data, "date", new Date(2026, 9, 9, 16)),
    1
  );
  assert.equal(nearestMarkerDataIndex([], "date", new Date()), null);
});
