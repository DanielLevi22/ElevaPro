import type { Vista } from './portao';

/**
 * As três poses do scan, com o que a grade e a câmera dizem de cada uma.
 *
 * Três, não quatro: as duas laterais davam a mesma informação para a análise e
 * dobravam o incômodo de se fotografar — o que faz o aluno desistir no meio. O
 * lado direito é instrução, para as análises saírem comparáveis; o portão não
 * confere o lado (#316).
 *
 * @example POSES.find((pose) => pose.id === 'side')?.title // "Perfil direito"
 */
export interface Pose {
  id: Vista;
  /** O nome curto do quadro da grade. */
  label: string;
  /** O título da câmera. */
  title: string;
  hint: string;
}

export const POSES: readonly Pose[] = [
  { id: 'front', label: 'Frente', title: 'Frente', hint: 'Braços levemente afastados' },
  { id: 'back', label: 'Costas', title: 'Costas', hint: 'De costas, mesma distância' },
  { id: 'side', label: 'Perfil', title: 'Perfil direito', hint: 'Lado direito, braços soltos' },
];

export const POSE_COUNT = POSES.length;

/**
 * A posição da pose no scan, contando de 1.
 *
 * @example poseNumber('back') // 2
 */
export function poseNumber(id: Vista): number {
  return POSES.findIndex((pose) => pose.id === id) + 1;
}

/** O tÃ­tulo da cÃ¢mera; a rota sÃ³ aceita uma `Vista` do mesmo conjunto. */
export function poseTitle(id: Vista): string {
  return POSES.find((pose) => pose.id === id)?.title ?? 'Foto';
}
