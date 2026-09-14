import type { DietMeal, SugestaoDeRefeicao } from '@elevapro/shared';
import { fetchBff, lerRespostaBff } from '@/shared/bff';
import type { Macros } from './consumoDoDia';

/** O que o aparelho guarda de um aluno: as sugestões e o dia em que vieram. */
export interface SugestoesDoDiaGuardadas {
  dia: string;
  sugestoes: SugestaoDeRefeicao[];
}

/**
 * O que falta de cada macro para fechar a meta, inteiro e nunca negativo — a
 * rota recusa número abaixo de zero, e macro estourado não falta.
 *
 * @example faltamNoDia(plano.meta, plano.consumo) // { calorias: 860, ... }
 */
export function faltamNoDia(meta: Macros, consumo: Macros): Macros {
  const falta = (macro: keyof Macros) => Math.max(0, Math.round(meta[macro] - consumo[macro]));
  return {
    calorias: falta('calorias'),
    proteina: falta('proteina'),
    carboidrato: falta('carboidrato'),
    gordura: falta('gordura'),
  };
}

/**
 * Os nomes das refeições favoritas, na ordem do plano. Só o nome sai do
 * aparelho: nem o id, nem os itens (LGPD, Art. 6°, III).
 *
 * @example nomesDasFavoritas(refeicoesDoPlano, ['r1']) // ['Café da manhã']
 */
export function nomesDasFavoritas(refeicoes: DietMeal[], favoritas: string[]): string[] {
  return refeicoes.filter((r) => favoritas.includes(r.id)).map((r) => r.name);
}

/**
 * As sugestões guardadas, se ainda são de hoje. O dia virado pede sugestões
 * novas: o que falta recomeçou.
 *
 * @example sugestoesGuardadas(store.porAluno[alunoId], plano.hoje)
 */
export function sugestoesGuardadas(
  guardadas: SugestoesDoDiaGuardadas | undefined,
  hoje: string
): SugestaoDeRefeicao[] | null {
  return guardadas?.dia === hoje ? guardadas.sugestoes : null;
}

/**
 * As duas sugestões da rota do assistente para o que falta no dia.
 *
 * @example const sugestoes = await buscarSugestoesDoDia(faltam, ['Jantar'], token);
 */
export async function buscarSugestoesDoDia(
  faltam: Macros,
  favoritas: string[],
  token: string
): Promise<SugestaoDeRefeicao[]> {
  const { response, url } = await fetchBff(
    '/api/ai/student/sugestoes',
    { faltam, favoritas },
    { token }
  );
  const dados = await lerRespostaBff<{ sugestoes?: SugestaoDeRefeicao[] }>(response, url);
  if (!response.ok) {
    throw new Error(
      `sugestoes BFF error: status ${response.status}, esperado 2xx com { sugestoes }`
    );
  }
  return dados.sugestoes ?? [];
}
