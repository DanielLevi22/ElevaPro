import { Text, TouchableOpacity, View } from 'react-native';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { useDailyLogReminder } from '../hooks/useWeeklyCheckIn';

/**
 * A5b · O lembrete às 20h para registrar o dia: com registro parcial a meta
 * não muda, e o que o app oferece no lugar da bronca é ajudar a registrar.
 *
 * @example {semDados ? <DailyLogReminder /> : null}
 */
export function DailyLogReminder() {
  const { enabled, toggle } = useDailyLogReminder();
  return (
    <Vidro classeExterna="mt-4" className="flex-row items-center gap-3 p-3.5">
      <CaixaDeIcone icon="notifications-outline" tom="marca" />
      <View className="flex-1">
        <Text className="text-[0.78125rem] text-hero-secondary">
          <Text className="font-bold text-hero">Lembrete às 20h</Text> · para registrar o dia
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => toggle.mutate()}
        disabled={toggle.isPending}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        className="py-2"
      >
        <Text className="font-mono text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-primary-text">
          {enabled ? 'Ligado' : 'Ligar'}
        </Text>
      </TouchableOpacity>
    </Vidro>
  );
}
