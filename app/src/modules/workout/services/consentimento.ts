import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

const healthService = createHealthService(supabase);

/**
 * Consentimento vigente para dado de saúde, fechado na dúvida.
 *
 * Falha de rede não autoriza: sem esta escolha, uma queda de conexão viraria
 * permissão para gravar dado de Art. 11.
 */
async function temConsentimento(studentId: string): Promise<boolean> {
  try {
    return await healthService.hasCollectionConsent(studentId);
  } catch {
    return false;
  }
}

/**
 * Devolve as observações do aluno só quando há consentimento vigente para dado
 * de saúde; caso contrário, `undefined` — a sessão é gravada sem elas.
 *
 * Séries, cargas, datas e PSE são execução de contrato e não dependem de
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
  return (await temConsentimento(studentId)) ? notas : undefined;
}

/**
 * Devolve a frequência cardíaca média só quando há consentimento vigente;
 * caso contrário, `null` — a sessão é gravada sem ela.
 *
 * Mesma decisão das observações, aplicada à outra metade sensível da corrida.
 * Distância, ritmo e cadência atravessam sem passar por aqui: são execução de
 * contrato, e exigir consentimento para elas desligaria o acompanhamento de
 * desempenho de quem revoga (migration `0049`).
 *
 * O portão existe em duas camadas de propósito. A RLS impede o **especialista**
 * de ler sem consentimento; esta função impede o app de **gravar**. A primeira
 * sozinha deixaria o dado entrar no banco de quem já disse não.
 *
 * @example
 * const bpm = await batimentoSeConsentido(alunoId, (await readSessionVitals(ini, fim, null))?.avgHeartRate ?? null);
 */
export async function batimentoSeConsentido(
  studentId: string,
  batimento: number | null
): Promise<number | null> {
  if (batimento === null) return null;
  return (await temConsentimento(studentId)) ? batimento : null;
}
