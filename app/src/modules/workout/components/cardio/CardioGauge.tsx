import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Anel, ARCO_DO_MOSTRADOR } from '@/components/ui/Anel';
import { useCores, useEscala } from '@/shared/design';

/**
 * O mostrador do cardio (`Gauge` do kit): o anel aberto em 76% da volta, o
 * ponto na ponta e o miolo de vidro com o tempo.
 *
 * Pausado, o kit apaga o arco para o tom terciário e o mostrador a 72%: a sessão
 * continua ali, mas não está correndo.
 *
 * @example
 * <CardioGauge progress={0.62} label="Tempo 18:36"><Text>18:36</Text></CardioGauge>
 */
interface CardioGaugeProps {
  /** Fração de 0 a 1. */
  progress: number;
  /** O que o leitor de tela anuncia. */
  label: string;
  size?: number;
  stroke?: number;
  paused?: boolean;
  children: ReactNode;
}

/** O miolo começa 14 para dentro do traço, como o `inset: stroke + 14` do kit. */
const CORE_INSET = 14;
const FULL = 1000;

export function CardioGauge({
  progress,
  label,
  size = 222,
  stroke = 15,
  paused = false,
  children,
}: CardioGaugeProps) {
  const cores = useCores();
  const escalar = useEscala();
  const inset = escalar(stroke + CORE_INSET);

  return (
    <View className="mt-4 items-center" style={{ opacity: paused ? 0.72 : 1 }}>
      <Anel
        valor={Math.round(progress * FULL)}
        meta={FULL}
        rotulo={label}
        tamanho={size}
        espessura={stroke}
        arco={ARCO_DO_MOSTRADOR}
        cor={paused ? cores.placeholder : undefined}
        ponto
      >
        <View
          className="absolute items-center justify-center rounded-full border border-glass-border bg-glass"
          style={{ top: inset, left: inset, right: inset, bottom: inset }}
        >
          {children}
        </View>
      </Anel>
    </View>
  );
}
