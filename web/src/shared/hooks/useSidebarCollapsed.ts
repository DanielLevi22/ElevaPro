"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "elevapro:sidebar-collapsed";

interface SidebarCollapsedState {
  isCollapsed: boolean;
  isHydrated: boolean;
  toggle: () => void;
}

/**
 * Estado de colapso do sidebar do dashboard, persistido em localStorage.
 *
 * `isHydrated` existe porque o servidor não conhece a preferência: renderizar
 * o estado salvo direto no primeiro passe causaria mismatch de hidratação.
 *
 * @example
 * const { isCollapsed, toggle } = useSidebarCollapsed();
 */
export function useSidebarCollapsed(): SidebarCollapsedState {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
    setIsHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { isCollapsed, isHydrated, toggle };
}
