import type { AdaptiveQuestion } from '@elevapro/shared/data/anamnesisAdaptive';
import { filtrarEntradaNumerica } from '@elevapro/shared/utils/anamnese';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/** O tique dentro da caixinha de escolha múltipla. */
const TAMANHO_DO_CHECK = 10;

/** O valor de uma resposta da anamnese adaptativa, antes de ir ao banco. */
export type AnamnesisValue = string | number | string[] | boolean;

/**
 * O campo de uma pergunta da anamnese adaptativa, pelo tipo dela: texto, número com
 * unidade, sim ou não, e escolha única ou múltipla.
 *
 * Saiu de `AdaptiveAnamnesisScreen` quando a anamnese do Praticante ganhou as
 * perguntas de medida (#312) e a tela passou do limite de tamanho.
 *
 * @example <AdaptiveQuestionField question={pergunta} value={respostas[pergunta.id]} onChange={responder} />
 */
export function AdaptiveQuestionField({
  question,
  value,
  onChange,
}: {
  question: AdaptiveQuestion;
  value: AnamnesisValue | undefined;
  onChange: (v: AnamnesisValue) => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  // O que está na tela enquanto o aluno digita, que não é o que o pai guardou.
  // O pai recebe o número já convertido; se o campo lesse de lá, a vírgula sumiria
  // no instante em que fosse digitada e o decimal ficaria impossível.
  const [typed, setTyped] = useState<string | null>(null);

  if (question.type === 'text') {
    return (
      <TextInput
        className="min-h-20 rounded-xl border border-glass-border bg-glass-strong px-4 py-3 text-sm text-foreground"
        value={(value as string) ?? ''}
        onChangeText={onChange}
        placeholder={question.placeholder ?? 'Sua resposta...'}
        placeholderTextColor={cores.placeholder}
        multiline
        textAlignVertical="top"
      />
    );
  }

  if (question.type === 'number') {
    return (
      <View className="relative">
        <TextInput
          className="rounded-xl border border-glass-border bg-glass-strong px-4 py-3 pr-16 text-sm text-foreground"
          value={typed ?? (value !== undefined && value !== '' ? String(value) : '')}
          onChangeText={(raw) => {
            // Antes era `onChange(Number(t))` cru: qualquer letra virava `NaN`
            // e ia parar no banco como resposta da pergunta.
            const text = filtrarEntradaNumerica(raw);
            setTyped(text);
            if (text === '') {
              onChange('');
              return;
            }
            const parsed = Number(text.replace(',', '.'));
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
          placeholder={question.placeholder ?? '0'}
          placeholderTextColor={cores.placeholder}
          keyboardType="numeric"
        />
        {question.unit && (
          <View className="absolute right-4 top-0 bottom-0 justify-center">
            <Text className="text-sm font-medium text-placeholder">{question.unit}</Text>
          </View>
        )}
      </View>
    );
  }

  if (question.type === 'boolean') {
    return (
      <View className="flex-row gap-3">
        {([true, false] as const).map((opt) => (
          <TouchableOpacity
            key={String(opt)}
            onPress={() => onChange(opt)}
            className={`flex-1 py-3 rounded-xl border items-center ${
              value === opt ? 'border-primary bg-primary' : 'border-glass-border bg-glass'
            }`}
          >
            <Text
              className={`text-sm font-bold ${value === opt ? 'text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {opt ? 'Sim' : 'Não'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (question.type === 'single_choice' && question.options) {
    return (
      <View className="gap-2">
        {question.options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            className={`w-full px-5 py-3 rounded-xl border ${
              value === opt ? 'border-primary bg-primary' : 'border-glass-border bg-glass'
            }`}
          >
            <Text
              className={`text-sm font-medium ${value === opt ? 'text-primary-foreground' : 'text-foreground'}`}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (question.type === 'multiple_choice' && question.options) {
    const selected = (value as string[]) ?? [];
    const toggle = (opt: string) =>
      onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
    return (
      <View className="gap-2">
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggle(opt)}
              className={`w-full px-5 py-3 rounded-xl border flex-row items-center gap-3 ${
                isSelected ? 'border-primary bg-primary' : 'border-glass-border bg-glass'
              }`}
            >
              <View
                className={`w-4 h-4 rounded border items-center justify-center ${
                  isSelected ? 'border-foreground bg-foreground' : 'border-muted-foreground'
                }`}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={escalar(TAMANHO_DO_CHECK)}
                    color={cores.primary}
                  />
                )}
              </View>
              <Text
                className={`text-sm font-medium flex-1 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return null;
}
