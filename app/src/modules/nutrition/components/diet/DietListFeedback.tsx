import { ActivityIndicator, Text, View } from 'react-native';
import { useCores } from '@/shared/design';
import { ToggleChip } from './ToggleChip';

interface DietListFeedbackProps {
  loaded: boolean;
  error: boolean;
  paused: boolean;
  onRetry: () => void;
  noun: 'planos' | 'alunos';
}

/** Estados remotos da lista e do seletor, sem esconder conteúdo numa falha de atualização. */
export function DietListFeedback({ loaded, error, paused, onRetry, noun }: DietListFeedbackProps) {
  const colors = useCores();
  if (loaded && !error) return null;
  if (error)
    return (
      <View className="items-start gap-3 py-4">
        <Text accessibilityRole="alert" className="text-sm text-muted-foreground">
          {loaded
            ? 'Não foi possível atualizar. Exibindo os dados anteriores.'
            : `Não foi possível carregar os ${noun}.`}
        </Text>
        <ToggleChip active={false} onPress={onRetry}>
          Tentar novamente
        </ToggleChip>
      </View>
    );
  return (
    <View className="items-center gap-3 py-6">
      {!paused && <ActivityIndicator color={colors.primaryText} />}
      <Text accessibilityRole="alert" className="text-sm text-muted-foreground">
        {paused ? 'Sem conexão. Conecte-se para continuar.' : `Carregando ${noun}…`}
      </Text>
    </View>
  );
}
