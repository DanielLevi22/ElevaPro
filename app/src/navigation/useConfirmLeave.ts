import { usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

/**
 * Segura a saída da tela enquanto `active` e pergunta antes de deixar sair:
 * o gesto e o voltar do sistema no meio de uma sessão perderiam o que foi feito.
 *
 * O react-navigation do expo-router 58 tirou o evento `beforeRemove`; o
 * caminho agora é o `usePreventRemove`. `ask` recebe `leave`, que solta a
 * trava e repete a saída que foi barrada. Quando a tela sai de `active`, a
 * trava volta a valer para a próxima sessão — a aba do cardio fica montada.
 *
 * @returns `exit(go)`, para a saída que a própria tela oferece (o X): solta a
 * trava sem perguntar e segue por `go`.
 *
 * @example
 * const exit = useConfirmLeave(inProgress, (leave) =>
 *   showConfirm({ title: 'Sair sem salvar?', message: '…', onConfirm: leave })
 * );
 */
export function useConfirmLeave(
  active: boolean,
  ask: (leave: () => void) => void
): (go: () => void) => void {
  const [released, setReleased] = useState(false);

  useEffect(() => {
    if (!active) setReleased(false);
  }, [active]);

  const disablePrevention = usePreventRemove(active && !released, ({ repeat }) =>
    ask(() => {
      setReleased(true);
      repeat();
    })
  );

  return useCallback(
    (go: () => void) => {
      setReleased(true);
      disablePrevention();
      go();
    },
    [disablePrevention]
  );
}
