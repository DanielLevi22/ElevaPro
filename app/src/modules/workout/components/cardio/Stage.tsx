import { useColorScheme } from 'nativewind';
import { type ReactNode, useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores } from '@/shared/design';

/**
 * O `.stage` do kit: o cartão de vidro com um foco de luz no meio, onde o objeto
 * da modalidade e a meta de tempo aparecem.
 *
 *     background: var(--glass) + radial-gradient(70% 60% at 50% 42%, luz 0%, transparent 70%)
 *     luz: branco a 9% no escuro, cinza-iOS a 7% no claro
 *
 * A luz é a cor do texto rebaixada, que é branca no escuro e quase preta no
 * claro — o mesmo contraste que o kit escreve à mão nos dois temas.
 *
 * @example <Stage className="mt-3.5 px-2.5 pb-[1.125rem] pt-2.5">…</Stage>
 */
interface StageProps {
  children: ReactNode;
  className?: string;
}

const SPOT = { escuro: 0.09, claro: 0.07 } as const;

export function Stage({ children, className }: StageProps) {
  const cores = useCores();
  const { colorScheme } = useColorScheme();
  const id = `palco${useId().replace(/:/g, '')}`;
  const spot = comOpacidade(cores.foreground, colorScheme === 'dark' ? SPOT.escuro : SPOT.claro);

  return (
    <View
      className={cn(
        'overflow-hidden rounded-[1.625rem] border border-glass-border bg-glass',
        className
      )}
    >
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="42%" rx="70%" ry="60%" fx="50%" fy="42%">
            <Stop offset={0} stopColor={spot} />
            <Stop offset={0.7} stopColor={spot} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
