import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

const healthService = createHealthService(supabase);

/**
 * Devolve as observações do aluno só quando há consentimento vigente para dado
 * de saúde; caso contrário, `undefined` — a sessão é gravada sem elas.
 *
 * Séries, cargas, datas e RPE são execução de contrato e não dependem de
 * consentimento. O texto livre é o que exige Art. 11: é onde o aluno escreve
 * "senti dor no ombro". Gravar os dois sob a mesma decisão trataria uma medida
 * de carga como relato clínico, ou o contrário.
 *
 * É isto que dá sentido ao "Agora não" do `HealthDataConsentGate`: sem esta
 * verificação, recusar seria um botão que não muda nada.
 *
 * Mora aqui, e não dentro de um store, porque a gravação e a CORREÇÃO do texto
 * passam pela mesma decisão e vivem em stores diferentes — `workoutStore` grava
 * a sessão, `workoutLogStore` corrige o feedback. Duas cópias divergiriam na
 * primeira vez que alguém mexesse numa delas.
 *
 * @example
 * const notas = await notasSeConsentido(alunoId, textoDigitado);
 */
export async function notasSeConsentido(
  studentId: string,
  notas: string | undefined
): Promise<string | undefined> {
  if (!notas?.trim()) return undefined;
  try {
    return (await healthService.hasCollectionConsent(studentId)) ? notas : undefined;
  } catch {
    // Falha de rede não autoriza: na dúvida, a sessão é gravada sem o texto.
    return undefined;
  }
}
