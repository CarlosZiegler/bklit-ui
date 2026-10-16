export interface LegendProgressMetrics {
  maxValue: number;
  ratio: number;
  value: number;
}

export function resolveLegendPercentage(
  value: number,
  maxValue?: number
): number {
  if (
    !Number.isFinite(value) ||
    maxValue === undefined ||
    !Number.isFinite(maxValue) ||
    maxValue <= 0
  ) {
    return 0;
  }
  return (value / maxValue) * 100;
}

export function resolveLegendProgressMetrics(
  value: number,
  maxValue?: number
): LegendProgressMetrics | null {
  if (
    !Number.isFinite(value) ||
    maxValue === undefined ||
    !Number.isFinite(maxValue) ||
    maxValue <= 0
  ) {
    return null;
  }
  const boundedValue = Math.max(0, Math.min(maxValue, value));
  return {
    maxValue,
    ratio: boundedValue / maxValue,
    value: boundedValue,
  };
}
