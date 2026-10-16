export interface DateMarkerGroup<T> {
  date: Date;
  dateKey: string;
  markers: T[];
}

export interface MarkerFanBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface MarkerFanLayout {
  x: number;
  y: number;
  radius: number;
  orientation: "up" | "down";
}

export interface MarkerTouchTargetOffset {
  x: number;
  y: number;
}

/** Converts supported chart x values to dates without accepting invalid values. */
export function markerDate(value: unknown): Date | null {
  if (
    !(value instanceof Date) &&
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Uses the same local-calendar-day grouping as the web marker utility. */
export function markerDateKey(value: unknown): string | null {
  return markerDate(value)?.toDateString() ?? null;
}

export function groupMarkersByDate<T extends { date: Date }>(
  markers: readonly T[]
): DateMarkerGroup<T>[] {
  const groups = new Map<string, DateMarkerGroup<T>>();
  for (const marker of markers) {
    const date = markerDate(marker.date);
    if (!date) {
      continue;
    }
    const dateKey = date.toDateString();
    const existing = groups.get(dateKey);
    if (existing) {
      existing.markers.push(marker);
    } else {
      groups.set(dateKey, { date, dateKey, markers: [marker] });
    }
  }
  return [...groups.values()];
}

/** Positions a marker in the upward 160-degree fan used by the web chart. */
export function markerFanOffset(
  index: number,
  total: number,
  radius = 50,
  fanAngle = 160,
  orientation: "up" | "down" = "up"
): { x: number; y: number } {
  if (total <= 1) {
    return { x: 0, y: -radius };
  }
  const start = -90 - fanAngle / 2;
  const angle = start + (fanAngle * index) / (total - 1);
  const radians = (angle * Math.PI) / 180;
  const direction = orientation === "up" ? 1 : -1;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius * direction,
  };
}

function offsetExtents(
  total: number,
  radius: number,
  fanAngle: number,
  orientation: "up" | "down"
) {
  const offsets = Array.from({ length: total }, (_, index) =>
    markerFanOffset(index, total, radius, fanAngle, orientation)
  );
  return {
    maxX: Math.max(...offsets.map(({ x }) => x)),
    maxY: Math.max(...offsets.map(({ y }) => y)),
    minX: Math.min(...offsets.map(({ x }) => x)),
    minY: Math.min(...offsets.map(({ y }) => y)),
  };
}

function fitsVertically(
  anchorY: number,
  bounds: MarkerFanBounds,
  extents: ReturnType<typeof offsetExtents>,
  hitHalfSize: number
): boolean {
  return (
    anchorY + extents.minY - hitHalfSize >= bounds.top &&
    anchorY + extents.maxY + hitHalfSize <= bounds.bottom
  );
}

function resolveVerticalOrigin(
  anchorY: number,
  bounds: MarkerFanBounds,
  extents: ReturnType<typeof offsetExtents>,
  hitHalfSize: number
): number {
  const minimum = bounds.top + hitHalfSize - extents.minY;
  const maximum = bounds.bottom - hitHalfSize - extents.maxY;
  if (minimum > maximum) {
    return Math.max(bounds.top, Math.min(bounds.bottom, anchorY));
  }
  return Math.max(minimum, Math.min(maximum, anchorY));
}

/** Fits the fan and its touch targets inside the native SVG viewport. */
export function resolveMarkerFanLayout(
  anchorX: number,
  anchorY: number,
  bounds: MarkerFanBounds,
  {
    count,
    radius = 50,
    fanAngle = 160,
    hitSize = 44,
  }: {
    count: number;
    radius?: number;
    fanAngle?: number;
    hitSize?: number;
  }
): MarkerFanLayout {
  if (count <= 1) {
    return { orientation: "up", radius, x: anchorX, y: anchorY };
  }
  const width = Math.max(0, bounds.right - bounds.left);
  const height = Math.max(0, bounds.bottom - bounds.top);
  const hitHalfSize = hitSize / 2;
  const horizontalRadius = Math.max(0, width / 2 - hitHalfSize);
  const requestedRadius = Math.min(radius, horizontalRadius);
  const upExtents = offsetExtents(count, requestedRadius, fanAngle, "up");
  const downExtents = offsetExtents(count, requestedRadius, fanAngle, "down");
  const minimumX = bounds.left + requestedRadius + hitHalfSize;
  const maximumX = bounds.right - requestedRadius - hitHalfSize;
  const x =
    minimumX > maximumX
      ? (bounds.left + bounds.right) / 2
      : Math.max(minimumX, Math.min(maximumX, anchorX));

  if (fitsVertically(anchorY, bounds, upExtents, hitHalfSize)) {
    return { orientation: "up", radius: requestedRadius, x, y: anchorY };
  }
  if (fitsVertically(anchorY, bounds, downExtents, hitHalfSize)) {
    return { orientation: "down", radius: requestedRadius, x, y: anchorY };
  }

  const normalizedUp = offsetExtents(count, 1, fanAngle, "up");
  const normalizedDown = offsetExtents(count, 1, fanAngle, "down");
  const verticalRadius = (extents: ReturnType<typeof offsetExtents>) => {
    const offsetHeight = extents.maxY - extents.minY;
    if (offsetHeight <= 0) {
      return requestedRadius;
    }
    return Math.max(
      0,
      Math.min(requestedRadius, (height - hitSize) / offsetHeight)
    );
  };
  const downRadius = verticalRadius(normalizedDown);
  const upRadius = verticalRadius(normalizedUp);
  const orientation = downRadius > 0 ? "down" : "up";
  const fittedRadius = orientation === "down" ? downRadius : upRadius;
  const extents = offsetExtents(count, fittedRadius, fanAngle, orientation);

  return {
    orientation,
    radius: fittedRadius,
    x,
    y: resolveVerticalOrigin(anchorY, bounds, extents, hitHalfSize),
  };
}

/** Moves a marker's transparent touch box inward when its chart edge clips it. */
export function resolveMarkerTouchTargetOffset(
  anchorX: number,
  anchorY: number,
  localX: number,
  localY: number,
  size: number,
  bounds: MarkerFanBounds
): MarkerTouchTargetOffset {
  const resolveAxis = (
    anchor: number,
    local: number,
    minimum: number,
    maximum: number
  ) => {
    const start = anchor + local;
    const minOffset = minimum - start;
    const maxOffset = maximum - size - start;
    if (minOffset <= maxOffset) {
      return Math.max(minOffset, Math.min(maxOffset, 0));
    }
    return (minimum + maximum - size) / 2 - start;
  };

  return {
    x: resolveAxis(anchorX, localX, bounds.left, bounds.right),
    y: resolveAxis(anchorY, localY, bounds.top, bounds.bottom),
  };
}

export function nearestMarkerDataIndex<T extends Record<string, unknown>>(
  data: readonly T[],
  xDataKey: string,
  date: Date
): number | null {
  const target = date.getTime();
  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  data.forEach((row, index) => {
    const value = markerDate(row[xDataKey]);
    if (!value) {
      return;
    }
    const distance = Math.abs(value.getTime() - target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}
