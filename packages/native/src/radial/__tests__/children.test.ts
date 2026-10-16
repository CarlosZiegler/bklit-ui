import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement, Fragment, isValidElement } from "react";
import { partitionChartChildren } from "../children";

function PieSlice() {
  return null;
}

function PieCenter() {
  return null;
}

function Ring() {
  return null;
}

function RingCenter() {
  return null;
}

describe("radial composed children", () => {
  it("moves PieCenter out of nested Fragments and keeps slices in the SVG", () => {
    const children = createElement(
      Fragment,
      null,
      createElement(PieSlice),
      createElement(Fragment, null, createElement(PieCenter))
    );
    const partition = partitionChartChildren(
      children,
      (child) => isValidElement(child) && child.type === PieCenter
    );

    assert.deepEqual(
      partition.chartChildren.map((child) =>
        isValidElement(child) ? child.type : null
      ),
      [PieSlice]
    );
    assert.deepEqual(
      partition.overlayChildren.map((child) =>
        isValidElement(child) ? child.type : null
      ),
      [PieCenter]
    );
  });

  it("moves RingCenter out of nested Fragments and keeps rings in the SVG", () => {
    const children = createElement(
      Fragment,
      null,
      createElement(Ring),
      createElement(Fragment, null, createElement(RingCenter))
    );
    const partition = partitionChartChildren(
      children,
      (child) => isValidElement(child) && child.type === RingCenter
    );

    assert.deepEqual(
      partition.chartChildren.map((child) =>
        isValidElement(child) ? child.type : null
      ),
      [Ring]
    );
    assert.deepEqual(
      partition.overlayChildren.map((child) =>
        isValidElement(child) ? child.type : null
      ),
      [RingCenter]
    );
  });
});
