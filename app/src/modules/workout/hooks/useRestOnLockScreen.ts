import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  endRest,
  onRestAction,
  type RestAction,
  showRest,
  takeRestActions,
} from '../../../../modules/rest-timer-activity';
import { restOnLockScreen } from '../services/restOnLockScreen';
import type { AcaoDaSessao, EstadoDaSessao } from '../store/maquinaDaSessao';

const ADD_SECONDS = 15;

/** O toque da tela bloqueada como ação da sessão, no instante em que aconteceu. */
function toSessionAction(action: RestAction): AcaoDaSessao {
  return action.type === 'add_time'
    ? { tipo: 'ajustarDescanso', segundos: ADD_SECONDS, agora: action.at }
    : { tipo: 'terminarDescanso' };
}

/**
 * Leva o descanso para a tela bloqueada e traz de volta o que a pessoa tocou lá.
 *
 * A sessão é a fonte da verdade: o lado nativo age na hora sobre o toque, para
 * a tela não esperar o app acordar, e a sessão reaplica o mesmo toque quando o
 * lê — no aviso do módulo ou na volta ao app, o que vier primeiro. Falha do
 * lado nativo não derruba o treino: o descanso segue na tela do app.
 *
 * @example useRestOnLockScreen(sessao, despachar);
 */
export function useRestOnLockScreen(
  sessao: EstadoDaSessao,
  despachar: (acao: AcaoDaSessao) => void
): void {
  const rest = restOnLockScreen(sessao, Date.now());
  // Pausado, o fim sai de `Date.now()`: a chave ignora o fim para não reenviar
  // a cada render, e muda quando a pausa, o tempo ou a série mudam.
  const key = rest
    ? JSON.stringify({ ...rest, endsAt: rest.pausedRemaining ?? rest.endsAt })
    : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` resume o `rest`
  useEffect(() => {
    const sync = rest ? showRest(rest) : endRest();
    sync.catch(() => undefined);
  }, [key]);

  useEffect(
    () => () => {
      endRest().catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    const apply = () => {
      for (const action of takeRestActions()) despachar(toSessionAction(action));
    };
    apply();
    const subscription = onRestAction(apply);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') apply();
    });
    return () => {
      subscription?.remove();
      appState.remove();
    };
  }, [despachar]);
}
