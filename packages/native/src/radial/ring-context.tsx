import { createContext, type ReactNode, useContext } from "react";

export interface RingData {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}

export interface RingNativeContextValue {
  data: readonly RingData[];
  size: number;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  strokeWidth: number;
  ringGap: number;
  baseInnerRadius: number;
  startAngle: number;
  endAngle: number;
  totalValue: number;
  animationDuration: number;
  enterStaggerScale: number;
  animationKey?: string | number;
  getColor: (index: number) => string;
  getRingRadii: (index: number) => { innerRadius: number; outerRadius: number };
}

const RingContext = createContext<RingNativeContextValue | null>(null);

export function RingProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RingNativeContextValue;
}) {
  return <RingContext.Provider value={value}>{children}</RingContext.Provider>;
}

export function useRingNative(): RingNativeContextValue {
  const context = useContext(RingContext);
  if (!context) {
    throw new Error("Ring and RingCenter must be inside RingChart.");
  }
  return context;
}
