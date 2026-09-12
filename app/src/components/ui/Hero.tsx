import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { Dimensions, Image, type ImageSourcePropType, Text, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/**
 * O topo das telas de entrada: foto de academia, wordmark, título e chips.
 *
 * A tinta inverte com o tema, e é para isso que os tokens `onHero` e
 * `onHeroSecondary` existem — no claro o desenho clareia a foto e escreve em
 * escuro sobre ela, em vez de manter texto branco.
 *
 * O véu sobre a foto **não é uma cor nova**: é a própria cor de fundo em três
 * opacidades, terminando opaca para o conteúdo abaixo emendar sem costura. As
 * opacidades diferem por tema porque o desenho pede um véu mais forte no claro,
 * onde a foto precisa recuar mais para o texto escuro passar contraste.
 *
 * O desenho também aplica `brightness(1.06) saturate(.92)` na foto no tema
 * claro. React Native não tem filtro de imagem; o véu a 60% já faz o essencial
 * do trabalho, e perseguir o filtro exigiria reprocessar a imagem. É a
 * diferença medida e aceita que a ADR-0025 prevê.
 *
 * @example
 * <Hero
 *   imagem={require('../../assets/workouts/back.jpg')}
 *   titulo={'Eleva seu nível.\nAcompanhamento que não para.'}
 *   sub="Treino, nutrição e saúde no mesmo app."
 *   chips={PILARES}
 * />
 */
export type ChipDoHero = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

interface HeroProps {
  imagem: ImageSourcePropType;
  titulo: ReactNode;
  sub?: string;
  chips?: ChipDoHero[];
}

/**
 * A faixa de foto ocupa a mesma fração da altura que no desenho: 300 de 800.
 *
 * Fixar em 300 deixava a foto curta em aparelho alto — 30% da tela em vez de
 * 37,5% —, e é uma faixa vertical, então quem manda nela é a altura e não a
 * largura. O piso garante que em tela curta ela não encolha abaixo do desenho.
 */
const FRACAO_DA_ALTURA = 300 / 800;
const ALTURA_MINIMA_DA_FOTO = 300;

function alturaDaFoto(): number {
  return Math.max(
    ALTURA_MINIMA_DA_FOTO,
    Math.round(Dimensions.get('window').height * FRACAO_DA_ALTURA)
  );
}

const TAMANHO_DO_ICONE_DO_CHIP = 13;

/**
 * As paradas do véu, em opacidade sobre a cor de fundo. A última é opaca: é
 * onde a foto acaba e a tela começa.
 */
const VEU = {
  escuro: [0.45, 0.55, 1],
  claro: [0.6, 0.72, 1],
} as const;

export function Hero({ imagem, titulo, sub, chips }: HeroProps) {
  const cores = useCores();
  const escalar = useEscala();
  const { colorScheme } = useColorScheme();
  const paradas = colorScheme === 'dark' ? VEU.escuro : VEU.claro;

  return (
    <View>
      <View className="absolute left-0 right-0 top-0" style={{ height: alturaDaFoto() }}>
        <Image source={imagem} resizeMode="cover" className="h-full w-full" />
        <LinearGradient
          // Tupla, e não array: o `LinearGradient` do Expo exige pelo menos duas
          // cores no tipo, e um `map` devolve `string[]`.
          colors={[
            comAlfa(cores.background, paradas[0]),
            comAlfa(cores.background, paradas[1]),
            cores.background,
          ]}
          locations={[0, 0.55, 1]}
          className="absolute inset-0"
        />
      </View>

      <View className="px-5 pb-6 pt-16">
        <View className="mb-20 flex-row items-center gap-2.5">
          {/*
            Três medidas de uma vez que não estão na escala: o quadrado tem 34,
            a inicial 18 e o raio 9 — valores próprios do wordmark no desenho.
            Em `rem` sobre a base 16, para acompanharem o aparelho como o resto.
          */}
          <View className="h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.5625rem] bg-primary">
            <Text className="font-display-black text-[1.125rem] text-primary-foreground">E</Text>
          </View>
          <Text className="font-display text-corpo uppercase italic text-hero">Eleva Pro</Text>
        </View>

        <Text className="text-display font-bold leading-[1.12] tracking-tight text-hero">
          {titulo}
        </Text>
        {sub ? (
          <Text className="mt-2 text-rotulo leading-[1.35] tracking-tight text-hero-secondary">
            {sub}
          </Text>
        ) : null}

        {chips?.length ? (
          <View className="mt-[1.125rem] flex-row flex-wrap gap-[0.4375rem]">
            {chips.map((chip) => (
              <View
                key={chip.label}
                className="flex-row items-center gap-1.5 rounded-full bg-hero-chip px-[0.6875rem] py-1.5"
              >
                <Ionicons
                  name={chip.icon}
                  size={escalar(TAMANHO_DO_ICONE_DO_CHIP)}
                  color={cores.onHero}
                />
                <Text className="text-micro font-semibold tracking-tight text-hero">
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const CANAL_CHEIO = 255;

/**
 * Cor de token mais opacidade, na forma de oito dígitos que o React Native
 * entende. Mora aqui, e não no módulo de design, porque só o véu precisa dela —
 * um segundo uso move; um uso só não abre porta para cor arbitrária.
 */
function comAlfa(hex: string, alfa: number): string {
  const canal = Math.round(alfa * CANAL_CHEIO)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${canal}`;
}
