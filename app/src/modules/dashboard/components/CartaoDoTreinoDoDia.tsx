import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, type ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';
import { coresDoTema, useEscala } from '@/shared/design';

/**
 * O treino do dia, sobre a foto do grupo muscular.
 *
 * O véu aqui é preto nos dois temas, e não a cor de fundo como no `FundoDeFoto`:
 * o texto sobre este cartão é branco sempre, porque ele é uma imagem com
 * legenda e não uma faixa que se funde à tela.
 *
 * @example
 * <CartaoDoTreinoDoDia titulo="Costas & Bíceps" etiqueta="Treino B"
 *   exercicios={6} minutos={52} imagem={FOTO.Costas} onPress={abrir} />
 */
interface CartaoDoTreinoDoDiaProps {
  titulo: string;
  etiqueta: string;
  imagem: ImageSourcePropType;
  exercicios?: number;
  minutos?: number;
  onPress: () => void;
}

const ALTURA = 164;
const TAMANHO_DO_ICONE = 13;

/** Preto quase transparente no topo, quase opaco no pé: o texto fica no pé. */
const VEU = ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.82)'] as const;

/**
 * A tinta deste cartão é branca **nos dois temas**, porque o véu é preto nos
 * dois: ele é imagem com legenda, e não faixa que se funde à tela. Vem do token
 * do tema escuro em vez de um `#ffffff` à mão — é o mesmo valor, e continua
 * dentro do sistema.
 */
const TINTA = coresDoTema('escuro').onHero;

export function CartaoDoTreinoDoDia({
  titulo,
  etiqueta,
  imagem,
  exercicios,
  minutos,
  onPress,
}: CartaoDoTreinoDoDiaProps) {
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Treino do dia: ${titulo}`}
      className="overflow-hidden rounded-2xl"
      style={{ height: escalar(ALTURA) }}
    >
      <Image source={imagem} resizeMode="cover" className="absolute h-full w-full" />
      <LinearGradient colors={VEU} className="absolute inset-0" />

      <View className="flex-1 justify-end p-4">
        <View className="mb-2 self-start rounded-full bg-primary px-2.5 py-1">
          <Text className="text-micro font-extrabold uppercase tracking-wide text-primary-foreground">
            {etiqueta}
          </Text>
        </View>

        <Text className="text-h2 font-bold tracking-tight text-white">{titulo}</Text>

        <View className="mt-1 flex-row items-center gap-3.5">
          {exercicios ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="barbell" size={escalar(TAMANHO_DO_ICONE)} color={TINTA} />
              <Text className="text-micro text-white/85">{exercicios} exercícios</Text>
            </View>
          ) : null}
          {minutos ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={escalar(TAMANHO_DO_ICONE)} color={TINTA} />
              <Text className="text-micro text-white/85">~{minutos} min</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
