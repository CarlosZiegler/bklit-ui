import {
  cloneElement,
  isValidElement,
  type ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useChartTheme } from "../theme";
import {
  type LegendItemData,
  LegendItemProvider,
  LegendProvider,
} from "./legend-context";
import { resolveLegendPercentage } from "./legend-values";

export interface LegendProps {
  items: LegendItemData[];
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  title?: string;
  titleStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  children: ReactElement;
}

export function Legend({
  items,
  hoveredIndex: controlledHoveredIndex,
  onHoverChange,
  title,
  titleStyle,
  style,
  children,
}: LegendProps) {
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<
    number | null
  >(null);
  const theme = useChartTheme();
  const isControlled = controlledHoveredIndex !== undefined;
  const hoveredIndex = isControlled
    ? controlledHoveredIndex
    : internalHoveredIndex;
  const setHoveredIndex = useCallback(
    (index: number | null) => {
      if (!isControlled) {
        setInternalHoveredIndex(index);
      }
      onHoverChange?.(index);
    },
    [isControlled, onHoverChange]
  );
  const contextValue = useMemo(
    () => ({ items, hoveredIndex, setHoveredIndex }),
    [items, hoveredIndex, setHoveredIndex]
  );

  return (
    <LegendProvider value={contextValue}>
      <View style={[styles.container, style]}>
        {title ? (
          <Text style={[styles.title, { color: theme.textColor }, titleStyle]}>
            {title}
          </Text>
        ) : null}
        {items.map((item, index) => {
          const isHovered = hoveredIndex === index;
          const isFaded = hoveredIndex !== null && !isHovered;
          const percentage = resolveLegendPercentage(item.value, item.maxValue);

          if (!isValidElement(children)) {
            return null;
          }

          return (
            <LegendItemProvider
              key={`${item.label}:${index}`}
              value={{ item, index, isHovered, isFaded, percentage }}
            >
              {cloneElement(children)}
            </LegendItemProvider>
          );
        })}
      </View>
    </LegendProvider>
  );
}

Legend.displayName = "Legend";

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
});
