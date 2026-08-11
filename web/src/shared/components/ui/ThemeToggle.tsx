"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const LABEL: Record<string, string> = {
  light: "Ativar tema escuro",
  dark: "Ativar tema claro",
};

/**
 * Alterna entre tema claro e escuro, persistindo a escolha via next-themes.
 *
 * @example
 * <ThemeToggle />
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // O tema resolvido só existe no cliente — ler antes da hidratação renderiza
  // o ícone errado e o React reclama de mismatch.
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    return <div className="w-10 h-10" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={LABEL[isDark ? "dark" : "light"]}
      title={LABEL[isDark ? "dark" : "light"]}
      className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:bg-overlay-08 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
