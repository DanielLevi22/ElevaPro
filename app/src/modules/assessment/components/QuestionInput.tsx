import type { AnamnesisQuestion } from '@elevapro/shared/data/anamnesisQuestions';
import { filtrarEntradaNumerica } from '@elevapro/shared/utils/anamnese';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { type ReactNode, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { ANSWER_FIELD, ChoiceOptions, YesNoOptions } from './AnswerOptions';

interface Props {
  question: AnamnesisQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}

/**
 * Uma pergunta da anamnese do Aluno, pelo tipo dela, no kit de vidro (#361).
 *
 * @example <QuestionInput question={pergunta} value={respostas[pergunta.id]} onChange={responder} />
 */
export const QuestionInput = ({ question, value, onChange }: Props) => {
  const cores = useCores();
  const [isFocused, setIsFocused] = useState(false);
  // O que está na tela enquanto o aluno digita, que não é o que o store guardou.
  // O store recebe o número já convertido; se o campo lesse de lá, a vírgula
  // sumiria no instante em que fosse digitada e o decimal ficaria impossível.
  const [digitado, setDigitado] = useState<string | null>(null);
  const campo = cn(ANSWER_FIELD, isFocused ? 'border-primary/55' : null);

  // Ramo próprio, e não o de texto com `keyboardType` trocado. O teclado
  // numérico é dica, não restrição — ele nem impede a vírgula —, e o campo
  // devolvia a string crua de qualquer jeito. O web já converte antes de
  // gravar; enquanto isto não convertia, a mesma pergunta virava número lá e
  // texto aqui, na mesma coluna jsonb.
  if (question.type === 'number') {
    return (
      <Pergunta texto={question.text}>
        <TextInput
          value={digitado ?? (value === undefined || value === null ? '' : String(value))}
          onChangeText={(bruto) => {
            // Filtra antes de guardar: `keyboardType` é dica de teclado, não
            // restrição, e sem isto "uns 3 anos" era gravado inteiro numa
            // pergunta numérica.
            const texto = filtrarEntradaNumerica(bruto);
            setDigitado(texto);
            // Campo vazio é resposta retirada, não zero. `Number("")` é 0, e
            // uma altura de 0 cm atravessa qualquer checagem de "respondeu?"
            // e chega ao consumidor como medida.
            if (texto === '') {
              onChange(undefined);
              return;
            }
            // A conversão aqui é só vírgula → ponto. O leitor normalizador do
            // `shared` NÃO serve nesta borda: ele aplica a faixa da pergunta,
            // e no meio da digitação de "175" o campo vale "1" — que a regra
            // do metro transformaria em 100 cm enquanto o aluno ainda digita.
            const numero = Number(texto.replace(',', '.'));
            if (Number.isFinite(numero)) onChange(numero);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={question.placeholder || 'Digite sua resposta...'}
          placeholderTextColor={cores.placeholder}
          keyboardType="numeric"
          className={campo}
        />
      </Pergunta>
    );
  }

  if (question.type === 'text') {
    return (
      <Pergunta texto={question.text}>
        <TextInput
          value={value as string}
          onChangeText={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={question.placeholder || 'Digite sua resposta...'}
          placeholderTextColor={cores.placeholder}
          multiline
          textAlignVertical="top"
          className={cn(campo, 'min-h-[7.5rem]')}
        />
      </Pergunta>
    );
  }

  if (question.type === 'date') {
    return (
      <Pergunta texto={question.text}>
        <CampoDeData value={value} onChange={onChange} />
      </Pergunta>
    );
  }

  if (question.type === 'boolean') {
    return (
      <Pergunta texto={question.text}>
        <YesNoOptions value={typeof value === 'boolean' ? value : undefined} onChange={onChange} />
      </Pergunta>
    );
  }

  if (question.type === 'single_choice') {
    return (
      <Pergunta texto={question.text}>
        <ChoiceOptions
          options={question.options ?? []}
          selected={typeof value === 'string' ? [value] : []}
          onToggle={onChange}
        />
      </Pergunta>
    );
  }

  if (question.type === 'multiple_choice') {
    const atuais = (Array.isArray(value) ? value : []) as string[];
    return (
      <Pergunta texto={question.text}>
        <ChoiceOptions
          multiple
          options={question.options ?? []}
          selected={atuais}
          onToggle={(opcao) =>
            onChange(
              atuais.includes(opcao) ? atuais.filter((v) => v !== opcao) : [...atuais, opcao]
            )
          }
        />
      </Pergunta>
    );
  }

  return null;
};

function Pergunta({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-2.5 text-rotulo font-bold tracking-tight text-foreground">{texto}</Text>
      {children}
    </View>
  );
}

const ICONE_DA_DATA = 18;

function CampoDeData({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const [abrirSeletor, setAbrirSeletor] = useState(false);
  const data = value ? new Date(value as string | number | Date) : null;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setAbrirSeletor(true)}
        accessibilityRole="button"
        className={cn(
          ANSWER_FIELD,
          'flex-row items-center justify-between',
          data ? 'border-primary/55' : null
        )}
      >
        <Text
          className={
            data ? 'text-[0.9375rem] text-foreground' : 'text-[0.9375rem] text-placeholder'
          }
        >
          {data ? data.toLocaleDateString('pt-BR') : 'Selecione a data'}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={escalar(ICONE_DA_DATA)}
          color={data ? cores.primaryText : cores.placeholder}
        />
      </TouchableOpacity>

      {abrirSeletor && (
        <DateTimePicker
          value={data ?? new Date()}
          mode="date"
          display="default"
          onChange={(_event: unknown, escolhida?: Date) => {
            setAbrirSeletor(false);
            if (escolhida) onChange(escolhida.toISOString());
          }}
        />
      )}
    </>
  );
}
