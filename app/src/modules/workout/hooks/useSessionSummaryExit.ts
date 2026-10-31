import { useRouter } from 'expo-router';
import { ROUTES } from '@/navigation/types';
import { useConfirmLeave } from '@/navigation/useConfirmLeave';

/**
 * A saída do resumo do treino: o início da aba Treinos, venha a sessão de onde
 * vier (#440). Só para a tela que está no resumo.
 *
 * Não é `router.back`: aberta pelo detalhe, ele voltava ao "Iniciar treino";
 * pelo Início, à tela que a pilha de Treinos guardava; pelo widget, não havia
 * pilha embaixo. O voltar do sistema e o gesto seguem a mesma saída, sem
 * perguntar, porque a sessão já está gravada; ou `onSystemBack`, quando a tela
 * tem para onde voltar dentro dela (a de compartilhar volta ao resumo).
 *
 * @returns o Concluir do resumo.
 *
 * @example
 * const finish = useSessionSummaryExit(sharing ? () => setSharing(false) : undefined);
 * <BotaoFixoNoRodape rotulo="Concluir" onPress={finish} />
 */
export function useSessionSummaryExit(onSystemBack?: () => void): () => void {
  const router = useRouter();
  const leave = useConfirmLeave(true, () => (onSystemBack ?? finish)());

  function finish() {
    leave(() => router.dismissTo(ROUTES.TABS.WORKOUTS));
  }

  return finish;
}
