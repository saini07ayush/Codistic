export const THEMES = {
  dark: {
    name: "Dark", bg: "#0a0a0a", surface: "#111111", surfaceAlt: "#161616",
    border: "rgba(255,255,255,0.07)", borderStrong: "rgba(255,255,255,0.12)",
    text: "#e2e8f0", textMuted: "#8494a7", textDim: "#7a8ea3",
    untyped: "#3d4b5b", correct: "#e2e8f0", wrong: "#fc8181",
    wrongBg: "rgba(252,129,129,0.12)", grid: "rgba(255,255,255,0.02)", navBg: "rgba(10,10,10,0.8)",
  },
  light: {
    name: "Light", bg: "#f8f9fa", surface: "#ffffff", surfaceAlt: "#f1f3f5",
    border: "rgba(0,0,0,0.08)", borderStrong: "rgba(0,0,0,0.15)",
    text: "#1a1a2e", textMuted: "#64748b", textDim: "#78839a",
    untyped: "#c8d0dc", correct: "#1a1a2e", wrong: "#e53e3e",
    wrongBg: "rgba(229,62,62,0.1)", grid: "rgba(0,0,0,0.03)", navBg: "rgba(248,249,250,0.9)",
  },
  retro: {
    name: "Retro", bg: "#0d0d0d", surface: "#0f1a0f", surfaceAlt: "#121f12",
    border: "rgba(0,255,65,0.12)", borderStrong: "rgba(0,255,65,0.25)",
    text: "#00ff41", textMuted: "#3da83d", textDim: "#4abf4a",
    untyped: "#1a4a1a", correct: "#00ff41", wrong: "#ff3c3c",
    wrongBg: "rgba(255,60,60,0.1)", grid: "rgba(0,255,65,0.03)", navBg: "rgba(13,13,13,0.9)",
  },
  solarized: {
    name: "Solarized", bg: "#002b36", surface: "#073642", surfaceAlt: "#083f4d",
    border: "rgba(101,123,131,0.2)", borderStrong: "rgba(101,123,131,0.35)",
    text: "#93a1a1", textMuted: "#879ca4", textDim: "#6e8890",
    untyped: "#2d4a52", correct: "#93a1a1", wrong: "#dc322f",
    wrongBg: "rgba(220,50,47,0.12)", grid: "rgba(101,123,131,0.04)", navBg: "rgba(0,43,54,0.9)",
  },
  nord: {
    name: "Nord", bg: "#2e3440", surface: "#3b4252", surfaceAlt: "#434c5e",
    border: "rgba(216,222,233,0.08)", borderStrong: "rgba(216,222,233,0.15)",
    text: "#d8dee9", textMuted: "#a4aec4", textDim: "#808da5",
    untyped: "#4c566a", correct: "#eceff4", wrong: "#bf616a",
    wrongBg: "rgba(191,97,106,0.15)", grid: "rgba(216,222,233,0.02)", navBg: "rgba(46,52,64,0.9)",
  },
  catppuccin: {
    name: "Catppuccin", bg: "#1e1e2e", surface: "#181825", surfaceAlt: "#1e1e2e",
    border: "rgba(203,166,247,0.1)", borderStrong: "rgba(203,166,247,0.2)",
    text: "#cdd6f4", textMuted: "#9399b2", textDim: "#8891a9",
    untyped: "#45475a", correct: "#cdd6f4", wrong: "#f38ba8",
    wrongBg: "rgba(243,139,168,0.12)", grid: "rgba(203,166,247,0.02)", navBg: "rgba(30,30,46,0.9)",
  },
  dracula: {
    name: "Dracula", bg: "#282a36", surface: "#44475a", surfaceAlt: "#383a59",
    border: "rgba(98,114,164,0.3)", borderStrong: "rgba(98,114,164,0.5)",
    text: "#f8f8f2", textMuted: "#abb5e2", textDim: "#8892bf",
    untyped: "#586e75", correct: "#50fa7b", wrong: "#ff5555",
    wrongBg: "rgba(255,85,85,0.15)", grid: "rgba(248,248,242,0.03)", navBg: "rgba(40,42,54,0.9)",
  },
  gruvbox: {
    name: "Gruvbox", bg: "#282828", surface: "#3c3836", surfaceAlt: "#504945",
    border: "rgba(168,153,132,0.15)", borderStrong: "rgba(168,153,132,0.3)",
    text: "#ebdbb2", textMuted: "#bdae93", textDim: "#a99f86",
    untyped: "#665c54", correct: "#b8bb26", wrong: "#fb4934",
    wrongBg: "rgba(251,73,52,0.15)", grid: "rgba(235,219,178,0.03)", navBg: "rgba(40,40,40,0.9)",
  },
  tokyoNight: {
    name: "Tokyo Night", bg: "#1a1b26", surface: "#1f2335", surfaceAlt: "#24283b",
    border: "rgba(122,162,247,0.15)", borderStrong: "rgba(122,162,247,0.3)",
    text: "#c0caf5", textMuted: "#8089b0", textDim: "#6e78a0",
    untyped: "#414868", correct: "#9ece6a", wrong: "#f7768e",
    wrongBg: "rgba(247,118,142,0.15)", grid: "rgba(192,202,245,0.03)", navBg: "rgba(26,27,38,0.9)",
  },
  monochrome: {
    name: "Monochrome", bg: "#000000", surface: "#0a0a0a", surfaceAlt: "#111111",
    border: "rgba(255,255,255,0.06)", borderStrong: "rgba(255,255,255,0.12)",
    text: "#ffffff", textMuted: "#797979", textDim: "#5d5d5d",
    untyped: "#222222", correct: "#ffffff", wrong: "#666666",
    wrongBg: "rgba(255,255,255,0.15)", grid: "rgba(255,255,255,0.01)", navBg: "rgba(0,0,0,0.9)",
  },
  monochromeLight: {
    name: "Paper", bg: "#ffffff", surface: "#fcfcfc", surfaceAlt: "#f5f5f5",
    border: "rgba(0,0,0,0.05)", borderStrong: "rgba(0,0,0,0.1)",
    text: "#000000", textMuted: "#666666", textDim: "#929292",
    untyped: "#d0d0d0", correct: "#000000", wrong: "#888888",
    wrongBg: "rgba(0,0,0,0.08)", grid: "rgba(0,0,0,0.02)", navBg: "rgba(255,255,255,0.9)",
  },
};

export const THEME_ACCENTS = {
  dark: "#3B82F6", light: "#2563eb", retro: "#00ff41",
  solarized: "#268bd2", nord: "#88c0d0", catppuccin: "#cba6f7",
  dracula: "#ff79c6", gruvbox: "#fe8019", tokyoNight: "#7aa2f7", monochrome: "#ffffff", monochromeLight: "#000000",
};

// --- Custom Theme Helpers ---

// The 6 essential colors the user picks
export const CUSTOM_THEME_FIELDS = [
  { key: "bg",      label: "Background",  desc: "Main page background" },
  { key: "surface",  label: "Surface",     desc: "Cards & panels" },
  { key: "text",     label: "Text",        desc: "Primary text color" },
  { key: "accent",   label: "Accent",      desc: "Highlights & buttons" },
  { key: "correct",  label: "Correct",     desc: "Correctly typed characters" },
  { key: "wrong",    label: "Error",       desc: "Mistakes & wrong characters" },
];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

function blendColors(hex1, hex2, ratio) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio,
  );
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Detect if a color is "light" (for auto-calculating contrast-aware derived tokens)
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

/**
 * Derive a full theme object from 6 essential colors.
 * bg, surface, text, accent, correct, wrong → all 14 tokens
 */
export function buildThemeFromColors({ bg, surface, text, accent, correct, wrong }) {
  const light = isLight(bg);
  const contrastBase = light ? "#000000" : "#ffffff";

  return {
    name: "Custom",
    bg,
    surface,
    surfaceAlt: blendColors(surface, bg, 0.4),
    border: rgba(contrastBase, light ? 0.08 : 0.07),
    borderStrong: rgba(contrastBase, light ? 0.15 : 0.12),
    text,
    textMuted: blendColors(text, bg, 0.4),
    textDim: blendColors(text, bg, 0.55),
    untyped: blendColors(text, bg, 0.7),
    correct,
    wrong,
    wrongBg: rgba(wrong, 0.12),
    grid: rgba(contrastBase, light ? 0.03 : 0.02),
    navBg: rgba(bg, 0.9),
  };
}

const CUSTOM_LS_KEY = "codistic-custom-theme";

export function loadCustomTheme() {
  try {
    const raw = localStorage.getItem(CUSTOM_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveCustomTheme(colors) {
  localStorage.setItem(CUSTOM_LS_KEY, JSON.stringify(colors));
  // Rebuild and inject into the runtime objects
  const full = buildThemeFromColors(colors);
  THEMES.custom = full;
  THEME_ACCENTS.custom = colors.accent;
}

export function deleteCustomTheme() {
  localStorage.removeItem(CUSTOM_LS_KEY);
  delete THEMES.custom;
  delete THEME_ACCENTS.custom;
}

// Auto-inject custom theme on module load if one exists
(function initCustomTheme() {
  const saved = loadCustomTheme();
  if (saved) {
    THEMES.custom = buildThemeFromColors(saved);
    THEME_ACCENTS.custom = saved.accent;
  }
})();
