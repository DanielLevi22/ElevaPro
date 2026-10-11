import { supabase } from '@elevapro/supabase';

/**
 * Se a pessoa já concluiu a anamnese: é o que decide se a entrada leva ao
 * onboarding.
 *
 * Lê só `completed_at`, nunca `responses`: para decidir a rota basta saber se
 * terminou, e as respostas são dado de saúde (Art. 6°, III).
 *
 * @example if (!(await hasCompletedAnamnesis(user.id))) router.replace(ROUTES.ONBOARDING.WELCOME);
 */
export async function hasCompletedAnamnesis(studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_anamnesis')
    .select('completed_at')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.completed_at);
}
