import type { AdaptiveQuestion } from '@elevapro/shared/data/anamnesisAdaptive';
import { filtrarEntradaNumerica } from '@elevapro/shared/utils/anamnese';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCores } from '@/shared/design';

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
  // O que esta na tela enquanto o aluno digita, que nao e o que o pai guardou.
  // O pai recebe o numero ja convertido; se o campo lesse de la, a virgula
  // sumiria no instante em que fosse digitada e o decimal ficaria impossivel.
  const [digitado, setDigitado] = useState<string | null>(null);

  if (question.type === 'text') {
    return (
      <TextInput
        className="bg-zinc-800/60 border border-white/10 rounded-xl text-white text-sm px-4 py-3 min-h-20"
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
          className="bg-zinc-800/60 border border-white/10 rounded-xl text-white text-sm px-4 py-3 pr-16"
          value={digitado ?? (value !== undefined && value !== '' ? String(value) : '')}
          onChangeText={(bruto) => {
            // Antes era `onChange(Number(t))` cru: qualquer letra virava `NaN`
            // e ia parar no banco como resposta da pergunta.
            const texto = filtrarEntradaNumerica(bruto);
            setDigitado(texto);
            if (texto === '') {
              onChange('');
              return;
            }
            const numero = Number(texto.replace(',', '.'));
            if (Number.isFinite(numero)) onChange(numero);
          }}
          placeholder={question.placeholder ?? '0'}
          placeholderTextColor={cores.placeholder}
          keyboardType="numeric"
        />
        {question.unit && (
          <View className="absolute right-4 top-0 bottom-0 justify-center">
            <Text className="text-zinc-500 text-sm font-medium">{question.unit}</Text>
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
              value === opt ? 'bg-white border-white' : 'bg-zinc-900 border-white/10'
            }`}
          >
            <Text className={`text-sm font-bold ${value === opt ? 'text-black' : 'text-zinc-400'}`}>
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
              value === opt ? 'bg-white border-white' : 'bg-zinc-900 border-white/10'
            }`}
          >
            <Text
              className={`text-sm font-medium ${value === opt ? 'text-black' : 'text-zinc-300'}`}
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
                isSelected ? 'bg-white border-white' : 'bg-zinc-900 border-white/10'
              }`}
            >
              <View
                className={`w-4 h-4 rounded border items-center justify-center ${
                  isSelected ? 'bg-black border-black' : 'border-zinc-600'
                }`}
              >
                {isSelected && <Ionicons name="checkmark" size={10} color={cores.sobreImagem} />}
              </View>
              <Text
                className={`text-sm font-medium flex-1 ${isSelected ? 'text-black' : 'text-zinc-300'}`}
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
