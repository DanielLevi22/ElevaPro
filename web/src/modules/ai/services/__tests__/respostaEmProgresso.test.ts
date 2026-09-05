import { describe, expect, it } from "vitest";
import { criarRespostaEmProgresso, type DependenciasDaResposta } from "../respostaEmProgresso";

/**
 * A resposta gravada enquanto chega.
 *
 * O defeito que isto trava: a resposta só ia para o banco no fim do turno, e a
 * pergunta já estava salva desde o começo. Perder a conexão — ou bater no
 * `maxDuration = 60` da Vercel, que encerra o processo sem passar por `catch`
 * nenhum — deixava a pergunta na tela com silêncio embaixo.
 */

const SESSAO = "sessao-1";

/** Banco de mentira com relógio na mão do teste. */
function bancoFalso() {
  const gravadas: Array<{ conteudo: string; metadata: unknown }> = [];
  let relogio = 1_000_000;
  let inserts = 0;
  /** Segura a escrita seguinte até o teste soltar — para observar o "em voo". */
  let travar: (() => void) | null = null;

  const deps: DependenciasDaResposta = {
    salvar: async (_sessao, _papel, conteudo, metadata) => {
      inserts += 1;
      if (travar) await new Promise<void>((resolve) => (travar = resolve));
      gravadas.push({ conteudo, metadata });
      return "msg-1";
    },
    atualizar: async (_id, conteudo, metadata) => {
      if (travar) await new Promise<void>((resolve) => (travar = resolve));
      gravadas.push({ conteudo, metadata });
    },
    agora: () => relogio,
  };

  return {
    deps,
    gravadas,
    get inserts() {
      return inserts;
    },
    avancar: (ms: number) => {
      relogio += ms;
    },
    segurar: () => {
      travar = () => {};
    },
    soltar: () => {
      const solta = travar;
      travar = null;
      solta?.();
    },
  };
}

describe("resposta em progresso", () => {
  it("turno curto grava uma vez só, no fim, e sem marca de incompleta", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    resposta.empurrar("Olá");
    resposta.empurrar(", vamos montar o treino.");
    await resposta.concluir();

    expect(banco.gravadas).toEqual([{ conteudo: "Olá, vamos montar o treino.", metadata: {} }]);
  });

  // O caso que a issue existe para cobrir: o processo morre sem avisar, e o que
  // já foi gravado é tudo que sobra.
  it("turno longo já deixou texto no banco antes de acabar", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    resposta.empurrar("Primeira parte.");
    banco.avancar(4000);
    resposta.empurrar(" Segunda parte.");
    await Promise.resolve();

    expect(banco.gravadas).toEqual([
      { conteudo: "Primeira parte. Segunda parte.", metadata: { incompleta: true } },
    ]);
  });

  it("as gravações são espaçadas: dezenas de pedaços não viram dezenas de escritas", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    for (let i = 0; i < 50; i++) {
      resposta.empurrar(`${i} `);
      banco.avancar(100);
      await Promise.resolve();
    }
    await resposta.concluir();

    // 5 segundos de texto: uma gravação intermediária e a final.
    expect(banco.gravadas).toHaveLength(2);
  });

  it("concluir tira a marca de incompleta do que tinha sido gravado no meio", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    resposta.empurrar("Começo.");
    banco.avancar(4000);
    resposta.empurrar(" Fim.");
    await Promise.resolve();
    await resposta.concluir({ saved_periodization_id: "per-1" });

    expect(banco.gravadas.at(-1)).toEqual({
      conteudo: "Começo. Fim.",
      metadata: { saved_periodization_id: "per-1" },
    });
    // A mesma linha, reescrita — não uma segunda mensagem na conversa.
    expect(banco.inserts).toBe(1);
  });

  it("interromper grava o que chegou e mantém a marca", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    resposta.empurrar("Estava dizendo que");
    await resposta.interromper();

    expect(banco.gravadas).toEqual([
      { conteudo: "Estava dizendo que", metadata: { incompleta: true } },
    ]);
  });

  // Um turno que só usa ferramenta não tem o que dizer — e mensagem vazia na
  // conversa é pior que mensagem nenhuma.
  it("turno sem texto nenhum não cria mensagem", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    await resposta.concluir();
    await resposta.interromper();

    expect(banco.gravadas).toEqual([]);
  });

  // O ponto: uma escrita lenta não pode atrasar o texto na tela.
  it("o texto continua chegando enquanto uma gravação está em voo", async () => {
    const banco = bancoFalso();
    const resposta = criarRespostaEmProgresso(SESSAO, banco.deps);

    banco.segurar();
    resposta.empurrar("a");
    banco.avancar(4000);
    resposta.empurrar("b");
    await Promise.resolve();

    // A gravação está presa no banco, e mesmo assim os pedaços entram.
    resposta.empurrar("c");
    resposta.empurrar("d");
    expect(resposta.texto).toBe("abcd");

    banco.soltar();
    await resposta.concluir();

    expect(banco.gravadas.at(-1)?.conteudo).toBe("abcd");
  });

  // Perder um parcial custa alguns segundos de texto; derrubar o turno custaria
  // a resposta inteira.
  it("falha ao gravar o parcial não derruba o turno", async () => {
    const banco = bancoFalso();
    const quebrado: DependenciasDaResposta = {
      ...banco.deps,
      salvar: async () => {
        throw new Error("banco fora do ar");
      },
    };
    const resposta = criarRespostaEmProgresso(SESSAO, quebrado);

    resposta.empurrar("texto");
    banco.avancar(4000);
    resposta.empurrar(" mais texto");
    await Promise.resolve();

    expect(resposta.texto).toBe("texto mais texto");
  });
});
