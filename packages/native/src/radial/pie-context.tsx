import { createContext, type ReactNode, useContext } from "react";
import type { PieArc, RadialDatum } from "./geometry";

export interface PieNativeContextValue<T extends RadialDatum = RadialDatum> {
  arcs: PieArc[];
  data: readonly T[];
  hoveredIndex: number | null;
  innerRadius: number;
  outerRadius: number;
  cornerRadius: number;
  padAngle: number;
  hoverOffset: number;
  enterStaggerScale: number;
  animationKey?: string | number;
  setHoveredIndex: (index: number | null) => void;
  totalValue: number;
  getColor: (index: number) => string;
  getFill: (index: number) => string;
}

const PieContext = createContext<PieNativeContextValue | null>(null);

export function PieProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: PieNativeContextValue;
}) {
  return <PieContext.Provider value={value}>{children}</PieContext.Provider>;
}

export function usePieNative(): PieNativeContextValue {
  const context = useContext(PieContext);
  if (!context) {
    throw new Error("PieSlice and PieCenter must be inside PieChart.");
  }
  return context;
}
