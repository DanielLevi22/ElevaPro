import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { AnamnesisQuestion } from '../types/assessment';

interface Props {
  question: AnamnesisQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}

export const QuestionInput = ({ question, value, onChange }: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // O que está na tela enquanto o aluno digita, que não é o que o store guardou.
  // O store recebe o número já convertido; se o campo lesse de lá, a vírgula
  // sumiria no instante em que fosse digitada e o decimal ficaria impossível.
  const [digitado, setDigitado] = useState<string | null>(null);
  const containerStyle = 'mb-8';
  const labelStyle = 'text-zinc-300 text-sm font-bold mb-2 uppercase tracking-wider font-sans ml-1';

  // Ramo próprio, e não o de texto com `keyboardType` trocado. O teclado
  // numérico é dica, não restrição — ele nem impede a vírgula —, e o campo
  // devolvia a string crua de qualquer jeito. O web já converte antes de
  // gravar; enquanto isto não convertia, a mesma pergunta virava número lá e
  // texto aqui, na mesma coluna jsonb.
  if (question.type === 'number') {
    return (
      <View className={containerStyle}>
        <Text className={labelStyle}>{question.text}</Text>
        <View
          className={`bg-zinc-900 border rounded-xl overflow-hidden shadow-sm ${
            isFocused ? 'border-orange-500 bg-zinc-900/80 shadow-orange-500/10' : 'border-zinc-800'
          }`}
        >
          <TextInput
            value={digitado ?? (value === undefined || value === null ? '' : String(value))}
            onChangeText={(texto) => {
              setDigitado(texto);
              // Campo vazio é resposta retirada, não zero. `Number("")` é 0, e
              // uma altura de 0 cm atravessa qualquer checagem de "respondeu?"
              // e chega ao consumidor como medida.
              if (texto.trim() === '') {
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
            placeholderTextColor="#52525B"
            keyboardType="numeric"
            className="p-4 text-white text-base font-sans"
          />
        </View>
      </View>
    );
  }

  if (question.type === 'text') {
    return (
      <View className={containerStyle}>
        <Text className={labelStyle}>{question.text}</Text>
        <View
          className={`bg-zinc-900 border rounded-xl overflow-hidden shadow-sm ${
            isFocused ? 'border-orange-500 bg-zinc-900/80 shadow-orange-500/10' : 'border-zinc-800'
          }`}
        >
          <TextInput
            value={value as string}
            onChangeText={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={question.placeholder || 'Digite sua resposta...'}
            placeholderTextColor="#52525B"
            className="p-4 text-white text-base font-sans"
            multiline
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
        </View>
      </View>
    );
  }

  if (question.type === 'date') {
    const dateValue = value ? new Date(value as string | number | Date) : new Date();

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR');
    };

    return (
      <View className={containerStyle}>
        <Text className={labelStyle}>{question.text}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowPicker(true)}
          className={`bg-zinc-900 border rounded-xl p-4 flex-row items-center justify-between ${
            value ? 'border-orange-500/50' : 'border-zinc-800'
          }`}
        >
          <Text
            className={`text-base font-sans ${value ? 'text-white font-medium' : 'text-zinc-500'}`}
          >
            {value ? formatDate(new Date(value as string | number | Date)) : 'Selecione a data'}
          </Text>
          <View
            className={`w-10 h-10 rounded-lg items-center justify-center ${
              value ? 'bg-orange-500/10' : 'bg-zinc-800'
            }`}
          >
            <Ionicons name="calendar" size={20} color={value ? colors.primary.solid : '#52525B'} />
          </View>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={(_event: unknown, selectedDate?: Date) => {
              setShowPicker(false);
              if (selectedDate) {
                onChange(selectedDate.toISOString());
              }
            }}
          />
        )}
      </View>
    );
  }

  // Boolean Input
  if (question.type === 'boolean') {
    return (
      <View className={containerStyle}>
        <Text className={labelStyle}>{question.text}</Text>
        <View className="flex-row gap-4">
          {[true, false].map((option) => (
            <TouchableOpacity
              key={option ? 'sim' : 'nao'}
              activeOpacity={0.8}
              onPress={() => onChange(option)}
              className={`flex-1 p-5 rounded-xl border-2 transition-all ${
                value === option
                  ? 'bg-orange-500/10 border-orange-500 shadow-sm shadow-orange-500/20'
                  : 'bg-zinc-900 border-zinc-800'
              } items-center justify-center`}
            >
              <Text
                className={`font-bold text-lg ${value === option ? 'text-orange-500' : 'text-zinc-500'}`}
              >
                {option ? 'Sim' : 'Não'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Single Choice Input
  if (question.type === 'single_choice') {
    return (
      <View className={containerStyle}>
        <Text className={labelStyle}>{question.text}</Text>
        <View className="gap-3">
          {question.options?.map((option) => (
            <TouchableOpacity
              key={option}
              activeOpacity={0.8}
              onPress={() => onChange(option)}
              className={`flex-row items-center p-4 rounded-xl border border-zinc-800 relative overflow-hidden ${
                value === option ? 'bg-orange-500/10 border-orange-500/50' : 'bg-zinc-900'
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 mr-4 items-center justify-center ${
                  value === option ? 'border-orange-500' : 'border-zinc-700'
                }`}
              >
                {value === option && <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
              </View>
              <Text
                className={`text-base flex-1 font-medium ${value === option ? 'text-white' : 'text-zinc-400'}`}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Multiple Choice Input
  if (question.type === 'multiple_choice') {
    const currentValues = (Array.isArray(value) ? value : []) as string[];

    const toggleOption = (option: string) => {
      if (currentValues.includes(option)) {
        onChange(currentValues.filter((v) => v !== option));
      } else {
        onChange([...currentValues, option]);
      }
    };

    return (
      <View className={containerStyle}>
        <Text className={labelStyle}>{question.text}</Text>
        <View className="gap-3">
          {question.options?.map((option) => {
            const isSelected = currentValues.includes(option);
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                onPress={() => toggleOption(option)}
                className={`flex-row items-center p-4 rounded-xl border border-zinc-800 ${
                  isSelected ? 'bg-orange-500/10 border-orange-500/50' : 'bg-zinc-900'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-md border-2 mr-4 items-center justify-center ${
                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-zinc-700'
                  }`}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
                <Text
                  className={`text-base flex-1 font-medium ${isSelected ? 'text-white' : 'text-zinc-400'}`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return null;
};
