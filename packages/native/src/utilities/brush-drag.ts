export type BrushDragMode = "create" | "start" | "end" | "move";

/** Choose a handle, the selected window, or a new range with finger-sized hit areas. */
export function brushDragMode(
  x: number,
  selection: readonly [number, number] | null,
  hitSlop = 22
): BrushDragMode {
  if (!selection) {
    return "create";
  }
  const [start, end] = selection;
  if (
    Math.abs(x - start) <= hitSlop &&
    Math.abs(x - start) <= Math.abs(x - end)
  ) {
    return "start";
  }
  if (Math.abs(x - end) <= hitSlop) {
    return "end";
  }
  return x > start && x < end ? "move" : "create";
}

/** Move a brush window without changing its width; resize handles stay ordered. */
export function dragBrushPixels(
  mode: BrushDragMode,
  origin: number,
  current: number,
  selection: readonly [number, number] | null,
  width: number
): [number, number] {
  const clamp = (value: number) => Math.max(0, Math.min(width, value));
  if (!selection || mode === "create") {
    return [
      Math.min(clamp(origin), clamp(current)),
      Math.max(clamp(origin), clamp(current)),
    ];
  }
  const [start, end] = selection;
  const delta = current - origin;
  if (mode === "move") {
    const bounded = Math.max(-start, Math.min(width - end, delta));
    return [start + bounded, end + bounded];
  }
  return mode === "start"
    ? [Math.min(end, clamp(start + delta)), end]
    : [start, Math.max(start, clamp(end + delta))];
}
