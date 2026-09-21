"use client";

import { createStudentsService, type ServiceType } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CreateStudentInput {
  specialistId: string;
  fullName: string;
  email: string;
  serviceTypes: ServiceType[];
}

const service = createStudentsService(supabase);

/**
 * Convida o aluno pelo mesmo serviço que o mobile usa (ADR-0035): o
 * especialista nunca define a senha dele. Antes esta função repetia a
 * chamada ao BFF com sessão e fetch próprios; agora é o `students.service.ts`
 * de `shared/` quem faz isso nos dois lugares.
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      const result = await service.createStudent({
        specialist_id: input.specialistId,
        full_name: input.fullName,
        email: input.email,
        service_types: input.serviceTypes,
      });

      if (!result.success || !result.studentId) {
        throw new Error(result.error ?? "Não foi possível criar o aluno");
      }

      return { success: true, student_id: result.studentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
