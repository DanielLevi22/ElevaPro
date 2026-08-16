import type { PhysicalAssessment } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

/**
 * Última avaliação física do aluno, ou `null` quando não há nenhuma.
 *
 * **Lança quando a consulta falha.** A versão anterior fazia
 * `const { data } = await supabase...` — sem `error` — e devolvia `null` nos
 * dois casos. Como o `select` listava 27 colunas das quais só duas existiam, a
 * consulta falhava sempre com 42703 e a tela dizia "sem avaliação". A query
 * nunca funcionou e nada nunca acusou.
 *
 * @example
 * const avaliacao = await PhysicalAssessmentService.getLatest(studentId);
 * if (!avaliacao) mostrarVazio();
 */
export const PhysicalAssessmentService = {
  async getLatest(studentId: string): Promise<PhysicalAssessment | null> {
    const { data, error } = await supabase
      .from('physical_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as PhysicalAssessment | null) ?? null;
  },
};
