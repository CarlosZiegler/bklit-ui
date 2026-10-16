import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

export type ChartColorScheme = "dark" | "light";
export type ChartScaleColors = readonly [
  string,
  string,
  string,
  string,
  string,
];

/** Literal React Native colors; CSS variables and CSS-only color syntax are unsupported. */
export interface ChartTheme {
  color: string;
  gridColor: string;
  scaleColors: ChartScaleColors;
  seriesColors: readonly string[];
  surfaceColor: string;
  textColor: string;
  trackColor: string;
}

export const lightChartTheme: Readonly<ChartTheme> = {
  color: "#397db5",
  gridColor: "#e8ebec",
  scaleColors: ["#fafaf9", "#e7e5e4", "#d6d3d1", "#a8a29e", "#78716c"],
  seriesColors: ["#397db5", "#e5985d", "#4f9b73", "#9b77c6", "#dc6f7f"],
  surfaceColor: "#ffffff",
  textColor: "#878e92",
  trackColor: "#e8ebec",
};

export const darkChartTheme: Readonly<ChartTheme> = {
  color: "#8db8ee",
  gridColor: "#334155",
  scaleColors: ["#18181b", "#3f3f46", "#71717a", "#d4d4d8", "#e4e4e7"],
  seriesColors: ["#8db8ee", "#f1ad78", "#7cc89b", "#b39be5", "#ef94a1"],
  surfaceColor: "#17202c",
  textColor: "#aeb9c8",
  trackColor: "#334155",
};

const ChartThemeContext = createContext<Readonly<ChartTheme> | null>(null);

export interface ChartThemeProviderProps {
  children: ReactNode;
  colorScheme?: ChartColorScheme;
  theme?: Partial<ChartTheme>;
}

/** Sets shared chart colors. Per-chart color props override these values. */
export function ChartThemeProvider({
  children,
  colorScheme,
  theme,
}: ChartThemeProviderProps) {
  const inheritedTheme = useContext(ChartThemeContext);
  const systemColorScheme = useColorScheme();
  const scheme = colorScheme ?? systemColorScheme ?? "light";
  const schemeDefaults = scheme === "dark" ? darkChartTheme : lightChartTheme;
  const defaults =
    colorScheme === undefined
      ? (inheritedTheme ?? schemeDefaults)
      : schemeDefaults;
  const resolvedTheme = useMemo(
    () => ({ ...defaults, ...theme }),
    [defaults, theme]
  );

  return (
    <ChartThemeContext.Provider value={resolvedTheme}>
      {children}
    </ChartThemeContext.Provider>
  );
}

/** Reads the nearest chart theme, or follows the system appearance by default. */
export function useChartTheme(): Readonly<ChartTheme> {
  const contextualTheme = useContext(ChartThemeContext);
  const systemColorScheme = useColorScheme();
  return (
    contextualTheme ??
    (systemColorScheme === "dark" ? darkChartTheme : lightChartTheme)
  );
}
