import type { Cores } from '@/shared/design';

/**
 * As cinco cores do kit de métricas (`--c1` a `--c5`) e a primária.
 *
 * O kit de métricas não cria paleta: usa as mesmas cinco cores do cardio, com o
 * mesmo texto escurecido no claro (`--c1t` a `--c5t`). Por isso cada tom aponta
 * para o token que já existe, e o nome aqui é o do papel no gráfico — verde,
 * azul — e não o da grandeza de onde a cor veio.
 */
export type ChartTone = 'brand' | 'green' | 'blue' | 'purple' | 'amber' | 'red';

export interface ToneColors {
  /** Barra, linha, ponto e fundo de ícone. */
  fill: string;
  /** Texto e ícone: escurece no claro, onde a cor cheia não passa contraste. */
  text: string;
}

/**
 * @example const { fill, text } = toneColors(cores, 'green');
 */
export function toneColors(cores: Cores, tone: ChartTone): ToneColors {
  switch (tone) {
    case 'brand':
      return { fill: cores.primary, text: cores.primaryText };
    case 'green':
      return { fill: cores.metricaPassos, text: cores.textoPassos };
    case 'blue':
      return { fill: cores.metricaRitmo, text: cores.textoRitmo };
    case 'purple':
      return { fill: cores.metricaCadencia, text: cores.textoCadencia };
    case 'amber':
      return { fill: cores.metricaGordura, text: cores.textoGordura };
    case 'red':
      return { fill: cores.metricaBatimento, text: cores.textoBatimento };
  }
}
