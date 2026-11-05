import { createContext, useContext, useEffect, useState } from "react";

import { readTheme, writeTheme, type ThemeMode } from "./theme";

type Ctx = { mode: ThemeMode; setMode: (m: ThemeMode) => void };

const ThemeCtx = createContext<Ctx>({ mode: "system", setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  useEffect(() => {
    setModeState(readTheme());
    const sync = () => setModeState(readTheme());
    window.addEventListener("chatspace:theme", sync);
    return () => window.removeEventListener("chatspace:theme", sync);
  }, []);
  const setMode = (next: ThemeMode) => {
    writeTheme(next);
    setModeState(next);
  };
  return <ThemeCtx.Provider value={{ mode, setMode }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
