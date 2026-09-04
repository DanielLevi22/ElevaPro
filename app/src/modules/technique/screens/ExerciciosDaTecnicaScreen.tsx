import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/navigation/types';

/**
 * Os exercícios que a Análise de Técnica conhece.
 *
 * Existe porque a tela de análise é de UM exercício, e sem esta lista o
 * agachamento seria a feature inteira sem nunca ter sido apresentado como uma
 * escolha entre várias.
 *
 * Os indisponíveis aparecem **desabilitados em vez de ausentes**, como no
 * painel de calibração do web: mostram para onde isto cresce sem fingir que já
 * cresceu. Cada um deles precisa do seu próprio Critério, do seu próprio limiar
 * calibrado e da sua própria vista de câmera — não é uma opção a mais num
 * seletor, é um ciclo de calibração inteiro (ver `ADR-0023`).
 */

interface Exercicio {
  id: string;
  nome: string;
  criterio: string;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  /**
   * O destino, ou `undefined` para "em breve".
   *
   * Tipado pela entrada de `ROUTES`, e não como `string`: com `string` seria
   * preciso um cast no `router.push`, e `as never` é como rota inexistente
   * deixa de ser erro de compilação e vira botão que não faz nada.
   */
  rota?: typeof ROUTES.TECHNIQUE.SQUAT;
}

const EXERCICIOS: Exercicio[] = [
  {
    id: 'agachamento',
    nome: 'Agachamento',
    criterio: 'Conta as repetições e diz se o quadril passou da linha do joelho',
    icone: 'body',
    cor: colors.status.success,
    rota: ROUTES.TECHNIQUE.SQUAT,
  },
  {
    id: 'flexao',
    nome: 'Flexão de braço',
    criterio: 'Precisa de um critério próprio e de outra vista de câmera',
    icone: 'fitness',
    cor: colors.text.muted,
  },
  {
    id: 'afundo',
    nome: 'Afundo',
    criterio: 'Precisa de um critério próprio e de outra vista de câmera',
    icone: 'walk',
    cor: colors.text.muted,
  },
];

function CartaoDoExercicio({ exercicio }: { exercicio: Exercicio }) {
  const router = useRouter();
  const disponivel = exercicio.rota !== undefined;

  return (
    <TouchableOpacity
      activeOpacity={disponivel ? 0.8 : 1}
      className="mb-3"
      disabled={!disponivel}
      onPress={() => exercicio.rota && router.push(exercicio.rota)}
    >
      <View
        className="rounded-[24px] p-5 flex-row items-center justify-between border bg-zinc-900"
        style={{
          borderColor: colors.border.default,
          opacity: disponivel ? 1 : 0.55,
        }}
      >
        <View className="flex-row items-center gap-4 flex-1">
          <View
            className="p-3 rounded-xl border"
            style={{
              backgroundColor: `${exercicio.cor}15`,
              borderColor: `${exercicio.cor}30`,
            }}
          >
            <Ionicons color={exercicio.cor} name={exercicio.icone} size={24} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-lg font-black font-display tracking-tight">
                {exercicio.nome}
              </Text>
              {!disponivel && (
                <View className="bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  <Text className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                    Em breve
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-zinc-500 text-xs mt-1 leading-relaxed">{exercicio.criterio}</Text>
          </View>
        </View>
        {disponivel && <Ionicons color={colors.text.muted} name="chevron-forward" size={20} />}
      </View>
    </TouchableOpacity>
  );
}

export function ExerciciosDaTecnicaScreen() {
  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <View className="bg-emerald-500/20 self-start px-3 py-1 rounded-md mb-3 border border-emerald-500/30">
            <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              No aparelho
            </Text>
          </View>
          <Text className="text-white text-3xl font-black font-display leading-tight">
            Análise de Técnica
          </Text>
          <Text className="text-zinc-400 text-sm mt-3 leading-relaxed">
            Escolha o exercício. O app conta suas repetições e avisa em voz alta a cada uma. Nada é
            gravado e nada sai do aparelho.
          </Text>
        </View>

        {EXERCICIOS.map((exercicio) => (
          <CartaoDoExercicio exercicio={exercicio} key={exercicio.id} />
        ))}

        <View className="mt-4 rounded-2xl bg-zinc-900/60 border border-white/10 p-4">
          <Text className="text-zinc-400 text-xs leading-relaxed">
            <Text className="text-white font-bold">Filme de lado.</Text> Apoie o celular com um
            ombro apontando para a lente e o corpo inteiro no quadro. De frente a coxa some na
            projeção, e o app prefere calar a chutar.
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
