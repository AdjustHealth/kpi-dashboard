// Dark-mode categorical palette from the dataviz skill's validated reference
// (references/palette.md) — fixed order, never cycled arbitrarily.
export const CATEGORICAL = [
  "#3987e5", // 1 blue
  "#008300", // 2 green
  "#d55181", // 3 magenta
  "#c98500", // 4 yellow
  "#199e70", // 5 aqua
  "#d95926", // 6 orange
  "#9085e9", // 7 violet
  "#e66767", // 8 red
] as const;

export const SEQUENTIAL_BLUE = [
  "#cde2fb",
  "#9ec5f4",
  "#5598e7",
  "#2a78d6",
  "#184f95",
] as const;

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export const CHART_CHROME = {
  gridline: "#2c2c2a",
  baseline: "#383835",
  mutedInk: "#898781",
  secondaryInk: "#c3c2b7",
  primaryInk: "#ffffff",
} as const;
