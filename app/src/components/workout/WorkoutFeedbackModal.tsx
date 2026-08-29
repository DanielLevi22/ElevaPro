import { rpeLabelComEmoji } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface WorkoutFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (intensity: number, notes: string) => void;
  /**
   * `correcao` carrega os valores já gravados e troca os textos.
   *
   * O modo existe porque o Art. 18, III dá ao titular o direito de corrigir o
   * que ele mesmo declarou, e até a `0036` não havia caminho nenhum: o aluno
   * apertava "Salvar e Finalizar" e o texto ficava como estava para sempre.
   */
  mode?: 'registro' | 'correcao';
  /** Valores atuais da sessão, no modo correção. */
  initialIntensity?: number | null;
  initialNotes?: string | null;
  /** Só no modo correção: apaga a observação e mantém a sessão. */
  onDeleteNotes?: () => void;
}

const RPE_PADRAO = 5;

export function WorkoutFeedbackModal({
  visible,
  onClose,
  onSubmit,
  mode = 'registro',
  initialIntensity,
  initialNotes,
  onDeleteNotes,
}: WorkoutFeedbackModalProps) {
  const corrigindo = mode === 'correcao';
  const [intensity, setIntensity] = useState(initialIntensity ?? RPE_PADRAO);
  const [notes, setNotes] = useState(initialNotes ?? '');

  // Os valores chegam depois do primeiro render: a lista abre o modal e o item
  // selecionado só existe a partir daí. Sem isto, corrigir a segunda sessão
  // mostraria o texto da primeira — e o aluno salvaria a declaração errada
  // achando que corrigiu a certa.
  useEffect(() => {
    if (!visible) return;
    setIntensity(initialIntensity ?? RPE_PADRAO);
    setNotes(initialNotes ?? '');
  }, [visible, initialIntensity, initialNotes]);

  // A tabela de rótulos saiu daqui para `@elevapro/shared` em 2026-08-28: o
  // especialista passou a ler a mesma escala no feed de atividades, e duas
  // tabelas divergiriam na primeira vez que alguém mexesse numa delas.
  const getIntensityColor = (value: number) => {
    if (value <= 2) return 'bg-blue-500';
    if (value <= 4) return 'bg-green-500';
    if (value <= 6) return 'bg-yellow-500';
    if (value <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleSubmit = () => {
    onSubmit(intensity, notes);
    // Reset state for next time
    setIntensity(RPE_PADRAO);
    setNotes('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/80">
        <View className="bg-zinc-900 rounded-t-3xl p-6 border-t border-zinc-800">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold font-display">
              {corrigindo ? 'Corrigir feedback' : 'Como foi o treino?'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* Intensity Selector */}
          <View className="mb-8">
            <Text className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-4">
              Intensidade (RPE)
            </Text>

            <View className="flex-row justify-between items-center mb-4 bg-zinc-800/50 p-4 rounded-xl">
              <TouchableOpacity
                onPress={() => setIntensity(Math.max(1, intensity - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="remove" size={24} color="white" />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-4xl font-bold text-white font-display mb-1">{intensity}</Text>
                <View className={`px-3 py-1 rounded-full ${getIntensityColor(intensity)}`}>
                  <Text className="text-white text-xs font-bold uppercase">
                    {rpeLabelComEmoji(intensity)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIntensity(Math.min(10, intensity + 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Visual Bar */}
            <View className="flex-row h-2 rounded-full overflow-hidden bg-zinc-800 gap-0.5">
              {[...Array(10)].map((_, i) => {
                return (
                  <View
                    // biome-ignore lint/suspicious/noArrayIndexKey: RPE bar items have no unique ID
                    key={`rpe-${i}`}
                    className={`flex-1 ${i < intensity ? getIntensityColor(intensity) : 'bg-transparent'}`}
                  />
                );
              })}
            </View>
          </View>

          {/* Notes Input */}
          <View className="mb-8">
            <Text className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-3">
              Observações (Opcional)
            </Text>
            <TextInput
              className="bg-zinc-800 text-white p-4 rounded-xl min-h-[100px] text-base"
              placeholder="Ex: Senti dor no ombro, aumentei a carga no supino..."
              placeholderTextColor="#52525B"
              multiline
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
            {/*
              Toda vez, não uma. O consentimento é dado uma única vez e some da
              memória; o que muda o que a pessoa escreve é saber, na hora de
              escrever, quem vai ler. Sem esta linha o aluno relata dor sem
              perceber que está falando com o profissional — e a transparência
              do Art. 6°, VI é sobre o momento da coleta.
            */}
            {/*
              No modo correção o tempo verbal muda, e a mudança é o ponto.
              Dizer que o feedback JÁ FOI LIDO impede a impressão falsa de que a
              versão anterior nunca existiu na cabeça do profissional — a
              transparência do Art. 6°, VI é sobre o momento em que a pessoa
              age, não sobre o termo que ela aceitou uma vez.
            */}
            <View className="flex-row items-start gap-2 mt-2.5">
              <Ionicons name="eye-outline" size={14} color="#71717A" style={{ marginTop: 2 }} />
              <Text className="text-zinc-500 text-xs flex-1">
                {corrigindo
                  ? 'Seu personal já leu este feedback. A correção aparece marcada para ele.'
                  : 'Seu personal vê este feedback.'}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-primary p-4 rounded-xl items-center mb-4"
            activeOpacity={0.8}
          >
            <Text className="text-primary-foreground font-bold text-lg font-display">
              {corrigindo ? 'Salvar correção' : 'Salvar e Finalizar'}
            </Text>
          </TouchableOpacity>

          {/*
            Só aparece quando há texto para apagar. Um botão de apagar sobre um
            campo vazio é um botão que não faz nada — e o aluno que o aperta fica
            sem saber se apagou ou se falhou.
          */}
          {corrigindo && onDeleteNotes && notes.trim().length > 0 && (
            <TouchableOpacity
              onPress={onDeleteNotes}
              className="p-4 rounded-xl items-center mb-4 border border-zinc-700"
              activeOpacity={0.8}
            >
              <Text className="text-red-400 font-bold text-base font-display">
                Apagar observação
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
