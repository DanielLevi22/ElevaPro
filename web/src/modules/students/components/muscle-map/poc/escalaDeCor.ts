/**
 * Volume por músculo → cor.
 *
 * Contínua, e não em quatro faixas como o `buildColorMap` do 3D. Lá as faixas
 * eram necessárias porque a intensidade saía de `emissiveIntensity` e
 * `opacity`, que empilham mal; aqui é só `fill`, e o degradê contínuo mostra a
 * diferença entre o primeiro e o segundo colocado — que era justamente o que a
 * faixa achatava.
 *
 * Logarítmica pelo mesmo motivo que a versão 3D: tonelagem de perna é uma ordem
 * de grandeza acima da de bíceps, e em escala linear o braço nunca sai do tom
 * mínimo, esteja ele descansado ou destruído.
 */

/** O tom de quem não tem série registrada no período. */
export const SEM_DADO = "#27272a";

/** Extremos do degradê, na paleta do produto. */
const FRIO = { r: 63, g: 63, b: 70 }; // zinc-700
const QUENTE = { r: 255, g: 46, b: 99 }; // primary.end

function misturar(t: number): string {
  const canal = (de: number, ate: number) => Math.round(de + (ate - de) * t);
  return `rgb(${canal(FRIO.r, QUENTE.r)}, ${canal(FRIO.g, QUENTE.g)}, ${canal(FRIO.b, QUENTE.b)})`;
}

/**
 * Constrói o de-para de grupo para cor.
 *
 * Músculo com volume zero cai em `SEM_DADO` e não no frio do degradê: "não
 * treinou" e "treinou pouco" são coisas diferentes, e a versão 3D as pintava
 * igual.
 *
 * @example
 * const cores = escalaDeCor([{ muscle: "Peitoral", volume: 4200 }]);
 * cores.get("Peitoral"); // "rgb(255, 46, 99)"
 */
export function escalaDeCor(
  volumePorMusculo: { muscle: string; volume: number }[],
): Map<string, string> {
  const cores = new Map<string, string>();
  const comVolume = volumePorMusculo.filter((m) => m.volume > 0);
  if (comVolume.length === 0) return cores;

  const maximo = Math.max(...comVolume.map((m) => m.volume));

  for (const { muscle, volume } of comVolume) {
    const t = maximo > 0 ? Math.log1p(volume) / Math.log1p(maximo) : 0;
    cores.set(muscle, misturar(t));
  }

  return cores;
}
