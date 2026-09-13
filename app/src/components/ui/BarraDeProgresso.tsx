import { View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * A barra de progresso do kit de vidro: trilho em vidro forte, preenchimento
 * na cor do que está sendo medido.
 *
 * O tom é nome, e não cor: classe do Tailwind só existe se aparecer literal no
 * fonte, então cada tom tem a sua linha escrita.
 *
 * @example
 * <BarraDeProgresso percentual={44} />
 * <BarraDeProgresso percentual={62} tom="concluida" espessura="fina" />
 */
interface BarraDeProgressoProps {
  /** De 0 a 100; fora disso é cortado. */
  percentual: number;
  tom?: 'marca' | 'concluida' | 'apagada';
  /** `normal` é a de 6 do kit; `fina`, a de 4 dos cartões de fase; `fio`, a de 3. */
  espessura?: 'normal' | 'fina' | 'fio';
}

const PREENCHIMENTO = {
  marca: 'bg-primary',
  concluida: 'bg-metrica-passos',
  apagada: 'bg-placeholder',
} as const;

const ALTURA = { normal: 'h-1.5', fina: 'h-1', fio: 'h-[0.1875rem]' } as const;

const CHEIO = 100;

export function BarraDeProgresso({
  percentual,
  tom = 'marca',
  espessura = 'normal',
}: BarraDeProgressoProps) {
  const largura = Math.min(CHEIO, Math.max(0, percentual));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: CHEIO, now: largura }}
      className={cn('overflow-hidden rounded-full bg-glass-strong', ALTURA[espessura])}
    >
      {/* A largura é o próprio dado: não cabe em classe. */}
      <View
        className={cn('h-full rounded-full', PREENCHIMENTO[tom])}
        style={{ width: `${largura}%` }}
      />
    </View>
  );
}

export type { BarraDeProgressoProps };
