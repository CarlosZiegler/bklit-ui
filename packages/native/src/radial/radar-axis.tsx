import { Line } from "react-native-svg";
import { useChartTheme } from "../theme";
import { useRadarNative } from "./radar-context";

export interface RadarAxisProps {
  stroke?: string;
  strokeOpacity?: number;
}

export function RadarAxis({ stroke, strokeOpacity = 0.6 }: RadarAxisProps) {
  const { metrics, radius, getAngle } = useRadarNative();
  const theme = useChartTheme();
  const color = stroke ?? theme.gridColor;
  return (
    <>
      {metrics.map((metric, index) => {
        const angle = getAngle(index);
        return (
          <Line
            key={`radar-axis-${index}-${metric.key}`}
            stroke={color}
            strokeOpacity={strokeOpacity}
            strokeWidth={1}
            x1={0}
            x2={Math.cos(angle) * radius}
            y1={0}
            y2={Math.sin(angle) * radius}
          />
        );
      })}
    </>
  );
}

RadarAxis.displayName = "RadarAxis";
