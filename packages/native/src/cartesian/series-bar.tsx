/** Props shared with the web `SeriesBar` child in a ComposedChart. */
export interface SeriesBarProps {
  dataKey: string;
  fill?: string;
  stroke?: string;
  radius?: number;
  animate?: boolean;
  fadedOpacity?: number;
}

/**
 * Composable marker consumed by the native CartesianChart renderer.
 * It deliberately renders no view outside that chart context.
 */
export function SeriesBar(_props: SeriesBarProps): null {
  return null;
}

SeriesBar.displayName = "SeriesBar";
