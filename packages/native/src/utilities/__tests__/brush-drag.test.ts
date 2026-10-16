import assert from "node:assert/strict";
import test from "node:test";
import { brushDragMode, dragBrushPixels } from "../brush-drag";

test("brush handles have touch hit areas and the window pans at constant width", () => {
  assert.equal(brushDragMode(35, [40, 140]), "start");
  assert.equal(brushDragMode(155, [40, 140]), "end");
  assert.equal(brushDragMode(90, [40, 140]), "move");
  assert.equal(brushDragMode(190, [40, 140]), "create");
  assert.deepEqual(
    dragBrushPixels("move", 90, 200, [40, 140], 220),
    [120, 220]
  );
  assert.deepEqual(dragBrushPixels("move", 90, 0, [40, 140], 220), [0, 100]);
});

test("brush resizing cannot reverse handles or exceed its plot", () => {
  assert.deepEqual(
    dragBrushPixels("start", 40, 200, [40, 140], 220),
    [140, 140]
  );
  assert.deepEqual(dragBrushPixels("end", 140, 0, [40, 140], 220), [40, 40]);
  assert.deepEqual(dragBrushPixels("create", 180, -20, null, 220), [0, 180]);
});
