import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '@/navigation/types';

/**
 * O que preparar antes da câmera abrir.
 *
 * Ensina **só o que o aluno controla**. Enquadramento, distância e nível não
 * estão aqui: o portão corrige os três sozinho, e pedir que ele decore o que a
 * máquina já resolve é passar trabalho para o lado errado (`ADR-0022`).
 */
interface Preparo {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  porque: string;
}

const PREPAROS: Preparo[] = [
  {
    icone: 'shirt-outline',
    titulo: 'Roupa justa',
    porque:
      'A silhueta é o que dá as medidas, e ela enxerga o tecido, não você. Moletom devolve uma cintura que não é a sua.',
  },
  {
    icone: 'footsteps-outline',
    titulo: 'Descalço',
    porque: 'O solado entra na altura e desloca a escala da foto inteira.',
  },
  {
    icone: 'phone-portrait-outline',
    titulo: 'Celular apoiado e em pé',
    porque:
      'Encostado numa parede ou num móvel, na altura da cintura. Na mão de outra pessoa ele oscila, e duas fotos oscilando diferente não se comparam.',
  },
  {
    icone: 'sunny-outline',
    titulo: 'Luz na sua frente',
    porque:
      'Janela ou lâmpada atrás de você apaga o contorno do corpo. Com a luz de frente, a silhueta aparece inteira.',
  },
  {
    icone: 'people-outline',
    titulo: 'Ninguém atrás de você',
    porque: 'A análise mede uma pessoa por vez, e quem passar no fundo pode roubar a medida.',
  },
];

export default function BodyScanTutorial() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const seguir = () => {
    router.replace({ pathname: ROUTES.ASSESSMENT.GRID, params: { studentId } });
  };

  return (
    <View className="flex-1 bg-background-primary" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <Text className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-6">
          Antes de começar
        </Text>
        <Text className="text-white text-3xl font-black mt-2 leading-9">
          Cinco coisas que só você pode ajustar
        </Text>
        <Text className="text-zinc-400 text-sm mt-3 leading-relaxed">
          Do resto o app cuida: ele vai te dizer, por voz, onde ficar e quando está certo. Estas
          cinco ele não consegue corrigir por você.
        </Text>

        <View className="mt-8 gap-3">
          {PREPAROS.map((preparo) => (
            <View
              key={preparo.titulo}
              className="flex-row gap-4 bg-white/5 border border-white/10 rounded-2xl p-4"
            >
              <View className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center">
                <Ionicons name={preparo.icone} size={20} color="#CCFF00" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">{preparo.titulo}</Text>
                <Text className="text-zinc-400 text-[13px] mt-1 leading-relaxed">
                  {preparo.porque}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4">
          <Text className="text-zinc-300 text-[13px] leading-relaxed">
            São três fotos — frente, costas e lateral. Você não aperta nada: quando estiver na
            posição certa, o app avisa, conta cinco segundos e fotografa sozinho.
          </Text>
        </View>
      </ScrollView>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={seguir}
          className="bg-primary py-4 rounded-2xl items-center"
          accessibilityRole="button"
        >
          <Text className="text-black font-black text-base uppercase tracking-widest">
            Entendi, vamos lá
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
