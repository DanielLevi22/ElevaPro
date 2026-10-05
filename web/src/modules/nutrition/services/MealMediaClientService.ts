import { supabase } from "@elevapro/supabase";
import type { MealMediaOverview } from "./mealMedia.types";

/** Consulta a biblioteca do admin com a sessão vigente. @example await loadMealMediaOverview() */
export async function loadMealMediaOverview(): Promise<MealMediaOverview> {
  return (await requestMedia("")).json();
}

/** Exporta o arquivo de backup para o navegador. @example await downloadMealMediaBackup() */
export async function downloadMealMediaBackup(): Promise<void> {
  const blob = await (await requestMedia("/backup")).blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "meal-media-backup.json";
  anchor.click();
  // O navegador precisa iniciar o download antes de descartar o endereço temporário.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Restaura o backup selecionado sem mudar a entrega ativa. @example restoreMealMediaBackup(file, 'imagekit') */
export async function restoreMealMediaBackup(file: File, destination: string): Promise<string> {
  if (file.size > 3_000_000) throw new Error("Selecione um backup JSON de até 3 MB.");
  let backup: unknown;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error("Arquivo inválido. Selecione o backup JSON exportado pelo sistema.");
  }
  const response = await requestMedia("/backup", {
    method: "POST",
    body: JSON.stringify({ backup, destination }),
  });
  const result: { message: string } = await response.json();
  return result.message;
}

async function requestMedia(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session)
    throw new Error("Sua sessão expirou. Entre novamente para gerenciar as imagens.");
  const response = await fetch(`/api/admin/meal-media${path}`, {
    ...init,
    redirect: "error",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const result: { message?: string } = await response.json();
    throw new Error(
      result.message ??
        "Não foi possível realizar a operação. Confira seu acesso e tente novamente.",
    );
  }
  return response;
}
