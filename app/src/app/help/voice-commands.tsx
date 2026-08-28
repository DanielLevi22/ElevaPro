import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export default function VoiceCommandsHelpScreen() {
  const router = useRouter();

  const commands = [
    {
      title: 'Avançar Série / Exercício',
      description:
        'Registra a série atual como concluída e inicia o descanso (ou avança para o próximo exercício).',
      keywords: ['"Próxima"', '"Feito"', '"Concluído"'],
      icon: 'checkmark-circle-outline',
      color: '#34D399', // Emerald
    },
    {
      title: 'Finalizar Treino',
      description: 'Encerra o treino atual e abre a tela de feedback.',
      keywords: ['"Terminar treino"', '"Finalizar"', '"Acabei"'],
      icon: 'flag-outline',
      color: '#F87171', // Red
    },
    {
      title: 'Pausar Timer',
      description: 'Pausa a contagem regressiva do descanso.',
      keywords: ['"Pausar"', '"Pause"'],
      icon: 'pause-circle-outline',
      color: '#FBBF24', // Amber
    },
    {
      title: 'Retomar Timer',
      description: 'Continua a contagem do descanso de onde parou.',
      keywords: ['"Retomar"', '"Voltar"'],
      icon: 'play-circle-outline',
      color: '#60A5FA', // Blue
    },
    {
      title: 'Repetir Instrução',
      description: 'O Coach repetirá a última instrução ou detalhe do exercício.',
      keywords: ['"Repetir"', '"Não entendi"', '"O que é?"'],
      icon: 'refresh-circle-outline',
      color: '#A78BFA', // Violet
    },
  ];

  return (
    <ScreenLayout>
      <View className="flex-row items-center p-6 border-b border-zinc-800 bg-zinc-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white font-display">Comandos de Voz</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View className="mb-8">
          <Text className="text-zinc-400 text-base leading-6 mb-4">
            O <Text className="text-orange-500 font-bold">Smart Coach</Text> ajuda você a manter o
            foco no treino sem precisar tocar no celular.
          </Text>

          <View className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="mic" size={20} color="#FF6B35" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-lg">Como Usar</Text>
            </View>
            <Text className="text-zinc-400 leading-5">
              O microfone é ativado automaticamente quando você inicia o treino. Basta falar os
              comandos abaixo a qualquer momento.
            </Text>
          </View>
        </View>

        <Text className="text-white font-bold text-xl mb-6 font-display">Comandos Disponíveis</Text>

        <View className="gap-4">
          {commands.map((cmd) => (
            <View key={cmd.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <View className="flex-row items-start mb-3">
                <View className="p-2 rounded-lg bg-zinc-950 mr-3 border border-zinc-800">
                  <Ionicons
                    name={cmd.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={cmd.color}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg mb-1">{cmd.title}</Text>
                  <Text className="text-zinc-400 text-sm leading-5">{cmd.description}</Text>
                </View>
              </View>

              <View className="bg-zinc-950/50 rounded-lg p-3">
                <Text className="text-xs text-zinc-500 uppercase font-bold mb-2">Diga:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {cmd.keywords.map((kw) => (
                    <View
                      key={kw}
                      className="bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700"
                    >
                      <Text className="text-zinc-300 font-medium text-xs font-mono">{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
