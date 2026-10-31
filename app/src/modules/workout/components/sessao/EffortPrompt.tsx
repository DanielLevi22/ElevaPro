import type { ExerciseEffort } from '@elevapro/shared';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChipPick } from '@/components/ui/ChipPick';
import { Vidro } from '@/components/ui/Vidro';
import { useBottomOffset } from '@/shared/design';

const OPTIONS: { effort: ExerciseEffort; label: string }[] = [
  { effort: 'easy', label: 'Fácil' },
  { effort: 'ok', label: 'Ok' },
  { effort: 'hard', label: 'Difícil' },
];

/**
 * Onde o botão fixo do rodapé fica (122) e, havendo um, acima dele: a altura
 * do botão e o respiro. Sem botão, a pergunta desce até ali — mais alto, ela
 * cobriria o pausar do descanso.
 */
const FROM_BOTTOM = { aboveButton: 196, atFooter: 122 } as const;

/**
 * A pergunta do esforço (A2 do kit), depois da última série de um exercício.
 * Um toque responde e some; "Pular" some sem gravar nada, e a próxima carga
 * fica a mesma.
 *
 * @example <EffortPrompt name="Supino" aboveButton={false} onAnswer={(effort) => …} />
 */
export function EffortPrompt({
  name,
  aboveButton,
  onAnswer,
}: {
  name: string;
  /** A tela tem botão fixo no rodapé (o feedback). */
  aboveButton: boolean;
  onAnswer: (effort: ExerciseEffort | null) => void;
}) {
  const bottom = useBottomOffset(aboveButton ? FROM_BOTTOM.aboveButton : FROM_BOTTOM.atFooter);

  return (
    <View className="absolute left-[1.125rem] right-[1.125rem]" style={{ bottom }}>
      <Vidro forte className="p-3.5">
        <View className="mb-2.5 flex-row items-center justify-between">
          <Text numberOfLines={1} className="shrink text-sm font-bold text-foreground">
            Como foi {name}?
          </Text>
          <TouchableOpacity onPress={() => onAnswer(null)} accessibilityRole="button" hitSlop={12}>
            <Text className="text-xs font-semibold text-muted-foreground">Pular</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row gap-[0.4375rem]">
          {OPTIONS.map(({ effort, label }) => (
            <ChipPick
              key={effort}
              label={label}
              selected={false}
              onPress={() => onAnswer(effort)}
            />
          ))}
        </View>
        <Text className="mt-2 text-[0.71875rem] text-muted-foreground">
          Ajuda a sugerir a carga da próxima vez.
        </Text>
      </Vidro>
    </View>
  );
}
