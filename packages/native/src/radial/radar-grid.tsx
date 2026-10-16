import { Polygon, Text as SvgText } from "react-native-svg";
import { useChartTheme } from "../theme";
import { useRadarNative } from "./radar-context";

export interface RadarGridProps {
  showLabels?: boolean;
  stroke?: string;
  strokeOpacity?: number;
}

export function RadarGrid({
  showLabels = true,
  stroke,
  strokeOpacity = 0.6,
}: RadarGridProps) {
  const { metrics, radius, levels } = useRadarNative();
  const theme = useChartTheme();
  const color = stroke ?? theme.gridColor;
  if (metrics.length < 3) {
    return null;
  }
  return (
    <>
      {Array.from({ length: levels }, (_, level) => {
        const levelRadius = ((level + 1) * radius) / levels;
        const points = metrics
          .map((_, index) => {
            const angle =
              (index * 2 * Math.PI) / metrics.length -
              Math.PI / 2 -
              Math.PI / metrics.length;
            return `${Math.cos(angle) * levelRadius},${Math.sin(angle) * levelRadius}`;
          })
          .join(" ");
        return (
          <Polygon
            fill="none"
            key={`radar-grid-${levelRadius}`}
            points={points}
            stroke={color}
            strokeOpacity={strokeOpacity}
            strokeWidth={1}
          />
        );
      })}
      {showLabels &&
        Array.from({ length: levels }, (_, level) => {
          const labelRadius = ((level + 1) * radius) / levels;
          return (
            <SvgText
              fill={theme.textColor}
              fontSize={9}
              key={`radar-level-${Math.round(((level + 1) * 100) / levels)}`}
              textAnchor="start"
              x={4}
              y={-labelRadius}
            >
              {Math.round(((level + 1) * 100) / levels)}
            </SvgText>
          );
        })}
    </>
  );
}

RadarGrid.displayName = "RadarGrid";
