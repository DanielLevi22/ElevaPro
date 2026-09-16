"use client";

import { createSpecialistNoteService, type SpecialistNoteWithAuthor } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const notes = createSpecialistNoteService(supabase);

/**
 * As notas que o especialista escreveu sobre o aluno (issue #312 §4).
 *
 * Quem lê o quê é da RLS (0057) — a lista volta vazia para quem não alcança, e
 * nenhum `if` daqui repete a regra do banco.
 *
 * @example const { data: notas = [] } = useSpecialistNotes(studentId);
 */
export function useSpecialistNotes(studentId: string) {
  return useQuery<SpecialistNoteWithAuthor[]>({
    queryKey: ["specialist_notes", studentId],
    queryFn: () => notes.listNotes(studentId),
    enabled: Boolean(studentId),
  });
}

/** Escrever, corrigir e apagar a nota, atualizando a lista. */
export function useSpecialistNoteMutations(studentId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["specialist_notes", studentId] });

  const write = useMutation({
    mutationFn: async (body: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Sessão expirada: entre de novo para escrever a nota.");
      return notes.writeNote({ studentId, specialistId: user.id, body });
    },
    onSuccess: refresh,
  });

  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => notes.editNote(id, body),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => notes.deleteNote(id),
    onSuccess: refresh,
  });

  return { write, edit, remove };
}
