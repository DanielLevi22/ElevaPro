"use client";

import { createLinkCodeService, createStudentsService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const studentsService = createStudentsService(supabase);
const linkCodes = createLinkCodeService(supabase);

export interface SpecialistLink {
  id: string;
  specialist_id: string;
  service_type: string;
  status: string;
  created_at: string;
  specialist_name: string | null;
}

const SERVICE_TYPE = {
  personal_training: "Personal Trainer",
  nutrition_consulting: "Nutricionista",
};

export { SERVICE_TYPE };

export function useStudentLinks(studentId: string | null) {
  return useQuery({
    queryKey: ["student-links", studentId],
    queryFn: async (): Promise<SpecialistLink[]> => {
      const rows = await studentsService.fetchStudentLinks(studentId as string);
      return rows.map((row) => ({
        id: row.id,
        specialist_id: row.specialist_id,
        service_type: row.service_type,
        status: row.status,
        created_at: row.created_at,
        specialist_name: Array.isArray(row.profiles)
          ? ((row.profiles[0] as { full_name: string | null })?.full_name ?? null)
          : ((row.profiles as { full_name: string | null } | null)?.full_name ?? null),
      }));
    },
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateLinkCode(studentId: string | null) {
  return useMutation({
    mutationFn: () => {
      if (!studentId) throw new Error("Usuário não autenticado");
      return studentsService.generateLinkCode(studentId);
    },
  });
}

/**
 * O aluno digita o código que o especialista gerou (0087, #365). O vínculo
 * entra na lista dos especialistas vinculados.
 *
 * @example const { mutateAsync } = useRedeemSpecialistCode(user.id); await mutateAsync("K7Q2MX");
 */
export function useRedeemSpecialistCode(studentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const result = await linkCodes.redeem("student", code);
      if (!result.success) throw new Error(result.error ?? "Código inválido ou expirado.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-links", studentId] }),
  });
}

export function useEndStudentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, studentId }: { linkId: string; studentId: string }) =>
      studentsService.endStudentLink(linkId, studentId),
    onSuccess: (_data, { studentId }) =>
      queryClient.invalidateQueries({ queryKey: ["student-links", studentId] }),
  });
}
