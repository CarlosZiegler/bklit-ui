import { hierarchy, partition } from "d3-hierarchy";

export interface SunburstNode {
  name: string;
  value?: number;
  color?: string;
  fill?: string;
  children?: SunburstNode[];
}

export interface SunburstArc {
  id: string;
  name: string;
  depth: number;
  value: number;
  categoryIndex: number;
  hasChildren: boolean;
  trail: string[];
  parentId: string | null;
  a0: number;
  a1: number;
  arcIndex: number;
  color?: string;
  fill?: string;
}

export interface SunburstFocus {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  categoryIndex: number;
  a0: number;
  a1: number;
}

export interface SunburstArcGeometry {
  a0: number;
  a1: number;
  innerR: number;
  outerR: number;
}

export function buildSunburstArcs(data: SunburstNode) {
  const root = hierarchy(data).sum((node) =>
    node.children?.length ? 0 : Math.max(0, node.value ?? 0)
  );
  const maxDepth = Math.max(1, root.height);
  const partitionedRoot = partition<SunburstNode>().size([1, maxDepth + 1])(
    root
  );
  const arcs: SunburstArc[] = [];
  const focusById = new Map<string, SunburstFocus>();
  const idOf = (path: string[]) => path.join(" / ");

  partitionedRoot.eachBefore((node) => {
    const trailNodes = node.ancestors().reverse();
    const names = trailNodes.map((item) => item.data.name);
    const id = idOf(names);
    const parent = node.parent;
    const firstCategory = trailNodes[1];
    let categoryIndex = 0;
    if (node.depth === 1) {
      categoryIndex = node.parent?.children?.indexOf(node) ?? 0;
    } else if (node.depth > 1) {
      categoryIndex =
        firstCategory?.parent?.children?.indexOf(firstCategory) ?? 0;
    }
    const focus: SunburstFocus = {
      id,
      name: node.data.name,
      depth: node.depth,
      parentId: parent
        ? idOf(
            parent
              .ancestors()
              .reverse()
              .map((item) => item.data.name)
          )
        : null,
      categoryIndex,
      a0: -Math.PI / 2 + node.x0 * Math.PI * 2,
      a1: -Math.PI / 2 + node.x1 * Math.PI * 2,
    };
    focusById.set(id, focus);
    if (node.depth === 0) {
      return;
    }
    const arc: SunburstArc = {
      ...focus,
      value: node.value ?? 0,
      hasChildren: Boolean(node.children?.length),
      trail: names,
      arcIndex: arcs.length,
      color: node.data.color,
      fill: node.data.fill,
    };
    arcs.push(arc);
  });

  return {
    arcs,
    focusById,
    maxDepth,
    rootId: data.name,
    total: root.value ?? 0,
  };
}

export function sunburstRingOptions(
  focusDepth: number,
  maxDepth: number,
  radius: number
) {
  const oneLevelCenterR = radius / maxDepth;
  if (focusDepth === 0) {
    return { centerR: 0, ringWidth: oneLevelCenterR };
  }
  const depthPastFirstDrill = Math.max(0, focusDepth - 1);
  const centerScale = Math.max(0.45, 0.65 - depthPastFirstDrill * 0.08);
  const centerR = oneLevelCenterR * centerScale;
  const visibleRings = Math.max(1, maxDepth - focusDepth);
  return { centerR, ringWidth: (radius - centerR) / visibleRings };
}

export function sunburstGeometryFor(
  arc: SunburstArc,
  focus: SunburstFocus,
  maxDepth: number,
  radius: number
): SunburstArcGeometry | null {
  if (
    arc.depth <= focus.depth ||
    (arc.id !== focus.id && !arc.id.startsWith(`${focus.id} / `))
  ) {
    return null;
  }
  const { centerR, ringWidth } = sunburstRingOptions(
    focus.depth,
    maxDepth,
    radius
  );
  const relativeDepth = arc.depth - focus.depth;
  const focusSpan = focus.a1 - focus.a0;
  const mapAngle = (angle: number) =>
    focusSpan <= 1e-9
      ? -Math.PI / 2
      : -Math.PI / 2 + ((angle - focus.a0) / focusSpan) * Math.PI * 2;
  return {
    a0: mapAngle(arc.a0),
    a1: mapAngle(arc.a1),
    innerR: centerR + (relativeDepth - 1) * ringWidth,
    outerR: centerR + relativeDepth * ringWidth,
  };
}

export function sunburstHoverPadding(
  maxDepth: number,
  size: number,
  hoverPop: number
): number {
  const rootRingWidth = size / 2 / Math.max(1, maxDepth);
  const pathLength = Math.max(1, maxDepth - 1);
  const segmentGrow = Math.min(
    Math.max(0, hoverPop),
    (rootRingWidth * 0.28) / pathLength,
    rootRingWidth * 0.1
  );
  return Math.ceil(segmentGrow * pathLength + segmentGrow);
}

/** Keeps radial text upright in every quadrant. Angles use the chart's top-origin convention. */
export function sunburstLabelRotation(angle: number): number {
  let degrees = (angle * 180) / Math.PI - 90;
  if (degrees > 90) {
    degrees -= 180;
  }
  if (degrees < -90) {
    degrees += 180;
  }
  return degrees;
}

export function sunburstHoverGeometryFor(
  arc: SunburstArc,
  focus: SunburstFocus,
  hoveredArc: SunburstArc | null,
  maxDepth: number,
  radius: number,
  hoverPop: number
): SunburstArcGeometry | null {
  const base = sunburstGeometryFor(arc, focus, maxDepth, radius);
  if (!(base && hoveredArc) || hoverPop <= 0) {
    return base;
  }

  const { ringWidth } = sunburstRingOptions(focus.depth, maxDepth, radius);
  const pathLength = Math.max(1, hoveredArc.depth - focus.depth);
  const segmentGrow = Math.min(
    Math.max(0, hoverPop),
    (ringWidth * 0.28) / pathLength,
    ringWidth * 0.1
  );
  const hoveredParts = hoveredArc.id.split(" / ");
  const pathParts = hoveredParts.slice(0, hoveredArc.depth + 1);
  const grows = pathParts.slice(focus.depth + 1).map((_, index) => ({
    id: pathParts.slice(0, focus.depth + 2 + index).join(" / "),
    depth: focus.depth + 1 + index,
  }));
  const isOnPath = grows.some(({ id }) => id === arc.id);
  if (!(isOnPath || grows.some(({ id }) => arc.id.startsWith(`${id} / `)))) {
    return base;
  }

  let push = 0;
  for (const segment of grows) {
    if (segment.depth < arc.depth && arc.id.startsWith(`${segment.id} / `)) {
      push += segmentGrow;
    }
  }
  const ownGrow = isOnPath ? segmentGrow : 0;
  return {
    ...base,
    innerR: base.innerR + push,
    outerR: base.outerR + push + ownGrow,
  };
}

export function sunburstArcPath(geometry: SunburstArcGeometry): string {
  const start = geometry.a0;
  const end = geometry.a1;
  const large = end - start > Math.PI ? 1 : 0;
  const outerStartX = Math.sin(start) * geometry.outerR;
  const outerStartY = -Math.cos(start) * geometry.outerR;
  const outerEndX = Math.sin(end) * geometry.outerR;
  const outerEndY = -Math.cos(end) * geometry.outerR;
  if (geometry.innerR < 1) {
    return `M 0 0 L ${outerStartX} ${outerStartY} A ${geometry.outerR} ${geometry.outerR} 0 ${large} 1 ${outerEndX} ${outerEndY} Z`;
  }
  const innerEndX = Math.sin(end) * geometry.innerR;
  const innerEndY = -Math.cos(end) * geometry.innerR;
  const innerStartX = Math.sin(start) * geometry.innerR;
  const innerStartY = -Math.cos(start) * geometry.innerR;
  return `M ${outerStartX} ${outerStartY} A ${geometry.outerR} ${geometry.outerR} 0 ${large} 1 ${outerEndX} ${outerEndY} L ${innerEndX} ${innerEndY} A ${geometry.innerR} ${geometry.innerR} 0 ${large} 0 ${innerStartX} ${innerStartY} Z`;
}
