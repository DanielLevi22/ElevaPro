/** Os oito copos do kit. */
export const COPOS_DO_DIA = 8;

const ML_POR_KG = 35;
const ARREDONDAMENTO_ML = 250;
const META_SEM_PESO_ML = 2000;

/**
 * A meta de água do dia: 35 ml por kg do último peso, arredondada a 250 ml, e
 * 2 L sem peso. Decisão da #298 — o plano não tem meta de água, e o especialista
 * não precisa digitar uma para a tela ter sentido.
 *
 * @example metaDeAgua(72) // 2500
 */
export function metaDeAgua(pesoKg: number | null): number {
  if (!pesoKg || pesoKg <= 0) return META_SEM_PESO_ML;
  return Math.round((pesoKg * ML_POR_KG) / ARREDONDAMENTO_ML) * ARREDONDAMENTO_ML;
}

export interface CoposDoDia {
  total: number;
  mlPorCopo: number;
  /** Só copo inteiro conta. */
  cheios: number;
  faltamMl: number;
}

/**
 * Os copos cheios e o que falta, com cada copo valendo 1/8 da meta.
 *
 * @example coposDoDia(700, 2000) // { total: 8, mlPorCopo: 250, cheios: 2, faltamMl: 1300 }
 */
export function coposDoDia(totalMl: number, metaMl: number): CoposDoDia {
  const mlPorCopo = metaMl / COPOS_DO_DIA;
  return {
    total: COPOS_DO_DIA,
    mlPorCopo,
    cheios: Math.min(COPOS_DO_DIA, Math.floor(totalMl / mlPorCopo)),
    faltamMl: Math.max(0, Math.round(metaMl - totalMl)),
  };
}

/**
 * O total depois de tocar num copo: enche até ele e, se ele já era o último
 * cheio, esvazia — o jeito de corrigir um toque a mais. Inteiro, como o banco.
 *
 * @example totalAoTocarNoCopo(2, 250, 2000) // 750
 */
export function totalAoTocarNoCopo(indice: number, totalAtualMl: number, metaMl: number): number {
  const mlPorCopo = metaMl / COPOS_DO_DIA;
  const ateEste = Math.round((indice + 1) * mlPorCopo);
  if (totalAtualMl === ateEste) return Math.max(0, Math.round(indice * mlPorCopo));
  return ateEste;
}

/**
 * A média de água dos dias com registro na semana, em ml.
 *
 * Hoje entra pelo total que está na tela, e não pelo que a semana leu do
 * banco: o copo tocado agora grava depois, e a média não pode ficar atrás dele.
 *
 * @example mediaDeAguaDaSemana(diasLidos, '2026-09-13', totalDeHoje) // 2500
 */
export function mediaDeAguaDaSemana(
  dias: { date: string; water_ml: number }[],
  hoje: string,
  totalDeHojeMl: number
): number | null {
  const totais = [
    ...dias.filter((dia) => dia.date !== hoje).map((dia) => dia.water_ml),
    totalDeHojeMl,
  ];
  const comAgua = totais.filter((ml) => ml > 0);
  if (comAgua.length === 0) return null;
  return Math.round(comAgua.reduce((soma, ml) => soma + ml, 0) / comAgua.length);
}
