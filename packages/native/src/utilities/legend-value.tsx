import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useChartTheme } from "../theme";
import { useLegendItem } from "./legend-context";

export interface LegendValueProps {
  style?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  percentageStyle?: StyleProp<TextStyle>;
  showPercentage?: boolean;
  formatValue?: (value: number) => string;
  formatPercentage?: (percentage: number) => string;
}

export function LegendValue({
  style,
  valueStyle,
  percentageStyle,
  showPercentage = false,
  formatValue = (value) => value.toLocaleString(),
  formatPercentage = (percentage) => `${percentage.toFixed(0)}%`,
}: LegendValueProps) {
  const { item, percentage } = useLegendItem();
  const theme = useChartTheme();
  return (
    <View style={[styles.value, style]}>
      <Text style={[styles.valueText, { color: theme.textColor }, valueStyle]}>
        {formatValue(item.value)}
      </Text>
      {showPercentage &&
      item.maxValue !== undefined &&
      Number.isFinite(item.maxValue) &&
      item.maxValue > 0 ? (
        <Text
          style={[
            styles.percentage,
            { color: theme.textColor },
            percentageStyle,
          ]}
        >
          {formatPercentage(percentage)}
        </Text>
      ) : null}
    </View>
  );
}

LegendValue.displayName = "LegendValue";

const styles = StyleSheet.create({
  value: { alignItems: "center", flexDirection: "row", gap: 8 },
  valueText: { fontSize: 14, fontVariant: ["tabular-nums"] },
  percentage: { fontSize: 12, fontVariant: ["tabular-nums"] },
});
