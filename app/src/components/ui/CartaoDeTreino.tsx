import { contagem } from '@elevapro/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, type ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';
import { BotaoDeDestaque } from './BotaoDeDestaque';
import { Chip, type ChipProps } from './Chip';
import { DadoComIcone } from './DadoComIcone';

/**
 * Um treino sobre a foto do grupo muscular: chips, nome, exercícios e duração.
 *
 * O kit o desenha em dois lugares. Na tela inicial é o **treino do dia**,
 * compacto e tocável inteiro. Na fase ativa é o **destaque**, mais alto e com o
 * botão de começar dentro. É o mesmo cartão — mudam a altura, o corpo do
 * título e se há botão —, e por isso mora em `components/ui`, onde a home e o
 * fluxo de treino o alcançam sem um módulo importar o outro.
 *
 * O véu é preto nos dois temas, e não a cor de fundo como no `FundoDeFoto`: o
 * cartão é imagem com legenda, e a legenda é branca sempre.
 *
 * @example
 * <CartaoDeTreino titulo="Costas & Bíceps" chips={[{ texto: 'Treino B', tom: 'destaque' }]}
 *   imagem={fotoDoGrupo('Costas')} exercicios={6} onPress={abrir} />
 */
interface ChipDoCartao {
  texto: string;
  tom?: ChipProps['tom'];
}

interface CartaoDeTreinoProps {
  titulo: string;
  chips: ChipDoCartao[];
  imagem: ImageSourcePropType;
  exercicios?: number;
  minutos?: number;
  onPress: () => void;
  tamanho?: 'compacto' | 'destaque';
  /** O botão dentro do cartão, no tamanho `destaque`. */
  acao?: { rotulo: string; icone?: 'play' | 'refresh'; onPress: () => void };
}

/** 164 e 218 do kit, em rem. */
const ALTURA = { compacto: 'h-[10.25rem]', destaque: 'h-[13.625rem]' } as const;
const TITULO = { compacto: 'text-h2', destaque: 'text-[1.4375rem]' } as const;

export function CartaoDeTreino({
  titulo,
  chips,
  imagem,
  exercicios,
  minutos,
  onPress,
  tamanho = 'compacto',
  acao,
}: CartaoDeTreinoProps) {
  const cores = useCores();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Treino: ${titulo}`}
      className={cn('overflow-hidden rounded-3xl', ALTURA[tamanho])}
    >
      <Image source={imagem} resizeMode="cover" className="absolute h-full w-full" />
      <LinearGradient
        colors={[cores.veuDaImagemTopo, cores.veuDaImagemBase]}
        className="absolute inset-0"
      />

      <View className="flex-1 justify-end p-4">
        <View className="mb-[0.5625rem] flex-row gap-1.5">
          {chips.map((chip) => (
            <Chip key={chip.texto} tom={chip.tom}>
              {chip.texto}
            </Chip>
          ))}
        </View>
        <Text className={cn('font-bold tracking-tight text-sobre-imagem', TITULO[tamanho])}>
          {titulo}
        </Text>
        <View className="mt-1 flex-row items-center gap-3.5">
          {exercicios ? (
            <DadoComIcone
              icone="barbell"
              texto={contagem(exercicios, 'exercício', 'exercícios')}
              tom="sobreImagem"
            />
          ) : null}
          {minutos ? (
            <DadoComIcone icone="time-outline" texto={`~${minutos} min`} tom="sobreImagem" />
          ) : null}
        </View>
        {acao ? (
          <View className="mt-3.5">
            <BotaoDeDestaque
              rotulo={acao.rotulo}
              icone={acao.icone}
              onPress={acao.onPress}
              tamanho="cartao"
            />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export type { CartaoDeTreinoProps };
