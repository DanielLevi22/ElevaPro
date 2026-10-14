import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { useRestActions } from '@/hooks/useRestPeriods';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { type RestCardState, restingTitle } from '../services/restCopy';

/**
 * O Modo Descanso na tela inicial: a pausa em curso, com "Voltar agora", ou
 * as boas-vindas da semana de retorno (A8 Volta).
 *
 * @example <RestCard state={{ kind: 'resting', rest }} />
 */
export function RestCard({ state }: { state: NonNullable<RestCardState> }) {
  const router = useRouter();
  const { end } = useRestActions();

  async function comeBack() {
    try {
      await end.mutateAsync();
    } catch {
      registrarFalha('rest.end');
      showAlert({
        title: 'Não foi possível voltar',
        message: 'Confira sua conexão e tente de novo.',
        type: 'error',
      });
    }
  }

  const resting = state.kind === 'resting';
  return (
    <Vidro classeExterna="mt-5" destaque className="gap-3 p-4">
      <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-primary-text">
        {resting ? 'Modo Descanso' : 'Fim do Modo Descanso'}
      </Text>
      <View>
        <Text className="font-display-black text-[1.375rem] tracking-tight text-hero">
          {resting ? restingTitle(state.rest) : 'Bem-vindo de volta'}
        </Text>
        <Text className="mt-1 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          {resting
            ? 'Sua sequência e o check-in esperam por você.'
            : 'Esta semana começa mais leve, com cargas menores.'}
        </Text>
      </View>
      <BotaoDeDestaque
        rotulo={resting ? (end.isPending ? 'Voltando…' : 'Voltar agora') : 'Ver a semana'}
        tamanho="cartao"
        disabled={end.isPending}
        onPress={() => (resting ? void comeBack() : router.push(ROUTES.BLOCK.RETURN))}
      />
    </Vidro>
  );
}
