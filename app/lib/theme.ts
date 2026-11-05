export type ThemeMode = "light" | "dark" | "system";

const KEY = "chatspace:theme";

export function readTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // storage unavailable
  }
  return "system";
}

function mediaDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

export function applyTheme(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && mediaDark());
  document.documentElement.classList.toggle("dark", dark);
  const holder = document.getElementById("theme-holder");
  if (holder) holder.textContent = mode;
}

export function writeTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // storage unavailable
  }
  applyTheme(mode);
  window.dispatchEvent(new Event("chatspace:theme"));
}

/** No-flash bootstrap: runs before hydration. */
export const THEME_BOOTSTRAP = `(function(){
  try {
    var raw = localStorage.getItem("chatspace:theme") || "system";
    var dark = raw === "dark" || (raw === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();`;
