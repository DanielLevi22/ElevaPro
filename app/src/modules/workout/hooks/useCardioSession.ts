import { MS_POR_SEGUNDO } from '@elevapro/shared';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { AppState } from 'react-native';
import {
  type CardioAction,
  type CardioSessionState,
  initialCardioSession,
  transitionCardio,
} from '../store/cardioSessionMachine';

/**
 * A sessão de cardio em andamento: o estado da máquina e o relógio.
 *
 * O relógio só bate ao vivo — é o que redesenha o mostrador —, e cada tique
 * avisa a máquina, que marca a meta batida. Pausado, o tempo não anda e a tela
 * não precisa acordar. Voltar do background acerta o relógio na hora.
 *
 * @example
 * const { session, now, dispatch } = useCardioSession();
 * dispatch({ type: 'start', now: Date.now() });
 */
export function useCardioSession(): {
  session: CardioSessionState;
  now: number;
  dispatch: (action: CardioAction) => void;
} {
  const [session, dispatch] = useReducer(transitionCardio, undefined, initialCardioSession);
  const [now, setNow] = useState(Date.now);
  const live = session.moment === 'live';

  useEffect(() => {
    if (!live) return;
    const tick = () => {
      const instant = Date.now();
      setNow(instant);
      dispatch({ type: 'tick', now: instant });
    };
    const interval = setInterval(tick, MS_POR_SEGUNDO);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      appState.remove();
    };
  }, [live]);

  // A ação leva o instante de quando aconteceu, e não o do último tique: a volta
  // marcada a 0,9 s do tique anterior não pode sair 0,9 s mais curta.
  const dispatchNow = useCallback((action: CardioAction) => {
    if ('now' in action) setNow(action.now);
    dispatch(action);
  }, []);

  return { session, now, dispatch: dispatchNow };
}
