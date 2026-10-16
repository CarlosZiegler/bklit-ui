import { type StyleProp, StyleSheet, Text, type TextStyle } from "react-native";
import { useChartTheme } from "../theme";
import { useLegendItem } from "./legend-context";

export interface LegendLabelProps {
  style?: StyleProp<TextStyle>;
}

export function LegendLabel({ style }: LegendLabelProps) {
  const { item } = useLegendItem();
  const theme = useChartTheme();
  return (
    <Text style={[styles.label, { color: theme.textColor }, style]}>
      {item.label}
    </Text>
  );
}

LegendLabel.displayName = "LegendLabel";

const styles = StyleSheet.create({
  label: { flexShrink: 1, fontSize: 14, fontWeight: "500" },
});
