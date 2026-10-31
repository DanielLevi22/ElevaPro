import type { BlockChanges, NextBlockPending } from '@elevapro/shared';
import { tokenDaSessao } from '@/auth';
import { postBff } from '@/shared/bff';

/**
 * Pede ao BFF o próximo bloco (B3), com o que mudou na reavaliação. Nada é
 * gravado: a proposta fica pendente até "Aprovar" (ADR-0020).
 *
 * @example const block = await requestNextBlock({ changes: { gym_type: 'Home gym' }, early: false });
 */
export async function requestNextBlock({
  changes,
  early,
}: {
  changes: BlockChanges;
  /** Trocar antes do fim do bloco (C1): o atual fecha hoje. */
  early: boolean;
}): Promise<NextBlockPending> {
  const { block } = await postBff<{ block: NextBlockPending }>(
    '/api/ai/student/block/next',
    { changes, early },
    { token: tokenDaSessao() }
  );
  return block;
}

/**
 * Aprova o próximo bloco (B5): o servidor grava a cópia que a pessoa viu e
 * encerra o anterior.
 *
 * @example await approveNextBlock();
 */
export async function approveNextBlock(): Promise<void> {
  await postBff('/api/ai/student/block/approve', {}, { token: tokenDaSessao() });
}
