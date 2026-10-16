import { Text as SvgText } from "react-native-svg";
import { useChartTheme } from "../theme";
import { useRadarNative } from "./radar-context";

export interface RadarLabelsProps {
  offset?: number;
  fontSize?: number;
  interactive?: boolean;
}

export function RadarLabels({
  offset = 24,
  fontSize = 11,
  interactive = false,
}: RadarLabelsProps) {
  const { metrics, radius, getAngle } = useRadarNative();
  const theme = useChartTheme();
  const labelRadius = radius + offset;
  return (
    <>
      {metrics.map((metric, index) => {
        const angle = getAngle(index);
        return (
          <SvgText
            alignmentBaseline="middle"
            fill={theme.textColor}
            fontSize={fontSize}
            fontWeight="500"
            key={`radar-label-${index}-${metric.key}`}
            opacity={interactive ? 0.8 : 1}
            textAnchor="middle"
            x={Math.cos(angle) * labelRadius}
            y={Math.sin(angle) * labelRadius}
          >
            {metric.label}
          </SvgText>
        );
      })}
    </>
  );
}

RadarLabels.displayName = "RadarLabels";
