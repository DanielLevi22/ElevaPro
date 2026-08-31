import { describe, expect, it } from "vitest";
import { etapaDoTexto, linhaDoFluxo, separarLinhas } from "../fluxoDoBodyScan";

describe("a etapa lida do que o modelo já escreveu", () => {
  it("começa em lendo, antes de qualquer seção", () => {
    expect(etapaDoTexto("")).toBe("lendo");
    expect(etapaDoTexto('{"metrics":{"bodyFat":18}')).toBe("lendo");
  });

  it("avança conforme cada seção aparece", () => {
    expect(etapaDoTexto('{"metrics":{},"segments":{')).toBe("proporcoes");
    expect(etapaDoTexto('{"segments":{},"postureAnalysis":{')).toBe("postura");
  });

  // O texto só cresce: quando `recommendations` chega, `segments` continua lá.
  // Buscando da primeira para a última, a etapa travaria em "proporcoes".
  it("fica na seção mais avançada, não na primeira que apareceu", () => {
    const completo = '{"segments":{},"postureAnalysis":{"recommendations":"..."}}';

    expect(etapaDoTexto(completo)).toBe("recomendacoes");
  });

  // A etapa vem do texto, nunca de um relógio. Geração travada tem de parar de
  // avançar — é essa a informação que o aluno precisa.
  it("não avança sozinha quando o texto não avança", () => {
    const preso = '{"segments":{';

    expect(etapaDoTexto(preso)).toBe("proporcoes");
    expect(etapaDoTexto(preso)).toBe(etapaDoTexto(preso));
  });
});

describe("a leitura das linhas do fluxo", () => {
  it("devolve as completas e guarda a que ficou pela metade", () => {
    const { linhas, resto } = separarLinhas('{"t":"etapa","etapa":"postura"}\n{"t":"o');

    expect(linhas).toEqual([{ t: "etapa", etapa: "postura" }]);
    expect(resto).toBe('{"t":"o');
  });

  it("junta o resto com o pedaço seguinte sem perder nada", () => {
    const primeiro = separarLinhas('{"t":"etapa","etapa":"lendo"}\n{"t":"ok","pay');
    const segundo = separarLinhas(`${primeiro.resto}load":{"bmi":24}}\n`);

    expect(segundo.linhas).toEqual([{ t: "ok", payload: { bmi: 24 } }]);
    expect(segundo.resto).toBe("");
  });

  // Um evento de progresso corrompido não pode custar o laudo, que vem depois.
  it("ignora linha ilegível e entrega as seguintes", () => {
    const { linhas } = separarLinhas('nao é json\n{"t":"erro","codigo":"ai_unavailable"}\n');

    expect(linhas).toEqual([{ t: "erro", codigo: "ai_unavailable" }]);
  });

  it("não devolve linha para um fluxo vazio", () => {
    expect(separarLinhas("").linhas).toEqual([]);
    expect(separarLinhas("\n\n").linhas).toEqual([]);
  });

  it("escreve e lê a mesma linha", () => {
    const original = { t: "etapa", etapa: "recomendacoes" } as const;

    expect(separarLinhas(linhaDoFluxo(original)).linhas).toEqual([original]);
  });
});
