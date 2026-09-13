/**
 * As contas que o aluno lê no fluxo de treino: a semana do ciclo, a situação de
 * cada fase e qual treino vem agora.
 *
 * Moram em `shared/` porque são regra de produto, e não de tela: o web mostra
 * o mesmo ciclo ao especialista, e duas cópias desta conta divergiriam na
 * primeira vez que alguém mexesse numa delas.
 */

const DIA_EM_MS = 24 * 60 * 60 * 1000;
const DIAS_POR_SEMANA = 7;
const PERCENTUAL_CHEIO = 100;

/**
 * O "dia de academia" vira às 4h, e não à meia-noite.
 *
 * Quem treina à 1h da manhã está fechando o dia anterior, e contar esse treino
 * como de hoje fazia o app dizer "você já treinou hoje" logo ao acordar. A
 * regra veio da tela de fase do especialista, sem mudar; a cópia que continua
 * lá sai quando aquela tela for reescrita.
 */
const VIRADA_DO_DIA_DE_ACADEMIA = 4;

/** Segunda-feira, no `getDay()` do JavaScript. */
const SEGUNDA = 1;

/**
 * Data do banco (`YYYY-MM-DD`) em hora local.
 *
 * `new Date("2026-08-01")` é lido como UTC e, em fuso negativo, cai no dia
 * anterior — o ciclo apareceria começando um dia depois.
 */
function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export interface ProgressoDoCiclo {
  /** Zero antes do início; o total depois do fim. */
  semanaAtual: number;
  totalSemanas: number;
  percentual: number;
}

/**
 * Em que semana do ciclo o aluno está.
 *
 * O percentual é da semana, e não do dia: o kit mostra "Semana 7 de 16 · 44%",
 * e 7 de 16 é 43,75%.
 *
 * @example progressoDoCiclo("2026-05-06", "2026-08-25", new Date()) // { semanaAtual: 7, ... }
 */
export function progressoDoCiclo(inicio: string, fim: string, hoje: Date): ProgressoDoCiclo {
  const comeco = dataLocal(inicio).getTime();
  // Sem somar o dia final: de 04/09 a 30/10 são 56 dias, 8 semanas. Contando
  // as duas pontas eram 57, e o ciclo de 8 semanas aparecia com 9.
  const diasNoCiclo = Math.round((dataLocal(fim).getTime() - comeco) / DIA_EM_MS);
  const totalSemanas = Math.max(1, Math.ceil(diasNoCiclo / DIAS_POR_SEMANA));
  const decorrido = hoje.getTime() - comeco;

  if (decorrido < 0) return { semanaAtual: 0, totalSemanas, percentual: 0 };

  const semanaAtual = limitar(
    Math.floor(decorrido / DIA_EM_MS / DIAS_POR_SEMANA) + 1,
    1,
    totalSemanas,
  );
  return {
    semanaAtual,
    totalSemanas,
    percentual: Math.round((semanaAtual / totalSemanas) * PERCENTUAL_CHEIO),
  };
}

export type TomDaFase = "concluida" | "ativa" | "planejada";

export interface SituacaoDaFase {
  rotulo: "Concluída" | "Em andamento" | "Planejada";
  tom: TomDaFase;
  percentual: number;
}

interface FaseDatada {
  status: "planned" | "active" | "completed";
  start_date: string;
  end_date: string;
}

/**
 * Como vai a fase, nas palavras do kit.
 *
 * O status vem do especialista, e não das datas: fase ativa é a que ele
 * ativou. As datas só dizem quanto dela já passou.
 *
 * O percentual é por data, e não por treinos concluídos contra os planejados:
 * a consulta das fases traz quantos treinos cada uma tem, mas não quantos o
 * aluno já fez nelas. Contar feitos por fase é consulta nova, e fica para
 * quando o progresso por treino for pedido.
 *
 * @example situacaoDaFase(fase, new Date()) // { rotulo: "Em andamento", tom: "ativa", percentual: 62 }
 */
export function situacaoDaFase(fase: FaseDatada, hoje: Date): SituacaoDaFase {
  if (fase.status === "completed") {
    return { rotulo: "Concluída", tom: "concluida", percentual: PERCENTUAL_CHEIO };
  }
  if (fase.status === "planned") {
    return { rotulo: "Planejada", tom: "planejada", percentual: 0 };
  }
  const comeco = dataLocal(fase.start_date).getTime();
  // Mesma contagem de `progressoDoCiclo`: o intervalo, sem somar o dia final.
  const diasNaFase = Math.max(
    1,
    Math.round((dataLocal(fase.end_date).getTime() - comeco) / DIA_EM_MS),
  );
  const decorridos = (hoje.getTime() - comeco) / DIA_EM_MS;
  const percentual = Math.round(
    limitar((decorridos / diasNaFase) * PERCENTUAL_CHEIO, 0, PERCENTUAL_CHEIO),
  );
  return { rotulo: "Em andamento", tom: "ativa", percentual };
}

export interface SessaoConcluida {
  workout_id: string | null;
  completed_at: string | null;
}

function diaDeAcademia(momento: Date): string {
  const ajustado = new Date(momento);
  ajustado.setHours(ajustado.getHours() - VIRADA_DO_DIA_DE_ACADEMIA);
  return ajustado.toDateString();
}

/**
 * Se já houve treino no dia de academia de hoje.
 *
 * @example treinouHoje(ultimaSessao, new Date()) // true depois do treino de hoje
 */
export function treinouHoje(ultima: SessaoConcluida | null, agora: Date): boolean {
  if (!ultima?.completed_at) return false;
  return diaDeAcademia(new Date(ultima.completed_at)) === diaDeAcademia(agora);
}

export interface SugestaoDeTreino {
  /** Posição do treino na lista da fase. */
  indice: number;
  feitoHoje: boolean;
}

/**
 * Qual treino da fase vem agora: o seguinte ao último feito, em rodízio.
 *
 * Sem histórico — ou com o último treino feito em outra fase — é o primeiro.
 * `feitoHoje` diz se já houve treino no dia de academia de hoje; a tela decide
 * o que fazer com isso.
 *
 * @example proximoTreino(treinosDaFase, ultimaSessao, new Date()) // { indice: 1, feitoHoje: false }
 */
export function proximoTreino(
  treinos: { id: string }[],
  ultima: SessaoConcluida | null,
  agora: Date,
): SugestaoDeTreino | null {
  if (treinos.length === 0) return null;
  if (!ultima?.completed_at) return { indice: 0, feitoHoje: false };

  const indiceDoUltimo = treinos.findIndex((treino) => treino.id === ultima.workout_id);
  const indice = indiceDoUltimo === -1 ? 0 : (indiceDoUltimo + 1) % treinos.length;
  return { indice, feitoHoje: treinouHoje(ultima, agora) };
}

/** Começo da semana de academia: segunda-feira, na virada das 4h. */
function inicioDaSemana(agora: Date): Date {
  const inicio = new Date(agora);
  inicio.setHours(inicio.getHours() - VIRADA_DO_DIA_DE_ACADEMIA);
  const diasDesdeSegunda = (inicio.getDay() - SEGUNDA + DIAS_POR_SEMANA) % DIAS_POR_SEMANA;
  inicio.setDate(inicio.getDate() - diasDesdeSegunda);
  inicio.setHours(VIRADA_DO_DIA_DE_ACADEMIA, 0, 0, 0);
  return inicio;
}

/**
 * Os treinos já feitos nesta semana, para a lista da fase marcá-los.
 *
 * @example concluidosNaSemana(sessoes, new Date()).has(treino.id)
 */
export function concluidosNaSemana(sessoes: SessaoConcluida[], agora: Date): Set<string> {
  const desde = inicioDaSemana(agora).getTime();
  const feitos = new Set<string>();
  for (const sessao of sessoes) {
    if (!sessao.workout_id || !sessao.completed_at) continue;
    if (new Date(sessao.completed_at).getTime() >= desde) feitos.add(sessao.workout_id);
  }
  return feitos;
}

/** O começo da semana em ISO, para a consulta pedir só as sessões dela. */
export function inicioDaSemanaISO(agora: Date): string {
  return inicioDaSemana(agora).toISOString();
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Uma data do banco como o kit escreve: "06 mai".
 *
 * @example dataCurta("2026-05-06") // "06 mai"
 */
export function dataCurta(iso: string): string {
  const data = dataLocal(iso);
  return `${String(data.getDate()).padStart(2, "0")} ${MESES[data.getMonth()]}`;
}

/**
 * Um instante (`timestamptz`) no mesmo formato, no fuso do aparelho.
 *
 * Separado de `dataCurta` porque lá a data já é do calendário e ler como
 * instante a voltaria um dia em fuso negativo; aqui é o contrário — um treino
 * das 22h de Brasília é gravado no dia seguinte em UTC.
 *
 * @example dataCurtaDoInstante("2026-08-13T01:00:00Z") // "12 ago" em Brasília
 */
export function dataCurtaDoInstante(iso: string): string {
  const data = new Date(iso);
  return `${String(data.getDate()).padStart(2, "0")} ${MESES[data.getMonth()]}`;
}

/**
 * O intervalo de uma fase como o kit escreve: "06 mai – 02 jun".
 *
 * Mês à mão, e não `toLocaleDateString`: o pt-BR devolve "06 de mai.", e o
 * formato muda entre versões do motor de Intl de cada plataforma.
 *
 * @example intervaloCurto("2026-05-06", "2026-06-02") // "06 mai – 02 jun"
 */
export function intervaloCurto(inicio: string, fim: string): string {
  return `${dataCurta(inicio)} – ${dataCurta(fim)}`;
}

/**
 * O período de um ciclo na lista de periodizações.
 *
 * Um ciclo que ainda não começou diz quando começa ("a partir de 21 out"); os
 * outros, os meses de ponta a ponta, com o ano uma vez quando é o mesmo ("jan –
 * abr 2026") e nas duas pontas quando não é ("nov 2025 – fev 2026").
 *
 * @example periodoDoCiclo("2026-01-05", "2026-04-20", new Date()) // "jan – abr 2026"
 */
export function periodoDoCiclo(inicio: string, fim: string, hoje: Date): string {
  const comeco = dataLocal(inicio);
  if (comeco.getTime() > hoje.getTime()) return `a partir de ${dataCurta(inicio)}`;
  const final = dataLocal(fim);
  const [mesInicio, mesFim] = [MESES[comeco.getMonth()], MESES[final.getMonth()]];
  if (comeco.getFullYear() === final.getFullYear()) {
    return `${mesInicio} – ${mesFim} ${final.getFullYear()}`;
  }
  return `${mesInicio} ${comeco.getFullYear()} – ${mesFim} ${final.getFullYear()}`;
}
