import { describe, expect, it } from "vitest";
import {
  avaliarAgachamento,
  type ContextoDoMovimento,
  type FatosDoMovimento,
} from "../agachamento";

/**
 * Fatos numa profundidade escolhida.
 *
 * Com o joelho na origem e a coxa de comprimento 1, a profundidade é a própria
 * coordenada Y do quadril: `dy / hypot(dx, dy)` com `hypot = 1`. Isso deixa os
 * testes falarem na unidade do julgador — −1 em pé, 0 na paralela — em vez de
 * em pixels que ninguém consegue conferir de cabeça.
 */
function naProfundidade(p: number, extra: Partial<FatosDoMovimento> = {}): FatosDoMovimento {
  return {
    joelho: { x: 0, y: 0 },
    quadril: { x: Math.sqrt(Math.max(0, 1 - p * p)), y: p },
    tornozelo: { x: 0, y: 1 },
    dePerfil: true,
    visibilidadeMinima: 0.9,
    ...extra,
  };
}

/** Roda uma sequência de profundidades e junta os vereditos que saíram. */
function executar(profundidades: number[], inicial: ContextoDoMovimento = {}) {
  let movimento = avaliarAgachamento(naProfundidade(profundidades[0]), inicial);
  const vereditos: string[] = [];

  if (movimento.veredito) vereditos.push(movimento.veredito.id);

  for (const p of profundidades.slice(1)) {
    movimento = avaliarAgachamento(naProfundidade(p), movimento);
    if (movimento.veredito) vereditos.push(movimento.veredito.id);
  }

  return { movimento, vereditos };
}

/**
 * Em pé, desce até `fundo`, volta a estender.
 *
 * A rampa de subida sai do próprio fundo (`fundo - 0.2`) em vez de um valor
 * fixo: com valor fixo, uma repetição rasa não se afastaria o suficiente do
 * ponto mais fundo para vencer a folga de histerese, e a sequência acabaria com
 * a máquina ainda subindo. É artefato de sequência curta — no aparelho os
 * quadros são densos e a rampa é contínua.
 */
const umaRepeticaoAte = (fundo: number) => [-1, -0.6, -0.3, fundo, fundo - 0.2, -0.5, -0.8, -0.95];

describe("avaliarAgachamento", () => {
  it("conta a repetição e julga funda quando o quadril passa da linha do joelho", () => {
    const { movimento, vereditos } = executar(umaRepeticaoAte(0.2));

    expect(movimento.repeticoes).toBe(1);
    expect(vereditos).toEqual(["fundo"]);
  });

  it("conta a repetição e julga rasa quando o quadril não alcança o joelho", () => {
    const { movimento, vereditos } = executar(umaRepeticaoAte(-0.15));

    expect(movimento.repeticoes).toBe(1);
    expect(vereditos).toEqual(["faltou"]);
  });

  it("julga pelo ponto mais fundo, não pela profundidade no instante do fechamento", () => {
    // A repetição fecha em pé, a −0.9. Se o veredito saísse do quadro de
    // fechamento, toda repetição seria "faltou" — inclusive esta, que passou
    // bem abaixo da paralela no meio do caminho.
    const { vereditos } = executar(umaRepeticaoAte(0.4));

    expect(vereditos).toEqual(["fundo"]);
  });

  it("não conta repetição a mais quando a pessoa pausa no fundo", () => {
    // Quem para embaixo oscila. Sem histerese, cada tremor fecharia e reabriria
    // uma repetição, e o contador subiria sozinho com a pessoa parada.
    const { movimento } = executar([-1, -0.3, 0.2, 0.19, 0.21, 0.18, 0.2, 0.19, -0.3, -0.9]);

    expect(movimento.repeticoes).toBe(1);
  });

  it("não conta repetição enquanto a pessoa não volta a estender", () => {
    // Subiu só até −0.6, que está dentro da faixa morta da histerese.
    const { movimento } = executar([-1, -0.3, 0.2, -0.3, -0.6]);

    expect(movimento.repeticoes).toBe(0);
    expect(movimento.fase).toBe("subindo");
  });

  it("conta duas repetições seguidas", () => {
    const { movimento, vereditos } = executar([...umaRepeticaoAte(0.2), ...umaRepeticaoAte(-0.2)]);

    expect(movimento.repeticoes).toBe(2);
    expect(vereditos).toEqual(["fundo", "faltou"]);
  });

  it("mede a mesma profundidade a duas distâncias diferentes da câmera", () => {
    // É a invariância à escala que dispensa o portão de distância desta tela.
    // Mesma pose, coxa com metade do tamanho no quadro.
    const perto = avaliarAgachamento({
      joelho: { x: 0, y: 0 },
      quadril: { x: 0.6, y: 0.8 },
      tornozelo: { x: 0, y: 1 },
      dePerfil: true,
      visibilidadeMinima: 0.9,
    });

    const longe = avaliarAgachamento({
      joelho: { x: 0.3, y: 0.4 },
      quadril: { x: 0.6, y: 0.8 },
      tornozelo: { x: 0.3, y: 0.9 },
      dePerfil: true,
      visibilidadeMinima: 0.9,
    });

    expect(perto.profundidade).toBeCloseTo(0.8, 10);
    expect(longe.profundidade).toBeCloseTo(0.8, 10);
  });

  describe("quando o quadro não permite julgar", () => {
    it("avisa uma vez e cala na repetição do mesmo problema", () => {
      const primeiro = avaliarAgachamento(naProfundidade(-1, { dePerfil: false }));
      const segundo = avaliarAgachamento(naProfundidade(-1, { dePerfil: false }), primeiro);

      expect(primeiro.aviso?.id).toBe("fique-de-lado");
      expect(primeiro.deveFalar).toBe(true);
      expect(segundo.deveFalar).toBe(false);
    });

    it("volta a falar o mesmo aviso depois de um quadro bom", () => {
      // Silêncio permanente ensina a ignorar; problema que reaparece depois de
      // a pessoa ter se ajustado é notícia de novo.
      const primeiro = avaliarAgachamento(naProfundidade(-1, { dePerfil: false }));
      const bom = avaliarAgachamento(naProfundidade(-1), primeiro);
      const denovo = avaliarAgachamento(naProfundidade(-1, { dePerfil: false }), bom);

      expect(denovo.deveFalar).toBe(true);
    });

    it("não julga de frente, onde o mesmo cálculo daria número plausível e errado", () => {
      const movimento = avaliarAgachamento(naProfundidade(0.2, { dePerfil: false }));

      expect(movimento.profundidade).toBeNull();
      expect(movimento.veredito).toBeNull();
    });

    it("avisa quando falta articulação no quadro", () => {
      const movimento = avaliarAgachamento(naProfundidade(-1, { tornozelo: null }));

      expect(movimento.aviso?.id).toBe("corpo-fora-do-quadro");
    });

    it("avisa quando a visibilidade das articulações está baixa", () => {
      const movimento = avaliarAgachamento(naProfundidade(-1, { visibilidadeMinima: 0.1 }));

      expect(movimento.aviso?.id).toBe("corpo-fora-do-quadro");
    });

    it("congela a máquina sem perder o que já foi contado", () => {
      const { movimento } = executar(umaRepeticaoAte(0.2));
      const cego = avaliarAgachamento(naProfundidade(-1, { quadril: null }), movimento);

      expect(cego.repeticoes).toBe(1);
      expect(cego.fase).toBe(movimento.fase);
    });

    it("não reprova quando não sabe se a pessoa está de perfil", () => {
      // `null` é "não sei", e não sei não reprova — mesma política do `portao.ts`.
      const movimento = avaliarAgachamento(naProfundidade(-1, { dePerfil: null }));

      expect(movimento.aviso).toBeNull();
      expect(movimento.profundidade).toBeCloseTo(-1, 10);
    });
  });
});
