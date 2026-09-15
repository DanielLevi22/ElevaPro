import { createAdaptiveAnamnesisService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { registrarFalha } from '@/lib/registro';
import { AnamnesisResponseValue, StudentAnamnesis } from '../types/assessment';

export const AnamnesisService = {
  /**
   * Saves or updates the student's anamnesis responses.
   * @param studentId The ID of the student (auth user ID).
   * @param responses The complete object of responses.
   * @param isComplete Whether the anamnesis is fully completed.
   */
  async saveAnamnesis(
    studentId: string,
    responses: Record<string, AnamnesisResponseValue>,
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

  /**
   * Grava a anamnese adaptativa do Praticante e, na conclusão, a primeira medida
   * declarada com as medidas que ele respondeu (#312).
   *
   * `selfGuided` é verdadeiro porque só o Praticante abre esta anamnese (a rota
   * escolhe pelo papel); quem confere a Guidance de verdade é a RLS da 0056.
   *
   * @example await AnamnesisService.saveAdaptiveAnamnesis(user.id, respostas, true);
   */
  async saveAdaptiveAnamnesis(
    studentId: string,
    responses: Record<string, string | number | string[] | boolean>,
    isComplete: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await createAdaptiveAnamnesisService(supabase).save({
        studentId,
        answers: responses,
        completed: isComplete,
        selfGuided: true,
      });
      return { success: true };
    } catch {
      // Sem o erro no log: o do PostgREST pode trazer a linha, e ela carrega medida
      // e histórico de saúde (Art. 6°, VII).
      registrarFalha('anamnesis.save_adaptive');
      return { success: false, error: 'Não foi possível salvar a anamnese.' };
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
