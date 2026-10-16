import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import type { NativeChartRange } from "../chart-context";
import {
  resolveBrushTimeExtent,
  resolveBrushTimeSelection,
} from "./brush-layout-geometry";

export interface ChartBrushLayoutState {
  xDomain: [Date, Date] | undefined;
  xDomainSlotCount: number | undefined;
  brushSelection: NativeChartRange | null;
  onBrushSelectionChange: (selection: NativeChartRange | null) => void;
}

export interface ChartBrushLayoutProps {
  data: readonly object[];
  xDataKey?: string;
  xExtentMax?: Date;
  enabled: boolean;
  height: number;
  fitMainContent?: boolean;
  style?: StyleProp<ViewStyle>;
  children: (layout: ChartBrushLayoutState) => ReactNode;
  brushStrip?: (layout: ChartBrushLayoutState) => ReactNode;
}

/** The same render-prop composition as web: a zoomed main chart and full-data strip. */
export function ChartBrushLayout({
  data,
  xDataKey = "date",
  xExtentMax,
  enabled,
  height,
  fitMainContent = false,
  style,
  children,
  brushStrip,
}: ChartBrushLayoutProps) {
  const extent = useMemo(
    () => resolveBrushTimeExtent(data, xDataKey, xExtentMax),
    [data, xDataKey, xExtentMax]
  );
  const [brushSelection, setBrushSelection] = useState<NativeChartRange | null>(
    () => resolveBrushTimeSelection(null, extent)
  );
  useEffect(() => {
    setBrushSelection(resolveBrushTimeSelection(null, extent));
  }, [extent]);
  const onBrushSelectionChange = useCallback(
    (selection: NativeChartRange | null) =>
      setBrushSelection(resolveBrushTimeSelection(selection, extent)),
    [extent]
  );
  const layout = useMemo<ChartBrushLayoutState>(
    () => ({
      xDomain:
        enabled && brushSelection
          ? [new Date(brushSelection.start), new Date(brushSelection.end)]
          : undefined,
      xDomainSlotCount: enabled ? data.length : undefined,
      brushSelection,
      onBrushSelectionChange,
    }),
    [enabled, brushSelection, data.length, onBrushSelectionChange]
  );
  return (
    <View style={[styles.root, { gap: fitMainContent ? 4 : 12 }, style]}>
      <View style={styles.main}>{children(layout)}</View>
      {enabled && brushStrip ? (
        <View style={{ height: Math.max(1, height) }}>
          {brushStrip(layout)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "stretch", minWidth: 0 },
  main: { minWidth: 0 },
});
