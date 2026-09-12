import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { type ImageSourcePropType, Text, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';
import { FundoDeFoto, RECEITA_DA_AUTENTICACAO } from './FundoDeFoto';

/**
 * O topo das telas de entrada: foto de academia, wordmark, título e chips.
 *
 * A tinta inverte com o tema, e é para isso que os tokens `onHero` e
 * `onHeroSecondary` existem — no claro o desenho clareia a foto e escreve em
 * escuro sobre ela, em vez de manter texto branco.
 *
 * A foto e o véu vivem no `FundoDeFoto`, que a tela inicial também usa com
 * outra rampa. O que é do `Hero` é o que vai **sobre** a foto.
 *
 * O desenho aplica `brightness(1.06) saturate(.92)` na foto no tema claro.
 * React Native não tem filtro de imagem; o véu já faz o essencial do trabalho, e
 * perseguir o filtro exigiria reprocessar a imagem. É a diferença medida e
 * aceita que a ADR-0025 prevê.
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

const TAMANHO_DO_ICONE_DO_CHIP = 13;

export function Hero({ imagem, titulo, sub, chips }: HeroProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View>
      <FundoDeFoto imagem={imagem} receita={RECEITA_DA_AUTENTICACAO} />

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
