import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useLegendItem } from "./legend-context";

export interface LegendMarkerProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function LegendMarker({ size = 10, style }: LegendMarkerProps) {
  const { item } = useLegendItem();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.marker,
        { backgroundColor: item.color, height: size, width: size },
        style,
      ]}
    />
  );
}

LegendMarker.displayName = "LegendMarker";

const styles = StyleSheet.create({
  marker: { borderRadius: 999, flexShrink: 0 },
});
