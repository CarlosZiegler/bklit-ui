export interface Palette {
  accent: string;
  accentSoft: string;
  border: string;
  grid: string;
  muted: string;
  page: string;
  secondary: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  track: string;
}

export const lightPalette: Palette = {
  accent: "#3d78aa",
  accentSoft: "#edf4f9",
  border: "#e2e8e5",
  grid: "#e4eae7",
  muted: "#7d8984",
  page: "#f5f7f5",
  secondary: "#606d67",
  surface: "#ffffff",
  surfaceMuted: "#f8faf9",
  text: "#1b2521",
  track: "#e8edea",
};

export const darkPalette: Palette = {
  accent: "#83b4da",
  accentSoft: "#1b2c38",
  border: "#29353a",
  grid: "#2d3a40",
  muted: "#8d9a94",
  page: "#101517",
  secondary: "#b0bbb5",
  surface: "#171f22",
  surfaceMuted: "#1c262a",
  text: "#f1f5f2",
  track: "#344147",
};
