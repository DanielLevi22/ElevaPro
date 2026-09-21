"use client";

import { createStudentsService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const service = createStudentsService(supabase);

/** Reenvia o convite de um aluno ainda pendente — mesmo serviço do mobile. */
export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      const result = await service.resendInvite(studentId);
      if (!result.success) {
        throw new Error(result.error ?? "Não foi possível reenviar o convite");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
