import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O assistente tem um nome só.
 *
 * Na tela ele já apareceu como "AI Coach", "Coach IA", "Coach de Treino" e "o
 * coach" — quatro nomes para a mesma coisa, e um deles ("coach") é o que o
 * **specialist** é para o student, o que apaga a distinção justamente onde ela
 * importa: quem responde pela prescrição.
 *
 * Esta trava é sobre o nome do produto, não sobre a palavra: comentário de
 * código explicando o passado, rota (`/dashboard/student/coach`) e símbolo
 * (`AiCoachChat`) continuam valendo. Ver `CONTEXT.md`, seção Assistente.
 */

/** O que ninguém deve ler na tela. */
const NOMES_APOSENTADOS = ["AI Coach", "Coach IA", "Coach de Treino", "Coach de Nutrição"];

const RAIZ = join(__dirname, "..", "..", "..");

/** Onde o nome chega a quem usa: telas e a persona que o modelo assume. */
function arquivosDeInterface(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (entrada !== "__tests__" && entrada !== "node_modules") {
        arquivosDeInterface(caminho, encontrados);
      }
    } else if (entrada.endsWith(".tsx") || entrada.endsWith(".prompts.ts")) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

describe("nome do assistente", () => {
  const arquivos = arquivosDeInterface(RAIZ);

  it("encontra as telas para conferir", () => {
    expect(arquivos.length).toBeGreaterThan(50);
  });

  it.each(NOMES_APOSENTADOS)("nenhuma tela chama o assistente de %s", (nome) => {
    const reincidentes = arquivos.filter((caminho) => readFileSync(caminho, "utf8").includes(nome));

    expect(
      reincidentes.map((c) => c.replace(RAIZ, "")),
      `NOME APOSENTADO NA TELA: "${nome}" voltou. O assistente se chama Assistente — ver CONTEXT.md, seção Assistente.`,
    ).toEqual([]);
  });
});
