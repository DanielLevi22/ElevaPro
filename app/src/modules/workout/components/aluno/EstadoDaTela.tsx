import { ActivityIndicator, Text } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useCores } from '@/shared/design';

/**
 * O que a tela mostra enquanto não tem o que mostrar: carregando, ou a
 * mensagem de que o item não existe.
 *
 * "Não encontrado" só aparece depois de a busca voltar sem nada. Antes disso
 * a ausência é carregamento — mostrar a mensagem no primeiro instante fazia a
 * tela afirmar que o ciclo não existia enquanto ainda o buscava.
 *
 * @example
 * <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Fase não encontrada." />
 */
interface EstadoDaTelaProps {
  naoEncontrado: boolean;
  mensagem: string;
}

export function EstadoDaTela({ naoEncontrado, mensagem }: EstadoDaTelaProps) {
  const cores = useCores();

  return (
    <ScreenLayout className="items-center justify-center px-6">
      {naoEncontrado ? (
        <Text className="text-center text-corpo text-muted-foreground">{mensagem}</Text>
      ) : (
        <ActivityIndicator color={cores.primary} />
      )}
    </ScreenLayout>
  );
}
