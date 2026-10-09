"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadMealMediaBackup,
  loadMealMediaOverview,
  restoreMealMediaBackup,
} from "../services/MealMediaClientService";
import type { MealMediaOverview } from "../services/mealMedia.types";

/** Estado do catálogo e operações portáveis do admin. @example const media = useMealMediaAdmin() */
export function useMealMediaAdmin() {
  const [overview, setOverview] = useState<MealMediaOverview | null>(null);
  const [page, setPage] = useState(1);
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const nextOverview = await loadMealMediaOverview(page);
      if (version === requestVersion.current) {
        setOverview(nextOverview);
        setPage(nextOverview.page);
      }
    } catch (failure) {
      if (version === requestVersion.current) setError(message(failure));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);
  const run = async (operation: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice(await operation());
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  return {
    overview,
    setPage,
    loading,
    busy,
    error,
    notice,
    refresh,
    download: () =>
      run(async () => {
        await downloadMealMediaBackup();
        return "Backup conferido e download iniciado.";
      }),
    restore: (file: File, destination: string) =>
      run(() => restoreMealMediaBackup(file, destination)),
  };
}

function message(failure: unknown): string {
  return failure instanceof Error ? failure.message : "Não foi possível realizar a operação.";
}
