"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const BUILT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const RELOAD_GUARD_KEY = "app-version-reloaded-to";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const reloadPage = () => window.location.reload();

interface AppVersionWatcherProps {
  builtVersion?: string;
  reload?: () => void;
}

/**
 * Tira o web da versão antiga depois de um deploy (#428).
 *
 * Aba nova que abriu com código anterior recarrega uma vez, como o Ctrl+R. Com
 * a aba já em uso, só avisa: recarregar sozinho apagaria o que a pessoa digita.
 *
 * @example
 * <AppVersionWatcher />
 */
export function AppVersionWatcher({
  builtVersion = BUILT_VERSION,
  reload = reloadPage,
}: AppVersionWatcherProps) {
  useEffect(() => {
    if (builtVersion === "dev") return;
    let warned = false;
    const warn = () => {
      if (warned) return;
      warned = true;
      toast("Nova versão do Eleva Pro disponível.", {
        duration: Number.POSITIVE_INFINITY,
        action: { label: "Atualizar", onClick: reload },
      });
    };
    const checkInUse = () => void checkVersion(builtVersion, "in-use", reload, warn);
    const onVisible = () => document.visibilityState === "visible" && checkInUse();

    void checkVersion(builtVersion, "opening", reload, warn);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(checkInUse, CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [builtVersion, reload]);

  return null;
}

async function checkVersion(
  builtVersion: string,
  moment: "opening" | "in-use",
  reload: () => void,
  warn: () => void,
): Promise<void> {
  const liveVersion = await fetchLiveVersion();
  if (!liveVersion || liveVersion === builtVersion) return;
  // A guarda impede o laço: se o servidor seguir diferente depois de um
  // recarregamento, a pessoa recebe o aviso em vez de outra recarga.
  if (moment === "opening" && readReloadGuard() !== liveVersion && writeReloadGuard(liveVersion)) {
    reload();
    return;
  }
  warn();
}

async function fetchLiveVersion(): Promise<string | null> {
  try {
    const response = await fetch("/api/version", { cache: "no-store" });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("version" in body)) return null;
    return typeof body.version === "string" ? body.version : null;
  } catch {
    return null;
  }
}

function readReloadGuard(): string | null {
  try {
    return sessionStorage.getItem(RELOAD_GUARD_KEY);
  } catch {
    return null;
  }
}

// Sem armazenamento não há guarda, e recarregar poderia não ter fim: aí só avisa.
function writeReloadGuard(version: string): boolean {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, version);
    return true;
  } catch {
    return false;
  }
}
