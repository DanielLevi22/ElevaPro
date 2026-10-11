import { achatarRespostas, createAdaptiveAnamnesisService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

/**
 * As respostas do onboarding já gravadas, para retomar de onde a pessoa parou.
 *
 * @example const saved = await loadOnboardingAnswers(user.id); // { height: 172, ... }
 */
export async function loadOnboardingAnswers(studentId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('student_anamnesis')
    .select('responses')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return achatarRespostas(data?.responses as Record<string, unknown> | null);
}

/**
 * Grava as respostas de uma tela somadas às que já estavam lá.
 *
 * A anamnese grava `responses` inteiro a cada upsert: mandar só a tela atual
 * apagaria as anteriores. Somar aqui é o que deixa cada tela gravar sozinha, e
 * a retomada achar tudo. Só depois do aceite de saúde: sem ele o banco recusa
 * (0083).
 *
 * @example await saveOnboardingAnswers(user.id, { age: 29, height: 172, weight: 78, gender: 'Feminino' });
 */
export async function saveOnboardingAnswers(
  studentId: string,
  screenAnswers: Record<string, unknown>,
  { complete = false }: { complete?: boolean } = {}
): Promise<void> {
  const saved = await loadOnboardingAnswers(studentId);
  await createAdaptiveAnamnesisService(supabase).save({
    studentId,
    answers: { ...saved, ...screenAnswers },
    // Concluir é o que tira a pessoa do guarda de rotas: só a última tela conclui.
    completed: complete,
    selfGuided: true,
  });
}
