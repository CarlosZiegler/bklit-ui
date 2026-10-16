export interface HeatmapBin {
  count: number;
  bin: number;
  date: Date;
}

export interface HeatmapColumn {
  bin: number;
  bins: HeatmapBin[];
}

export interface HeatmapCellGeometry {
  column: number;
  row: number;
  bin: HeatmapBin;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeatmapGeometry {
  cells: HeatmapCellGeometry[];
  cellSize: number;
  height: number;
  width: number;
}

export interface HeatmapMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type HeatmapWeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function buildHeatmapCells(
  columns: readonly HeatmapColumn[],
  cellSize: number,
  margin: HeatmapMargin,
  gap: number,
  weekStartDay: HeatmapWeekStartDay
): HeatmapCellGeometry[] {
  const cells: HeatmapCellGeometry[] = [];
  columns.forEach((column, columnIndex) => {
    const bins =
      weekStartDay === 0
        ? column.bins
        : [
            ...column.bins.slice(weekStartDay),
            ...column.bins.slice(0, weekStartDay),
          ];
    bins.forEach((bin, rowIndex) => {
      cells.push({
        bin,
        column: columnIndex,
        row: rowIndex,
        x: margin.left + columnIndex * cellSize,
        y: margin.top + rowIndex * cellSize,
        width: Math.max(0, cellSize - gap),
        height: Math.max(0, cellSize - gap),
      });
    });
  });
  return cells;
}

export function filterHeatmapColumns(
  columns: readonly HeatmapColumn[],
  xDomain?: readonly [Date, Date]
): HeatmapColumn[] {
  if (!xDomain) {
    return [...columns];
  }
  const start = Math.min(xDomain[0].getTime(), xDomain[1].getTime());
  const end = Math.max(xDomain[0].getTime(), xDomain[1].getTime());
  return columns.filter((column) => {
    const weekStart = column.bins[0]?.date.getTime();
    const weekEnd = column.bins.at(-1)?.date.getTime();
    return (
      weekStart != null &&
      weekEnd != null &&
      weekEnd >= start &&
      weekStart <= end
    );
  });
}

export function heatmapContributionLevel(
  count: number | null | undefined
): number {
  if (!(count && count > 0)) {
    return 0;
  }
  return Math.min(4, Math.ceil(count));
}

export function createHeatmapGeometry(
  columns: readonly HeatmapColumn[],
  width: number,
  options: {
    binSize?: number;
    gap?: number;
    margin?: Partial<HeatmapMargin>;
    weekStartDay?: HeatmapWeekStartDay;
    fixedHeight?: number;
    layout?: "fluid" | "fill";
    sizingColumnCount?: number;
  } = {}
): HeatmapGeometry {
  const margin: HeatmapMargin = {
    top: options.margin?.top ?? 28,
    right: options.margin?.right ?? 16,
    bottom: options.margin?.bottom ?? 0,
    left: options.margin?.left ?? 40,
  };
  const gap = Math.max(0, options.gap ?? 2);
  const rows = Math.max(1, ...columns.map((column) => column.bins.length));
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const binSize = Math.max(0, options.binSize ?? 0);
  const sizingColumnCount = options.sizingColumnCount ?? columns.length;
  const naturalCellSize =
    sizingColumnCount > 0 ? innerWidth / sizingColumnCount : 0;
  const cellSize = binSize > 0 ? binSize : naturalCellSize;
  const plotHeight = rows * cellSize;
  const height =
    options.layout === "fill"
      ? Math.max(
          options.fixedHeight ?? 160,
          margin.top + plotHeight + margin.bottom
        )
      : margin.top + plotHeight + margin.bottom;
  const weekStartDay = options.weekStartDay ?? 0;
  const cells = buildHeatmapCells(columns, cellSize, margin, gap, weekStartDay);

  return {
    cells,
    cellSize,
    height,
    width:
      options.binSize && columns.length > 0
        ? margin.left + columns.length * cellSize + margin.right
        : width,
  };
}

export function heatmapColumnSeparatorOffset(
  columnIndex: number,
  every: number | undefined,
  spacing: number | undefined
): number {
  const interval = Math.floor(every ?? 0);
  const gap = Math.max(0, spacing ?? 0);
  if (interval < 1 || gap === 0) {
    return 0;
  }
  return Math.floor(columnIndex / interval) * gap;
}

export function addHeatmapColumnSeparators(
  geometry: HeatmapGeometry,
  columnCount: number,
  every: number | undefined,
  spacing: number | undefined
): HeatmapGeometry {
  const gap = Math.max(0, spacing ?? 0);
  const interval = Math.floor(every ?? 0);
  if (interval < 1 || gap === 0 || columnCount < 2) {
    return geometry;
  }
  const separatorCount = Math.floor((columnCount - 1) / interval);
  return {
    ...geometry,
    cells: geometry.cells.map((cell) => ({
      ...cell,
      x: cell.x + heatmapColumnSeparatorOffset(cell.column, every, spacing),
    })),
    width: geometry.width + separatorCount * gap,
  };
}
