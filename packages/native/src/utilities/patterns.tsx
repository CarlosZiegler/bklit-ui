import { Circle, Path, Pattern, Rect } from "react-native-svg";

export const PATTERN_PRESET_IDS = [
  "none",
  "diagonal",
  "horizontal",
  "vertical",
  "cross",
  "dots",
  "circles",
  "accent",
] as const;

export type PatternPresetId = (typeof PATTERN_PRESET_IDS)[number];

export interface PatternPresetOptions {
  color?: string;
  scale?: number;
  strokeWidth?: number;
  radius?: number;
  complement?: boolean;
  fill?: string;
  dotFill?: boolean;
  tileBackground?: string;
}

export function patternPresetTileSize(
  preset: PatternPresetId,
  scale = 1
): { width: number; height: number; strokeWidth: number } {
  let tile = { width: 6, height: 6, strokeWidth: 1 };
  if (preset === "dots") {
    tile = { width: 10, height: 10, strokeWidth: 0 };
  } else if (preset === "cross") {
    tile = { width: 8, height: 8, strokeWidth: 1 };
  }
  return {
    width: tile.width * scale,
    height: tile.height * scale,
    strokeWidth: tile.strokeWidth * scale,
  };
}

function orientationPath(preset: PatternPresetId, size: number): string {
  const half = size / 2;
  switch (preset) {
    case "horizontal":
      return `M 0,${half} L ${size},${half}`;
    case "vertical":
      return `M ${half},0 L ${half},${size}`;
    case "cross":
      return `M 0,${size} L ${size},0 M 0,0 L ${size},${size}`;
    case "accent":
    case "diagonal":
      return `M 0,${size} L ${size},0 M ${-size / 4},${size / 4} L ${size / 4},${-size / 4} M ${size * 0.75},${size * 1.25} L ${size * 1.25},${size * 0.75}`;
    default:
      return "";
  }
}

/** Native-SVG version of the web pattern preset tiles. */
export function NativePatternDefinition({
  id,
  preset,
  options = {},
}: {
  id: string;
  preset: PatternPresetId;
  options?: PatternPresetOptions;
}) {
  if (preset === "none") {
    return null;
  }
  const scale = Number.isFinite(options.scale)
    ? Math.max(0.05, options.scale as number)
    : 1;
  const {
    width,
    height,
    strokeWidth: baseStrokeWidth,
  } = patternPresetTileSize(preset, scale);
  const color = options.color ?? "#cbd5e1";
  const strokeWidth = options.strokeWidth ?? baseStrokeWidth;
  const radius =
    options.radius ??
    (preset === "dots" ? Math.max(0.5, 1.5 * scale) : 2 * scale);
  const isCirclePreset = preset === "dots" || preset === "circles";
  const dotFillEnabled = options.dotFill !== false;
  const circleFill =
    options.fill ?? (preset === "dots" && dotFillEnabled ? color : "none");
  const circleStroke =
    preset === "dots" && dotFillEnabled && !options.fill ? undefined : color;

  return (
    <Pattern
      height={height}
      id={id}
      patternUnits="userSpaceOnUse"
      width={width}
    >
      {options.tileBackground ? (
        <Rect
          fill={options.tileBackground}
          height={height}
          width={width}
          x={0}
          y={0}
        />
      ) : null}
      {isCirclePreset ? (
        <>
          <Circle
            cx={width / 2}
            cy={height / 2}
            fill={circleFill}
            r={radius}
            stroke={circleStroke}
            strokeWidth={strokeWidth}
          />
          {options.complement ? (
            <>
              <Circle
                cx={0}
                cy={0}
                fill={circleFill}
                r={radius}
                stroke={circleStroke}
                strokeWidth={strokeWidth}
              />
              <Circle
                cx={0}
                cy={height}
                fill={circleFill}
                r={radius}
                stroke={circleStroke}
                strokeWidth={strokeWidth}
              />
              <Circle
                cx={width}
                cy={0}
                fill={circleFill}
                r={radius}
                stroke={circleStroke}
                strokeWidth={strokeWidth}
              />
              <Circle
                cx={width}
                cy={height}
                fill={circleFill}
                r={radius}
                stroke={circleStroke}
                strokeWidth={strokeWidth}
              />
            </>
          ) : null}
        </>
      ) : (
        <Path
          d={orientationPath(preset, height)}
          fill="none"
          stroke={preset === "accent" ? "#e879f9" : color}
          strokeLinecap="square"
          strokeWidth={strokeWidth}
        />
      )}
    </Pattern>
  );
}
