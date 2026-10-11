import {
  formatarCarga,
  MS_POR_SEGUNDO,
  numeroDaPrescricao,
  type WorkoutExercise,
} from '@elevapro/shared';
import type { RestOnLockScreen } from '../../../../modules/rest-timer-activity';
import { type EstadoDaSessao, proximaSerie } from '../store/maquinaDaSessao';

/**
 * O descanso da sessão como a tela bloqueada mostra (desenho 6c), ou `null`
 * fora do descanso.
 *
 * Pausado, o fim é calculado a partir de agora: a tela mostra o tempo parado,
 * e o +15 s soma a partir dele.
 *
 * @example
 * restOnLockScreen(sessao, Date.now())
 * // { title: 'Descanso · Remada curvada', subtitle: 'Próxima: série 3 · 10 × 45 kg', ... }
 */
export function restOnLockScreen(sessao: EstadoDaSessao, now: number): RestOnLockScreen | null {
  const { descanso } = sessao;
  const next = proximaSerie(sessao);
  if (sessao.momento !== 'descanso' || !descanso || !next) return null;
  const paused = descanso.pausadoCom;
  return {
    title: `Descanso · ${next.item.exercise?.name ?? 'Exercício'}`,
    subtitle: `Próxima: série ${next.numero} · ${setTarget(next.item)}`,
    endsAt: paused === null ? descanso.terminaEm : now + paused * MS_POR_SEGUNDO,
    totalSeconds: descanso.total,
    pausedRemaining: paused,
    doneTitle: `Hora da série ${next.numero}`,
    addLabel: '15 s',
    skipLabel: 'Pular',
  };
}

/** "10 × 45 kg"; sem carga, "10 reps"; tempo, "10 min" sozinho. */
function setTarget(item: WorkoutExercise): string {
  const reps = item.reps ?? '—';
  const load = numeroDaPrescricao(item.weight);
  if (load !== null) return `${reps} × ${formatarCarga(load)}`;
  return numeroDaPrescricao(item.reps) === null ? reps : `${reps} reps`;
}
