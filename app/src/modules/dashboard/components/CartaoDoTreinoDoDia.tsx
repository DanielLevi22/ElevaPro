import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, type ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

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

const TAMANHO_DO_ICONE = 13;

export function CartaoDoTreinoDoDia({
  titulo,
  etiqueta,
  imagem,
  exercicios,
  minutos,
  onPress,
}: CartaoDoTreinoDoDiaProps) {
  const escalar = useEscala();
  // Os tokens de imagem são iguais nos dois temas: o véu é preto sempre, então
  // a legenda é branca sempre (ver `sobreImagem` em `tokens.ts`).
  const cores = useCores();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Treino do dia: ${titulo}`}
      // 164 do kit, em rem.
      className="h-[10.25rem] overflow-hidden rounded-2xl"
    >
      <Image source={imagem} resizeMode="cover" className="absolute h-full w-full" />
      <LinearGradient
        colors={[cores.veuDaImagemTopo, cores.veuDaImagemBase]}
        className="absolute inset-0"
      />

      <View className="flex-1 justify-end p-4">
        <View className="mb-2 self-start rounded-full bg-primary px-2.5 py-1">
          <Text className="text-micro font-extrabold uppercase tracking-wide text-primary-foreground">
            {etiqueta}
          </Text>
        </View>

        <Text className="text-h2 font-bold tracking-tight text-sobre-imagem">{titulo}</Text>

        <View className="mt-1 flex-row items-center gap-3.5">
          {exercicios ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name="barbell"
                size={escalar(TAMANHO_DO_ICONE)}
                color={cores.sobreImagemSecundario}
              />
              <Text className="text-micro text-sobre-imagem-secundario">
                {exercicios} exercícios
              </Text>
            </View>
          ) : null}
          {minutos ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name="time-outline"
                size={escalar(TAMANHO_DO_ICONE)}
                color={cores.sobreImagemSecundario}
              />
              <Text className="text-micro text-sobre-imagem-secundario">~{minutos} min</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
