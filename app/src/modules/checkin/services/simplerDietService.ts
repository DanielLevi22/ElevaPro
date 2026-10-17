import type { SimplerDietPending } from '@elevapro/shared';
import { tokenDaSessao } from '@/auth';
import { postBff } from '@/shared/bff';

/**
 * Pede ao BFF o cardápio mais simples do check-in (A5c): a mesma meta, uma
 * refeição a menos e receitas rápidas. Nada é gravado até "Aprovar cardápio"
 * (ADR-0020); o servidor confere de novo se a semana pede isso.
 *
 * @example const diet = await requestSimplerDiet(semana.checkIn.id);
 */
export async function requestSimplerDiet(checkInId: string): Promise<SimplerDietPending> {
  const { diet } = await postBff<{ diet: SimplerDietPending }>(
    '/api/ai/student/diet/simplify',
    { checkInId },
    { token: tokenDaSessao() }
  );
  return diet;
}

/**
 * Aprova o cardápio mais simples: o servidor grava a cópia que a pessoa viu,
 * registra o ajuste e fecha o check-in.
 *
 * @example await approveSimplerDiet();
 */
export async function approveSimplerDiet(): Promise<void> {
  await postBff('/api/ai/student/diet/simplify/approve', {}, { token: tokenDaSessao() });
}
