import type { SessaoComSeries } from "../types/workouts.types";
import { DIAS_DA_SEMANA, doisDigitos, MESES_POR_EXTENSO, MS_POR_SEGUNDO } from "./calendario";

/**
 * As contas de uma sessão de treino de força: volume, gasto, evolução e os
 * formatos em que o kit as escreve.
 *
 * Vivem em `shared/` porque o resumo que o aluno vê no fim da sessão é o mesmo
 * que o especialista vai ler no web — e "4,2 t" calculado de dois jeitos seria
 * dois números.
 */

/** O que foi feito numa série: repetições e carga. Nulo é "não informado". */
export interface SerieFeita {
  reps: number | null;
  carga: number | null;
}

/**
 * O número de um campo da prescrição, que é texto: "8-10" vale 8, "47,5" vale
 * 47,5, "40 kg" vale 40.
 *
 * Só número, faixa ou quilo. "10 min" é tempo, e não dez repetições: lê-lo
 * como 10 gravava a esteira com dez repetições em `reps_actual`. Texto que não
 * é quantidade vira nulo — e nunca `NaN`, que atravessaria até o banco.
 *
 * @example numeroDaPrescricao("8-10")   // 8
 * @example numeroDaPrescricao("10 min") // null
 */
export function numeroDaPrescricao(texto: string | null | undefined): number | null {
  const casou = QUANTIDADE.exec(String(texto ?? ""));
  return casou ? Number.parseFloat(casou[1].replace(",", ".")) : null;
}

/** Um número, e opcionalmente uma faixa ("8-10") ou a unidade de carga. */
const QUANTIDADE = /^\s*(\d+(?:[.,]\d+)?)\s*(?:[-–]\s*\d+(?:[.,]\d+)?\s*)?(?:kg)?\s*$/i;

const QUILOS_POR_TONELADA = 1000;
const SEGUNDOS_POR_MINUTO = 60;
const SEGUNDOS_POR_HORA = 3600;

/**
 * MET do treino de força moderado. É o valor que a tela de execução antiga já
 * usava; uma estimativa, e o kit a escreve como tal ("Gasto").
 */
export const MET_DO_TREINO_DE_FORCA = 3.5;

/**
 * Volume em quilos: carga × repetições de cada série. Série sem carga ou sem
 * repetição não soma — peso do corpo não é zero quilo levantado, é outra
 * medida, e somá-lo como zero faria a série existir sem volume.
 *
 * @example volumeDasSeries([{ reps: 10, carga: 40 }, { reps: 8, carga: 45 }]) // 760
 */
export function volumeDasSeries(series: readonly SerieFeita[]): number {
  return series.reduce((total, serie) => {
    if (serie.reps === null || serie.carga === null) return total;
    return total + serie.reps * serie.carga;
  }, 0);
}

/**
 * Número com vírgula e no máximo uma casa, sem zero à direita.
 *
 * À mão, e não `toLocaleString`: o motor de Intl muda entre plataformas e
 * versões, e o kit tem um formato só.
 *
 * @example formatarDecimal(2.5) // "2,5"
 */
export function formatarDecimal(valor: number): string {
  const arredondado = Math.round(valor * 10) / 10;
  return String(arredondado).replace(".", ",");
}

/**
 * O volume como o kit escreve: toneladas a partir de uma, quilos abaixo.
 *
 * @example formatarVolume(4210) // "4,2 t"
 * @example formatarVolume(850)  // "850 kg"
 */
export function formatarVolume(quilos: number): string {
  if (quilos >= QUILOS_POR_TONELADA) return `${formatarDecimal(quilos / QUILOS_POR_TONELADA)} t`;
  return `${Math.round(quilos)} kg`;
}

/**
 * @example formatarCarga(47.5) // "47,5 kg"
 */
export function formatarCarga(quilos: number): string {
  return `${formatarDecimal(quilos)} kg`;
}

/**
 * A duração como relógio: "52:14", e "1:02:14" a partir de uma hora.
 *
 * @example formatarDuracao(3134) // "52:14"
 */
export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((total % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO);
  const resto = total % SEGUNDOS_POR_MINUTO;
  const mmss = `${doisDigitos(minutos)}:${doisDigitos(resto)}`;
  return horas > 0 ? `${horas}:${mmss}` : mmss;
}

/**
 * Gasto estimado em kcal: MET × peso × horas.
 *
 * @example gastoDoTreino(3600, 80) // 280
 */
export function gastoDoTreino(segundos: number, pesoKg: number): number {
  return Math.round(MET_DO_TREINO_DE_FORCA * pesoKg * (segundos / SEGUNDOS_POR_HORA));
}

export interface ResumoDaSessao {
  duracaoSegundos: number;
  volumeKg: number;
  series: number;
  kcal: number;
}

/**
 * Os quatro números do resumo do kit: duração, volume, séries e gasto.
 *
 * @example
 * resumoDaSessao(feitas, sessao.iniciadaEm, sessao.concluidaEm, pesoKg);
 */
export function resumoDaSessao(
  feitas: Readonly<Record<string, readonly SerieFeita[]>>,
  inicioMs: number,
  fimMs: number,
  pesoKg: number,
): ResumoDaSessao {
  const todas = Object.values(feitas).flat();
  const duracaoSegundos = Math.max(0, Math.round((fimMs - inicioMs) / MS_POR_SEGUNDO));
  return {
    duracaoSegundos,
    volumeKg: volumeDasSeries(todas),
    series: todas.length,
    kcal: gastoDoTreino(duracaoSegundos, pesoKg),
  };
}

/**
 * As séries concluídas da sessão anterior, por exercício da prescrição.
 *
 * Série pulada não entra: não é evolução nem regressão.
 */
export function seriesDaSessaoAnterior(
  anterior: SessaoComSeries | null,
): Record<string, SerieFeita[]> {
  const porExercicio: Record<string, SerieFeita[]> = {};
  for (const exercicio of anterior?.exercises ?? []) {
    if (!exercicio.workout_exercise_id) continue;
    porExercicio[exercicio.workout_exercise_id] = [...exercicio.sets]
      .filter((serie) => serie.completed)
      .sort((a, b) => a.set_index - b.set_index)
      .map((serie) => ({ reps: serie.reps_actual, carga: serie.weight_actual }));
  }
  return porExercicio;
}

function cargaMaxima(series: readonly SerieFeita[]): number {
  return series.reduce((maior, serie) => Math.max(maior, serie.carga ?? 0), 0);
}

function repsMaximas(series: readonly SerieFeita[]): number {
  return series.reduce((maior, serie) => Math.max(maior, serie.reps ?? 0), 0);
}

/**
 * Quanto a carga de hoje passa a maior da última vez, em quilos. Nulo quando
 * não sobe — o kit pinta a evolução de verde, e verde para uma queda diria o
 * contrário do que aconteceu.
 *
 * @example ganhoDeCarga(47.5, [{ reps: 10, carga: 45 }]) // 2.5
 */
export function ganhoDeCarga(
  cargaDeHoje: number | null,
  anteriores: readonly SerieFeita[] | undefined,
): number | null {
  const antes = cargaMaxima(anteriores ?? []);
  if (cargaDeHoje === null || antes === 0 || cargaDeHoje <= antes) return null;
  return cargaDeHoje - antes;
}

export interface Evolucao {
  itemId: string;
  nome: string;
  /** "45 kg → 47,5 kg" ou "4 × 10 (antes 4 × 8)". */
  texto: string;
}

/**
 * As evoluções da sessão frente à última execução do mesmo treino.
 *
 * Carga primeiro: subir a carga é a evolução que o kit destaca. Com a mesma
 * carga, mais repetições na melhor série também é recorde. Exercício sem
 * histórico não entra — primeira vez não é evolução de nada.
 *
 * @example
 * evolucoesDaSessao(itens, feitas, seriesDaSessaoAnterior(anterior));
 */
export function evolucoesDaSessao(
  itens: readonly { id: string; nome: string }[],
  feitas: Readonly<Record<string, readonly SerieFeita[]>>,
  anteriores: Readonly<Record<string, readonly SerieFeita[]>>,
): Evolucao[] {
  return itens.flatMap((item) => {
    const texto = textoDaEvolucao(feitas[item.id] ?? [], anteriores[item.id] ?? []);
    return texto ? [{ itemId: item.id, nome: item.nome, texto }] : [];
  });
}

function textoDaEvolucao(hoje: readonly SerieFeita[], antes: readonly SerieFeita[]): string | null {
  if (hoje.length === 0 || antes.length === 0) return null;
  const [cargaHoje, cargaAntes] = [cargaMaxima(hoje), cargaMaxima(antes)];
  if (cargaHoje > cargaAntes && cargaAntes > 0) {
    return `${formatarCarga(cargaAntes)} → ${formatarCarga(cargaHoje)}`;
  }
  const [repsHoje, repsAntes] = [repsMaximas(hoje), repsMaximas(antes)];
  if (cargaHoje === cargaAntes && repsHoje > repsAntes) {
    return `${hoje.length} × ${repsHoje} (antes ${antes.length} × ${repsAntes})`;
  }
  return null;
}

/**
 * O dia de uma sessão por extenso, sem a hora — como o card de compartilhar
 * escreve.
 *
 * @example diaPorExtenso(new Date(2026, 7, 12, 19, 42)) // "Quarta, 12 de agosto"
 */
export function diaPorExtenso(instante: Date): string {
  return `${DIAS_DA_SEMANA[instante.getDay()]}, ${instante.getDate()} de ${MESES_POR_EXTENSO[instante.getMonth()]}`;
}

/**
 * O instante de uma sessão como o resumo do kit escreve, no fuso do aparelho.
 *
 * @example dataPorExtenso(new Date(2026, 7, 12, 19, 42)) // "Quarta, 12 de agosto · 19:42"
 */
export function dataPorExtenso(instante: Date): string {
  const hora = `${doisDigitos(instante.getHours())}:${doisDigitos(instante.getMinutes())}`;
  return `${diaPorExtenso(instante)} · ${hora}`;
}
