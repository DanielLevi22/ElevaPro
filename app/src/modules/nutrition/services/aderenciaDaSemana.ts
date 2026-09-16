import {
  type DietMeal,
  type DietMealItem,
  type DietPlanType,
  type MealLog,
  mealsOfDay,
} from '@elevapro/shared';
import { consumoDoDia, percentualDaMeta } from './consumoDoDia';

export interface DiaDeAderencia {
  /** `YYYY-MM-DD`, no calendário do aluno. */
  data: string;
  /** A inicial do kit: S T Q Q S S D. */
  rotulo: string;
  /** `null` é "—": dia que ainda não chegou, ou sem refeição planejada. */
  percentual: number | null;
  /** 90% ou mais: a barra do kit acende na primária. */
  destaque: boolean;
}

export interface AderenciaDaSemana {
  dias: DiaDeAderencia[];
  /** Refeições feitas sobre planejadas, dos dias que já aconteceram. `null` sem nada planejado. */
  aderencia: number | null;
  /** Média de kcal dos dias com alguma refeição feita. `null` sem registro. */
  mediaDeCalorias: number | null;
}

interface EntradaDaAderencia {
  /** `YYYY-MM-DD` de hoje, no fuso do aluno. */
  hoje: string;
  tipoDoPlano: DietPlanType | null | undefined;
  refeicoes: DietMeal[];
  /** Os registros da semana, de qualquer dia. */
  registros: MealLog[];
  itensDoPlano: Record<string, DietMealItem[]>;
}

const ROTULOS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const LIMIAR_DO_DESTAQUE = 90;
const UM_DIA = 86_400_000;

/**
 * As datas de segunda a domingo da semana de `hoje`.
 *
 * A conta é em UTC de propósito: a data já chega no calendário do aluno, e
 * `new Date("2026-08-10")` lido em horário local volta um dia em fuso negativo.
 */
export function semanaDe(hoje: string): string[] {
  const dia = new Date(`${hoje}T00:00:00Z`);
  const desdeSegunda = (dia.getUTCDay() + 6) % 7;
  const segunda = dia.getTime() - desdeSegunda * UM_DIA;
  return ROTULOS.map((_, i) => new Date(segunda + i * UM_DIA).toISOString().slice(0, 10));
}

export function diaDaSemana(data: string): number {
  return new Date(`${data}T00:00:00Z`).getUTCDay();
}

/** Os registros de um dia, indexados pela refeição — o formato do store. */
function registrosDoDia(registros: MealLog[], data: string): Record<string, MealLog> {
  return Object.fromEntries(
    registros
      .filter((r) => r.logged_date === data && r.diet_meal_id)
      .map((r) => [r.diet_meal_id as string, r])
  );
}

interface ContagemDoDia {
  dia: DiaDeAderencia;
  planejadas: number;
  feitas: number;
  calorias: number;
}

function contarDia(entrada: EntradaDaAderencia, data: string, indice: number): ContagemDoDia {
  const planejadas = mealsOfDay(entrada.refeicoes, entrada.tipoDoPlano, diaDaSemana(data));
  const doDia = registrosDoDia(entrada.registros, data);
  const feitas = planejadas.filter((r) => doDia[r.id]?.completed).length;
  const conta = data <= entrada.hoje && planejadas.length > 0;
  const percentual = conta ? percentualDaMeta(feitas, planejadas.length) : null;
  return {
    dia: {
      data,
      rotulo: ROTULOS[indice],
      percentual,
      destaque: (percentual ?? 0) >= LIMIAR_DO_DESTAQUE,
    },
    planejadas: conta ? planejadas.length : 0,
    feitas: conta ? feitas : 0,
    calorias: consumoDoDia(planejadas, doDia, entrada.itensDoPlano).calorias,
  };
}

/**
 * Os números da tela de aderência do kit.
 *
 * @example
 * const semana = aderenciaDaSemana({ hoje: getLocalDateISOString(), tipoDoPlano: plano.plan_type,
 *   refeicoes: meals, registros, itensDoPlano: mealItems });
 */
export function aderenciaDaSemana(entrada: EntradaDaAderencia): AderenciaDaSemana {
  const contagens = semanaDe(entrada.hoje).map((data, i) => contarDia(entrada, data, i));
  const planejadas = contagens.reduce((soma, c) => soma + c.planejadas, 0);
  const feitas = contagens.reduce((soma, c) => soma + c.feitas, 0);
  const comRegistro = contagens.filter((c) => c.feitas > 0);

  return {
    dias: contagens.map((c) => c.dia),
    aderencia: planejadas > 0 ? percentualDaMeta(feitas, planejadas) : null,
    mediaDeCalorias:
      comRegistro.length > 0
        ? Math.round(comRegistro.reduce((soma, c) => soma + c.calorias, 0) / comRegistro.length)
        : null,
  };
}
