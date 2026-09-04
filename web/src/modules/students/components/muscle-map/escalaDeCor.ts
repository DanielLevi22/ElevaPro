/**
 * Volume por músculo → cor e brilho.
 *
 * Substitui o `buildColorMap` do `muscleMeshMap.ts`, que decidia por quatro
 * faixas de opacidade e emissivo. As faixas achatavam: num corpus real —
 * Quadríceps 24.000 contra Abdômen 2.200, onze vezes menos — os músculos saíam
 * quase da mesma cor, e o mapa parava de responder à única pergunta que existe
 * para responder: qual trabalhou mais.
 *
 * **Raiz quadrada, não logaritmo.** O log foi a primeira tentativa e repetia o
 * mesmo defeito por outro caminho: jogava o menor valor do corpus em 76% da
 * rampa. A raiz espalha o mesmo conjunto entre 0.30 e 1.00, e ainda comprime o
 * suficiente para a tonelagem de perna, uma ordem de grandeza acima da de
 * braço, não empurrar o bíceps para o fundo da escala esteja ele descansado ou
 * destruído. Linear faria isso.
 *
 * O limão vem do `buildColorMap` anterior e é o mesmo da marca. O que mudou é
 * que ele passou a ser o **topo de um degradê** em vez de cor única modulada
 * por opacidade — assim a diferença entre o primeiro e o segundo colocado
 * aparece na cor, não só na transparência.
 */

/** Interpolação em RGB, não em HSL: entre cinza e limão o caminho é direto. */
const FRIO = { r: 82, g: 82, b: 91 };
const QUENTE = { r: 204, g: 255, b: 0 };

/** O tom de quem não tem série registrada no período. */
export const SEM_DADO = "#52525b";

/**
 * O corpo onde não há grupo treinável: cabeça, mãos, pés, esqueleto.
 *
 * Mais escuro que `SEM_DADO` de propósito — músculo em descanso e parte que
 * não se treina não podem ser a mesma coisa na tela.
 */
export const CORPO_NEUTRO = "#3f3f46";

/** Quanto o músculo mais carregado brilha. Acima disto vira néon e cansa. */
const BRILHO_MAXIMO = 0.45;

export interface TomDoMusculo {
  cor: string;
  /** De 0 a `BRILHO_MAXIMO`, para o emissivo do material. */
  brilho: number;
}

function misturar(t: number): string {
  const canal = (de: number, ate: number) => Math.round(de + (ate - de) * t);
  return `rgb(${canal(FRIO.r, QUENTE.r)}, ${canal(FRIO.g, QUENTE.g)}, ${canal(FRIO.b, QUENTE.b)})`;
}

/**
 * Constrói o de-para de grupo muscular para cor e brilho.
 *
 * Músculo com volume zero fica **fora do mapa**, e a tela o pinta com
 * `SEM_DADO`: "não treinou" e "treinou pouco" são coisas diferentes, e a
 * versão anterior pintava as duas com o tom mínimo.
 *
 * @example
 * const tons = escalaDeCor([{ muscle: "Peitoral", volume: 4200 }]);
 * tons.get("Peitoral"); // { cor: "rgb(204, 255, 0)", brilho: 0.45 }
 */
export function escalaDeCor(
  volumePorMusculo: { muscle: string; volume: number }[],
): Map<string, TomDoMusculo> {
  const tons = new Map<string, TomDoMusculo>();
  const comVolume = volumePorMusculo.filter((m) => m.volume > 0);
  if (comVolume.length === 0) return tons;

  const maximo = Math.max(...comVolume.map((m) => m.volume));

  for (const { muscle, volume } of comVolume) {
    const t = maximo > 0 ? Math.sqrt(volume / maximo) : 0;
    tons.set(muscle, { cor: misturar(t), brilho: t * BRILHO_MAXIMO });
  }

  return tons;
}
