"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
      style={{
        background: "var(--bg-3)",
        border: "1px solid var(--border-1)",
        color: "var(--text-3)",
      }}
    >
      {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
