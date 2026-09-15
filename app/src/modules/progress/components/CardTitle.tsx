import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * O título de dentro dos cartões do kit de métricas (`CardTitle`).
 *
 *     11 / 800 / .12em, maiúsculas, label2; nota 11,5 em label3, 3 abaixo; 12 de margem
 *
 * @example <CardTitle note="Soma de carga × repetições por semana">Carga total levantada</CardTitle>
 */
interface CardTitleProps {
  children: string;
  note?: string;
  /** O que fica à direita do título, como a seta de escolher outro exercício. */
  trailing?: ReactNode;
}

export function CardTitle({ children, note, trailing }: CardTitleProps) {
  return (
    <View className="mb-3 flex-row items-start justify-between">
      <View className="min-w-0 flex-1">
        <Text className="text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
          {children}
        </Text>
        {note ? (
          <Text className="mt-[0.1875rem] text-[0.71875rem] text-placeholder">{note}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
