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

/**
 * O início da rampa é o **tom anatômico do próprio modelo**.
 *
 * O écorché traz `baseColorFactor [0.47, 0.257, 0.257]`, que em sRGB dá este
 * avermelhado. Começar a rampa nele faz o músculo em repouso ficar exatamente
 * da cor do corpo — sem costura visível entre "sem dado" e "pouco volume" —, e
 * a carga aquece dali para o limão da marca.
 *
 * Antes isto era um cinza que eu escolhi, e ele apagava a aparência anatômica
 * que o modelo já trazia de graça.
 */
const FRIO = { r: 182, g: 139, b: 139 };

/**
 * O topo da rampa: limão **amaciado**, não o `#CCFF00` cru da marca.
 *
 * O limão puro é complementar do avermelhado do corpo, e lado a lado os dois
 * vibram — o músculo carregado saltava da tela em vez de se destacar. Puxado
 * para um verde-oliva claro ele continua sendo a cor da marca e para de brigar
 * com a pele do écorché.
 */
const QUENTE = { r: 198, g: 224, b: 120 };

/**
 * Músculo sem série registrada **não é repintado**: o `null` diz à tela para
 * deixar o material do modelo como está.
 *
 * É diferente de pintar com uma cor igual à do modelo. Assim, trocar o écorché
 * por outro traz a cor nova junto, sem ninguém reajustar constante aqui.
 */
export const SEM_DADO = null;

/**
 * Quanto o músculo mais carregado brilha.
 *
 * Estava em 0.45 e o topo da escala ficava néon sobre o corpo avermelhado. O
 * brilho aqui é reforço da cor, não a informação em si — quem informa é o tom.
 */
const BRILHO_MAXIMO = 0.18;

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
