import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * As duas armadilhas de altura que espremiam o cartão no celular.
 *
 * Isto lê o fonte em vez de renderizar de propósito: jsdom não calcula layout,
 * então um teste que montasse o componente não saberia dizer se o cartão coube
 * na tela. O que dá para garantir é que as duas causas conhecidas não voltem —
 * e as duas são visíveis no fonte.
 */

const COMPONENTES = ["AiCoachChat.tsx", "NutritionCoachChat.tsx", "StudentCoachChat.tsx"];

const fonte = (arquivo: string) =>
  readFileSync(join(process.cwd(), "src/modules/ai/components", arquivo), "utf8");

describe.each(COMPONENTES)("%s", (arquivo) => {
  /**
   * No celular, `100vh` mede a janela **sem** descontar a barra do navegador.
   * O fim da conversa e o campo de digitação ficavam abaixo do corte, e rolar
   * não resolvia porque a página inteira é que estava maior que a tela.
   * `dvh` acompanha o que está de fato visível.
   */
  it("mede a altura com dvh, não com vh", () => {
    const s = fonte(arquivo);

    expect(s).not.toMatch(/\d+vh\b/);
    expect(s).toMatch(/100dvh/);
  });

  /**
   * O piso maior que o espaço disponível é o que criava a terceira barra de
   * rolagem: numa janela de 730px, `100dvh-16rem` dá 474px, e um piso de 500
   * forçava a página a rolar com a conversa rolando por dentro.
   *
   * A conta compara os dois números do próprio fonte, então ela continua
   * valendo se alguém mexer em qualquer um dos dois.
   */
  it("o piso de altura não ultrapassa o que a conta deixa", () => {
    const s = fonte(arquivo);

    const descontado = s.match(/100dvh-(\d+)rem/);
    const piso = s.match(/min-h-(\d+)\b/);

    expect(descontado).not.toBeNull();
    expect(piso).not.toBeNull();

    // Tailwind: `min-h-88` são 88 × 4px. O desconto está em rem (16px).
    const pisoPx = Number(piso?.[1]) * 4;
    const descontoPx = Number(descontado?.[1]) * 16;

    // Numa janela pequena de verdade — 720px, um laptop com o navegador aberto
    // — o que sobra precisa caber no piso.
    expect(pisoPx).toBeLessThanOrEqual(720 - descontoPx);
  });

  /**
   * `flex-1` sozinho não encolhe abaixo do conteúdo: o padrão de `min-height`
   * num item flexível é `auto`, e uma lista de mensagens longa empurra o
   * container para além da altura declarada — levando o painel e o campo de
   * digitação para fora da tela.
   */
  it("a lista de mensagens pode encolher", () => {
    expect(fonte(arquivo)).toMatch(/min-h-0[^"]*flex-1|flex-1[^"]*min-h-0/);
  });
});
