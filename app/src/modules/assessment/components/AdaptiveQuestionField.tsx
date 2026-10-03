import type { AdaptiveQuestion } from '@elevapro/shared/data/anamnesisAdaptive';
import { filtrarEntradaNumerica } from '@elevapro/shared/utils/anamnese';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';
import { ANSWER_FIELD, ChoiceOptions, YesNoOptions } from './AnswerOptions';

/** O valor de uma resposta da anamnese adaptativa, antes de ir ao banco. */
export type AnamnesisValue = string | number | string[] | boolean;

/**
 * O campo de uma pergunta da anamnese adaptativa, pelo tipo dela: texto, número com
 * unidade, sim ou não, e escolha única ou múltipla.
 *
 * Saiu de `AdaptiveAnamnesisScreen` quando a anamnese do Praticante ganhou as
 * perguntas de medida (#312) e a tela passou do limite de tamanho. As opções são
 * as mesmas da anamnese do Aluno (`AnswerOptions`, #361).
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
  // O que está na tela enquanto o aluno digita, que não é o que o pai guardou.
  // O pai recebe o número já convertido; se o campo lesse de lá, a vírgula sumiria
  // no instante em que fosse digitada e o decimal ficaria impossível.
  const [typed, setTyped] = useState<string | null>(null);

  if (question.type === 'text') {
    return (
      <TextInput
        className={cn(ANSWER_FIELD, 'min-h-[5rem]')}
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
          className={cn(ANSWER_FIELD, 'pr-16')}
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
      <YesNoOptions value={typeof value === 'boolean' ? value : undefined} onChange={onChange} />
    );
  }

  if (question.type === 'single_choice' && question.options) {
    return (
      <ChoiceOptions
        options={question.options}
        selected={typeof value === 'string' ? [value] : []}
        onToggle={onChange}
      />
    );
  }

  if (question.type === 'multiple_choice' && question.options) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <ChoiceOptions
        multiple
        options={question.options}
        selected={selected}
        onToggle={(opt) =>
          onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
        }
      />
    );
  }

  return null;
}
