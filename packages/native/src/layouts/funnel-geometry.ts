export interface FunnelStage {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
  gradient?: readonly { offset: string | number; color: string }[];
}

export interface FunnelGradientStop {
  offset: string | number;
  color: string;
}

export type FunnelOrientation = "horizontal" | "vertical";

export interface FunnelSegmentGeometry {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  normStart: number;
  normEnd: number;
}

export function createFunnelSegments(
  data: readonly FunnelStage[],
  width: number,
  height: number,
  orientation: FunnelOrientation = "horizontal",
  gap = 4
): FunnelSegmentGeometry[] {
  if (data.length === 0) {
    return [];
  }
  const max = data[0]?.value ?? 0;
  const safeMax = max > 0 ? max : 1;
  const safeGap = Math.max(0, gap);
  const horizontal = orientation === "horizontal";
  const segmentWidth =
    (width - (horizontal ? safeGap * (data.length - 1) : 0)) / data.length;
  const segmentHeight =
    (height - (horizontal ? 0 : safeGap * (data.length - 1))) / data.length;

  return data.map((stage, index) => ({
    index,
    x: horizontal ? (segmentWidth + safeGap) * index : 0,
    y: horizontal ? 0 : (segmentHeight + safeGap) * index,
    width: horizontal ? segmentWidth : width,
    height: horizontal ? height : segmentHeight,
    normStart: Math.max(0, stage.value / safeMax),
    normEnd: Math.max(
      0,
      (data[Math.min(index + 1, data.length - 1)]?.value ?? 0) / safeMax
    ),
  }));
}

export function funnelSegmentPath(
  normStart: number,
  normEnd: number,
  width: number,
  height: number,
  orientation: FunnelOrientation,
  layerScale = 1,
  straight = false
): string {
  const safeStart = Math.max(0, Math.min(1, normStart));
  const safeEnd = Math.max(0, Math.min(1, normEnd));
  if (orientation === "horizontal") {
    const midY = height / 2;
    const h0 = safeStart * height * 0.44 * layerScale;
    const h1 = safeEnd * height * 0.44 * layerScale;
    if (straight) {
      return `M 0 ${midY - h0} L ${width} ${midY - h1} L ${width} ${midY + h1} L 0 ${midY + h0} Z`;
    }
    const controlX = width * 0.55;
    return `M 0 ${midY - h0} C ${controlX} ${midY - h0}, ${width - controlX} ${midY - h1}, ${width} ${midY - h1} L ${width} ${midY + h1} C ${width - controlX} ${midY + h1}, ${controlX} ${midY + h0}, 0 ${midY + h0} Z`;
  }

  const midX = width / 2;
  const w0 = safeStart * width * 0.44 * layerScale;
  const w1 = safeEnd * width * 0.44 * layerScale;
  if (straight) {
    return `M ${midX - w0} 0 L ${midX - w1} ${height} L ${midX + w1} ${height} L ${midX + w0} 0 Z`;
  }
  const controlY = height * 0.55;
  return `M ${midX - w0} 0 C ${midX - w0} ${controlY}, ${midX - w1} ${height - controlY}, ${midX - w1} ${height} L ${midX + w1} ${height} C ${midX + w1} ${height - controlY}, ${midX + w0} ${controlY}, ${midX + w0} 0 Z`;
}
