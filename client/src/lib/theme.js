export const THEME_MODES = {
  DEFAULT: "default",
  DARK: "dark",
};

const THEME_STORAGE_KEY = "hypekicks-theme-mode";

function isValidTheme(mode) {
  return mode === THEME_MODES.DEFAULT || mode === THEME_MODES.DARK;
}

export function loadThemePreference() {
  if (typeof window === "undefined") return THEME_MODES.DEFAULT;

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(saved) ? saved : THEME_MODES.DEFAULT;
}

export function saveThemePreference(mode) {
  if (typeof window === "undefined") return;
  if (!isValidTheme(mode)) return;

  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyTheme(mode) {
  if (typeof document === "undefined") return;

  const resolvedMode = isValidTheme(mode) ? mode : THEME_MODES.DEFAULT;
  const root = document.documentElement;
  root.dataset.theme = resolvedMode;
  root.style.colorScheme = resolvedMode === THEME_MODES.DARK ? "dark" : "light";
}
