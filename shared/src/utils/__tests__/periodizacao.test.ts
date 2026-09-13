import { describe, expect, it } from "vitest";
import {
  concluidosNaSemana,
  dataCurtaDoInstante,
  intervaloCurto,
  periodoDoCiclo,
  progressoDoCiclo,
  proximoTreino,
  situacaoDaFase,
  treinouHoje,
} from "../periodizacao";

/**
 * As contas que o aluno lê no fluxo de treino: em que semana do ciclo está,
 * como vai cada fase e qual treino vem agora.
 *
 * Toda data aqui é construída em hora local (`new Date(ano, mes, dia, hora)`),
 * e as datas do banco chegam como `YYYY-MM-DD`: é exatamente o par que, lido
 * com `new Date("2026-08-01")`, vira UTC e volta um dia em fuso negativo.
 */
const em = (ano: number, mes: number, dia: number, hora = 12) => new Date(ano, mes - 1, dia, hora);

describe("progressoDoCiclo", () => {
  // O kit mostra "Semana 7 de 16 · 44%": o percentual é da semana, não do dia.
  it("diz a semana corrente, o total e o percentual pela semana", () => {
    const hoje = em(2026, 6, 20);
    expect(progressoDoCiclo("2026-05-06", "2026-08-25", hoje)).toEqual({
      semanaAtual: 7,
      totalSemanas: 16,
      percentual: 44,
    });
  });

  it("um ciclo de 8 semanas tem 8 semanas, e não 9", () => {
    // Regressão vista no aparelho: "Condicionamento 8 Semanas", de 04/09 a
    // 30/10, aparecia como "Semana 2 de 9" — os dias eram contados com as duas
    // pontas, e 57 dias arredondam para 9 semanas.
    expect(progressoDoCiclo("2026-09-04", "2026-10-30", em(2026, 9, 12)).totalSemanas).toBe(8);
  });

  it("antes do início está na semana zero, e não na primeira", () => {
    expect(progressoDoCiclo("2026-10-01", "2026-12-01", em(2026, 9, 12))).toMatchObject({
      semanaAtual: 0,
      percentual: 0,
    });
  });

  it("depois do fim fica na última semana, sem passar de 100%", () => {
    expect(progressoDoCiclo("2026-01-05", "2026-02-01", em(2026, 9, 12))).toEqual({
      semanaAtual: 4,
      totalSemanas: 4,
      percentual: 100,
    });
  });

  it("lê a data do banco em hora local, e não em UTC", () => {
    // Às 00h30 do dia do início, em UTC ainda seria o dia anterior em fuso
    // negativo — e o ciclo apareceria como não começado.
    expect(progressoDoCiclo("2026-09-12", "2026-10-09", em(2026, 9, 12, 0)).semanaAtual).toBe(1);
  });
});

describe("situacaoDaFase", () => {
  it("fase concluída está cheia", () => {
    const fase = { status: "completed" as const, start_date: "2026-05-06", end_date: "2026-06-02" };
    expect(situacaoDaFase(fase, em(2026, 9, 12))).toEqual({
      rotulo: "Concluída",
      tom: "concluida",
      percentual: 100,
    });
  });

  // Sem teste de "fase sem data": `start_date` e `end_date` são NOT NULL no
  // banco desde a 0024/0025, e o tipo já não admite nulo.
  const ativa = { status: "active" as const, start_date: "2026-09-01", end_date: "2026-09-30" };

  it("fase em andamento avança pelos dias decorridos, contados como os do ciclo", () => {
    // 29 dias de intervalo — sem somar o dia final, como `progressoDoCiclo`.
    expect(situacaoDaFase(ativa, em(2026, 9, 16))).toEqual({
      rotulo: "Em andamento",
      tom: "ativa",
      percentual: 53,
    });
  });

  it("fase ativa antes das próprias datas ainda está em zero", () => {
    expect(situacaoDaFase(ativa, em(2026, 8, 20)).percentual).toBe(0);
  });

  it("fase ativa depois das próprias datas não passa de 100%", () => {
    // O especialista ainda não a encerrou; o status manda, as datas só medem.
    expect(situacaoDaFase(ativa, em(2026, 10, 20))).toMatchObject({
      tom: "ativa",
      percentual: 100,
    });
  });

  it("fase planejada ainda não começou", () => {
    const fase = { status: "planned" as const, start_date: "2026-10-01", end_date: "2026-11-01" };
    expect(situacaoDaFase(fase, em(2026, 9, 12))).toEqual({
      rotulo: "Planejada",
      tom: "planejada",
      percentual: 0,
    });
  });
});

describe("proximoTreino", () => {
  const treinos = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("sem histórico, sugere o primeiro", () => {
    expect(proximoTreino(treinos, null, em(2026, 9, 12))).toEqual({
      indice: 0,
      feitoHoje: false,
    });
  });

  it("sugere o seguinte ao último feito, voltando ao começo depois do último", () => {
    const ultima = { workout_id: "c", completed_at: em(2026, 9, 10).toISOString() };
    expect(proximoTreino(treinos, ultima, em(2026, 9, 12))?.indice).toBe(0);
  });

  it("último feito de outra fase conta como sem histórico nesta", () => {
    const ultima = { workout_id: "de-outra-fase", completed_at: em(2026, 9, 10).toISOString() };
    expect(proximoTreino(treinos, ultima, em(2026, 9, 12))?.indice).toBe(0);
  });

  it("o dia de academia vira às 4h: treino à 1h conta para o dia anterior", () => {
    // Regra que já existia na tela de fase e sai dela sem mudar.
    const ultima = { workout_id: "a", completed_at: em(2026, 9, 12, 1).toISOString() };
    expect(proximoTreino(treinos, ultima, em(2026, 9, 11, 22))?.feitoHoje).toBe(true);
    expect(proximoTreino(treinos, ultima, em(2026, 9, 12, 9))?.feitoHoje).toBe(false);
  });

  it("com todos os treinos da fase feitos, o rodízio recomeça do primeiro", () => {
    const ultima = { workout_id: "c", completed_at: em(2026, 9, 11).toISOString() };
    expect(proximoTreino(treinos, ultima, em(2026, 9, 12))).toEqual({
      indice: 0,
      feitoHoje: false,
    });
  });

  it("fase sem treino não sugere nada", () => {
    expect(proximoTreino([], null, em(2026, 9, 12))).toBeNull();
  });
});

describe("treinouHoje", () => {
  // O detalhe do treino pergunta antes de um segundo treino no mesmo dia; a
  // pergunta precisa estar onde o treino começa, e não só no cartão da fase.
  it("sem sessão, não treinou", () => {
    expect(treinouHoje(null, em(2026, 9, 12))).toBe(false);
  });

  it("segue a mesma virada das 4h do rodízio", () => {
    const ultima = { workout_id: "a", completed_at: em(2026, 9, 12, 1).toISOString() };
    expect(treinouHoje(ultima, em(2026, 9, 11, 23))).toBe(true);
    expect(treinouHoje(ultima, em(2026, 9, 12, 8))).toBe(false);
  });
});

describe("concluidosNaSemana", () => {
  it("com a semana toda feita, marca todos", () => {
    const sessoes = ["a", "b", "c"].map((id, dia) => ({
      workout_id: id,
      completed_at: em(2026, 9, 8 + dia).toISOString(),
    }));
    expect(concluidosNaSemana(sessoes, em(2026, 9, 12)).size).toBe(3);
  });

  it("marca os treinos feitos desde a segunda, e ignora os da semana anterior", () => {
    // 2026-09-12 é sábado; a semana começou na segunda, dia 7.
    const sessoes = [
      { workout_id: "a", completed_at: em(2026, 9, 8).toISOString() },
      { workout_id: "b", completed_at: em(2026, 9, 5).toISOString() },
      { workout_id: null, completed_at: em(2026, 9, 9).toISOString() },
    ];
    expect([...concluidosNaSemana(sessoes, em(2026, 9, 12))]).toEqual(["a"]);
  });
});

describe("intervaloCurto", () => {
  // O kit escreve "06 mai – 02 jun". O `toLocaleDateString` do pt-BR devolve
  // "06 de mai." — com "de" e ponto —, e muda entre versões do motor de Intl.
  it("escreve dia com dois dígitos e mês abreviado, sem 'de' nem ponto", () => {
    expect(intervaloCurto("2026-05-06", "2026-06-02")).toBe("06 mai – 02 jun");
  });

  it("lê a data do banco sem cair no dia anterior", () => {
    expect(intervaloCurto("2026-01-01", "2026-12-31")).toBe("01 jan – 31 dez");
  });
});

describe("dataCurtaDoInstante", () => {
  // Um instante é lido no fuso do aparelho: o treino terminou às 22h do dia 12
  // aqui, e o banco guardou 01h do dia 13 em UTC.
  it("escreve o instante no dia local, e não no dia UTC", () => {
    const local = new Date(2026, 7, 12, 22, 0);
    expect(dataCurtaDoInstante(local.toISOString())).toBe("12 ago");
  });
});

describe("periodoDoCiclo", () => {
  const hoje = new Date(2026, 8, 13);

  it("escreve os meses de ponta a ponta, com o ano uma vez quando é o mesmo", () => {
    expect(periodoDoCiclo("2026-01-05", "2026-04-20", hoje)).toBe("jan – abr 2026");
  });

  it("escreve o ano nas duas pontas quando o ciclo atravessa a virada", () => {
    expect(periodoDoCiclo("2025-11-03", "2026-02-23", hoje)).toBe("nov 2025 – fev 2026");
  });

  // Um ciclo planejado ainda não tem "de quando até quando" que interesse: o
  // aluno quer saber quando começa.
  it("diz quando começa o ciclo que ainda não começou", () => {
    expect(periodoDoCiclo("2026-10-21", "2026-12-30", hoje)).toBe("a partir de 21 out");
  });
});
