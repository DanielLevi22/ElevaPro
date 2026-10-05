import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useConsentPromptStore } from '@/components/consent/consentPromptStore';
import { Vidro } from '@/components/ui/Vidro';
import { useCores } from '@/shared/design';

const MESSAGES: Readonly<Record<string, string>> = {
  error: 'Não foi possível carregar a refeição. Tente novamente.',
  consent_required:
    'Para consultar opções da sua refeição, confirme o consentimento de dados de saúde.',
  forbidden: 'Esta conta não tem acesso à refeição.',
  not_found: 'Essa refeição não está no seu plano ativo ou na data aberta.',
};

export function RecipeFeedback({
  status,
  onRetry,
  message,
}: {
  status: 'loading' | 'error' | 'consent_required' | 'forbidden' | 'not_found' | 'empty';
  onRetry?: () => void;
  message?: string;
}) {
  const colors = useCores();
  const action =
    status === 'consent_required' ? () => useConsentPromptStore.getState().request() : onRetry;
  return (
    <Vidro className="p-5">
      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando refeição" />
      ) : null}
      <Text className="mt-2 text-corpo text-foreground">
        {message ?? MESSAGES[status] ?? 'Carregando sua refeição…'}
      </Text>
      {action && status !== 'loading' ? (
        <View className="mt-4">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={action}
            className="rounded-xl bg-primary px-4 py-3"
          >
            <Text className="text-center font-bold text-primary-foreground">
              {status === 'consent_required' ? 'Revisar consentimento' : 'Tentar novamente'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {status === 'consent_required' && onRetry ? (
        <TouchableOpacity accessibilityRole="button" onPress={onRetry} className="mt-3 p-3">
          <Text className="text-center font-bold text-primary">Já revisei, tentar novamente</Text>
        </TouchableOpacity>
      ) : null}
    </Vidro>
  );
}
