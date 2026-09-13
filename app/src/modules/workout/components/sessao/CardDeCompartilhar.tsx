import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, type ImageSourcePropType, Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores } from '@/shared/design';

/**
 * O card que vira imagem no compartilhar: foto do treino com véu, o título, o
 * dia e a faixa de números.
 *
 * Só leva o que o aluno escolhe mostrar. Observação e PSE nunca entram — são
 * o que ele disse ao personal, e não o que quer mostrar em público.
 *
 * @example
 * <CardDeCompartilhar formato="story" titulo={treino.title} numeros={numeros} … />
 */
export type FormatoDoCard = 'story' | 'post' | 'card';

interface CardDeCompartilharProps {
  formato: FormatoDoCard;
  titulo: string;
  /** "Terça, 12 de agosto · Fase 2". */
  linha: string;
  numeros: { valor: string; rotulo: string }[];
  /** Nula quando o aluno desliga a foto de fundo. */
  foto: ImageSourcePropType | null;
}

const PROPORCAO: Record<FormatoDoCard, string> = {
  story: 'aspect-[9/16]',
  post: 'aspect-square',
  card: 'aspect-video',
};

/** A faixa de números sobre a foto: branco a 14%, o mesmo nos dois temas. */
const FUNDO_DA_FAIXA = 0.14;

export function CardDeCompartilhar({
  formato,
  titulo,
  linha,
  numeros,
  foto,
}: CardDeCompartilharProps) {
  const cores = useCores();

  return (
    <ImageBackground
      source={foto ?? undefined}
      resizeMode="cover"
      className={cn('w-full overflow-hidden rounded-[1.125rem] bg-card', PROPORCAO[formato])}
    >
      <LinearGradient
        colors={[cores.veuDaImagemTopo, cores.veuDaImagemTopo, cores.veuDaImagemBase]}
        locations={[0, 0.38, 1]}
        className="absolute inset-0"
      />
      <View className="absolute left-3.5 right-3.5 top-3.5 flex-row items-center">
        <Chip tom="destaque">Treino concluído</Chip>
        <View className="flex-1" />
        <Text className="font-display-black text-[0.6875rem] uppercase tracking-[0.16em] text-sobre-imagem opacity-90">
          Eleva Pro
        </Text>
      </View>

      <View className="absolute bottom-4 left-4 right-4">
        <Text
          numberOfLines={formato === 'card' ? 1 : 3}
          className="font-display-black text-[1.625rem] uppercase leading-tight tracking-tight text-sobre-imagem"
        >
          {titulo}
        </Text>
        <Text className="mt-1.5 text-[0.71875rem] text-sobre-imagem-secundario">{linha}</Text>
        <View
          className="mt-3 flex-row overflow-hidden rounded-[0.875rem]"
          style={{ backgroundColor: comOpacidade(cores.sobreImagem, FUNDO_DA_FAIXA) }}
        >
          {numeros.map((numero) => (
            <View key={numero.rotulo} className="flex-1 items-center px-1 py-[0.5625rem]">
              <Text className="font-display-black text-sm tracking-tight text-sobre-imagem">
                {numero.valor}
              </Text>
              <Text className="mt-0.5 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-sobre-imagem-secundario">
                {numero.rotulo}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}
