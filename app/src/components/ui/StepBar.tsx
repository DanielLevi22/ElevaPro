import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * Os passos do cadastro no kit (`Steps`): um traço por etapa, os feitos na
 * primária, e "1 de 2" à direita.
 *
 * @example <StepBar current={1} total={2} />
 */
export function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <View
      className="mt-4 flex-row items-center gap-[0.5625rem]"
      accessibilityLabel={`Etapa ${current} de ${total}`}
    >
      <View className="flex-1 flex-row gap-[0.3125rem]">
        {Array.from({ length: total }, (_, index) => (
          <View
            // A posição é a identidade do traço: a lista nunca reordena.
            // biome-ignore lint/suspicious/noArrayIndexKey: traços fixos, sem reordenação
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full',
              index < current ? 'bg-primary' : 'bg-glass-strong'
            )}
          />
        ))}
      </View>
      <Text className="text-[0.6875rem] font-bold tracking-wide text-placeholder">
        {`${current} de ${total}`}
      </Text>
    </View>
  );
}
