import { supabase } from '@elevapro/supabase';
import { AnamnesisResponse, StudentAnamnesis } from '../types/assessment';

export const AnamnesisService = {
  /**
   * Saves or updates the student's anamnesis responses.
   * @param studentId The ID of the student (auth user ID).
   * @param responses The complete object of responses.
   * @param isComplete Whether the anamnesis is fully completed.
   */
  async saveAnamnesis(
    studentId: string,
    responses: Record<string, AnamnesisResponse>,
    isComplete: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('student_anamnesis').upsert(
        {
          student_id: studentId,
          responses: responses,
          completed_at: isComplete ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      );

      if (error) {
        console.error('Error saving anamnesis to Supabase:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Unexpected error saving anamnesis:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async saveAdaptiveAnamnesis(
    studentId: string,
    responses: Record<string, string | number | string[] | boolean>,
    isComplete: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('student_anamnesis').upsert(
        {
          student_id: studentId,
          responses,
          completed_at: isComplete ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      );
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async savePersonaTrack(studentId: string, track: string): Promise<void> {
    // O update não devolvia nada e o erro sumia: gravar a trilha podia falhar
    // em silêncio e a tela seguia como se tivesse salvo.
    const { error } = await supabase
      .from('profiles')
      .update({ persona_track: track })
      .eq('id', studentId);
    if (error) throw error;
  },

  async getPersonaTrack(studentId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('persona_track')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw error;
    return data?.persona_track ?? null;
  },

  /**
   * Fetches the existing anamnesis for a student.
   * @param studentId The ID of the student.
   */
  async getAnamnesis(studentId: string): Promise<StudentAnamnesis | null> {
    try {
      const { data, error } = await supabase
        .from('student_anamnesis')
        // Só o que o chamador consome. A anamnese é o dado mais sensível do
        // aluno depois das fotos — `select('*')` a entregava inteira para quem
        // precisava de três campos.
        .select('student_id, responses, completed_at')
        .eq('student_id', studentId)
        .single();

      if (error) {
        // If simply not found, return null without error
        if (error.code === 'PGRST116') return null;

        console.error('Error fetching anamnesis:', error);
        throw error;
      }

      return {
        studentId: data.student_id,
        completedAt: data.completed_at,
        responses: data.responses,
      } as StudentAnamnesis;
    } catch (err) {
      console.error('Unexpected error fetching anamnesis:', err);
      return null;
    }
  },
};
