import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SPECIALIST_NOTE_COLUMNS,
  type SpecialistNote,
  type SpecialistNoteWithAuthor,
} from "../types/specialistNote.types";
import { firstOfEmbed } from "../utils/postgrest";

/**
 * A nota do especialista sobre o progresso do Aluno (issue #312 §4).
 *
 * Quem pode o quê é da RLS (0057): o aluno lê, o autor escreve, corrige e apaga.
 * O serviço nunca filtra por autor — pedir `specialist_id = eu` esconderia do
 * aluno a nota escrita sobre ele, que é justamente o que ele tem direito de ver.
 */
export const createSpecialistNoteService = (supabase: SupabaseClient) => ({
  /**
   * As notas do aluno que quem chama alcança, da mais recente à mais antiga.
   *
   * @example const notes = await service.listNotes(aluno.id);
   */
  listNotes: async (studentId: string): Promise<SpecialistNoteWithAuthor[]> => {
    const { data, error } = await supabase
      .from("specialist_notes")
      .select(
        `${SPECIALIST_NOTE_COLUMNS}, author:profiles!specialist_notes_specialist_id_fkey(full_name)`,
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(withAuthorName);
  },

  /**
   * A última nota escrita dentro do período — o cartão do relatório. Sem nota no
   * período, `null`, e o cartão some.
   *
   * @example await service.latestNoteInPeriod(aluno.id, "2026-06-17", "2026-09-15");
   */
  latestNoteInPeriod: async (
    studentId: string,
    from: string,
    to: string,
  ): Promise<SpecialistNoteWithAuthor | null> => {
    const { data, error } = await supabase
      .from("specialist_notes")
      .select(
        `${SPECIALIST_NOTE_COLUMNS}, author:profiles!specialist_notes_specialist_id_fkey(full_name)`,
      )
      .eq("student_id", studentId)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? withAuthorName(data) : null;
  },

  /**
   * Escreve a nota em nome de quem chama. O banco recusa autor diferente.
   *
   * @example await service.writeNote({ studentId, specialistId: me.id, body });
   */
  writeNote: async (input: {
    studentId: string;
    specialistId: string;
    body: string;
  }): Promise<SpecialistNote> => {
    const { data, error } = await supabase
      .from("specialist_notes")
      .insert({
        student_id: input.studentId,
        specialist_id: input.specialistId,
        body: input.body.trim(),
      })
      .select(SPECIALIST_NOTE_COLUMNS)
      .single();
    if (error) throw error;
    return data as SpecialistNote;
  },

  /**
   * Corrige a própria nota. `updated_at` acompanha, senão a tela mostraria a data
   * de quando a nota nasceu ao lado de um texto que mudou depois.
   *
   * @example await service.editNote(nota.id, "Novo texto.");
   */
  editNote: async (id: string, body: string): Promise<void> => {
    const { error, count } = await supabase
      .from("specialist_notes")
      .update({ body: body.trim(), updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", id);
    if (error) throw error;
    recusaSilenciosa(count, "corrigir");
  },

  /**
   * Apaga a própria nota.
   *
   * @example await service.deleteNote(nota.id);
   */
  deleteNote: async (id: string): Promise<void> => {
    const { error, count } = await supabase
      .from("specialist_notes")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    recusaSilenciosa(count, "apagar");
  },
});

function withAuthorName(row: unknown): SpecialistNoteWithAuthor {
  const { author, ...note } = row as SpecialistNote & {
    author?: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  return { ...note, author_name: firstOfEmbed(author)?.full_name ?? null };
}

/**
 * A RLS não recusa: ela não devolve linha. Sem isto, corrigir a nota de outro
 * especialista, ou a própria depois da revogação, resolvia sem erro nenhum e a
 * tela dizia que salvou.
 */
function recusaSilenciosa(count: number | null, acao: string): void {
  if (count === 0) {
    throw new Error(
      `Não foi possível ${acao} a nota: ela é de outro especialista, ou o acesso a este aluno terminou.`,
    );
  }
}
