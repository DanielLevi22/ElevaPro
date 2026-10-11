"use client";

import { createLinkCodeService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation } from "@tanstack/react-query";

const linkCodes = createLinkCodeService(supabase);

/**
 * O vínculo por código do lado do especialista (#365): gerar o próprio código
 * para o aluno digitar, ou digitar o código que o aluno gerou.
 *
 * @example
 * const { generate, redeem } = useLinkByCode(user.id);
 * const codigo = await generate.mutateAsync();
 */
export function useLinkByCode(specialistId: string | null) {
  const generate = useMutation({
    mutationFn: () => {
      if (!specialistId) throw new Error("Sessão expirada: entre de novo para gerar o código.");
      return linkCodes.generate({ role: "specialist", id: specialistId });
    },
  });
  const redeem = useMutation({
    mutationFn: async (code: string) => {
      const result = await linkCodes.redeem("specialist", code);
      if (!result.success) throw new Error(result.error ?? "Código inválido ou expirado.");
    },
  });
  return { generate, redeem };
}
