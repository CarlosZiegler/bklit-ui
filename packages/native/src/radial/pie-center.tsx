import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useChartTheme } from "../theme";
import { usePieNative } from "./pie-context";

export interface PieCenterRenderProps {
  value: number;
  label: string;
  isHovered: boolean;
  data: { label: string; value: number; color?: string; fill?: string };
}

export interface PieCenterProps {
  defaultLabel?: string;
  children?: (props: PieCenterRenderProps) => ReactNode;
  prefix?: string;
  suffix?: string;
  valueStyle?: TextStyle;
  labelStyle?: TextStyle;
  style?: ViewStyle;
  formatValue?: (value: number) => string;
}

export function PieCenter({
  defaultLabel = "Total",
  children,
  prefix = "",
  suffix = "",
  valueStyle,
  labelStyle,
  style,
  formatValue = (value) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      value
    ),
}: PieCenterProps) {
  const { data, totalValue, innerRadius, hoveredIndex } = usePieNative();
  const theme = useChartTheme();
  if (innerRadius <= 0) {
    return null;
  }
  const selected = hoveredIndex === null ? undefined : data[hoveredIndex];
  const value = selected?.value ?? totalValue;
  const label = selected?.label ?? defaultLabel;
  const selectedData = selected ?? { label, value };
  return (
    <View
      pointerEvents="none"
      style={[
        styles.center,
        {
          width: Math.max(0, innerRadius * 2 - 16),
          height: Math.max(0, innerRadius * 2 - 16),
        },
        style,
      ]}
    >
      {children && selected ? (
        children({ value, label, isHovered: true, data: selectedData })
      ) : (
        <>
          <Text
            numberOfLines={1}
            selectable
            style={[styles.value, { color: theme.color }, valueStyle]}
          >
            {prefix}
            {formatValue(value)}
            {suffix}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: theme.textColor }, labelStyle]}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  value: {
    fontSize: 21,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    maxWidth: "100%",
  },
  label: { fontSize: 11, marginTop: 3, maxWidth: "100%" },
});

PieCenter.displayName = "PieCenter";
