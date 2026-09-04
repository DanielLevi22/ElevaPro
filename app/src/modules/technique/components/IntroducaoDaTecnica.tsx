import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';

/**
 * O que o aluno lê antes de a câmera abrir.
 *
 * Equivalente ao `BodyScanIntroduction`, e pela mesma razão: consentimento
 * informado (Art. 9°) é sobre o texto que a pessoa leu, não sobre o clique. O
 * botão vem depois do texto de propósito.
 *
 * **Não promete precisão.** O critério é geométrico e o limiar ainda não saiu
 * de corpus rotulado — dizer "o app sabe se você agachou certo" seria prometer
 * o que não se mediu.
 */

interface PontoProps {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  titulo: string;
  children: string;
}

function Ponto({ icone, cor, titulo, children }: PontoProps) {
  return (
    <View className="flex-row gap-4 mb-5">
      <View
        className="w-11 h-11 rounded-2xl items-center justify-center border shrink-0"
        style={{ backgroundColor: `${cor}15`, borderColor: `${cor}30` }}
      >
        <Ionicons color={cor} name={icone} size={20} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-black font-display tracking-tight mb-1">{titulo}</Text>
        <Text className="text-zinc-400 text-[13px] leading-relaxed">{children}</Text>
      </View>
    </View>
  );
}

interface IntroducaoProps {
  onAutorizar: () => void;
  onCancelar: () => void;
  erro: string | null;
}

export function IntroducaoDaTecnica({ onAutorizar, onCancelar, erro }: IntroducaoProps) {
  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-8">
          <View className="bg-emerald-500/20 px-3 py-1 rounded-md mb-4 border border-emerald-500/30">
            <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              Sua autorização
            </Text>
          </View>
          <Text className="text-white text-3xl font-black font-display text-center leading-tight">
            Análise de Técnica
          </Text>
          <Text className="text-zinc-400 text-center text-sm mt-3 leading-relaxed">
            O app conta suas repetições de agachamento e diz se cada uma passou da paralela. Antes
            disso, você precisa saber o que acontece.
          </Text>
        </View>

        <View className="rounded-[24px] bg-zinc-900/60 border border-white/10 p-5">
          <Ponto cor={colors.secondary.main} icone="videocam-outline" titulo="A câmera fica aberta">
            Ela não tira fotos: analisa continuamente enquanto a tela está aberta, para conseguir
            contar e falar no meio do movimento.
          </Ponto>

          <Ponto cor={colors.status.success} icone="eye-off-outline" titulo="Nada é gravado">
            Nenhuma imagem é salva, nem aqui nem em servidor. O que se extrai de cada quadro é a
            posição das suas articulações — um boneco de palito, sem imagem e sem rosto.
          </Ponto>

          <Ponto
            cor={colors.status.success}
            icone="phone-portrait-outline"
            titulo="Nada sai do aparelho"
          >
            A análise inteira roda aqui dentro. Nem a imagem nem as posições são enviadas para lugar
            nenhum, e seu personal não recebe nada disso.
          </Ponto>

          <Ponto cor={colors.status.warning} icone="volume-high-outline" titulo="O app fala alto">
            Ele diz "fundo" ou "faltou" a cada repetição. Numa academia, quem estiver por perto vai
            ouvir.
          </Ponto>

          <Ponto cor={colors.accent.main} icone="body-outline" titulo="Não substitui seu personal">
            O app olha uma coisa só: se o quadril passou da linha do joelho. Não avalia joelho,
            coluna, ritmo, nem se o exercício é adequado para você.
          </Ponto>

          <View className="flex-row gap-4">
            <View
              className="w-11 h-11 rounded-2xl items-center justify-center border shrink-0"
              style={{
                backgroundColor: `${colors.primary.start}15`,
                borderColor: `${colors.primary.start}30`,
              }}
            >
              <Ionicons color={colors.primary.start} name="arrow-undo-outline" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-black font-display tracking-tight mb-1">
                Você pode voltar atrás
              </Text>
              <Text className="text-zinc-400 text-[13px] leading-relaxed">
                Retire esta autorização quando quiser, no seu perfil, em Minhas Autorizações. A
                análise para na hora.
              </Text>
            </View>
          </View>
        </View>

        {erro !== null && (
          <View className="mt-4 bg-red-500/10 border border-red-500/40 px-5 py-4 rounded-2xl">
            <Text className="text-red-400 text-sm">{erro}</Text>
          </View>
        )}

        <View className="mt-8">
          <TouchableOpacity activeOpacity={0.8} onPress={onAutorizar}>
            <LinearGradient
              className="py-4 rounded-2xl items-center shadow-lg shadow-primary-solid/20"
              colors={colors.gradients.primary as unknown as readonly [string, string, ...string[]]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
            >
              <Text className="text-white font-black text-lg uppercase tracking-widest">
                Li e autorizo
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity className="py-4 mt-1" onPress={onCancelar}>
            <Text className="text-zinc-500 text-center font-bold uppercase text-xs tracking-widest">
              Agora não
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
