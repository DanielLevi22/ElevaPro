import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ReferenceBody } from '@/components/ui/ReferenceBody';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * O corpo de referência da introdução, com os quatro cartões de exemplo em volta.
 *
 *     caixa 292; luz 210 × 210, radial closest-side primary/.22 → transparente 70%, blur(12px)
 *     corpo 286; cartões 8 × 11, raio 14, ponto 7, rótulo 9 / 700, valor 15 / 800
 *
 * Os números são ilustração, como no kit: a tela ainda não tem medida nenhuma,
 * e os cartões mostram que tipo de coisa sai do scan. Parados, e não em órbita
 * como antes: o kit os desenha fixos.
 *
 * @example <IntroIllustration />
 */
const EXAMPLES = [
  {
    label: 'Bíceps',
    value: '32',
    unit: 'cm',
    dot: 'bg-metrica-ritmo',
    place: 'left-0 top-[1.375rem]',
  },
  {
    label: 'Massa magra',
    value: '62',
    unit: 'kg',
    dot: 'bg-metrica-gordura',
    place: 'right-0 top-[6rem]',
  },
  {
    label: 'Gordura',
    value: '17',
    unit: '%',
    dot: 'bg-metrica-passos',
    place: '-left-0.5 bottom-[4.875rem]',
  },
  {
    label: 'IMC',
    value: '22,1',
    unit: '',
    dot: 'bg-metrica-cadencia',
    place: 'right-1 bottom-2.5',
  },
] as const;

/**
 * A luz atrás do corpo, já com o `blur(12px)` do kit aplicado: o cone que acaba
 * em 70% do raio, amaciado pela gaussiana, perde um décimo do pico e passa a
 * morrer perto da borda da caixa.
 */
const LIGHT_PROFILE = [
  [0, 0.2],
  [0.3, 0.15],
  [0.5, 0.08],
  [0.7, 0.03],
  [0.85, 0.008],
  [1, 0],
] as const;

export function IntroIllustration() {
  return (
    <View className="relative mt-1.5 h-[18.25rem] items-center justify-center">
      <BodyLight />
      <ReferenceBody height={286} />
      {EXAMPLES.map((example) => (
        <Vidro
          key={example.label}
          classeExterna={cn('absolute rounded-[0.875rem]', example.place)}
          className="flex-row items-center gap-2 rounded-[0.875rem] px-[0.6875rem] py-2"
        >
          <View className={cn('h-[0.4375rem] w-[0.4375rem] rounded-full', example.dot)} />
          <View>
            <Text className="text-[0.5625rem] font-bold uppercase tracking-wider text-placeholder">
              {example.label}
            </Text>
            <Text className="font-display-black text-[0.9375rem] tracking-tight text-foreground">
              {example.value}
              <Text className="text-[0.59375rem]">{example.unit}</Text>
            </Text>
          </View>
        </Vidro>
      ))}
    </View>
  );
}

function BodyLight() {
  const cores = useCores();
  // `useId` devolve ":r0:", e dois-pontos quebram a referência `url(#…)`.
  const id = `luz${useId().replace(/:/g, '')}`;
  return (
    <View pointerEvents="none" className="absolute h-[13.125rem] w-[13.125rem]">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {LIGHT_PROFILE.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor={cores.primary} stopOpacity={opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
