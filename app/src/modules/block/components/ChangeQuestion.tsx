import type { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { ChipPick } from '@/components/ui/ChipPick';
import { Vidro } from '@/components/ui/Vidro';

interface ChangeQuestionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** A resposta de hoje, como a pessoa a lê: "em casa", "4 dias". */
  current: string;
  changed: boolean;
  onChange: (changed: boolean) => void;
  /** As opções novas, só quando "Mudou". */
  children: ReactNode;
}

/**
 * Uma pergunta de "Mudou alguma coisa?" (B2): a resposta de hoje, Igual ou
 * Mudou, e as opções só para quem mudou. Quem não toca em nada segue igual.
 *
 * @example <ChangeQuestion icon="home-outline" title="Onde você treina" current="em casa" changed={false} onChange={setChanged}>…</ChangeQuestion>
 */
export function ChangeQuestion({
  icon,
  title,
  current,
  changed,
  onChange,
  children,
}: ChangeQuestionProps) {
  return (
    <Vidro classeExterna="mb-[0.5625rem]" destaque={changed} className="gap-2.5 p-[0.8125rem]">
      <View className="flex-row items-center gap-3">
        <CaixaDeIcone icon={icon} tom="marca" tamanho="bloco" />
        <View className="flex-1">
          <Text className="text-[0.84375rem] font-bold text-foreground">{title}</Text>
          <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">Hoje: {current}</Text>
        </View>
      </View>
      <View className="flex-row gap-[0.4375rem]">
        <ChipPick label="Igual" selected={!changed} onPress={() => onChange(false)} />
        <ChipPick label="Mudou" selected={changed} onPress={() => onChange(true)} />
      </View>
      {changed ? children : null}
    </Vidro>
  );
}
