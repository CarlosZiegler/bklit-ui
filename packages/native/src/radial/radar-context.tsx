import { createContext, type ReactNode, useContext } from "react";

export interface RadarMetric {
  key: string;
  label: string;
}

export interface RadarData {
  label: string;
  color?: string;
  values: Record<string, number>;
}

export interface RadarNativeContextValue {
  data: readonly RadarData[];
  metrics: readonly RadarMetric[];
  size: number;
  radius: number;
  levels: number;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  animate: boolean;
  enterDurationMs: number;
  staggerScale: number;
  motionReplayKey: string;
  getColor: (index: number) => string;
  getAngle: (metricIndex: number) => number;
  getPointPosition: (
    metricIndex: number,
    value: number
  ) => { x: number; y: number };
}

const RadarContext = createContext<RadarNativeContextValue | null>(null);

export function RadarProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RadarNativeContextValue;
}) {
  return (
    <RadarContext.Provider value={value}>{children}</RadarContext.Provider>
  );
}

export function useRadarNative(): RadarNativeContextValue {
  const context = useContext(RadarContext);
  if (!context) {
    throw new Error("Radar layers must be inside RadarChart.");
  }
  return context;
}
