import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * O marcador dos textos de consentimento do kit (`Bullet`): o ponto na primária,
 * alinhado à primeira linha, e o texto ao lado. O texto aceita trechos em destaque
 * (`<Bullet.Strong>`), como o kit põe em negrito o que é lido e o que é descartado.
 *
 * @example
 * <Bullet>Passos e calorias do dia</Bullet>
 * <Bullet>Durante a corrida o GPS mede <Bullet.Strong>distância e ritmo</Bullet.Strong>.</Bullet>
 */
export function Bullet({ children }: { children: ReactNode }) {
  return (
    <View className="mb-[0.5625rem] flex-row items-start gap-2.5">
      <View className="mt-[0.4375rem] h-[0.3125rem] w-[0.3125rem] rounded-full bg-primary" />
      <Text className="flex-1 text-[0.8125rem] leading-[1.2rem] text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <Text className="font-semibold text-foreground">{children}</Text>;
}

Bullet.Strong = Strong;
