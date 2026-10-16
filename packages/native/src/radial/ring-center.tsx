import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useChartTheme } from "../theme";
import { useRingNative } from "./ring-context";

export interface RingCenterRenderProps {
  value: number;
  label: string;
  isHovered: boolean;
  data: { label: string; value: number; maxValue: number; color?: string };
}

export interface RingCenterProps {
  defaultLabel?: string;
  children?: (props: RingCenterRenderProps) => ReactNode;
  prefix?: string;
  suffix?: string;
  valueStyle?: TextStyle;
  labelStyle?: TextStyle;
  style?: ViewStyle;
  formatValue?: (value: number) => string;
}

export function RingCenter({
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
}: RingCenterProps) {
  const { data, totalValue, baseInnerRadius, hoveredIndex } = useRingNative();
  const theme = useChartTheme();
  const selected = hoveredIndex === null ? undefined : data[hoveredIndex];
  const value = selected?.value ?? totalValue;
  const label = selected?.label ?? defaultLabel;
  const selectedData = selected ?? { label, value, maxValue: value };

  return (
    <View
      pointerEvents="none"
      style={[
        styles.center,
        {
          width: Math.max(0, baseInnerRadius * 2 - 16),
          height: Math.max(0, baseInnerRadius * 2 - 16),
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
    alignSelf: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 21,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    maxWidth: "100%",
  },
  label: { fontSize: 11, marginTop: 3, maxWidth: "100%" },
});

RingCenter.displayName = "RingCenter";
