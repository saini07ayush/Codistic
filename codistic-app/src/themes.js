export const THEMES = {
  dark: {
    name: "Dark", bg: "#0a0a0a", surface: "#111111", surfaceAlt: "#161616",
    border: "rgba(255,255,255,0.07)", borderStrong: "rgba(255,255,255,0.12)",
    text: "#e2e8f0", textMuted: "#4a5568", textDim: "#2d3748",
    untyped: "#3a4a5c", correct: "#e2e8f0", wrong: "#fc8181",
    wrongBg: "rgba(252,129,129,0.12)", grid: "rgba(255,255,255,0.02)", navBg: "rgba(10,10,10,0.8)",
  },
  light: {
    name: "Light", bg: "#f8f9fa", surface: "#ffffff", surfaceAlt: "#f1f3f5",
    border: "rgba(0,0,0,0.08)", borderStrong: "rgba(0,0,0,0.15)",
    text: "#1a1a2e", textMuted: "#94a3b8", textDim: "#cbd5e1",
    untyped: "#c8d0dc", correct: "#1a1a2e", wrong: "#e53e3e",
    wrongBg: "rgba(229,62,62,0.1)", grid: "rgba(0,0,0,0.03)", navBg: "rgba(248,249,250,0.9)",
  },
  retro: {
    name: "Retro", bg: "#0d0d0d", surface: "#0f1a0f", surfaceAlt: "#121f12",
    border: "rgba(0,255,65,0.12)", borderStrong: "rgba(0,255,65,0.25)",
    text: "#00ff41", textMuted: "#1a5c1a", textDim: "#0d2e0d",
    untyped: "#1a4a1a", correct: "#00ff41", wrong: "#ff3c3c",
    wrongBg: "rgba(255,60,60,0.1)", grid: "rgba(0,255,65,0.03)", navBg: "rgba(13,13,13,0.9)",
  },
  solarized: {
    name: "Solarized", bg: "#002b36", surface: "#073642", surfaceAlt: "#083f4d",
    border: "rgba(101,123,131,0.2)", borderStrong: "rgba(101,123,131,0.35)",
    text: "#839496", textMuted: "#586e75", textDim: "#2d4a52",
    untyped: "#2d4a52", correct: "#93a1a1", wrong: "#dc322f",
    wrongBg: "rgba(220,50,47,0.12)", grid: "rgba(101,123,131,0.04)", navBg: "rgba(0,43,54,0.9)",
  },
  nord: {
    name: "Nord", bg: "#2e3440", surface: "#3b4252", surfaceAlt: "#434c5e",
    border: "rgba(216,222,233,0.08)", borderStrong: "rgba(216,222,233,0.15)",
    text: "#d8dee9", textMuted: "#616e88", textDim: "#4c566a",
    untyped: "#4c566a", correct: "#eceff4", wrong: "#bf616a",
    wrongBg: "rgba(191,97,106,0.15)", grid: "rgba(216,222,233,0.02)", navBg: "rgba(46,52,64,0.9)",
  },
  catppuccin: {
    name: "Catppuccin", bg: "#1e1e2e", surface: "#181825", surfaceAlt: "#1e1e2e",
    border: "rgba(203,166,247,0.1)", borderStrong: "rgba(203,166,247,0.2)",
    text: "#cdd6f4", textMuted: "#6c7086", textDim: "#45475a",
    untyped: "#45475a", correct: "#cdd6f4", wrong: "#f38ba8",
    wrongBg: "rgba(243,139,168,0.12)", grid: "rgba(203,166,247,0.02)", navBg: "rgba(30,30,46,0.9)",
  },
};

export const THEME_ACCENTS = {
  dark: "#3B82F6", light: "#2563eb", retro: "#00ff41",
  solarized: "#268bd2", nord: "#88c0d0", catppuccin: "#cba6f7",
};
